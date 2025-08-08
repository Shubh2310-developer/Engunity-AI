#!/usr/bin/env python3
"""
Server startup script for Engunity AI Backend
"""

import sys
import os
import logging
from pathlib import Path

# Add the backend directory to Python path
backend_dir = Path(__file__).parent
app_dir = backend_dir / "app"
sys.path.insert(0, str(backend_dir))
sys.path.insert(0, str(app_dir))

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def main():
    """Start the FastAPI server"""
    try:
        # Import after path setup
        import uvicorn
        from app.main import app
        
        logger.info("Starting Engunity AI Backend server...")
        logger.info(f"Backend directory: {backend_dir}")
        logger.info(f"App directory: {app_dir}")
        
        # Start server
        uvicorn.run(
            app,
            host="0.0.0.0",
            port=8000,
            reload=False,  # Disable reload to avoid path issues
            log_level="info"
        )
        
    except Exception as e:
        logger.error(f"Failed to start server: {e}")
        raise

if __name__ == "__main__":
    main()