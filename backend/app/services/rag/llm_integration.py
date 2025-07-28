#!/usr/bin/env python3
"""
LLM Integration for Smart RAG Agent

This module provides integration with various LLM APIs for generating
multiple candidate answers with different parameters and strategies.

Supports:
- OpenAI GPT models
- Anthropic Claude
- Local models via Hugging Face
- Custom model endpoints
"""

import asyncio
import aiohttp
import json
import logging
from typing import List, Dict, Optional, Union
from dataclasses import dataclass
import torch
from transformers import AutoTokenizer, AutoModelForCausalLM
# Optional imports for external APIs
try:
    import openai
    HAS_OPENAI = True
except ImportError:
    HAS_OPENAI = False
    openai = None

try:
    from anthropic import AsyncAnthropic
    HAS_ANTHROPIC = True
except ImportError:
    HAS_ANTHROPIC = False
    AsyncAnthropic = None

logger = logging.getLogger(__name__)

@dataclass
class LLMConfig:
    """Configuration for LLM integration"""
    model_type: str = "huggingface"  # openai, anthropic, huggingface, custom
    model_name: str = "microsoft/DialoGPT-medium"
    api_key: Optional[str] = None
    base_url: Optional[str] = None
    max_tokens: int = 512
    timeout: float = 30.0
    device: str = "cuda" if torch.cuda.is_available() else "cpu"

class BaseLLMProvider:
    """Base class for LLM providers"""
    
    def __init__(self, config: LLMConfig):
        self.config = config
    
    async def generate(self, prompt: str, temperature: float = 0.7, 
                      max_tokens: int = None) -> str:
        """Generate text from prompt"""
        raise NotImplementedError
    
    async def generate_batch(self, prompts: List[str], 
                           temperatures: List[float]) -> List[str]:
        """Generate multiple responses in batch"""
        tasks = []
        for prompt, temp in zip(prompts, temperatures):
            tasks.append(self.generate(prompt, temp))
        return await asyncio.gather(*tasks)

class HuggingFaceLLM(BaseLLMProvider):
    """Local Hugging Face model provider"""
    
    def __init__(self, config: LLMConfig):
        super().__init__(config)
        self.tokenizer = None
        self.model = None
        self._load_model()
    
    def _load_model(self):
        """Load the Hugging Face model"""
        try:
            logger.info(f"Loading Hugging Face model: {self.config.model_name}")
            self.tokenizer = AutoTokenizer.from_pretrained(self.config.model_name)
            self.model = AutoModelForCausalLM.from_pretrained(
                self.config.model_name,
                torch_dtype=torch.float16 if self.config.device == "cuda" else torch.float32,
                device_map="auto" if self.config.device == "cuda" else None
            )
            
            # Add padding token if not present
            if self.tokenizer.pad_token is None:
                self.tokenizer.pad_token = self.tokenizer.eos_token
                
            logger.info("Model loaded successfully")
        except Exception as e:
            logger.error(f"Error loading model: {e}")
            raise
    
    async def generate(self, prompt: str, temperature: float = 0.7, 
                      max_tokens: int = None) -> str:
        """Generate text using local model"""
        max_tokens = max_tokens or self.config.max_tokens
        
        try:
            # Tokenize input
            inputs = self.tokenizer(
                prompt, 
                return_tensors="pt", 
                truncation=True, 
                max_length=512
            )
            
            if self.config.device == "cuda":
                inputs = {k: v.to("cuda") for k, v in inputs.items()}
            
            # Generate
            with torch.no_grad():
                outputs = self.model.generate(
                    **inputs,
                    max_new_tokens=max_tokens,
                    temperature=temperature,
                    do_sample=True,
                    pad_token_id=self.tokenizer.pad_token_id,
                    eos_token_id=self.tokenizer.eos_token_id,
                    num_return_sequences=1
                )
            
            # Decode output
            generated_text = self.tokenizer.decode(
                outputs[0][inputs['input_ids'].shape[1]:], 
                skip_special_tokens=True
            )
            
            return generated_text.strip()
            
        except Exception as e:
            logger.error(f"Error generating text: {e}")
            return f"Error generating response: {str(e)}"

