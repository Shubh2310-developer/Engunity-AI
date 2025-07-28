"""
CS-Aware Query Processing Service

Intelligent query processor that detects CS query types, expands technical terms,
and routes queries to optimal retrieval strategies for the RAG pipeline.

File: backend/app/services/rag/cs_query_processor.py
"""

import re
import json
import logging
from typing import Dict, List, Optional, Literal, Set, Tuple, Any
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
import string
from collections import Counter

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..', '..'))

try:
    from app.models.cs_embedding_config import CSVocabularyConfig, get_cs_config
except ImportError:
    # Fallback config
    from dataclasses import dataclass
    
    @dataclass
    class CSVocabularyConfig:
        include_code_tokens: bool = True
        include_math_symbols: bool = True
        max_vocab_size: int = 50000
        
    def get_cs_config():
        return CSVocabularyConfig()

logger = logging.getLogger(__name__)


class QueryType(str, Enum):
    """Types of CS queries for routing decisions."""
    CODE = "code"
    THEORY = "theory"
    MIXED = "mixed"
    COMPARISON = "comparison"
    TUTORIAL = "tutorial"
    DEBUGGING = "debugging"


class QueryIntent(str, Enum):
    """User intent behind the query."""
    IMPLEMENTATION = "implementation"      # How to implement/code something
    EXPLANATION = "explanation"            # What is/how does something work
    COMPARISON = "comparison"              # Difference between A and B
    OPTIMIZATION = "optimization"          # How to improve/optimize
    DEBUGGING = "debugging"                # Fix/troubleshoot issue
    LEARNING = "learning"                  # Learn/understand concept
    BEST_PRACTICES = "best_practices"      # Best way to do something


@dataclass
class ProcessedQuery:
    """Result of query processing with all extracted information."""
    original_query: str
    normalized_query: str
    expanded_query: str
    clean_query: str
    
    # Classification results
    query_type: QueryType
    query_intent: QueryIntent
    confidence_score: float
    
    # Technical information
    programming_languages: List[str] = field(default_factory=list)
    cs_concepts: List[str] = field(default_factory=list)
    algorithms_mentioned: List[str] = field(default_factory=list)
    data_structures: List[str] = field(default_factory=list)
    complexity_terms: List[str] = field(default_factory=list)
    
    # Routing information
    target_indexes: List[str] = field(default_factory=list)
    search_weights: Dict[str, float] = field(default_factory=dict)
    
    # Processing metadata
    processing_steps: List[str] = field(default_factory=list)
    detected_patterns: List[str] = field(default_factory=list)
    expansion_applied: bool = False


