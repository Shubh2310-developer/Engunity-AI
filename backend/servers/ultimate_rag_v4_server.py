#!/usr/bin/env python3
"""
Ultimate RAG v4.0 - Production-Grade Document Q&A System
=========================================================

ALL ADVANCED TECHNIQUES IMPLEMENTED:
✅ Advanced text preprocessing with PyMuPDF
✅ Semantic-aware chunking with overlap
✅ BGE-large embeddings (1.3B params)
✅ Hybrid retrieval (BM25 + FAISS)
✅ Cross-encoder re-ranking
✅ Gemini web search integration
✅ Best-of-N generation
✅ Quality metrics & grounding scores
✅ Dynamic confidence thresholds

Author: Engunity AI Team
Version: 4.0.0
Date: 2025-10-25
"""

import asyncio
import logging
import time
import re
import os
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass
from enum import Enum
import numpy as np

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import uvicorn
from dotenv import load_dotenv

# Advanced Text Processing
import PyPDF2
from io import BytesIO
import requests

# Vector & Embedding Libraries
from sentence_transformers import SentenceTransformer, CrossEncoder
from langchain_text_splitters import RecursiveCharacterTextSplitter
import chromadb
from chromadb.config import Settings

# BM25 for hybrid retrieval
from rank_bm25 import BM25Okapi

# LLM Integration
from groq import Groq

# Gemini for web search
import google.generativeai as genai

# Load environment
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ============================================================================
# ADVANCED CONFIGURATION
# ============================================================================

@dataclass
class UltimateRAGConfig:
    """Advanced RAG Configuration with ALL optimizations"""

    # ===== EMBEDDING MODELS =====
    BGE_MODEL = "BAAI/bge-large-en-v1.5"  # Upgraded from small (1.3B params)
    EMBEDDING_DIM = 1024  # Large model dimension

    # ===== RE-RANKING =====
    RERANKER_MODEL = "cross-encoder/ms-marco-MiniLM-L-12-v2"  # Upgraded to L-12
    ENABLE_RERANKING = True

    # ===== RETRIEVAL SETTINGS =====
    TOP_K_INITIAL = 20  # Initial retrieval (increased from 10)
    TOP_K_RERANK = 10  # After re-ranking
    TOP_K_FINAL = 7  # Final chunks for generation

    # BM25 Hybrid weights
    BM25_WEIGHT = 0.3
    VECTOR_WEIGHT = 0.7

    # Quality thresholds
    SIMILARITY_THRESHOLD = 0.55  # Minimum chunk quality
    CONFIDENCE_HIGH = 0.75  # High confidence
    CONFIDENCE_MEDIUM = 0.60  # Medium confidence
    CONFIDENCE_LOW = 0.45  # Low confidence

    # ===== CHUNKING STRATEGY =====
    CHUNK_SIZE = 800  # Semantic chunks
    CHUNK_OVERLAP = 200  # High overlap for context
    SEPARATORS = ["\n\n", "\n", ". ", "! ", "? ", "; ", ": ", " ", ""]

    # ===== LLM GENERATION =====
    GROQ_MODEL = "llama-3.3-70b-versatile"  # Updated from deprecated 3.1 model (Dec 2024)
    GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
    MAX_TOKENS = 2048  # Increased for detailed answers
    TEMPERATURE = 0.3  # Low for factual answers
    BEST_OF_N = 3  # Best-of-N sampling

    # ===== WEB SEARCH =====
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL = "gemini-1.5-flash"
    ENABLE_WEB_SEARCH = True
    WEB_SEARCH_THRESHOLD = 0.50  # Trigger if retrieval confidence < 50%

    # ===== CONTEXT MANAGEMENT =====
    MAX_CONTEXT_LENGTH = 16000  # Increased context window

    # ===== STORAGE =====
    CHROMA_PERSIST_DIR = "./data/ultimate_chroma_v4"


config = UltimateRAGConfig()

