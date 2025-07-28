"""
CS-Specific FAISS Vector Store Manager

Multi-index vector store for Computer Science domains with intelligent
query routing, cross-domain optimization, and efficient retrieval.

File: backend/vector_store/cs_faiss_manager.py
"""

import faiss
import numpy as np
import json
import pickle
import uuid
import re
import logging
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any, Union
from dataclasses import dataclass, asdict
from enum import Enum
from collections import defaultdict
import torch
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
import threading
from concurrent.futures import ThreadPoolExecutor
import time

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

try:
    from app.models.cs_embedding_config import CSVocabularyConfig, get_cs_config
except ImportError:
    # Fallback: create minimal config classes if not found
    from dataclasses import dataclass
    
    @dataclass
    class CSVocabularyConfig:
        include_code_tokens: bool = True
        include_math_symbols: bool = True
        max_vocab_size: int = 50000
        
    def get_cs_config():
        return CSVocabularyConfig()

logger = logging.getLogger(__name__)


class IndexType(str, Enum):
    """Types of FAISS indexes for different CS domains."""
    CODE = "code"
    THEORY = "theory"
    FUSION = "fusion"  # Cross-modal optimized index
    GENERAL = "general"


class QueryDomain(str, Enum):
    """Query domain classification for routing."""
    CODE_IMPLEMENTATION = "code_implementation"
    ALGORITHM_THEORY = "algorithm_theory"
    SYSTEM_CONCEPTS = "system_concepts"
    MIXED_DOMAIN = "mixed_domain"
    UNKNOWN = "unknown"


@dataclass
class DocumentChunk:
    """Represents a vectorizable document chunk with metadata."""
    id: str
    content: str
    chunk_type: str  # 'code', 'theory', 'docstring', 'comment'
    source_id: str
    metadata: Dict[str, Any]
    embedding: Optional[np.ndarray] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        data = asdict(self)
        # Convert embedding to list for JSON serialization
        if self.embedding is not None:
            data['embedding'] = self.embedding.tolist()
        return data
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'DocumentChunk':
        """Create from dictionary."""
        if 'embedding' in data and data['embedding'] is not None:
            data['embedding'] = np.array(data['embedding'])
        return cls(**data)


@dataclass
class SearchResult:
    """Represents a search result from FAISS indexes."""
    doc_id: str
    content: str
    score: float
    index_type: str
    chunk_type: str
    metadata: Dict[str, Any]
    source_id: str
    
    def __post_init__(self):
        """Ensure score is a Python float."""
        self.score = float(self.score)


