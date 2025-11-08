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
import io
import tempfile

from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends
from pydantic import BaseModel, Field
from bson import ObjectId
import json
import pdfplumber

# Add the app directory to Python path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..'))

try:
    from app.services.rag.rag_pipeline import create_rag_pipeline, RAGPipeline
    from app.services.rag.structured_formatter import create_structured_formatter, ResponseFormat
    from database.mongodb import get_mongo_db
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
        logger.info("Initializing lightweight RAG pipeline for fast processing...")
        _rag_pipeline = create_rag_pipeline(
            # BGE Configuration - optimized for speed
            bge_config={
                "model_name": "BAAI/bge-small-en-v1.5",
                "index_path": "./data/faiss_index",
                "device": "cpu",  # Use CPU for faster startup
                "max_chunk_size": 256,  # Smaller chunks for faster processing
                "chunk_overlap": 20
            },
            # Phi-2 Configuration - optimized
            phi2_config={
                "model_name": "microsoft/phi-2",
                "device": "cpu",
                "use_quantization": True,  # Keep quantization for memory efficiency
                "temperature": 0.5,  # Lower temperature for faster, more deterministic responses
                "do_sample": False,  # Disable sampling for speed
                "max_new_tokens": 256  # Limit token generation
            },
            # Pipeline settings - optimized for speed
            default_retrieval_k=5,  # Fewer documents to process
            default_generation_tokens=256,  # Shorter responses
            context_window_size=2000,  # Smaller context window
            min_retrieval_score=0.2,  # Lower threshold for faster processing
            min_confidence_threshold=0.3,
            enable_caching=True,
            cache_ttl=7200  # Longer cache
        )
        logger.info("RAG pipeline initialized successfully")
    return _rag_pipeline