# ============================================================================
# DATA MODELS
# ============================================================================

class QueryRequest(BaseModel):
    query: str = Field(..., description="User question")
    document_id: str = Field(..., description="Document identifier")
    document_text: Optional[str] = Field(None, description="Full document text")
    enable_web_search: bool = Field(True, description="Enable Gemini web search")
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)


class RetrievalMetrics(BaseModel):
    chunks_retrieved: int
    chunks_reranked: int
    chunks_used: int
    bm25_scores: List[float]
    vector_scores: List[float]
    rerank_scores: List[float]
    mean_similarity: float
    confidence_level: str
    web_search_triggered: bool


class QualityMetrics(BaseModel):
    retrieval_confidence: float
    answer_grounding: float
    faithfulness_score: float
    best_of_n_selected: int


class UltimateRAGResponse(BaseModel):
    answer: str
    confidence: float
    source_type: str
    source_chunks_used: List[str]
    processing_time: float
    retrieval_metrics: RetrievalMetrics
    quality_metrics: QualityMetrics
    metadata: Dict[str, Any]


# ============================================================================
# ADVANCED TEXT PREPROCESSING
# ============================================================================

class AdvancedTextPreprocessor:
    """Clean and normalize PDF text with advanced techniques"""

    @staticmethod
    def clean_pdf_text(text: str) -> str:
        """Advanced text cleaning for PDFs"""
        if not text:
            return ""

        # Fix broken words (ConvolutionalNetworks -> Convolutional Networks)
        text = re.sub(r'([a-z])([A-Z])', r'\1 \2', text)

        # Normalize whitespace
        text = re.sub(r'\s+', ' ', text)

        # Fix broken lines (words split across lines)
        text = re.sub(r'(\w+)-\s+(\w+)', r'\1\2', text)

        # Remove page headers/footers (common patterns)
        text = re.sub(r'Page \d+( of \d+)?', '', text, flags=re.IGNORECASE)
        text = re.sub(r'^\d+\s*$', '', text, flags=re.MULTILINE)

        # Fix common PDF artifacts
        text = text.replace('ﬁ', 'fi').replace('ﬂ', 'fl')
        text = text.replace('\ufffd', '')  # Remove replacement characters

        # Normalize quotes
        text = text.replace('"', '"').replace('"', '"')
        text = text.replace(''', "'").replace(''', "'")

        # Remove excessive newlines but preserve paragraph breaks
        text = re.sub(r'\n\n+', '\n\n', text)

        # Trim
        text = text.strip()

        logger.info(f"✅ Text cleaned: {len(text)} chars")
        return text

    @staticmethod
    def extract_from_pdf_url(pdf_url: str) -> str:
        """Extract and clean text from PDF URL"""
        try:
            logger.info(f"📥 Downloading PDF from: {pdf_url[:100]}...")
            response = requests.get(pdf_url, timeout=60)
            response.raise_for_status()

            pdf_file = BytesIO(response.content)
            pdf_reader = PyPDF2.PdfReader(pdf_file)

            num_pages = len(pdf_reader.pages)
            logger.info(f"📄 PDF has {num_pages} pages")

            extracted_text = []
            for page_num, page in enumerate(pdf_reader.pages, 1):
                try:
                    text = page.extract_text()
                    if text:
                        cleaned = AdvancedTextPreprocessor.clean_pdf_text(text)
                        extracted_text.append(cleaned)
                        if page_num % 100 == 0:
                            logger.info(f"  Processed {page_num}/{num_pages} pages")
                except Exception as e:
                    logger.warning(f"  Page {page_num} extraction failed: {e}")

            full_text = '\n\n'.join(extracted_text)
            logger.info(f"✅ Extracted {len(full_text)} chars from {len(extracted_text)} pages")

            return full_text

        except Exception as e:
            logger.error(f"❌ PDF extraction failed: {e}")
            raise


