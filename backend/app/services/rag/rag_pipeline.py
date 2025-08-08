"""
Complete RAG Pipeline Implementation
===================================

High-performance RAG (Retrieval-Augmented Generation) pipeline combining:
- BGE-small-en-v1.5 for semantic document retrieval
- Phi-2 model for intelligent response generation
- Document processing and structured response formatting

Features:
- End-to-end RAG pipeline with configurable components
- Multi-format document support and intelligent chunking
- Context-aware response generation with source attribution
- Performance monitoring and quality assessment
- Structured output with confidence scoring

Author: Engunity AI Team
"""

import os
import json
import logging
import time
from typing import Dict, List, Optional, Any, Union, Tuple
from dataclasses import dataclass, asdict
from pathlib import Path
from datetime import datetime
import asyncio

# Local imports
from .bge_retriever import BGERetriever, RetrievalResult, create_bge_retriever
from .phi2_generator import Phi2Generator, GenerationResult, RAGContext, create_phi2_generator
from .document_processor import DocumentProcessor, ProcessedDocument, create_document_processor
from .best_of_n_generator import BestOfNGenerator, BestOfNResult, ScoringMethod, create_best_of_n_generator

logger = logging.getLogger(__name__)

@dataclass
class RAGRequest:
    """RAG pipeline request structure."""
    query: str
    document_filter: Optional[Dict[str, Any]] = None
    retrieval_config: Optional[Dict[str, Any]] = None
    generation_config: Optional[Dict[str, Any]] = None
    response_format: str = "detailed"
    include_sources: bool = True
    max_sources: int = 5

@dataclass  
class RAGResponse:
    """RAG pipeline response structure."""
    query: str
    answer: str
    confidence: float
    sources: List[Dict[str, Any]]
    metadata: Dict[str, Any]
    
    # Performance metrics
    retrieval_time: float
    generation_time: float
    total_time: float
    
    # Quality metrics
    relevance_score: float
    coherence_score: float
    
    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

