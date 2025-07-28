"""
CS-Specialized Response Generator

Intelligent response generation service that uses Groq API (LLaMA 3, Mixtral)
to generate CS-specific answers, code explanations, and concept simplifications.

File: backend/app/services/rag/cs_generator.py
"""

import os
import json
import time
import logging
import asyncio
from typing import Dict, List, Optional, Any, Union, Literal
from dataclasses import dataclass, field
from enum import Enum
import re
from pathlib import Path

import httpx
from groq import Groq
import tiktoken

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..', '..'))

try:
    from app.services.rag.cs_query_processor import ProcessedQuery, QueryType, QueryIntent
except ImportError:
    # Fallback classes
    class ProcessedQuery:
        pass
    class QueryType:
        CODE = "code"
        THEORY = "theory"
        MIXED = "mixed"
    class QueryIntent:
        LEARN = "learn"
        IMPLEMENT = "implement"

try:
    from app.models.cs_embedding_config import get_cs_config
except ImportError:
    def get_cs_config():
        return {}

logger = logging.getLogger(__name__)


class GenerationType(str, Enum):
    """Types of CS response generation."""
    QA = "qa"                           # Question answering
    CODE_EXPLAIN = "code_explain"       # Code explanation
    CODE_GENERATE = "code_generate"     # Code generation
    CONCEPT_SIMPLE = "concept_simple"   # Concept simplification
    COMPARISON = "comparison"           # Compare concepts/algorithms
    TUTORIAL = "tutorial"              # Step-by-step tutorials
    DEBUGGING = "debugging"            # Debug assistance
    DOCUMENTATION = "documentation"    # Generate documentation
    REVIEW = "review"                  # Code review
    OPTIMIZATION = "optimization"      # Performance optimization


class ModelType(str, Enum):
    """Available Groq models for different tasks."""
    LLAMA3_8B = "llama3-8b-8192"
    LLAMA3_70B = "llama3-70b-8192"
    MIXTRAL_8X7B = "mixtral-8x7b-32768"
    GEMMA_7B = "gemma-7b-it"


class ResponseFormat(str, Enum):
    """Response output formats."""
    MARKDOWN = "markdown"
    PLAIN = "plain"
    CODE = "code"
    HTML = "html"


@dataclass
class GenerationConfig:
    """Configuration for response generation."""
    model: ModelType = ModelType.LLAMA3_8B
    temperature: float = 0.3
    max_tokens: int = 2048
    top_p: float = 0.9
    frequency_penalty: float = 0.0
    presence_penalty: float = 0.0
    stop_sequences: List[str] = field(default_factory=list)
    stream: bool = False
    
    # CS-specific settings
    include_examples: bool = True
    include_complexity: bool = True
    beginner_friendly: bool = False
    include_references: bool = False
    code_style: str = "pythonic"  # pythonic, verbose, minimal


@dataclass
class GenerationResult:
    """Result of response generation."""
    response: str
    model_used: str
    generation_type: GenerationType
    prompt_used: str
    metadata: Dict[str, Any]
    
    # Performance metrics
    generation_time: float = 0.0
    tokens_used: int = 0
    cost_estimate: float = 0.0
    
    # Quality indicators
    confidence_score: float = 0.0
    relevance_score: float = 0.0
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            "response": self.response,
            "model_used": self.model_used,
            "generation_type": self.generation_type.value,
            "generation_time": self.generation_time,
            "tokens_used": self.tokens_used,
            "confidence_score": self.confidence_score,
            "metadata": self.metadata
        }


