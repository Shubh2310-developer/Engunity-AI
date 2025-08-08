"""
Wikipedia Fallback Agent
========================

Intelligent fallback agent that searches Wikipedia when:
- Local RAG produces low-confidence answers
- Retrieved chunks are irrelevant 
- Question requires general knowledge not in documents

Features:
- Wikipedia API integration
- Smart query reformulation
- Answer synthesis and formatting
- Confidence scoring
"""

import json
import logging
import re
import requests
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass
import time
from urllib.parse import quote

logger = logging.getLogger(__name__)

@dataclass
class WikipediaResult:
    """Result from Wikipedia search."""
    title: str
    content: str
    url: str
    confidence: float
    metadata: Dict[str, Any]
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'title': self.title,
            'content': self.content,
            'url': self.url,
            'confidence': float(self.confidence),
            'metadata': self.metadata
        }

@dataclass
class WikipediaAnswer:
    """Formatted answer from Wikipedia."""
    answer: str
    confidence: float
    sources: List[WikipediaResult]
    metadata: Dict[str, Any]

class WikipediaFallbackAgent:
    """Wikipedia fallback agent for unanswerable questions."""
    
    def __init__(
        self,
        language: str = "en",
        max_search_results: int = 3,
        max_content_length: int = 2000
    ):
        self.language = language
        self.max_search_results = max_search_results
        self.max_content_length = max_content_length
        
        # Wikipedia API endpoints
        self.search_url = f"https://{language}.wikipedia.org/api/rest_v1/page/summary/"
        self.api_url = f"https://{language}.wikipedia.org/w/api.php"
        
        # Headers for API requests
        self.headers = {
            'User-Agent': 'Engunity-AI/1.0 (https://engunity.ai) RAG-Fallback-Agent'
        }
        
        logger.info(f"Wikipedia fallback agent initialized for {language} language")
    
    def _clean_query(self, query: str) -> List[str]:
        """Clean and reformulate query for Wikipedia search."""
        
        # Remove question words and create search terms
        query_variations = []
        
        # Original query
        cleaned = re.sub(r'\b(?:what|how|why|when|where|who|which|is|are|was|were|does|do|did|can|could|will|would)\b', '', query.lower())
        cleaned = re.sub(r'[^\w\s]', ' ', cleaned)
        cleaned = ' '.join(cleaned.split())
        
        if cleaned:
            query_variations.append(cleaned)
        
        # Extract key nouns/concepts
        important_words = re.findall(r'\b[A-Z][a-z]*(?:\s+[A-Z][a-z]*)*\b', query)
        for word in important_words:
            if len(word) > 3:
                query_variations.append(word)
        
        # Technical terms and concepts
        tech_patterns = [
            r'\b([A-Z][a-z]*(?:[A-Z][a-z]*)+)\b',  # CamelCase
            r'\b([a-z]+(?:-[a-z]+)+)\b',  # hyphenated-terms
            r'\b([A-Z]{2,})\b'  # ACRONYMS
        ]
        
        for pattern in tech_patterns:
            matches = re.findall(pattern, query)
            query_variations.extend(matches)
        
        # Remove duplicates and short terms
        unique_queries = []
        for q in query_variations:
            if q and len(q) > 2 and q not in unique_queries:
                unique_queries.append(q)
        
        return unique_queries[:5]  # Limit to 5 search terms
    
    def _search_wikipedia(self, search_term: str) -> List[Dict[str, Any]]:
        """Search Wikipedia for articles."""
        
        try:
            # First, search for page titles
            search_params = {
                'action': 'query',
                'format': 'json',
                'list': 'search',
                'srsearch': search_term,
                'srlimit': self.max_search_results
            }
            
            response = requests.get(self.api_url, params=search_params, headers=self.headers, timeout=10)
            response.raise_for_status()
            
            search_data = response.json()
            
            if 'query' not in search_data or 'search' not in search_data['query']:
                return []
            
            results = []
            for page in search_data['query']['search']:
                page_title = page['title']
                
                # Get page summary
                try:
                    summary_url = self.search_url + quote(page_title)
                    summary_response = requests.get(summary_url, headers=self.headers, timeout=5)
                    
                    if summary_response.status_code == 200:
                        summary_data = summary_response.json()
                        
                        result = {
                            'title': summary_data.get('title', page_title),
                            'extract': summary_data.get('extract', ''),
                            'url': summary_data.get('content_urls', {}).get('desktop', {}).get('page', ''),
                            'thumbnail': summary_data.get('thumbnail', {}).get('source', ''),
                            'search_score': page.get('score', 0)
                        }
                        results.append(result)
                        
                except Exception as e:
                    logger.warning(f"Failed to get summary for {page_title}: {e}")
                    continue
            
            return results
            
        except Exception as e:
            logger.error(f"Wikipedia search failed for '{search_term}': {e}")
            return []
    
    def _score_relevance(self, query: str, result: Dict[str, Any]) -> float:
        """Score how relevant a Wikipedia result is to the query."""
        
        title = result.get('title', '').lower()
        extract = result.get('extract', '').lower()
        query_lower = query.lower()
        
        score = 0.0
        
        # Title relevance (high weight)
        query_words = set(re.findall(r'\b\w+\b', query_lower))
        title_words = set(re.findall(r'\b\w+\b', title))
        
        if query_words and title_words:
            title_overlap = len(query_words & title_words) / len(query_words)
            score += title_overlap * 0.5
        
        # Content relevance
        extract_words = set(re.findall(r'\b\w+\b', extract))
        if query_words and extract_words:
            content_overlap = len(query_words & extract_words) / len(query_words)
            score += content_overlap * 0.3
        
        # Exact phrase matching
        if any(word in title for word in query_words if len(word) > 3):
            score += 0.2
        
        # Search score from Wikipedia
        search_score = result.get('search_score', 0) / 1000  # Normalize
        score += min(search_score, 0.1)
        
        return min(score, 1.0)
    
    def _format_answer(self, query: str, results: List[WikipediaResult]) -> str:
        """Format Wikipedia results into a comprehensive answer."""
        
        if not results:
            return json.dumps({
                "answer": "I apologize, but I couldn't find relevant information to answer your question.",
                "confidence": 0.1,
                "source_chunks_used": []
            }, indent=2)
        
        # Use the best result as primary source
        best_result = results[0]
        
        # Create comprehensive answer
        answer_parts = []
        
        # Introduction
        if "what is" in query.lower():
            answer_parts.append(f"**{best_result.title}**")
        
        # Main content
        content = best_result.content
        if len(content) > self.max_content_length:
            content = content[:self.max_content_length] + "..."
        
        answer_parts.append(content)
        
        # Additional sources if available
        if len(results) > 1:
            answer_parts.append(f"\n**Additional Information:**")
            for result in results[1:]:
                short_content = result.content[:200] + "..." if len(result.content) > 200 else result.content
                answer_parts.append(f"- {result.title}: {short_content}")
        
        # Source attribution
        sources_used = [f"Wikipedia: {result.title}" for result in results]
        
        final_answer = {
            "answer": "\n\n".join(answer_parts),
            "confidence": best_result.confidence,
            "source_chunks_used": sources_used
        }
        
        return json.dumps(final_answer, indent=2)
    
    def search_and_answer(self, query: str) -> WikipediaAnswer:
        """Search Wikipedia and generate an answer."""
        
        start_time = time.time()
        
        # Clean and reformulate query
        search_terms = self._clean_query(query)
        
        if not search_terms:
            logger.warning("No valid search terms extracted from query")
            return WikipediaAnswer(
                answer=json.dumps({
                    "answer": "I couldn't extract meaningful search terms from your question.",
                    "confidence": 0.1,
                    "source_chunks_used": []
                }, indent=2),
                confidence=0.1,
                sources=[],
                metadata={'error': 'no_search_terms'}
            )
        
        # Search Wikipedia with different terms
        all_results = []
        for term in search_terms:
            results = self._search_wikipedia(term)
            all_results.extend(results)
            
            # Don't make too many requests
            time.sleep(0.1)
        
        if not all_results:
            logger.warning("No Wikipedia results found")
            return WikipediaAnswer(
                answer=json.dumps({
                    "answer": "I couldn't find relevant information on Wikipedia for your question.",
                    "confidence": 0.2,
                    "source_chunks_used": []
                }, indent=2),
                confidence=0.2,
                sources=[],
                metadata={'error': 'no_results'}
            )
        
        # Score and rank results
        scored_results = []
        for result in all_results:
            relevance = self._score_relevance(query, result)
            
            if relevance > 0.1:  # Only keep relevant results
                wiki_result = WikipediaResult(
                    title=result['title'],
                    content=result['extract'],
                    url=result['url'],
                    confidence=relevance,
                    metadata={
                        'search_score': result.get('search_score', 0),
                        'thumbnail': result.get('thumbnail', '')
                    }
                )
                scored_results.append(wiki_result)
        
        # Sort by confidence and remove duplicates by title
        scored_results.sort(key=lambda x: x.confidence, reverse=True)
        unique_results = []
        seen_titles = set()
        
        for result in scored_results:
            if result.title not in seen_titles:
                unique_results.append(result)
                seen_titles.add(result.title)
                
                if len(unique_results) >= self.max_search_results:
                    break
        
        # Generate final answer
        formatted_answer = self._format_answer(query, unique_results)
        overall_confidence = unique_results[0].confidence if unique_results else 0.1
        
        search_time = time.time() - start_time
        
        return WikipediaAnswer(
            answer=formatted_answer,
            confidence=overall_confidence,
            sources=unique_results,
            metadata={
                'search_terms': search_terms,
                'search_time': search_time,
                'total_results_found': len(all_results),
                'relevant_results': len(unique_results)
            }
        )
    
    def should_trigger_fallback(
        self, 
        local_confidence: float, 
        local_answer: str,
        confidence_threshold: float = 0.6
    ) -> bool:
        """Determine if Wikipedia fallback should be triggered."""
        
        # Low confidence trigger
        if local_confidence < confidence_threshold:
            return True
        
        # Poor answer content indicators
        poor_indicators = [
            'goto statement',
            'machine code',
            'const pointers',
            'insufficient information',
            'cannot answer',
            'not enough context',
            'unclear from the',
            'not specified in'
        ]
        
        answer_lower = local_answer.lower()
        for indicator in poor_indicators:
            if indicator in answer_lower:
                return True
        
        # Very short answers (likely insufficient)
        if len(local_answer.strip()) < 50:
            return True
        
        return False