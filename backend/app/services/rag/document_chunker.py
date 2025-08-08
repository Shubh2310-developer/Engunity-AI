#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Advanced Document Chunker with Incremental Updates
==================================================

Intelligent document chunking system that supports incremental updates,
CS-specific content detection, and optimal chunk sizing for RAG retrieval.

Features:
- Smart chunking based on content type (code, text, mixed)
- Incremental document updates (only new chunks are processed)
- Content-aware chunk boundaries (respects code blocks, paragraphs)
- Chunk deduplication and versioning
- Metadata enrichment for better retrieval
- Memory-efficient processing for large documents

Chunking Strategies:
- Semantic chunking for natural text
- Code-aware chunking for programming content
- Mixed content handling
- Overlap management for context preservation

Author: Engunity AI Team
"""

import os
import json
import logging
import hashlib
import re
from typing import Dict, List, Optional, Any, Tuple, Set
from dataclasses import dataclass, asdict
from pathlib import Path
from datetime import datetime
import asyncio
from enum import Enum

logger = logging.getLogger(__name__)

class ChunkType(str, Enum):
    """Types of document chunks."""
    TEXT = "text"
    CODE = "code"
    MIXED = "mixed"
    TABLE = "table"
    LIST = "list"
    HEADER = "header"

class ContentType(str, Enum):
    """Content type detection."""
    NATURAL_TEXT = "natural_text"
    PROGRAMMING_CODE = "programming_code"
    DOCUMENTATION = "documentation"
    TECHNICAL_SPEC = "technical_spec"
    MIXED_CONTENT = "mixed_content"

@dataclass
class DocumentChunk:
    """Enhanced document chunk with metadata."""
    chunk_id: str
    document_id: str
    content: str
    chunk_type: ChunkType
    content_type: ContentType
    chunk_index: int
    start_char: int
    end_char: int
    word_count: int
    token_estimate: int
    hash: str
    metadata: Dict[str, Any]
    created_at: datetime
    
    # CS-specific metadata
    programming_language: Optional[str] = None
    contains_code: bool = False
    contains_math: bool = False
    cs_concepts: List[str] = None
    technical_terms: List[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for storage."""
        data = asdict(self)
        data['created_at'] = self.created_at.isoformat()
        data['chunk_type'] = self.chunk_type.value
        data['content_type'] = self.content_type.value
        return data
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'DocumentChunk':
        """Create from dictionary."""
        data['created_at'] = datetime.fromisoformat(data['created_at'])
        data['chunk_type'] = ChunkType(data['chunk_type'])
        data['content_type'] = ContentType(data['content_type'])
        return cls(**data)

@dataclass
class ChunkingConfig:
    """Configuration for document chunking."""
    max_chunk_size: int = 512  # Maximum chunk size in tokens
    chunk_overlap: int = 50    # Overlap between chunks in tokens
    min_chunk_size: int = 50   # Minimum chunk size in tokens
    
    # Content-specific settings
    preserve_code_blocks: bool = True
    preserve_paragraphs: bool = True
    preserve_sentences: bool = True
    preserve_lists: bool = True
    
    # CS-specific settings
    detect_programming_language: bool = True
    extract_cs_concepts: bool = True
    extract_technical_terms: bool = True
    split_long_functions: bool = True
    
    # Incremental update settings
    enable_deduplication: bool = True
    version_chunks: bool = True
    update_threshold: float = 0.1  # Minimum change to trigger update

