"""
CS-Aware Document Retriever for RAG Pipeline

Intelligent retriever service that understands Computer Science queries,
expands technical terms, and performs hybrid search across code and
documentation indexes with sophisticated reranking.

File: backend/app/services/rag/cs_retriever.py
"""

import re
import json
import logging
from typing import Dict, List, Optional, Tuple, Any, Set
from dataclasses import dataclass, field
from enum import Enum
from collections import defaultdict, Counter
import numpy as np
from pathlib import Path

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..', '..'))

try:
    from vector_store.cs_faiss_manager import (
        CSFAISSManager, 
        SearchResult, 
        IndexType
    )
except ImportError:
    # Fallback imports
    print("Warning: Could not import from vector_store, using fallbacks")
    class CSFAISSManager:
        pass
    class SearchResult:
        pass
    class IndexType:
        CODE = "code"
        THEORY = "theory"

try:
    from app.models.cs_embedding_config import CSVocabularyConfig, get_cs_config
except ImportError:
    # Fallback config
    from dataclasses import dataclass
    @dataclass
    class CSVocabularyConfig:
        include_code_tokens: bool = True
        include_math_symbols: bool = True
    def get_cs_config():
        return CSVocabularyConfig()

logger = logging.getLogger(__name__)


class ChunkType(str, Enum):
    """Types of retrieved chunks with priority ordering."""
    DOCUMENTATION = "documentation"      # Highest priority
    THEORY = "theory"                   # High priority
    CODE_WITH_DOCSTRING = "code_with_docstring"  # Medium-high priority
    CODE = "code"                       # Medium priority
    COMMENT = "comment"                 # Low priority
    EXAMPLE = "example"                 # Medium priority


class SourceQuality(str, Enum):
    """Source quality levels for ranking."""
    TEXTBOOK = "textbook"               # Highest quality
    OFFICIAL_DOCS = "official_docs"     # High quality
    ACADEMIC_PAPER = "academic_paper"   # High quality
    TUTORIAL = "tutorial"               # Medium quality
    BLOG_POST = "blog_post"             # Medium-low quality
    FORUM_POST = "forum_post"           # Low quality
    USER_GENERATED = "user_generated"   # Lowest quality


@dataclass
class RetrievedChunk:
    """Enhanced chunk representation with CS-specific metadata."""
    id: str
    content: str
    score: float
    chunk_type: ChunkType
    source_quality: SourceQuality
    index_type: str
    metadata: Dict[str, Any]
    source_id: str
    
    # CS-specific fields
    contains_code: bool = False
    programming_language: Optional[str] = None
    cs_concepts: List[str] = field(default_factory=list)
    complexity_mentioned: Optional[str] = None
    
    def __post_init__(self):
        """Post-process chunk to extract CS-specific information."""
        self._extract_cs_metadata()
    
    def _extract_cs_metadata(self):
        """Extract CS-specific metadata from content."""
        content_lower = self.content.lower()
        
        # Detect code presence
        code_indicators = ['def ', 'class ', 'function', '```', 'import ', 'return ', '{', '}']
        self.contains_code = any(indicator in content_lower for indicator in code_indicators)
        
        # Detect programming language
        language_patterns = {
            'python': r'\b(?:def|import|print|len|range|dict|list)\b',
            'java': r'\b(?:public|private|class|static|void|String)\b',
            'javascript': r'\b(?:function|var|let|const|console\.log)\b',
            'cpp': r'\b(?:#include|std::|cout|cin|vector)\b',
            'sql': r'\b(?:SELECT|FROM|WHERE|INSERT|UPDATE|CREATE)\b'
        }
        
        for lang, pattern in language_patterns.items():
            if re.search(pattern, content_lower):
                self.programming_language = lang
                break
        
        # Extract complexity mentions
        complexity_pattern = r'O\([^)]+\)'
        complexity_matches = re.findall(complexity_pattern, self.content)
        if complexity_matches:
            self.complexity_mentioned = complexity_matches[0]


