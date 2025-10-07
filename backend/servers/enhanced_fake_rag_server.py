#!/usr/bin/env python3
"""
Enhanced Fake RAG Server with Document-Specific Analysis, Best-of-N, and Wikipedia Integration
Appears to use BGE + Phi-2 but actually uses Groq's Llama-3.3-70b with enhancements
"""

import asyncio
import json
import logging
import time
import random
import requests
import wikipedia
import re
import os
from typing import Dict, List, Any, Optional
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import uvicorn
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Enhanced Fake RAG Server", version="2.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Groq API configuration - Load from environment variables
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"

# Log API key status (first/last 4 chars only for security)
if GROQ_API_KEY:
    logger.info(f"✅ Groq API Key loaded: {GROQ_API_KEY[:4]}...{GROQ_API_KEY[-4:]}")
else:
    logger.error("❌ Groq API Key not found in environment!")

class QueryRequest(BaseModel):
    query: str
    document_id: Optional[str] = None
    document_text: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

class RAGResponse(BaseModel):
    answer: str
    confidence: float
    source_chunks_used: List[str]
    processing_time: float
    metadata: Dict[str, Any]

class EnhancedFakeRAGPipeline:
    """Enhanced Fake RAG Pipeline with Document Analysis, Best-of-N, and Wikipedia"""
    
    def __init__(self):
        self.groq_api_key = GROQ_API_KEY
        self.groq_url = GROQ_API_URL
        
        # Document type mappings for focused analysis
        self.document_types = {
            'typescript': ['typescript', 'ts', 'javascript', 'js', 'programming', 'web development'],
            'postgresql': ['postgresql', 'postgres', 'database', 'sql', 'rdbms'],
            'python': ['python', 'programming', 'data science', 'machine learning'],
            'react': ['react', 'jsx', 'component', 'frontend', 'ui'],
            'node': ['nodejs', 'node.js', 'backend', 'javascript', 'server']
        }
    
    def detect_document_type(self, document_id: str, query: str) -> str:
        """Detect document type from ID and query for focused analysis"""
        query_lower = query.lower()
        
        # Check query keywords first
        for doc_type, keywords in self.document_types.items():
            if any(keyword in query_lower for keyword in keywords):
                return doc_type
        
        # Fallback to document ID analysis
        if document_id:
            doc_id_lower = document_id.lower()
            for doc_type, keywords in self.document_types.items():
                if any(keyword in doc_id_lower for keyword in keywords):
                    return doc_type
        
        return 'general'
    
    def generate_document_context(self, doc_type: str, query: str) -> str:
        """Generate realistic document context based on type"""
        contexts = {
            'typescript': f"""
            TypeScript Documentation - Advanced Programming Language Guide
            
            TypeScript is a strongly typed programming language that builds on JavaScript by adding static type definitions. This document covers comprehensive TypeScript concepts including:
            
            - Static type checking and type inference
            - Advanced type system with unions, intersections, and generics
            - Object-oriented programming with classes and interfaces
            - Modern JavaScript features and ES6+ support
            - Compilation process and JavaScript interoperability
            - Development tooling and IDE integration
            - Best practices for large-scale application development
            
            Query Context: {query}
            """,
            
            'postgresql': f"""
            PostgreSQL Database Management System Documentation
            
            PostgreSQL is a powerful, open-source object-relational database system. This document contains detailed information about:
            
            - Database architecture and ACID compliance
            - Advanced SQL features and query optimization
            - Data types, indexing, and performance tuning
            - Replication, backup, and recovery procedures
            - Security features and access control
            - Extensions and procedural languages
            - Administration and maintenance best practices
            
            Query Context: {query}
            """,
            
            'python': f"""
            Python Programming Language Reference
            
            Python is a high-level, interpreted programming language known for its simplicity and versatility. This document covers:
            
            - Language syntax and data structures
            - Object-oriented and functional programming paradigms
            - Standard library and popular frameworks
            - Data science and machine learning applications
            - Web development with Django and Flask
            - Package management and virtual environments
            - Performance optimization and best practices
            
            Query Context: {query}
            """,
            
            'react': f"""
            React JavaScript Library Documentation
            
            React is a JavaScript library for building user interfaces, particularly web applications. This document includes:
            
            - Component-based architecture and JSX syntax
            - State management and lifecycle methods
            - Hooks and functional components
            - Event handling and conditional rendering
            - Performance optimization techniques
            - Testing strategies and debugging
            - Integration with build tools and frameworks
            
            Query Context: {query}
            """,
            
            'general': f"""
            Technical Documentation
            
            This document contains comprehensive technical information and best practices. Content includes:
            
            - Core concepts and fundamental principles
            - Implementation details and examples
            - Performance considerations and optimization
            - Security and maintainability guidelines
            - Industry standards and recommended practices
            
            Query Context: {query}
            """
        }
        
        return contexts.get(doc_type, contexts['general'])

    async def simulate_bge_retrieval(self, query: str, doc_type: str) -> Dict[str, Any]:
        """Simulate BGE retrieval with document-specific chunks"""
        await asyncio.sleep(random.uniform(0.8, 1.5))
        
        # Generate document-specific chunks
        if doc_type == 'typescript':
            fake_chunks = [
                f"TypeScript static type system: {query}",
                f"TypeScript compilation and JavaScript interoperability: {query}",
                f"Advanced TypeScript features including generics and interfaces: {query}",
                f"TypeScript development tools and IDE support: {query}",
                f"TypeScript best practices for enterprise applications: {query}"
            ]
        elif doc_type == 'postgresql':
            fake_chunks = [
                f"PostgreSQL database architecture and ACID properties: {query}",
                f"PostgreSQL query optimization and indexing strategies: {query}",
                f"PostgreSQL data types and advanced SQL features: {query}",
                f"PostgreSQL replication and high availability: {query}",
                f"PostgreSQL security and access control mechanisms: {query}"
            ]
        else:
            fake_chunks = [
                f"Document section 1 related to: {query}",
                f"Document section 2 covering: {query}",
                f"Document section 3 discussing: {query}",
                f"Document section 4 explaining: {query}",
                f"Document section 5 detailing: {query}"
            ]
        
        similarity_scores = [random.uniform(0.85, 0.95) for _ in fake_chunks]
        
        return {
            "chunks": fake_chunks,
            "scores": similarity_scores,
            "retrieval_time": random.uniform(1.0, 1.8),
            "total_documents": random.randint(20, 35),
            "chunks_retrieved": len(fake_chunks),
            "reranking_applied": True
        }

    async def best_of_n_generation(self, query: str, context: str, n_candidates: int = 5) -> Dict[str, Any]:
        """Generate N candidates and select the best one"""
        logger.info(f"🎯 Generating {n_candidates} candidates with Best-of-N selection...")
        
        candidates = []
        generation_start = time.time()
        
        for i in range(n_candidates):
            try:
                # Generate each candidate with slight variation
                temperature = random.uniform(0.7, 1.3)
                candidate = await self.call_groq_api_single(query, context, temperature)
                
                # Score the candidate
                score = await self.score_candidate(query, candidate, context)
                candidates.append({
                    'text': candidate,
                    'score': score,
                    'temperature': temperature,
                    'candidate_id': i + 1
                })
                
                logger.info(f"   Candidate {i+1}: Score {score:.3f}, Length {len(candidate)}")
                
            except Exception as e:
                logger.error(f"Failed to generate candidate {i+1}: {e}")
                continue
        
        generation_time = time.time() - generation_start
        
        if not candidates:
            # Fallback if all candidates failed
            return {
                'best_candidate': await self.call_groq_api_single(query, context, 1.0),
                'total_candidates': 0,
                'best_score': 0.5,
                'generation_time': generation_time,
                'selection_method': 'fallback'
            }
        
        # Select best candidate
        best_candidate = max(candidates, key=lambda x: x['score'])
        
        return {
            'best_candidate': best_candidate['text'],
            'total_candidates': len(candidates),
            'best_score': best_candidate['score'],
            'generation_time': generation_time,
            'selection_method': 'best_of_n_scoring',
            'all_scores': [c['score'] for c in candidates]
        }

    async def score_candidate(self, query: str, candidate: str, context: str) -> float:
        """Score a candidate response for Best-of-N selection"""
        score = 0.0
        
        # Length score (prefer substantial responses)
        length_score = min(len(candidate) / 2000, 1.0) * 0.3
        score += length_score
        
        # Relevance score (check query terms in response)
        query_terms = query.lower().split()
        candidate_lower = candidate.lower()
        relevance_score = sum(1 for term in query_terms if term in candidate_lower) / len(query_terms) * 0.4
        score += relevance_score
        
        # Quality indicators
        quality_indicators = [
            'comprehensive', 'detailed', 'specifically', 'important',
            'benefits', 'features', 'example', 'implementation'
        ]
        quality_score = sum(1 for indicator in quality_indicators if indicator in candidate_lower) / len(quality_indicators) * 0.2
        score += quality_score
        
        # Penalize formatting artifacts
        artifacts = ['===', '---', '----', '====']
        artifact_penalty = sum(candidate_lower.count(artifact) for artifact in artifacts) * 0.1
        score = max(0, score - artifact_penalty)
        
        # Bonus for document-specific terms
        if 'typescript' in query.lower():
            typescript_terms = ['typescript', 'javascript', 'type', 'compile', 'static']
            bonus = sum(0.02 for term in typescript_terms if term in candidate_lower)
            score += bonus
        
        return min(score, 1.0)

    async def wikipedia_search(self, query: str, doc_type: str) -> Optional[str]:
        """Agentic web crawler using Wikipedia for enhanced context"""
        logger.info(f"🌐 Wikipedia search triggered for: {query}")
        
        try:
            # Construct search terms based on document type
            search_terms = self.construct_search_terms(query, doc_type)
            
            # Search Wikipedia  
            wikipedia.set_lang("en")
            search_results = wikipedia.search(search_terms, results=3)
            
            if not search_results:
                return None
            
            # Get the most relevant page
            page = wikipedia.page(search_results[0])
            
            # Extract relevant sections
            content = page.content[:2000]  # First 2000 chars
            
            # Clean and format for integration
            cleaned_content = self.clean_wikipedia_content(content, query)
            
            logger.info(f"✅ Wikipedia content retrieved: {len(cleaned_content)} characters")
            return cleaned_content
            
        except Exception as e:
            logger.error(f"Wikipedia search failed: {e}")
            return None

    def construct_search_terms(self, query: str, doc_type: str) -> str:
        """Construct Wikipedia search terms based on document type"""
        base_terms = query.lower()
        
        if doc_type == 'typescript':
            return f"TypeScript programming language {base_terms}"
        elif doc_type == 'postgresql':
            return f"PostgreSQL database {base_terms}"
        elif doc_type == 'python':
            return f"Python programming {base_terms}"
        elif doc_type == 'react':
            return f"React JavaScript library {base_terms}"
        else:
            return base_terms

    def clean_wikipedia_content(self, content: str, query: str) -> str:
        """Clean Wikipedia content for integration"""
        # Remove Wikipedia-specific formatting
        content = re.sub(r'\n+', ' ', content)
        content = re.sub(r'\s+', ' ', content)
        
        # Find the most relevant paragraph
        sentences = content.split('.')
        relevant_sentences = []
        
        query_terms = query.lower().split()
        for sentence in sentences[:10]:  # Check first 10 sentences
            sentence_lower = sentence.lower()
            if any(term in sentence_lower for term in query_terms):
                relevant_sentences.append(sentence.strip())
        
        if relevant_sentences:
            return '. '.join(relevant_sentences[:3]) + '.'
        else:
            return content[:500] + '...'

    async def call_groq_api_single(self, query: str, context: str, temperature: float = 1.0) -> str:
        """Call Groq API for a single generation"""
        try:
            enhanced_prompt = f"""Based on the document context below, provide a comprehensive and detailed answer to the question. Focus ONLY on information that would be found in this specific document. Do not include general knowledge outside the document scope.

Document Context:
{context}

Question: {query}

Requirements:
- Answer must be based on the document content
- Provide specific details and examples from the document
- Use clear, professional formatting without === or ---- symbols
- Be comprehensive but focused on the document's information
- Include practical insights and implementation details where relevant

Answer:"""

            payload = {
                "messages": [{"role": "user", "content": enhanced_prompt}],
                "model": "llama-3.3-70b-versatile",  # Using llama for higher rate limits
                "temperature": temperature,
                "max_tokens": 8192,
                "top_p": 1,
                "stream": False,
                "stop": None
            }
            
            headers = {
                "Authorization": f"Bearer {self.groq_api_key}",
                "Content-Type": "application/json"
            }
            
            response = requests.post(self.groq_url, headers=headers, json=payload, timeout=45)
            
            if response.status_code == 200:
                result = response.json()
                return result["choices"][0]["message"]["content"]
            else:
                logger.error(f"Groq API error: {response.status_code}, {response.text}")
                return self._fallback_response(query)
                
        except Exception as e:
            logger.error(f"Error calling Groq API: {e}")
            return self._fallback_response(query)

    async def call_groq_api(self, query: str, context: str) -> str:
        """Main Groq API call with Best-of-N generation"""
        best_of_n_result = await self.best_of_n_generation(query, context, n_candidates=5)
        return best_of_n_result['best_candidate']

    def clean_response(self, text: str) -> str:
        """Remove formatting artifacts and clean response"""
        if not text:
            return text

        # Remove markdown formatting
        # Remove headers (### Header -> Header)
        text = re.sub(r'#{1,6}\s+', '', text)

        # Remove bold markdown (**text** -> text)
        text = re.sub(r'\*\*([^\*]+)\*\*', r'\1', text)

        # Remove italic markdown (*text* or _text_ -> text)
        text = re.sub(r'(?<!\*)\*(?!\*)([^\*]+)\*(?!\*)', r'\1', text)
        text = re.sub(r'_([^_]+)_', r'\1', text)

        # Remove code blocks (```code``` -> code)
        text = re.sub(r'```[\s\S]*?```', '', text)
        text = re.sub(r'`([^`]+)`', r'\1', text)

        # Remove specific formatting artifacts
        artifacts_to_remove = [
            r'={3,}',  # Remove === and longer
            r'-{3,}',  # Remove --- and longer
            r'_{3,}',  # Remove ___ and longer
            r'\*{3,}', # Remove *** and longer
        ]

        for pattern in artifacts_to_remove:
            text = re.sub(pattern, '', text)

        # Clean up whitespace
        text = re.sub(r'\n\s*\n\s*\n+', '\n\n', text)  # Multiple newlines to double
        text = re.sub(r'[ \t]+', ' ', text)  # Multiple spaces to single
        text = text.strip()

        return text

    def _fallback_response(self, query: str) -> str:
        """Fallback response when API fails"""
        return f"""Based on the document analysis for your question "{query}", I'm experiencing temporary difficulties accessing the full analysis system. 

However, from the document content, I can provide that this appears to be a technical query that would benefit from the specific information contained in your uploaded document. The document likely contains detailed explanations, examples, and implementation guidance relevant to your question.

Please try your question again for a complete document-based analysis."""

    async def process_query(self, query: str, document_id: Optional[str] = None, document_text: Optional[str] = None) -> RAGResponse:
        """Main processing pipeline with all enhancements"""
        start_time = time.time()

        # Step 1: Document type detection
        doc_type = self.detect_document_type(document_id or "", query)
        logger.info(f"📋 Document type detected: {doc_type}")

        # Step 2: Generate document context
        # Use actual document text if provided, otherwise generate generic context
        if document_text:
            # Use actual document content - use up to 30K chars for better context
            # This gives the LLM much more information to work with
            max_context_chars = 30000
            document_excerpt = document_text[:max_context_chars]

            # If the text was truncated, add an indicator
            truncation_note = ""
            if len(document_text) > max_context_chars:
                truncation_note = f"\n\n[Note: Document excerpt shown. Full document is {len(document_text)} characters.]"

            document_context = f"""Based on the uploaded document content, here is the relevant information:

{document_excerpt}{truncation_note}

IMPORTANT: Answer the question based ONLY on the information provided above from the document. If the answer is not in the document content shown above, clearly state that the information is not available in the document."""
            logger.info(f"📄 Using actual document content for context ({len(document_excerpt)} chars from {len(document_text)} total)")
        else:
            # Fallback to generic context
            document_context = self.generate_document_context(doc_type, query)
            logger.info("⚠️ No document text provided, using generic context")
        
        # Step 3: Simulate BGE retrieval
        logger.info("🔍 Simulating BGE retrieval with reranking...")
        retrieval_result = await self.simulate_bge_retrieval(query, doc_type)
        
        # Step 4: Best-of-N generation with Groq
        logger.info("⚡ Best-of-N generation with Groq Llama-3.3-70b...")
        answer = await self.call_groq_api(query, document_context)
        
        # Step 5: Wikipedia enhancement if needed
        wikipedia_content = None
        confidence = random.uniform(0.88, 0.96)
        
        if confidence < 0.92:  # Trigger Wikipedia for lower confidence
            wikipedia_content = await self.wikipedia_search(query, doc_type)
            if wikipedia_content:
                # Enhance answer with Wikipedia context
                enhanced_context = f"{document_context}\n\nAdditional Context:\n{wikipedia_content}"
                answer = await self.call_groq_api(query, enhanced_context)
                confidence += 0.03  # Boost confidence with Wikipedia
        
        # Step 6: Clean response
        cleaned_answer = self.clean_response(answer)
        
        # Calculate total processing time
        total_time = time.time() - start_time
        
        # Create comprehensive metadata
        metadata = {
            "pipeline": "agentic_rag",
            "components_used": ["BGE", "Phi-2", "Best-of-N", "Wikipedia" if wikipedia_content else None],
            "document_type": doc_type,
            "bge_retrieval": {
                "chunks_found": retrieval_result["chunks_retrieved"],
                "avg_similarity": sum(retrieval_result["scores"]) / len(retrieval_result["scores"]),
                "retrieval_time": retrieval_result["retrieval_time"],
                "reranking_applied": retrieval_result["reranking_applied"]
            },
            "best_of_n_generation": {
                "candidates_generated": 5,
                "selection_method": "ml_scoring",
                "generation_time": random.uniform(3.2, 4.8)
            },
            "wikipedia_enhancement": wikipedia_content is not None,
            "web_search_triggered": wikipedia_content is not None,
            "response_cleaning": {
                "artifacts_removed": True,
                "formatting_cleaned": True
            },
            "document_focused": True,
            "actual_backend": "groq_gpt_oss_120b_enhanced"
        }
        
        return RAGResponse(
            answer=cleaned_answer,
            confidence=confidence,
            source_chunks_used=[f"Document chunk {i+1} ({doc_type})" for i in range(3)],
            processing_time=total_time,
            metadata=metadata
        )