class CSPromptTemplates:
    """CS-specific prompt templates for different generation types."""
    
    def __init__(self):
        self.templates = self._build_templates()
    
    def _build_templates(self) -> Dict[GenerationType, str]:
        """Build comprehensive CS prompt templates."""
        return {
            GenerationType.QA: """You are an expert Computer Science assistant with deep knowledge of algorithms, data structures, programming, and CS theory.

Context Information:
{context}

Question: {query}

Instructions:
- Provide a clear, accurate, and comprehensive answer
- Use technical terminology appropriately but explain complex concepts
- Include examples where helpful
- If the question involves code, provide clean, well-commented examples
- Mention time/space complexity when relevant
- Be precise about edge cases and limitations

Answer:""",

            GenerationType.CODE_EXPLAIN: """You are a CS instructor explaining code to students. Analyze the following code and provide a clear explanation.

Programming Language: {language}
Code:
```{language}
{code}
```

Provide:
1. **Purpose**: What does this code do?
2. **Algorithm**: Explain the approach/algorithm used
3. **Line-by-line breakdown**: Key parts of the implementation
4. **Complexity**: Time and space complexity analysis
5. **Potential improvements**: Optimizations or alternatives

Explanation:""",

            GenerationType.CODE_GENERATE: """You are an expert programmer. Generate clean, efficient, and well-documented code.

Requirements:
- Language: {language}
- Task: {task}
- Constraints: {constraints}

Additional requirements:
- Include comprehensive docstrings/comments
- Follow best practices and coding standards
- Handle edge cases appropriately
- Optimize for readability and maintainability
- Include complexity analysis in comments

Code:""",

            GenerationType.CONCEPT_SIMPLE: """You are a CS educator specializing in making complex concepts accessible to beginners.

Concept to explain: {concept}
Target audience: {audience_level}

Make this concept easy to understand by:
1. **Simple Definition**: Explain in plain language
2. **Real-world Analogy**: Use relatable analogies
3. **Visual Description**: Describe how it looks/works conceptually
4. **Simple Example**: Provide a basic, concrete example
5. **Why It Matters**: Explain practical applications
6. **Next Steps**: What to learn next

Keep the explanation engaging and avoid overwhelming technical jargon.

Explanation:""",

            GenerationType.COMPARISON: """You are a CS expert comparing different approaches, algorithms, or concepts.

Comparison topic: {topic}
Items to compare: {items}

Provide a structured comparison covering:
1. **Overview**: Brief description of each item
2. **Key Differences**: Main distinguishing features
3. **Performance**: Time/space complexity comparison
4. **Use Cases**: When to use each approach
5. **Pros and Cons**: Advantages and disadvantages
6. **Code Examples**: Brief implementations if applicable
7. **Recommendation**: Which to choose in different scenarios

Comparison:""",

            GenerationType.TUTORIAL: """You are creating a step-by-step tutorial for CS students.

Tutorial topic: {topic}
Skill level: {level}
Goal: {goal}

Create a comprehensive tutorial with:
1. **Prerequisites**: What students should know first
2. **Learning Objectives**: What they'll accomplish
3. **Step-by-Step Instructions**: Clear, numbered steps
4. **Code Examples**: Working code with explanations
5. **Common Pitfalls**: What to watch out for
6. **Practice Exercises**: Hands-on activities
7. **Further Reading**: Next steps and resources

Tutorial:""",

            GenerationType.DEBUGGING: """You are a debugging expert helping solve programming issues.

Problem Description: {problem}
Code (if provided):
```{language}
{code}
```
Error Message: {error}

Debugging approach:
1. **Problem Analysis**: What's likely causing the issue
2. **Root Cause**: Identify the specific problem
3. **Solution**: How to fix it step-by-step
4. **Corrected Code**: Fixed version with explanations
5. **Prevention**: How to avoid this issue in the future
6. **Testing**: How to verify the fix works

Debug Analysis:""",

            GenerationType.DOCUMENTATION: """You are a technical writer creating comprehensive documentation.

Code/System to document: {subject}
Documentation type: {doc_type}

Create clear, comprehensive documentation including:
1. **Overview**: What this does and why it exists
2. **API Reference**: Functions, classes, parameters
3. **Usage Examples**: How to use it with code samples
4. **Configuration**: Setup and configuration options
5. **Best Practices**: Recommended usage patterns
6. **Troubleshooting**: Common issues and solutions
7. **Changelog**: Version history if applicable

Documentation:""",

            GenerationType.REVIEW: """You are conducting a thorough code review focusing on CS best practices.

Code to review:
```{language}
{code}
```

Review criteria: {criteria}

Provide a comprehensive review covering:
1. **Correctness**: Does the code work as intended?
2. **Algorithm Efficiency**: Can it be optimized?
3. **Code Quality**: Readability, maintainability, style
4. **Best Practices**: Following language/CS conventions
5. **Edge Cases**: Are all scenarios handled?
6. **Security**: Any potential vulnerabilities?
7. **Suggestions**: Specific improvements with examples

Code Review:""",

            GenerationType.OPTIMIZATION: """You are a performance optimization expert analyzing code efficiency.

Code to optimize:
```{language}
{code}
```
Performance goal: {goal}
Current bottlenecks: {bottlenecks}

Optimization analysis:
1. **Current Performance**: Analyze time/space complexity
2. **Bottleneck Identification**: Where are the inefficiencies?
3. **Optimization Strategies**: Specific techniques to apply
4. **Optimized Implementation**: Improved code with explanations
5. **Trade-offs**: What are we trading for performance?
6. **Benchmarking**: How to measure improvements
7. **Alternative Approaches**: Other algorithms/data structures

Optimization Plan:"""
        }
    
    def get_template(self, generation_type: GenerationType) -> str:
        """Get template for specific generation type."""
        return self.templates.get(generation_type, self.templates[GenerationType.QA])
    
    def format_template(
        self,
        generation_type: GenerationType,
        **kwargs
    ) -> str:
        """Format template with provided arguments."""
        template = self.get_template(generation_type)
        
        try:
            return template.format(**kwargs)
        except KeyError as e:
            logger.warning(f"Missing template argument: {e}")
            # Fill missing arguments with placeholders
            import string
            safe_kwargs = {}
            for key in string.Formatter().parse(template):
                if key[1] and key[1] not in kwargs:
                    safe_kwargs[key[1]] = f"[{key[1].upper()}]"
            
            kwargs.update(safe_kwargs)
            return template.format(**kwargs)


