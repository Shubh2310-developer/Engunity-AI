#!/usr/bin/env python3
"""
Engunity AI - Model Setup and Preloader
Automatically downloads and caches all required models
"""

import os
import sys
import torch
from pathlib import Path
import logging

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def check_gpu():
    """Check GPU availability and memory"""
    if torch.cuda.is_available():
        gpu_name = torch.cuda.get_device_name(0)
        gpu_memory = torch.cuda.get_device_properties(0).total_memory / 1024**3
        logger.info(f"GPU Available: {gpu_name} ({gpu_memory:.1f}GB)")
        return True
    else:
        logger.info("No GPU available, using CPU")
        return False

def setup_embedding_models():
    """Setup embedding models used throughout the system"""
    logger.info("Setting up embedding models...")
    
    try:
        from sentence_transformers import SentenceTransformer
        
        # BGE Small model - primary embedding model
        logger.info("Loading BGE Small embedding model...")
        bge_model = SentenceTransformer('BAAI/bge-small-en-v1.5')
        logger.info("✅ BGE Small model loaded successfully")
        
        # Cross-encoder for reranking
        logger.info("Loading Cross-encoder reranking model...")
        from sentence_transformers.cross_encoder import CrossEncoder
        cross_encoder = CrossEncoder('cross-encoder/ms-marco-MiniLM-L-6-v2')
        logger.info("✅ Cross-encoder model loaded successfully")
        
        return True
    except Exception as e:
        logger.error(f"❌ Error loading embedding models: {e}")
        return False

def setup_phi2_model():
    """Setup Phi-2 model for document analysis"""
    logger.info("Setting up Phi-2 model...")
    
    try:
        from transformers import AutoTokenizer, AutoModelForCausalLM
        
        model_name = "microsoft/phi-2"
        logger.info(f"Loading Phi-2 model: {model_name}")
        
        # Load tokenizer
        tokenizer = AutoTokenizer.from_pretrained(model_name, trust_remote_code=True)
        
        # Load model with appropriate settings for RTX 4050
        model = AutoModelForCausalLM.from_pretrained(
            model_name,
            torch_dtype=torch.float16 if torch.cuda.is_available() else torch.float32,
            device_map="auto" if torch.cuda.is_available() else None,
            trust_remote_code=True,
            load_in_4bit=True if torch.cuda.is_available() else False
        )
        
        logger.info("✅ Phi-2 model loaded successfully")
        return True
    except Exception as e:
        logger.error(f"❌ Error loading Phi-2 model: {e}")
        return False

def setup_citation_classifier():
    """Setup citation classification model"""
    logger.info("Setting up citation classifier...")
    
    try:
        from transformers import AutoTokenizer, AutoModelForSequenceClassification
        
        # Check if local citation classifier exists
        local_model_path = "citation_classifier_arxiv"
        if os.path.exists(local_model_path):
            logger.info("Loading local citation classifier...")
            tokenizer = AutoTokenizer.from_pretrained(local_model_path)
            model = AutoModelForSequenceClassification.from_pretrained(local_model_path)
            logger.info("✅ Local citation classifier loaded successfully")
        else:
            logger.info("Using BERT base for citation classification...")
            tokenizer = AutoTokenizer.from_pretrained('bert-base-uncased')
            model = AutoModelForSequenceClassification.from_pretrained('bert-base-uncased', num_labels=5)
            logger.info("✅ BERT citation classifier loaded successfully")
        
        return True
    except Exception as e:
        logger.error(f"❌ Error loading citation classifier: {e}")
        return False

def setup_vector_store():
    """Setup FAISS vector store"""
    logger.info("Setting up vector store...")
    
    try:
        import faiss
        import numpy as np
        
        # Create vector store directory
        vector_store_dir = Path("backend/vector_store/indices")
        vector_store_dir.mkdir(parents=True, exist_ok=True)
        
        # Test FAISS functionality
        dimension = 384  # BGE-small dimension
        test_index = faiss.IndexFlatL2(dimension)
        test_vectors = np.random.random((10, dimension)).astype('float32')
        test_index.add(test_vectors)
        
        logger.info("✅ Vector store setup completed")
        return True
    except Exception as e:
        logger.error(f"❌ Error setting up vector store: {e}")
        return False

def create_model_cache_dirs():
    """Create necessary model cache directories"""
    logger.info("Creating model cache directories...")
    
    dirs_to_create = [
        "backend/models/production",
        "backend/models/cache", 
        "backend/vector_store/indices",
        "backend/data/documents",
        "backend/data/embeddings"
    ]
    
    for dir_path in dirs_to_create:
        Path(dir_path).mkdir(parents=True, exist_ok=True)
        logger.info(f"✅ Created directory: {dir_path}")

def check_dependencies():
    """Check if all required dependencies are installed"""
    logger.info("Checking dependencies...")
    
    required_packages = [
        'torch',
        'transformers', 
        'sentence_transformers',
        'faiss_cpu',
        'numpy',
        'accelerate',
        'bitsandbytes'
    ]
    
    missing_packages = []
    for package in required_packages:
        try:
            __import__(package.replace('_', '-'))
            logger.info(f"✅ {package} is available")
        except ImportError:
            missing_packages.append(package)
            logger.error(f"❌ {package} is missing")
    
    if missing_packages:
        logger.error(f"Missing packages: {missing_packages}")
        logger.info("Install missing packages with: pip install " + " ".join(missing_packages))
        return False
    
    return True

def main():
    """Main setup function"""
    logger.info("🚀 Starting Engunity AI Model Setup...")
    
    # Check dependencies first
    if not check_dependencies():
        logger.error("❌ Dependency check failed. Please install missing packages.")
        return False
    
    # Check GPU
    gpu_available = check_gpu()
    
    # Create cache directories
    create_model_cache_dirs()
    
    # Setup models
    success_count = 0
    total_models = 4
    
    if setup_embedding_models():
        success_count += 1
    
    if setup_phi2_model():
        success_count += 1
    
    if setup_citation_classifier():
        success_count += 1
        
    if setup_vector_store():
        success_count += 1
    
    # Summary
    logger.info(f"\n🎯 Model Setup Summary:")
    logger.info(f"   Successful: {success_count}/{total_models}")
    logger.info(f"   GPU Available: {gpu_available}")
    
    if success_count == total_models:
        logger.info("✅ All models setup successfully!")
        logger.info("🚀 Ready to start Engunity AI services")
        return True
    else:
        logger.warning(f"⚠️  {total_models - success_count} models failed to setup")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)