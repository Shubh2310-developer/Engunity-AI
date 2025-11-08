#!/usr/bin/env python3
"""
Complete Model Installation Script for Engunity AI
==================================================
Installs all required models based on git commits and project requirements
"""

import os
import sys
import subprocess
import logging
from pathlib import Path

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def check_python_version():
    """Check if Python version is compatible"""
    if sys.version_info < (3, 8):
        logger.error("Python 3.8+ required. Current version: %s", sys.version)
        return False
    logger.info("✅ Python version: %s", sys.version.split()[0])
    return True

def install_base_requirements():
    """Install base ML dependencies"""
    logger.info("📦 Installing base requirements...")
    
    base_packages = [
        "torch>=2.1.0",
        "transformers>=4.40.0", 
        "sentence-transformers>=2.7.0",
        "accelerate>=0.24.0",
        "faiss-cpu>=1.8.0",
        "numpy>=1.24.0",
        "tqdm"
    ]
    
    try:
        for package in base_packages:
            logger.info(f"Installing {package}...")
            subprocess.check_call([sys.executable, "-m", "pip", "install", package, "--upgrade"])
        return True
    except subprocess.CalledProcessError as e:
        logger.error(f"Failed to install base requirements: {e}")
        return False

def download_model(model_name, model_type="sentence-transformer"):
    """Download a specific model"""
    logger.info(f"🔄 Downloading {model_name}...")
    
    try:
        if model_type == "sentence-transformer":
            # Use sentence-transformers for BGE and cross-encoder models
            code = f"""
from sentence_transformers import SentenceTransformer, CrossEncoder
import torch

try:
    if 'cross-encoder' in '{model_name}':
        model = CrossEncoder('{model_name}')
        logger.info('✅ Cross-encoder model loaded: {model_name}')
    else:
        model = SentenceTransformer('{model_name}')
        logger.info('✅ SentenceTransformer model loaded: {model_name}')
    print('SUCCESS: {model_name}')
except Exception as e:
    print(f'ERROR: {model_name} - {{e}}')
"""
        elif model_type == "transformers":
            # Use transformers for Phi-2
            code = f"""
from transformers import AutoTokenizer, AutoModel
import torch

try:
    tokenizer = AutoTokenizer.from_pretrained('{model_name}', trust_remote_code=True)
    model = AutoModel.from_pretrained('{model_name}', trust_remote_code=True)
    print('SUCCESS: {model_name}')
except Exception as e:
    print(f'ERROR: {model_name} - {{e}}')
"""
        
        result = subprocess.run([sys.executable, "-c", code], 
                              capture_output=True, text=True, timeout=600)
        
        if "SUCCESS" in result.stdout:
            logger.info(f"✅ {model_name} downloaded successfully")
            return True
        else:
            logger.error(f"❌ Failed to download {model_name}: {result.stderr}")
            return False
            
    except subprocess.TimeoutExpired:
        logger.error(f"❌ Timeout downloading {model_name}")
        return False
    except Exception as e:
        logger.error(f"❌ Error downloading {model_name}: {e}")
        return False

def install_all_models():
    """Install all required models based on project configuration"""
    
    models_config = {
        # BGE Embedding Models (from git commits and env files)
        "BAAI/bge-small-en-v1.5": "sentence-transformer",    # Primary development model
        "BAAI/bge-base-en-v1.5": "sentence-transformer",     # Balanced performance 
        "BAAI/bge-large-en-v1.5": "sentence-transformer",    # Production model
        "BAAI/bge-reranker-base": "sentence-transformer",    # Enhanced reranking
        
        # Cross-Encoder for Reranking (from requirements and code)
        "cross-encoder/ms-marco-MiniLM-L-6-v2": "sentence-transformer",
        
        # Microsoft Phi-2 for Text Generation (from multiple commits)
        "microsoft/phi-2": "transformers",
    }
    
    logger.info("🚀 Starting complete model installation...")
    logger.info(f"📊 Total models to install: {len(models_config)}")
    
    success_count = 0
    failed_models = []
    
    for model_name, model_type in models_config.items():
        logger.info(f"\n{'='*60}")
        logger.info(f"Installing: {model_name}")
        logger.info(f"Type: {model_type}")
        
        if download_model(model_name, model_type):
            success_count += 1
        else:
            failed_models.append(model_name)
    
    # Summary
    logger.info(f"\n{'='*60}")
    logger.info(f"📊 Installation Summary:")
    logger.info(f"✅ Successfully installed: {success_count}/{len(models_config)}")
    
    if failed_models:
        logger.error(f"❌ Failed models: {failed_models}")
        return False
    else:
        logger.info("🎉 All models installed successfully!")
        return True