class CSTermExpander:
    """Expands CS technical terms with synonyms and related concepts."""
    
    def __init__(self):
        self.term_expansions = self._build_expansion_dict()
        self.abbreviation_expansions = self._build_abbreviation_dict()
    
    def _build_expansion_dict(self) -> Dict[str, List[str]]:
        """Build dictionary of CS term expansions."""
        return {
            # Data Structures
            "map": ["dictionary", "hashmap", "hash table", "associative array"],
            "dict": ["dictionary", "map", "hashmap", "hash table"],
            "list": ["array", "vector", "sequence"],
            "stack": ["LIFO", "last in first out"],
            "queue": ["FIFO", "first in first out"],
            "tree": ["binary tree", "BST", "binary search tree"],
            "graph": ["network", "nodes and edges", "vertices"],
            "heap": ["priority queue", "binary heap"],
            
            # Algorithms
            "sort": ["sorting", "order", "arrange"],
            "search": ["find", "lookup", "retrieve"],
            "dfs": ["depth-first search", "depth first"],
            "bfs": ["breadth-first search", "breadth first"],
            "dp": ["dynamic programming", "memoization"],
            "greedy": ["greedy algorithm", "greedy approach"],
            
            # Programming Concepts
            "oop": ["object-oriented programming", "object oriented"],
            "recursion": ["recursive", "recursive function"],
            "iteration": ["loop", "iterative", "for loop", "while loop"],
            "function": ["method", "procedure", "subroutine"],
            "variable": ["var", "identifier", "symbol"],
            
            # System Concepts
            "os": ["operating system", "kernel"],
            "db": ["database", "DBMS", "data store"],
            "api": ["application programming interface", "interface"],
            "rest": ["RESTful", "REST API", "representational state transfer"],
            "json": ["JavaScript Object Notation", "data format"],
            
            # Performance
            "performance": ["efficiency", "speed", "optimization"],
            "latency": ["delay", "response time"],
            "throughput": ["bandwidth", "capacity", "rate"],
            "scalability": ["scale", "scalable", "scaling"],
            
            # Web Development
            "frontend": ["front-end", "client-side", "UI"],
            "backend": ["back-end", "server-side", "API"],
            "database": ["db", "data store", "persistence"],
            "cache": ["caching", "cached", "memory store"]
        }
    
    def _build_abbreviation_dict(self) -> Dict[str, str]:
        """Build dictionary of CS abbreviation expansions."""
        return {
            "AI": "artificial intelligence",
            "ML": "machine learning",
            "DL": "deep learning",
            "NLP": "natural language processing",
            "CNN": "convolutional neural network",
            "RNN": "recurrent neural network",
            "API": "application programming interface",
            "REST": "representational state transfer",
            "HTTP": "hypertext transfer protocol",
            "TCP": "transmission control protocol",
            "UDP": "user datagram protocol",
            "SQL": "structured query language",
            "NoSQL": "not only SQL",
            "CRUD": "create read update delete",
            "MVC": "model view controller",
            "OOP": "object-oriented programming",
            "FP": "functional programming",
            "TDD": "test-driven development",
            "CI": "continuous integration",
            "CD": "continuous deployment",
            "DevOps": "development operations",
            "AWS": "amazon web services",
            "GCP": "google cloud platform",
            "VM": "virtual machine",
            "OS": "operating system",
            "CPU": "central processing unit",
            "GPU": "graphics processing unit",
            "RAM": "random access memory",
            "SSD": "solid state drive",
            "HDD": "hard disk drive",
            "URL": "uniform resource locator",
            "URI": "uniform resource identifier",
            "JSON": "javascript object notation",
            "XML": "extensible markup language",
            "HTML": "hypertext markup language",
            "CSS": "cascading style sheets"
        }
    
    def expand_query(self, query: str) -> str:
        """
        Expand query with synonyms and full forms of abbreviations.
        
        Args:
            query: Original query string
            
        Returns:
            Expanded query with additional terms
        """
        words = query.lower().split()
        expanded_terms = set(words)  # Start with original words
        
        # Expand abbreviations
        for word in words:
            word_upper = word.upper()
            if word_upper in self.abbreviation_expansions:
                expansion = self.abbreviation_expansions[word_upper]
                expanded_terms.update(expansion.split())
        
        # Expand technical terms
        for word in words:
            if word in self.term_expansions:
                for synonym in self.term_expansions[word]:
                    expanded_terms.update(synonym.split())
        
        # Create expanded query (original + expansions)
        expanded_query = query + " " + " ".join(expanded_terms - set(words))
        return expanded_query.strip()
    
    def extract_cs_keywords(self, query: str) -> List[str]:
        """
        Extract CS-specific keywords from query.
        
        Args:
            query: Query string
            
        Returns:
            List of extracted CS keywords
        """
        keywords = []
        query_lower = query.lower()
        
        # Extract algorithm names
        algorithm_patterns = [
            r'\b(?:dijkstra|floyd|warshall|kruskal|prim|bellman|ford)\b',
            r'\b(?:quicksort|mergesort|heapsort|bubblesort|insertionsort)\b',
            r'\b(?:binary search|linear search|dfs|bfs)\b',
            r'\b(?:dynamic programming|greedy|divide and conquer)\b'
        ]
        
        for pattern in algorithm_patterns:
            matches = re.findall(pattern, query_lower)
            keywords.extend(matches)
        
        # Extract data structure names
        ds_patterns = [
            r'\b(?:array|list|stack|queue|tree|graph|heap|hash)\s*(?:table|map)?\b',
            r'\b(?:binary tree|bst|red black|avl|b\+?\s*tree)\b',
            r'\b(?:linked list|doubly linked|singly linked)\b'
        ]
        
        for pattern in ds_patterns:
            matches = re.findall(pattern, query_lower)
            keywords.extend(matches)
        
        # Extract complexity terms
        complexity_pattern = r'O\([^)]+\)'
        complexity_matches = re.findall(complexity_pattern, query)
        keywords.extend(complexity_matches)
        
        # Extract programming language mentions
        lang_pattern = r'\b(?:python|java|javascript|cpp|c\+\+|rust|go|sql)\b'
        lang_matches = re.findall(lang_pattern, query_lower)
        keywords.extend(lang_matches)
        
        return list(set(keywords))


