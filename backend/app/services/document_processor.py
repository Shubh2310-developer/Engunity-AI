"""
Document Processing Service
Handles PDF processing, text extraction, citation extraction, and AI analysis
"""

import os
import re
import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional, Tuple
import asyncio
import logging
from pathlib import Path

# PDF processing
import PyPDF2
import pdfplumber
from io import BytesIO

# Text processing
import nltk
from nltk.tokenize import sent_tokenize, word_tokenize
from nltk.corpus import stopwords

# For citation extraction
import requests
import json

from app.models.research_models import (
    ResearchDocument, Citation, DocumentSummary, LiteratureAnalysis,
    DocumentStatus, CitationType
)
from app.services.database import db_service

logger = logging.getLogger(__name__)

# Download required NLTK data
try:
    nltk.data.find('tokenizers/punkt')
except LookupError:
    nltk.download('punkt')

try:
    nltk.data.find('corpora/stopwords')
except LookupError:
    nltk.download('stopwords')

class DocumentProcessor:
    def __init__(self):
        self.citation_patterns = [
            # Pattern matching for different citation formats
            r'\[(\d+)\]',  # [1]
            r'\[(\d+[-,\s\d]*)\]',  # [1,2,3] or [1-3]
            r'\(([A-Za-z]+(?:\s+et\s+al\.?)?,?\s*\d{4}[a-z]?)\)',  # (Smith et al., 2020)
            r'\[([A-Za-z]+(?:\s+et\s+al\.?)?,?\s*\d{4}[a-z]?)\]',  # [Smith et al., 2020]
            r'([A-Za-z]+(?:\s+et\s+al\.)?)\s*\((\d{4}[a-z]?)\)',  # Smith et al. (2020)
        ]
        
        self.reference_patterns = [
            # Reference section patterns
            r'(\d+)\.\s*([^.]+\.(?:\s+[^.]+\.)*)',  # Numbered references
            r'([A-Za-z]+(?:,\s*[A-Z]\.)(?:,\s*et\s+al\.)?),?\s*\((\d{4})\)\.?\s*([^.]+\.)',  # Author (year) format
        ]
    
    async def process_document(self, document_id: str, file_data: bytes, filename: str) -> bool:
        """
        Complete document processing pipeline
        1. Extract text from PDF
        2. Extract citations
        3. Generate summary
        4. Perform literature analysis
        5. Update database
        """
        try:
            logger.info(f"Starting processing for document: {document_id}")
            
            # Update status to processing
            await db_service.update_document_status(document_id, DocumentStatus.PROCESSING)
            
            # Step 1: Extract text from PDF
            logger.info(f"Extracting text from PDF: {filename}")
            raw_text = await self.extract_text_from_pdf(file_data)
            if not raw_text:
                await db_service.update_document_status(document_id, DocumentStatus.FAILED)
                return False
            
            # Step 2: Extract citations
            logger.info(f"Extracting citations from document")
            citations = await self.extract_citations(raw_text, document_id)
            
            # Step 3: Generate summary
            logger.info(f"Generating document summary")
            summary = await self.generate_summary(raw_text)
            
            # Step 4: Perform literature analysis
            logger.info(f"Performing literature analysis")
            literature_analysis = await self.analyze_literature(raw_text, citations)
            
            # Step 5: Update database with all extracted content
            await db_service.update_document_content(
                document_id,
                raw_text=raw_text,
                summary=summary.dict() if summary else None,
                literature_analysis=literature_analysis.dict() if literature_analysis else None,
                status=DocumentStatus.PROCESSED.value,
                processing_completed_at=datetime.utcnow()
            )
            
            # Add citations separately
            if citations:
                await db_service.add_citations(document_id, citations)
            
            logger.info(f"Document processing completed: {document_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error processing document {document_id}: {e}")
            await db_service.update_document_status(document_id, DocumentStatus.FAILED)
            return False
    
    async def extract_text_from_pdf(self, file_data: bytes) -> Optional[str]:
        """Extract text content from PDF file"""
        try:
            # Try pdfplumber first (better for complex layouts)
            pdf_file = BytesIO(file_data)
            
            text_content = []
            with pdfplumber.open(pdf_file) as pdf:
                for page in pdf.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text_content.append(page_text)
            
            if text_content:
                return '\n\n'.join(text_content)
            
            # Fallback to PyPDF2
            pdf_file.seek(0)
            pdf_reader = PyPDF2.PdfReader(pdf_file)
            
            text_content = []
            for page in pdf_reader.pages:
                page_text = page.extract_text()
                if page_text:
                    text_content.append(page_text)
            
            return '\n\n'.join(text_content) if text_content else None
            
        except Exception as e:
            logger.error(f"Error extracting text from PDF: {e}")
            return None
    
    async def extract_citations(self, text: str, document_id: str) -> List[Citation]:
        """Extract citations from document text"""
        try:
            citations = []
            
            # Find reference section
            references_text = self.find_reference_section(text)
            if not references_text:
                logger.warning("No reference section found, extracting inline citations only")
                references_text = text
            
            # Extract numbered references
            numbered_refs = self.extract_numbered_references(references_text)
            
            # Extract inline citations and match with references
            inline_citations = self.extract_inline_citations(text)
            
            # Create citation objects
            citation_id_counter = 1
            for ref in numbered_refs:
                citation = Citation(
                    id=f"{document_id}_citation_{citation_id_counter}",
                    number=citation_id_counter,
                    title=ref.get('title', ''),
                    authors=ref.get('authors', []),
                    journal=ref.get('journal', ''),
                    year=ref.get('year'),
                    pages=ref.get('pages', ''),
                    url=ref.get('url', ''),
                    citation_text=ref.get('full_text', ''),
                    format="APA",
                    note="",
                    type=self.determine_citation_type(ref.get('full_text', ''))
                )
                citations.append(citation)
                citation_id_counter += 1
            
            logger.info(f"Extracted {len(citations)} citations")
            return citations
            
        except Exception as e:
            logger.error(f"Error extracting citations: {e}")
            return []
    
    def find_reference_section(self, text: str) -> Optional[str]:
        """Find and extract the reference section from document"""
        # Common reference section headers
        ref_headers = [
            r'\bREFERENCES\b',
            r'\bBIBLIOGRAPHY\b',
            r'\bWORKS\s+CITED\b',
            r'\bLITERATURE\s+CITED\b',
            r'\bSOURCES\b'
        ]
        
        for header in ref_headers:
            match = re.search(header, text, re.IGNORECASE | re.MULTILINE)
            if match:
                # Extract from header to end of document or next major section
                ref_start = match.start()
                
                # Look for end markers (appendix, acknowledgments, etc.)
                end_markers = [
                    r'\bAPPENDIX\b',
                    r'\bACKNOWLEDGMENTS?\b',
                    r'\bAUTHOR\s+INFORMATION\b',
                    r'\bSUPPLEMENTARY\s+MATERIAL\b'
                ]
                
                ref_end = len(text)
                for end_marker in end_markers:
                    end_match = re.search(end_marker, text[ref_start:], re.IGNORECASE)
                    if end_match:
                        ref_end = ref_start + end_match.start()
                        break
                
                return text[ref_start:ref_end]
        
        return None
    
    def extract_numbered_references(self, text: str) -> List[Dict[str, Any]]:
        """Extract numbered references from reference section"""
        references = []
        
        # Split into potential reference entries
        # Look for patterns like "1. ", "2. ", etc.
        ref_pattern = r'(\d+)\.\s+([^\n]+(?:\n(?!\d+\.)[^\n]+)*)'
        matches = re.findall(ref_pattern, text, re.MULTILINE)
        
        for number, ref_text in matches:
            ref_info = self.parse_reference_text(ref_text.strip())
            ref_info['number'] = int(number)
            ref_info['full_text'] = ref_text.strip()
            references.append(ref_info)
        
        return references
    
    def parse_reference_text(self, ref_text: str) -> Dict[str, Any]:
        """Parse individual reference text to extract components"""
        ref_info = {
            'title': '',
            'authors': [],
            'journal': '',
            'year': None,
            'pages': '',
            'url': ''
        }
        
        try:
            # Extract year
            year_match = re.search(r'\b(19|20)\d{2}\b', ref_text)
            if year_match:
                ref_info['year'] = int(year_match.group())
            
            # Extract URL
            url_match = re.search(r'https?://[^\s]+', ref_text)
            if url_match:
                ref_info['url'] = url_match.group()
            
            # Extract DOI
            doi_match = re.search(r'doi:\s*([^\s]+)', ref_text, re.IGNORECASE)
            if doi_match:
                ref_info['url'] = f"https://doi.org/{doi_match.group(1)}"
            
            # Basic title extraction (text in quotes or after authors)
            title_match = re.search(r'"([^"]+)"', ref_text)
            if title_match:
                ref_info['title'] = title_match.group(1)
            elif '.' in ref_text:
                # Try to extract title as text between first and second period
                parts = ref_text.split('.')
                if len(parts) > 1:
                    potential_title = parts[1].strip()
                    if len(potential_title) > 10:  # Reasonable title length
                        ref_info['title'] = potential_title
            
            # Extract authors (simplified - first part before year or title)
            author_part = ref_text.split('.')[0] if '.' in ref_text else ref_text
            if ref_info['year']:
                year_str = str(ref_info['year'])
                if year_str in author_part:
                    author_part = author_part.split(year_str)[0]
            
            # Basic author parsing
            authors = []
            if 'et al' in author_part.lower():
                # Handle et al. cases
                main_author = author_part.split('et al')[0].strip().rstrip(',')
                if main_author:
                    authors.append(main_author)
            else:
                # Split by commas and clean up
                potential_authors = [a.strip() for a in author_part.split(',')]
                authors = [a for a in potential_authors if len(a) > 2 and not re.match(r'^\d+$', a)]
            
            ref_info['authors'] = authors[:5]  # Limit to first 5 authors
            
        except Exception as e:
            logger.warning(f"Error parsing reference: {e}")
        
        return ref_info
    
    def extract_inline_citations(self, text: str) -> List[Dict[str, Any]]:
        """Extract inline citations from document text"""
        inline_citations = []
        
        for pattern in self.citation_patterns:
            matches = re.finditer(pattern, text)
            for match in matches:
                context_start = max(0, match.start() - 100)
                context_end = min(len(text), match.end() + 100)
                context = text[context_start:context_end]
                
                inline_citations.append({
                    'match': match.group(),
                    'context': context,
                    'position': match.start()
                })
        
        return inline_citations
    
    def determine_citation_type(self, citation_text: str) -> str:
        """Determine citation type (journal, conference, preprint, etc.)"""
        text_lower = citation_text.lower()
        
        if any(term in text_lower for term in ['journal', 'j.', 'transactions']):
            return 'journal'
        elif any(term in text_lower for term in ['conference', 'proceedings', 'workshop', 'symposium']):
            return 'conference'
        elif any(term in text_lower for term in ['arxiv', 'preprint', 'bioRxiv']):
            return 'preprint'
        elif any(term in text_lower for term in ['book', 'chapter', 'press']):
            return 'book'
        else:
            return 'journal'  # Default
    
    async def generate_summary(self, text: str) -> Optional[DocumentSummary]:
        """Generate document summary using AI"""
        try:
            # Basic text analysis
            sentences = sent_tokenize(text)
            words = word_tokenize(text.lower())
            word_count = len([w for w in words if w.isalnum()])
            
            # Extract abstract if available
            abstract = self.extract_abstract(text)
            
            # Generate key points (simplified)
            key_points = self.extract_key_points(text)
            
            # Extract topics/keywords
            topics = self.extract_topics(text)
            
            summary = DocumentSummary(
                abstract=abstract,
                key_points=key_points,
                topics=topics,
                word_count=word_count,
                page_count=len(text.split('\n\n')) // 30,  # Rough page estimate
                confidence_scores={
                    'abstract': 0.8 if abstract else 0.0,
                    'key_points': 0.7,
                    'topics': 0.6
                },
                processing_time=1.0
            )
            
            return summary
            
        except Exception as e:
            logger.error(f"Error generating summary: {e}")
            return None
    
    def extract_abstract(self, text: str) -> Optional[str]:
        """Extract abstract from document"""
        # Look for abstract section
        abstract_pattern = r'\bABSTRACT\b[\s\n]+(.*?)(?=\n\s*\n|\b(?:INTRODUCTION|1\.?\s+INTRODUCTION)\b)'
        match = re.search(abstract_pattern, text, re.IGNORECASE | re.DOTALL)
        
        if match:
            abstract = match.group(1).strip()
            # Clean up the abstract
            abstract = re.sub(r'\s+', ' ', abstract)
            if 50 < len(abstract) < 2000:  # Reasonable abstract length
                return abstract
        
        return None
    
    def extract_key_points(self, text: str) -> List[str]:
        """Extract key points from document"""
        key_points = []
        
        # Look for numbered points, bullet points, or conclusion statements
        patterns = [
            r'(?:^|\n)\s*[•\-\*]\s*([^.\n]+[.\n])',  # Bullet points
            r'(?:^|\n)\s*\d+[\.)]\s*([^.\n]+[.\n])',  # Numbered points
            r'(?:we|this\s+(?:paper|study|work))\s+(?:show|demonstrate|find|conclude)\s+that\s+([^.]+)',  # Findings
        ]
        
        for pattern in patterns:
            matches = re.findall(pattern, text, re.IGNORECASE | re.MULTILINE)
            for match in matches[:3]:  # Limit to 3 per pattern
                point = match.strip()
                if 20 < len(point) < 200:  # Reasonable length
                    key_points.append(point)
        
        # If no structured points found, extract important sentences
        if not key_points:
            sentences = sent_tokenize(text)
            important_keywords = ['significant', 'important', 'novel', 'propose', 'demonstrate', 'conclude']
            
            for sentence in sentences:
                if any(keyword in sentence.lower() for keyword in important_keywords):
                    if 50 < len(sentence) < 300:
                        key_points.append(sentence)
                        if len(key_points) >= 3:
                            break
        
        return key_points[:5]  # Limit to 5 key points
    
    def extract_topics(self, text: str) -> List[str]:
        """Extract topics and keywords from document"""
        # Common academic topics and keywords
        topic_keywords = {
            'Machine Learning': ['machine learning', 'neural network', 'deep learning', 'algorithm'],
            'Natural Language Processing': ['nlp', 'text processing', 'language model', 'tokenization'],
            'Computer Vision': ['computer vision', 'image processing', 'object detection', 'CNN'],
            'Data Science': ['data analysis', 'statistics', 'big data', 'analytics'],
            'Artificial Intelligence': ['artificial intelligence', 'AI', 'intelligent system'],
            'Research Methods': ['methodology', 'experimental', 'evaluation', 'benchmark'],
            'Software Engineering': ['software', 'programming', 'development', 'system'],
        }
        
        topics = []
        text_lower = text.lower()
        
        for topic, keywords in topic_keywords.items():
            if any(keyword in text_lower for keyword in keywords):
                topics.append(topic)
        
        # Add specific technical terms found
        technical_terms = re.findall(r'\b[A-Z][A-Za-z]*(?:\s+[A-Z][A-Za-z]*)*\b', text)
        common_terms = {}
        
        for term in technical_terms:
            if 3 < len(term) < 30 and not term.isupper():  # Filter reasonable terms
                common_terms[term] = common_terms.get(term, 0) + 1
        
        # Add frequently mentioned technical terms
        frequent_terms = [term for term, count in common_terms.items() if count > 3]
        topics.extend(frequent_terms[:5])
        
        return topics[:10]  # Limit to 10 topics
    
    async def analyze_literature(self, text: str, citations: List[Citation]) -> Optional[LiteratureAnalysis]:
        """Perform literature analysis"""
        try:
            # Extract methodology section
            methodology = self.extract_methodology(text)
            
            # Identify findings
            findings = self.extract_findings(text)
            
            # Identify limitations
            limitations = self.extract_limitations(text)
            
            # Extract future work
            future_work = self.extract_future_work(text)
            
            # Determine research domain
            research_domain = self.determine_research_domain(text, citations)
            
            analysis = LiteratureAnalysis(
                methodology=methodology,
                findings=findings,
                limitations=limitations,
                future_work=future_work,
                related_papers=[cite.title for cite in citations[:5]],
                research_domain=research_domain,
                significance_score=0.75  # Default significance score
            )
            
            return analysis
            
        except Exception as e:
            logger.error(f"Error in literature analysis: {e}")
            return None
    
    def extract_methodology(self, text: str) -> Optional[str]:
        """Extract methodology section"""
        method_patterns = [
            r'\b(?:METHODOLOGY|METHODS?|APPROACH|EXPERIMENTAL\s+SETUP)\b[\s\n]+(.*?)(?=\n\s*\n|\b(?:RESULTS?|EVALUATION|CONCLUSION)\b)',
        ]
        
        for pattern in method_patterns:
            match = re.search(pattern, text, re.IGNORECASE | re.DOTALL)
            if match:
                method_text = match.group(1).strip()
                if 100 < len(method_text) < 1500:
                    return re.sub(r'\s+', ' ', method_text)
        
        return None
    
    def extract_findings(self, text: str) -> List[str]:
        """Extract key findings from document"""
        findings = []
        
        finding_patterns = [
            r'(?:we|our\s+(?:results?|findings?|analysis))\s+(?:show|demonstrate|indicate|reveal|suggest)\s+(?:that\s+)?([^.]+)',
            r'(?:the\s+(?:results?|findings?|analysis))\s+(?:show|demonstrate|indicate|reveal|suggest)\s+(?:that\s+)?([^.]+)',
        ]
        
        for pattern in finding_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            for match in matches:
                finding = match.strip()
                if 20 < len(finding) < 200:
                    findings.append(finding)
        
        return findings[:5]
    
    def extract_limitations(self, text: str) -> List[str]:
        """Extract limitations from document"""
        limitations = []
        
        # Look for limitations section or mention of limitations
        limitation_pattern = r'(?:limitation|constraint|shortcoming|weakness)s?[^.]*([^.]+\.)'
        matches = re.findall(limitation_pattern, text, re.IGNORECASE)
        
        for match in matches:
            limitation = match.strip()
            if 20 < len(limitation) < 200:
                limitations.append(limitation)
        
        return limitations[:3]
    
    def extract_future_work(self, text: str) -> List[str]:
        """Extract future work suggestions"""
        future_work = []
        
        future_patterns = [
            r'(?:future\s+work|future\s+research|future\s+studies)[^.]*([^.]+\.)',
            r'(?:in\s+the\s+future|going\s+forward)[^.]*([^.]+\.)',
        ]
        
        for pattern in future_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            for match in matches:
                work = match.strip()
                if 20 < len(work) < 200:
                    future_work.append(work)
        
        return future_work[:3]
    
    def determine_research_domain(self, text: str, citations: List[Citation]) -> Optional[str]:
        """Determine the research domain based on content and citations"""
        domains = {
            'Computer Science': ['algorithm', 'computation', 'software', 'programming'],
            'Machine Learning': ['machine learning', 'neural network', 'training', 'model'],
            'Data Science': ['data', 'analysis', 'statistics', 'dataset'],
            'Artificial Intelligence': ['artificial intelligence', 'AI', 'intelligent'],
            'Natural Language Processing': ['language', 'text', 'nlp', 'linguistic'],
            'Computer Vision': ['vision', 'image', 'visual', 'recognition'],
            'Robotics': ['robot', 'robotic', 'autonomous', 'control'],
        }
        
        text_lower = text.lower()
        domain_scores = {}
        
        for domain, keywords in domains.items():
            score = sum(text_lower.count(keyword) for keyword in keywords)
            domain_scores[domain] = score
        
        if domain_scores:
            best_domain = max(domain_scores, key=domain_scores.get)
            if domain_scores[best_domain] > 3:  # Minimum threshold
                return best_domain
        
        return 'General Research'

# Global document processor instance
document_processor = DocumentProcessor()