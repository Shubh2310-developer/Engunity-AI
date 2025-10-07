#!/usr/bin/env python3
"""
Hybrid RAG v4.0 - Advanced Production System with All Optimizations
===================================================================

New Features in v4.0:
- Answer Relevance Scoring with Cross-Encoder
- Dynamic Chunk Selection (2-5 chunks based on query)
- Query Caching for instant repeated responses
- Query Rewriting for vague questions
- Re-ranking with Cross-Encoder for better accuracy
- Streaming Response Support
- Multi-Query Retrieval for complex questions

Architecture:
- BGE Embeddings: BAAI/bge-base-en-v1.5 for semantic search
- Cross-Encoder: ms-marco-MiniLM-L-12-v2 for re-ranking
- Vector Store: ChromaDB for efficient retrieval
- LLM: Groq Llama-3.3-70B for answer generation
- Web Fallback: Wikipedia/Web search with confidence threshold
- Response Cleaner: Advanced cleaning and formatting

Author: Engunity AI Team
Version: 4.0.0
"""

import asyncio
import logging
import time
import re
import os
import hashlib
from typing import Dict, List, Any, Optional, Tuple, AsyncGenerator
from dataclasses import dataclass
from enum import Enum
from functools import lru_cache

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
import uvicorn
from dotenv import load_dotenv

# Vector & Embedding Libraries
from sentence_transformers import SentenceTransformer, CrossEncoder
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
    """Centralized configuration for Hybrid RAG v4.0"""

    # BGE Embeddings
    BGE_MODEL = "BAAI/bge-base-en-v1.5"
    EMBEDDING_DIM = 768

    # Cross-Encoder for Re-ranking
    RERANKER_MODEL = "cross-encoder/ms-marco-MiniLM-L-12-v2"

    # Answer Relevance Scoring
    RELEVANCE_MODEL = "cross-encoder/ms-marco-MiniLM-L-6-v2"

    # Retrieval Settings
    TOP_K_CHUNKS = 5
    MIN_CHUNKS = 2  # Minimum chunks for simple queries
    MAX_CHUNKS = 5  # Maximum chunks for complex queries
    SIMILARITY_THRESHOLD = 0.75  # Minimum similarity for document relevance
    WEB_FALLBACK_THRESHOLD = 0.70  # Trigger web search if below this
    RELEVANCE_THRESHOLD = 0.70  # Minimum answer relevance score

    # Groq LLM
    GROQ_MODEL = "llama-3.3-70b-versatile"
    GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
    MAX_TOKENS = 1024
    TEMPERATURE = 0.5  # Reduced for more factual answers

    # Document Processing
    CHUNK_SIZE = 512
    CHUNK_OVERLAP = 100  # Increased for better context continuity
    MAX_CONTEXT_LENGTH = 8000  # Max chars for context

    # Query Processing
    QUERY_CACHE_SIZE = 1000  # Number of cached queries
    MIN_QUERY_LENGTH_FOR_REWRITE = 15  # Chars - rewrite if shorter

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
    stream: Optional[bool] = Field(False, description="Enable streaming response")


class RAGResponse(BaseModel):
    answer: str
    confidence: float
    source_type: str  # "document", "hybrid", "web_fallback"
    source_chunks_used: List[str]
    processing_time: float
    metadata: Dict[str, Any]


# ============================================================================
# Advanced Components
# ============================================================================

class QueryCache:
    """Cache for storing frequent query results"""

    def __init__(self, max_size: int = 1000):
        self.cache: Dict[str, RAGResponse] = {}
        self.max_size = max_size
        self.access_count: Dict[str, int] = {}

    def get_key(self, doc_id: str, query: str) -> str:
        """Generate cache key"""
        combined = f"{doc_id}:{query}".lower()
        return hashlib.md5(combined.encode()).hexdigest()

    def get(self, doc_id: str, query: str) -> Optional[RAGResponse]:
        """Retrieve from cache"""
        key = self.get_key(doc_id, query)
        if key in self.cache:
            self.access_count[key] = self.access_count.get(key, 0) + 1
            logger.info(f"✅ Cache hit for query: {query[:50]}...")
            return self.cache[key]
        return None

    def set(self, doc_id: str, query: str, response: RAGResponse):
        """Store in cache"""
        if len(self.cache) >= self.max_size:
            # Remove least accessed item
            min_key = min(self.access_count.items(), key=lambda x: x[1])[0]
            del self.cache[min_key]
            del self.access_count[min_key]

        key = self.get_key(doc_id, query)
        self.cache[key] = response
        self.access_count[key] = 0


class QueryRewriter:
    """Rewrite vague queries for better retrieval"""

    def __init__(self, groq_client: Groq, config: RAGConfig):
        self.groq_client = groq_client
        self.config = config

    async def rewrite(self, query: str) -> str:
        """Expand and clarify vague queries"""
        # Skip rewriting for already detailed queries
        if len(query) >= self.config.MIN_QUERY_LENGTH_FOR_REWRITE:
            return query

        logger.info(f"🔄 Rewriting short query: '{query}'")

        try:
            prompt = f"""Expand this short question into a more detailed, specific query for document search:

Original: "{query}"

Expanded query (one sentence):"""

            response = self.groq_client.chat.completions.create(
                model=self.config.GROQ_MODEL,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=100,
                temperature=0.3
            )

            expanded = response.choices[0].message.content.strip()
            logger.info(f"✅ Rewritten to: '{expanded}'")
            return expanded

        except Exception as e:
            logger.warning(f"Query rewriting failed: {e}")
            return query


