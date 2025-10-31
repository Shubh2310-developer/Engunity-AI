#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Ultimate RAG API Endpoints
===========================

FastAPI endpoints for the Ultimate Hybrid RAG system with BGE + Groq.

Endpoints:
- POST /ultimate-rag/upload - Upload and process document
- POST /ultimate-rag/query - Query document with RAG
- GET /ultimate-rag/health - Health check
- GET /ultimate-rag/stats - System statistics

Author: Engunity AI Team
"""

import os
import logging
from typing import Dict, List, Optional, Any
from fastapi import APIRouter, HTTPException, UploadFile, File, BackgroundTasks
from pydantic import BaseModel, Field
import PyPDF2
import io

from app.services.rag.ultimate_groq_rag import (
    UltimateHybridRAG,
    RAGConfig,
    RAGResponse,
    create_ultimate_rag
)

logger = logging.getLogger(__name__)

# Initialize router
router = APIRouter(prefix="/ultimate-rag", tags=["Ultimate RAG"])

# Global RAG instance (initialized on startup)
_rag_instance: Optional[UltimateHybridRAG] = None


def get_rag_instance() -> UltimateHybridRAG:
    """Get or create RAG instance."""
    global _rag_instance

    if _rag_instance is None:
        logger.info("Initializing Ultimate RAG instance...")
        config = RAGConfig(
            bge_model="BAAI/bge-small-en-v1.5",
            groq_model="llama-3.1-70b-versatile",
            chunk_size=700,
            chunk_overlap=150,
            top_k_retrieval=20,
            top_k_rerank=5,
            enable_reranking=True,
            enable_redis_cache=True,
            max_tokens=500,
            temperature=0.2
        )

        groq_api_key = os.getenv("GROQ_API_KEY")
        if not groq_api_key:
            logger.warning("GROQ_API_KEY not set. RAG will fail without it.")

        _rag_instance = create_ultimate_rag(config, groq_api_key)
        logger.info("✓ Ultimate RAG instance created")

    return _rag_instance


# ============================================================================
# REQUEST/RESPONSE MODELS
# ============================================================================

class DocumentUploadRequest(BaseModel):
    """Request model for document upload."""
    document_id: str = Field(..., description="Unique document identifier")
    text: Optional[str] = Field(None, description="Document text (if not using file upload)")
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Document metadata")


class DocumentUploadResponse(BaseModel):
    """Response model for document upload."""
    success: bool
    document_id: str
    chunk_count: int
    embedding_dim: int
    index_size: int
    ingestion_time_ms: float
    message: str


class QueryRequest(BaseModel):
    """Request model for RAG query."""
    query: str = Field(..., min_length=1, max_length=1000, description="User query")
    document_id: Optional[str] = Field(None, description="Document ID to query (optional)")
    top_k: Optional[int] = Field(None, ge=1, le=50, description="Number of results to retrieve")


class SourceInfo(BaseModel):
    """Source information model."""
    chunk_text: str
    retrieval_score: float
    rerank_score: float
    combined_score: float
    chunk_id: str
    chunk_index: int


class QueryResponse(BaseModel):
    """Response model for RAG query."""
    success: bool
    answer: str
    confidence: float
    sources: List[SourceInfo]
    context_used: str
    retrieval_count: int
    reranked_count: int
    total_latency_ms: float
    retrieval_latency_ms: float
    generation_latency_ms: float
    cache_hit: bool
    groq_model: str
    timestamp: str


class HealthResponse(BaseModel):
    """Health check response."""
    status: str
    components: Dict[str, str]
    version: str


class StatsResponse(BaseModel):
    """System statistics response."""
    total_documents: int
    total_chunks: int
    embedding_dimension: int
    faiss_index_type: str
    groq_model: str
    cache_enabled: bool


# ============================================================================
# API ENDPOINTS
# ============================================================================

@router.post("/upload", response_model=DocumentUploadResponse)
async def upload_document(
    document_id: str,
    file: Optional[UploadFile] = File(None),
    text: Optional[str] = None,
    background_tasks: BackgroundTasks = None
):
    """
    Upload and process document into RAG system.

    Supports:
    - PDF file upload
    - Direct text input
    - Automatic chunking and embedding
    - FAISS index building

    Example:
        curl -X POST "http://localhost:8000/ultimate-rag/upload?document_id=doc1" \
             -F "file=@document.pdf"
    """
    try:
        rag = get_rag_instance()

        # Extract text from file or use provided text
        if file:
            logger.info(f"Processing uploaded file: {file.filename}")

            if file.filename.endswith('.pdf'):
                # Read PDF
                content = await file.read()
                pdf_reader = PyPDF2.PdfReader(io.BytesIO(content))
                text = "\n\n".join([page.extract_text() for page in pdf_reader.pages])
            elif file.filename.endswith('.txt'):
                # Read text file
                content = await file.read()
                text = content.decode('utf-8')
            else:
                raise HTTPException(status_code=400, detail="Unsupported file type. Use PDF or TXT.")

        if not text or not text.strip():
            raise HTTPException(status_code=400, detail="No text content provided")

        logger.info(f"Ingesting document: {document_id} ({len(text)} chars)")

        # Ingest document
        stats = rag.ingest_document(document_id, text)

        if "error" in stats:
            raise HTTPException(status_code=500, detail=stats["error"])

        response = DocumentUploadResponse(
            success=True,
            document_id=stats["document_id"],
            chunk_count=stats["chunk_count"],
            embedding_dim=stats["embedding_dim"],
            index_size=stats["index_size"],
            ingestion_time_ms=stats["ingestion_time_ms"],
            message=f"Document processed successfully into {stats['chunk_count']} chunks"
        )

        logger.info(f"✓ Document uploaded: {document_id}")
        return response

    except Exception as e:
        logger.error(f"Document upload error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/query", response_model=QueryResponse)
async def query_document(request: QueryRequest):
    """
    Query documents using RAG pipeline.

    Pipeline:
    1. Encode query with BGE
    2. Retrieve top-k chunks from FAISS
    3. Re-rank with cross-encoder
    4. Generate answer with Groq LLM
    5. Return answer with sources

    Example:
        curl -X POST "http://localhost:8000/ultimate-rag/query" \
             -H "Content-Type: application/json" \
             -d '{"query": "What is deep learning?", "document_id": "doc1"}'
    """
    try:
        rag = get_rag_instance()

        logger.info(f"Processing query: {request.query[:50]}...")

        # Execute RAG query
        rag_response: RAGResponse = rag.query(
            query=request.query,
            document_id=request.document_id,
            top_k=request.top_k
        )

        # Convert sources to API model
        sources = [
            SourceInfo(
                chunk_text=source.chunk_text,
                retrieval_score=source.retrieval_score,
                rerank_score=source.rerank_score,
                combined_score=source.combined_score,
                chunk_id=source.metadata.chunk_id,
                chunk_index=source.metadata.chunk_index
            )
            for source in rag_response.sources
        ]

        response = QueryResponse(
            success=True,
            answer=rag_response.answer,
            confidence=rag_response.confidence,
            sources=sources,
            context_used=rag_response.context_used,
            retrieval_count=rag_response.retrieval_count,
            reranked_count=rag_response.reranked_count,
            total_latency_ms=rag_response.total_latency_ms,
            retrieval_latency_ms=rag_response.retrieval_latency_ms,
            generation_latency_ms=rag_response.generation_latency_ms,
            cache_hit=rag_response.cache_hit,
            groq_model=rag_response.groq_model,
            timestamp=rag_response.timestamp
        )

        logger.info(f"✓ Query completed: {rag_response.total_latency_ms:.2f}ms, confidence={rag_response.confidence:.2%}")
        return response

    except Exception as e:
        logger.error(f"Query error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health", response_model=HealthResponse)
async def health_check():
    """
    Health check endpoint.

    Returns system health status and component availability.
    """
    try:
        rag = get_rag_instance()

        components = {
            "bge_embedder": "healthy",
            "faiss_index": "healthy" if rag.index_manager.index else "not_initialized",
            "groq_generator": "healthy",
            "redis_cache": "healthy" if rag.cache.client else "disabled"
        }

        if rag.reranker:
            components["cross_encoder"] = "healthy"

        return HealthResponse(
            status="healthy",
            components=components,
            version="1.0.0"
        )

    except Exception as e:
        logger.error(f"Health check error: {e}")
        raise HTTPException(status_code=503, detail=str(e))


@router.get("/stats", response_model=StatsResponse)
async def get_stats():
    """
    Get system statistics.

    Returns information about the RAG system state.
    """
    try:
        rag = get_rag_instance()

        stats = StatsResponse(
            total_documents=len(set(meta.document_id for meta in rag.index_manager.chunk_metadata)),
            total_chunks=len(rag.index_manager.chunk_metadata),
            embedding_dimension=rag.embedder.embedding_dim,
            faiss_index_type=rag.config.faiss_index_type,
            groq_model=rag.config.groq_model,
            cache_enabled=rag.config.enable_redis_cache
        )

        return stats

    except Exception as e:
        logger.error(f"Stats error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/clear-cache")
async def clear_cache():
    """Clear Redis cache."""
    try:
        rag = get_rag_instance()

        if rag.cache.client:
            rag.cache.client.flushdb()
            return {"success": True, "message": "Cache cleared successfully"}
        else:
            return {"success": False, "message": "Cache not enabled"}

    except Exception as e:
        logger.error(f"Cache clear error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
