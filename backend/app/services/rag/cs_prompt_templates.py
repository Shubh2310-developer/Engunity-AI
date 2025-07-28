"""
CS-Centric Prompt Templates for RAG Pipeline

Structured prompt templates designed for Computer Science education,
programming assistance, algorithm explanations, and code reviews.

File: backend/app/services/rag/cs_prompt_templates.py
"""

import json
import re
from typing import Dict, List, Optional, Any, Union
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
import logging

logger = logging.getLogger(__name__)


class TemplateType(str, Enum):
    """Types of CS prompt templates."""
    PROGRAMMING_QA = "programming_qa"
    ALGORITHM_EXPLANATION = "algorithm_explanation"
    CODE_REVIEW = "code_review"
    CODE_DOCUMENTATION = "code_documentation"
    THEORY_TO_PRACTICE = "theory_to_practice"
    DEBUGGING_HELP = "debugging_help"
    OPTIMIZATION_ADVICE = "optimization_advice"
    CONCEPT_COMPARISON = "concept_comparison"
    TUTORIAL_CREATION = "tutorial_creation"
    BEST_PRACTICES = "best_practices"
    INTERVIEW_PREP = "interview_prep"
    PROJECT_GUIDANCE = "project_guidance"


class DifficultyLevel(str, Enum):
    """Difficulty levels for adaptive prompts."""
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"
    EXPERT = "expert"


class ResponseStyle(str, Enum):
    """Response style preferences."""
    CONCISE = "concise"
    DETAILED = "detailed"
    CONVERSATIONAL = "conversational"
    FORMAL = "formal"
    TUTORIAL = "tutorial"


@dataclass
class TemplateContext:
    """Context information for template rendering."""
    user_question: str = ""
    code_snippet: str = ""
    language: str = "python"
    algorithm_name: str = ""
    topic: str = ""
    difficulty_level: DifficultyLevel = DifficultyLevel.INTERMEDIATE
    response_style: ResponseStyle = ResponseStyle.DETAILED
    include_examples: bool = True
    include_complexity: bool = True
    include_best_practices: bool = True
    context_information: str = ""
    specific_requirements: List[str] = field(default_factory=list)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for template rendering."""
        return {
            "user_question": self.user_question,
            "code_snippet": self.code_snippet,
            "language": self.language,
            "algorithm_name": self.algorithm_name,
            "topic": self.topic,
            "difficulty_level": self.difficulty_level.value,
            "response_style": self.response_style.value,
            "include_examples": self.include_examples,
            "include_complexity": self.include_complexity,
            "include_best_practices": self.include_best_practices,
            "context_information": self.context_information,
            "specific_requirements": self.specific_requirements
        }


class CSPromptTemplates:
    """Comprehensive CS prompt templates with dynamic rendering."""
    
    def __init__(self):
        self.templates = self._initialize_templates()
        self.system_prompts = self._initialize_system_prompts()
        self.template_modifiers = self._initialize_modifiers()
    
    def _initialize_templates(self) -> Dict[TemplateType, str]:
        """Initialize all CS-specific prompt templates."""
        return {
            TemplateType.PROGRAMMING_QA: self._programming_qa_template(),
            TemplateType.ALGORITHM_EXPLANATION: self._algorithm_explanation_template(),
            TemplateType.CODE_REVIEW: self._code_review_template(),
            TemplateType.CODE_DOCUMENTATION: self._code_documentation_template(),
            TemplateType.THEORY_TO_PRACTICE: self._theory_to_practice_template(),
            TemplateType.DEBUGGING_HELP: self._debugging_help_template(),
            TemplateType.OPTIMIZATION_ADVICE: self._optimization_advice_template(),
            TemplateType.CONCEPT_COMPARISON: self._concept_comparison_template(),
            TemplateType.TUTORIAL_CREATION: self._tutorial_creation_template(),
            TemplateType.BEST_PRACTICES: self._best_practices_template(),
            TemplateType.INTERVIEW_PREP: self._interview_prep_template(),
            TemplateType.PROJECT_GUIDANCE: self._project_guidance_template()
        }
    
    def _programming_qa_template(self) -> str:
        """Template for programming questions and implementation queries."""
        return """You are an expert software engineer and computer science instructor with deep knowledge of programming languages, algorithms, and software development best practices.