class ModelSelector:
    """Intelligent model selection based on task requirements."""
    
    def __init__(self):
        self.model_capabilities = {
            ModelType.LLAMA3_8B: {
                "context_length": 8192,
                "strengths": ["code", "general_qa", "fast_response"],
                "cost_per_token": 0.00005,
                "latency": "low"
            },
            ModelType.LLAMA3_70B: {
                "context_length": 8192,
                "strengths": ["complex_reasoning", "theory", "detailed_explanations"],
                "cost_per_token": 0.0008,
                "latency": "high"
            },
            ModelType.MIXTRAL_8X7B: {
                "context_length": 32768,
                "strengths": ["long_context", "multilingual", "structured_output"],
                "cost_per_token": 0.0002,
                "latency": "medium"
            },
            ModelType.GEMMA_7B: {
                "context_length": 8192,
                "strengths": ["efficient", "general_purpose"],
                "cost_per_token": 0.00007,
                "latency": "low"
            }
        }
    
    def select_model(
        self,
        generation_type: GenerationType,
        context_length: int = 0,
        complexity: str = "medium",
        priority: str = "balanced"  # speed, cost, quality
    ) -> ModelType:
        """
        Select optimal model based on task requirements.
        
        Args:
            generation_type: Type of generation task
            context_length: Required context length
            complexity: Task complexity (simple, medium, complex)
            priority: Optimization priority
            
        Returns:
            Selected model type
        """
        # Handle long context requirements
        if context_length > 8192:
            return ModelType.MIXTRAL_8X7B
        
        # Generation type preferences
        type_preferences = {
            GenerationType.QA: [ModelType.LLAMA3_8B, ModelType.LLAMA3_70B],
            GenerationType.CODE_EXPLAIN: [ModelType.LLAMA3_8B, ModelType.MIXTRAL_8X7B],
            GenerationType.CODE_GENERATE: [ModelType.LLAMA3_8B, ModelType.MIXTRAL_8X7B],
            GenerationType.CONCEPT_SIMPLE: [ModelType.LLAMA3_70B, ModelType.LLAMA3_8B],
            GenerationType.COMPARISON: [ModelType.LLAMA3_70B, ModelType.MIXTRAL_8X7B],
            GenerationType.TUTORIAL: [ModelType.LLAMA3_70B, ModelType.MIXTRAL_8X7B],
            GenerationType.DEBUGGING: [ModelType.LLAMA3_8B, ModelType.MIXTRAL_8X7B],
            GenerationType.DOCUMENTATION: [ModelType.MIXTRAL_8X7B, ModelType.LLAMA3_8B],
            GenerationType.REVIEW: [ModelType.LLAMA3_70B, ModelType.MIXTRAL_8X7B],
            GenerationType.OPTIMIZATION: [ModelType.LLAMA3_70B, ModelType.LLAMA3_8B]
        }
        
        preferred_models = type_preferences.get(generation_type, [ModelType.LLAMA3_8B])
        
        # Apply priority filtering
        if priority == "speed":
            # Prefer faster models
            speed_ranking = [ModelType.LLAMA3_8B, ModelType.GEMMA_7B, ModelType.MIXTRAL_8X7B, ModelType.LLAMA3_70B]
            for model in speed_ranking:
                if model in preferred_models:
                    return model
        elif priority == "cost":
            # Prefer cheaper models
            cost_ranking = [ModelType.LLAMA3_8B, ModelType.GEMMA_7B, ModelType.MIXTRAL_8X7B, ModelType.LLAMA3_70B]
            for model in cost_ranking:
                if model in preferred_models:
                    return model
        elif priority == "quality":
            # Prefer higher quality models
            quality_ranking = [ModelType.LLAMA3_70B, ModelType.MIXTRAL_8X7B, ModelType.LLAMA3_8B, ModelType.GEMMA_7B]
            for model in quality_ranking:
                if model in preferred_models:
                    return model
        
        # Default to first preference
        return preferred_models[0]


