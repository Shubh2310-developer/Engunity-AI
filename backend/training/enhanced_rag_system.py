#!/usr/bin/env python3
"""
Enhanced RAG System with Improved Retrieval and Grounded Responses
Implements all the improvements suggested to fix vague answers
"""

import os
import warnings
import gc
import torch
import time
import numpy as np
from typing import List, Dict, Tuple, Optional
from contextlib import contextmanager
from dataclasses import dataclass
import logging

# LangChain imports
from langchain_community.vectorstores import FAISS
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain.schema import Document
from langchain_community.document_loaders import PyPDFLoader, TextLoader, Docx2txtLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter

# ML imports
from transformers import AutoTokenizer, AutoModelForCausalLM, BitsAndBytesConfig
from sentence_transformers import SentenceTransformer, CrossEncoder
from sklearn.metrics.pairwise import cosine_similarity
import tempfile
import argparse

# Suppress warnings
warnings.filterwarnings('ignore')
os.environ["LANGCHAIN_TRACING_V2"] = "false"

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class RetrievalConfig:
    """Configuration for enhanced retrieval"""
    chunk_size: int = 500
    chunk_overlap: int = 100
    initial_k: int = 10  # Initial retrieval count
    final_k: int = 3     # After reranking
    min_similarity: float = 0.6
    use_reranker: bool = True
    reranker_model: str = "BAAI/bge-reranker-base"

@dataclass
class ConfidenceScores:
    """Comprehensive confidence scoring"""
    retriever_score: float
    reranker_score: float
    fact_check_score: float
    combined_confidence: float
    is_reliable: bool

class EnhancedDocumentProcessor:
    """Improved document processing with semantic chunking"""
    
    def __init__(self, config: RetrievalConfig):
        self.config = config
        
    def load_document(self, file_path: str) -> List[Document]:
        """Load document with proper error handling"""
        logger.info(f"Loading document: {file_path}")
        
        try:
            if file_path.endswith(".pdf"):
                loader = PyPDFLoader(file_path)
            elif file_path.endswith(".txt"):
                loader = TextLoader(file_path)
            elif file_path.endswith(".docx"):
                loader = Docx2txtLoader(file_path)
            else:
                raise ValueError(f"Unsupported file type: {file_path.split('.')[-1]}")
            
            documents = loader.load()
            logger.info(f"Successfully loaded {len(documents)} document sections")
            return documents
            
        except Exception as e:
            logger.error(f"Error loading document: {e}")
            raise
    
    def create_semantic_chunks(self, documents: List[Document]) -> List[Document]:
        """Create semantically coherent chunks with overlap"""
        logger.info("Creating semantic chunks with overlap...")
        
        # Use improved text splitter with semantic awareness
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=self.config.chunk_size,
            chunk_overlap=self.config.chunk_overlap,
            separators=["\n\n", "\n", ". ", "! ", "? ", ", ", " ", ""],  # Semantic separators
            length_function=len,
            is_separator_regex=False
        )
        
        chunks = splitter.split_documents(documents)
        
        # Clean and validate chunks
        valid_chunks = []
        for i, chunk in enumerate(chunks):
            # Remove chunks that are too short or contain only whitespace
            content = chunk.page_content.strip()
            if len(content) >= 50:  # Minimum meaningful content
                chunk.metadata.update({
                    'chunk_id': i,
                    'chunk_length': len(content),
                    'source': chunk.metadata.get('source', 'unknown')
                })
                valid_chunks.append(chunk)
        
        logger.info(f"Created {len(valid_chunks)} semantic chunks with {self.config.chunk_overlap} character overlap")
        return valid_chunks