class CSQueryProcessor:
    """Processes and enhances CS queries for better retrieval."""
    
    def __init__(self, cs_vocab: CSVocabularyConfig):
        self.cs_vocab = cs_vocab
        self.term_expander = CSTermExpander()
        self.stopwords = self._get_cs_stopwords()
    
    def _get_cs_stopwords(self) -> Set[str]:
        """Get CS-aware stopwords (exclude important technical terms)."""
        general_stopwords = {
            'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
            'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have',
            'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should'
        }
        # Don't remove technical terms that might be stopwords in general English
        return general_stopwords
    
    def process_query(self, query: str) -> Dict[str, Any]:
        """
        Process query to extract CS-specific information.
        
        Args:
            query: Raw user query
            
        Returns:
            Dictionary with processed query information
        """
        # Extract CS keywords
        cs_keywords = self.term_expander.extract_cs_keywords(query)
        
        # Expand query with synonyms
        expanded_query = self.term_expander.expand_query(query)
        
        # Classify query type
        query_type = self._classify_query_type(query)
        
        # Extract programming language if mentioned
        prog_lang = self._extract_programming_language(query)
        
        # Extract complexity mentions
        complexity = self._extract_complexity(query)
        
        return {
            'original_query': query,
            'expanded_query': expanded_query,
            'cs_keywords': cs_keywords,
            'query_type': query_type,
            'programming_language': prog_lang,
            'complexity': complexity,
            'processed_for_search': self._clean_for_search(expanded_query)
        }
    
    def _classify_query_type(self, query: str) -> str:
        """Classify the type of CS query."""
        query_lower = query.lower()
        
        implementation_indicators = [
            'implement', 'code', 'write', 'create', 'build', 'develop',
            'function', 'method', 'class', 'program'
        ]
        
        theory_indicators = [
            'what is', 'define', 'explain', 'concept', 'theory', 'algorithm',
            'complexity', 'analysis', 'proof', 'difference between'
        ]
        
        comparison_indicators = [
            'compare', 'vs', 'versus', 'difference', 'better', 'choose',
            'when to use', 'pros and cons'
        ]
        
        if any(indicator in query_lower for indicator in implementation_indicators):
            return 'implementation'
        elif any(indicator in query_lower for indicator in theory_indicators):
            return 'theory'
        elif any(indicator in query_lower for indicator in comparison_indicators):
            return 'comparison'
        else:
            return 'general'
    
    def _extract_programming_language(self, query: str) -> Optional[str]:
        """Extract programming language from query."""
        query_lower = query.lower()
        languages = {
            'python': ['python', 'py'],
            'java': ['java'],
            'javascript': ['javascript', 'js', 'node'],
            'cpp': ['c++', 'cpp', 'c plus plus'],
            'c': ['c language'],
            'rust': ['rust'],
            'go': ['golang', 'go'],
            'sql': ['sql'],
            'typescript': ['typescript', 'ts']
        }
        
        for lang, variants in languages.items():
            if any(variant in query_lower for variant in variants):
                return lang
        
        return None
    
    def _extract_complexity(self, query: str) -> Optional[str]:
        """Extract complexity notation from query."""
        complexity_pattern = r'O\([^)]+\)'
        matches = re.findall(complexity_pattern, query)
        return matches[0] if matches else None
    
    def _clean_for_search(self, query: str) -> str:
        """Clean query for search (remove stopwords, normalize)."""
        words = query.lower().split()
        cleaned_words = [word for word in words if word not in self.stopwords]
        return ' '.join(cleaned_words)