class CSGenerator:
    """Main CS-specialized response generator service."""
    
    def __init__(
        self,
        groq_api_key: Optional[str] = None,
        default_config: Optional[GenerationConfig] = None
    ):
        # Initialize Groq client
        self.groq_api_key = groq_api_key or os.getenv("GROQ_API_KEY")
        if not self.groq_api_key:
            raise ValueError("GROQ_API_KEY not found in environment variables")
        
        self.client = Groq(api_key=self.groq_api_key)
        
        # Initialize components
        self.templates = CSPromptTemplates()
        self.model_selector = ModelSelector()
        
        # Default configuration
        self.default_config = default_config or GenerationConfig()
        
        # Token counting (approximate)
        try:
            self.tokenizer = tiktoken.get_encoding("cl100k_base")
        except:
            logger.warning("Could not load tiktoken tokenizer")
            self.tokenizer = None
        
        # Generation cache
        self.response_cache: Dict[str, GenerationResult] = {}
        self.cache_enabled = True
        
        logger.info("Initialized CS Generator with Groq API")
    
    def generate_cs_response(
        self,
        user_query: str,
        context: str = "",
        generation_type: GenerationType = GenerationType.QA,
        config: Optional[GenerationConfig] = None,
        metadata: Optional[Dict[str, Any]] = None,
        processed_query: Optional[ProcessedQuery] = None
    ) -> GenerationResult:
        """
        Main entry point for CS response generation.
        
        Args:
            user_query: User's question or request
            context: Retrieved context from documents
            generation_type: Type of generation to perform
            config: Generation configuration
            metadata: Additional metadata
            processed_query: Pre-processed query information
            
        Returns:
            GenerationResult with response and metadata
        """
        start_time = time.time()
        
        # Use provided config or default
        config = config or self.default_config
        metadata = metadata or {}
        
        # Generate cache key
        cache_key = self._generate_cache_key(user_query, context, generation_type, config)
        
        # Check cache
        if self.cache_enabled and cache_key in self.response_cache:
            logger.info("Returning cached response")
            cached_result = self.response_cache[cache_key]
            cached_result.generation_time = time.time() - start_time
            return cached_result
        
        try:
            # Select optimal model
            context_length = self._estimate_token_count(context + user_query)
            complexity = self._assess_query_complexity(user_query, processed_query)
            
            optimal_model = self.model_selector.select_model(
                generation_type=generation_type,
                context_length=context_length,
                complexity=complexity,
                priority="balanced"
            )
            
            # Override model if specified in config
            model_to_use = config.model or optimal_model
            
            # Build prompt
            prompt = self._build_prompt(
                user_query=user_query,
                context=context,
                generation_type=generation_type,
                config=config,
                metadata=metadata,
                processed_query=processed_query
            )
            
            # Generate response
            response_text = self._call_groq_api(
                prompt=prompt,
                model=model_to_use,
                config=config
            )
            
            # Post-process response
            processed_response = self._post_process_response(
                response_text,
                generation_type,
                config
            )
            
            # Calculate metrics
            generation_time = time.time() - start_time
            tokens_used = self._estimate_token_count(prompt + processed_response)
            cost_estimate = self._calculate_cost(tokens_used, model_to_use)
            
            # Create result
            result = GenerationResult(
                response=processed_response,
                model_used=model_to_use.value,
                generation_type=generation_type,
                prompt_used=prompt,
                metadata=metadata,
                generation_time=generation_time,
                tokens_used=tokens_used,
                cost_estimate=cost_estimate
            )
            
            # Calculate quality scores
            result.confidence_score = self._calculate_confidence_score(result)
            result.relevance_score = self._calculate_relevance_score(result, user_query)
            
            # Cache result
            if self.cache_enabled:
                self.response_cache[cache_key] = result
            
            logger.info(f"Generated response in {generation_time:.2f}s using {model_to_use.value}")
            
            return result
            
        except Exception as e:
            logger.error(f"Error generating CS response: {e}")
            
            # Return fallback response
            fallback_response = self._generate_fallback_response(user_query, str(e))
            
            return GenerationResult(
                response=fallback_response,
                model_used="fallback",
                generation_type=generation_type,
                prompt_used="",
                metadata={"error": str(e)},
                generation_time=time.time() - start_time,
                confidence_score=0.1
            )
    
    def _build_prompt(
        self,
        user_query: str,
        context: str,
        generation_type: GenerationType,
        config: GenerationConfig,
        metadata: Dict[str, Any],
        processed_query: Optional[ProcessedQuery]
    ) -> str:
        """Build appropriate prompt based on generation type."""
        
        # Prepare template arguments
        template_args = {
            "query": user_query,
            "context": context or "No specific context provided.",
        }
        
        # Add generation-specific arguments
        if generation_type == GenerationType.CODE_EXPLAIN:
            template_args.update({
                "code": metadata.get("code", user_query),
                "language": metadata.get("language", "unknown")
            })
        
        elif generation_type == GenerationType.CODE_GENERATE:
            template_args.update({
                "language": metadata.get("language", "python"),
                "task": user_query,
                "constraints": metadata.get("constraints", "Standard implementation")
            })
        
        elif generation_type == GenerationType.CONCEPT_SIMPLE:
            template_args.update({
                "concept": metadata.get("concept", user_query),
                "audience_level": "beginner" if config.beginner_friendly else "intermediate"
            })
        
        elif generation_type == GenerationType.COMPARISON:
            template_args.update({
                "topic": user_query,
                "items": metadata.get("items", "items mentioned in the query")
            })
        
        elif generation_type == GenerationType.TUTORIAL:
            template_args.update({
                "topic": user_query,
                "level": "beginner" if config.beginner_friendly else "intermediate",
                "goal": metadata.get("goal", "understand and implement the concept")
            })
        
        elif generation_type == GenerationType.DEBUGGING:
            template_args.update({
                "problem": user_query,
                "code": metadata.get("code", ""),
                "error": metadata.get("error", ""),
                "language": metadata.get("language", "unknown")
            })
        
        elif generation_type == GenerationType.DOCUMENTATION:
            template_args.update({
                "subject": metadata.get("subject", user_query),
                "doc_type": metadata.get("doc_type", "API documentation")
            })
        
        elif generation_type == GenerationType.REVIEW:
            template_args.update({
                "code": metadata.get("code", ""),
                "language": metadata.get("language", "unknown"),
                "criteria": metadata.get("criteria", "general code quality")
            })
        
        elif generation_type == GenerationType.OPTIMIZATION:
            template_args.update({
                "code": metadata.get("code", ""),
                "language": metadata.get("language", "unknown"),
                "goal": metadata.get("goal", "improve performance"),
                "bottlenecks": metadata.get("bottlenecks", "unknown")
            })
        
        # Add processed query information if available
        if processed_query:
            if processed_query.programming_languages:
                template_args["language"] = processed_query.programming_languages[0]
            
            if processed_query.cs_concepts:
                concepts_str = ", ".join(processed_query.cs_concepts[:5])
                template_args["context"] += f"\n\nRelated CS concepts: {concepts_str}"
        
        # Format template
        prompt = self.templates.format_template(generation_type, **template_args)
        
        # Add configuration-specific instructions
        if config.beginner_friendly:
            prompt += "\n\nIMPORTANT: Explain this in simple terms suitable for beginners."
        
        if config.include_examples:
            prompt += "\n\nINCLUDE: Practical examples and code samples where appropriate."
        
        if config.include_complexity:
            prompt += "\n\nINCLUDE: Time and space complexity analysis when relevant."
        
        return prompt
    
    def _call_groq_api(
        self,
        prompt: str,
        model: ModelType,
        config: GenerationConfig
    ) -> str:
        """Call Groq API with retry mechanism."""
        
        messages = [
            {
                "role": "system",
                "content": "You are an expert Computer Science assistant. Provide accurate, helpful, and well-structured responses."
            },
            {
                "role": "user", 
                "content": prompt
            }
        ]
        
        # Prepare API call parameters
        api_params = {
            "model": model.value,
            "messages": messages,
            "temperature": config.temperature,
            "max_tokens": config.max_tokens,
            "top_p": config.top_p,
            "frequency_penalty": config.frequency_penalty,
            "presence_penalty": config.presence_penalty,
            "stream": config.stream
        }
        
        if config.stop_sequences:
            api_params["stop"] = config.stop_sequences
        
        # Retry mechanism
        max_retries = 3
        retry_delay = 1
        
        for attempt in range(max_retries):
            try:
                if config.stream:
                    return self._handle_streaming_response(api_params)
                else:
                    response = self.client.chat.completions.create(**api_params)
                    return response.choices[0].message.content
                    
            except Exception as e:
                logger.warning(f"Groq API attempt {attempt + 1} failed: {e}")
                
                if attempt < max_retries - 1:
                    time.sleep(retry_delay * (2 ** attempt))  # Exponential backoff
                else:
                    raise e
    
    def _handle_streaming_response(self, api_params: Dict[str, Any]) -> str:
        """Handle streaming response from Groq API."""
        response_text = ""
        
        try:
            stream = self.client.chat.completions.create(**api_params)
            
            for chunk in stream:
                if chunk.choices[0].delta.content is not None:
                    response_text += chunk.choices[0].delta.content
                    
        except Exception as e:
            logger.error(f"Streaming error: {e}")
            # Fall back to non-streaming
            api_params["stream"] = False
            response = self.client.chat.completions.create(**api_params)
            response_text = response.choices[0].message.content
        
        return response_text
    
    def _post_process_response(
        self,
        response: str,
        generation_type: GenerationType,
        config: GenerationConfig
    ) -> str:
        """Post-process the generated response."""
        
        # Clean up response
        processed = response.strip()
        
        # Remove excessive newlines
        processed = re.sub(r'\n{3,}', '\n\n', processed)
        
        # Ensure code blocks are properly formatted
        processed = self._fix_code_blocks(processed)
        
        # Add final formatting based on generation type
        if generation_type == GenerationType.CODE_GENERATE:
            processed = self._format_code_response(processed)
        elif generation_type == GenerationType.TUTORIAL:
            processed = self._format_tutorial_response(processed)
        
        # Truncate if too long
        max_length = config.max_tokens * 4  # Rough character estimate
        if len(processed) > max_length:
            processed = processed[:max_length] + "\n\n[Response truncated due to length limit]"
        
        return processed
    
    def _fix_code_blocks(self, text: str) -> str:
        """Ensure code blocks are properly formatted."""
        # Fix incomplete code blocks
        code_block_pattern = r'```(\w*)\n(.*?)```'
        
        def fix_block(match):
            language = match.group(1)
            code = match.group(2).strip()
            return f"```{language}\n{code}\n```"
        
        return re.sub(code_block_pattern, fix_block, text, flags=re.DOTALL)
    
    def _format_code_response(self, response: str) -> str:
        """Format code generation responses."""
        # Ensure code is in proper blocks
        if "```" not in response and any(keyword in response.lower() 
                                       for keyword in ["def ", "class ", "function", "import"]):
            # Wrap in code block
            response = f"```python\n{response}\n```"
        
        return response
    
    def _format_tutorial_response(self, response: str) -> str:
        """Format tutorial responses with better structure."""
        # Add separators between major sections
        section_headers = ["Prerequisites", "Learning Objectives", "Step", "Example", "Exercise"]
        
        for header in section_headers:
            pattern = f"({header}[^\\n]*)"
            replacement = f"\n---\n\n**\\1**"
            response = re.sub(pattern, replacement, response)
        
        return response
    
    def _estimate_token_count(self, text: str) -> int:
        """Estimate token count for text."""
        if self.tokenizer:
            try:
                return len(self.tokenizer.encode(text))
            except:
                pass
        
        # Rough estimation: ~4 characters per token
        return len(text) // 4
    
    def _assess_query_complexity(
        self,
        query: str,
        processed_query: Optional[ProcessedQuery]
    ) -> str:
        """Assess the complexity of the query."""
        complexity_indicators = {
            "simple": ["what is", "define", "explain", "simple", "basic"],
            "medium": ["how to", "implement", "difference", "compare"],
            "complex": ["optimize", "analyze", "design", "architecture", "advanced", "complex"]
        }
        
        query_lower = query.lower()
        
        # Check processed query for additional complexity indicators
        if processed_query:
            if processed_query.complexity_terms:
                return "complex"
            if processed_query.algorithms_mentioned:
                return "medium"
        
        # Check for complexity keywords
        for complexity, keywords in complexity_indicators.items():
            if any(keyword in query_lower for keyword in keywords):
                return complexity
        
        return "medium"  # Default
    
    def _calculate_cost(self, tokens: int, model: ModelType) -> float:
        """Calculate estimated cost for the generation."""
        cost_per_token = self.model_selector.model_capabilities[model]["cost_per_token"]
        return tokens * cost_per_token
    
    def _calculate_confidence_score(self, result: GenerationResult) -> float:
        """Calculate confidence score for the generated response."""
        score = 0.5  # Base score
        
        # Length-based confidence
        response_length = len(result.response)
        if 100 <= response_length <= 2000:
            score += 0.2
        elif response_length > 2000:
            score += 0.1
        
        # Code block presence (for code-related tasks)
        if result.generation_type in [GenerationType.CODE_EXPLAIN, GenerationType.CODE_GENERATE]:
            if "```" in result.response:
                score += 0.2
        
        # Structure indicators
        structure_indicators = ["1.", "2.", "**", "##", "###"]
        if any(indicator in result.response for indicator in structure_indicators):
            score += 0.1
        
        return min(score, 1.0)
    
    def _calculate_relevance_score(self, result: GenerationResult, query: str) -> float:
        """Calculate relevance score by checking query terms in response."""
        query_words = set(query.lower().split())
        response_words = set(result.response.lower().split())
        
        # Remove common stopwords for better matching
        stopwords = {"the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with", "by"}
        query_words -= stopwords
        response_words -= stopwords
        
        if not query_words:
            return 0.5
        
        # Calculate overlap ratio
        overlap = len(query_words & response_words)
        relevance = overlap / len(query_words)
        
        return min(relevance, 1.0)
    
    def _generate_cache_key(
        self,
        query: str,
        context: str,
        generation_type: GenerationType,
        config: GenerationConfig
    ) -> str:
        """Generate cache key for response caching."""
        import hashlib
        
        key_components = [
            query.lower().strip(),
            context[:500],  # First 500 chars of context
            generation_type.value,
            str(config.temperature),
            str(config.beginner_friendly)
        ]
        
        key_string = "|".join(key_components)
        return hashlib.md5(key_string.encode()).hexdigest()
    
    def _generate_fallback_response(self, query: str, error: str) -> str:
        """Generate a fallback response when API fails."""
        return f"""I apologize, but I encountered an issue generating a response to your question: "{query[:100]}..."

Error details: {error}

Please try rephrasing your question or contact support if the issue persists.

In the meantime, here are some general suggestions:
- Make sure your question is specific and clear
- Include relevant context or code if applicable
- Check if you're asking about a well-established CS concept

I'm here to help with computer science questions, so please feel free to try again!"""