async def extract_text_from_pdf(pdf_bytes: bytes) -> tuple[str, int]:
    """Extract text and page count from PDF bytes using pdfplumber.

    Returns:
        tuple: (extracted_text, page_count)
    """
    try:
        with io.BytesIO(pdf_bytes) as pdf_file:
            with pdfplumber.open(pdf_file) as pdf:
                text_parts = []
                page_count = len(pdf.pages)
                for page in pdf.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text_parts.append(page_text)
                return "\n\n".join(text_parts), page_count
    except Exception as e:
        logger.error(f"Error extracting text from PDF: {e}")
        return "", 0

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

        # Get document from MongoDB
        db = await get_mongo_db()
        documents_collection = db["documents"]

        try:
            document_object_id = ObjectId(request.document_id)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid document ID format")

        document = await documents_collection.find_one({
            "_id": document_object_id,
            "user_id": request.user_id
        })

        if not document:
            raise HTTPException(status_code=404, detail="Document not found or access denied")

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
    Answer a question about a specific document using Enhanced RAG server.
    """
    import httpx

    try:
        logger.info(f"Processing Q&A for document {request.document_id}: {request.question}")

        # Get document from MongoDB
        db = await get_mongo_db()
        documents_collection = db["documents"]

        try:
            document_object_id = ObjectId(request.document_id)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid document ID format")

        document = await documents_collection.find_one({
            "_id": document_object_id,
            "user_id": request.user_id
        })

        if not document:
            raise HTTPException(status_code=404, detail="Document not found or access denied")

        # Get document content (fetch from storage if not extracted)
        document_text = document.get('extracted_text') or document.get('content')

        # If no extracted text, try to fetch from storage URL
        if not document_text:
            storage_url = document.get('storage_url')
            file_name = document.get('file_name', '') or document.get('original_filename', '')

            if storage_url:
                try:
                    async with httpx.AsyncClient() as client:
                        response = await client.get(storage_url, timeout=30.0)
                        if response.status_code == 200:
                            page_count = None
                            # Check if it's a PDF
                            if file_name.lower().endswith('.pdf'):
                                logger.info(f"Extracting text from PDF: {file_name}")
                                document_text, page_count = await extract_text_from_pdf(response.content)
                            else:
                                # For text files, try to decode
                                try:
                                    document_text = response.content.decode('utf-8')
                                except:
                                    document_text = response.text

                            # Limit to 100K chars
                            document_text = document_text[:100000]

                            # Update MongoDB with extracted text and page count
                            if document_text:
                                update_data = {"extracted_text": document_text}
                                if page_count is not None:
                                    update_data["page_count"] = page_count

                                await documents_collection.update_one(
                                    {"_id": document_object_id},
                                    {"$set": update_data}
                                )
                                logger.info(f"Extracted {len(document_text)} characters from {file_name}" +
                                           (f" ({page_count} pages)" if page_count else ""))
                except Exception as e:
                    logger.error(f"Error fetching document from storage: {e}")

        if not document_text:
            raise HTTPException(status_code=400, detail="Document content not available")

        # Send to Enhanced RAG server (port 8002) with document content
        logger.info(f"Sending to Enhanced RAG - doc_text length: {len(document_text) if document_text else 0}")
        async with httpx.AsyncClient(timeout=60.0) as client:
            try:
                # Try Enhanced RAG server
                rag_response = await client.post(
                    "http://localhost:8002/query",
                    json={
                        "query": request.question,
                        "document_text": document_text,
                        "metadata": {
                            "document_id": request.document_id,
                            "document_name": document.get("file_name", document.get("original_filename", "unknown"))
                        }
                    }
                )

                if rag_response.status_code == 200:
                    result = rag_response.json()
                    return QuestionAnswerResponse(
                        success=True,
                        query=request.question,
                        answer=result.get("answer", ""),
                        confidence=result.get("confidence", 0.0),
                        sources=[
                            {
                                'document_id': request.document_id,
                                'content_preview': chunk,
                                'relevance_score': 0.9,
                                'metadata': {}
                            }
                            for chunk in result.get("source_chunks_used", [])[:request.max_sources]
                        ],
                        metadata=result.get("metadata", {}),
                        processing_time=result.get("processing_time", 0.0)
                    )
                else:
                    raise HTTPException(status_code=500, detail="Enhanced RAG server error")

            except Exception as e:
                logger.error(f"Enhanced RAG server error: {e}")
                # Fallback to generic response
                return QuestionAnswerResponse(
                    success=False,
                    query=request.question,
                    answer="I apologize, but I'm having trouble processing your question at the moment. Please try again later.",
                    confidence=0.0,
                    sources=[],
                    metadata={"error": str(e)},
                    processing_time=0.0
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

        # Verify document access from MongoDB
        db = await get_mongo_db()
        documents_collection = db["documents"]

        try:
            document_object_id = ObjectId(document_id)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid document ID format")

        document = await documents_collection.find_one({
            "_id": document_object_id,
            "user_id": user_id
        })

        if not document:
            raise HTTPException(status_code=404, detail="Document not found or access denied")
        
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

        # Get document from MongoDB
        db = await get_mongo_db()
        documents_collection = db["documents"]

        try:
            document_object_id = ObjectId(document_id)
        except Exception:
            logger.error(f"Invalid document ID format: {document_id}")
            return

        document = await documents_collection.find_one({
            "_id": document_object_id,
            "user_id": user_id
        })

        if not document:
            logger.error(f"Document {document_id} not found")
            return

        # Update status to processing
        await documents_collection.update_one(
            {"_id": document_object_id},
            {"$set": {"processing_status": "processing", "updated_at": datetime.now()}}
        )

        # Get document content - try multiple fields
        document_text = (
            document.get('extracted_text') or
            document.get('content') or
            document.get('text_content') or
            document.get('file_content')
        )

        # If no text content, try to extract from storage URL
        if not document_text:
            storage_url = document.get('storage_url')
            if storage_url:
                logger.info(f"No extracted text found, attempting to fetch from storage URL: {storage_url}")
                try:
                    import httpx
                    async with httpx.AsyncClient() as client:
                        response = await client.get(storage_url, timeout=30.0)
                        if response.status_code == 200:
                            # For now, use raw text - in production you'd parse PDFs, DOCX, etc.
                            file_content = response.text
                            document_text = file_content[:100000]  # Limit to first 100k chars
                            logger.info(f"Successfully fetched document content: {len(document_text)} characters")

                            # Store extracted text back to MongoDB
                            await documents_collection.update_one(
                                {"_id": document_object_id},
                                {"$set": {"extracted_text": document_text}}
                            )
                        else:
                            logger.error(f"Failed to fetch document from storage: HTTP {response.status_code}")
                except Exception as fetch_error:
                    logger.error(f"Error fetching document from storage: {fetch_error}")

        if not document_text:
            logger.error(f"No content available for document {document_id}")
            logger.error(f"Document keys: {list(document.keys())}")
            await documents_collection.update_one(
                {"_id": document_object_id},
                {"$set": {"processing_status": "failed", "updated_at": datetime.now()}}
            )
            return

        logger.info(f"Processing document with {len(document_text)} characters")

        # For now, just mark as processed since RAG indexing happens on-demand during Q&A
        # This avoids loading heavy models during upload
        # The agentic RAG server (port 8001) will handle actual processing during queries

        logger.info(f"Skipping heavy model loading - will use agentic RAG server for queries")

        # Update status to processed immediately
        await documents_collection.update_one(
            {"_id": document_object_id},
            {"$set": {
                "processing_status": "processed",
                "updated_at": datetime.now(),
                "rag_ready": True,  # Mark as ready for RAG queries
                "processing_method": "lazy_load"  # Indicate lazy loading strategy
            }}
        )

        logger.info(f"Document {document_id} marked as processed - ready for RAG queries")

    except Exception as e:
        logger.error(f"Background processing failed for document {document_id}: {e}")
        try:
            db = await get_mongo_db()
            documents_collection = db["documents"]
            document_object_id = ObjectId(document_id)
            await documents_collection.update_one(
                {"_id": document_object_id},
                {"$set": {"processing_status": "failed", "updated_at": datetime.now()}}
            )
        except:
            pass

# Export router
__all__ = ["router"]