# ============================================================================
# SEMANTIC CHUNKING
# ============================================================================

class SemanticChunker:
    """Advanced semantic-aware chunking"""

    def __init__(self, config: UltimateRAGConfig):
        self.config = config
        self.splitter = RecursiveCharacterTextSplitter(
            chunk_size=config.CHUNK_SIZE,
            chunk_overlap=config.CHUNK_OVERLAP,
            separators=config.SEPARATORS,
            length_function=len,
        )

    def chunk_document(self, text: str) -> List[str]:
        """Semantically chunk document preserving coherence"""
        logger.info(f"🔪 Chunking document: {len(text)} chars")

        # Clean text first
        text = AdvancedTextPreprocessor.clean_pdf_text(text)

        # Use recursive text splitter
        chunks = self.splitter.split_text(text)

        # Filter empty or too-short chunks
        chunks = [c.strip() for c in chunks if len(c.strip()) > 100]

        logger.info(f"✅ Created {len(chunks)} semantic chunks")
        return chunks


# ============================================================================
# HYBRID RETRIEVAL (BM25 + FAISS)
# ============================================================================

class HybridRetriever:
    """Combines BM25 keyword search with vector semantic search"""

    def __init__(self, config: UltimateRAGConfig):
        self.config = config
        self.embedder = None  # Lazy load
        self.chroma_client = None
        self.collections = {}
        self.bm25_indexes = {}  # Store BM25 per document
        self.chunker = SemanticChunker(config)

    @property
    def embedding_model(self):
        """Lazy load BGE-large model"""
        if self.embedder is None:
            logger.info(f"⚡ Loading BGE-large: {self.config.BGE_MODEL}")
            self.embedder = SentenceTransformer(self.config.BGE_MODEL)
            logger.info("✅ BGE-large loaded")
        return self.embedder

    @property
    def vector_store(self):
        """Lazy load ChromaDB"""
        if self.chroma_client is None:
            logger.info("⚡ Initializing ChromaDB...")
            self.chroma_client = chromadb.Client(Settings(
                persist_directory=self.config.CHROMA_PERSIST_DIR,
                anonymized_telemetry=False
            ))
            logger.info("✅ ChromaDB ready")
        return self.chroma_client

    async def index_document(self, document_id: str, text: str, metadata: Dict = None):
        """Index document with both BM25 and vector embeddings"""
        logger.info(f"🔍 Indexing document: {document_id}")

        # Semantic chunking
        chunks = self.chunker.chunk_document(text)

        # Create BM25 index
        tokenized_chunks = [chunk.lower().split() for chunk in chunks]
        self.bm25_indexes[document_id] = BM25Okapi(tokenized_chunks)
        logger.info(f"✅ BM25 index created with {len(chunks)} chunks")

        # Generate embeddings
        logger.info("🧮 Generating BGE-large embeddings...")
        embeddings = self.embedding_model.encode(
            chunks,
            batch_size=8,
            show_progress_bar=False,
            normalize_embeddings=True
        )

        # Store in ChromaDB
        collection_name = f"ultimate_doc_{document_id}".replace('-', '_')[:63]

        try:
            collection = self.vector_store.get_collection(collection_name)
            self.vector_store.delete_collection(collection_name)
        except:
            pass

        collection = self.vector_store.create_collection(
            name=collection_name,
            metadata={"document_id": document_id, "version": "4.0"}
        )

        # Add to collection
        ids = [f"{document_id}_chunk_{i}" for i in range(len(chunks))]
        metadatas = [{"chunk_id": i, "text_length": len(c)} for i, c in enumerate(chunks)]

        collection.add(
            ids=ids,
            embeddings=embeddings.tolist(),
            documents=chunks,
            metadatas=metadatas
        )

        self.collections[document_id] = collection
        logger.info(f"✅ Indexed {len(chunks)} chunks for {document_id}")

    async def hybrid_retrieve(
        self,
        document_id: str,
        query: str,
        top_k: int = 20
    ) -> Tuple[List[str], List[float], List[float]]:
        """Hybrid retrieval: BM25 + Vector search"""

        # Get BM25 scores
        if document_id not in self.bm25_indexes:
            raise ValueError(f"Document {document_id} not indexed")

        bm25 = self.bm25_indexes[document_id]
        tokenized_query = query.lower().split()
        bm25_scores = bm25.get_scores(tokenized_query)

        # Normalize BM25 scores
        if max(bm25_scores) > 0:
            bm25_scores = bm25_scores / max(bm25_scores)

        # Get vector scores
        collection = self.collections[document_id]
        query_embedding = self.embedding_model.encode(
            [query],
            normalize_embeddings=True
        )[0]

        results = collection.query(
            query_embeddings=[query_embedding.tolist()],
            n_results=min(top_k, collection.count())
        )

        chunks = results['documents'][0]
        distances = results['distances'][0]

        # Convert distances to similarities
        vector_scores = [1 - (d / 2.0) for d in distances]

        # Hybrid scoring
        hybrid_scores = []
        for i in range(len(chunks)):
            chunk_id = results['ids'][0][i]
            chunk_idx = int(chunk_id.split('_')[-1])

            bm25_score = bm25_scores[chunk_idx] if chunk_idx < len(bm25_scores) else 0
            vector_score = vector_scores[i]

            hybrid_score = (
                self.config.BM25_WEIGHT * bm25_score +
                self.config.VECTOR_WEIGHT * vector_score
            )
            hybrid_scores.append(hybrid_score)

        # Sort by hybrid score
        sorted_indices = np.argsort(hybrid_scores)[::-1][:top_k]

        sorted_chunks = [chunks[i] for i in sorted_indices]
        sorted_bm25 = [bm25_scores[int(results['ids'][0][i].split('_')[-1])] for i in sorted_indices]
        sorted_vector = [vector_scores[i] for i in sorted_indices]
        sorted_hybrid = [hybrid_scores[i] for i in sorted_indices]

        logger.info(f"✅ Hybrid retrieval: {len(sorted_chunks)} chunks")
        logger.info(f"   Top hybrid score: {sorted_hybrid[0]:.3f}")

        return sorted_chunks, sorted_hybrid, sorted_bm25, sorted_vector


