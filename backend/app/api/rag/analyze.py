"""
RAG Document Analysis API Endpoint
==================================

FastAPI endpoint for analyzing documents using the RAG system with
BGE-small retriever and Phi-2 generator.

Features:
- Document processing and vectorization
- RAG-based question answering
- Structured response formatting
- Progress tracking and status updates

Author: Engunity AI Team
"""

import os
import sys
import logging
import asyncio
from typing import Dict, List, Optional, Any
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends
from pydantic import BaseModel, Field
import json

# Add the app directory to Python path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..'))

try:
    from app.services.rag.rag_pipeline import create_rag_pipeline, RAGPipeline
    from app.services.rag.structured_formatter import create_structured_formatter, ResponseFormat
    from app.services.supabase_service import get_supabase_service
except ImportError as e:
    logging.error(f"Error importing RAG modules: {e}")
    raise

logger = logging.getLogger(__name__)

# Initialize router
router = APIRouter(prefix="/rag", tags=["RAG Analysis"])

# Global RAG pipeline instance
_rag_pipeline: Optional[RAGPipeline] = None
_structured_formatter = None

def get_rag_pipeline() -> RAGPipeline:
    """Get or create RAG pipeline instance."""
    global _rag_pipeline
    if _rag_pipeline is None:
        logger.info("Initializing RAG pipeline...")
        _rag_pipeline = create_rag_pipeline(
            # BGE Configuration
            bge_config={
                "model_name": "BAAI/bge-small-en-v1.5",
                "index_path": "./data/faiss_index",
                "device": "auto",
                "max_chunk_size": 512,
                "chunk_overlap": 50
            },
            # Phi-2 Configuration
            phi2_config={
                "model_name": "microsoft/phi-2",
                "device": "auto",
                "use_quantization": True,
                "temperature": 0.7,
                "do_sample": True,
                "top_p": 0.9,
                "top_k": 50
            },
            # Pipeline Configuration
            pipeline_config={
                "default_retrieval_k": 10,
                "default_generation_tokens": 512,
                "context_window_size": 4000,
                "min_retrieval_score": 0.3,
                "min_confidence_threshold": 0.5,
                "enable_caching": True,
                "cache_ttl": 3600
            }
        )
        logger.info("RAG pipeline initialized successfully")
    return _rag_pipeline

def get_structured_formatter():
    """Get or create structured formatter instance."""
    global _structured_formatter
    if _structured_formatter is None:
        _structured_formatter = create_structured_formatter(
            enable_citations=True,
            citation_style="apa",
            include_quality_indicators=True
        )
    return _structured_formatter

# Request/Response Models
class DocumentAnalysisRequest(BaseModel):
    document_id: str = Field(..., description="Document ID to analyze")
    user_id: str = Field(..., description="User ID")
    options: Dict[str, Any] = Field(default_factory=dict, description="Analysis options")

class QuestionAnswerRequest(BaseModel):
    document_id: str = Field(..., description="Document ID")
    question: str = Field(..., description="Question to ask")
    user_id: str = Field(..., description="User ID")
    response_format: str = Field(default="detailed", description="Response format")
    max_sources: int = Field(default=5, description="Maximum number of sources")

class RAGAnalysisResponse(BaseModel):
    success: bool
    document_id: str
    analysis_id: str
    status: str
    message: str
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None

class QuestionAnswerResponse(BaseModel):
    success: bool
    query: str
    answer: str
    confidence: float
    sources: List[Dict[str, Any]]
    metadata: Dict[str, Any]
    processing_time: float