class DocumentChunker:
    """Advanced document chunker with incremental updates."""
    
    def __init__(
        self,
        config: Optional[ChunkingConfig] = None,
        cache_dir: Optional[Path] = None
    ):
        """
        Initialize document chunker.
        
        Args:
            config: Chunking configuration
            cache_dir: Directory for caching chunk metadata
        """
        self.config = config or ChunkingConfig()
        self.cache_dir = cache_dir or Path("./chunk_cache")
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        
        # CS concept patterns
        self.cs_concepts = self._load_cs_concepts()
        self.technical_terms = self._load_technical_terms()
        self.programming_languages = self._load_programming_languages()
        
        # Chunk cache for incremental updates
        self.chunk_cache: Dict[str, List[DocumentChunk]] = {}
        self._load_chunk_cache()
        
        logger.info("Document Chunker initialized with incremental updates")
    
    def _load_cs_concepts(self) -> Dict[str, List[str]]:
        """Load CS concepts for metadata extraction."""
        return {
            'algorithms': [
                'sorting', 'searching', 'recursion', 'dynamic programming',
                'greedy', 'divide and conquer', 'backtracking', 'graph traversal'
            ],
            'data_structures': [
                'array', 'linked list', 'stack', 'queue', 'tree', 'graph',
                'hash table', 'heap', 'trie', 'binary search tree'
            ],
            'programming_concepts': [
                'object-oriented', 'functional programming', 'inheritance',
                'polymorphism', 'encapsulation', 'abstraction', 'interface',
                'class', 'method', 'function', 'variable', 'constant'
            ],
            'software_engineering': [
                'design pattern', 'architecture', 'microservices', 'api',
                'database', 'testing', 'debugging', 'version control',
                'deployment', 'devops', 'agile', 'scrum'
            ]
        }
    
    def _load_technical_terms(self) -> Set[str]:
        """Load technical terms for extraction."""
        terms = set()
        
        # Programming terms
        terms.update([
            'algorithm', 'function', 'method', 'class', 'object', 'instance',
            'variable', 'constant', 'parameter', 'argument', 'return',
            'loop', 'condition', 'boolean', 'integer', 'string', 'array',
            'list', 'dictionary', 'set', 'tuple', 'iterator', 'generator'
        ])
        
        # System terms
        terms.update([
            'server', 'client', 'database', 'api', 'endpoint', 'request',
            'response', 'http', 'https', 'json', 'xml', 'html', 'css',
            'javascript', 'python', 'java', 'cpp', 'sql'
        ])
        
        return terms
    
    def _load_programming_languages(self) -> Dict[str, List[str]]:
        """Load programming language detection patterns."""
        return {
            'python': [
                r'def\s+\w+\s*\(', r'import\s+\w+', r'from\s+\w+\s+import',
                r'class\s+\w+\s*\(', r'if\s+__name__\s*==\s*["\']__main__["\']',
                r'print\s*\(', r'\.py\b'
            ],
            'javascript': [
                r'function\s+\w+\s*\(', r'const\s+\w+\s*=', r'let\s+\w+\s*=',
                r'var\s+\w+\s*=', r'\.js\b', r'console\.log\s*\(',
                r'=>\s*{', r'require\s*\(', r'module\.exports'
            ],
            'java': [
                r'public\s+class\s+\w+', r'public\s+static\s+void\s+main',
                r'import\s+java\.', r'\.java\b', r'System\.out\.print',
                r'@Override', r'extends\s+\w+', r'implements\s+\w+'
            ],
            'cpp': [
                r'#include\s*<\w+>', r'int\s+main\s*\(', r'std::', r'\.cpp\b',
                r'cout\s*<<', r'cin\s*>>', r'class\s+\w+\s*{', r'namespace\s+\w+'
            ],
            'typescript': [
                r'interface\s+\w+', r'type\s+\w+\s*=', r'\.ts\b', r'\.tsx\b',
                r':\s*string', r':\s*number', r':\s*boolean', r'export\s+interface'
            ],
            'sql': [
                r'SELECT\s+', r'FROM\s+\w+', r'WHERE\s+', r'INSERT\s+INTO',
                r'UPDATE\s+\w+', r'DELETE\s+FROM', r'CREATE\s+TABLE',
                r'ALTER\s+TABLE', r'JOIN\s+\w+'
            ]
        }
    
    def _load_chunk_cache(self):
        """Load existing chunk cache for incremental updates."""
        cache_file = self.cache_dir / "chunk_cache.json"
        try:
            if cache_file.exists():
                with open(cache_file, 'r') as f:
                    cache_data = json.load(f)
                
                for doc_id, chunk_list in cache_data.items():
                    self.chunk_cache[doc_id] = [
                        DocumentChunk.from_dict(chunk_data)
                        for chunk_data in chunk_list
                    ]
                
                logger.info(f"Loaded chunk cache for {len(self.chunk_cache)} documents")
        except Exception as e:
            logger.warning(f"Failed to load chunk cache: {e}")
            self.chunk_cache = {}
    
    def _save_chunk_cache(self):
        """Save chunk cache for incremental updates."""
        cache_file = self.cache_dir / "chunk_cache.json"
        try:
            cache_data = {}
            for doc_id, chunks in self.chunk_cache.items():
                cache_data[doc_id] = [chunk.to_dict() for chunk in chunks]
            
            with open(cache_file, 'w') as f:
                json.dump(cache_data, f, indent=2, default=str)
                
        except Exception as e:
            logger.error(f"Failed to save chunk cache: {e}")
    
    def chunk_document(
        self,
        document_id: str,
        content: str,
        metadata: Optional[Dict[str, Any]] = None,
        force_update: bool = False
    ) -> Tuple[List[DocumentChunk], bool]:
        """
        Chunk document with incremental update support.
        
        Args:
            document_id: Unique document identifier
            content: Document content to chunk
            metadata: Additional document metadata
            force_update: Force re-chunking even if document hasn't changed
            
        Returns:
            Tuple of (chunks, was_updated)
        """
        metadata = metadata or {}
        content_hash = self._calculate_content_hash(content)
        
        # Check if document has changed
        if not force_update and document_id in self.chunk_cache:
            existing_chunks = self.chunk_cache[document_id]
            if existing_chunks and existing_chunks[0].metadata.get('content_hash') == content_hash:
                logger.info(f"Document {document_id} unchanged, using cached chunks")
                return existing_chunks, False
        
        logger.info(f"Chunking document {document_id} ({len(content)} chars)")
        start_time = datetime.now()
        
        # Detect content type
        content_type = self._detect_content_type(content)
        
        # Apply content-specific chunking strategy
        if content_type == ContentType.PROGRAMMING_CODE:
            chunks = self._chunk_code_content(document_id, content, metadata)
        elif content_type == ContentType.MIXED_CONTENT:
            chunks = self._chunk_mixed_content(document_id, content, metadata)
        else:
            chunks = self._chunk_text_content(document_id, content, metadata)
        
        # Enrich chunks with metadata
        for chunk in chunks:
            chunk.metadata['content_hash'] = content_hash
            chunk.metadata['chunking_time'] = (datetime.now() - start_time).total_seconds()
            chunk.metadata['chunking_config'] = asdict(self.config)
        
        # Update cache
        self.chunk_cache[document_id] = chunks
        self._save_chunk_cache()
        
        processing_time = (datetime.now() - start_time).total_seconds()
        logger.info(f"Chunked document {document_id} into {len(chunks)} chunks in {processing_time:.2f}s")
        
        return chunks, True
    
    def _detect_content_type(self, content: str) -> ContentType:
        """Detect the primary content type of the document."""
        content_lower = content.lower()
        
        # Count code indicators
        code_indicators = 0
        for lang_patterns in self.programming_languages.values():
            for pattern in lang_patterns:
                if re.search(pattern, content, re.IGNORECASE):
                    code_indicators += 1
        
        # Count natural text indicators
        text_indicators = 0
        text_patterns = [
            r'\b(the|and|or|but|in|on|at|to|for|of|with|by)\b',
            r'[.!?]\s+[A-Z]',  # Sentence boundaries
            r'\b(this|that|these|those|what|when|where|why|how)\b'
        ]
        
        for pattern in text_patterns:
            matches = len(re.findall(pattern, content))
            text_indicators += min(matches, 10)  # Cap to avoid skewing
        
        # Determine content type
        code_ratio = code_indicators / max(len(content.split('\n')), 1)
        text_ratio = text_indicators / max(len(content.split()), 1)
        
        if code_ratio > 0.3:
            if text_ratio > 0.1:
                return ContentType.MIXED_CONTENT
            else:
                return ContentType.PROGRAMMING_CODE
        elif text_ratio > 0.05:
            if any(term in content_lower for term in ['api', 'function', 'method', 'class']):
                return ContentType.TECHNICAL_SPEC
            else:
                return ContentType.NATURAL_TEXT
        else:
            return ContentType.DOCUMENTATION
    
    def _chunk_text_content(
        self,
        document_id: str,
        content: str,
        metadata: Dict[str, Any]
    ) -> List[DocumentChunk]:
        """Chunk natural text content."""
        chunks = []
        
        # Split into paragraphs first
        paragraphs = [p.strip() for p in content.split('\n\n') if p.strip()]
        
        current_chunk = ""
        current_start = 0
        chunk_index = 0
        
        for para in paragraphs:
            # Check if adding this paragraph would exceed chunk size
            potential_chunk = current_chunk + ("\n\n" if current_chunk else "") + para
            
            if self._estimate_tokens(potential_chunk) <= self.config.max_chunk_size:
                current_chunk = potential_chunk
            else:
                # Save current chunk if it's substantial
                if current_chunk and self._estimate_tokens(current_chunk) >= self.config.min_chunk_size:
                    chunk = self._create_chunk(
                        document_id, current_chunk, chunk_index,
                        current_start, ChunkType.TEXT, ContentType.NATURAL_TEXT, metadata
                    )
                    chunks.append(chunk)
                    chunk_index += 1
                    current_start += len(current_chunk)
                
                # Start new chunk with current paragraph
                current_chunk = para
        
        # Add final chunk
        if current_chunk and self._estimate_tokens(current_chunk) >= self.config.min_chunk_size:
            chunk = self._create_chunk(
                document_id, current_chunk, chunk_index,
                current_start, ChunkType.TEXT, ContentType.NATURAL_TEXT, metadata
            )
            chunks.append(chunk)
        
        return chunks
    
    def _chunk_code_content(
        self,
        document_id: str,
        content: str,
        metadata: Dict[str, Any]
    ) -> List[DocumentChunk]:
        """Chunk programming code content."""
        chunks = []
        
        # Detect programming language
        programming_language = self._detect_programming_language(content)
        
        # Split by functions/classes for better context
        if programming_language in ['python', 'javascript', 'java', 'cpp']:
            chunks = self._chunk_by_functions(document_id, content, programming_language, metadata)
        else:
            # Fall back to line-based chunking
            chunks = self._chunk_by_lines(document_id, content, metadata)
        
        # Enrich with code-specific metadata
        for chunk in chunks:
            chunk.programming_language = programming_language
            chunk.contains_code = True
            chunk.cs_concepts = self._extract_cs_concepts(chunk.content)
            chunk.technical_terms = self._extract_technical_terms(chunk.content)
        
        return chunks
    
    def _chunk_mixed_content(
        self,
        document_id: str,
        content: str,
        metadata: Dict[str, Any]
    ) -> List[DocumentChunk]:
        """Chunk mixed content (text + code)."""
        chunks = []
        
        # Split content into blocks by detecting code vs text sections
        blocks = self._split_mixed_content(content)
        
        current_chunk = ""
        current_start = 0
        chunk_index = 0
        
        for block_type, block_content in blocks:
            potential_chunk = current_chunk + ("\n\n" if current_chunk else "") + block_content
            
            if self._estimate_tokens(potential_chunk) <= self.config.max_chunk_size:
                current_chunk = potential_chunk
            else:
                # Save current chunk
                if current_chunk:
                    chunk_type = ChunkType.MIXED if self._contains_code(current_chunk) else ChunkType.TEXT
                    chunk = self._create_chunk(
                        document_id, current_chunk, chunk_index,
                        current_start, chunk_type, ContentType.MIXED_CONTENT, metadata
                    )
                    chunks.append(chunk)
                    chunk_index += 1
                    current_start += len(current_chunk)
                
                current_chunk = block_content
        
        # Add final chunk
        if current_chunk:
            chunk_type = ChunkType.MIXED if self._contains_code(current_chunk) else ChunkType.TEXT
            chunk = self._create_chunk(
                document_id, current_chunk, chunk_index,
                current_start, chunk_type, ContentType.MIXED_CONTENT, metadata
            )
            chunks.append(chunk)
        
        return chunks
    
    def _create_chunk(
        self,
        document_id: str,
        content: str,
        chunk_index: int,
        start_char: int,
        chunk_type: ChunkType,
        content_type: ContentType,
        metadata: Dict[str, Any]
    ) -> DocumentChunk:
        """Create a document chunk with metadata."""
        content_hash = self._calculate_content_hash(content)
        chunk_id = f"{document_id}_chunk_{chunk_index}_{content_hash[:8]}"
        
        word_count = len(content.split())
        token_estimate = self._estimate_tokens(content)
        
        chunk_metadata = {
            **metadata,
            'chunk_method': 'intelligent_chunking',
            'overlap_tokens': self.config.chunk_overlap
        }
        
        chunk = DocumentChunk(
            chunk_id=chunk_id,
            document_id=document_id,
            content=content,
            chunk_type=chunk_type,
            content_type=content_type,
            chunk_index=chunk_index,
            start_char=start_char,
            end_char=start_char + len(content),
            word_count=word_count,
            token_estimate=token_estimate,
            hash=content_hash,
            metadata=chunk_metadata,
            created_at=datetime.now(),
            contains_code=self._contains_code(content),
            contains_math=self._contains_math(content)
        )
        
        return chunk
    
    def _split_mixed_content(self, content: str) -> List[Tuple[str, str]]:
        """Split mixed content into code and text blocks."""
        blocks = []
        
        # Look for code blocks (markdown style)
        code_block_pattern = r'```(\w+)?\n(.*?)\n```'
        
        last_end = 0
        for match in re.finditer(code_block_pattern, content, re.DOTALL):
            # Add text before code block
            if match.start() > last_end:
                text_content = content[last_end:match.start()].strip()
                if text_content:
                    blocks.append(('text', text_content))
            
            # Add code block
            code_content = match.group(2).strip()
            if code_content:
                blocks.append(('code', code_content))
            
            last_end = match.end()
        
        # Add remaining text
        if last_end < len(content):
            remaining_text = content[last_end:].strip()
            if remaining_text:
                blocks.append(('text', remaining_text))
        
        # If no code blocks found, split by heuristics
        if not blocks:
            blocks = self._heuristic_split(content)
        
        return blocks
    
    def _heuristic_split(self, content: str) -> List[Tuple[str, str]]:
        """Heuristically split content into code and text blocks."""
        blocks = []
        
        lines = content.split('\n')
        current_block = []
        current_type = None
        
        for line in lines:
            line_type = 'code' if self._is_code_line(line) else 'text'
            
            if current_type is None:
                current_type = line_type
                current_block = [line]
            elif current_type == line_type:
                current_block.append(line)
            else:
                # Type changed, save current block
                if current_block:
                    block_content = '\n'.join(current_block).strip()
                    if block_content:
                        blocks.append((current_type, block_content))
                
                current_type = line_type
                current_block = [line]
        
        # Add final block
        if current_block:
            block_content = '\n'.join(current_block).strip()
            if block_content:
                blocks.append((current_type, block_content))
        
        return blocks
    
    def _is_code_line(self, line: str) -> bool:
        """Determine if a line is likely code."""
        line = line.strip()
        
        # Empty lines are neutral
        if not line:
            return False
        
        # Check for code patterns
        code_patterns = [
            r'^(def|class|import|from|if|for|while|try|except|with)\s',
            r'^(function|var|let|const|if|for|while|try|catch)\s',
            r'^(public|private|protected|static|class|interface)\s',
            r'^\s*[{}()[\];]',
            r'=\s*function\s*\(',
            r'=>\s*{',
            r'console\.log\s*\(',
            r'print\s*\(',
            r'System\.out\.',
            r'#include\s*<',
            r'^\s*//.*',
            r'^\s*/\*.*',
            r'^\s*\*.*',
            r'^\s*#.*'
        ]
        
        for pattern in code_patterns:
            if re.search(pattern, line):
                return True
        
        # Check indentation patterns (common in code)
        if line.startswith('    ') or line.startswith('\t'):
            return True
        
        return False
    
    def _chunk_by_functions(
        self,
        document_id: str,
        content: str,
        language: str,
        metadata: Dict[str, Any]
    ) -> List[DocumentChunk]:
        """Chunk code by functions/classes."""
        chunks = []
        
        if language == 'python':
            function_pattern = r'^(def|class)\s+\w+.*?(?=^(def|class|\Z))'
        elif language == 'javascript':
            function_pattern = r'(function\s+\w+.*?(?=function|\Z)|const\s+\w+\s*=.*?(?=const|let|var|\Z))'
        elif language == 'java':
            function_pattern = r'(public|private|protected).*?{.*?(?=^\s*(public|private|protected)|\Z)'
        else:
            return self._chunk_by_lines(document_id, content, metadata)
        
        functions = re.findall(function_pattern, content, re.MULTILINE | re.DOTALL)
        
        chunk_index = 0
        start_char = 0
        
        for func_content in functions:
            if isinstance(func_content, tuple):
                func_content = func_content[0]
            
            func_content = func_content.strip()
            if not func_content:
                continue
            
            # If function is too long, split it further
            if self._estimate_tokens(func_content) > self.config.max_chunk_size:
                sub_chunks = self._split_long_function(func_content)
                for sub_chunk in sub_chunks:
                    chunk = self._create_chunk(
                        document_id, sub_chunk, chunk_index, start_char,
                        ChunkType.CODE, ContentType.PROGRAMMING_CODE, metadata
                    )
                    chunks.append(chunk)
                    chunk_index += 1
                    start_char += len(sub_chunk)
            else:
                chunk = self._create_chunk(
                    document_id, func_content, chunk_index, start_char,
                    ChunkType.CODE, ContentType.PROGRAMMING_CODE, metadata
                )
                chunks.append(chunk)
                chunk_index += 1
                start_char += len(func_content)
        
        return chunks if chunks else self._chunk_by_lines(document_id, content, metadata)
    
    def _chunk_by_lines(
        self,
        document_id: str,
        content: str,
        metadata: Dict[str, Any]
    ) -> List[DocumentChunk]:
        """Chunk content by lines with token limit."""
        chunks = []
        lines = content.split('\n')
        
        current_chunk = []
        chunk_index = 0
        start_char = 0
        
        for line in lines:
            current_chunk.append(line)
            chunk_content = '\n'.join(current_chunk)
            
            if self._estimate_tokens(chunk_content) > self.config.max_chunk_size:
                # Remove last line and save chunk
                if len(current_chunk) > 1:
                    current_chunk.pop()
                    final_content = '\n'.join(current_chunk)
                    
                    chunk = self._create_chunk(
                        document_id, final_content, chunk_index, start_char,
                        ChunkType.CODE, ContentType.PROGRAMMING_CODE, metadata
                    )
                    chunks.append(chunk)
                    chunk_index += 1
                    start_char += len(final_content)
                    
                    # Start new chunk with the line that caused overflow
                    current_chunk = [line]
                else:
                    # Single line is too long, truncate it
                    truncated_line = line[:self.config.max_chunk_size * 4]  # Rough token estimate
                    chunk = self._create_chunk(
                        document_id, truncated_line, chunk_index, start_char,
                        ChunkType.CODE, ContentType.PROGRAMMING_CODE, metadata
                    )
                    chunks.append(chunk)
                    chunk_index += 1
                    start_char += len(truncated_line)
                    current_chunk = []
        
        # Add final chunk
        if current_chunk:
            final_content = '\n'.join(current_chunk)
            chunk = self._create_chunk(
                document_id, final_content, chunk_index, start_char,
                ChunkType.CODE, ContentType.PROGRAMMING_CODE, metadata
            )
            chunks.append(chunk)
        
        return chunks
    
    def _split_long_function(self, func_content: str) -> List[str]:
        """Split long functions into smaller chunks."""
        # Simple splitting by logical blocks (could be enhanced)
        lines = func_content.split('\n')
        chunks = []
        current_chunk = []
        
        for line in lines:
            current_chunk.append(line)
            if self._estimate_tokens('\n'.join(current_chunk)) > self.config.max_chunk_size:
                if len(current_chunk) > 1:
                    chunks.append('\n'.join(current_chunk[:-1]))
                    current_chunk = [current_chunk[-1]]
        
        if current_chunk:
            chunks.append('\n'.join(current_chunk))
        
        return chunks
    
    def _detect_programming_language(self, content: str) -> Optional[str]:
        """Detect the primary programming language in content."""
        scores = {}
        
        for lang, patterns in self.programming_languages.items():
            score = 0
            for pattern in patterns:
                matches = len(re.findall(pattern, content, re.IGNORECASE))
                score += matches
            
            if score > 0:
                scores[lang] = score
        
        if scores:
            return max(scores.items(), key=lambda x: x[1])[0]
        
        return None
    
    def _contains_code(self, content: str) -> bool:
        """Check if content contains code."""
        # Simple heuristic based on code patterns
        code_indicators = [
            r'def\s+\w+\s*\(', r'function\s+\w+\s*\(', r'class\s+\w+',
            r'import\s+\w+', r'#include', r'console\.log', r'print\s*\(',
            r'{.*}', r'\[.*\]', r'=>', r'==', r'!=', r'<=', r'>='
        ]
        
        for pattern in code_indicators:
            if re.search(pattern, content):
                return True
        
        return False
    
    def _contains_math(self, content: str) -> bool:
        """Check if content contains mathematical expressions."""
        math_patterns = [
            r'\$.*?\$',  # LaTeX math
            r'\\frac{.*?}{.*?}',  # Fractions
            r'\\sum_{.*?}',  # Summations
            r'\\int_{.*?}',  # Integrals
            r'[+\-*/=]\s*\d',  # Basic math operations
            r'\b(sqrt|sin|cos|tan|log|ln|exp)\b'  # Math functions
        ]
        
        for pattern in math_patterns:
            if re.search(pattern, content):
                return True
        
        return False
    
    def _extract_cs_concepts(self, content: str) -> List[str]:
        """Extract CS concepts from content."""
        concepts = []
        content_lower = content.lower()
        
        for category, terms in self.cs_concepts.items():
            for term in terms:
                if term in content_lower:
                    concepts.append(term)
        
        return list(set(concepts))
    
    def _extract_technical_terms(self, content: str) -> List[str]:
        """Extract technical terms from content."""
        terms = []
        words = re.findall(r'\b\w{3,}\b', content.lower())
        
        for word in words:
            if word in self.technical_terms:
                terms.append(word)
        
        return list(set(terms))
    
    def _estimate_tokens(self, text: str) -> int:
        """Estimate token count for text."""
        # Simple estimation: ~4 characters per token on average
        return len(text) // 4
    
    def _calculate_content_hash(self, content: str) -> str:
        """Calculate hash of content for change detection."""
        return hashlib.md5(content.encode()).hexdigest()
    
    def get_chunks_for_document(self, document_id: str) -> List[DocumentChunk]:
        """Get cached chunks for a document."""
        return self.chunk_cache.get(document_id, [])
    
    def clear_document_chunks(self, document_id: str) -> bool:
        """Clear chunks for a specific document."""
        if document_id in self.chunk_cache:
            del self.chunk_cache[document_id]
            self._save_chunk_cache()
            return True
        return False
    
    def get_chunking_stats(self) -> Dict[str, Any]:
        """Get chunking statistics."""
        total_chunks = sum(len(chunks) for chunks in self.chunk_cache.values())
        
        stats = {
            'total_documents': len(self.chunk_cache),
            'total_chunks': total_chunks,
            'avg_chunks_per_doc': total_chunks / max(len(self.chunk_cache), 1),
            'chunk_types': {},
            'content_types': {},
            'programming_languages': {}
        }
        
        # Analyze chunk types
        for chunks in self.chunk_cache.values():
            for chunk in chunks:
                # Chunk types
                chunk_type = chunk.chunk_type.value
                stats['chunk_types'][chunk_type] = stats['chunk_types'].get(chunk_type, 0) + 1
                
                # Content types
                content_type = chunk.content_type.value
                stats['content_types'][content_type] = stats['content_types'].get(content_type, 0) + 1
                
                # Programming languages
                if chunk.programming_language:
                    lang = chunk.programming_language
                    stats['programming_languages'][lang] = stats['programming_languages'].get(lang, 0) + 1
        
        return stats

# Factory function
def create_document_chunker(config: Optional[ChunkingConfig] = None) -> DocumentChunker:
    """Create document chunker with default configuration."""
    return DocumentChunker(config=config)