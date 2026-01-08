"""
Document API Routes
===================

RESTful API endpoints for document management
"""

from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Query, BackgroundTasks
from fastapi.responses import JSONResponse
from fastapi.encoders import jsonable_encoder
from typing import List, Optional
import hashlib
import uuid
from datetime import datetime
import os
import asyncio
import logging
import json

from app.services.document_service import get_document_db
from app.services.document_auto_processor import get_document_processor
from app.models.document_models import (
    Document,
    DocumentMetadata,
    DocumentAnnotation
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/documents", tags=["documents"])


@router.post("/upload")
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    user_id: str = Form(...),
    session_id: Optional[str] = Form(None),
    category: Optional[str] = Form(None)
):
    """
    Upload and process a document

    Steps:
    1. Validate file
    2. Generate doc_id and hash
    3. Save to MongoDB with basic metadata
    4. Trigger background processing:
       - Extract text content
       - Generate summary and key points
       - Extract entities (people, orgs, locations, dates)
       - Classify document type and topics
       - Analyze visual elements (charts, tables)
       - Update MongoDB with enriched data
    5. Upload to RAG server for vectorization
    """
    try:
        db = get_document_db()

        # Validate file type
        allowed_extensions = ['pdf', 'docx', 'doc', 'txt', 'md']
        file_type = file.filename.split('.')[-1].lower()

        if file_type not in allowed_extensions:
            raise HTTPException(
                status_code=400,
                detail=f"File type '{file_type}' not supported. Allowed: {', '.join(allowed_extensions)}"
            )

        # Read file content
        content = await file.read()
        file_hash = hashlib.sha256(content).hexdigest()

        # Validate file size (50MB max)
        max_size = 50 * 1024 * 1024  # 50MB
        if len(content) > max_size:
            raise HTTPException(
                status_code=400,
                detail=f"File too large. Maximum size is 50MB."
            )

        # Generate unique doc_id
        doc_id = f"doc_{uuid.uuid4().hex[:12]}"

        # Extract basic metadata
        file_size = len(content)

        # Create document object with minimal metadata
        document = Document(
            doc_id=doc_id,
            user_id=user_id,
            session_id=session_id,
            filename=file.filename.replace(' ', '_'),
            original_filename=file.filename,
            file_hash=file_hash,
            metadata=DocumentMetadata(
                file_size_bytes=file_size,
                file_type=file_type,
                mime_type=file.content_type or "application/octet-stream"
            ),
            category=category or "uncategorized",
            processing_status="pending"
        )

        # Save to MongoDB
        doc_id_saved = await db.create_document(document)

        logger.info(f"✅ Document uploaded: {doc_id} ({file.filename})")

        # Trigger background auto-processing
        # This will extract metadata, generate summary, extract entities, etc.
        background_tasks.add_task(
            auto_process_document,
            doc_id,
            content,
            file.filename,
            file_type
        )

        logger.info(f"🚀 Background processing started for: {doc_id}")

        return {
            "success": True,
            "doc_id": doc_id,
            "filename": file.filename,
            "message": "Document uploaded successfully. AI processing started (summary, entities, classification).",
            "mongo_id": doc_id_saved,
            "processing_status": "processing"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Upload failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


async def auto_process_document(
    doc_id: str,
    file_content: bytes,
    filename: str,
    file_type: str
):
    """
    Background task to auto-process uploaded document

    This function runs asynchronously and enriches the document with:
    - Enhanced metadata (word count, page count, reading time, complexity)
    - Intelligent summary (executive summary + key points)
    - Entity extraction (people, organizations, locations, dates, money)
    - Document classification (type, industry, topics, sentiment)
    - Visual analysis (charts, tables, images)
    """
    try:
        logger.info(f"🔄 Starting auto-processing for document: {doc_id}")

        processor = get_document_processor()
        success = await processor.process_document(
            doc_id=doc_id,
            file_content=file_content,
            filename=filename,
            file_type=file_type
        )

        if success:
            logger.info(f"✅ Auto-processing completed for: {doc_id}")
        else:
            logger.error(f"❌ Auto-processing failed for: {doc_id}")

    except Exception as e:
        logger.error(f"❌ Error in auto-processing for {doc_id}: {e}", exc_info=True)

        # Update document status to failed
        try:
            db = get_document_db()
            await db.update_document(doc_id, {
                "processing_status": "failed",
                "error_message": f"Auto-processing error: {str(e)}"
            })
        except:
            pass


@router.get("/{doc_id}/status")
async def get_document_status(doc_id: str):
    """
    Get processing status of a document

    Returns:
    - processing_status: pending, processing, ready, failed
    - has_summary: boolean
    - has_entities: boolean
    - has_topics: boolean
    - processing_progress: percentage (0-100)
    """
    try:
        db = get_document_db()
        document = await db.get_document(doc_id)

        if not document:
            raise HTTPException(status_code=404, detail="Document not found")

        # Calculate processing progress
        progress = 0
        if document.processing_status == "pending":
            progress = 10
        elif document.processing_status == "processing":
            progress = 50
        elif document.processing_status == "ready":
            progress = 100
        elif document.processing_status == "failed":
            progress = 0

        return {
            "doc_id": doc_id,
            "processing_status": document.processing_status,
            "progress": progress,
            "has_summary": bool(document.summary),
            "has_key_points": len(document.key_points) > 0,
            "has_entities": bool(document.extracted_entities),
            "has_topics": len(document.tags) > 0,
            "error_message": document.processing_error,
            "metadata": {
                "word_count": document.metadata.word_count,
                "page_count": document.metadata.page_count,
                "reading_time": document.metadata.reading_time_minutes,
                "document_type": document.metadata.document_type,
                "topics": document.metadata.topics
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving status: {str(e)}")


@router.get("/{doc_id}")
async def get_document(doc_id: str):
    """Get document by ID"""
    try:
        db = get_document_db()
        document = await db.get_document(doc_id)

        if not document:
            raise HTTPException(status_code=404, detail="Document not found")

        # Track view
        await db.increment_view_count(doc_id)

        # Convert to JSON-serializable format using FastAPI's encoder
        return jsonable_encoder(document)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving document {doc_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error retrieving document: {str(e)}")


@router.get("/user/{user_id}")
async def get_user_documents(
    user_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    category: Optional[str] = None,
    search: Optional[str] = None
):
    """Get all documents for a user with pagination and filtering"""
    try:
        db = get_document_db()
        documents = await db.get_user_documents(
            user_id=user_id,
            skip=skip,
            limit=limit,
            category=category,
            search_query=search
        )

        return {
            "documents": [jsonable_encoder(doc) for doc in documents],
            "total": len(documents),
            "skip": skip,
            "limit": limit
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving documents: {str(e)}")


@router.put("/{doc_id}")
async def update_document(doc_id: str, updates: dict):
    """Update document metadata"""
    try:
        db = get_document_db()

        # Filter allowed updates
        allowed_fields = [
            "filename", "category", "tags", "custom_tags",
            "summary", "key_points", "processing_status"
        ]

        filtered_updates = {k: v for k, v in updates.items() if k in allowed_fields}

        if not filtered_updates:
            raise HTTPException(status_code=400, detail="No valid fields to update")

        success = await db.update_document(doc_id, filtered_updates)

        if not success:
            raise HTTPException(status_code=404, detail="Document not found")

        return {"success": True, "updated_fields": list(filtered_updates.keys())}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating document: {str(e)}")


@router.delete("/{doc_id}")
async def delete_document(doc_id: str):
    """Delete a document"""
    try:
        db = get_document_db()
        success = await db.delete_document(doc_id)

        if not success:
            raise HTTPException(status_code=404, detail="Document not found")

        return {"success": True, "message": "Document deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting document: {str(e)}")


@router.post("/{doc_id}/view")
async def track_view(doc_id: str):
    """Track document view"""
    try:
        db = get_document_db()
        await db.increment_view_count(doc_id)
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error tracking view: {str(e)}")


@router.get("/stats/dashboard/{user_id}")
async def get_dashboard_stats(user_id: str):
    """Get dashboard statistics for a user"""
    try:
        db = get_document_db()
        stats = await db.get_dashboard_stats(user_id)
        return stats
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving stats: {str(e)}")


@router.get("/{doc_id}/analytics")
async def get_document_analytics(doc_id: str):
    """Get detailed analytics for a document"""
    try:
        db = get_document_db()
        analytics = await db.get_analytics(doc_id)

        if not analytics:
            raise HTTPException(status_code=404, detail="Analytics not found")

        return analytics.dict(by_alias=True)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving analytics: {str(e)}")


@router.post("/{doc_id}/annotations")
async def add_annotation(doc_id: str, annotation: DocumentAnnotation):
    """Add annotation to document"""
    try:
        db = get_document_db()
        await db.add_annotation(doc_id, annotation)
        return {"success": True, "annotation_id": annotation.id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error adding annotation: {str(e)}")


@router.get("/{doc_id}/annotations")
async def get_annotations(doc_id: str):
    """Get all annotations for a document"""
    try:
        db = get_document_db()
        annotations = await db.get_annotations(doc_id)
        return {"annotations": [ann.dict() for ann in annotations]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving annotations: {str(e)}")