class RAGPipeline:
    """Complete RAG pipeline orchestrator."""
    
    def __init__(
        self,
        # Component configurations
        bge_config: Optional[Dict[str, Any]] = None,
        phi2_config: Optional[Dict[str, Any]] = None,
        processor_config: Optional[Dict[str, Any]] = None,
        
        # Pipeline settings
        default_retrieval_k: int = 10,
        default_generation_tokens: int = 512,
        context_window_size: int = 4000,
        
        # Quality thresholds
        min_retrieval_score: float = 0.75,  # Increased for better document specificity
        min_confidence_threshold: float = 0.5,
        
        # Best-of-N settings
        enable_best_of_n: bool = True,
        best_of_n_candidates: int = 5,
        best_of_n_scoring: ScoringMethod = ScoringMethod.HYBRID,
        
        # Performance settings
        enable_caching: bool = True,
        cache_ttl: int = 3600
    ):
        """
        Initialize RAG pipeline.
        
        Args:
            bge_config: BGE retriever configuration
            phi2_config: Phi-2 generator configuration  
            processor_config: Document processor configuration
            default_retrieval_k: Default number of documents to retrieve
            default_generation_tokens: Default max tokens for generation
            context_window_size: Maximum context window size
            min_retrieval_score: Minimum retrieval score threshold
            min_confidence_threshold: Minimum confidence for responses
            enable_caching: Whether to enable response caching
            cache_ttl: Cache time-to-live in seconds
        """
        self.default_retrieval_k = default_retrieval_k
        self.default_generation_tokens = default_generation_tokens
        self.context_window_size = context_window_size
        self.min_retrieval_score = min_retrieval_score
        self.min_confidence_threshold = min_confidence_threshold
        self.enable_caching = enable_caching
        self.cache_ttl = cache_ttl
        
        # Best-of-N settings
        self.enable_best_of_n = enable_best_of_n
        self.best_of_n_candidates = best_of_n_candidates
        self.best_of_n_scoring = best_of_n_scoring
        
        # Initialize components
        logger.info("Initializing RAG pipeline components...")
        
        # Initialize BGE retriever
        bge_config = bge_config or {}
        self.retriever = create_bge_retriever(**bge_config)
        
        # Initialize Phi-2 generator
        phi2_config = phi2_config or {}
        self.generator = create_phi2_generator(**phi2_config)
        
        # Initialize Best-of-N generator if enabled
        if self.enable_best_of_n:
            logger.info(f"Enabling Best-of-N generation with {self.best_of_n_candidates} candidates")
            self.best_of_n_generator = create_best_of_n_generator(self.generator)
        else:
            self.best_of_n_generator = None
        
        # Initialize document processor
        processor_config = processor_config or {}
        self.processor = create_document_processor(
            bge_retriever=self.retriever,
            **processor_config
        )
        
        # Initialize cache
        self._response_cache = {} if enable_caching else None
        
        # Performance tracking
        self.stats = {
            'total_requests': 0,
            'successful_requests': 0,
            'failed_requests': 0,
            'avg_retrieval_time': 0.0,
            'avg_generation_time': 0.0,
            'avg_total_time': 0.0,
            'cache_hits': 0
        }
        
        logger.info("RAG Pipeline initialized successfully")
    
    def process_documents(
        self,
        document_paths: Union[str, Path, List[Union[str, Path]]],
        **kwargs
    ) -> List[ProcessedDocument]:
        """
        Process and add documents to the pipeline.
        
        Args:
            document_paths: Single path or list of paths to process
            **kwargs: Additional processing arguments
            
        Returns:
            List of processed documents
        """
        if isinstance(document_paths, (str, Path)):
            document_paths = [document_paths]
        
        processed_docs = []
        
        for doc_path in document_paths:
            doc_path = Path(doc_path)
            
            if doc_path.is_file():
                try:
                    processed_doc = self.processor.process_file(doc_path, **kwargs)
                    processed_docs.append(processed_doc)
                except Exception as e:
                    logger.error(f"Failed to process {doc_path}: {e}")
            elif doc_path.is_dir():
                try:
                    dir_docs = self.processor.process_directory(doc_path, **kwargs)
                    processed_docs.extend(dir_docs)
                except Exception as e:
                    logger.error(f"Failed to process directory {doc_path}: {e}")
            else:
                logger.warning(f"Path not found: {doc_path}")
        
        logger.info(f"Processed {len(processed_docs)} documents total")
        return processed_docs
    
    async def query(
        self,
        query: str,
        document_filter: Optional[Dict[str, Any]] = None,
        retrieval_k: Optional[int] = None,
        generation_tokens: Optional[int] = None,
        response_format: str = "detailed",
        include_sources: bool = True,
        document_name: str = "",
        **kwargs
    ) -> RAGResponse:
        """
        Execute RAG query pipeline.
        
        Args:
            query: User query string
            document_filter: Optional document filtering criteria
            retrieval_k: Number of documents to retrieve
            generation_tokens: Max tokens for generation
            response_format: Response format type
            include_sources: Whether to include source information
            **kwargs: Additional generation parameters
            
        Returns:
            RAG response with answer and metadata
        """
        start_time = time.time()
        self.stats['total_requests'] += 1
        
        try:
            logger.info(f"Processing RAG query: {query[:100]}...")
            
            # Check cache first
            if self.enable_caching:
                cache_key = self._get_cache_key(query, document_filter, retrieval_k, response_format)
                cached_response = self._get_cached_response(cache_key)
                if cached_response:
                    self.stats['cache_hits'] += 1
                    logger.info("Returning cached response")
                    return cached_response
            
            # Step 1: Retrieve relevant documents
            retrieval_start = time.time()
            retrieved_docs = self._retrieve_documents(
                query=query,
                top_k=retrieval_k or self.default_retrieval_k,
                document_filter=document_filter
            )
            retrieval_time = time.time() - retrieval_start
            
            # Step 2: Build context for generation
            context = self._build_context(query, retrieved_docs)
            
            # Step 3: Generate response
            generation_start = time.time()
            generation_result = await self._generate_response(
                query=query,
                context=context,
                response_format=response_format,
                max_new_tokens=generation_tokens or self.default_generation_tokens,
                document_name=document_name,
                **kwargs
            )
            generation_time = time.time() - generation_start
            
            # Step 4: Build final response
            total_time = time.time() - start_time
            
            response = self._build_response(
                query=query,
                generation_result=generation_result,
                retrieved_docs=retrieved_docs,
                context=context,
                retrieval_time=retrieval_time,
                generation_time=generation_time,
                total_time=total_time,
                include_sources=include_sources
            )
            
            # Update statistics
            self.stats['successful_requests'] += 1
            self._update_performance_stats(retrieval_time, generation_time, total_time)
            
            # Cache response
            if self.enable_caching:
                self._cache_response(cache_key, response)
            
            logger.info(f"RAG query completed in {total_time:.2f}s (confidence: {response.confidence:.2f})")
            return response
            
        except Exception as e:
            self.stats['failed_requests'] += 1
            logger.error(f"RAG query failed: {e}")
            
            # Return error response
            return RAGResponse(
                query=query,
                answer=f"I apologize, but I encountered an error processing your query: {str(e)}",
                confidence=0.0,
                sources=[],
                metadata={
                    'error': str(e),
                    'error_type': type(e).__name__
                },
                retrieval_time=0.0,
                generation_time=0.0,
                total_time=time.time() - start_time,
                relevance_score=0.0,
                coherence_score=0.0
            )
    
    def _retrieve_documents(
        self,
        query: str,
        top_k: int,
        document_filter: Optional[Dict[str, Any]] = None
    ) -> List[RetrievalResult]:
        """Retrieve relevant documents using BGE retriever."""
        logger.debug(f"Retrieving {top_k} documents for query")
        
        try:
            results = self.retriever.retrieve(
                query=query,
                top_k=top_k,
                score_threshold=self.min_retrieval_score,
                filter_metadata=document_filter
            )
            
            logger.info(f"Retrieved {len(results)} documents (threshold: {self.min_retrieval_score})")
            return results
            
        except Exception as e:
            logger.error(f"Document retrieval failed: {e}")
            return []
    
    def _build_context(self, query: str, retrieved_docs: List[RetrievalResult]) -> RAGContext:
        """Build enhanced context for generation from retrieved documents."""
        if not retrieved_docs:
            return RAGContext(
                documents=[],
                query=query,
                context_text="No relevant documents found.",
                metadata={'document_count': 0}
            )
        
        # Convert retrieval results to context format
        context_docs = []
        context_parts = []
        current_length = 0
        
        # Add document-aware context header
        context_parts.append(f"**Question**: {query}\n")
        context_parts.append("**Relevant Document Content**:\n")
        current_length += len(context_parts[-2]) + len(context_parts[-1])
        
        for i, doc in enumerate(retrieved_docs):
            # Enhanced document formatting with relevance emphasis
            doc_header = f"\n**Document Section {i+1}** (Relevance: {doc.score:.2f}):\n"
            doc_content = doc.content.strip()
            
            # Ensure the content is substantial and relevant
            if len(doc_content) < 20 or doc.score < self.min_retrieval_score:
                continue
            
            doc_context = doc_header + doc_content + "\n"
            
            # Check context window size
            if current_length + len(doc_context) > self.context_window_size:
                break
            
            context_parts.append(doc_context)
            current_length += len(doc_context)
            
            # Add to document list
            context_docs.append({
                'document_id': doc.document_id,
                'content': doc.content,
                'score': doc.score,
                'metadata': doc.metadata,
                'chunk_index': doc.chunk_index
            })
        
        # Add instruction footer to anchor generation in document content
        if context_docs:
            context_parts.append("\n**Instructions**: Please answer the question using ONLY the information provided in the document sections above. Be specific and cite relevant details from the documents. If the documents don't contain enough information to fully answer the question, clearly state what information is missing.\n")
        
        context_text = "".join(context_parts)
        
        return RAGContext(
            documents=context_docs,
            query=query,
            context_text=context_text,
            metadata={
                'document_count': len(context_docs),
                'total_context_length': len(context_text),
                'avg_retrieval_score': sum(doc['score'] for doc in context_docs) / len(context_docs) if context_docs else 0.0,
                'min_score_used': min(doc['score'] for doc in context_docs) if context_docs else 0.0,
                'max_score_used': max(doc['score'] for doc in context_docs) if context_docs else 0.0,
                'high_relevance_docs': len([doc for doc in context_docs if doc['score'] > 0.8])
            }
        )
    
    async def _generate_response(
        self,
        query: str,
        context: RAGContext,
        response_format: str,
        max_new_tokens: int,
        document_name: str = "",
        **kwargs
    ) -> GenerationResult:
        """Generate response using Best-of-N or standard Phi-2 generator."""
        logger.debug(f"Generating {response_format} response")
        
        try:
            # Use Best-of-N generation if enabled and we have good context
            if (self.enable_best_of_n and 
                self.best_of_n_generator and 
                context.documents and 
                len(context.context_text) > 100):
                
                logger.info(f"Using Best-of-N generation with {self.best_of_n_candidates} candidates")
                
                # Extract content chunks from context
                content_chunks = [doc['content'] for doc in context.documents[:5]]  # Top 5 chunks
                
                # Generate Best-of-N response
                best_of_n_result = await self.best_of_n_generator.generate_best_of_n(
                    question=query,
                    content_chunks=content_chunks,
                    document_name=document_name,
                    n=self.best_of_n_candidates,
                    scoring_method=self.best_of_n_scoring
                )
                
                # Convert to GenerationResult format
                return GenerationResult(
                    text=best_of_n_result.best_response.response,
                    confidence=best_of_n_result.best_response.confidence_score,
                    tokens_generated=best_of_n_result.best_response.token_count,
                    generation_time=best_of_n_result.total_generation_time,
                    metadata={
                        'generation_method': 'best_of_n',
                        'candidates_generated': len(best_of_n_result.all_candidates),
                        'quality_improvement': best_of_n_result.quality_improvement,
                        'selection_reasoning': best_of_n_result.selection_reasoning,
                        'scoring_method': best_of_n_result.scoring_method.value,
                        'best_of_n_metadata': best_of_n_result.best_response.quality_metrics
                    }
                )
            
            # Fallback to standard generation
            else:
                logger.debug("Using standard Phi-2 generation")
                result = self.generator.generate_response(
                    query=query,
                    context=context,
                    response_format=response_format,
                    max_new_tokens=max_new_tokens,
                    **kwargs
                )
                
                # Add generation method metadata
                result.metadata['generation_method'] = 'standard'
                return result
            
        except Exception as e:
            logger.error(f"Response generation failed: {e}")
            # Return fallback response
            return GenerationResult(
                text=f"I apologize, but I encountered an error generating a response: {str(e)}",
                confidence=0.0,
                tokens_generated=0,
                generation_time=0.0,
                metadata={'error': str(e), 'generation_method': 'error_fallback'}
            )
    
    def _build_response(
        self,
        query: str,
        generation_result: GenerationResult,
        retrieved_docs: List[RetrievalResult],
        context: RAGContext,
        retrieval_time: float,
        generation_time: float,
        total_time: float,
        include_sources: bool
    ) -> RAGResponse:
        """Build final RAG response."""
        
        # Prepare sources if requested
        sources = []
        if include_sources and retrieved_docs:
            for doc in retrieved_docs[:5]:  # Top 5 sources
                source_info = {
                    'document_id': doc.document_id,
                    'content_preview': doc.content[:200] + "..." if len(doc.content) > 200 else doc.content,
                    'relevance_score': float(doc.score),
                    'chunk_index': doc.chunk_index,
                    'metadata': doc.metadata
                }
                sources.append(source_info)
        
        # Calculate quality scores
        relevance_score = self._calculate_relevance_score(query, generation_result.text, context)
        coherence_score = self._calculate_coherence_score(generation_result.text)
        
        # Build metadata
        metadata = {
            'model_info': {
                'retriever': self.retriever.model_name,
                'generator': self.generator.model_name
            },
            'retrieval_stats': {
                'documents_found': len(retrieved_docs),
                'avg_score': sum(doc.score for doc in retrieved_docs) / len(retrieved_docs) if retrieved_docs else 0.0,
                'context_length': len(context.context_text)
            },
            'generation_stats': {
                'tokens_generated': generation_result.tokens_generated,
                'generation_config': generation_result.metadata
            },
            'pipeline_version': '1.0.0',
            'timestamp': datetime.now().isoformat()
        }
        
        return RAGResponse(
            query=query,
            answer=generation_result.text,
            confidence=generation_result.confidence,
            sources=sources,
            metadata=metadata,
            retrieval_time=retrieval_time,
            generation_time=generation_time,
            total_time=total_time,
            relevance_score=relevance_score,
            coherence_score=coherence_score
        )
    
    def _calculate_relevance_score(self, query: str, answer: str, context: RAGContext) -> float:
        """Calculate relevance score between query and answer."""
        # Simple keyword overlap-based relevance
        query_words = set(query.lower().split())
        answer_words = set(answer.lower().split())
        
        overlap = len(query_words & answer_words)
        relevance = overlap / len(query_words) if query_words else 0.0
        
        # Boost if answer references context
        if context.documents and any(doc['document_id'] in answer.lower() for doc in context.documents):
            relevance += 0.2
        
        return min(relevance, 1.0)
    
    def _calculate_coherence_score(self, text: str) -> float:
        """Calculate coherence score for generated text."""
        # Simple heuristic-based coherence scoring
        sentences = text.split('.')
        sentences = [s.strip() for s in sentences if s.strip()]
        
        if len(sentences) < 2:
            return 0.5
        
        coherence = 0.5  # Base score
        
        # Sentence length consistency
        lengths = [len(s.split()) for s in sentences]
        if lengths:
            avg_length = sum(lengths) / len(lengths)
            if 10 <= avg_length <= 25:  # Good sentence length
                coherence += 0.2
        
        # No excessive repetition
        words = text.lower().split()
        unique_words = len(set(words))
        if len(words) > 0 and unique_words / len(words) > 0.6:
            coherence += 0.1
        
        # Proper capitalization and punctuation
        if text[0].isupper() and text.endswith(('.', '!', '?')):
            coherence += 0.1
        
        return min(coherence, 1.0)
    
    def _get_cache_key(
        self,
        query: str,
        document_filter: Optional[Dict[str, Any]],
        retrieval_k: Optional[int],
        response_format: str
    ) -> str:
        """Generate cache key for request."""
        import hashlib
        
        cache_data = {
            'query': query.lower().strip(),
            'filter': document_filter,
            'k': retrieval_k,
            'format': response_format
        }
        
        cache_string = json.dumps(cache_data, sort_keys=True)
        return hashlib.md5(cache_string.encode()).hexdigest()
    
    def _get_cached_response(self, cache_key: str) -> Optional[RAGResponse]:
        """Get cached response if available and valid."""
        if not self._response_cache or cache_key not in self._response_cache:
            return None
        
        cached_item = self._response_cache[cache_key]
        
        # Check TTL
        if time.time() - cached_item['timestamp'] > self.cache_ttl:
            del self._response_cache[cache_key]
            return None
        
        return cached_item['response']
    
    def _cache_response(self, cache_key: str, response: RAGResponse):
        """Cache response."""
        if self._response_cache is not None:
            self._response_cache[cache_key] = {
                'response': response,
                'timestamp': time.time()
            }
    
    def _update_performance_stats(self, retrieval_time: float, generation_time: float, total_time: float):
        """Update performance statistics."""
        n = self.stats['successful_requests']
        
        # Running average calculation
        self.stats['avg_retrieval_time'] = ((n - 1) * self.stats['avg_retrieval_time'] + retrieval_time) / n
        self.stats['avg_generation_time'] = ((n - 1) * self.stats['avg_generation_time'] + generation_time) / n
        self.stats['avg_total_time'] = ((n - 1) * self.stats['avg_total_time'] + total_time) / n
    
    def get_pipeline_stats(self) -> Dict[str, Any]:
        """Get comprehensive pipeline statistics."""
        retriever_stats = self.retriever.get_stats()
        generator_stats = self.generator.get_model_info()
        processor_stats = self.processor.get_processing_stats()
        
        return {
            'pipeline_stats': self.stats,
            'retriever_stats': retriever_stats,
            'generator_stats': generator_stats,
            'processor_stats': processor_stats,
            'cache_size': len(self._response_cache) if self._response_cache else 0,
            'configuration': {
                'default_retrieval_k': self.default_retrieval_k,
                'context_window_size': self.context_window_size,
                'min_retrieval_score': self.min_retrieval_score,
                'min_confidence_threshold': self.min_confidence_threshold
            }
        }
    
    def clear_cache(self):
        """Clear response cache."""
        if self._response_cache:
            self._response_cache.clear()
            logger.info("Response cache cleared")
    
    def export_conversation(self, queries_responses: List[Tuple[str, RAGResponse]]) -> Dict[str, Any]:
        """Export conversation for analysis or storage."""
        conversation = {
            'exported_at': datetime.now().isoformat(),
            'total_queries': len(queries_responses),
            'pipeline_stats': self.get_pipeline_stats(),
            'conversation': []
        }
        
        for query, response in queries_responses:
            conversation['conversation'].append({
                'query': query,
                'response': response.to_dict()
            })
        
        return conversation

# Factory function
def create_rag_pipeline(**kwargs) -> RAGPipeline:
    """Create RAG pipeline with default configuration."""
    return RAGPipeline(**kwargs)

# Export main classes
__all__ = [
    "RAGPipeline",
    "RAGRequest",
    "RAGResponse",
    "create_rag_pipeline"
]