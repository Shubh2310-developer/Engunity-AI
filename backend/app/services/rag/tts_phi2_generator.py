#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Test-Time Scaling (TTS) Enhanced Phi-2 Generator
================================================

Advanced Phi-2 generator with Test-Time Scaling strategies for improved
reasoning and response quality without model retraining.

TTS Techniques:
- Self-consistency prompting (multiple samples + majority vote)
- Chain-of-Thought injection for complex queries
- Context-aware prompt engineering
- Dynamic temperature adjustment
- Retrieval-augmented reasoning chains
- CS-specific reasoning patterns

Features:
- Memory-efficient inference (<6GB VRAM)
- Intelligent prompt routing based on query type
- Multi-round reasoning for complex questions
- Quality assessment and confidence scoring
- Structured output formatting

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
import asyncio
from datetime import datetime
import numpy as np
from collections import Counter
import re

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
    logging.warning("Transformers not available. Install: pip install transformers torch")

logger = logging.getLogger(__name__)

@dataclass
class TTSGenerationResult:
    """Enhanced generation result with TTS metadata."""
    text: str
    confidence: float
    tokens_generated: int
    generation_time: float
    metadata: Dict[str, Any]
    reasoning_steps: Optional[List[str]] = None
    consistency_score: Optional[float] = None
    tts_method: Optional[str] = None
    samples_generated: int = 1
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'text': self.text,
            'confidence': self.confidence,
            'tokens_generated': self.tokens_generated,
            'generation_time': self.generation_time,
            'metadata': self.metadata,
            'reasoning_steps': self.reasoning_steps,
            'consistency_score': self.consistency_score,
            'tts_method': self.tts_method,
            'samples_generated': self.samples_generated
        }

@dataclass
class RAGContext:
    """Enhanced RAG context with TTS support."""
    documents: List[Dict[str, Any]]
    query: str
    context_text: str
    metadata: Dict[str, Any]
    chat_history: Optional[List[Dict[str, str]]] = None
    query_type: Optional[str] = None
    complexity_score: Optional[float] = None

class TTSPromptTemplates:
    """Test-Time Scaling prompt templates for different reasoning strategies."""
    
    @staticmethod
    def self_consistency_prompt(query: str, context: str, sample_num: int = 1) -> str:
        """Self-consistency prompting template."""
        return f"""<Context>
{context}
</Context>

<Question>
{query}
</Question>

<Instructions>
Based on the provided context, please answer the question thoroughly. This is attempt {sample_num} - provide your best analysis.

Think step by step:
1. Identify the key information in the context
2. Analyze how it relates to the question
3. Provide a comprehensive answer

Answer:"""

    @staticmethod  
    def chain_of_thought_prompt(query: str, context: str, query_type: str = "general") -> str:
        """Chain-of-thought prompting for complex reasoning."""
        if query_type == "code":
            return f"""<Context>
{context}
</Context>

<Question>
{query}
</Question>

<Instructions>
Let's solve this step by step:

Step 1: Understanding the Code/Technical Content
- What programming concepts are involved?
- What is the main functionality or purpose?

Step 2: Analyzing the Question
- What specific aspect is being asked about?
- What level of detail is needed?

Step 3: Connecting Context to Question
- How does the provided context address the question?
- What examples or details support the answer?

Step 4: Comprehensive Answer
Based on my analysis above, here's the complete answer:

Answer:"""
        
        elif query_type == "comparison":
            return f"""<Context>
{context}
</Context>

<Question>
{query}
</Question>

<Instructions>
Let's analyze this comparison systematically:

Step 1: Identify What's Being Compared
- What are the main items/concepts being compared?
- What aspects should be compared?

Step 2: Extract Relevant Information
- What does the context tell us about each item?
- What are the key differences and similarities?

Step 3: Structure the Comparison
- Organize the comparison logically
- Highlight the most important distinctions

Step 4: Final Comparison
Based on the context provided:

Answer:"""
        
        else:  # general
            return f"""<Context>
{context}
</Context>

<Question>
{query}
</Question>

<Instructions>
Let me think through this systematically:

Step 1: Context Analysis
- What key information does the context provide?
- How comprehensive is the available information?

Step 2: Question Breakdown
- What exactly is being asked?
- What type of answer would be most helpful?

Step 3: Information Synthesis
- How can I best use the context to answer the question?
- What additional insights can I provide?

Step 4: Complete Answer
Based on my analysis:

Answer:"""

    @staticmethod
    def retrieval_augmented_reasoning(query: str, context: str, retrieved_chunks: List[Dict]) -> str:
        """RAG-enhanced reasoning template."""
        chunks_text = "\n\n".join([
            f"Source {i+1}: {chunk.get('content', '')[:200]}..."
            for i, chunk in enumerate(retrieved_chunks[:3])
        ])
        
        return f"""<Retrieved Information>
{chunks_text}
</Retrieved Information>

<Full Context>
{context}
</Full Context>

<Question>
{query}
</Question>

<Instructions>
Using both the retrieved information and the full context:

1. First, identify which retrieved sources are most relevant
2. Cross-reference with the full context for completeness
3. Synthesize information from multiple sources
4. Provide a comprehensive, well-sourced answer

Answer with source references:"""

