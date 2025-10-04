#!/usr/bin/env python3
"""
AI Agents Framework for Enhanced RAG System
Comprehensive suite of specialized agents to improve RAG responses
"""

import re
import time
import numpy as np
from typing import List, Dict, Optional, Tuple, Any
from dataclasses import dataclass
from collections import defaultdict
import torch
from sentence_transformers import CrossEncoder
from sklearn.metrics.pairwise import cosine_similarity
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class QueryAnalysis:
    """Structure for query analysis results"""
    question_type: str
    complexity: str
    keywords: List[str]
    intent: str
    confidence: float
    suggested_length: int

@dataclass
class RetrievalResult:
    """Structure for retrieval results"""
    documents: List[str]
    scores: List[float]
    reranked: bool = False
    fusion_applied: bool = False

@dataclass
class GenerationConfig:
    """Configuration for response generation"""
    max_tokens: int = 200
    temperature: float = 0.7
    format_type: str = "structured"
    include_citations: bool = True
    confidence_threshold: float = 0.7

# ============================================================================
# 🔍 RETRIEVAL-LEVEL AGENTS
# ============================================================================

class QueryRewriterAgent:
    """Rewrites user queries into multiple search-friendly variations"""
    
    def __init__(self):
        self.expansion_patterns = {
            'definition': ['what is', 'define', 'meaning of', 'explanation of'],
            'explanation': ['how does', 'explain', 'describe', 'why does'],
            'comparison': ['difference between', 'compare', 'contrast', 'versus'],
            'listing': ['types of', 'kinds of', 'list of', 'examples of']
        }
    
    def rewrite_query(self, query: str, num_variants: int = 3) -> List[str]:
        """Generate multiple query variants for better retrieval"""
        variants = [query]  # Original query
        
        # Extract key terms
        key_terms = self._extract_key_terms(query)
        
        # Generate semantic variants
        for i in range(num_variants - 1):
            variant = self._generate_variant(query, key_terms, i)
            if variant and variant != query:
                variants.append(variant)
        
        logger.info(f"Generated {len(variants)} query variants")
        return variants
    
    def _extract_key_terms(self, query: str) -> List[str]:
        """Extract key terms from query"""
        # Remove common stop words and question words
        stop_words = {'what', 'is', 'are', 'how', 'why', 'where', 'when', 'the', 'a', 'an'}
        words = re.findall(r'\b\w+\b', query.lower())
        return [w for w in words if w not in stop_words and len(w) > 2]
    
    def _generate_variant(self, query: str, key_terms: List[str], variant_idx: int) -> str:
        """Generate a query variant"""
        if variant_idx == 0:
            # More specific variant
            return f"detailed information about {' '.join(key_terms[:3])}"
        elif variant_idx == 1:
            # Broader variant
            return f"overview of {' '.join(key_terms[:2])}"
        else:
            # Alternative phrasing
            return f"explain {' and '.join(key_terms[:2])}"

class RetrieverFusionAgent:
    """Combines multiple retrieval strategies for better accuracy"""
    
    def __init__(self):
        self.strategies = ['dense', 'sparse', 'hybrid']
        self.weights = {'dense': 0.6, 'sparse': 0.3, 'hybrid': 0.1}
    
    def fuse_retrievals(self, dense_results: List[Dict], sparse_results: List[Dict] = None) -> RetrievalResult:
        """Fuse multiple retrieval results"""
        # For now, implement basic dense retrieval fusion
        # In production, you'd add BM25 (sparse) and hybrid methods
        
        if not sparse_results:
            sparse_results = []
        
        # Combine and deduplicate results
        all_docs = []
        all_scores = []
        seen_docs = set()
        
        # Process dense results
        for result in dense_results:
            doc_content = result.get('content', '')
            if doc_content not in seen_docs:
                all_docs.append(doc_content)
                all_scores.append(result.get('score', 0.0) * self.weights['dense'])
                seen_docs.add(doc_content)
        
        return RetrievalResult(
            documents=all_docs,
            scores=all_scores,
            fusion_applied=True
        )

