"""
Document API Routes
===================

RESTful API endpoints for document management
"""

from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Query
from fastapi.responses import JSONResponse
from typing import List, Optional
import hashlib
import uuid
from datetime import datetime
import os

from backend.app.services.document_service import get_document_db
from backend.app.models.document_models import (
    Document,
    DocumentMetadata,
    DocumentAnnotation
)

router = APIRouter(prefix="/api/documents", tags=["documents"])


@router.post("/upload")
async def upload_document(
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
    3. Save to MongoDB
    4. Trigger processing (RAG indexing)
    """
    try:
        db = get_document_db()

        # Read file content
        content = await file.read()
        file_hash = hashlib.sha256(content).hexdigest()

        # Generate unique doc_id
        doc_id = f"doc_{uuid.uuid4().hex[:12]}"

        # Extract basic metadata
        file_size = len(content)
        file_type = file.filename.split('.')[-1].lower()

        # Create document object
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

        return {
            "success": True,
            "doc_id": doc_id,
            "filename": file.filename,
            "message": "Document uploaded successfully. Processing started.",
            "mongo_id": doc_id_saved
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


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

        return document.dict(by_alias=True)

    except HTTPException:
        raise
    except Exception as e:
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
            "documents": [doc.dict(by_alias=True) for doc in documents],
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
