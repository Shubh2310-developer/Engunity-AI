"""
Query Context Enhancer for RAG System
====================================

Enhances query understanding by expanding technical terms, disambiguating context,
and improving relevance matching for specific technical domains.

Author: Engunity AI Team
"""

import re
import logging
from typing import Dict, List, Optional, Set, Tuple
from dataclasses import dataclass

logger = logging.getLogger(__name__)

@dataclass
class QueryContext:
    """Enhanced context information for a technical query."""
    original_query: str
    expanded_query: str
    domain: str
    technical_terms: List[str]
    synonyms: List[str]
    context_keywords: List[str]
    disambiguation_hints: List[str]
    relevance_boosters: List[str]

class DatabaseTermResolver:
    """Resolves database-specific terminology and context."""
    
    def __init__(self):
        self.join_terms = {
            'joint operation': ['join', 'inner join', 'outer join', 'left join', 'right join', 'cross join', 'natural join'],
            'join operation': ['join', 'inner join', 'outer join', 'left join', 'right join', 'cross join'],
            'table join': ['join', 'inner join', 'outer join', 'left join', 'right join'],
            'combine tables': ['join', 'union', 'intersect', 'except'],
            'merge data': ['join', 'union', 'merge', 'combine'],
        }
        
        self.postgresql_specifics = {
            'postgresql joins': ['hash join', 'nested loop join', 'merge join', 'join algorithms'],
            'postgres performance': ['query planner', 'execution plan', 'cost estimation', 'statistics'],
            'postgresql features': ['array_agg', 'generate_series', 'window functions', 'cte', 'recursive'],
        }
        
        self.sql_operations = {
            'aggregation': ['group by', 'having', 'sum', 'count', 'avg', 'max', 'min'],
            'filtering': ['where', 'having', 'filter', 'condition'],
            'ordering': ['order by', 'sort', 'rank', 'row_number'],
            'grouping': ['group by', 'partition by', 'window functions'],
        }
    
    def resolve_query_context(self, query: str) -> QueryContext:
        """Resolve and enhance database query context."""
        query_lower = query.lower().strip()
        
        # Initialize context
        context = QueryContext(
            original_query=query,
            expanded_query=query,
            domain='database',
            technical_terms=[],
            synonyms=[],
            context_keywords=[],
            disambiguation_hints=[],
            relevance_boosters=[]
        )
        
        # Detect and expand JOIN-related terms
        if any(term in query_lower for term in ['joint operation', 'join operation', 'join']):
            context.technical_terms.extend(['join', 'sql join', 'table join'])
            context.context_keywords.extend(['combine', 'merge', 'relate', 'connect'])
            context.disambiguation_hints.append('SQL JOIN operations for combining table data')
            
            # Specific JOIN type detection
            if 'joint operation' in query_lower:
                context.expanded_query = query_lower.replace('joint operation', 'join operation SQL join')
                context.synonyms.extend(['join', 'inner join', 'outer join', 'left join', 'right join'])
                context.relevance_boosters.extend([
                    'join types', 'join syntax', 'join performance', 'join algorithms',
                    'combining tables', 'relational operations', 'table relationships'
                ])
        
        # PostgreSQL-specific enhancements
        if any(term in query_lower for term in ['postgresql', 'postgres']):
            context.technical_terms.extend(['postgresql', 'postgres', 'planner', 'optimizer'])
            context.context_keywords.extend(['planner', 'optimizer', 'execution', 'performance'])
            context.disambiguation_hints.append('PostgreSQL-specific database features and optimizations')
            context.relevance_boosters.extend([
                'query planner', 'execution plan', 'postgresql joins', 'hash join', 'nested loop',
                'merge join', 'cost estimation', 'query optimization'
            ])
        
        # Add why/reason specific terms
        if any(word in query_lower for word in ['why', 'reason', 'purpose', 'benefit', 'advantage']):
            context.context_keywords.extend(['benefit', 'advantage', 'purpose', 'reason', 'performance'])
            context.disambiguation_hints.append('Focus on benefits, reasons, and use cases')
            context.relevance_boosters.extend([
                'benefits', 'advantages', 'performance', 'efficiency', 'optimization',
                'use cases', 'best practices', 'when to use'
            ])
        
        return context