class ContextRankerAgent:
    """Ranks retrieved passages by relevance using cross-encoder"""
    
    def __init__(self):
        self.reranker = None
        self._load_reranker()
    
    def _load_reranker(self):
        """Load cross-encoder reranker"""
        try:
            self.reranker = CrossEncoder('cross-encoder/ms-marco-MiniLM-L-6-v2')
            logger.info("Context reranker loaded successfully")
        except Exception as e:
            logger.warning(f"Could not load reranker: {e}")
    
    def rerank_contexts(self, query: str, documents: List[str], top_k: int = 5) -> RetrievalResult:
        """Rerank documents using cross-encoder"""
        if not self.reranker or not documents:
            return RetrievalResult(documents=documents[:top_k], scores=[1.0] * min(len(documents), top_k))
        
        try:
            # Prepare query-document pairs
            pairs = [(query, doc) for doc in documents]
            scores = self.reranker.predict(pairs)
            
            # Sort by scores and return top_k
            scored_docs = list(zip(documents, scores))
            scored_docs.sort(key=lambda x: x[1], reverse=True)
            
            reranked_docs = [doc for doc, score in scored_docs[:top_k]]
            reranked_scores = [score for doc, score in scored_docs[:top_k]]
            
            return RetrievalResult(
                documents=reranked_docs,
                scores=reranked_scores,
                reranked=True
            )
        except Exception as e:
            logger.error(f"Reranking failed: {e}")
            return RetrievalResult(documents=documents[:top_k], scores=[1.0] * min(len(documents), top_k))

class ContextCondenserAgent:
    """Summarizes or compresses long retrieved chunks"""
    
    def condense_context(self, documents: List[str], max_length: int = 500) -> List[str]:
        """Condense long documents to essential information"""
        condensed_docs = []
        
        for doc in documents:
            if len(doc) <= max_length:
                condensed_docs.append(doc)
            else:
                # Extract most important sentences
                condensed = self._extract_key_sentences(doc, max_length)
                condensed_docs.append(condensed)
        
        return condensed_docs
    
    def _extract_key_sentences(self, text: str, max_length: int) -> str:
        """Extract key sentences from text"""
        sentences = re.split(r'[.!?]+', text)
        sentences = [s.strip() for s in sentences if s.strip()]
        
        if not sentences:
            return text[:max_length]
        
        # Simple heuristic: prefer sentences with more keywords
        # In production, use extractive summarization
        scored_sentences = []
        for sentence in sentences:
            score = len(re.findall(r'\b[A-Z][a-z]+\b', sentence))  # Count capitalized words
            scored_sentences.append((sentence, score))
        
        scored_sentences.sort(key=lambda x: x[1], reverse=True)
        
        result = ""
        for sentence, score in scored_sentences:
            if len(result) + len(sentence) <= max_length:
                result += sentence + ". "
            else:
                break
        
        return result.strip()

# ============================================================================
# 📝 UNDERSTANDING & PROMPTING AGENTS
# ============================================================================

