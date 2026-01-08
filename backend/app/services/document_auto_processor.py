"""
Document Auto-Processing Service
==================================

Automatically processes uploaded documents to extract:
- Enhanced metadata (word count, page count, reading time)
- Intelligent summarization (executive summary, key points)
- Entity extraction (people, organizations, locations, dates, money)
- Document classification (type, industry, topics)
- Visual analysis (charts, tables, images) - when applicable

This service runs automatically after document upload.

Author: Engunity AI
Version: 1.0.0
"""

import os
import re
import asyncio
import logging
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime
from io import BytesIO

# PDF and document processing
import PyPDF2
import docx
from PIL import Image

# NLP and entity extraction
import spacy
from collections import Counter

# LLM for summarization and classification
from groq import Groq
from dotenv import load_dotenv

# Database
from app.services.document_service import get_document_db
from app.models.document_models import DocumentMetadata

load_dotenv()
logger = logging.getLogger(__name__)

# Load spaCy model for entity extraction
try:
    nlp = spacy.load("en_core_web_sm")
except OSError:
    logger.warning("spaCy model not found. Run: python -m spacy download en_core_web_sm")
    nlp = None

# Initialize Groq client
groq_client = Groq(api_key=os.getenv("GROQ_API_KEY", ""))


class DocumentAutoProcessor:
    """Automatic document processing service"""

    def __init__(self):
        self.db = get_document_db()
        self.groq_client = groq_client
        self.nlp = nlp

    # ============================================================================
    # Main Processing Pipeline
    # ============================================================================

    async def process_document(
        self,
        doc_id: str,
        file_content: bytes,
        filename: str,
        file_type: str
    ) -> bool:
        """
        Main auto-processing pipeline that runs after document upload

        Pipeline:
        1. Extract text content
        2. Extract enhanced metadata
        3. Generate intelligent summary
        4. Extract entities
        5. Classify document and extract topics
        6. Analyze visual elements (if PDF)
        7. Update database with all extracted data
        """
        try:
            logger.info(f"🚀 Starting auto-processing for document: {doc_id}")

            # Update status to processing
            await self.db.update_document(doc_id, {"processing_status": "processing"})

            # Step 1: Extract text content
            logger.info(f"📄 Extracting text from {file_type} file...")
            text_content = await self.extract_text(file_content, file_type)

            if not text_content or len(text_content.strip()) < 50:
                logger.error(f"❌ Failed to extract meaningful text from document")
                await self.db.update_document(doc_id, {
                    "processing_status": "failed",
                    "error_message": "Could not extract text from document"
                })
                return False

            # Step 2: Extract enhanced metadata
            logger.info(f"📊 Extracting enhanced metadata...")
            metadata = await self.extract_enhanced_metadata(
                text_content,
                file_content,
                file_type
            )

            # Step 3: Generate intelligent summary
            logger.info(f"✨ Generating intelligent summary...")
            summary_data = await self.generate_summary(text_content, filename)

            # Step 4: Extract entities
            logger.info(f"🏷️ Extracting entities...")
            entities = await self.extract_entities(text_content)

            # Step 5: Classify document and extract topics
            logger.info(f"🔍 Classifying document and extracting topics...")
            classification = await self.classify_document(text_content, filename)

            # Step 6: Analyze visual elements (for PDFs)
            visual_analysis = None
            if file_type.lower() == 'pdf':
                logger.info(f"🖼️ Analyzing visual elements...")
                visual_analysis = await self.analyze_visual_elements(file_content)

            # Step 7: Update database with all extracted data
            logger.info(f"💾 Updating database with processed data...")
            update_data = {
                "text_content": text_content[:10000],  # Store first 10k chars
                "metadata": {
                    **metadata,
                    "document_type": classification.get("document_type"),
                    "industry": classification.get("industry"),
                    "topics": classification.get("topics", []),
                    "sentiment": classification.get("sentiment"),
                    "complexity_score": classification.get("complexity_score"),
                    "entities": entities,
                },
                "summary": summary_data.get("executive_summary"),
                "key_points": summary_data.get("key_points", []),
                "extracted_entities": entities,
                "tags": classification.get("topics", [])[:10],  # Top 10 topics as tags
                "chunk_count": metadata.get("chunk_count", 0),
                "processing_status": "ready",
                "last_modified": datetime.utcnow()
            }

            if visual_analysis:
                update_data["visual_elements"] = visual_analysis

            await self.db.update_document(doc_id, update_data)

            logger.info(f"✅ Successfully processed document: {doc_id}")
            logger.info(f"   - Words: {metadata.get('word_count')}")
            logger.info(f"   - Pages: {metadata.get('page_count')}")
            logger.info(f"   - Type: {classification.get('document_type')}")
            logger.info(f"   - Topics: {len(classification.get('topics', []))}")
            logger.info(f"   - Entities: {sum(len(v) for v in entities.values())}")

            return True

        except Exception as e:
            logger.error(f"❌ Error processing document {doc_id}: {e}", exc_info=True)
            await self.db.update_document(doc_id, {
                "processing_status": "failed",
                "error_message": str(e)
            })
            return False

    # ============================================================================
    # Text Extraction
    # ============================================================================

    async def extract_text(self, file_content: bytes, file_type: str) -> Optional[str]:
        """Extract text from various file formats"""
        try:
            file_type = file_type.lower()

            if file_type == 'pdf':
                return await self._extract_text_from_pdf(file_content)
            elif file_type in ['docx', 'doc']:
                return await self._extract_text_from_docx(file_content)
            elif file_type in ['txt', 'md', 'markdown']:
                return file_content.decode('utf-8', errors='ignore')
            else:
                logger.warning(f"Unsupported file type: {file_type}")
                return None

        except Exception as e:
            logger.error(f"Error extracting text: {e}")
            return None

    async def _extract_text_from_pdf(self, file_content: bytes) -> Optional[str]:
        """Extract text from PDF"""
        try:
            pdf_file = BytesIO(file_content)
            pdf_reader = PyPDF2.PdfReader(pdf_file)

            text_parts = []
            for page_num, page in enumerate(pdf_reader.pages):
                try:
                    text = page.extract_text()
                    if text:
                        text_parts.append(text)
                except Exception as e:
                    logger.warning(f"Error extracting page {page_num}: {e}")
                    continue

            return "\n\n".join(text_parts)

        except Exception as e:
            logger.error(f"Error extracting PDF text: {e}")
            return None

    async def _extract_text_from_docx(self, file_content: bytes) -> Optional[str]:
        """Extract text from DOCX"""
        try:
            docx_file = BytesIO(file_content)
            doc = docx.Document(docx_file)

            text_parts = []
            for paragraph in doc.paragraphs:
                if paragraph.text.strip():
                    text_parts.append(paragraph.text)

            return "\n\n".join(text_parts)

        except Exception as e:
            logger.error(f"Error extracting DOCX text: {e}")
            return None

    # ============================================================================
    # Enhanced Metadata Extraction
    # ============================================================================

    async def extract_enhanced_metadata(
        self,
        text_content: str,
        file_content: bytes,
        file_type: str
    ) -> Dict[str, Any]:
        """Extract enhanced metadata from document"""

        metadata = {
            "file_size_bytes": len(file_content),
            "file_type": file_type.lower(),
            "mime_type": self._get_mime_type(file_type)
        }

        # Basic text statistics
        words = text_content.split()
        metadata["word_count"] = len(words)
        metadata["reading_time_minutes"] = round(len(words) / 200, 1)  # 200 words/min

        # Page count estimation
        if file_type.lower() == 'pdf':
            try:
                pdf_reader = PyPDF2.PdfReader(BytesIO(file_content))
                metadata["page_count"] = len(pdf_reader.pages)
            except:
                metadata["page_count"] = max(1, len(words) // 300)  # Estimate
        else:
            metadata["page_count"] = max(1, len(words) // 300)  # ~300 words per page

        # Language detection (simple heuristic)
        metadata["language"] = "en"  # Default to English

        # Complexity score (based on avg word length and sentence length)
        avg_word_length = sum(len(word) for word in words) / max(len(words), 1)
        sentences = text_content.split('.')
        avg_sentence_length = len(words) / max(len(sentences), 1)

        complexity = (avg_word_length * 0.3 + avg_sentence_length * 0.7) / 10
        metadata["complexity_score"] = min(round(complexity, 2), 1.0)

        # Chunk count for RAG
        chunk_size = 600
        chunk_overlap = 150
        estimated_chunks = max(1, len(words) // (chunk_size - chunk_overlap))
        metadata["chunk_count"] = estimated_chunks

        return metadata

    def _get_mime_type(self, file_type: str) -> str:
        """Get MIME type from file extension"""
        mime_types = {
            'pdf': 'application/pdf',
            'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'doc': 'application/msword',
            'txt': 'text/plain',
            'md': 'text/markdown',
            'markdown': 'text/markdown'
        }
        return mime_types.get(file_type.lower(), 'application/octet-stream')

    # ============================================================================
    # Intelligent Summarization
    # ============================================================================

    async def generate_summary(
        self,
        text_content: str,
        filename: str
    ) -> Dict[str, Any]:
        """Generate intelligent summary using Groq LLM"""

        # Truncate text for API limits (use first ~8000 words)
        words = text_content.split()
        truncated_text = ' '.join(words[:8000])

        try:
            # Executive Summary
            executive_summary = await self._generate_executive_summary(truncated_text, filename)

            # Key Points
            key_points = await self._generate_key_points(truncated_text)

            return {
                "executive_summary": executive_summary,
                "key_points": key_points
            }

        except Exception as e:
            logger.error(f"Error generating summary: {e}")
            return {
                "executive_summary": f"Document: {filename}",
                "key_points": []
            }

    async def _generate_executive_summary(self, text: str, filename: str) -> str:
        """Generate 1-paragraph executive summary"""

        prompt = f"""Analyze the following document and provide a concise executive summary in 2-3 sentences.
Focus on the main purpose, key findings, and strategic implications.

Document: {filename}

Content:
{text[:4000]}

Executive Summary:"""

        try:
            response = self.groq_client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {"role": "system", "content": "You are an expert at summarizing documents concisely and accurately."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                max_tokens=300
            )

            summary = response.choices[0].message.content.strip()
            return summary

        except Exception as e:
            logger.error(f"Error generating executive summary: {e}")
            return f"Summary not available. Document: {filename}"

    async def _generate_key_points(self, text: str) -> List[str]:
        """Extract 5-10 key points from document"""

        prompt = f"""Extract 5-10 key points from the following document as a bullet list.
Focus on the most important facts, findings, decisions, and action items.

Content:
{text[:4000]}

Key Points (return as a simple numbered list):"""

        try:
            response = self.groq_client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {"role": "system", "content": "You are an expert at extracting key insights from documents."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                max_tokens=500
            )

            content = response.choices[0].message.content.strip()

            # Parse numbered or bulleted list
            points = []
            for line in content.split('\n'):
                line = line.strip()
                # Remove numbering or bullets
                cleaned = re.sub(r'^[\d\-\*\•\.]+\s*', '', line)
                if cleaned and len(cleaned) > 10:
                    points.append(cleaned)

            return points[:10]  # Max 10 points

        except Exception as e:
            logger.error(f"Error generating key points: {e}")
            return []

    # ============================================================================
    # Entity Extraction
    # ============================================================================

    async def extract_entities(self, text_content: str) -> Dict[str, List[str]]:
        """Extract named entities using spaCy"""

        entities = {
            "people": [],
            "organizations": [],
            "locations": [],
            "dates": [],
            "money": [],
            "products": [],
            "technologies": []
        }

        if not self.nlp:
            logger.warning("spaCy model not loaded. Skipping entity extraction.")
            return entities

        try:
            # Process text (limit to first 100k chars for performance)
            doc = self.nlp(text_content[:100000])

            # Extract entities
            for ent in doc.ents:
                entity_text = ent.text.strip()

                if ent.label_ == "PERSON":
                    entities["people"].append(entity_text)
                elif ent.label_ == "ORG":
                    entities["organizations"].append(entity_text)
                elif ent.label_ in ["GPE", "LOC"]:
                    entities["locations"].append(entity_text)
                elif ent.label_ == "DATE":
                    entities["dates"].append(entity_text)
                elif ent.label_ == "MONEY":
                    entities["money"].append(entity_text)
                elif ent.label_ == "PRODUCT":
                    entities["products"].append(entity_text)

            # Deduplicate and count
            for key in entities:
                # Count occurrences
                counter = Counter(entities[key])
                # Get top 20 most common, preserving order of importance
                entities[key] = [item for item, count in counter.most_common(20)]

            # Extract technology keywords (simple pattern matching)
            tech_keywords = self._extract_technology_keywords(text_content)
            entities["technologies"] = tech_keywords

            return entities

        except Exception as e:
            logger.error(f"Error extracting entities: {e}")
            return entities

    def _extract_technology_keywords(self, text: str) -> List[str]:
        """Extract technology-related keywords"""

        tech_patterns = [
            r'\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(?:API|SDK|Framework|Library|Platform|Engine)\b',
            r'\b(?:AI|ML|NLP|LLM|GPT|API|REST|GraphQL|SQL|NoSQL|MongoDB|PostgreSQL|Redis|Docker|Kubernetes|AWS|Azure|GCP)\b',
            r'\b(?:Python|Java|JavaScript|TypeScript|React|Vue|Angular|Node\.js|Django|Flask|FastAPI)\b',
            r'\b(?:Machine Learning|Deep Learning|Neural Network|Transformer|BERT|GPT|LLaMA)\b'
        ]

        technologies = []
        for pattern in tech_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            technologies.extend(matches)

        # Deduplicate and return top 15
        counter = Counter([tech.strip() for tech in technologies if tech.strip()])
        return [tech for tech, count in counter.most_common(15)]

    # ============================================================================
    # Document Classification
    # ============================================================================

    async def classify_document(
        self,
        text_content: str,
        filename: str
    ) -> Dict[str, Any]:
        """Classify document type, industry, topics, and sentiment"""

        # Use first 3000 words for classification
        words = text_content.split()
        sample_text = ' '.join(words[:3000])

        prompt = f"""Analyze the following document and classify it.

Document: {filename}

Content:
{sample_text}

Provide the following classification in JSON format:
{{
    "document_type": "one of: report, contract, proposal, research_paper, technical_documentation, product_spec, business_plan, legal_document, financial_report, presentation, handbook, policy, whitepaper, case_study, other",
    "industry": "industry or domain (e.g., technology, healthcare, finance, education, legal, manufacturing, etc.)",
    "topics": ["list", "of", "5-7", "main", "topics", "or", "keywords"],
    "sentiment": "one of: positive, negative, neutral, mixed",
    "complexity_score": 0.0-1.0 (0=simple, 1=highly complex)
}}

Return ONLY the JSON, no other text."""

        try:
            response = self.groq_client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {"role": "system", "content": "You are an expert document classifier. Return only valid JSON."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.2,
                max_tokens=300
            )

            content = response.choices[0].message.content.strip()

            # Extract JSON from response
            import json
            # Find JSON object in response
            json_match = re.search(r'\{.*\}', content, re.DOTALL)
            if json_match:
                classification = json.loads(json_match.group())
                return classification
            else:
                logger.warning("Could not parse classification JSON")
                return self._get_default_classification()

        except Exception as e:
            logger.error(f"Error classifying document: {e}")
            return self._get_default_classification()

    def _get_default_classification(self) -> Dict[str, Any]:
        """Return default classification when LLM fails"""
        return {
            "document_type": "other",
            "industry": "general",
            "topics": [],
            "sentiment": "neutral",
            "complexity_score": 0.5
        }

    # ============================================================================
    # Visual Analysis (PDF)
    # ============================================================================

    async def analyze_visual_elements(self, file_content: bytes) -> Optional[Dict[str, Any]]:
        """Analyze visual elements in PDF (charts, tables, images)"""

        try:
            pdf_file = BytesIO(file_content)
            pdf_reader = PyPDF2.PdfReader(pdf_file)

            visual_elements = {
                "has_images": False,
                "image_count": 0,
                "has_tables": False,
                "table_count": 0,
                "pages_with_visuals": []
            }

            # Simple heuristic: check for image objects in PDF
            for page_num, page in enumerate(pdf_reader.pages):
                try:
                    if '/XObject' in page['/Resources']:
                        xobjects = page['/Resources']['/XObject'].get_object()

                        for obj in xobjects:
                            if xobjects[obj]['/Subtype'] == '/Image':
                                visual_elements["has_images"] = True
                                visual_elements["image_count"] += 1
                                if page_num not in visual_elements["pages_with_visuals"]:
                                    visual_elements["pages_with_visuals"].append(page_num + 1)

                except Exception as e:
                    logger.debug(f"Could not analyze page {page_num}: {e}")
                    continue

            # Simple table detection (look for common table patterns in text)
            # This is basic - for advanced table extraction, use pdfplumber or camelot
            text = await self._extract_text_from_pdf(file_content)
            if text:
                # Look for table-like patterns
                lines = text.split('\n')
                table_indicators = 0
                for line in lines:
                    # Count lines with multiple tab/space separated numbers or pipe characters
                    if re.search(r'(\d+\s+){3,}|\|.*\|.*\|', line):
                        table_indicators += 1

                if table_indicators > 5:
                    visual_elements["has_tables"] = True
                    visual_elements["table_count"] = table_indicators // 5  # Rough estimate

            return visual_elements

        except Exception as e:
            logger.error(f"Error analyzing visual elements: {e}")
            return None


# ============================================================================
# Singleton Instance
# ============================================================================

_processor_instance = None


def get_document_processor() -> DocumentAutoProcessor:
    """Get singleton instance of document processor"""
    global _processor_instance
    if _processor_instance is None:
        _processor_instance = DocumentAutoProcessor()
    return _processor_instance