{context_section}

Programming Question:
{user_question}

{requirements_section}

Please provide a comprehensive answer that includes:
1. **Clear Explanation**: Explain the concept or approach clearly
2. **Implementation**: Provide clean, well-commented code in {language}
3. **Key Points**: Highlight important implementation details
{complexity_section}
{examples_section}
{best_practices_section}

{style_modifier}

Answer:"""

    def _algorithm_explanation_template(self) -> str:
        """Template for explaining algorithms with step-by-step breakdown."""
        return """You are a computer science professor specializing in algorithms and data structures. Your goal is to make complex algorithms understandable and accessible.

{context_section}

Algorithm to Explain: {algorithm_name}

Please provide a comprehensive explanation covering:

1. **Problem Definition**: What problem does this algorithm solve?
2. **Core Concept**: The fundamental idea behind the algorithm
3. **Step-by-Step Process**: Break down the algorithm into clear steps
4. **Visual Description**: Describe how the algorithm works conceptually
{complexity_section}
{implementation_section}
7. **Use Cases**: When and where to use this algorithm
8. **Variations**: Common variations or optimizations

{style_modifier}

Algorithm Explanation:"""

    def _code_review_template(self) -> str:
        """Template for comprehensive code reviews."""
        return """You are a senior software engineer conducting a thorough code review. Focus on code quality, best practices, performance, and maintainability.

{context_section}

Code to Review:
```{language}
{code_snippet}
```

Please provide a detailed code review covering:

1. **Overall Assessment**: High-level evaluation of the code
2. **Correctness**: Does the code work as intended? Any logical errors?
3. **Code Quality**: 
   - Readability and clarity
   - Naming conventions
   - Code structure and organization
4. **Performance Analysis**:
   - Time and space complexity
   - Potential bottlenecks
   - Optimization opportunities
5. **Best Practices**:
   - Language-specific conventions
   - Design patterns usage
   - Error handling
6. **Security Considerations**: Any potential vulnerabilities
7. **Maintainability**: How easy is it to modify and extend?
8. **Specific Suggestions**: Concrete improvements with examples

{style_modifier}

Code Review:"""

    def _code_documentation_template(self) -> str:
        """Template for generating comprehensive code documentation."""
        return """You are a technical writer specializing in software documentation. Create clear, comprehensive documentation that helps other developers understand and use the code effectively.

{context_section}

Code to Document:
```{language}
{code_snippet}
```

Generate comprehensive documentation including:

1. **Function/Class Overview**: Brief description of purpose and functionality
2. **Detailed Docstring**: Follow {language} documentation standards
3. **Parameters**: Detailed description of all parameters with types
4. **Return Values**: Description of return values and types
5. **Usage Examples**: Practical examples showing how to use the code
6. **Edge Cases**: Important edge cases and how they're handled
7. **Exceptions**: What exceptions might be raised and when
8. **Complexity**: Time and space complexity analysis
9. **Dependencies**: Required imports or external dependencies
10. **Notes**: Additional implementation notes or warnings

{style_modifier}

Documentation:"""

    def _theory_to_practice_template(self) -> str:
        """Template for connecting theoretical concepts to practical applications."""
        return """You are a computer science educator specializing in bridging theoretical concepts with real-world applications. Your goal is to make abstract concepts concrete and applicable.

{context_section}

Theoretical Concept: {topic}

Please explain how this theoretical concept translates to practical applications:

1. **Theoretical Foundation**: 
   - Core theoretical principles
   - Mathematical or logical basis
   - Key properties and characteristics

2. **Real-World Applications**:
   - Specific industries or domains where it's used
   - Concrete examples of implementation
   - Why this concept is valuable in practice

3. **Implementation Examples**:
   - Code examples demonstrating the concept
   - System design examples
   - Architectural patterns that use this concept