class QuestionAnalyzerAgent:
    """Detects question type and routes to specialized prompts"""
    
    def __init__(self):
        self.question_patterns = {
            'definition': [
                r'\bwhat is\b', r'\bdefine\b', r'\bmeaning of\b', r'\bdefinition of\b'
            ],
            'explanation': [
                r'\bexplain\b', r'\bhow does\b', r'\bwhy does\b', r'\bhow to\b'
            ],
            'comparison': [
                r'\bdifference\b', r'\bcompare\b', r'\bversus\b', r'\bvs\b', r'\bcontrast\b'
            ],
            'listing': [
                r'\btypes of\b', r'\bkinds of\b', r'\blist\b', r'\bexamples of\b'
            ],
            'reasoning': [
                r'\bwhy\b', r'\bbecause\b', r'\breason\b', r'\bcause\b'
            ],
            'factual': [
                r'\bwhen\b', r'\bwhere\b', r'\bwho\b', r'\bwhich\b'
            ]
        }
    
    def analyze_query(self, query: str) -> QueryAnalysis:
        """Analyze query and return structured information"""
        query_lower = query.lower()
        
        # Detect question type
        question_type = self._detect_question_type(query_lower)
        
        # Assess complexity
        complexity = self._assess_complexity(query)
        
        # Extract keywords
        keywords = self._extract_keywords(query)
        
        # Determine intent
        intent = self._determine_intent(query_lower, question_type)
        
        # Calculate confidence
        confidence = self._calculate_confidence(query_lower, question_type)
        
        # Suggest response length
        suggested_length = self._suggest_length(question_type, complexity)
        
        return QueryAnalysis(
            question_type=question_type,
            complexity=complexity,
            keywords=keywords,
            intent=intent,
            confidence=confidence,
            suggested_length=suggested_length
        )
    
    def _detect_question_type(self, query: str) -> str:
        """Detect the type of question"""
        for q_type, patterns in self.question_patterns.items():
            for pattern in patterns:
                if re.search(pattern, query):
                    return q_type
        return 'general'
    
    def _assess_complexity(self, query: str) -> str:
        """Assess query complexity"""
        word_count = len(query.split())
        if word_count < 5:
            return 'simple'
        elif word_count < 15:
            return 'medium'
        else:
            return 'complex'
    
    def _extract_keywords(self, query: str) -> List[str]:
        """Extract keywords from query"""
        words = re.findall(r'\b\w+\b', query.lower())
        stop_words = {'what', 'is', 'are', 'how', 'why', 'where', 'when', 'the', 'a', 'an', 'and', 'or', 'but'}
        return [w for w in words if w not in stop_words and len(w) > 2]
    
    def _determine_intent(self, query: str, question_type: str) -> str:
        """Determine user intent"""
        intent_mapping = {
            'definition': 'understand_concept',
            'explanation': 'learn_process',
            'comparison': 'evaluate_options',
            'listing': 'get_examples',
            'reasoning': 'understand_causality',
            'factual': 'get_information'
        }
        return intent_mapping.get(question_type, 'general_inquiry')
    
    def _calculate_confidence(self, query: str, question_type: str) -> float:
        """Calculate confidence in question type detection"""
        if question_type == 'general':
            return 0.3
        
        pattern_matches = 0
        for pattern in self.question_patterns.get(question_type, []):
            if re.search(pattern, query):
                pattern_matches += 1
        
        return min(0.9, 0.5 + (pattern_matches * 0.2))
    
    def _suggest_length(self, question_type: str, complexity: str) -> int:
        """Suggest appropriate response length"""
        base_lengths = {
            'definition': 150,
            'explanation': 300,
            'comparison': 250,
            'listing': 200,
            'reasoning': 350,
            'factual': 100,
            'general': 200
        }
        
        complexity_multipliers = {
            'simple': 0.7,
            'medium': 1.0,
            'complex': 1.5
        }
        
        base = base_lengths.get(question_type, 200)
        multiplier = complexity_multipliers.get(complexity, 1.0)
        
        return int(base * multiplier)

class SmartPromptAgent:
    """Builds structured prompts with formatting rules"""
    
    def __init__(self):
        self.prompt_templates = {
            'definition': """Based on the provided context, give a clear and concise definition.

Format your response as:
**Definition:** [Clear, one-sentence definition]
**Key Points:**
• [Main characteristic 1]
• [Main characteristic 2]
• [Main characteristic 3]

Context: {context}
Question: {query}
Answer:""",
            
            'explanation': """Based on the provided context, provide a detailed explanation.

Format your response as:
**Overview:** [Brief summary]
**Detailed Explanation:**
1. [First main point with details]
2. [Second main point with details]
3. [Third main point with details]

Context: {context}
Question: {query}
Answer:""",
            
            'comparison': """Based on the provided context, provide a structured comparison.

Format your response as:
**Comparison Summary:**
**Similarities:**
• [Common feature 1]
• [Common feature 2]
**Differences:**
• [Key difference 1]
• [Key difference 2]

Context: {context}
Question: {query}
Answer:""",
            
            'listing': """Based on the provided context, provide a well-organized list.

Format your response as:
**Main Categories:**
1. **[Category 1]:** [Description]
2. **[Category 2]:** [Description]
3. **[Category 3]:** [Description]

Context: {context}
Question: {query}
Answer:""",
            
            'general': """Based on the provided context, provide a clear and well-structured answer.

Format your response with appropriate headers and bullet points for clarity.

Context: {context}
Question: {query}
Answer:"""
        }
    
    def create_prompt(self, query: str, context: str, question_analysis: QueryAnalysis) -> str:
        """Create structured prompt based on question analysis"""
        template = self.prompt_templates.get(question_analysis.question_type, self.prompt_templates['general'])
        return template.format(context=context, query=query)

class ClarificationAgent:
    """Asks follow-up questions if the query is vague"""
    
    def __init__(self):
        self.vague_indicators = [
            'it', 'this', 'that', 'these', 'those', 'stuff', 'thing', 'things'
        ]
    
    def needs_clarification(self, query: str, context_available: bool = True) -> Tuple[bool, Optional[str]]:
        """Determine if query needs clarification"""
        query_lower = query.lower().strip()
        
        # Check for very short queries
        if len(query.split()) < 3:
            return True, "Could you please provide more details about what specifically you'd like to know?"
        
        # Check for vague pronouns without context
        vague_count = sum(1 for indicator in self.vague_indicators if indicator in query_lower.split())
        if vague_count > 1:
            return True, "Your question contains some vague references. Could you be more specific about what you're asking?"
        
        # Check for questions that are too broad
        broad_patterns = [r'^what about', r'^tell me about', r'^anything about']
        for pattern in broad_patterns:
            if re.search(pattern, query_lower):
                return True, "That's quite a broad topic. Could you specify what aspect you're most interested in?"
        
        return False, None