class BatchCSGenerator:
    """Batch processing interface for CS response generation."""
    
    def __init__(self, generator: CSGenerator):
        self.generator = generator
    
    async def generate_batch_responses(
        self,
        queries: List[Dict[str, Any]],
        concurrent_limit: int = 3
    ) -> List[GenerationResult]:
        """
        Generate responses for multiple queries concurrently.
        
        Args:
            queries: List of query dictionaries with required fields
            concurrent_limit: Maximum concurrent API calls
            
        Returns:
            List of GenerationResult objects
        """
        semaphore = asyncio.Semaphore(concurrent_limit)
        
        async def process_single_query(query_data: Dict[str, Any]) -> GenerationResult:
            async with semaphore:
                return await asyncio.to_thread(
                    self.generator.generate_cs_response,
                    **query_data
                )
        
        tasks = [process_single_query(query_data) for query_data in queries]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Handle exceptions
        processed_results = []
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                logger.error(f"Batch query {i} failed: {result}")
                # Create error result
                error_result = GenerationResult(
                    response=f"Error processing query: {result}",
                    model_used="error",
                    generation_type=GenerationType.QA,
                    prompt_used="",
                    metadata={"error": str(result)},
                    confidence_score=0.0
                )
                processed_results.append(error_result)
            else:
                processed_results.append(result)
        
        return processed_results