4. **Practical Considerations**:
   - Implementation challenges
   - Trade-offs and limitations
   - Performance implications

5. **Case Studies**: Real examples from major companies or systems

{style_modifier}

Theory-to-Practice Explanation:"""

    def _debugging_help_template(self) -> str:
        """Template for debugging assistance and problem-solving."""
        return """You are an expert debugger and problem-solving specialist. Help identify and resolve coding issues with systematic analysis.

{context_section}

Problem Description:
{user_question}

{code_section}

Please provide systematic debugging assistance:

1. **Problem Analysis**:
   - Identify the most likely cause(s)
   - Explain why this issue occurs
   - Categorize the type of problem (logic, syntax, runtime, etc.)

2. **Diagnostic Steps**:
   - How to reproduce the issue
   - What to look for during debugging
   - Debugging tools and techniques to use

3. **Solution Strategy**:
   - Step-by-step fix approach
   - Multiple solution alternatives if applicable
   - Corrected code with explanations

4. **Prevention**:
   - How to avoid this issue in the future
   - Best practices for this type of code
   - Testing strategies

5. **Learning Opportunity**: What this teaches about programming

{style_modifier}

Debugging Analysis:"""

    def _optimization_advice_template(self) -> str:
        """Template for performance optimization guidance."""
        return """You are a performance optimization expert specializing in code efficiency and system performance. Provide actionable optimization advice.

{context_section}

Code/System to Optimize:
```{language}
{code_snippet}
```

Optimization Goal: {user_question}

Please provide comprehensive optimization guidance:

1. **Performance Analysis**:
   - Current time and space complexity
   - Identify performance bottlenecks
   - Profiling recommendations

2. **Optimization Strategies**:
   - Algorithm-level optimizations
   - Data structure improvements
   - Code-level optimizations
   - System-level considerations

3. **Optimized Implementation**:
   - Improved code with explanations
   - Before/after comparison
   - Complexity analysis of improvements

4. **Trade-offs**:
   - What are we sacrificing for performance?
   - Memory vs. time trade-offs
   - Code readability vs. performance

5. **Benchmarking**: How to measure improvements
6. **Advanced Techniques**: Specialized optimization approaches

{style_modifier}

Optimization Advice:"""

    def _concept_comparison_template(self) -> str:
        """Template for comparing CS concepts, algorithms, or approaches."""
        return """You are a computer science expert specializing in comparative analysis. Provide clear, structured comparisons that help with decision-making.

{context_section}

Comparison Topic: {user_question}

Please provide a structured comparison covering:

1. **Overview**: Brief introduction to each concept/approach
2. **Key Differences**: 
   - Fundamental differences in approach
   - Different use cases and applications
   - Performance characteristics

3. **Detailed Comparison Table**:
   | Aspect | Option A | Option B |
   |--------|----------|----------|
   | Time Complexity | ... | ... |
   | Space Complexity | ... | ... |
   | Use Cases | ... | ... |
   | Pros | ... | ... |
   | Cons | ... | ... |

4. **Code Examples**: Implementation examples for each approach
5. **Performance Analysis**: Benchmarking and complexity analysis
6. **Decision Guidelines**: When to choose each option
7. **Recommendations**: Best practices for each approach

{style_modifier}

Comparison Analysis:"""

    def _tutorial_creation_template(self) -> str:
        """Template for creating step-by-step tutorials."""
        return """You are an experienced programming instructor creating educational tutorials. Make complex topics accessible through structured, hands-on learning.

{context_section}

Tutorial Topic: {topic}
Target Audience: {difficulty_level} level

Create a comprehensive tutorial covering:

1. **Prerequisites**: What students should know before starting
2. **Learning Objectives**: Clear goals for what students will achieve
3. **Conceptual Overview**: High-level explanation of the topic

4. **Step-by-Step Tutorial**:
   - Step 1: [Foundation concepts]
   - Step 2: [Basic implementation]
   - Step 3: [Building complexity]
   - Step 4: [Advanced features]
   - Step 5: [Real-world application]

