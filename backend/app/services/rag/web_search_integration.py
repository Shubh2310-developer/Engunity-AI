#!/usr/bin/env python3
"""
Web Search Integration for Smart RAG Agent

This module adds web search capabilities as a fallback when document-based
answers are insufficient. It includes:

1. Web search providers (multiple APIs)
2. Search result processing and filtering
3. Content extraction and summarization
4. Quality assessment of web sources
5. Integration with the existing RAG pipeline

Priority: Documents First → Web Search Fallback → Hybrid Answer
"""

import asyncio
import aiohttp
import logging
import json
import re
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass
from urllib.parse import quote_plus, urljoin
from bs4 import BeautifulSoup
import time
from datetime import datetime

logger = logging.getLogger(__name__)

@dataclass
class WebSearchConfig:
    """Configuration for web search integration"""
    # Search providers
    search_providers: List[str] = None  # ['duckduckgo', 'serp', 'bing']
    serp_api_key: Optional[str] = None
    bing_api_key: Optional[str] = None
    
    # Search parameters
    max_search_results: int = 5
    max_content_length: int = 2000
    search_timeout: float = 10.0
    content_timeout: float = 15.0
    
    # Quality filtering
    min_content_length: int = 100
    trusted_domains: List[str] = None
    blocked_domains: List[str] = None
    
    # Fallback thresholds
    document_confidence_threshold: float = 0.7
    document_relevance_threshold: float = 0.6
    enable_web_fallback: bool = True
    
    def __post_init__(self):
        if self.search_providers is None:
            self.search_providers = ['duckduckgo']  # Default to free option
        
        if self.trusted_domains is None:
            self.trusted_domains = [
                'stackoverflow.com', 'github.com', 'docs.python.org',
                'developer.mozilla.org', 'wikipedia.org', 'arxiv.org',
                'medium.com', 'towardsdatascience.com', 'machinelearningmastery.com',
                'cs.stanford.edu', 'cs.cmu.edu', 'mit.edu'
            ]
        
        if self.blocked_domains is None:
            self.blocked_domains = [
                'facebook.com', 'twitter.com', 'instagram.com',
                'pinterest.com', 'reddit.com'  # Social media (often low quality for tech answers)
            ]

class WebSearchResult:
    """Represents a web search result with metadata"""
    
    def __init__(self, title: str, url: str, snippet: str, 
                 content: str = "", source: str = "", rank: int = 0):
        self.title = title
        self.url = url
        self.snippet = snippet
        self.content = content
        self.source = source
        self.rank = rank
        self.quality_score = 0.0
        self.relevance_score = 0.0
        self.extracted_at = datetime.now()
        
    def to_dict(self) -> Dict:
        return {
            'title': self.title,
            'url': self.url,
            'snippet': self.snippet,
            'content': self.content[:500] + "..." if len(self.content) > 500 else self.content,
            'source': self.source,
            'rank': self.rank,
            'quality_score': self.quality_score,
            'relevance_score': self.relevance_score,
            'extracted_at': self.extracted_at.isoformat()
        }