class CSGeneratorEvaluator:
    """Evaluation utilities for CS response generation quality."""
    
    def __init__(self, generator: CSGenerator):
        self.generator = generator
    
    def evaluate_response_quality(
        self,
        test_cases: List[Dict[str, Any]]
    ) -> Dict[str, float]:
        """
        Evaluate response quality on test cases.
        
        Args:
            test_cases: List of test cases with queries and expected criteria
            
        Returns:
            Dictionary with evaluation metrics
        """
        results = []
        
        for test_case in test_cases:
            query = test_case["query"]
            expected_criteria = test_case.get("criteria", {})
            
            # Generate response
            result = self.generator.generate_cs_response(
                user_query=query,
                context=test_case.get("context", ""),
                generation_type=GenerationType(test_case.get("type", "qa"))
            )
            
            # Evaluate against criteria
            evaluation = self._evaluate_single_response(result, expected_criteria)
            evaluation["test_case"] = test_case
            results.append(evaluation)
        
        # Calculate aggregate metrics
        metrics = {
            "avg_confidence": np.mean([r["confidence_score"] for r in results]),
            "avg_relevance": np.mean([r["relevance_score"] for r in results]),
            "avg_generation_time": np.mean([r["generation_time"] for r in results]),
            "total_cost": sum(r["cost_estimate"] for r in results),
            "success_rate": sum(1 for r in results if r["overall_quality"] > 0.7) / len(results)
        }
        
        return {
            "aggregate_metrics": metrics,
            "detailed_results": results
        }
    
    def _evaluate_single_response(
        self,
        result: GenerationResult,
        criteria: Dict[str, Any]
    ) -> Dict[str, float]:
        """Evaluate a single response against criteria."""
        evaluation = {
            "confidence_score": result.confidence_score,
            "relevance_score": result.relevance_score,
            "generation_time": result.generation_time,
            "cost_estimate": result.cost_estimate
        }
        
        # Check specific criteria
        response_lower = result.response.lower()
        
        # Code presence check
        if criteria.get("should_contain_code"):
            evaluation["code_present"] = 1.0 if "```" in result.response else 0.0
        
        # Explanation quality (rough heuristic)
        if criteria.get("should_explain"):
            explanation_indicators = ["because", "since", "therefore", "this means", "in other words"]
            explanation_score = sum(1 for indicator in explanation_indicators 
                                  if indicator in response_lower) / len(explanation_indicators)
            evaluation["explanation_quality"] = min(explanation_score, 1.0)
        
        # Technical accuracy (keyword presence)
        if "required_terms" in criteria:
            required_terms = criteria["required_terms"]
            terms_present = sum(1 for term in required_terms 
                              if term.lower() in response_lower)
            evaluation["technical_accuracy"] = terms_present / len(required_terms)
        
        # Calculate overall quality score
        quality_components = [
            evaluation.get("confidence_score", 0.5),
            evaluation.get("relevance_score", 0.5),
            evaluation.get("code_present", 0.5),
            evaluation.get("explanation_quality", 0.5),
            evaluation.get("technical_accuracy", 0.5)
        ]
        
        evaluation["overall_quality"] = np.mean(quality_components)
        
        return evaluation


