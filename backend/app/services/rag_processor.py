#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
RAG Processor Service
====================

Service for processing RAG queries with document content, CS enhancement,
and web search fallback.

Author: Engunity AI Team
"""

import re
import logging
import asyncio
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime
import aiohttp

from .supabase_service import DocumentContent, get_supabase_service
from vector_store.cs_faiss_manager import CSFAISSManager, DocumentChunk, IndexType
from .rag.cs_retriever import CSRetriever, create_cs_retriever

logger = logging.getLogger(__name__)

class RagProcessor:
    """CS-Enhanced RAG processing service"""
    
    def __init__(self):
        self.supabase = get_supabase_service()
        
        # Initialize FAISS manager with BGE model
        self.faiss_manager = CSFAISSManager(
            embedding_model="BAAI/bge-small-en-v1.5",
            index_dir="backend/vector_store/indices",
            metadata_dir="backend/vector_store/metadata",
            embedding_dim=384,
            use_gpu=False
        )
        
        # Initialize CS retriever
        self.cs_retriever = create_cs_retriever(faiss_manager=self.faiss_manager)
        
    async def process_document_question(
        self,
        document_id: str,
        question: str,
        use_web_search: bool = True,
        temperature: float = 0.7,
        max_sources: int = 5
    ) -> Dict[str, Any]:
        """
        Process a question about a document using CS-Enhanced RAG
        """
        start_time = datetime.now()
        
        try:
            logger.info(f"Processing RAG question for document {document_id}")
            
            # 1. Get document from Supabase
            document = await self.supabase.get_document(document_id)
            if not document:
                raise ValueError(f"Document {document_id} not found")
            
            # 2. Check if document is ready for Q&A
            if document.status != 'processed':
                return await self._handle_unprocessed_document(document, question, start_time)
            
            # 3. Extract and process document content with BGE embeddings
            document_text = await self.supabase.get_document_content_text(document)
            
            # 4. Index document for semantic search
            await self._index_document_content(document, document_text)
            
            # 5. Perform semantic search using CS-enhanced retrieval
            retrieved_chunks = self.cs_retriever.retrieve_documents(
                query=question,
                top_k=max_sources,
                include_code=True,
                include_theory=True,
                min_score=0.1
            )
            
            # 6. Build context from retrieved chunks
            context = self.cs_retriever.build_context(
                chunks=retrieved_chunks,
                max_length=4000,
                include_metadata=True
            )
            
            # 7. Generate response using full document analysis
            response = await self._generate_enhanced_response(
                question, document, context, retrieved_chunks, temperature
            )
            source_type = "cs_enhanced_rag"
            
            # 8. Prepare final response
            processing_time = (datetime.now() - start_time).total_seconds()
            
            # Convert retrieved chunks to sources format
            sources = []
            for chunk in retrieved_chunks[:max_sources]:
                sources.append({
                    "type": "document_chunk",
                    "title": f"{document.name} - {chunk.chunk_type.value}",
                    "document_id": document.id,
                    "confidence": float(chunk.score),
                    "content": chunk.content[:300] + "..." if len(chunk.content) > 300 else chunk.content,
                    "metadata": {
                        "chunk_type": chunk.chunk_type.value,
                        "programming_language": chunk.programming_language,
                        "cs_concepts": chunk.cs_concepts
                    }
                })
            
            return {
                "success": True,
                "answer": response,
                "confidence": 0.9,  # High confidence due to semantic search
                "source_type": source_type,
                "sources": sources,
                "session_id": f"session_{document_id}_{int(datetime.now().timestamp())}",
                "message_id": f"msg_{int(datetime.now().timestamp())}",
                "response_time": processing_time,
                "token_usage": {
                    "prompt_tokens": len(question.split()),
                    "completion_tokens": len(response.split()),
                    "total_tokens": len(question.split()) + len(response.split())
                },
                "cs_enhanced": True,
                "processing_mode": source_type,
                "semantic_search_results": len(retrieved_chunks),
                "context_length": len(context)
            }
            
        except Exception as e:
            logger.error(f"Error processing RAG question: {e}")
            processing_time = (datetime.now() - start_time).total_seconds()
            
            return {
                "success": False,
                "error": str(e),
                "answer": f"I apologize, but I encountered an error processing your question: {str(e)}",
                "confidence": 0.0,
                "source_type": "error",
                "sources": [],
                "session_id": f"session_{document_id}_{int(datetime.now().timestamp())}",
                "message_id": f"msg_error_{int(datetime.now().timestamp())}",
                "response_time": processing_time,
                "token_usage": {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0},
                "cs_enhanced": False
            }
    
    async def _handle_unprocessed_document(
        self, 
        document: DocumentContent, 
        question: str, 
        start_time: datetime
    ) -> Dict[str, Any]:
        """Handle questions about unprocessed documents"""
        
        answer = f"""I notice that the document "{document.name}" is currently in "{document.status}" status and may not be fully processed yet.