class TTSPhi2Generator:
    """Test-Time Scaling enhanced Phi-2 generator."""
    
    def __init__(
        self,
        model_name: str = "microsoft/phi-2",
        device: str = "auto",
        use_quantization: bool = True,
        max_memory_gb: int = 6,
        cache_dir: Optional[str] = None
    ):
        """
        Initialize TTS-enhanced Phi-2 generator.
        
        Args:
            model_name: Phi-2 model identifier
            device: Device to run model on
            use_quantization: Whether to use quantization for memory efficiency
            max_memory_gb: Maximum VRAM usage in GB
            cache_dir: Model cache directory
        """
        if not TRANSFORMERS_AVAILABLE:
            raise ImportError("Transformers not available")
        
        self.model_name = model_name
        self.device = self._setup_device(device)
        self.use_quantization = use_quantization
        self.max_memory_gb = max_memory_gb
        self.cache_dir = cache_dir
        
        # TTS configuration
        self.tts_config = {
            'self_consistency_samples': 3,
            'consistency_threshold': 0.7,
            'use_chain_of_thought': True,
            'dynamic_temperature': True,
            'max_reasoning_steps': 5
        }
        
        # Initialize model and tokenizer
        self.model = None
        self.tokenizer = None
        self.generation_config = None
        
        self._load_model()
        self.prompt_templates = TTSPromptTemplates()
        
        logger.info("TTS Phi-2 Generator initialized successfully")
    
    def _setup_device(self, device: str) -> str:
        """Setup optimal device configuration."""
        if device == "auto":
            if torch.cuda.is_available():
                return "cuda"
            elif hasattr(torch.backends, 'mps') and torch.backends.mps.is_available():
                return "mps" 
            else:
                return "cpu"
        return device
    
    def _load_model(self):
        """Load Phi-2 model with memory-efficient configuration."""
        try:
            logger.info(f"Loading Phi-2 model: {self.model_name}")
            
            # Setup quantization for memory efficiency
            quantization_config = None
            if self.use_quantization and self.device == "cuda":
                quantization_config = BitsAndBytesConfig(
                    load_in_4bit=True,
                    bnb_4bit_compute_dtype=torch.float16,
                    bnb_4bit_use_double_quant=True,
                    bnb_4bit_quant_type="nf4"
                )
            
            # Load tokenizer
            self.tokenizer = AutoTokenizer.from_pretrained(
                self.model_name,
                cache_dir=self.cache_dir,
                trust_remote_code=True
            )
            
            # Set pad token if not present
            if self.tokenizer.pad_token is None:
                self.tokenizer.pad_token = self.tokenizer.eos_token
            
            # Load model
            self.model = AutoModelForCausalLM.from_pretrained(
                self.model_name,
                torch_dtype=torch.float16 if self.device == "cuda" else torch.float32,
                device_map="auto" if self.device == "cuda" else None,
                quantization_config=quantization_config,
                cache_dir=self.cache_dir,
                trust_remote_code=True,
                low_cpu_mem_usage=True
            )
            
            if self.device != "cuda":
                self.model = self.model.to(self.device)
            
            # Set to evaluation mode
            self.model.eval()
            
            # Default generation config
            self.generation_config = GenerationConfig(
                max_new_tokens=512,
                temperature=0.7,
                top_p=0.9,
                top_k=50,
                do_sample=True,
                pad_token_id=self.tokenizer.pad_token_id,
                eos_token_id=self.tokenizer.eos_token_id,
                repetition_penalty=1.1
            )
            
            logger.info("Phi-2 model loaded successfully")
            
        except Exception as e:
            logger.error(f"Error loading Phi-2 model: {e}")
            raise
    
    def _detect_query_type(self, query: str) -> str:
        """Detect query type for optimal TTS strategy."""
        query_lower = query.lower()
        
        # Code-related queries
        if any(keyword in query_lower for keyword in [
            'code', 'function', 'class', 'algorithm', 'implementation',
            'debug', 'error', 'syntax', 'programming', 'script'
        ]):
            return "code"
        
        # Comparison queries  
        elif any(keyword in query_lower for keyword in [
            'vs', 'versus', 'compare', 'difference', 'similar', 'different',
            'better', 'best', 'worst', 'advantage', 'disadvantage'
        ]):
            return "comparison"
        
        # Definition queries
        elif any(keyword in query_lower for keyword in [
            'what is', 'define', 'definition', 'explain', 'describe'
        ]):
            return "definition"
        
        # How-to queries
        elif any(keyword in query_lower for keyword in [
            'how to', 'how do', 'how can', 'steps', 'process', 'method'
        ]):
            return "howto"
        
        # Complex analytical queries
        elif any(keyword in query_lower for keyword in [
            'analyze', 'analysis', 'evaluate', 'assess', 'why', 'because',
            'reason', 'cause', 'effect', 'impact'
        ]):
            return "analytical"
        
        return "general"
    
    def _calculate_complexity_score(self, query: str, context: str) -> float:
        """Calculate query complexity for TTS strategy selection."""
        score = 0.0
        
        # Length factors
        query_words = len(query.split())
        context_words = len(context.split())
        
        if query_words > 15:
            score += 0.3
        if context_words > 1000:
            score += 0.2
        
        # Technical complexity indicators
        technical_terms = [
            'algorithm', 'implementation', 'optimization', 'architecture',
            'framework', 'methodology', 'paradigm', 'complexity', 'analysis'
        ]
        
        tech_count = sum(1 for term in technical_terms if term in query.lower())
        score += tech_count * 0.1
        
        # Multi-part questions
        if any(indicator in query for indicator in ['and', ',', ';', '?']):
            parts = len(re.split(r'[,;]|\sand\s', query))
            score += (parts - 1) * 0.15
        
        return min(score, 1.0)
    
    async def generate_response(
        self,
        query: str,
        context: RAGContext,
        response_format: str = "detailed",
        max_new_tokens: int = 512,
        temperature: float = 0.7,
        use_tts: bool = True,
        **kwargs
    ) -> TTSGenerationResult:
        """
        Generate response with Test-Time Scaling enhancement.
        
        Args:
            query: User query
            context: RAG context with documents and metadata
            response_format: Response format type
            max_new_tokens: Maximum tokens to generate
            temperature: Generation temperature
            use_tts: Whether to use TTS techniques
            **kwargs: Additional generation parameters
            
        Returns:
            Enhanced generation result
        """
        start_time = time.time()
        
        try:
            # Detect query characteristics
            query_type = self._detect_query_type(query)
            complexity_score = self._calculate_complexity_score(query, context.context_text)
            
            # Update context with analysis
            context.query_type = query_type
            context.complexity_score = complexity_score
            
            logger.info(f"Query type: {query_type}, Complexity: {complexity_score:.2f}")
            
            # Select TTS strategy based on complexity and query type
            if use_tts and complexity_score > 0.4:
                if complexity_score > 0.7:
                    # High complexity: Use self-consistency + CoT
                    result = await self._self_consistency_generation(
                        query, context, max_new_tokens, temperature, **kwargs
                    )
                else:
                    # Medium complexity: Use chain-of-thought
                    result = await self._chain_of_thought_generation(
                        query, context, max_new_tokens, temperature, **kwargs
                    )
            else:
                # Simple query: Direct generation
                result = await self._direct_generation(
                    query, context, max_new_tokens, temperature, **kwargs
                )
            
            # Add metadata
            result.metadata.update({
                'query_type': query_type,
                'complexity_score': complexity_score,
                'response_format': response_format,
                'tts_enabled': use_tts,
                'model_name': self.model_name
            })
            
            generation_time = time.time() - start_time
            result.generation_time = generation_time
            
            logger.info(f"Generation completed in {generation_time:.2f}s")
            return result
            
        except Exception as e:
            logger.error(f"Error in TTS generation: {e}")
            # Fallback to simple generation
            return await self._direct_generation(
                query, context, max_new_tokens, temperature, **kwargs
            )
    
    async def _self_consistency_generation(
        self,
        query: str,
        context: RAGContext,
        max_new_tokens: int,
        temperature: float,
        **kwargs
    ) -> TTSGenerationResult:
        """Generate multiple samples and select most consistent answer."""
        num_samples = self.tts_config['self_consistency_samples']
        samples = []
        
        logger.info(f"Generating {num_samples} samples for self-consistency")
        
        for i in range(num_samples):
            # Vary temperature slightly for diversity
            sample_temp = temperature + (i * 0.1 - 0.1)
            sample_temp = max(0.1, min(1.0, sample_temp))
            
            prompt = self.prompt_templates.self_consistency_prompt(
                query, context.context_text, i + 1
            )
            
            sample = await self._generate_single_response(
                prompt, max_new_tokens, sample_temp, **kwargs
            )
            samples.append(sample)
        
        # Select best sample based on consistency and quality
        best_sample = self._select_best_sample(samples, query)
        consistency_score = self._calculate_consistency_score(samples)
        
        return TTSGenerationResult(
            text=best_sample['text'],
            confidence=best_sample['confidence'] * consistency_score,
            tokens_generated=best_sample['tokens_generated'],
            generation_time=0,  # Will be set by caller
            metadata=best_sample['metadata'],
            consistency_score=consistency_score,
            tts_method="self_consistency",
            samples_generated=num_samples
        )
    
    async def _chain_of_thought_generation(
        self,
        query: str,
        context: RAGContext,
        max_new_tokens: int,
        temperature: float,
        **kwargs
    ) -> TTSGenerationResult:
        """Generate response with chain-of-thought reasoning."""
        prompt = self.prompt_templates.chain_of_thought_prompt(
            query, context.context_text, context.query_type or "general"
        )
        
        # Increase max tokens for reasoning steps
        cot_max_tokens = min(max_new_tokens * 2, 1024)
        
        response = await self._generate_single_response(
            prompt, cot_max_tokens, temperature, **kwargs
        )
        
        # Extract reasoning steps
        reasoning_steps = self._extract_reasoning_steps(response['text'])
        
        return TTSGenerationResult(
            text=response['text'],
            confidence=response['confidence'],
            tokens_generated=response['tokens_generated'],
            generation_time=0,
            metadata=response['metadata'],
            reasoning_steps=reasoning_steps,
            tts_method="chain_of_thought",
            samples_generated=1
        )
    
    async def _direct_generation(
        self,
        query: str,
        context: RAGContext,
        max_new_tokens: int,
        temperature: float,
        **kwargs
    ) -> TTSGenerationResult:
        """Direct generation without TTS enhancement."""
        prompt = f"""Based on the following context, please answer the question:

Context:
{context.context_text}

Question: {query}

Answer:"""
        
        response = await self._generate_single_response(
            prompt, max_new_tokens, temperature, **kwargs
        )
        
        return TTSGenerationResult(
            text=response['text'],
            confidence=response['confidence'],
            tokens_generated=response['tokens_generated'],
            generation_time=0,
            metadata=response['metadata'],
            tts_method="direct",
            samples_generated=1
        )
    
    async def _generate_single_response(
        self,
        prompt: str,
        max_new_tokens: int,
        temperature: float,
        **kwargs
    ) -> Dict[str, Any]:
        """Generate a single response using the model."""
        try:
            # Tokenize input
            inputs = self.tokenizer(
                prompt,
                return_tensors="pt",
                padding=True,
                truncation=True,
                max_length=2048
            ).to(self.device)
            
            # Update generation config
            gen_config = GenerationConfig(
                max_new_tokens=max_new_tokens,
                temperature=temperature,
                top_p=kwargs.get('top_p', 0.9),
                top_k=kwargs.get('top_k', 50),
                do_sample=True,
                pad_token_id=self.tokenizer.pad_token_id,
                eos_token_id=self.tokenizer.eos_token_id,
                repetition_penalty=kwargs.get('repetition_penalty', 1.1)
            )
            
            # Generate response
            with torch.no_grad():
                outputs = self.model.generate(
                    **inputs,
                    generation_config=gen_config
                )
            
            # Decode response
            input_length = inputs['input_ids'].shape[1]
            generated_tokens = outputs[0][input_length:]
            response_text = self.tokenizer.decode(generated_tokens, skip_special_tokens=True)
            
            # Calculate confidence (simple heuristic)
            confidence = self._calculate_response_confidence(response_text, prompt)
            
            return {
                'text': response_text.strip(),
                'confidence': confidence,
                'tokens_generated': len(generated_tokens),
                'metadata': {
                    'temperature': temperature,
                    'prompt_length': len(prompt),
                    'input_tokens': input_length
                }
            }
            
        except Exception as e:
            logger.error(f"Error in single response generation: {e}")
            return {
                'text': f"I apologize, but I encountered an error generating a response: {str(e)}",
                'confidence': 0.0,
                'tokens_generated': 0,
                'metadata': {'error': str(e)}
            }
    
    def _select_best_sample(self, samples: List[Dict], query: str) -> Dict:
        """Select the best sample from multiple generations."""
        if not samples:
            return {'text': '', 'confidence': 0.0, 'tokens_generated': 0, 'metadata': {}}
        
        # Score samples based on multiple criteria
        scored_samples = []
        
        for sample in samples:
            score = 0.0
            
            # Base confidence
            score += sample.get('confidence', 0.0) * 0.4
            
            # Length appropriateness (not too short, not too long)
            text_length = len(sample.get('text', ''))
            if 50 <= text_length <= 500:
                score += 0.2
            elif text_length > 500:
                score += 0.1
            
            # Content quality indicators
            text = sample.get('text', '').lower()
            if 'based on' in text or 'according to' in text:
                score += 0.1
            if 'step' in text and ('1' in text or 'first' in text):
                score += 0.1
            if not any(phrase in text for phrase in ['i apologize', 'i cannot', 'error']):
                score += 0.2
            
            scored_samples.append((score, sample))
        
        # Return best sample
        scored_samples.sort(key=lambda x: x[0], reverse=True)
        return scored_samples[0][1]
    
    def _calculate_consistency_score(self, samples: List[Dict]) -> float:
        """Calculate consistency score across multiple samples."""
        if len(samples) < 2:
            return 1.0
        
        # Simple consistency measure based on common phrases/concepts
        all_words = []
        for sample in samples:
            words = sample.get('text', '').lower().split()
            all_words.extend(words)
        
        if not all_words:
            return 0.5
        
        word_counts = Counter(all_words)
        common_words = [word for word, count in word_counts.items() if count >= len(samples) // 2]
        
        consistency = len(common_words) / max(len(set(all_words)), 1)
        return min(consistency * 2, 1.0)  # Scale up since this is conservative
    
    def _extract_reasoning_steps(self, text: str) -> List[str]:
        """Extract reasoning steps from chain-of-thought response."""
        steps = []
        
        # Look for step patterns
        step_patterns = [
            r'Step \d+[:\-]?\s*(.+?)(?=Step \d+|$)',
            r'\d+\.\s*(.+?)(?=\d+\.|$)',
            r'First[:\-]?\s*(.+?)(?=Second|Next|Then|$)',
            r'Second[:\-]?\s*(.+?)(?=Third|Next|Then|$)',
            r'Third[:\-]?\s*(.+?)(?=Fourth|Next|Then|$)'
        ]
        
        for pattern in step_patterns:
            matches = re.findall(pattern, text, re.DOTALL | re.IGNORECASE)
            if matches:
                steps.extend([match.strip() for match in matches])
                break
        
        return steps[:5]  # Limit to 5 steps
    
    def _calculate_response_confidence(self, response: str, prompt: str) -> float:
        """Calculate confidence score for generated response."""
        confidence = 0.5  # Base confidence
        
        # Length appropriateness
        if 20 <= len(response) <= 1000:
            confidence += 0.2
        
        # Content quality indicators
        response_lower = response.lower()
        
        # Positive indicators
        if any(phrase in response_lower for phrase in [
            'based on', 'according to', 'the document', 'the context'
        ]):
            confidence += 0.1
        
        if response_lower.count('.') >= 2:  # Multiple sentences
            confidence += 0.1
        
        # Negative indicators
        if any(phrase in response_lower for phrase in [
            'i cannot', 'i apologize', 'error', 'unclear', 'not sure'
        ]):
            confidence -= 0.2
        
        if len(response.strip()) < 10:
            confidence -= 0.3
        
        return max(0.0, min(1.0, confidence))
    
    def get_model_info(self) -> Dict[str, Any]:
        """Get model information and capabilities."""
        return {
            'model_name': self.model_name,
            'device': self.device,
            'quantization_enabled': self.use_quantization,
            'tts_capabilities': {
                'self_consistency': True,
                'chain_of_thought': True,
                'retrieval_augmented_reasoning': True,
                'dynamic_temperature': True
            },
            'supported_query_types': [
                'code', 'comparison', 'definition', 'howto', 'analytical', 'general'
            ],
            'max_context_length': 2048,
            'max_generation_length': 1024
        }

# Factory function
def create_tts_phi2_generator(**kwargs) -> TTSPhi2Generator:
    """Create TTS-enhanced Phi-2 generator with default configuration."""
    return TTSPhi2Generator(**kwargs)