class CSTermsDatabase:
    """Database of CS terms, abbreviations, and synonyms."""
    
    def __init__(self):
        self.abbreviations = self._build_abbreviations()
        self.synonyms = self._build_synonyms()
        self.programming_terms = self._build_programming_terms()
        self.algorithm_names = self._build_algorithm_names()
        self.data_structure_names = self._build_data_structure_names()
        self.complexity_patterns = self._build_complexity_patterns()
    
    def _build_abbreviations(self) -> Dict[str, str]:
        """Build comprehensive abbreviation dictionary."""
        return {
            # Algorithms & Data Structures
            "DFS": "depth-first search",
            "BFS": "breadth-first search", 
            "BST": "binary search tree",
            "AVL": "adelson-velsky landis tree",
            "RBT": "red-black tree",
            "MST": "minimum spanning tree",
            "DP": "dynamic programming",
            "LCS": "longest common subsequence",
            "LIS": "longest increasing subsequence",
            "KMP": "knuth-morris-pratt",
            "BIT": "binary indexed tree",
            "DSU": "disjoint set union",
            "LCA": "lowest common ancestor",
            
            # Programming Paradigms
            "OOP": "object-oriented programming",
            "FP": "functional programming",
            "POP": "procedural programming",
            "AOP": "aspect-oriented programming",
            "TDD": "test-driven development",
            "BDD": "behavior-driven development",
            "DDD": "domain-driven design",
            "MVC": "model-view-controller",
            "MVP": "model-view-presenter",
            "MVVM": "model-view-viewmodel",
            
            # System & Architecture
            "OS": "operating system",
            "DBMS": "database management system",
            "RDBMS": "relational database management system",
            "API": "application programming interface",
            "REST": "representational state transfer",
            "SOAP": "simple object access protocol",
            "GraphQL": "graph query language",
            "HTTP": "hypertext transfer protocol",
            "HTTPS": "hypertext transfer protocol secure",
            "TCP": "transmission control protocol",
            "UDP": "user datagram protocol",
            "DNS": "domain name system",
            "CDN": "content delivery network",
            
            # Data Formats & Protocols
            "JSON": "javascript object notation",
            "XML": "extensible markup language",
            "CSV": "comma-separated values",
            "YAML": "yaml ain't markup language",
            "HTML": "hypertext markup language",
            "CSS": "cascading style sheets",
            "SQL": "structured query language",
            "NoSQL": "not only structured query language",
            
            # AI & Machine Learning
            "AI": "artificial intelligence",
            "ML": "machine learning",
            "DL": "deep learning",
            "NLP": "natural language processing",
            "CV": "computer vision",
            "CNN": "convolutional neural network",
            "RNN": "recurrent neural network",
            "LSTM": "long short-term memory",
            "GRU": "gated recurrent unit",
            "GAN": "generative adversarial network",
            "RL": "reinforcement learning",
            "SVM": "support vector machine",
            "KNN": "k-nearest neighbors",
            "PCA": "principal component analysis",
            "SGD": "stochastic gradient descent",
            
            # Software Engineering
            "SOLID": "single responsibility open-closed liskov substitution interface segregation dependency inversion",
            "DRY": "don't repeat yourself",
            "KISS": "keep it simple stupid",
            "YAGNI": "you aren't gonna need it",
            "CI": "continuous integration",
            "CD": "continuous deployment",
            "DevOps": "development operations",
            "SRE": "site reliability engineering",
            "QA": "quality assurance",
            "UI": "user interface",
            "UX": "user experience",
            "SPA": "single page application",
            "PWA": "progressive web application",
            
            # Computer Architecture
            "CPU": "central processing unit",
            "GPU": "graphics processing unit",
            "RAM": "random access memory",
            "ROM": "read-only memory",
            "SSD": "solid-state drive",
            "HDD": "hard disk drive",
            "RAID": "redundant array of independent disks",
            "BIOS": "basic input/output system",
            "UEFI": "unified extensible firmware interface",
            
            # Security
            "SSL": "secure sockets layer",
            "TLS": "transport layer security",
            "PKI": "public key infrastructure",
            "RSA": "rivest-shamir-adleman",
            "AES": "advanced encryption standard",
            "MD5": "message digest algorithm 5",
            "SHA": "secure hash algorithm",
            "JWT": "json web token",
            "OAuth": "open authorization",
            "2FA": "two-factor authentication",
            "MFA": "multi-factor authentication"
        }
    
    def _build_synonyms(self) -> Dict[str, List[str]]:
        """Build synonym mappings for CS terms."""
        return {
            "array": ["list", "vector", "sequence"],
            "function": ["method", "procedure", "routine", "subroutine"],
            "variable": ["identifier", "symbol", "name"],
            "loop": ["iteration", "cycle", "repeat"],
            "condition": ["conditional", "if statement", "branch"],
            "class": ["object", "type", "entity"],
            "inheritance": ["extends", "derives from", "subclass"],
            "polymorphism": ["overriding", "method overriding"],
            "encapsulation": ["data hiding", "information hiding"],
            "abstraction": ["interface", "abstract class"],
            "recursion": ["recursive call", "self-reference"],
            "iteration": ["loop", "iterative approach"],
            "stack": ["LIFO", "last in first out"],
            "queue": ["FIFO", "first in first out"],
            "tree": ["hierarchical structure", "branching structure"],
            "graph": ["network", "nodes and edges", "vertices and edges"],
            "hash table": ["hash map", "dictionary", "associative array"],
            "linked list": ["pointer-based list", "dynamic list"],
            "binary search": ["logarithmic search", "divide and conquer search"],
            "linear search": ["sequential search", "brute force search"],
            "sorting": ["ordering", "arranging", "sequencing"],
            "searching": ["finding", "looking up", "retrieving"],
            "complexity": ["time complexity", "space complexity", "computational complexity"],
            "big o": ["asymptotic notation", "growth rate", "order of growth"],
            "algorithm": ["procedure", "method", "approach", "technique"],
            "optimization": ["efficiency improvement", "performance tuning"],
            "debugging": ["troubleshooting", "error fixing", "bug hunting"],
            "testing": ["validation", "verification", "quality assurance"],
            "documentation": ["docs", "manual", "guide", "reference"],
            "framework": ["library", "toolkit", "platform"],
            "database": ["data store", "repository", "persistence layer"],
            "server": ["backend", "host", "service provider"],
            "client": ["frontend", "user interface", "consumer"],
            "protocol": ["communication standard", "messaging format"],
            "architecture": ["design pattern", "system structure", "blueprint"]
        }
    
    def _build_programming_terms(self) -> Set[str]:
        """Build set of programming-specific terms."""
        return {
            "def", "function", "class", "import", "return", "if", "else", "elif",
            "for", "while", "try", "except", "finally", "with", "as", "lambda",
            "yield", "async", "await", "global", "nonlocal", "assert", "pass",
            "break", "continue", "del", "raise", "from", "in", "is", "not",
            "and", "or", "true", "false", "none", "null", "undefined",
            "var", "let", "const", "public", "private", "protected", "static",
            "abstract", "interface", "extends", "implements", "super", "this",
            "new", "delete", "sizeof", "typedef", "struct", "union", "enum",
            "template", "namespace", "using", "virtual", "override", "final"
        }
    
    def _build_algorithm_names(self) -> Set[str]:
        """Build set of well-known algorithm names."""
        return {
            # Sorting algorithms
            "quicksort", "mergesort", "heapsort", "bubble sort", "insertion sort",
            "selection sort", "radix sort", "counting sort", "bucket sort",
            "timsort", "introsort",
            
            # Search algorithms
            "binary search", "linear search", "depth-first search", "breadth-first search",
            "dijkstra", "bellman-ford", "floyd-warshall", "a-star", "best-first search",
            
            # Graph algorithms
            "kruskal", "prim", "topological sort", "strongly connected components",
            "tarjan", "kosaraju", "ford-fulkerson", "max flow min cut",
            
            # Dynamic programming
            "longest common subsequence", "longest increasing subsequence",
            "knapsack", "edit distance", "fibonacci", "coin change",
            
            # String algorithms
            "knuth-morris-pratt", "rabin-karp", "boyer-moore", "aho-corasick",
            "suffix array", "suffix tree", "trie", "patricia trie",
            
            # Numerical algorithms
            "euclidean algorithm", "sieve of eratosthenes", "fast fourier transform",
            "matrix multiplication", "gaussian elimination"
        }
    
    def _build_data_structure_names(self) -> Set[str]:
        """Build set of data structure names."""
        return {
            "array", "list", "vector", "stack", "queue", "deque", "priority queue",
            "heap", "binary heap", "fibonacci heap", "tree", "binary tree",
            "binary search tree", "avl tree", "red-black tree", "b-tree", "b+ tree",
            "trie", "suffix tree", "segment tree", "fenwick tree", "binary indexed tree",
            "graph", "directed graph", "undirected graph", "weighted graph",
            "hash table", "hash map", "dictionary", "set", "multiset",
            "linked list", "doubly linked list", "singly linked list",
            "circular buffer", "ring buffer", "bloom filter", "disjoint set",
            "union find", "sparse table", "rope", "treap"
        }
    
    def _build_complexity_patterns(self) -> List[str]:
        """Build regex patterns for complexity notation."""
        return [
            r'O\([^)]+\)',  # Big O notation
            r'Ω\([^)]+\)',  # Omega notation
            r'Θ\([^)]+\)',  # Theta notation
            r'o\([^)]+\)',  # Little o notation
            r'ω\([^)]+\)',  # Little omega notation
            r'\b(?:constant|linear|quadratic|cubic|logarithmic|exponential|factorial)\s+(?:time|space)\b',
            r'\b(?:polynomial|sub-linear|super-linear|sub-exponential)\b'
        ]