class CSRetriever:
    """Main CS-aware retriever service for RAG pipeline."""
    
    def __init__(
        self,
        faiss_manager: Optional[CSFAISSManager] = None,
        config_path: Optional[str] = None
    ):
        # Initialize FAISS manager
        if faiss_manager:
            self.faiss_manager = faiss_manager
        else:
            # Create a default FAISS manager
            try:
                self.faiss_manager = CSFAISSManager(
                    embedding_model="/home/ghost/engunity-ai/backend/models/production/cs_document_embeddings",
                    index_dir="./temp_indices",
                    metadata_dir="./temp_metadata"
                )
            except Exception as e:
                print(f"Warning: Could not create FAISS manager: {e}")
                self.faiss_manager = None
        
        # Load configuration
        self.config = get_cs_config()
        
        # Initialize components
        self.query_processor = CSQueryProcessor(self.config.vocabulary_config)
        
        # Ranking weights
        self.ranking_weights = {
            'similarity_score': 0.4,
            'chunk_type_score': 0.2,
            'source_quality_score': 0.2,
            'cs_relevance_score': 0.2
        }
        
        # Priority scores for different chunk types
        self.chunk_type_scores = {
            ChunkType.DOCUMENTATION: 1.0,
            ChunkType.THEORY: 0.9,
            ChunkType.CODE_WITH_DOCSTRING: 0.8,
            ChunkType.CODE: 0.7,
            ChunkType.EXAMPLE: 0.6,
            ChunkType.COMMENT: 0.5
        }
        
        # Priority scores for source quality
        self.source_quality_scores = {
            SourceQuality.TEXTBOOK: 1.0,
            SourceQuality.OFFICIAL_DOCS: 0.95,
            SourceQuality.ACADEMIC_PAPER: 0.9,
            SourceQuality.TUTORIAL: 0.7,
            SourceQuality.BLOG_POST: 0.6,
            SourceQuality.FORUM_POST: 0.4,
            SourceQuality.USER_GENERATED: 0.3
        }
        
        logger.info("Initialized CS Retriever")
    
    def retrieve_documents(
        self,
        query: str,
        top_k: int = 10,
        domain: Optional[str] = None,
        include_code: bool = True,
        include_theory: bool = True,
        min_score: float = 0.1
    ) -> List[RetrievedChunk]:
        """
        Retrieve relevant documents for a CS query.
        
        Args:
            query: User query string
            top_k: Number of results to return
            domain: Optional domain override
            include_code: Whether to include code results
            include_theory: Whether to include theory results
            min_score: Minimum similarity score threshold
            
        Returns:
            List of RetrievedChunk objects ranked by relevance
        """
        logger.info(f"Retrieving documents for query: {query[:100]}...")
        
        # Process query
        processed = self.query_processor.process_query(query)
        search_query = processed['processed_for_search']
        
        logger.info(f"Processed query: {search_query}")
        logger.info(f"CS keywords: {processed['cs_keywords']}")
        
        # Retrieve from FAISS
        search_results = self.faiss_manager.search(
            query=search_query,
            top_k=top_k * 3,  # Get more candidates for reranking
            domain=domain,
            score_threshold=min_score
        )
        
        # Convert to RetrievedChunk objects
        retrieved_chunks = []
        for result in search_results:
            chunk_type = self._determine_chunk_type(result)
            source_quality = self._determine_source_quality(result)
            
            # Filter by type if specified
            if not include_code and chunk_type in [ChunkType.CODE, ChunkType.CODE_WITH_DOCSTRING]:
                continue
            if not include_theory and chunk_type == ChunkType.THEORY:
                continue
            
            chunk = RetrievedChunk(
                id=result.doc_id,
                content=result.content,
                score=result.score,
                chunk_type=chunk_type,
                source_quality=source_quality,
                index_type=result.index_type,
                metadata=result.metadata,
                source_id=result.source_id
            )
            
            # Extract CS concepts from content
            chunk.cs_concepts = self._extract_cs_concepts(result.content)
            
            retrieved_chunks.append(chunk)
        
        # Rerank results using CS-specific criteria
        reranked_chunks = self._rerank_chunks(retrieved_chunks, processed)
        
        logger.info(f"Retrieved {len(reranked_chunks)} relevant chunks")
        
        return reranked_chunks[:top_k]
    
    def _determine_chunk_type(self, result: SearchResult) -> ChunkType:
        """Determine chunk type from search result."""
        content_lower = result.content.lower()
        chunk_type_from_metadata = result.metadata.get('chunk_type', '').lower()
        
        # Check metadata first
        if 'documentation' in chunk_type_from_metadata:
            return ChunkType.DOCUMENTATION
        elif 'theory' in chunk_type_from_metadata:
            return ChunkType.THEORY
        elif 'comment' in chunk_type_from_metadata:
            return ChunkType.COMMENT
        elif 'example' in chunk_type_from_metadata:
            return ChunkType.EXAMPLE
        
        # Analyze content
        has_code_markers = any(marker in content_lower for marker in 
                              ['def ', 'class ', 'function', '```', 'import ', '{', '}'])
        has_docstring = '"""' in result.content or "'''" in result.content
        
        if has_code_markers:
            if has_docstring:
                return ChunkType.CODE_WITH_DOCSTRING
            else:
                return ChunkType.CODE
        elif any(indicator in content_lower for indicator in 
                ['algorithm', 'complexity', 'theorem', 'proof', 'definition']):
            return ChunkType.THEORY
        else:
            return ChunkType.DOCUMENTATION
    
    def _determine_source_quality(self, result: SearchResult) -> SourceQuality:
        """Determine source quality from search result."""
        source_info = result.metadata.get('source_type', '').lower()
        source_url = result.metadata.get('source_url', '').lower()
        
        # Check metadata
        if 'textbook' in source_info:
            return SourceQuality.TEXTBOOK
        elif 'official' in source_info or 'docs' in source_info:
            return SourceQuality.OFFICIAL_DOCS
        elif 'paper' in source_info or 'academic' in source_info:
            return SourceQuality.ACADEMIC_PAPER
        elif 'tutorial' in source_info:
            return SourceQuality.TUTORIAL
        elif 'blog' in source_info:
            return SourceQuality.BLOG_POST
        elif 'forum' in source_info or 'stackoverflow' in source_url:
            return SourceQuality.FORUM_POST
        else:
            return SourceQuality.USER_GENERATED
    
    def _extract_cs_concepts(self, content: str) -> List[str]:
        """Extract CS concepts mentioned in content."""
        concepts = []
        content_lower = content.lower()
        
        # Check against vocabulary
        all_keywords = (
            self.config.vocabulary_config.programming_keywords +
            self.config.vocabulary_config.systems_keywords +
            self.config.vocabulary_config.ai_ml_keywords +
            self.config.vocabulary_config.theory_keywords
        )
        
        for keyword in all_keywords:
            if keyword.lower() in content_lower:
                concepts.append(keyword)
        
        return list(set(concepts))
    
    def _rerank_chunks(
        self,
        chunks: List[RetrievedChunk],
        processed_query: Dict[str, Any]
    ) -> List[RetrievedChunk]:
        """
        Rerank chunks using CS-specific criteria.
        
        Args:
            chunks: List of retrieved chunks
            processed_query: Processed query information
            
        Returns:
            Reranked list of chunks
        """
        query_keywords = set(processed_query['cs_keywords'])
        query_type = processed_query['query_type']
        query_lang = processed_query['programming_language']
        
        for chunk in chunks:
            # Calculate CS relevance score
            cs_relevance = self._calculate_cs_relevance(chunk, query_keywords, query_type, query_lang)
            
            # Calculate final score
            final_score = (
                self.ranking_weights['similarity_score'] * chunk.score +
                self.ranking_weights['chunk_type_score'] * self.chunk_type_scores.get(chunk.chunk_type, 0.5) +
                self.ranking_weights['source_quality_score'] * self.source_quality_scores.get(chunk.source_quality, 0.5) +
                self.ranking_weights['cs_relevance_score'] * cs_relevance
            )
            
            chunk.score = final_score
        
        # Sort by final score
        chunks.sort(key=lambda x: x.score, reverse=True)
        return chunks
    
    def _calculate_cs_relevance(
        self,
        chunk: RetrievedChunk,
        query_keywords: Set[str],
        query_type: str,
        query_lang: Optional[str]
    ) -> float:
        """Calculate CS-specific relevance score."""
        relevance = 0.0
        
        # Keyword overlap bonus
        chunk_concepts = set(chunk.cs_concepts)
        keyword_overlap = len(query_keywords & chunk_concepts)
        if query_keywords:
            relevance += 0.4 * (keyword_overlap / len(query_keywords))
        
        # Query type matching bonus
        if query_type == 'implementation' and chunk.contains_code:
            relevance += 0.3
        elif query_type == 'theory' and chunk.chunk_type == ChunkType.THEORY:
            relevance += 0.3
        elif query_type == 'comparison' and chunk.chunk_type == ChunkType.DOCUMENTATION:
            relevance += 0.2
        
        # Programming language matching bonus
        if query_lang and chunk.programming_language == query_lang:
            relevance += 0.2
        
        # Complexity mention bonus
        if chunk.complexity_mentioned and 'complexity' in ' '.join(query_keywords):
            relevance += 0.1
        
        return min(relevance, 1.0)  # Cap at 1.0
    
    def build_context(
        self,
        chunks: List[RetrievedChunk],
        max_length: int = 4000,
        include_metadata: bool = True
    ) -> str:
        """
        Build context string for the language model.
        
        Args:
            chunks: Retrieved chunks to include
            max_length: Maximum context length
            include_metadata: Whether to include chunk metadata
            
        Returns:
            Formatted context string
        """
        context_parts = []
        current_length = 0
        
        for i, chunk in enumerate(chunks):
            # Prepare chunk content
            if chunk.contains_code:
                content = f"```{chunk.programming_language or ''}\n{chunk.content}\n```"
            else:
                content = chunk.content
            
            # Add metadata if requested
            if include_metadata:
                metadata_info = []
                if chunk.chunk_type:
                    metadata_info.append(f"Type: {chunk.chunk_type.value}")
                if chunk.programming_language:
                    metadata_info.append(f"Language: {chunk.programming_language}")
                if chunk.complexity_mentioned:
                    metadata_info.append(f"Complexity: {chunk.complexity_mentioned}")
                
                if metadata_info:
                    content = f"[{', '.join(metadata_info)}]\n{content}"
            
            # Check length constraint
            chunk_text = f"\n--- Source {i+1} ---\n{content}\n"
            
            if current_length + len(chunk_text) > max_length:
                break
            
            context_parts.append(chunk_text)
            current_length += len(chunk_text)
        
        context = "".join(context_parts)
        
        if context:
            context = f"Relevant documentation and code:\n{context}\n---\n"
        
        return context
    
    def evaluate_retrieval(
        self,
        test_queries: List[Dict[str, Any]],
        k_values: List[int] = [1, 3, 5, 10]
    ) -> Dict[str, float]:
        """
        Evaluate retrieval performance on test queries.
        
        Args:
            test_queries: List of test queries with expected results
            k_values: List of k values for recall@k evaluation
            
        Returns:
            Dictionary of evaluation metrics
        """
        metrics = defaultdict(list)
        
        for query_data in test_queries:
            query = query_data['query']
            expected_docs = set(query_data.get('relevant_docs', []))
            
            if not expected_docs:
                continue
            
            # Retrieve documents
            retrieved = self.retrieve_documents(query, top_k=max(k_values))
            retrieved_ids = [chunk.id for chunk in retrieved]
            
            # Calculate recall@k for each k
            for k in k_values:
                retrieved_k = set(retrieved_ids[:k])
                recall = len(retrieved_k & expected_docs) / len(expected_docs)
                metrics[f'recall@{k}'].append(recall)
        
        # Average metrics
        avg_metrics = {}
        for metric, values in metrics.items():
            avg_metrics[metric] = np.mean(values) if values else 0.0
        
        logger.info(f"Retrieval evaluation results: {avg_metrics}")
        return avg_metrics


# Factory function
def create_cs_retriever(
    faiss_manager: Optional[CSFAISSManager] = None,
    config_path: Optional[str] = None
) -> CSRetriever:
    """
    Create a CS retriever with configuration.
    
    Args:
        faiss_manager: Optional FAISS manager instance
        config_path: Optional path to configuration file
        
    Returns:
        Configured CSRetriever instance
    """
    return CSRetriever(faiss_manager=faiss_manager, config_path=config_path)


# Export main classes
__all__ = [
    "CSRetriever",
    "RetrievedChunk",
    "ChunkType", 
    "SourceQuality",
    "CSQueryProcessor",
    "CSTermExpander",
    "create_cs_retriever"
]