@router.post("/analyze-document", response_model=RAGAnalysisResponse)
async def analyze_document(
    request: DocumentAnalysisRequest,
    background_tasks: BackgroundTasks
):
    """
    Analyze a document using the RAG system.
    This processes the document and adds it to the vector store.
    """
    try:
        logger.info(f"Starting document analysis for {request.document_id}")
        
        # Get document from Supabase
        supabase = get_supabase_service()
        document = await supabase.get_document(request.document_id)
        
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        
        if document.user_id != request.user_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Generate analysis ID
        analysis_id = f"analysis_{request.document_id}_{int(datetime.now().timestamp())}"
        
        # Start background processing
        background_tasks.add_task(
            process_document_background,
            request.document_id,
            request.user_id,
            analysis_id,
            request.options
        )
        
        return RAGAnalysisResponse(
            success=True,
            document_id=request.document_id,
            analysis_id=analysis_id,
            status="processing",
            message="Document analysis started successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error starting document analysis: {e}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

@router.post("/question-answer", response_model=QuestionAnswerResponse)
async def question_answer(request: QuestionAnswerRequest):
    """
    Answer a question about a specific document using RAG.
    """
    try:
        logger.info(f"Processing Q&A for document {request.document_id}: {request.question}")
        
        # Get document from Supabase
        supabase = get_supabase_service()
        document = await supabase.get_document(request.document_id)
        
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        
        if document.user_id != request.user_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        if document.status != 'processed':
            raise HTTPException(status_code=400, detail="Document not yet processed")
        
        # Get RAG pipeline
        pipeline = get_rag_pipeline()
        
        # Check if document is in vector store, if not, process it
        retriever_stats = pipeline.retriever.get_stats()
        if request.document_id not in pipeline.retriever.metadata_store:
            logger.info(f"Document {request.document_id} not in vector store, processing...")
            
            # Get document content
            document_text = await supabase.get_document_content_text(document)
            if not document_text:
                raise HTTPException(status_code=400, detail="Document content not available")
            
            # Add to RAG pipeline
            pipeline.retriever.add_document(
                text=document_text,
                document_id=request.document_id,
                metadata={
                    'name': document.name,
                    'type': document.type,
                    'category': document.category,
                    'user_id': document.user_id
                }
            )
        
        # Process question with document filter
        response = pipeline.query(
            query=request.question,
            document_filter={'document_id': request.document_id},
            retrieval_k=request.max_sources,
            response_format=request.response_format,
            include_sources=True
        )
        
        return QuestionAnswerResponse(
            success=True,
            query=request.question,
            answer=response.answer,
            confidence=response.confidence,
            sources=[
                {
                    'document_id': source['document_id'],
                    'content_preview': source.get('content_preview', ''),
                    'relevance_score': source.get('relevance_score', 0.0),
                    'metadata': source.get('metadata', {})
                }
                for source in response.sources
            ],
            metadata={
                'response_format': request.response_format,
                'processing_time': response.total_time,
                'retrieval_time': response.retrieval_time,
                'generation_time': response.generation_time,
                'quality_score': getattr(response, 'relevance_score', 0.0)
            },
            processing_time=response.total_time
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing question: {e}")
        raise HTTPException(status_code=500, detail=f"Question processing failed: {str(e)}")

@router.post("/batch-questions")
async def batch_question_answer(
    document_id: str,
    questions: List[str],
    user_id: str,
    response_format: str = "detailed"
):
    """
    Answer multiple questions about a document in batch.
    """
    try:
        logger.info(f"Processing {len(questions)} questions for document {document_id}")
        
        # Verify document access
        supabase = get_supabase_service()
        document = await supabase.get_document(document_id)
        
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        
        if document.user_id != user_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Process each question
        results = []
        pipeline = get_rag_pipeline()
        
        for question in questions:
            try:
                response = pipeline.query(
                    query=question,
                    document_filter={'document_id': document_id},
                    retrieval_k=3,
                    response_format=response_format,
                    include_sources=True
                )
                
                results.append({
                    'question': question,
                    'answer': response.answer,
                    'confidence': response.confidence,
                    'sources_count': len(response.sources),
                    'processing_time': response.total_time,
                    'success': True
                })
                
            except Exception as e:
                logger.error(f"Error processing question '{question}': {e}")
                results.append({
                    'question': question,
                    'answer': f"Error processing question: {str(e)}",
                    'confidence': 0.0,
                    'sources_count': 0,
                    'processing_time': 0.0,
                    'success': False,
                    'error': str(e)
                })
        
        return {
            'success': True,
            'document_id': document_id,
            'results': results,
            'total_questions': len(questions),
            'successful_questions': sum(1 for r in results if r['success']),
            'average_confidence': sum(r['confidence'] for r in results) / len(results) if results else 0.0
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing batch questions: {e}")
        raise HTTPException(status_code=500, detail=f"Batch processing failed: {str(e)}")

@router.get("/analysis-status/{analysis_id}")
async def get_analysis_status(analysis_id: str):
    """Get the status of a document analysis."""
    try:
        # In a real implementation, you'd store analysis status in a database
        # For now, return a basic response
        return {
            'analysis_id': analysis_id,
            'status': 'completed',
            'progress': 100,
            'message': 'Analysis completed successfully'
        }
        
    except Exception as e:
        logger.error(f"Error getting analysis status: {e}")
        raise HTTPException(status_code=500, detail=f"Status check failed: {str(e)}")

@router.get("/pipeline-stats")
async def get_pipeline_stats():
    """Get RAG pipeline statistics."""
    try:
        pipeline = get_rag_pipeline()
        stats = pipeline.get_pipeline_stats()
        
        return {
            'success': True,
            'stats': stats,
            'timestamp': datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error getting pipeline stats: {e}")
        raise HTTPException(status_code=500, detail=f"Stats retrieval failed: {str(e)}")

async def process_document_background(
    document_id: str,
    user_id: str,
    analysis_id: str,
    options: Dict[str, Any]
):
    """
    Background task to process document with RAG system.
    """
    try:
        logger.info(f"Background processing started for document {document_id}")
        
        # Get document and content
        supabase = get_supabase_service()
        document = await supabase.get_document(document_id)
        
        if not document:
            logger.error(f"Document {document_id} not found")
            return
        
        # Update status to processing
        await supabase.update_document_status(document_id, 'processing')
        
        # Get document content
        document_text = await supabase.get_document_content_text(document)
        if not document_text:
            logger.error(f"No content available for document {document_id}")
            await supabase.update_document_status(document_id, 'failed')
            return
        
        # Get RAG pipeline
        pipeline = get_rag_pipeline()
        
        # Process document
        pipeline.retriever.add_document(
            text=document_text,
            document_id=document_id,
            metadata={
                'name': document.name,
                'type': document.type,
                'category': document.category,
                'user_id': document.user_id,
                'analysis_id': analysis_id,
                'processed_at': datetime.now().isoformat()
            }
        )
        
        # Update status to processed
        await supabase.update_document_status(document_id, 'processed')
        
        logger.info(f"Document {document_id} processed successfully")
        
    except Exception as e:
        logger.error(f"Background processing failed for document {document_id}: {e}")
        try:
            supabase = get_supabase_service()
            await supabase.update_document_status(document_id, 'failed')
        except:
            pass

# Export router
__all__ = ["router"]