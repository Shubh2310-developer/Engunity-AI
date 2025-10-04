#!/usr/bin/env python3
"""
RAG Document Q&A Pipeline - Upload & Ask Questions from Your Documents
Using BGE-small-en-v1.5 embeddings + Phi-2 LLM with LangChain

Supported formats: PDF, DOCX, TXT
Hardware Requirements: 6GB GPU VRAM (optimized)
No training required - pure RAG inference pipeline
"""

import os
import warnings
import gc
import torch
import time
import signal
import sys
import psutil
import threading
import subprocess
import re
from typing import List
from contextlib import contextmanager

# LangChain imports
from langchain_community.vectorstores import FAISS
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain.schema import Document
from langchain_community.document_loaders import PyPDFLoader, TextLoader, Docx2txtLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter

# Transformers & ML imports
from transformers import AutoTokenizer, AutoModelForCausalLM, BitsAndBytesConfig
import argparse

# Import AI Agents Framework
try:
    from ai_agents_fixed import RAGAgentOrchestrator
    AI_AGENTS_AVAILABLE = True
    print("🤖 Fixed AI Agents Framework loaded successfully!")
except ImportError as e:
    AI_AGENTS_AVAILABLE = False
    print(f"⚠️  AI Agents Framework not available: {e}")
    print("📝 Running with basic RAG system")

# Suppress warnings
warnings.filterwarnings('ignore')

# Disable LangSmith to avoid API warnings
os.environ["LANGCHAIN_TRACING_V2"] = "false"

def print_banner(title: str, char: str = "="):
    """Print a formatted banner"""
    print(f"\n{char * 80}")
    print(f"{title.center(80)}")
    print(f"{char * 80}")

def clear_all_gpu_memory():
    """Clear all GPU memory before starting"""
    print_banner("🧹 GPU MEMORY CLEANUP", "=")
    
    if torch.cuda.is_available():
        print("🔥 Clearing all GPU memory...")
        
        # Empty cache
        torch.cuda.empty_cache()
        
        # Collect garbage
        gc.collect()
        
        # Clear all cached memory
        torch.cuda.ipc_collect()
        torch.cuda.synchronize()
        
        # Reset memory stats
        torch.cuda.reset_peak_memory_stats()
        
        print("✅ GPU memory cleared successfully!")
        
        # Show current memory status
        if torch.cuda.is_available():
            allocated = torch.cuda.memory_allocated(0) / 1024**3
            reserved = torch.cuda.memory_reserved(0) / 1024**3
            total_memory = torch.cuda.get_device_properties(0).total_memory / 1024**3
            print(f"🔥 GPU Memory after cleanup: {allocated:.2f}GB allocated, {reserved:.2f}GB reserved")
            print(f"🔥 Total GPU Memory: {total_memory:.1f}GB")
    else:
        print("⚠️  CUDA not available - no GPU memory to clear")

def setup_memory_management():
    """Configure memory management for 6GB VRAM systems with enhanced stability"""
    print_banner("🔥 SYSTEM INITIALIZATION", "=")
    
    if torch.cuda.is_available():
        total_memory = torch.cuda.get_device_properties(0).total_memory / 1024**3
        
        # More conservative memory allocation for 6GB cards to prevent system freeze
        if total_memory < 7:  # 6GB card
            memory_fraction = 0.75  # Use 75% max (4.5GB) for 6GB cards
            max_memory_gb = 4.5
        else:
            memory_fraction = 0.8  # Use 80% for larger cards
            max_memory_gb = total_memory * 0.8
            
        torch.cuda.set_per_process_memory_fraction(memory_fraction)
        
        # Optimize memory allocation
        torch.backends.cuda.max_split_size_mb = 256  # Larger chunks for efficiency
        torch.backends.cudnn.benchmark = False  # Disable for memory consistency
        torch.backends.cudnn.deterministic = True  # Reproducible results
        
        print(f"🔥 CUDA Available: {torch.cuda.is_available()}")
        print(f"🔥 GPU: {torch.cuda.get_device_name(0)}")
        print(f"🔥 CUDA Version: {torch.version.cuda}")
        print(f"🔥 GPU Memory: {total_memory:.1f} GB")
        print(f"🔥 Memory fraction: {memory_fraction*100:.0f}%")
        print(f"🔥 Max memory usage: {max_memory_gb:.1f} GB")
        print(f"🔥 Reserved for system: {total_memory - max_memory_gb:.1f} GB")
        
        return total_memory
    else:
        print("⚠️  CUDA not available - using CPU mode")
        return 0