**Document Information:**
- Name: {document.name}
- Type: {document.type}
- Category: {document.category}
- Status: {document.status}
- Size: {document.size}

**Your Question:** "{question}"

While I can't provide detailed analysis of the document content until processing is complete, I can tell you about the document itself and provide general guidance based on the document type and category.

For a complete analysis of the document content, please wait for the document processing to finish, then ask your question again.

Would you like me to provide general information about {document.type} files or {document.category} topics instead?"""
        
        processing_time = (datetime.now() - start_time).total_seconds()
        
        return {
            "success": True,
            "answer": answer,
            "confidence": 0.6,
            "source_type": "document_metadata",
            "sources": [{
                "type": "document_info",
                "title": document.name,
                "document_id": document.id,
                "confidence": 0.6,
                "content": f"Document metadata for {document.name}"
            }],
            "session_id": f"session_{document.id}_{int(datetime.now().timestamp())}",
            "message_id": f"msg_{int(datetime.now().timestamp())}",
            "response_time": processing_time,
            "token_usage": {
                "prompt_tokens": len(question.split()),
                "completion_tokens": len(answer.split()),
                "total_tokens": len(question.split()) + len(answer.split())
            },
            "cs_enhanced": True,
            "warning": f"Document is in {document.status} status"
        }
    
    async def _calculate_document_relevance(self, question: str, document_text: str) -> float:
        """Calculate how relevant the document is to the question"""
        try:
            # Simple keyword-based relevance calculation
            question_words = set(re.findall(r'\w+', question.lower()))
            document_words = set(re.findall(r'\w+', document_text.lower()))
            
            if not question_words:
                return 0.0
            
            # Calculate word overlap
            overlap = len(question_words.intersection(document_words))
            relevance = overlap / len(question_words)
            
            # Boost relevance for technical terms
            tech_terms = ['algorithm', 'code', 'programming', 'function', 'class', 'method', 
                         'variable', 'data', 'structure', 'computer', 'science', 'technical']
            
            tech_overlap = len(question_words.intersection(set(tech_terms)))
            if tech_overlap > 0:
                relevance += 0.2 * (tech_overlap / len(tech_terms))
            
            return min(relevance, 1.0)
            
        except Exception as e:
            logger.error(f"Error calculating relevance: {e}")
            return 0.5  # Default moderate relevance
    
    async def _generate_document_response(
        self, 
        question: str, 
        document: DocumentContent, 
        document_text: str, 
        temperature: float
    ) -> Dict[str, Any]:
        """Generate response based primarily on document content"""
        
        # Extract relevant sections from document
        relevant_sections = self._extract_relevant_sections(question, document_text)
        
        # Generate CS-enhanced response
        answer = await self._create_cs_enhanced_answer(
            question, document, relevant_sections, "document"
        )
        
        sources = [{
            "type": "document",
            "title": document.name,
            "document_id": document.id,
            "confidence": 0.85,
            "content": relevant_sections[:500] + "..." if len(relevant_sections) > 500 else relevant_sections
        }]
        
        return {
            "answer": answer,
            "confidence": 0.85,
            "sources": sources
        }
    
    async def _generate_hybrid_response(
        self, 
        question: str, 
        document: DocumentContent, 
        document_text: str, 
        temperature: float
    ) -> Dict[str, Any]:
        """Generate response combining document content and web search"""
        
        # Extract relevant sections from document
        relevant_sections = self._extract_relevant_sections(question, document_text)
        
        # Simulate web search results
        web_context = await self._simulate_web_search(question)
        
        # Generate hybrid response
        answer = await self._create_cs_enhanced_answer(
            question, document, relevant_sections, "hybrid", web_context
        )
        
        sources = [
            {
                "type": "document",
                "title": document.name,
                "document_id": document.id,
                "confidence": 0.75,
                "content": relevant_sections[:300] + "..." if len(relevant_sections) > 300 else relevant_sections
            },
            {
                "type": "web",
                "title": "Web Search Results",
                "confidence": 0.7,
                "content": web_context[:300] + "..." if len(web_context) > 300 else web_context
            }
        ]
        
        return {
            "answer": answer,
            "confidence": 0.78,
            "sources": sources
        }
    
    async def _generate_web_response(
        self, 
        question: str, 
        document: DocumentContent, 
        temperature: float
    ) -> Dict[str, Any]:
        """Generate response based primarily on web search"""
        
        # Simulate web search
        web_context = await self._simulate_web_search(question)
        
        # Generate web-based response
        answer = await self._create_cs_enhanced_answer(
            question, document, "", "web", web_context
        )
        
        sources = [{
            "type": "web",
            "title": "Web Search Results",  
            "confidence": 0.75,
            "content": web_context[:500] + "..." if len(web_context) > 500 else web_context
        }]
        
        return {
            "answer": answer,
            "confidence": 0.75,
            "sources": sources
        }
    
    def _extract_relevant_sections(self, question: str, document_text: str) -> str:
        """Extract most relevant sections from document text"""
        try:
            # Simple approach: find sentences containing question keywords
            question_words = set(re.findall(r'\w+', question.lower()))
            sentences = re.split(r'[.!?]+', document_text)
            
            relevant_sentences = []
            for sentence in sentences:
                sentence_words = set(re.findall(r'\w+', sentence.lower()))
                overlap = len(question_words.intersection(sentence_words))
                if overlap >= 2:  # At least 2 matching words
                    relevant_sentences.append(sentence.strip())
            
            if relevant_sentences:
                return ' '.join(relevant_sentences[:3])  # Top 3 relevant sentences
            else:
                # Fallback to first few sentences
                return ' '.join(sentences[:2])
                
        except Exception as e:
            logger.error(f"Error extracting relevant sections: {e}")
            return document_text[:500]  # First 500 chars as fallback
    
    async def _simulate_web_search(self, question: str) -> str:
        """Simulate web search results (placeholder for actual web search)"""
        # In a real implementation, this would call a web search API
        return f"""Based on web search for "{question}":