class QueryClassifier:
    """Classifies queries into types and intents using pattern matching."""
    
    def __init__(self, cs_terms: CSTermsDatabase):
        self.cs_terms = cs_terms
        self._build_classification_patterns()
    
    def _build_classification_patterns(self):
        """Build regex patterns for query classification."""
        # Code-oriented patterns
        self.code_patterns = [
            r'\b(?:implement|code|write|create|build|develop|program)\b',
            r'\b(?:function|method|class|module|script|program)\b',
            r'\b(?:syntax|programming|coding|development)\b',
            r'\b(?:python|java|javascript|cpp|c\+\+|rust|go|kotlin|swift)\s+(?:code|implementation|example)\b',
            r'```|`[^`]+`',  # Code blocks
            r'\b(?:def|class|import|return|for|while|if|else)\b',
            r'\bhow\s+to\s+(?:implement|code|write|create|build)\b',
            r'\b(?:show|give)\s+(?:me\s+)?(?:code|implementation|example)\b'
        ]
        
        # Theory-oriented patterns
        self.theory_patterns = [
            r'\b(?:what\s+is|define|explain|describe|concept|theory|definition)\b',
            r'\b(?:complexity|analysis|proof|mathematical|theorem)\b',
            r'\b(?:time\s+complexity|space\s+complexity|big\s+o|asymptotic)\b',
            r'\b(?:algorithm|data\s+structure)\s+(?:definition|explanation|concept)\b',
            r'\b(?:how\s+does|how\s+works?|mechanism|principle)\b',
            r'\b(?:advantage|disadvantage|benefit|drawback|limitation)\b',
            r'\b(?:understand|learn|study|grasp|comprehend)\b'
        ]
        
        # Comparison patterns
        self.comparison_patterns = [
            r'\b(?:difference|compare|contrast|vs|versus)\b',
            r'\b(?:which\s+is\s+better|pros\s+and\s+cons|trade-?off)\b',
            r'\b(?:when\s+to\s+use|choose\s+between|decide\s+between)\b',
            r'\b(?:similar|different|alike|distinction)\b'
        ]
        
        # Tutorial patterns
        self.tutorial_patterns = [
            r'\b(?:tutorial|guide|walkthrough|step\s+by\s+step)\b',
            r'\b(?:how\s+to\s+learn|getting\s+started|introduction\s+to)\b',
            r'\b(?:beginner|basic|fundamental|elementary)\b',
            r'\b(?:example|demonstration|illustration|sample)\b'
        ]
        
        # Debugging patterns
        self.debugging_patterns = [
            r'\b(?:debug|fix|solve|error|problem|issue|bug)\b',
            r'\b(?:not\s+working|doesn\'t\s+work|broken|failed)\b',
            r'\b(?:troubleshoot|diagnose|resolve|correct)\b',
            r'\b(?:exception|crash|fault|failure)\b'
        ]
        
        # Optimization patterns
        self.optimization_patterns = [
            r'\b(?:optimize|improve|enhance|speed\s+up|performance)\b',
            r'\b(?:efficient|faster|better|optimal)\b',
            r'\b(?:memory\s+usage|space\s+efficient|time\s+efficient)\b',
            r'\b(?:bottleneck|slow|inefficient)\b'
        ]
    
    def classify_query_type(self, query: str) -> Tuple[QueryType, float]:
        """
        Classify query type with confidence score.
        
        Args:
            query: Input query string
            
        Returns:
            Tuple of (QueryType, confidence_score)
        """
        query_lower = query.lower()
        
        # Count pattern matches
        code_score = self._count_pattern_matches(query_lower, self.code_patterns)
        theory_score = self._count_pattern_matches(query_lower, self.theory_patterns)
        comparison_score = self._count_pattern_matches(query_lower, self.comparison_patterns)
        tutorial_score = self._count_pattern_matches(query_lower, self.tutorial_patterns)
        debugging_score = self._count_pattern_matches(query_lower, self.debugging_patterns)
        
        # Check for programming terms
        prog_terms = sum(1 for term in self.cs_terms.programming_terms 
                        if term in query_lower)
        
        # Adjust scores based on context
        if prog_terms > 0:
            code_score += prog_terms * 0.5
        
        # Check for algorithm/data structure mentions
        algo_mentions = sum(1 for algo in self.cs_terms.algorithm_names
                           if algo in query_lower)
        ds_mentions = sum(1 for ds in self.cs_terms.data_structure_names
                         if ds in query_lower)
        
        if algo_mentions > 0 or ds_mentions > 0:
            theory_score += (algo_mentions + ds_mentions) * 0.3
        
        # Determine primary type
        scores = {
            QueryType.CODE: code_score,
            QueryType.THEORY: theory_score,
            QueryType.COMPARISON: comparison_score,
            QueryType.TUTORIAL: tutorial_score,
            QueryType.DEBUGGING: debugging_score
        }
        
        # Find maximum score
        max_type = max(scores, key=scores.get)
        max_score = scores[max_type]
        
        # Check for mixed queries
        sorted_scores = sorted(scores.values(), reverse=True)
        if len(sorted_scores) >= 2 and sorted_scores[1] >= sorted_scores[0] * 0.7:
            max_type = QueryType.MIXED
        
        # Calculate confidence (normalize by query length)
        confidence = min(max_score / len(query.split()), 1.0)
        
        return max_type, confidence
    
    def classify_query_intent(self, query: str, query_type: QueryType) -> QueryIntent:
        """
        Classify user intent based on query and type.
        
        Args:
            query: Input query string
            query_type: Determined query type
            
        Returns:
            QueryIntent enum
        """
        query_lower = query.lower()
        
        # Intent patterns
        implementation_indicators = ["implement", "code", "write", "create", "build", "develop"]
        explanation_indicators = ["what is", "explain", "how does", "describe", "definition"]
        comparison_indicators = ["difference", "compare", "vs", "versus", "which is better"]
        optimization_indicators = ["optimize", "improve", "faster", "efficient", "performance"]
        debugging_indicators = ["debug", "fix", "error", "problem", "not working"]
        learning_indicators = ["learn", "understand", "tutorial", "guide", "beginner"]
        best_practice_indicators = ["best practice", "recommended", "should", "proper way"]
        
        # Count indicators
        intent_scores = {
            QueryIntent.IMPLEMENTATION: sum(1 for ind in implementation_indicators if ind in query_lower),
            QueryIntent.EXPLANATION: sum(1 for ind in explanation_indicators if ind in query_lower),
            QueryIntent.COMPARISON: sum(1 for ind in comparison_indicators if ind in query_lower),
            QueryIntent.OPTIMIZATION: sum(1 for ind in optimization_indicators if ind in query_lower),
            QueryIntent.DEBUGGING: sum(1 for ind in debugging_indicators if ind in query_lower),
            QueryIntent.LEARNING: sum(1 for ind in learning_indicators if ind in query_lower),
            QueryIntent.BEST_PRACTICES: sum(1 for ind in best_practice_indicators if ind in query_lower)
        }
        
        # Bias based on query type
        if query_type == QueryType.CODE:
            intent_scores[QueryIntent.IMPLEMENTATION] += 1
        elif query_type == QueryType.THEORY:
            intent_scores[QueryIntent.EXPLANATION] += 1
        elif query_type == QueryType.COMPARISON:
            intent_scores[QueryIntent.COMPARISON] += 1
        elif query_type == QueryType.DEBUGGING:
            intent_scores[QueryIntent.DEBUGGING] += 1
        elif query_type == QueryType.TUTORIAL:
            intent_scores[QueryIntent.LEARNING] += 1
        
        # Return intent with highest score
        return max(intent_scores, key=intent_scores.get)
    
    def _count_pattern_matches(self, text: str, patterns: List[str]) -> int:
        """Count total pattern matches in text."""
        count = 0
        for pattern in patterns:
            matches = re.findall(pattern, text)
            count += len(matches)
        return count