class EnhancedRetriever:
    """Enhanced retrieval with reranking and confidence scoring"""
    
    def __init__(self, config: RetrievalConfig):
        self.config = config
        self.embeddings = None
        self.vector_store = None
        self.reranker = None
        self.sentence_transformer = None
        
        # Initialize components
        self._initialize_embeddings()
        if config.use_reranker:
            self._initialize_reranker()
        self._initialize_sentence_transformer()
    
    def _initialize_embeddings(self):
        """Initialize embeddings model"""
        logger.info("Initializing BGE embeddings...")
        self.embeddings = HuggingFaceEmbeddings(
            model_name="BAAI/bge-small-en-v1.5",
            model_kwargs={'device': 'cuda' if torch.cuda.is_available() else 'cpu'},
            encode_kwargs={'normalize_embeddings': True, 'batch_size': 16}
        )
    
    def _initialize_reranker(self):
        """Initialize cross-encoder reranker"""
        try:
            logger.info(f"Loading reranker: {self.config.reranker_model}")
            self.reranker = CrossEncoder(self.config.reranker_model)
            logger.info("Reranker loaded successfully")
        except Exception as e:
            logger.warning(f"Could not load reranker: {e}. Using basic retrieval.")
            self.config.use_reranker = False
    
    def _initialize_sentence_transformer(self):
        """Initialize sentence transformer for fact checking"""
        try:
            logger.info("Loading sentence transformer for fact checking...")
            self.sentence_transformer = SentenceTransformer('all-MiniLM-L6-v2')
            logger.info("Sentence transformer loaded successfully")
        except Exception as e:
            logger.warning(f"Could not load sentence transformer: {e}")
    
    def build_vector_store(self, chunks: List[Document]) -> FAISS:
        """Build FAISS vector store with enhanced indexing"""
        logger.info(f"Building vector store from {len(chunks)} chunks...")
        
        self.vector_store = FAISS.from_documents(
            documents=chunks,
            embedding=self.embeddings
        )
        
        logger.info("Vector store built successfully")
        return self.vector_store
    
    def retrieve_and_rerank(self, query: str) -> Tuple[List[Document], ConfidenceScores]:
        """Enhanced retrieval with reranking and confidence scoring"""
        
        # Step 1: Initial retrieval with higher k
        initial_docs = self.vector_store.similarity_search_with_score(
            query, 
            k=self.config.initial_k
        )
        
        docs, retriever_scores = zip(*initial_docs) if initial_docs else ([], [])
        
        if not docs:
            return [], ConfidenceScores(0, 0, 0, 0, False)
        
        # Step 2: Reranking (if available)
        reranked_docs = list(docs)
        reranker_scores = [1.0] * len(docs)  # Default scores
        
        if self.config.use_reranker and self.reranker:
            try:
                # Create query-document pairs for reranking
                pairs = [(query, doc.page_content) for doc in docs]
                reranker_scores = self.reranker.predict(pairs)
                
                # Sort by reranker scores
                scored_docs = list(zip(docs, reranker_scores, retriever_scores))
                scored_docs.sort(key=lambda x: x[1], reverse=True)
                
                # Extract top-k after reranking
                reranked_docs = [doc for doc, _, _ in scored_docs[:self.config.final_k]]
                reranker_scores = [score for _, score, _ in scored_docs[:self.config.final_k]]
                
                logger.info(f"Reranked {len(docs)} documents, kept top {len(reranked_docs)}")
                
            except Exception as e:
                logger.warning(f"Reranking failed: {e}. Using basic retrieval.")
                reranked_docs = list(docs[:self.config.final_k])
                reranker_scores = [1.0] * len(reranked_docs)
        else:
            reranked_docs = list(docs[:self.config.final_k])
        
        # Step 3: Calculate confidence scores
        avg_retriever_score = np.mean(retriever_scores[:len(reranked_docs)])
        avg_reranker_score = np.mean(reranker_scores)
        
        # Combined confidence (weighted average)
        combined_confidence = (
            0.4 * avg_retriever_score + 
            0.6 * avg_reranker_score
        )
        
        confidence = ConfidenceScores(
            retriever_score=avg_retriever_score,
            reranker_score=avg_reranker_score,
            fact_check_score=0.0,  # Will be calculated later
            combined_confidence=combined_confidence,
            is_reliable=combined_confidence >= 0.5
        )
        
        return reranked_docs, confidence

