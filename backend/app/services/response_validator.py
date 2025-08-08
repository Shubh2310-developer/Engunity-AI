#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Response Validator for RAG Quality Control
==========================================

Validates generated responses for quality, accuracy, and compliance
with structured prompt requirements.

Author: Engunity AI Team
"""

import re
import logging
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass
import numpy as np

logger = logging.getLogger(__name__)

@dataclass
class ValidationResult:
    """Response validation result"""
    is_valid: bool
    quality_score: float
    issues: List[str]
    suggestions: List[str]
    semantic_richness: float
    specificity_score: float
    context_adherence: float

class ResponseValidator:
    """Advanced response validation system"""
    
    def __init__(self):
        self.vague_terms = {
            'may', 'might', 'sometimes', 'often', 'usually', 'typically', 
            'various', 'many', 'some', 'several', 'numerous', 'multiple',
            'generally', 'commonly', 'frequently', 'occasionally', 'rarely',
            'possibly', 'probably', 'likely', 'potentially', 'presumably'
        }
        
        self.hallucination_indicators = {
            'in general', 'it is known that', 'commonly known', 'it is believed',
            'studies show', 'research indicates', 'experts say', 'it is said',
            'according to experts', 'many believe', 'it is widely accepted',
            'as we all know', 'obviously', 'clearly', 'of course'
        }
        
        self.technical_indicators = {
            'function', 'method', 'class', 'variable', 'parameter', 'return',
            'algorithm', 'implementation', 'syntax', 'compile', 'runtime',
            'memory', 'cpu', 'gpu', 'database', 'server', 'client',
            'api', 'framework', 'library', 'module', 'package', 'import'
        }
        
        self.specificity_indicators = {
            'specific', 'exactly', 'precisely', 'defined as', 'implements',
            'contains', 'includes', 'consists of', 'follows', 'uses',
            'requires', 'returns', 'accepts', 'produces', 'generates'
        }
        
        logger.info("Response Validator initialized with quality metrics")
    
    def validate_response(self, 
                         response: str, 
                         question: str, 
                         context: str, 
                         template_name: str = "general") -> ValidationResult:
        """Comprehensive response validation"""
        
        issues = []
        suggestions = []
        
        # 1. Basic quality checks
        basic_score = self._check_basic_quality(response, issues, suggestions)
        
        # 2. Vague language detection
        vague_score = self._check_vague_language(response, issues, suggestions)
        
        # 3. Hallucination detection
        hallucination_score = self._check_hallucination_indicators(response, context, issues, suggestions)
        
        # 4. Semantic richness
        semantic_richness = self._calculate_semantic_richness(response)
        
        # 5. Specificity score
        specificity_score = self._calculate_specificity_score(response)
        
        # 6. Context adherence
        context_adherence = self._check_context_adherence(response, context)
        
        # 7. Template compliance
        template_score = self._check_template_compliance(response, template_name, issues, suggestions)
        
        # 8. Technical accuracy
        technical_score = self._check_technical_accuracy(response, question)
        
        # Calculate overall quality score
        quality_score = (
            basic_score * 0.2 +
            vague_score * 0.15 +
            hallucination_score * 0.2 +
            semantic_richness * 0.15 +
            specificity_score * 0.1 +
            context_adherence * 0.15 +
            template_score * 0.05
        )
        
        is_valid = quality_score >= 0.7 and len(issues) <= 2
        
        return ValidationResult(
            is_valid=is_valid,
            quality_score=quality_score,
            issues=issues,
            suggestions=suggestions,
            semantic_richness=semantic_richness,
            specificity_score=specificity_score,
            context_adherence=context_adherence
        )
    
    def _check_basic_quality(self, response: str, issues: List[str], suggestions: List[str]) -> float:
        """Check basic response quality"""
        score = 1.0
        
        # Length check
        if len(response.strip()) < 50:
            issues.append("Response too short (< 50 characters)")
            suggestions.append("Provide more detailed explanation")
            score -= 0.4
        elif len(response.strip()) < 100:
            issues.append("Response may be too brief")
            suggestions.append("Add more specific details from context")
            score -= 0.2
        
        # Completeness check
        if response.strip().endswith('...') or '...' in response:
            issues.append("Response appears incomplete")
            suggestions.append("Complete the explanation")
            score -= 0.3
        
        # Coherence check
        sentences = re.split(r'[.!?]+', response)
        if len(sentences) > 3:
            # Check for repeated phrases
            sentence_starts = [s.strip()[:20] for s in sentences if len(s.strip()) > 20]
            if len(sentence_starts) != len(set(sentence_starts)):
                issues.append("Contains repetitive content")
                suggestions.append("Remove redundant information")
                score -= 0.2
        
        return max(0.0, score)
    
    def _check_vague_language(self, response: str, issues: List[str], suggestions: List[str]) -> float:
        """Check for vague language usage"""
        score = 1.0
        found_vague = []
        
        response_lower = response.lower()
        for term in self.vague_terms:
            if re.search(r'\b' + term + r'\b', response_lower):
                found_vague.append(term)
        
        if found_vague:
            vague_penalty = min(0.6, len(found_vague) * 0.1)
            score -= vague_penalty
            issues.append(f"Contains vague terms: {', '.join(found_vague[:3])}{'...' if len(found_vague) > 3 else ''}")
            suggestions.append("Replace vague terms with specific information from context")
        
        return max(0.0, score)
    
    def _check_hallucination_indicators(self, response: str, context: str, issues: List[str], suggestions: List[str]) -> float:
        """Check for potential hallucination indicators"""
        score = 1.0
        found_indicators = []
        
        response_lower = response.lower()
        for indicator in self.hallucination_indicators:
            if indicator in response_lower:
                found_indicators.append(indicator)
        
        if found_indicators:
            hallucination_penalty = min(0.5, len(found_indicators) * 0.15)
            score -= hallucination_penalty
            issues.append(f"Contains potential hallucination indicators: {', '.join(found_indicators[:2])}")
            suggestions.append("Base answer strictly on provided context only")
        
        # Check for information not in context
        if self._contains_external_info(response, context):
            score -= 0.3
            issues.append("May contain information not present in context")
            suggestions.append("Verify all information exists in provided context")
        
        return max(0.0, score)
    
    def _calculate_semantic_richness(self, response: str) -> float:
        """Calculate semantic richness of response"""
        words = re.findall(r'\b\w+\b', response.lower())
        
        if len(words) < 10:
            return 0.2
        
        # Unique word ratio
        unique_ratio = len(set(words)) / len(words)
        
        # Technical term density
        technical_count = sum(1 for word in words if word in self.technical_indicators)
        technical_density = technical_count / len(words)
        
        # Average word length (complexity indicator)
        avg_word_length = sum(len(word) for word in words) / len(words)
        length_score = min(1.0, avg_word_length / 6.0)  # Normalize around 6 chars
        
        # Combine scores
        richness = (unique_ratio * 0.4 + technical_density * 0.4 + length_score * 0.2)
        return min(1.0, richness)
    
    def _calculate_specificity_score(self, response: str) -> float:
        """Calculate how specific the response is"""
        response_lower = response.lower()
        
        # Count specific indicators
        specific_count = sum(1 for indicator in self.specificity_indicators 
                           if indicator in response_lower)
        
        # Count numbers and measurements
        numbers = len(re.findall(r'\b\d+\.?\d*\b', response))
        
        # Count code/technical references
        code_refs = len(re.findall(r'`[^`]+`|[A-Z][a-z]*[A-Z][a-zA-Z]*|\w+\(\)', response))
        
        # Score based on specificity indicators
        total_indicators = specific_count + (numbers * 0.5) + (code_refs * 0.3)
        word_count = len(response.split())
        
        if word_count == 0:
            return 0.0
        
        specificity = min(1.0, total_indicators / (word_count / 20))
        return specificity
    
    def _check_context_adherence(self, response: str, context: str) -> float:
        """Check how well response adheres to provided context"""
        if not context or not response:
            return 0.0
        
        # Extract key terms from context and response
        context_words = set(re.findall(r'\b\w{4,}\b', context.lower()))
        response_words = set(re.findall(r'\b\w{4,}\b', response.lower()))
        
        if not context_words:
            return 0.5
        
        # Calculate overlap
        overlap = len(context_words.intersection(response_words))
        adherence = overlap / len(context_words)
        
        return min(1.0, adherence * 2)  # Amplify the score
    
    def _check_template_compliance(self, response: str, template_name: str, issues: List[str], suggestions: List[str]) -> float:
        """Check compliance with template requirements"""
        score = 1.0
        
        if template_name == "process":
            # Should contain numbered steps
            if not re.search(r'\d+\.', response):
                issues.append("Process template requires numbered steps")
                suggestions.append("Structure answer with numbered steps")
                score -= 0.5
        
        elif template_name == "features":
            # Should contain list markers
            if not any(marker in response for marker in ['•', '-', '1.', '*', '▪']):
                issues.append("Features template requires list format")
                suggestions.append("Use bullet points or numbered list")
                score -= 0.5
        
        elif template_name == "comparison":
            # Should contain comparison structure
            if not any(word in response.lower() for word in ['vs', 'versus', 'compared to', 'difference', 'while', 'whereas']):
                issues.append("Comparison template requires comparative structure")
                suggestions.append("Use comparative language and structure")
                score -= 0.3
        
        elif template_name == "code":
            # Should contain code-related terms
            if not any(term in response.lower() for term in ['function', 'method', 'variable', 'return', 'parameter']):
                issues.append("Code template should include programming terminology")
                suggestions.append("Use appropriate programming terminology")
                score -= 0.3
        
        return max(0.0, score)
    
    def _check_technical_accuracy(self, response: str, question: str) -> float:
        """Check technical accuracy indicators"""
        # This is a simplified check - in production, you might use more sophisticated methods
        
        # Check for consistent terminology
        tech_terms_in_response = set(word.lower() for word in re.findall(r'\b\w+\b', response) 
                                   if word.lower() in self.technical_indicators)
        
        tech_terms_in_question = set(word.lower() for word in re.findall(r'\b\w+\b', question) 
                                   if word.lower() in self.technical_indicators)
        
        if tech_terms_in_question:
            # Response should address technical terms from question
            coverage = len(tech_terms_in_response.intersection(tech_terms_in_question)) / len(tech_terms_in_question)
            return coverage
        
        return 0.8  # Default score when no technical terms in question
    
    def _contains_external_info(self, response: str, context: str) -> bool:
        """Check if response contains information not in context (simplified)"""
        # This is a basic implementation - could be enhanced with semantic similarity
        
        response_sentences = re.split(r'[.!?]+', response)
        context_lower = context.lower()
        
        for sentence in response_sentences:
            sentence = sentence.strip().lower()
            if len(sentence) < 20:  # Skip short sentences
                continue
            
            # Check if key words from sentence appear in context
            sentence_words = set(re.findall(r'\b\w{4,}\b', sentence))
            context_words = set(re.findall(r'\b\w{4,}\b', context_lower))
            
            if sentence_words and len(sentence_words.intersection(context_words)) / len(sentence_words) < 0.3:
                return True
        
        return False
    
    def suggest_improvements(self, response: str, validation_result: ValidationResult) -> List[str]:
        """Generate specific improvement suggestions"""
        improvements = []
        
        if validation_result.semantic_richness < 0.5:
            improvements.append("Add more technical details and specific terminology")
        
        if validation_result.specificity_score < 0.4:
            improvements.append("Include specific examples, numbers, or concrete details")
        
        if validation_result.context_adherence < 0.6:
            improvements.append("Ensure all information comes directly from the provided context")
        
        if validation_result.quality_score < 0.6:
            improvements.append("Provide more comprehensive and detailed explanation")
        
        return improvements

# Global instance
_validator = None

def get_response_validator() -> ResponseValidator:
    """Get global response validator instance"""
    global _validator
    if _validator is None:
        _validator = ResponseValidator()
    return _validator