class OpenAILLM(BaseLLMProvider):
    """OpenAI API provider"""
    
    def __init__(self, config: LLMConfig):
        super().__init__(config)
        if not HAS_OPENAI:
            raise ImportError("OpenAI package not installed. Install with: pip install openai")
        if not config.api_key:
            raise ValueError("OpenAI API key required")
        openai.api_key = config.api_key
    
    async def generate(self, prompt: str, temperature: float = 0.7, 
                      max_tokens: int = None) -> str:
        """Generate text using OpenAI API"""
        max_tokens = max_tokens or self.config.max_tokens
        
        try:
            response = await openai.ChatCompletion.acreate(
                model=self.config.model_name,
                messages=[{"role": "user", "content": prompt}],
                temperature=temperature,
                max_tokens=max_tokens,
                timeout=self.config.timeout
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            logger.error(f"OpenAI API error: {e}")
            return f"Error generating response: {str(e)}"

class AnthropicLLM(BaseLLMProvider):
    """Anthropic Claude API provider"""
    
    def __init__(self, config: LLMConfig):
        super().__init__(config)
        if not HAS_ANTHROPIC:
            raise ImportError("Anthropic package not installed. Install with: pip install anthropic")
        if not config.api_key:
            raise ValueError("Anthropic API key required")
        self.client = AsyncAnthropic(api_key=config.api_key)
    
    async def generate(self, prompt: str, temperature: float = 0.7, 
                      max_tokens: int = None) -> str:
        """Generate text using Anthropic API"""
        max_tokens = max_tokens or self.config.max_tokens
        
        try:
            response = await self.client.messages.create(
                model=self.config.model_name,
                max_tokens=max_tokens,
                temperature=temperature,
                messages=[{"role": "user", "content": prompt}]
            )
            return response.content[0].text.strip()
        except Exception as e:
            logger.error(f"Anthropic API error: {e}")
            return f"Error generating response: {str(e)}"

class CustomAPILLM(BaseLLMProvider):
    """Custom API endpoint provider"""
    
    async def generate(self, prompt: str, temperature: float = 0.7, 
                      max_tokens: int = None) -> str:
        """Generate text using custom API"""
        max_tokens = max_tokens or self.config.max_tokens
        
        payload = {
            "prompt": prompt,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "model": self.config.model_name
        }
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    self.config.base_url,
                    json=payload,
                    timeout=aiohttp.ClientTimeout(total=self.config.timeout)
                ) as response:
                    result = await response.json()
                    return result.get("generated_text", "").strip()
        except Exception as e:
            logger.error(f"Custom API error: {e}")
            return f"Error generating response: {str(e)}"

class MultiLLMGenerator:
    """Enhanced generator that uses actual LLM APIs for test-time compute"""
    
    def __init__(self, config: LLMConfig):
        self.config = config
        self.provider = self._create_provider()
    
    def _create_provider(self) -> BaseLLMProvider:
        """Create appropriate LLM provider based on config"""
        if self.config.model_type == "openai":
            return OpenAILLM(self.config)
        elif self.config.model_type == "anthropic":
            return AnthropicLLM(self.config)
        elif self.config.model_type == "huggingface":
            return HuggingFaceLLM(self.config)
        elif self.config.model_type == "custom":
            return CustomAPILLM(self.config)
        else:
            raise ValueError(f"Unknown model type: {self.config.model_type}")
    
    async def generate_candidates(self, query: str, context: str, 
                                num_candidates: int = 8) -> List[Dict]:
        """Generate multiple candidate answers using different strategies"""
        
        # Different generation strategies with varying temperatures and prompts
        strategies = [
            {
                "name": "precise",
                "temperature": 0.2,
                "prompt_style": "factual",
                "instruction": "Provide a precise, factual answer based strictly on the context."
            },
            {
                "name": "balanced", 
                "temperature": 0.5,
                "prompt_style": "comprehensive",
                "instruction": "Provide a well-balanced answer that covers key aspects."
            },
            {
                "name": "creative",
                "temperature": 0.9,
                "prompt_style": "insightful", 
                "instruction": "Provide an insightful answer that explores implications."
            },
            {
                "name": "focused",
                "temperature": 0.3,
                "prompt_style": "targeted",
                "instruction": "Focus on the most important aspect of the question."
            },
            {
                "name": "comprehensive",
                "temperature": 0.6,
                "prompt_style": "detailed",
                "instruction": "Provide a comprehensive answer covering multiple perspectives."
            },
            {
                "name": "analytical",
                "temperature": 0.4,
                "prompt_style": "logical",
                "instruction": "Analyze the question systematically and provide logical reasoning."
            },
            {
                "name": "practical",
                "temperature": 0.7,
                "prompt_style": "applied",
                "instruction": "Focus on practical applications and real-world examples."
            },
            {
                "name": "theoretical",
                "temperature": 0.8,
                "prompt_style": "conceptual",
                "instruction": "Explore theoretical foundations and underlying concepts."
            }
        ]
        
        # Generate prompts for each strategy
        prompts = []
        strategy_configs = []
        
        for i, strategy in enumerate(strategies[:num_candidates]):
            prompt = self._build_strategy_prompt(query, context, strategy)
            prompts.append(prompt)
            strategy_configs.append(strategy)
        
        # Generate all candidates
        logger.info(f"Generating {len(prompts)} candidate answers...")
        
        tasks = []
        for prompt, strategy in zip(prompts, strategy_configs):
            task = self.provider.generate(
                prompt, 
                temperature=strategy["temperature"],
                max_tokens=self.config.max_tokens
            )
            tasks.append(task)
        
        responses = await asyncio.gather(*tasks)
        
        # Format results
        candidates = []
        for response, strategy in zip(responses, strategy_configs):
            candidates.append({
                "answer": response,
                "strategy": strategy["name"],
                "temperature": strategy["temperature"],
                "prompt_style": strategy["prompt_style"],
                "raw_response": response
            })
        
        logger.info(f"Generated {len(candidates)} candidates successfully")
        return candidates
    
    def _build_strategy_prompt(self, query: str, context: str, strategy: Dict) -> str:
        """Build prompt based on strategy"""
        
        # Different prompt templates for different styles
        templates = {
            "factual": """Context: {context}

Question: {query}

Instructions: {instruction} Base your answer only on the provided context.

Answer:""",
            
            "comprehensive": """Context: {context}

Question: {query}

Instructions: {instruction} Consider all relevant aspects and provide thorough explanation.

Answer:""",
            
            "insightful": """Context: {context}

Question: {query}

Instructions: {instruction} Think deeply about the implications and connections.

Answer:""",
            
            "targeted": """Context: {context}

Question: {query}

Instructions: {instruction} Identify the core issue and address it directly.

Answer:""",
            
            "detailed": """Context: {context}

Question: {query}

Instructions: {instruction} Provide step-by-step explanations and examples.

Answer:""",
            
            "logical": """Context: {context}

Question: {query}

Instructions: {instruction} Break down the problem systematically.

Answer:""",
            
            "applied": """Context: {context}

Question: {query}

Instructions: {instruction} Include concrete examples and use cases.

Answer:""",
            
            "conceptual": """Context: {context}

Question: {query}

Instructions: {instruction} Explain the underlying principles and theory.

Answer:"""
        }
        
        template = templates.get(strategy["prompt_style"], templates["factual"])
        
        return template.format(
            context=context,
            query=query,
            instruction=strategy["instruction"]
        )

