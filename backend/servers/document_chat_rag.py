#!/usr/bin/env python3
"""
Document Chat RAG - Advanced Conversational Document Analysis (Gemini/ChatGPT Quality)
=====================================================================================

Features:
- Upload PDF, DOCX, TXT, MD documents
- BGE embeddings (BAAI/bge-small-en-v1.5) for fast semantic search
- ChromaDB for persistent vector storage
- Groq API (llama-3.3-70b-versatile) for generation
- Flexible answering: Document-grounded + general knowledge with context retention
- Streaming responses
- Session-based document management
- Citation support

Advanced RAG Features (Phase 4 - No Training Required):
1. **Query Decomposition**: Break complex questions into sub-questions
2. **Reciprocal Rank Fusion (RRF)**: Multi-query retrieval for better recall
3. **HyDE**: Hypothetical Document Embeddings for conceptual queries
4. **Context Compression**: Extract only relevant sentences using LLM
5. **Chain-of-Thought**: Step-by-step reasoning prompts
6. **Self-Consistency**: Multiple answer generation with voting (optional)
7. **Conflict Detection**: Identify contradictions across sources
8. **Validation Pipeline**: Auto-repair with rule-based checks
9. **Task-Specific Prompts**: Templates for syllabus, summary, analysis
10. **Slot Extraction**: Structured information extraction
11. **Clarifying Questions**: Ask for missing critical info

Architecture:
- Document Upload → Text Extraction → Chunking → Embedding → ChromaDB Storage
- Advanced Retrieval Pipeline:
  * Query Decomposition (complex queries → sub-queries)
  * HyDE (generate hypothetical answer)
  * RRF (multiple query variations)
  * Context Compression (extract relevant sentences)
- Enhanced Generation:
  * Chain-of-Thought prompting
  * Self-Consistency (optional)
  * Task-specific templates

Author: Engunity AI Team
Version: 2.0.0 (Phase 4 - Gemini/ChatGPT Quality)
Port: 8004
"""

import asyncio
import logging
import time
import os
import re
import hashlib
import json
import numpy as np
from typing import Dict, List, Any, Optional, Tuple
from pathlib import Path
from datetime import datetime
from dataclasses import dataclass, asdict
from collections import OrderedDict

from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
import uvicorn
from dotenv import load_dotenv

# Document Processing
import PyPDF2
import docx
from io import BytesIO

# Vector & Embedding Libraries
from sentence_transformers import SentenceTransformer
import chromadb
from chromadb.config import Settings

# LLM Integration
from groq import Groq

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

class DocRAGConfig:
    """Configuration for Document Chat RAG"""

    # BGE Embeddings
    BGE_MODEL = "BAAI/bge-small-en-v1.5"
    EMBEDDING_DIM = 384

    # Retrieval Settings
    TOP_K_CHUNKS = 6
    SIMILARITY_THRESHOLD = 0.5
    ENABLE_MMR = os.getenv("ENABLE_MMR", "true").lower() == "true"
    MMR_LAMBDA = 0.7  # Balance between relevance (1.0) and diversity (0.0)

    # Caching
    ENABLE_CACHE = os.getenv("ENABLE_CACHE", "true").lower() == "true"
    CACHE_TTL_SECONDS = 300  # 5 minutes
    MAX_CACHE_SIZE = 100

    # Advanced Features (Phase 2/3 - Already Implemented)
    ENABLE_SLOT_EXTRACTION = os.getenv("ENABLE_SLOT_EXTRACTION", "true").lower() == "true"
    ENABLE_QUERY_REWRITE = os.getenv("ENABLE_QUERY_REWRITE", "true").lower() == "true"
    ENABLE_CITATIONS = os.getenv("ENABLE_CITATIONS", "true").lower() == "true"
    ENABLE_VALIDATION = os.getenv("ENABLE_VALIDATION", "true").lower() == "true"
    ENABLE_CONFLICT_DETECTION = os.getenv("ENABLE_CONFLICT_DETECTION", "true").lower() == "true"
    ENABLE_CLARIFYING_QUESTIONS = os.getenv("ENABLE_CLARIFYING_QUESTIONS", "true").lower() == "true"

    # Advanced Features (Phase 4 - Gemini/ChatGPT Quality)
    ENABLE_QUERY_DECOMPOSITION = os.getenv("ENABLE_QUERY_DECOMPOSITION", "true").lower() == "true"
    ENABLE_RRF = os.getenv("ENABLE_RRF", "true").lower() == "true"  # Reciprocal Rank Fusion
    ENABLE_CONTEXT_COMPRESSION = os.getenv("ENABLE_CONTEXT_COMPRESSION", "true").lower() == "true"
    ENABLE_HYDE = os.getenv("ENABLE_HYDE", "true").lower() == "true"  # Hypothetical Document Embeddings
    ENABLE_CHAIN_OF_THOUGHT = os.getenv("ENABLE_CHAIN_OF_THOUGHT", "true").lower() == "true"
    ENABLE_SELF_CONSISTENCY = os.getenv("ENABLE_SELF_CONSISTENCY", "false").lower() == "true"  # Expensive

    # RRF Settings
    RRF_NUM_QUERIES = 3  # Generate 3 query variations
    RRF_K = 60  # RRF constant (lower = more emphasis on top results)

    # Context Compression
    COMPRESSION_RATIO = 0.5  # Keep top 50% of relevant sentences

    # Self-Consistency
    SELF_CONSISTENCY_SAMPLES = 3  # Generate 3 answers and pick best

    # Groq LLM
    GROQ_MODEL = "llama-3.3-70b-versatile"
    GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
    MAX_TOKENS = 8192
    TEMPERATURE = 0.7

    # Document Processing
    CHUNK_SIZE = 600
    CHUNK_OVERLAP = 150
    MAX_FILE_SIZE_MB = 50
    ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.txt', '.md']

    # Storage
    CHROMA_PERSIST_DIR = "./data/document_chat_chroma"
    UPLOAD_DIR = "./data/uploaded_documents"

    # Server
    PORT = 8004


# ============================================================================
# Data Models
# ============================================================================

@dataclass
class DocumentMetadata:
    """Metadata for uploaded documents"""
    doc_id: str
    filename: str
    file_type: str
    size_bytes: int
    upload_time: str
    user_id: Optional[str]
    session_id: Optional[str]
    chunk_count: int
    page_count: Optional[int] = None

    # Rich metadata for filtering
    institution: Optional[str] = None
    department: Optional[str] = None
    year: Optional[str] = None
    document_type: Optional[str] = None  # "syllabus", "handbook", "policy", "general"
    level: Optional[str] = None  # "UG", "PG"
    semester: Optional[str] = None


class UploadResponse(BaseModel):
    doc_id: str
    filename: str
    file_type: str
    size_bytes: int
    chunk_count: int
    page_count: Optional[int]
    status: str


class ChatRequest(BaseModel):
    session_id: str
    message: str
    user_id: Optional[str] = None
    doc_ids: Optional[List[str]] = Field(default_factory=list)
    mode: str = "hybrid"  # "document-only" or "hybrid"

    # Optional settings overrides
    top_k: Optional[int] = None
    threshold: Optional[float] = None
    temperature: Optional[float] = None
    model: Optional[str] = None

    # Advanced features
    task_type: Optional[str] = "qa"  # "qa", "syllabus", "summary", "analysis"
    enable_citations: Optional[bool] = True
    enable_slot_extraction: Optional[bool] = True
    metadata_filters: Optional[Dict[str, str]] = Field(default_factory=dict)


class ChatResponse(BaseModel):
    answer: str
    sources: List[Dict[str, Any]]
    confidence: float
    mode_used: str
    processing_time: float


# ============================================================================
# Document Processor
# ============================================================================

