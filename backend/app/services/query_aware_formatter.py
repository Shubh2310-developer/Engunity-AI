#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Query-Aware Answer Formatter
=============================

Implements intelligent answer formatting based on:
- Question type detection
- Content structure optimization
- Dynamic length adjustment
- Technical detail inclusion
- Professional presentation

This addresses the "fixed max 3 sentences" problem by using
query-appropriate formatting strategies.

Author: Engunity AI Team
"""

import logging
import re
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass
from enum import Enum

logger = logging.getLogger(__name__)

class QuestionType(Enum):
    """Question type classifications"""
    DEFINITION = "definition"
    EXPLANATION = "explanation" 
    PROCESS = "process"
    COMPARISON = "comparison"
    LISTING = "listing"
    CODE_ANALYSIS = "code_analysis"
    TROUBLESHOOTING = "troubleshooting"
    EXAMPLE = "example"
    GENERAL = "general"

@dataclass
class FormatConfig:
    """Configuration for specific question types"""
    min_sentences: int
    max_sentences: int
    use_bullets: bool
    use_numbers: bool
    include_examples: bool
    technical_detail_level: str  # "low", "medium", "high"
    structure_type: str  # "paragraph", "list", "mixed"

@dataclass
class FormattedAnswer:
    """Formatted answer with metadata"""
    content: str
    question_type: QuestionType
    format_applied: str
    length_category: str
    structure_elements: List[str]
    confidence: float

class QueryAwareFormatter:
    """Advanced answer formatter with query awareness"""
    
    def __init__(self):
        self.format_configs = self._initialize_format_configs()
        self.question_patterns = self._initialize_question_patterns()
        
        logger.info("Query-Aware Formatter initialized with type-specific configurations")
    
    def _initialize_format_configs(self) -> Dict[QuestionType, FormatConfig]:
        """Initialize formatting configurations for each question type"""
        configs = {
            QuestionType.DEFINITION: FormatConfig(
                min_sentences=1,
                max_sentences=3,
                use_bullets=False,
                use_numbers=False,
                include_examples=True,
                technical_detail_level="medium",
                structure_type="paragraph"
            ),
            
            QuestionType.EXPLANATION: FormatConfig(
                min_sentences=3,
                max_sentences=6,
                use_bullets=True,
                use_numbers=False,
                include_examples=True,
                technical_detail_level="high",
                structure_type="mixed"
            ),
            
            QuestionType.PROCESS: FormatConfig(
                min_sentences=4,
                max_sentences=8,
                use_bullets=False,
                use_numbers=True,
                include_examples=True,
                technical_detail_level="high",
                structure_type="list"
            ),
            
            QuestionType.COMPARISON: FormatConfig(
                min_sentences=3,
                max_sentences=6,
                use_bullets=True,
                use_numbers=False,
                include_examples=True,
                technical_detail_level="medium",
                structure_type="list"
            ),
            
            QuestionType.LISTING: FormatConfig(
                min_sentences=2,
                max_sentences=8,
                use_bullets=True,
                use_numbers=False,
                include_examples=False,
                technical_detail_level="medium",
                structure_type="list"
            ),
            
            QuestionType.CODE_ANALYSIS: FormatConfig(
                min_sentences=3,
                max_sentences=7,
                use_bullets=True,
                use_numbers=False,
                include_examples=True,
                technical_detail_level="high",
                structure_type="mixed"
            ),
            
            QuestionType.TROUBLESHOOTING: FormatConfig(
                min_sentences=3,
                max_sentences=6,
                use_bullets=False,
                use_numbers=True,
                include_examples=True,
                technical_detail_level="high",
                structure_type="list"
            ),
            
            QuestionType.EXAMPLE: FormatConfig(
                min_sentences=2,
                max_sentences=5,
                use_bullets=False,
                use_numbers=False,
                include_examples=True,
                technical_detail_level="medium",
                structure_type="paragraph"
            ),
            
            QuestionType.GENERAL: FormatConfig(
                min_sentences=2,
                max_sentences=5,
                use_bullets=False,
                use_numbers=False,
                include_examples=True,
                technical_detail_level="medium",
                structure_type="paragraph"
            )
        }
        
        return configs
    
    def _initialize_question_patterns(self) -> Dict[QuestionType, List[str]]:
        """Initialize question classification patterns"""
        return {
            QuestionType.DEFINITION: [
                r'\bwhat is\b', r'\bdefine\b', r'\bdefinition of\b', r'\bwhat does.*mean\b',
                r'\bwhat are\b', r'\bmeaning of\b', r'\bwhat\'s\b.*\bmean\b'
            ],
            
            QuestionType.EXPLANATION: [
                r'\bexplain\b', r'\bhow does.*work\b', r'\bwhy does\b', r'\bhow is\b',
                r'\bwhy is\b', r'\bwhat makes\b', r'\bdescribe\b'
            ],
            
            QuestionType.PROCESS: [
                r'\bhow to\b', r'\bhow do\b', r'\bsteps to\b', r'\bprocess of\b',
                r'\bprocedure\b', r'\bmethod to\b', r'\bway to\b'
            ],
            
            QuestionType.COMPARISON: [
                r'\bdifference between\b', r'\bcompare\b', r'\bvs\b', r'\bversus\b',
                r'\bbetter than\b', r'\badvantages.*over\b', r'\bcontrast\b'
            ],
            
            QuestionType.LISTING: [
                r'\blist\b', r'\btypes of\b', r'\bkinds of\b', r'\bexamples of\b',
                r'\bwhat are.*types\b', r'\bname.*types\b', r'\bcategories\b'
            ],
            
            QuestionType.CODE_ANALYSIS: [
                r'\bcode\b.*\bdo\b', r'\bfunction\b.*\bdo\b', r'\bmethod\b.*\bdo\b',
                r'\bexplain.*code\b', r'\bwhat.*code\b', r'\banalyze\b'
            ],
            
            QuestionType.TROUBLESHOOTING: [
                r'\berror\b', r'\bbug\b', r'\bproblem\b', r'\bissue\b', r'\bfix\b',
                r'\bresolve\b', r'\btroubleshoot\b', r'\bwhy.*not work\b'
            ],
            
            QuestionType.EXAMPLE: [
                r'\bexample\b', r'\binstance\b', r'\bsample\b', r'\bdemo\b',
                r'\bshow me\b', r'\bgive.*example\b', r'\billustrate\b'
            ]
        }
    
    def detect_question_type(self, question: str) -> QuestionType:
        """Detect question type using pattern matching"""
        question_lower = question.lower().strip()
        
        # Check each question type pattern
        for q_type, patterns in self.question_patterns.items():
            for pattern in patterns:
                if re.search(pattern, question_lower):
                    return q_type
        
        return QuestionType.GENERAL
    
    def format_answer(self, 
                     raw_answer: str, 
                     question: str,
                     context_chunks: Optional[List[str]] = None,
                     confidence_score: float = 0.8) -> FormattedAnswer:
        """Format answer based on question type and content"""
        
        if not raw_answer or not raw_answer.strip():
            return self._create_empty_answer()
        
        # Detect question type
        question_type = self.detect_question_type(question)
        config = self.format_configs[question_type]
        
        # Parse raw answer
        sentences = self._parse_sentences(raw_answer)
        structure_elements = self._identify_structure_elements(raw_answer)
        
        # Apply type-specific formatting
        formatted_content = self._apply_formatting(
            sentences, question_type, config, context_chunks, confidence_score
        )
        
        # Determine length category
        length_category = self._categorize_length(formatted_content, config)
        
        # Create result
        result = FormattedAnswer(
            content=formatted_content,
            question_type=question_type,
            format_applied=f"{question_type.value}_{config.structure_type}",
            length_category=length_category,
            structure_elements=structure_elements,
            confidence=confidence_score
        )
        
        logger.info(f"Formatted {question_type.value} answer: {length_category} length, "
                   f"{len(sentences)} sentences -> {len(self._parse_sentences(formatted_content))}")
        
        return result
    
    def _parse_sentences(self, text: str) -> List[str]:
        """Parse text into sentences"""
        # Handle abbreviations
        text = re.sub(r'\be\.g\.', 'EG_TEMP', text)
        text = re.sub(r'\bi\.e\.', 'IE_TEMP', text)
        text = re.sub(r'\bvs\.', 'VS_TEMP', text)
        
        # Split sentences
        sentences = re.split(r'[.!?]+\s+', text)
        
        # Restore abbreviations and clean
        cleaned_sentences = []
        for sentence in sentences:
            sentence = sentence.strip()
            sentence = re.sub(r'EG_TEMP', 'e.g.', sentence)
            sentence = re.sub(r'IE_TEMP', 'i.e.', sentence)
            sentence = re.sub(r'VS_TEMP', 'vs.', sentence)
            
            if len(sentence) >= 10:
                if not sentence.endswith(('.', '!', '?')):
                    sentence += '.'
                cleaned_sentences.append(sentence)
        
        return cleaned_sentences
    
    def _identify_structure_elements(self, text: str) -> List[str]:
        """Identify existing structure elements in text"""
        elements = []
        
        if re.search(r'^\s*\d+\.', text, re.MULTILINE):
            elements.append("numbered_list")
        if re.search(r'^\s*[•\-\*]', text, re.MULTILINE):
            elements.append("bullet_list")
        if re.search(r'```|`[^`]+`', text):
            elements.append("code_blocks")
        if re.search(r'\*\*[^*]+\*\*', text):
            elements.append("bold_text")
        if text.count('\n\n') >= 2:
            elements.append("paragraphs")
            
        return elements
    
    def _apply_formatting(self, 
                         sentences: List[str], 
                         question_type: QuestionType,
                         config: FormatConfig,
                         context_chunks: Optional[List[str]],
                         confidence: float) -> str:
        """Apply type-specific formatting to sentences"""
        
        if not sentences:
            return "No content to format."
        
        # Adjust sentence count based on config
        target_sentences = self._determine_target_length(sentences, config, confidence)
        selected_sentences = sentences[:target_sentences]
        
        # Apply structure formatting
        if config.structure_type == "list":
            return self._format_as_list(selected_sentences, config)
        elif config.structure_type == "mixed":
            return self._format_as_mixed(selected_sentences, config, question_type)
        else:  # paragraph
            return self._format_as_paragraph(selected_sentences, config)
    
    def _determine_target_length(self, 
                                sentences: List[str], 
                                config: FormatConfig,
                                confidence: float) -> int:
        """Determine optimal number of sentences based on content and confidence"""
        
        base_target = min(len(sentences), config.max_sentences)
        
        # Adjust based on confidence
        if confidence < 0.5:
            # Lower confidence = more concise
            base_target = min(base_target, config.min_sentences + 1)
        elif confidence > 0.8:
            # Higher confidence = can be more detailed
            base_target = min(base_target + 1, config.max_sentences)
        
        # Ensure minimum length
        return max(config.min_sentences, base_target)
    
    def _format_as_list(self, sentences: List[str], config: FormatConfig) -> str:
        """Format content as a list"""
        
        if config.use_numbers:
            # Numbered list
            formatted_items = []
            for i, sentence in enumerate(sentences, 1):
                formatted_items.append(f"{i}. {sentence}")
            return "\n".join(formatted_items)
        
        elif config.use_bullets:
            # Bullet list
            formatted_items = []
            for sentence in sentences:
                formatted_items.append(f"• {sentence}")
            return "\n".join(formatted_items)
        
        else:
            # Simple list with line breaks
            return "\n\n".join(sentences)
    
    def _format_as_mixed(self, 
                        sentences: List[str], 
                        config: FormatConfig,
                        question_type: QuestionType) -> str:
        """Format content with mixed structure (paragraph + list)"""
        
        if len(sentences) <= 2:
            return self._format_as_paragraph(sentences, config)
        
        # First sentence as intro paragraph
        intro = sentences[0]
        remaining = sentences[1:]
        
        # Format remaining as list based on question type
        if question_type == QuestionType.EXPLANATION:
            list_part = self._format_key_points(remaining)
            return f"{intro}\n\n**Key points:**\n{list_part}"
        
        elif question_type == QuestionType.CODE_ANALYSIS:
            list_part = self._format_code_analysis_points(remaining)
            return f"{intro}\n\n**Analysis:**\n{list_part}"
        
        else:
            # Generic mixed format
            list_part = "\n".join([f"• {s}" for s in remaining])
            return f"{intro}\n\n{list_part}"
    
    def _format_as_paragraph(self, sentences: List[str], config: FormatConfig) -> str:
        """Format content as flowing paragraphs"""
        
        if len(sentences) <= 3:
            # Short content - single paragraph
            return " ".join(sentences)
        
        # Longer content - multiple paragraphs
        mid_point = len(sentences) // 2
        first_para = " ".join(sentences[:mid_point])
        second_para = " ".join(sentences[mid_point:])
        
        return f"{first_para}\n\n{second_para}"
    
    def _format_key_points(self, sentences: List[str]) -> str:
        """Format sentences as key points"""
        points = []
        for sentence in sentences:
            # Remove redundant starting words
            cleaned = re.sub(r'^(This|It|The \w+ )', '', sentence)
            points.append(f"• {cleaned}")
        return "\n".join(points)
    
    def _format_code_analysis_points(self, sentences: List[str]) -> str:
        """Format sentences for code analysis"""
        points = []
        for i, sentence in enumerate(sentences):
            if i == 0:
                points.append(f"• **Purpose**: {sentence}")
            elif i == 1:
                points.append(f"• **Implementation**: {sentence}")
            else:
                points.append(f"• {sentence}")
        return "\n".join(points)
    
    def _categorize_length(self, content: str, config: FormatConfig) -> str:
        """Categorize the length of formatted content"""
        word_count = len(content.split())
        
        if word_count < 50:
            return "brief"
        elif word_count < 150:
            return "medium"
        else:
            return "detailed"
    
    def _create_empty_answer(self) -> FormattedAnswer:
        """Create empty formatted answer"""
        return FormattedAnswer(
            content="No content available for formatting.",
            question_type=QuestionType.GENERAL,
            format_applied="empty",
            length_category="empty",
            structure_elements=[],
            confidence=0.0
        )
    
    def get_formatting_suggestions(self, question: str) -> Dict[str, Any]:
        """Get formatting suggestions for a question"""
        question_type = self.detect_question_type(question)
        config = self.format_configs[question_type]
        
        return {
            "question_type": question_type.value,
            "recommended_structure": config.structure_type,
            "sentence_range": f"{config.min_sentences}-{config.max_sentences}",
            "use_bullets": config.use_bullets,
            "use_numbers": config.use_numbers,
            "technical_detail_level": config.technical_detail_level,
            "include_examples": config.include_examples
        }


# Global instance
_formatter = None

def get_query_aware_formatter() -> QueryAwareFormatter:
    """Get global query-aware formatter instance"""
    global _formatter
    if _formatter is None:
        _formatter = QueryAwareFormatter()
    return _formatter