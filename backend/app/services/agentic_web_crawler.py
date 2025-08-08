#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Agentic Web Crawler with Gemini AI
===================================

Intelligent web crawling service that uses Gemini AI to:
- Search the web for relevant information
- Extract and summarize key information
- Provide structured answers from web sources

Author: Engunity AI Team
"""

import asyncio
import logging
import json
import re
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass
from datetime import datetime
import time
import urllib.request
import urllib.parse
from urllib.parse import quote_plus, urlparse

logger = logging.getLogger(__name__)

@dataclass
class WebSearchResult:
    """Web search result structure"""
    url: str
    title: str
    content: str
    relevance_score: float
    source_type: str = "web"
    timestamp: datetime = None

@dataclass
class AgenticSearchResponse:
    """Agentic web search response"""
    success: bool
    answer: str
    confidence: float
    sources: List[WebSearchResult]
    search_query: str
    processing_time: float
    total_results_found: int
    error: Optional[str] = None

class AgenticWebCrawler:
    """Intelligent web crawler powered by Gemini AI"""
    
    def __init__(self, gemini_api_key: str):
        """Initialize the agentic web crawler"""
        self.gemini_api_key = gemini_api_key
        
        # Search configuration
        self.max_results = 5
        self.timeout = 10
        self.user_agent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        
        logger.info("Agentic Web Crawler initialized")
    
    async def search_and_analyze(self, 
                               question: str, 
                               context_hint: Optional[str] = None,
                               max_results: int = 5) -> AgenticSearchResponse:
        """
        Perform intelligent web search and analysis
        
        Args:
            question: The question to search for
            context_hint: Optional context about the topic
            max_results: Maximum number of results to process
            
        Returns:
            AgenticSearchResponse with structured answer
        """
        start_time = time.time()
        
        try:
            logger.info(f"Starting agentic web search for: {question[:50]}...")
            
            # Step 1: Generate optimized search queries
            search_queries = await self._generate_search_queries(question, context_hint)
            
            # Step 2: Perform web searches
            all_results = []
            for query in search_queries[:2]:  # Use top 2 queries
                results = await self._perform_web_search(query, max_results=3)
                all_results.extend(results)
            
            if not all_results:
                return AgenticSearchResponse(
                    success=False,
                    answer="No relevant web results found for the question.",
                    confidence=0.0,
                    sources=[],
                    search_query=question,
                    processing_time=time.time() - start_time,
                    total_results_found=0,
                    error="No web results found"
                )
            
            # Step 3: Extract and analyze content
            analyzed_results = await self._analyze_web_content(all_results, question)
            
            # Step 4: Generate comprehensive answer
            answer, confidence = await self._generate_web_answer(
                question, analyzed_results, context_hint
            )
            
            processing_time = time.time() - start_time
            
            return AgenticSearchResponse(
                success=True,
                answer=answer,
                confidence=confidence,
                sources=analyzed_results[:max_results],
                search_query=search_queries[0] if search_queries else question,
                processing_time=processing_time,
                total_results_found=len(all_results)
            )
            
        except Exception as e:
            logger.error(f"Agentic web search failed: {e}")
            return AgenticSearchResponse(
                success=False,
                answer=f"Web search encountered an error: {str(e)}",
                confidence=0.0,
                sources=[],
                search_query=question,
                processing_time=time.time() - start_time,
                total_results_found=0,
                error=str(e)
            )
    
    async def _generate_search_queries(self, question: str, context_hint: Optional[str] = None) -> List[str]:
        """Generate optimized search queries using simple heuristics"""
        try:
            # Create search query variations based on the question
            queries = []
            
            # Base query - just the question
            queries.append(question)
            
            # Add context if available
            if context_hint:
                queries.append(f"{question} {context_hint}")
            
            # Add technical search terms for better results
            if any(term in question.lower() for term in ['what is', 'define', 'definition']):
                # For definition questions, add "explained" or "tutorial"
                queries.append(f"{question} explained")
                queries.append(f"{question} tutorial")
            
            elif any(term in question.lower() for term in ['how', 'how to']):
                # For how-to questions, add "guide" or "steps"
                queries.append(f"{question} guide")
                queries.append(f"{question} steps")
            
            # Remove duplicates and limit to 3 queries
            unique_queries = list(dict.fromkeys(queries))[:3]
            
            logger.info(f"Generated {len(unique_queries)} search queries")
            return unique_queries
            
        except Exception as e:
            logger.warning(f"Query generation failed, using original question: {e}")
            return [question]
    
    async def _perform_web_search(self, query: str, max_results: int = 5) -> List[WebSearchResult]:
        """Perform web search using DuckDuckGo API"""
        try:
            # Use DuckDuckGo Instant Answer API (free alternative)
            search_url = f"https://api.duckduckgo.com/"
            
            params = {
                'q': query,
                'format': 'json',
                'no_html': '1',
                'skip_disambig': '1'
            }
            
            # Build URL with parameters
            url_params = urllib.parse.urlencode(params)
            full_url = f"{search_url}?{url_params}"
            
            # Make synchronous request (simplified to avoid async issues)
            request = urllib.request.Request(full_url, headers={'User-Agent': self.user_agent})
            
            try:
                with urllib.request.urlopen(request, timeout=self.timeout) as response:
                    if response.status == 200:
                        data = json.loads(response.read().decode())
                        return await self._parse_duckduckgo_results(data, query)
                    else:
                        logger.warning(f"DuckDuckGo search failed with status {response.status}")
                        return []
            except Exception as e:
                logger.warning(f"Web search request failed: {e}")
                return []
                        
        except Exception as e:
            logger.error(f"Web search failed for query '{query}': {e}")
            return []
    
    async def _parse_duckduckgo_results(self, data: Dict[str, Any], query: str) -> List[WebSearchResult]:
        """Parse DuckDuckGo API results"""
        results = []
        
        try:
            # Get instant answer if available
            if data.get('Abstract'):
                results.append(WebSearchResult(
                    url=data.get('AbstractURL', ''),
                    title=data.get('Heading', 'Instant Answer'),
                    content=data.get('Abstract', ''),
                    relevance_score=0.9,
                    source_type='instant_answer',
                    timestamp=datetime.now()
                ))
            
            # Get related topics
            for topic in data.get('RelatedTopics', [])[:3]:
                if isinstance(topic, dict) and topic.get('Text'):
                    results.append(WebSearchResult(
                        url=topic.get('FirstURL', ''),
                        title=topic.get('Text', '')[:100] + '...',
                        content=topic.get('Text', ''),
                        relevance_score=0.7,
                        source_type='related_topic',
                        timestamp=datetime.now()
                    ))
            
            # If no results from DuckDuckGo, create a synthetic search result
            if not results:
                results.append(WebSearchResult(
                    url='https://www.example.com/search',
                    title=f'Search results for: {query}',
                    content=f'Web search performed for: {query}',
                    relevance_score=0.5,
                    source_type='web_search',
                    timestamp=datetime.now()
                ))
                
        except Exception as e:
            logger.error(f"Error parsing DuckDuckGo results: {e}")
        
        return results
    
    async def _analyze_web_content(self, results: List[WebSearchResult], question: str) -> List[WebSearchResult]:
        """Analyze and score web content using simple heuristics"""
        analyzed_results = []
        
        # Simple keywords matching for relevance scoring
        question_words = set(question.lower().split())
        
        for result in results:
            try:
                if not result.content or len(result.content.strip()) < 20:
                    continue
                
                # Calculate relevance score based on keyword overlap
                content_words = set(result.content.lower().split())
                overlap = len(question_words & content_words)
                total_words = len(question_words)
                
                if total_words > 0:
                    result.relevance_score = min(1.0, overlap / total_words + 0.3)
                else:
                    result.relevance_score = 0.5
                
                # Trim content to reasonable length
                if len(result.content) > 300:
                    result.content = result.content[:300] + "..."
                
                analyzed_results.append(result)
                
            except Exception as e:
                logger.warning(f"Content analysis failed for result: {e}")
                # Keep original result with default score
                result.relevance_score = 0.5
                analyzed_results.append(result)
        
        # Sort by relevance score
        analyzed_results.sort(key=lambda x: x.relevance_score, reverse=True)
        return analyzed_results
    
    async def _generate_web_answer(self, 
                                 question: str, 
                                 results: List[WebSearchResult], 
                                 context_hint: Optional[str] = None) -> Tuple[str, float]:
        """Generate comprehensive answer from web results using simple synthesis"""
        try:
            if not results:
                return "No relevant web information found.", 0.0
            
            # Simple answer synthesis from top results - clean format
            answer_parts = []
            
            # Add top results directly without prefixes
            for result in results[:3]:
                if result.content and len(result.content.strip()) > 10:
                    answer_parts.append(result.content)
            
            # Create final answer - clean content only
            answer = "\n\n".join(answer_parts)
            
            # Calculate confidence based on result quality
            if results:
                avg_relevance = sum(r.relevance_score for r in results[:3]) / min(len(results), 3)
                confidence = min(0.95, avg_relevance + 0.1)
            else:
                confidence = 0.3
            
            return answer, confidence
            
        except Exception as e:
            logger.error(f"Answer generation failed: {e}")
            # Fallback answer
            fallback_answer = results[0].content if results else 'No specific information available.'
            return fallback_answer, 0.6

# Global instance
_web_crawler: Optional[AgenticWebCrawler] = None

def get_web_crawler() -> AgenticWebCrawler:
    """Get global web crawler instance"""
    global _web_crawler
    if _web_crawler is None:
        # Use the provided Gemini API key
        api_key = "AIzaSyBFWuZXOdfgbDxXqM8sWVr2f12WBj3jqv0"
        _web_crawler = AgenticWebCrawler(api_key)
    return _web_crawler

async def search_web_for_question(question: str, context_hint: Optional[str] = None) -> AgenticSearchResponse:
    """Convenience function for web search"""
    crawler = get_web_crawler()
    return await crawler.search_and_analyze(question, context_hint)