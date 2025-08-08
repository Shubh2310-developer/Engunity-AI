#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Agentic RAG Orchestrator
========================

Main orchestrator for the agentic RAG system combining BGE-small retrieval,
Phi-2 generation with Test-Time Scaling, MongoDB chat history, and Supabase
document storage.

Features:
- Autonomous document processing and embedding
- Intelligent query routing and retrieval  
- TTS-enhanced generation for better reasoning
- Chat history integration for context-aware responses
- Incremental document updates
- Performance monitoring and optimization
- CS-specific enhancements

Architecture:
- Document Upload → Chunking → Embedding → FAISS Storage
- Query → CS Enhancement → Retrieval → TTS Generation → Response
- Chat History → Context Enhancement → Improved Responses

Author: Engunity AI Team
"""

import os
import json
import logging
import asyncio
from typing import Dict, List, Optional, Any, Union, Tuple
from dataclasses import dataclass, asdict
from pathlib import Path
from datetime import datetime, timedelta
import time

# Core RAG components
from .bge_retriever import BGERetriever, RetrievalResult, create_bge_retriever
from .phi2_generator import Phi2Generator, GenerationResult, RAGContext, create_phi2_generator
from .agentic_web_crawler import AgenticWebCrawler, WebResult, create_agentic_web_crawler
from .answer_merger import AnswerMerger, AnswerSource, MergeResult, create_answer_merger
from .document_chunker import DocumentChunker, DocumentChunk, ChunkingConfig, create_document_chunker
from .cs_query_processor import CSQueryProcessor, QueryAnalysis, QueryType

# External services
from ..mongodb_chat_service import MongoDBChatService, ChatMessage, ChatSession, get_chat_service
from ..supabase_service import get_supabase_service, DocumentContent

logger = logging.getLogger(__name__)

@dataclass
class AgenticRAGConfig:
    """Configuration for the agentic RAG system."""
    # Model configurations
    bge_model: str = "BAAI/bge-small-en-v1.5"
    phi2_model: str = "microsoft/phi-2"
    device: str = "auto"
    max_memory_gb: int = 6
    
    # Agentic RAG specific settings
    enable_web_search: bool = True
    confidence_threshold: float = 0.75
    gemini_api_key: Optional[str] = None
    use_best_of_n: bool = True
    best_of_n_count: int = 5
    
    # Retrieval settings
    faiss_index_path: str = "./data/faiss_index"
    max_retrieval_chunks: int = 10
    retrieval_score_threshold: float = 0.3
    
    # Generation settings
    max_generation_tokens: int = 512
    generation_temperature: float = 0.7
    use_test_time_scaling: bool = True
    
    # Chunking settings
    max_chunk_size: int = 512
    chunk_overlap: int = 50
    
    # Chat settings
    max_chat_history: int = 10
    enable_chat_context: bool = True
    
    # Performance settings
    enable_caching: bool = True
    cache_ttl_hours: int = 24
    enable_incremental_updates: bool = True
    
    # CS-specific settings
    enable_cs_enhancements: bool = True
    cs_term_expansion: bool = True
    acronym_resolution: bool = True

@dataclass
class AgenticRAGRequest:
    """Request structure for agentic RAG queries."""
    query: str
    document_id: Optional[str] = None
    user_id: Optional[str] = None
    session_id: Optional[str] = None
    include_chat_history: bool = True
    use_tts: bool = True
    max_sources: int = 5
    response_format: str = "detailed"
    metadata: Optional[Dict[str, Any]] = None

@dataclass
class AgenticRAGResponse:
    """Response structure from agentic RAG system."""
    query: str
    answer: str
    confidence: float
    sources: List[Dict[str, Any]]
    
    # Processing metadata
    processing_time: float
    retrieval_time: float
    generation_time: float
    
    # Quality metrics
    relevance_score: float
    coherence_score: float
    
    # TTS metadata
    tts_method: Optional[str] = None
    reasoning_steps: Optional[List[str]] = None
    consistency_score: Optional[float] = None
    
    # Session metadata
    session_id: Optional[str] = None
    message_id: str = ""
    
    # System metadata
    model_info: Dict[str, Any] = None
    cs_enhanced: bool = False
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API responses."""
        return asdict(self)

