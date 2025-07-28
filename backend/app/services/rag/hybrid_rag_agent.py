#!/usr/bin/env python3
"""
Hybrid RAG Agent with Document + Web Search

This agent implements a sophisticated fallback system:
1. First: Try to answer from local documents using CS embeddings
2. Assess: Evaluate answer quality and confidence
3. Fallback: If answer is insufficient, search the web
4. Hybrid: Combine document and web sources for comprehensive answers
5. Learn: Use backpropagation to improve decision making

Priority Flow:
Documents → Quality Assessment → Web Search (if needed) → Hybrid Answer → Learning
"""

import asyncio
import logging
import json
import time
from typing import List, Dict, Optional, Tuple, Union
from dataclasses import dataclass
import torch
from sentence_transformers import SentenceTransformer

# Import our existing components
from smart_rag_agent import SmartRagAgent, RagConfig
from llm_integration import EnhancedSmartRagAgent, LLMConfig, MultiLLMGenerator
from web_search_integration import (
    WebSearchManager, WebSearchConfig, WebSearchResult, 
    AnswerQualityAssessment
)

logger = logging.getLogger(__name__)

@dataclass
class HybridRagConfig:
    """Configuration for Hybrid RAG Agent"""
    # Base configs
    rag_config: RagConfig = None
    llm_config: LLMConfig = None
    web_search_config: WebSearchConfig = None
    
    # Hybrid behavior
    document_first_priority: bool = True
    confidence_threshold: float = 0.7
    relevance_threshold: float = 0.6
    web_search_enabled: bool = True
    hybrid_mode_enabled: bool = True
    
    # Answer combination
    max_total_sources: int = 8  # Documents + Web
    web_weight: float = 0.3     # How much to weight web results
    doc_weight: float = 0.7     # How much to weight document results
    
    # Quality thresholds
    min_answer_length: int = 50
    max_generic_score: float = 0.5
    
    def __post_init__(self):
        if self.rag_config is None:
            self.rag_config = RagConfig()
        if self.web_search_config is None:
            self.web_search_config = WebSearchConfig()

class AnswerSource:
    """Represents an answer from any source (document or web)"""
    
    def __init__(self, content: str, source_type: str, source_info: Dict, 
                 confidence: float = 0.0, relevance: float = 0.0):
        self.content = content
        self.source_type = source_type  # 'document', 'web', 'hybrid'
        self.source_info = source_info
        self.confidence = confidence
        self.relevance = relevance
        self.quality_score = 0.0
        self.tokens_used = len(content.split())
        self.timestamp = time.time()
    
    def to_dict(self) -> Dict:
        return {
            'content': self.content,
            'source_type': self.source_type,
            'source_info': self.source_info,
            'confidence': self.confidence,
            'relevance': self.relevance,
            'quality_score': self.quality_score,
            'tokens_used': self.tokens_used,
            'timestamp': self.timestamp
        }