class SystemMonitor:
    """Enhanced system monitoring to prevent freezing"""
    def __init__(self, max_vram_gb=4.5):
        self.max_vram_gb = max_vram_gb
        self.monitoring = True
        self.stats = []
        self.emergency_count = 0
        self.start_monitoring()
    
    def start_monitoring(self):
        """Start background system monitoring"""
        def monitor_loop():
            while self.monitoring:
                try:
                    # Monitor system resources
                    cpu_percent = psutil.cpu_percent(interval=1)
                    memory = psutil.virtual_memory()
                    
                    # GPU temperature monitoring
                    gpu_temp = self.get_gpu_temperature()
                    
                    # Check for concerning conditions
                    if cpu_percent > 95:
                        print(f"⚠️  HIGH CPU USAGE: {cpu_percent:.1f}%")
                    
                    if memory.percent > 90:
                        print(f"⚠️  HIGH RAM USAGE: {memory.percent:.1f}%")
                    
                    if gpu_temp and gpu_temp > 83:
                        print(f"⚠️  HIGH GPU TEMPERATURE: {gpu_temp}°C")
                        
                    time.sleep(5)  # Check every 5 seconds
                except Exception as e:
                    print(f"⚠️  Monitor error: {e}")
                    time.sleep(10)
        
        monitor_thread = threading.Thread(target=monitor_loop, daemon=True)
        monitor_thread.start()
    
    def get_gpu_temperature(self):
        """Get GPU temperature using nvidia-smi if available"""
        try:
            result = subprocess.run(
                ['nvidia-smi', '--query-gpu=temperature.gpu', '--format=csv,noheader,nounits'],
                capture_output=True, text=True, timeout=5
            )
            if result.returncode == 0:
                return int(result.stdout.strip())
        except:
            pass
        return None
    
    def stop_monitoring(self):
        self.monitoring = False

def monitor_vram_usage(stage="", system_monitor=None):
    """Enhanced VRAM monitoring with system-wide checks"""
    if torch.cuda.is_available():
        allocated = torch.cuda.memory_allocated(0) / 1024**3
        reserved = torch.cuda.memory_reserved(0) / 1024**3
        total_memory = torch.cuda.get_device_properties(0).total_memory / 1024**3
        usage_percent = (allocated / total_memory) * 100
        
        # Get additional system info
        cpu_percent = psutil.cpu_percent()
        memory = psutil.virtual_memory()
        
        print(f"📊 {stage} - VRAM: {allocated:.2f}GB/{total_memory:.1f}GB ({usage_percent:.1f}%), "
              f"RAM: {memory.percent:.1f}%, CPU: {cpu_percent:.1f}%")
        
        # More conservative thresholds for 6GB cards
        max_vram_gb = 4.5 if total_memory < 7 else total_memory * 0.75
        
        if allocated > max_vram_gb:
            print(f"⚠️  CRITICAL: VRAM usage {allocated:.2f}GB exceeds limit {max_vram_gb:.1f}GB!")
            aggressive_cleanup()
            
            if allocated > max_vram_gb + 0.5:  # 500MB buffer
                print("❌ EMERGENCY SHUTDOWN: VRAM usage critical!")
                sys.exit(1)
                
        elif allocated > max_vram_gb - 0.5:  # Warning 500MB before limit
            print(f"⚠️  WARNING: Approaching VRAM limit ({allocated:.2f}GB/{max_vram_gb:.1f}GB)")
            cleanup_memory()
        
        # Check system memory too
        if memory.percent > 85:
            print(f"⚠️  WARNING: High system RAM usage: {memory.percent:.1f}%")
            
        return allocated, reserved
    return 0, 0

