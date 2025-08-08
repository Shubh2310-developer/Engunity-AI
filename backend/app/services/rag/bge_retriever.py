"""
Enhanced BGE Retriever with Reranking - RAG Pipeline
====================================================

High-performance retriever using BGE-small-en-v1.5 for semantic search
with integrated BGE reranker for improved retrieval quality.

Enhanced Features:
- BGE-small-en-v1.5 embeddings for efficient semantic search  
- FAISS vector store for fast similarity search
- Integrated BGE reranker for filtering irrelevant chunks
- Enhanced document chunking with noise removal
- Structured document retrieval with dual scoring (similarity + relevance)

Author: Engunity AI Team
Version: Enhanced v2.0 with Reranking
"""

import os
import json
import logging
import numpy as np
from typing import Dict, List, Optional, Tuple, Any, Union
from dataclasses import dataclass
from pathlib import Path
import pickle
import faiss
from sentence_transformers import SentenceTransformer
import torch
from transformers import AutoTokenizer, AutoModel
import re
from datetime import datetime

logger = logging.getLogger(__name__)

@dataclass
class RetrievalResult:
    """Result from document retrieval."""
    document_id: str
    content: str
    score: float
    metadata: Dict[str, Any]
    chunk_index: int
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'document_id': self.document_id,
            'content': self.content,
            'score': float(self.score),
            'metadata': self.metadata,
            'chunk_index': self.chunk_index
        }

@dataclass 
class DocumentChunk:
    """Document chunk for vector storage."""
    id: str
    content: str
    document_id: str
    chunk_index: int
    metadata: Dict[str, Any]
    embedding: Optional[np.ndarray] = None