class QueryContextEnhancer:
    """Main service for enhancing query context and relevance."""
    
    def __init__(self):
        self.db_resolver = DatabaseTermResolver()
        self.domain_resolvers = {
            'database': self.db_resolver,
            'sql': self.db_resolver,
            'postgresql': self.db_resolver,
        }
    
    def enhance_query_context(self, query: str, document_content: str = "") -> QueryContext:
        """Enhance query with context-aware understanding."""
        
        # Detect primary domain
        domain = self._detect_domain(query)
        
        # Get domain-specific context
        if domain in self.domain_resolvers:
            context = self.domain_resolvers[domain].resolve_query_context(query)
        else:
            # Generic context
            context = QueryContext(
                original_query=query,
                expanded_query=query,
                domain=domain,
                technical_terms=[],
                synonyms=[],
                context_keywords=[],
                disambiguation_hints=[],
                relevance_boosters=[]
            )
        
        # Add document-specific context
        if document_content:
            context = self._add_document_context(context, document_content)
        
        logger.info(f"Enhanced query context: domain={context.domain}, "
                   f"terms={len(context.technical_terms)}, boosters={len(context.relevance_boosters)}")
        
        return context
    
    def _detect_domain(self, query: str) -> str:
        """Detect the primary technical domain of the query."""
        query_lower = query.lower()
        
        domain_indicators = {
            'database': ['sql', 'database', 'table', 'query', 'join', 'postgresql', 'postgres', 'joint operation'],
            'web': ['html', 'css', 'javascript', 'react', 'api', 'http'],
            'programming': ['algorithm', 'function', 'class', 'code', 'implementation'],
            'ai': ['machine learning', 'neural network', 'model', 'training'],
        }
        
        domain_scores = {}
        for domain, indicators in domain_indicators.items():
            score = sum(1 for indicator in indicators if indicator in query_lower)
            if score > 0:
                domain_scores[domain] = score
        
        if domain_scores:
            return max(domain_scores, key=domain_scores.get)
        
        return 'general'
    
    def _add_document_context(self, context: QueryContext, document_content: str) -> QueryContext:
        """Add document-specific context clues."""
        content_lower = document_content.lower()
        
        # Look for relevant technical terms in document
        for term in context.technical_terms:
            if term in content_lower:
                # Find context around the term
                sentences = self._find_sentences_with_term(content_lower, term)
                for sentence in sentences[:2]:  # Max 2 sentences
                    words = sentence.split()
                    context.context_keywords.extend([w for w in words if len(w) > 3][:5])
        
        return context
    
    def _find_sentences_with_term(self, text: str, term: str) -> List[str]:
        """Find sentences containing the specified term."""
        sentences = re.split(r'[.!?]+', text)
        matching_sentences = []
        
        for sentence in sentences:
            if term in sentence.lower():
                matching_sentences.append(sentence.strip())
        
        return matching_sentences

class RelevanceEnhancer:
    """Enhances relevance scoring based on query context."""
    
    def __init__(self, context_enhancer: QueryContextEnhancer):
        self.context_enhancer = context_enhancer
    
    def calculate_enhanced_relevance(
        self, 
        query: str, 
        document_section: str,
        base_relevance: float = 0.0
    ) -> Tuple[float, str]:
        """Calculate enhanced relevance score with reasoning."""
        
        # Get enhanced context
        context = self.context_enhancer.enhance_query_context(query, document_section)
        section_lower = document_section.lower()
        
        enhanced_score = base_relevance
        scoring_reasons = []
        
        # Boost for technical terms
        technical_matches = sum(1 for term in context.technical_terms if term in section_lower)
        if technical_matches > 0:
            boost = min(technical_matches * 0.1, 0.3)
            enhanced_score += boost
            scoring_reasons.append(f"Technical terms match (+{boost:.2f})")
        
        # Boost for relevance boosters
        booster_matches = sum(1 for booster in context.relevance_boosters if booster in section_lower)
        if booster_matches > 0:
            boost = min(booster_matches * 0.05, 0.2)
            enhanced_score += boost
            scoring_reasons.append(f"Context boosters (+{boost:.2f})")
        
        # Boost for disambiguation hints
        for hint in context.disambiguation_hints:
            hint_words = hint.lower().split()
            hint_matches = sum(1 for word in hint_words if word in section_lower)
            if hint_matches >= len(hint_words) * 0.5:  # At least 50% of hint words
                boost = 0.15
                enhanced_score += boost
                scoring_reasons.append(f"Disambiguation match (+{boost:.2f})")
                break
        
        # Penalty for generic content that doesn't address specific question
        if enhanced_score < 0.3 and len(document_section) > 500:
            # This might be generic content, reduce score
            penalty = 0.1
            enhanced_score = max(0, enhanced_score - penalty)
            scoring_reasons.append(f"Generic content penalty (-{penalty:.2f})")
        
        # Cap the score
        enhanced_score = min(enhanced_score, 1.0)
        
        reasoning = "; ".join(scoring_reasons) if scoring_reasons else "Base relevance only"
        
        return enhanced_score, reasoning

# Factory function
def create_query_context_enhancer() -> QueryContextEnhancer:
    """Create a query context enhancer instance."""
    return QueryContextEnhancer()

def create_relevance_enhancer() -> RelevanceEnhancer:
    """Create a relevance enhancer instance."""
    context_enhancer = create_query_context_enhancer()
    return RelevanceEnhancer(context_enhancer)

# Export main classes
__all__ = [
    "QueryContextEnhancer",
    "RelevanceEnhancer", 
    "QueryContext",
    "DatabaseTermResolver",
    "create_query_context_enhancer",
    "create_relevance_enhancer"
]