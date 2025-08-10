#!/usr/bin/env python3
"""
Citation Classification FastAPI Server
Serves the hybrid citation classifier with rule-based + ML classification
"""

import sys
import os
from pathlib import Path

# Add the project root to Python path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict
import uvicorn
import logging
import asyncio

# Import our classification API
from app.api.research.classify_citations import (
    HybridCitationClassifier, 
    CitationRequest, 
    BatchClassificationResponse,
    ClassificationResponse
)

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Citation Classification Service",
    description="AI-powered citation classification using hybrid rule-based + ML approach",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001", 
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global classifier instance
classifier = None

@app.on_event("startup")
async def startup_event():
    """Initialize the citation classifier on startup"""
    global classifier
    try:
        logger.info("🚀 Initializing Citation Classification Service...")
        
        # Check if model exists
        model_path = "/home/ghost/engunity-ai/backend/training/citation_classifier_arxiv/checkpoint-1501"
        if not os.path.exists(model_path):
            logger.warning(f"⚠️ Model not found at {model_path}")
            logger.info("🔧 Using rule-based classification only")
        
        # Force CPU mode to avoid CUDA conflicts
        import torch
        torch.cuda.is_available = lambda: False
        
        classifier = HybridCitationClassifier(
            model_path=model_path,
            confidence_threshold=0.6,
            cache_size=10000
        )
        
        logger.info("✅ Citation Classification Service ready!")
        logger.info(f"🎯 Supported classes: {classifier.labels}")
        logger.info(f"🧠 Model loaded: {os.path.exists(model_path)}")
        logger.info(f"⚡ Rule patterns: {sum(len(patterns) for patterns in classifier.rule_patterns.values())}")
        
    except Exception as e:
        logger.error(f"❌ Failed to initialize classifier: {e}")
        # Continue startup - we can still use rule-based classification
        classifier = None

@app.get("/")
async def root():
    """Root endpoint with service info"""
    return {
        "service": "Citation Classification API",
        "version": "1.0.0",
        "status": "running",
        "classifier_ready": classifier is not None,
        "endpoints": [
            "/classify-citations",
            "/health",
            "/stats",
            "/docs"
        ]
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "citation-classifier",
        "classifier_initialized": classifier is not None,
        "timestamp": asyncio.get_event_loop().time()
    }

@app.post("/api/research/classify-citations", response_model=BatchClassificationResponse)
async def classify_citations_endpoint(request: CitationRequest):
    """
    Classify citations using hybrid approach
    """
    if not classifier:
        raise HTTPException(
            status_code=503, 
            detail="Citation classifier not available. Please check model files."
        )
    
    try:
        import time
        start_time = time.time()
        
        logger.info(f"🔍 Classifying {len(request.citations)} citations...")
        
        # Batch classify
        results = classifier.batch_classify(request.citations)
        
        # Convert to response format
        response_results = [
            ClassificationResponse(
                predicted_class=result.predicted_class,
                confidence=result.confidence,
                probabilities=result.probabilities,
                method=result.method,
                normalized_text=result.normalized_text,
                processing_time=result.processing_time
            )
            for result in results
        ]
        
        # Calculate statistics
        total_time = time.time() - start_time
        cache_hits = len([r for r in results if r.processing_time < 0.01])
        rule_based = len([r for r in results if r.method == 'rule_based'])
        ml_based = len([r for r in results if r.method == 'ml_model'])
        
        logger.info(f"✅ Classified {len(request.citations)} citations in {total_time:.3f}s "
                   f"(Cache: {cache_hits}, Rules: {rule_based}, ML: {ml_based})")
        
        return BatchClassificationResponse(
            results=response_results,
            total_processing_time=total_time,
            cache_hits=cache_hits,
            rule_based_matches=rule_based,
            ml_classifications=ml_based
        )
    
    except Exception as e:
        logger.error(f"❌ Classification error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/stats")
async def get_classifier_stats():
    """Get classifier statistics"""
    if not classifier:
        return {"error": "Classifier not initialized"}
    
    return {
        "cache_size": len(classifier.classification_cache),
        "max_cache_size": classifier.cache_size,
        "confidence_threshold": classifier.confidence_threshold,
        "model_loaded": classifier._model_loaded,
        "supported_labels": classifier.labels,
        "rule_patterns_count": sum(len(patterns) for patterns in classifier.rule_patterns.values()),
        "device": str(classifier.device)
    }

@app.post("/clear-cache")
async def clear_cache():
    """Clear the classification cache"""
    if not classifier:
        raise HTTPException(status_code=503, detail="Classifier not available")
    
    classifier.classification_cache.clear()
    logger.info("🗑️ Classification cache cleared")
    return {"message": "Classification cache cleared", "cache_size": 0}

@app.get("/demo-classify")
async def demo_classification():
    """Demo endpoint with sample citations"""
    sample_citations = [
        "Following the approach outlined in [Smith et al., 2020], we implement a novel attention mechanism.",
        "Our results outperform the baseline established by [Jones, 2019] by achieving 15% higher accuracy.",
        "Previous research [Brown et al., 2018] has established the theoretical foundation for this work.",
        "These findings are consistent with [Wilson, 2021] and further validate the proposed hypothesis.",
        "For additional implementation details, see [Taylor et al., 2020] supplementary materials."
    ]
    
    if not classifier:
        return {
            "error": "Classifier not available",
            "sample_citations": sample_citations
        }
    
    try:
        results = classifier.batch_classify(sample_citations)
        
        demo_results = []
        for i, (citation, result) in enumerate(zip(sample_citations, results)):
            demo_results.append({
                "citation": citation,
                "predicted_class": result.predicted_class,
                "confidence": round(result.confidence, 3),
                "method": result.method,
                "processing_time": round(result.processing_time * 1000, 1)  # Convert to ms
            })
        
        return {
            "demo_results": demo_results,
            "total_citations": len(sample_citations),
            "message": "Demo classification completed successfully"
        }
        
    except Exception as e:
        logger.error(f"Demo classification failed: {e}")
        return {"error": str(e)}

if __name__ == "__main__":
    logger.info("🚀 Starting Citation Classification Server...")
    
    # Run the server
    uvicorn.run(
        "citation_classification_server:app",
        host="0.0.0.0",
        port=8003,
        reload=False,
        log_level="info",
        access_log=True
    )