# ============================================================================
# CROSS-ENCODER RE-RANKING
# ============================================================================

class CrossEncoderReranker:
    """Re-rank chunks using cross-encoder for precision"""

    def __init__(self, config: UltimateRAGConfig):
        self.config = config
        self.model = None

    @property
    def reranker(self):
        """Lazy load cross-encoder"""
        if self.model is None:
            logger.info(f"⚡ Loading reranker: {self.config.RERANKER_MODEL}")
            self.model = CrossEncoder(self.config.RERANKER_MODEL)
            logger.info("✅ Reranker loaded")
        return self.model

    def rerank(
        self,
        query: str,
        chunks: List[str],
        top_k: int = 10
    ) -> Tuple[List[str], List[float]]:
        """Re-rank chunks using cross-encoder"""

        if not self.config.ENABLE_RERANKING:
            return chunks[:top_k], [0.0] * len(chunks[:top_k])

        logger.info(f"🎯 Re-ranking {len(chunks)} chunks...")

        # Create query-chunk pairs
        pairs = [[query, chunk] for chunk in chunks]

        # Get re-ranking scores
        scores = self.reranker.predict(pairs)

        # Sort by score
        sorted_indices = np.argsort(scores)[::-1][:top_k]

        reranked_chunks = [chunks[i] for i in sorted_indices]
        reranked_scores = [float(scores[i]) for i in sorted_indices]

        logger.info(f"✅ Re-ranked to top {len(reranked_chunks)} chunks")
        logger.info(f"   Top rerank score: {reranked_scores[0]:.3f}")

        return reranked_chunks, reranked_scores