class CSQueryProcessor:
    """Main CS-aware query processor service."""
    
    def __init__(self, config_path: Optional[str] = None):
        # Load configuration
        self.config = get_cs_config()
        
        # Initialize components
        self.cs_terms = CSTermsDatabase()
        self.classifier = QueryClassifier(self.cs_terms)
        
        # Processing settings
        self.enable_expansion = True
        self.enable_normalization = True
        self.log_processing_steps = True
        
        logger.info("Initialized CS Query Processor")
    
    def process_query(self, query: str) -> ProcessedQuery:
        """
        Main entry point for processing CS queries.
        
        Args:
            query: Raw user query string
            
        Returns:
            ProcessedQuery object with all processing results
        """
        logger.info(f"Processing query: {query[:100]}...")
        
        # Initialize result
        result = ProcessedQuery(
            original_query=query,
            normalized_query="",
            expanded_query="",
            clean_query=""
        )
        
        # Step 1: Normalize query
        result.normalized_query = self.normalize_query(query)
        result.processing_steps.append("normalization")
        
        # Step 2: Expand abbreviations and terms
        result.expanded_query = self.expand_abbreviations(result.normalized_query)
        result.expansion_applied = result.expanded_query != result.normalized_query
        result.processing_steps.append("expansion")
        
        # Step 3: Clean query for search
        result.clean_query = self.clean_query_for_search(result.expanded_query)
        result.processing_steps.append("cleaning")
        
        # Step 4: Classify query type and intent
        result.query_type, result.confidence_score = self.classifier.classify_query_type(query)
        result.query_intent = self.classifier.classify_query_intent(query, result.query_type)
        result.processing_steps.append("classification")
        
        # Step 5: Extract technical information
        self._extract_technical_info(result)
        result.processing_steps.append("technical_extraction")
        
        # Step 6: Determine routing strategy
        self._determine_routing_strategy(result)
        result.processing_steps.append("routing")
        
        logger.info(f"Query processed: type={result.query_type}, intent={result.query_intent}, "
                   f"confidence={result.confidence_score:.2f}")
        
        return result
    
    def normalize_query(self, query: str) -> str:
        """
        Normalize query with basic cleaning.
        
        Args:
            query: Raw query string
            
        Returns:
            Normalized query string
        """
        if not self.enable_normalization:
            return query
        
        # Remove excessive whitespace
        normalized = re.sub(r'\s+', ' ', query.strip())
        
        # Remove markdown code markers but preserve content
        normalized = re.sub(r'```[\w]*\n?', '', normalized)
        normalized = re.sub(r'`([^`]+)`', r'\1', normalized)
        
        # Clean up punctuation (keep essential ones)
        normalized = re.sub(r'[^\w\s\-\+\(\)\?\.\,\:]', ' ', normalized)
        
        # Remove excessive punctuation
        normalized = re.sub(r'\.{2,}', '.', normalized)
        normalized = re.sub(r'\?{2,}', '?', normalized)
        
        return normalized.strip()
    
    def expand_abbreviations(self, query: str) -> str:
        """
        Expand CS-specific abbreviations and acronyms.
        
        Args:
            query: Query string to expand
            
        Returns:
            Query with expanded abbreviations
        """
        if not self.enable_expansion:
            return query
        
        expanded = query
        expansions_made = []
        
        # Expand abbreviations (case-insensitive but preserve original case)
        for abbrev, full_form in self.cs_terms.abbreviations.items():
            # Create case-insensitive pattern that matches whole words
            pattern = r'\b' + re.escape(abbrev) + r'\b'
            
            def replace_func(match):
                # Preserve case of original
                original = match.group(0)
                if original.isupper():
                    return full_form.upper()
                elif original.islower():
                    return full_form.lower()
                elif original.istitle():
                    return full_form.title()
                else:
                    return full_form
            
            new_expanded = re.sub(pattern, replace_func, expanded, flags=re.IGNORECASE)
            if new_expanded != expanded:
                expansions_made.append(f"{abbrev} -> {full_form}")
                expanded = new_expanded
        
        # Add synonym expansions for better retrieval
        for term, synonyms in self.cs_terms.synonyms.items():
            if term.lower() in expanded.lower():
                # Add main synonyms (limit to avoid query explosion)
                main_synonyms = synonyms[:2]  # Take top 2 synonyms
                expanded += " " + " ".join(main_synonyms)
        
        if expansions_made and self.log_processing_steps:
            logger.debug(f"Expansions applied: {', '.join(expansions_made)}")
        
        return expanded.strip()
    
    def clean_query_for_search(self, query: str) -> str:
        """
        Clean query for optimal search performance.
        
        Args:
            query: Query string to clean
            
        Returns:
            Cleaned query optimized for search
        """
        # Remove common stopwords but keep CS-important terms
        cs_important_stopwords = {
            'how', 'what', 'when', 'where', 'why', 'which', 'who',
            'can', 'should', 'would', 'could', 'does', 'is', 'are'
        }
        
        stopwords = {
            'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
            'of', 'with', 'by', 'from', 'up', 'about', 'into', 'through', 'during',
            'before', 'after', 'above', 'below', 'between', 'among', 'throughout',
            'despite', 'towards', 'upon', 'concerning', 'under', 'within'
        } - cs_important_stopwords
        
        words = query.lower().split()
        cleaned_words = [word for word in words if word not in stopwords and len(word) > 1]
        
        return ' '.join(cleaned_words)
    
    def _extract_technical_info(self, result: ProcessedQuery) -> None:
        """Extract technical information from the query."""
        query_lower = result.expanded_query.lower()
        
        # Extract programming languages
        lang_patterns = {
            'python': r'\b(?:python|py)\b',
            'java': r'\bjava\b(?!\s*script)',
            'javascript': r'\b(?:javascript|js|node\.?js)\b',
            'typescript': r'\b(?:typescript|ts)\b',
            'cpp': r'\b(?:c\+\+|cpp|cxx)\b',
            'c': r'\bc\b(?!\+)',
            'rust': r'\brust\b',
            'go': r'\b(?:golang|go)\b',
            'sql': r'\bsql\b',
            'kotlin': r'\bkotlin\b',
            'swift': r'\bswift\b',
            'php': r'\bphp\b',
            'ruby': r'\bruby\b',
            'scala': r'\bscala\b',
            'r': r'\br\b(?:\s+language)?',
            'matlab': r'\bmatlab\b'
        }
        
        for lang, pattern in lang_patterns.items():
            if re.search(pattern, query_lower):
                result.programming_languages.append(lang)
        
        # Extract algorithm mentions
        for algo in self.cs_terms.algorithm_names:
            if algo.lower() in query_lower:
                result.algorithms_mentioned.append(algo)
        
        # Extract data structure mentions
        for ds in self.cs_terms.data_structure_names:
            if ds.lower() in query_lower:
                result.data_structures.append(ds)
        
        # Extract complexity terms
        for pattern in self.cs_terms.complexity_patterns:
            matches = re.findall(pattern, result.expanded_query)
            result.complexity_terms.extend(matches)
        
        # Extract general CS concepts
        all_cs_terms = (
            list(self.cs_terms.algorithm_names) +
            list(self.cs_terms.data_structure_names) +
            list(self.cs_terms.abbreviations.keys()) +
            list(self.cs_terms.synonyms.keys())
        )
        
        for term in all_cs_terms:
            if term.lower() in query_lower:
                result.cs_concepts.append(term)
        
        # Remove duplicates
        result.programming_languages = list(set(result.programming_languages))
        result.algorithms_mentioned = list(set(result.algorithms_mentioned))
        result.data_structures = list(set(result.data_structures))
        result.complexity_terms = list(set(result.complexity_terms))
        result.cs_concepts = list(set(result.cs_concepts))
    
    def _determine_routing_strategy(self, result: ProcessedQuery) -> None:
        """Determine optimal routing strategy based on query analysis."""
        # Default weights
        weights = {"code": 0.0, "theory": 0.0, "fusion": 0.0}
        
        # Base routing on query type
        if result.query_type == QueryType.CODE:
            weights["code"] = 0.8
            weights["theory"] = 0.2
            result.target_indexes = ["code", "theory"]
        elif result.query_type == QueryType.THEORY:
            weights["theory"] = 0.8
            weights["code"] = 0.2
            result.target_indexes = ["theory", "code"]
        elif result.query_type == QueryType.MIXED:
            weights["fusion"] = 0.5
            weights["code"] = 0.3
            weights["theory"] = 0.2
            result.target_indexes = ["fusion", "code", "theory"]
        elif result.query_type == QueryType.COMPARISON:
            weights["theory"] = 0.6
            weights["code"] = 0.4
            result.target_indexes = ["theory", "code"]
        elif result.query_type == QueryType.TUTORIAL:
            weights["theory"] = 0.5
            weights["code"] = 0.5
            result.target_indexes = ["theory", "code"]
        elif result.query_type == QueryType.DEBUGGING:
            weights["code"] = 0.7
            weights["theory"] = 0.3
            result.target_indexes = ["code", "theory"]
        else:
            # Default to searching all indexes
            weights["code"] = 0.4
            weights["theory"] = 0.4
            weights["fusion"] = 0.2
            result.target_indexes = ["code", "theory", "fusion"]
        
        # Adjust weights based on extracted information
        if result.programming_languages:
            weights["code"] += 0.2
            weights["theory"] = max(0.1, weights["theory"] - 0.1)
        
        if result.algorithms_mentioned or result.data_structures:
            weights["theory"] += 0.1
        
        if result.complexity_terms:
            weights["theory"] += 0.15
        
        # Normalize weights
        total_weight = sum(weights.values())
        if total_weight > 0:
            weights = {k: v / total_weight for k, v in weights.items()}
        
        result.search_weights = weights
    
    def detect_query_type(self, query: str) -> Literal["code", "theory", "mixed"]:
        """
        Simple interface for query type detection.
        
        Args:
            query: Input query string
            
        Returns:
            Query type as string literal
        """
        query_type, _ = self.classifier.classify_query_type(query)
        
        if query_type in [QueryType.CODE, QueryType.DEBUGGING]:
            return "code"
        elif query_type in [QueryType.THEORY, QueryType.TUTORIAL]:
            return "theory"
        else:
            return "mixed"
    
    def route_query(self, query: str) -> Dict[str, Any]:
        """
        Route query and return routing information.
        
        Args:
            query: Input query string
            
        Returns:
            Dictionary with routing information
        """
        processed = self.process_query(query)
        
        return {
            "processed_query": processed.clean_query,
            "expanded_query": processed.expanded_query,
            "query_type": processed.query_type.value,
            "query_intent": processed.query_intent.value,
            "target_indexes": processed.target_indexes,
            "search_weights": processed.search_weights,
            "confidence": processed.confidence_score,
            "programming_languages": processed.programming_languages,
            "cs_concepts": processed.cs_concepts,
            "algorithms": processed.algorithms_mentioned,
            "data_structures": processed.data_structures,
            "complexity_terms": processed.complexity_terms
        }
    
    def batch_process_queries(self, queries: List[str]) -> List[ProcessedQuery]:
        """
        Process multiple queries in batch.
        
        Args:
            queries: List of query strings
            
        Returns:
            List of ProcessedQuery objects
        """
        results = []
        for query in queries:
            try:
                result = self.process_query(query)
                results.append(result)
            except Exception as e:
                logger.error(f"Error processing query '{query}': {e}")
                # Create minimal result for failed query
                failed_result = ProcessedQuery(
                    original_query=query,
                    normalized_query=query,
                    expanded_query=query,
                    clean_query=query,
                    query_type=QueryType.MIXED,
                    query_intent=QueryIntent.EXPLANATION,
                    confidence_score=0.0
                )
                results.append(failed_result)
        
        return results
    
    def get_processing_stats(self, results: List[ProcessedQuery]) -> Dict[str, Any]:
        """
        Get statistics about processed queries.
        
        Args:
            results: List of ProcessedQuery objects
            
        Returns:
            Dictionary with processing statistics
        """
        if not results:
            return {}
        
        # Count query types
        type_counts = Counter(result.query_type.value for result in results)
        intent_counts = Counter(result.query_intent.value for result in results)
        
        # Count programming languages
        all_languages = []
        for result in results:
            all_languages.extend(result.programming_languages)
        language_counts = Counter(all_languages)
        
        # Calculate average confidence
        avg_confidence = np.mean([result.confidence_score for result in results])
        
        # Count expansions
        expansions_applied = sum(1 for result in results if result.expansion_applied)
        
        return {
            "total_queries": len(results),
            "query_types": dict(type_counts),
            "query_intents": dict(intent_counts),
            "programming_languages": dict(language_counts.most_common(10)),
            "average_confidence": avg_confidence,
            "expansions_applied": expansions_applied,
            "expansion_rate": expansions_applied / len(results)
        }
    
    def update_cs_terms(self, new_terms: Dict[str, Any]) -> None:
        """
        Update CS terms database with new terms.
        
        Args:
            new_terms: Dictionary with new terms to add
        """
        if "abbreviations" in new_terms:
            self.cs_terms.abbreviations.update(new_terms["abbreviations"])
        
        if "synonyms" in new_terms:
            self.cs_terms.synonyms.update(new_terms["synonyms"])
        
        if "algorithms" in new_terms:
            self.cs_terms.algorithm_names.update(new_terms["algorithms"])
        
        if "data_structures" in new_terms:
            self.cs_terms.data_structure_names.update(new_terms["data_structures"])
        
        logger.info("Updated CS terms database")


