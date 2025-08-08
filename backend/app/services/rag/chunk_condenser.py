"""
Chunk Condensation Service for RAG Pipeline
===========================================

Condenses retrieved document chunks before generation to:
1. Reduce context length and improve focus
2. Remove irrelevant details while preserving key information
3. Force abstraction and synthesis rather than copying

Author: Engunity AI Team
"""

import logging
import time
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
from pathlib import Path

try:
    from .phi2_generator import Phi2Generator, RAGContext
    PHI2_AVAILABLE = True
except ImportError:
    PHI2_AVAILABLE = False

logger = logging.getLogger(__name__)

@dataclass
class CondensedChunk:
    """Condensed version of a document chunk."""
    original_content: str
    condensed_content: str
    compression_ratio: float
    relevance_score: float
    condensation_time: float
    metadata: Dict[str, Any]

class ChunkCondenser:
    """Condenses document chunks for more focused RAG generation."""
    
    def __init__(
        self,
        condenser_model: Optional[Phi2Generator] = None,
        max_chunk_length: int = 250,
        target_sentences: int = 3,
        condensation_enabled: bool = True
    ):
        """
        Initialize chunk condenser.
        
        Args:
            condenser_model: Phi-2 model for condensation (optional)
            max_chunk_length: Maximum length for condensed chunks
            target_sentences: Target number of sentences for condensed output
            condensation_enabled: Whether to enable condensation
        """
        self.condenser_model = condenser_model
        self.max_chunk_length = max_chunk_length
        self.target_sentences = target_sentences
        self.condensation_enabled = condensation_enabled
        
        # Default condensation prompt template
        self.condense_prompt_template = """Summarize the following chunk into {target_sentences} sentences that only retain the most relevant details to the user question.

Chunk:
{chunk}

Question:
{query}

Condensed Chunk:"""
        
        logger.info(f"ChunkCondenser initialized (enabled: {condensation_enabled})")
    
    def condense_chunks(
        self,
        chunks: List[str],
        query: str,
        max_chunks: int = 5
    ) -> List[CondensedChunk]:
        """
        Condense multiple chunks for better RAG performance.
        
        Args:
            chunks: List of document chunks to condense
            query: User query for relevance-based condensation
            max_chunks: Maximum number of chunks to process
            
        Returns:
            List of condensed chunks
        """
        if not self.condensation_enabled or not chunks:
            # Return original chunks wrapped in CondensedChunk format
            return [
                CondensedChunk(
                    original_content=chunk,
                    condensed_content=chunk,
                    compression_ratio=1.0,
                    relevance_score=0.5,
                    condensation_time=0.0,
                    metadata={'condensation_method': 'disabled'}
                )
                for chunk in chunks[:max_chunks]
            ]
        
        logger.info(f"Condensing {min(len(chunks), max_chunks)} chunks for query: {query[:50]}...")
        
        condensed_chunks = []
        total_start_time = time.time()
        
        for i, chunk in enumerate(chunks[:max_chunks]):
            start_time = time.time()
            
            try:
                # Skip chunks that are already short enough
                if len(chunk.split()) <= self.max_chunk_length:
                    condensed_chunk = CondensedChunk(
                        original_content=chunk,
                        condensed_content=chunk,
                        compression_ratio=1.0,
                        relevance_score=self._calculate_relevance(chunk, query),
                        condensation_time=0.0,
                        metadata={'condensation_method': 'skip_short'}
                    )
                else:
                    # Condense the chunk
                    if self.condenser_model and PHI2_AVAILABLE:
                        condensed_content = self._condense_with_llm(chunk, query)
                        method = 'llm_based'
                    else:
                        condensed_content = self._condense_extractive(chunk, query)
                        method = 'extractive'
                    
                    compression_ratio = len(chunk.split()) / max(len(condensed_content.split()), 1)
                    
                    condensed_chunk = CondensedChunk(
                        original_content=chunk,
                        condensed_content=condensed_content,
                        compression_ratio=compression_ratio,
                        relevance_score=self._calculate_relevance(condensed_content, query),
                        condensation_time=time.time() - start_time,
                        metadata={'condensation_method': method}
                    )
                
                condensed_chunks.append(condensed_chunk)
                
            except Exception as e:
                logger.error(f"Error condensing chunk {i+1}: {e}")
                # Fallback to original chunk
                condensed_chunks.append(CondensedChunk(
                    original_content=chunk,
                    condensed_content=chunk,
                    compression_ratio=1.0,
                    relevance_score=0.3,  # Lower score for error case
                    condensation_time=time.time() - start_time,
                    metadata={'condensation_method': 'error_fallback', 'error': str(e)}
                ))
        
        total_time = time.time() - total_start_time
        avg_compression = sum(c.compression_ratio for c in condensed_chunks) / len(condensed_chunks)
        
        logger.info(f"Condensation completed in {total_time:.2f}s. "
                   f"Average compression: {avg_compression:.1f}x")
        
        return condensed_chunks
    
    def _condense_with_llm(self, chunk: str, query: str) -> str:
        """Condense chunk using LLM."""
        if not self.condenser_model:
            return self._condense_extractive(chunk, query)
        
        # Build condensation prompt
        prompt = self.condense_prompt_template.format(
            target_sentences=self.target_sentences,
            chunk=chunk,
            query=query
        )
        
        try:
            # Create minimal context for generation
            context = RAGContext(
                documents=[],
                query=query,
                context_text=chunk,
                metadata={'condensation': True}
            )
            
            # Generate condensed version
            result = self.condenser_model.generate_response(
                query=prompt,
                context=context,
                response_format="concise",
                max_new_tokens=150,  # Limit output length
                temperature=0.3     # Lower temperature for consistency
            )
            
            condensed_text = result.text.strip()
            
            # Validate condensed output
            if len(condensed_text) < 20 or len(condensed_text.split()) > self.max_chunk_length:
                logger.warning("LLM condensation produced invalid output, falling back to extractive")
                return self._condense_extractive(chunk, query)
            
            return condensed_text
            
        except Exception as e:
            logger.error(f"LLM condensation failed: {e}")
            return self._condense_extractive(chunk, query)
    
    def _condense_extractive(self, chunk: str, query: str) -> str:
        """Condense chunk using extractive summarization."""
        import re
        
        # Split into sentences
        sentences = self._split_sentences(chunk)
        if len(sentences) <= self.target_sentences:
            return chunk
        
        # Score sentences based on relevance to query
        query_words = set(query.lower().split())
        scored_sentences = []
        
        for sentence in sentences:
            sentence_words = set(sentence.lower().split())
            
            # Calculate relevance score
            overlap = len(query_words & sentence_words)
            length_score = min(len(sentence.split()) / 20, 1.0)  # Prefer moderate length
            position_bonus = 0.1 if sentences.index(sentence) < 3 else 0  # Early sentence bonus
            
            score = overlap + length_score + position_bonus
            scored_sentences.append((sentence, score))
        
        # Select top sentences
        scored_sentences.sort(key=lambda x: x[1], reverse=True)
        selected_sentences = [s[0] for s in scored_sentences[:self.target_sentences]]
        
        # Maintain original order
        condensed_sentences = []
        for sentence in sentences:
            if sentence in selected_sentences:
                condensed_sentences.append(sentence)
        
        return ' '.join(condensed_sentences)
    
    def _split_sentences(self, text: str) -> List[str]:
        """Split text into sentences."""
        import re
        sentences = re.split(r'[.!?]+', text)
        sentences = [s.strip() for s in sentences if s.strip() and len(s.strip()) > 10]
        return sentences
    
    def _calculate_relevance(self, text: str, query: str) -> float:
        """Calculate relevance score between text and query."""
        text_words = set(text.lower().split())
        query_words = set(query.lower().split())
        
        if not query_words:
            return 0.5
        
        overlap = len(query_words & text_words)
        relevance = overlap / len(query_words)
        
        # Boost for technical terms
        technical_terms = {'algorithm', 'function', 'method', 'class', 'implementation', 'code', 'join', 'sql', 'database'}
        if any(term in text.lower() for term in technical_terms):
            relevance += 0.1
        
        return min(relevance, 1.0)
    
    def get_condensation_stats(self, condensed_chunks: List[CondensedChunk]) -> Dict[str, Any]:
        """Get statistics about the condensation process."""
        if not condensed_chunks:
            return {}
        
        total_original_length = sum(len(c.original_content.split()) for c in condensed_chunks)
        total_condensed_length = sum(len(c.condensed_content.split()) for c in condensed_chunks)
        
        compression_ratios = [c.compression_ratio for c in condensed_chunks]
        relevance_scores = [c.relevance_score for c in condensed_chunks]
        
        return {
            'total_chunks': len(condensed_chunks),
            'total_original_words': total_original_length,
            'total_condensed_words': total_condensed_length,
            'overall_compression_ratio': total_original_length / max(total_condensed_length, 1),
            'avg_compression_ratio': sum(compression_ratios) / len(compression_ratios),
            'avg_relevance_score': sum(relevance_scores) / len(relevance_scores),
            'methods_used': list(set(c.metadata.get('condensation_method', 'unknown') for c in condensed_chunks)),
            'total_condensation_time': sum(c.condensation_time for c in condensed_chunks)
        }

# Factory function
def create_chunk_condenser(
    condenser_model: Optional[Phi2Generator] = None,
    **kwargs
) -> ChunkCondenser:
    """Create a chunk condenser with optional Phi-2 model."""
    return ChunkCondenser(condenser_model=condenser_model, **kwargs)

# Export main classes
__all__ = [
    "ChunkCondenser",
    "CondensedChunk", 
    "create_chunk_condenser"
]