class GroundedAnswerGenerator:
    """Generates strictly grounded answers with fact checking"""
    
    def __init__(self, model_name: str = "microsoft/phi-2"):
        self.model_name = model_name
        self.model = None
        self.tokenizer = None
        self.sentence_transformer = None
        
        # Strict system prompts by query type
        self.prompt_templates = {
            'definition': """You are a strict document assistant. Answer ONLY using the provided context. 

Context: {context}

Question: {query}

Instructions:
- Provide a clear 1-2 sentence definition using ONLY information from the context
- If the context doesn't contain a definition, respond: "The document does not contain enough information to define this concept."
- Never use outside knowledge

Answer:""",
            
            'explanation': """You are a strict document assistant. Answer ONLY using the provided context.

Context: {context}

Question: {query}

Instructions:
- Explain using 3-5 sentences with ONLY information from the context
- Include specific details and examples mentioned in the document
- If the context lacks sufficient explanation, respond: "The document does not contain enough information to explain this fully."
- Never use outside knowledge

Answer:""",
            
            'comparison': """You are a strict document assistant. Answer ONLY using the provided context.

Context: {context}

Question: {query}

Instructions:
- Compare items using bullet points with ONLY information from the context
- Format as: **Similarities:** and **Differences:**
- If the context lacks comparison information, respond: "The document does not contain enough information for this comparison."
- Never use outside knowledge

Answer:""",
            
            'listing': """You are a strict document assistant. Answer ONLY using the provided context.

Context: {context}

Question: {query}

Instructions:
- Provide a numbered or bulleted list using ONLY information from the context
- Include only items explicitly mentioned in the document
- If the context lacks list information, respond: "The document does not contain enough information to create this list."
- Never use outside knowledge

Answer:""",
            
            'general': """You are a strict document assistant. Answer ONLY using the provided context.

Context: {context}

Question: {query}

Instructions:
- Answer clearly and directly using ONLY information from the context
- If the context doesn't contain the answer, respond: "The document does not contain enough information to answer this question."
- Never use outside knowledge
- Be specific and cite details from the document

Answer:"""
        }
    
    def initialize_model(self):
        """Initialize language model for generation"""
        logger.info(f"Loading language model: {self.model_name}")
        
        # Quantization config for efficient inference
        bnb_config = BitsAndBytesConfig(
            load_in_4bit=True,
            bnb_4bit_compute_dtype=torch.float16,
            bnb_4bit_use_double_quant=True,
            bnb_4bit_quant_type="nf4"
        )
        
        # Load model
        self.model = AutoModelForCausalLM.from_pretrained(
            self.model_name,
            quantization_config=bnb_config,
            device_map="auto",
            trust_remote_code=True,
            torch_dtype=torch.float16,
            low_cpu_mem_usage=True,
            use_cache=True,
            max_memory={0: "4500MB"} if torch.cuda.is_available() else None
        )
        
        # Load tokenizer
        self.tokenizer = AutoTokenizer.from_pretrained(self.model_name, trust_remote_code=True)
        if self.tokenizer.pad_token is None:
            self.tokenizer.pad_token = self.tokenizer.eos_token
        
        # Initialize sentence transformer for fact checking
        try:
            self.sentence_transformer = SentenceTransformer('all-MiniLM-L6-v2')
            logger.info("Sentence transformer initialized for fact checking")
        except Exception as e:
            logger.warning(f"Could not initialize sentence transformer: {e}")
        
        logger.info("Language model initialized successfully")
    
    def detect_query_type(self, query: str) -> str:
        """Detect query type for appropriate prompting"""
        query_lower = query.lower()
        
        if any(word in query_lower for word in ['what is', 'define', 'definition of', 'meaning of']):
            return 'definition'
        elif any(word in query_lower for word in ['explain', 'how does', 'why does', 'how to']):
            return 'explanation'
        elif any(word in query_lower for word in ['difference', 'compare', 'versus', 'vs', 'contrast']):
            return 'comparison'
        elif any(word in query_lower for word in ['list', 'types of', 'kinds of', 'examples of']):
            return 'listing'
        else:
            return 'general'
    
    def generate_grounded_answer(self, query: str, retrieved_docs: List[Document], 
                                confidence: ConfidenceScores) -> Tuple[str, ConfidenceScores]:
        """Generate strictly grounded answer with fact checking"""
        
        if not retrieved_docs or not confidence.is_reliable:
            return "I couldn't find reliable information in the document to answer your question.", confidence
        
        # Create comprehensive context from retrieved documents
        context_parts = []
        for i, doc in enumerate(retrieved_docs):
            content = doc.page_content.strip()
            context_parts.append(f"Document {i+1}: {content}")
        
        context = "\n\n".join(context_parts)
        
        # Detect query type and select appropriate prompt
        query_type = self.detect_query_type(query)
        template = self.prompt_templates.get(query_type, self.prompt_templates['general'])
        
        # Create structured prompt
        prompt = template.format(context=context, query=query)
        
        # Generate answer
        try:
            inputs = self.tokenizer(prompt, return_tensors="pt", max_length=1024, truncation=True)
            
            if torch.cuda.is_available():
                inputs = inputs.to(self.model.device)
            
            with torch.no_grad():
                outputs = self.model.generate(
                    **inputs,
                    max_new_tokens=200,  # Adjusted for comprehensive answers
                    temperature=0.3,     # Lower for more focused responses
                    do_sample=True,
                    top_p=0.8,
                    pad_token_id=self.tokenizer.eos_token_id,
                    repetition_penalty=1.2,
                    use_cache=True,
                    no_repeat_ngram_size=3,
                    early_stopping=True
                )
            
            generated_text = self.tokenizer.decode(outputs[0], skip_special_tokens=True)
            
            # Extract answer part
            if "Answer:" in generated_text:
                answer = generated_text.split("Answer:")[-1].strip()
            else:
                # Fallback extraction
                prompt_length = len(prompt)
                if len(generated_text) > prompt_length:
                    answer = generated_text[prompt_length:].strip()
                else:
                    answer = "Unable to generate a proper response."
            
            # Fact check the generated answer
            fact_check_score = self._fact_check_answer(answer, retrieved_docs)
            confidence.fact_check_score = fact_check_score
            
            # Update combined confidence with fact checking
            confidence.combined_confidence = (
                0.3 * confidence.retriever_score +
                0.4 * confidence.reranker_score +
                0.3 * fact_check_score
            )
            confidence.is_reliable = confidence.combined_confidence >= 0.5
            
            # Apply fact checking filter
            if fact_check_score < 0.6:
                filtered_answer = self._filter_unsupported_content(answer, retrieved_docs)
                if len(filtered_answer.strip()) < 20:
                    return "The document does not contain enough reliable information to answer this question.", confidence
                answer = filtered_answer + "\n\n(Some parts of the response were filtered for accuracy.)"
            
            return answer, confidence
            
        except Exception as e:
            logger.error(f"Error generating answer: {e}")
            return "I encountered an error while generating the response.", confidence
    
    def _fact_check_answer(self, answer: str, retrieved_docs: List[Document]) -> float:
        """Semantic fact checking using sentence embeddings"""
        if not self.sentence_transformer or not answer or not retrieved_docs:
            return 0.5  # Default score if fact checking unavailable
        
        try:
            # Split answer into sentences
            sentences = [s.strip() for s in answer.replace('\n', ' ').split('.') if s.strip()]
            if not sentences:
                return 0.0
            
            # Combine all document content
            doc_content = ' '.join([doc.page_content for doc in retrieved_docs])
            
            # Calculate semantic similarity for each sentence
            similarities = []
            for sentence in sentences:
                if len(sentence) < 10:  # Skip very short sentences
                    continue
                
                # Encode sentence and document content
                embeddings = self.sentence_transformer.encode([sentence, doc_content])
                similarity = cosine_similarity([embeddings[0]], [embeddings[1]])[0][0]
                similarities.append(similarity)
            
            # Return average similarity
            return np.mean(similarities) if similarities else 0.0
            
        except Exception as e:
            logger.warning(f"Fact checking failed: {e}")
            return 0.5
    
    def _filter_unsupported_content(self, answer: str, retrieved_docs: List[Document]) -> str:
        """Filter out sentences not supported by documents"""
        if not self.sentence_transformer:
            return answer
        
        try:
            sentences = [s.strip() for s in answer.replace('\n', ' ').split('.') if s.strip()]
            doc_content = ' '.join([doc.page_content for doc in retrieved_docs])
            
            supported_sentences = []
            for sentence in sentences:
                if len(sentence) < 10:
                    continue
                
                # Check semantic similarity
                embeddings = self.sentence_transformer.encode([sentence, doc_content])
                similarity = cosine_similarity([embeddings[0]], [embeddings[1]])[0][0]
                
                if similarity >= 0.6:  # Threshold for support
                    supported_sentences.append(sentence)
            
            return '. '.join(supported_sentences) + '.' if supported_sentences else ""
            
        except Exception as e:
            logger.warning(f"Content filtering failed: {e}")
            return answer

