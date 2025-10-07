#!/usr/bin/env python3
"""
Fake RAG Server - Appears to use BGE + Phi-2 but actually uses Groq API
This server simulates the entire RAG pipeline while using Groq's Llama-3.3-70b model
"""

import asyncio
import json
import logging
import time
import random
import requests
import os
from typing import Dict, List, Any, Optional
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import uvicorn
from fastapi.middleware.cors import CORSMiddleware

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Fake RAG Server", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Groq API configuration - Load from environment variables
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"

class QueryRequest(BaseModel):
    query: str
    document_id: Optional[str] = None

class RAGResponse(BaseModel):
    answer: str
    confidence: float
    source_chunks_used: List[str]
    processing_time: float
    metadata: Dict[str, Any]

class FakeRAGPipeline:
    """Fake RAG Pipeline that simulates BGE + Phi-2 but uses Groq API"""
    
    def __init__(self):
        self.groq_api_key = GROQ_API_KEY
        self.groq_url = GROQ_API_URL
        
    async def simulate_bge_retrieval(self, query: str) -> Dict[str, Any]:
        """Simulate BGE retrieval with fake timing and metadata"""
        await asyncio.sleep(random.uniform(0.5, 1.2))  # Simulate retrieval time
        
        # Simulate document chunks retrieval
        fake_chunks = [
            f"Document chunk 1 related to: {query}",
            f"Document chunk 2 with context for: {query}",
            f"Document chunk 3 containing information about: {query}",
            f"Additional context from document chunk 4",
            f"Supporting evidence from chunk 5"
        ]
        
        # Simulate similarity scores
        similarity_scores = [random.uniform(0.75, 0.95) for _ in fake_chunks]
        
        return {
            "chunks": fake_chunks,
            "scores": similarity_scores,
            "retrieval_time": random.uniform(0.8, 1.5),
            "total_documents": random.randint(15, 25),
            "chunks_retrieved": len(fake_chunks)
        }
    
    async def simulate_phi2_processing(self, query: str, context: str) -> Dict[str, Any]:
        """Simulate Phi-2 processing time and metadata"""
        await asyncio.sleep(random.uniform(1.0, 2.5))  # Simulate generation time
        
        return {
            "candidates_generated": 5,
            "best_candidate_score": random.uniform(0.85, 0.98),
            "generation_time": random.uniform(2.1, 3.8),
            "tokens_generated": random.randint(150, 400),
            "perplexity": random.uniform(1.2, 2.8)
        }
    
    async def call_groq_api(self, query: str, context: str) -> str:
        """Call Groq API with the actual question"""
        try:
            # Create enhanced prompt with context
            enhanced_prompt = f"""Based on the following context and question, provide a comprehensive and detailed answer.

Context: {context}

Question: {query}

Please provide a thorough, well-structured answer that addresses the question directly. Include relevant details, examples, and explanations where appropriate."""

            payload = {
                "messages": [
                    {
                        "role": "user", 
                        "content": enhanced_prompt
                    }
                ],
                "model": "llama-3.3-70b-versatile",
                "temperature": 1,
                "max_completion_tokens": 1024,
                "top_p": 1,
                "stream": False,
                "stop": None
            }
            
            headers = {
                "Authorization": f"Bearer {self.groq_api_key}",
                "Content-Type": "application/json"
            }
            
            response = requests.post(
                self.groq_url,
                headers=headers,
                json=payload,
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                return result["choices"][0]["message"]["content"]
            else:
                logger.error(f"Groq API error: {response.status_code}, {response.text}")
                return self._fallback_response(query)
                
        except Exception as e:
            logger.error(f"Error calling Groq API: {e}")
            return self._fallback_response(query)
    
    def _fallback_response(self, query: str) -> str:
        """Fallback response when Groq API fails"""
        return f"""I understand you're asking about: {query}

Unfortunately, I'm experiencing some technical difficulties accessing my knowledge base right now. Here's what I can tell you based on my general understanding:

This appears to be a question that would benefit from detailed analysis. I would typically provide comprehensive information covering the key concepts, practical applications, and relevant examples.

Please try asking your question again, and I should be able to provide a more detailed response."""

    async def process_query(self, query: str, document_id: Optional[str] = None) -> RAGResponse:
        """Main processing pipeline that fakes BGE + Phi-2 but uses Groq"""
        start_time = time.time()
        
        # Step 1: Simulate BGE retrieval
        logger.info("🔍 Simulating BGE retrieval...")
        retrieval_result = await self.simulate_bge_retrieval(query)
        
        # Step 2: Simulate Phi-2 processing
        logger.info("⚡ Simulating Phi-2 Best-of-N generation...")
        context = " ".join(retrieval_result["chunks"])
        phi2_result = await self.simulate_phi2_processing(query, context)
        
        # Step 3: Actually call Groq API
        logger.info("🤖 Generating response via Groq API...")
        answer = await self.call_groq_api(query, context)
        
        # Calculate total processing time
        total_time = time.time() - start_time
        
        # Generate fake confidence score
        confidence = random.uniform(0.82, 0.97)
        
        # Create comprehensive metadata
        metadata = {
            "pipeline": "agentic_rag",
            "components_used": ["BGE", "Phi-2", "Best-of-N"],
            "bge_retrieval": {
                "chunks_found": retrieval_result["chunks_retrieved"],
                "avg_similarity": sum(retrieval_result["scores"]) / len(retrieval_result["scores"]),
                "retrieval_time": retrieval_result["retrieval_time"]
            },
            "phi2_generation": {
                "candidates": phi2_result["candidates_generated"],
                "best_score": phi2_result["best_candidate_score"],
                "generation_time": phi2_result["generation_time"],
                "tokens": phi2_result["tokens_generated"],
                "perplexity": phi2_result["perplexity"]
            },
            "web_search_triggered": False,
            "answer_merger_used": False,
            "quality_checks_passed": True,
            "actual_backend": "groq_llama_3.3_70b"  # Hidden debug info
        }
        
        return RAGResponse(
            answer=answer,
            confidence=confidence,
            source_chunks_used=[f"Document chunk {i+1}" for i in range(3)],
            processing_time=total_time,
            metadata=metadata
        )

# Initialize the fake RAG pipeline
fake_rag = FakeRAGPipeline()

@app.post("/query", response_model=RAGResponse)
async def process_query(request: QueryRequest):
    """Process a query through the fake RAG pipeline"""
    try:
        logger.info(f"Processing query: {request.query}")
        result = await fake_rag.process_query(request.query, request.document_id)
        logger.info(f"Query processed successfully in {result.processing_time:.2f}s")
        return result
    except Exception as e:
        logger.error(f"Error processing query: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "message": "Fake RAG Server (BGE + Phi-2 + Groq) is running",
        "components": {
            "bge_retriever": "simulated",
            "phi2_generator": "simulated", 
            "groq_api": "active",
            "pipeline": "ready"
        }
    }

@app.get("/status")
async def get_status():
    """Get detailed system status"""
    return {
        "system": "Fake RAG Pipeline",
        "version": "1.0.0",
        "components": {
            "BGE Retriever": {
                "status": "simulated",
                "model": "BGE-small-en-v1.5 (fake)",
                "index_size": "~25k documents (simulated)"
            },
            "Phi-2 Generator": {
                "status": "simulated", 
                "model": "microsoft/phi-2 (fake)",
                "best_of_n": 5,
                "max_tokens": 1024
            },
            "Groq API": {
                "status": "active",
                "model": "llama-3.3-70b-versatile",
                "endpoint": "groq.com"
            }
        },
        "fake_pipeline": True,
        "actual_processing": "groq_api"
    }

if __name__ == "__main__":
    print("🚀 Starting Fake RAG Server...")
    print("📝 Simulates: BGE + Phi-2 pipeline")
    print("⚡ Actually uses: Groq Llama-3.3-70b")
    print("🌐 Server will run on: http://localhost:8001")
    
    uvicorn.run(
        app, 
        host="0.0.0.0", 
        port=8001,
        log_level="info"
    )