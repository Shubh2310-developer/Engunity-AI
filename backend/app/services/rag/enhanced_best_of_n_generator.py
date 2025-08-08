"""
Enhanced Best-of-N Generator with Phi-2
=======================================

Implements improved Best-of-N generation with:
- Multiple candidate generation (N=5)
- Advanced scoring using perplexity, relevance, and quality metrics
- Proper JSON output formatting
- Context-aware generation with retrieved chunks
- Quality validation and filtering
"""

import json
import logging
import re
import torch
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass
import time
import numpy as np
from transformers import (
    AutoTokenizer, 
    AutoModelForCausalLM, 
    GenerationConfig
)

logger = logging.getLogger(__name__)

@dataclass
class GenerationCandidate:
    """A single generation candidate."""
    text: str
    perplexity: float
    relevance_score: float
    quality_score: float
    final_score: float
    metadata: Dict[str, Any]
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'text': self.text,
            'perplexity': float(self.perplexity),
            'relevance_score': float(self.relevance_score),
            'quality_score': float(self.quality_score),
            'final_score': float(self.final_score),
            'metadata': self.metadata
        }

@dataclass
class BestOfNResult:
    """Result from Best-of-N generation."""
    best_answer: str
    confidence: float
    all_candidates: List[GenerationCandidate]
    generation_time: float
    metadata: Dict[str, Any]