# Initialize global system monitor
system_monitor = None

def cleanup_memory():
    """Standard memory cleanup"""
    gc.collect()
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
        torch.cuda.synchronize()
    time.sleep(0.05)

def aggressive_cleanup():
    """Aggressive memory cleanup for emergency situations"""
    print("🧹 Performing aggressive memory cleanup...")
    
    # Multiple rounds of cleanup
    for i in range(3):
        gc.collect()
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
            torch.cuda.ipc_collect()
            torch.cuda.synchronize()
        time.sleep(0.2)
    
    # Force Python garbage collection
    gc.set_threshold(0, 0, 0)  # Disable automatic GC
    gc.collect()
    gc.set_threshold(700, 10, 10)  # Re-enable with default settings
    
    print("✅ Aggressive cleanup completed")

@contextmanager
def memory_guard(operation_name="operation"):
    """Context manager for memory-safe operations"""
    print(f"🛡️  Starting memory-guarded {operation_name}")
    initial_memory = torch.cuda.memory_allocated(0) / 1024**3 if torch.cuda.is_available() else 0
    
    try:
        yield
    except RuntimeError as e:
        if "out of memory" in str(e).lower():
            print(f"❌ OOM during {operation_name}: {e}")
            aggressive_cleanup()
            raise
        else:
            raise
    finally:
        cleanup_memory()
        if torch.cuda.is_available():
            final_memory = torch.cuda.memory_allocated(0) / 1024**3
            print(f"🛡️  {operation_name} completed: {initial_memory:.2f}GB → {final_memory:.2f}GB")

def load_user_document(file_path: str) -> List[Document]:
    """Load user's document based on file extension"""
    print(f"📄 Loading document: {file_path}")
    
    if file_path.endswith(".pdf"):
        loader = PyPDFLoader(file_path)
    elif file_path.endswith(".txt"):
        loader = TextLoader(file_path)
    elif file_path.endswith(".docx"):
        loader = Docx2txtLoader(file_path)
    else:
        raise ValueError(f"Unsupported file type: {file_path.split('.')[-1]}. Supported: PDF, TXT, DOCX")
    
    documents = loader.load()
    print(f"✅ Loaded {len(documents)} document sections")
    return documents

def split_into_chunks(documents: List[Document]) -> List[Document]:
    """Split documents into larger, more informative chunks for comprehensive retrieval"""
    print("✂️  Splitting documents into enhanced chunks...")
    
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=800,  # Larger chunks for more comprehensive context
        chunk_overlap=100,  # More overlap to preserve context boundaries
        separators=["\n\n", "\n", ".", "!", "?", ",", " ", ""]
    )
    
    chunks = splitter.split_documents(documents)
    print(f"✅ Created {len(chunks)} enhanced document chunks (larger size for better context)")
    return chunks

