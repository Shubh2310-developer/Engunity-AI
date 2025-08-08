#!/usr/bin/env python3
"""
Simple script to start the agentic RAG server
"""
import uvicorn
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

if __name__ == "__main__":
    print("Starting Agentic RAG Server...")
    uvicorn.run(
        "agentic_rag_server:app", 
        host="0.0.0.0", 
        port=8000, 
        reload=False,  # Disable reload for testing
        log_level="info"
    )