# ============================================================================
# 📖 ANSWER GENERATION AGENTS
# ============================================================================

class ResponseFormatterAgent:
    """Post-processes raw LLM output and applies formatting"""
    
    def format_response(self, raw_response: str, question_type: str) -> str:
        """Format response based on question type"""
        # Clean up the response
        cleaned = self._clean_response(raw_response)
        
        # Apply specific formatting based on question type
        if question_type == 'listing':
            return self._format_list_response(cleaned)
        elif question_type == 'comparison':
            return self._format_comparison_response(cleaned)
        elif question_type == 'definition':
            return self._format_definition_response(cleaned)
        else:
            return self._format_general_response(cleaned)
    
    def _clean_response(self, response: str) -> str:
        """Clean up raw response"""
        # Remove redundant whitespace
        cleaned = re.sub(r'\n\s*\n\s*\n', '\n\n', response)
        
        # Fix common formatting issues
        cleaned = re.sub(r'([.!?])\s*([A-Z])', r'\1 \2', cleaned)
        
        # Remove incomplete sentences at the end
        sentences = re.split(r'[.!?]+', cleaned)
        if len(sentences) > 1 and len(sentences[-1].strip()) < 10:
            sentences = sentences[:-1]
            cleaned = '. '.join(sentences) + '.'
        
        return cleaned.strip()
    
    def _format_list_response(self, response: str) -> str:
        """Format list-type responses"""
        # Convert to bullet points if not already formatted
        if '•' not in response and '1.' not in response:
            sentences = [s.strip() for s in response.split('.') if s.strip()]
            if len(sentences) > 1:
                formatted = '\n'.join(f'• {sentence}.' for sentence in sentences[:5])
                return formatted
        return response
    
    def _format_comparison_response(self, response: str) -> str:
        """Format comparison responses"""
        # Add structure if missing
        if 'difference' in response.lower() and '**' not in response:
            return f"**Key Differences:**\n{response}"
        return response
    
    def _format_definition_response(self, response: str) -> str:
        """Format definition responses"""
        # Ensure definition starts clearly
        if not response.startswith('**'):
            first_sentence = response.split('.')[0] + '.'
            rest = '.'.join(response.split('.')[1:])
            return f"**Definition:** {first_sentence}\n\n{rest}".strip()
        return response
    
    def _format_general_response(self, response: str) -> str:
        """Format general responses"""
        # Add paragraph breaks for readability
        if len(response) > 200 and '\n' not in response:
            sentences = response.split('. ')
            if len(sentences) > 3:
                mid_point = len(sentences) // 2
                part1 = '. '.join(sentences[:mid_point]) + '.'
                part2 = '. '.join(sentences[mid_point:])
                return f"{part1}\n\n{part2}"
        return response

class LengthControllerAgent:
    """Dynamically controls answer length"""
    
    def determine_optimal_length(self, query_analysis: QueryAnalysis, context_length: int) -> GenerationConfig:
        """Determine optimal generation parameters"""
        base_length = query_analysis.suggested_length
        
        # Adjust based on context availability
        if context_length < 100:
            base_length = min(base_length, 150)  # Limit if little context
        
        # Adjust based on question complexity
        complexity_adjustments = {
            'simple': 0.8,
            'medium': 1.0,
            'complex': 1.3
        }
        
        adjusted_length = int(base_length * complexity_adjustments.get(query_analysis.complexity, 1.0))
        
        return GenerationConfig(
            max_tokens=max(50, min(500, adjusted_length)),
            temperature=0.7 if query_analysis.question_type in ['explanation', 'reasoning'] else 0.5,
            format_type='structured' if query_analysis.question_type != 'general' else 'natural'
        )

