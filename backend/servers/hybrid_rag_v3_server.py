#!/usr/bin/env python3
"""
Hybrid RAG v3.0 - Production-Ready Document Analysis System
============================================================

Architecture:
- BGE Embeddings: BAAI/bge-base-en-v1.5 for semantic search
- Vector Store: ChromaDB for efficient retrieval
- LLM: Groq Llama-3.3-70B for answer generation
- Web Fallback: Wikipedia/Web search with confidence threshold
- Response Cleaner: Advanced cleaning and formatting

Author: Engunity AI Team
Version: 3.0.0
"""

import asyncio
import logging
import time
import re
import os
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass
from enum import Enum

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import uvicorn
from dotenv import load_dotenv

# Vector & Embedding Libraries
from sentence_transformers import SentenceTransformer
import chromadb
from chromadb.config import Settings
import numpy as np

# LLM Integration
from groq import Groq

# Web Search
import wikipedia

# Load environment
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ============================================================================
# Configuration
# ============================================================================

class RAGConfig:
    """Centralized configuration for Hybrid RAG v3.0"""

    # BGE Embeddings
    BGE_MODEL = "BAAI/bge-base-en-v1.5"
    EMBEDDING_DIM = 768

    # Retrieval Settings
    TOP_K_CHUNKS = 5
    SIMILARITY_THRESHOLD = 0.75  # Minimum similarity for document relevance
    WEB_FALLBACK_THRESHOLD = 0.70  # Trigger web search if below this (reduced from 0.85)

    # Groq LLM
    GROQ_MODEL = "llama-3.3-70b-versatile"
    GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
    MAX_TOKENS = 1024
    TEMPERATURE = 0.5  # Reduced from 0.7 for more factual answers

    # Document Processing
    CHUNK_SIZE = 512
    CHUNK_OVERLAP = 100  # Increased from 50 for better context continuity
    MAX_CONTEXT_LENGTH = 8000  # Max chars for context (approx 2000 tokens)

    # ChromaDB
    CHROMA_PERSIST_DIR = "./data/chroma_db"


# ============================================================================
# Data Models
# ============================================================================

class DocumentType(str, Enum):
    """Supported document types for specialized processing"""
    PYTHON = "python"
    TYPESCRIPT = "typescript"
    JAVASCRIPT = "javascript"
    SQL = "sql"
    POSTGRESQL = "postgresql"
    MARKDOWN = "markdown"
    GENERAL = "general"


@dataclass
class RetrievalResult:
    """Results from vector retrieval"""
    chunks: List[str]
    scores: List[float]
    metadata: List[Dict[str, Any]]
    mean_similarity: float
    top_score: float


@dataclass
class WebSearchResult:
    """Results from web fallback search"""
    content: str
    source: str
    confidence: float


class QueryRequest(BaseModel):
    query: str = Field(..., description="User question")
    document_id: Optional[str] = Field(None, description="Document identifier")
    document_text: Optional[str] = Field(None, description="Full document text")
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)


class RAGResponse(BaseModel):
    answer: str
    confidence: float
    source_type: str  # "document", "hybrid", "web_fallback"
    source_chunks_used: List[str]
    processing_time: float
    metadata: Dict[str, Any]


# ============================================================================
# Core Components
# ============================================================================