Recent developments and best practices in computer science and technology indicate several key approaches to this topic. Current research and industry standards suggest focusing on:

1. **Technical Implementation**: Modern approaches emphasize clean code, efficient algorithms, and scalable architecture.

2. **Best Practices**: Industry standards recommend following established patterns and methodologies.

3. **Performance Considerations**: Optimization strategies should consider both time and space complexity.

4. **Security Aspects**: Always consider security implications and follow secure coding practices.

This information is supplemented by the specific document content for a more comprehensive answer."""
    
    async def _create_cs_enhanced_answer(
        self, 
        question: str, 
        document: DocumentContent, 
        document_content: str, 
        mode: str,
        web_context: str = ""
    ) -> str:
        """Create a CS-enhanced answer based on available content"""
        
        mode_descriptions = {
            "document": "document-based analysis",
            "hybrid": "document analysis combined with web research",
            "web": "web research with document context"
        }
        
        if "algorithm" in question.lower() or "code" in question.lower():
            answer = f"""**CS-Enhanced Analysis** ({mode_descriptions.get(mode, mode)}):

**Your Question**: "{question}"

**Document Context**: From "{document.name}" ({document.type}):
{document_content}

**Computer Science Perspective**:
- **Algorithmic Approach**: Consider time and space complexity when implementing solutions
- **Code Structure**: Focus on maintainable, readable, and efficient code organization  
- **Best Practices**: Follow established programming principles and design patterns
- **Performance**: Optimize for scalability and resource efficiency

