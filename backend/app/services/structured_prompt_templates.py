#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Structured Prompt Templates for High-Quality RAG
===============================================

Question-type aware prompt templates to eliminate vague responses
and ensure specific, accurate answers.

Author: Engunity AI Team
"""

import re
import logging
from typing import Dict, List, Optional, Any
from dataclasses import dataclass

logger = logging.getLogger(__name__)

@dataclass
class PromptTemplate:
    """Structured prompt template"""
    name: str
    system_prompt: str
    user_template: str
    constraints: List[str]
    quality_indicators: List[str]

class StructuredPromptTemplates:
    """Collection of structured prompt templates by question type"""
    
    def __init__(self):
        self.templates = self._initialize_templates()
        logger.info(f"Initialized {len(self.templates)} structured prompt templates")
    
    def _initialize_templates(self) -> Dict[str, PromptTemplate]:
        """Initialize all prompt templates"""
        templates = {}
        
        # Definition/Explanation Template
        templates["definition"] = PromptTemplate(
            name="definition",
            system_prompt="""You are a precise computer science assistant. Your task is to provide clear, accurate definitions based ONLY on the provided context.

STRICT RULES:
- Answer using ONLY the provided context
- Do NOT use words like "may", "sometimes", "various", "often", "typically"
- Provide specific, concrete information
- Use bullet points for clarity when appropriate
- If the answer is not in the context, say: "The document does not provide this specific information."
- NEVER hallucinate or add information not in the context""",
            user_template="""Based on the following context from the document, provide a clear definition for: {question}

CONTEXT:
{context}

QUESTION: {question}

Provide a precise definition using the exact information from the context above. Be specific and avoid vague terms.""",
            constraints=[
                "Must use only provided context",
                "No vague qualifiers allowed",
                "Must be specific and concrete",
                "Include relevant technical details"
            ],
            quality_indicators=[
                "Contains specific technical terms",
                "Provides concrete examples or details",
                "Avoids vague language",
                "Directly addresses the question"
            ]
        )
        
        # How-to/Process Template
        templates["process"] = PromptTemplate(
            name="process",
            system_prompt="""You are a computer science assistant specializing in explaining processes and procedures. Provide step-by-step explanations based ONLY on the provided context.

STRICT RULES:
- Answer using ONLY the provided context
- Break down processes into clear, numbered steps
- Use specific terminology from the context
- Avoid vague terms like "simply", "just", "easily"
- If steps are unclear from context, state: "The document does not provide complete step-by-step details."
- Include code examples if they exist in the context""",
            user_template="""Based on the following context, explain the process for: {question}

CONTEXT:
{context}

QUESTION: {question}

Provide a step-by-step explanation using the information from the context. Number each step clearly.""",
            constraints=[
                "Must provide numbered steps",
                "Use specific terminology from context",
                "Include code examples when available",
                "No oversimplification"
            ],
            quality_indicators=[
                "Contains numbered steps",
                "Uses technical terminology correctly",
                "Includes specific implementation details",
                "Provides actionable information"
            ]
        )
        
        # Comparison Template
        templates["comparison"] = PromptTemplate(
            name="comparison",
            system_prompt="""You are a computer science assistant specializing in technical comparisons. Compare technologies, concepts, or approaches based ONLY on the provided context.

STRICT RULES:
- Answer using ONLY the provided context
- Create clear comparison points
- Use specific facts and figures when available
- Avoid subjective language like "better", "worse" without context-based justification
- If comparison information is incomplete, state: "The document provides limited comparison information."
- Structure comparisons in a clear format""",
            user_template="""Based on the following context, compare: {question}

CONTEXT:
{context}

QUESTION: {question}

Provide a structured comparison using only the information from the context. Use specific details and avoid subjective judgments.""",
            constraints=[
                "Must use structured comparison format",
                "Include specific technical details",
                "Base judgments on context facts",
                "Avoid subjective language without justification"
            ],
            quality_indicators=[
                "Uses structured comparison format",
                "Contains specific technical metrics",
                "Avoids unsupported claims",
                "Provides balanced analysis"
            ]
        )
        
        # Code Explanation Template
        templates["code"] = PromptTemplate(
            name="code",
            system_prompt="""You are a computer science assistant specializing in code analysis. Explain code functionality based ONLY on the provided context.

STRICT RULES:
- Answer using ONLY the provided context
- Explain code line-by-line or section-by-section
- Use precise programming terminology
- Include input/output behavior when shown
- If code is incomplete in context, state: "The document shows partial code implementation."
- Explain the purpose and functionality clearly""",
            user_template="""Based on the following context, explain the code: {question}

CONTEXT:
{context}

QUESTION: {question}

Provide a detailed code explanation using the information from the context. Explain what the code does step by step.""",
            constraints=[
                "Must explain code functionality clearly",
                "Use correct programming terminology",
                "Include input/output behavior",
                "Explain step-by-step execution"
            ],
            quality_indicators=[
                "Contains accurate code analysis",
                "Uses proper programming terminology",
                "Explains execution flow",
                "Includes technical implementation details"
            ]
        )
        
        # Features/Benefits Template
        templates["features"] = PromptTemplate(
            name="features",
            system_prompt="""You are a computer science assistant specializing in technology features and benefits. List features and benefits based ONLY on the provided context.

STRICT RULES:
- Answer using ONLY the provided context
- Present features as numbered or bulleted lists
- Provide specific benefits with context-based evidence
- Avoid marketing language or unsupported claims
- If features are not clearly listed, state: "The document mentions these aspects but does not provide a comprehensive feature list."
- Include technical specifications when available""",
            user_template="""Based on the following context, list the features and benefits of: {question}