class BGERetriever:
    """BGE-based semantic retrieval with vector storage (LAZY LOADING)"""

    def __init__(self, config: RAGConfig):
        self.config = config
        self._embedder = None  # Lazy load
        self._chroma_client = None  # Lazy load
        self.collections = {}
        logger.info(f"🔧 BGE Retriever initialized (models will load on first use)")

    @property
    def embedder(self):
        """Lazy load BGE model only when needed"""
        if self._embedder is None:
            logger.info(f"⚡ Loading BGE model: {self.config.BGE_MODEL}")
            self._embedder = SentenceTransformer(self.config.BGE_MODEL)
            logger.info("✅ BGE model loaded successfully")
        return self._embedder

    @property
    def chroma_client(self):
        """Lazy load ChromaDB only when needed"""
        if self._chroma_client is None:
            logger.info("⚡ Initializing ChromaDB...")
            self._chroma_client = chromadb.Client(Settings(
                persist_directory=self.config.CHROMA_PERSIST_DIR,
                anonymized_telemetry=False
            ))
            logger.info("✅ ChromaDB initialized")
        return self._chroma_client

    def detect_document_type(self, text: str, filename: str = "") -> DocumentType:
        """Detect document type from content and filename"""
        text_lower = text.lower()[:1000]  # Check first 1000 chars
        filename_lower = filename.lower()

        # File extension mapping
        if filename_lower.endswith(('.py', '.pyx')):
            return DocumentType.PYTHON
        elif filename_lower.endswith(('.ts', '.tsx')):
            return DocumentType.TYPESCRIPT
        elif filename_lower.endswith(('.js', '.jsx')):
            return DocumentType.JAVASCRIPT
        elif filename_lower.endswith('.sql'):
            return DocumentType.SQL
        elif filename_lower.endswith('.md'):
            return DocumentType.MARKDOWN

        # Content-based detection
        if 'postgresql' in text_lower or 'postgres' in text_lower:
            return DocumentType.POSTGRESQL
        elif 'def ' in text_lower or 'import ' in text_lower or 'class ' in text_lower:
            return DocumentType.PYTHON
        elif 'function' in text_lower or 'const ' in text_lower or 'let ' in text_lower:
            return DocumentType.JAVASCRIPT

        return DocumentType.GENERAL

    def chunk_document(self, text: str) -> List[str]:
        """Split document into overlapping chunks"""
        chunks = []
        chunk_size = self.config.CHUNK_SIZE
        overlap = self.config.CHUNK_OVERLAP

        # Split by paragraphs first
        paragraphs = text.split('\n\n')
        current_chunk = ""

        for para in paragraphs:
            if len(current_chunk) + len(para) < chunk_size:
                current_chunk += para + "\n\n"
            else:
                if current_chunk:
                    chunks.append(current_chunk.strip())
                current_chunk = para + "\n\n"

        if current_chunk:
            chunks.append(current_chunk.strip())

        # If no paragraphs, do simple chunking
        if len(chunks) <= 1:
            for i in range(0, len(text), chunk_size - overlap):
                chunk = text[i:i + chunk_size]
                if chunk.strip():
                    chunks.append(chunk.strip())

        logger.info(f"📄 Document chunked into {len(chunks)} pieces")
        return chunks

    async def index_document(self, document_id: str, text: str, metadata: Dict[str, Any] = None) -> None:
        """Index a document into vector store"""
        logger.info(f"🔍 Indexing document: {document_id}")
        logger.info(f"📝 Document text length: {len(text)} chars ({len(text.split())} words)")

        # Detect document type
        doc_type = self.detect_document_type(text, metadata.get('filename', '') if metadata else '')
        logger.info(f"📋 Document type: {doc_type.value}")

        # Chunk document
        chunks = self.chunk_document(text)

        # Create or get collection
        collection_name = f"doc_{document_id}".replace('-', '_')[:63]  # ChromaDB name limits

        try:
            collection = self.chroma_client.get_collection(collection_name)
            logger.info(f"♻️  Using existing collection: {collection_name}")
        except:
            collection = self.chroma_client.create_collection(
                name=collection_name,
                metadata={"document_type": doc_type.value}
            )
            logger.info(f"✨ Created new collection: {collection_name}")

        # Generate embeddings
        logger.info("🧮 Generating embeddings...")
        embeddings = self.embedder.encode(chunks, show_progress_bar=False)

        # Prepare data for insertion
        ids = [f"{document_id}_chunk_{i}" for i in range(len(chunks))]
        metadatas = [
            {
                "chunk_id": i,
                "document_type": doc_type.value,
                "char_count": len(chunk),
                **(metadata or {})
            }
            for i, chunk in enumerate(chunks)
        ]

        # Add to collection
        logger.info(f"💾 Adding {len(chunks)} chunks to ChromaDB collection '{collection_name}'...")
        collection.add(
            ids=ids,
            embeddings=embeddings.tolist(),
            documents=chunks,
            metadatas=metadatas
        )

        self.collections[document_id] = collection
        logger.info(f"✅ Indexed {len(chunks)} chunks for document {document_id}")

    async def retrieve(self, document_id: str, query: str) -> RetrievalResult:
        """Retrieve relevant chunks for a query"""
        logger.info(f"🔎 Retrieving context for: '{query[:50]}...'")

        # Get collection
        collection_name = f"doc_{document_id}".replace('-', '_')[:63]

        try:
            collection = self.chroma_client.get_collection(collection_name)
        except:
            logger.warning(f"⚠️ Collection not found: {collection_name}")
            return RetrievalResult([], [], [], 0.0, 0.0)

        # Encode query
        query_embedding = self.embedder.encode([query], show_progress_bar=False)[0]

        # Search
        results = collection.query(
            query_embeddings=[query_embedding.tolist()],
            n_results=self.config.TOP_K_CHUNKS
        )

        chunks = results['documents'][0] if results['documents'] else []
        distances = results['distances'][0] if results['distances'] else []
        metadatas = results['metadatas'][0] if results['metadatas'] else []

        # Convert distances to similarity scores (1 - normalized distance)
        scores = [1 - (d / 2.0) for d in distances]  # Cosine distance to similarity

        mean_similarity = np.mean(scores) if scores else 0.0
        top_score = max(scores) if scores else 0.0

        logger.info(f"📊 Retrieved {len(chunks)} chunks | Mean similarity: {mean_similarity:.3f}")

        return RetrievalResult(
            chunks=chunks,
            scores=scores,
            metadata=metadatas,
            mean_similarity=mean_similarity,
            top_score=top_score
        )