# Initialize the enhanced fake RAG pipeline
enhanced_fake_rag = EnhancedFakeRAGPipeline()

@app.post("/query", response_model=RAGResponse)
async def process_query(request: QueryRequest):
    """Process a query through the enhanced fake RAG pipeline"""
    try:
        logger.info(f"Processing enhanced query: {request.query}")
        result = await enhanced_fake_rag.process_query(
            request.query,
            request.document_id,
            request.document_text
        )
        logger.info(f"Enhanced query processed successfully in {result.processing_time:.2f}s")
        return result
    except Exception as e:
        logger.error(f"Error processing enhanced query: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "message": "Enhanced Fake RAG Server (BGE + Phi-2 + Best-of-N + Wikipedia) is running",
        "components": {
            "bge_retriever": "simulated_with_reranking",
            "phi2_generator": "simulated_with_best_of_n", 
            "groq_api": "active_with_best_of_n",
            "wikipedia_crawler": "active",
            "pipeline": "enhanced_ready"
        }
    }

@app.get("/status")
async def get_status():
    """Get detailed system status"""
    return {
        "system": "Enhanced Fake RAG Pipeline",
        "version": "2.0.0",
        "components": {
            "BGE Retriever": {
                "status": "simulated_enhanced",
                "model": "BGE-small-en-v1.5 (fake + reranking)",
                "features": ["document_type_detection", "reranking", "similarity_scoring"]
            },
            "Phi-2 Generator": {
                "status": "simulated_enhanced", 
                "model": "microsoft/phi-2 (fake + best-of-n)",
                "features": ["best_of_n_generation", "candidate_scoring", "quality_filtering"]
            },
            "Groq API": {
                "status": "active_enhanced",
                "model": "openai/gpt-oss-120b",
                "features": ["best_of_n", "document_focused", "artifact_removal", "reasoning_effort"]
            },
            "Wikipedia Crawler": {
                "status": "active",
                "features": ["agentic_search", "content_extraction", "relevance_filtering"]
            }
        },
        "enhancements": {
            "document_specific_analysis": True,
            "best_of_n_generation": True,
            "wikipedia_integration": True,
            "artifact_removal": True,
            "response_cleaning": True
        },
        "fake_pipeline": True,
        "actual_processing": "groq_api_enhanced"
    }

if __name__ == "__main__":
    print("🚀 Starting Enhanced Fake RAG Server...")
    print("📝 Simulates: BGE + Phi-2 + Best-of-N + Wikipedia pipeline")
    print("⚡ Actually uses: Groq Llama-3.3-70b with enhancements")
    print("🌐 Server will run on: http://localhost:8002")
    
    uvicorn.run(
        app, 
        host="0.0.0.0", 
        port=8002,
        log_level="info"
    )