class ChunkReranker:
    """Re-rank retrieved chunks using cross-encoder"""

    def __init__(self, config: RAGConfig):
        self.config = config
        logger.info(f"🔧 Initializing Reranker: {config.RERANKER_MODEL}")
        self.reranker = CrossEncoder(config.RERANKER_MODEL)
        logger.info("✅ Reranker loaded successfully")

    def rerank(self, query: str, chunks: List[str], scores: List[float], top_k: int) -> Tuple[List[str], List[float]]:
        """Re-rank chunks using cross-encoder for better accuracy"""
        if not chunks:
            return [], []

        logger.info(f"🔄 Re-ranking {len(chunks)} chunks...")

        # Create query-chunk pairs
        pairs = [[query, chunk] for chunk in chunks]

        # Get cross-encoder scores
        rerank_scores = self.reranker.predict(pairs)

        # Combine with original scores (weighted average)
        combined_scores = [
            0.6 * float(rerank_scores[i]) + 0.4 * scores[i]
            for i in range(len(chunks))
        ]

        # Sort by combined score
        ranked_indices = sorted(
            range(len(chunks)),
            key=lambda i: combined_scores[i],
            reverse=True
        )

        # Return top_k
        reranked_chunks = [chunks[i] for i in ranked_indices[:top_k]]
        reranked_scores = [combined_scores[i] for i in ranked_indices[:top_k]]

        logger.info(f"✅ Re-ranking complete. Top score: {reranked_scores[0]:.3f}")

        return reranked_chunks, reranked_scores


class AnswerRelevanceScorer:
    """Score answer relevance to the question"""

    def __init__(self, config: RAGConfig):
        self.config = config
        logger.info(f"🔧 Initializing Relevance Scorer: {config.RELEVANCE_MODEL}")
        self.model = CrossEncoder(config.RELEVANCE_MODEL)
        logger.info("✅ Relevance Scorer loaded successfully")

    def score(self, question: str, answer: str) -> float:
        """Score answer relevance to question (0-1)"""
        try:
            score = self.model.predict([[question, answer]])[0]
            # Normalize to 0-1 range
            normalized_score = (float(score) + 1) / 2  # Convert from [-1, 1] to [0, 1]
            return max(0.0, min(1.0, normalized_score))
        except Exception as e:
            logger.warning(f"Relevance scoring failed: {e}")
            return 0.5  # Default mid-range score


class DynamicChunkSelector:
    """Select optimal number of chunks based on query complexity"""

    def __init__(self, config: RAGConfig):
        self.config = config

    def select_chunks(
        self,
        chunks: List[str],
        scores: List[float],
        query: str
    ) -> Tuple[List[str], List[float]]:
        """Dynamically select 2-5 chunks based on query and quality"""

        # Determine target chunks based on query length
        query_words = len(query.split())

        if query_words < 5:  # Simple query
            target_chunks = self.config.MIN_CHUNKS
        elif query_words > 15:  # Complex query
            target_chunks = self.config.MAX_CHUNKS
        else:
            target_chunks = 3  # Medium query

        # Filter by quality threshold
        quality_chunks = []
        quality_scores = []

        for chunk, score in zip(chunks, scores):
            if score > self.config.SIMILARITY_THRESHOLD:
                quality_chunks.append(chunk)
                quality_scores.append(score)

        # Return up to target_chunks high-quality chunks
        selected_count = min(target_chunks, len(quality_chunks))

        logger.info(f"📊 Selected {selected_count} chunks (query: {query_words} words, target: {target_chunks})")

        return quality_chunks[:selected_count], quality_scores[:selected_count]


class MultiQueryRetriever:
    """Generate query variations for better coverage"""

    def __init__(self, groq_client: Groq, config: RAGConfig):
        self.groq_client = groq_client
        self.config = config

    async def generate_variations(self, query: str) -> List[str]:
        """Generate 2-3 query variations"""
        try:
            prompt = f"""Generate 2 alternative phrasings of this question for document search:

Original: "{query}"

Alternative 1:
Alternative 2:"""

            response = self.groq_client.chat.completions.create(
                model=self.config.GROQ_MODEL,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=150,
                temperature=0.7
            )

            content = response.choices[0].message.content.strip()

            # Parse variations
            variations = [query]  # Include original
            for line in content.split('\n'):
                line = line.strip()
                if line and not line.startswith('Alternative'):
                    variations.append(line)

            return variations[:3]  # Max 3 variations

        except Exception as e:
            logger.warning(f"Query variation generation failed: {e}")
            return [query]


# ============================================================================
# Continue with BGERetriever, GroqGenerator, etc. from v3...
# (Keeping the rest of the existing components)
# ============================================================================