# Test suite for validation
class CSQueryProcessorTest:
    """Test suite for CS Query Processor validation."""
    
    def __init__(self, processor: CSQueryProcessor):
        self.processor = processor
    
    def run_test_suite(self) -> Dict[str, Any]:
        """Run comprehensive test suite."""
        test_queries = [
            # Code queries
            {
                "query": "implement binary search in Python",
                "expected_type": "code",
                "expected_languages": ["python"],
                "expected_algorithms": ["binary search"]
            },
            {
                "query": "how to write quicksort function in Java",
                "expected_type": "code",
                "expected_languages": ["java"],
                "expected_algorithms": ["quicksort"]
            },
            {
                "query": "create a stack class in C++",
                "expected_type": "code",
                "expected_languages": ["cpp"],
                "expected_data_structures": ["stack"]
            },
            
            # Theory queries
            {
                "query": "what is the time complexity of merge sort",
                "expected_type": "theory",
                "expected_algorithms": ["mergesort"],
                "expected_complexity": True
            },
            {
                "query": "explain how DFS works",
                "expected_type": "theory",
                "expected_algorithms": ["depth-first search"]
            },
            {
                "query": "define binary search tree properties",
                "expected_type": "theory",
                "expected_data_structures": ["binary search tree"]
            },
            
            # Mixed queries
            {
                "query": "difference between BFS and DFS implementation",
                "expected_type": "mixed",
                "expected_algorithms": ["breadth-first search", "depth-first search"]
            },
            {
                "query": "when to use hashmap vs array",
                "expected_type": "mixed",
                "expected_data_structures": ["hash map", "array"]
            },
            
            # Abbreviation expansion
            {
                "query": "implement BFS in Python",
                "expected_expansion": "breadth-first search",
                "expected_type": "code"
            },
            {
                "query": "what is DP complexity",
                "expected_expansion": "dynamic programming",
                "expected_type": "theory"
            }
        ]
        
        results = []
        for test_case in test_queries:
            result = self._run_single_test(test_case)
            results.append(result)
        
        # Calculate overall accuracy
        passed_tests = sum(1 for result in results if result["passed"])
        accuracy = passed_tests / len(results)
        
        return {
            "total_tests": len(results),
            "passed_tests": passed_tests,
            "accuracy": accuracy,
            "detailed_results": results
        }
    
    def _run_single_test(self, test_case: Dict[str, Any]) -> Dict[str, Any]:
        """Run a single test case."""
        query = test_case["query"]
        processed = self.processor.process_query(query)
        
        # Check expectations
        checks = {}
        
        # Query type check
        if "expected_type" in test_case:
            expected_type = test_case["expected_type"]
            actual_type = self.processor.detect_query_type(query)
            checks["type_correct"] = actual_type == expected_type
        
        # Programming language check
        if "expected_languages" in test_case:
            expected_langs = set(test_case["expected_languages"])
            actual_langs = set(processed.programming_languages)
            checks["languages_correct"] = expected_langs.issubset(actual_langs)
        
        # Algorithm check
        if "expected_algorithms" in test_case:
            expected_algos = test_case["expected_algorithms"]
            actual_algos = [algo.lower() for algo in processed.algorithms_mentioned]
            checks["algorithms_correct"] = any(
                any(exp.lower() in actual for actual in actual_algos)
                for exp in expected_algos
            )
        
        # Data structure check
        if "expected_data_structures" in test_case:
            expected_ds = test_case["expected_data_structures"]
            actual_ds = [ds.lower() for ds in processed.data_structures]
            checks["data_structures_correct"] = any(
                any(exp.lower() in actual for actual in actual_ds)
                for exp in expected_ds
            )
        
        # Expansion check
        if "expected_expansion" in test_case:
            expected_expansion = test_case["expected_expansion"]
            checks["expansion_correct"] = expected_expansion.lower() in processed.expanded_query.lower()
        
        # Complexity check
        if "expected_complexity" in test_case:
            checks["complexity_correct"] = len(processed.complexity_terms) > 0
        
        # Overall pass/fail
        all_passed = all(checks.values()) if checks else True
        
        return {
            "query": query,
            "processed": processed,
            "checks": checks,
            "passed": all_passed
        }