class EnhancedRAGSystem:
    """Complete enhanced RAG system with grounded responses"""
    
    def __init__(self, model_name: str = "microsoft/phi-2"):
        self.config = RetrievalConfig()
        self.doc_processor = EnhancedDocumentProcessor(self.config)
        self.retriever = EnhancedRetriever(self.config)
        self.generator = GroundedAnswerGenerator(model_name)
        
        logger.info("Enhanced RAG system initialized")
    
    def load_and_process_document(self, file_path: str):
        """Load and process document with enhanced chunking"""
        # Load document
        documents = self.doc_processor.load_document(file_path)
        
        # Create semantic chunks
        chunks = self.doc_processor.create_semantic_chunks(documents)
        
        # Build vector store
        self.retriever.build_vector_store(chunks)
        
        logger.info(f"Document processed: {len(chunks)} chunks created")
    
    def initialize_model(self):
        """Initialize the language model"""
        self.generator.initialize_model()
    
    def ask_question(self, query: str) -> Dict[str, any]:
        """Ask a question and get grounded answer with confidence metrics"""
        logger.info(f"Processing query: {query[:100]}...")
        
        start_time = time.time()
        
        # Retrieve and rerank documents
        retrieved_docs, confidence = self.retriever.retrieve_and_rerank(query)
        
        # Generate grounded answer
        answer, updated_confidence = self.generator.generate_grounded_answer(
            query, retrieved_docs, confidence
        )
        
        response_time = time.time() - start_time
        
        result = {
            'query': query,
            'answer': answer,
            'confidence': {
                'retriever_score': updated_confidence.retriever_score,
                'reranker_score': updated_confidence.reranker_score,
                'fact_check_score': updated_confidence.fact_check_score,
                'combined_confidence': updated_confidence.combined_confidence,
                'is_reliable': updated_confidence.is_reliable
            },
            'response_time': response_time,
            'retrieved_docs': len(retrieved_docs),
            'query_type': self.generator.detect_query_type(query)
        }
        
        logger.info(f"Query processed in {response_time:.2f}s, confidence: {updated_confidence.combined_confidence:.2f}")
        
        return result