class OptimizedBGERetriever:
    """Memory-optimized BGE embeddings with FAISS vector store for 4GB VRAM"""
    
    def __init__(self, model_name: str = "BAAI/bge-small-en-v1.5", max_vram_gb: float = 4.0):
        self.model_name = model_name
        self.max_vram_gb = max_vram_gb
        self.model = None
        self.tokenizer = None
        self.vector_store = None
        self.embeddings = None
        self.reranker = None
        print(f"🔧 Initialized BGE Retriever with model: {model_name}")
    
    def setup_reranker(self):
        """Setup cross-encoder reranker for better document ranking"""
        try:
            from sentence_transformers import CrossEncoder
            print("🔄 Loading cross-encoder reranker for optimal context selection...")
            self.reranker = CrossEncoder('cross-encoder/ms-marco-MiniLM-L-6-v2')
            print("✅ Cross-encoder reranker loaded successfully!")
            return True
        except ImportError:
            print("⚠️  sentence-transformers CrossEncoder not available, skipping reranking")
            return False
        except Exception as e:
            print(f"⚠️  Could not load reranker: {e}")
            return False
    
    def rerank_documents(self, query: str, docs: List[Document], top_k: int = 7) -> List[Document]:
        """Rerank documents using cross-encoder for better relevance"""
        if not self.reranker or not docs:
            return docs[:top_k]
        
        try:
            # Prepare query-document pairs
            pairs = [(query, doc.page_content) for doc in docs]
            scores = self.reranker.predict(pairs)
            
            # Sort by scores and return top_k
            scored_docs = list(zip(docs, scores))
            scored_docs.sort(key=lambda x: x[1], reverse=True)
            
            return [doc for doc, score in scored_docs[:top_k]]
        except Exception as e:
            print(f"⚠️  Reranking failed: {e}")
            return docs[:top_k]
    
    def initialize_model(self):
        """Initialize BGE model with enhanced retrieval capabilities"""
        print(f"\n🤖 Loading enhanced BGE embeddings: {self.model_name}")
        print("⏳ This may take a few minutes...")
        
        # Monitor initial memory
        monitor_vram_usage("Before BGE loading")
        
        # Create lightweight embeddings wrapper
        self.embeddings = HuggingFaceEmbeddings(
            model_name=self.model_name,
            model_kwargs={
                'device': 'cuda' if torch.cuda.is_available() else 'cpu'
            },
            encode_kwargs={
                'normalize_embeddings': True,
                'batch_size': 16  # Smaller batch for 6GB VRAM
            }
        )
        
        # Initialize reranker for better context selection
        self.setup_reranker()
        
        monitor_vram_usage("After BGE loading")
        print("✅ Enhanced BGE embeddings with reranking initialized")
    
    def build_vector_store(self, documents: List[Document]) -> FAISS:
        """Build FAISS vector store from documents"""
        print(f"\n🗂️  Building FAISS vector store with {len(documents)} documents...")
        
        if not self.embeddings:
            self.initialize_model()
        
        monitor_vram_usage("Before vector store creation")
        
        # Create FAISS vector store
        self.vector_store = FAISS.from_documents(
            documents=documents,
            embedding=self.embeddings
        )
        
        monitor_vram_usage("After vector store creation")
        print(f"✅ FAISS vector store created successfully with {len(documents)} documents!")
        return self.vector_store
    
    def save_vector_store(self, path: str):
        """Save FAISS vector store"""
        print(f"💾 Saving vector store to {path}...")
        self.vector_store.save_local(path)
        print(f"✅ Vector store saved successfully!")
    
    def get_retriever(self, k: int = 10):  # Fetch more documents for reranking
        """Get enhanced retriever for comprehensive RAG chain"""
        return self.vector_store.as_retriever(
            search_kwargs={
                "k": k,
                "fetch_k": k * 4,  # Fetch more candidates for reranking
                "lambda_mult": 0.3  # More diversity for comprehensive coverage
            }
        )