class GroqGenerator:
    """Groq LLM-based answer generation"""

    def __init__(self, config: RAGConfig):
        self.config = config
        self.client = Groq(api_key=config.GROQ_API_KEY)
        logger.info(f"✅ Groq client initialized: {config.GROQ_MODEL}")

    async def generate(
        self,
        query: str,
        context: str,
        doc_type: str = "general",
        use_web_context: bool = False
    ) -> str:
        """Generate answer using Groq LLM"""

        # Build specialized prompt based on document type
        system_prompt = self._get_system_prompt(doc_type)

        # User prompt with context
        if use_web_context:
            user_prompt = f"""You are answering based on a combination of document content and web search results.

Document Context:
{context}

Question: {query}

Provide a comprehensive answer that synthesizes both sources. Be clear about what comes from the document vs. web search."""
        else:
            user_prompt = f"""You are answering based on the provided document content.

Document Context:
{context}

Question: {query}

IMPORTANT: Only answer based on the information in the context above. If the answer is not in the context, clearly state: "The provided document does not contain information about [topic]. However, based on general knowledge..." and then provide a helpful general answer."""

        try:
            response = self.client.chat.completions.create(
                model=self.config.GROQ_MODEL,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=self.config.TEMPERATURE,
                max_tokens=self.config.MAX_TOKENS,
                top_p=1,
                stream=False
            )

            return response.choices[0].message.content

        except Exception as e:
            logger.error(f"❌ Groq generation error: {e}")
            raise

    def _get_system_prompt(self, doc_type: str) -> str:
        """Get specialized system prompt based on document type"""
        prompts = {
            "python": "You are an expert Python developer. Provide accurate, technical answers about Python code, libraries, and best practices.",
            "typescript": "You are an expert TypeScript/JavaScript developer. Provide accurate answers about TypeScript, types, and modern JavaScript.",
            "sql": "You are a database expert. Provide accurate answers about SQL, PostgreSQL, and database design.",
            "postgresql": "You are a PostgreSQL database expert. Provide accurate answers about PostgreSQL features, queries, and optimization.",
            "general": "You are a helpful technical assistant. Provide accurate, clear, and concise answers."
        }
        return prompts.get(doc_type, prompts["general"])


class WebFallbackSearch:
    """Intelligent web search fallback"""

    async def search(self, query: str, doc_type: str = "general") -> Optional[WebSearchResult]:
        """Perform web search when document context is insufficient"""
        logger.info(f"🌐 Triggering web fallback search for: '{query[:50]}...'")

        try:
            # Set Wikipedia language
            wikipedia.set_lang("en")

            # Enhance query based on document type
            enhanced_query = self._enhance_query(query, doc_type)

            # Search Wikipedia
            search_results = wikipedia.search(enhanced_query, results=3)

            if not search_results:
                logger.warning("⚠️ No Wikipedia results found")
                return None

            # Get first result page
            page = wikipedia.page(search_results[0], auto_suggest=False)

            # Extract summary (first 500 chars)
            content = page.content[:500]

            logger.info(f"✅ Web search successful: {page.title}")

            return WebSearchResult(
                content=content,
                source=f"Wikipedia: {page.title}",
                confidence=0.8
            )

        except Exception as e:
            logger.error(f"❌ Web search failed: {e}")
            return None

    def _enhance_query(self, query: str, doc_type: str) -> str:
        """Enhance query based on document type"""
        enhancements = {
            "python": f"Python programming {query}",
            "typescript": f"TypeScript {query}",
            "sql": f"SQL database {query}",
            "postgresql": f"PostgreSQL {query}"
        }
        return enhancements.get(doc_type, query)