class QueryClassifier:
    """Classifies queries to determine optimal index routing."""
    
    def __init__(self, cs_vocab: CSVocabularyConfig):
        self.cs_vocab = cs_vocab
        self._build_classification_patterns()
    
    def _build_classification_patterns(self):
        """Build regex patterns for query classification."""
        # Code implementation indicators
        self.code_patterns = [
            r'\b(?:implement|code|function|method|class|algorithm)\b',
            r'\b(?:def|class|import|return|for|while|if)\b',
            r'\b(?:python|java|javascript|cpp|rust|go)\s+(?:code|implementation)\b',
            r'\b(?:write|create|build)\s+(?:a|an)\s+(?:function|class|method)\b',
            r'```|`.*`',  # Code blocks
            r'\b(?:syntax|programming|coding)\b'
        ]
        
        # Theory/concept indicators  
        self.theory_patterns = [
            r'\b(?:what is|define|explain|concept|theory)\b',
            r'\b(?:complexity|analysis|proof|mathematical)\b',
            r'\b(?:time complexity|space complexity|big o|asymptotic)\b',
            r'\b(?:algorithm|data structure)\s+(?:definition|explanation)\b',
            r'\b(?:difference between|compare|contrast)\b',
            r'\b(?:advantages|disadvantages|when to use)\b'
        ]
        
        # Mixed domain indicators
        self.mixed_patterns = [
            r'\b(?:when to use|best practices|optimization)\b',
            r'\b(?:performance|efficiency|trade-off)\b',
            r'\b(?:example|demonstrate|show how)\b'
        ]
    
    def classify_query(self, query: str) -> QueryDomain:
        """
        Classify query to determine optimal index for search.
        
        Args:
            query: User query string
            
        Returns:
            QueryDomain enum indicating best routing strategy
        """
        query_lower = query.lower()
        
        # Check for code indicators
        code_score = sum(1 for pattern in self.code_patterns 
                        if re.search(pattern, query_lower))
        
        # Check for theory indicators
        theory_score = sum(1 for pattern in self.theory_patterns 
                          if re.search(pattern, query_lower))
        
        # Check for mixed indicators
        mixed_score = sum(1 for pattern in self.mixed_patterns 
                         if re.search(pattern, query_lower))
        
        # Check for specific CS keywords
        code_keywords = sum(1 for keyword in self.cs_vocab.code_patterns 
                           if keyword.lower() in query_lower)
        
        theory_keywords = sum(1 for keyword in 
                             (self.cs_vocab.theory_keywords + 
                              self.cs_vocab.ai_ml_keywords + 
                              self.cs_vocab.systems_keywords)
                             if keyword.lower() in query_lower)
        
        # Decision logic
        if code_score > theory_score and code_keywords > 0:
            return QueryDomain.CODE_IMPLEMENTATION
        elif theory_score > code_score and theory_keywords > 0:
            return QueryDomain.ALGORITHM_THEORY
        elif mixed_score > 0 or (code_score == theory_score and code_score > 0):
            return QueryDomain.MIXED_DOMAIN
        elif any(keyword in query_lower for keyword in 
                ['system', 'network', 'database', 'os', 'distributed']):
            return QueryDomain.SYSTEM_CONCEPTS
        else:
            return QueryDomain.UNKNOWN