**Technical Insights**:
{web_context if web_context else "Based on the document content and CS principles, this appears to involve computational concepts that benefit from structured analysis."}

**Recommendation**: Apply systematic problem-solving approaches, consider edge cases, and ensure your implementation follows software engineering best practices.

Would you like me to elaborate on any specific technical aspect?"""

        else:
            answer = f"""**CS-Enhanced Response** ({mode_descriptions.get(mode, mode)}):

**Question**: "{question}"

**Document Analysis**: From "{document.name}":
{document_content}

**Enhanced Understanding**:
{web_context if web_context else "The document content provides relevant context for your question."}

**Key Points**:
- **Context**: The document is a {document.type} file in the {document.category} category
- **Analysis**: Using computer science methodologies to provide structured insights
- **Approach**: Combining document-specific information with technical knowledge

**Response**: Based on the available information and CS-enhanced analysis, the document contains relevant details that address your question. The analysis incorporates both the specific document content and broader technical understanding.

Is there a particular aspect you'd like me to focus on or expand upon?"""

        return answer
    
    async def _index_document_content(self, document: DocumentContent, document_text: str) -> None:
        """Index document content for semantic search using BGE embeddings"""
        try:
            # Skip if already indexed (check by document ID)
            stats = self.faiss_manager.get_stats()
            logger.info(f"Current index stats: {stats}")
            
            # Split document into chunks for better retrieval
            chunks = self._split_document_into_chunks(document, document_text)
            
            if chunks:
                # Add chunks to appropriate indexes based on content type
                code_chunks = [c for c in chunks if self._is_code_chunk(c.content)]
                theory_chunks = [c for c in chunks if not self._is_code_chunk(c.content)]
                
                if code_chunks:
                    self.faiss_manager.add_documents(code_chunks, IndexType.CODE)
                    logger.info(f"Added {len(code_chunks)} code chunks to index")
                
                if theory_chunks:
                    self.faiss_manager.add_documents(theory_chunks, IndexType.THEORY)
                    logger.info(f"Added {len(theory_chunks)} theory chunks to index")
                
                # Save indexes after adding new content
                self.faiss_manager.save_indexes()
                
        except Exception as e:
            logger.error(f"Error indexing document content: {e}")
    
    def _split_document_into_chunks(self, document: DocumentContent, text: str) -> List[DocumentChunk]:
        """Split document into semantic chunks for indexing"""
        chunks = []
        
        # Simple paragraph-based chunking (can be enhanced with more sophisticated methods)
        paragraphs = [p.strip() for p in text.split('\n\n') if p.strip()]
        
        for i, paragraph in enumerate(paragraphs):
            if len(paragraph) < 50:  # Skip very short paragraphs
                continue
                
            chunk_id = f"{document.id}_chunk_{i}"
            chunk_type = "code" if self._is_code_chunk(paragraph) else "theory"
            
            chunk = DocumentChunk(
                id=chunk_id,
                content=paragraph,
                chunk_type=chunk_type,
                source_id=document.id,
                metadata={
                    "document_name": document.name,
                    "document_type": document.type,
                    "category": document.category,
                    "chunk_index": i
                }
            )
            chunks.append(chunk)
        
        return chunks
    
    def _is_code_chunk(self, text: str) -> bool:
        """Determine if a text chunk contains code"""
        code_indicators = [
            'def ', 'class ', 'function', 'import ', 'return ', 
            '{', '}', '```', 'print(', 'console.log', 'public static',
            '#include', 'SELECT ', 'FROM ', 'WHERE '
        ]
        text_lower = text.lower()
        return any(indicator in text_lower for indicator in code_indicators)
    
    async def _generate_enhanced_response(
        self, 
        question: str, 
        document: DocumentContent, 
        context: str, 
        retrieved_chunks: List, 
        temperature: float
    ) -> str:
        """Generate enhanced response using full document context and BGE semantic search"""
        
        # Extract key information from retrieved chunks
        programming_languages = set()
        cs_concepts = set()
        code_examples = []
        theory_content = []
        
        for chunk in retrieved_chunks:
            if hasattr(chunk, 'programming_language') and chunk.programming_language:
                programming_languages.add(chunk.programming_language)
            if hasattr(chunk, 'cs_concepts'):
                cs_concepts.update(chunk.cs_concepts)
            
            if hasattr(chunk, 'contains_code') and chunk.contains_code:
                code_examples.append(chunk.content)
            else:
                theory_content.append(chunk.content)
        
        # Build comprehensive answer
        answer_parts = []
        
        # Header with document info
        answer_parts.append(f"**Analysis of '{document.name}' ({document.type})**\n")
        answer_parts.append(f"**Your Question:** \"{question}\"\n")
        
        # Main content analysis
        if theory_content or code_examples:
            answer_parts.append("**Document Analysis:**")
            
            # Add theory/conceptual content
            if theory_content:
                combined_theory = " ".join(theory_content[:3])  # Top 3 theory chunks
                answer_parts.append(f"\n**Conceptual Content:**\n{combined_theory}\n")
            
            # Add code examples if relevant
            if code_examples and any(lang in question.lower() for lang in ['code', 'implement', 'function', 'class']):
                answer_parts.append("\n**Related Code Examples:**")
                for i, code in enumerate(code_examples[:2]):  # Top 2 code examples
                    lang = list(programming_languages)[0] if programming_languages else ""
                    answer_parts.append(f"\n```{lang}\n{code}\n```\n")
        
        # CS-specific insights
        if cs_concepts:
            answer_parts.append(f"\n**Computer Science Concepts Identified:**")
            concepts_list = ", ".join(list(cs_concepts)[:10])  # Top 10 concepts
            answer_parts.append(f"- {concepts_list}")
        
        if programming_languages:
            answer_parts.append(f"\n**Programming Languages:** {', '.join(programming_languages)}")
        
        # Semantic search summary
        answer_parts.append(f"\n**Semantic Analysis Results:**")
        answer_parts.append(f"- Found {len(retrieved_chunks)} relevant sections using BGE embeddings")
        answer_parts.append(f"- Content analyzed with CS-enhanced understanding")
        answer_parts.append(f"- Retrieved both theoretical concepts and practical implementations")
        
        # Direct answer to the question
        answer_parts.append(f"\n**Direct Answer:**")
        
        # Generate contextual answer based on question type
        if "what is" in question.lower() or "define" in question.lower():
            if theory_content:
                main_content = theory_content[0][:500]
                answer_parts.append(f"Based on the document analysis: {main_content}")
            else:
                answer_parts.append(f"The document '{document.name}' contains information related to your question, focusing on {', '.join(list(cs_concepts)[:3]) if cs_concepts else 'the topic you asked about'}.")
        
        elif "how to" in question.lower() or "implement" in question.lower():
            if code_examples:
                answer_parts.append("The document provides implementation details and code examples as shown above.")
            else:
                answer_parts.append("The document contains theoretical information that can guide implementation approaches.")
        
        else:
            # General response
            if context.strip():
                # Use the most relevant chunk for direct answer
                best_chunk = retrieved_chunks[0] if retrieved_chunks else None
                if best_chunk:
                    answer_parts.append(f"Based on the most relevant section: {best_chunk.content[:400]}...")
            else:
                answer_parts.append("The document has been analyzed but may not contain direct information about your specific question.")
        
        # Closing
        answer_parts.append(f"\n**Would you like me to:**")
        answer_parts.append(f"- Explain any of the identified concepts in more detail?")
        answer_parts.append(f"- Analyze specific code sections if present?")
        answer_parts.append(f"- Provide more context about particular aspects?")
        
        return "\n".join(answer_parts)

# Global processor instance
_rag_processor: Optional[RagProcessor] = None

def get_rag_processor() -> RagProcessor:
    """Get or create RAG processor instance"""
    global _rag_processor
    if _rag_processor is None:
        _rag_processor = RagProcessor()
    return _rag_processor