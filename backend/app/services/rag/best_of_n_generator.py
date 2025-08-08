"""
Best-of-N Response Generator for RAG System
==========================================

Generates multiple response candidates and selects the best one using various scoring mechanisms.
Integrates with the existing CS-aware RAG pipeline for enhanced response quality.

Author: Engunity AI Team
"""

import asyncio
import logging
import random
import time
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any, Tuple, Callable
from enum import Enum
import re
import json

logger = logging.getLogger(__name__)

class ScoringMethod(str, Enum):
    """Methods for scoring response candidates."""
    LLM_BASED = "llm_based"
    KEYWORD_DENSITY = "keyword_density"
    EMBEDDING_SIMILARITY = "embedding_similarity" 
    RULE_BASED = "rule_based"
    HYBRID = "hybrid"

@dataclass
class ResponseCandidate:
    """Individual response candidate with metadata."""
    response: str
    generation_params: Dict[str, Any]
    confidence_score: float = 0.0
    quality_metrics: Dict[str, float] = field(default_factory=dict)
    generation_time: float = 0.0
    token_count: int = 0
    
    def __post_init__(self):
        self.token_count = len(self.response.split())

@dataclass
class BestOfNResult:
    """Result from best-of-N generation process."""
    best_response: ResponseCandidate
    all_candidates: List[ResponseCandidate]
    selection_reasoning: str
    total_generation_time: float
    scoring_method: ScoringMethod
    quality_improvement: float = 0.0

