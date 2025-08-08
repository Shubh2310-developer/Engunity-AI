#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Intelligent Answer Merger
=========================

Service to intelligently merge RAG answers with web search results
to provide comprehensive, well-structured responses.

Author: Engunity AI Team
"""

import logging
import re
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass
from datetime import datetime

from .agentic_web_crawler import AgenticSearchResponse, WebSearchResult

logger = logging.getLogger(__name__)

@dataclass
class MergedAnswer:
    """Merged answer combining RAG and web sources"""
    success: bool
    answer: str
    confidence: float
    rag_confidence: float
    web_confidence: float
    sources: List[Dict[str, Any]]
    merge_strategy: str
    processing_time: float
    quality_score: float

class IntelligentAnswerMerger:
    """Merge RAG and web search answers intelligently"""
    
    def __init__(self, gemini_api_key: str):
        """Initialize the answer merger"""
        self.gemini_api_key = gemini_api_key
        
        logger.info("Intelligent Answer Merger initialized")
    
    async def merge_answers(self,
                          question: str,
                          rag_answer: str,
                          rag_confidence: float,
                          rag_sources: List[Dict[str, Any]],
                          web_response: AgenticSearchResponse,
                          document_name: Optional[str] = None) -> MergedAnswer:
        """
        Merge RAG and web search answers intelligently
        
        Args:
            question: Original question
            rag_answer: Answer from RAG system
            rag_confidence: Confidence of RAG answer
            rag_sources: Sources from RAG system
            web_response: Web search response
            document_name: Name of the document being queried
            
        Returns:
            MergedAnswer with intelligent synthesis
        """
        start_time = datetime.now()
        
        try:
            logger.info(f"Merging answers for question: {question[:50]}...")
            
            # Determine merge strategy based on confidence levels and content
            merge_strategy = self._determine_merge_strategy(
                rag_answer, rag_confidence, web_response
            )
            
            # Perform intelligent merging based on strategy
            if merge_strategy == "rag_primary":
                merged_answer = await self._merge_rag_primary(
                    question, rag_answer, web_response, document_name
                )
            elif merge_strategy == "web_primary":
                merged_answer = await self._merge_web_primary(
                    question, rag_answer, web_response, document_name
                )
            elif merge_strategy == "balanced_synthesis":
                merged_answer = await self._merge_balanced_synthesis(
                    question, rag_answer, web_response, document_name
                )
            else:  # complementary
                merged_answer = await self._merge_complementary(
                    question, rag_answer, web_response, document_name
                )
            
            # Combine sources
            combined_sources = self._combine_sources(rag_sources, web_response.sources)
            
            # Calculate final confidence and quality
            final_confidence = self._calculate_final_confidence(
                rag_confidence, web_response.confidence, merge_strategy
            )
            
            quality_score = self._assess_answer_quality(merged_answer, combined_sources)
            
            processing_time = (datetime.now() - start_time).total_seconds()
            
            return MergedAnswer(
                success=True,
                answer=merged_answer,
                confidence=final_confidence,
                rag_confidence=rag_confidence,
                web_confidence=web_response.confidence,
                sources=combined_sources,
                merge_strategy=merge_strategy,
                processing_time=processing_time,
                quality_score=quality_score
            )
            
        except Exception as e:
            logger.error(f"Answer merging failed: {e}")
            
            # Fallback to RAG answer
            processing_time = (datetime.now() - start_time).total_seconds()
            return MergedAnswer(
                success=False,
                answer=rag_answer,
                confidence=rag_confidence,
                rag_confidence=rag_confidence,
                web_confidence=0.0,
                sources=rag_sources,
                merge_strategy="fallback_rag",
                processing_time=processing_time,
                quality_score=0.5
            )
    
    def _determine_merge_strategy(self,
                                rag_answer: str,
                                rag_confidence: float,
                                web_response: AgenticSearchResponse) -> str:
        """Determine the best merge strategy based on answer quality"""
        
        # Check if web search failed
        if not web_response.success or web_response.confidence < 0.3:
            return "rag_primary"
        
        # Check answer lengths and content quality
        rag_length = len(rag_answer.strip())
        web_length = len(web_response.answer.strip())
        
        # High confidence RAG with low confidence web
        if rag_confidence > 0.8 and web_response.confidence < 0.6:
            return "rag_primary"
        
        # High confidence web with low confidence RAG
        if web_response.confidence > 0.8 and rag_confidence < 0.6:
            return "web_primary"
        
        # Both have reasonable confidence - check content complementarity
        if rag_confidence > 0.6 and web_response.confidence > 0.6:
            # Check if answers seem to address different aspects
            if self._answers_are_complementary(rag_answer, web_response.answer):
                return "complementary"
            else:
                return "balanced_synthesis"
        
        # Default to balanced synthesis
        return "balanced_synthesis"
    
    def _answers_are_complementary(self, rag_answer: str, web_answer: str) -> bool:
        """Check if answers address different aspects of the question"""
        # Simple heuristic: check word overlap
        rag_words = set(rag_answer.lower().split())
        web_words = set(web_answer.lower().split())
        
        # Remove common words
        common_words = {'the', 'is', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'}
        rag_words -= common_words
        web_words -= common_words
        
        if not rag_words or not web_words:
            return False
        
        overlap = len(rag_words & web_words) / min(len(rag_words), len(web_words))
        
        # If overlap is low, answers might be complementary
        return overlap < 0.4
    
    async def _merge_rag_primary(self,
                               question: str,
                               rag_answer: str,
                               web_response: AgenticSearchResponse,
                               document_name: Optional[str]) -> str:
        """Merge with RAG as primary source"""
        
        if web_response.success and web_response.answer:
            try:
                # Create comprehensive merged answer
                merged_sections = []
                
                # Start with document-based content
                if rag_answer and len(rag_answer.strip()) > 20:
                    merged_sections.append(rag_answer.strip())
                
                # Add relevant web information
                if web_response.answer and len(web_response.answer.strip()) > 20:
                    web_content = web_response.answer.strip()
                    # Remove any source prefixes or metadata
                    web_content = self._clean_content(web_content)
                    if web_content and not self._is_duplicate_content(rag_answer, web_content):
                        merged_sections.append(web_content)
                
                # Combine into final answer
                if merged_sections:
                    return self._structure_final_answer(question, merged_sections)
                
            except Exception as e:
                logger.warning(f"RAG-primary merge failed: {e}")
        
        return self._structure_final_answer(question, [rag_answer]) if rag_answer else "I couldn't find sufficient information to answer your question."
    
    async def _merge_web_primary(self,
                               question: str,
                               rag_answer: str,
                               web_response: AgenticSearchResponse,
                               document_name: Optional[str]) -> str:
        """Merge with web as primary source"""
        
        try:
            merged_sections = []
            
            # Start with web content as primary
            if web_response.answer and len(web_response.answer.strip()) > 20:
                web_content = self._clean_content(web_response.answer.strip())
                if web_content:
                    merged_sections.append(web_content)
            
            # Add relevant document information
            if rag_answer and len(rag_answer.strip()) > 20:
                rag_content = self._clean_content(rag_answer.strip())
                if rag_content and not self._is_duplicate_content(web_response.answer, rag_content):
                    merged_sections.append(rag_content)
            
            if merged_sections:
                return self._structure_final_answer(question, merged_sections)
                
        except Exception as e:
            logger.warning(f"Web-primary merge failed: {e}")
        
        web_content = self._clean_content(web_response.answer) if web_response.answer else ""
        return self._structure_final_answer(question, [web_content]) if web_content else "I couldn't find sufficient information to answer your question."
    
    async def _merge_balanced_synthesis(self,
                                      question: str,
                                      rag_answer: str,
                                      web_response: AgenticSearchResponse,
                                      document_name: Optional[str]) -> str:
        """Create balanced synthesis of both answers"""
        
        try:
            merged_sections = []
            
            # Process and clean both answers
            rag_content = self._clean_content(rag_answer) if rag_answer else ""
            web_content = self._clean_content(web_response.answer) if web_response.answer else ""
            
            # Add non-duplicate content
            if rag_content and len(rag_content.strip()) > 20:
                merged_sections.append(rag_content)
            
            if web_content and len(web_content.strip()) > 20:
                if not self._is_duplicate_content(rag_content, web_content):
                    merged_sections.append(web_content)
            
            if merged_sections:
                return self._structure_final_answer(question, merged_sections)
                
        except Exception as e:
            logger.warning(f"Balanced synthesis failed: {e}")
        
        # Fallback to best available content
        if rag_answer:
            return self._structure_final_answer(question, [self._clean_content(rag_answer)])
        elif web_response.answer:
            return self._structure_final_answer(question, [self._clean_content(web_response.answer)])
        else:
            return "I couldn't find sufficient information to answer your question."
    
    async def _merge_complementary(self,
                                 question: str,
                                 rag_answer: str,
                                 web_response: AgenticSearchResponse,
                                 document_name: Optional[str]) -> str:
        """Merge complementary answers that address different aspects"""
        
        try:
            merged_sections = []
            
            # Clean both answers
            rag_content = self._clean_content(rag_answer) if rag_answer else ""
            web_content = self._clean_content(web_response.answer) if web_response.answer else ""
            
            # Since they're complementary, include both perspectives
            if rag_content and len(rag_content.strip()) > 20:
                merged_sections.append(rag_content)
            
            if web_content and len(web_content.strip()) > 20:
                merged_sections.append(web_content)
                
            if merged_sections:
                return self._structure_final_answer(question, merged_sections)
                
        except Exception as e:
            logger.warning(f"Complementary merge failed: {e}")
        
        # Fallback to best available content
        if rag_answer:
            return self._structure_final_answer(question, [self._clean_content(rag_answer)])
        elif web_response.answer:
            return self._structure_final_answer(question, [self._clean_content(web_response.answer)])
        else:
            return "I couldn't find sufficient information to answer your question."
    
    def _combine_sources(self,
                        rag_sources: List[Dict[str, Any]],
                        web_sources: List[WebSearchResult]) -> List[Dict[str, Any]]:
        """Combine sources from RAG and web search"""
        combined = []
        
        # Add RAG sources
        for source in rag_sources:
            combined.append({
                **source,
                "source_type": "document",
                "origin": "rag"
            })
        
        # Add web sources
        for web_source in web_sources:
            combined.append({
                "type": "web",
                "title": web_source.title,
                "url": web_source.url,
                "content": web_source.content,
                "confidence": web_source.relevance_score,
                "source_type": web_source.source_type,
                "origin": "web",
                "metadata": {
                    "timestamp": web_source.timestamp.isoformat() if web_source.timestamp else None
                }
            })
        
        return combined
    
    def _calculate_final_confidence(self,
                                  rag_confidence: float,
                                  web_confidence: float,
                                  merge_strategy: str) -> float:
        """Calculate final confidence based on merge strategy"""
        
        if merge_strategy == "rag_primary":
            return min(0.95, rag_confidence + web_confidence * 0.1)
        elif merge_strategy == "web_primary":
            return min(0.95, web_confidence + rag_confidence * 0.1)
        elif merge_strategy == "balanced_synthesis":
            return min(0.95, (rag_confidence + web_confidence) / 2 + 0.1)
        elif merge_strategy == "complementary":
            return min(0.95, max(rag_confidence, web_confidence) + 0.15)
        else:  # fallback
            return rag_confidence
    
    def _assess_answer_quality(self,
                             answer: str,
                             sources: List[Dict[str, Any]]) -> float:
        """Assess the quality of the merged answer"""
        
        quality_score = 0.5  # Base score
        
        # Length and completeness
        if len(answer) > 200:
            quality_score += 0.1
        if len(answer) > 500:
            quality_score += 0.1
        
        # Source diversity
        if len(sources) > 1:
            quality_score += 0.1
        
        # Multiple source types
        source_types = set(s.get("origin", "unknown") for s in sources)
        if len(source_types) > 1:
            quality_score += 0.2
        
        return min(1.0, quality_score)
    
    def _clean_content(self, content: str) -> str:
        """Remove source references and metadata from content"""
        if not content:
            return ""
        
        # Remove lines that start with source indicators
        lines = content.split('\n')
        cleaned_lines = []
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
                
            # Skip lines that look like source references
            if (line.startswith('--- Source') or 
                line.startswith('**From web sources:**') or
                line.startswith('**From the document:**') or
                line.startswith('From web sources:') or
                line.startswith('Based on web search') or
                line.startswith('Web search performed') or
                line.startswith('*This') or
                line.startswith('Source:') or
                line.startswith('[Source:')):
                continue
            
            # Remove metadata patterns
            if ('Score:' in line and ('Source' in line or '---' in line)):
                continue
                
            cleaned_lines.append(line)
        
        # Join and clean up extra whitespace
        cleaned = '\n'.join(cleaned_lines).strip()
        
        # Remove any remaining source formatting
        import re
        cleaned = re.sub(r'\*\*From [^*]+\*\*:?\s*', '', cleaned)
        cleaned = re.sub(r'Based on web search.*?:', '', cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r'According to.*?sources?:?\s*', '', cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r'\n\s*\n\s*\n', '\n\n', cleaned)  # Remove excessive newlines
        
        return cleaned.strip()
    
    def _is_duplicate_content(self, content1: str, content2: str) -> bool:
        """Check if two content pieces are substantially similar"""
        if not content1 or not content2:
            return False
        
        # Simple similarity check based on word overlap
        words1 = set(content1.lower().split())
        words2 = set(content2.lower().split())
        
        if not words1 or not words2:
            return False
        
        # Remove common words
        common_words = {'the', 'is', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'a', 'an'}
        words1 -= common_words
        words2 -= common_words
        
        if not words1 or not words2:
            return False
        
        overlap = len(words1 & words2) / max(len(words1), len(words2))
        return overlap > 0.7  # 70% similarity threshold
    
    def _structure_final_answer(self, question: str, sections: List[str]) -> str:
        """Structure the final answer in a clean, complete format"""
        if not sections:
            return "I couldn't find sufficient information to answer your question."
        
        # Filter out empty sections
        valid_sections = [s.strip() for s in sections if s and s.strip()]
        if not valid_sections:
            return "I couldn't find sufficient information to answer your question."
        
        # If only one section, return it directly
        if len(valid_sections) == 1:
            return valid_sections[0]
        
        # Combine multiple sections intelligently
        combined = []
        for i, section in enumerate(valid_sections):
            if i == 0:
                combined.append(section)
            else:
                # Add some separation between sections
                combined.append(section)
        
        return '\n\n'.join(combined)

# Global instance
_answer_merger: Optional[IntelligentAnswerMerger] = None

def get_answer_merger() -> IntelligentAnswerMerger:
    """Get global answer merger instance"""
    global _answer_merger
    if _answer_merger is None:
        # Use the provided Gemini API key
        api_key = "AIzaSyBFWuZXOdfgbDxXqM8sWVr2f12WBj3jqv0"
        _answer_merger = IntelligentAnswerMerger(api_key)
    return _answer_merger