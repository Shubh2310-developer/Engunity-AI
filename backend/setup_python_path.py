#!/usr/bin/env python3
"""
Setup Python Path for Engunity AI Backend
Adds the backend directory to Python path for proper imports
"""

import sys
import os
from pathlib import Path

def setup_python_path():
    """Add backend directory to Python path"""
    backend_dir = Path(__file__).parent
    if str(backend_dir) not in sys.path:
        sys.path.insert(0, str(backend_dir))
    print(f"Added {backend_dir} to Python path")

if __name__ == "__main__":
    setup_python_path()