#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Smart Response Cleaner Service
==============================

Intelligent response cleaning that removes source references while
preserving all meaningful content and maintaining proper formatting.

Author: Engunity AI Team
"""

import re
import logging
from typing import Optional, List

logger = logging.getLogger(__name__)

class SmartResponseCleaner:
    """Intelligent response cleaner that preserves content quality"""
    
    def __init__(self):
        """Initialize with precise cleaning patterns"""
        
        # HTML cleaning patterns
        self.html_patterns = [
            r'<[^>]*>',                               # Remove all HTML tags
            r'&nbsp;',                                # Remove HTML entities
            r'&amp;',                                 # Remove &amp;
            r'&lt;',                                  # Remove &lt;
            r'&gt;',                                  # Remove &gt;
            r'&quot;',                               # Remove &quot;
            r'&#\d+;',                               # Remove numeric HTML entities
            r'&[a-zA-Z]+;',                          # Remove named HTML entities
        ]
        
        # Document fragment patterns
        self.fragment_patterns = [
            r'Document \d+:\s*',                     # Remove "Document 1:", "Document 2:", etc.
            r'\( hide \)',                          # Remove "( hide )" text
            r'This response synthesizes information[^\n]*\n?',
            r'Show less this error[^\n]*\n?',       # Remove the specific error mentioned
            r'Regarding \'[^\']*\'[^\n]*\n?',        # Remove "Regarding 'question'" lines
            r'the indexed documents contain[^\n]*\n?',
            r'relevant information[^\n]*\n?',
            r'This section may contain excessive[^.]*\.[^\n]*\n?',  # Remove Wikipedia warnings
            r'Please review the use of non-free[^.]*\.[^\n]*\n?',   # Remove copyright warnings
            r'The talk page may have details[^.]*\.[^\n]*\n?',      # Remove talk page references
            r'Learn how and when to remove[^\n]*\n?',              # Remove help text
        ]
        
        # Exact patterns for source references (very specific)
        self.source_reference_patterns = [
            r'\*\*From the document from [^:]*:\*\*\s*',
            r'\*\*From the document[^:]*:\*\*\s*',
            r'\*\*From web sources:\*\*\s*',
            r'From web sources:\s*',
            r'--- [Ss]ource \d+[^\n]*---\s*',
            r'--- [Ss]ource \d+[^\n]*\n',
            r'\([Ss]core: [-+]?[0-9]*\.?[0-9]+\)\s*',
            r'Based on web search for[^\n]*\n?',
            r'Web search performed for[^\n]*\n?',
            r'Additional information may be available from other sources\.\s*',
            r'the answer [^.]*inappropriate[^\n]*\n?',
            r'please make sure the answer [^.]*appropriate[^\n]*\n?',
            r'the answer is [^.]*unprofessional[^\n]*\n?',
            r'the answer is [^.]*vague[^\n]*\n?',
        ]
        
        # Line patterns that should be completely removed
        self.remove_line_patterns = [
            r'^--- [Ss]ource \d+.*$',
            r'^\*\*From .*:\*\*\s*$',
            r'^Based on web search for.*$',
            r'^Web search performed for.*$',
            r'^Additional information may be available.*$',
            r'^\d+\.\s*$',  # Remove empty numbered items like "1." "2."
            r'^the answer is [^.]*vague.*$',  # Remove quality complaints
            r'^the answer is [^.]*unprofessional.*$',  # Remove quality complaints
            r'^please make sure.*$',  # Remove instruction fragments
            r'^Additionally,\s*$',  # Remove standalone "Additionally,"
            r'^Document \d+:\s*$',  # Remove standalone "Document N:" lines
            r'^\( hide \)\s*$',     # Remove standalone "( hide )" lines
            r'^This section may contain excessive.*',  # Remove Wikipedia-style warnings
            r'^Please review the use of non-free.*',   # Remove copyright warnings
            r'^The talk page may have details.*',      # Remove Wikipedia talk page references
            r'^Learn how and when to remove.*',       # Remove Wikipedia help text
            r'.*This section may contain excessive.*',  # Remove anywhere in line
            r'.*Please review the use of non-free.*',   # Remove anywhere in line
            r'.*The talk page may have details.*',      # Remove anywhere in line
            r'.*Learn how and when to remove.*',       # Remove anywhere in line
            r'^Show less\s*$',                        # Remove standalone "Show less" text
            r'^this error is coming from.*',          # Remove error messages
            r'^Regarding\s+.*,\s+the indexed.*',      # Remove query context lines
            r'^(Summary|Recording|Personnel|Legacy|See also|References|External links)\s*$',  # Navigation elements
            r'^$',  # Empty lines (will be handled separately)
        ]
        
        logger.info("Smart response cleaner initialized")
    
    def clean_response(self, response: str) -> str:
        """
        Intelligently clean response while preserving meaningful content
        
        Args:
            response: The raw response string to clean
            
        Returns:
            Cleaned response string with source references removed but content preserved
        """
        if not response or not isinstance(response, str):
            return response or ""
        
        try:
            # Step 1: Clean HTML tags and entities first
            cleaned = response
            for pattern in self.html_patterns:
                cleaned = re.sub(pattern, ' ', cleaned, flags=re.MULTILINE | re.IGNORECASE)
            
            # Step 2: Remove document fragments and error patterns
            for pattern in self.fragment_patterns:
                cleaned = re.sub(pattern, '', cleaned, flags=re.MULTILINE | re.IGNORECASE)
            
            # Step 3: Remove inline source reference patterns
            for pattern in self.source_reference_patterns:
                cleaned = re.sub(pattern, '', cleaned, flags=re.MULTILINE | re.IGNORECASE)
            
            # Step 4: Process lines intelligently
            lines = cleaned.split('\n')
            processed_lines = []
            
            for line in lines:
                original_line = line
                stripped_line = line.strip()
                
                # Skip completely empty lines for now
                if not stripped_line:
                    continue
                
                # Check if this line should be removed entirely
                should_remove = False
                for pattern in self.remove_line_patterns:
                    if re.match(pattern, stripped_line, re.IGNORECASE):
                        should_remove = True
                        break
                
                # Also check for HTML remnants or very short fragments
                is_html_remnant = (
                    len(stripped_line) < 10 or  # Very short lines are likely fragments
                    re.match(r'^[<>\s\(\)]+$', stripped_line) or  # Lines with only HTML chars or parens
                    stripped_line in ['Summary', 'Recording', 'Personnel', 'Legacy', 'See also', 'References', 'External links']  # Navigation elements
                )
                
                # Keep the line if it has meaningful content
                if not should_remove and not is_html_remnant:
                    processed_lines.append(stripped_line)
            
            # Step 5: Reconstruct with proper spacing
            if not processed_lines:
                return ""
            
            # Join lines with single newlines, then fix paragraph spacing
            result = '\n'.join(processed_lines)
            
            # Step 6: Fix spacing and formatting
            result = self._fix_formatting(result)
            
            # Step 7: Ensure proper ending
            result = self._ensure_proper_ending(result)
            
            logger.debug(f"Smart cleaning: {len(response)} -> {len(result)} characters")
            return result
            
        except Exception as e:
            logger.error(f"Error in smart cleaning: {e}")
            return self._fallback_clean(response)
    
    def _fix_formatting(self, text: str) -> str:
        """Fix formatting while preserving structure"""
        if not text:
            return ""
        
        # Fix excessive whitespace but preserve paragraph breaks
        text = re.sub(r'[ \t]+', ' ', text)  # Multiple spaces to single space
        text = re.sub(r'\n\s*\n\s*\n+', '\n\n', text)  # Multiple newlines to double newline
        
        # Fix sentence spacing
        text = re.sub(r'\.\s*([A-Z])', r'. \1', text)  # Ensure space after periods
        text = re.sub(r'\?\s*([A-Z])', r'? \1', text)  # Ensure space after question marks  
        text = re.sub(r'!\s*([A-Z])', r'! \1', text)   # Ensure space after exclamation marks
        
        return text.strip()
    
    def _ensure_proper_ending(self, text: str) -> str:
        """Ensure the response ends properly"""
        if not text:
            return ""
        
        # If the text doesn't end with proper punctuation, add a period
        if not text.endswith(('.', '!', '?', ':')):
            # Only add period if the last character is alphanumeric
            if text and text[-1].isalnum():
                text += '.'
        
        return text
    
    def _fallback_clean(self, response: str) -> str:
        """Simple fallback cleaning"""
        if not response:
            return ""
        
        # Just remove the most obvious source patterns
        fallback_patterns = [
            r'\*\*From [^:]*:\*\*\s*',
            r'--- [Ss]ource [^\n]*\n?',
            r'Based on web search[^\n]*\n?',
            r'Web search performed[^\n]*\n?',
        ]
        
        cleaned = response
        for pattern in fallback_patterns:
            cleaned = re.sub(pattern, '', cleaned, flags=re.MULTILINE | re.IGNORECASE)
        
        return cleaned.strip()
    
    def is_response_clean(self, response: str) -> bool:
        """Check if response is already clean"""
        if not response:
            return True
        
        # Check for source reference indicators and HTML content
        indicators = [
            '--- Source',
            '**From the document',
            '**From web sources',
            'Based on web search',
            'Web search performed',
            '(Score:',
            'Additional information may be available',
            'Document 1:',
            'Document 2:',
            'Document 3:',
            '( hide )',
            'Show less this error',
            '<Li>',
            '<Ul>',
            '<P>',
            '<H2>',
            '<Table>',
            '<Tr>',
            '<Td>',
            'This section may contain excessive'
        ]
        
        response_lower = response.lower()
        return not any(indicator.lower() in response_lower for indicator in indicators)

# Global instance
_smart_cleaner: Optional[SmartResponseCleaner] = None

def get_smart_response_cleaner() -> SmartResponseCleaner:
    """Get global smart response cleaner instance"""
    global _smart_cleaner
    if _smart_cleaner is None:
        _smart_cleaner = SmartResponseCleaner()
    return _smart_cleaner

def smart_clean_response(response: str) -> str:
    """Convenience function to clean a response intelligently"""
    cleaner = get_smart_response_cleaner()
    return cleaner.clean_response(response)