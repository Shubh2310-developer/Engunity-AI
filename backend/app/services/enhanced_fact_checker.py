#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Enhanced Fact Checker with Embedding-Based Verification
========================================================

Implements sophisticated fact checking using:
- Sentence-level semantic similarity
- Cross-encoder verification
- Support score thresholding
- Answer filtering and confidence scoring

This addresses the "vague answers" problem by ensuring only
well-supported content makes it through.

Author: Engunity AI Team
"""

import logging
import re
import numpy as np
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass
from sentence_transformers import SentenceTransformer, CrossEncoder
from sklearn.metrics.pairwise import cosine_similarity
import torch

logger = logging.getLogger(__name__)

@dataclass
class SentenceVerification:
    """Verification result for a single sentence"""
    sentence: str
    is_supported: bool
    confidence: float
    semantic_score: float
    cross_encoder_score: float
    supporting_chunks: List[str]

@dataclass 
class FactCheckResult:
    """Complete fact check result"""
    original_answer: str
    verified_sentences: List[SentenceVerification]
    filtered_answer: str
    overall_support_score: float
    confidence_score: float
    num_supported_sentences: int
    num_total_sentences: int
    support_ratio: float

class EnhancedFactChecker:
    """Advanced fact checking with embedding-based verification"""
    
    def __init__(self, 
                 embedding_model: str = "all-MiniLM-L6-v2",
                 cross_encoder_model: str = "BAAI/bge-reranker-base",
                 support_threshold: float = 0.6,
                 use_cross_encoder: bool = True):
        
        self.support_threshold = support_threshold
        self.use_cross_encoder = use_cross_encoder
        
        # Initialize embedding model for semantic similarity
        logger.info(f"Loading embedding model: {embedding_model}")
        self.sentence_transformer = SentenceTransformer(embedding_model)
        
        # Initialize cross-encoder for more accurate verification
        if use_cross_encoder:
            try:
                logger.info(f"Loading cross-encoder: {cross_encoder_model}")
                self.cross_encoder = CrossEncoder(cross_encoder_model)
            except Exception as e:
                logger.warning(f"Failed to load cross-encoder: {e}. Using embedding similarity only.")
                self.use_cross_encoder = False
        
        logger.info(f"Enhanced Fact Checker initialized (threshold: {support_threshold})")
    
    def fact_check_answer(self, 
                         answer: str, 
                         context_chunks: List[str],
                         question: str = "") -> FactCheckResult:
        """Comprehensive fact checking of generated answer"""
        
        if not answer or not context_chunks:
            return self._create_empty_result(answer)
        
        # 1. Split answer into sentences
        sentences = self._split_into_sentences(answer)
        if not sentences:
            return self._create_empty_result(answer)
        
        # 2. Prepare context for comparison
        combined_context = "\n".join(context_chunks)
        
        # 3. Verify each sentence
        verified_sentences = []
        for sentence in sentences:
            verification = self._verify_sentence(sentence, context_chunks, combined_context)
            verified_sentences.append(verification)
        
        # 4. Filter supported sentences
        supported_sentences = [v for v in verified_sentences if v.is_supported]
        
        # 5. Create filtered answer
        filtered_answer = self._create_filtered_answer(verified_sentences, answer)
        
        # 6. Calculate overall scores
        support_ratio = len(supported_sentences) / len(sentences) if sentences else 0.0
        overall_support_score = np.mean([v.confidence for v in verified_sentences]) if verified_sentences else 0.0
        confidence_score = self._calculate_confidence_score(support_ratio, overall_support_score)
        
        result = FactCheckResult(
            original_answer=answer,
            verified_sentences=verified_sentences,
            filtered_answer=filtered_answer,
            overall_support_score=overall_support_score,
            confidence_score=confidence_score,
            num_supported_sentences=len(supported_sentences),
            num_total_sentences=len(sentences),
            support_ratio=support_ratio
        )
        
        logger.info(f"Fact check complete: {len(supported_sentences)}/{len(sentences)} sentences supported "
                   f"(score: {overall_support_score:.3f})")
        
        return result
    
    def _split_into_sentences(self, text: str) -> List[str]:
        """Split text into meaningful sentences"""
        # Handle common abbreviations that shouldn't split sentences
        text = re.sub(r'\be\.g\.', 'eg', text)
        text = re.sub(r'\bi\.e\.', 'ie', text)
        text = re.sub(r'\bvs\.', 'vs', text)
        text = re.sub(r'\bDr\.', 'Dr', text)
        text = re.sub(r'\bMr\.', 'Mr', text)
        text = re.sub(r'\bMs\.', 'Ms', text)
        
        # Split on sentence endings
        sentences = re.split(r'[.!?]+\s+', text)
        
        # Clean and filter sentences
        cleaned_sentences = []
        for sentence in sentences:
            sentence = sentence.strip()
            
            # Restore abbreviations
            sentence = re.sub(r'\beg\b', 'e.g.', sentence)
            sentence = re.sub(r'\bie\b', 'i.e.', sentence)
            sentence = re.sub(r'\bvs\b', 'vs.', sentence)
            sentence = re.sub(r'\bDr\b', 'Dr.', sentence)
            sentence = re.sub(r'\bMr\b', 'Mr.', sentence)
            sentence = re.sub(r'\bMs\b', 'Ms.', sentence)
            
            # Only include substantial sentences
            if len(sentence) >= 20 and len(sentence.split()) >= 4:
                # Add period if missing
                if not sentence.endswith(('.', '!', '?')):
                    sentence += '.'
                cleaned_sentences.append(sentence)
        
        return cleaned_sentences
    
    def _verify_sentence(self, 
                        sentence: str, 
                        context_chunks: List[str], 
                        combined_context: str) -> SentenceVerification:
        """Verify if a sentence is supported by context"""
        
        # Calculate semantic similarity scores
        semantic_scores = []
        supporting_chunks = []
        
        try:
            # Encode sentence and context chunks
            sentence_embedding = self.sentence_transformer.encode([sentence])
            chunk_embeddings = self.sentence_transformer.encode(context_chunks)
            
            # Calculate cosine similarities
            similarities = cosine_similarity(sentence_embedding, chunk_embeddings)[0]
            
            # Find best supporting chunks
            for i, (chunk, similarity) in enumerate(zip(context_chunks, similarities)):
                semantic_scores.append(similarity)
                if similarity >= self.support_threshold * 0.8:  # Lower threshold for supporting chunks
                    supporting_chunks.append(chunk[:200] + "..." if len(chunk) > 200 else chunk)
            
            semantic_score = max(semantic_scores) if semantic_scores else 0.0
            
        except Exception as e:
            logger.warning(f"Semantic similarity calculation failed: {e}")
            semantic_score = 0.0
        
        # Cross-encoder verification for higher accuracy
        cross_encoder_score = 0.0
        if self.use_cross_encoder and semantic_score >= self.support_threshold * 0.7:
            try:
                # Create pairs for cross-encoder
                pairs = [(sentence, chunk) for chunk in context_chunks[:3]]  # Top 3 chunks
                scores = self.cross_encoder.predict(pairs)
                cross_encoder_score = max(scores) if len(scores) > 0 else 0.0
                
                # Normalize cross-encoder score (it might be in different range)
                if hasattr(scores, 'max') and scores.max() > 2.0:
                    cross_encoder_score = cross_encoder_score / scores.max()
                
            except Exception as e:
                logger.warning(f"Cross-encoder verification failed: {e}")
        
        # Combine scores for final decision
        if self.use_cross_encoder and cross_encoder_score > 0:
            # Weighted combination: semantic (40%) + cross-encoder (60%)
            combined_score = semantic_score * 0.4 + cross_encoder_score * 0.6
        else:
            combined_score = semantic_score
        
        # Determine support
        is_supported = combined_score >= self.support_threshold
        confidence = min(1.0, combined_score + 0.1)  # Slight confidence boost for supported content
        
        return SentenceVerification(
            sentence=sentence,
            is_supported=is_supported,
            confidence=confidence,
            semantic_score=semantic_score,
            cross_encoder_score=cross_encoder_score,
            supporting_chunks=supporting_chunks[:2]  # Keep top 2 supporting chunks
        )
    
    def _create_filtered_answer(self, 
                               verified_sentences: List[SentenceVerification],
                               original_answer: str) -> str:
        """Create filtered answer with only supported sentences"""
        
        supported_sentences = [v.sentence for v in verified_sentences if v.is_supported]
        
        if not supported_sentences:
            return "The document does not contain sufficient reliable information to answer this question."
        
        # Check if we filtered out too much content
        original_length = len(original_answer.split())
        filtered_length = len(" ".join(supported_sentences).split())
        
        if filtered_length < original_length * 0.3:  # Lost more than 70% of content
            # Try with slightly lower threshold for this case
            lower_threshold_sentences = [
                v.sentence for v in verified_sentences 
                if v.confidence >= max(0.4, self.support_threshold - 0.2)
            ]
            
            if lower_threshold_sentences and len(" ".join(lower_threshold_sentences).split()) > filtered_length:
                filtered_answer = " ".join(lower_threshold_sentences)
                filtered_answer += "\n\n(Note: Some parts of the answer have lower confidence and were verified with a relaxed threshold.)"
                return filtered_answer
        
        # Join supported sentences
        filtered_answer = " ".join(supported_sentences)
        
        # Add disclaimer if we filtered out content
        if len(supported_sentences) < len(verified_sentences):
            num_filtered = len(verified_sentences) - len(supported_sentences)
            filtered_answer += f"\n\n(Note: {num_filtered} sentence{'s' if num_filtered > 1 else ''} removed due to insufficient support from the document.)"
        
        return filtered_answer
    
    def _calculate_confidence_score(self, support_ratio: float, overall_support_score: float) -> float:
        """Calculate overall confidence score"""
        
        # Base confidence from support ratio
        ratio_confidence = support_ratio ** 0.8  # Slightly less harsh penalty for partial support
        
        # Quality bonus from high support scores
        quality_bonus = max(0, overall_support_score - 0.7) * 0.5
        
        # Combine with weights
        confidence = ratio_confidence * 0.7 + overall_support_score * 0.3 + quality_bonus
        
        return min(1.0, confidence)
    
    def _create_empty_result(self, answer: str) -> FactCheckResult:
        """Create result for empty/invalid input"""
        return FactCheckResult(
            original_answer=answer,
            verified_sentences=[],
            filtered_answer="Unable to verify answer due to insufficient input.",
            overall_support_score=0.0,
            confidence_score=0.0,
            num_supported_sentences=0,
            num_total_sentences=0,
            support_ratio=0.0
        )
    
    def get_detailed_report(self, result: FactCheckResult) -> Dict[str, Any]:
        """Generate detailed fact checking report"""
        
        unsupported_sentences = [v for v in result.verified_sentences if not v.is_supported]
        
        report = {
            "summary": {
                "total_sentences": result.num_total_sentences,
                "supported_sentences": result.num_supported_sentences,
                "support_ratio": result.support_ratio,
                "overall_confidence": result.confidence_score,
                "avg_support_score": result.overall_support_score
            },
            "sentence_details": [
                {
                    "sentence": v.sentence,
                    "supported": v.is_supported,
                    "confidence": v.confidence,
                    "semantic_score": v.semantic_score,
                    "cross_encoder_score": v.cross_encoder_score,
                    "supporting_chunks": len(v.supporting_chunks)
                }
                for v in result.verified_sentences
            ],
            "quality_metrics": {
                "high_confidence_sentences": len([v for v in result.verified_sentences if v.confidence >= 0.8]),
                "low_confidence_sentences": len([v for v in result.verified_sentences if v.confidence < 0.5]),
                "avg_semantic_score": np.mean([v.semantic_score for v in result.verified_sentences]) if result.verified_sentences else 0.0,
                "avg_cross_encoder_score": np.mean([v.cross_encoder_score for v in result.verified_sentences if v.cross_encoder_score > 0]) if any(v.cross_encoder_score > 0 for v in result.verified_sentences) else 0.0
            },
            "filtering_stats": {
                "original_length_chars": len(result.original_answer),
                "filtered_length_chars": len(result.filtered_answer),
                "compression_ratio": len(result.filtered_answer) / len(result.original_answer) if result.original_answer else 0,
                "sentences_removed": len(unsupported_sentences),
                "content_retained": result.support_ratio
            }
        }
        
        return report
    
    def update_threshold(self, new_threshold: float):
        """Update support threshold for dynamic tuning"""
        old_threshold = self.support_threshold
        self.support_threshold = max(0.1, min(0.9, new_threshold))
        logger.info(f"Updated support threshold: {old_threshold} -> {self.support_threshold}")


# Global instance
_fact_checker = None

def get_enhanced_fact_checker() -> EnhancedFactChecker:
    """Get global enhanced fact checker instance"""
    global _fact_checker
    if _fact_checker is None:
        _fact_checker = EnhancedFactChecker()
    return _fact_checker