# Testing and demonstration functions
def create_test_document():
    """Create a comprehensive test document"""
    test_content = """
Machine Learning and Artificial Intelligence Guide

Introduction to Machine Learning
Machine learning is a subset of artificial intelligence that enables computers to learn and make decisions from data without being explicitly programmed for every task. It focuses on developing algorithms that can automatically improve their performance through experience.

Types of Machine Learning

1. Supervised Learning
Supervised learning uses labeled datasets to train algorithms that classify data or predict outcomes accurately. The algorithm learns from input-output pairs. Common examples include:
- Linear regression for predicting continuous values
- Decision trees for classification tasks
- Neural networks for complex pattern recognition
- Support vector machines for classification and regression

2. Unsupervised Learning
Unsupervised learning finds hidden patterns in data without labeled examples. The algorithm must discover structure on its own. Key techniques include:
- K-means clustering for grouping similar data points
- Principal Component Analysis (PCA) for dimensionality reduction
- Hierarchical clustering for creating data hierarchies
- Association rule mining for finding relationships

3. Reinforcement Learning
Reinforcement learning trains algorithms through interaction with an environment, using rewards and penalties to learn optimal behavior. The agent learns through trial and error. Applications include:
- Game playing (chess, Go, video games)
- Robotics and autonomous systems
- Trading algorithms
- Recommendation systems

Deep Learning
Deep learning is a subset of machine learning that uses artificial neural networks with multiple layers (typically 3 or more) to model and understand complex patterns in data. It has revolutionized fields like computer vision, natural language processing, and speech recognition.

Key characteristics of deep learning:
- Uses neural networks with many hidden layers
- Automatically learns feature representations
- Requires large amounts of data
- Computationally intensive but highly effective

Applications of Machine Learning
Machine learning has numerous real-world applications:
- Image recognition and computer vision systems
- Natural language processing and chatbots
- Recommendation systems for e-commerce and streaming
- Autonomous vehicles and transportation
- Medical diagnosis and drug discovery
- Financial fraud detection and risk assessment
- Predictive maintenance in manufacturing

Challenges in Machine Learning
Despite its power, machine learning faces several challenges:
- Data quality and availability issues
- Computational requirements and scalability
- Model interpretability and explainability
- Bias and fairness in algorithmic decisions
- Overfitting and poor generalization
- Privacy and security concerns
- Integration with existing systems

Best Practices
To succeed with machine learning projects:
- Start with clear problem definition and success metrics
- Ensure high-quality, relevant training data
- Choose appropriate algorithms for your specific problem
- Validate models thoroughly with proper testing
- Monitor performance in production environments
- Consider ethical implications and bias mitigation
- Document processes and maintain reproducibility
"""
    
    with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as f:
        f.write(test_content)
        return f.name

