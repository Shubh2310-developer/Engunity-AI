#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Document API endpoints with CS-Enhanced RAG
==========================================

FastAPI endpoints for document processing and Q&A with Computer Science
enhanced RAG capabilities.

Author: Engunity AI Team
"""

import asyncio
import logging
import json
from typing import Dict, List, Optional, Any
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

# Import our services
from services.rag_processor import get_rag_processor
from services.supabase_service import get_supabase_service

logger = logging.getLogger(__name__)

# Create router
router = APIRouter()

# Request/Response models
class DocumentQARequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=2000)
    context_window: Optional[int] = Field(5, ge=1, le=20)
    use_web_search: Optional[bool] = Field(False)
    temperature: Optional[float] = Field(0.7, ge=0.0, le=2.0)

class DocumentQAResponse(BaseModel):
    success: bool
    answer: str
    confidence: float
    sources: List[Dict[str, Any]]
    processing_time: float
    timestamp: str
    cs_enhanced: bool = True
    rag_version: str = "1.0.0"

class QAFeedbackRequest(BaseModel):
    session_id: str
    message_id: str
    rating: int = Field(..., ge=1, le=5)
    accuracy: Optional[bool] = None
    helpfulness: Optional[int] = Field(None, ge=1, le=5)
    clarity: Optional[int] = Field(None, ge=1, le=5)
    comment: Optional[str] = None

# Basic document health check
@router.get("/documents/health")
async def documents_health():
    """Documents service health check"""
    return {
        "status": "healthy",
        "service": "documents-api",
        "rag_system": "cs-enhanced",
        "timestamp": datetime.now().isoformat()
    }

@router.post("/documents/{document_id}/qa", response_model=DocumentQAResponse)
async def document_qa(
    document_id: str,
    request: DocumentQARequest,
    background_tasks: BackgroundTasks
) -> DocumentQAResponse:
    """
    Process document Q&A using CS-Enhanced RAG with Supabase integration
    """
    start_time = datetime.now()
    
    try:
        logger.info(f"Processing Q&A for document {document_id}: {request.question[:50]}...")
        
        # Get RAG processor instance
        rag_processor = get_rag_processor()
        
        # Process the question using CS-Enhanced RAG
        rag_response = await rag_processor.process_document_question(
            document_id=document_id,
            question=request.question,
            use_web_search=request.use_web_search,
            temperature=request.temperature,
            max_sources=5
        )
        
        # Handle error responses
        if not rag_response.get("success", False):
            raise HTTPException(
                status_code=500, 
                detail=rag_response.get("error", "Unknown RAG processing error")
            )
        
        processing_time = (datetime.now() - start_time).total_seconds()
        
        response = DocumentQAResponse(
            success=True,
            answer=rag_response["answer"],
            confidence=rag_response["confidence"],
            sources=rag_response["sources"],
            processing_time=processing_time,
            timestamp=datetime.now().isoformat(),
            cs_enhanced=rag_response["cs_enhanced"],
            rag_version="2.0.0"
        )
        
        logger.info(f"RAG processing completed: confidence={rag_response['confidence']:.3f}, "
                   f"mode={rag_response.get('processing_mode', 'unknown')}, "
                   f"time={processing_time:.3f}s")
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Document Q&A error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/documents/{document_id}/feedback")
async def submit_qa_feedback(
    document_id: str,
    feedback: QAFeedbackRequest
):
    """
    Submit feedback for Q&A interaction
    """
    try:
        logger.info(f"Received feedback for document {document_id}: rating {feedback.rating}")
        
        # Simulate feedback processing
        await asyncio.sleep(0.1)
        
        return {
            "success": True,
            "message": "Feedback received and will be used to improve CS-enhanced RAG responses",
            "feedback_id": f"feedback_{int(datetime.now().timestamp())}",
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Feedback submission error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/rag/status")
async def rag_status():
    """Get RAG system status"""
    return {
        "status": "active",
        "type": "cs-enhanced",
        "model_type": "local",
        "embedding_model": "cs-document-embeddings",
        "features": {
            "document_qa": True,
            "cs_enhancement": True,
            "local_processing": True,
            "web_search": True
        },
        "timestamp": datetime.now().isoformat()
    }