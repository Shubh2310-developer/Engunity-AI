"""
Phi-2 Generator Model for RAG Pipeline
======================================

High-performance text generation using Microsoft's Phi-2 model for 
structured, document-based question answering with RAG context.

Features:
- Phi-2 model for high-quality text generation
- Structured response formatting
- Context-aware generation with retrieval documents
- Memory-efficient inference for production use
- Support for various response formats (Q&A, explanations, summaries)

Author: Engunity AI Team
"""

import os
import json
import logging
import torch
from typing import Dict, List, Optional, Any, Union, Tuple
from dataclasses import dataclass
from pathlib import Path
import time
from datetime import datetime

try:
    from transformers import (
        AutoTokenizer, 
        AutoModelForCausalLM, 
        GenerationConfig,
        BitsAndBytesConfig
    )
    TRANSFORMERS_AVAILABLE = True
except ImportError:
    TRANSFORMERS_AVAILABLE = False
    logger.warning("Transformers not available. Please install: pip install transformers torch")

logger = logging.getLogger(__name__)

@dataclass
class GenerationResult:
    """Result from text generation."""
    text: str
    confidence: float
    tokens_generated: int
    generation_time: float
    metadata: Dict[str, Any]
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'text': self.text,
            'confidence': self.confidence,
            'tokens_generated': self.tokens_generated,
            'generation_time': self.generation_time,
            'metadata': self.metadata
        }

@dataclass
class RAGContext:
    """Context from retrieval for generation."""
    documents: List[Dict[str, Any]]
    query: str
    context_text: str
    metadata: Dict[str, Any]