class BGERetriever:
    """BGE-small based document retriever for RAG."""
    
    def __init__(
        self,
        model_name: str = "BAAI/bge-small-en-v1.5",
        index_path: str = "/home/ghost/engunity-ai/backend/models/documents/nq_faiss_index.faiss",
        metadata_path: str = "/home/ghost/engunity-ai/backend/models/documents/nq_metadata.pkl",
        device: str = "auto",
        max_chunk_size: int = 512,
        chunk_overlap: int = 64,  # Increased overlap as per recommendations
        use_existing_index: bool = True
    ):
        """
        Initialize BGE retriever.
        
        Args:
            model_name: BGE model name or path
            index_path: Path to save/load FAISS index
            device: Device to use ('cpu', 'cuda', 'auto')
            max_chunk_size: Maximum tokens per chunk
            chunk_overlap: Overlap between chunks
        """
        self.model_name = model_name
        self.index_path = Path(index_path) if not use_existing_index else index_path
        self.metadata_path = metadata_path
        self.max_chunk_size = max_chunk_size
        self.chunk_overlap = chunk_overlap
        self.use_existing_index = use_existing_index
        
        # Set device
        if device == "auto":
            self.device = "cuda" if torch.cuda.is_available() else "cpu"
        else:
            self.device = device
            
        logger.info(f"Using device: {self.device}")
        
        # Initialize model
        self._load_model()
        
        # Initialize reranker for enhanced quality filtering
        self.reranker = None
        self._load_reranker()
        
        # Initialize storage
        self.chunks: List[DocumentChunk] = []
        self.index: Optional[faiss.Index] = None
        self.metadata_store: Dict[str, Any] = {}
        
        # Load existing index if available
        if self.use_existing_index:
            self._load_existing_index()
        else:
            self._load_index()
        
        logger.info("Enhanced BGE Retriever initialized successfully")
    
    def _load_model(self):
        """Load BGE model and tokenizer."""
        try:
            logger.info(f"Loading BGE model: {self.model_name}")
            
            # Use sentence-transformers for easier usage
            self.model = SentenceTransformer(self.model_name, device=self.device)
            
            # Set model to evaluation mode
            self.model.eval()
            
            # Get embedding dimension
            test_embedding = self.model.encode(["test"], show_progress_bar=False)
            self.embedding_dim = test_embedding.shape[1]
            
            logger.info(f"Model loaded. Embedding dimension: {self.embedding_dim}")
            
        except Exception as e:
            logger.error(f"Error loading BGE model: {e}")
            raise
    
    def _load_reranker(self):
        """Load BGE reranker for enhanced retrieval quality."""
        try:
            # Import the enhanced reranker
            import sys
            sys.path.append('/home/ghost/engunity-ai/backend/app/services/rag')
            from enhanced_reranker import EnhancedReranker
            
            logger.info("Loading BGE reranker for quality filtering...")
            self.reranker = EnhancedReranker(
                model_name="BAAI/bge-reranker-base",
                use_fp16=True,
                device=self.device
            )
            logger.info("BGE reranker loaded successfully")
            
        except Exception as e:
            logger.warning(f"Could not load reranker: {e}")
            logger.info("Continuing without reranking - using similarity scores only")
            self.reranker = None
    
    def _load_index(self):
        """Load existing FAISS index and metadata."""
        try:
            index_file = self.index_path / "faiss.index"
            metadata_file = self.index_path / "metadata.json"
            chunks_file = self.index_path / "chunks.pkl"
            
            if index_file.exists() and metadata_file.exists() and chunks_file.exists():
                # Load FAISS index
                self.index = faiss.read_index(str(index_file))
                
                # Load metadata
                with open(metadata_file, 'r') as f:
                    self.metadata_store = json.load(f)
                
                # Load chunks
                with open(chunks_file, 'rb') as f:
                    self.chunks = pickle.load(f)
                
                logger.info(f"Loaded existing index with {len(self.chunks)} chunks")
            else:
                logger.info("No existing index found. Will create new one.")
                
        except Exception as e:
            logger.warning(f"Error loading existing index: {e}")
            self.index = None
            self.chunks = []
            self.metadata_store = {}
    
    def _load_existing_index(self):
        """Load the pre-built FAISS index and metadata from the models directory."""
        try:
            import pickle
            
            logger.info(f"Loading existing FAISS index from {self.index_path}")
            
            # Load FAISS index
            self.index = faiss.read_index(self.index_path)
            
            # Load metadata and documents
            with open(self.metadata_path, 'rb') as f:
                metadata = pickle.load(f)
            
            # Convert to our chunk format
            self.chunks = []
            documents = metadata.get('documents', [])
            
            for i, doc in enumerate(documents):
                chunk = DocumentChunk(
                    id=f"chunk_{i}",
                    content=doc.get('text', doc.get('content', '')),
                    document_id=doc.get('id', f"doc_{i}"),
                    chunk_index=i,
                    metadata=doc.get('metadata', {}),
                    embedding=None  # Already in FAISS index
                )
                self.chunks.append(chunk)
            
            # Update metadata store
            self.metadata_store = {}
            for chunk in self.chunks:
                doc_id = chunk.document_id
                if doc_id not in self.metadata_store:
                    self.metadata_store[doc_id] = {
                        'chunk_count': 0,
                        'loaded_from_existing': True
                    }
                self.metadata_store[doc_id]['chunk_count'] += 1
            
            logger.info(f"Loaded existing index with {len(self.chunks)} chunks from {len(self.metadata_store)} documents")
            
        except Exception as e:
            logger.error(f"Error loading existing index: {e}")
            raise
    
    def _save_index(self):
        """Save FAISS index and metadata."""
        try:
            # Create directory if it doesn't exist
            self.index_path.mkdir(parents=True, exist_ok=True)
            
            # Save FAISS index
            if self.index is not None:
                faiss.write_index(self.index, str(self.index_path / "faiss.index"))
            
            # Save metadata
            with open(self.index_path / "metadata.json", 'w') as f:
                json.dump(self.metadata_store, f, indent=2)
            
            # Save chunks
            with open(self.index_path / "chunks.pkl", 'wb') as f:
                pickle.dump(self.chunks, f)
            
            logger.info("Index saved successfully")
            
        except Exception as e:
            logger.error(f"Error saving index: {e}")
            raise
    
    def chunk_document(
        self, 
        text: str, 
        document_id: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> List[DocumentChunk]:
        """
        Chunk document into smaller pieces for better retrieval.
        
        Args:
            text: Document text
            document_id: Unique document identifier
            metadata: Additional metadata for document
            
        Returns:
            List of document chunks
        """
        if metadata is None:
            metadata = {}
            
        chunks = []
        
        # Simple sentence-based chunking with overlap
        sentences = self._split_into_sentences(text)
        
        current_chunk = []
        current_length = 0
        chunk_index = 0
        
        for sentence in sentences:
            sentence_length = len(sentence.split())
            
            # Start new chunk if current would exceed max size
            if current_length + sentence_length > self.max_chunk_size and current_chunk:
                # Create chunk from current sentences
                chunk_text = ' '.join(current_chunk)
                if chunk_text.strip():
                    chunk = DocumentChunk(
                        id=f"{document_id}_chunk_{chunk_index}",
                        content=chunk_text,
                        document_id=document_id,
                        chunk_index=chunk_index,
                        metadata={
                            **metadata,
                            'chunk_length': len(chunk_text),
                            'sentence_count': len(current_chunk),
                            'created_at': datetime.now().isoformat()
                        }
                    )
                    chunks.append(chunk)
                    chunk_index += 1
                
                # Keep overlap from previous chunk
                overlap_sentences = current_chunk[-self.chunk_overlap:] if len(current_chunk) > self.chunk_overlap else current_chunk
                current_chunk = overlap_sentences + [sentence]
                current_length = sum(len(s.split()) for s in current_chunk)
            else:
                current_chunk.append(sentence)
                current_length += sentence_length
        
        # Add final chunk if any content remains
        if current_chunk:
            chunk_text = ' '.join(current_chunk)
            if chunk_text.strip():
                chunk = DocumentChunk(
                    id=f"{document_id}_chunk_{chunk_index}",
                    content=chunk_text,
                    document_id=document_id,
                    chunk_index=chunk_index,
                    metadata={
                        **metadata,
                        'chunk_length': len(chunk_text),
                        'sentence_count': len(current_chunk),
                        'created_at': datetime.now().isoformat()
                    }
                )
                chunks.append(chunk)
        
        logger.info(f"Created {len(chunks)} chunks for document {document_id}")
        return chunks
    
    def _split_into_sentences(self, text: str) -> List[str]:
        """Split text into sentences."""
        # Simple sentence splitting
        sentences = re.split(r'[.!?]+', text)
        sentences = [s.strip() for s in sentences if s.strip()]
        return sentences
    
    def embed_chunks(self, chunks: List[DocumentChunk]) -> List[DocumentChunk]:
        """
        Generate embeddings for document chunks.
        
        Args:
            chunks: List of document chunks
            
        Returns:
            Chunks with embeddings added
        """
        if not chunks:
            return chunks
            
        logger.info(f"Generating embeddings for {len(chunks)} chunks")
        
        # Extract texts for batch encoding
        texts = [chunk.content for chunk in chunks]
        
        # Generate embeddings in batches
        batch_size = 32
        all_embeddings = []
        
        for i in range(0, len(texts), batch_size):
            batch_texts = texts[i:i + batch_size]
            batch_embeddings = self.model.encode(
                batch_texts,
                batch_size=len(batch_texts),
                show_progress_bar=False,
                convert_to_numpy=True
            )
            all_embeddings.append(batch_embeddings)
        
        # Combine all embeddings
        embeddings = np.vstack(all_embeddings)
        
        # Add embeddings to chunks
        for chunk, embedding in zip(chunks, embeddings):
            chunk.embedding = embedding
        
        logger.info("Embeddings generated successfully")
        return chunks
    
    def add_document(
        self, 
        text: str, 
        document_id: str,
        metadata: Optional[Dict[str, Any]] = None,
        save_index: bool = True
    ):
        """
        Add document to the retrieval index.
        
        Args:
            text: Document text
            document_id: Unique document identifier  
            metadata: Additional document metadata
            save_index: Whether to save index after adding
        """
        logger.info(f"Adding document: {document_id}")
        
        # Chunk document
        chunks = self.chunk_document(text, document_id, metadata)
        
        # Generate embeddings
        chunks = self.embed_chunks(chunks)
        
        # Add to storage
        self.chunks.extend(chunks)
        
        # Update metadata store
        self.metadata_store[document_id] = {
            'chunk_count': len(chunks),
            'added_at': datetime.now().isoformat(),
            'metadata': metadata or {}
        }
        
        # Rebuild FAISS index
        self._rebuild_index()
        
        if save_index:
            self._save_index()
        
        logger.info(f"Document {document_id} added successfully")
    
    def has_document(self, document_id: str) -> bool:
        """Check if document is already in the index."""
        return document_id in self.metadata_store
    
    def remove_document(self, document_id: str) -> bool:
        """
        Remove document from the index.
        
        Args:
            document_id: Document to remove
            
        Returns:
            True if document was removed, False if not found
        """
        if document_id not in self.metadata_store:
            return False
        
        # Remove chunks belonging to this document
        self.chunks = [chunk for chunk in self.chunks if chunk.document_id != document_id]
        
        # Remove from metadata store
        del self.metadata_store[document_id]
        
        # Rebuild index
        self._rebuild_index()
        self._save_index()
        
        logger.info(f"Removed document {document_id}")
        return True
    
    async def add_chunk(self, chunk) -> None:
        """
        Add a single chunk to the index (for incremental updates).
        
        Args:
            chunk: Document chunk to add
        """
        try:
            # Generate embedding for the chunk
            embedding = self.model.encode([chunk.content], show_progress_bar=False)[0]
            
            # Create DocumentChunk if needed
            if not hasattr(chunk, 'embedding'):
                # Convert to proper DocumentChunk format
                doc_chunk = DocumentChunk(
                    chunk_id=chunk.chunk_id,
                    document_id=chunk.document_id,
                    content=chunk.content,
                    chunk_type="auto",
                    chunk_index=chunk.chunk_index,
                    start_char=getattr(chunk, 'start_char', 0),
                    end_char=getattr(chunk, 'end_char', len(chunk.content)),
                    metadata=getattr(chunk, 'metadata', {}),
                    embedding=embedding
                )
            else:
                doc_chunk = chunk
                doc_chunk.embedding = embedding
            
            # Add to storage
            self.chunks.append(doc_chunk)
            
            # Update metadata
            doc_id = chunk.document_id
            if doc_id not in self.metadata_store:
                self.metadata_store[doc_id] = {
                    'chunk_count': 0,
                    'added_at': datetime.now().isoformat(),
                    'metadata': getattr(chunk, 'metadata', {})
                }
            
            self.metadata_store[doc_id]['chunk_count'] += 1
            self.metadata_store[doc_id]['last_updated'] = datetime.now().isoformat()
            
            # Rebuild index (could be optimized to just add to existing index)
            self._rebuild_index()
            
        except Exception as e:
            logger.error(f"Error adding chunk: {e}")
            raise
    
    def update_document(
        self,
        document_id: str,
        new_text: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Update document with incremental changes.
        
        Args:
            document_id: Document to update
            new_text: New document text
            metadata: Updated metadata
            
        Returns:
            Update statistics
        """
        import time
        start_time = time.time()
        
        # Check if document exists
        old_chunk_count = 0
        if document_id in self.metadata_store:
            old_chunk_count = self.metadata_store[document_id]['chunk_count']
            # Remove old document
            self.remove_document(document_id)
        
        # Add updated document
        self.add_document(new_text, document_id, metadata, save_index=True)
        
        new_chunk_count = self.metadata_store[document_id]['chunk_count']
        processing_time = time.time() - start_time
        
        return {
            'document_id': document_id,
            'old_chunk_count': old_chunk_count,
            'new_chunk_count': new_chunk_count,
            'chunks_changed': abs(new_chunk_count - old_chunk_count),
            'processing_time': processing_time,
            'status': 'updated'
        }
    
    def _rebuild_index(self):
        """Rebuild FAISS index from all chunks."""
        if not self.chunks:
            logger.warning("No chunks to index")
            return
            
        logger.info(f"Building FAISS index for {len(self.chunks)} chunks")
        
        # Extract embeddings
        embeddings = np.array([chunk.embedding for chunk in self.chunks])
        
        # Create FAISS index
        if self.device == "cuda" and torch.cuda.is_available():
            # Use GPU index if available
            res = faiss.StandardGpuResources()
            self.index = faiss.GpuIndexFlatIP(res, self.embedding_dim)
        else:
            # Use CPU index
            self.index = faiss.IndexFlatIP(self.embedding_dim)
        
        # Add embeddings to index
        self.index.add(embeddings.astype(np.float32))
        
        logger.info("FAISS index built successfully")
    
    def retrieve(
        self, 
        query: str, 
        top_k: int = 5,
        score_threshold: float = 0.3,  # Lowered for initial retrieval, reranker will filter
        filter_metadata: Optional[Dict[str, Any]] = None,
        rerank_results: bool = True,
        rerank_top_k: int = 15  # Retrieve more for reranking
    ) -> List[RetrievalResult]:
        """
        Retrieve relevant documents for a query with integrated reranking.
        
        Args:
            query: Search query
            top_k: Final number of results to return
            score_threshold: Minimum similarity score for initial retrieval
            filter_metadata: Optional metadata filters
            rerank_results: Whether to apply reranking for quality filtering
            rerank_top_k: Number of candidates to retrieve for reranking
            
        Returns:
            List of retrieval results (reranked if enabled)
        """
        if self.index is None or not self.chunks:
            logger.warning("No index available for retrieval")
            return []
        
        logger.info(f"Retrieving documents for query: {query[:100]}...")
        
        # Encode query with normalization
        query_embedding = self.model.encode([query], normalize_embeddings=True, show_progress_bar=False)
        query_embedding = query_embedding.astype(np.float32)
        
        # Retrieve more candidates for reranking if enabled
        search_k = rerank_top_k if rerank_results else top_k
        
        # Search in FAISS index (using inner product for normalized embeddings = cosine similarity)
        scores, indices = self.index.search(query_embedding, search_k)
        
        # Convert to results
        initial_results = []
        for score, idx in zip(scores[0], indices[0]):
            if idx == -1 or score < score_threshold:
                continue
                
            chunk = self.chunks[idx]
            
            # Apply metadata filters if specified
            if filter_metadata and not self._matches_filter(chunk.metadata, filter_metadata):
                continue
            
            result = RetrievalResult(
                document_id=chunk.document_id,
                content=chunk.content,
                score=float(score),
                metadata=chunk.metadata,
                chunk_index=chunk.chunk_index
            )
            initial_results.append(result)
        
        logger.info(f"Initial retrieval: {len(initial_results)} chunks")
        
        # Apply reranking if enabled and we have a reranker
        if rerank_results and hasattr(self, 'reranker') and self.reranker is not None:
            try:
                logger.info("Applying enhanced reranking...")
                
                # Convert results to format expected by reranker
                passages_for_rerank = []
                for result in initial_results:
                    passages_for_rerank.append({
                        'content': result.content,
                        'score': result.score,
                        'metadata': {
                            **result.metadata,
                            'document_id': result.document_id,
                            'chunk_index': result.chunk_index
                        }
                    })
                
                # Apply reranking
                reranked_results = self.reranker.get_best_passages(
                    query=query,
                    passages=passages_for_rerank,
                    top_k=top_k,
                    min_score=0.2  # Minimum rerank score
                )
                
                # Convert back to RetrievalResult format
                final_results = []
                for reranked in reranked_results:
                    metadata = reranked['metadata']
                    result = RetrievalResult(
                        document_id=metadata.get('document_id', 'unknown'),
                        content=reranked['content'],
                        score=reranked['score'],  # Use reranked score
                        metadata={
                            **metadata,
                            'original_score': reranked.get('original_score', 0),
                            'rerank_score': reranked.get('rerank_score', 0),
                            'reranked': True
                        },
                        chunk_index=metadata.get('chunk_index', 0)
                    )
                    final_results.append(result)
                
                logger.info(f"Reranking: {len(initial_results)} -> {len(final_results)} chunks")
                return final_results
                
            except Exception as e:
                logger.warning(f"Reranking failed, using original results: {e}")
                # Fall back to original results
                pass
        
        # Return top_k results without reranking
        final_results = initial_results[:top_k]
        logger.info(f"Retrieved {len(final_results)} relevant chunks (no reranking)")
        return final_results
    
    def _matches_filter(self, metadata: Dict[str, Any], filters: Dict[str, Any]) -> bool:
        """Check if metadata matches filters."""
        for key, value in filters.items():
            if key not in metadata or metadata[key] != value:
                return False
        return True
    
    def get_stats(self) -> Dict[str, Any]:
        """Get retriever statistics."""
        return {
            'total_chunks': len(self.chunks),
            'total_documents': len(self.metadata_store),
            'embedding_dim': self.embedding_dim,
            'device': self.device,
            'model_name': self.model_name,
            'index_exists': self.index is not None
        }
    
    def remove_document(self, document_id: str):
        """Remove document from index."""
        # Remove chunks
        original_count = len(self.chunks)
        self.chunks = [chunk for chunk in self.chunks if chunk.document_id != document_id]
        
        # Remove from metadata store
        if document_id in self.metadata_store:
            del self.metadata_store[document_id]
        
        # Rebuild index if chunks were removed
        if len(self.chunks) < original_count:
            self._rebuild_index()
            self._save_index()
            logger.info(f"Removed document {document_id}")
    
    def clear_index(self):
        """Clear all documents from index."""
        self.chunks = []
        self.index = None
        self.metadata_store = {}
        logger.info("Index cleared")

# Factory function
def create_bge_retriever(**kwargs) -> BGERetriever:
    """Create BGE retriever with default configuration."""
    return BGERetriever(**kwargs)

# Export main classes
__all__ = [
    "BGERetriever",
    "RetrievalResult", 
    "DocumentChunk",
    "create_bge_retriever"
]