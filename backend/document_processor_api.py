"""
Document Processing API
Handles text extraction from uploaded documents
"""
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Optional
import requests
import tempfile
import os
from bson import ObjectId
import logging

from utils.document_processor import extract_text_from_file
from database.mongodb import get_mongo_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/documents", tags=["documents"])


class ProcessDocumentRequest(BaseModel):
    storage_url: str
    file_type: Optional[str] = None
    file_name: Optional[str] = None


async def process_document_background(document_id: str, storage_url: str, file_type: str, file_name: str):
    """Background task to extract text from document"""
    try:
        logger.info(f"📄 Starting text extraction for document: {document_id}")
        logger.info(f"   File: {file_name}")
        logger.info(f"   Storage URL: {storage_url}")

        # Download file from Supabase
        logger.info("⬇️  Downloading document from Supabase...")
        response = requests.get(storage_url, timeout=60)
        if response.status_code != 200:
            raise Exception(f"Failed to download document: HTTP {response.status_code}")

        # Save to temp file
        file_ext = os.path.splitext(file_name)[1] if file_name else '.pdf'
        with tempfile.NamedTemporaryFile(delete=False, suffix=file_ext) as tmp_file:
            tmp_file.write(response.content)
            tmp_path = tmp_file.name

        try:
            # Extract text
            logger.info("🔍 Extracting text from document...")
            extracted_text, metadata = extract_text_from_file(tmp_path, file_type)

            if not extracted_text or len(extracted_text) < 100:
                logger.warning(f"⚠️  Text extraction yielded insufficient content: {len(extracted_text) if extracted_text else 0} chars")
                # Still update status but mark as failed
                db = await get_mongo_db()
                await db.documents.update_one(
                    {"_id": ObjectId(document_id)},
                    {
                        "$set": {
                            "processing_status": "failed",
                            "error_message": "Text extraction failed - insufficient content",
                            "updated_at": datetime.utcnow()
                        }
                    }
                )
                return

            logger.info(f"✅ Extracted {metadata['word_count']} words from document")

            # Update MongoDB
            logger.info("💾 Updating document in MongoDB...")
            db = await get_mongo_db()
            update_result = await db.documents.update_one(
                {"_id": ObjectId(document_id)},
                {
                    "$set": {
                        "extracted_text": extracted_text,
                        "word_count": metadata['word_count'],
                        "page_count": metadata.get('page_count'),
                        "char_count": metadata.get('char_count'),
                        "extraction_method": metadata.get('extraction_method'),
                        "processing_status": "processed",
                        "updated_at": datetime.utcnow(),
                        "text_extracted_at": datetime.utcnow()
                    }
                }
            )

            if update_result.modified_count > 0:
                logger.info(f"✅ Document {document_id} processed successfully!")
                logger.info(f"   Words: {metadata['word_count']}")
                logger.info(f"   Pages: {metadata.get('page_count', 'N/A')}")
                logger.info(f"   Ready for RAG queries")
            else:
                logger.warning(f"⚠️  Document update returned 0 modified count")

        finally:
            # Clean up temp file
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)

    except Exception as e:
        logger.error(f"❌ Document processing failed for {document_id}: {str(e)}")
        # Update document with error status
        try:
            db = await get_mongo_db()
            await db.documents.update_one(
                {"_id": ObjectId(document_id)},
                {
                    "$set": {
                        "processing_status": "failed",
                        "error_message": str(e),
                        "updated_at": datetime.utcnow()
                    }
                }
            )
        except Exception as db_error:
            logger.error(f"Failed to update error status: {str(db_error)}")


@router.post("/{document_id}/process")
async def process_document(
    document_id: str,
    request: ProcessDocumentRequest,
    background_tasks: BackgroundTasks
):
    """
    Trigger text extraction for an uploaded document
    Runs in background to not block the upload response
    """
    logger.info(f"📥 Received processing request for document: {document_id}")

    # Validate document ID
    try:
        ObjectId(document_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid document ID format")

    # Validate storage URL
    if not request.storage_url:
        raise HTTPException(status_code=400, detail="Storage URL is required")

    # Add background task
    background_tasks.add_task(
        process_document_background,
        document_id,
        request.storage_url,
        request.file_type,
        request.file_name
    )

    logger.info(f"✅ Text extraction task queued for document: {document_id}")

    return {
        "success": True,
        "message": "Document processing started",
        "document_id": document_id,
        "status": "processing"
    }


@router.get("/{document_id}/status")
async def get_document_status(document_id: str):
    """Get processing status of a document"""
    try:
        doc_id = ObjectId(document_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid document ID")

    db = await get_mongo_db()
    document = await db.documents.find_one(
        {"_id": doc_id},
        {
            "processing_status": 1,
            "word_count": 1,
            "page_count": 1,
            "error_message": 1,
            "text_extracted_at": 1
        }
    )

    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    return {
        "document_id": document_id,
        "status": document.get("processing_status", "unknown"),
        "word_count": document.get("word_count"),
        "page_count": document.get("page_count"),
        "error_message": document.get("error_message"),
        "extracted_at": document.get("text_extracted_at"),
        "has_text": bool(document.get("word_count"))
    }


# Import datetime for timestamps
from datetime import datetime