class DuckDuckGoSearchProvider:
    """Free DuckDuckGo search provider"""
    
    def __init__(self, config: WebSearchConfig):
        self.config = config
        self.base_url = "https://duckduckgo.com"
        
    async def search(self, query: str, max_results: int = 5) -> List[WebSearchResult]:
        """Search using DuckDuckGo"""
        try:
            # DuckDuckGo instant answer API
            search_url = f"https://api.duckduckgo.com/?q={quote_plus(query)}&format=json&no_html=1&skip_disambig=1"
            
            async with aiohttp.ClientSession() as session:
                async with session.get(search_url, timeout=self.config.search_timeout) as response:
                    if response.status == 200:
                        data = await response.json()
                        results = []
                        
                        # Process instant answer
                        if data.get('AbstractText'):
                            result = WebSearchResult(
                                title=data.get('Heading', 'DuckDuckGo Instant Answer'),
                                url=data.get('AbstractURL', ''),
                                snippet=data.get('AbstractText', ''),
                                content=data.get('AbstractText', ''),
                                source='duckduckgo_instant',
                                rank=0
                            )
                            results.append(result)
                        
                        # Process related topics
                        for i, topic in enumerate(data.get('RelatedTopics', [])[:max_results-1]):
                            if isinstance(topic, dict) and 'Text' in topic:
                                result = WebSearchResult(
                                    title=topic.get('FirstURL', '').split('/')[-1] or f"Topic {i+1}",
                                    url=topic.get('FirstURL', ''),
                                    snippet=topic.get('Text', ''),
                                    content=topic.get('Text', ''),
                                    source='duckduckgo_topic',
                                    rank=i+1
                                )
                                results.append(result)
                        
                        return results[:max_results]
        except Exception as e:
            logger.error(f"DuckDuckGo search error: {e}")
        
        return []