class Phi2RAGQA:
    """Phi-2 RAG Q&A system for document question answering"""
    
    def __init__(self, model_name: str = "microsoft/phi-2", use_ai_agents: bool = True):
        self.model_name = model_name
        self.model = None
        self.tokenizer = None
        self.use_ai_agents = use_ai_agents and AI_AGENTS_AVAILABLE
        self.agent_orchestrator = None
        
        if self.use_ai_agents:
            self.agent_orchestrator = RAGAgentOrchestrator()
            print(f"🤖 Initialized Enhanced Phi-2 RAG Q&A with AI Agents: {model_name}")
        else:
            print(f"🔧 Initialized Basic Phi-2 RAG Q&A with model: {model_name}")
    
    def get_quantization_config(self):
        """Get quantization config for inference"""
        return BitsAndBytesConfig(
            load_in_4bit=True,
            bnb_4bit_compute_dtype=torch.float16,
            bnb_4bit_use_double_quant=True,
            bnb_4bit_quant_type="nf4"
        )
    
    def initialize_model(self):
        """Initialize Phi-2 model for inference only"""
        print(f"\n🤖 Loading Phi-2 model: {self.model_name}")
        print("⏳ This may take several minutes...")
        
        with memory_guard("Phi-2 model loading"):
            monitor_vram_usage("Before Phi-2 loading")
            
            # Get quantization config for inference
            bnb_config = self.get_quantization_config()
            
            print("📥 Loading Phi-2 model (4-bit quantized) for inference...")
                
            self.model = AutoModelForCausalLM.from_pretrained(
                self.model_name,
                quantization_config=bnb_config,
                device_map="auto",
                trust_remote_code=True,
                torch_dtype=torch.float16,
                low_cpu_mem_usage=True,
                use_cache=True,  # Enable cache for better inference
                max_memory={0: "4500MB"} if torch.cuda.is_available() else None
            )
            
            # Load tokenizer
            print("📝 Loading tokenizer...")
            self.tokenizer = AutoTokenizer.from_pretrained(self.model_name, trust_remote_code=True)
            if self.tokenizer.pad_token is None:
                self.tokenizer.pad_token = self.tokenizer.eos_token
            
            monitor_vram_usage("After Phi-2 loading")
            print("✅ Phi-2 model initialized successfully!")
    
    def generate_answer(self, retriever, query: str, style: str = 'general') -> str:
        """Generate comprehensive answer using AI agents if available, otherwise fallback to basic generation"""
        
        # Use AI Agents if available
        if self.use_ai_agents and self.agent_orchestrator:
            print("🤖 Using AI Agents for enhanced response generation...")
            try:
                # Retrieve documents first for agents to process
                docs = retriever.get_relevant_documents(query)
                if not docs:
                    return "I couldn't find relevant information in the document to answer your question. Please try rephrasing or asking about different topics."
                
                # Process with AI agents
                result = self.agent_orchestrator.process_query(query, retriever, self, style)
                answer = result.get('answer', 'I encountered an issue processing your question.')
                
                # If agents return a good answer, use it
                if answer and len(answer.strip()) > 10 and not answer.startswith("I encountered"):
                    return answer
                else:
                    print("⚠️ AI Agents returned insufficient answer, falling back...")
                    # Fall through to basic generation
                    
            except Exception as e:
                print(f"⚠️ AI Agents failed, falling back to basic generation: {e}")
                # Fall through to basic generation
        
        # Basic generation (original method)
        return self._generate_basic_answer(retriever, query)
    
    def _generate_basic_answer(self, retriever, query: str) -> str:
        """Original basic answer generation method"""
        print(f"🔍 Retrieving and reranking documents for: '{query[:60]}{'...' if len(query) > 60 else ''}'")
        
        # Retrieve relevant documents
        docs = retriever.get_relevant_documents(query)
        
        if not docs:
            return "I couldn't find any relevant information in the document to answer your question. Please try rephrasing your question or asking about different topics covered in the document."
        
        # Get BGE retriever instance for reranking
        bge_retriever = None
        if hasattr(retriever, 'vectorstore') and hasattr(retriever.vectorstore, 'embeddings'):
            # Try to find the BGE retriever instance
            import gc
            for obj in gc.get_objects():
                if isinstance(obj, OptimizedBGERetriever) and obj.reranker is not None:
                    bge_retriever = obj
                    break
        
        # Rerank documents if reranker is available
        if bge_retriever and bge_retriever.reranker:
            print("🔄 Reranking documents for optimal context...")
            docs = bge_retriever.rerank_documents(query, docs, top_k=7)
        else:
            docs = docs[:7]  # Use top 7 without reranking
        
        # Build comprehensive context from reranked documents
        contexts = []
        for i, doc in enumerate(docs):
            # Use larger content chunks (up to 600 chars per chunk)
            content = doc.page_content[:600]
            contexts.append(f"--- Source {i+1} ---\n{content}")
        
        combined_context = "\n\n".join(contexts)
        
        # Create focused prompt for concise responses
        prompt = f"""Based ONLY on the following context, provide a clear and direct answer to the question. Be concise and avoid repetition. Answer in 2-3 sentences maximum.

Context:
{combined_context}

Question: {query}

Direct Answer:"""
        
        print("🧠 Generating comprehensive answer...")
        monitor_vram_usage("Before generation")
        
        # Generate response with enhanced parameters for longer, more detailed output
        inputs = self.tokenizer(prompt, return_tensors="pt", max_length=1024, truncation=True)  # Increased context window
        if torch.cuda.is_available():
            inputs = inputs.to(self.model.device)
        
        with torch.no_grad():
            outputs = self.model.generate(
                **inputs,
                max_new_tokens=150,  # Reduced for concise answers
                temperature=0.5,     # Lower temperature for focused responses
                do_sample=True,
                top_p=0.75,          # More focused sampling
                pad_token_id=self.tokenizer.eos_token_id,
                repetition_penalty=1.5,   # Higher repetition penalty
                use_cache=True,
                no_repeat_ngram_size=3,   # Prevent 3-gram repetitions
                min_length=30,       # Minimum answer length
                early_stopping=True  # Stop when answer is complete
            )
        
        generated_text = self.tokenizer.decode(outputs[0], skip_special_tokens=True)
        
        # Extract only the answer part
        if "Direct Answer:" in generated_text:
            answer = generated_text.split("Direct Answer:")[-1].strip()
        elif "Answer:" in generated_text:
            answer = generated_text.split("Answer:")[-1].strip()
        else:
            answer = generated_text.strip()
        
        # Clean up repetitive content
        answer = self._clean_repetitive_response(answer)
        
        cleanup_memory()
        monitor_vram_usage("After generation")
        
        # Ensure we have a meaningful response
        if not answer or len(answer.strip()) < 15:
            return "I found relevant information in the document but was unable to generate a clear response. Please try rephrasing your question."
        
        return answer
    
    def _clean_repetitive_response(self, response: str) -> str:
        """Remove repetitive content from response"""
        # Split into sentences
        sentences = [s.strip() for s in re.split(r'[.!?]+', response) if s.strip()]
        
        # Remove duplicate sentences
        unique_sentences = []
        seen = set()
        
        for sentence in sentences:
            # Normalize for comparison
            normalized = re.sub(r'[^\w\s]', '', sentence.lower())
            if normalized not in seen and len(normalized) > 5:
                unique_sentences.append(sentence)
                seen.add(normalized)
        
        # Limit to 3 sentences maximum
        result = '. '.join(unique_sentences[:3])
        if result and not result.endswith('.'):
            result += '.'
            
        return result if result else response
    
    