class EnhancedBestOfNGenerator:
    """Enhanced Best-of-N generator using Phi-2."""
    
    def __init__(
        self,
        model_name: str = "microsoft/phi-2",
        device: Optional[str] = None,
        max_new_tokens: int = 512,
        n_candidates: int = 5
    ):
        self.model_name = model_name
        self.max_new_tokens = max_new_tokens
        self.n_candidates = n_candidates
        
        # Device setup
        if device is None:
            self.device = "cuda" if torch.cuda.is_available() else "cpu"
        else:
            self.device = device
        
        # Load model and tokenizer
        self.model = None
        self.tokenizer = None
        self._load_model()
        
        # Scoring weights
        self.perplexity_weight = 0.3
        self.relevance_weight = 0.4
        self.quality_weight = 0.3
        
        logger.info(f"Enhanced Best-of-N Generator initialized with {model_name}")
    
    def _load_model(self):
        """Load Phi-2 model and tokenizer."""
        try:
            self.tokenizer = AutoTokenizer.from_pretrained(self.model_name)
            if self.tokenizer.pad_token is None:
                self.tokenizer.pad_token = self.tokenizer.eos_token
            
            self.model = AutoModelForCausalLM.from_pretrained(
                self.model_name,
                torch_dtype=torch.float16 if self.device == "cuda" else torch.float32,
                device_map="auto" if self.device == "cuda" else None,
                trust_remote_code=True
            )
            
            if self.device != "cuda":
                self.model = self.model.to(self.device)
            
            self.model.eval()
            logger.info(f"Model loaded successfully on {self.device}")
            
        except Exception as e:
            logger.error(f"Failed to load model {self.model_name}: {e}")
            self.model = None
            self.tokenizer = None
    
    def _create_prompt(self, query: str, context_chunks: List[str]) -> str:
        """Create a well-structured prompt for generation."""
        
        # Combine context chunks
        context = "\n\n".join([f"Context {i+1}: {chunk}" for i, chunk in enumerate(context_chunks)])
        
        prompt = f"""You are a helpful assistant that answers questions based on provided context.

Context Information:
{context}

Question: {query}

Instructions:
- Answer ONLY based on the provided context
- Provide a clear, well-structured response
- If the context doesn't contain enough information, say so
- Format your response in JSON with this structure:
{{
  "answer": "<your detailed answer here>",
  "confidence": <0.0 to 1.0>,
  "source_chunks_used": ["<brief description of relevant context>"]
}}

Response:"""
        
        return prompt
    
    def _calculate_perplexity(self, text: str, context: str) -> float:
        """Calculate perplexity of generated text given context."""
        if not self.model or not self.tokenizer:
            return 50.0  # Default high perplexity
        
        try:
            full_text = context + " " + text
            inputs = self.tokenizer(full_text, return_tensors="pt").to(self.device)
            
            with torch.no_grad():
                outputs = self.model(**inputs, labels=inputs["input_ids"])
                loss = outputs.loss
                perplexity = torch.exp(loss).item()
            
            return min(perplexity, 100.0)  # Cap at 100
            
        except Exception as e:
            logger.warning(f"Perplexity calculation failed: {e}")
            return 50.0
    
    def _calculate_relevance_score(self, query: str, answer: str, context_chunks: List[str]) -> float:
        """Calculate how relevant the answer is to the query."""
        
        # Extract query keywords
        query_words = set(re.findall(r'\b\w+\b', query.lower()))
        answer_words = set(re.findall(r'\b\w+\b', answer.lower()))
        
        # Keyword overlap
        if query_words:
            keyword_overlap = len(query_words & answer_words) / len(query_words)
        else:
            keyword_overlap = 0.0
        
        # Context usage score
        context_words = set()
        for chunk in context_chunks:
            context_words.update(re.findall(r'\b\w+\b', chunk.lower()))
        
        if context_words:
            context_usage = len(answer_words & context_words) / min(len(answer_words), len(context_words))
        else:
            context_usage = 0.0
        
        # Question answering patterns
        qa_patterns = [
            r'based on',
            r'according to',
            r'the (?:document|context|text) (?:shows|states|indicates)',
            r'as (?:mentioned|stated|described)',
        ]
        
        qa_score = 0.0
        for pattern in qa_patterns:
            if re.search(pattern, answer.lower()):
                qa_score += 0.2
        
        qa_score = min(qa_score, 1.0)
        
        # Combine scores
        relevance = (keyword_overlap * 0.4 + context_usage * 0.4 + qa_score * 0.2)
        return min(relevance, 1.0)
    
    def _calculate_quality_score(self, answer: str) -> float:
        """Calculate the quality of the answer."""
        
        quality_score = 0.0
        
        # Length score (not too short, not too long)
        length = len(answer)
        if 50 <= length <= 2000:
            quality_score += 0.3
        elif 20 <= length < 50:
            quality_score += 0.1
        
        # Structure score
        if answer.count('.') >= 1:  # Has sentences
            quality_score += 0.2
        
        if '\n' in answer or '**' in answer or '*' in answer:  # Has formatting
            quality_score += 0.1
        
        # JSON format bonus
        try:
            json.loads(answer)
            quality_score += 0.2
        except:
            pass
        
        # Completeness indicators
        completeness_indicators = [
            'answer', 'because', 'therefore', 'however', 'additionally',
            'furthermore', 'specifically', 'example', 'such as'
        ]
        
        found_indicators = sum(1 for indicator in completeness_indicators if indicator in answer.lower())
        quality_score += min(found_indicators * 0.05, 0.2)
        
        return min(quality_score, 1.0)
    
    def _parse_json_response(self, text: str) -> Dict[str, Any]:
        """Try to parse JSON response, with fallback."""
        # Try to find JSON in the text
        json_match = re.search(r'\{.*\}', text, re.DOTALL)
        if json_match:
            try:
                return json.loads(json_match.group())
            except json.JSONDecodeError:
                pass
        
        # Fallback: create JSON structure
        return {
            "answer": text.strip(),
            "confidence": 0.5,
            "source_chunks_used": ["Context analysis"]
        }
    
    def generate_candidates(
        self,
        query: str,
        context_chunks: List[str],
        n_candidates: Optional[int] = None
    ) -> List[GenerationCandidate]:
        """Generate multiple candidates using different sampling strategies."""
        
        if not self.model or not self.tokenizer:
            logger.error("Model not loaded, cannot generate")
            return []
        
        n_candidates = n_candidates or self.n_candidates
        prompt = self._create_prompt(query, context_chunks)
        
        candidates = []
        
        # Generation configurations for diversity
        configs = [
            {'temperature': 0.7, 'top_p': 0.9, 'do_sample': True},
            {'temperature': 0.8, 'top_p': 0.95, 'do_sample': True},
            {'temperature': 0.6, 'top_p': 0.85, 'do_sample': True},
            {'temperature': 0.9, 'top_p': 0.9, 'do_sample': True},
            {'temperature': 0.5, 'top_p': 0.8, 'do_sample': True}
        ]
        
        for i in range(n_candidates):
            try:
                config = configs[i % len(configs)]
                
                inputs = self.tokenizer(prompt, return_tensors="pt").to(self.device)
                
                with torch.no_grad():
                    outputs = self.model.generate(
                        **inputs,
                        max_new_tokens=self.max_new_tokens,
                        pad_token_id=self.tokenizer.eos_token_id,
                        **config
                    )
                
                # Extract generated text
                generated_text = self.tokenizer.decode(
                    outputs[0][inputs['input_ids'].shape[1]:], 
                    skip_special_tokens=True
                ).strip()
                
                # Calculate scores
                perplexity = self._calculate_perplexity(generated_text, prompt)
                relevance = self._calculate_relevance_score(query, generated_text, context_chunks)
                quality = self._calculate_quality_score(generated_text)
                
                # Calculate final score
                final_score = (
                    self.perplexity_weight * (1.0 / (1.0 + perplexity/10)) +
                    self.relevance_weight * relevance +
                    self.quality_weight * quality
                )
                
                candidate = GenerationCandidate(
                    text=generated_text,
                    perplexity=perplexity,
                    relevance_score=relevance,
                    quality_score=quality,
                    final_score=final_score,
                    metadata={
                        'generation_config': config,
                        'candidate_index': i,
                        'prompt_length': len(prompt)
                    }
                )
                
                candidates.append(candidate)
                
            except Exception as e:
                logger.error(f"Generation failed for candidate {i}: {e}")
                continue
        
        # Sort by final score
        candidates.sort(key=lambda x: x.final_score, reverse=True)
        
        return candidates
    
    def generate_best_answer(
        self,
        query: str,
        context_chunks: List[str],
        n_candidates: Optional[int] = None
    ) -> BestOfNResult:
        """Generate the best answer using Best-of-N sampling."""
        
        start_time = time.time()
        
        # Generate candidates
        candidates = self.generate_candidates(query, context_chunks, n_candidates)
        
        if not candidates:
            # Fallback response
            fallback_answer = {
                "answer": "I apologize, but I cannot generate a proper response based on the provided context. The information may be insufficient or irrelevant to answer your question.",
                "confidence": 0.1,
                "source_chunks_used": []
            }
            
            fallback_candidate = GenerationCandidate(
                text=json.dumps(fallback_answer, indent=2),
                perplexity=100.0,
                relevance_score=0.0,
                quality_score=0.1,
                final_score=0.05,
                metadata={'is_fallback': True}
            )
            
            candidates = [fallback_candidate]
        
        # Select best candidate
        best_candidate = candidates[0]
        
        # Parse the response to ensure JSON format
        parsed_response = self._parse_json_response(best_candidate.text)
        
        # Create final formatted response
        final_answer = json.dumps(parsed_response, indent=2)
        confidence = parsed_response.get('confidence', best_candidate.final_score)
        
        generation_time = time.time() - start_time
        
        result = BestOfNResult(
            best_answer=final_answer,
            confidence=float(confidence),
            all_candidates=candidates,
            generation_time=generation_time,
            metadata={
                'query': query,
                'context_chunks_count': len(context_chunks),
                'candidates_generated': len(candidates),
                'best_candidate_index': 0,
                'generation_method': 'best_of_n'
            }
        )
        
        logger.info(f"Best-of-N generation completed: {len(candidates)} candidates in {generation_time:.2f}s")
        
        return result