5. **Hands-on Exercises**: 
   - Practice problems with solutions
   - Progressive difficulty
   - Real-world scenarios

6. **Common Pitfalls**: What students typically struggle with
7. **Best Practices**: Professional tips and techniques
8. **Next Steps**: What to learn after mastering this topic

{style_modifier}

Tutorial:"""

    def _best_practices_template(self) -> str:
        """Template for best practices and coding standards."""
        return """You are a software engineering expert specializing in best practices, coding standards, and professional development practices.

{context_section}

Topic: {topic}
Programming Language: {language}

Please provide comprehensive best practices guidance covering:

1. **Core Principles**: Fundamental principles to follow
2. **Coding Standards**: 
   - Naming conventions
   - Code organization
   - Formatting and style

3. **Design Patterns**: Recommended patterns for this context
4. **Security Considerations**: Security best practices
5. **Performance Guidelines**: Performance-related best practices
6. **Testing Strategies**: How to test this type of code
7. **Documentation Standards**: How to document effectively
8. **Code Examples**: Good vs. bad examples with explanations
9. **Tool Recommendations**: Helpful tools and libraries
10. **Industry Standards**: What leading companies do

{style_modifier}

Best Practices Guide:"""

    def _interview_prep_template(self) -> str:
        """Template for interview preparation and problem-solving."""
        return """You are an experienced technical interviewer and coding mentor helping candidates prepare for technical interviews.

{context_section}

Interview Question/Topic: {user_question}

Provide comprehensive interview preparation covering:

1. **Problem Understanding**:
   - Break down the problem
   - Identify key requirements
   - Clarify edge cases

2. **Solution Approach**:
   - Multiple solution strategies
   - Trade-offs between approaches
   - Optimal solution identification

3. **Implementation**:
   - Clean, interview-ready code
   - Step-by-step implementation
   - Code explanation

4. **Complexity Analysis**: Time and space complexity
5. **Testing Strategy**: How to test the solution
6. **Follow-up Questions**: Common variations or extensions
7. **Interview Tips**: How to communicate during the interview
8. **Common Mistakes**: What to avoid

{style_modifier}

Interview Preparation:"""

    def _project_guidance_template(self) -> str:
        """Template for project architecture and development guidance."""
        return """You are a senior software architect and project lead providing guidance on software development projects.

{context_section}

Project: {user_question}

Provide comprehensive project guidance covering:

1. **Project Analysis**:
   - Understanding requirements
   - Identifying key challenges
   - Success criteria

2. **Architecture Design**:
   - System architecture recommendations
   - Technology stack suggestions
   - Design patterns to use

3. **Development Plan**:
   - Phase-by-phase development approach
   - Milestone definitions
   - Risk mitigation strategies

4. **Implementation Guidelines**:
   - Coding standards and practices
   - Testing strategy
   - Documentation requirements

5. **Technical Considerations**:
   - Scalability planning
   - Performance optimization
   - Security requirements

6. **Tools and Resources**: Recommended tools and libraries
7. **Timeline Estimation**: Realistic development timeline
8. **Deployment Strategy**: How to deploy and maintain

{style_modifier}