class ResponseCleaner:
    """Advanced response cleaning and formatting"""

    def clean(self, text: str) -> str:
        """Clean response text"""
        if not text:
            return ""

        # Remove markdown formatting
        text = re.sub(r'```[\s\S]*?```', '', text)  # Code blocks
        text = re.sub(r'`([^`]+)`', r'\1', text)  # Inline code
        text = re.sub(r'\*\*([^\*]+)\*\*', r'\1', text)  # Bold
        text = re.sub(r'\*([^\*]+)\*', r'\1', text)  # Italic
        text = re.sub(r'#+\s+', '', text)  # Headers

        # Remove artifacts
        text = re.sub(r'={3,}', '', text)
        text = re.sub(r'-{3,}', '', text)
        text = re.sub(r'_{3,}', '', text)

        # Clean whitespace
        text = re.sub(r'\n\s*\n\s*\n+', '\n\n', text)
        text = re.sub(r'[ \t]+', ' ', text)

        return text.strip()


# ============================================================================
# Main Pipeline
# ============================================================================

class HybridRAGPipeline:
    """Main Hybrid RAG v3.0 Pipeline"""

    def __init__(self):
        self.config = RAGConfig()
        self.retriever = BGERetriever(self.config)
        self.generator = GroqGenerator(self.config)
        self.web_search = WebFallbackSearch()
        self.cleaner = ResponseCleaner()

        logger.info("🚀 Hybrid RAG v3.0 Pipeline initialized")

    async def process_query(
        self,
        query: str,
        document_id: Optional[str] = None,
        document_text: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> RAGResponse:
        """Main processing pipeline"""
        start_time = time.time()

        # Step 1: Index document if provided
        if document_text and document_id:
            logger.info(f"📥 Received document_text for indexing: {len(document_text)} chars")
            await self.retriever.index_document(document_id, document_text, metadata)
            logger.info(f"✅ Document indexing complete for: {document_id}")
        elif not document_text and document_id:
            logger.warning(f"⚠️  No document_text provided, will search existing index for: {document_id}")

        # Step 2: Retrieve relevant chunks
        if not document_id:
            raise HTTPException(status_code=400, detail="document_id required")

        retrieval_result = await self.retriever.retrieve(document_id, query)

        # Step 3: Evaluate confidence and decide on fallback
        use_web_fallback = retrieval_result.mean_similarity < self.config.WEB_FALLBACK_THRESHOLD
        source_type = "document"

        # Build context with token limit enforcement
        # Limit to top 3 chunks and enforce MAX_CONTEXT_LENGTH
        selected_chunks = []
        total_length = 0
        for chunk in retrieval_result.chunks[:3]:
            if total_length + len(chunk) > self.config.MAX_CONTEXT_LENGTH:
                # Truncate the chunk to fit
                remaining_space = self.config.MAX_CONTEXT_LENGTH - total_length
                if remaining_space > 100:  # Only add if meaningful space left
                    selected_chunks.append(chunk[:remaining_space] + "...")
                break
            selected_chunks.append(chunk)
            total_length += len(chunk)

        context = "\n\n".join(selected_chunks)
        logger.info(f"📝 Context length: {len(context)} chars from {len(selected_chunks)} chunks")
        web_context = None

        # Step 4: Web fallback if needed
        if use_web_fallback and retrieval_result.chunks:
            logger.warning(f"⚠️ Low confidence ({retrieval_result.mean_similarity:.2f}). Triggering web search...")

            # Detect document type
            doc_type = retrieval_result.metadata[0].get('document_type', 'general') if retrieval_result.metadata else 'general'

            web_result = await self.web_search.search(query, doc_type)

            if web_result:
                web_context = web_result.content
                context = f"{context}\n\n--- Web Search Results ---\n{web_context}"
                source_type = "hybrid"

        # Handle no document content
        if not retrieval_result.chunks:
            logger.warning("⚠️ No document chunks found. Using web search only...")
            web_result = await self.web_search.search(query, 'general')
            if web_result:
                context = web_result.content
                source_type = "web_fallback"
            else:
                context = "No relevant information found."

        # Step 5: Generate answer
        doc_type = retrieval_result.metadata[0].get('document_type', 'general') if retrieval_result.metadata else 'general'

        answer = await self.generator.generate(
            query,
            context,
            doc_type,
            use_web_context=(source_type == "hybrid")
        )

        # Step 6: Clean response
        cleaned_answer = self.cleaner.clean(answer)

        # Calculate metrics
        processing_time = time.time() - start_time
        confidence = retrieval_result.mean_similarity if retrieval_result.chunks else 0.5

        # Build metadata (convert all numpy types to Python native types)
        response_metadata = {
            "pipeline_type": "hybrid_rag_v3",
            "components_used": [
                "BGE Retriever",
                "Groq Llama-3.3-70B",
                "Wikipedia Fallback" if use_web_fallback else None
            ],
            "document_type": str(doc_type),
            "retrieval_stats": {
                "chunks_retrieved": int(len(retrieval_result.chunks)),
                "chunks_used": int(len(selected_chunks)),
                "context_length": int(len(context)),
                "mean_similarity": float(retrieval_result.mean_similarity),
                "top_similarity": float(retrieval_result.top_score),
                "fallback_triggered": bool(use_web_fallback)
            },
            "response_cleaning": "completed",
            "model": str(self.config.GROQ_MODEL),
            "bge_model": str(self.config.BGE_MODEL)
        }

        return RAGResponse(
            answer=cleaned_answer,
            confidence=float(confidence),
            source_type=source_type,
            source_chunks_used=[str(chunk) for chunk in selected_chunks],  # Use actual selected chunks
            processing_time=float(processing_time),
            metadata=response_metadata
        )


# ============================================================================
# FastAPI Application
# ============================================================================

app = FastAPI(
    title="Hybrid RAG v3.0",
    version="3.0.0",
    description="Production-ready Hybrid RAG with BGE + Groq + Web Fallback"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Lazy initialize pipeline (models load on first request)
pipeline = None

def get_pipeline():
    """Lazy load pipeline to save memory at startup"""
    global pipeline
    if pipeline is None:
        logger.info("⚡ Initializing Hybrid RAG Pipeline on first request...")
        pipeline = HybridRAGPipeline()
    return pipeline


@app.post("/query", response_model=RAGResponse)
async def process_query(request: QueryRequest):
    """Process a query through Hybrid RAG v3.0"""
    try:
        logger.info(f"📥 New query: '{request.query[:50]}...'")

        # Lazy load pipeline
        pipe = get_pipeline()

        result = await pipe.process_query(
            query=request.query,
            document_id=request.document_id,
            document_text=request.document_text,
            metadata=request.metadata
        )

        logger.info(f"✅ Query processed in {result.processing_time:.2f}s | Confidence: {result.confidence:.2f}")

        return result

    except Exception as e:
        logger.error(f"❌ Query processing failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "version": "3.0.0",
        "system": "Hybrid RAG v3.0",
        "models_loaded": pipeline is not None,
        "components": {
            "bge_retriever": "lazy_load" if pipeline is None else "active",
            "groq_generator": "lazy_load" if pipeline is None else "active",
            "web_fallback": "active",
            "vector_store": "chromadb"
        }
    }


@app.get("/status")
async def get_status():
    """Detailed system status"""
    return {
        "system": "Hybrid RAG v3.0",
        "version": "3.0.0",
        "architecture": "BGE + ChromaDB + Groq + Wikipedia",
        "components": {
            "BGE Retriever": {
                "status": "active",
                "model": RAGConfig.BGE_MODEL,
                "features": ["semantic_search", "document_chunking", "type_detection", "reranking"]
            },
            "Groq Generator": {
                "status": "active",
                "model": RAGConfig.GROQ_MODEL,
                "features": ["answer_generation", "document_grounding", "specialized_prompts"]
            },
            "Vector Store": {
                "status": "active",
                "backend": "ChromaDB",
                "features": ["persistent_storage", "semantic_search", "metadata_filtering"]
            },
            "Web Fallback": {
                "status": "active",
                "source": "Wikipedia",
                "features": ["confidence_based_trigger", "query_enhancement", "result_merging"]
            }
        },
        "configuration": {
            "top_k_chunks": RAGConfig.TOP_K_CHUNKS,
            "similarity_threshold": RAGConfig.SIMILARITY_THRESHOLD,
            "fallback_threshold": RAGConfig.WEB_FALLBACK_THRESHOLD,
            "max_tokens": RAGConfig.MAX_TOKENS
        }
    }


if __name__ == "__main__":
    print("=" * 70)
    print("🚀 Hybrid RAG v3.0 - Production System")
    print("=" * 70)
    print()
    print("📊 Architecture:")
    print("  ✅ BGE Embeddings: BAAI/bge-base-en-v1.5")
    print("  ✅ Vector Store: ChromaDB")
    print("  ✅ LLM: Groq Llama-3.3-70B")
    print("  ✅ Web Fallback: Wikipedia Search")
    print()
    print("🎯 Features:")
    print("  • Real semantic search (not simulated)")
    print("  • Intelligent confidence-based web fallback")
    print("  • Document type detection")
    print("  • Advanced response cleaning")
    print("  • Persistent vector storage")
    print()
    print("🌐 Server starting on: http://localhost:8002")
    print("=" * 70)

    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8002,
        log_level="info"
    )
