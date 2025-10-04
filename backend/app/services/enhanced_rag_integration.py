#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Enhanced RAG Integration Module
===============================

Integrates all RAG improvements:
1. Semantic chunking with overlap (RecursiveCharacterTextSplitter)
2. Cross-encoder reranking system
3. Strict grounding prompts
4. Embedding-based fact checking
5. Query-aware answer formatting
6. Multi-signal confidence scoring
7. Intelligent fallback logic

This module orchestrates all components to solve the "vague answers" problem.

Author: Engunity AI Team
"""

import logging
import asyncio
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass
from datetime import datetime

# Import our enhanced components
from .enhanced_fact_checker import get_enhanced_fact_checker, FactCheckResult
from .query_aware_formatter import get_query_aware_formatter, FormattedAnswer
from .advanced_confidence_system import get_advanced_confidence_system, ConfidenceResult
from .structured_prompt_templates import get_prompt_templates
from .response_validator import get_response_validator
from .professional_answer_synthesizer import synthesize_professional_answer

# Import existing components
from .supabase_service import get_supabase_service, DocumentContent
from .enhanced_document_processor import get_document_processor
from .advanced_retrieval_system import get_hybrid_retriever

logger = logging.getLogger(__name__)

@dataclass
class EnhancedRAGResponse:
    """Complete enhanced RAG response with all quality metrics"""
    success: bool
    answer: str
    confidence: float
    confidence_level: str
    fact_check_result: Optional[FactCheckResult]
    formatted_answer: FormattedAnswer
    confidence_result: ConfidenceResult
    source_type: str
    sources: List[Dict[str, Any]]
    processing_metrics: Dict[str, Any]
    quality_assurance: Dict[str, Any]

class EnhancedRAGIntegration:
    """Complete enhanced RAG system with all improvements integrated"""
    
    def __init__(self):
        # Initialize all components
        self.supabase = get_supabase_service()
        self.document_processor = get_document_processor()
        self.hybrid_retriever = get_hybrid_retriever()
        self.prompt_templates = get_prompt_templates()
        self.response_validator = get_response_validator()
        self.fact_checker = get_enhanced_fact_checker()
        self.formatter = get_query_aware_formatter()
        self.confidence_system = get_advanced_confidence_system()
        
        # Document index cache
        self.indexed_documents = set()
        
        logger.info("Enhanced RAG Integration initialized with all quality improvements")
    
    async def process_enhanced_query(self,
                                   document_id: str,
                                   question: str,
                                   confidence_threshold: float = 0.5,
                                   use_strict_grounding: bool = True,
                                   enable_fact_checking: bool = True,
                                   format_answer: bool = True) -> EnhancedRAGResponse:
        """Process query with all enhanced RAG techniques"""
        
        start_time = datetime.now()
        
        try:
            logger.info(f"Processing enhanced query: {question[:50]}...")
            
            # 1. Get document and ensure indexing
            document = await self.supabase.get_document(document_id)
            if not document:
                return self._create_error_response("Document not found", start_time)
            
            await self._ensure_document_indexed(document)
            
            # 2. Classify question type for appropriate processing
            question_type = self.prompt_templates.classify_question_type(question)
            logger.info(f"Question classified as: {question_type}")
            
            # 3. Enhanced hybrid retrieval with reranking
            retrieval_result = self.hybrid_retriever.hybrid_search(
                query=question,
                top_k=15,  # Retrieve more for better reranking
                dense_weight=0.7,
                sparse_weight=0.3,
                rerank_top_k=5
            )
            
            if not retrieval_result.chunks:
                return self._create_no_content_response(question, document, start_time)
            
            # 4. Prepare context and generate structured prompt
            context_chunks = [chunk.content for chunk in retrieval_result.chunks[:5]]
            combined_context = "\n\n".join(context_chunks)
            
            if use_strict_grounding:
                prompt_data = self.prompt_templates.get_prompt(question, combined_context, question_type)
                system_prompt = prompt_data["system_prompt"]
                user_prompt = prompt_data["user_prompt"]
            else:
                # Fallback to basic prompting
                system_prompt = "You are a helpful assistant. Answer based on the provided context."
                user_prompt = f"Context: {combined_context}\n\nQuestion: {question}\n\nAnswer:"
            
            # 5. Generate answer using professional synthesizer
            raw_answer = synthesize_professional_answer(
                question=question,
                content_chunks=context_chunks,
                document_name=document.name or "Document"
            )
            
            # 6. Validate response quality
            validation_result = self.response_validator.validate_response(
                response=raw_answer,
                question=question,
                context=combined_context,
                template_name=question_type
            )
            
            # 7. Fact-check the answer (if enabled)
            fact_check_result = None
            if enable_fact_checking:
                fact_check_result = self.fact_checker.fact_check_answer(
                    answer=raw_answer,
                    context_chunks=context_chunks,
                    question=question
                )
                
                # Use fact-checked answer if significantly different
                if (fact_check_result.support_ratio < 0.8 and 
                    len(fact_check_result.filtered_answer) >= len(raw_answer) * 0.5):
                    logger.info("Using fact-checked filtered answer")
                    raw_answer = fact_check_result.filtered_answer
            
            # 8. Calculate comprehensive confidence
            retrieval_scores = [chunk.final_score for chunk in retrieval_result.chunks[:5]]
            reranker_scores = [chunk.rerank_score for chunk in retrieval_result.chunks[:5] if chunk.rerank_score > 0]
            
            confidence_result = self.confidence_system.calculate_confidence(
                retrieval_scores=retrieval_scores,
                reranker_scores=reranker_scores if reranker_scores else None,
                context_chunks=context_chunks,
                generated_answer=raw_answer,
                original_query=question,
                fact_check_result=fact_check_result,
                validation_result=validation_result
            )
            
            # 9. Apply confidence-based fallback if needed
            final_answer = raw_answer
            if not confidence_result.should_use_answer:
                logger.info(f"Applying fallback strategy: {confidence_result.fallback_recommendation}")
                final_answer = self.confidence_system.apply_fallback_strategy(
                    confidence_result, raw_answer
                )
            
            # 10. Format answer appropriately (if enabled)
            formatted_answer = None
            if format_answer and confidence_result.should_use_answer:
                formatted_answer = self.formatter.format_answer(
                    raw_answer=final_answer,
                    question=question,
                    context_chunks=context_chunks,
                    confidence_score=confidence_result.overall_confidence
                )
                final_answer = formatted_answer.content
            
            # 11. Create enhanced sources
            sources = self._create_enhanced_sources(retrieval_result.chunks[:5])
            
            # 12. Calculate processing metrics
            processing_time = (datetime.now() - start_time).total_seconds()
            
            # 13. Compile quality assurance metrics
            qa_metrics = self._compile_qa_metrics(
                validation_result, fact_check_result, confidence_result, formatted_answer
            )
            
            # 14. Create comprehensive response
            return EnhancedRAGResponse(
                success=True,
                answer=final_answer,
                confidence=confidence_result.overall_confidence,
                confidence_level=confidence_result.confidence_level.value,
                fact_check_result=fact_check_result,
                formatted_answer=formatted_answer,
                confidence_result=confidence_result,
                source_type="enhanced_rag_v2",
                sources=sources,
                processing_metrics={
                    "response_time": processing_time,
                    "question_type": question_type,
                    "chunks_retrieved": len(retrieval_result.chunks),
                    "reranking_applied": retrieval_result.reranking_applied,
                    "fact_checking_enabled": enable_fact_checking,
                    "formatting_applied": format_answer and formatted_answer is not None,
                    "fallback_used": not confidence_result.should_use_answer
                },
                quality_assurance=qa_metrics
            )
            
        except Exception as e:
            logger.error(f"Enhanced RAG processing failed: {e}")
            return self._create_error_response(str(e), start_time)
    
    async def _ensure_document_indexed(self, document: DocumentContent):
        """Ensure document is indexed in hybrid retriever"""
        if document.id in self.indexed_documents:
            return
        
        try:
            # Get document content
            document_text = await self.supabase.get_document_content_text(document)
            
            # Extract from storage if needed
            if not document_text or len(document_text.strip()) < 1000:
                logger.info("Extracting content from document storage for indexing...")
                document_text = await self.document_processor.download_and_extract_document(
                    document.storage_url, 
                    document.id
                )
            
            if not document_text or len(document_text.strip()) < 100:
                raise ValueError("Insufficient document content for indexing")
            
            # Index with enhanced chunking
            chunks_indexed = self.hybrid_retriever.index_document(document_text, document.id)
            self.indexed_documents.add(document.id)
            
            logger.info(f"Successfully indexed document {document.id} with {chunks_indexed} chunks")
            
        except Exception as e:
            logger.error(f"Failed to index document {document.id}: {e}")
            raise
    
    def _create_enhanced_sources(self, chunks) -> List[Dict[str, Any]]:
        """Create enhanced source information with quality metrics"""
        sources = []
        
        for i, chunk in enumerate(chunks):
            source = {
                "type": "document_content",
                "title": f"{chunk.document_id} - Section {chunk.chunk_index + 1}",
                "document_id": chunk.document_id,
                "confidence": chunk.final_score,
                "content": chunk.content[:300] + "..." if len(chunk.content) > 300 else chunk.content,
                "quality_metrics": {
                    "chunk_index": chunk.chunk_index,
                    "semantic_score": chunk.semantic_score,
                    "bm25_score": chunk.bm25_score,
                    "rerank_score": chunk.rerank_score,
                    "final_score": chunk.final_score,
                    "content_length": len(chunk.content)
                }
            }
            sources.append(source)
        
        return sources
    
    def _compile_qa_metrics(self, 
                           validation_result, 
                           fact_check_result,
                           confidence_result,
                           formatted_answer) -> Dict[str, Any]:
        """Compile comprehensive quality assurance metrics"""
        
        qa_metrics = {
            "validation": {
                "is_valid": validation_result.is_valid if validation_result else True,
                "quality_score": validation_result.quality_score if validation_result else 0.5,
                "issues_count": len(validation_result.issues) if validation_result else 0
            },
            "fact_checking": {
                "enabled": fact_check_result is not None,
                "support_ratio": fact_check_result.support_ratio if fact_check_result else 1.0,
                "sentences_supported": fact_check_result.num_supported_sentences if fact_check_result else 0,
                "overall_support_score": fact_check_result.overall_support_score if fact_check_result else 0.8
            },
            "confidence": {
                "overall_score": confidence_result.overall_confidence,
                "level": confidence_result.confidence_level.value,
                "reliability_score": confidence_result.reliability_score,
                "risk_factors_count": len(confidence_result.risk_factors)
            },
            "formatting": {
                "applied": formatted_answer is not None,
                "question_type": formatted_answer.question_type.value if formatted_answer else "none",
                "length_category": formatted_answer.length_category if formatted_answer else "none"
            },
            "overall_quality": self._calculate_overall_quality(
                validation_result, fact_check_result, confidence_result
            )
        }
        
        return qa_metrics
    
    def _calculate_overall_quality(self, validation_result, fact_check_result, confidence_result) -> float:
        """Calculate overall quality score"""
        scores = []
        
        if validation_result:
            scores.append(validation_result.quality_score)
        
        if fact_check_result:
            scores.append(fact_check_result.overall_support_score)
        
        scores.append(confidence_result.overall_confidence)
        scores.append(confidence_result.reliability_score)
        
        return sum(scores) / len(scores) if scores else 0.5
    
    def _create_no_content_response(self, question: str, document: DocumentContent, start_time: datetime) -> EnhancedRAGResponse:
        """Create response when no content is found"""
        processing_time = (datetime.now() - start_time).total_seconds()
        
        return EnhancedRAGResponse(
            success=False,
            answer=f"I couldn't find relevant content in {document.name} to answer your question: '{question}'. The document may not contain information on this topic.",
            confidence=0.1,
            confidence_level="very_low",
            fact_check_result=None,
            formatted_answer=None,
            confidence_result=None,
            source_type="no_content",
            sources=[],
            processing_metrics={"response_time": processing_time},
            quality_assurance={"overall_quality": 0.0}
        )
    
    def _create_error_response(self, error_message: str, start_time: datetime) -> EnhancedRAGResponse:
        """Create error response"""
        processing_time = (datetime.now() - start_time).total_seconds()
        
        return EnhancedRAGResponse(
            success=False,
            answer=f"I encountered an error while processing your question: {error_message}",
            confidence=0.0,
            confidence_level="very_low",
            fact_check_result=None,
            formatted_answer=None,
            confidence_result=None,
            source_type="error",
            sources=[],
            processing_metrics={"response_time": processing_time},
            quality_assurance={"overall_quality": 0.0}
        )
    
    def get_system_status(self) -> Dict[str, Any]:
        """Get comprehensive system status"""
        return {
            "components_loaded": {
                "fact_checker": self.fact_checker is not None,
                "formatter": self.formatter is not None,
                "confidence_system": self.confidence_system is not None,
                "hybrid_retriever": self.hybrid_retriever is not None,
                "prompt_templates": self.prompt_templates is not None,
                "response_validator": self.response_validator is not None
            },
            "indexed_documents": len(self.indexed_documents),
            "system_ready": True,
            "improvements_active": [
                "semantic_chunking_with_overlap",
                "cross_encoder_reranking",
                "strict_grounding_prompts",
                "embedding_based_fact_checking",
                "query_aware_formatting",
                "multi_signal_confidence",
                "intelligent_fallbacks"
            ]
        }


# Global instance
_enhanced_rag = None

def get_enhanced_rag_integration() -> EnhancedRAGIntegration:
    """Get global enhanced RAG integration instance"""
    global _enhanced_rag
    if _enhanced_rag is None:
        _enhanced_rag = EnhancedRAGIntegration()
    return _enhanced_rag