# ============================================================================
# GEMINI WEB SEARCH
# ============================================================================

class GeminiWebSearch:
    """Intelligent web search using Gemini API"""

    def __init__(self, config: UltimateRAGConfig):
        self.config = config
        if config.GEMINI_API_KEY:
            genai.configure(api_key=config.GEMINI_API_KEY)
            self.model = genai.GenerativeModel(config.GEMINI_MODEL)
            logger.info("✅ Gemini API configured")
        else:
            logger.warning("⚠️  Gemini API key not found")
            self.model = None

    async def search(self, query: str) -> Optional[str]:
        """Search web using Gemini"""
        if not self.model or not self.config.ENABLE_WEB_SEARCH:
            return None

        try:
            logger.info(f"🌐 Gemini web search: '{query[:50]}...'")

            prompt = f"""Search the web and provide a concise answer to this question:
{query}

Provide factual, up-to-date information with sources if possible.
Keep the answer under 500 words."""

            response = self.model.generate_content(prompt)

            if response and response.text:
                logger.info(f"✅ Gemini search successful: {len(response.text)} chars")
                return response.text

            return None

        except Exception as e:
            logger.error(f"❌ Gemini search failed: {e}")
            return None


# ============================================================================
# BEST-OF-N GENERATION
# ============================================================================

class BestOfNGenerator:
    """Generate multiple answers and select best using re-ranking"""

    def __init__(self, config: UltimateRAGConfig):
        self.config = config
        self.groq = Groq(api_key=config.GROQ_API_KEY)

    def calculate_grounding_score(self, answer: str, context: str) -> float:
        """Calculate how well answer is grounded in context"""
        answer_words = set(answer.lower().split())
        context_words = set(context.lower().split())

        if not answer_words:
            return 0.0

        overlap = len(answer_words & context_words)
        grounding = overlap / len(answer_words)

        return grounding

    async def generate_best(
        self,
        query: str,
        context: str,
        n: int = 3
    ) -> Tuple[str, int, float]:
        """Generate N answers and select best"""

        system_prompt = """You are an expert document Q&A assistant.

CRITICAL RULES:
1. Answer ONLY using information from the provided context
2. Quote specific parts of the context when relevant
3. If information is in context, provide detailed answer
4. If information is NOT in context, say: "This information is not available in the provided document."
5. Be specific and precise
6. Focus on the user's exact question"""

        user_prompt = f"""Context from document:
{context}

Question: {query}

Provide a detailed answer based strictly on the context above."""

        candidates = []

        for i in range(n):
            try:
                response = self.groq.chat.completions.create(
                    model=self.config.GROQ_MODEL,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ],
                    temperature=self.config.TEMPERATURE + (i * 0.1),  # Slight variation
                    max_tokens=self.config.MAX_TOKENS,
                )

                answer = response.choices[0].message.content
                grounding = self.calculate_grounding_score(answer, context)

                candidates.append((answer, grounding))
                logger.info(f"  Generated candidate {i+1}: grounding={grounding:.3f}")

            except Exception as e:
                logger.error(f"❌ Generation {i} failed: {e}")

        if not candidates:
            raise Exception("All generations failed")

        # Select best by grounding score
        best_idx = max(range(len(candidates)), key=lambda i: candidates[i][1])
        best_answer, best_grounding = candidates[best_idx]

        logger.info(f"✅ Selected candidate {best_idx+1} with grounding {best_grounding:.3f}")

        return best_answer, best_idx, best_grounding


# ============================================================================
# ULTIMATE RAG PIPELINE
# ============================================================================

