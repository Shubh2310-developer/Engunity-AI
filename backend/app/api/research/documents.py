"""
Research Documents API
Handles document upload, processing, and retrieval for all research sections
"""

import os
import uuid
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, BackgroundTasks
from fastapi.responses import JSONResponse
import logging

from app.models.research_models import (
    ResearchDocument, DocumentStatus, DocumentUploadResponse,
    DocumentListResponse, ProcessingStatusResponse, ChatRequest, ChatResponse
)
from app.services.database import db_service
from app.services.document_processor import document_processor

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/research", tags=["research-documents"])

# Mock user dependency - replace with real authentication
def get_current_user():
    return {
        "user_id": "demo-user-123",
        "email": "demo@example.com", 
        "name": "Demo User"
    }

@router.post("/documents/upload", response_model=DocumentUploadResponse)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user)
):
    """Upload a research document for processing"""
    try:
        # Validate file type
        if not file.filename.endswith('.pdf'):
            raise HTTPException(status_code=400, detail="Only PDF files are supported")
        
        if file.size > 10 * 1024 * 1024:  # 10MB limit
            raise HTTPException(status_code=400, detail="File too large (max 10MB)")
        
        # Generate document ID
        document_id = str(uuid.uuid4())
        
        # Read file data
        file_data = await file.read()
        
        # Create document record
        document = ResearchDocument(
            document_id=document_id,
            user_id=user["user_id"],
            name=file.filename,
            original_filename=file.filename,
            file_path=f"documents/{user['user_id']}/{document_id}.pdf",
            file_size=len(file_data),
            status=DocumentStatus.UPLOADING,
            upload_date=datetime.utcnow()
        )
        
        # Store document in database
        await db_service.create_document(document)
        
        # Store file in GridFS
        file_id = await db_service.store_file(
            file_data, 
            file.filename,
            {"document_id": document_id, "user_id": user["user_id"]}
        )
        
        # Start background processing
        background_tasks.add_task(
            process_document_background,
            document_id,
            file_data,
            file.filename
        )
        
        logger.info(f"Document uploaded: {document_id} by user {user['user_id']}")
        
        return DocumentUploadResponse(
            document_id=document_id,
            upload_url="",  # Not needed for direct upload
            status="uploaded"
        )
        
    except Exception as e:
        logger.error(f"Error uploading document: {e}")
        raise HTTPException(status_code=500, detail=str(e))

async def process_document_background(document_id: str, file_data: bytes, filename: str):
    """Background task for document processing"""
    try:
        success = await document_processor.process_document(document_id, file_data, filename)
        if success:
            logger.info(f"Document processing completed: {document_id}")
        else:
            logger.error(f"Document processing failed: {document_id}")
    except Exception as e:
        logger.error(f"Error in background processing: {e}")

