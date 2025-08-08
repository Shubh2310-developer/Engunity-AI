#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Agentic RAG API Endpoints
=========================

FastAPI endpoints for the complete agentic RAG system with:
- BGE-small-en-v1.5 retrieval
- Phi-2 generation with Test-Time Scaling
- MongoDB Atlas chat history
- Supabase document storage
- CS-specific enhancements

Features:
- Document upload and processing
- Real-time Q&A with chat history
- Incremental document updates
- Performance monitoring
- WebSocket support for streaming responses

Author: Engunity AI Team
"""

import os
import json
import logging
import asyncio
from typing import Dict, List, Optional, Any
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks, WebSocket, WebSocketDisconnect
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
import time

# Agentic RAG components
from ...services.rag.agentic_rag_orchestrator import (
    AgenticRAGOrchestrator, AgenticRAGConfig, AgenticRAGRequest, AgenticRAGResponse,
    get_agentic_rag_orchestrator
)
from ...services.rag.agentic_rag_logger import (
    AgenticRAGLogger, QueryLog, FeedbackLog, get_agentic_rag_logger
)
from ...services.mongodb_chat_service import get_chat_service
from ...services.supabase_service import get_supabase_service

logger = logging.getLogger(__name__)

# Create router
router = APIRouter()

# Request/Response models
class DocumentUploadRequest(BaseModel):
    document_id: str = Field(..., description="Document ID to process")
    user_id: str = Field(..., description="User ID")
    force_reprocess: bool = Field(default=False, description="Force reprocessing even if already processed")
    enable_cs_enhancements: bool = Field(default=True, description="Enable CS-specific processing")

class DocumentUploadResponse(BaseModel):
    success: bool
    document_id: str
    status: str
    processing_time: float
    chunks_created: Optional[int] = None
    metadata: Optional[Dict[str, Any]] = None
    message: str = ""
    error: Optional[str] = None

class AgenticQueryRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=2000, description="User query")
    document_id: Optional[str] = Field(None, description="Specific document to query")
    user_id: str = Field(..., description="User identifier")
    session_id: Optional[str] = Field(None, description="Chat session ID")
    
    # RAG settings
    include_chat_history: bool = Field(default=True, description="Include chat history for context")
    use_best_of_n: bool = Field(default=True, description="Use Best-of-N generation (n=5)")
    enable_web_search: bool = Field(default=True, description="Enable web search via Gemini API")
    max_sources: int = Field(default=5, ge=1, le=20, description="Maximum number of sources to return")
    response_format: str = Field(default="detailed", description="Response format type")
    
    # Advanced settings
    temperature: Optional[float] = Field(default=0.7, ge=0.0, le=2.0, description="Generation temperature")
    max_tokens: Optional[int] = Field(default=200, ge=50, le=512, description="Maximum tokens to generate")
    confidence_threshold: Optional[float] = Field(default=0.75, ge=0.0, le=1.0, description="Confidence threshold for web search")

class ChatHistoryRequest(BaseModel):
    user_id: str = Field(..., description="User identifier")
    document_id: str = Field(..., description="Document identifier")
    session_id: Optional[str] = Field(None, description="Session identifier")
    limit: int = Field(default=50, ge=1, le=200, description="Maximum messages to return")

class ChatHistoryResponse(BaseModel):
    success: bool
    messages: List[Dict[str, Any]]
    session_info: Dict[str, Any]
    total_messages: int

class SystemStatsResponse(BaseModel):
    success: bool
    stats: Dict[str, Any]
    health_status: str
    timestamp: str
    
    # Agentic RAG specific metrics
    web_searches_triggered: int = 0
    merge_strategies_used: Dict[str, int] = {}
    avg_confidence: float = 0.0
    quality_metrics: Dict[str, float] = {}

class FeedbackRequest(BaseModel):
    """Request model for user feedback."""
    query_id: str = Field(..., description="Query identifier")
    user_id: str = Field(..., description="User identifier")
    feedback_type: str = Field(..., description="Type of feedback", pattern="^(rating|thumbs|correction|report)$")
    rating: Optional[int] = Field(None, description="Rating 1-5", ge=1, le=5)
    comment: Optional[str] = Field(None, description="User comment", max_length=500)
    correction: Optional[str] = Field(None, description="User correction", max_length=1000)
    helpful: Optional[bool] = Field(None, description="Whether response was helpful")

# WebSocket connection manager for real-time chat
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
    
    async def connect(self, websocket: WebSocket, session_id: str):
        await websocket.accept()
        self.active_connections[session_id] = websocket
        logger.info(f"WebSocket connected: {session_id}")
    
    def disconnect(self, session_id: str):
        if session_id in self.active_connections:
            del self.active_connections[session_id]
            logger.info(f"WebSocket disconnected: {session_id}")
    
    async def send_message(self, session_id: str, message: Dict[str, Any]):
        if session_id in self.active_connections:
            websocket = self.active_connections[session_id]
            try:
                await websocket.send_text(json.dumps(message))
            except Exception as e:
                logger.error(f"Error sending WebSocket message: {e}")
                self.disconnect(session_id)
    
    async def broadcast(self, message: Dict[str, Any]):
        for websocket in self.active_connections.values():
            try:
                await websocket.send_text(json.dumps(message))
            except Exception:
                pass

manager = ConnectionManager()

# Initialize orchestrator
@router.on_event("startup")
async def startup_event():
    """Initialize agentic RAG system on startup."""
    try:
        config = AgenticRAGConfig(
            # Use lightweight models for <6GB VRAM
            bge_model="BAAI/bge-small-en-v1.5",
            phi2_model="microsoft/phi-2",
            device="auto",
            max_memory_gb=6,
            
            # Enable Agentic RAG features
            enable_web_search=True,
            confidence_threshold=0.75,
            gemini_api_key=os.getenv('GEMINI_API_KEY'),
            use_best_of_n=True,
            best_of_n_count=5,
            
            # Enable all other features
            enable_cs_enhancements=True,
            cs_term_expansion=True,
            acronym_resolution=True,
            enable_incremental_updates=True,
            enable_caching=True
        )
        
        # Initialize orchestrator
        await get_agentic_rag_orchestrator(config=config)
        logger.info("Agentic RAG system initialized successfully")
        
    except Exception as e:
        logger.error(f"Failed to initialize agentic RAG system: {e}")
        raise

@router.post("/upload-document", response_model=DocumentUploadResponse)
async def upload_document(
    request: DocumentUploadRequest,
    background_tasks: BackgroundTasks
):
    """
    Upload and process document for RAG system.
    
    This endpoint:
    1. Retrieves document from Supabase
    2. Chunks document using intelligent chunking
    3. Generates embeddings with BGE-small
    4. Stores in FAISS index
    5. Enables incremental updates
    """
    try:
        logger.info(f"Processing document upload: {request.document_id}")
        
        # Get orchestrator
        orchestrator = await get_agentic_rag_orchestrator()
        
        # Process document
        result = await orchestrator.process_document(
            document_id=request.document_id,
            force_reprocess=request.force_reprocess
        )
        
        if result['success']:
            return DocumentUploadResponse(
                success=True,
                document_id=request.document_id,
                status=result['status'],
                processing_time=result['processing_time'],
                chunks_created=result.get('chunks_created'),
                metadata=result.get('metadata'),
                message=f"Document processed successfully with {result.get('chunks_created', 0)} chunks"
            )
        else:
            return DocumentUploadResponse(
                success=False,
                document_id=request.document_id,
                status='failed',
                processing_time=result['processing_time'],
                error=result.get('error'),
                message="Document processing failed"
            )
            
    except Exception as e:
        logger.error(f"Error in document upload: {e}")
        raise HTTPException(status_code=500, detail=f"Document upload failed: {str(e)}")

@router.post("/query", response_model=AgenticRAGResponse)
async def agentic_query(request: AgenticQueryRequest):
    """
    Execute agentic RAG query with full pipeline.
    
    This endpoint:
    1. Enhances query with CS-specific improvements
    2. Retrieves relevant chunks using BGE-small + FAISS
    3. Integrates chat history for context
    4. Generates response using Phi-2 + TTS
    5. Saves interaction to MongoDB Atlas
    """
    try:
        logger.info(f"Processing agentic query: {request.query[:100]}...")
        
        # Get orchestrator
        orchestrator = await get_agentic_rag_orchestrator()
        
        # Create RAG request
        rag_request = AgenticRAGRequest(
            query=request.query,
            document_id=request.document_id,
            user_id=request.user_id,
            session_id=request.session_id,
            include_chat_history=request.include_chat_history,
            use_tts=request.use_best_of_n,  # Map to Best-of-N usage
            max_sources=request.max_sources,
            response_format=request.response_format,
            metadata={
                'temperature': request.temperature,
                'max_tokens': request.max_tokens,
                'enable_web_search': request.enable_web_search,
                'confidence_threshold': request.confidence_threshold
            }
        )
        
        # Execute query
        response = await orchestrator.query(rag_request)
        
        logger.info(f"Query completed in {response.processing_time:.2f}s with confidence {response.confidence:.2f}")
        return response
        
    except Exception as e:
        logger.error(f"Error in agentic query: {e}")
        raise HTTPException(status_code=500, detail=f"Query processing failed: {str(e)}")

@router.get("/chat-history", response_model=ChatHistoryResponse)
async def get_chat_history(
    user_id: str,
    document_id: str,
    session_id: Optional[str] = None,
    limit: int = 50
):
    """Get chat history for a document session."""
    try:
        chat_service = await get_chat_service()
        
        # Get messages
        messages = await chat_service.get_chat_history(
            user_id=user_id,
            document_id=document_id,
            session_id=session_id,
            limit=limit
        )
        
        # Get session info
        session_info = {}
        if session_id:
            session = await chat_service.get_session(session_id)
            if session:
                session_info = {
                    'session_id': session.session_id,
                    'document_name': session.document_name,
                    'created_at': session.created_at.isoformat(),
                    'message_count': session.message_count
                }
        
        # Format messages
        formatted_messages = []
        for msg in messages:
            formatted_messages.append({
                'id': msg.id,
                'role': msg.role,
                'content': msg.content,
                'timestamp': msg.timestamp.isoformat(),
                'confidence': msg.confidence,
                'sources_count': len(msg.sources) if msg.sources else 0
            })
        
        return ChatHistoryResponse(
            success=True,
            messages=formatted_messages,
            session_info=session_info,
            total_messages=len(formatted_messages)
        )
        
    except Exception as e:
        logger.error(f"Error getting chat history: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get chat history: {str(e)}")

@router.post("/feedback")
async def submit_feedback(request: FeedbackRequest):
    """Submit user feedback for query responses."""
    try:
        rag_logger = get_agentic_rag_logger()
        
        # Log feedback
        rag_logger.log_feedback(
            query_id=request.query_id,
            user_id=request.user_id,
            feedback_type=request.feedback_type,
            rating=request.rating,
            comment=request.comment,
            correction=request.correction,
            helpful=request.helpful
        )
        
        logger.info(f"Feedback received for query {request.query_id}: {request.feedback_type}")
        
        return {
            "success": True,
            "message": "Feedback submitted successfully",
            "query_id": request.query_id
        }
        
    except Exception as e:
        logger.error(f"Error submitting feedback: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to submit feedback: {str(e)}")

@router.get("/system-stats", response_model=SystemStatsResponse)
async def get_system_stats():
    """Get comprehensive system statistics and health status."""
    try:
        orchestrator = await get_agentic_rag_orchestrator()
        stats = orchestrator.get_system_stats()
        health = await orchestrator.health_check()
        
        # Get logger stats
        rag_logger = get_agentic_rag_logger()
        perf_stats = rag_logger.get_performance_stats(24)  # Last 24 hours
        
        return SystemStatsResponse(
            success=True,
            stats=stats,
            health_status=health['status'],
            timestamp=datetime.now().isoformat(),
            web_searches_triggered=perf_stats.get('web_searches', 0),
            avg_confidence=perf_stats.get('avg_confidence', 0.0),
            quality_metrics={
                'avg_processing_time': perf_stats.get('avg_processing_time', 0.0),
                'success_rate': perf_stats.get('success_rate', 0.0),
                'queries_per_hour': perf_stats.get('queries_per_hour', 0.0)
            }
        )
        
    except Exception as e:
        logger.error(f"Error getting system stats: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get stats: {str(e)}")

@router.post("/update-document")
async def update_document(
    document_id: str,
    user_id: str,
    force_update: bool = False
):
    """Update document with incremental changes."""
    try:
        orchestrator = await get_agentic_rag_orchestrator()
        
        # Process document with incremental updates
        result = await orchestrator.process_document(
            document_id=document_id,
            force_reprocess=force_update
        )
        
        return {
            'success': result['success'],
            'document_id': document_id,
            'status': result['status'],
            'processing_time': result['processing_time'],
            'message': 'Document updated successfully' if result['success'] else 'Update failed'
        }
        
    except Exception as e:
        logger.error(f"Error updating document: {e}")
        raise HTTPException(status_code=500, detail=f"Document update failed: {str(e)}")

@router.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    """
    WebSocket endpoint for real-time chat.
    
    Message format:
    {
        "type": "query",
        "data": {
            "query": "user question",
            "document_id": "doc_123",
            "user_id": "user_456"
        }
    }
    """
    await manager.connect(websocket, session_id)
    
    try:
        while True:
            # Receive message
            data = await websocket.receive_text()
            message = json.loads(data)
            
            if message.get('type') == 'query':
                try:
                    # Process query
                    query_data = message.get('data', {})
                    
                    # Send "thinking" status
                    await manager.send_message(session_id, {
                        'type': 'status',
                        'data': {'status': 'processing', 'message': 'AI is thinking...'}
                    })
                    
                    # Create RAG request
                    rag_request = AgenticRAGRequest(
                        query=query_data.get('query', ''),
                        document_id=query_data.get('document_id'),
                        user_id=query_data.get('user_id', ''),
                        session_id=session_id,
                        include_chat_history=True,
                        use_tts=True,
                        max_sources=5
                    )
                    
                    # Execute query
                    orchestrator = await get_agentic_rag_orchestrator()
                    response = await orchestrator.query(rag_request)
                    
                    # Send response
                    await manager.send_message(session_id, {
                        'type': 'response',
                        'data': response.to_dict()
                    })
                    
                except Exception as e:
                    logger.error(f"Error processing WebSocket query: {e}")
                    await manager.send_message(session_id, {
                        'type': 'error',
                        'data': {'error': str(e), 'message': 'Failed to process query'}
                    })
            
            elif message.get('type') == 'ping':
                # Respond to ping
                await manager.send_message(session_id, {
                    'type': 'pong',
                    'data': {'timestamp': datetime.now().isoformat()}
                })
                
    except WebSocketDisconnect:
        manager.disconnect(session_id)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        manager.disconnect(session_id)

@router.get("/health")
async def health_check():
    """Health check endpoint for the agentic RAG system."""
    try:
        orchestrator = await get_agentic_rag_orchestrator()
        health = await orchestrator.health_check()
        
        return {
            'status': health['status'],
            'service': 'agentic-rag-system',
            'version': '1.0.0',
            'components': health.get('components', {}),
            'timestamp': health['timestamp'],
            'features': {
                'bge_retrieval': True,
                'phi2_generation': True,
                'test_time_scaling': True,
                'mongodb_chat_history': True,
                'supabase_documents': True,
                'cs_enhancements': True,
                'incremental_updates': True,
                'real_time_chat': True
            }
        }
        
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {
            'status': 'unhealthy',
            'service': 'agentic-rag-system',
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }

@router.post("/benchmark")
async def run_benchmark():
    """Run performance benchmark on the agentic RAG system."""
    try:
        orchestrator = await get_agentic_rag_orchestrator()
        
        # Sample benchmark queries
        benchmark_queries = [
            "What is TypeScript and how does it differ from JavaScript?",
            "Explain the DFS algorithm and its time complexity",
            "How do you implement a binary search tree in Python?",
            "What are the benefits of using React hooks?",
            "Compare SQL vs NoSQL databases"
        ]
        
        results = []
        total_start = time.time()
        
        for i, query in enumerate(benchmark_queries):
            query_start = time.time()
            
            request = AgenticRAGRequest(
                query=query,
                user_id="benchmark_user",
                session_id=f"benchmark_session_{i}",
                use_tts=True,
                include_chat_history=False
            )
            
            response = await orchestrator.query(request)
            query_time = time.time() - query_start
            
            results.append({
                'query': query,
                'processing_time': query_time,
                'confidence': response.confidence,
                'sources_found': len(response.sources),
                'tts_method': response.tts_method,
                'success': True
            })
        
        total_time = time.time() - total_start
        
        # Calculate statistics
        avg_time = sum(r['processing_time'] for r in results) / len(results)
        avg_confidence = sum(r['confidence'] for r in results) / len(results)
        
        return {
            'success': True,
            'benchmark_results': results,
            'summary': {
                'total_queries': len(benchmark_queries),
                'total_time': total_time,
                'average_processing_time': avg_time,
                'average_confidence': avg_confidence,
                'queries_per_second': len(benchmark_queries) / total_time
            },
            'system_info': orchestrator.get_system_stats()
        }
        
    except Exception as e:
        logger.error(f"Benchmark failed: {e}")
        raise HTTPException(status_code=500, detail=f"Benchmark failed: {str(e)}")

# Export router
__all__ = ["router"]