class ResponseScorer:
    """Scores response candidates using various methods."""
    
    def __init__(self):
        self.cs_keywords = {
            'algorithm', 'data structure', 'complexity', 'implementation', 'optimization',
            'function', 'class', 'method', 'variable', 'loop', 'recursion', 'iteration',
            'array', 'list', 'tree', 'graph', 'hash', 'search', 'sort', 'dynamic programming',
            'typescript', 'javascript', 'python', 'java', 'programming', 'code', 'syntax',
            # Database/SQL terms
            'join', 'inner join', 'outer join', 'left join', 'right join', 'cross join',
            'sql', 'database', 'table', 'query', 'postgresql', 'postgres', 'union', 'subquery'
        }
        
        # Initialize enhanced query processing
        try:
            from .query_context_enhancer import create_relevance_enhancer
            self.relevance_enhancer = create_relevance_enhancer()
            self.enhanced_scoring = True
            logger.info("Enhanced query processing enabled for response scoring")
        except ImportError:
            self.relevance_enhancer = None
            self.enhanced_scoring = False
            logger.warning("Enhanced query processing not available, using basic scoring")
        
    async def score_candidate(
        self, 
        candidate: ResponseCandidate, 
        context: Dict[str, Any],
        method: ScoringMethod = ScoringMethod.HYBRID
    ) -> float:
        """Score a response candidate using the specified method."""
        
        if method == ScoringMethod.KEYWORD_DENSITY:
            return self._score_keyword_density(candidate, context)
        elif method == ScoringMethod.RULE_BASED:
            return self._score_rule_based(candidate, context)
        elif method == ScoringMethod.LLM_BASED:
            return await self._score_llm_based(candidate, context)
        elif method == ScoringMethod.HYBRID:
            return await self._score_hybrid(candidate, context)
        else:
            return self._score_rule_based(candidate, context)
    
    def _score_keyword_density(self, candidate: ResponseCandidate, context: Dict[str, Any]) -> float:
        """Score based on technical keyword density and relevance."""
        response_lower = candidate.response.lower()
        question_lower = context.get('question', '').lower()
        
        # Base scoring
        question_words = set(re.findall(r'\b\w{3,}\b', question_lower))
        response_words = set(re.findall(r'\b\w{3,}\b', response_lower))
        
        question_overlap = len(question_words.intersection(response_words))
        question_score = question_overlap / len(question_words) if question_words else 0
        
        # CS keyword density
        cs_words_found = sum(1 for word in self.cs_keywords if word in response_lower)
        cs_density = cs_words_found / len(candidate.response.split()) if candidate.response else 0
        
        # Technical depth indicators
        technical_indicators = [
            'implementation', 'algorithm', 'complexity', 'approach', 'solution',
            'example', 'code', 'function', 'method', 'class', 'variable',
            # Database-specific indicators
            'join', 'combine', 'merge', 'performance', 'optimization', 'benefits'
        ]
        technical_score = sum(1 for indicator in technical_indicators if indicator in response_lower)
        technical_score = min(technical_score / 7, 1.0)  # Normalize to 0-1
        
        # Enhanced relevance scoring if available
        base_score = (question_score * 0.4 + cs_density * 100 * 0.3 + technical_score * 0.3)
        
        if self.enhanced_scoring and self.relevance_enhancer:
            try:
                enhanced_score, reasoning = self.relevance_enhancer.calculate_enhanced_relevance(
                    question_lower, candidate.response, base_score
                )
                logger.debug(f"Enhanced scoring: {base_score:.3f} -> {enhanced_score:.3f} ({reasoning})")
                return min(enhanced_score, 1.0)
            except Exception as e:
                logger.error(f"Enhanced scoring failed: {e}")
        
        return min(base_score, 1.0)
    
    def _score_rule_based(self, candidate: ResponseCandidate, context: Dict[str, Any]) -> float:
        """Score using rule-based quality metrics."""
        response = candidate.response
        question = context.get('question', '')
        
        score = 0.0
        
        # Length appropriateness (not too short, not too long)
        length = len(response.split())
        if 50 <= length <= 500:
            score += 0.2
        elif 20 <= length < 50 or 500 < length <= 800:
            score += 0.1
        
        # Structural quality
        if any(marker in response for marker in ['**', '1.', '2.', '•', '-']):
            score += 0.15  # Has formatting
        
        if 'example' in response.lower() or 'for instance' in response.lower():
            score += 0.1  # Provides examples
        
        # Code presence for code-related queries
        if any(word in question.lower() for word in ['implement', 'code', 'function', 'class']):
            if '```' in response or 'def ' in response or 'function' in response:
                score += 0.2  # Contains code
        
        # Question answering directness
        question_words = question.lower().split()
        if any(word in response.lower() for word in question_words[:3]):  # First 3 words matter most
            score += 0.15
        
        # Specific handling for "why" questions - boost answers that explain benefits/reasons
        if 'why' in question.lower():
            if any(word in response.lower() for word in ['because', 'reason', 'benefit', 'advantage', 'purpose', 'allows', 'enables']):
                score += 0.2  # Strong boost for explanatory content
        
        # Database-specific quality indicators
        if any(db_term in question.lower() for db_term in ['join', 'joint operation', 'sql', 'database', 'postgresql']):
            db_indicators = ['performance', 'efficiency', 'combines', 'merges', 'relates', 'connects', 'optimization']
            db_matches = sum(1 for indicator in db_indicators if indicator in response.lower())
            if db_matches > 0:
                score += min(db_matches * 0.05, 0.15)  # Up to 0.15 boost for DB relevance
        
        # Technical accuracy indicators
        if not any(vague in response.lower() for vague in ['maybe', 'perhaps', 'might be', 'i think']):
            score += 0.1  # Confident tone
        
        # Completeness check
        if response.count('.') >= 3:  # Multiple sentences
            score += 0.1
        
        return min(score, 1.0)
    
    async def _score_llm_based(self, candidate: ResponseCandidate, context: Dict[str, Any]) -> float:
        """Score using LLM-based quality assessment."""
        # This would integrate with your existing LLM service
        # For now, return a simulated score based on response characteristics
        
        response = candidate.response
        question = context.get('question', '')
        
        # Simulate LLM scoring logic
        base_score = 0.5
        
        # Adjust based on response characteristics
        if len(response.split()) > 100:
            base_score += 0.1  # Comprehensive response
        
        if any(word in response.lower() for word in ['specifically', 'precisely', 'exactly']):
            base_score += 0.15  # Specific language
        
        if response.count('```') >= 2:
            base_score += 0.2  # Contains code examples
        
        if any(word in question.lower() for word in response.lower().split()[:20]):
            base_score += 0.15  # Addresses question directly
        
        return min(base_score, 1.0)
    
    async def _score_hybrid(self, candidate: ResponseCandidate, context: Dict[str, Any]) -> float:
        """Combine multiple scoring methods for hybrid approach."""
        
        keyword_score = self._score_keyword_density(candidate, context)
        rule_score = self._score_rule_based(candidate, context) 
        llm_score = await self._score_llm_based(candidate, context)
        
        # Weighted combination
        hybrid_score = (
            keyword_score * 0.3 +
            rule_score * 0.4 +
            llm_score * 0.3
        )
        
        candidate.quality_metrics = {
            'keyword_density': keyword_score,
            'rule_based': rule_score,
            'llm_based': llm_score,
            'hybrid': hybrid_score
        }
        
        return hybrid_score

