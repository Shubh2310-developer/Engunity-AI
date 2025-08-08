"""
Enhanced BGE Reranker for Improved Retrieval Quality
===================================================

Implements BGE reranker to filter and rerank retrieved chunks:
- Uses BAAI/bge-reranker-base for accurate reranking
- Filters irrelevant chunks before generation
- Improves retrieval precision significantly
- Fast inference with FP16 optimization
"""

import logging
from typing import List, Dict, Any, Tuple, Optional
from dataclasses import dataclass
import numpy as np
import torch

try:
    from FlagEmbedding import FlagReranker
    RERANKER_AVAILABLE = True
except ImportError:
    RERANKER_AVAILABLE = False
    logging.warning("FlagEmbedding not available. Install with: pip install FlagEmbedding")

logger = logging.getLogger(__name__)

@dataclass
class RerankResult:
    """Result from reranking."""
    content: str
    original_score: float
    rerank_score: float
    final_score: float
    metadata: Dict[str, Any]
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'content': self.content,
            'original_score': float(self.original_score),
            'rerank_score': float(self.rerank_score),
            'final_score': float(self.final_score),
            'metadata': self.metadata
        }

class EnhancedReranker:
    """Enhanced reranker using BGE reranker model."""
    
    def __init__(
        self,
        model_name: str = "BAAI/bge-reranker-base",
        use_fp16: bool = True,
        max_length: int = 512,
        device: Optional[str] = None
    ):
        self.model_name = model_name
        self.use_fp16 = use_fp16
        self.max_length = max_length
        
        # Determine device
        if device is None:
            self.device = "cuda" if torch.cuda.is_available() else "cpu"
        else:
            self.device = device
        
        # Initialize reranker
        self.reranker = None
        if RERANKER_AVAILABLE:
            try:
                self.reranker = FlagReranker(
                    model_name, 
                    use_fp16=use_fp16,
                    device=self.device
                )
                logger.info(f"BGE Reranker initialized: {model_name} on {self.device}")
            except Exception as e:
                logger.error(f"Failed to initialize BGE reranker: {e}")
                self.reranker = None
        
        # Fallback scoring mechanism
        self.fallback_enabled = self.reranker is None
        if self.fallback_enabled:
            logger.warning("Using fallback semantic similarity for reranking")
    
    def _fallback_score(self, query: str, passage: str) -> float:
        """Fallback scoring using simple semantic overlap."""
        query_words = set(query.lower().split())
        passage_words = set(passage.lower().split())
        
        if not query_words or not passage_words:
            return 0.0
        
        # Jaccard similarity
        intersection = len(query_words & passage_words)
        union = len(query_words | passage_words)
        jaccard = intersection / union if union > 0 else 0.0
        
        # Term frequency bonus
        query_in_passage = sum(1 for word in query_words if word in passage.lower())
        tf_bonus = query_in_passage / len(query_words)
        
        # Length penalty for very short passages
        length_penalty = min(1.0, len(passage) / 100)
        
        return (jaccard * 0.6 + tf_bonus * 0.3 + length_penalty * 0.1)
    
    def rerank_passages(
        self,
        query: str,
        passages: List[Dict[str, Any]],
        top_k: Optional[int] = None,
        score_threshold: float = 0.1
    ) -> List[RerankResult]:
        """Rerank passages for a given query."""
        
        if not passages:
            return []
        
        rerank_results = []
        
        # Prepare passages for reranking
        passage_texts = []
        for passage in passages:
            if isinstance(passage, dict):
                content = passage.get('content', '')
            else:
                content = str(passage)
            passage_texts.append(content)
        
        # Perform reranking
        if self.reranker is not None:
            try:
                # Create query-passage pairs
                query_passage_pairs = [[query, passage] for passage in passage_texts]
                
                # Get rerank scores
                rerank_scores = self.reranker.compute_score(query_passage_pairs)
                
                # Ensure scores is a list
                if not isinstance(rerank_scores, list):
                    rerank_scores = [rerank_scores]
                
            except Exception as e:
                logger.error(f"Reranking failed: {e}")
                # Fall back to simple scoring
                rerank_scores = [self._fallback_score(query, passage) for passage in passage_texts]
        else:
            # Use fallback scoring
            rerank_scores = [self._fallback_score(query, passage) for passage in passage_texts]
        
        # Create results
        for i, (passage, rerank_score) in enumerate(zip(passages, rerank_scores)):
            # Extract original score
            if isinstance(passage, dict):
                original_score = passage.get('score', 0.0)
                content = passage.get('content', '')
                metadata = passage.get('metadata', {})
            else:
                original_score = 0.0
                content = str(passage)
                metadata = {}
            
            # Calculate final score (weighted combination)
            final_score = 0.3 * original_score + 0.7 * rerank_score
            
            result = RerankResult(
                content=content,
                original_score=original_score,
                rerank_score=float(rerank_score),
                final_score=final_score,
                metadata={
                    **metadata,
                    'rerank_method': 'bge' if self.reranker else 'fallback',
                    'original_rank': i
                }
            )
            rerank_results.append(result)
        
        # Sort by final score
        rerank_results.sort(key=lambda x: x.final_score, reverse=True)
        
        # Apply score threshold
        filtered_results = [
            result for result in rerank_results 
            if result.final_score >= score_threshold
        ]
        
        # Apply top_k limit
        if top_k is not None:
            filtered_results = filtered_results[:top_k]
        
        logger.info(f"Reranked {len(passages)} passages -> {len(filtered_results)} after filtering")
        return filtered_results
    
    def score_relevance(self, query: str, passage: str) -> float:
        """Score relevance of a single passage to query."""
        if self.reranker is not None:
            try:
                score = self.reranker.compute_score([[query, passage]])
                return float(score) if not isinstance(score, list) else float(score[0])
            except Exception as e:
                logger.error(f"Single passage reranking failed: {e}")
        
        return self._fallback_score(query, passage)
    
    def filter_irrelevant(
        self,
        query: str,
        passages: List[Dict[str, Any]],
        threshold: float = 0.3
    ) -> List[Dict[str, Any]]:
        """Filter out irrelevant passages."""
        relevant_passages = []
        
        for passage in passages:
            content = passage.get('content', '') if isinstance(passage, dict) else str(passage)
            relevance_score = self.score_relevance(query, content)
            
            if relevance_score >= threshold:
                if isinstance(passage, dict):
                    passage['relevance_score'] = relevance_score
                relevant_passages.append(passage)
        
        logger.info(f"Filtered {len(passages)} -> {len(relevant_passages)} relevant passages")
        return relevant_passages
    
    def get_best_passages(
        self,
        query: str,
        passages: List[Dict[str, Any]],
        top_k: int = 3,
        min_score: float = 0.2
    ) -> List[Dict[str, Any]]:
        """Get the best passages after reranking and filtering."""
        
        # First filter obviously irrelevant passages
        filtered = self.filter_irrelevant(query, passages, threshold=min_score)
        
        if not filtered:
            logger.warning("No relevant passages found after filtering")
            return []
        
        # Rerank the filtered passages
        reranked = self.rerank_passages(query, filtered, top_k=top_k)
        
        # Convert back to dict format
        best_passages = []
        for result in reranked:
            passage_dict = {
                'content': result.content,
                'score': result.final_score,
                'original_score': result.original_score,
                'rerank_score': result.rerank_score,
                'metadata': result.metadata
            }
            best_passages.append(passage_dict)
        
        return best_passages