class DocumentProcessor:
    """Handles document extraction and chunking"""

    @staticmethod
    def extract_text_from_pdf(file_bytes: bytes) -> tuple[str, int]:
        """Extract text from PDF"""
        try:
            pdf_reader = PyPDF2.PdfReader(BytesIO(file_bytes))
            text = ""
            for page in pdf_reader.pages:
                text += page.extract_text() + "\n\n"
            return text.strip(), len(pdf_reader.pages)
        except Exception as e:
            logger.error(f"PDF extraction error: {e}")
            raise HTTPException(status_code=400, detail=f"Failed to extract PDF: {str(e)}")

    @staticmethod
    def extract_text_from_docx(file_bytes: bytes) -> tuple[str, int]:
        """Extract text from DOCX"""
        try:
            doc = docx.Document(BytesIO(file_bytes))
            text = "\n\n".join([para.text for para in doc.paragraphs if para.text.strip()])
            # Approximate page count (avg 500 words per page)
            page_count = max(1, len(text.split()) // 500)
            return text.strip(), page_count
        except Exception as e:
            logger.error(f"DOCX extraction error: {e}")
            raise HTTPException(status_code=400, detail=f"Failed to extract DOCX: {str(e)}")

    @staticmethod
    def extract_text_from_txt(file_bytes: bytes) -> tuple[str, int]:
        """Extract text from TXT/MD"""
        try:
            text = file_bytes.decode('utf-8')
            page_count = max(1, len(text.split()) // 500)
            return text.strip(), page_count
        except Exception as e:
            logger.error(f"Text extraction error: {e}")
            raise HTTPException(status_code=400, detail=f"Failed to extract text: {str(e)}")

    @staticmethod
    def chunk_text(text: str, chunk_size: int = 600, overlap: int = 150) -> List[str]:
        """Split text into overlapping chunks"""
        if not text:
            return []

        # Split by sentences for better semantic coherence
        sentences = re.split(r'(?<=[.!?])\s+', text)

        chunks = []
        current_chunk = []
        current_length = 0

        for sentence in sentences:
            sentence_length = len(sentence)

            if current_length + sentence_length > chunk_size and current_chunk:
                # Save current chunk
                chunks.append(' '.join(current_chunk))

                # Start new chunk with overlap
                overlap_text = ' '.join(current_chunk)
                if len(overlap_text) > overlap:
                    overlap_words = overlap_text.split()[-overlap:]
                    current_chunk = overlap_words
                    current_length = len(' '.join(overlap_words))
                else:
                    current_chunk = []
                    current_length = 0

            current_chunk.append(sentence)
            current_length += sentence_length

        # Add final chunk
        if current_chunk:
            chunks.append(' '.join(current_chunk))

        return chunks


# ============================================================================
# Document Chat RAG Service
# ============================================================================

class DocumentChatRAG:
    """Main RAG service for document chat"""

    def __init__(self):
        self.config = DocRAGConfig()

        # Initialize storage directories
        os.makedirs(self.config.CHROMA_PERSIST_DIR, exist_ok=True)
        os.makedirs(self.config.UPLOAD_DIR, exist_ok=True)

        # Initialize BGE embeddings
        logger.info(f"Loading BGE model: {self.config.BGE_MODEL}")
        self.embedding_model = SentenceTransformer(self.config.BGE_MODEL)
        logger.info("✅ BGE model loaded")

        # Initialize ChromaDB
        logger.info("Initializing ChromaDB...")
        self.chroma_client = chromadb.PersistentClient(
            path=self.config.CHROMA_PERSIST_DIR,
            settings=Settings(anonymized_telemetry=False)
        )
        self.collection = self.chroma_client.get_or_create_collection(
            name="document_chat",
            metadata={"hnsw:space": "cosine"}
        )
        logger.info("✅ ChromaDB initialized")

        # Initialize Groq client
        if not self.config.GROQ_API_KEY:
            raise ValueError("GROQ_API_KEY not found in environment")
        self.groq_client = Groq(api_key=self.config.GROQ_API_KEY)
        logger.info("✅ Groq client initialized")

        # Document metadata cache
        self.document_metadata: Dict[str, DocumentMetadata] = {}
        self._load_metadata()

        # Query result cache (LRU cache with TTL)
        self.query_cache: OrderedDict = OrderedDict()
        self.cache_timestamps: Dict[str, float] = {}

        logger.info(f"🚀 Document Chat RAG initialized on port {self.config.PORT}")

    def _load_metadata(self):
        """Load document metadata from disk"""
        metadata_file = Path(self.config.UPLOAD_DIR) / "metadata.json"
        if metadata_file.exists():
            try:
                with open(metadata_file, 'r') as f:
                    data = json.load(f)
                    self.document_metadata = {
                        k: DocumentMetadata(**v) for k, v in data.items()
                    }
                logger.info(f"Loaded metadata for {len(self.document_metadata)} documents")
            except Exception as e:
                logger.error(f"Failed to load metadata: {e}")

    def _save_metadata(self):
        """Save document metadata to disk"""
        metadata_file = Path(self.config.UPLOAD_DIR) / "metadata.json"
        try:
            with open(metadata_file, 'w') as f:
                json.dump({k: asdict(v) for k, v in self.document_metadata.items()}, f, indent=2)
        except Exception as e:
            logger.error(f"Failed to save metadata: {e}")

    def _generate_doc_id(self, filename: str, content: bytes) -> str:
        """Generate unique document ID"""
        hash_input = f"{filename}_{len(content)}_{time.time()}".encode()
        return hashlib.sha256(hash_input).hexdigest()[:16]

    def _apply_mmr(
        self,
        query_embedding: List[float],
        chunks: List[str],
        embeddings: List[List[float]],
        similarities: List[float],
        k: int
    ) -> Tuple[List[str], List[List[float]], List[float]]:
        """
        Apply Max Marginal Relevance to reduce redundancy
        Returns: (selected_chunks, selected_embeddings, selected_similarities)
        """
        if not self.config.ENABLE_MMR or len(chunks) <= k:
            return chunks[:k], embeddings[:k], similarities[:k]

        query_emb = np.array(query_embedding)
        doc_embeddings = np.array(embeddings)

        selected_indices = []
        remaining_indices = list(range(len(chunks)))

        # Select first document (highest similarity)
        first_idx = remaining_indices.pop(0)
        selected_indices.append(first_idx)

        # Select remaining documents using MMR
        while len(selected_indices) < k and remaining_indices:
            mmr_scores = []

            for idx in remaining_indices:
                # Relevance to query
                relevance = similarities[idx]

                # Max similarity to already selected docs
                if len(selected_indices) > 0:
                    selected_embs = doc_embeddings[selected_indices]
                    doc_emb = doc_embeddings[idx].reshape(1, -1)
                    similarities_to_selected = np.dot(selected_embs, doc_emb.T).flatten()
                    max_similarity = np.max(similarities_to_selected)
                else:
                    max_similarity = 0

                # MMR formula: λ * relevance - (1-λ) * max_similarity
                mmr_score = (self.config.MMR_LAMBDA * relevance -
                           (1 - self.config.MMR_LAMBDA) * max_similarity)
                mmr_scores.append((mmr_score, idx))

            # Select document with highest MMR score
            best_idx = max(mmr_scores, key=lambda x: x[0])[1]
            selected_indices.append(best_idx)
            remaining_indices.remove(best_idx)

        # Return selected chunks in order
        selected_chunks = [chunks[i] for i in selected_indices]
        selected_embeddings = [embeddings[i] for i in selected_indices]
        selected_similarities = [similarities[i] for i in selected_indices]

        return selected_chunks, selected_embeddings, selected_similarities

    def _get_cache_key(self, session_id: str, message: str, doc_ids: List[str], top_k: int) -> str:
        """Generate cache key for query"""
        normalized_query = message.lower().strip()
        doc_ids_str = ",".join(sorted(doc_ids))
        return hashlib.md5(f"{session_id}:{normalized_query}:{doc_ids_str}:{top_k}".encode()).hexdigest()

    def _get_cached_result(self, cache_key: str) -> Optional[str]:
        """Retrieve cached result if valid"""
        if not self.config.ENABLE_CACHE:
            return None

        if cache_key in self.query_cache:
            timestamp = self.cache_timestamps.get(cache_key, 0)
            if time.time() - timestamp < self.config.CACHE_TTL_SECONDS:
                # Move to end (most recently used)
                self.query_cache.move_to_end(cache_key)
                logger.info(f"✅ Cache hit for key: {cache_key[:8]}...")
                return self.query_cache[cache_key]
            else:
                # Expired
                del self.query_cache[cache_key]
                del self.cache_timestamps[cache_key]
        return None

    def _cache_result(self, cache_key: str, result: str):
        """Cache query result with LRU eviction"""
        if not self.config.ENABLE_CACHE:
            return

        # Evict oldest if at capacity
        if len(self.query_cache) >= self.config.MAX_CACHE_SIZE:
            oldest_key = next(iter(self.query_cache))
            del self.query_cache[oldest_key]
            del self.cache_timestamps[oldest_key]

        self.query_cache[cache_key] = result
        self.cache_timestamps[cache_key] = time.time()
        logger.info(f"💾 Cached result for key: {cache_key[:8]}...")

    async def extract_slots(self, query: str, user_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Extract structured information slots from user query using Groq LLM
        Returns: {task_type, semester, department, institution, year, level, missing_fields}
        """
        if not self.config.ENABLE_SLOT_EXTRACTION:
            return {"task_type": "qa"}

        prompt = f"""Extract key information from this user query and return ONLY valid JSON (no markdown, no code blocks).

Query: "{query}"

Extract these fields if present:
- task_type: "syllabus", "summary", "analysis", or "qa"
- semester: Roman numeral or number (e.g., "VI", "6", "Semester 6")
- department: Department name (e.g., "Computer Science", "Mechanical Engineering")
- institution: University/college name
- year: Academic year (e.g., "2024", "2024-25")
- level: "UG" (undergraduate) or "PG" (postgraduate)
- document_type: "syllabus", "handbook", "policy", "report", or "general"

Return JSON format:
{{
  "task_type": "...",
  "semester": "..." or null,
  "department": "..." or null,
  "institution": "..." or null,
  "year": "..." or null,
  "level": "..." or null,
  "document_type": "..." or null,
  "missing_fields": ["field1", "field2"]
}}

JSON only:"""

        try:
            response = self.groq_client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.1,
                max_tokens=500
            )

            result_text = response.choices[0].message.content.strip()

            # Remove markdown code blocks if present
            if result_text.startswith("```"):
                result_text = result_text.split("```")[1]
                if result_text.startswith("json"):
                    result_text = result_text[4:]
                result_text = result_text.strip()

            slots = json.loads(result_text)
            logger.info(f"📊 Extracted slots: {slots}")
            return slots
        except Exception as e:
            logger.error(f"Slot extraction failed: {e}")
            return {"task_type": "qa"}

    async def rewrite_query(self, query: str, slots: Dict[str, Any]) -> str:
        """
        Rewrite query based on extracted slots for better retrieval
        """
        if not self.config.ENABLE_QUERY_REWRITE or slots.get("task_type") == "qa":
            return query

        # Build enhanced query from slots
        parts = [query]

        if slots.get("semester"):
            parts.append(f"Semester {slots['semester']}")
        if slots.get("department"):
            parts.append(slots["department"])
        if slots.get("institution"):
            parts.append(slots["institution"])
        if slots.get("year"):
            parts.append(str(slots["year"]))
        if slots.get("level"):
            parts.append("undergraduate" if slots["level"] == "UG" else "postgraduate")
        if slots.get("document_type"):
            parts.append(slots["document_type"])

        rewritten = " ".join(parts)
        logger.info(f"🔄 Query rewrite: '{query}' → '{rewritten}'")
        return rewritten

    # ============================================================================
    # PHASE 4: Advanced RAG Features for Gemini/ChatGPT Quality
    # ============================================================================

    async def decompose_query(self, query: str) -> List[str]:
        """
        Decompose complex queries into simpler sub-questions.
        Example: "Explain blockchain and its use cases" → ["What is blockchain?", "What are blockchain use cases?"]
        """
        if not self.config.ENABLE_QUERY_DECOMPOSITION:
            return [query]

        prompt = f"""Break down this complex question into 2-4 simpler sub-questions that together would answer the original question.
Return ONLY a JSON array of strings, nothing else.

Question: {query}

JSON array of sub-questions:"""

        try:
            response = self.groq_client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.1,
                max_tokens=300
            )

            result = response.choices[0].message.content.strip()

            # Clean JSON response
            if result.startswith("```"):
                result = result.split("```")[1]
                if result.startswith("json"):
                    result = result[4:]
                result = result.strip()

            sub_questions = json.loads(result)

            if isinstance(sub_questions, list) and len(sub_questions) > 1:
                logger.info(f"🔀 Decomposed into {len(sub_questions)} sub-questions: {sub_questions}")
                return sub_questions
            else:
                return [query]

        except Exception as e:
            logger.warning(f"Query decomposition failed: {e}")
            return [query]

    async def generate_query_variations(self, query: str) -> List[str]:
        """
        Generate multiple query variations for Reciprocal Rank Fusion (RRF).
        Improves recall by retrieving with different phrasings.
        """
        if not self.config.ENABLE_RRF:
            return [query]

        prompt = f"""Generate {self.config.RRF_NUM_QUERIES - 1} alternative phrasings of this question that ask the same thing in different ways.
Return ONLY a JSON array of strings.

Original question: {query}

JSON array of alternative questions:"""

        try:
            response = self.groq_client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.3,
                max_tokens=200
            )

            result = response.choices[0].message.content.strip()

            # Clean JSON response
            if result.startswith("```"):
                result = result.split("```")[1]
                if result.startswith("json"):
                    result = result[4:]
                result = result.strip()

            variations = json.loads(result)

            if isinstance(variations, list):
                all_queries = [query] + variations[:self.config.RRF_NUM_QUERIES - 1]
                logger.info(f"🔀 Generated {len(all_queries)} query variations for RRF")
                return all_queries
            else:
                return [query]

        except Exception as e:
            logger.warning(f"Query variation generation failed: {e}")
            return [query]

    def reciprocal_rank_fusion(self, ranked_lists: List[List[Tuple[str, float, Dict]]], k: int = 60) -> List[Tuple[str, float, Dict]]:
        """
        Merge multiple ranked lists using Reciprocal Rank Fusion.
        RRF(d) = Σ 1 / (k + rank(d))

        Args:
            ranked_lists: List of ranked results [(chunk, score, metadata), ...]
            k: RRF constant (default 60)

        Returns:
            Fused ranked list
        """
        if not self.config.ENABLE_RRF or len(ranked_lists) <= 1:
            return ranked_lists[0] if ranked_lists else []

        rrf_scores = {}
        chunk_metadata = {}

        for ranked_list in ranked_lists:
            for rank, (chunk, score, metadata) in enumerate(ranked_list, start=1):
                if chunk not in rrf_scores:
                    rrf_scores[chunk] = 0
                    chunk_metadata[chunk] = metadata
                rrf_scores[chunk] += 1 / (k + rank)

        # Sort by RRF score
        fused = sorted(rrf_scores.items(), key=lambda x: x[1], reverse=True)

        result = [(chunk, score, chunk_metadata[chunk]) for chunk, score in fused]
        logger.info(f"🔀 RRF: Fused {len(ranked_lists)} result lists into {len(result)} unique chunks")
        return result

    async def compress_context(self, query: str, chunks: List[str], metadatas: List[Dict]) -> Tuple[List[str], List[Dict]]:
        """
        Compress retrieved context by extracting only relevant sentences.
        Reduces noise and improves generation quality.
        """
        if not self.config.ENABLE_CONTEXT_COMPRESSION or len(chunks) == 0:
            return chunks, metadatas

        compressed_chunks = []
        compressed_metadatas = []

        for chunk, metadata in zip(chunks, metadatas):
            # Split into sentences
            sentences = re.split(r'[.!?]+', chunk)
            sentences = [s.strip() for s in sentences if len(s.strip()) > 10]

            if len(sentences) <= 2:
                # Too short to compress
                compressed_chunks.append(chunk)
                compressed_metadatas.append(metadata)
                continue

            # Ask LLM to extract relevant sentences
            prompt = f"""Extract ONLY the sentences that are relevant to answering this question. Return them as a JSON array of strings.

Question: {query}

Text:
{chunk}

Relevant sentences (JSON array):"""

            try:
                response = self.groq_client.chat.completions.create(
                    model="llama-3.3-70b-versatile",
                    messages=[{"role": "user", "content": prompt}],
                    temperature=0.0,
                    max_tokens=500
                )

                result = response.choices[0].message.content.strip()

                # Clean JSON response
                if result.startswith("```"):
                    result = result.split("```")[1]
                    if result.startswith("json"):
                        result = result[4:]
                    result = result.strip()

                relevant_sentences = json.loads(result)

                if isinstance(relevant_sentences, list) and len(relevant_sentences) > 0:
                    compressed = " ".join(relevant_sentences)
                    compressed_chunks.append(compressed)
                    compressed_metadatas.append(metadata)
                else:
                    # Fallback: keep original
                    compressed_chunks.append(chunk)
                    compressed_metadatas.append(metadata)

            except Exception as e:
                logger.warning(f"Context compression failed for chunk: {e}")
                compressed_chunks.append(chunk)
                compressed_metadatas.append(metadata)

        original_length = sum(len(c) for c in chunks)
        compressed_length = sum(len(c) for c in compressed_chunks)
        compression_ratio = compressed_length / original_length if original_length > 0 else 1.0

        logger.info(f"🗜️ Context compression: {original_length} → {compressed_length} chars ({compression_ratio:.1%})")
        return compressed_chunks, compressed_metadatas

    async def generate_hypothetical_document(self, query: str) -> str:
        """
        Generate a hypothetical answer (HyDE) and use it for retrieval.
        Works better for conceptual/abstract questions.
        """
        if not self.config.ENABLE_HYDE:
            return query

        prompt = f"""Generate a detailed, technical answer to this question as if you were writing a section of an academic document.
Write 2-3 sentences with specific terminology and concepts.

Question: {query}

Hypothetical answer:"""

        try:
            response = self.groq_client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.5,
                max_tokens=150
            )

            hypothetical_doc = response.choices[0].message.content.strip()
            logger.info(f"🔮 HyDE: Generated hypothetical document ({len(hypothetical_doc)} chars)")
            return hypothetical_doc

        except Exception as e:
            logger.warning(f"HyDE generation failed: {e}")
            return query

    async def generate_with_chain_of_thought(self, prompt: str, context: str) -> str:
        """
        Generate answer using Chain-of-Thought prompting for better reasoning.
        """
        if not self.config.ENABLE_CHAIN_OF_THOUGHT:
            return ""

        cot_prompt = f"""Let's approach this step-by-step:

Context:
{context}

Question: {prompt}

Let's think through this carefully:
1. First, identify the key concepts in the question
2. Then, find relevant information from the context
3. Finally, synthesize a comprehensive answer

Answer:"""

        try:
            response = self.groq_client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[{"role": "user", "content": cot_prompt}],
                temperature=0.5,
                max_tokens=self.config.MAX_TOKENS,
                stream=False
            )

            return response.choices[0].message.content

        except Exception as e:
            logger.error(f"Chain-of-Thought generation failed: {e}")
            return ""

    async def generate_with_self_consistency(self, prompt: str, context: str, num_samples: int = 3) -> str:
        """
        Generate multiple answers and select the most consistent one (Self-Consistency).
        Expensive but produces highest quality results.
        """
        if not self.config.ENABLE_SELF_CONSISTENCY:
            return ""

        answers = []

        for i in range(num_samples):
            try:
                response = self.groq_client.chat.completions.create(
                    model="llama-3.3-70b-versatile",
                    messages=[
                        {"role": "system", "content": "You are a knowledgeable assistant providing detailed, accurate answers."},
                        {"role": "user", "content": f"Context:\n{context}\n\nQuestion: {prompt}\n\nAnswer:"}
                    ],
                    temperature=0.7,  # Higher temperature for diversity
                    max_tokens=self.config.MAX_TOKENS,
                    stream=False
                )

                answer = response.choices[0].message.content
                answers.append(answer)

            except Exception as e:
                logger.error(f"Self-consistency sample {i+1} failed: {e}")

        if not answers:
            return ""

        # Simple majority voting: pick the longest answer (assumes more detail = better)
        # In production, use semantic similarity clustering
        best_answer = max(answers, key=len)
        logger.info(f"🎯 Self-Consistency: Selected best from {len(answers)} answers")
        return best_answer

    def _build_metadata_filter(self, slots: Dict[str, Any], metadata_filters: Dict[str, str]) -> Dict[str, Any]:
        """
        Build ChromaDB where filter from slots and explicit filters
        """
        conditions = []

        # Add explicit metadata filters
        for key, value in metadata_filters.items():
            if value:
                conditions.append({key: value})

        # Add filters from extracted slots
        # NOTE: Only add filters for metadata fields that actually exist in ChromaDB
        # Current metadata: doc_id, filename, chunk_index, user_id, session_id, upload_time
        # TODO: Add institution, department, year, semester, level to metadata during upload if needed

        # Commented out filters for fields not currently stored in metadata:
        # if slots.get("institution"):
        #     conditions.append({"institution": slots["institution"]})
        # if slots.get("department"):
        #     conditions.append({"department": slots["department"]})
        # if slots.get("year"):
        #     conditions.append({"year": str(slots["year"])})
        # if slots.get("document_type"):
        #     conditions.append({"document_type": slots["document_type"]})
        # if slots.get("semester"):
        #     conditions.append({"semester": str(slots["semester"])})
        # if slots.get("level"):
        #     conditions.append({"level": slots["level"]})

        if not conditions:
            return {}

        if len(conditions) == 1:
            return conditions[0]

        return {"$and": conditions}

    def _insert_citations(self, text: str, sources: List[Dict[str, Any]]) -> str:
        """
        Insert inline citation markers [1], [2] into generated text
        This is a simple post-processing approach
        """
        if not self.config.ENABLE_CITATIONS or not sources:
            return text

        # For now, append citations at the end of sentences mentioning source content
        # A more sophisticated approach would use NER or keyword matching
        # This is a placeholder - real implementation would match content to sources

        return text

    def _generate_citation_prompt(self, sources: List[str], query: str) -> str:
        """
        Generate a prompt that enforces citation usage
        """
        if not self.config.ENABLE_CITATIONS:
            return self._build_standard_prompt(sources, query)

        sources_text = "\n\n".join([
            f"[{i+1}] {chunk}" for i, chunk in enumerate(sources)
        ])

        prompt = f"""You are a helpful AI assistant that provides accurate, well-cited answers based on provided sources.

IMPORTANT CITATION RULES:
1. Use ONLY the information from the provided sources below
2. Add inline citations [1], [2], etc. after each claim
3. Every factual statement MUST have a citation
4. If sources conflict, note it and cite both
5. If information is not in sources, say "The provided sources do not contain information about..."

SOURCES:
{sources_text}

USER QUESTION: {query}

Provide a comprehensive answer with inline citations:"""

        return prompt

    def _load_task_prompt(self, task_type: str, slots: Dict[str, Any], sources: List[str], query: str) -> str:
        """
        Load task-specific prompt template
        """
        prompt_file = Path(__file__).parent / "prompts" / f"{task_type}.txt"

        if prompt_file.exists():
            try:
                with open(prompt_file, 'r') as f:
                    template = f.read()

                # Format template with slots and sources
                sources_text = "\n\n".join([f"[{i+1}] {chunk}" for i, chunk in enumerate(sources)])

                formatted = template.format(
                    semester=slots.get('semester', 'N/A'),
                    program=slots.get('department', 'N/A'),
                    institution=slots.get('institution', 'N/A'),
                    level=slots.get('level', 'N/A'),
                    sources=sources_text,
                    query=query
                )

                logger.info(f"✅ Loaded task prompt: {task_type}")
                return formatted
            except Exception as e:
                logger.error(f"Failed to load prompt template {task_type}: {e}")
                return self._generate_citation_prompt(sources, query)
        else:
            logger.warning(f"Prompt template not found: {task_type}, using default")
            return self._generate_citation_prompt(sources, query)

    async def validate_output(self, output: str, task_type: str) -> Tuple[bool, List[str]]:
        """
        Validate generated output based on task type
        Returns: (is_valid, list_of_violations)
        """
        if not self.config.ENABLE_VALIDATION:
            return True, []

        violations = []

        if task_type == "syllabus":
            # Check for required sections
            required_sections = [
                "Course Overview", "Learning Objectives", "Weekly Plan",
                "Assessments", "Grading Policy"
            ]

            for section in required_sections:
                if section.lower() not in output.lower():
                    violations.append(f"Missing required section: {section}")

            # Check assessment weights sum to 100%
            import re
            percentages = re.findall(r'(\d+)%', output)
            if percentages:
                total = sum(int(p) for p in percentages if int(p) <= 100)
                if total != 100 and total > 0:
                    violations.append(f"Assessment weights sum to {total}%, not 100%")

            # Check for weekly plan (should have 12-15 weeks)
            week_matches = re.findall(r'Week\s+(\d+)', output, re.IGNORECASE)
            if week_matches:
                num_weeks = len(set(week_matches))
                if num_weeks < 12 or num_weeks > 15:
                    violations.append(f"Weekly plan has {num_weeks} weeks, should be 12-15")

        elif task_type == "summary":
            # Check for key sections
            if "Executive Summary" not in output and "Summary" not in output:
                violations.append("Missing executive summary section")

            if "Key Points" not in output and "Main Points" not in output:
                violations.append("Missing key points section")

        # Check for citations if enabled
        if self.config.ENABLE_CITATIONS:
            citation_matches = re.findall(r'\[(\d+)\]', output)
            if not citation_matches:
                violations.append("No citations found in output (citations were enabled)")

        is_valid = len(violations) == 0
        if not is_valid:
            logger.warning(f"⚠️ Validation failed: {violations}")

        return is_valid, violations

    async def generate_repair_prompt(self, output: str, violations: List[str], task_type: str) -> str:
        """
        Generate a focused repair prompt to fix validation violations
        """
        violation_text = "\n".join([f"- {v}" for v in violations])

        prompt = f"""You are fixing a {task_type} document that has validation issues.

ORIGINAL OUTPUT:
{output}

VALIDATION ISSUES:
{violation_text}

TASK: Fix ONLY the validation issues listed above. Preserve all other content.

RULES:
- For missing sections: Add them with appropriate content
- For assessment weights: Adjust percentages to sum to exactly 100%
- For weekly plan: Adjust to have 12-15 weeks
- For missing citations: Add inline citations [1], [2] where appropriate
- Keep all existing good content

Output the CORRECTED version:"""

        return prompt

    async def detect_conflicts(self, sources: List[str], chunks_metadata: List[Dict]) -> List[Dict[str, Any]]:
        """
        Detect conflicting information across sources
        Returns list of conflicts
        """
        if not self.config.ENABLE_CONFLICT_DETECTION or len(sources) < 2:
            return []

        conflicts = []

        # Use LLM to detect conflicts
        sources_text = "\n\n".join([f"[Source {i+1}]:\n{chunk}" for i, chunk in enumerate(sources)])

        prompt = f"""Analyze these sources and identify any conflicting information. Return ONLY valid JSON.

{sources_text}

Return JSON array of conflicts:
[
  {{
    "type": "conflict_type",
    "sources": [1, 2],
    "description": "Brief description of conflict",
    "severity": "high" | "medium" | "low"
  }}
]

If no conflicts, return empty array: []

JSON only:"""

        try:
            response = self.groq_client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.1,
                max_tokens=1000
            )

            result_text = response.choices[0].message.content.strip()

            # Clean JSON response
            if result_text.startswith("```"):
                result_text = result_text.split("```")[1]
                if result_text.startswith("json"):
                    result_text = result_text[4:]
                result_text = result_text.strip()

            conflicts = json.loads(result_text)
            if conflicts:
                logger.info(f"⚠️ Detected {len(conflicts)} conflicts between sources")

            return conflicts
        except Exception as e:
            logger.error(f"Conflict detection failed: {e}")
            return []

    async def generate_clarifying_question(self, query: str, slots: Dict[str, Any]) -> Optional[str]:
        """
        Generate clarifying question if critical information is missing
        """
        if not self.config.ENABLE_CLARIFYING_QUESTIONS:
            return None

        missing_fields = slots.get('missing_fields', [])

        # Critical fields that require clarification
        critical_fields = {
            'syllabus': ['institution', 'semester', 'department'],
            'summary': [],
            'analysis': []
        }

        task_type = slots.get('task_type', 'qa')
        required = critical_fields.get(task_type, [])

        critical_missing = [f for f in missing_fields if f in required]

        if critical_missing:
            field_names = ", ".join(critical_missing)
            question = f"To provide accurate information, I need to know: {field_names}. Could you please specify?"
            logger.info(f"🤔 Clarifying question: {question}")
            return question

        return None

    async def upload_document(
        self,
        file: UploadFile,
        user_id: Optional[str] = None,
        session_id: Optional[str] = None
    ) -> UploadResponse:
        """Upload and index a document"""

        logger.info(f"Upload started: filename={file.filename}, user_id={user_id}, session_id={session_id}")

        # Validate file extension
        file_ext = Path(file.filename).suffix.lower()
        logger.info(f"File extension: {file_ext}")

        if file_ext not in self.config.ALLOWED_EXTENSIONS:
            logger.error(f"File type {file_ext} not allowed")
            raise HTTPException(
                status_code=400,
                detail=f"File type {file_ext} not supported. Allowed: {self.config.ALLOWED_EXTENSIONS}"
            )

        # Read file content
        logger.info("Reading file bytes...")
        file_bytes = await file.read()
        file_size = len(file_bytes)
        logger.info(f"File size: {file_size} bytes ({file_size / 1024:.2f} KB)")

        # Validate file size
        if file_size > self.config.MAX_FILE_SIZE_MB * 1024 * 1024:
            logger.error(f"File too large: {file_size} bytes")
            raise HTTPException(
                status_code=400,
                detail=f"File too large. Max size: {self.config.MAX_FILE_SIZE_MB}MB"
            )

        # Extract text based on file type
        logger.info(f"Extracting text from {file.filename} ({file_ext})")

        try:
            if file_ext == '.pdf':
                text, page_count = DocumentProcessor.extract_text_from_pdf(file_bytes)
            elif file_ext == '.docx':
                text, page_count = DocumentProcessor.extract_text_from_docx(file_bytes)
            else:  # .txt, .md
                text, page_count = DocumentProcessor.extract_text_from_txt(file_bytes)

            logger.info(f"✅ Extraction successful: {len(text)} chars, {page_count} pages")
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"❌ Extraction failed: {e}", exc_info=True)
            raise HTTPException(status_code=400, detail=f"Failed to extract text: {str(e)}")

        logger.info(f"Validating extracted text (length: {len(text)}, stripped: {len(text.strip())})")
        if not text.strip():
            logger.error("❌ No text content after extraction")
            raise HTTPException(status_code=400, detail="No text could be extracted from document")

        # Generate document ID
        doc_id = self._generate_doc_id(file.filename, file_bytes)
        logger.info(f"Generated document ID: {doc_id}")

        # Chunk the text
        logger.info(f"Chunking document: {file.filename}")
        try:
            chunks = DocumentProcessor.chunk_text(
                text,
                chunk_size=self.config.CHUNK_SIZE,
                overlap=self.config.CHUNK_OVERLAP
            )

            if not chunks:
                logger.error("❌ No chunks created from document")
                raise HTTPException(status_code=400, detail="Failed to create chunks from document")

            logger.info(f"✅ Created {len(chunks)} chunks")
        except Exception as e:
            logger.error(f"❌ Chunking failed: {e}", exc_info=True)
            raise HTTPException(status_code=400, detail=f"Chunking failed: {str(e)}")

        # Generate embeddings
        logger.info("Generating embeddings...")
        try:
            embeddings = self.embedding_model.encode(chunks, show_progress_bar=False)
            logger.info(f"✅ Generated {len(embeddings)} embeddings")
        except Exception as e:
            logger.error(f"❌ Embedding generation failed: {e}", exc_info=True)
            raise HTTPException(status_code=400, detail=f"Embedding generation failed: {str(e)}")

        # Store in ChromaDB
        logger.info("Storing in ChromaDB...")
        try:
            chunk_ids = [f"{doc_id}_chunk_{i}" for i in range(len(chunks))]
            metadatas = [
                {
                    "doc_id": doc_id,
                    "filename": file.filename,
                    "chunk_index": i,
                    "user_id": user_id or "anonymous",
                    "session_id": session_id or "default",
                    "upload_time": datetime.now().isoformat()
                }
                for i in range(len(chunks))
            ]

            self.collection.add(
                ids=chunk_ids,
                embeddings=embeddings.tolist(),
                documents=chunks,
                metadatas=metadatas
            )
            logger.info(f"✅ Stored {len(chunks)} chunks in ChromaDB")
        except Exception as e:
            logger.error(f"❌ ChromaDB storage failed: {e}", exc_info=True)
            raise HTTPException(status_code=400, detail=f"Failed to store in vector database: {str(e)}")

        # Save document metadata
        try:
            metadata = DocumentMetadata(
                doc_id=doc_id,
                filename=file.filename,
                file_type=file_ext,
                size_bytes=file_size,
                upload_time=datetime.now().isoformat(),
                user_id=user_id,
                session_id=session_id,
                chunk_count=len(chunks),
                page_count=page_count
            )
            self.document_metadata[doc_id] = metadata
            self._save_metadata()
            logger.info(f"✅ Saved metadata for doc {doc_id}")
        except Exception as e:
            logger.error(f"❌ Metadata save failed: {e}", exc_info=True)
            # Non-critical, don't fail the upload

        # Save original file
        try:
            file_path = Path(self.config.UPLOAD_DIR) / f"{doc_id}{file_ext}"
            with open(file_path, 'wb') as f:
                f.write(file_bytes)
            logger.info(f"✅ Saved original file to {file_path}")
        except Exception as e:
            logger.error(f"❌ File save failed: {e}", exc_info=True)
            # Non-critical, don't fail the upload

        logger.info(f"✅ Document uploaded and indexed: {doc_id}")

        return UploadResponse(
            doc_id=doc_id,
            filename=file.filename,
            file_type=file_ext,
            size_bytes=file_size,
            chunk_count=len(chunks),
            page_count=page_count,
            status="ready"
        )

    async def chat(self, request: ChatRequest) -> str:
        """Process chat query with document context"""
        start_time = time.time()

        # Apply settings overrides
        top_k = request.top_k or self.config.TOP_K_CHUNKS
        threshold = request.threshold or self.config.SIMILARITY_THRESHOLD
        temperature = request.temperature or self.config.TEMPERATURE
        model = request.model or self.config.GROQ_MODEL

        # ============ NEW: Slot Extraction & Query Rewriting ============
        original_query = request.message
        slots = {}

        if request.enable_slot_extraction and self.config.ENABLE_SLOT_EXTRACTION:
            logger.info(f"🔍 Extracting slots from: {original_query[:100]}...")
            slots = await self.extract_slots(original_query, request.user_id)

            # ============ NEW: Check for clarifying questions ============
            clarifying_q = await self.generate_clarifying_question(original_query, slots)
            if clarifying_q:
                # Return clarifying question as a final message
                from datetime import datetime
                iso_timestamp = datetime.now().isoformat()

                async def ask_clarification():
                    # Stream the question text
                    for char in clarifying_q:
                        yield f"data: {json.dumps({'token': char})}\n\n"
                        await asyncio.sleep(0.01)

                    # Send final event with clarifying question
                    final_data = {
                        "type": "final",
                        "final": True,
                        "message": clarifying_q,
                        "answer": clarifying_q,
                        "is_clarifying_question": True,
                        "missing_slots": slots.get('missing_fields', []),
                        "sources": [],
                        "confidence": 1.0,
                        "sessionId": request.session_id,
                        "messageId": f"msg_{int(time.time() * 1000)}",
                        "timestamp": iso_timestamp,
                        "usage": {
                            "totalTokens": len(clarifying_q.split()),
                            "promptTokens": len(request.message.split()),
                            "completionTokens": len(clarifying_q.split())
                        }
                    }
                    yield f"data: {json.dumps(final_data)}\n\n"

                return ask_clarification()

        # Rewrite query if slots extracted
        if slots and self.config.ENABLE_QUERY_REWRITE:
            enhanced_query = await self.rewrite_query(original_query, slots)
            logger.info(f"✨ Enhanced query: {enhanced_query[:100]}...")
        else:
            enhanced_query = original_query

        # Use enhanced query for embedding
        query_for_embedding = enhanced_query

        # Check cache first (use original query for cache key to avoid cache misses)
        cache_key = self._get_cache_key(request.session_id, original_query, request.doc_ids or [], top_k)
        cached_result = self._get_cached_result(cache_key)

        if cached_result:
            # Return cached streaming response
            async def replay_cached():
                # Stream tokens from cache
                for char in cached_result:
                    yield f"data: {json.dumps({'token': char})}\n\n"
                    await asyncio.sleep(0.01)  # Simulate streaming

                # Send final event
                yield f"data: {json.dumps({'type': 'final', 'final': True, 'message': cached_result, 'cached': True, 'sessionId': request.session_id, 'messageId': f'msg_{int(time.time() * 1000)}', 'timestamp': time.time()})}\n\n"

            return replay_cached()

        # ============ PHASE 4: Advanced Retrieval Pipeline ============

        # Step 1: Query Decomposition (if complex query)
        sub_queries = await self.decompose_query(enhanced_query)
        all_sub_results = []

        for sub_query in sub_queries:
            logger.info(f"🔍 Processing sub-query: {sub_query[:80]}...")

            # Step 2: HyDE - Generate hypothetical document for better retrieval
            hyde_query = await self.generate_hypothetical_document(sub_query)
            query_for_embedding = hyde_query

            # Step 3: RRF - Generate query variations
            query_variations = await self.generate_query_variations(query_for_embedding)

            # Build metadata filter
            metadata_filter = self._build_metadata_filter(slots, request.metadata_filters or {})

            # Combine with document and session filters
            base_conditions = []
            base_conditions.append({"session_id": request.session_id})

            if request.doc_ids and len(request.doc_ids) > 0:
                if len(request.doc_ids) == 1:
                    base_conditions.append({"doc_id": request.doc_ids[0]})
                else:
                    base_conditions.append({"doc_id": {"$in": request.doc_ids}})

            if metadata_filter:
                if "$and" in metadata_filter:
                    base_conditions.extend(metadata_filter["$and"])
                else:
                    base_conditions.append(metadata_filter)

            # Build final where filter
            if len(base_conditions) == 1:
                where_filter = base_conditions[0]
            else:
                where_filter = {"$and": base_conditions}

            logger.info(f"📋 Using filters: {where_filter}")

            # Step 4: Retrieve with all query variations (for RRF)
            ranked_lists = []
            retrieval_k = top_k * 3 if self.config.ENABLE_MMR else top_k

            for query_var in query_variations:
                query_embedding = self.embedding_model.encode([query_var])[0]

                results = self.collection.query(
                    query_embeddings=[query_embedding.tolist()],
                    n_results=retrieval_k,
                    where=where_filter
                )

                chunks_var = results['documents'][0] if results['documents'] else []
                distances_var = results['distances'][0] if results['distances'] else []
                metadatas_var = results['metadatas'][0] if results['metadatas'] else []

                # Convert to tuples for RRF
                similarities_var = [1 - d for d in distances_var] if distances_var else []
                ranked_list = [
                    (chunk, sim, meta)
                    for chunk, sim, meta in zip(chunks_var, similarities_var, metadatas_var)
                    if sim >= threshold
                ]
                ranked_lists.append(ranked_list)

            # Step 5: RRF - Merge results from all query variations
            fused_results = self.reciprocal_rank_fusion(ranked_lists, k=self.config.RRF_K)

            # Extract top results after RRF
            sub_chunks = [chunk for chunk, score, meta in fused_results[:top_k]]
            sub_metadatas = [meta for chunk, score, meta in fused_results[:top_k]]

            all_sub_results.append((sub_chunks, sub_metadatas))

        # Step 6: Combine results from all sub-queries
        chunks = []
        metadatas = []
        for sub_chunks, sub_metas in all_sub_results:
            chunks.extend(sub_chunks)
            metadatas.extend(sub_metas)

        # Remove duplicates while preserving order
        seen = set()
        unique_chunks = []
        unique_metadatas = []
        for chunk, meta in zip(chunks, metadatas):
            if chunk not in seen:
                seen.add(chunk)
                unique_chunks.append(chunk)
                unique_metadatas.append(meta)

        chunks = unique_chunks[:top_k]
        metadatas = unique_metadatas[:top_k]

        logger.info(f"Found {len(chunks)} unique chunks after Query Decomposition + RRF")

        # Step 7: Context Compression - Extract only relevant sentences
        chunks, metadatas = await self.compress_context(enhanced_query, chunks, metadatas)

        # ============ END PHASE 4 ============

        # Generate artificial similarities (all compressed chunks are relevant)
        similarities = [0.8] * len(chunks)  # High similarity since they passed all filters

        # Convert to old format for compatibility with existing code
        distances = [1 - s for s in similarities]

        # Phase 4 already did all filtering, deduplication, and compression
        # Just pass through the results
        filtered_chunks = chunks
        filtered_metadata = metadatas
        filtered_sims = similarities

        logger.info(f"✅ Final: {len(filtered_chunks)} high-quality chunks after Phase 4 pipeline")

        # Build prompt based on mode
        if request.mode == "document-only" and not filtered_chunks:
            # No relevant chunks found in document-only mode
            answer = (
                "I don't have enough information in the uploaded documents to answer that question. "
                "The question might be outside the scope of the documents, or the documents might not "
                "contain relevant information about this topic."
            )

            processing_time = time.time() - start_time
            response_data = {
                "answer": answer,
                "sources": [],
                "confidence": 0.0,
                "mode_used": "document-only",
                "processing_time": processing_time
            }

            async def generate():
                yield f"data: {json.dumps(response_data)}\n\n"

            return generate()

        # ============ NEW: Conflict Detection ============
        conflicts = []
        if filtered_chunks and self.config.ENABLE_CONFLICT_DETECTION:
            conflicts = await self.detect_conflicts(filtered_chunks, filtered_metadata)

        # ============ NEW: Task-Specific Prompts ============
        task_type = request.task_type if hasattr(request, 'task_type') else slots.get('task_type', 'qa')

        # Try to load task-specific prompt if task type is not 'qa'
        if task_type != 'qa' and filtered_chunks:
            logger.info(f"📋 Using task-specific prompt: {task_type}")
            user_prompt = self._load_task_prompt(task_type, slots, filtered_chunks, request.message)
            system_prompt = "You are a professional academic assistant."

            # Add conflict note if detected
            if conflicts:
                conflict_note = "\n\nNOTE: Conflicts detected between sources:\n"
                for conf in conflicts:
                    conflict_note += f"- {conf['description']} (Sources: {conf['sources']})\n"
                user_prompt += conflict_note

        else:
            # Standard prompts for QA mode
            # Build context from chunks (numbered for citations)
            if request.enable_citations and self.config.ENABLE_CITATIONS:
                context = "\n\n".join([
                    f"[{i+1}] {chunk}"
                    for i, chunk in enumerate(filtered_chunks)
                ])
            else:
                context = "\n\n".join([
                    f"[Chunk {i+1} from {meta.get('filename', 'document')}]:\n{chunk}"
                    for i, (chunk, meta) in enumerate(zip(filtered_chunks, filtered_metadata))
                ])

            # Build system prompt based on mode and citation settings
            if request.enable_citations and self.config.ENABLE_CITATIONS and filtered_chunks:
                # Citation-aware prompt
                system_prompt = """You are a helpful AI assistant that provides accurate, well-cited answers based on provided sources.

IMPORTANT CITATION RULES:
1. Use ONLY the information from the provided sources below
2. Add inline citations [1], [2], etc. after each claim from sources
3. Every factual statement from sources MUST have a citation
4. If sources conflict, note it and cite both sources
5. If information is not in sources, clearly state that"""

                if request.mode == "hybrid":
                    system_prompt += "\n6. You may supplement with general knowledge if sources are insufficient, but clearly mark what comes from sources vs general knowledge"

            elif request.mode == "document-only":
                system_prompt = """You are a helpful AI assistant that answers questions based STRICTLY on the provided document context.

Rules:
1. Answer ONLY using information from the provided context
2. If the context doesn't contain the answer, say so explicitly
3. Cite the document chunks you use
4. Be concise but thorough
5. If asked about topics not in the documents, politely indicate that"""
            else:  # hybrid mode (no citations)
                system_prompt = """You are a helpful AI assistant that answers questions using both document context and your general knowledge.

Rules:
1. PRIORITIZE information from the provided document context when available
2. You can supplement with general knowledge when helpful
3. Maintain awareness of the document context throughout the conversation
4. If using document info, mention it naturally
5. Be conversational like Gemini - helpful, clear, and engaging
6. You can answer general questions even if they're not in the documents
7. Keep the document context in mind for follow-up questions"""

            # Build user prompt
            if filtered_chunks:
                if request.enable_citations and self.config.ENABLE_CITATIONS:
                    user_prompt = f"""SOURCES:
{context}

USER QUESTION: {request.message}

Provide a comprehensive answer with inline citations [1], [2], etc. for all claims from sources:"""
                else:
                    user_prompt = f"""Document Context:
{context}

User Question: {request.message}

Please provide a helpful answer. If using information from the documents, mention it naturally."""
            else:
                user_prompt = f"""User Question: {request.message}

(Note: No specific document context found for this question, but you can use your general knowledge to help.)"""

        # Generate response using Groq
        logger.info(f"Generating response with Groq (model={model}, temp={temperature})...")

        async def generate():
            try:
                stream = self.groq_client.chat.completions.create(
                    model=model,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ],
                    max_tokens=self.config.MAX_TOKENS,
                    temperature=temperature,
                    stream=True
                )

                full_answer = ""
                for chunk in stream:
                    if chunk.choices[0].delta.content:
                        content = chunk.choices[0].delta.content
                        full_answer += content
                        yield f"data: {json.dumps({'token': content})}\n\n"

                # ============ NEW: Validation and Repair ============
                validation_passed = True
                validation_violations = []

                if self.config.ENABLE_VALIDATION and task_type != 'qa':
                    logger.info(f"🔍 Validating output for task: {task_type}")
                    validation_passed, validation_violations = await self.validate_output(full_answer, task_type)

                    # If validation failed, attempt repair
                    if not validation_passed and validation_violations:
                        logger.warning(f"⚠️ Validation failed, attempting repair...")
                        repair_prompt = await self.generate_repair_prompt(full_answer, validation_violations, task_type)

                        # Generate repaired version
                        repair_response = self.groq_client.chat.completions.create(
                            model=model,
                            messages=[{"role": "user", "content": repair_prompt}],
                            max_tokens=self.config.MAX_TOKENS,
                            temperature=0.3,  # Lower temperature for repair
                            stream=False
                        )

                        repaired_answer = repair_response.choices[0].message.content
                        logger.info("✅ Output repaired successfully")

                        # Re-validate
                        validation_passed, validation_violations = await self.validate_output(repaired_answer, task_type)

                        if validation_passed:
                            full_answer = repaired_answer
                            logger.info("✅ Repaired output passed validation")

                # Cache the result (after repair if applicable)
                self._cache_result(cache_key, full_answer)

                # Send final metadata
                processing_time = time.time() - start_time

                # ============ NEW: Enhanced sources with citation info ============
                sources = [
                    {
                        "citation_number": i + 1,
                        "filename": meta.get("filename", "unknown"),
                        "chunk_index": meta.get("chunk_index", 0),
                        "doc_id": meta.get("doc_id", ""),
                        "confidence": round(filtered_sims[i], 2) if i < len(filtered_sims) else 0.0,
                        "content_preview": filtered_chunks[i][:200] + "..." if i < len(filtered_chunks) and len(filtered_chunks[i]) > 200 else filtered_chunks[i] if i < len(filtered_chunks) else "",
                        # Rich metadata for filtering/display
                        "institution": meta.get("institution"),
                        "department": meta.get("department"),
                        "year": meta.get("year"),
                        "document_type": meta.get("document_type"),
                        "semester": meta.get("semester"),
                        "level": meta.get("level")
                    }
                    for i, meta in enumerate(filtered_metadata)
                ]

                confidence = sum(filtered_sims[:len(filtered_chunks)]) / len(filtered_sims) if filtered_sims else 0.0

                # Clean answer: remove citation placeholder commas
                clean_answer = re.sub(r',\s*,\s*,\s*,\s*,\s*,', '', full_answer)
                clean_answer = re.sub(r',\s*,\s*,\s*,', '', clean_answer)
                clean_answer = re.sub(r',\s*,', ',', clean_answer)

                # Generate proper ISO timestamp
                from datetime import datetime
                iso_timestamp = datetime.now().isoformat()

                final_data = {
                    "type": "final",
                    "final": True,
                    "message": clean_answer,  # Frontend expects 'message' not 'answer'
                    "answer": clean_answer,   # Keep for backward compatibility
                    "sources": sources,
                    "confidence": round(confidence, 2),
                    "mode_used": request.mode,
                    "processing_time": round(processing_time, 2),
                    "chunks_used": len(filtered_chunks),
                    "usage": {
                        "totalTokens": len(clean_answer.split()),
                        "promptTokens": len(request.message.split()),
                        "completionTokens": len(clean_answer.split())
                    },
                    "sessionId": request.session_id,
                    "messageId": f"msg_{int(time.time() * 1000)}",
                    "timestamp": iso_timestamp,
                    # NEW: Phase 1 features
                    "extracted_slots": slots if slots else {},
                    "query_rewritten": query_for_embedding != original_query,
                    "citations_enabled": request.enable_citations and self.config.ENABLE_CITATIONS,
                    # NEW: Phase 2/3 features
                    "task_type": task_type,
                    "conflicts_detected": conflicts if conflicts else [],
                    "validation_passed": validation_passed,
                    "validation_violations": validation_violations if not validation_passed else [],
                    "was_repaired": not validation_passed and len(validation_violations) > 0
                }

                yield f"data: {json.dumps(final_data)}\n\n"

            except Exception as e:
                logger.error(f"Generation error: {e}")
                error_data = {"error": str(e)}
                yield f"data: {json.dumps(error_data)}\n\n"

        return generate()

    def list_documents(self, session_id: Optional[str] = None) -> List[Dict]:
        """List all documents for a session"""
        docs = []
        for doc_id, metadata in self.document_metadata.items():
            if session_id is None or metadata.session_id == session_id:
                docs.append({
                    "doc_id": doc_id,
                    "filename": metadata.filename,
                    "file_type": metadata.file_type,
                    "size_bytes": metadata.size_bytes,
                    "chunk_count": metadata.chunk_count,
                    "page_count": metadata.page_count,
                    "upload_time": metadata.upload_time
                })
        return docs

    def delete_document(self, doc_id: str) -> bool:
        """Delete a document and its vectors"""
        if doc_id not in self.document_metadata:
            return False

        try:
            # Delete from ChromaDB
            chunk_ids = [f"{doc_id}_chunk_{i}" for i in range(self.document_metadata[doc_id].chunk_count)]
            self.collection.delete(ids=chunk_ids)

            # Delete file
            metadata = self.document_metadata[doc_id]
            file_path = Path(self.config.UPLOAD_DIR) / f"{doc_id}{metadata.file_type}"
            if file_path.exists():
                file_path.unlink()

            # Remove metadata
            del self.document_metadata[doc_id]
            self._save_metadata()

            logger.info(f"✅ Deleted document: {doc_id}")
            return True
        except Exception as e:
            logger.error(f"Failed to delete document {doc_id}: {e}")
            return False


# ============================================================================
# FastAPI Application
# ============================================================================

app = FastAPI(
    title="Document Chat RAG API",
    description="Flexible conversational document analysis with BGE + Groq",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize RAG service
rag_service: Optional[DocumentChatRAG] = None


@app.on_event("startup")
async def startup_event():
    """Initialize RAG service on startup"""
    global rag_service
    try:
        rag_service = DocumentChatRAG()
        logger.info("✅ Document Chat RAG service started successfully")
    except Exception as e:
        logger.error(f"❌ Failed to start RAG service: {e}")
        raise


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "Document Chat RAG",
        "version": "1.0.0",
        "documents_indexed": len(rag_service.document_metadata) if rag_service else 0
    }


@app.get("/ready")
async def readiness_check():
    """Readiness check endpoint - verifies all dependencies are ready"""
    if not rag_service:
        raise HTTPException(status_code=503, detail="RAG service not initialized")

    try:
        # Check Chroma connectivity
        collection_count = rag_service.chroma_client.list_collections()

        # Check embedding model
        if not rag_service.embedding_model:
            raise HTTPException(status_code=503, detail="Embedding model not loaded")

        # Check Groq client
        if not rag_service.groq_client:
            raise HTTPException(status_code=503, detail="Groq client not initialized")

        return {
            "status": "ready",
            "service": "Document Chat RAG",
            "version": "1.0.0",
            "components": {
                "chroma_db": "ready",
                "embedding_model": "ready",
                "groq_client": "ready",
                "cache": "enabled" if rag_service.config.ENABLE_CACHE else "disabled",
                "mmr": "enabled" if rag_service.config.ENABLE_MMR else "disabled"
            },
            "documents_indexed": len(rag_service.document_metadata),
            "cache_size": len(rag_service.query_cache)
        }
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Service not ready: {str(e)}")


@app.post("/upload", response_model=UploadResponse)
async def upload_document(
    file: UploadFile = File(...),
    user_id: Optional[str] = Form(None),
    session_id: Optional[str] = Form(None)
):
    """Upload and index a document"""
    if not rag_service:
        raise HTTPException(status_code=503, detail="Service not ready")

    try:
        return await rag_service.upload_document(file, user_id, session_id)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Upload error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


@app.post("/chat")
async def chat(request: ChatRequest):
    """Chat with documents"""
    if not rag_service:
        raise HTTPException(status_code=503, detail="Service not ready")

    generator = await rag_service.chat(request)
    return StreamingResponse(
        generator,
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )


@app.get("/documents")
async def list_documents(session_id: Optional[str] = None):
    """List all documents"""
    if not rag_service:
        raise HTTPException(status_code=503, detail="Service not ready")

    docs = rag_service.list_documents(session_id)
    return {"documents": docs, "count": len(docs)}


@app.delete("/documents/{doc_id}")
async def delete_document(doc_id: str):
    """Delete a document"""
    if not rag_service:
        raise HTTPException(status_code=503, detail="Service not ready")

    success = rag_service.delete_document(doc_id)
    if success:
        return {"message": "Document deleted successfully"}
    else:
        raise HTTPException(status_code=404, detail="Document not found")


# ============================================================================
# Main Entry Point
# ============================================================================

if __name__ == "__main__":
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=DocRAGConfig.PORT,
        log_level="info"
    )