def verify_installation():
    """Verify that all models are working"""
    logger.info("\n🔍 Verifying model installation...")
    
    verification_code = """
import sys
try:
    # Test BGE models
    from sentence_transformers import SentenceTransformer
    
    # Test small model (most commonly used)
    bge_small = SentenceTransformer('BAAI/bge-small-en-v1.5')
    test_embedding = bge_small.encode("This is a test sentence.")
    print(f"✅ BGE-small: Embedding shape {test_embedding.shape}")
    
    # Test cross-encoder
    from sentence_transformers import CrossEncoder
    cross_encoder = CrossEncoder('cross-encoder/ms-marco-MiniLM-L-6-v2')
    score = cross_encoder.predict([("query", "document")])
    print(f"✅ Cross-encoder: Score {score}")
    
    # Test Phi-2 tokenizer (lighter test)
    from transformers import AutoTokenizer
    phi2_tokenizer = AutoTokenizer.from_pretrained('microsoft/phi-2', trust_remote_code=True)
    tokens = phi2_tokenizer.encode("Test text")
    print(f"✅ Phi-2 tokenizer: {len(tokens)} tokens")
    
    print("SUCCESS: All models verified")
    
except Exception as e:
    print(f"ERROR: Verification failed - {e}")
    sys.exit(1)
"""
    
    try:
        result = subprocess.run([sys.executable, "-c", verification_code], 
                              capture_output=True, text=True, timeout=300)
        
        if "SUCCESS" in result.stdout:
            logger.info("✅ All models verified successfully!")
            return True
        else:
            logger.error(f"❌ Verification failed: {result.stderr}")
            return False
            
    except Exception as e:
        logger.error(f"❌ Verification error: {e}")
        return False

def display_storage_info():
    """Display storage requirements and model locations"""
    logger.info("\n💾 Storage Information:")
    logger.info("├── BGE-small-en-v1.5:     ~133MB")
    logger.info("├── BGE-base-en-v1.5:      ~438MB") 
    logger.info("├── BGE-large-en-v1.5:     ~1.34GB")
    logger.info("├── BGE-reranker-base:     ~278MB")
    logger.info("├── Cross-encoder:         ~90MB")
    logger.info("├── microsoft/phi-2:       ~5.2GB")
    logger.info("└── Total estimated:       ~7.5GB")
    logger.info("\n📁 Models will be stored in: ~/.cache/huggingface/")

def main():
    """Main installation function"""
    print("🤖 Engunity AI - Complete Models Installation")
    print("=" * 50)
    
    # Check prerequisites
    if not check_python_version():
        return False
    
    # Display storage info
    display_storage_info()
    
    # Confirm installation
    try:
        confirm = input("\n➡️  Proceed with installation? [y/N]: ").lower().strip()
        if confirm not in ['y', 'yes']:
            logger.info("Installation cancelled by user")
            return False
    except KeyboardInterrupt:
        logger.info("\nInstallation cancelled by user")
        return False
    
    # Install base requirements
    if not install_base_requirements():
        logger.error("Failed to install base requirements")
        return False
    
    # Install all models
    if not install_all_models():
        logger.error("Model installation failed")
        return False
    
    # Verify installation
    if not verify_installation():
        logger.error("Model verification failed")
        return False
    
    # Success message
    print("\n" + "🎉" * 20)
    print("✅ INSTALLATION COMPLETE!")
    print("🎉" * 20)
    print("\n📝 Next steps:")
    print("1. cd backend && python preload_models.py")
    print("2. ./start-app.sh")
    print("3. Test the RAG system at http://localhost:3000")
    
    return True

if __name__ == "__main__":
    try:
        success = main()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n\n⚠️  Installation interrupted by user")
        sys.exit(1)
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        sys.exit(1)