#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Enhanced RAG Processor with Advanced Techniques
==============================================

High-quality RAG processor integrating:
- Hybrid search (Dense + Sparse)
- BGE reranking
- Semantic chunking
- Query expansion
- Structured prompts
- Response validation
- Test-time scaling

Author: Engunity AI Team
"""

import logging
import asyncio
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime
import json

from .supabase_service import DocumentContent, get_supabase_service
from .enhanced_document_processor import get_document_processor
from .advanced_retrieval_system import get_hybrid_retriever, DocumentChunk
from .structured_prompt_templates import get_prompt_templates
from .response_validator import get_response_validator
from .intelligent_answer_generator import get_answer_generator
from .agentic_web_crawler import get_web_crawler, search_web_for_question
from .answer_merger import get_answer_merger
from .smart_response_cleaner import smart_clean_response
from .professional_answer_synthesizer import synthesize_professional_answer

logger = logging.getLogger(__name__)

class EnhancedRAGProcessor:
    """Enhanced RAG processor with state-of-the-art techniques"""
    
    def __init__(self):
        self.supabase = get_supabase_service()
        self.document_processor = get_document_processor()
        self.hybrid_retriever = get_hybrid_retriever()
        self.prompt_templates = get_prompt_templates()
        self.response_validator = get_response_validator()
        self.answer_generator = get_answer_generator()
        self.web_crawler = get_web_crawler()
        self.answer_merger = get_answer_merger()
        
        # Document index cache
        self.indexed_documents = set()
        
        logger.info("Enhanced RAG Processor initialized with advanced techniques and web crawler")
    
    async def process_document_question(self,
                                      document_id: str,
                                      question: str,
                                      use_web_search: bool = False,
                                      temperature: float = 0.7,
                                      max_sources: int = 5,
                                      use_test_time_scaling: bool = True) -> Dict[str, Any]:
        """Process document question with advanced RAG techniques"""
        start_time = datetime.now()
        
        try:
            logger.info(f"Processing enhanced RAG question for document {document_id}: {question[:50]}...")
            
            # 1. Get document from Supabase
            document = await self.supabase.get_document(document_id)
            if not document:
                raise ValueError(f"Document {document_id} not found")
            
            # 2. Ensure document is indexed for hybrid search
            await self._ensure_document_indexed(document)
            
            # 3. Classify question type for appropriate prompt template
            question_type = self.prompt_templates.classify_question_type(question)
            logger.info(f"Question classified as: {question_type}")
            
            # 4. Perform hybrid retrieval with reranking
            retrieval_result = self.hybrid_retriever.hybrid_search(
                query=question,
                top_k=20,  # Retrieve more for reranking
                dense_weight=0.7,
                sparse_weight=0.3,
                rerank_top_k=max_sources
            )
            
            if not retrieval_result.chunks:
                return await self._generate_no_content_response(question, document, start_time)
            
            # 5. Generate answer using multiple techniques
            if use_test_time_scaling:
                answer, confidence = await self._generate_with_test_time_scaling(
                    question, retrieval_result.chunks, document, question_type
                )
            else:
                answer, confidence = await self._generate_single_answer(
                    question, retrieval_result.chunks, document, question_type
                )
            
            # 6. Post-generation validation and improvement
            validation_result = self.response_validator.validate_response(
                response=answer,
                question=question,
                context=self._chunks_to_context(retrieval_result.chunks),
                template_name=question_type
            )
            
            # 7. Improve answer if validation fails
            if not validation_result.is_valid and validation_result.quality_score < 0.6:
                logger.info("Response validation failed, generating improved answer...")
                answer = await self._generate_improved_answer(
                    question, retrieval_result.chunks, document, 
                    question_type, validation_result
                )
            
            # 8. Perform web search if enabled
            web_response = None
            if use_web_search:
                try:
                    logger.info("Performing agentic web search...")
                    context_hint = f"{document.name} - {question_type}"
                    web_response = await search_web_for_question(question, context_hint)
                    logger.info(f"Web search completed: success={web_response.success}, confidence={web_response.confidence:.3f}")
                except Exception as e:
                    logger.warning(f"Web search failed: {e}")
            
            # 9. Create sources with enhanced metadata
            sources = self._create_enhanced_sources(retrieval_result.chunks, max_sources)
            
            # 10. Merge RAG and web answers if web search was performed
            final_answer = answer
            final_confidence = min(confidence + validation_result.quality_score * 0.1, 1.0)
            processing_mode = "enhanced_rag"
            
            if web_response and web_response.success:
                try:
                    logger.info("Merging RAG and web answers...")
                    merged_result = await self.answer_merger.merge_answers(
                        question=question,
                        rag_answer=answer,
                        rag_confidence=confidence,
                        rag_sources=sources,
                        web_response=web_response,
                        document_name=document.name
                    )
                    
                    if merged_result.success:
                        final_answer = merged_result.answer
                        final_confidence = merged_result.confidence
                        sources = merged_result.sources
                        processing_mode = f"enhanced_rag_web_{merged_result.merge_strategy}"
                        logger.info(f"Answer merge completed: strategy={merged_result.merge_strategy}, confidence={final_confidence:.3f}")
                    
                except Exception as e:
                    logger.warning(f"Answer merging failed, using RAG answer: {e}")
            
            # 11. Calculate processing metrics
            processing_time = (datetime.now() - start_time).total_seconds()
            
            # 12. Clean final answer to remove any source references while preserving content
            cleaned_final_answer = smart_clean_response(final_answer)
            
            # 13. Return comprehensive response
            return {
                "success": True,
                "answer": cleaned_final_answer,
                "confidence": final_confidence,
                "source_type": "enhanced_hybrid_rag_web" if web_response and web_response.success else "enhanced_hybrid_rag",
                "sources": sources,
                "session_id": f"session_{document_id}_{int(datetime.now().timestamp())}",
                "message_id": f"msg_{int(datetime.now().timestamp())}",
                "response_time": processing_time,
                "token_usage": {
                    "prompt_tokens": len(question.split()) + sum(len(chunk.content.split()) for chunk in retrieval_result.chunks[:5]),
                    "completion_tokens": len(final_answer.split()),
                    "total_tokens": len(question.split()) + len(final_answer.split()) + sum(len(chunk.content.split()) for chunk in retrieval_result.chunks[:5])
                },
                "cs_enhanced": True,
                "processing_mode": processing_mode,
                "web_search_performed": web_response is not None and web_response.success,
                "quality_metrics": {
                    "validation_score": validation_result.quality_score,
                    "semantic_richness": validation_result.semantic_richness,
                    "specificity_score": validation_result.specificity_score,
                    "context_adherence": validation_result.context_adherence,
                    "retrieval_method": retrieval_result.retrieval_method,
                    "chunks_searched": retrieval_result.total_chunks_searched,
                    "reranking_applied": retrieval_result.reranking_applied,
                    "question_type": question_type,
                    "web_results_found": web_response.total_results_found if web_response else 0
                }
            }
            
        except Exception as e:
            logger.error(f"Enhanced RAG processing failed: {e}")
            return await self._generate_error_response(question, document_id, str(e), start_time)
    
    async def _ensure_document_indexed(self, document: DocumentContent):
        """Ensure document is indexed in hybrid retriever"""
        if document.id in self.indexed_documents:
            return
        
        try:
            # Get document content
            document_text = await self.supabase.get_document_content_text(document)
            
            # If metadata doesn't have real content, extract from storage
            if not document_text or len(document_text.strip()) < 1000 or "CONTENT ANALYSIS:" in document_text:
                logger.info("Extracting content from document storage for indexing...")
                document_text = await self.document_processor.download_and_extract_document(
                    document.storage_url, 
                    document.id
                )
            
            if not document_text or len(document_text.strip()) < 100:
                raise ValueError("Insufficient document content for indexing")
            
            # Index document
            chunks_indexed = self.hybrid_retriever.index_document(document_text, document.id)
            self.indexed_documents.add(document.id)
            
            logger.info(f"Successfully indexed document {document.id} with {chunks_indexed} chunks")
            
        except Exception as e:
            logger.error(f"Failed to index document {document.id}: {e}")
            raise
    
    async def _generate_with_test_time_scaling(self, 
                                             question: str, 
                                             chunks: List[DocumentChunk], 
                                             document: DocumentContent,
                                             question_type: str) -> Tuple[str, float]:
        """Generate answer using test-time scaling with multi-prompt ensembling"""
        
        # Generate multiple answers with slight variations
        prompts_variations = self._create_prompt_variations(question, chunks, document, question_type)
        
        answers = []
        for prompt_data in prompts_variations:
            try:
                answer = await self._generate_answer_from_prompt(prompt_data)
                if answer and len(answer.strip()) > 50:
                    answers.append(answer)
            except Exception as e:
                logger.warning(f"Failed to generate answer variation: {e}")
                continue
        
        if not answers:
            # Fallback to single answer
            return await self._generate_single_answer(question, chunks, document, question_type)
        
        # Select best answer using validation scores
        best_answer = None
        best_score = 0.0
        
        for answer in answers:
            validation = self.response_validator.validate_response(
                response=answer,
                question=question,
                context=self._chunks_to_context(chunks),
                template_name=question_type
            )
            
            if validation.quality_score > best_score:
                best_score = validation.quality_score
                best_answer = answer
        
        confidence = min(0.95, 0.8 + best_score * 0.15)  # Enhanced confidence for test-time scaling
        return best_answer or answers[0], confidence
    
    def _create_prompt_variations(self, 
                                 question: str, 
                                 chunks: List[DocumentChunk], 
                                 document: DocumentContent,
                                 question_type: str) -> List[Dict[str, Any]]:
        """Create prompt variations for ensembling"""
        context = self._chunks_to_context(chunks)
        
        variations = []
        
        # Base prompt
        base_prompt = self.prompt_templates.get_prompt(question, context, question_type)
        variations.append({
            "type": "base",
            "system_prompt": base_prompt["system_prompt"],
            "user_prompt": base_prompt["user_prompt"],
            "context": context
        })
        
        # Variation 1: More explicit constraints
        strict_system = base_prompt["system_prompt"] + "\n\nADDITIONAL CONSTRAINTS:\n- Be extremely specific\n- Include technical details\n- Avoid any generalizations"
        variations.append({
            "type": "strict",
            "system_prompt": strict_system,
            "user_prompt": base_prompt["user_prompt"],
            "context": context
        })
        
        # Variation 2: Focus on different chunks (retrieval dropout)
        if len(chunks) > 3:
            reduced_chunks = chunks[:-1]  # Drop last chunk
            reduced_context = self._chunks_to_context(reduced_chunks)
            reduced_prompt = self.prompt_templates.get_prompt(question, reduced_context, question_type)
            variations.append({
                "type": "reduced_context",
                "system_prompt": reduced_prompt["system_prompt"],
                "user_prompt": reduced_prompt["user_prompt"],
                "context": reduced_context
            })
        
        return variations
    
    async def _generate_answer_from_prompt(self, prompt_data: Dict[str, Any]) -> str:
        """Generate answer from prompt data (placeholder for actual LLM call)"""
        # In a real implementation, this would call your LLM with the prompts
        # For now, use the intelligent answer generator with context awareness
        
        context = prompt_data["context"]
        question = prompt_data["user_prompt"].split("QUESTION:")[-1].strip() if "QUESTION:" in prompt_data["user_prompt"] else ""
        
        # Extract document name from context or use default
        document_name = "Document"
        if "Based on" in prompt_data["user_prompt"]:
            doc_match = prompt_data["user_prompt"].split("Based on")[1].split(",")[0].strip()
            if doc_match:
                document_name = doc_match
        
        # Use professional answer synthesizer for high-quality responses
        chunks_text = [context]  # Convert context back to chunks format
        answer = synthesize_professional_answer(
            question=question,
            content_chunks=chunks_text,
            document_name=document_name
        )
        
        return answer
    
    async def _generate_single_answer(self, 
                                    question: str, 
                                    chunks: List[DocumentChunk], 
                                    document: DocumentContent,
                                    question_type: str) -> Tuple[str, float]:
        """Generate single answer using structured prompts"""
        
        context = self._chunks_to_context(chunks)
        prompt_data = self.prompt_templates.get_prompt(question, context, question_type)
        
        answer = await self._generate_answer_from_prompt({
            "type": "single",
            "system_prompt": prompt_data["system_prompt"],
            "user_prompt": prompt_data["user_prompt"],
            "context": context
        })
        
        confidence = 0.85  # Base confidence for single generation
        return answer, confidence
    
    async def _generate_improved_answer(self,
                                      question: str,
                                      chunks: List[DocumentChunk],
                                      document: DocumentContent,
                                      question_type: str,
                                      validation_result) -> str:
        """Generate improved answer based on validation feedback"""
        
        context = self._chunks_to_context(chunks)
        
        # Create improved prompt with validation feedback
        base_prompt = self.prompt_templates.get_prompt(question, context, question_type)
        
        improvement_instructions = "\\n".join([
            "IMPROVEMENT INSTRUCTIONS:",
            *validation_result.suggestions,
            *self.response_validator.suggest_improvements("", validation_result),
            "Be more specific and avoid vague language.",
            "Include technical details from the context.",
            "Provide concrete examples when available."
        ])
        
        improved_system = base_prompt["system_prompt"] + "\\n\\n" + improvement_instructions
        
        improved_answer = await self._generate_answer_from_prompt({
            "type": "improved",
            "system_prompt": improved_system,
            "user_prompt": base_prompt["user_prompt"],
            "context": context
        })
        
        return improved_answer
    
    def _chunks_to_context(self, chunks: List[DocumentChunk]) -> str:
        """Convert chunks to context string without source references"""
        context_parts = []
        for chunk in chunks[:5]:  # Limit to top 5 chunks
            # Just add the content without source headers
            if chunk.content and chunk.content.strip():
                context_parts.append(chunk.content.strip())
        
        return "\\n\\n".join(context_parts)
    
    def _create_enhanced_sources(self, chunks: List[DocumentChunk], max_sources: int) -> List[Dict[str, Any]]:
        """Create enhanced source information"""
        sources = []
        
        for i, chunk in enumerate(chunks[:max_sources]):
            source = {
                "type": "document_content",
                "title": f"{chunk.document_id} - {chunk.section_title or f'Section {chunk.chunk_index + 1}'}",
                "document_id": chunk.document_id,
                "confidence": chunk.final_score,
                "content": chunk.content[:300] + "..." if len(chunk.content) > 300 else chunk.content,
                "metadata": {
                    "chunk_index": chunk.chunk_index,
                    "chunk_length": len(chunk.content),
                    "section_title": chunk.section_title,
                    "semantic_score": chunk.semantic_score,
                    "bm25_score": chunk.bm25_score,
                    "rerank_score": chunk.rerank_score,
                    "final_score": chunk.final_score
                }
            }
            sources.append(source)
        
        return sources
    
    async def _generate_no_content_response(self, question: str, document: DocumentContent, start_time: datetime) -> Dict[str, Any]:
        """Generate response when no content is found"""
        processing_time = (datetime.now() - start_time).total_seconds()
        
        no_content_answer = f"I couldn't find relevant content in {document.name} to answer your question: '{question}'. The document may not contain information on this topic, or it may need to be re-indexed. Please try rephrasing your question or ask about a different topic."
        cleaned_no_content_answer = smart_clean_response(no_content_answer)
        
        return {
            "success": True,
            "answer": cleaned_no_content_answer,
            "confidence": 0.3,
            "source_type": "no_content_found",
            "sources": [],
            "session_id": f"session_{document.id}_{int(datetime.now().timestamp())}",
            "message_id": f"msg_{int(datetime.now().timestamp())}",
            "response_time": processing_time,
            "token_usage": {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0},
            "cs_enhanced": True,
            "processing_mode": "no_content"
        }
    
    async def _generate_error_response(self, question: str, document_id: str, error_message: str, start_time: datetime) -> Dict[str, Any]:
        """Generate error response"""
        processing_time = (datetime.now() - start_time).total_seconds()
        
        error_answer = f"I apologize, but I encountered an error while processing your question: {error_message}"
        cleaned_error_answer = smart_clean_response(error_answer)
        
        return {
            "success": False,
            "error": error_message,
            "answer": cleaned_error_answer,
            "confidence": 0.0,
            "source_type": "error",
            "sources": [],
            "session_id": f"session_{document_id}_{int(datetime.now().timestamp())}",
            "message_id": f"msg_{int(datetime.now().timestamp())}",
            "response_time": processing_time,
            "token_usage": {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0},
            "cs_enhanced": False,
            "processing_mode": "error"
        }

# Global instance
_enhanced_processor = None

def get_enhanced_rag_processor() -> EnhancedRAGProcessor:
    """Get global enhanced RAG processor instance"""
    global _enhanced_processor
    if _enhanced_processor is None:
        _enhanced_processor = EnhancedRAGProcessor()
    return _enhanced_processor