class MultiPerspectiveAgent:
    """Generates multiple possible answers and picks the best one"""
    
    def generate_perspectives(self, query: str, context: str, num_perspectives: int = 2) -> List[str]:
        """Generate multiple answer perspectives"""
        perspectives = []
        
        # Different prompt approaches
        prompts = [
            f"Provide a comprehensive answer based on the context:\n\nContext: {context}\nQuestion: {query}\nAnswer:",
            f"Give a concise, factual response:\n\nContext: {context}\nQuestion: {query}\nAnswer:",
        ]
        
        # In a real implementation, you'd generate with different prompts
        # For now, return the same perspective (would need LLM integration)
        for prompt in prompts[:num_perspectives]:
            perspectives.append(prompt)  # Placeholder
        
        return perspectives
    
    def select_best_answer(self, perspectives: List[str], context: str) -> str:
        """Select the best answer from multiple perspectives"""
        # Simple selection based on length and context alignment
        # In production, use more sophisticated scoring
        if not perspectives:
            return "I couldn't generate a suitable answer."
        
        scored_perspectives = []
        for perspective in perspectives:
            score = self._score_perspective(perspective, context)
            scored_perspectives.append((perspective, score))
        
        scored_perspectives.sort(key=lambda x: x[1], reverse=True)
        return scored_perspectives[0][0]
    
    def _score_perspective(self, perspective: str, context: str) -> float:
        """Score a perspective based on quality heuristics"""
        score = 0.0
        
        # Length appropriateness (not too short, not too long)
        length = len(perspective)
        if 50 <= length <= 500:
            score += 1.0
        elif length < 50:
            score += 0.3
        else:
            score += 0.7
        
        # Context alignment (simple word overlap)
        perspective_words = set(perspective.lower().split())
        context_words = set(context.lower().split())
        overlap = len(perspective_words.intersection(context_words))
        score += min(1.0, overlap / 10)
        
        return score

class FactCheckingAgent:
    """Cross-checks generated answers against retrieved documents"""
    
    def check_factual_consistency(self, answer: str, source_documents: List[str]) -> Dict[str, Any]:
        """Check if answer is consistent with source documents"""
        if not source_documents:
            return {
                'consistency_score': 0.0,
                'supported_claims': [],
                'unsupported_claims': [],
                'confidence': 0.0
            }
        
        # Extract claims from answer
        claims = self._extract_claims(answer)
        
        # Check each claim against documents
        supported_claims = []
        unsupported_claims = []
        
        for claim in claims:
            if self._is_claim_supported(claim, source_documents):
                supported_claims.append(claim)
            else:
                unsupported_claims.append(claim)
        
        total_claims = len(claims)
        consistency_score = len(supported_claims) / total_claims if total_claims > 0 else 0.0
        
        return {
            'consistency_score': consistency_score,
            'supported_claims': supported_claims,
            'unsupported_claims': unsupported_claims,
            'confidence': consistency_score,
            'total_claims': total_claims
        }
    
    def _extract_claims(self, answer: str) -> List[str]:
        """Extract factual claims from answer"""
        # Simple sentence splitting for claims
        sentences = re.split(r'[.!?]+', answer)
        claims = [s.strip() for s in sentences if s.strip() and len(s.strip()) > 10]
        return claims[:5]  # Limit to top 5 claims
    
    def _is_claim_supported(self, claim: str, documents: List[str]) -> bool:
        """Check if a claim is supported by documents"""
        claim_words = set(claim.lower().split())
        
        for doc in documents:
            doc_words = set(doc.lower().split())
            # Simple overlap check - in production, use semantic similarity
            overlap = len(claim_words.intersection(doc_words))
            if overlap >= len(claim_words) * 0.5:  # 50% word overlap
                return True
        
        return False

class ConfidenceScoringAgent:
    """Assigns confidence scores to answers"""
    
    def calculate_confidence(self, answer: str, context: str, retrieval_scores: List[float] = None) -> Dict[str, float]:
        """Calculate comprehensive confidence score"""
        scores = {}
        
        # Context relevance confidence
        scores['context_relevance'] = self._calculate_context_relevance(answer, context)
        
        # Answer completeness confidence
        scores['completeness'] = self._calculate_completeness(answer)
        
        # Retrieval confidence (if available)
        if retrieval_scores:
            scores['retrieval_confidence'] = np.mean(retrieval_scores)
        else:
            scores['retrieval_confidence'] = 0.5
        
        # Length appropriateness
        scores['length_appropriateness'] = self._calculate_length_appropriateness(answer)
        
        # Overall confidence (weighted average)
        weights = {
            'context_relevance': 0.4,
            'completeness': 0.3,
            'retrieval_confidence': 0.2,
            'length_appropriateness': 0.1
        }
        
        overall_confidence = sum(scores[key] * weights[key] for key in weights)
        scores['overall'] = overall_confidence
        
        return scores
    
    def _calculate_context_relevance(self, answer: str, context: str) -> float:
        """Calculate how relevant answer is to context"""
        if not context:
            return 0.3
        
        answer_words = set(answer.lower().split())
        context_words = set(context.lower().split())
        
        if not answer_words:
            return 0.0
        
        overlap = len(answer_words.intersection(context_words))
        return min(1.0, overlap / len(answer_words))
    
    def _calculate_completeness(self, answer: str) -> float:
        """Calculate answer completeness"""
        length = len(answer)
        if length < 20:
            return 0.2
        elif length < 50:
            return 0.5
        elif length < 200:
            return 0.9
        else:
            return 0.8  # Too long might be less focused
    
    def _calculate_length_appropriateness(self, answer: str) -> float:
        """Calculate if answer length is appropriate"""
        length = len(answer)
        if 50 <= length <= 300:
            return 1.0
        elif 20 <= length < 50 or 300 < length <= 500:
            return 0.8
        else:
            return 0.5