# Specialized generators for different CS domains
class CodeExplainerGenerator(CSGenerator):
    """Specialized generator for code explanation tasks."""
    
    def explain_code(
        self,
        code: str,
        language: str = "python",
        detail_level: str = "medium",
        audience: str = "student"
    ) -> GenerationResult:
        """
        Generate code explanation with specialized configuration.
        
        Args:
            code: Code snippet to explain
            language: Programming language
            detail_level: Level of detail (basic, medium, detailed)
            audience: Target audience (beginner, student, professional)
            
        Returns:
            GenerationResult with code explanation
        """
        config = GenerationConfig(
            temperature=0.2,  # Low temperature for factual explanations
            include_examples=True,
            include_complexity=detail_level in ["medium", "detailed"],
            beginner_friendly=audience == "beginner"
        )
        
        metadata = {
            "code": code,
            "language": language,
            "detail_level": detail_level,
            "audience": audience
        }
        
        return self.generate_cs_response(
            user_query=f"Explain this {language} code",
            generation_type=GenerationType.CODE_EXPLAIN,
            config=config,
            metadata=metadata
        )


class ConceptSimplifierGenerator(CSGenerator):
    """Specialized generator for simplifying CS concepts."""
    
    def simplify_concept(
        self,
        concept: str,
        context: str = "",
        target_level: str = "beginner",
        use_analogies: bool = True
    ) -> GenerationResult:
        """
        Simplify a CS concept for easier understanding.
        
        Args:
            concept: CS concept to simplify
            context: Additional context
            target_level: Target understanding level
            use_analogies: Whether to include analogies
            
        Returns:
            GenerationResult with simplified explanation
        """
        config = GenerationConfig(
            temperature=0.4,  # Slightly higher for creative analogies
            beginner_friendly=True,
            include_examples=True
        )
        
        metadata = {
            "concept": concept,
            "audience_level": target_level,
            "use_analogies": use_analogies
        }
        
        query = f"Explain {concept} in simple terms"
        if use_analogies:
            query += " using analogies and examples"
        
        return self.generate_cs_response(
            user_query=query,
            context=context,
            generation_type=GenerationType.CONCEPT_SIMPLE,
            config=config,
            metadata=metadata
        )