# Integration with the Smart RAG Agent
class EnhancedSmartRagAgent:
    """Enhanced Smart RAG Agent with real LLM integration"""
    
    def __init__(self, rag_config, llm_config: LLMConfig):
        # Import here to avoid circular imports
        from .smart_rag_agent import SmartRagAgent
        
        self.base_agent = SmartRagAgent(rag_config)
        self.llm_generator = MultiLLMGenerator(llm_config)
        self.llm_config = llm_config
    
    async def answer_query(self, query: str, ground_truth: str = None) -> Dict:
        """Enhanced query answering with real LLM generation"""
        logger.info(f"Processing query with enhanced LLM: {query[:100]}...")
        
        # Step 1: Retrieve relevant documents
        retrieved_docs = self.base_agent.document_processor.retrieve_documents(query)
        context = self.base_agent._combine_documents(retrieved_docs)
        
        # Step 2: Generate multiple candidate answers using real LLM
        candidates = await self.llm_generator.generate_candidates(
            query, context, self.llm_config.max_tokens
        )
        
        # Step 3: Score all candidates
        scored_candidates = await self.base_agent._score_candidates(query, candidates, context)
        
        # Step 4: Select best answer
        best_candidate = max(scored_candidates, key=lambda x: x['score'])
        
        # Step 5: If ground truth provided, perform backpropagation
        loss = None
        if ground_truth:
            loss = await self.base_agent._compute_loss_and_backprop(
                query, best_candidate, ground_truth, context
            )
        
        result = {
            "query": query,
            "answer": best_candidate['answer'],
            "confidence": best_candidate['score'],
            "strategy_used": best_candidate['strategy'],
            "temperature": best_candidate['temperature'],
            "retrieved_docs": len(retrieved_docs),
            "candidates_generated": len(candidates),
            "context_length": len(context),
            "llm_model": self.llm_config.model_name,
            "all_candidates": scored_candidates  # For analysis
        }
        
        if loss is not None:
            result["training_loss"] = loss
            
        return result

# Example usage
async def test_llm_integration():
    """Test the LLM integration"""
    
    # Test with Hugging Face local model
    llm_config = LLMConfig(
        model_type="huggingface",
        model_name="microsoft/DialoGPT-small",  # Smaller model for testing
        max_tokens=256
    )
    
    generator = MultiLLMGenerator(llm_config)
    
    query = "How do I implement binary search?"
    context = "Binary search is an algorithm that finds a target value in a sorted array by repeatedly dividing the search interval in half."
    
    candidates = await generator.generate_candidates(query, context, num_candidates=3)
    
    print("Generated candidates:")
    for i, candidate in enumerate(candidates):
        print(f"\nCandidate {i+1} ({candidate['strategy']}):")
        print(f"Temperature: {candidate['temperature']}")
        print(f"Answer: {candidate['answer'][:200]}...")

if __name__ == "__main__":
    asyncio.run(test_llm_integration())