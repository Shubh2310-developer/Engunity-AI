#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Advanced Retrieval System for High-Quality RAG
==============================================

Implements hybrid search (Dense + Sparse), reranking, semantic chunking,
and query expansion for superior retrieval quality.

Author: Engunity AI Team
"""

import logging
import re
import numpy as np
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass
import faiss
from sentence_transformers import SentenceTransformer
from rank_bm25 import BM25Okapi
from sklearn.metrics.pairwise import cosine_similarity

logger = logging.getLogger(__name__)

@dataclass
class DocumentChunk:
    """Enhanced document chunk with metadata"""
    id: str
    content: str
    document_id: str
    chunk_index: int
    section_title: Optional[str] = None
    embeddings: Optional[np.ndarray] = None
    bm25_score: float = 0.0
    semantic_score: float = 0.0
    rerank_score: float = 0.0
    final_score: float = 0.0

@dataclass
class RetrievalResult:
    """Retrieval result with multiple scoring methods"""
    chunks: List[DocumentChunk]
    retrieval_method: str
    total_chunks_searched: int
    reranking_applied: bool = False

class CSTermExpander:
    """Computer Science domain-aware query expansion"""
    
    def __init__(self):
        self.cs_synonyms = {
            # Deep Learning & Neural Networks
            'resnet': ['residual neural network', 'residual network', 'skip connection network'],
            'lstm': ['long short-term memory', 'long short term memory'],
            'gru': ['gated recurrent unit'],
            'cnn': ['convolutional neural network', 'convnet'],
            'rnn': ['recurrent neural network'],
            'bp': ['backpropagation', 'back propagation'],
            'sgd': ['stochastic gradient descent'],
            'adam': ['adaptive moment estimation'],
            
            # Programming & Software
            'api': ['application programming interface'],
            'sql': ['structured query language'],
            'json': ['javascript object notation'],
            'xml': ['extensible markup language'],
            'css': ['cascading style sheets'],
            'html': ['hypertext markup language'],
            'oop': ['object oriented programming', 'object-oriented programming'],
            
            # TypeScript/JavaScript specific
            'ts': ['typescript'],
            'js': ['javascript'],
            'jsx': ['javascript xml'],
            'tsx': ['typescript xml'],
            'dom': ['document object model'],
            'es6': ['ecmascript 2015', 'ecmascript 6'],
            'es2015': ['ecmascript 2015', 'es6'],
            
            # Data Structures & Algorithms
            'bst': ['binary search tree'],
            'dfs': ['depth first search', 'depth-first search'],
            'bfs': ['breadth first search', 'breadth-first search'],
            'dp': ['dynamic programming'],
            'greedy': ['greedy algorithm'],
            
            # Systems & Architecture
            'cpu': ['central processing unit'],
            'gpu': ['graphics processing unit'],
            'ram': ['random access memory'],
            'ssd': ['solid state drive'],
            'hdd': ['hard disk drive'],
            'os': ['operating system'],
            
            # Common abbreviations
            'ml': ['machine learning'],
            'ai': ['artificial intelligence'],
            'nlp': ['natural language processing'],
            'cv': ['computer vision'],
            'db': ['database'],
            'ui': ['user interface'],
            'ux': ['user experience']
        }
        
        logger.info(f"CS Term Expander initialized with {len(self.cs_synonyms)} term mappings")
    
    def expand_query(self, query: str) -> str:
        """Expand query with CS domain terms"""
        expanded_query = query.lower()
        words = re.findall(r'\b\w+\b', expanded_query)
        
        expanded_terms = []
        for word in words:
            if word in self.cs_synonyms:
                expanded_terms.extend(self.cs_synonyms[word])
        
        if expanded_terms:
            expanded_query = f"{query} {' '.join(expanded_terms)}"
            logger.info(f"Expanded query: '{query}' -> '{expanded_query}'")
        
        return expanded_query

class SemanticChunker:
    """Advanced semantic chunking with overlapping windows"""
    
    def __init__(self, chunk_size: int = 800, overlap_ratio: float = 0.25):
        self.chunk_size = chunk_size
        self.overlap_size = int(chunk_size * overlap_ratio)
        logger.info(f"Semantic Chunker initialized: chunk_size={chunk_size}, overlap={self.overlap_size}")
    
    def chunk_by_sections(self, text: str, document_id: str) -> List[DocumentChunk]:
        """Chunk text by semantic sections with overlap"""
        if not text or len(text.strip()) < 100:
            return []
        
        # First, try to split by clear section boundaries
        sections = self._split_by_sections(text)
        
        if len(sections) <= 1:
            # Fallback to paragraph-based chunking
            sections = self._split_by_paragraphs(text)
        
        # Create overlapping chunks
        chunks = []
        for i, section in enumerate(sections):
            section_chunks = self._create_overlapping_chunks(section, document_id, i)
            chunks.extend(section_chunks)
        
        logger.info(f"Created {len(chunks)} semantic chunks for document {document_id}")
        return chunks
    
    def _split_by_sections(self, text: str) -> List[str]:
        """Split text by section headers and meaningful boundaries"""
        # Look for section patterns
        section_patterns = [
            r'\n\s*Chapter\s+\d+[^\n]*\n',
            r'\n\s*Section\s+\d+[^\n]*\n',
            r'\n\s*\d+\.\s+[A-Z][^\n]*\n',
            r'\n\s*[A-Z][A-Z\s]{10,50}\n',  # ALL CAPS headers
            r'\n\s*#{1,6}\s+[^\n]*\n',      # Markdown headers
        ]
        
        split_positions = []
        for pattern in section_patterns:
            matches = re.finditer(pattern, text, re.MULTILINE)
            for match in matches:
                split_positions.append(match.start())
        
        split_positions = sorted(set(split_positions))
        
        if not split_positions:
            return [text]
        
        sections = []
        start = 0
        for pos in split_positions:
            if pos > start:
                sections.append(text[start:pos].strip())
            start = pos
        
        # Add the last section
        if start < len(text):
            sections.append(text[start:].strip())
        
        return [s for s in sections if len(s) > 50]
    
    def _split_by_paragraphs(self, text: str) -> List[str]:
        """Split text by paragraphs when no clear sections exist"""
        paragraphs = re.split(r'\n\s*\n', text)
        return [p.strip() for p in paragraphs if len(p.strip()) > 50]
    
    def _create_overlapping_chunks(self, text: str, document_id: str, section_idx: int) -> List[DocumentChunk]:
        """Create overlapping chunks from a text section"""
        if len(text) <= self.chunk_size:
            return [DocumentChunk(
                id=f"{document_id}_chunk_{section_idx}_0",
                content=text,
                document_id=document_id,
                chunk_index=0,
                section_title=self._extract_section_title(text)
            )]
        
        chunks = []
        start = 0
        chunk_idx = 0
        
        while start < len(text):
            end = min(start + self.chunk_size, len(text))
            
            # Try to end at sentence boundary
            if end < len(text):
                last_sentence_end = text.rfind('.', start, end)
                if last_sentence_end > start + self.chunk_size // 2:
                    end = last_sentence_end + 1
            
            chunk_text = text[start:end].strip()
            if len(chunk_text) > 100:  # Only include substantial chunks
                chunks.append(DocumentChunk(
                    id=f"{document_id}_chunk_{section_idx}_{chunk_idx}",
                    content=chunk_text,
                    document_id=document_id,
                    chunk_index=chunk_idx,
                    section_title=self._extract_section_title(chunk_text)
                ))
                chunk_idx += 1
            
            # Move start position with overlap
            start = end - self.overlap_size
            if start >= len(text) - self.overlap_size:
                break
        
        return chunks
    
    def _extract_section_title(self, text: str) -> Optional[str]:
        """Extract section title from text"""
        lines = text.split('\n')[:3]  # Check first 3 lines
        for line in lines:
            line = line.strip()
            # Look for title patterns
            if (len(line) < 100 and 
                (line.isupper() or 
                 re.match(r'^Chapter \d+', line) or 
                 re.match(r'^\d+\.\s+[A-Z]', line) or
                 re.match(r'^#{1,6}\s+', line))):
                return line
        return None

class HybridRetriever:
    """Hybrid retrieval system combining dense and sparse search"""
    
    def __init__(self, 
                 dense_model_name: str = "BAAI/bge-small-en-v1.5",
                 reranker_model_name: str = "BAAI/bge-reranker-base",
                 use_reranker: bool = True):
        
        # Initialize models
        logger.info("Loading dense embedding model...")
        self.dense_model = SentenceTransformer(dense_model_name)
        
        self.use_reranker = use_reranker
        if use_reranker:
            try:
                logger.info("Loading reranker model...")
                self.reranker = SentenceTransformer(reranker_model_name)
            except Exception as e:
                logger.warning(f"Failed to load reranker: {e}. Continuing without reranking.")
                self.use_reranker = False
        
        # Initialize components
        self.term_expander = CSTermExpander()
        self.chunker = SemanticChunker()
        
        # Storage for chunks and indices
        self.chunks: List[DocumentChunk] = []
        self.dense_index: Optional[faiss.Index] = None
        self.bm25_index: Optional[BM25Okapi] = None
        
        logger.info("Hybrid Retriever initialized successfully")
    
    def index_document(self, document_text: str, document_id: str) -> int:
        """Index a document for hybrid search"""
        logger.info(f"Indexing document {document_id}...")
        
        # 1. Semantic chunking
        new_chunks = self.chunker.chunk_by_sections(document_text, document_id)
        
        if not new_chunks:
            logger.warning(f"No chunks created for document {document_id}")
            return 0
        
        # 2. Generate dense embeddings
        chunk_texts = [chunk.content for chunk in new_chunks]
        logger.info("Generating dense embeddings...")
        embeddings = self.dense_model.encode(chunk_texts, show_progress_bar=True)
        
        # 3. Update chunks with embeddings
        for chunk, embedding in zip(new_chunks, embeddings):
            chunk.embeddings = embedding
        
        # 4. Add to storage
        start_idx = len(self.chunks)
        self.chunks.extend(new_chunks)
        
        # 5. Update FAISS index
        self._update_dense_index(embeddings)
        
        # 6. Update BM25 index
        self._update_bm25_index()
        
        logger.info(f"Successfully indexed {len(new_chunks)} chunks from document {document_id}")
        return len(new_chunks)
    
    def _update_dense_index(self, new_embeddings: np.ndarray):
        """Update FAISS dense index"""
        if self.dense_index is None:
            # Create new index
            dimension = new_embeddings.shape[1]
            self.dense_index = faiss.IndexFlatIP(dimension)  # Inner Product for cosine similarity
            
        # Normalize embeddings for cosine similarity
        faiss.normalize_L2(new_embeddings)
        self.dense_index.add(new_embeddings.astype(np.float32))
    
    def _update_bm25_index(self):
        """Update BM25 sparse index"""
        # Tokenize all chunk texts
        tokenized_chunks = []
        for chunk in self.chunks:
            tokens = re.findall(r'\b\w+\b', chunk.content.lower())
            tokenized_chunks.append(tokens)
        
        self.bm25_index = BM25Okapi(tokenized_chunks)
    
    def hybrid_search(self, 
                     query: str, 
                     top_k: int = 20, 
                     dense_weight: float = 0.7, 
                     sparse_weight: float = 0.3,
                     rerank_top_k: int = 10) -> RetrievalResult:
        """Perform hybrid search with dense + sparse retrieval and reranking"""
        
        if not self.chunks:
            logger.warning("No indexed chunks available for search")
            return RetrievalResult(chunks=[], retrieval_method="empty", total_chunks_searched=0)
        
        # 1. Query expansion
        expanded_query = self.term_expander.expand_query(query)
        
        # 2. Dense search
        dense_scores, dense_chunks = self._dense_search(expanded_query, top_k)
        
        # 3. Sparse search
        sparse_scores, sparse_chunks = self._sparse_search(expanded_query, top_k)
        
        # 4. Combine and score
        combined_chunks = self._combine_search_results(
            dense_chunks, dense_scores, sparse_chunks, sparse_scores,
            dense_weight, sparse_weight, top_k
        )
        
        # 5. Reranking (optional)
        if self.use_reranker and len(combined_chunks) > 1:
            combined_chunks = self._rerank_chunks(query, combined_chunks[:rerank_top_k])
        
        return RetrievalResult(
            chunks=combined_chunks,
            retrieval_method="hybrid_search",
            total_chunks_searched=len(self.chunks),
            reranking_applied=self.use_reranker
        )
    
    def _dense_search(self, query: str, top_k: int) -> Tuple[np.ndarray, List[DocumentChunk]]:
        """Perform dense vector search"""
        if self.dense_index is None:
            return np.array([]), []
        
        # Encode query
        query_embedding = self.dense_model.encode([query])
        faiss.normalize_L2(query_embedding)
        
        # Search
        scores, indices = self.dense_index.search(query_embedding.astype(np.float32), min(top_k, len(self.chunks)))
        
        # Get chunks
        chunks = [self.chunks[idx] for idx in indices[0] if idx < len(self.chunks)]
        
        # Update semantic scores
        for chunk, score in zip(chunks, scores[0]):
            chunk.semantic_score = float(score)
        
        return scores[0], chunks
    
    def _sparse_search(self, query: str, top_k: int) -> Tuple[np.ndarray, List[DocumentChunk]]:
        """Perform BM25 sparse search"""
        if self.bm25_index is None:
            return np.array([]), []
        
        # Tokenize query
        query_tokens = re.findall(r'\b\w+\b', query.lower())
        
        # Get BM25 scores
        bm25_scores = self.bm25_index.get_scores(query_tokens)
        
        # Get top chunks
        top_indices = np.argsort(bm25_scores)[::-1][:top_k]
        top_scores = bm25_scores[top_indices]
        
        chunks = [self.chunks[idx] for idx in top_indices if idx < len(self.chunks)]
        
        # Update BM25 scores
        for chunk, score in zip(chunks, top_scores):
            chunk.bm25_score = float(score)
        
        return top_scores, chunks
    
    def _combine_search_results(self, 
                               dense_chunks: List[DocumentChunk], 
                               dense_scores: np.ndarray,
                               sparse_chunks: List[DocumentChunk], 
                               sparse_scores: np.ndarray,
                               dense_weight: float, 
                               sparse_weight: float,
                               top_k: int) -> List[DocumentChunk]:
        """Combine dense and sparse search results"""
        
        # Create a mapping of chunk_id -> chunk for deduplication
        chunk_map = {}
        
        # Add dense results
        for chunk, score in zip(dense_chunks, dense_scores):
            if chunk.id not in chunk_map:
                chunk_map[chunk.id] = chunk
            chunk_map[chunk.id].semantic_score = max(chunk_map[chunk.id].semantic_score, float(score))
        
        # Add sparse results
        for chunk, score in zip(sparse_chunks, sparse_scores):
            if chunk.id not in chunk_map:
                chunk_map[chunk.id] = chunk
            chunk_map[chunk.id].bm25_score = max(chunk_map[chunk.id].bm25_score, float(score))
        
        # Calculate final scores
        for chunk in chunk_map.values():
            # Normalize scores to [0, 1] range
            normalized_semantic = min(chunk.semantic_score, 1.0)
            normalized_bm25 = min(chunk.bm25_score / 10.0, 1.0) if chunk.bm25_score > 0 else 0.0
            
            chunk.final_score = (dense_weight * normalized_semantic + 
                               sparse_weight * normalized_bm25)
        
        # Sort by final score and return top_k
        sorted_chunks = sorted(chunk_map.values(), key=lambda x: x.final_score, reverse=True)
        return sorted_chunks[:top_k]
    
    def _rerank_chunks(self, query: str, chunks: List[DocumentChunk]) -> List[DocumentChunk]:
        """Rerank chunks using cross-encoder"""
        if not self.use_reranker or len(chunks) <= 1:
            return chunks
        
        try:
            # Prepare pairs for reranking
            pairs = [f"{query} [SEP] {chunk.content}" for chunk in chunks]
            
            # Get reranking scores using encode method for cross-encoder
            embeddings = self.reranker.encode(pairs)
            # Convert embeddings to similarity scores
            rerank_scores = embeddings.flatten() if len(embeddings.shape) > 1 else embeddings
            
            # Ensure scores is a list/array
            if hasattr(rerank_scores, 'tolist'):
                rerank_scores = rerank_scores.tolist()
            elif not isinstance(rerank_scores, list):
                rerank_scores = [rerank_scores]
            
            # Update rerank scores
            for chunk, score in zip(chunks, rerank_scores):
                chunk.rerank_score = float(score)
                chunk.final_score = chunk.rerank_score  # Use rerank score as final score
            
            # Sort by rerank score
            reranked_chunks = sorted(chunks, key=lambda x: x.rerank_score, reverse=True)
            
            logger.info(f"Reranked {len(chunks)} chunks")
            return reranked_chunks
            
        except Exception as e:
            logger.error(f"Reranking failed: {e}")
            # Fall back to using semantic scores
            for chunk in chunks:
                chunk.final_score = chunk.semantic_score or 0.5
            return sorted(chunks, key=lambda x: x.final_score, reverse=True)

# Global instance
_retriever = None

def get_hybrid_retriever() -> HybridRetriever:
    """Get global hybrid retriever instance"""
    global _retriever
    if _retriever is None:
        _retriever = HybridRetriever()
    return _retriever