def check_system_requirements():
    """Check if system meets minimum requirements for training"""
    print("🔍 Checking system requirements...")
    
    requirements_met = True
    
    # Check Python version
    python_version = sys.version_info
    if python_version < (3, 8):
        print(f"❌ Python 3.8+ required, found {python_version.major}.{python_version.minor}")
        requirements_met = False
    else:
        print(f"✅ Python {python_version.major}.{python_version.minor}.{python_version.micro}")
    
    # Check available RAM
    memory = psutil.virtual_memory()
    required_ram_gb = 8
    if memory.total / 1024**3 < required_ram_gb:
        print(f"❌ {required_ram_gb}GB+ RAM required, found {memory.total / 1024**3:.1f}GB")
        requirements_met = False
    else:
        print(f"✅ System RAM: {memory.total / 1024**3:.1f}GB")
    
    # Check CUDA availability
    if torch.cuda.is_available():
        gpu_memory = torch.cuda.get_device_properties(0).total_memory / 1024**3
        print(f"✅ CUDA available: {torch.cuda.get_device_name(0)} ({gpu_memory:.1f}GB)")
        
        if gpu_memory < 4:
            print(f"⚠️  GPU has {gpu_memory:.1f}GB VRAM, 6GB recommended for optimal performance")
        elif gpu_memory >= 6:
            print("✅ GPU memory sufficient for training")
    else:
        print("⚠️  CUDA not available, training will be slower on CPU")
    
    # Check disk space
    disk_usage = psutil.disk_usage('/')
    free_gb = disk_usage.free / 1024**3
    required_disk_gb = 10
    if free_gb < required_disk_gb:
        print(f"❌ {required_disk_gb}GB+ free disk space required, found {free_gb:.1f}GB")
        requirements_met = False
    else:
        print(f"✅ Free disk space: {free_gb:.1f}GB")
    
    # Check critical packages
    try:
        import transformers
        import datasets
        import peft
        import langchain_community
        print("✅ Required packages available")
    except ImportError as e:
        print(f"❌ Missing required package: {e}")
        requirements_met = False
    
    return requirements_met