# ============================================================================
# 🏗 KNOWLEDGE ORGANIZATION AGENTS
# ============================================================================

class ContentOrganizerAgent:
    """Breaks long responses into logical sections"""
    
    def organize_content(self, content: str, max_section_length: int = 150) -> str:
        """Organize content into logical sections with headers"""
        if len(content) <= max_section_length:
            return content
        
        # Split into paragraphs
        paragraphs = [p.strip() for p in content.split('\n\n') if p.strip()]
        
        if len(paragraphs) <= 1:
            # Split long paragraph into sentences
            sentences = re.split(r'[.!?]+', content)
            sentences = [s.strip() for s in sentences if s.strip()]
            
            if len(sentences) > 3:
                sections = []
                current_section = []
                current_length = 0
                
                for sentence in sentences:
                    if current_length + len(sentence) > max_section_length and current_section:
                        sections.append('. '.join(current_section) + '.')
                        current_section = [sentence]
                        current_length = len(sentence)
                    else:
                        current_section.append(sentence)
                        current_length += len(sentence)
                
                if current_section:
                    sections.append('. '.join(current_section) + '.')
                
                return '\n\n'.join(sections)
        
        return content

class SummarizerAgent:
    """Provides both short summary and detailed answers"""
    
    def create_summary(self, full_answer: str, summary_length: int = 100) -> Dict[str, str]:
        """Create both summary and detailed versions"""
        summary = self._extract_key_points(full_answer, summary_length)
        
        return {
            'summary': summary,
            'detailed': full_answer
        }
    
    def _extract_key_points(self, text: str, max_length: int) -> str:
        """Extract key points for summary"""
        sentences = re.split(r'[.!?]+', text)
        sentences = [s.strip() for s in sentences if s.strip()]
        
        if not sentences:
            return text[:max_length]
        
        # Use first sentence as main point
        summary = sentences[0]
        
        # Add additional sentences if space allows
        for sentence in sentences[1:]:
            if len(summary) + len(sentence) + 2 <= max_length:
                summary += '. ' + sentence
            else:
                break
        
        return summary + '.' if not summary.endswith('.') else summary

class CitationAgent:
    """Adds inline citations with document IDs"""
    
    def add_citations(self, answer: str, source_documents: List[str], doc_ids: List[str] = None) -> str:
        """Add citations to answer"""
        if not source_documents:
            return answer
        
        if not doc_ids:
            doc_ids = [f"[{i+1}]" for i in range(len(source_documents))]
        
        # Simple citation adding - in production, use more sophisticated matching
        cited_answer = answer
        
        # Add source list at the end
        sources_section = "\n\n**Sources:**\n"
        for i, doc_id in enumerate(doc_ids[:len(source_documents)]):
            preview = source_documents[i][:100] + "..." if len(source_documents[i]) > 100 else source_documents[i]
            sources_section += f"{doc_id} {preview}\n"
        
        return cited_answer + sources_section

# ============================================================================
# ⚡ ADVANCED OPTIMIZATION AGENTS
# ============================================================================

class MemoryAgent:
    """Remembers past interactions for context continuity"""
    
    def __init__(self, max_history: int = 5):
        self.conversation_history = []
        self.max_history = max_history
    
    def add_interaction(self, query: str, answer: str, context: List[str]):
        """Add interaction to memory"""
        interaction = {
            'timestamp': time.time(),
            'query': query,
            'answer': answer,
            'context': context
        }
        
        self.conversation_history.append(interaction)
        
        # Maintain max history
        if len(self.conversation_history) > self.max_history:
            self.conversation_history = self.conversation_history[-self.max_history:]
    
    def get_relevant_history(self, current_query: str) -> List[Dict]:
        """Get relevant conversation history"""
        if not self.conversation_history:
            return []
        
        # Simple relevance based on keyword overlap
        current_words = set(current_query.lower().split())
        relevant_interactions = []
        
        for interaction in self.conversation_history[-3:]:  # Last 3 interactions
            query_words = set(interaction['query'].lower().split())
            overlap = len(current_words.intersection(query_words))
            
            if overlap > 0:
                relevant_interactions.append(interaction)
        
        return relevant_interactions