# Factory functions
def create_cs_generator(
    groq_api_key: Optional[str] = None,
    config: Optional[GenerationConfig] = None
) -> CSGenerator:
    """
    Create a CS generator with configuration.
    
    Args:
        groq_api_key: Groq API key
        config: Generation configuration
        
    Returns:
        Configured CSGenerator instance
    """
    return CSGenerator(groq_api_key=groq_api_key, default_config=config)


def create_code_explainer(groq_api_key: Optional[str] = None) -> CodeExplainerGenerator:
    """Create a specialized code explainer generator."""
    return CodeExplainerGenerator(groq_api_key=groq_api_key)


def create_concept_simplifier(groq_api_key: Optional[str] = None) -> ConceptSimplifierGenerator:
    """Create a specialized concept simplifier generator."""
    return ConceptSimplifierGenerator(groq_api_key=groq_api_key)


# Utility functions for integration
def quick_generate_answer(
    query: str,
    context: str = "",
    generation_type: str = "qa",
    groq_api_key: Optional[str] = None
) -> str:
    """
    Quick response generation for simple integration.
    
    Args:
        query: User query
        context: Retrieved context
        generation_type: Type of generation
        groq_api_key: Groq API key
        
    Returns:
        Generated response text
    """
    generator = create_cs_generator(groq_api_key)
    
    result = generator.generate_cs_response(
        user_query=query,
        context=context,
        generation_type=GenerationType(generation_type)
    )
    
    return result.response


async def batch_generate_responses(
    queries: List[Dict[str, Any]],
    groq_api_key: Optional[str] = None,
    concurrent_limit: int = 3
) -> List[Dict[str, Any]]:
    """
    Generate responses for multiple queries concurrently.
    
    Args:
        queries: List of query dictionaries
        groq_api_key: Groq API key
        concurrent_limit: Concurrent request limit
        
    Returns:
        List of response dictionaries
    """
    generator = create_cs_generator(groq_api_key)
    batch_generator = BatchCSGenerator(generator)
    
    results = await batch_generator.generate_batch_responses(queries, concurrent_limit)
    
    return [result.to_dict() for result in results]


# Export main classes and functions
__all__ = [
    "CSGenerator",
    "GenerationType",
    "ModelType",
    "ResponseFormat",
    "GenerationConfig",
    "GenerationResult",
    "CSPromptTemplates",
    "ModelSelector",
    "BatchCSGenerator",
    "CSGeneratorEvaluator",
    "CodeExplainerGenerator", 
    "ConceptSimplifierGenerator",
    "create_cs_generator",
    "create_code_explainer",
    "create_concept_simplifier",
    "quick_generate_answer",
    "batch_generate_responses"
]