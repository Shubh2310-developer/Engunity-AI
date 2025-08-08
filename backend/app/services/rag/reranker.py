"""
Document Reranker for RAG Pipeline
==================================

Reranks retrieved documents using cross-encoder models for better relevance.
Implements multiple reranking strategies including:
- Cross-encoder based reranking
- LLM-based reranking 
- Hybrid scoring approaches

Author: Engunity AI Team
"""

import logging
import time
import numpy as np
from typing import List, Dict, Any, Optional, Union, Tuple
from dataclasses import dataclass
from enum import Enum

try:
    from sentence_transformers import CrossEncoder
    CROSS_ENCODER_AVAILABLE = True
except ImportError:
    CROSS_ENCODER_AVAILABLE = False

try:
    from .bge_retriever import RetrievalResult
    from .phi2_generator import Phi2Generator, RAGContext
    BGE_AVAILABLE = True
except ImportError:
    BGE_AVAILABLE = False

logger = logging.getLogger(__name__)

class RerankingMethod(str, Enum):
    """Available reranking methods."""
    CROSS_ENCODER = "cross_encoder"
    LLM_BASED = "llm_based"  
    HYBRID = "hybrid"
    NONE = "none"

@dataclass
class RerankedResult:
    """Result after reranking."""
    document_id: str
    content: str
    original_score: float
    rerank_score: float
    final_score: float
    metadata: Dict[str, Any]
    chunk_index: int
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'document_id': self.document_id,
            'content': self.content,
            'original_score': float(self.original_score),
            'rerank_score': float(self.rerank_score),
            'final_score': float(self.final_score),
            'metadata': self.metadata,
            'chunk_index': self.chunk_index
        }

