#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Intelligent Answer Generator
============================

Service to generate well-formatted, grammatically correct answers from 
document content chunks with proper synthesis and readability.

Author: Engunity AI Team
"""

import re
import logging
from typing import Dict, List, Optional, Any
from datetime import datetime

logger = logging.getLogger(__name__)

class IntelligentAnswerGenerator:
    """Generate intelligent, well-formatted answers from document content"""
    
    def __init__(self):
        self.stop_words = {
            'the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'or', 'but', 
            'in', 'with', 'to', 'for', 'of', 'as', 'by', 'this', 'that', 'these', 'those'
        }
        logger.info("Intelligent Answer Generator initialized")
    
    def clean_text_fragment(self, text: str) -> str:
        """Clean and normalize text fragments"""
        if not text:
            return ""
            
        # Remove page headers, footers, and chapter markers
        text = re.sub(r'^\s*\d+\s*\|\s*Chapter\s+\d+.*?\n', '', text, flags=re.MULTILINE)
        text = re.sub(r'^\s*---\s*Page\s+\d+\s*---\s*\n', '', text, flags=re.MULTILINE)
        
        # Remove incomplete numbered items (1. 2. etc. with no content)
        text = re.sub(r'^\s*\d+\.\s*$', '', text, flags=re.MULTILINE)
        
        # Remove source references and metadata
        text = re.sub(r'\*\*From [^*]+\*\*:?\s*', '', text, flags=re.MULTILINE)
        text = re.sub(r'--- [Ss]ource \d+[^\n]*---\s*', '', text, flags=re.MULTILINE)
        text = re.sub(r'Based on web search[^\n]*\n?', '', text, flags=re.MULTILINE | re.IGNORECASE)
        text = re.sub(r'Web search performed[^\n]*\n?', '', text, flags=re.MULTILINE | re.IGNORECASE)
        
        # Clean up formatting artifacts
        text = re.sub(r'\s+', ' ', text)  # Multiple spaces to single space
        text = re.sub(r'\n\s*\n\s*\n+', '\n\n', text)  # Multiple newlines to double newline
        text = text.strip()
        
        return text
    
    def extract_meaningful_sentences(self, text: str) -> List[str]:
        """Extract complete, meaningful sentences from text"""
        if not text:
            return []
            
        # Clean the text first
        text = self.clean_text_fragment(text)
        
        # Split into sentences (improved regex for better sentence detection)
        sentences = re.split(r'(?<=[.!?])\s+(?=[A-Z])', text)
        
        meaningful_sentences = []
        for sentence in sentences:
            sentence = sentence.strip()
            
            # Filter out incomplete or very short sentences
            if (len(sentence) > 20 and 
                sentence.endswith(('.', '!', '?')) and
                not sentence.startswith(('Fig', 'Table', 'Chapter'))):
                meaningful_sentences.append(sentence)
        
        return meaningful_sentences
    
    def synthesize_definition_answer(self, question: str, content_chunks: List[str], document_name: str) -> str:
        """Generate a definition-style answer"""
        all_sentences = []
        for chunk in content_chunks:
            sentences = self.extract_meaningful_sentences(chunk)
            all_sentences.extend(sentences)
        
        if not all_sentences:
            return f"I found content related to your question in {document_name}, but couldn't extract clear definitions. Please try rephrasing your question."
        
        # Look for definition patterns
        definition_sentences = []
        for sentence in all_sentences:
            # Look for sentences that contain definition patterns
            if any(pattern in sentence.lower() for pattern in [
                'is a', 'is an', 'refers to', 'means', 'defined as', 'typescript is'
            ]):
                definition_sentences.append(sentence)
        
        # If no explicit definitions, use the most relevant sentences
        if not definition_sentences:
            definition_sentences = all_sentences[:3]
        
        # Create a coherent definition response
        main_definition = definition_sentences[0] if definition_sentences else ""
        supporting_info = definition_sentences[1:3] if len(definition_sentences) > 1 else []
        
        # Format the answer professionally
        answer_parts = []
        
        if main_definition:
            # Extract the core definition
            answer_parts.append(main_definition)
        
        if supporting_info:
            # Add supporting information as a coherent paragraph
            supporting_text = " ".join(supporting_info)
            answer_parts.append(f"\n{supporting_text}")
        
        return "\n".join(answer_parts)
    
    def synthesize_explanation_answer(self, question: str, content_chunks: List[str], document_name: str) -> str:
        """Generate an explanation-style answer"""
        all_sentences = []
        for chunk in content_chunks:
            sentences = self.extract_meaningful_sentences(chunk)
            all_sentences.extend(sentences)
        
        if not all_sentences:
            return f"I found content related to your question in {document_name}, but couldn't extract clear explanations."
        
        # Format as explanation
        answer_parts = [
            f"**Based on {document_name}:**\n",
            "**Explanation:**"
        ]
        
        # Group sentences into logical paragraphs
        for i, sentence in enumerate(all_sentences[:5]):
            if i == 0 or i % 2 == 0:
                answer_parts.append(f"\n{sentence}")
            else:
                answer_parts.append(f"{sentence}")
        
        return "\n".join(answer_parts)
    
    def synthesize_list_answer(self, question: str, content_chunks: List[str], document_name: str) -> str:
        """Generate a list-style answer for features, benefits, etc."""
        all_text = " ".join(content_chunks)
        sentences = self.extract_meaningful_sentences(all_text)
        
        if not sentences:
            return f"I found content in {document_name} but couldn't extract specific points."
        
        # Extract key concepts and points more intelligently
        key_points = self._extract_key_concepts(sentences, question)
        
        if not key_points:
            key_points = self._select_diverse_sentences(sentences, max_sentences=4)
        
        # Create a professional summary with key points
        if "key points" in question.lower() or "summarize" in question.lower():
            return self._create_summary_response(key_points)
        else:
            return self._create_list_response(key_points)
    
    def _extract_key_concepts(self, sentences: List[str], question: str) -> List[str]:
        """Extract key concepts and important points from sentences"""
        key_concepts = []
        
        # Prioritize sentences with important indicators
        priority_indicators = [
            'main', 'primary', 'key', 'important', 'essential', 'fundamental',
            'feature', 'benefit', 'advantage', 'characteristic', 'aspect'
        ]
        
        # First pass: sentences with priority indicators
        for sentence in sentences:
            if any(indicator in sentence.lower() for indicator in priority_indicators):
                key_concepts.append(sentence)
                
        # Second pass: sentences with technical terms or definitions
        if len(key_concepts) < 3:
            for sentence in sentences:
                if (len(sentence.split()) > 10 and  # Substantial sentences
                    any(char.isupper() for char in sentence) and  # Contains proper nouns/acronyms
                    sentence not in key_concepts):
                    key_concepts.append(sentence)
        
        # Return top concepts, avoiding duplicates
        return self._select_diverse_sentences(key_concepts or sentences, max_sentences=4)
    
    def _create_summary_response(self, key_points: List[str]) -> str:
        """Create a summary-style response"""
        if not key_points:
            return "I couldn't extract clear key points from the document."
        
        # Create a flowing summary
        summary_parts = []
        
        if len(key_points) == 1:
            return key_points[0]
        
        # Main point
        summary_parts.append(key_points[0])
        
        # Additional key points
        if len(key_points) > 1:
            additional_info = self._link_sentences(key_points[1:])
            summary_parts.append(f"\nAdditionally, {additional_info.lower()}")
        
        return "\n".join(summary_parts)
    
    def _create_list_response(self, key_points: List[str]) -> str:
        """Create a structured list response"""
        if not key_points:
            return "I couldn't extract specific points from the document."
        
        answer_parts = ["**Key Points:**\n"]
        
        for i, point in enumerate(key_points, 1):
            # Clean up the point
            clean_point = point.strip()
            if not clean_point.endswith('.'):
                clean_point += '.'
            answer_parts.append(f"• {clean_point}")
        
        return "\n".join(answer_parts)
    
    def synthesize_general_answer(self, question: str, content_chunks: List[str], document_name: str) -> str:
        """Generate a general answer format"""
        all_sentences = []
        for chunk in content_chunks:
            sentences = self.extract_meaningful_sentences(chunk)
            all_sentences.extend(sentences)
        
        if not all_sentences:
            return f"I found relevant content in {document_name} but couldn't extract readable information. Please try rephrasing your question."
        
        # Select the most relevant and diverse sentences
        relevant_sentences = self._select_diverse_sentences(all_sentences, max_sentences=5)
        
        if not relevant_sentences:
            return f"Based on the document, I found related content but couldn't provide a comprehensive answer. Please try a more specific question."
        
        # Create a flowing, coherent response
        answer = self._create_coherent_response(relevant_sentences, question)
        
        return answer
    
    def _select_diverse_sentences(self, sentences: List[str], max_sentences: int = 5) -> List[str]:
        """Select diverse, informative sentences avoiding repetition"""
        if not sentences:
            return []
        
        # Remove very similar sentences
        diverse_sentences = []
        for sentence in sentences[:max_sentences * 2]:  # Look at more options
            is_diverse = True
            for existing in diverse_sentences:
                # Simple similarity check - avoid sentences with too much overlap
                overlap = len(set(sentence.lower().split()) & set(existing.lower().split()))
                if overlap > len(sentence.split()) * 0.6:  # More than 60% word overlap
                    is_diverse = False
                    break
            
            if is_diverse:
                diverse_sentences.append(sentence)
                if len(diverse_sentences) >= max_sentences:
                    break
        
        return diverse_sentences or sentences[:max_sentences]
    
    def _create_coherent_response(self, sentences: List[str], question: str) -> str:
        """Create a coherent, flowing response from sentences"""
        if not sentences:
            return ""
        
        # Create logical paragraphs
        answer_parts = []
        
        # Start with the most informative sentence
        answer_parts.append(sentences[0])
        
        if len(sentences) > 1:
            # Group remaining sentences into a coherent paragraph
            remaining_sentences = sentences[1:]
            
            # Create natural transitions between sentences
            coherent_text = self._link_sentences(remaining_sentences)
            if coherent_text:
                answer_parts.append(f"\n{coherent_text}")
        
        return "\n".join(answer_parts)
    
    def _link_sentences(self, sentences: List[str]) -> str:
        """Link sentences together with appropriate transitions"""
        if not sentences:
            return ""
        
        if len(sentences) == 1:
            return sentences[0]
        
        # Simply join with periods and proper spacing for now
        # In a more advanced version, this could add transition words
        linked = ". ".join(s.rstrip('.') for s in sentences)
        if not linked.endswith('.'):
            linked += "."
        
        return linked
    
    def generate_intelligent_answer(self, 
                                  question: str, 
                                  content_chunks: List[str], 
                                  document_name: str) -> str:
        """Generate an intelligent, well-formatted answer based on question type"""
        
        if not content_chunks or not any(chunk.strip() for chunk in content_chunks):
            return f"I couldn't find relevant content in {document_name} to answer your question. Please try rephrasing or asking about a different topic."
        
        question_lower = question.lower().strip()
        
        # Determine answer style based on question type
        if any(phrase in question_lower for phrase in ['what is', 'define', 'definition of']):
            return self.synthesize_definition_answer(question, content_chunks, document_name)
        
        elif any(phrase in question_lower for phrase in ['how does', 'how to', 'explain', 'how']):
            return self.synthesize_explanation_answer(question, content_chunks, document_name)
        
        elif any(phrase in question_lower for phrase in ['features', 'benefits', 'advantages', 'key points', 'main']):
            return self.synthesize_list_answer(question, content_chunks, document_name)
        
        else:
            return self.synthesize_general_answer(question, content_chunks, document_name)

# Global instance
_generator = None

def get_answer_generator() -> IntelligentAnswerGenerator:
    """Get global answer generator instance"""
    global _generator
    if _generator is None:
        _generator = IntelligentAnswerGenerator()
    return _generator