def build_vector_store_from_file(file_path: str, embeddings_model: str = "BAAI/bge-small-en-v1.5") -> FAISS:
    """Complete pipeline to build vector store from uploaded file"""
    print(f"🚀 Building RAG system for document: {file_path}")
    
    # 1. Load document
    documents = load_user_document(file_path)
    
    # 2. Split into chunks
    chunks = split_into_chunks(documents)
    
    # 3. Create embeddings and vector store
    embeddings = HuggingFaceEmbeddings(model_name=embeddings_model)
    vector_store = FAISS.from_documents(chunks, embeddings)
    
    print(f"✅ Vector store built successfully with {len(chunks)} chunks")
    return vector_store

def create_sample_document():
    """Create a sample document for testing"""
    sample_content = """
Machine Learning Fundamentals

Machine learning is a subset of artificial intelligence (AI) that enables computers to learn and make decisions from data without being explicitly programmed for every task.

Types of Machine Learning:
1. Supervised Learning: Uses labeled data to train models for prediction tasks
2. Unsupervised Learning: Finds patterns in unlabeled data
3. Reinforcement Learning: Learns through interaction with an environment

Neural Networks:
Neural networks are computing systems inspired by biological neural networks. They consist of interconnected nodes organized in layers that process information.

Deep Learning:
Deep learning uses neural networks with multiple layers to learn hierarchical representations of data.

Common Applications:
- Image recognition
- Natural language processing  
- Recommendation systems
- Autonomous vehicles

Key Challenges:
- Data quality and availability
- Model interpretability
- Computational requirements
- Overfitting and generalization
"""
    
    with open("sample_ml_document.txt", "w") as f:
        f.write(sample_content)
    
    print("✅ Sample document created: sample_ml_document.txt")
    return "sample_ml_document.txt"

