"""
Enhanced Document Chunker with Optimal Chunking Strategy
=======================================================

Implements proper chunking with:
- 512-1024 token chunks with 128 token overlap
- Semantic boundary preservation
- Context preservation across chunks
- Clean preprocessing to remove headers/footers/menus
"""

import re
import logging
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass
from transformers import AutoTokenizer
import tiktoken

logger = logging.getLogger(__name__)

@dataclass
class ChunkResult:
    """Result from document chunking."""
    content: str
    start_index: int
    end_index: int
    token_count: int
    chunk_id: str
    metadata: Dict[str, Any]
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'content': self.content,
            'start_index': self.start_index,
            'end_index': self.end_index,
            'token_count': self.token_count,
            'chunk_id': self.chunk_id,
            'metadata': self.metadata
        }

class EnhancedDocumentChunker:
    """Enhanced document chunker with optimal strategies."""
    
    def __init__(
        self,
        chunk_size: int = 768,  # Optimal size between 512-1024
        overlap_size: int = 128,  # Good overlap for context preservation
        model_name: str = "microsoft/phi-2"
    ):
        self.chunk_size = chunk_size
        self.overlap_size = overlap_size
        
        # Initialize tokenizer
        try:
            self.tokenizer = AutoTokenizer.from_pretrained(model_name)
            if self.tokenizer.pad_token is None:
                self.tokenizer.pad_token = self.tokenizer.eos_token
        except Exception as e:
            logger.warning(f"Failed to load tokenizer {model_name}: {e}")
            # Fallback to tiktoken
            self.tokenizer = None
            try:
                self.tiktoken_enc = tiktoken.get_encoding("cl100k_base")
            except:
                self.tiktoken_enc = None
                logger.error("Failed to initialize any tokenizer")
        
        # Patterns for cleaning
        self.noise_patterns = [
            # Navigation and menus
            r'(?i)home\s*>\s*(?:about|contact|menu|nav)',
            r'(?i)(?:click|tap)\s+(?:here|this|link)',
            r'(?i)(?:menu|navigation|nav|breadcrumb)s?\s*:',
            
            # Headers and footers
            r'(?i)(?:header|footer|copyright|©|\(c\))\s*(?:\d{4})?',
            r'(?i)(?:privacy|terms|conditions|policy)\s+(?:of|&)',
            r'(?i)all\s+rights?\s+reserved',
            
            # Table of contents
            r'(?i)table\s+of\s+contents?',
            r'(?i)(?:chapter|section)\s+\d+[\.\:]',
            r'(?i)page\s+\d+\s+of\s+\d+',
            
            # Code artifacts that aren't code
            r'goto\s+(?:statement|label)',
            r'const\s+pointers?\s+for\s+objects?',
            r'machine\s+code\s+(?:compilation|generation)',
            
            # Repeated characters or whitespace
            r'\s{3,}',  # 3+ consecutive spaces
            r'[\.\-_]{5,}',  # 5+ consecutive dots/dashes
        ]
        
        logger.info(f"Enhanced chunker initialized: {chunk_size} tokens, {overlap_size} overlap")
    
    def count_tokens(self, text: str) -> int:
        """Count tokens in text using available tokenizer."""
        if self.tokenizer:
            try:
                return len(self.tokenizer.encode(text, add_special_tokens=False))
            except:
                pass
        
        if self.tiktoken_enc:
            try:
                return len(self.tiktoken_enc.encode(text))
            except:
                pass
        
        # Fallback: approximate token count (1 token ≈ 4 characters)
        return len(text) // 4
    
    def clean_document(self, content: str) -> str:
        """Clean document by removing noise patterns."""
        cleaned = content
        
        # Apply noise pattern removal
        for pattern in self.noise_patterns:
            cleaned = re.sub(pattern, ' ', cleaned)
        
        # Normalize whitespace
        cleaned = re.sub(r'\s+', ' ', cleaned)
        cleaned = cleaned.strip()
        
        # Remove very short fragments (likely noise)
        lines = cleaned.split('\n')
        filtered_lines = []
        for line in lines:
            line = line.strip()
            if len(line) > 10:  # Keep lines with substantial content
                filtered_lines.append(line)
        
        cleaned = '\n'.join(filtered_lines)
        return cleaned
    
    def find_semantic_boundaries(self, text: str) -> List[int]:
        """Find good semantic boundaries for splitting."""
        boundaries = []
        
        # Sentence boundaries (preferred)
        sentence_ends = list(re.finditer(r'[.!?]\s+[A-Z]', text))
        for match in sentence_ends:
            boundaries.append(match.start() + 1)
        
        # Paragraph boundaries
        paragraph_ends = list(re.finditer(r'\n\s*\n', text))
        for match in paragraph_ends:
            boundaries.append(match.end())
        
        # Section boundaries
        section_headers = list(re.finditer(r'\n#{1,6}\s+[^\n]+\n', text))
        for match in section_headers:
            boundaries.append(match.start())
        
        return sorted(set(boundaries))
    
    def chunk_document(
        self, 
        content: str, 
        document_id: str = "unknown",
        preserve_structure: bool = True
    ) -> List[ChunkResult]:
        """Chunk document with optimal strategy."""
        
        # Clean the document first
        cleaned_content = self.clean_document(content)
        
        if not cleaned_content.strip():
            logger.warning(f"Document {document_id} is empty after cleaning")
            return []
        
        # Find semantic boundaries if preserving structure
        boundaries = []
        if preserve_structure:
            boundaries = self.find_semantic_boundaries(cleaned_content)
        
        chunks = []
        current_pos = 0
        chunk_index = 0
        
        while current_pos < len(cleaned_content):
            # Calculate chunk end position
            target_end = current_pos + self._estimate_char_count(self.chunk_size)
            
            # Adjust to semantic boundary if possible
            if preserve_structure and boundaries:
                # Find best boundary within reasonable range
                suitable_boundaries = [
                    b for b in boundaries 
                    if current_pos < b <= target_end + self._estimate_char_count(self.overlap_size)
                ]
                if suitable_boundaries:
                    chunk_end = suitable_boundaries[-1]  # Take the latest suitable boundary
                else:
                    chunk_end = min(target_end, len(cleaned_content))
            else:
                chunk_end = min(target_end, len(cleaned_content))
            
            # Extract chunk
            chunk_content = cleaned_content[current_pos:chunk_end].strip()
            
            if not chunk_content:
                break
            
            # Verify token count and adjust if needed
            token_count = self.count_tokens(chunk_content)
            
            # If chunk is too large, split it more aggressively
            if token_count > self.chunk_size * 1.2:  # 20% tolerance
                # Find a sentence boundary within the chunk
                sentences = re.split(r'[.!?]\s+', chunk_content)
                if len(sentences) > 1:
                    # Take fewer sentences
                    reduced_content = '. '.join(sentences[:len(sentences)//2])
                    if reduced_content:
                        chunk_content = reduced_content + '.'
                        token_count = self.count_tokens(chunk_content)
                        chunk_end = current_pos + len(chunk_content)
            
            # Create chunk
            chunk_id = f"{document_id}_chunk_{chunk_index:04d}"
            chunk = ChunkResult(
                content=chunk_content,
                start_index=current_pos,
                end_index=chunk_end,
                token_count=token_count,
                chunk_id=chunk_id,
                metadata={
                    'document_id': document_id,
                    'chunk_index': chunk_index,
                    'original_length': len(content),
                    'cleaned_length': len(cleaned_content),
                    'chunk_method': 'semantic' if preserve_structure else 'fixed'
                }
            )
            chunks.append(chunk)
            
            # Move to next position with overlap
            overlap_chars = self._estimate_char_count(self.overlap_size)
            current_pos = max(chunk_end - overlap_chars, current_pos + 1)
            chunk_index += 1
            
            # Safety check to prevent infinite loop
            if chunk_index > 1000:
                logger.warning(f"Too many chunks for document {document_id}, stopping")
                break
        
        logger.info(f"Document {document_id} chunked into {len(chunks)} chunks")
        return chunks
    
    def _estimate_char_count(self, token_count: int) -> int:
        """Estimate character count from token count."""
        # Rough estimate: 1 token ≈ 4 characters for English text
        return token_count * 4
    
    def get_chunk_statistics(self, chunks: List[ChunkResult]) -> Dict[str, Any]:
        """Get statistics about chunks."""
        if not chunks:
            return {}
        
        token_counts = [chunk.token_count for chunk in chunks]
        content_lengths = [len(chunk.content) for chunk in chunks]
        
        return {
            'total_chunks': len(chunks),
            'avg_tokens_per_chunk': sum(token_counts) / len(token_counts),
            'min_tokens': min(token_counts),
            'max_tokens': max(token_counts),
            'avg_chars_per_chunk': sum(content_lengths) / len(content_lengths),
            'total_tokens': sum(token_counts),
            'total_characters': sum(content_lengths)
        }