class AgenticRAGOrchestrator:
    """Main orchestrator for the agentic RAG system."""
    
    def __init__(self, config: Optional[AgenticRAGConfig] = None):
        """
        Initialize the agentic RAG orchestrator.
        
        Args:
            config: Configuration for the RAG system
        """
        self.config = config or AgenticRAGConfig()
        
        # Core components
        self.retriever: Optional[BGERetriever] = None
        self.generator: Optional[Phi2Generator] = None
        self.web_crawler: Optional[AgenticWebCrawler] = None
        self.answer_merger: Optional[AnswerMerger] = None
        self.chunker: Optional[DocumentChunker] = None
        self.query_processor: Optional[CSQueryProcessor] = None
        
        # External services
        self.chat_service: Optional[MongoDBChatService] = None
        self.supabase_service = None
        
        # Performance tracking
        self.stats = {
            'total_queries': 0,
            'successful_queries': 0,
            'failed_queries': 0,
            'avg_processing_time': 0.0,
            'avg_retrieval_time': 0.0,
            'avg_generation_time': 0.0,
            'documents_processed': 0,
            'cache_hits': 0
        }
        
        # Response cache
        self.response_cache: Dict[str, Tuple[AgenticRAGResponse, datetime]] = {}
        
        logger.info("Agentic RAG Orchestrator initialized")
    
    async def initialize(self):
        """Initialize all components asynchronously."""
        try:
            logger.info("Initializing agentic RAG system components...")
            
            # Initialize chunker first (needed for retriever)
            chunking_config = ChunkingConfig(
                max_chunk_size=self.config.max_chunk_size,
                chunk_overlap=self.config.chunk_overlap,
                enable_deduplication=True,
                detect_programming_language=True
            )
            self.chunker = create_document_chunker(config=chunking_config)
            
            # Initialize BGE retriever
            self.retriever = create_bge_retriever(
                model_name=self.config.bge_model,
                index_path=self.config.faiss_index_path,
                device=self.config.device,
                max_chunk_size=self.config.max_chunk_size,
                chunk_overlap=self.config.chunk_overlap
            )
            
            # Initialize Phi-2 generator (with 4-bit quantization)
            self.generator = create_phi2_generator(
                model_name=self.config.phi2_model,
                device=self.config.device,
                use_quantization=True,
                temperature=self.config.generation_temperature
            )
            
            # Initialize Agentic Web Crawler
            if self.config.enable_web_search:
                self.web_crawler = create_agentic_web_crawler(
                    gemini_api_key=self.config.gemini_api_key,
                    max_results=5,
                    timeout=30
                )
            
            # Initialize Answer Merger
            self.answer_merger = create_answer_merger(
                embedding_model=self.config.bge_model,
                similarity_threshold=0.75,
                confidence_weight=0.6,
                similarity_weight=0.4
            )
            
            # Initialize CS query processor
            if self.config.enable_cs_enhancements:
                self.query_processor = CSQueryProcessor()
            
            # Initialize external services
            self.chat_service = await get_chat_service()
            self.supabase_service = get_supabase_service()
            
            logger.info("All components initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize agentic RAG system: {e}")
            raise
    
    async def process_document(
        self,
        document_id: str,
        force_reprocess: bool = False
    ) -> Dict[str, Any]:
        """
        Process a document for RAG (chunking + embedding + indexing).
        
        Args:
            document_id: Document identifier
            force_reprocess: Force reprocessing even if already processed
            
        Returns:
            Processing result metadata
        """
        start_time = time.time()
        
        try:
            logger.info(f"Processing document {document_id}")
            
            # Get document from Supabase
            document = await self.supabase_service.get_document(document_id)
            if not document:
                raise ValueError(f"Document {document_id} not found")
            
            # Get document content
            document_text = await self.supabase_service.get_document_content_text(document)
            if not document_text:
                raise ValueError(f"No content available for document {document_id}")
            
            # Check if already processed (unless forcing reprocess)
            if not force_reprocess and self.retriever.has_document(document_id):
                logger.info(f"Document {document_id} already processed")
                return {
                    'success': True,
                    'document_id': document_id,
                    'status': 'already_processed',
                    'processing_time': time.time() - start_time
                }
            
            # Chunk document
            chunks, was_updated = self.chunker.chunk_document(
                document_id=document_id,
                content=document_text,
                metadata={
                    'document_name': document.name,
                    'document_type': document.type,
                    'document_category': document.category
                },
                force_update=force_reprocess
            )
            
            if not was_updated and not force_reprocess:
                logger.info(f"Document {document_id} chunks unchanged")
                return {
                    'success': True,
                    'document_id': document_id,
                    'status': 'unchanged',
                    'processing_time': time.time() - start_time
                }
            
            # Remove existing document from index if reprocessing
            if force_reprocess:
                self.retriever.remove_document(document_id)
            
            # Add chunks to retriever (which handles embedding and indexing)
            for chunk in chunks:
                await self.retriever.add_chunk(chunk)
            
            # Update stats
            self.stats['documents_processed'] += 1
            
            processing_time = time.time() - start_time
            
            logger.info(f"Processed document {document_id}: {len(chunks)} chunks in {processing_time:.2f}s")
            
            return {
                'success': True,
                'document_id': document_id,
                'status': 'processed',
                'chunks_created': len(chunks),
                'processing_time': processing_time,
                'metadata': {
                    'chunk_types': {},  # Could analyze chunk types
                    'content_type': chunks[0].content_type.value if chunks else None,
                    'has_code': any(chunk.contains_code for chunk in chunks),
                    'programming_languages': list(set(
                        chunk.programming_language for chunk in chunks
                        if chunk.programming_language
                    ))
                }
            }
            
        except Exception as e:
            logger.error(f"Error processing document {document_id}: {e}")
            return {
                'success': False,
                'document_id': document_id,
                'error': str(e),
                'processing_time': time.time() - start_time
            }
    
    async def query(self, request: AgenticRAGRequest) -> AgenticRAGResponse:
        """
        Execute agentic RAG query with full pipeline.
        
        Args:
            request: RAG query request
            
        Returns:
            Enhanced RAG response
        """
        start_time = time.time()
        self.stats['total_queries'] += 1
        
        try:
            logger.info(f"Processing agentic RAG query: {request.query[:100]}...")
            
            # Check cache first
            if self.config.enable_caching:
                cached_response = self._get_cached_response(request)
                if cached_response:
                    self.stats['cache_hits'] += 1
                    logger.info("Returning cached response")
                    return cached_response
            
            # Stage 1: Query Enhancement
            enhanced_query = await self._enhance_query(request)
            
            # Stage 2: Retrieval
            retrieval_start = time.time()
            retrieved_chunks = await self._retrieve_documents(enhanced_query, request)
            retrieval_time = time.time() - retrieval_start
            
            # Stage 3: Chat History Integration
            chat_context = []
            if request.include_chat_history and request.user_id and request.document_id:
                chat_context = await self._get_chat_context(
                    request.user_id, request.document_id, request.session_id
                )
            
            # Stage 4: Context Building
            rag_context = self._build_rag_context(
                query=enhanced_query,
                retrieved_chunks=retrieved_chunks,
                chat_history=chat_context,
                request=request
            )
            
            # Stage 5: Local Generation (with Best-of-N if enabled)
            generation_start = time.time()
            
            if self.config.use_best_of_n:
                generation_result = self.generator.generate_best_of_n(
                    query=enhanced_query,
                    context=rag_context,
                    n=self.config.best_of_n_count,
                    response_format=request.response_format,
                    max_new_tokens=self.config.max_generation_tokens,
                    temperature=self.config.generation_temperature
                )
                local_answer_text = generation_result['best_response']
                local_confidence = generation_result['confidence']
                generation_metadata = generation_result.get('metadata', {})
            else:
                gen_result = self.generator.generate_response(
                    query=enhanced_query,
                    context=rag_context,
                    response_format=request.response_format,
                    max_new_tokens=self.config.max_generation_tokens,
                    temperature=self.config.generation_temperature
                )
                local_answer_text = gen_result.text
                local_confidence = gen_result.confidence
                generation_metadata = gen_result.metadata
            
            generation_time = time.time() - generation_start
            
            # Stage 6: Web Search Decision and Execution
            web_answers = []
            web_search_performed = False
            
            if (self.config.enable_web_search and 
                self.web_crawler and 
                local_confidence < self.config.confidence_threshold):
                
                logger.info(f"Local confidence {local_confidence:.3f} < threshold {self.config.confidence_threshold:.3f}, triggering web search")
                web_search_performed = True
                
                try:
                    # Extract keywords for better search
                    context_keywords = []
                    if retrieved_chunks:
                        combined_text = ' '.join([chunk.content for chunk in retrieved_chunks])
                        context_keywords = self.web_crawler.extract_keywords(combined_text)
                    
                    # Perform web crawling
                    web_results = await self.web_crawler.crawl(
                        original_query=enhanced_query,
                        context_keywords=context_keywords,
                        confidence_threshold=self.config.confidence_threshold,
                        local_confidence=local_confidence
                    )
                    
                    # Convert web results to answer sources
                    for web_result in web_results:
                        web_answer = AnswerSource(
                            content=web_result.summary or web_result.content[:500],
                            confidence=web_result.relevance_score,
                            source_type='web',
                            metadata=web_result.metadata
                        )
                        web_answers.append(web_answer)
                        
                except Exception as e:
                    logger.error(f"Web search failed: {e}")
            
            # Stage 7: Answer Merging
            local_answer = AnswerSource(
                content=local_answer_text,
                confidence=local_confidence,
                source_type='local',
                metadata={
                    'retrieval_results': len(retrieved_chunks),
                    'generation_method': 'best_of_n' if self.config.use_best_of_n else 'single',
                    **generation_metadata
                }
            )
            
            merge_result = self.answer_merger.merge_answers(
                local_answer=local_answer,
                web_answers=web_answers,
                query=enhanced_query,
                context=request.metadata
            )
            
            # Create final generation result from merge
            generation_result = type('TTSGenerationResult', (), {
                'text': merge_result.final_answer,
                'confidence': merge_result.confidence,
                'metadata': {
                    'merge_strategy': merge_result.merge_strategy,
                    'source_breakdown': merge_result.source_breakdown,
                    'coherence_score': merge_result.coherence_score,
                    'web_search_performed': web_search_performed,
                    **generation_metadata
                },
                'tts_method': 'agentic_rag',
                'reasoning_steps': [],
                'consistency_score': merge_result.coherence_score
            })()
            
            # Stage 8: Response Building
            response = self._build_response(
                request=request,
                enhanced_query=enhanced_query,
                generation_result=generation_result,
                retrieved_chunks=retrieved_chunks,
                chat_context=chat_context,
                retrieval_time=retrieval_time,
                generation_time=generation_time,
                total_time=time.time() - start_time
            )
            
            # Stage 9: Save to Chat History
            if request.user_id and request.document_id and self.chat_service:
                await self._save_to_chat_history(request, response)
            
            # Update stats
            self.stats['successful_queries'] += 1
            self._update_performance_stats(retrieval_time, generation_time, response.processing_time)
            
            # Cache response
            if self.config.enable_caching:
                self._cache_response(request, response)
            
            logger.info(f"Agentic RAG query completed in {response.processing_time:.2f}s")
            return response
            
        except Exception as e:
            logger.error(f"Error in agentic RAG query: {e}")
            self.stats['failed_queries'] += 1
            
            # Return error response
            return AgenticRAGResponse(
                query=request.query,
                answer=f"I apologize, but I encountered an error processing your query: {str(e)}",
                confidence=0.0,
                sources=[],
                processing_time=time.time() - start_time,
                retrieval_time=0.0,
                generation_time=0.0,
                relevance_score=0.0,
                coherence_score=0.0,
                session_id=request.session_id,
                message_id=f"error_{int(time.time())}",
                model_info={'error': str(e)},
                cs_enhanced=False
            )
    
    async def _enhance_query(self, request: AgenticRAGRequest) -> str:
        """Enhance query with CS-specific improvements."""
        if not self.config.enable_cs_enhancements or not self.query_processor:
            return request.query
        
        try:
            # Analyze query
            analysis = await self.query_processor.analyze_query(request.query)
            
            # Apply enhancements based on analysis
            enhanced_query = request.query
            
            # Expand technical terms and acronyms
            if self.config.cs_term_expansion:
                enhanced_query = await self.query_processor.expand_technical_terms(enhanced_query)
            
            if self.config.acronym_resolution:
                enhanced_query = await self.query_processor.resolve_acronyms(enhanced_query)
            
            # Add context keywords based on query type
            if analysis.query_type == QueryType.CODE:
                enhanced_query += " programming implementation code"
            elif analysis.query_type == QueryType.COMPARISON:
                enhanced_query += " comparison differences similarities"
            
            logger.debug(f"Enhanced query: {request.query} -> {enhanced_query}")
            return enhanced_query
            
        except Exception as e:
            logger.warning(f"Query enhancement failed: {e}")
            return request.query
    
    async def _retrieve_documents(
        self,
        query: str,
        request: AgenticRAGRequest
    ) -> List[RetrievalResult]:
        """Retrieve relevant document chunks."""
        try:
            # Set document filter if specific document requested
            document_filter = None
            if request.document_id:
                document_filter = {'document_id': request.document_id}
            
            # Retrieve chunks
            results = self.retriever.retrieve(
                query=query,
                top_k=self.config.max_retrieval_chunks,
                score_threshold=self.config.retrieval_score_threshold,
                filter_metadata=document_filter
            )
            
            logger.info(f"Retrieved {len(results)} chunks for query")
            return results
            
        except Exception as e:
            logger.error(f"Document retrieval failed: {e}")
            return []
    
    async def _get_chat_context(
        self,
        user_id: str,
        document_id: str,
        session_id: Optional[str]
    ) -> List[Dict[str, str]]:
        """Get chat history for context enhancement."""
        try:
            messages = await self.chat_service.get_recent_context(
                user_id=user_id,
                document_id=document_id,
                session_id=session_id,
                max_messages=self.config.max_chat_history
            )
            
            # Convert to simple format for context
            context = []
            for msg in messages[-self.config.max_chat_history:]:  # Recent messages
                context.append({
                    'role': msg.role,
                    'content': msg.content[:200]  # Limit length
                })
            
            return context
            
        except Exception as e:
            logger.warning(f"Failed to get chat context: {e}")
            return []
    
    def _build_rag_context(
        self,
        query: str,
        retrieved_chunks: List[RetrievalResult],
        chat_history: List[Dict[str, str]],
        request: AgenticRAGRequest
    ) -> RAGContext:
        """Build comprehensive RAG context."""
        # Convert retrieval results to context format without source references
        documents = []
        context_parts = []
        
        for chunk in retrieved_chunks:
            # Just add the content without source headers
            if chunk.content and chunk.content.strip():
                context_parts.append(chunk.content.strip())
            
            documents.append({
                'document_id': chunk.document_id,
                'content': chunk.content,
                'score': chunk.score,
                'metadata': chunk.metadata,
                'chunk_index': chunk.chunk_index
            })
        
        context_text = "\n\n".join(context_parts)
        
        # Detect query complexity for TTS
        complexity_score = self._calculate_query_complexity(query, context_text)
        query_type = self._detect_query_type(query)
        
        return RAGContext(
            documents=documents,
            query=query,
            context_text=context_text,
            metadata={
                'document_count': len(documents),
                'total_context_length': len(context_text),
                'avg_retrieval_score': sum(chunk.score for chunk in retrieved_chunks) / max(len(retrieved_chunks), 1),
                'request_metadata': request.metadata or {}
            },
            chat_history=chat_history,
            query_type=query_type,
            complexity_score=complexity_score
        )
    
    def _build_response(
        self,
        request: AgenticRAGRequest,
        enhanced_query: str,
        generation_result: TTSGenerationResult,
        retrieved_chunks: List[RetrievalResult],
        chat_context: List[Dict[str, str]],
        retrieval_time: float,
        generation_time: float,
        total_time: float
    ) -> AgenticRAGResponse:
        """Build final agentic RAG response."""
        
        # Prepare sources
        sources = []
        for chunk in retrieved_chunks[:request.max_sources]:
            source_info = {
                'document_id': chunk.document_id,
                'content_preview': chunk.content[:200] + "..." if len(chunk.content) > 200 else chunk.content,
                'relevance_score': float(chunk.score),
                'chunk_index': chunk.chunk_index,
                'metadata': chunk.metadata
            }
            sources.append(source_info)
        
        # Add web sources if available (check if web_answers exists in the calling scope)
        if hasattr(generation_result, 'metadata') and generation_result.metadata.get('web_search_performed'):
            # Note: In a real implementation, you'd pass web_answers to this method
            # For now, we'll add a placeholder in metadata
            if 'web_sources_count' not in generation_result.metadata:
                generation_result.metadata['web_sources_available'] = True
        
        # Calculate quality scores
        relevance_score = self._calculate_relevance_score(request.query, generation_result.text, retrieved_chunks)
        coherence_score = self._calculate_coherence_score(generation_result.text)
        
        # Build model info
        model_info = {
            'retriever': self.config.bge_model,
            'generator': self.config.phi2_model,
            'tts_enabled': request.use_tts,
            'cs_enhanced': self.config.enable_cs_enhancements
        }
        model_info.update(generation_result.metadata)
        
        return AgenticRAGResponse(
            query=request.query,
            answer=generation_result.text,
            confidence=generation_result.confidence,
            sources=sources,
            processing_time=total_time,
            retrieval_time=retrieval_time,
            generation_time=generation_time,
            relevance_score=relevance_score,
            coherence_score=coherence_score,
            tts_method=generation_result.tts_method,
            reasoning_steps=generation_result.reasoning_steps,
            consistency_score=generation_result.consistency_score,
            session_id=request.session_id,
            message_id=f"msg_{int(time.time())}_{request.user_id or 'anon'}",
            model_info=model_info,
            cs_enhanced=self.config.enable_cs_enhancements
        )
    
    async def _save_to_chat_history(
        self,
        request: AgenticRAGRequest,
        response: AgenticRAGResponse
    ):
        """Save interaction to chat history."""
        try:
            if not self.chat_service:
                return
            
            # Get or create session
            session = await self.chat_service.get_or_create_session(
                user_id=request.user_id,
                document_id=request.document_id,
                document_name=f"Document {request.document_id}",
                session_id=request.session_id
            )
            
            # Save user message
            await self.chat_service.save_message(
                user_id=request.user_id,
                document_id=request.document_id,
                session_id=session.session_id,
                role='user',
                content=request.query
            )
            
            # Save assistant response
            await self.chat_service.save_message(
                user_id=request.user_id,
                document_id=request.document_id,
                session_id=session.session_id,
                role='assistant',
                content=response.answer,
                retrieved_chunks=[chunk.to_dict() for chunk in response.sources] if hasattr(response.sources[0], 'to_dict') else response.sources,
                model_response_metadata=response.model_info,
                confidence=response.confidence,
                sources=response.sources
            )
            
        except Exception as e:
            logger.warning(f"Failed to save chat history: {e}")
    
    def _calculate_query_complexity(self, query: str, context: str) -> float:
        """Calculate query complexity for TTS strategy selection."""
        complexity = 0.0
        
        # Length factors
        query_words = len(query.split())
        if query_words > 15:
            complexity += 0.3
        
        # Technical complexity
        technical_terms = ['algorithm', 'implementation', 'architecture', 'optimization']
        tech_count = sum(1 for term in technical_terms if term in query.lower())
        complexity += tech_count * 0.1
        
        # Multi-part questions
        if any(indicator in query for indicator in [' and ', ',', ';']):
            complexity += 0.2
        
        return min(complexity, 1.0)
    
    def _detect_query_type(self, query: str) -> str:
        """Detect query type for processing optimization."""
        query_lower = query.lower()
        
        if any(keyword in query_lower for keyword in ['code', 'implement', 'function', 'class']):
            return 'code'
        elif any(keyword in query_lower for keyword in ['vs', 'compare', 'difference']):
            return 'comparison'
        elif any(keyword in query_lower for keyword in ['what is', 'define', 'explain']):
            return 'definition'
        elif any(keyword in query_lower for keyword in ['how to', 'steps', 'process']):
            return 'howto'
        else:
            return 'general'
    
    def _calculate_relevance_score(self, query: str, answer: str, chunks: List[RetrievalResult]) -> float:
        """Calculate relevance score between query and answer."""
        # Simple keyword overlap
        query_words = set(query.lower().split())
        answer_words = set(answer.lower().split())
        
        overlap = len(query_words & answer_words)
        base_relevance = overlap / max(len(query_words), 1)
        
        # Boost if chunks were well-utilized
        if chunks:
            avg_chunk_score = sum(chunk.score for chunk in chunks) / len(chunks)
            base_relevance = (base_relevance + avg_chunk_score) / 2
        
        return min(base_relevance, 1.0)
    
    def _calculate_coherence_score(self, text: str) -> float:
        """Calculate coherence score for generated text."""
        # Simple heuristics
        sentences = [s.strip() for s in text.split('.') if s.strip()]
        
        if len(sentences) < 2:
            return 0.5
        
        coherence = 0.5
        
        # Sentence length consistency
        lengths = [len(s.split()) for s in sentences]
        if lengths:
            avg_length = sum(lengths) / len(lengths)
            if 10 <= avg_length <= 25:
                coherence += 0.2
        
        # Proper structure
        if text.strip() and text[0].isupper() and text.endswith(('.', '!', '?')):
            coherence += 0.1
        
        # No excessive repetition
        words = text.lower().split()
        if len(set(words)) / max(len(words), 1) > 0.6:
            coherence += 0.2
        
        return min(coherence, 1.0)
    
    def _get_cached_response(self, request: AgenticRAGRequest) -> Optional[AgenticRAGResponse]:
        """Get cached response if available."""
        cache_key = self._generate_cache_key(request)
        
        if cache_key in self.response_cache:
            response, timestamp = self.response_cache[cache_key]
            
            # Check TTL
            if datetime.now() - timestamp < timedelta(hours=self.config.cache_ttl_hours):
                return response
            else:
                # Remove expired entry
                del self.response_cache[cache_key]
        
        return None
    
    def _cache_response(self, request: AgenticRAGRequest, response: AgenticRAGResponse):
        """Cache response for future use."""
        cache_key = self._generate_cache_key(request)
        self.response_cache[cache_key] = (response, datetime.now())
        
        # Clean up old entries periodically
        if len(self.response_cache) > 1000:
            self._cleanup_cache()
    
    def _generate_cache_key(self, request: AgenticRAGRequest) -> str:
        """Generate cache key for request."""
        import hashlib
        
        key_data = {
            'query': request.query.lower().strip(),
            'document_id': request.document_id,
            'response_format': request.response_format,
            'use_tts': request.use_tts
        }
        
        key_string = json.dumps(key_data, sort_keys=True)
        return hashlib.md5(key_string.encode()).hexdigest()
    
    def _cleanup_cache(self):
        """Clean up expired cache entries."""
        current_time = datetime.now()
        expired_keys = []
        
        for key, (_, timestamp) in self.response_cache.items():
            if current_time - timestamp >= timedelta(hours=self.config.cache_ttl_hours):
                expired_keys.append(key)
        
        for key in expired_keys:
            del self.response_cache[key]
        
        logger.info(f"Cleaned up {len(expired_keys)} expired cache entries")
    
    def _update_performance_stats(self, retrieval_time: float, generation_time: float, total_time: float):
        """Update performance statistics."""
        n = self.stats['successful_queries']
        if n > 0:
            self.stats['avg_retrieval_time'] = ((n - 1) * self.stats['avg_retrieval_time'] + retrieval_time) / n
            self.stats['avg_generation_time'] = ((n - 1) * self.stats['avg_generation_time'] + generation_time) / n
            self.stats['avg_processing_time'] = ((n - 1) * self.stats['avg_processing_time'] + total_time) / n
    
    def get_system_stats(self) -> Dict[str, Any]:
        """Get comprehensive system statistics."""
        retriever_stats = self.retriever.get_stats() if self.retriever else {}
        generator_stats = self.generator.get_model_info() if self.generator else {}
        chunker_stats = self.chunker.get_chunking_stats() if self.chunker else {}
        
        return {
            'orchestrator_stats': self.stats,
            'retriever_stats': retriever_stats,
            'generator_stats': generator_stats,
            'chunker_stats': chunker_stats,
            'cache_size': len(self.response_cache),
            'configuration': asdict(self.config),
            'components_status': {
                'retriever': self.retriever is not None,
                'generator': self.generator is not None,
                'chunker': self.chunker is not None,
                'query_processor': self.query_processor is not None,
                'chat_service': self.chat_service is not None
            }
        }
    
    async def health_check(self) -> Dict[str, Any]:
        """Perform system health check."""
        health = {
            'status': 'healthy',
            'timestamp': datetime.now().isoformat(),
            'components': {}
        }
        
        try:
            # Check retriever
            if self.retriever:
                health['components']['retriever'] = 'healthy'
            else:
                health['components']['retriever'] = 'not_initialized'
                health['status'] = 'degraded'
            
            # Check generator
            if self.generator:
                health['components']['generator'] = 'healthy'
            else:
                health['components']['generator'] = 'not_initialized'
                health['status'] = 'degraded'
            
            # Check chat service
            if self.chat_service:
                # Could ping MongoDB here
                health['components']['chat_service'] = 'healthy'
            else:
                health['components']['chat_service'] = 'not_initialized'
                health['status'] = 'degraded'
            
        except Exception as e:
            health['status'] = 'unhealthy'
            health['error'] = str(e)
        
        return health

# Factory function
async def create_agentic_rag_orchestrator(config: Optional[AgenticRAGConfig] = None) -> AgenticRAGOrchestrator:
    """Create and initialize agentic RAG orchestrator."""
    orchestrator = AgenticRAGOrchestrator(config=config)
    await orchestrator.initialize()
    return orchestrator

# Global orchestrator instance
_orchestrator: Optional[AgenticRAGOrchestrator] = None

async def get_agentic_rag_orchestrator(config: Optional[AgenticRAGConfig] = None) -> AgenticRAGOrchestrator:
    """Get or create global agentic RAG orchestrator."""
    global _orchestrator
    if _orchestrator is None:
        _orchestrator = await create_agentic_rag_orchestrator(config=config)
    return _orchestrator