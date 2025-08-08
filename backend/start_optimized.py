#!/usr/bin/env python3
"""
Optimized startup script for the RAG backend
"""

import uvicorn
import logging
import os
import sys

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def main():
    """Start the optimized RAG backend"""
    
    # Environment variables
    host = os.getenv('HOST', '0.0.0.0')
    port = int(os.getenv('PORT', 8000))
    
    logger.info(f"Starting optimized RAG backend on {host}:{port}")
    logger.info("Features enabled:")
    logger.info("- Fast document processing")
    logger.info("- Phi-2 model support")
    logger.info("- Timeout handling")
    logger.info("- Intelligent fallbacks")

    try:
        uvicorn.run(
            "app.main:app",
            host=host,
            port=port,
            reload=False,  # Disable for production performance
            workers=1,     # Single worker for GPU memory management
            timeout_keep_alive=30,
            timeout_graceful_shutdown=10,
            log_level="info",
            access_log=True
        )
    except KeyboardInterrupt:
        logger.info("Server stopped by user")
    except Exception as e:
        logger.error(f"Server failed to start: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()