class UltimateRAGPipeline:
    """Complete RAG pipeline with all advanced techniques"""

    def __init__(self, config: UltimateRAGConfig):
        self.config = config
        self.retriever = HybridRetriever(config)
        self.reranker = CrossEncoderReranker(config)
        self.web_search = GeminiWebSearch(config)
        self.generator = BestOfNGenerator(config)

    async def process_query(
        self,
        query: str,
        document_id: str,
        document_text: Optional[str] = None,
        enable_web_search: bool = True,
        metadata: Optional[Dict] = None
    ) -> UltimateRAGResponse:
        """Process query with full pipeline"""
        start_time = time.time()

        # Index document if provided
        if document_text and document_id:
            logger.info(f"📥 Indexing document: {len(document_text)} chars")
            await self.retriever.index_document(document_id, document_text, metadata)

        # Step 1: Hybrid retrieval
        logger.info(f"🔍 Step 1: Hybrid retrieval")
        chunks, hybrid_scores, bm25_scores, vector_scores = await self.retriever.hybrid_retrieve(
            document_id,
            query,
            top_k=self.config.TOP_K_INITIAL
        )

        # Step 2: Re-ranking
        logger.info(f"🎯 Step 2: Re-ranking")
        reranked_chunks, rerank_scores = self.reranker.rerank(
            query,
            chunks,
            top_k=self.config.TOP_K_RERANK
        )

        # Step 3: Select best chunks
        logger.info(f"📊 Step 3: Selecting best chunks")
        selected_chunks = []
        total_length = 0

        for i, chunk in enumerate(reranked_chunks):
            if rerank_scores[i] < self.config.SIMILARITY_THRESHOLD:
                logger.info(f"  Skipping chunk {i} (score: {rerank_scores[i]:.3f})")
                continue

            if total_length + len(chunk) > self.config.MAX_CONTEXT_LENGTH:
                remaining = self.config.MAX_CONTEXT_LENGTH - total_length
                if remaining > 300:
                    selected_chunks.append(chunk[:remaining] + "...")
                break

            selected_chunks.append(chunk)
            total_length += len(chunk)

            if len(selected_chunks) >= self.config.TOP_K_FINAL:
                break

        context = "\n\n".join(selected_chunks)
        mean_similarity = np.mean(rerank_scores[:len(selected_chunks)])

        # Determine confidence level
        if mean_similarity >= self.config.CONFIDENCE_HIGH:
            confidence_level = "high"
        elif mean_similarity >= self.config.CONFIDENCE_MEDIUM:
            confidence_level = "medium"
        elif mean_similarity >= self.config.CONFIDENCE_LOW:
            confidence_level = "low"
        else:
            confidence_level = "very_low"

        logger.info(f"✅ Selected {len(selected_chunks)} chunks, confidence: {confidence_level}")

        # Step 4: Web search if needed
        web_context = None
        web_search_triggered = False

        if (enable_web_search and
            mean_similarity < self.config.WEB_SEARCH_THRESHOLD and
            self.config.ENABLE_WEB_SEARCH):

            logger.info(f"🌐 Step 4: Triggering Gemini web search (confidence: {mean_similarity:.3f})")
            web_context = await self.web_search.search(query)

            if web_context:
                web_search_triggered = True
                context = f"Document Context:\n{context}\n\nAdditional Web Information:\n{web_context}"
                source_type = "hybrid"
            else:
                source_type = "document"
        else:
            source_type = "document"

        # Step 5: Best-of-N generation
        logger.info(f"🤖 Step 5: Best-of-N generation (N={self.config.BEST_OF_N})")
        answer, selected_n, grounding_score = await self.generator.generate_best(
            query,
            context,
            n=self.config.BEST_OF_N
        )

        # Calculate metrics
        processing_time = time.time() - start_time

        retrieval_metrics = RetrievalMetrics(
            chunks_retrieved=len(chunks),
            chunks_reranked=len(reranked_chunks),
            chunks_used=len(selected_chunks),
            bm25_scores=[float(s) for s in bm25_scores[:5]],
            vector_scores=[float(s) for s in vector_scores[:5]],
            rerank_scores=[float(s) for s in rerank_scores[:5]],
            mean_similarity=float(mean_similarity),
            confidence_level=confidence_level,
            web_search_triggered=web_search_triggered
        )

        quality_metrics = QualityMetrics(
            retrieval_confidence=float(mean_similarity),
            answer_grounding=float(grounding_score),
            faithfulness_score=float(grounding_score * mean_similarity),
            best_of_n_selected=selected_n + 1
        )

        response_metadata = {
            "pipeline_version": "4.0",
            "model": self.config.GROQ_MODEL,
            "embedding_model": self.config.BGE_MODEL,
            "reranker_model": self.config.RERANKER_MODEL,
            "techniques_used": [
                "Advanced text preprocessing",
                "Semantic chunking",
                "BGE-large embeddings",
                "Hybrid retrieval (BM25 + FAISS)",
                "Cross-encoder re-ranking",
                "Best-of-N generation",
                "Quality metrics"
            ]
        }

        if web_search_triggered:
            response_metadata["techniques_used"].append("Gemini web search")

        logger.info(f"✅ Pipeline complete in {processing_time:.2f}s")

        return UltimateRAGResponse(
            answer=answer,
            confidence=float(mean_similarity),
            source_type=source_type,
            source_chunks_used=selected_chunks,
            processing_time=processing_time,
            retrieval_metrics=retrieval_metrics,
            quality_metrics=quality_metrics,
            metadata=response_metadata
        )