class Phi2Generator:
    """Phi-2 based text generator for RAG responses."""
    
    def __init__(
        self,
        model_name: str = "microsoft/phi-2",
        device: str = "auto",
        max_length: int = 2048,
        use_quantization: bool = True,
        temperature: float = 0.7,
        do_sample: bool = True,
        top_p: float = 0.9,
        top_k: int = 50
    ):
        """
        Initialize Phi-2 generator.
        
        Args:
            model_name: Phi-2 model name or path
            device: Device to use ('cpu', 'cuda', 'auto')  
            max_length: Maximum generation length
            use_quantization: Use 4-bit quantization for memory efficiency
            temperature: Generation temperature
            do_sample: Whether to use sampling
            top_p: Top-p sampling parameter
            top_k: Top-k sampling parameter
        """
        if not TRANSFORMERS_AVAILABLE:
            raise RuntimeError("Transformers library not available. Please install it first.")
            
        self.model_name = model_name
        self.max_length = max_length
        self.use_quantization = use_quantization
        
        # Set device
        if device == "auto":
            self.device = "cuda" if torch.cuda.is_available() else "cpu"
        else:
            self.device = device
            
        logger.info(f"Using device: {self.device}")
        
        # Generation config optimized for Best-of-N
        self.generation_config = GenerationConfig(
            max_length=max_length,
            max_new_tokens=200,  # Reduced for better quality
            temperature=temperature,
            do_sample=do_sample,
            top_p=top_p,
            top_k=top_k,
            pad_token_id=50256,  # Phi-2 uses GPT-2 tokenizer
            eos_token_id=50256,
            repetition_penalty=1.1,
            length_penalty=1.0,
            early_stopping=True,
            num_return_sequences=1
        )
        
        # Initialize model and tokenizer
        self.model = None
        self.tokenizer = None
        self._load_model()
        
        logger.info("Phi-2 Generator initialized successfully")
    
    def _load_model(self):
        """Load Phi-2 model and tokenizer."""
        try:
            logger.info(f"Loading Phi-2 model: {self.model_name}")
            
            # Load tokenizer
            self.tokenizer = AutoTokenizer.from_pretrained(
                self.model_name,
                trust_remote_code=True,
                padding_side='left'
            )
            
            # Add pad token if not present
            if self.tokenizer.pad_token is None:
                self.tokenizer.pad_token = self.tokenizer.eos_token
            
            # Configure quantization if enabled
            quantization_config = None
            if self.use_quantization and self.device == "cuda":
                try:
                    quantization_config = BitsAndBytesConfig(
                        load_in_4bit=True,
                        bnb_4bit_quant_type="nf4",
                        bnb_4bit_compute_dtype=torch.float16,
                        bnb_4bit_use_double_quant=True,
                    )
                    logger.info("Using 4-bit quantization")
                except Exception as e:
                    logger.warning(f"Could not enable quantization: {e}")
                    quantization_config = None
            
            # Load model
            self.model = AutoModelForCausalLM.from_pretrained(
                self.model_name,
                torch_dtype=torch.float16 if self.device == "cuda" else torch.float32,
                device_map="auto" if self.device == "cuda" else None,
                trust_remote_code=True,
                quantization_config=quantization_config,
                low_cpu_mem_usage=True
            )
            
            if self.device == "cpu":
                self.model = self.model.to(self.device)
            
            # Set to evaluation mode
            self.model.eval()
            
            logger.info("Model loaded successfully")
            
        except Exception as e:
            logger.error(f"Error loading Phi-2 model: {e}")
            raise
    
    def generate_response(
        self,
        query: str,
        context: Optional[RAGContext] = None,
        response_format: str = "detailed",
        max_new_tokens: int = 512,
        temperature: float = None,
        **kwargs
    ) -> GenerationResult:
        """
        Generate response for a query with optional RAG context.
        
        Args:
            query: User query
            context: RAG context with retrieved documents
            response_format: Format type ('detailed', 'concise', 'explanation', 'summary')
            max_new_tokens: Maximum new tokens to generate
            temperature: Override temperature for this generation
            **kwargs: Additional generation parameters
            
        Returns:
            Generation result
        """
        start_time = time.time()
        
        # Build prompt
        prompt = self._build_prompt(query, context, response_format)
        
        logger.info(f"Generating response for query: {query[:100]}...")
        logger.debug(f"Prompt length: {len(prompt)} characters")
        
        # Tokenize input
        inputs = self.tokenizer(
            prompt,
            return_tensors="pt",
            padding=True,
            truncation=True,
            max_length=self.max_length - max_new_tokens
        )
        inputs = inputs.to(self.device)
        
        # Update generation config
        gen_config = GenerationConfig(**self.generation_config.to_dict())
        gen_config.max_new_tokens = max_new_tokens
        if temperature is not None:
            gen_config.temperature = temperature
        
        # Override with kwargs
        for key, value in kwargs.items():
            if hasattr(gen_config, key):
                setattr(gen_config, key, value)
        
        # Generate response
        try:
            with torch.no_grad():
                outputs = self.model.generate(
                    **inputs,
                    generation_config=gen_config,
                    use_cache=True
                )
            
            # Decode response
            generated_tokens = outputs[0][inputs['input_ids'].shape[1]:]
            response_text = self.tokenizer.decode(generated_tokens, skip_special_tokens=True)
            
            # Clean response
            response_text = self._clean_response(response_text)
            
            # Calculate confidence (simplified heuristic)
            confidence = self._calculate_confidence(response_text, context)
            
            generation_time = time.time() - start_time
            
            result = GenerationResult(
                text=response_text,
                confidence=confidence,
                tokens_generated=len(generated_tokens),
                generation_time=generation_time,
                metadata={
                    'query': query,
                    'response_format': response_format,
                    'prompt_tokens': inputs['input_ids'].shape[1],
                    'total_tokens': outputs.shape[1],
                    'temperature': gen_config.temperature,
                    'generated_at': datetime.now().isoformat()
                }
            )
            
            logger.info(f"Generated response in {generation_time:.2f}s ({len(generated_tokens)} tokens)")
            return result
            
        except Exception as e:
            logger.error(f"Error during generation: {e}")
            raise
    
    def _build_prompt(
        self, 
        query: str, 
        context: Optional[RAGContext] = None,
        response_format: str = "detailed"
    ) -> str:
        """Build structured prompt for Phi-2 generation with improved reasoning."""
        
        # Define format-specific instructions with better reasoning guidance
        format_instructions = {
            "detailed": "Summarize or synthesize the answer using your understanding. Avoid unnecessary repetition or stating 'Based on the document...' If architecture or process is discussed, explain the flow clearly. Use bullet points if needed for clarity.",
            "concise": "Provide a brief and direct answer focusing on the key points. Synthesize rather than copy from context.",
            "explanation": "Explain the concept thoroughly with step-by-step reasoning. Use your understanding to clarify complex ideas without repeating context verbatim.",
            "summary": "Summarize the key information and main points clearly using your own words and understanding."
        }
        
        # Enhanced prompt structure that forces abstraction
        prompt_parts = [
            "You are an expert AI system that explains technical concepts clearly and precisely.",
            "",
            "Based on the provided document context, answer the following question **in your own words**, using **concise language**. Do **not** repeat the context or copy sentences verbatim.",
            ""
        ]
        
        # Add context if available
        if context and context.documents:
            prompt_parts.extend([
                "Context:",
                '"""',
                context.context_text,
                '"""',
                ""
            ])
        
        # Add the query
        prompt_parts.extend([
            f"Question:",
            query,
            ""
        ])
        
        # Add format-specific instruction
        instruction = format_instructions.get(response_format, format_instructions["detailed"])
        prompt_parts.extend([
            "Instructions:",
            f"- {instruction}",
            "- Avoid unnecessary repetition or stating 'Based on the document...'",
            "- The document says', 'According to the context'",
            "",
            "Answer:"
        ])
        
        return "\n".join(prompt_parts)
    
    def _clean_response(self, text: str) -> str:
        """Clean and format the generated response."""
        # Remove common artifacts
        text = text.strip()
        
        # Remove banned phrases that indicate copying from context
        banned_phrases = [
            "Based on the document", 
            "The document says", 
            "According to the context",
            "The text states",
            "As mentioned in the document",
            "The document mentions",
            "From the context"
        ]
        
        for phrase in banned_phrases:
            # Remove exact matches and variations
            text = text.replace(phrase, "")
            text = text.replace(phrase.lower(), "")
        
        # Remove repeated patterns
        lines = text.split('\n')
        cleaned_lines = []
        prev_line = ""
        
        for line in lines:
            line = line.strip()
            # Skip repeated lines or obvious artifacts
            if line != prev_line and not self._is_artifact(line):
                cleaned_lines.append(line)
            prev_line = line
        
        # Clean up any double spaces or empty lines
        result = '\n'.join(cleaned_lines).strip()
        result = ' '.join(result.split())  # Remove extra whitespace
        
        return result
    
    def _is_artifact(self, line: str) -> bool:
        """Check if line is a generation artifact."""
        artifacts = [
            "## Question:",
            "## Answer:",
            "## Context:",
            "## Instructions:",
            "<|endoftext|>",
            "[INST]",
            "[/INST]"
        ]
        
        return any(artifact in line for artifact in artifacts)
    
    def _calculate_confidence(self, text: str, context: Optional[RAGContext] = None) -> float:
        """Calculate confidence score for generated response (simplified heuristic)."""
        confidence = 0.5  # Base confidence
        
        # Length-based confidence
        if 50 <= len(text) <= 1000:
            confidence += 0.2
        elif len(text) > 1000:
            confidence += 0.1
        
        # Context relevance bonus
        if context and context.documents:
            # Simple keyword matching
            query_words = set(context.query.lower().split())
            response_words = set(text.lower().split())
            overlap = len(query_words & response_words)
            if overlap > 0:
                confidence += min(overlap * 0.05, 0.2)
        
        # Structure bonus (well-formed sentences)
        sentences = text.split('.')
        if len(sentences) > 1 and all(len(s.strip()) > 10 for s in sentences[:3]):
            confidence += 0.1
        
        return min(confidence, 1.0)
    
    def generate_structured_answer(
        self,
        query: str,
        context: Optional[RAGContext] = None,
        include_sources: bool = True,
        max_new_tokens: int = 600
    ) -> Dict[str, Any]:
        """
        Generate structured answer with metadata.
        
        Args:
            query: User query
            context: RAG context
            include_sources: Whether to include source information
            max_new_tokens: Maximum tokens to generate
            
        Returns:
            Structured answer dictionary
        """
        # Generate main response
        result = self.generate_response(
            query=query,
            context=context,
            response_format="detailed",
            max_new_tokens=max_new_tokens
        )
        
        # Build structured response
        structured_response = {
            "answer": result.text,
            "confidence": result.confidence,
            "query": query,
            "response_time": result.generation_time,
            "tokens_generated": result.tokens_generated,
            "metadata": {
                "model": self.model_name,
                "generated_at": datetime.now().isoformat(),
                "generation_config": {
                    "temperature": self.generation_config.temperature,
                    "max_new_tokens": max_new_tokens,
                    "top_p": self.generation_config.top_p
                }
            }
        }
        
        # Add sources if available and requested
        if include_sources and context and context.documents:
            structured_response["sources"] = [
                {
                    "document_id": doc.get("document_id", "unknown"),
                    "content": doc.get("content", "")[:200] + "..." if len(doc.get("content", "")) > 200 else doc.get("content", ""),
                    "score": doc.get("score", 0.0),
                    "metadata": doc.get("metadata", {})
                }
                for doc in context.documents[:5]  # Top 5 sources
            ]
        
        return structured_response
    
    def batch_generate(
        self,
        queries: List[str],
        contexts: Optional[List[RAGContext]] = None,
        **kwargs
    ) -> List[GenerationResult]:
        """
        Generate responses for multiple queries.
        
        Args:
            queries: List of queries
            contexts: Optional list of contexts
            **kwargs: Generation parameters
            
        Returns:
            List of generation results
        """
        results = []
        
        if contexts is None:
            contexts = [None] * len(queries)
        
        for query, context in zip(queries, contexts):
            try:
                result = self.generate_response(query, context, **kwargs)
                results.append(result)
            except Exception as e:
                logger.error(f"Error generating response for query '{query[:50]}...': {e}")
                # Add error result
                results.append(GenerationResult(
                    text=f"Error generating response: {str(e)}",
                    confidence=0.0,
                    tokens_generated=0,
                    generation_time=0.0,
                    metadata={"error": str(e)}
                ))
        
        return results
    
    def generate_best_of_n(
        self,
        query: str,
        context: Optional[RAGContext] = None,
        n: int = 5,
        response_format: str = "detailed",
        max_new_tokens: int = 512,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Generate N responses and return the best one using LLM-based ranking.
        
        Args:
            query: User query
            context: RAG context
            n: Number of candidates to generate
            response_format: Response format
            max_new_tokens: Max tokens per response
            **kwargs: Additional generation parameters
            
        Returns:
            Dictionary with best response and ranking metadata
        """
        logger.info(f"Generating {n} candidates for best-of-N sampling")
        start_time = time.time()
        
        # Generate multiple candidates with temperature variation
        candidates = []
        base_temp = kwargs.get('temperature', 0.7)
        
        for i in range(n):
            # Vary temperature for diversity
            temp = base_temp + (i - n//2) * 0.1
            temp = max(0.1, min(1.5, temp))  # Clamp between 0.1 and 1.5
            
            candidate_kwargs = kwargs.copy()
            candidate_kwargs['temperature'] = temp
            
            try:
                result = self.generate_response(
                    query=query,
                    context=context, 
                    response_format=response_format,
                    max_new_tokens=max_new_tokens,
                    **candidate_kwargs
                )
                candidates.append({
                    'text': result.text,
                    'confidence': result.confidence,
                    'temperature': temp,
                    'tokens': result.tokens_generated,
                    'generation_time': result.generation_time,
                    'metadata': result.metadata
                })
            except Exception as e:
                logger.error(f"Error generating candidate {i+1}: {e}")
                continue
        
        if not candidates:
            # Fallback to single generation
            result = self.generate_response(query, context, response_format, max_new_tokens, **kwargs)
            return {
                'best_response': result.text,
                'confidence': result.confidence,
                'candidates_count': 1,
                'selection_method': 'fallback',
                'total_time': result.generation_time,
                'metadata': result.metadata
            }
        
        # Rank candidates using LLM
        best_candidate, ranking_explanation = self._rank_candidates_llm(query, candidates)
        
        total_time = time.time() - start_time
        
        logger.info(f"Best-of-N completed: {len(candidates)} candidates, best confidence: {best_candidate['confidence']:.3f}")
        
        return {
            'best_response': best_candidate['text'],
            'confidence': best_candidate['confidence'],
            'candidates_count': len(candidates),
            'selection_method': 'llm_ranking',
            'ranking_explanation': ranking_explanation,
            'total_time': total_time,
            'all_candidates': [c['text'] for c in candidates],
            'metadata': {
                'best_candidate_temp': best_candidate['temperature'],
                'candidate_scores': [c['confidence'] for c in candidates],
                'generation_times': [c['generation_time'] for c in candidates]
            }  
        }
    
    def _rank_candidates_llm(self, query: str, candidates: List[Dict]) -> Tuple[Dict, str]:
        """
        Rank candidates using the same LLM with a ranking prompt.
        
        Args:
            query: Original query
            candidates: List of candidate responses
            
        Returns:
            Tuple of (best_candidate, ranking_explanation)
        """
        if len(candidates) == 1:
            return candidates[0], "Only one candidate generated"
        
        # Create ranking prompt
        ranking_prompt_parts = [
            "Given the question and multiple answers, pick the best answer that is complete, precise, and grounded in the context.",
            "",
            f"Question:",
            query,
            "",
            "Answers:"
        ]
        
        # Add up to 3 candidates (to avoid prompt bloat)
        top_candidates = candidates[:3]
        for i, candidate in enumerate(top_candidates, 1):
            ranking_prompt_parts.extend([
                f"{i}. {candidate['text'][:400]}{'...' if len(candidate['text']) > 400 else ''}",
                ""
            ])
        
        ranking_prompt_parts.extend([
            "Best Answer (1/2/3)? Explain why.",
            ""
        ])
        
        ranking_prompt = "\n".join(ranking_prompt_parts)
        
        try:
            # Use the same model to rank
            inputs = self.tokenizer(
                ranking_prompt,
                return_tensors="pt",
                padding=True,
                truncation=True,
                max_length=1024
            )
            inputs = inputs.to(self.device)
            
            with torch.no_grad():
                outputs = self.model.generate(
                    **inputs,
                    max_new_tokens=100,
                    temperature=0.3,  # Lower temperature for more consistent ranking
                    do_sample=True,
                    pad_token_id=self.tokenizer.pad_token_id
                )
            
            ranking_response = self.tokenizer.decode(
                outputs[0][inputs['input_ids'].shape[1]:], 
                skip_special_tokens=True
            ).strip()
            
            # Parse ranking response
            best_idx = self._parse_ranking_response(ranking_response)
            if best_idx is not None and 0 <= best_idx < len(top_candidates):
                best_candidate = top_candidates[best_idx]
                explanation = f"LLM ranked candidate {best_idx + 1} as best: {ranking_response[:200]}"
            else:
                # Fallback to highest confidence
                best_candidate = max(candidates, key=lambda c: c['confidence'])
                explanation = f"Parsing failed, selected highest confidence candidate. LLM response: {ranking_response[:100]}"
            
            return best_candidate, explanation
            
        except Exception as e:
            logger.error(f"LLM ranking failed: {e}")
            # Fallback to highest confidence
            best_candidate = max(candidates, key=lambda c: c['confidence'])
            return best_candidate, f"LLM ranking failed, selected highest confidence: {e}"
    
    def _parse_ranking_response(self, response: str) -> Optional[int]:
        """Parse LLM ranking response to extract the chosen answer number."""
        response_lower = response.lower()
        
        # Look for explicit answer numbers
        if "answer 1" in response_lower or response_lower.startswith("1"):
            return 0
        elif "answer 2" in response_lower or response_lower.startswith("2"):
            return 1
        elif "answer 3" in response_lower or response_lower.startswith("3"):
            return 2
        
        # Look for numeric patterns
        import re
        numbers = re.findall(r'\b([123])\b', response)
        if numbers:
            return int(numbers[0]) - 1
        
        return None
    
    def get_model_info(self) -> Dict[str, Any]:
        """Get model information."""
        return {
            "model_name": self.model_name,
            "device": self.device,
            "max_length": self.max_length,
            "use_quantization": self.use_quantization,
            "model_loaded": self.model is not None,
            "generation_config": self.generation_config.to_dict() if self.generation_config else None
        }

# Factory function
def create_phi2_generator(**kwargs) -> Phi2Generator:
    """Create Phi-2 generator with default configuration."""
    return Phi2Generator(**kwargs)

# Export main classes
__all__ = [
    "Phi2Generator",
    "GenerationResult",
    "RAGContext", 
    "create_phi2_generator"
]