CONTEXT:
{context}

QUESTION: {question}

Provide a structured list of features and benefits using only the information from the context.""",
            constraints=[
                "Must use structured list format",
                "Include specific technical features",
                "Provide evidence-based benefits",
                "Avoid unsupported marketing claims"
            ],
            quality_indicators=[
                "Uses clear list structure",
                "Contains specific technical features",
                "Provides measurable benefits",
                "Avoids vague promotional language"
            ]
        )
        
        # General Technical Template
        templates["general"] = PromptTemplate(
            name="general",
            system_prompt="""You are a precise computer science assistant. Provide accurate, specific answers based ONLY on the provided context.

STRICT RULES:
- Answer using ONLY the provided context
- Be specific and avoid vague language
- Use technical terminology correctly
- Provide concrete examples when available in context
- If information is insufficient, state: "The document does not provide sufficient information to fully answer this question."
- Structure your answer clearly with proper formatting""",
            user_template="""Based on the following context, answer: {question}

CONTEXT:
{context}

QUESTION: {question}

Provide a comprehensive answer using only the information from the context. Be specific and technical.""",
            constraints=[
                "Must use only provided context",
                "Avoid vague qualifiers",
                "Use technical precision",
                "Provide structured answers"
            ],
            quality_indicators=[
                "Contains specific technical information",
                "Uses proper terminology",
                "Provides concrete details",
                "Well-structured response"
            ]
        )
        
        return templates
    
    def classify_question_type(self, question: str) -> str:
        """Classify question type to select appropriate template"""
        question_lower = question.lower().strip()
        
        # Definition patterns
        if any(pattern in question_lower for pattern in [
            'what is', 'define', 'definition of', 'what does', 'what are'
        ]):
            return "definition"
        
        # Process/How-to patterns
        if any(pattern in question_lower for pattern in [
            'how to', 'how do', 'how does', 'explain how', 'process of', 'steps to'
        ]):
            return "process"
        
        # Comparison patterns
        if any(pattern in question_lower for pattern in [
            'difference between', 'compare', 'vs', 'versus', 'better than', 'advantages over'
        ]):
            return "comparison"
        
        # Code explanation patterns
        if any(pattern in question_lower for pattern in [
            'explain the code', 'what does this code', 'code does', 'function of', 'implementation'
        ]) or 'code' in question_lower:
            return "code"
        
        # Features/Benefits patterns
        if any(pattern in question_lower for pattern in [
            'features of', 'benefits of', 'advantages of', 'capabilities of', 'key features'
        ]):
            return "features"
        
        # Default to general
        return "general"
    
    def get_prompt(self, question: str, context: str, question_type: Optional[str] = None) -> Dict[str, str]:
        """Get structured prompt for question"""
        
        if question_type is None:
            question_type = self.classify_question_type(question)
        
        template = self.templates.get(question_type, self.templates["general"])
        
        # Format the prompt
        user_prompt = template.user_template.format(
            question=question,
            context=context
        )
        
        logger.info(f"Generated {question_type} prompt for question: {question[:50]}...")
        
        return {
            "system_prompt": template.system_prompt,
            "user_prompt": user_prompt,
            "template_name": template.name,
            "constraints": template.constraints,
            "quality_indicators": template.quality_indicators
        }
    
    def validate_response_quality(self, response: str, template_name: str) -> Dict[str, Any]:
        """Validate response quality against template requirements"""
        
        if template_name not in self.templates:
            return {"valid": True, "score": 0.5, "issues": ["Unknown template"]}
        
        template = self.templates[template_name]
        issues = []
        score = 1.0
        
        # Check for vague terms
        vague_terms = ['may', 'might', 'sometimes', 'often', 'usually', 'typically', 'various', 'many', 'some']
        for term in vague_terms:
            if re.search(r'\b' + term + r'\b', response.lower()):
                issues.append(f"Contains vague term: '{term}'")
                score -= 0.1
        
        # Check for hallucination indicators
        hallucination_phrases = [
            'in general', 'it is known that', 'commonly', 'it is believed',
            'studies show', 'research indicates', 'experts say'
        ]
        for phrase in hallucination_phrases:
            if phrase in response.lower():
                issues.append(f"Potential hallucination: '{phrase}'")
                score -= 0.2
        
        # Check for required structure based on template
        if template_name == "process" and not re.search(r'\d+\.', response):
            issues.append("Process template requires numbered steps")
            score -= 0.3
        
        if template_name == "features" and not any(marker in response for marker in ['•', '-', '1.', '*']):
            issues.append("Features template requires list format")
            score -= 0.3
        
        # Check minimum length
        if len(response.strip()) < 50:
            issues.append("Response too short")
            score -= 0.4
        
        # Check for context dependency
        if "the document does not provide" not in response.lower() and len(response.strip()) < 100:
            issues.append("Response may be too brief for context provided")
            score -= 0.2
        
        score = max(0.0, score)
        
        return {
            "valid": score >= 0.6,
            "score": score,
            "issues": issues,
            "template_used": template_name
        }

# Global instance
_prompt_templates = None

def get_prompt_templates() -> StructuredPromptTemplates:
    """Get global prompt templates instance"""
    global _prompt_templates
    if _prompt_templates is None:
        _prompt_templates = StructuredPromptTemplates()
    return _prompt_templates