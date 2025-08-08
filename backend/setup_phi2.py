#!/usr/bin/env python3
"""
Setup script for Phi-2 based document analysis system
"""

import subprocess
import sys
import os
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def install_requirements():
    """Install required packages"""
    try:
        logger.info("Installing Phi-2 dependencies...")
        subprocess.check_call([
            sys.executable, "-m", "pip", "install", 
            "-r", "requirements_phi2.txt", 
            "--upgrade"
        ])
        logger.info("Dependencies installed successfully")
    except subprocess.CalledProcessError as e:
        logger.error(f"Failed to install dependencies: {e}")
        return False
    return True

def test_phi2_import():
    """Test if Phi-2 can be imported"""
    try:
        import torch
        from transformers import AutoTokenizer, AutoModelForCausalLM
        
        logger.info(f"PyTorch version: {torch.__version__}")
        logger.info(f"CUDA available: {torch.cuda.is_available()}")
        
        if torch.cuda.is_available():
            logger.info(f"GPU memory: {torch.cuda.get_device_properties(0).total_memory / 1024**3:.1f} GB")
        
        # Try to load tokenizer only (lighter test)
        tokenizer = AutoTokenizer.from_pretrained("microsoft/phi-2", trust_remote_code=True)
        logger.info("Phi-2 tokenizer loaded successfully")
        
        return True
    except Exception as e:
        logger.error(f"Error testing Phi-2: {e}")
        return False

def main():
    """Main setup function"""
    logger.info("Setting up Phi-2 document analysis system...")
    
    # Install requirements
    if not install_requirements():
        logger.error("Setup failed - could not install requirements")
        return False
    
    # Test imports
    if not test_phi2_import():
        logger.error("Setup failed - Phi-2 import test failed")
        return False
    
    logger.info("✅ Phi-2 setup completed successfully!")
    logger.info("You can now use the document analysis system with Phi-2 model")
    
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)