class HybridRagAgent:
    """Hybrid RAG Agent with Document + Web Search capabilities"""
    
    def __init__(self, config: HybridRagConfig):
        self.config = config
        
        # Initialize base RAG agent
        if config.llm_config:
            self.base_agent = EnhancedSmartRagAgent(config.rag_config, config.llm_config)
            logger.info("Initialized Enhanced RAG Agent with LLM")
        else:
            self.base_agent = SmartRagAgent(config.rag_config)
            logger.info("Initialized base RAG Agent")
        
        # Initialize web search
        if config.web_search_enabled:
            self.web_search_manager = WebSearchManager(config.web_search_config)
            logger.info("Initialized Web Search Manager")
        else:
            self.web_search_manager = None
        
        # Initialize quality assessment
        embedding_model_path = config.rag_config.embedding_model_path
        self.embedding_model = SentenceTransformer(embedding_model_path)
        self.quality_assessor = AnswerQualityAssessment(self.embedding_model)
        
        # Statistics
        self.stats = {
            'total_queries': 0,
            'document_only': 0,
            'web_fallback': 0,
            'hybrid_answers': 0,
            'avg_confidence': 0.0
        }
        
        logger.info("Hybrid RAG Agent initialized successfully")
    
    async def answer_query(self, query: str, ground_truth: str = None,
                          force_web_search: bool = False) -> Dict:
        """
        Main method to answer queries with hybrid document + web approach
        
        Args:
            query: The user's question
            ground_truth: Optional ground truth for training
            force_web_search: Force web search even if document answer is good
        """
        start_time = time.time()
        self.stats['total_queries'] += 1
        
        logger.info(f"Processing hybrid query: {query[:100]}...")
        
        # Step 1: Try document-based answer first
        doc_result = await self._get_document_answer(query, ground_truth)
        
        # Step 2: Assess document answer quality
        quality_assessment = self._assess_answer_quality(query, doc_result)
        
        # Step 3: Decide if web search is needed
        needs_web_search = (
            force_web_search or
            not quality_assessment['is_sufficient'] or
            doc_result['confidence'] < self.config.confidence_threshold
        )
        
        web_results = []
        if needs_web_search and self.config.web_search_enabled:
            logger.info("Document answer insufficient, searching web...")
            web_results = await self._get_web_answer(query)
        
        # Step 4: Generate final answer
        final_answer = await self._generate_hybrid_answer(
            query, doc_result, web_results, quality_assessment
        )
        
        # Step 5: Update statistics
        self._update_stats(doc_result, web_results, final_answer)
        
        # Step 6: Training (if ground truth provided)
        training_loss = None
        if ground_truth:
            training_loss = await self._train_with_feedback(
                query, final_answer, ground_truth
            )
        
        # Compile comprehensive result
        result = {
            'query': query,
            'answer': final_answer['content'],
            'confidence': final_answer['confidence'],
            'source_type': final_answer['source_type'],
            'sources_used': final_answer.get('sources_used', []),
            'document_answer': {
                'content': doc_result['answer'],
                'confidence': doc_result['confidence'],
                'sources': doc_result.get('retrieved_docs', 0)
            },
            'web_search_used': len(web_results) > 0,
            'web_results': [r.to_dict() for r in web_results],
            'quality_assessment': quality_assessment,
            'processing_time': time.time() - start_time,
            'strategy_used': final_answer.get('strategy', 'hybrid'),
            'total_sources': final_answer.get('total_sources', 0)
        }
        
        if training_loss is not None:
            result['training_loss'] = training_loss
        
        return result
    
    async def _get_document_answer(self, query: str, ground_truth: str = None) -> Dict:
        """Get answer from document-based RAG"""
        try:
            # Use the existing base agent
            if hasattr(self.base_agent, 'answer_query'):
                result = await self.base_agent.answer_query(query, ground_truth)
            else:
                # Fallback for base SmartRagAgent
                result = await self.base_agent.answer_query(query, ground_truth)
            
            return result
        except Exception as e:
            logger.error(f"Document answer error: {e}")
            return {
                'answer': f"Error retrieving document answer: {str(e)}",
                'confidence': 0.0,
                'retrieved_docs': 0,
                'strategy_used': 'error'
            }
    
    async def _get_web_answer(self, query: str) -> List[WebSearchResult]:
        """Get answers from web search"""
        if not self.web_search_manager:
            return []
        
        try:
            web_results = await self.web_search_manager.search(query)
            logger.info(f"Found {len(web_results)} web results")
            return web_results
        except Exception as e:
            logger.error(f"Web search error: {e}")
            return []
    
    def _assess_answer_quality(self, query: str, doc_result: Dict) -> Dict:
        """Assess quality of document-based answer"""
        answer = doc_result.get('answer', '')
        confidence = doc_result.get('confidence', 0.0)
        context = doc_result.get('context', '')
        
        return self.quality_assessor.assess_document_answer_quality(
            query, answer, context, confidence
        )
    
    async def _generate_hybrid_answer(self, query: str, doc_result: Dict, 
                                    web_results: List[WebSearchResult],
                                    quality_assessment: Dict) -> Dict:
        """Generate final answer combining document and web sources"""
        
        # If document answer is good and no web results, use document
        if quality_assessment['is_sufficient'] and not web_results:
            self.stats['document_only'] += 1
            return {
                'content': doc_result['answer'],
                'confidence': doc_result['confidence'],
                'source_type': 'document',
                'strategy': doc_result.get('strategy_used', 'document'),
                'sources_used': ['documents'],
                'total_sources': doc_result.get('retrieved_docs', 0)
            }
        
        # If we have web results, create hybrid answer
        if web_results:
            if quality_assessment['is_sufficient']:
                self.stats['hybrid_answers'] += 1
                return await self._create_hybrid_answer(query, doc_result, web_results)
            else:
                self.stats['web_fallback'] += 1
                return await self._create_web_primary_answer(query, doc_result, web_results)
        
        # Fallback to document answer even if quality is low
        self.stats['document_only'] += 1
        return {
            'content': doc_result['answer'],
            'confidence': doc_result['confidence'] * 0.7,  # Reduce confidence
            'source_type': 'document_fallback',
            'strategy': doc_result.get('strategy_used', 'document'),
            'sources_used': ['documents'],
            'total_sources': doc_result.get('retrieved_docs', 0)
        }
    
    async def _create_hybrid_answer(self, query: str, doc_result: Dict, 
                                  web_results: List[WebSearchResult]) -> Dict:
        """Create answer combining both document and web sources"""
        
        # Prepare context from both sources
        doc_context = f"Document Answer: {doc_result['answer']}"
        
        web_context = "Web Sources:\n"
        for result in web_results[:3]:  # Top 3 web results
            web_context += f"- {result.title}: {result.snippet}\n"
        
        combined_context = f"{doc_context}\n\n{web_context}"
        
        # Generate hybrid answer using LLM if available
        if hasattr(self.base_agent, 'llm_generator'):
            hybrid_prompt = f"""Based on the following sources, provide a comprehensive answer to the query.

Query: {query}

{combined_context}

Instructions: Combine information from both document and web sources. Prioritize the document answer but supplement with web information where helpful. Indicate source types when relevant.

Comprehensive Answer:"""
            
            try:
                # Generate single high-quality answer
                answer = await self.base_agent.llm_generator.provider.generate(
                    hybrid_prompt, temperature=0.5
                )
            except:
                # Fallback to simple combination
                answer = self._simple_hybrid_combination(doc_result, web_results)
        else:
            # Simple combination without LLM
            answer = self._simple_hybrid_combination(doc_result, web_results)
        
        # Calculate combined confidence
        doc_weight = self.config.doc_weight
        web_weight = self.config.web_weight
        
        avg_web_quality = sum(r.quality_score for r in web_results) / len(web_results)
        combined_confidence = (
            doc_result['confidence'] * doc_weight + 
            avg_web_quality * web_weight
        )
        
        return {
            'content': answer,
            'confidence': min(combined_confidence, 1.0),
            'source_type': 'hybrid',
            'strategy': 'hybrid_combination',
            'sources_used': ['documents', 'web'],
            'total_sources': doc_result.get('retrieved_docs', 0) + len(web_results)
        }
    
    async def _create_web_primary_answer(self, query: str, doc_result: Dict, 
                                       web_results: List[WebSearchResult]) -> Dict:
        """Create answer primarily from web sources with document context"""
        
        # Use web as primary source
        web_context = f"Query: {query}\n\nWeb Sources:\n"
        for result in web_results:
            web_context += f"- {result.title}: {result.content or result.snippet}\n"
        
        # Add document context as supplementary
        if doc_result.get('answer'):
            web_context += f"\nAdditional Context: {doc_result['answer']}"
        
        # Generate web-primary answer
        if hasattr(self.base_agent, 'llm_generator'):
            web_prompt = f"""{web_context}

Instructions: Based primarily on the web sources above, provide a comprehensive answer to the query. Use any additional context to supplement but focus on web information.

Answer:"""
            
            try:
                answer = await self.base_agent.llm_generator.provider.generate(
                    web_prompt, temperature=0.4
                )
            except:
                answer = self._simple_web_combination(web_results, doc_result)
        else:
            answer = self._simple_web_combination(web_results, doc_result)
        
        # Use web quality as primary confidence
        avg_web_quality = sum(r.quality_score for r in web_results) / len(web_results)
        confidence = avg_web_quality * 0.8 + doc_result.get('confidence', 0) * 0.2
        
        return {
            'content': answer,
            'confidence': confidence,
            'source_type': 'web_primary',
            'strategy': 'web_fallback',
            'sources_used': ['web', 'documents'],
            'total_sources': len(web_results) + doc_result.get('retrieved_docs', 0)
        }
    
    def _simple_hybrid_combination(self, doc_result: Dict, web_results: List[WebSearchResult]) -> str:
        """Simple combination without LLM"""
        answer = f"Based on available sources:\n\n"
        answer += f"Document Answer: {doc_result['answer']}\n\n"
        answer += "Additional Web Information:\n"
        
        for result in web_results[:2]:
            answer += f"• {result.title}: {result.snippet}\n"
        
        return answer
    
    def _simple_web_combination(self, web_results: List[WebSearchResult], doc_result: Dict) -> str:
        """Simple web-primary combination"""
        answer = "Based on web sources:\n\n"
        
        for result in web_results[:3]:
            answer += f"• {result.title}: {result.content or result.snippet}\n\n"
        
        if doc_result.get('answer'):
            answer += f"Additional context: {doc_result['answer']}"
        
        return answer
    
    async def _train_with_feedback(self, query: str, final_answer: Dict, 
                                 ground_truth: str) -> float:
        """Train the system with feedback"""
        # For now, use the base agent's training
        if hasattr(self.base_agent, 'base_agent'):
            # Enhanced agent
            fake_result = {
                'answer': final_answer['content'],
                'strategy': final_answer.get('strategy', 'hybrid')
            }
            return await self.base_agent.base_agent._compute_loss_and_backprop(
                query, fake_result, ground_truth, ""
            )
        else:
            # Base agent
            fake_result = {
                'answer': final_answer['content'],
                'strategy': final_answer.get('strategy', 'hybrid')
            }
            return await self.base_agent._compute_loss_and_backprop(
                query, fake_result, ground_truth, ""
            )
    
    def _update_stats(self, doc_result: Dict, web_results: List[WebSearchResult], 
                     final_answer: Dict):
        """Update internal statistics"""
        # Update confidence tracking
        total_confidence = self.stats['avg_confidence'] * (self.stats['total_queries'] - 1)
        total_confidence += final_answer['confidence']
        self.stats['avg_confidence'] = total_confidence / self.stats['total_queries']
    
    def get_stats(self) -> Dict:
        """Get usage statistics"""
        if self.stats['total_queries'] == 0:
            return self.stats
        
        return {
            **self.stats,
            'document_only_pct': self.stats['document_only'] / self.stats['total_queries'] * 100,
            'web_fallback_pct': self.stats['web_fallback'] / self.stats['total_queries'] * 100,
            'hybrid_answers_pct': self.stats['hybrid_answers'] / self.stats['total_queries'] * 100
        }
    
    def save_model(self, path: str):
        """Save the trained models"""
        if hasattr(self.base_agent, 'save_model'):
            self.base_agent.save_model(path)
        elif hasattr(self.base_agent, 'base_agent'):
            self.base_agent.base_agent.save_model(path)
    
    def load_model(self, path: str):
        """Load trained models"""
        if hasattr(self.base_agent, 'load_model'):
            self.base_agent.load_model(path)
        elif hasattr(self.base_agent, 'base_agent'):
            self.base_agent.base_agent.load_model(path)