def main():
    """Demonstration of enhanced RAG system"""
    print("🚀 Enhanced RAG System with Grounded Responses")
    print("=" * 60)
    
    parser = argparse.ArgumentParser(description="Enhanced RAG System")
    parser.add_argument("--file", type=str, help="Path to document file")
    parser.add_argument("--demo", action="store_true", help="Run demo with test document")
    args = parser.parse_args()
    
    try:
        # Initialize system
        rag_system = EnhancedRAGSystem()
        
        # Determine document source
        if args.demo:
            print("🎨 Creating comprehensive test document...")
            document_path = create_test_document()
        elif args.file:
            document_path = args.file
            if not os.path.exists(document_path):
                print(f"❌ Document not found: {document_path}")
                return
        else:
            print("❌ Please provide --file path or use --demo flag")
            print("Example: python enhanced_rag_system.py --demo")
            return
        
        # Process document
        print(f"\n📄 Processing document: {document_path}")
        rag_system.load_and_process_document(document_path)
        
        # Initialize model
        print("\n🧠 Loading language model...")
        rag_system.initialize_model()
        
        print("\n✅ Enhanced RAG system ready!")
        print("💡 Key improvements:")
        print("   • Semantic chunking with overlap")
        print("   • Cross-encoder reranking")
        print("   • Strict grounding prompts")
        print("   • Semantic fact checking")
        print("   • Query-aware formatting")
        print("   • Confidence scoring")
        
        # Interactive Q&A
        print(f"\n💬 Interactive Q&A (document: {os.path.basename(document_path)})")
        print("Type 'quit' to exit\n")
        
        while True:
            try:
                question = input("❓ Ask a question: ").strip()
                
                if question.lower() in ['quit', 'exit', 'q']:
                    print("👋 Goodbye!")
                    break
                
                if not question:
                    continue
                
                print(f"\n🔍 Processing your question...")
                result = rag_system.ask_question(question)
                
                print(f"\n💡 Answer: {result['answer']}")
                print(f"\n📊 Metrics:")
                print(f"   • Response time: {result['response_time']:.2f}s")
                print(f"   • Query type: {result['query_type']}")
                print(f"   • Retrieved docs: {result['retrieved_docs']}")
                print(f"   • Combined confidence: {result['confidence']['combined_confidence']:.2f}")
                print(f"   • Fact check score: {result['confidence']['fact_check_score']:.2f}")
                print(f"   • Reliable: {'✅' if result['confidence']['is_reliable'] else '❌'}")
                print()
                
            except KeyboardInterrupt:
                print("\n👋 Goodbye!")
                break
            except Exception as e:
                print(f"\n❌ Error: {e}\n")
        
        # Cleanup
        if args.demo and os.path.exists(document_path):
            os.unlink(document_path)
        
        print("🏁 Enhanced RAG system finished!")
        
    except Exception as e:
        print(f"❌ Critical error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()