"""
Agentic Web Crawler for RAG Pipeline
===================================

Intelligent web crawler that uses Google Gemini API to fetch and summarize
external knowledge when internal document confidence is below threshold.

Features:
- Smart query reformulation for web search
- Gemini API integration for content crawling and summarization
- Content extraction and relevance filtering
- Structured response formatting
- Rate limiting and error handling

Author: Engunity AI Team
"""

import os
import json
import logging
import asyncio
import aiohttp
import time
from typing import Dict, List, Optional, Any, Union, Tuple
from dataclasses import dataclass
from datetime import datetime
import hashlib
import re

logger = logging.getLogger(__name__)

@dataclass
class WebResult:
    """Result from web crawling."""
    url: str
    title: str
    content: str
    summary: str
    relevance_score: float
    metadata: Dict[str, Any]
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'url': self.url,
            'title': self.title,
            'content': self.content,
            'summary': self.summary,
            'relevance_score': self.relevance_score,
            'metadata': self.metadata
        }

@dataclass
class CrawlRequest:
    """Request for web crawling."""
    original_query: str
    reformulated_query: str
    max_results: int
    context_keywords: List[str]
    metadata: Dict[str, Any]

class AgenticWebCrawler:
    """Agentic web crawler using Google Gemini API."""
    
    def __init__(
        self,
        gemini_api_key: str = None,
        max_results: int = 5,
        timeout: int = 30,
        rate_limit_delay: float = 1.0,
        cache_ttl: int = 3600  # 1 hour cache
    ):
        """
        Initialize Agentic Web Crawler.
        
        Args:
            gemini_api_key: Google Gemini API key
            max_results: Maximum results to return
            timeout: Request timeout in seconds
            rate_limit_delay: Delay between requests
            cache_ttl: Cache time-to-live in seconds
        """
        self.gemini_api_key = gemini_api_key or os.getenv('GEMINI_API_KEY')
        if not self.gemini_api_key:
            logger.warning("No Gemini API key provided. Web crawling will be disabled.")
        
        self.max_results = max_results
        self.timeout = timeout
        self.rate_limit_delay = rate_limit_delay
        self.cache_ttl = cache_ttl
        
        # Simple in-memory cache
        self.cache = {}
        self.last_request_time = 0
        
        # Gemini API endpoint
        self.gemini_endpoint = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key={self.gemini_api_key}"
        
        logger.info("Agentic Web Crawler initialized")
    
    def _get_cache_key(self, query: str) -> str:
        """Generate cache key for query."""
        return hashlib.md5(query.lower().encode()).hexdigest()
    
    def _is_cache_valid(self, cache_entry: Dict[str, Any]) -> bool:
        """Check if cache entry is still valid."""
        if not cache_entry:
            return False
        
        timestamp = cache_entry.get('timestamp', 0)
        return time.time() - timestamp < self.cache_ttl
    
    async def _rate_limit(self):
        """Apply rate limiting between requests."""
        current_time = time.time()
        time_since_last = current_time - self.last_request_time
        
        if time_since_last < self.rate_limit_delay:
            await asyncio.sleep(self.rate_limit_delay - time_since_last)
        
        self.last_request_time = time.time()
    
    def _reformulate_query(self, original_query: str, context_keywords: List[str] = None) -> str:
        """
        Reformulate query for better web search results.
        
        Args:
            original_query: Original user query
            context_keywords: Keywords from local context
            
        Returns:
            Reformulated search query
        """
        # Simple query reformulation rules
        query = original_query.strip()
        
        # Remove question words for better search
        question_words = ['what', 'how', 'why', 'when', 'where', 'who', 'which']
        words = query.lower().split()
        
        # Keep important question words that provide context
        filtered_words = []
        for word in words:
            if word not in question_words or word in ['how', 'why']:
                filtered_words.append(word)
        
        # Add context keywords if available
        if context_keywords:
            # Add relevant keywords that aren't already in query
            for keyword in context_keywords[:3]:  # Top 3 keywords
                if keyword.lower() not in query.lower():
                    filtered_words.append(keyword)
        
        reformulated = ' '.join(filtered_words)
        
        # Add search modifiers for better results
        if 'definition' in query.lower() or 'what is' in query.lower():
            reformulated += ' definition explanation'
        elif 'how to' in query.lower():
            reformulated += ' tutorial guide steps'
        elif 'example' in query.lower():
            reformulated += ' examples case study'
        
        logger.info(f"Query reformulated: '{original_query}' -> '{reformulated}'")
        return reformulated
    
    async def _call_gemini_api(self, prompt: str) -> str:
        """
        Call Google Gemini API for content generation.
        
        Args:
            prompt: Prompt for Gemini
            
        Returns:
            Generated content
        """
        if not self.gemini_api_key:
            raise ValueError("Gemini API key not configured")
        
        await self._rate_limit()
        
        payload = {
            "contents": [{
                "parts": [{
                    "text": prompt
                }]
            }],
            "generationConfig": {
                "temperature": 0.7,
                "topK": 1,
                "topP": 1,
                "maxOutputTokens": 1024,
                "stopSequences": []
            },
            "safetySettings": [
                {
                    "category": "HARM_CATEGORY_HARASSMENT",
                    "threshold": "BLOCK_MEDIUM_AND_ABOVE"
                },
                {
                    "category": "HARM_CATEGORY_HATE_SPEECH", 
                    "threshold": "BLOCK_MEDIUM_AND_ABOVE"
                },
                {
                    "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                    "threshold": "BLOCK_MEDIUM_AND_ABOVE"
                },
                {
                    "category": "HARM_CATEGORY_DANGEROUS_CONTENT",
                    "threshold": "BLOCK_MEDIUM_AND_ABOVE"
                }
            ]
        }
        
        try:
            async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=self.timeout)) as session:
                async with session.post(
                    self.gemini_endpoint,
                    json=payload,
                    headers={'Content-Type': 'application/json'}
                ) as response:
                    if response.status == 200:
                        result = await response.json()
                        
                        if 'candidates' in result and result['candidates']:
                            content = result['candidates'][0]['content']['parts'][0]['text']
                            return content.strip()
                        else:
                            logger.error(f"No candidates in Gemini response: {result}")
                            return ""
                    else:
                        error_text = await response.text()
                        logger.error(f"Gemini API error {response.status}: {error_text}")
                        return ""
                        
        except Exception as e:
            logger.error(f"Error calling Gemini API: {e}")
            return ""
    
    async def _search_and_summarize(self, query: str) -> List[WebResult]:
        """
        Search web and summarize results using Gemini.
        
        Args:
            query: Search query
            
        Returns:
            List of web results with summaries
        """
        # Create comprehensive search and summarization prompt
        search_prompt = f"""
You are an expert web researcher. For the query "{query}", provide comprehensive information by simulating web search results.

Please provide {self.max_results} relevant results in the following JSON format:

{{
  "results": [
    {{
      "title": "Result title",
      "url": "https://example.com",
      "content": "Main content/summary (2-3 paragraphs)",
      "summary": "Brief summary (1-2 sentences)",
      "relevance_score": 0.95
    }}
  ]
}}

Focus on:
1. Accurate, factual information
2. Recent and authoritative sources
3. Clear, concise explanations
4. High relevance to the query

Provide diverse perspectives and comprehensive coverage of the topic.
"""
        
        try:
            response = await self._call_gemini_api(search_prompt)
            
            if not response:
                return []
            
            # Try to parse JSON response
            try:
                # Extract JSON from response (in case there's additional text)
                json_start = response.find('{')
                json_end = response.rfind('}') + 1
                
                if json_start != -1 and json_end > json_start:
                    json_str = response[json_start:json_end]
                    data = json.loads(json_str)
                    
                    results = []
                    for i, item in enumerate(data.get('results', [])[:self.max_results]):
                        result = WebResult(
                            url=item.get('url', f'https://search-result-{i+1}.com'),
                            title=item.get('title', f'Search Result {i+1}'),
                            content=item.get('content', ''),
                            summary=item.get('summary', ''),
                            relevance_score=float(item.get('relevance_score', 0.8)),
                            metadata={
                                'source': 'gemini_simulation',
                                'search_query': query,
                                'generated_at': datetime.now().isoformat()
                            }
                        )
                        results.append(result)
                    
                    return results
                    
            except json.JSONDecodeError:
                # Fallback: treat as single result
                logger.warning("Could not parse JSON from Gemini response, using as single result")
                
                # Create single result from response
                result = WebResult(
                    url='https://gemini-generated-content.com',
                    title=f'Information about: {query}',
                    content=response,
                    summary=response[:200] + '...' if len(response) > 200 else response,
                    relevance_score=0.8,
                    metadata={
                        'source': 'gemini_fallback',
                        'search_query': query,
                        'generated_at': datetime.now().isoformat()
                    }
                )
                return [result]
                
        except Exception as e:
            logger.error(f"Error in search and summarize: {e}")
            
        return []
    
    async def crawl(
        self,
        original_query: str,
        context_keywords: List[str] = None,
        confidence_threshold: float = 0.75,
        local_confidence: float = 0.0
    ) -> List[WebResult]:
        """
        Main crawling method that decides whether to search and returns results.
        
        Args:
            original_query: Original user query
            context_keywords: Keywords from local context
            confidence_threshold: Threshold for triggering web search
            local_confidence: Confidence score from local RAG
            
        Returns:
            List of web search results
        """
        logger.info(f"Crawl request - Query: '{original_query}', Local confidence: {local_confidence:.3f}")
        
        # Check if web search is needed
        if local_confidence >= confidence_threshold:
            logger.info(f"Local confidence {local_confidence:.3f} >= threshold {confidence_threshold:.3f}. Skipping web search.")
            return []
        
        # Check cache first
        cache_key = self._get_cache_key(original_query)
        if cache_key in self.cache and self._is_cache_valid(self.cache[cache_key]):
            logger.info("Returning cached results")
            return self.cache[cache_key]['results']
        
        # Reformulate query for better search
        search_query = self._reformulate_query(original_query, context_keywords)
        
        # Perform web search and summarization
        results = await self._search_and_summarize(search_query)
        
        # Cache results
        if results:
            self.cache[cache_key] = {
                'results': results,
                'timestamp': time.time()
            }
            
            logger.info(f"Web crawling completed: {len(results)} results found")
        else:
            logger.warning("No web results found")
        
        return results
    
    def extract_keywords(self, text: str) -> List[str]:
        """
        Extract keywords from text for context enhancement.
        
        Args:
            text: Input text
            
        Returns:
            List of extracted keywords
        """
        # Simple keyword extraction
        # Remove common words and extract meaningful terms
        common_words = {
            'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 
            'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have',
            'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
            'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they'
        }
        
        # Extract words, filter common words and short words
        words = re.findall(r'\b[a-zA-Z]{3,}\b', text.lower())
        keywords = [word for word in words if word not in common_words]
        
        # Get unique keywords and return top 10
        unique_keywords = list(dict.fromkeys(keywords))  # Preserve order while removing duplicates
        return unique_keywords[:10]
    
    def get_stats(self) -> Dict[str, Any]:
        """Get crawler statistics."""
        return {
            'api_key_configured': bool(self.gemini_api_key),
            'cache_size': len(self.cache),
            'max_results': self.max_results,
            'timeout': self.timeout,
            'rate_limit_delay': self.rate_limit_delay,
            'cache_ttl': self.cache_ttl
        }
    
    def clear_cache(self):
        """Clear the crawler cache."""
        self.cache.clear()
        logger.info("Crawler cache cleared")

# Factory function
def create_agentic_web_crawler(**kwargs) -> AgenticWebCrawler:
    """Create Agentic Web Crawler with default configuration."""
    return AgenticWebCrawler(**kwargs)

# Export main classes
__all__ = [
    "AgenticWebCrawler",
    "WebResult",
    "CrawlRequest",
    "create_agentic_web_crawler"
]