class DocumentReranker:
    """Reranks retrieved documents for improved relevance."""
    
    def __init__(
        self,
        reranker_model: str = "cross-encoder/ms-marco-MiniLM-L-6-v2",
        llm_model: Optional[Phi2Generator] = None,
        method: RerankingMethod = RerankingMethod.CROSS_ENCODER,
        rerank_top_k: int = 3,
        enable_reranking: bool = True
    ):
        """
        Initialize document reranker.
        
        Args:
            reranker_model: Cross-encoder model name for reranking
            llm_model: Optional LLM for LLM-based reranking
            method: Reranking method to use
            rerank_top_k: Number of top results to rerank
            enable_reranking: Whether reranking is enabled
        """
        self.method = method
        self.llm_model = llm_model
        self.rerank_top_k = rerank_top_k
        self.enable_reranking = enable_reranking
        
        # Initialize cross-encoder if available and needed
        self.cross_encoder = None
        if (method in [RerankingMethod.CROSS_ENCODER, RerankingMethod.HYBRID] 
            and CROSS_ENCODER_AVAILABLE and enable_reranking):
            try:
                self.cross_encoder = CrossEncoder(reranker_model)
                logger.info(f"Cross-encoder loaded: {reranker_model}")
            except Exception as e:
                logger.error(f"Failed to load cross-encoder {reranker_model}: {e}")
                self.cross_encoder = None
                if method == RerankingMethod.CROSS_ENCODER:
                    self.method = RerankingMethod.NONE
        
        logger.info(f"DocumentReranker initialized (method: {self.method.value}, enabled: {enable_reranking})")
    
    def rerank_results(
        self,
        query: str,
        retrieval_results: List[RetrievalResult],
        top_k: Optional[int] = None
    ) -> List[RerankedResult]:
        """
        Rerank retrieval results for better relevance.
        
        Args:
            query: User query
            retrieval_results: List of retrieval results to rerank
            top_k: Number of results to return (default: original count)
            
        Returns:
            List of reranked results
        """
        if not self.enable_reranking or self.method == RerankingMethod.NONE:
            # Convert to RerankedResult format without reranking
            return [
                RerankedResult(
                    document_id=result.document_id,
                    content=result.content,
                    original_score=result.score,
                    rerank_score=result.score,
                    final_score=result.score,
                    metadata={**result.metadata, 'reranking_method': 'none'},
                    chunk_index=result.chunk_index
                )
                for result in retrieval_results
            ]
        
        if not retrieval_results:
            return []
        
        logger.info(f"Reranking {len(retrieval_results)} results using {self.method.value}")
        start_time = time.time()
        
        # Limit reranking to top results for efficiency
        results_to_rerank = retrieval_results[:self.rerank_top_k]
        remaining_results = retrieval_results[self.rerank_top_k:]
        
        # Perform reranking based on method
        if self.method == RerankingMethod.CROSS_ENCODER:
            reranked_results = self._rerank_cross_encoder(query, results_to_rerank)
        elif self.method == RerankingMethod.LLM_BASED:
            reranked_results = self._rerank_llm_based(query, results_to_rerank)
        elif self.method == RerankingMethod.HYBRID:
            reranked_results = self._rerank_hybrid(query, results_to_rerank)
        else:
            reranked_results = self._convert_to_reranked(results_to_rerank, method='none')
        
        # Add remaining results without reranking
        for result in remaining_results:
            reranked_results.append(RerankedResult(
                document_id=result.document_id,
                content=result.content,
                original_score=result.score,
                rerank_score=result.score,
                final_score=result.score,
                metadata={**result.metadata, 'reranking_method': 'not_reranked'},
                chunk_index=result.chunk_index
            ))
        
        # Sort by final score
        reranked_results.sort(key=lambda x: x.final_score, reverse=True)
        
        # Return top_k results if specified
        if top_k:
            reranked_results = reranked_results[:top_k]
        
        rerank_time = time.time() - start_time
        logger.info(f"Reranking completed in {rerank_time:.2f}s for {len(reranked_results)} results")
        
        return reranked_results
    
    def _rerank_cross_encoder(self, query: str, results: List[RetrievalResult]) -> List[RerankedResult]:
        """Rerank using cross-encoder model."""
        if not self.cross_encoder:
            logger.warning("Cross-encoder not available, skipping reranking")
            return self._convert_to_reranked(results, method='cross_encoder_unavailable')
        
        # Prepare query-document pairs
        query_doc_pairs = [(query, result.content) for result in results]
        
        try:
            # Get reranking scores
            rerank_scores = self.cross_encoder.predict(query_doc_pairs)
            
            # Convert to numpy array if needed
            if not isinstance(rerank_scores, np.ndarray):
                rerank_scores = np.array(rerank_scores)
            
            # Create reranked results
            reranked_results = []
            for result, rerank_score in zip(results, rerank_scores):
                # Combine original and rerank scores
                final_score = self._combine_scores(result.score, float(rerank_score))
                
                reranked_results.append(RerankedResult(
                    document_id=result.document_id,
                    content=result.content,
                    original_score=result.score,
                    rerank_score=float(rerank_score),
                    final_score=final_score,
                    metadata={**result.metadata, 'reranking_method': 'cross_encoder'},
                    chunk_index=result.chunk_index
                ))
            
            return reranked_results
            
        except Exception as e:
            logger.error(f"Cross-encoder reranking failed: {e}")
            return self._convert_to_reranked(results, method='cross_encoder_error')
    
    def _rerank_llm_based(self, query: str, results: List[RetrievalResult]) -> List[RerankedResult]:
        """Rerank using LLM-based scoring."""
        if not self.llm_model:
            logger.warning("LLM model not available for reranking")
            return self._convert_to_reranked(results, method='llm_unavailable')
        
        reranked_results = []
        
        for result in results:
            try:
                # Create relevance scoring prompt
                scoring_prompt = f"""Rate the relevance of the following document chunk to the given question on a scale of 0.0 to 1.0.

Question: {query}

Document Chunk:
{result.content[:500]}{'...' if len(result.content) > 500 else ''}

Consider:
- How directly the chunk answers the question
- Technical accuracy and completeness
- Relevance of the information provided

Relevance Score (0.0-1.0):"""
                
                # Generate relevance score
                context = RAGContext(
                    documents=[],
                    query=query,
                    context_text=result.content,
                    metadata={'scoring': True}
                )
                
                llm_result = self.llm_model.generate_response(
                    query=scoring_prompt,
                    context=context,
                    response_format="concise",
                    max_new_tokens=50,
                    temperature=0.1  # Low temperature for consistent scoring
                )
                
                # Parse relevance score from response
                rerank_score = self._parse_relevance_score(llm_result.text)
                
                # Combine scores
                final_score = self._combine_scores(result.score, rerank_score)
                
                reranked_results.append(RerankedResult(
                    document_id=result.document_id,
                    content=result.content,
                    original_score=result.score,
                    rerank_score=rerank_score,
                    final_score=final_score,
                    metadata={**result.metadata, 'reranking_method': 'llm_based'},
                    chunk_index=result.chunk_index
                ))
                
            except Exception as e:
                logger.error(f"LLM reranking failed for chunk: {e}")
                # Fallback to original score
                reranked_results.append(RerankedResult(
                    document_id=result.document_id,
                    content=result.content,
                    original_score=result.score,
                    rerank_score=result.score,
                    final_score=result.score,
                    metadata={**result.metadata, 'reranking_method': 'llm_error'},
                    chunk_index=result.chunk_index
                ))
        
        return reranked_results
    
    def _rerank_hybrid(self, query: str, results: List[RetrievalResult]) -> List[RerankedResult]:
        """Rerank using hybrid approach combining multiple methods."""
        # Get cross-encoder scores
        cross_encoder_results = self._rerank_cross_encoder(query, results)
        
        # Get LLM scores if available
        if self.llm_model:
            llm_results = self._rerank_llm_based(query, results)
        else:
            llm_results = cross_encoder_results
        
        # Combine scores from both methods
        hybrid_results = []
        for ce_result, llm_result in zip(cross_encoder_results, llm_results):
            # Weighted combination of scores
            hybrid_rerank_score = (
                ce_result.rerank_score * 0.7 +  # Cross-encoder weight
                llm_result.rerank_score * 0.3    # LLM weight
            )
            
            final_score = self._combine_scores(ce_result.original_score, hybrid_rerank_score)
            
            hybrid_results.append(RerankedResult(
                document_id=ce_result.document_id,
                content=ce_result.content,
                original_score=ce_result.original_score,
                rerank_score=hybrid_rerank_score,
                final_score=final_score,
                metadata={
                    **ce_result.metadata,
                    'reranking_method': 'hybrid',
                    'cross_encoder_score': ce_result.rerank_score,
                    'llm_score': llm_result.rerank_score
                },
                chunk_index=ce_result.chunk_index
            ))
        
        return hybrid_results
    
    def _combine_scores(self, original_score: float, rerank_score: float) -> float:
        """Combine original retrieval score with reranking score."""
        # Weighted combination: give more weight to reranking
        combined = original_score * 0.3 + rerank_score * 0.7
        return float(combined)
    
    def _parse_relevance_score(self, text: str) -> float:
        """Parse relevance score from LLM response."""
        import re
        
        # Look for decimal numbers between 0 and 1
        matches = re.findall(r'(?:^|\s)([01]?\.\d+)(?:\s|$)', text)
        if matches:
            try:
                score = float(matches[0])
                return max(0.0, min(1.0, score))  # Clamp to [0, 1]
            except ValueError:
                pass
        
        # Look for integers 0 or 1
        if '1' in text and '0' not in text:
            return 0.9
        elif '0' in text and '1' not in text:
            return 0.1
        
        # Default fallback
        return 0.5
    
    def _convert_to_reranked(
        self, 
        results: List[RetrievalResult], 
        method: str = 'none'
    ) -> List[RerankedResult]:
        """Convert RetrievalResult to RerankedResult without reranking."""
        return [
            RerankedResult(
                document_id=result.document_id,
                content=result.content,
                original_score=result.score,
                rerank_score=result.score,
                final_score=result.score,
                metadata={**result.metadata, 'reranking_method': method},
                chunk_index=result.chunk_index
            )
            for result in results
        ]
    
    def get_reranking_stats(self, results: List[RerankedResult]) -> Dict[str, Any]:
        """Get statistics about the reranking process."""
        if not results:
            return {}
        
        original_scores = [r.original_score for r in results]
        rerank_scores = [r.rerank_score for r in results]
        final_scores = [r.final_score for r in results]
        
        methods_used = list(set(r.metadata.get('reranking_method', 'unknown') for r in results))
        
        return {
            'total_results': len(results),
            'methods_used': methods_used,
            'score_statistics': {
                'original': {
                    'mean': np.mean(original_scores),
                    'std': np.std(original_scores),
                    'min': np.min(original_scores),
                    'max': np.max(original_scores)
                },
                'rerank': {
                    'mean': np.mean(rerank_scores),
                    'std': np.std(rerank_scores),
                    'min': np.min(rerank_scores),
                    'max': np.max(rerank_scores)
                },
                'final': {
                    'mean': np.mean(final_scores),
                    'std': np.std(final_scores),
                    'min': np.min(final_scores),
                    'max': np.max(final_scores)
                }
            },
            'reranking_enabled': self.enable_reranking,
            'reranking_method': self.method.value
        }

# Factory function
def create_document_reranker(
    reranker_model: str = "cross-encoder/ms-marco-MiniLM-L-6-v2",
    llm_model: Optional[Phi2Generator] = None,
    method: RerankingMethod = RerankingMethod.CROSS_ENCODER,
    **kwargs
) -> DocumentReranker:
    """Create a document reranker with specified configuration."""
    return DocumentReranker(
        reranker_model=reranker_model,
        llm_model=llm_model,
        method=method,
        **kwargs
    )

# Export main classes
__all__ = [
    "DocumentReranker",
    "RerankedResult",
    "RerankingMethod", 
    "create_document_reranker"
]