# Example usage and testing
async def demo_hybrid_agent():
    """Demonstrate the hybrid agent capabilities"""
    
    # Setup configuration
    rag_config = RagConfig(
        embedding_model_path="/home/ghost/engunity-ai/backend/models/production/cs_document_embeddings",
        num_candidate_answers=4
    )
    
    web_config = WebSearchConfig(
        search_providers=['duckduckgo'],
        max_search_results=3
    )
    
    hybrid_config = HybridRagConfig(
        rag_config=rag_config,
        web_search_config=web_config,
        confidence_threshold=0.6
    )
    
    # Initialize agent
    agent = HybridRagAgent(hybrid_config)
    
    # Test queries
    test_queries = [
        "What is binary search algorithm?",  # Should find in documents
        "What are the latest developments in quantum computing?",  # Should use web
        "How do neural networks work?",  # Might use hybrid
    ]
    
    for query in test_queries:
        print(f"\n{'='*60}")
        print(f"Query: {query}")
        print('='*60)
        
        result = await agent.answer_query(query)
        
        print(f"Answer: {result['answer']}")
        print(f"Source: {result['source_type']}")
        print(f"Confidence: {result['confidence']:.3f}")
        print(f"Web search used: {result['web_search_used']}")
        print(f"Processing time: {result['processing_time']:.2f}s")
    
    # Print statistics
    print(f"\n{'='*60}")
    print("AGENT STATISTICS")
    print('='*60)
    stats = agent.get_stats()
    for key, value in stats.items():
        if isinstance(value, float):
            print(f"{key}: {value:.2f}")
        else:
            print(f"{key}: {value}")

if __name__ == "__main__":
    asyncio.run(demo_hybrid_agent())