class SerpApiProvider:
    """SerpAPI search provider (requires API key)"""
    
    def __init__(self, config: WebSearchConfig):
        self.config = config
        self.api_key = config.serp_api_key
        
    async def search(self, query: str, max_results: int = 5) -> List[WebSearchResult]:
        """Search using SerpAPI"""
        if not self.api_key:
            logger.warning("SerpAPI key not provided")
            return []
            
        try:
            search_url = "https://serpapi.com/search"
            params = {
                'api_key': self.api_key,
                'engine': 'google',
                'q': query,
                'num': max_results,
                'hl': 'en',
                'gl': 'us'
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.get(search_url, params=params, 
                                     timeout=self.config.search_timeout) as response:
                    if response.status == 200:
                        data = await response.json()
                        results = []
                        
                        for i, item in enumerate(data.get('organic_results', [])[:max_results]):
                            result = WebSearchResult(
                                title=item.get('title', ''),
                                url=item.get('link', ''),
                                snippet=item.get('snippet', ''),
                                source='serp_google',
                                rank=i
                            )
                            results.append(result)
                        
                        return results
        except Exception as e:
            logger.error(f"SerpAPI search error: {e}")
        
        return []

class BingSearchProvider:
    """Bing Web Search API provider"""
    
    def __init__(self, config: WebSearchConfig):
        self.config = config
        self.api_key = config.bing_api_key
        
    async def search(self, query: str, max_results: int = 5) -> List[WebSearchResult]:
        """Search using Bing API"""
        if not self.api_key:
            logger.warning("Bing API key not provided")
            return []
            
        try:
            search_url = "https://api.bing.microsoft.com/v7.0/search"
            headers = {'Ocp-Apim-Subscription-Key': self.api_key}
            params = {
                'q': query,
                'count': max_results,
                'mkt': 'en-US',
                'responseFilter': 'Webpages'
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.get(search_url, headers=headers, params=params,
                                     timeout=self.config.search_timeout) as response:
                    if response.status == 200:
                        data = await response.json()
                        results = []
                        
                        for i, item in enumerate(data.get('webPages', {}).get('value', [])[:max_results]):
                            result = WebSearchResult(
                                title=item.get('name', ''),
                                url=item.get('url', ''),
                                snippet=item.get('snippet', ''),
                                source='bing',
                                rank=i
                            )
                            results.append(result)
                        
                        return results
        except Exception as e:
            logger.error(f"Bing search error: {e}")
        
        return []

class WebContentExtractor:
    """Extracts and processes content from web pages"""
    
    def __init__(self, config: WebSearchConfig):
        self.config = config
        
    async def extract_content(self, url: str) -> str:
        """Extract main content from a webpage"""
        try:
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.get(url, headers=headers, 
                                     timeout=self.config.content_timeout) as response:
                    if response.status == 200:
                        html = await response.text()
                        return self._parse_content(html)
        except Exception as e:
            logger.error(f"Content extraction error for {url}: {e}")
        
        return ""
    
    def _parse_content(self, html: str) -> str:
        """Parse HTML and extract main content"""
        try:
            soup = BeautifulSoup(html, 'html.parser')
            
            # Remove unwanted elements
            for element in soup(['script', 'style', 'nav', 'header', 'footer', 'aside']):
                element.decompose()
            
            # Try to find main content areas
            main_content = None
            for selector in ['main', 'article', '.content', '#content', '.post', '.entry']:
                main_content = soup.select_one(selector)
                if main_content:
                    break
            
            if not main_content:
                main_content = soup.find('body')
            
            if main_content:
                # Get text and clean it
                text = main_content.get_text(separator=' ', strip=True)
                # Remove extra whitespace
                text = re.sub(r'\s+', ' ', text)
                # Limit length
                if len(text) > self.config.max_content_length:
                    text = text[:self.config.max_content_length] + "..."
                return text
        except Exception as e:
            logger.error(f"HTML parsing error: {e}")
        
        return ""

class WebSearchManager:
    """Manages multiple search providers and result processing"""
    
    def __init__(self, config: WebSearchConfig):
        self.config = config
        self.providers = self._initialize_providers()
        self.content_extractor = WebContentExtractor(config)
        
    def _initialize_providers(self) -> Dict:
        """Initialize available search providers"""
        providers = {}
        
        if 'duckduckgo' in self.config.search_providers:
            providers['duckduckgo'] = DuckDuckGoSearchProvider(self.config)
        
        if 'serp' in self.config.search_providers and self.config.serp_api_key:
            providers['serp'] = SerpApiProvider(self.config)
            
        if 'bing' in self.config.search_providers and self.config.bing_api_key:
            providers['bing'] = BingSearchProvider(self.config)
        
        logger.info(f"Initialized web search providers: {list(providers.keys())}")
        return providers
    
    async def search(self, query: str) -> List[WebSearchResult]:
        """Search using all available providers"""
        all_results = []
        
        # Search with all providers
        search_tasks = []
        for provider_name, provider in self.providers.items():
            task = provider.search(query, self.config.max_search_results)
            search_tasks.append((provider_name, task))
        
        # Collect results
        for provider_name, task in search_tasks:
            try:
                results = await task
                for result in results:
                    result.source = f"{result.source}_{provider_name}"
                all_results.extend(results)
            except Exception as e:
                logger.error(f"Search error with {provider_name}: {e}")
        
        # Filter and deduplicate
        filtered_results = self._filter_results(all_results)
        
        # Extract content for top results
        await self._extract_content_for_results(filtered_results[:self.config.max_search_results])
        
        # Score results
        self._score_results(filtered_results, query)
        
        # Sort by quality score
        filtered_results.sort(key=lambda x: x.quality_score, reverse=True)
        
        return filtered_results[:self.config.max_search_results]
    
    def _filter_results(self, results: List[WebSearchResult]) -> List[WebSearchResult]:
        """Filter and deduplicate search results"""
        seen_urls = set()
        filtered = []
        
        for result in results:
            # Skip if URL already seen
            if result.url in seen_urls:
                continue
                
            # Check domain filtering
            domain = self._extract_domain(result.url)
            
            if domain in self.config.blocked_domains:
                continue
                
            # Check minimum content length
            if len(result.snippet) < self.config.min_content_length:
                continue
            
            seen_urls.add(result.url)
            filtered.append(result)
        
        return filtered
    
    async def _extract_content_for_results(self, results: List[WebSearchResult]):
        """Extract full content for search results"""
        content_tasks = []
        
        for result in results:
            if result.url and not result.content:
                task = self.content_extractor.extract_content(result.url)
                content_tasks.append((result, task))
        
        # Extract content concurrently
        for result, task in content_tasks:
            try:
                content = await task
                if content:
                    result.content = content
            except Exception as e:
                logger.error(f"Content extraction failed for {result.url}: {e}")
    
    def _score_results(self, results: List[WebSearchResult], query: str):
        """Score results based on quality and relevance"""
        query_terms = set(query.lower().split())
        
        for result in results:
            # Domain trust score
            domain = self._extract_domain(result.url)
            domain_score = 1.0 if domain in self.config.trusted_domains else 0.5
            
            # Content quality score
            content_length = len(result.content or result.snippet)
            content_score = min(1.0, content_length / 1000)  # Normalize to 1000 chars
            
            # Relevance score (keyword overlap)
            result_text = f"{result.title} {result.snippet} {result.content}".lower()
            matching_terms = sum(1 for term in query_terms if term in result_text)
            relevance_score = matching_terms / len(query_terms) if query_terms else 0
            
            # Rank score (earlier results are better)
            rank_score = 1.0 / (result.rank + 1)
            
            # Combined score
            result.quality_score = (
                domain_score * 0.3 +
                content_score * 0.2 +
                relevance_score * 0.4 +
                rank_score * 0.1
            )
            result.relevance_score = relevance_score
    
    def _extract_domain(self, url: str) -> str:
        """Extract domain from URL"""
        try:
            from urllib.parse import urlparse
            return urlparse(url).netloc.lower()
        except:
            return ""

class AnswerQualityAssessment:
    """Assesses the quality and completeness of answers"""
    
    def __init__(self, embedding_model):
        self.embedding_model = embedding_model
        
    def assess_document_answer_quality(self, query: str, answer: str, 
                                     context: str, confidence: float) -> Dict:
        """Assess if document-based answer is sufficient"""
        
        # Check confidence score
        confidence_sufficient = confidence >= 0.7
        
        # Check answer length and content
        answer_length_ok = len(answer.strip()) >= 50
        
        # Check if answer actually addresses the query
        query_terms = set(query.lower().split())
        answer_terms = set(answer.lower().split())
        term_overlap = len(query_terms.intersection(answer_terms)) / len(query_terms)
        relevance_ok = term_overlap >= 0.3
        
        # Check for generic/templated responses
        generic_phrases = [
            "based on the provided context",
            "the solution involves multiple steps",
            "additional context considerations",
            "creative approaches may yield"
        ]
        is_generic = any(phrase in answer.lower() for phrase in generic_phrases)
        
        # Semantic similarity between query and answer
        try:
            query_emb = self.embedding_model.encode(query, convert_to_tensor=True)
            answer_emb = self.embedding_model.encode(answer, convert_to_tensor=True)
            semantic_similarity = torch.cosine_similarity(query_emb, answer_emb, dim=0).item()
        except:
            semantic_similarity = 0.5
        
        semantic_ok = semantic_similarity >= 0.4
        
        # Overall assessment
        is_sufficient = (
            confidence_sufficient and
            answer_length_ok and
            relevance_ok and
            not is_generic and
            semantic_ok
        )
        
        return {
            'is_sufficient': is_sufficient,
            'confidence_score': confidence,
            'answer_length': len(answer),
            'term_overlap': term_overlap,
            'is_generic': is_generic,
            'semantic_similarity': semantic_similarity,
            'reasons': {
                'confidence_sufficient': confidence_sufficient,
                'answer_length_ok': answer_length_ok,
                'relevance_ok': relevance_ok,
                'not_generic': not is_generic,
                'semantic_ok': semantic_ok
            }
        }

# Example usage and testing
async def test_web_search():
    """Test web search functionality"""
    config = WebSearchConfig(
        search_providers=['duckduckgo'],
        max_search_results=3
    )
    
    manager = WebSearchManager(config)
    
    query = "What is machine learning?"
    results = await manager.search(query)
    
    print(f"Search results for: {query}")
    for i, result in enumerate(results):
        print(f"\n{i+1}. {result.title}")
        print(f"   URL: {result.url}")
        print(f"   Score: {result.quality_score:.3f}")
        print(f"   Snippet: {result.snippet[:100]}...")

if __name__ == "__main__":
    asyncio.run(test_web_search())