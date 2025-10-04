#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Advanced Confidence Scoring and Fallback Logic
==============================================

Implements sophisticated confidence calculation using:
- Multi-signal confidence scoring
- Retrieval quality assessment
- Cross-encoder verification
- Response validation metrics
- Intelligent fallback strategies

This addresses vague answers by implementing strict confidence
thresholds and reliable fallback mechanisms.

Author: Engunity AI Team
"""

import logging
import numpy as np
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass
from enum import Enum
import statistics

logger = logging.getLogger(__name__)

class ConfidenceLevel(Enum):
    """Confidence level classifications"""
    VERY_HIGH = "very_high"  # > 0.85
    HIGH = "high"           # 0.7 - 0.85
    MEDIUM = "medium"       # 0.5 - 0.7
    LOW = "low"            # 0.3 - 0.5
    VERY_LOW = "very_low"  # < 0.3

@dataclass
class ConfidenceSignals:
    """Individual confidence signals"""
    retrieval_score: float          # From vector similarity
    reranker_score: float          # From cross-encoder reranking
    semantic_consistency: float    # Semantic coherence check
    context_coverage: float        # How well answer covers context
    fact_check_score: float       # From embedding-based fact checking
    response_quality: float       # From response validator
    query_specificity: float      # How specific the query is
    answer_completeness: float     # How complete the answer is

@dataclass
class ConfidenceResult:
    """Complete confidence assessment"""
    overall_confidence: float
    confidence_level: ConfidenceLevel
    signals: ConfidenceSignals
    risk_factors: List[str]
    reliability_score: float
    should_use_answer: bool
    fallback_recommendation: str
    confidence_breakdown: Dict[str, float]

@dataclass
class FallbackStrategy:
    """Fallback strategy configuration"""
    name: str
    description: str
    min_confidence: float
    max_confidence: float
    action: str
    message_template: str

class AdvancedConfidenceSystem:
    """Advanced confidence scoring with intelligent fallbacks"""
    
    def __init__(self, strict_threshold: float = 0.5):
        self.strict_threshold = strict_threshold
        
        # Confidence calculation weights
        self.signal_weights = {
            "retrieval_score": 0.18,
            "reranker_score": 0.20,
            "semantic_consistency": 0.15,
            "context_coverage": 0.15,
            "fact_check_score": 0.20,
            "response_quality": 0.12
        }
        
        # Fallback strategies
        self.fallback_strategies = self._initialize_fallback_strategies()
        
        logger.info(f"Advanced Confidence System initialized (threshold: {strict_threshold})")
    
    def _initialize_fallback_strategies(self) -> List[FallbackStrategy]:
        """Initialize fallback strategies by confidence level"""
        return [
            FallbackStrategy(
                name="refuse_low_confidence",
                description="Refuse to answer due to very low confidence",
                min_confidence=0.0,
                max_confidence=0.3,
                action="refuse",
                message_template="I don't have reliable information to answer this question based on the provided document. The available content doesn't contain sufficient relevant details."
            ),
            FallbackStrategy(
                name="partial_answer_with_disclaimer",
                description="Provide partial answer with strong disclaimer",
                min_confidence=0.3,
                max_confidence=0.5,
                action="partial_with_disclaimer",
                message_template="Based on limited information in the document, {answer}\n\nNote: This answer has low confidence due to insufficient supporting evidence in the provided content."
            ),
            FallbackStrategy(
                name="cautious_answer",
                description="Provide answer with confidence level indication",
                min_confidence=0.5,
                max_confidence=0.7,
                action="cautious",
                message_template="{answer}\n\n(Confidence: Medium - answer based on available information)"
            ),
            FallbackStrategy(
                name="confident_answer",
                description="Provide full answer with high confidence",
                min_confidence=0.7,
                max_confidence=1.0,
                action="full_answer",
                message_template="{answer}"
            )
        ]
    
    def calculate_confidence(self,
                           retrieval_scores: List[float],
                           reranker_scores: Optional[List[float]],
                           context_chunks: List[str],
                           generated_answer: str,
                           original_query: str,
                           fact_check_result: Optional[Any] = None,
                           validation_result: Optional[Any] = None) -> ConfidenceResult:
        """Calculate comprehensive confidence score"""
        
        # Calculate individual signals
        signals = ConfidenceSignals(
            retrieval_score=self._calculate_retrieval_confidence(retrieval_scores),
            reranker_score=self._calculate_reranker_confidence(reranker_scores),
            semantic_consistency=self._calculate_semantic_consistency(generated_answer, context_chunks),
            context_coverage=self._calculate_context_coverage(generated_answer, context_chunks),
            fact_check_score=self._extract_fact_check_score(fact_check_result),
            response_quality=self._extract_response_quality(validation_result),
            query_specificity=self._calculate_query_specificity(original_query),
            answer_completeness=self._calculate_answer_completeness(generated_answer, original_query)
        )
        
        # Calculate weighted overall confidence
        overall_confidence = self._calculate_weighted_confidence(signals)
        
        # Identify risk factors
        risk_factors = self._identify_risk_factors(signals, generated_answer, context_chunks)
        
        # Apply risk penalties
        penalized_confidence = self._apply_risk_penalties(overall_confidence, risk_factors)
        
        # Determine confidence level
        confidence_level = self._determine_confidence_level(penalized_confidence)
        
        # Calculate reliability score
        reliability_score = self._calculate_reliability_score(signals, risk_factors)
        
        # Determine if answer should be used
        should_use_answer = penalized_confidence >= self.strict_threshold and len(risk_factors) <= 2
        
        # Select fallback strategy
        fallback_strategy = self._select_fallback_strategy(penalized_confidence)
        
        # Create confidence breakdown
        confidence_breakdown = {
            "retrieval": signals.retrieval_score,
            "reranking": signals.reranker_score,
            "semantic_consistency": signals.semantic_consistency,
            "context_coverage": signals.context_coverage,
            "fact_checking": signals.fact_check_score,
            "response_quality": signals.response_quality,
            "overall_raw": overall_confidence,
            "risk_penalty": overall_confidence - penalized_confidence,
            "final_score": penalized_confidence
        }
        
        result = ConfidenceResult(
            overall_confidence=penalized_confidence,
            confidence_level=confidence_level,
            signals=signals,
            risk_factors=risk_factors,
            reliability_score=reliability_score,
            should_use_answer=should_use_answer,
            fallback_recommendation=fallback_strategy.action,
            confidence_breakdown=confidence_breakdown
        )
        
        logger.info(f"Confidence calculated: {penalized_confidence:.3f} ({confidence_level.value}), "
                   f"risks: {len(risk_factors)}, use_answer: {should_use_answer}")
        
        return result
    
    def _calculate_retrieval_confidence(self, scores: List[float]) -> float:
        """Calculate confidence from retrieval scores"""
        if not scores:
            return 0.0
        
        # Use max score as primary indicator
        max_score = max(scores)
        
        # Bonus for having multiple good scores
        good_scores = [s for s in scores if s >= 0.7]
        diversity_bonus = min(0.1, len(good_scores) * 0.03)
        
        return min(1.0, max_score + diversity_bonus)
    
    def _calculate_reranker_confidence(self, scores: Optional[List[float]]) -> float:
        """Calculate confidence from reranker scores"""
        if not scores:
            return 0.7  # Neutral score when no reranking
        
        # Normalize scores if they're in different range
        normalized_scores = []
        for score in scores:
            if score > 2.0:  # Likely raw cross-encoder output
                normalized_scores.append(min(1.0, score / max(scores)))
            else:
                normalized_scores.append(min(1.0, max(0.0, score)))
        
        return max(normalized_scores) if normalized_scores else 0.7
    
    def _calculate_semantic_consistency(self, answer: str, context_chunks: List[str]) -> float:
        """Calculate semantic consistency between answer and context"""
        if not answer or not context_chunks:
            return 0.0
        
        # Simple word overlap analysis (could be enhanced with embeddings)
        answer_words = set(answer.lower().split())
        context_words = set()
        for chunk in context_chunks:
            context_words.update(chunk.lower().split())
        
        if not context_words:
            return 0.0
        
        # Calculate overlap ratio
        overlap = len(answer_words.intersection(context_words))
        consistency = overlap / len(answer_words) if answer_words else 0.0
        
        return min(1.0, consistency * 1.5)  # Amplify good scores
    
    def _calculate_context_coverage(self, answer: str, context_chunks: List[str]) -> float:
        """Calculate how well answer covers the available context"""
        if not context_chunks:
            return 0.0
        
        # Check if answer utilizes information from multiple chunks
        total_chunks = len(context_chunks)
        answer_lower = answer.lower()
        
        coverage_count = 0
        for chunk in context_chunks:
            # Check if answer contains substantial content from this chunk
            chunk_words = set(chunk.lower().split())
            answer_words = set(answer_lower.split())
            
            if chunk_words and len(chunk_words.intersection(answer_words)) >= 3:
                coverage_count += 1
        
        coverage_ratio = coverage_count / total_chunks if total_chunks > 0 else 0.0
        return min(1.0, coverage_ratio * 2)  # Amplify to reward good coverage
    
    def _extract_fact_check_score(self, fact_check_result: Optional[Any]) -> float:
        """Extract score from fact checking result"""
        if not fact_check_result:
            return 0.5  # Neutral when no fact checking
        
        if hasattr(fact_check_result, 'overall_support_score'):
            return fact_check_result.overall_support_score
        elif hasattr(fact_check_result, 'confidence_score'):
            return fact_check_result.confidence_score
        else:
            return 0.5
    
    def _extract_response_quality(self, validation_result: Optional[Any]) -> float:
        """Extract quality score from validation result"""
        if not validation_result:
            return 0.5  # Neutral when no validation
        
        if hasattr(validation_result, 'quality_score'):
            return validation_result.quality_score
        else:
            return 0.5
    
    def _calculate_query_specificity(self, query: str) -> float:
        """Calculate how specific the query is"""
        if not query:
            return 0.0
        
        # Count specific indicators
        specific_indicators = len([
            word for word in query.lower().split()
            if len(word) > 3 and word not in {'what', 'how', 'why', 'when', 'where', 'which', 'does', 'this', 'that'}
        ])
        
        # Technical terms boost specificity
        technical_terms = len([
            word for word in query.lower().split()
            if any(tech in word for tech in ['function', 'method', 'class', 'algorithm', 'implementation'])
        ])
        
        specificity = (specific_indicators + technical_terms * 2) / len(query.split())
        return min(1.0, specificity)
    
    def _calculate_answer_completeness(self, answer: str, query: str) -> float:
        """Calculate how complete the answer is relative to the query"""
        if not answer or not query:
            return 0.0
        
        answer_length = len(answer.split())
        
        # Length-based completeness (adjust thresholds based on query type)
        if 'define' in query.lower() or 'what is' in query.lower():
            # Definitions can be shorter
            if answer_length >= 20:
                return 1.0
            elif answer_length >= 10:
                return 0.8
            else:
                return 0.4
        else:
            # Explanations should be more detailed
            if answer_length >= 50:
                return 1.0
            elif answer_length >= 30:
                return 0.8
            elif answer_length >= 15:
                return 0.6
            else:
                return 0.3
    
    def _calculate_weighted_confidence(self, signals: ConfidenceSignals) -> float:
        """Calculate weighted overall confidence"""
        weighted_sum = (
            signals.retrieval_score * self.signal_weights["retrieval_score"] +
            signals.reranker_score * self.signal_weights["reranker_score"] +
            signals.semantic_consistency * self.signal_weights["semantic_consistency"] +
            signals.context_coverage * self.signal_weights["context_coverage"] +
            signals.fact_check_score * self.signal_weights["fact_check_score"] +
            signals.response_quality * self.signal_weights["response_quality"]
        )
        
        return min(1.0, weighted_sum)
    
    def _identify_risk_factors(self, 
                              signals: ConfidenceSignals, 
                              answer: str, 
                              context_chunks: List[str]) -> List[str]:
        """Identify risk factors that might affect answer quality"""
        risks = []
        
        # Low retrieval scores
        if signals.retrieval_score < 0.4:
            risks.append("poor_retrieval_quality")
        
        # Low semantic consistency
        if signals.semantic_consistency < 0.3:
            risks.append("low_semantic_consistency")
        
        # Poor context coverage
        if signals.context_coverage < 0.4:
            risks.append("insufficient_context_usage")
        
        # Failed fact checking
        if signals.fact_check_score < 0.4:
            risks.append("fact_check_failure")
        
        # Poor response quality
        if signals.response_quality < 0.5:
            risks.append("low_response_quality")
        
        # Answer too short
        if len(answer.split()) < 15:
            risks.append("answer_too_brief")
        
        # Answer contains uncertainty markers
        uncertainty_markers = ['might', 'could', 'possibly', 'perhaps', 'maybe']
        if any(marker in answer.lower() for marker in uncertainty_markers):
            risks.append("contains_uncertainty_language")
        
        # Insufficient context
        if not context_chunks or len(' '.join(context_chunks).split()) < 50:
            risks.append("insufficient_context")
        
        return risks
    
    def _apply_risk_penalties(self, base_confidence: float, risk_factors: List[str]) -> float:
        """Apply penalties based on identified risk factors"""
        penalty_map = {
            "poor_retrieval_quality": 0.15,
            "low_semantic_consistency": 0.12,
            "insufficient_context_usage": 0.10,
            "fact_check_failure": 0.20,
            "low_response_quality": 0.10,
            "answer_too_brief": 0.08,
            "contains_uncertainty_language": 0.05,
            "insufficient_context": 0.15
        }
        
        total_penalty = sum(penalty_map.get(risk, 0.05) for risk in risk_factors)
        
        # Apply diminishing returns to penalties
        adjusted_penalty = total_penalty * (0.8 ** max(0, len(risk_factors) - 3))
        
        return max(0.0, base_confidence - adjusted_penalty)
    
    def _determine_confidence_level(self, confidence: float) -> ConfidenceLevel:
        """Determine confidence level from score"""
        if confidence >= 0.85:
            return ConfidenceLevel.VERY_HIGH
        elif confidence >= 0.7:
            return ConfidenceLevel.HIGH
        elif confidence >= 0.5:
            return ConfidenceLevel.MEDIUM
        elif confidence >= 0.3:
            return ConfidenceLevel.LOW
        else:
            return ConfidenceLevel.VERY_LOW
    
    def _calculate_reliability_score(self, signals: ConfidenceSignals, risk_factors: List[str]) -> float:
        """Calculate overall system reliability score"""
        # Base reliability from signal consistency
        signal_values = [
            signals.retrieval_score,
            signals.reranker_score,
            signals.semantic_consistency,
            signals.context_coverage,
            signals.fact_check_score,
            signals.response_quality
        ]
        
        # High reliability when signals are consistent
        signal_std = statistics.stdev(signal_values) if len(signal_values) > 1 else 0.0
        consistency_score = max(0.0, 1.0 - signal_std)
        
        # Penalty for risk factors
        risk_penalty = len(risk_factors) * 0.1
        
        reliability = max(0.0, consistency_score - risk_penalty)
        return reliability
    
    def _select_fallback_strategy(self, confidence: float) -> FallbackStrategy:
        """Select appropriate fallback strategy based on confidence"""
        for strategy in self.fallback_strategies:
            if strategy.min_confidence <= confidence <= strategy.max_confidence:
                return strategy
        
        # Default to refuse if no strategy matches
        return self.fallback_strategies[0]
    
    def apply_fallback_strategy(self, 
                               confidence_result: ConfidenceResult,
                               original_answer: str) -> str:
        """Apply the selected fallback strategy to generate final answer"""
        
        strategy = self._select_fallback_strategy(confidence_result.overall_confidence)
        
        if strategy.action == "refuse":
            return strategy.message_template
        
        elif strategy.action == "partial_with_disclaimer":
            # Use filtered answer if available from fact checking
            if hasattr(confidence_result, 'filtered_answer') and confidence_result.filtered_answer:
                answer_to_use = confidence_result.filtered_answer
            else:
                # Use first sentence only for very low confidence
                sentences = original_answer.split('.')
                answer_to_use = sentences[0] + '.' if sentences else original_answer
            
            return strategy.message_template.format(answer=answer_to_use)
        
        elif strategy.action == "cautious":
            return strategy.message_template.format(answer=original_answer)
        
        else:  # full_answer
            return strategy.message_template.format(answer=original_answer)
    
    def get_detailed_report(self, result: ConfidenceResult) -> Dict[str, Any]:
        """Generate detailed confidence report"""
        return {
            "overall_assessment": {
                "confidence_score": result.overall_confidence,
                "confidence_level": result.confidence_level.value,
                "reliability_score": result.reliability_score,
                "should_use_answer": result.should_use_answer,
                "fallback_strategy": result.fallback_recommendation
            },
            "signal_breakdown": {
                "retrieval_quality": result.signals.retrieval_score,
                "reranker_quality": result.signals.reranker_score,
                "semantic_consistency": result.signals.semantic_consistency,
                "context_coverage": result.signals.context_coverage,
                "fact_check_score": result.signals.fact_check_score,
                "response_quality": result.signals.response_quality
            },
            "risk_analysis": {
                "risk_factors": result.risk_factors,
                "risk_count": len(result.risk_factors),
                "high_risk": len(result.risk_factors) >= 3
            },
            "confidence_breakdown": result.confidence_breakdown,
            "recommendations": self._generate_recommendations(result)
        }
    
    def _generate_recommendations(self, result: ConfidenceResult) -> List[str]:
        """Generate improvement recommendations"""
        recommendations = []
        
        if result.signals.retrieval_score < 0.6:
            recommendations.append("Improve document indexing or query expansion")
        
        if result.signals.fact_check_score < 0.6:
            recommendations.append("Strengthen fact verification system")
        
        if result.signals.context_coverage < 0.5:
            recommendations.append("Utilize more context chunks in answer generation")
        
        if "answer_too_brief" in result.risk_factors:
            recommendations.append("Generate more comprehensive answers")
        
        return recommendations


# Global instance
_confidence_system = None

def get_advanced_confidence_system() -> AdvancedConfidenceSystem:
    """Get global advanced confidence system instance"""
    global _confidence_system
    if _confidence_system is None:
        _confidence_system = AdvancedConfidenceSystem()
    return _confidence_system