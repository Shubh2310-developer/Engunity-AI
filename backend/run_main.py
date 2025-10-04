#!/usr/bin/env python3
"""
Engunity AI Backend - Main Entry Point
Fixed version with proper imports and path setup
"""

import sys
import os
from pathlib import Path

# Add backend directory to Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

# Now import the main application
from app.main import app

if __name__ == "__main__":
    import uvicorn
    import argparse

    # Parse command line arguments
    parser = argparse.ArgumentParser(description='Engunity AI Backend')
    parser.add_argument('--port', type=int, default=None, help='Port to run the server on')
    parser.add_argument('--host', type=str, default="0.0.0.0", help='Host to bind to')
    args = parser.parse_args()

    # Determine port from args, environment, or default
    port = args.port or int(os.getenv('PORT', 8000))

    print(f"Starting Engunity AI Backend server on {args.host}:{port}...")
    uvicorn.run(
        app,
        host=args.host,
        port=port,
        reload=False,  # Disable reload for production stability
        log_level="info"
    )