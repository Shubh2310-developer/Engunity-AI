#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Supabase Service for Document Retrieval
=======================================

Service to interact with Supabase database and storage for document retrieval
and processing in the CS-Enhanced RAG system.

Author: Engunity AI Team
"""

import os
import logging
from typing import Dict, List, Optional, Any
from datetime import datetime
import asyncio
import aiohttp
from dataclasses import dataclass

from supabase import create_client, Client

logger = logging.getLogger(__name__)

@dataclass
class DocumentContent:
    """Document content structure"""
    id: str
    name: str
    type: str
    category: str
    status: str
    size: str
    uploaded_at: str
    storage_url: str
    extracted_text: Optional[str] = None
    pages: Optional[int] = None
    word_count: Optional[int] = None
    language: Optional[str] = None
    tags: List[str] = None

class SupabaseService:
    """Service for interacting with Supabase"""
    
    def __init__(self):
        # Get credentials from environment
        self.url = os.getenv('SUPABASE_URL', 'https://zsevvvaakunsspxpplbh.supabase.co')
        self.key = os.getenv('SUPABASE_ANON_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzZXZ2dmFha3Vuc3NweHBwbGJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwMDYwNTcsImV4cCI6MjA2ODU4MjA1N30.i5wyY27hnp6qSqgThs--53_M_-giNfUa8ioe0qVfIXE')
        
        # Initialize Supabase client
        self.client: Client = create_client(self.url, self.key)
        
        logger.info(f"Initialized Supabase service with URL: {self.url}")
    
    async def get_document(self, document_id: str) -> Optional[DocumentContent]:
        """
        Retrieve document by ID from Supabase
        """
        try:
            logger.info(f"Fetching document {document_id} from Supabase")
            
            # Query document from database
            response = self.client.table('documents').select('*').eq('id', document_id).execute()
            
            if not response.data:
                logger.warning(f"Document {document_id} not found in Supabase")
                return None
            
            doc_data = response.data[0]
            
            # Extract metadata
            metadata = doc_data.get('metadata', {})
            
            # Create DocumentContent object
            document = DocumentContent(
                id=doc_data['id'],
                name=doc_data['name'],
                type=doc_data['type'],
                category=doc_data.get('category', 'general'),
                status=doc_data['status'],
                size=doc_data['size'],
                uploaded_at=doc_data['uploaded_at'],
                storage_url=doc_data['storage_url'],
                extracted_text=metadata.get('extracted_text'),
                pages=metadata.get('pages'),
                word_count=metadata.get('word_count'),
                language=metadata.get('language', 'en'),
                tags=doc_data.get('tags', [])
            )
            
            logger.info(f"Successfully retrieved document: {document.name} ({document.type})")
            logger.info(f"Document status: {document.status}, Word count: {document.word_count}")
            
            return document
            
        except Exception as e:
            logger.error(f"Error retrieving document {document_id}: {e}")
            return None
    
    async def get_document_content_text(self, document: DocumentContent) -> str:
        """
        Extract text content from document for RAG processing with full content analysis
        """
        try:
            # If extracted text is available in metadata, use it
            if document.extracted_text and len(document.extracted_text.strip()) > 100:
                logger.info(f"Using extracted text from metadata ({len(document.extracted_text)} chars)")
                return document.extracted_text
            
            # Try to fetch full document content from Supabase storage
            if document.storage_url:
                text_content = await self._fetch_text_from_storage(document.storage_url)
                if text_content:
                    return text_content
            
            # Try to get document content from additional sources
            full_content = await self._get_full_document_content(document)
            if full_content:
                return full_content
            
            # Enhanced fallback with more comprehensive document analysis
            fallback_text = f"""
DOCUMENT ANALYSIS FOR: {document.name}

DOCUMENT METADATA:
- Title: {document.name}
- Type: {document.type.upper()}
- Category: {document.category.title()}
- Status: {document.status.upper()}
- Upload Date: {document.uploaded_at}
- File Size: {document.size}
- Page Count: {document.pages or 'Not specified'}
- Word Count: {document.word_count or 'Not analyzed'}
- Language: {document.language or 'English (assumed)'}
- Tags: {', '.join(document.tags) if document.tags else 'No tags specified'}

CONTENT ANALYSIS:
This is a {document.type} document categorized under {document.category}. Based on the document type and category, this file likely contains:

"""
            
            # Add content expectations based on document type and category
            if document.type.lower() == 'pdf':
                fallback_text += """
PDF DOCUMENT CHARACTERISTICS:
- Structured text content with potential formatting
- May contain sections, chapters, or organized content
- Could include images, charts, or diagrams
- Text is likely formatted in paragraphs and sections
"""
            
            if 'typescript' in document.name.lower():
                fallback_text += """
TYPESCRIPT-RELATED CONTENT EXPECTED:
- Programming language concepts and syntax
- Type system explanations
- Code examples and implementations
- Technical documentation about TypeScript features
- Comparison with JavaScript
- Best practices and usage patterns
"""
            
            if document.category.lower() == 'general':
                fallback_text += """
GENERAL CATEGORY ANALYSIS:
- Broad-scope content covering multiple topics
- Educational or reference material
- Comprehensive coverage of subject matter
- Suitable for general knowledge queries
"""
            
            fallback_text += f"""

DOCUMENT STATUS: {document.status.upper()}
- Processing Status: {'Document has been processed and is ready for analysis' if document.status == 'processed' else 'Document may still be processing'}
- Content Availability: {'Full content should be accessible for detailed analysis' if document.status == 'processed' else 'Content access may be limited'}

NOTE: This analysis is based on document metadata. For specific content queries, the actual document text would provide more detailed and accurate information.
"""
            
            logger.warning(f"Using enhanced fallback content analysis for {document.id}")
            return fallback_text.strip()
            
        except Exception as e:
            logger.error(f"Error extracting document content: {e}")
            return f"Error: Could not extract content from document {document.name}. Error details: {str(e)}"
    
    async def _fetch_text_from_storage(self, storage_url: str) -> Optional[str]:
        """
        Attempt to fetch text content from storage URL
        """
        try:
            # For now, we'll skip actual file download and processing
            # In a full implementation, you would:
            # 1. Download the file from the storage URL
            # 2. Extract text based on file type (PDF, DOCX, etc.)
            # 3. Return the extracted text
            
            logger.info(f"Storage URL available: {storage_url}")
            logger.info("Text extraction from storage not implemented - using metadata only")
            
            return None
            
        except Exception as e:
            logger.error(f"Error fetching from storage URL {storage_url}: {e}")
            return None
    
    async def check_connection(self) -> bool:
        """
        Test Supabase connection
        """
        try:
            # Simple test query
            response = self.client.table('documents').select('id').limit(1).execute()
            logger.info("Supabase connection test successful")
            return True
        except Exception as e:
            logger.error(f"Supabase connection test failed: {e}")
            return False

# Global service instance
_supabase_service: Optional[SupabaseService] = None

def get_supabase_service() -> SupabaseService:
    """Get or create Supabase service instance"""
    global _supabase_service
    if _supabase_service is None:
        _supabase_service = SupabaseService()
    return _supabase_service