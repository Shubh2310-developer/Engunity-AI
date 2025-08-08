#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Professional Answer Synthesizer
===============================

Service to create professional, complete, and well-structured answers
from document content by intelligently synthesizing information.

Author: Engunity AI Team
"""

import re
import logging
from typing import List, Optional, Dict, Any
from datetime import datetime

logger = logging.getLogger(__name__)

class ProfessionalAnswerSynthesizer:
    """Synthesize professional, complete answers from document content"""
    
    def __init__(self):
        self.content_filters = {
            'chapter_headers': r'^.{0,50}(Chapter|CHAPTER)\s+\d+',
            'page_numbers': r'^\s*\d+\s*\|\s*',
            'table_of_contents': r'^\s*\d+\.\s*\.\s*\.\s*\.\s*',
            'incomplete_sentences': r'^[a-z][^.!?]*$',
            'single_words': r'^\w+\s*$',
            'empty_numbered': r'^\d+\.\s*$',
        }
        logger.info("Professional Answer Synthesizer initialized")
    
    def synthesize_answer(self, 
                         question: str, 
                         content_chunks: List[str], 
                         document_name: str,
                         max_length: int = 500) -> str:
        """
        Synthesize a professional answer from content chunks
        
        Args:
            question: The user's question
            content_chunks: List of relevant content chunks
            document_name: Name of the source document
            max_length: Maximum length for the answer
            
        Returns:
            Professional, complete answer
        """
        try:
            if not content_chunks:
                return f"I couldn't find relevant content in {document_name} to answer your question. Please try rephrasing or asking about a different topic."
            
            # Step 1: Clean and extract meaningful content
            clean_content = self._extract_meaningful_content(content_chunks)
            
            if not clean_content:
                return f"While I found content related to your question in {document_name}, I couldn't extract clear, meaningful information. Please try a more specific question."
            
            # Step 2: Identify question type and structure answer accordingly
            question_type = self._classify_question(question)
            
            # Step 3: Synthesize based on question type
            if question_type == 'definition':
                answer = self._synthesize_definition(question, clean_content, document_name)
            elif question_type == 'explanation':
                answer = self._synthesize_explanation(question, clean_content, document_name)
            elif question_type == 'overview':
                answer = self._synthesize_overview(question, clean_content, document_name)
            else:
                answer = self._synthesize_general(question, clean_content, document_name)
            
            # Step 4: Ensure professional quality
            answer = self._ensure_professional_quality(answer, max_length)
            
            return answer
            
        except Exception as e:
            logger.error(f"Error synthesizing answer: {e}")
            return f"I found relevant content in {document_name} but encountered an issue processing it. Please try rephrasing your question."
    
    def _extract_meaningful_content(self, content_chunks: List[str]) -> List[str]:
        """Extract meaningful sentences from content chunks"""
        meaningful_content = []
        
        for chunk in content_chunks:
            if not chunk or not chunk.strip():
                continue
            
            # Clean the chunk
            cleaned_chunk = self._clean_chunk(chunk)
            
            # Extract sentences
            sentences = self._extract_sentences(cleaned_chunk)
            
            # Filter for meaningful sentences
            for sentence in sentences:
                if self._is_meaningful_sentence(sentence):
                    meaningful_content.append(sentence.strip())
        
        # Remove duplicates while preserving order
        unique_content = []
        seen = set()
        for content in meaningful_content:
            content_key = content.lower()[:50]  # Use first 50 chars as key
            if content_key not in seen:
                seen.add(content_key)
                unique_content.append(content)
        
        return unique_content[:10]  # Limit to top 10 meaningful pieces
    
    def _clean_chunk(self, chunk: str) -> str:
        """Clean a content chunk of artifacts and noise"""
        if not chunk:
            return ""
        
        cleaned = chunk
        
        # Remove obvious artifacts
        for name, pattern in self.content_filters.items():
            cleaned = re.sub(pattern, '', cleaned, flags=re.MULTILINE | re.IGNORECASE)
        
        # Remove source references
        cleaned = re.sub(r'\*\*From [^*]+\*\*:?\s*', '', cleaned)
        cleaned = re.sub(r'--- [Ss]ource \d+[^\n]*---\s*', '', cleaned)
        
        # Clean up whitespace
        cleaned = re.sub(r'\s+', ' ', cleaned)
        cleaned = re.sub(r'\n\s*\n\s*\n+', '\n\n', cleaned)
        
        return cleaned.strip()
    
    def _extract_sentences(self, text: str) -> List[str]:
        """Extract sentences from text"""
        if not text:
            return []
        
        # Split on sentence endings
        sentences = re.split(r'(?<=[.!?])\s+(?=[A-Z])', text)
        
        # Clean and filter sentences
        cleaned_sentences = []
        for sentence in sentences:
            sentence = sentence.strip()
            if sentence and len(sentence) > 10:  # Minimum length
                cleaned_sentences.append(sentence)
        
        return cleaned_sentences
    
    def _is_meaningful_sentence(self, sentence: str) -> bool:
        """Check if a sentence is meaningful and worth including"""
        if not sentence or len(sentence.strip()) < 20:
            return False
        
        sentence = sentence.strip()
        
        # Must end with proper punctuation
        if not sentence.endswith(('.', '!', '?')):
            return False
        
        # Must have reasonable word count
        word_count = len(sentence.split())
        if word_count < 5 or word_count > 50:
            return False
        
        # Should not be just numbers or references
        if re.match(r'^[\d\s\.\,\-]+$', sentence):
            return False
        
        # Should not be quality complaints
        if any(phrase in sentence.lower() for phrase in [
            'answer is vague', 'unprofessional', 'inappropriate', 
            'please make sure', 'check the', 'fix the'
        ]):
            return False
        
        return True
    
    def _classify_question(self, question: str) -> str:
        """Classify the type of question being asked"""
        question_lower = question.lower()
        
        if any(phrase in question_lower for phrase in ['what is', 'define', 'definition']):
            return 'definition'
        elif any(phrase in question_lower for phrase in ['how does', 'how to', 'explain', 'why']):
            return 'explanation'  
        elif any(phrase in question_lower for phrase in ['overview', 'summary', 'about', 'introduce']):
            return 'overview'
        else:
            return 'general'
    
    def _synthesize_definition(self, question: str, content: List[str], document_name: str) -> str:
        """Synthesize a definition-style answer"""
        if not content:
            return f"I couldn't find a clear definition in {document_name}."
        
        # Look for definition-like content
        definition_content = []
        for item in content:
            if any(pattern in item.lower() for pattern in [
                'is a', 'is an', 'refers to', 'means', 'defined as'
            ]):
                definition_content.append(item)
        
        # Use definition content if available, otherwise use first few items
        selected_content = definition_content[:2] if definition_content else content[:3]
        
        # Create a flowing definition
        answer = selected_content[0]
        if len(selected_content) > 1:
            additional = ' '.join(selected_content[1:])
            answer += f" {additional}"
        
        return self._ensure_complete_sentence(answer)
    
    def _synthesize_explanation(self, question: str, content: List[str], document_name: str) -> str:
        """Synthesize an explanation-style answer"""
        if not content:
            return f"I couldn't find explanatory content in {document_name} for your question."
        
        # Build a comprehensive explanation
        explanation_parts = content[:4]  # Use up to 4 pieces of content
        
        # Create flowing explanation
        answer = explanation_parts[0]
        for part in explanation_parts[1:]:
            # Add appropriate connectors
            if not answer.endswith('.'):
                answer += '.'
            answer += f" {part}"
        
        return self._ensure_complete_sentence(answer)
    
    def _synthesize_overview(self, question: str, content: List[str], document_name: str) -> str:
        """Synthesize an overview-style answer"""
        if not content:
            return f"I couldn't find overview content in {document_name}."
        
        # Create comprehensive overview
        overview_parts = content[:5]  # Use up to 5 pieces for overview
        
        # Start with main concept
        answer = overview_parts[0]
        
        # Add supporting information
        if len(overview_parts) > 1:
            for part in overview_parts[1:]:
                if not answer.endswith('.'):
                    answer += '.'
                answer += f" Additionally, {part.lower()}"
        
        return self._ensure_complete_sentence(answer)
    
    def _synthesize_general(self, question: str, content: List[str], document_name: str) -> str:
        """Synthesize a general answer"""
        if not content:
            return f"I couldn't find relevant information in {document_name} to answer your question."
        
        # Use the most relevant content
        relevant_content = content[:3]
        
        # Create coherent response
        answer = ' '.join(relevant_content)
        
        return self._ensure_complete_sentence(answer)
    
    def _ensure_professional_quality(self, answer: str, max_length: int) -> str:
        """Ensure the answer meets professional quality standards"""
        if not answer:
            return "I couldn't generate a complete answer from the available content."
        
        # Ensure proper capitalization
        answer = answer.strip()
        if answer and answer[0].islower():
            answer = answer[0].upper() + answer[1:]
        
        # Ensure proper ending
        answer = self._ensure_complete_sentence(answer)
        
        # Limit length if necessary
        if len(answer) > max_length:
            # Find the last complete sentence within the limit
            truncated = answer[:max_length]
            last_period = truncated.rfind('.')
            if last_period > max_length * 0.7:  # If we can keep at least 70% with complete sentence
                answer = truncated[:last_period + 1]
            else:
                answer = truncated.rstrip() + '...'
        
        return answer
    
    def _ensure_complete_sentence(self, text: str) -> str:
        """Ensure text forms a complete sentence"""
        if not text:
            return ""
        
        text = text.strip()
        
        # Add period if missing
        if text and not text.endswith(('.', '!', '?')):
            text += '.'
        
        return text

# Global instance
_synthesizer: Optional[ProfessionalAnswerSynthesizer] = None

def get_answer_synthesizer() -> ProfessionalAnswerSynthesizer:
    """Get global answer synthesizer instance"""
    global _synthesizer
    if _synthesizer is None:
        _synthesizer = ProfessionalAnswerSynthesizer()
    return _synthesizer

def synthesize_professional_answer(question: str, content_chunks: List[str], document_name: str) -> str:
    """Convenience function to synthesize a professional answer"""
    synthesizer = get_answer_synthesizer()
    return synthesizer.synthesize_answer(question, content_chunks, document_name)