@router.get("/documents", response_model=DocumentListResponse)
async def get_user_documents(
    page: int = 1,
    per_page: int = 20,
    status: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    """Get all documents for the current user"""
    try:
        documents_response = await db_service.get_user_documents(
            user["user_id"], page, per_page
        )
        
        # Filter by status if provided
        if status:
            filtered_docs = [
                doc for doc in documents_response.documents 
                if doc.status.value == status
            ]
            documents_response.documents = filtered_docs
        
        return documents_response
        
    except Exception as e:
        logger.error(f"Error getting user documents: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/documents/{document_id}")
async def get_document(
    document_id: str,
    user: dict = Depends(get_current_user)
):
    """Get a specific document by ID"""
    try:
        document = await db_service.get_document(document_id, user["user_id"])
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        
        return document
        
    except Exception as e:
        logger.error(f"Error getting document: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/documents/{document_id}/status", response_model=ProcessingStatusResponse)
async def get_document_status(
    document_id: str,
    user: dict = Depends(get_current_user)
):
    """Get document processing status"""
    try:
        document = await db_service.get_document(document_id, user["user_id"])
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        
        # Calculate progress based on status
        progress_map = {
            DocumentStatus.UPLOADING: 0.1,
            DocumentStatus.PROCESSING: 0.5,
            DocumentStatus.PROCESSED: 1.0,
            DocumentStatus.FAILED: 0.0
        }
        
        current_step_map = {
            DocumentStatus.UPLOADING: "Uploading file...",
            DocumentStatus.PROCESSING: "Processing document...",
            DocumentStatus.PROCESSED: "Processing complete",
            DocumentStatus.FAILED: "Processing failed"
        }
        
        return ProcessingStatusResponse(
            document_id=document_id,
            status=document.status,
            progress=progress_map.get(document.status, 0.0),
            current_step=current_step_map.get(document.status, "Unknown"),
            estimated_time_remaining=30 if document.status == DocumentStatus.PROCESSING else None
        )
        
    except Exception as e:
        logger.error(f"Error getting document status: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/documents/{document_id}")
async def delete_document(
    document_id: str,
    user: dict = Depends(get_current_user)
):
    """Delete a document and all associated data"""
    try:
        success = await db_service.delete_document(document_id, user["user_id"])
        if not success:
            raise HTTPException(status_code=404, detail="Document not found")
        
        return {"message": "Document deleted successfully"}
        
    except Exception as e:
        logger.error(f"Error deleting document: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Citations endpoints
@router.get("/documents/{document_id}/citations")
async def get_document_citations(
    document_id: str,
    user: dict = Depends(get_current_user)
):
    """Get all citations for a document"""
    try:
        document = await db_service.get_document(document_id, user["user_id"])
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        
        return {
            "document_id": document_id,
            "citations": document.citations,
            "total_citations": len(document.citations)
        }
        
    except Exception as e:
        logger.error(f"Error getting document citations: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/documents/{document_id}/citations/{citation_id}/classify")
async def classify_citation(
    document_id: str,
    citation_id: str,
    user: dict = Depends(get_current_user)
):
    """Classify a specific citation using the AI classifier"""
    try:
        document = await db_service.get_document(document_id, user["user_id"])
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        
        # Find the citation
        citation = None
        for cite in document.citations:
            if cite.id == citation_id:
                citation = cite
                break
        
        if not citation:
            raise HTTPException(status_code=404, detail="Citation not found")
        
        # Call citation classification service
        import requests
        classification_response = requests.post(
            "http://localhost:8003/api/research/classify-citations",
            json={"citations": [citation.citation_text]},
            timeout=30
        )
        
        if classification_response.status_code == 200:
            result = classification_response.json()
            if result["results"]:
                classification_data = result["results"][0]
                
                # Update citation in database
                await db_service.update_citation_classification(
                    document_id, citation_id, classification_data
                )
                
                return classification_data
        
        raise HTTPException(status_code=500, detail="Classification service unavailable")
        
    except Exception as e:
        logger.error(f"Error classifying citation: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Summarization endpoints
@router.get("/documents/{document_id}/summary")
async def get_document_summary(
    document_id: str,
    user: dict = Depends(get_current_user)
):
    """Get document summary"""
    try:
        document = await db_service.get_document(document_id, user["user_id"])
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        
        return {
            "document_id": document_id,
            "summary": document.summary,
            "status": document.status
        }
        
    except Exception as e:
        logger.error(f"Error getting document summary: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Literature analysis endpoints
@router.get("/documents/{document_id}/literature-analysis")
async def get_literature_analysis(
    document_id: str,
    user: dict = Depends(get_current_user)
):
    """Get literature analysis for document"""
    try:
        document = await db_service.get_document(document_id, user["user_id"])
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        
        return {
            "document_id": document_id,
            "literature_analysis": document.literature_analysis,
            "status": document.status
        }
        
    except Exception as e:
        logger.error(f"Error getting literature analysis: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Chat endpoints
@router.post("/chat", response_model=ChatResponse)
async def chat_with_documents(
    request: ChatRequest,
    user: dict = Depends(get_current_user)
):
    """Chat with documents using AI"""
    try:
        import time
        start_time = time.time()
        
        # Get document context if specified
        context = ""
        if request.document_id:
            document = await db_service.get_document(request.document_id, user["user_id"])
            if document and document.raw_text:
                # Use first 2000 characters as context
                context = document.raw_text[:2000]
        
        # Simple mock response - replace with actual AI service
        answer = f"Based on your question about '{request.question}', here's what I found: This is a mock response that would normally be generated by an AI service using the document context and your research database."
        
        if context:
            answer += f" The analysis is based on the uploaded document content."
        
        # Create chat message
        from app.models.research_models import ChatMessage
        import uuid
        
        message = ChatMessage(
            message_id=str(uuid.uuid4()),
            user_id=user["user_id"],
            document_id=request.document_id,
            question=request.question,
            answer=answer,
            context=context if context else None,
            processing_time=time.time() - start_time
        )
        
        # Store chat message
        await db_service.create_chat_message(message)
        
        return ChatResponse(
            answer=answer,
            confidence=0.85,
            context_used=context[:100] + "..." if context else None,
            processing_time=message.processing_time,
            message_id=message.message_id
        )
        
    except Exception as e:
        logger.error(f"Error in chat: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/chat/history")
async def get_chat_history(
    limit: int = 50,
    document_id: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    """Get chat history for user"""
    try:
        if document_id:
            chats = await db_service.get_document_chats(document_id, limit)
        else:
            chats = await db_service.get_user_chats(user["user_id"], limit)
        
        return {
            "chats": chats,
            "total": len(chats)
        }
        
    except Exception as e:
        logger.error(f"Error getting chat history: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# User dashboard endpoints
@router.get("/dashboard/overview")
async def get_dashboard_overview(
    user: dict = Depends(get_current_user)
):
    """Get research dashboard overview data"""
    try:
        # Get user documents
        documents_response = await db_service.get_user_documents(user["user_id"], 1, 100)
        documents = documents_response.documents
        
        # Get recent chats
        recent_chats = await db_service.get_user_chats(user["user_id"], 20)
        
        # Calculate statistics
        total_documents = len(documents)
        processed_documents = len([d for d in documents if d.status == DocumentStatus.PROCESSED])
        total_citations = sum(len(d.citations) for d in documents)
        
        # Get recent activity
        recent_documents = sorted(documents, key=lambda x: x.upload_date, reverse=True)[:10]
        
        return {
            "user_info": {
                "user_id": user["user_id"],
                "name": user["name"],
                "email": user["email"]
            },
            "statistics": {
                "total_documents": total_documents,
                "processed_documents": processed_documents,
                "total_citations": total_citations,
                "recent_chats": len(recent_chats)
            },
            "recent_documents": recent_documents,
            "recent_chats": recent_chats[:10],
            "document_status_breakdown": {
                "uploading": len([d for d in documents if d.status == DocumentStatus.UPLOADING]),
                "processing": len([d for d in documents if d.status == DocumentStatus.PROCESSING]),
                "processed": processed_documents,
                "failed": len([d for d in documents if d.status == DocumentStatus.FAILED])
            }
        }
        
    except Exception as e:
        logger.error(f"Error getting dashboard overview: {e}")
        raise HTTPException(status_code=500, detail=str(e))