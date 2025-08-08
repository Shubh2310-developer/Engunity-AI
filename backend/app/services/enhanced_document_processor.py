#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Enhanced Document Processor for Real RAG
=======================================

Service to extract, process, and chunk documents for semantic search
and question answering with proper content extraction.

Author: Engunity AI Team
"""

import logging
import asyncio
import aiohttp
from typing import Dict, List, Optional, Any, Tuple
from pathlib import Path
import tempfile
import os

logger = logging.getLogger(__name__)

class EnhancedDocumentProcessor:
    """Enhanced document processor with real content extraction"""
    
    def __init__(self):
        logger.info("Initializing Enhanced Document Processor")
        
    async def extract_pdf_text(self, pdf_path: str) -> str:
        """Extract text from PDF using multiple methods"""
        try:
            # Try pdfplumber first (best for text extraction)
            try:
                import pdfplumber
                text_content = []
                
                with pdfplumber.open(pdf_path) as pdf:
                    logger.info(f"Processing PDF with {len(pdf.pages)} pages")
                    
                    for page_num, page in enumerate(pdf.pages, 1):
                        try:
                            page_text = page.extract_text()
                            if page_text:
                                text_content.append(f"\n\n--- Page {page_num} ---\n{page_text}")
                                logger.debug(f"Extracted {len(page_text)} chars from page {page_num}")
                        except Exception as e:
                            logger.warning(f"Failed to extract text from page {page_num}: {e}")
                            continue
                
                full_text = '\n'.join(text_content)
                if len(full_text.strip()) > 100:
                    logger.info(f"Successfully extracted {len(full_text)} characters using pdfplumber")
                    return full_text
                    
            except ImportError:
                logger.warning("pdfplumber not available, trying PyPDF2")
            
            # Fallback to PyPDF2
            try:
                import PyPDF2
                text_content = []
                
                with open(pdf_path, 'rb') as file:
                    pdf_reader = PyPDF2.PdfReader(file)
                    logger.info(f"Processing PDF with {len(pdf_reader.pages)} pages using PyPDF2")
                    
                    for page_num, page in enumerate(pdf_reader.pages, 1):
                        try:
                            page_text = page.extract_text()
                            if page_text:
                                text_content.append(f"\n\n--- Page {page_num} ---\n{page_text}")
                                logger.debug(f"Extracted {len(page_text)} chars from page {page_num}")
                        except Exception as e:
                            logger.warning(f"Failed to extract text from page {page_num}: {e}")
                            continue
                
                full_text = '\n'.join(text_content)
                if len(full_text.strip()) > 100:
                    logger.info(f"Successfully extracted {len(full_text)} characters using PyPDF2")
                    return full_text
                    
            except ImportError:
                logger.error("Neither pdfplumber nor PyPDF2 available for PDF processing")
            
            # If all extraction methods fail
            logger.error("Failed to extract text from PDF using all available methods")
            return ""
            
        except Exception as e:
            logger.error(f"Error extracting PDF text: {e}")
            return ""
    
    async def download_and_extract_document(self, storage_url: str, document_id: str) -> str:
        """Download document from storage and extract text"""
        try:
            logger.info(f"Downloading document from: {storage_url}")
            
            # Create temporary file
            with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as temp_file:
                temp_path = temp_file.name
            
            try:
                # Download the document
                async with aiohttp.ClientSession() as session:
                    async with session.get(storage_url) as response:
                        if response.status == 200:
                            content = await response.read()
                            with open(temp_path, 'wb') as f:
                                f.write(content)
                            logger.info(f"Downloaded {len(content)} bytes")
                        else:
                            logger.error(f"Failed to download document: HTTP {response.status}")
                            return ""
                
                # Extract text based on file type
                if storage_url.lower().endswith('.pdf'):
                    text_content = await self.extract_pdf_text(temp_path)
                else:
                    # For other file types, try to read as text
                    try:
                        with open(temp_path, 'r', encoding='utf-8') as f:
                            text_content = f.read()
                    except UnicodeDecodeError:
                        try:
                            with open(temp_path, 'r', encoding='latin-1') as f:
                                text_content = f.read()
                        except Exception as e:
                            logger.error(f"Failed to read file as text: {e}")
                            text_content = ""
                
                return text_content
                
            finally:
                # Clean up temporary file
                if os.path.exists(temp_path):
                    os.unlink(temp_path)
                    
        except Exception as e:
            logger.error(f"Error downloading and extracting document: {e}")
            return ""
    
    def chunk_text(self, text: str, chunk_size: int = 1000, overlap: int = 100) -> List[str]:
        """Chunk text into overlapping segments for better retrieval"""
        if not text or len(text.strip()) < 50:
            return []
        
        # Clean and normalize text
        text = text.strip()
        
        # Split by paragraphs first
        paragraphs = [p.strip() for p in text.split('\n\n') if p.strip()]
        
        chunks = []
        current_chunk = ""
        
        for paragraph in paragraphs:
            # If adding this paragraph would exceed chunk size
            if len(current_chunk) + len(paragraph) > chunk_size and current_chunk:
                chunks.append(current_chunk.strip())
                
                # Start new chunk with overlap
                overlap_text = current_chunk[-overlap:] if len(current_chunk) > overlap else current_chunk
                current_chunk = overlap_text + "\n\n" + paragraph
            else:
                current_chunk += "\n\n" + paragraph if current_chunk else paragraph
        
        # Add the last chunk
        if current_chunk.strip():
            chunks.append(current_chunk.strip())
        
        logger.info(f"Created {len(chunks)} chunks from {len(text)} characters")
        return chunks
    
    def extract_relevant_chunks(self, text: str, query: str, max_chunks: int = 5) -> List[str]:
        """Extract chunks most relevant to the query using enhanced keyword matching"""
        chunks = self.chunk_text(text)
        
        if not chunks:
            return []
        
        # Enhanced relevance scoring with context awareness
        query_lower = query.lower()
        query_words = set(query_lower.split())
        chunk_scores = []
        
        # Define enhanced term mappings for better matching
        term_expansions = {
            'joint operation': ['join', 'inner join', 'outer join', 'left join', 'right join', 'combine', 'merge'],
            'join operation': ['join', 'inner join', 'outer join', 'left join', 'right join'],
            'postgresql': ['postgres', 'postgresql', 'planner', 'optimizer', 'execution'],
            'why': ['reason', 'benefit', 'advantage', 'purpose', 'because', 'allows', 'enables']
        }
        
        # Expand query terms
        expanded_query_terms = set(query_words)
        for term, expansions in term_expansions.items():
            if term in query_lower:
                expanded_query_terms.update(expansions)
        
        for i, chunk in enumerate(chunks):
            chunk_lower = chunk.lower()
            chunk_words = set(chunk_lower.split())
            
            # Base overlap score
            overlap = len(query_words.intersection(chunk_words))
            base_score = overlap / len(query_words) if query_words else 0
            
            # Enhanced scoring with expanded terms
            expanded_overlap = len(expanded_query_terms.intersection(chunk_words))
            expanded_score = expanded_overlap / len(expanded_query_terms) if expanded_query_terms else 0
            
            # Context-specific boosts
            context_boost = 0
            
            # Boost for JOIN-related content
            if 'joint operation' in query_lower or 'join' in query_lower:
                join_indicators = ['join', 'combine', 'merge', 'relate', 'connect', 'table', 'data']
                join_matches = sum(1 for indicator in join_indicators if indicator in chunk_lower)
                if join_matches > 0:
                    context_boost += min(join_matches * 0.1, 0.3)
            
            # Boost for PostgreSQL-specific content
            if 'postgresql' in query_lower or 'postgres' in query_lower:
                pg_indicators = ['postgresql', 'postgres', 'planner', 'optimizer', 'performance', 'execution']
                pg_matches = sum(1 for indicator in pg_indicators if indicator in chunk_lower)
                if pg_matches > 0:
                    context_boost += min(pg_matches * 0.1, 0.2)
            
            # Boost for "why" questions - prioritize explanatory content
            if 'why' in query_lower:
                explanation_indicators = ['because', 'reason', 'benefit', 'advantage', 'purpose', 'allows', 'enables', 'performance', 'efficiency']
                explanation_matches = sum(1 for indicator in explanation_indicators if indicator in chunk_lower)
                if explanation_matches > 0:
                    context_boost += min(explanation_matches * 0.15, 0.4)
            
            # Penalty for generic architectural content when asking specific questions
            if len(chunk) > 500 and base_score < 0.2:
                generic_indicators = ['architecture', 'overview', 'introduction', 'general', 'basic']
                generic_matches = sum(1 for indicator in generic_indicators if indicator in chunk_lower)
                if generic_matches > 1:
                    context_boost -= 0.2  # Reduce score for generic content
            
            # Final score
            final_score = max(base_score, expanded_score) + context_boost
            chunk_scores.append((final_score, i, chunk))
        
        # Sort by relevance and return top chunks
        chunk_scores.sort(reverse=True, key=lambda x: x[0])
        relevant_chunks = [chunk for score, i, chunk in chunk_scores[:max_chunks] if score > 0.1]
        
        # If no relevant chunks found, return first few chunks with better filtering
        if not relevant_chunks:
            # Avoid purely generic content
            filtered_chunks = [chunk for chunk in chunks 
                             if not all(generic in chunk.lower() 
                                      for generic in ['architecture', 'overview', 'introduction'])]
            relevant_chunks = filtered_chunks[:max_chunks] if filtered_chunks else chunks[:max_chunks]
        
        logger.info(f"Selected {len(relevant_chunks)} enhanced relevant chunks for query: {query[:50]}...")
        if len(chunk_scores) > 0:
            logger.debug(f"Top chunk score: {chunk_scores[0][0]:.3f}")
        
        return relevant_chunks

# Global instance
_processor = None

def get_document_processor() -> EnhancedDocumentProcessor:
    """Get global document processor instance"""
    global _processor
    if _processor is None:
        _processor = EnhancedDocumentProcessor()
    return _processor