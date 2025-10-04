#!/usr/bin/env python3
"""
Simple Agentic RAG Server
=========================

Lightweight server for testing the Agentic RAG system without complex dependencies.
"""

import sys
import os
import asyncio
import logging
from pathlib import Path
from typing import Dict, Any, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import uvicorn

# Add backend to path
backend_dir = Path(__file__).parent
app_dir = backend_dir / "app"
sys.path.insert(0, str(backend_dir))
sys.path.insert(0, str(app_dir))

# Import only the core RAG components (without MongoDB)
try:
    from app.services.rag.bge_retriever import BGERetriever, create_bge_retriever
    from app.services.rag.phi2_generator import Phi2Generator, create_phi2_generator, RAGContext
    from app.services.rag.agentic_web_crawler import AgenticWebCrawler, create_agentic_web_crawler
    from app.services.rag.answer_merger import AnswerMerger, AnswerSource, create_answer_merger
except ImportError as e:
    print(f"Import error: {e}")
    sys.exit(1)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="Simple Agentic RAG Server",
    description="Lightweight Agentic RAG System for Testing",
    version="1.0.0",
    docs_url="/docs"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global components
retriever: Optional[BGERetriever] = None
generator: Optional[Phi2Generator] = None
web_crawler: Optional[AgenticWebCrawler] = None
merger: Optional[AnswerMerger] = None

# Pydantic models
class SimpleQueryRequest(BaseModel):
    query: str = Field(..., description="User query", min_length=1, max_length=2000)
    use_web_search: bool = Field(True, description="Enable web search if confidence is low")
    confidence_threshold: float = Field(0.75, description="Confidence threshold for web search")

class SimpleQueryResponse(BaseModel):
    query: str
    answer: str
    confidence: float
    processing_time: float
    local_chunks_found: int
    web_search_triggered: bool
    merge_strategy: str
    sources: list

@app.on_event("startup")
async def startup_event():
    """Initialize components on startup."""
    global retriever, generator, web_crawler, merger
    
    try:
        logger.info("🚀 Initializing Simple Agentic RAG System...")
        
        # Initialize BGE Retriever
        logger.info("📚 Loading BGE Retriever...")
        retriever = create_bge_retriever(
            use_existing_index=True,
            index_path="/home/ghost/engunity-ai/backend/models/documents/nq_faiss_index.faiss",
            metadata_path="/home/ghost/engunity-ai/backend/models/documents/nq_metadata.pkl"
        )
        
        # Initialize Phi-2 Generator
        logger.info("🤖 Loading Phi-2 Generator...")
        generator = create_phi2_generator(
            use_quantization=True,
            temperature=0.7
        )
        
        # Initialize Web Crawler
        logger.info("🌐 Loading Web Crawler...")
        web_crawler = create_agentic_web_crawler(
            gemini_api_key=os.getenv('GEMINI_API_KEY'),
            max_results=3
        )
        
        # Initialize Answer Merger
        logger.info("🔀 Loading Answer Merger...")
        merger = create_answer_merger()
        
        logger.info("✅ Simple Agentic RAG System initialized successfully!")
        
    except Exception as e:
        logger.error(f"❌ Failed to initialize: {e}")
        raise

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "simple-agentic-rag",
        "components": {
            "retriever": retriever is not None,
            "generator": generator is not None,
            "web_crawler": web_crawler is not None,
            "merger": merger is not None
        }
    }

@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "Simple Agentic RAG Server",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health",
        "query_endpoint": "/query"
    }

@app.post("/query", response_model=SimpleQueryResponse)
async def process_query(request: SimpleQueryRequest):
    """Process a query through the Agentic RAG pipeline."""
    import time
    
    start_time = time.time()
    
    try:
        logger.info(f"🔍 Processing query: {request.query[:100]}...")
        
        # Step 1: Local Retrieval
        local_results = retriever.retrieve(
            query=request.query,
            top_k=5,
            score_threshold=0.1
        )
        
        # Step 2: Local Generation
        if local_results:
            context_text = '\n\n'.join([r.content for r in local_results])
            rag_context = RAGContext(
                documents=[r.to_dict() for r in local_results],
                query=request.query,
                context_text=context_text,
                metadata={}
            )
            
            # Use Best-of-N generation
            generation_result = generator.generate_best_of_n(
                query=request.query,
                context=rag_context,
                n=5,
                max_new_tokens=200
            )
            
            local_answer_text = generation_result['best_response']
            local_confidence = generation_result['confidence']
        else:
            local_answer_text = "No relevant information found in local documents."
            local_confidence = 0.1
        
        # Step 3: Web Search Decision
        web_search_triggered = local_confidence < request.confidence_threshold
        web_answers = []
        
        if web_search_triggered and web_crawler:
            try:
                logger.info(f"🌐 Triggering web search (confidence: {local_confidence:.3f} < {request.confidence_threshold:.3f})")
                
                web_results = await web_crawler.crawl(
                    original_query=request.query,
                    context_keywords=[],
                    confidence_threshold=request.confidence_threshold,
                    local_confidence=local_confidence
                )
                
                for web_result in web_results:
                    web_answer = AnswerSource(
                        content=web_result.summary or web_result.content[:500],
                        confidence=web_result.relevance_score,
                        source_type='web',
                        metadata=web_result.metadata
                    )
                    web_answers.append(web_answer)
                    
            except Exception as e:
                logger.warning(f"Web search failed: {e}")
        
        # Step 4: Answer Merging
        local_answer = AnswerSource(
            content=local_answer_text,
            confidence=local_confidence,
            source_type='local',
            metadata={'retrieval_results': len(local_results)}
        )
        
        merge_result = merger.merge_answers(
            local_answer=local_answer,
            web_answers=web_answers,
            query=request.query
        )
        
        # Prepare sources
        sources = []
        for result in local_results[:3]:
            sources.append({
                'type': 'local',
                'content': result.content[:200] + '...',
                'score': result.score
            })
        
        for web_answer in web_answers:
            sources.append({
                'type': 'web',
                'content': web_answer.content[:200] + '...',
                'confidence': web_answer.confidence
            })
        
        processing_time = time.time() - start_time
        
        response = SimpleQueryResponse(
            query=request.query,
            answer=merge_result.final_answer,
            confidence=merge_result.confidence,
            processing_time=processing_time,
            local_chunks_found=len(local_results),
            web_search_triggered=web_search_triggered,
            merge_strategy=merge_result.merge_strategy,
            sources=sources
        )
        
        logger.info(f"✅ Query processed in {processing_time:.3f}s, confidence: {response.confidence:.3f}")
        return response
        
    except Exception as e:
        logger.error(f"❌ Error processing query: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    print("🚀 Starting Simple Agentic RAG Server on port 8000...")
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")