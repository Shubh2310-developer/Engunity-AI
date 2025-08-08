#!/usr/bin/env python3
"""
RAG System Setup and Training Script
====================================

Complete setup script for the RAG system with BGE-small retriever 
and Phi-2 generator. Handles model downloads, environment setup,
document processing, and system validation.

Usage:
    python setup_rag_system.py --help
    python setup_rag_system.py --setup-all
    python setup_rag_system.py --process-docs /path/to/documents
    python setup_rag_system.py --test-system

Author: Engunity AI Team
"""

import os
import sys
import argparse
import logging
import json
import time
from pathlib import Path
from typing import Dict, List, Optional, Any
import subprocess
import platform
from datetime import datetime

# Add the app directory to Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

try:
    from app.services.rag.rag_pipeline import RAGPipeline, create_rag_pipeline
    from app.services.rag.bge_retriever import create_bge_retriever
    from app.services.rag.phi2_generator import create_phi2_generator
    from app.services.rag.document_processor import create_document_processor
    from app.services.rag.structured_formatter import create_structured_formatter, ResponseFormat
except ImportError as e:
    print(f"Error importing RAG modules: {e}")
    print("Make sure all RAG modules are in place")
    sys.exit(1)

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('rag_setup.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

class RAGSystemSetup:
    """RAG system setup and configuration manager."""
    
    def __init__(self, base_dir: str = "./"):
        self.base_dir = Path(base_dir)
        self.config_file = self.base_dir / "rag_config.json"
        self.models_dir = self.base_dir / "models"
        self.data_dir = self.base_dir / "data"
        self.logs_dir = self.base_dir / "logs"
        
        # Create directories
        for directory in [self.models_dir, self.data_dir, self.logs_dir]:
            directory.mkdir(parents=True, exist_ok=True)
        
        # Default configuration
        self.config = {
            "bge_config": {
                "model_name": "BAAI/bge-small-en-v1.5",
                "index_path": str(self.data_dir / "faiss_index"),
                "device": "auto",
                "max_chunk_size": 512,
                "chunk_overlap": 50
            },
            "phi2_config": {
                "model_name": "microsoft/phi-2",
                "device": "auto",
                "max_length": 2048,
                "use_quantization": True,
                "temperature": 0.7,
                "do_sample": True,
                "top_p": 0.9,
                "top_k": 50
            },
            "processor_config": {
                "storage_path": str(self.data_dir / "documents"),
                "chunk_size": 512,
                "chunk_overlap": 50
            },
            "pipeline_config": {
                "default_retrieval_k": 10,
                "default_generation_tokens": 512,
                "context_window_size": 4000,
                "min_retrieval_score": 0.3,
                "min_confidence_threshold": 0.5,
                "enable_caching": True,
                "cache_ttl": 3600
            }
        }
        
        # Load existing config if available
        self.load_config()
        
        logger.info(f"RAG System Setup initialized in {self.base_dir}")
    
    def load_config(self):
        """Load configuration from file."""
        if self.config_file.exists():
            try:
                with open(self.config_file, 'r') as f:
                    saved_config = json.load(f)
                    self.config.update(saved_config)
                logger.info("Loaded existing configuration")
            except Exception as e:
                logger.warning(f"Failed to load config: {e}")
    
    def save_config(self):
        """Save configuration to file."""
        try:
            with open(self.config_file, 'w') as f:
                json.dump(self.config, f, indent=2)
            logger.info("Configuration saved")
        except Exception as e:
            logger.error(f"Failed to save config: {e}")
    
    def check_system_requirements(self) -> Dict[str, Any]:
        """Check system requirements and availability."""
        logger.info("Checking system requirements...")
        
        requirements = {
            "python_version": sys.version,
            "platform": platform.system(),
            "cpu_count": os.cpu_count(),
            "has_cuda": False,
            "gpu_count": 0,
            "memory_info": {},
            "disk_space": {},
            "required_packages": {}
        }
        
        # Check CUDA availability
        try:
            import torch
            requirements["has_cuda"] = torch.cuda.is_available()
            if requirements["has_cuda"]:
                requirements["gpu_count"] = torch.cuda.device_count()
                requirements["cuda_version"] = torch.version.cuda
        except ImportError:
            requirements["torch_available"] = False
        
        # Check memory
        try:
            import psutil
            memory = psutil.virtual_memory()
            requirements["memory_info"] = {
                "total_gb": round(memory.total / (1024**3), 1),
                "available_gb": round(memory.available / (1024**3), 1),
                "percent_used": memory.percent
            }
            
            disk = psutil.disk_usage(str(self.base_dir))
            requirements["disk_space"] = {
                "total_gb": round(disk.total / (1024**3), 1),
                "free_gb": round(disk.free / (1024**3), 1),
                "percent_used": round((disk.used / disk.total) * 100, 1)
            }
        except ImportError:
            logger.warning("psutil not available - cannot check memory/disk")
        
        # Check required packages
        required_packages = [
            "torch", "transformers", "sentence-transformers", "faiss-cpu",
            "numpy", "scikit-learn", "beautifulsoup4", "PyPDF2", "python-docx"
        ]
        
        for package in required_packages:
            try:
                __import__(package.replace('-', '_'))
                requirements["required_packages"][package] = True
            except ImportError:
                requirements["required_packages"][package] = False
        
        return requirements
    
    def install_requirements(self) -> bool:
        """Install required packages."""
        logger.info("Installing required packages...")
        
        requirements_file = self.base_dir / "requirements_rag.txt"
        
        # Create requirements file if it doesn't exist
        if not requirements_file.exists():
            self.create_requirements_file()
        
        try:
            # Install requirements
            subprocess.check_call([
                sys.executable, "-m", "pip", "install", "-r", str(requirements_file)
            ])
            logger.info("Requirements installed successfully")
            return True
        except subprocess.CalledProcessError as e:
            logger.error(f"Failed to install requirements: {e}")
            return False
    
    def create_requirements_file(self):
        """Create requirements.txt file for RAG system."""
        requirements = [
            "torch>=2.0.0",
            "transformers>=4.35.0",
            "sentence-transformers>=2.2.0",
            "faiss-cpu>=1.7.4",
            "numpy>=1.24.0",
            "scikit-learn>=1.3.0",
            "beautifulsoup4>=4.12.0",
            "PyPDF2>=3.0.0",
            "python-docx>=0.8.11",
            "pdfplumber>=0.9.0",
            "markdown>=3.5.0",
            "psutil>=5.9.0",
            "datasets>=2.14.0",
            "accelerate>=0.21.0",
            "bitsandbytes>=0.41.0"
        ]
        
        requirements_file = self.base_dir / "requirements_rag.txt"
        with open(requirements_file, 'w') as f:
            f.write('\n'.join(requirements))
        
        logger.info(f"Created requirements file: {requirements_file}")
    
    def setup_models(self) -> bool:
        """Setup and validate models."""
        logger.info("Setting up models...")
        
        try:
            # Test BGE retriever
            logger.info("Initializing BGE retriever...")
            bge_retriever = create_bge_retriever(**self.config["bge_config"])
            logger.info("✓ BGE retriever initialized successfully")
            
            # Test Phi-2 generator
            logger.info("Initializing Phi-2 generator...")
            phi2_generator = create_phi2_generator(**self.config["phi2_config"])
            logger.info("✓ Phi-2 generator initialized successfully")
            
            # Test basic functionality
            logger.info("Testing model functionality...")
            
            # Test retriever with sample text
            test_doc = "This is a test document for the RAG system setup. It contains information about machine learning and natural language processing."
            bge_retriever.add_document(
                text=test_doc,
                document_id="test_doc_001",
                metadata={"type": "test", "created_at": datetime.now().isoformat()}
            )
            
            # Test retrieval
            results = bge_retriever.retrieve("machine learning", top_k=1)
            if results:
                logger.info("✓ Document retrieval working")
            else:
                logger.warning("⚠ Document retrieval returned no results")
            
            # Test generation
            test_generation = phi2_generator.generate_response(
                query="What is machine learning?",
                max_new_tokens=50
            )
            if test_generation.text:
                logger.info("✓ Text generation working")
            else:
                logger.warning("⚠ Text generation returned empty result")
            
            return True
            
        except Exception as e:
            logger.error(f"Model setup failed: {e}")
            return False
    
    def process_documents(self, document_paths: List[str]) -> bool:
        """Process documents and add to RAG system."""
        logger.info(f"Processing {len(document_paths)} document paths...")
        
        try:
            # Initialize pipeline
            pipeline = create_rag_pipeline(
                bge_config=self.config["bge_config"],
                phi2_config=self.config["phi2_config"],
                processor_config=self.config["processor_config"],
                **self.config["pipeline_config"]
            )
            
            # Process documents
            processed_docs = pipeline.process_documents(document_paths)
            
            logger.info(f"Successfully processed {len(processed_docs)} documents")
            
            # Save processing results
            processing_results = {
                "processed_at": datetime.now().isoformat(),
                "document_count": len(processed_docs),
                "documents": [
                    {
                        "document_id": doc.metadata.document_id,
                        "filename": doc.metadata.filename,
                        "file_type": doc.metadata.file_type,
                        "chunk_count": len(doc.chunks),
                        "word_count": doc.metadata.word_count,
                        "processing_status": doc.metadata.processing_status
                    }
                    for doc in processed_docs
                ]
            }
            
            results_file = self.data_dir / "processing_results.json"
            with open(results_file, 'w') as f:
                json.dump(processing_results, f, indent=2)
            
            return True
            
        except Exception as e:
            logger.error(f"Document processing failed: {e}")
            return False
    
    def test_system(self) -> Dict[str, Any]:
        """Test the complete RAG system."""
        logger.info("Testing complete RAG system...")
        
        test_results = {
            "timestamp": datetime.now().isoformat(),
            "tests": {},
            "overall_status": "unknown"
        }
        
        try:
            # Initialize pipeline
            pipeline = create_rag_pipeline(
                bge_config=self.config["bge_config"],
                phi2_config=self.config["phi2_config"],
                processor_config=self.config["processor_config"],
                **self.config["pipeline_config"]
            )
            
            # Test queries
            test_queries = [
                "What is artificial intelligence?",
                "Explain machine learning algorithms",
                "How does natural language processing work?",
                "What are the benefits of deep learning?"
            ]
            
            for i, query in enumerate(test_queries):
                logger.info(f"Testing query {i+1}: {query}")
                start_time = time.time()
                
                try:
                    response = pipeline.query(
                        query=query,
                        retrieval_k=5,
                        generation_tokens=200,
                        response_format="detailed"
                    )
                    
                    test_results["tests"][f"query_{i+1}"] = {
                        "query": query,
                        "success": True,
                        "response_time": time.time() - start_time,
                        "confidence": response.confidence,
                        "answer_length": len(response.answer),
                        "sources_count": len(response.sources)
                    }
                    
                except Exception as e:
                    test_results["tests"][f"query_{i+1}"] = {
                        "query": query,
                        "success": False,
                        "error": str(e),
                        "response_time": time.time() - start_time
                    }
            
            # Test structured formatting
            try:
                formatter = create_structured_formatter()
                sample_response = {
                    "query": "Test query",
                    "answer": "Test answer",
                    "confidence": 0.8,
                    "sources": [],
                    "metadata": {}
                }
                
                formatted = formatter.format_response(sample_response, ResponseFormat.STRUCTURED_JSON)
                test_results["tests"]["formatting"] = {
                    "success": True,
                    "format_types_tested": ["structured_json"]
                }
                
            except Exception as e:
                test_results["tests"]["formatting"] = {
                    "success": False,
                    "error": str(e)
                }
            
            # Calculate overall status
            successful_tests = sum(1 for test in test_results["tests"].values() if test.get("success", False))
            total_tests = len(test_results["tests"])
            
            if successful_tests == total_tests:
                test_results["overall_status"] = "success"
            elif successful_tests > total_tests // 2:
                test_results["overall_status"] = "partial_success"
            else:
                test_results["overall_status"] = "failure"
            
            test_results["success_rate"] = successful_tests / total_tests if total_tests > 0 else 0
            
            # Save test results
            results_file = self.logs_dir / "test_results.json"
            with open(results_file, 'w') as f:
                json.dump(test_results, f, indent=2)
            
            logger.info(f"System test completed. Status: {test_results['overall_status']}")
            return test_results
            
        except Exception as e:
            logger.error(f"System test failed: {e}")
            test_results["overall_status"] = "error"
            test_results["error"] = str(e)
            return test_results
    
    def get_system_status(self) -> Dict[str, Any]:
        """Get current system status."""
        status = {
            "timestamp": datetime.now().isoformat(),
            "configuration": self.config,
            "system_info": self.check_system_requirements(),
            "directories": {
                "base_dir": str(self.base_dir),
                "models_dir": str(self.models_dir),
                "data_dir": str(self.data_dir),
                "logs_dir": str(self.logs_dir)
            },
            "files": {
                "config_exists": self.config_file.exists(),
                "requirements_exists": (self.base_dir / "requirements_rag.txt").exists()
            }
        }
        
        return status
    
    def setup_all(self) -> bool:
        """Complete system setup."""
        logger.info("Starting complete RAG system setup...")
        
        steps = [
            ("System Requirements Check", self.check_system_requirements),
            ("Requirements Installation", self.install_requirements),
            ("Model Setup", self.setup_models),
            ("Configuration Save", self.save_config)
        ]
        
        for step_name, step_func in steps:
            logger.info(f"Executing: {step_name}")
            try:
                if step_name == "System Requirements Check":
                    requirements = step_func()
                    logger.info(f"System info: {requirements}")
                elif step_name == "Configuration Save":
                    step_func()
                else:
                    success = step_func()
                    if not success:
                        logger.error(f"Failed at step: {step_name}")
                        return False
                
                logger.info(f"✓ Completed: {step_name}")
                
            except Exception as e:
                logger.error(f"Error in {step_name}: {e}")
                return False
        
        logger.info("✓ Complete RAG system setup finished successfully!")
        return True

def main():
    """Main CLI interface."""
    parser = argparse.ArgumentParser(description="RAG System Setup and Training")
    
    parser.add_argument("--base-dir", default="./", help="Base directory for RAG system")
    parser.add_argument("--setup-all", action="store_true", help="Complete system setup")
    parser.add_argument("--check-requirements", action="store_true", help="Check system requirements")
    parser.add_argument("--install-requirements", action="store_true", help="Install required packages")
    parser.add_argument("--setup-models", action="store_true", help="Setup and test models")
    parser.add_argument("--process-docs", nargs='+', help="Process documents (paths or directories)")
    parser.add_argument("--test-system", action="store_true", help="Test complete system")
    parser.add_argument("--status", action="store_true", help="Show system status")
    parser.add_argument("--config", help="Custom configuration file")
    parser.add_argument("--verbose", "-v", action="store_true", help="Verbose logging")
    
    args = parser.parse_args()
    
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)
    
    # Initialize setup manager
    setup = RAGSystemSetup(args.base_dir)
    
    # Load custom config if provided
    if args.config:
        config_path = Path(args.config)
        if config_path.exists():
            with open(config_path, 'r') as f:
                custom_config = json.load(f)
                setup.config.update(custom_config)
            logger.info(f"Loaded custom configuration from {config_path}")
    
    # Execute requested actions
    if args.setup_all:
        success = setup.setup_all()
        sys.exit(0 if success else 1)
    
    if args.check_requirements:
        requirements = setup.check_system_requirements()
        print(json.dumps(requirements, indent=2))
    
    if args.install_requirements:
        success = setup.install_requirements()
        sys.exit(0 if success else 1)
    
    if args.setup_models:
        success = setup.setup_models()
        sys.exit(0 if success else 1)
    
    if args.process_docs:
        success = setup.process_documents(args.process_docs)
        sys.exit(0 if success else 1)
    
    if args.test_system:
        results = setup.test_system()
        print(json.dumps(results, indent=2))
        sys.exit(0 if results["overall_status"] in ["success", "partial_success"] else 1)
    
    if args.status:
        status = setup.get_system_status()
        print(json.dumps(status, indent=2))
    
    # If no specific action, show help
    if not any([args.setup_all, args.check_requirements, args.install_requirements, 
                args.setup_models, args.process_docs, args.test_system, args.status]):
        parser.print_help()

if __name__ == "__main__":
    main()