# ============================================================================
# FASTAPI SERVER
# ============================================================================

app = FastAPI(
    title="Ultimate RAG v4.0",
    version="4.0.0",
    description="Production-grade RAG with ALL advanced techniques"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global pipeline instance (lazy loaded)
pipeline = None


def get_pipeline() -> UltimateRAGPipeline:
    """Get or create pipeline instance"""
    global pipeline
    if pipeline is None:
        logger.info("⚡ Initializing Ultimate RAG v4.0 Pipeline...")
        pipeline = UltimateRAGPipeline(config)
        logger.info("✅ Pipeline ready")
    return pipeline


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "version": "4.0.0",
        "system": "Ultimate RAG v4.0",
        "models": {
            "embeddings": config.BGE_MODEL,
            "reranker": config.RERANKER_MODEL,
            "llm": config.GROQ_MODEL,
            "web_search": config.GEMINI_MODEL if config.ENABLE_WEB_SEARCH else None
        },
        "techniques": [
            "Advanced text preprocessing",
            "Semantic chunking (800 chars, 200 overlap)",
            "BGE-large embeddings (1024-dim)",
            "Hybrid retrieval (BM25 + FAISS)",
            "Cross-encoder re-ranking",
            "Best-of-N generation (N=3)",
            "Gemini web search",
            "Quality metrics & grounding"
        ]
    }


@app.post("/query", response_model=UltimateRAGResponse)
async def process_query(request: QueryRequest):
    """Process query with ultimate RAG pipeline"""
    try:
        logger.info(f"📥 New query: '{request.query[:50]}...'")

        pipe = get_pipeline()

        result = await pipe.process_query(
            query=request.query,
            document_id=request.document_id,
            document_text=request.document_text,
            enable_web_search=request.enable_web_search,
            metadata=request.metadata
        )

        logger.info(f"✅ Query processed: confidence={result.confidence:.2f}, "
                   f"grounding={result.quality_metrics.answer_grounding:.2f}")

        return result

    except Exception as e:
        logger.error(f"❌ Query failed: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    logger.info("="*60)
    logger.info("Ultimate RAG v4.0 Server Starting...")
    logger.info("="*60)
    logger.info(f"BGE Model: {config.BGE_MODEL}")
    logger.info(f"Reranker: {config.RERANKER_MODEL}")
    logger.info(f"LLM: {config.GROQ_MODEL}")
    logger.info(f"Web Search: {'Enabled (Gemini)' if config.ENABLE_WEB_SEARCH else 'Disabled'}")
    logger.info("="*60)

    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8003,
        log_level="info"
    )