class AdaptiveRetrievalAgent:
    """Dynamically adjusts retrieval depth based on query complexity"""
    
    def determine_retrieval_params(self, query_analysis: QueryAnalysis) -> Dict[str, int]:
        """Determine optimal retrieval parameters"""
        base_params = {
            'simple': {'k': 3, 'fetch_k': 9},
            'medium': {'k': 5, 'fetch_k': 15},
            'complex': {'k': 8, 'fetch_k': 24}
        }
        
        complexity = query_analysis.complexity
        question_type = query_analysis.question_type
        
        params = base_params.get(complexity, base_params['medium']).copy()
        
        # Adjust based on question type
        if question_type in ['comparison', 'listing']:
            params['k'] += 2
            params['fetch_k'] += 6
        elif question_type == 'definition':
            params['k'] = max(2, params['k'] - 1)
            params['fetch_k'] = max(6, params['fetch_k'] - 3)
        
        return params

class FallbackAgent:
    """Provides fallback responses when confidence is low"""
    
    def __init__(self, confidence_threshold: float = 0.5):
        self.confidence_threshold = confidence_threshold
    
    def should_fallback(self, confidence_scores: Dict[str, float]) -> bool:
        """Determine if fallback is needed"""
        overall_confidence = confidence_scores.get('overall', 0.0)
        return overall_confidence < self.confidence_threshold
    
    def generate_fallback(self, query: str, available_docs: List[str] = None) -> str:
        """Generate appropriate fallback response"""
        if available_docs:
            return f"I found some information related to your query, but I'm not fully confident in my answer. You might want to review the source documents directly for more accurate information."
        else:
            return f"I don't have enough reliable information to answer your question about '{query}' confidently. Could you try rephrasing your question or providing more context?"

class LanguageStyleAgent:
    """Adjusts tone and complexity for different audiences"""
    
    def __init__(self):
        self.style_configs = {
            'technical': {
                'vocabulary': 'advanced',
                'detail_level': 'high',
                'examples': 'technical'
            },
            'general': {
                'vocabulary': 'moderate',
                'detail_level': 'medium',
                'examples': 'relatable'
            },
            'simple': {
                'vocabulary': 'basic',
                'detail_level': 'low',
                'examples': 'everyday'
            }
        }
    
    def adapt_response(self, response: str, target_style: str = 'general') -> str:
        """Adapt response to target style"""
        config = self.style_configs.get(target_style, self.style_configs['general'])
        
        if target_style == 'simple':
            return self._simplify_response(response)
        elif target_style == 'technical':
            return self._make_technical(response)
        else:
            return response
    
    def _simplify_response(self, response: str) -> str:
        """Simplify response for general audience"""
        # Replace complex terms with simpler ones
        simplifications = {
            'utilize': 'use',
            'demonstrate': 'show',
            'subsequently': 'then',
            'consequently': 'so',
            'therefore': 'so'
        }
        
        simplified = response
        for complex_word, simple_word in simplifications.items():
            simplified = re.sub(r'\b' + complex_word + r'\b', simple_word, simplified, flags=re.IGNORECASE)
        
        return simplified
    
    def _make_technical(self, response: str) -> str:
        """Add technical precision to response"""
        # In a real implementation, this would add technical terminology
        # and more precise language
        return response

# ============================================================================
# 🎯 MAIN AGENT ORCHESTRATOR
# ============================================================================