class CSFAISSManager:
    """
    CS-specific FAISS vector store manager with multi-index support.
    
    Manages separate indexes for code and theory domains with intelligent
    query routing and cross-domain optimization.
    """
    
    def __init__(
        self,
        embedding_model: str = "BAAI/bge-small-en-v1.5",
        index_dir: str = "backend/vector_store/indices",
        metadata_dir: str = "backend/vector_store/metadata",
        embedding_dim: int = 384,
        use_gpu: bool = False
    ):
        self.embedding_model_name = embedding_model
        self.embedding_dim = embedding_dim
        self.index_dir = Path(index_dir)
        self.metadata_dir = Path(metadata_dir)
        self.use_gpu = use_gpu
        
        # Create directories
        self.index_dir.mkdir(parents=True, exist_ok=True)
        self.metadata_dir.mkdir(parents=True, exist_ok=True)
        
        # Initialize embedding model
        self.embedding_model = SentenceTransformer(embedding_model)
        if use_gpu and torch.cuda.is_available():
            self.embedding_model.to('cuda')
        
        # Initialize indexes
        self.indexes: Dict[str, faiss.Index] = {}
        self.metadata: Dict[str, Dict[str, DocumentChunk]] = defaultdict(dict)
        self.doc_counts: Dict[str, int] = defaultdict(int)
        
        # Query classifier
        config = get_cs_config()
        self.query_classifier = QueryClassifier(config.vocabulary_config)
        
        # Thread safety
        self._lock = threading.RLock()
        
        # Initialize indexes
        self._initialize_indexes()
        
        # Load existing data
        self._load_indexes()
        
        logger.info(f"Initialized CS FAISS Manager with {embedding_model}")
    
    def _initialize_indexes(self):
        """Initialize FAISS indexes for different domains."""
        with self._lock:
            # Code index - optimized for code snippets
            if self.use_gpu and faiss.get_num_gpus() > 0:
                self.indexes[IndexType.CODE] = faiss.IndexFlatIP(self.embedding_dim)
                self.indexes[IndexType.CODE] = faiss.index_cpu_to_gpu(
                    faiss.StandardGpuResources(), 0, self.indexes[IndexType.CODE]
                )
            else:
                self.indexes[IndexType.CODE] = faiss.IndexFlatIP(self.embedding_dim)
            
            # Theory index - optimized for conceptual content
            if self.use_gpu and faiss.get_num_gpus() > 0:
                self.indexes[IndexType.THEORY] = faiss.IndexFlatIP(self.embedding_dim)
                self.indexes[IndexType.THEORY] = faiss.index_cpu_to_gpu(
                    faiss.StandardGpuResources(), 0, self.indexes[IndexType.THEORY]
                )
            else:
                self.indexes[IndexType.THEORY] = faiss.IndexFlatIP(self.embedding_dim)
            
            # Fusion index - for cross-modal queries
            if self.use_gpu and faiss.get_num_gpus() > 0:
                self.indexes[IndexType.FUSION] = faiss.IndexFlatIP(self.embedding_dim)
                self.indexes[IndexType.FUSION] = faiss.index_cpu_to_gpu(
                    faiss.StandardGpuResources(), 0, self.indexes[IndexType.FUSION]
                )
            else:
                self.indexes[IndexType.FUSION] = faiss.IndexFlatIP(self.embedding_dim)
    
    def _get_index_path(self, index_type: str) -> Path:
        """Get file path for index."""
        return self.index_dir / f"cs_{index_type}.index"
    
    def _get_metadata_path(self, index_type: str) -> Path:
        """Get file path for metadata."""
        return self.metadata_dir / f"cs_{index_type}_metadata.json"
    
    def encode_texts(self, texts: List[str], normalize: bool = True) -> np.ndarray:
        """
        Encode texts to embeddings using the sentence transformer.
        
        Args:
            texts: List of text strings to encode
            normalize: Whether to normalize embeddings
            
        Returns:
            Numpy array of embeddings
        """
        embeddings = self.embedding_model.encode(
            texts,
            normalize_embeddings=normalize,
            show_progress_bar=len(texts) > 100
        )
        return embeddings.astype('float32')
    
    def add_documents(
        self,
        documents: List[DocumentChunk],
        index_type: str = IndexType.CODE,
        batch_size: int = 100
    ) -> None:
        """
        Add documents to the specified FAISS index.
        
        Args:
            documents: List of DocumentChunk objects
            index_type: Target index type ('code', 'theory', 'fusion')
            batch_size: Batch size for embedding generation
        """
        if not documents:
            return
        
        logger.info(f"Adding {len(documents)} documents to {index_type} index")
        
        with self._lock:
            index = self.indexes.get(index_type)
            if index is None:
                raise ValueError(f"Index type '{index_type}' not found")
            
            # Process documents in batches
            for i in range(0, len(documents), batch_size):
                batch = documents[i:i + batch_size]
                
                # Generate embeddings for batch
                texts = [doc.content for doc in batch]
                embeddings = self.encode_texts(texts)
                
                # Add to index
                start_id = index.ntotal
                index.add(embeddings)
                
                # Store metadata
                for j, doc in enumerate(batch):
                    internal_id = start_id + j
                    doc.embedding = embeddings[j]
                    self.metadata[index_type][str(internal_id)] = doc
                
                self.doc_counts[index_type] += len(batch)
                
                if i % (batch_size * 10) == 0:
                    logger.info(f"Processed {i + len(batch)}/{len(documents)} documents")
        
        logger.info(f"Added {len(documents)} documents to {index_type} index. "
                   f"Total: {self.doc_counts[index_type]}")
    
    def route_query(self, query: str) -> List[str]:
        """
        Route query to appropriate indexes based on content analysis.
        
        Args:
            query: User query string
            
        Returns:
            List of index types to search
        """
        domain = self.query_classifier.classify_query(query)
        
        if domain == QueryDomain.CODE_IMPLEMENTATION:
            return [IndexType.CODE]
        elif domain == QueryDomain.ALGORITHM_THEORY:
            return [IndexType.THEORY]
        elif domain == QueryDomain.SYSTEM_CONCEPTS:
            return [IndexType.THEORY, IndexType.CODE]
        elif domain == QueryDomain.MIXED_DOMAIN:
            return [IndexType.FUSION, IndexType.CODE, IndexType.THEORY]
        else:
            # Unknown - search all indexes
            return [IndexType.CODE, IndexType.THEORY]
    
    def search(
        self,
        query: str,
        top_k: int = 10,
        domain: Optional[str] = None,
        score_threshold: float = 0.0,
        rerank: bool = True
    ) -> List[SearchResult]:
        """
        Search across CS indexes with intelligent routing.
        
        Args:
            query: Search query
            top_k: Number of results to return
            domain: Optional domain override ('code', 'theory', 'fusion')
            score_threshold: Minimum similarity score
            rerank: Whether to rerank results using embedding similarity
            
        Returns:
            List of SearchResult objects sorted by relevance
        """
        # Determine which indexes to search
        if domain:
            search_indexes = [domain]
        else:
            search_indexes = self.route_query(query)
        
        logger.info(f"Searching indexes: {search_indexes} for query: {query[:50]}...")
        
        # Generate query embedding
        query_embedding = self.encode_texts([query])[0]
        
        # Search each index
        all_results = []
        
        for index_type in search_indexes:
            if index_type not in self.indexes:
                continue
                
            index = self.indexes[index_type]
            metadata = self.metadata[index_type]
            
            if index.ntotal == 0:
                continue
            
            # Perform search
            search_k = min(top_k * 2, index.ntotal)  # Get more candidates for reranking
            scores, indices = index.search(
                query_embedding.reshape(1, -1).astype('float32'),
                search_k
            )
            
            # Convert to SearchResult objects
            for score, idx in zip(scores[0], indices[0]):
                if idx == -1:  # Invalid index
                    continue
                    
                if score < score_threshold:
                    continue
                
                doc_chunk = metadata.get(str(idx))
                if doc_chunk is None:
                    continue
                
                result = SearchResult(
                    doc_id=doc_chunk.id,
                    content=doc_chunk.content,
                    score=score,
                    index_type=index_type,
                    chunk_type=doc_chunk.chunk_type,
                    metadata=doc_chunk.metadata,
                    source_id=doc_chunk.source_id
                )
                all_results.append(result)
        
        # Rerank if requested
        if rerank and all_results:
            all_results = self._rerank_results(query, all_results, query_embedding)
        
        # Sort by score and return top_k
        all_results.sort(key=lambda x: x.score, reverse=True)
        return all_results[:top_k]
    
    def _rerank_results(
        self,
        query: str,
        results: List[SearchResult],
        query_embedding: np.ndarray
    ) -> List[SearchResult]:
        """
        Rerank results using direct embedding similarity.
        
        Args:
            query: Original query
            results: Search results to rerank
            query_embedding: Query embedding vector
            
        Returns:
            Reranked results
        """
        if not results:
            return results
        
        # Get embeddings for all result contents
        contents = [result.content for result in results]
        content_embeddings = self.encode_texts(contents)
        
        # Calculate cosine similarities
        similarities = cosine_similarity(
            query_embedding.reshape(1, -1),
            content_embeddings
        )[0]
        
        # Update scores with weighted combination
        for i, result in enumerate(results):
            original_score = result.score
            rerank_score = similarities[i]
            
            # Weighted combination: 70% original FAISS score, 30% rerank score
            result.score = 0.7 * original_score + 0.3 * rerank_score
        
        return results
    
    def get_similar_documents(
        self,
        doc_id: str,
        top_k: int = 5,
        same_index_only: bool = True
    ) -> List[SearchResult]:
        """
        Find documents similar to a given document.
        
        Args:
            doc_id: ID of the reference document
            top_k: Number of similar documents to return
            same_index_only: Whether to search only in the same index
            
        Returns:
            List of similar documents
        """
        # Find the document in all indexes
        ref_doc = None
        ref_index_type = None
        
        for index_type, metadata in self.metadata.items():
            for internal_id, doc_chunk in metadata.items():
                if doc_chunk.id == doc_id:
                    ref_doc = doc_chunk
                    ref_index_type = index_type
                    break
            if ref_doc:
                break
        
        if not ref_doc:
            return []
        
        # Use the document content as query
        search_indexes = [ref_index_type] if same_index_only else list(self.indexes.keys())
        
        results = []
        for index_type in search_indexes:
            if index_type not in self.indexes:
                continue
                
            index = self.indexes[index_type]
            metadata = self.metadata[index_type]
            
            if index.ntotal == 0:
                continue
            
            # Search using document embedding
            scores, indices = index.search(
                ref_doc.embedding.reshape(1, -1).astype('float32'),
                top_k + 5  # Get extra to filter out the original
            )
            
            for score, idx in zip(scores[0], indices[0]):
                if idx == -1:
                    continue
                
                doc_chunk = metadata.get(str(idx))
                if doc_chunk is None or doc_chunk.id == doc_id:
                    continue  # Skip the original document
                
                result = SearchResult(
                    doc_id=doc_chunk.id,
                    content=doc_chunk.content,
                    score=score,
                    index_type=index_type,
                    chunk_type=doc_chunk.chunk_type,
                    metadata=doc_chunk.metadata,
                    source_id=doc_chunk.source_id
                )
                results.append(result)
        
        # Sort and return top_k
        results.sort(key=lambda x: x.score, reverse=True)
        return results[:top_k]
    
    def save_indexes(self) -> None:
        """Save all indexes and metadata to disk."""
        logger.info("Saving indexes and metadata...")
        
        with self._lock:
            for index_type, index in self.indexes.items():
                # Save FAISS index
                index_path = self._get_index_path(index_type)
                
                # Handle GPU indexes
                if hasattr(index, 'index'):  # GPU index wrapper
                    cpu_index = faiss.index_gpu_to_cpu(index)
                    faiss.write_index(cpu_index, str(index_path))
                else:
                    faiss.write_index(index, str(index_path))
                
                # Save metadata
                metadata_path = self._get_metadata_path(index_type)
                metadata_dict = {
                    internal_id: doc_chunk.to_dict()
                    for internal_id, doc_chunk in self.metadata[index_type].items()
                }
                
                with open(metadata_path, 'w') as f:
                    json.dump({
                        'metadata': metadata_dict,
                        'doc_count': self.doc_counts[index_type],
                        'embedding_model': self.embedding_model_name,
                        'embedding_dim': self.embedding_dim
                    }, f, indent=2)
        
        logger.info(f"Saved {len(self.indexes)} indexes to {self.index_dir}")
    
    def _load_indexes(self) -> None:
        """Load existing indexes and metadata from disk."""
        logger.info("Loading existing indexes...")
        
        for index_type in [IndexType.CODE, IndexType.THEORY, IndexType.FUSION]:
            index_path = self._get_index_path(index_type)
            metadata_path = self._get_metadata_path(index_type)
            
            if index_path.exists() and metadata_path.exists():
                try:
                    # Load FAISS index
                    cpu_index = faiss.read_index(str(index_path))
                    
                    if self.use_gpu and faiss.get_num_gpus() > 0:
                        self.indexes[index_type] = faiss.index_cpu_to_gpu(
                            faiss.StandardGpuResources(), 0, cpu_index
                        )
                    else:
                        self.indexes[index_type] = cpu_index
                    
                    # Load metadata
                    with open(metadata_path, 'r') as f:
                        data = json.load(f)
                    
                    # Restore metadata
                    for internal_id, doc_data in data['metadata'].items():
                        doc_chunk = DocumentChunk.from_dict(doc_data)
                        self.metadata[index_type][internal_id] = doc_chunk
                    
                    self.doc_counts[index_type] = data.get('doc_count', 0)
                    
                    logger.info(f"Loaded {index_type} index with {self.doc_counts[index_type]} documents")
                    
                except Exception as e:
                    logger.error(f"Failed to load {index_type} index: {e}")
                    # Re-initialize empty index
                    self._initialize_single_index(index_type)
            else:
                logger.info(f"No existing {index_type} index found")
    
    def _initialize_single_index(self, index_type: str):
        """Initialize a single empty index."""
        if self.use_gpu and faiss.get_num_gpus() > 0:
            self.indexes[index_type] = faiss.IndexFlatIP(self.embedding_dim)
            self.indexes[index_type] = faiss.index_cpu_to_gpu(
                faiss.StandardGpuResources(), 0, self.indexes[index_type]
            )
        else:
            self.indexes[index_type] = faiss.IndexFlatIP(self.embedding_dim)
    
    def get_stats(self) -> Dict[str, Any]:
        """Get statistics about the vector store."""
        stats = {
            'embedding_model': self.embedding_model_name,
            'embedding_dim': self.embedding_dim,
            'total_documents': sum(self.doc_counts.values()),
            'indexes': {}
        }
        
        for index_type, index in self.indexes.items():
            stats['indexes'][index_type] = {
                'document_count': self.doc_counts[index_type],
                'index_size': index.ntotal,
                'is_gpu': hasattr(index, 'index')
            }
        
        return stats
    
    def clear_index(self, index_type: str) -> None:
        """Clear a specific index."""
        with self._lock:
            if index_type in self.indexes:
                self._initialize_single_index(index_type)
                self.metadata[index_type].clear()
                self.doc_counts[index_type] = 0
                logger.info(f"Cleared {index_type} index")
    
    def optimize_indexes(self) -> None:
        """Optimize indexes for better search performance."""
        logger.info("Optimizing indexes...")
        
        with self._lock:
            for index_type, index in self.indexes.items():
                if index.ntotal > 10000:  # Only optimize larger indexes
                    # Convert to HNSW for better performance
                    logger.info(f"Converting {index_type} to HNSW index...")
                    
                    # Get all vectors
                    if hasattr(index, 'index'):  # GPU index
                        cpu_index = faiss.index_gpu_to_cpu(index)
                    else:
                        cpu_index = index
                    
                    vectors = np.zeros((cpu_index.ntotal, self.embedding_dim), dtype=np.float32)
                    cpu_index.reconstruct_n(0, cpu_index.ntotal, vectors)
                    
                    # Create HNSW index
                    hnsw_index = faiss.IndexHNSWFlat(self.embedding_dim, 32)
                    hnsw_index.hnsw.efConstruction = 200
                    hnsw_index.hnsw.efSearch = 64
                    
                    # Add vectors to HNSW
                    hnsw_index.add(vectors)
                    
                    # Replace index
                    if self.use_gpu and faiss.get_num_gpus() > 0:
                        self.indexes[index_type] = faiss.index_cpu_to_gpu(
                            faiss.StandardGpuResources(), 0, hnsw_index
                        )
                    else:
                        self.indexes[index_type] = hnsw_index
                    
                    logger.info(f"Optimized {index_type} index")
    
    def __del__(self):
        """Cleanup GPU resources if used."""
        if self.use_gpu:
            for index in self.indexes.values():
                if hasattr(index, 'index'):
                    # GPU index - resources will be cleaned up automatically
                    pass


# Factory function for easy initialization
def create_cs_faiss_manager(
    config_path: Optional[str] = None,
    custom_config: Optional[Dict] = None,
    use_gpu: bool = False
) -> CSFAISSManager:
    """
    Create a CS FAISS manager with configuration.
    
    Args:
        config_path: Path to configuration file
        custom_config: Custom configuration overrides
        use_gpu: Whether to use GPU acceleration
        
    Returns:
        Configured CSFAISSManager instance
    """
    config = get_cs_config(custom_config)
    
    manager = CSFAISSManager(
        embedding_model=config.embedding_config.base_model,
        embedding_dim=config.embedding_config.embedding_dim,
        use_gpu=use_gpu
    )
    
    return manager


# Export main classes
__all__ = [
    "CSFAISSManager",
    "DocumentChunk",
    "SearchResult", 
    "IndexType",
    "QueryDomain",
    "QueryClassifier",
    "create_cs_faiss_manager"
]