class BestOfNGenerator:
    """Main Best-of-N response generator."""
    
    def __init__(self, base_generator: Any, scorer: Optional[ResponseScorer] = None):
        """
        Initialize Best-of-N generator.
        
        Args:
            base_generator: The base response generator (e.g., your existing intelligent_answer_generator)
            scorer: Response scorer instance
        """
        self.base_generator = base_generator
        self.scorer = scorer or ResponseScorer()
        self.default_n = 5
        self.max_concurrent = 3  # Limit concurrent generations
        
    async def generate_best_of_n(
        self,
        question: str,
        content_chunks: List[str],
        document_name: str = "",
        n: int = None,
        scoring_method: ScoringMethod = ScoringMethod.HYBRID,
        generation_params: Optional[List[Dict[str, Any]]] = None
    ) -> BestOfNResult:
        """
        Generate N response candidates and return the best one.
        
        Args:
            question: User question
            content_chunks: Relevant content chunks
            document_name: Name of the document being queried
            n: Number of candidates to generate (default: 5)
            scoring_method: Method to use for scoring
            generation_params: List of parameter sets for generation diversity
            
        Returns:
            BestOfNResult with the best response and metadata
        """
        start_time = time.time()
        n = n or self.default_n
        
        logger.info(f"Generating {n} response candidates for question: {question[:50]}...")
        
        # Prepare generation parameters for diversity
        if not generation_params:
            generation_params = self._create_diverse_params(n)
        else:
            generation_params = generation_params[:n]  # Limit to n params
        
        # Generate candidates in batches to avoid overwhelming the system
        candidates = []
        batch_size = min(self.max_concurrent, n)
        
        for i in range(0, n, batch_size):
            batch_params = generation_params[i:i + batch_size]
            batch_candidates = await self._generate_candidate_batch(
                question, content_chunks, document_name, batch_params
            )
            candidates.extend(batch_candidates)
        
        logger.info(f"Generated {len(candidates)} candidates, scoring with {scoring_method.value}")
        
        # Score all candidates
        context = {
            'question': question,
            'content_chunks': content_chunks,
            'document_name': document_name
        }
        
        scored_candidates = []
        for candidate in candidates:
            score = await self.scorer.score_candidate(candidate, context, scoring_method)
            candidate.confidence_score = score
            scored_candidates.append(candidate)
        
        # Select best candidate
        best_candidate = max(scored_candidates, key=lambda c: c.confidence_score)
        
        # Calculate quality improvement over baseline
        if len(scored_candidates) > 1:
            scores = [c.confidence_score for c in scored_candidates]
            avg_score = sum(scores) / len(scores)
            quality_improvement = (best_candidate.confidence_score - avg_score) / avg_score
        else:
            quality_improvement = 0.0
        
        total_time = time.time() - start_time
        
        # Create selection reasoning
        selection_reasoning = self._create_selection_reasoning(
            best_candidate, scored_candidates, scoring_method
        )
        
        logger.info(f"Best-of-N completed in {total_time:.2f}s. "
                   f"Best score: {best_candidate.confidence_score:.3f}, "
                   f"Quality improvement: {quality_improvement:.1%}")
        
        return BestOfNResult(
            best_response=best_candidate,
            all_candidates=scored_candidates,
            selection_reasoning=selection_reasoning,
            total_generation_time=total_time,
            scoring_method=scoring_method,
            quality_improvement=quality_improvement
        )
    
    async def _generate_candidate_batch(
        self, 
        question: str, 
        content_chunks: List[str], 
        document_name: str,
        param_batch: List[Dict[str, Any]]
    ) -> List[ResponseCandidate]:
        """Generate a batch of candidates concurrently."""
        
        async def generate_single(params: Dict[str, Any]) -> ResponseCandidate:
            start_time = time.time()
            try:
                # Use your existing intelligent answer generator
                # Adjust parameters for diversity
                response = self.base_generator.generate_intelligent_answer(
                    question=question,
                    content_chunks=content_chunks,
                    document_name=document_name,
                    **params.get('generator_kwargs', {})
                )
                
                generation_time = time.time() - start_time
                
                return ResponseCandidate(
                    response=response,
                    generation_params=params,
                    generation_time=generation_time
                )
                
            except Exception as e:
                logger.error(f"Error generating candidate with params {params}: {e}")
                # Return a fallback candidate
                return ResponseCandidate(
                    response=f"Error generating response: {str(e)}",
                    generation_params=params,
                    generation_time=time.time() - start_time,
                    confidence_score=0.0
                )
        
        # Generate all candidates in the batch concurrently
        tasks = [generate_single(params) for params in param_batch]
        candidates = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Filter out exceptions and return valid candidates
        valid_candidates = [c for c in candidates if isinstance(c, ResponseCandidate)]
        return valid_candidates
    
    def _create_diverse_params(self, n: int) -> List[Dict[str, Any]]:
        """Create diverse parameter sets for generation variety."""
        params_list = []
        
        # Base parameter set
        base_params = {
            'focus_mode': 'balanced',
            'detail_level': 'medium',
            'include_examples': True,
            'generator_kwargs': {}
        }
        
        for i in range(n):
            params = base_params.copy()
            
            # Vary focus modes
            focus_modes = ['technical', 'conceptual', 'practical', 'balanced', 'detailed']
            params['focus_mode'] = focus_modes[i % len(focus_modes)]
            
            # Vary detail levels
            detail_levels = ['concise', 'medium', 'detailed', 'comprehensive']
            params['detail_level'] = detail_levels[i % len(detail_levels)]
            
            # Vary example inclusion
            params['include_examples'] = i % 2 == 0
            
            # Add some randomness for temperature-like effects
            params['variation_seed'] = i
            
            params_list.append(params)
        
        return params_list
    
    def _create_selection_reasoning(
        self, 
        best_candidate: ResponseCandidate,
        all_candidates: List[ResponseCandidate],
        scoring_method: ScoringMethod
    ) -> str:
        """Create human-readable reasoning for candidate selection."""
        
        scores = [c.confidence_score for c in all_candidates]
        avg_score = sum(scores) / len(scores)
        
        reasoning_parts = []
        reasoning_parts.append(f"Selected best response from {len(all_candidates)} candidates using {scoring_method.value} scoring.")
        reasoning_parts.append(f"Winning score: {best_candidate.confidence_score:.3f} (avg: {avg_score:.3f})")
        
        # Add specific quality metrics if available
        if best_candidate.quality_metrics:
            metrics_str = ", ".join([f"{k}: {v:.3f}" for k, v in best_candidate.quality_metrics.items()])
            reasoning_parts.append(f"Quality metrics - {metrics_str}")
        
        # Mention key selection factors
        if best_candidate.confidence_score > avg_score + 0.1:
            reasoning_parts.append("Selected for significantly higher quality score.")
        
        if best_candidate.token_count > 100:
            reasoning_parts.append("Response provides comprehensive coverage.")
        
        return " ".join(reasoning_parts)
    
    async def quick_generate(
        self,
        question: str, 
        content_chunks: List[str],
        document_name: str = ""
    ) -> str:
        """Quick interface that returns just the best response text."""
        result = await self.generate_best_of_n(
            question=question,
            content_chunks=content_chunks, 
            document_name=document_name,
            n=3,  # Use smaller N for speed
            scoring_method=ScoringMethod.RULE_BASED  # Faster scoring
        )
        return result.best_response.response
    
    async def explain_selection(
        self,
        question: str,
        content_chunks: List[str], 
        document_name: str = ""
    ) -> Dict[str, Any]:
        """Generate responses and return detailed selection explanation."""
        result = await self.generate_best_of_n(
            question=question,
            content_chunks=content_chunks,
            document_name=document_name,
            scoring_method=ScoringMethod.HYBRID
        )
        
        return {
            'best_response': result.best_response.response,
            'selection_reasoning': result.selection_reasoning,
            'quality_improvement': f"{result.quality_improvement:.1%}",
            'candidate_scores': [c.confidence_score for c in result.all_candidates],
            'generation_time': f"{result.total_generation_time:.2f}s",
            'candidates_generated': len(result.all_candidates)
        }