Project Guidance:"""

    def _initialize_system_prompts(self) -> Dict[str, str]:
        """Initialize system-level prompts for different contexts."""
        return {
            "expert": "You are an expert computer scientist with deep knowledge of algorithms, data structures, programming languages, and software engineering principles.",
            "instructor": "You are a patient and knowledgeable computer science instructor focused on helping students learn effectively.",
            "mentor": "You are a experienced programming mentor dedicated to helping developers improve their skills and solve complex problems.",
            "reviewer": "You are a senior software engineer conducting thorough code reviews with focus on quality, performance, and best practices.",
            "architect": "You are a software architect with extensive experience in system design and large-scale software development."
        }

    def _initialize_modifiers(self) -> Dict[str, Dict[str, str]]:
        """Initialize template modifiers for different contexts."""
        return {
            "difficulty": {
                "beginner": "Keep explanations simple and include basic concepts. Use analogies and avoid jargon.",
                "intermediate": "Provide balanced explanations with some advanced concepts. Assume familiarity with basic programming.",
                "advanced": "Use technical terminology freely. Focus on advanced concepts and edge cases.",
                "expert": "Provide in-depth analysis with cutting-edge techniques and research insights."
            },
            "style": {
                "concise": "Be concise and to-the-point. Focus on essential information only.",
                "detailed": "Provide comprehensive explanations with thorough coverage of the topic.",
                "conversational": "Use a friendly, conversational tone as if talking to a colleague.",
                "formal": "Use formal, academic language appropriate for documentation or papers.",
                "tutorial": "Structure as a step-by-step tutorial with clear progression."
            },
            "sections": {
                "complexity": "4. **Complexity Analysis**: Analyze time and space complexity with Big O notation",
                "examples": "5. **Examples**: Provide practical examples and use cases",
                "best_practices": "6. **Best Practices**: Include coding best practices and professional tips",
                "code_section": "Code (if applicable):\n```{language}\n{code_snippet}\n```",
                "context_section": "Context Information:\n{context_information}",
                "requirements_section": "Specific Requirements:\n{requirements_list}",
                "implementation_section": "5. **Implementation**: Provide clean code example in {language}"
            }
        }

    def get_template(self, template_type: TemplateType) -> str:
        """Get base template by type."""
        return self.templates.get(template_type, self.templates[TemplateType.PROGRAMMING_QA])

    def render_template(
        self,
        template_type: TemplateType,
        context: TemplateContext,
        **kwargs
    ) -> str:
        """
        Render template with context and additional parameters.
        
        Args:
            template_type: Type of template to render
            context: Template context with variables
            **kwargs: Additional template variables
            
        Returns:
            Rendered template string
        """
        template = self.get_template(template_type)
        
        # Prepare template variables
        template_vars = context.to_dict()
        template_vars.update(kwargs)
        
        # Add modifiers based on context
        template_vars.update(self._get_dynamic_modifiers(context))
        
        # Handle missing variables gracefully
        template_vars = self._fill_missing_variables(template, template_vars)
        
        try:
            return template.format(**template_vars)
        except KeyError as e:
            logger.error(f"Missing template variable: {e}")
            return template
    
    def _get_dynamic_modifiers(self, context: TemplateContext) -> Dict[str, str]:
        """Get dynamic modifiers based on context."""
        modifiers = {}
        
        # Difficulty modifier
        modifiers["style_modifier"] = self.template_modifiers["difficulty"].get(
            context.difficulty_level.value, ""
        )
        
        # Add style modifier
        style_text = self.template_modifiers["style"].get(context.response_style.value, "")
        if style_text:
            modifiers["style_modifier"] += f" {style_text}"
        
        # Section modifiers
        sections = self.template_modifiers["sections"]
        
        modifiers["complexity_section"] = sections["complexity"] if context.include_complexity else ""
        modifiers["examples_section"] = sections["examples"] if context.include_examples else ""
        modifiers["best_practices_section"] = sections["best_practices"] if context.include_best_practices else ""
        
        # Context sections
        modifiers["context_section"] = sections["context_section"] if context.context_information else ""
        modifiers["code_section"] = sections["code_section"] if context.code_snippet else ""
        modifiers["implementation_section"] = sections["implementation_section"] if context.include_examples else ""
        
        # Requirements section
        if context.specific_requirements:
            req_list = "\n".join(f"- {req}" for req in context.specific_requirements)
            modifiers["requirements_section"] = sections["requirements_section"]
            modifiers["requirements_list"] = req_list
        else:
            modifiers["requirements_section"] = ""
            modifiers["requirements_list"] = ""
        
        return modifiers
    
    def _fill_missing_variables(self, template: str, variables: Dict[str, Any]) -> Dict[str, Any]:
        """Fill missing template variables with defaults."""
        import string
        
        # Find all variables in template
        formatter = string.Formatter()
        template_vars = {field_name for _, field_name, _, _ in formatter.parse(template) if field_name}
        
        # Fill missing variables
        for var in template_vars:
            if var not in variables:
                variables[var] = f"[{var.upper()}]"
        
        return variables

    def get_system_prompt(self, persona: str = "expert") -> str:
        """Get system prompt for specific persona."""
        return self.system_prompts.get(persona, self.system_prompts["expert"])

    def create_custom_template(
        self,
        template_name: str,
        template_content: str,
        description: str = ""
    ) -> None:
        """
        Add a custom template to the collection.
        
        Args:
            template_name: Name for the custom template
            template_content: Template content with placeholders
            description: Optional description of the template
        """
        # Convert to TemplateType if possible, otherwise store as custom
        try:
            template_type = TemplateType(template_name)
        except ValueError:
            # Create a custom template type
            template_type = f"custom_{template_name}"
        
        self.templates[template_type] = template_content
        logger.info(f"Added custom template: {template_name}")

    def validate_template(self, template: str) -> Dict[str, Any]:
        """
        Validate template syntax and required variables.
        
        Args:
            template: Template string to validate
            
        Returns:
            Validation results
        """
        import string
        
        try:
            # Check for syntax errors
            formatter = string.Formatter()
            variables = [field_name for _, field_name, _, _ in formatter.parse(template) if field_name]
            
            # Test formatting with dummy data
            dummy_context = TemplateContext(
                user_question="test question",
                code_snippet="test code",
                language="python",
                algorithm_name="test algorithm",
                topic="test topic"
            )
            
            dummy_vars = dummy_context.to_dict()
            dummy_vars.update(self._get_dynamic_modifiers(dummy_context))
            dummy_vars = self._fill_missing_variables(template, dummy_vars)
            
            template.format(**dummy_vars)
            
            return {
                "valid": True,
                "variables": variables,
                "errors": []
            }
            
        except Exception as e:
            return {
                "valid": False,
                "variables": [],
                "errors": [str(e)]
            }


# Utility functions for easy template access
def get_prompt_template(template_type: str) -> str:
    """
    Get prompt template by type name.
    
    Args:
        template_type: Template type as string
        
    Returns:
        Template string
    """
    templates = CSPromptTemplates()
    try:
        template_enum = TemplateType(template_type)
        return templates.get_template(template_enum)
    except ValueError:
        logger.warning(f"Unknown template type: {template_type}")
        return templates.get_template(TemplateType.PROGRAMMING_QA)


def render_cs_prompt(
    template_type: str,
    user_question: str = "",
    code_snippet: str = "",
    language: str = "python",
    difficulty: str = "intermediate",
    **kwargs
) -> str:
    """
    Quick template rendering function.
    
    Args:
        template_type: Type of template to use
        user_question: User's question
        code_snippet: Code snippet if applicable
        language: Programming language
        difficulty: Difficulty level
        **kwargs: Additional template variables
        
    Returns:
        Rendered template string
    """
    templates = CSPromptTemplates()
    
    context = TemplateContext(
        user_question=user_question,
        code_snippet=code_snippet,
        language=language,
        difficulty_level=DifficultyLevel(difficulty)
    )
    
    try:
        template_enum = TemplateType(template_type)
        return templates.render_template(template_enum, context, **kwargs)
    except ValueError:
        logger.warning(f"Unknown template type: {template_type}, using default")
        return templates.render_template(TemplateType.PROGRAMMING_QA, context, **kwargs)


def get_available_templates() -> List[str]:
    """Get list of available template types."""
    return [template.value for template in TemplateType]


def create_templates_instance() -> CSPromptTemplates:
    """Create a new templates instance."""
    return CSPromptTemplates()


# Export main classes and functions
__all__ = [
    "CSPromptTemplates",
    "TemplateType",
    "TemplateContext",
    "DifficultyLevel",
    "ResponseStyle",
    "get_prompt_template",
    "render_cs_prompt",
    "get_available_templates",
    "create_templates_instance"
]