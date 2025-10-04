#!/usr/bin/env python3
"""
Fixed AI Agents Framework for Enhanced RAG System
Addresses issues with repeated responses and vague answers
"""

import re
import time
import numpy as np
from typing import List, Dict, Optional, Tuple, Any
from dataclasses import dataclass
from collections import defaultdict
import logging
import torch

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
class GenerationConfig:
    """Configuration for response generation"""
    max_tokens: int = 150  # Reduced from 200 for more concise answers
    temperature: float = 0.7
    format_type: str = "structured"
    include_citations: bool = True
    confidence_threshold: float = 0.7

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
        
        # Suggest response length (more conservative)
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
        elif word_count < 12:
            return 'medium'
        else:
            return 'complex'
    
    def _extract_keywords(self, query: str) -> List[str]:
        """Extract keywords from query"""
        words = re.findall(r'\b\w+\b', query.lower())
        stop_words = {'what', 'is', 'are', 'how', 'why', 'where', 'when', 'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'}
        return [w for w in words if w not in stop_words and len(w) > 2][:5]  # Limit to top 5
    
    def _determine_intent(self, query: str, question_type: str) -> str:
        """Determine user intent"""
        intent_mapping = {
            'definition': 'understand_concept',
            'explanation': 'learn_process',
            'comparison': 'evaluate_options',
            'listing': 'get_examples',
            'reasoning': 'understand_causality'
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
        """Suggest appropriate response length - more conservative"""
        base_lengths = {
            'definition': 100,      # Reduced from 150
            'explanation': 150,     # Reduced from 300
            'comparison': 120,      # Reduced from 250
            'listing': 100,         # Reduced from 200
            'reasoning': 180,       # Reduced from 350
            'general': 120          # Reduced from 200
        }
        
        complexity_multipliers = {
            'simple': 0.8,
            'medium': 1.0,
            'complex': 1.2  # Reduced from 1.5
        }
        
        base = base_lengths.get(question_type, 120)
        multiplier = complexity_multipliers.get(complexity, 1.0)
        
        return int(base * multiplier)

class SmartPromptAgent:
    """Builds structured prompts with formatting rules"""
    
    def __init__(self):
        self.prompt_templates = {
            'definition': """You are an expert assistant that provides precise definitions based on document content.

Context from the document:
{context}

Question: {query}

Instructions: Extract the definition directly from the context. Be specific and avoid vague language.

Direct Answer:""",
            
            'explanation': """You are an expert assistant that provides clear explanations based on document content.

Context from the document:
{context}

Question: {query}

Instructions: Explain the concept using specific information from the context. Include concrete details and examples mentioned in the document.

Direct Answer:""",
            
            'listing': """You are an expert assistant that provides organized lists based on document content.

Context from the document:
{context}

Question: {query}

Instructions: Create a clear list based on information found in the context. Include specific items mentioned in the document.

Direct Answer:""",
            
            'comparison': """You are an expert assistant that provides clear comparisons based on document content.

Context from the document:
{context}

Question: {query}

Instructions: Compare the items using specific information from the context. Highlight key differences and similarities mentioned in the document.

Direct Answer:""",
            
            'reasoning': """You are an expert assistant that explains reasoning based on document content.

Context from the document:
{context}

Question: {query}

Instructions: Explain the reasoning or causality using specific information from the context. Focus on the 'why' or 'how' aspects mentioned in the document.

Direct Answer:""",
            
            'general': """You are an expert assistant that answers questions based on document content.

Context from the document:
{context}

Question: {query}

Instructions: Answer the question using specific information from the context. Be precise and cite specific details from the document.

Direct Answer:"""
        }
    
    def create_prompt(self, query: str, context: str, question_analysis: QueryAnalysis) -> str:
        """Create structured prompt based on question analysis"""
        # Limit context to prevent repetition
        limited_context = context[:800] if len(context) > 800 else context
        
        template = self.prompt_templates.get(
            question_analysis.question_type, 
            self.prompt_templates['general']
        )
        return template.format(context=limited_context, query=query)

class ResponseFormatterAgent:
    """Post-processes raw LLM output and applies formatting"""
    
    def format_response(self, raw_response: str, question_type: str) -> str:
        """Format response based on question type"""
        # Clean up the response first
        cleaned = self._clean_response(raw_response)
        
        # Prevent repetition
        cleaned = self._remove_repetition(cleaned)
        
        # Apply specific formatting
        if question_type == 'definition':
            return self._format_definition_response(cleaned)
        elif question_type == 'listing':
            return self._format_list_response(cleaned)
        else:
            return self._format_general_response(cleaned)
    
    def _clean_response(self, response: str) -> str:
        """Clean up raw response"""
        # Remove extra whitespace
        cleaned = re.sub(r'\s+', ' ', response).strip()
        
        # Remove repetitive phrases
        cleaned = re.sub(r'(\b\w+\b)\s+\1', r'\1', cleaned)
        
        # Fix sentence structure
        cleaned = re.sub(r'([.!?])\s*([A-Z])', r'\1 \2', cleaned)
        
        return cleaned
    
    def _remove_repetition(self, response: str) -> str:
        """Remove repetitive content"""
        sentences = [s.strip() for s in re.split(r'[.!?]+', response) if s.strip()]
        
        # Remove duplicate sentences
        unique_sentences = []
        seen = set()
        
        for sentence in sentences:
            # Normalize for comparison
            normalized = re.sub(r'[^\w\s]', '', sentence.lower())
            if normalized not in seen and len(normalized) > 5:
                unique_sentences.append(sentence)
                seen.add(normalized)
        
        return '. '.join(unique_sentences[:3]) + '.' if unique_sentences else response
    
    def _format_definition_response(self, response: str) -> str:
        """Format definition responses"""
        sentences = [s.strip() for s in response.split('.') if s.strip()]
        
        if len(sentences) >= 2:
            definition = sentences[0]
            details = '. '.join(sentences[1:2])  # Limit to 2 sentences total
            
            return f"**Definition:** {definition}.\n\n**Details:** {details}."
        else:
            return f"**Definition:** {response}"
    
    def _format_list_response(self, response: str) -> str:
        """Format list-type responses"""
        if '•' in response or '1.' in response:
            return response
        
        sentences = [s.strip() for s in response.split('.') if s.strip()]
        if len(sentences) > 1:
            return '\n'.join(f'• {sentence}.' for sentence in sentences[:3])
        return response
    
    def _format_general_response(self, response: str) -> str:
        """Format general responses"""
        # Ensure response is concise
        sentences = [s.strip() for s in response.split('.') if s.strip()]
        
        if len(sentences) > 3:
            return '. '.join(sentences[:3]) + '.'
        
        return response

class LengthControllerAgent:
    """Dynamically controls answer length"""
    
    def determine_optimal_length(self, query_analysis: QueryAnalysis, context_length: int) -> GenerationConfig:
        """Determine optimal generation parameters"""
        base_length = min(query_analysis.suggested_length, 150)  # Cap at 150
        
        # Adjust based on context availability
        if context_length < 100:
            base_length = min(base_length, 100)
        
        # More conservative adjustments
        complexity_adjustments = {
            'simple': 0.8,
            'medium': 1.0,
            'complex': 1.1  # Reduced from 1.3
        }
        
        adjusted_length = int(base_length * complexity_adjustments.get(query_analysis.complexity, 1.0))
        
        return GenerationConfig(
            max_tokens=max(50, min(200, adjusted_length)),  # Stricter limits
            temperature=0.5,  # Lower temperature for more focused responses
            format_type='structured' if query_analysis.question_type != 'general' else 'natural'
        )

class FactCheckingAgent:
    """Cross-checks generated answers against retrieved documents"""
    
    def check_factual_consistency(self, answer: str, source_documents: List[str]) -> Dict[str, Any]:
        """Check if answer is consistent with source documents"""
        if not source_documents:
            return {
                'consistency_score': 0.0,
                'supported_claims': [],
                'confidence': 0.0
            }
        
        # Simple fact checking based on word overlap
        answer_words = set(answer.lower().split())
        source_text = ' '.join(source_documents).lower()
        source_words = set(source_text.split())
        
        # Calculate overlap
        overlap = len(answer_words.intersection(source_words))
        total_answer_words = len(answer_words)
        
        consistency_score = overlap / total_answer_words if total_answer_words > 0 else 0.0
        
        return {
            'consistency_score': min(consistency_score, 1.0),
            'supported_claims': [],
            'confidence': consistency_score
        }

class RAGAgentOrchestrator:
    """Main orchestrator that coordinates all agents"""
    
    def __init__(self):
        # Initialize core agents only
        self.question_analyzer = QuestionAnalyzerAgent()
        self.smart_prompt = SmartPromptAgent()
        self.response_formatter = ResponseFormatterAgent()
        self.length_controller = LengthControllerAgent()
        self.fact_checker = FactCheckingAgent()
        
        logger.info("RAG Agent Orchestrator initialized with core agents")
    
    def process_query(self, query: str, retriever, qa_system, style: str = 'general') -> Dict[str, Any]:
        """Process query through the agent pipeline"""
        result = {
            'query': query,
            'answer': '',
            'confidence': {},
            'processing_steps': []
        }
        
        try:
            # Step 1: Analyze the query
            query_analysis = self.question_analyzer.analyze_query(query)
            result['processing_steps'].append(f"Query analyzed as: {query_analysis.question_type}")
            
            # Step 2: Retrieve documents with enhanced settings
            docs = retriever.get_relevant_documents(query)
            if not docs:
                result['answer'] = "I couldn't find relevant information in the document to answer your question."
                result['confidence'] = {'overall': 0.0}
                return result
                
            doc_contents = [doc.page_content for doc in docs[:5]]  # Use top 5 docs for better context
            
            result['processing_steps'].append(f"Retrieved {len(doc_contents)} documents")
            
            # Step 3: Create comprehensive context from retrieved documents
            context_parts = []
            for i, content in enumerate(doc_contents):
                # Use more content per document for better context
                clean_content = content.strip()[:500]  # Increased from smaller limits
                if clean_content:
                    context_parts.append(f"Document {i+1}: {clean_content}")
            
            combined_context = '\n\n'.join(context_parts)
            
            # Step 4: Create structured prompt
            structured_prompt = self.smart_prompt.create_prompt(query, combined_context, query_analysis)
            
            # Step 5: Determine generation config
            gen_config = self.length_controller.determine_optimal_length(query_analysis, len(combined_context))
            
            # Step 6: Generate answer with structured prompt
            raw_answer = self._generate_with_prompt(qa_system, structured_prompt, gen_config)
            
            if not raw_answer or raw_answer in ["Unable to generate response.", "Model not initialized."]:
                result['answer'] = "I was unable to generate a proper response. Please try rephrasing your question."
                result['confidence'] = {'overall': 0.0}
                return result
            
            # Step 7: Format response
            formatted_answer = self.response_formatter.format_response(raw_answer, query_analysis.question_type)
            
            # Step 8: Fact checking
            fact_check = self.fact_checker.check_factual_consistency(formatted_answer, doc_contents)
            
            # Ensure we have a meaningful answer
            if len(formatted_answer.strip()) < 20:
                formatted_answer = "I found information related to your question but couldn't formulate a comprehensive answer. Please try being more specific."
                fact_check['confidence'] = 0.3
            
            result.update({
                'answer': formatted_answer,
                'confidence': fact_check,
                'query_analysis': query_analysis,
            })
            
            logger.info(f"Query processed successfully: {query_analysis.question_type}")
            
        except Exception as e:
            logger.error(f"Error in agent orchestrator: {e}")
            result['answer'] = "I encountered an error while processing your question. Please try rephrasing it."
            result['confidence'] = {'overall': 0.0}
        
        return result
    
    def _generate_with_prompt(self, qa_system, prompt: str, gen_config: GenerationConfig) -> str:
        """Generate response using the QA system with custom prompt"""
        try:
            if not hasattr(qa_system, 'model') or qa_system.model is None:
                return "Model not initialized."
            
            # Tokenize the structured prompt
            inputs = qa_system.tokenizer(
                prompt, 
                return_tensors="pt", 
                max_length=1024, 
                truncation=True
            )
            
            if torch.cuda.is_available():
                inputs = inputs.to(qa_system.model.device)
            
            # Generate with optimized parameters for focused responses
            with torch.no_grad():
                outputs = qa_system.model.generate(
                    **inputs,
                    max_new_tokens=gen_config.max_tokens,
                    temperature=gen_config.temperature,
                    do_sample=True,
                    top_p=0.85,
                    pad_token_id=qa_system.tokenizer.eos_token_id,
                    repetition_penalty=1.3,
                    use_cache=True,
                    no_repeat_ngram_size=3,
                    min_length=20,
                    early_stopping=True
                )
            
            # Decode and extract answer
            generated_text = qa_system.tokenizer.decode(outputs[0], skip_special_tokens=True)
            
            # Extract the answer part after the prompt
            if "Direct Answer:" in generated_text:
                answer = generated_text.split("Direct Answer:")[-1].strip()
            elif "Answer:" in generated_text:
                answer = generated_text.split("Answer:")[-1].strip()
            else:
                # Try to extract answer from the end of the text
                prompt_length = len(prompt)
                if len(generated_text) > prompt_length:
                    answer = generated_text[prompt_length:].strip()
                else:
                    answer = generated_text.strip()
            
            return answer if answer else "Unable to generate a specific response."
            
        except Exception as e:
            logger.error(f"Error in prompt generation: {e}")
            return "I encountered an error while generating the response."

# Export main classes for easy import
__all__ = [
    'RAGAgentOrchestrator',
    'QueryAnalysis', 
    'GenerationConfig'
]