# Factory function
def create_best_of_n_generator(base_generator: Any) -> BestOfNGenerator:
    """
    Create a Best-of-N generator with the provided base generator.
    
    Args:
        base_generator: Your existing answer generator instance
        
    Returns:
        Configured BestOfNGenerator
    """
    return BestOfNGenerator(base_generator=base_generator)

# Integration helper
class BestOfNIntegration:
    """Helper class for integrating Best-of-N into existing RAG pipeline."""
    
    def __init__(self, rag_processor: Any):
        """
        Initialize with existing RAG processor.
        
        Args:
            rag_processor: Your existing RagProcessor instance
        """
        self.rag_processor = rag_processor
        self.best_of_n_generator = None
        
    def enable_best_of_n(self, n: int = 5, scoring_method: ScoringMethod = ScoringMethod.HYBRID):
        """Enable Best-of-N for the RAG processor."""
        if hasattr(self.rag_processor, 'answer_generator'):
            self.best_of_n_generator = BestOfNGenerator(
                base_generator=self.rag_processor.answer_generator
            )
            logger.info(f"Best-of-N enabled with n={n}, scoring={scoring_method.value}")
        else:
            logger.error("RAG processor doesn't have answer_generator attribute")
    
    async def process_with_best_of_n(
        self,
        document_id: str,
        question: str,
        n: int = 5,
        **kwargs
    ) -> Dict[str, Any]:
        """Process document question using Best-of-N approach."""
        
        if not self.best_of_n_generator:
            logger.warning("Best-of-N not enabled, falling back to standard processing")
            return await self.rag_processor.process_document_question(
                document_id=document_id,
                question=question,
                **kwargs
            )
        
        # Get document and content (similar to existing pipeline)
        document = await self.rag_processor.supabase.get_document(document_id)
        if not document:
            raise ValueError(f"Document {document_id} not found")
        
        # Get document content
        document_text = await self.rag_processor.supabase.get_document_content_text(document)
        if not document_text or len(document_text.strip()) < 50:
            # Fall back to standard processing
            return await self.rag_processor.process_document_question(
                document_id=document_id,
                question=question,
                **kwargs
            )
        
        # Extract relevant chunks
        relevant_chunks = self.rag_processor.document_processor.extract_relevant_chunks(
            document_text, question, max_chunks=5
        )
        
        # Use Best-of-N generation
        result = await self.best_of_n_generator.generate_best_of_n(
            question=question,
            content_chunks=relevant_chunks,
            document_name=document.name,
            n=n
        )
        
        # Format response in the expected format
        return {
            "success": True,
            "answer": result.best_response.response,
            "confidence": result.best_response.confidence_score,
            "source_type": "best_of_n_enhanced",
            "sources": [{
                "type": "document_content",
                "title": f"{document.name} - Best of {len(result.all_candidates)} responses",
                "document_id": document.id,
                "confidence": result.best_response.confidence_score,
                "content": relevant_chunks[0][:300] + "..." if relevant_chunks else "Document content",
                "metadata": {
                    "candidates_generated": len(result.all_candidates),
                    "quality_improvement": result.quality_improvement,
                    "selection_reasoning": result.selection_reasoning
                }
            }],
            "session_id": f"session_{document_id}_{int(time.time())}",
            "message_id": f"msg_{int(time.time())}",
            "response_time": result.total_generation_time,
            "token_usage": {
                "prompt_tokens": len(question.split()),
                "completion_tokens": result.best_response.token_count,
                "total_tokens": len(question.split()) + result.best_response.token_count
            },
            "cs_enhanced": True,
            "processing_mode": "best_of_n_sampling",
            "best_of_n_metadata": {
                "candidates_generated": len(result.all_candidates),
                "scoring_method": result.scoring_method.value,
                "quality_improvement": result.quality_improvement,
                "generation_time": result.total_generation_time
            }
        }

# Export main classes
__all__ = [
    "BestOfNGenerator",
    "ResponseScorer", 
    "BestOfNResult",
    "ResponseCandidate",
    "ScoringMethod",
    "BestOfNIntegration",
    "create_best_of_n_generator"
]