# Factory function
def create_cs_query_processor(config_path: Optional[str] = None) -> CSQueryProcessor:
    """
    Create a CS query processor with configuration.
    
    Args:
        config_path: Optional path to configuration file
        
    Returns:
        Configured CSQueryProcessor instance
    """
    return CSQueryProcessor(config_path=config_path)


# Utility functions for integration
def quick_process_query(query: str) -> Dict[str, Any]:
    """
    Quick processing function for simple integration.
    
    Args:
        query: Input query string
        
    Returns:
        Dictionary with essential processing results
    """
    processor = create_cs_query_processor()
    result = processor.process_query(query)
    
    return {
        "original": result.original_query,
        "cleaned": result.clean_query,
        "type": result.query_type.value,
        "intent": result.query_intent.value,
        "indexes": result.target_indexes,
        "weights": result.search_weights,
        "languages": result.programming_languages,
        "concepts": result.cs_concepts[:5]  # Top 5 concepts
    }


def batch_route_queries(queries: List[str]) -> List[Dict[str, Any]]:
    """
    Batch process and route multiple queries.
    
    Args:
        queries: List of query strings
        
    Returns:
        List of routing dictionaries
    """
    processor = create_cs_query_processor()
    results = []
    
    for query in queries:
        try:
            routing_info = processor.route_query(query)
            results.append(routing_info)
        except Exception as e:
            logger.error(f"Error routing query '{query}': {e}")
            results.append({
                "processed_query": query,
                "query_type": "mixed",
                "target_indexes": ["code", "theory"],
                "error": str(e)
            })
    
    return results


# Export main classes and functions
__all__ = [
    "CSQueryProcessor",
    "ProcessedQuery",
    "QueryType",
    "QueryIntent", 
    "CSTermsDatabase",
    "QueryClassifier",
    "CSQueryProcessorTest",
    "create_cs_query_processor",
    "quick_process_query",
    "batch_route_queries"
]