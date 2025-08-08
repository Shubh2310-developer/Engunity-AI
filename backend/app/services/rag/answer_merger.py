"""
Answer Merger for Agentic RAG Pipeline
=====================================

Advanced answer merging system that combines local document-based responses
with external web-crawled content using coherence validation, score fusion,
and intelligent synthesis.

Features:
- Vector similarity comparison between answers
- Perplexity-based quality scoring
- Coherence validation and conflict detection
- Multi-perspective answer synthesis
- Weighted fusion algorithms
- Answer quality metrics

Author: Engunity AI Team
"""

import os
import json
import logging
import numpy as np
import math
from typing import Dict, List, Optional, Any, Union, Tuple
from dataclasses import dataclass
from datetime import datetime
import re
from sentence_transformers import SentenceTransformer

logger = logging.getLogger(__name__)

@dataclass
class AnswerSource:
    """Source of an answer with metadata."""
    content: str
    confidence: float
    source_type: str  # 'local', 'web', 'merged'
    metadata: Dict[str, Any]
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'content': self.content,
            'confidence': self.confidence,
            'source_type': self.source_type,
            'metadata': self.metadata
        }

@dataclass
class MergeResult:
    """Result from answer merging."""
    final_answer: str
    confidence: float
    merge_strategy: str
    source_breakdown: Dict[str, float]
    coherence_score: float
    quality_metrics: Dict[str, Any]
    metadata: Dict[str, Any]
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'final_answer': self.final_answer,
            'confidence': self.confidence,
            'merge_strategy': self.merge_strategy,
            'source_breakdown': self.source_breakdown,
            'coherence_score': self.coherence_score,
            'quality_metrics': self.quality_metrics,
            'metadata': self.metadata
        }

