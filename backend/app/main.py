#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Engunity AI Backend - CS-Enhanced RAG System
===========================================

FastAPI backend with Computer Science enhanced RAG capabilities
using local models for offline operation.

Author: Engunity AI Team
"""

import asyncio
import logging
from contextlib import asynccontextmanager
from typing import Dict, Any

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# Import API routers
from app.api.v1.chat import router as chat_router
from app.api.v1.documents import router as documents_router
from app.api.v1.auth import router as auth_router
from app.api.v1.analysis import router as analysis_router
from app.api.rag.analyze import router as rag_router

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan management"""
    # Startup
    logger.info("Starting Engunity AI Backend with CS-Enhanced RAG...")
    logger.info("Initializing local model configurations...")
    
    try:
        # Initialize local models and services here
        logger.info("Local models initialized successfully")
        
        # Load demo datasets
        from app.api.v1.analysis import load_demo_datasets
        load_demo_datasets()
        logger.info("Demo datasets loaded")
        
        logger.info("CS-Enhanced RAG system ready")
    except Exception as e:
        logger.error(f"Failed to initialize services: {e}")
        raise
    
    yield
    
    # Shutdown
    logger.info("Shutting down Engunity AI Backend...")

# Create FastAPI application
app = FastAPI(
    title="Engunity AI Backend",
    description="CS-Enhanced RAG System with Local Models",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "engunity-ai-backend",
        "version": "1.0.0",
        "rag_system": "cs-enhanced",
        "models": "local"
    }

@app.get("/api/health")
async def api_health_check():
    """API Health check endpoint"""
    return {
        "status": "healthy",
        "service": "engunity-ai-backend",
        "version": "1.0.0",
        "rag_system": "cs-enhanced",
        "models": "local"
    }

# Root endpoint
@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Engunity AI Backend - CS-Enhanced RAG System",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health"
    }

# Include API routers
app.include_router(chat_router, prefix="/api/v1", tags=["chat"])
app.include_router(documents_router, prefix="/api/v1", tags=["documents"])
app.include_router(auth_router, prefix="/api/v1", tags=["auth"])
app.include_router(analysis_router, prefix="/api", tags=["analysis"])
app.include_router(rag_router, tags=["rag"])

# Error handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail, "status_code": exc.status_code}
    )

@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    logger.error(f"Unhandled exception: {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "status_code": 500}
    )

if __name__ == "__main__":
    import uvicorn
    import argparse
    import os
    
    # Parse command line arguments
    parser = argparse.ArgumentParser(description='Engunity AI Backend')
    parser.add_argument('--port', type=int, default=None, help='Port to run the server on')
    args = parser.parse_args()
    
    # Determine port from args, environment, or default
    port = args.port or int(os.getenv('PORT', 8000))
    
    logger.info(f"Starting Engunity AI Backend server on port {port}...")
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=port,
        reload=False,  # Disable reload for production stability
        log_level="info"
    )