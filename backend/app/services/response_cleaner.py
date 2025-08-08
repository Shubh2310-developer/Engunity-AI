#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Response Cleaner Service
========================

Service to clean all source references and metadata from RAG responses
to provide clean, professional output to users.

Author: Engunity AI Team
"""

import re
import logging
from typing import Optional, List

logger = logging.getLogger(__name__)

class ResponseCleaner:
    """Service to clean RAG responses from all source references and metadata"""
    
    def __init__(self):
        """Initialize the response cleaner with comprehensive patterns"""
        
        # Patterns to remove (order matters for some patterns)
        self.removal_patterns = [
            # Source headers and references
            r'\*\*From the document from [^:]*:\*\*\s*',
            r'\*\*From the document[^:]*:\*\*\s*',
            r'\*\*From web sources:\*\*\s*',
            r'\*\*From web sources\*\*\s*',
            r'From web sources:\s*',
            r'From the document:\s*',
            
            # Source numbering patterns
            r'--- [Ss]ource \d+[^\n]*---\s*',
            r'--- [Ss]ource \d+[^\n]*\n',
            r'\*\*Source \d+[^\n]*\*\*\s*',
            r'Source \d+[^\n]*:\s*',
            
            # Score patterns
            r'\([Ss]core: [-+]?[0-9]*\.?[0-9]+\)',
            r'\(Score: [-+]?[0-9]*\.?[0-9]+\)',
            
            # Web search patterns
            r'Based on web search for[^\n]*\n?',
            r'Web search performed for[^\n]*\n?',
            r'Based on web search[^\n]*\n?',
            r'Web search results for[^\n]*\n?',
            
            # Additional source indicators
            r'Additional information may be available from other sources\.',
            r'the answer given is not aproprriate.*$',
            r'please make sure the answer is appropraite.*$',
            
            # Processing metadata
            r'✓ Compiled /api/[^\n]*\n?',
            r'✅ Supabase client[^\n]*\n?',
            r'🔑 Admin access[^\n]*\n?',
            r'📜 Fetching chat[^\n]*\n?',
            r'🤖 CS-RAG:[^\n]*\n?',
            r'💾 Chat saved:[^\n]*\n?',
            r'GET /api/[^\n]*\n?',
            r'POST /api/[^\n]*\n?',
            
            # System messages and metadata
            r'✅ Retrieved \d+ messages[^\n]*\n?',
            r'\*This [^\n]*\*\s*',
            r'Object-based programming languages[^\n]*\n?',
            
            # Empty lines and whitespace cleanup (should be last)
            r'\n\s*\n\s*\n+',  # Multiple empty lines
            r'^\s+',  # Leading whitespace
            r'\s+$',  # Trailing whitespace
        ]
        
        # Line removal patterns (remove entire lines)
        self.line_removal_patterns = [
            r'^--- [Ss]ource.*',
            r'^\*\*From .*:\*\*\s*$',
            r'^Based on web search.*',
            r'^Web search performed.*',
            r'^Additional information may be available.*',
            r'^✓ Compiled.*',
            r'^✅ Supabase.*',
            r'^🔑 Admin.*',
            r'^📜 Fetching.*',
            r'^🤖 CS-RAG.*',
            r'^💾 Chat.*',
            r'^(GET|POST) /api.*',
            r'^✅ Retrieved.*',
            r'^Object-based programming languages.*',
        ]
        
        logger.info("Response cleaner initialized with comprehensive cleaning patterns")
    
    def clean_response(self, response: str) -> str:
        """
        Clean a response string by removing all source references and metadata
        
        Args:
            response: The raw response string to clean
            
        Returns:
            Cleaned response string without source references
        """
        if not response or not isinstance(response, str):
            return response or ""
        
        try:
            cleaned = response
            
            # Step 1: Remove line-based patterns
            lines = cleaned.split('\n')
            cleaned_lines = []
            
            for line in lines:
                should_keep = True
                for pattern in self.line_removal_patterns:
                    if re.match(pattern, line.strip(), re.IGNORECASE):
                        should_keep = False
                        break
                
                if should_keep and line.strip():  # Only keep non-empty lines
                    cleaned_lines.append(line)
            
            cleaned = '\n'.join(cleaned_lines)
            
            # Step 2: Apply regex patterns for inline cleaning
            for pattern in self.removal_patterns:
                cleaned = re.sub(pattern, '', cleaned, flags=re.MULTILINE | re.IGNORECASE)
            
            # Step 3: Clean up excessive whitespace
            cleaned = re.sub(r'\n\s*\n\s*\n+', '\n\n', cleaned)  # Max 2 consecutive newlines
            cleaned = re.sub(r'[ \t]+', ' ', cleaned)  # Normalize spaces
            cleaned = cleaned.strip()
            
            # Step 4: Ensure the response ends properly
            if cleaned and not cleaned.endswith(('.', '!', '?')):
                # Only add period if the last character is alphanumeric
                if cleaned[-1].isalnum():
                    cleaned += '.'
            
            logger.debug(f"Cleaned response: {len(response)} -> {len(cleaned)} characters")
            return cleaned
            
        except Exception as e:
            logger.error(f"Error cleaning response: {e}")
            # Fallback to basic cleaning
            return self._basic_clean(response)
    
    def _basic_clean(self, response: str) -> str:
        """Basic cleaning as fallback"""
        if not response:
            return ""
        
        # Remove the most common problematic patterns
        basic_patterns = [
            r'\*\*From [^:]*:\*\*\s*',
            r'--- [Ss]ource \d+[^\n]*---\s*',
            r'Based on web search[^\n]*\n?',
            r'Web search performed[^\n]*\n?',
        ]
        
        cleaned = response
        for pattern in basic_patterns:
            cleaned = re.sub(pattern, '', cleaned, flags=re.MULTILINE | re.IGNORECASE)
        
        return cleaned.strip()
    
    def is_response_clean(self, response: str) -> bool:
        """
        Check if a response is already clean (no source references)
        
        Args:
            response: Response to check
            
        Returns:
            True if response is clean, False if it contains source references
        """
        if not response:
            return True
        
        # Check for common source reference indicators
        indicators = [
            '--- Source',
            '**From the document',
            '**From web sources',
            'Based on web search',
            'Web search performed',
            '(Score:',
            'Additional information may be available'
        ]
        
        response_lower = response.lower()
        return not any(indicator.lower() in response_lower for indicator in indicators)

# Global instance
_response_cleaner: Optional[ResponseCleaner] = None

def get_response_cleaner() -> ResponseCleaner:
    """Get global response cleaner instance"""
    global _response_cleaner
    if _response_cleaner is None:
        _response_cleaner = ResponseCleaner()
    return _response_cleaner

def clean_rag_response(response: str) -> str:
    """Convenience function to clean a RAG response"""
    cleaner = get_response_cleaner()
    return cleaner.clean_response(response)