class RAGAgentOrchestrator:
    """Main orchestrator that coordinates all agents"""
    
    def __init__(self):
        # Initialize all agents
        self.query_rewriter = QueryRewriterAgent()
        self.retriever_fusion = RetrieverFusionAgent()
        self.context_ranker = ContextRankerAgent()
        self.context_condenser = ContextCondenserAgent()
        
        self.question_analyzer = QuestionAnalyzerAgent()
        self.smart_prompt = SmartPromptAgent()
        self.clarification = ClarificationAgent()
        
        self.response_formatter = ResponseFormatterAgent()
        self.length_controller = LengthControllerAgent()
        self.multi_perspective = MultiPerspectiveAgent()
        self.fact_checker = FactCheckingAgent()
        self.confidence_scorer = ConfidenceScoringAgent()
        
        self.content_organizer = ContentOrganizerAgent()
        self.summarizer = SummarizerAgent()
        self.citation = CitationAgent()
        
        self.memory = MemoryAgent()
        self.adaptive_retrieval = AdaptiveRetrievalAgent()
        self.fallback = FallbackAgent()
        self.language_style = LanguageStyleAgent()
        
        logger.info("RAG Agent Orchestrator initialized with all agents")
    
    def process_query(self, query: str, retriever, qa_system, style: str = 'general') -> Dict[str, Any]:
        """Process query through the complete agent pipeline"""
        result = {
            'query': query,
            'answer': '',
            'confidence': {},
            'citations': '',
            'summary': '',
            'processing_steps': []
        }
        
        try:
            # Step 1: Analyze the query
            query_analysis = self.question_analyzer.analyze_query(query)
            result['processing_steps'].append(f"Query analyzed as: {query_analysis.question_type}")
            
            # Step 2: Check if clarification is needed
            needs_clarification, clarification_msg = self.clarification.needs_clarification(query)
            if needs_clarification:
                result['answer'] = clarification_msg
                return result
            
            # Step 3: Generate query variants for better retrieval
            query_variants = self.query_rewriter.rewrite_query(query)
            result['processing_steps'].append(f"Generated {len(query_variants)} query variants")
            
            # Step 4: Adaptive retrieval
            retrieval_params = self.adaptive_retrieval.determine_retrieval_params(query_analysis)
            result['processing_steps'].append(f"Using adaptive retrieval: k={retrieval_params['k']}")
            
            # Step 5: Retrieve and rerank documents
            docs = retriever.get_relevant_documents(query)
            doc_contents = [doc.page_content for doc in docs]
            
            reranked_result = self.context_ranker.rerank_contexts(query, doc_contents, top_k=retrieval_params['k'])
            condensed_docs = self.context_condenser.condense_context(reranked_result.documents)
            
            result['processing_steps'].append(f"Retrieved and reranked {len(reranked_result.documents)} documents")
            
            # Step 6: Create structured prompt
            context = '\n\n'.join(condensed_docs)
            structured_prompt = self.smart_prompt.create_prompt(query, context, query_analysis)
            
            # Step 7: Determine generation config
            gen_config = self.length_controller.determine_optimal_length(query_analysis, len(context))
            
            # Step 8: Generate answer (using the existing QA system)
            raw_answer = qa_system.generate_answer(retriever, query)
            
            # Step 9: Format response
            formatted_answer = self.response_formatter.format_response(raw_answer, query_analysis.question_type)
            organized_answer = self.content_organizer.organize_content(formatted_answer)
            
            # Step 10: Adapt to target style
            final_answer = self.language_style.adapt_response(organized_answer, style)
            
            # Step 11: Calculate confidence scores
            confidence_scores = self.confidence_scorer.calculate_confidence(
                final_answer, context, reranked_result.scores
            )
            
            # Step 12: Fact checking
            fact_check = self.fact_checker.check_factual_consistency(final_answer, condensed_docs)
            confidence_scores.update(fact_check)
            
            # Step 13: Check if fallback is needed
            if self.fallback.should_fallback(confidence_scores):
                final_answer = self.fallback.generate_fallback(query, condensed_docs)
                result['processing_steps'].append("Applied fallback due to low confidence")
            
            # Step 14: Add citations
            cited_answer = self.citation.add_citations(final_answer, condensed_docs)
            
            # Step 15: Create summary
            summary_result = self.summarizer.create_summary(final_answer)
            
            # Step 16: Update memory
            self.memory.add_interaction(query, final_answer, condensed_docs)
            
            # Compile final result
            result.update({
                'answer': cited_answer,
                'confidence': confidence_scores,
                'summary': summary_result['summary'],
                'query_analysis': query_analysis,
                'processing_steps': result['processing_steps']
            })
            
            logger.info(f"Query processed successfully with {len(result['processing_steps'])} steps")
            
        except Exception as e:
            logger.error(f"Error in agent orchestrator: {e}")
            result['answer'] = "I encountered an error while processing your question. Please try again."
            result['confidence'] = {'overall': 0.0}
        
        return result

# Export main classes for easy import
__all__ = [
    'RAGAgentOrchestrator',
    'QueryAnalysis',
    'RetrievalResult',
    'GenerationConfig'
]