class AnswerMerger:
    """Advanced answer merger with coherence validation and score fusion."""
    
    def __init__(
        self,
        embedding_model: str = "BAAI/bge-small-en-v1.5",
        similarity_threshold: float = 0.75,
        confidence_weight: float = 0.6,
        similarity_weight: float = 0.4,
        min_answer_length: int = 20,
        max_answer_length: int = 1000
    ):
        """
        Initialize Answer Merger.
        
        Args:
            embedding_model: Model for computing answer similarity
            similarity_threshold: Threshold for considering answers similar
            confidence_weight: Weight for confidence in fusion (α)
            similarity_weight: Weight for similarity in fusion (β)
            min_answer_length: Minimum acceptable answer length
            max_answer_length: Maximum acceptable answer length
        """
        self.embedding_model_name = embedding_model
        self.similarity_threshold = similarity_threshold
        self.confidence_weight = confidence_weight  # α
        self.similarity_weight = similarity_weight  # β
        self.min_answer_length = min_answer_length
        self.max_answer_length = max_answer_length
        
        # Load embedding model for similarity computation
        try:
            self.embedding_model = SentenceTransformer(embedding_model)
            logger.info(f"Loaded embedding model: {embedding_model}")
        except Exception as e:
            logger.error(f"Failed to load embedding model: {e}")
            self.embedding_model = None
        
        # Quality metrics weights
        self.quality_weights = {
            'length_score': 0.2,
            'coherence_score': 0.3,
            'informativeness_score': 0.3,
            'confidence_score': 0.2
        }
        
        logger.info("Answer Merger initialized")
    
    def _compute_perplexity(self, text: str) -> float:
        """
        Compute simplified perplexity score for text quality.
        
        Args:
            text: Input text
            
        Returns:
            Perplexity score (lower is better)
        """
        # Simplified perplexity based on word frequency and structure
        if not text.strip():
            return float('inf')
        
        words = text.lower().split()
        if len(words) == 0:
            return float('inf')
        
        # Calculate word diversity
        unique_words = set(words)
        diversity = len(unique_words) / len(words)
        
        # Calculate average word length (longer words often indicate more complex content)
        avg_word_length = sum(len(word) for word in words) / len(words)
        
        # Calculate sentence structure score
        sentences = re.split(r'[.!?]+', text)
        sentences = [s.strip() for s in sentences if s.strip()]
        
        if len(sentences) == 0:
            return float('inf')
        
        avg_sentence_length = len(words) / len(sentences)
        
        # Combine metrics (lower perplexity = better quality)
        # Invert scores so lower is better
        perplexity = (
            (1.0 / max(diversity, 0.1)) * 0.4 +
            (1.0 / max(avg_word_length / 5.0, 0.1)) * 0.3 +
            (1.0 / max(avg_sentence_length / 15.0, 0.1)) * 0.3
        )
        
        return max(perplexity, 1.0)  # Ensure minimum perplexity of 1.0
    
    def _compute_similarity(self, text1: str, text2: str) -> float:
        """
        Compute semantic similarity between two texts.
        
        Args:
            text1: First text
            text2: Second text
            
        Returns:
            Similarity score (0-1)
        """
        if not self.embedding_model or not text1.strip() or not text2.strip():
            return 0.0
        
        try:
            # Get embeddings
            embeddings = self.embedding_model.encode([text1, text2], normalize_embeddings=True)
            
            # Compute cosine similarity
            similarity = float(np.dot(embeddings[0], embeddings[1]))
            return max(0.0, min(1.0, similarity))
            
        except Exception as e:
            logger.error(f"Error computing similarity: {e}")
            return 0.0
    
    def _calculate_quality_score(self, answer: AnswerSource, query: str) -> Dict[str, float]:
        """
        Calculate comprehensive quality score for an answer.
        
        Args:
            answer: Answer source
            query: Original query
            
        Returns:
            Dictionary of quality metrics
        """
        content = answer.content
        
        # Length score (optimal length around 100-300 characters)
        length = len(content)
        if length < self.min_answer_length:
            length_score = length / self.min_answer_length
        elif length > self.max_answer_length:
            length_score = max(0.5, 1.0 - (length - self.max_answer_length) / self.max_answer_length)
        else:
            # Optimal range
            optimal_length = 200
            length_score = 1.0 - abs(length - optimal_length) / optimal_length * 0.5
        
        # Coherence score (based on structure and flow)
        sentences = re.split(r'[.!?]+', content)
        sentences = [s.strip() for s in sentences if s.strip()]
        
        if len(sentences) == 0:
            coherence_score = 0.0
        else:
            # Check for proper sentence structure
            avg_sentence_length = len(content.split()) / len(sentences)
            coherence_score = min(1.0, avg_sentence_length / 20.0)  # Optimal ~20 words per sentence
            
            # Bonus for connecting words
            connecting_words = ['therefore', 'however', 'moreover', 'furthermore', 'consequently']
            connection_count = sum(1 for word in connecting_words if word in content.lower())
            coherence_score += min(0.2, connection_count * 0.05)
        
        # Informativeness score (query relevance and detail)
        query_words = set(query.lower().split())
        content_words = set(content.lower().split())
        word_overlap = len(query_words & content_words)
        informativeness_score = min(1.0, word_overlap / max(len(query_words), 1) + 0.2)
        
        # Confidence score (from source)
        confidence_score = answer.confidence
        
        # Compute weighted overall score
        overall_score = (
            length_score * self.quality_weights['length_score'] +
            coherence_score * self.quality_weights['coherence_score'] +
            informativeness_score * self.quality_weights['informativeness_score'] +
            confidence_score * self.quality_weights['confidence_score']
        )
        
        return {
            'length_score': length_score,
            'coherence_score': coherence_score,
            'informativeness_score': informativeness_score,
            'confidence_score': confidence_score,
            'overall_score': overall_score
        }
    
    def _detect_conflicts(self, local_answer: AnswerSource, web_answer: AnswerSource) -> Dict[str, Any]:
        """
        Detect conflicts between local and web answers.
        
        Args:
            local_answer: Local document-based answer
            web_answer: Web-crawled answer
            
        Returns:
            Conflict analysis
        """
        # Compute similarity
        similarity = self._compute_similarity(local_answer.content, web_answer.content)
        
        # Detect contradictory keywords
        contradictory_pairs = [
            ('yes', 'no'), ('true', 'false'), ('correct', 'incorrect'),
            ('always', 'never'), ('all', 'none'), ('increase', 'decrease'),
            ('positive', 'negative'), ('good', 'bad'), ('right', 'wrong')
        ]
        
        local_words = set(local_answer.content.lower().split())
        web_words = set(web_answer.content.lower().split())
        
        conflicts = []
        for word1, word2 in contradictory_pairs:
            if word1 in local_words and word2 in web_words:
                conflicts.append((word1, word2))
            elif word2 in local_words and word1 in web_words:
                conflicts.append((word2, word1))
        
        # Determine conflict level
        if similarity >= self.similarity_threshold:
            conflict_level = 'none'
        elif similarity >= 0.5:
            conflict_level = 'minor'
        elif conflicts:
            conflict_level = 'major'
        else:
            conflict_level = 'moderate'
        
        return {
            'similarity': similarity,
            'conflict_level': conflict_level,
            'contradictory_terms': conflicts,
            'analysis': f"Similarity: {similarity:.3f}, Conflicts: {len(conflicts)}"
        }
    
    def _merge_similar_answers(
        self, 
        local_answer: AnswerSource, 
        web_answer: AnswerSource,
        query: str
    ) -> str:
        """
        Merge similar answers by combining their strengths.
        
        Args:
            local_answer: Local document-based answer
            web_answer: Web-crawled answer
            query: Original query
            
        Returns:
            Merged answer text
        """
        # Choose primary answer based on quality and confidence
        local_quality = self._calculate_quality_score(local_answer, query)
        web_quality = self._calculate_quality_score(web_answer, query)
        
        if local_quality['overall_score'] >= web_quality['overall_score']:
            primary = local_answer.content
            secondary = web_answer.content
            primary_type = 'local'
        else:
            primary = web_answer.content
            secondary = local_answer.content
            primary_type = 'web'
        
        # Extract unique information from secondary source
        primary_words = set(primary.lower().split())
        secondary_sentences = re.split(r'[.!?]+', secondary)
        
        additional_info = []
        for sentence in secondary_sentences:
            sentence = sentence.strip()
            if sentence:
                sentence_words = set(sentence.lower().split())
                # Add sentence if it contains new information
                if len(sentence_words - primary_words) >= 3:  # At least 3 new words
                    additional_info.append(sentence)
        
        # Combine answers
        if additional_info:
            merged = f"{primary.rstrip('.')}. {' '.join(additional_info[:2])}"  # Add top 2 additional sentences
        else:
            merged = primary
        
        return merged[:self.max_answer_length]  # Ensure length limit
    
    def _merge_complementary_answers(
        self, 
        local_answer: AnswerSource, 
        web_answer: AnswerSource,
        query: str
    ) -> str:
        """
        Merge complementary answers that provide different perspectives.
        
        Args:
            local_answer: Local document-based answer
            web_answer: Web-crawled answer
            query: Original query
            
        Returns:
            Merged answer text
        """
        # Create structured merge with clear attribution
        local_quality = self._calculate_quality_score(local_answer, query)
        web_quality = self._calculate_quality_score(web_answer, query)
        
        # Determine which should be primary based on quality
        if local_quality['overall_score'] >= web_quality['overall_score']:
            first_answer = local_answer.content
            second_answer = web_answer.content
        else:
            first_answer = web_answer.content
            second_answer = local_answer.content
        
        # Create merged response with clear structure
        merged_parts = []
        
        # Add primary answer
        merged_parts.append(first_answer.rstrip('.'))
        
        # Add complementary information
        if len(second_answer.strip()) > self.min_answer_length:
            # Extract key points from second answer
            second_sentences = re.split(r'[.!?]+', second_answer)
            key_sentences = [s.strip() for s in second_sentences if len(s.strip()) > 10][:2]
            
            if key_sentences:
                merged_parts.append("Additionally, " + '. '.join(key_sentences))
        
        merged = '. '.join(merged_parts)
        return merged[:self.max_answer_length]
    
    def _create_multi_perspective_answer(
        self, 
        local_answer: AnswerSource, 
        web_answer: AnswerSource,
        query: str
    ) -> str:
        """
        Create multi-perspective answer for conflicting sources.
        
        Args:
            local_answer: Local document-based answer
            web_answer: Web-crawled answer
            query: Original query
            
        Returns:
            Multi-perspective answer
        """
        # Present both perspectives clearly
        perspectives = []
        
        # Add document-based perspective
        if len(local_answer.content.strip()) > self.min_answer_length:
            perspectives.append(f"According to internal documentation: {local_answer.content.rstrip('.')}")
        
        # Add web-based perspective
        if len(web_answer.content.strip()) > self.min_answer_length:
            perspectives.append(f"According to external sources: {web_answer.content.rstrip('.')}")
        
        if len(perspectives) >= 2:
            merged = '. '.join(perspectives)
            # Add note about multiple perspectives
            merged += ". These perspectives should be considered together for a complete understanding."
        elif perspectives:
            merged = perspectives[0]
        else:
            merged = "Multiple perspectives exist on this topic, but specific details are limited."
        
        return merged[:self.max_answer_length]
    
    def merge_answers(
        self,
        local_answer: Optional[AnswerSource] = None,
        web_answers: Optional[List[AnswerSource]] = None,
        query: str = "",
        context: Optional[Dict[str, Any]] = None
    ) -> MergeResult:
        """
        Main method to merge answers from different sources.
        
        Args:
            local_answer: Answer from local documents
            web_answers: List of answers from web crawling
            query: Original user query
            context: Additional context information
            
        Returns:
            Merged answer result
        """
        logger.info(f"Merging answers for query: '{query[:100]}...'")
        
        # Handle edge cases
        if not local_answer and not web_answers:
            return MergeResult(
                final_answer="No relevant information found.",
                confidence=0.0,
                merge_strategy="no_sources",
                source_breakdown={},
                coherence_score=0.0,
                quality_metrics={},
                metadata={'error': 'No sources provided'}
            )
        
        # Use only local answer if no web answers
        if local_answer and not web_answers:
            quality_metrics = self._calculate_quality_score(local_answer, query)
            return MergeResult(
                final_answer=local_answer.content,
                confidence=local_answer.confidence,
                merge_strategy="local_only",
                source_breakdown={'local': 1.0},
                coherence_score=quality_metrics['coherence_score'],
                quality_metrics=quality_metrics,
                metadata={'local_source': local_answer.metadata}
            )
        
        # Use only web answers if no local answer
        if not local_answer and web_answers:
            # Select best web answer
            best_web = max(web_answers, key=lambda x: x.confidence)
            quality_metrics = self._calculate_quality_score(best_web, query)
            
            return MergeResult(
                final_answer=best_web.content,
                confidence=best_web.confidence,
                merge_strategy="web_only",
                source_breakdown={'web': 1.0},
                coherence_score=quality_metrics['coherence_score'],
                quality_metrics=quality_metrics,
                metadata={'web_sources': [w.metadata for w in web_answers]}
            )
        
        # Merge local and web answers
        best_web = max(web_answers, key=lambda x: x.confidence)
        
        # Analyze relationship between answers
        conflict_analysis = self._detect_conflicts(local_answer, best_web)
        
        # Calculate quality scores
        local_quality = self._calculate_quality_score(local_answer, query)
        web_quality = self._calculate_quality_score(best_web, query)
        
        # Determine merge strategy based on conflict analysis
        similarity = conflict_analysis['similarity']
        conflict_level = conflict_analysis['conflict_level']
        
        if similarity >= self.similarity_threshold:
            # Highly similar answers - merge by combining strengths
            final_answer = self._merge_similar_answers(local_answer, best_web, query)
            merge_strategy = "similar_merge"
            
            # Weighted confidence based on quality
            confidence = (
                local_answer.confidence * local_quality['overall_score'] * 0.6 +
                best_web.confidence * web_quality['overall_score'] * 0.4
            )
            source_breakdown = {'local': 0.6, 'web': 0.4}
            
        elif conflict_level in ['none', 'minor']:
            # Complementary answers - merge with clear structure
            final_answer = self._merge_complementary_answers(local_answer, best_web, query)
            merge_strategy = "complementary_merge"
            
            # Balanced confidence
            confidence = (local_answer.confidence + best_web.confidence) / 2
            source_breakdown = {'local': 0.5, 'web': 0.5}
            
        else:
            # Conflicting answers - provide multi-perspective view
            final_answer = self._create_multi_perspective_answer(local_answer, best_web, query)
            merge_strategy = "multi_perspective"
            
            # Conservative confidence for conflicting sources
            confidence = min(local_answer.confidence, best_web.confidence) * 0.8
            source_breakdown = {'local': 0.5, 'web': 0.5}
        
        # Calculate overall coherence score
        coherence_score = (local_quality['coherence_score'] + web_quality['coherence_score']) / 2
        
        # Combined quality metrics
        combined_quality = {
            'local_quality': local_quality,
            'web_quality': web_quality,
            'conflict_analysis': conflict_analysis,
            'final_length': len(final_answer),
            'merge_success': True
        }
        
        result = MergeResult(
            final_answer=final_answer,
            confidence=min(confidence, 1.0),
            merge_strategy=merge_strategy,
            source_breakdown=source_breakdown,
            coherence_score=coherence_score,
            quality_metrics=combined_quality,
            metadata={
                'local_source': local_answer.metadata,
                'web_sources': [w.metadata for w in web_answers],
                'merge_timestamp': datetime.now().isoformat(),
                'similarity_score': similarity
            }
        )
        
        logger.info(f"Answer merge completed: {merge_strategy}, confidence: {confidence:.3f}")
        return result
    
    def get_stats(self) -> Dict[str, Any]:
        """Get merger statistics."""
        return {
            'embedding_model': self.embedding_model_name,
            'similarity_threshold': self.similarity_threshold,
            'confidence_weight': self.confidence_weight,
            'similarity_weight': self.similarity_weight,
            'quality_weights': self.quality_weights,
            'model_loaded': self.embedding_model is not None
        }

# Factory function
def create_answer_merger(**kwargs) -> AnswerMerger:
    """Create Answer Merger with default configuration."""
    return AnswerMerger(**kwargs)

# Export main classes
__all__ = [
    "AnswerMerger",
    "AnswerSource",
    "MergeResult",
    "create_answer_merger"
]