def main():
    """RAG Document Q&A Demo - Upload & Ask Questions"""
    print_banner("🚀 RAG DOCUMENT Q&A SYSTEM", "=")
    print("Upload documents (PDF/DOCX/TXT) and ask questions!")
    print("No training required - pure RAG inference")
    
    parser = argparse.ArgumentParser(description="RAG Document Q&A System")
    parser.add_argument("--file", type=str, help="Path to document file (PDF, DOCX, TXT)")
    parser.add_argument("--demo", action="store_true", help="Run demo with sample document")
    args = parser.parse_args()
    
    # Initialize system monitor
    global system_monitor
    system_monitor = SystemMonitor()
    
    # Setup enhanced signal handlers for graceful shutdown
    def signal_handler(signum, _):
        print(f"\n🛑 Received signal {signum}, gracefully shutting down...")
        if system_monitor:
            system_monitor.stop_monitoring()
        aggressive_cleanup()
        sys.exit(0)
    
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    # Display system information
    print(f"🖥️  System CPU cores: {psutil.cpu_count()}")
    memory = psutil.virtual_memory()
    print(f"🖥️  System RAM: {memory.total / 1024**3:.1f}GB ({memory.percent:.1f}% used)")
    
    # Check system requirements
    if not check_system_requirements():
        print("❌ System requirements not met. Please check the requirements and try again.")
        sys.exit(1)
    
    try:
        # Clear all GPU memory first
        clear_all_gpu_memory()
        
        # Initialize memory management
        setup_memory_management()
        monitor_vram_usage("Initial")
        
        # Determine document source
        if args.demo:
            print("🎨 Creating sample document for demo...")
            document_path = create_sample_document()
        elif args.file:
            document_path = args.file
            if not os.path.exists(document_path):
                print(f"❌ Document not found: {document_path}")
                sys.exit(1)
        else:
            print("❌ Please provide --file path or use --demo flag")
            print("Example: python ragtraining.py --file document.pdf")
            print("Example: python ragtraining.py --demo")
            sys.exit(1)
        
        # Load and process the document
        print_banner("📄 DOCUMENT PROCESSING", "-")
        documents = load_user_document(document_path)
        chunks = split_into_chunks(documents)
        
        print(f"📄 Processed document: {len(chunks)} chunks created")
        
        # Initialize BGE Retriever
        print_banner("🔍 RETRIEVER INITIALIZATION", "-")
        bge_retriever = OptimizedBGERetriever()
        
        # Build vector store from chunks
        bge_retriever.build_vector_store(chunks)
        
        # Get enhanced retriever with more documents for comprehensive context
        retriever = bge_retriever.get_retriever(k=10)  # Use the enhanced settings
        
        cleanup_memory()
        monitor_vram_usage("After vector store creation")
        
        # Initialize Phi-2 Generator
        print_banner("🧠 GENERATOR INITIALIZATION", "-")
        
        cleanup_memory()
        monitor_vram_usage("Before Phi-2 initialization")
        
        phi2_qa = Phi2RAGQA()
        phi2_qa.initialize_model()
        
        cleanup_memory()
        monitor_vram_usage("After Phi-2 model loading")
        
        # RAG Q&A System Ready!
        print_banner("✅ SYSTEM READY", "-")
        print("RAG Document Q&A system is ready!")
        
        # Interactive Q&A or Demo
        print_banner("💬 INTERACTIVE Q&A", "-")
        print(f"Loaded document: {document_path}")
        print("You can now ask questions about the document!")
        print("Type 'quit' to exit\n")
        
        # Interactive question-answering loop
        while True:
            try:
                question = input("🔍 Ask a question (or 'quit' to exit): ").strip()
                
                if question.lower() in ['quit', 'exit', 'q']:
                    print("👋 Goodbye!")
                    break
                
                if not question:
                    continue
                
                print("\n🔍 Processing your question...")
                start_time = time.time()
                
                # Generate answer using RAG
                answer = phi2_qa.generate_answer(retriever, question)
                
                response_time = time.time() - start_time
                
                print(f"\n💡 Answer: {answer}")
                print(f"⏱️  Response time: {response_time:.2f}s\n")
                
            except KeyboardInterrupt:
                print("\n👋 Goodbye!")
                break
            except Exception as e:
                print(f"\n❌ Error: {e}\n")
        
        # Final cleanup
        print_banner("🧹 CLEANUP", "-")
        cleanup_memory()
        if torch.cuda.is_available():
            total_memory = torch.cuda.get_device_properties(0).total_memory / 1024**3
            allocated = torch.cuda.memory_allocated(0) / 1024**3
            print(f"📊 Final VRAM usage: {allocated:.2f}GB / {total_memory:.1f}GB")
        
        print_banner("✅ RAG Q&A SESSION COMPLETE!", "=")
        print("✅ Document processed successfully")
        print("✅ Vector embeddings created")
        print("✅ Q&A system ready")
        print("✅ Memory optimized for 6GB VRAM")
        
        # Stop system monitoring
        if system_monitor:
            system_monitor.stop_monitoring()
        
        print("\n🏁 RAG Document Q&A system finished!")
        
    except Exception as e:
        print(f"\n❌ Critical error in RAG pipeline: {e}")
        import traceback
        traceback.print_exc()
        
        # Stop monitoring and cleanup
        if system_monitor:
            system_monitor.stop_monitoring()
        
        aggressive_cleanup()
        sys.exit(1)

if __name__ == "__main__":
    main()