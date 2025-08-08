"""
Enhanced RAG Configuration
==========================

Configuration management for the enhanced RAG system with:
- Improved generation prompts
- Best-of-N sampling
- Chunk condensation
- Document reranking

Author: Engunity AI Team
"""

import json
import logging
from typing import Dict, Any, Optional
from dataclasses import dataclass, asdict
from pathlib import Path
from enum import Enum

logger = logging.getLogger(__name__)

class RAGMode(str, Enum):
    """RAG operation modes."""
    STANDARD = "standard"
    ENHANCED = "enhanced"
    ULTRA_FAST = "ultra_fast"
    QUALITY_FOCUSED = "quality_focused"

@dataclass
class RetrieverConfig:
    """BGE Retriever configuration."""
    model: str = "BAAI/bge-small-en-v1.5"
    top_k: int = 5
    reranking: Dict[str, Any] = None
    chunking: Dict[str, Any] = None
    
    def __post_init__(self):
        if self.reranking is None:
            self.reranking = {
                "enabled": True,
                "model": "cross-encoder/ms-marco-MiniLM-L-6-v2",
                "rerank_top_k": 3
            }
        if self.chunking is None:
            self.chunking = {
                "chunk_size": 250,
                "overlap": 30
            }

@dataclass
class PreprocessingConfig:
    """Preprocessing configuration."""
    condensation_enabled: bool = True
    condense_prompt: str = "Summarize the following chunk into 2–3 sentences that only retain the most relevant details to the user question.\n\nChunk:\n{{chunk}}\n\nQuestion:\n{{query}}\n\nCondensed Chunk:"
    max_chunk_length: int = 250
    target_sentences: int = 3

@dataclass
class GenerationConfig:
    """Generation configuration."""
    model: str = "phi-2"
    max_tokens: int = 512
    temperature: float = 0.7
    top_p: float = 0.95
    best_of_n: int = 5
    use_best_of_n_sampling: bool = True
    generation_prompt: str = """You are an expert AI system that explains technical concepts clearly and precisely.

Based on the provided document context, answer the following question **in your own words**, using **concise language**. Do **not** repeat the context or copy sentences verbatim.

Context:
\"\"\"
{{rag_context}}
\"\"\"

Question:
{{user_question}}

Instructions:
- Summarize or synthesize the answer using your understanding.
- Avoid unnecessary repetition or stating "Based on the document..."
- If architecture or process is discussed, explain the flow clearly.
- Use bullet points if needed for clarity.

Answer:"""

@dataclass
class AnswerRerankingConfig:
    """Answer reranking configuration."""
    enabled: bool = True
    method: str = "llm_vote"
    llm_prompt: str = """Given the question and multiple answers, pick the best answer that is complete, precise, and grounded in the context.

Question:
{{question}}

Answers:
1. {{a1}}
2. {{a2}}
3. {{a3}}

Best Answer (1/2/3)? Explain why."""

@dataclass
class PostprocessingConfig:
    """Postprocessing configuration."""
    remove_redundant_prefix: bool = True
    banned_phrases: list = None
    
    def __post_init__(self):
        if self.banned_phrases is None:
            self.banned_phrases = [
                "Based on the document", 
                "The document says", 
                "According to the context",
                "The text states",
                "As mentioned in the document"
            ]

@dataclass
class EnhancedRAGConfig:
    """Complete enhanced RAG configuration."""
    mode: RAGMode = RAGMode.ENHANCED
    retriever: RetrieverConfig = None
    preprocessing: PreprocessingConfig = None
    generation: GenerationConfig = None
    answer_reranking: AnswerRerankingConfig = None
    postprocessing: PostprocessingConfig = None
    
    # Performance settings
    enable_caching: bool = True
    cache_ttl: int = 3600
    max_concurrent_generations: int = 3
    
    # Quality thresholds
    min_retrieval_score: float = 0.3
    min_confidence_threshold: float = 0.5
    
    def __post_init__(self):
        if self.retriever is None:
            self.retriever = RetrieverConfig()
        if self.preprocessing is None:
            self.preprocessing = PreprocessingConfig()
        if self.generation is None:
            self.generation = GenerationConfig()
        if self.answer_reranking is None:
            self.answer_reranking = AnswerRerankingConfig()
        if self.postprocessing is None:
            self.postprocessing = PostprocessingConfig()
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return asdict(self)
    
    @classmethod
    def from_dict(cls, config_dict: Dict[str, Any]) -> 'EnhancedRAGConfig':
        """Create from dictionary."""
        # Handle nested dataclasses
        if 'retriever' in config_dict and isinstance(config_dict['retriever'], dict):
            config_dict['retriever'] = RetrieverConfig(**config_dict['retriever'])
        if 'preprocessing' in config_dict and isinstance(config_dict['preprocessing'], dict):
            config_dict['preprocessing'] = PreprocessingConfig(**config_dict['preprocessing'])
        if 'generation' in config_dict and isinstance(config_dict['generation'], dict):
            config_dict['generation'] = GenerationConfig(**config_dict['generation'])
        if 'answer_reranking' in config_dict and isinstance(config_dict['answer_reranking'], dict):
            config_dict['answer_reranking'] = AnswerRerankingConfig(**config_dict['answer_reranking'])
        if 'postprocessing' in config_dict and isinstance(config_dict['postprocessing'], dict):
            config_dict['postprocessing'] = PostprocessingConfig(**config_dict['postprocessing'])
        
        return cls(**config_dict)
    
    def save_to_file(self, file_path: Path):
        """Save configuration to JSON file."""
        with open(file_path, 'w') as f:
            json.dump(self.to_dict(), f, indent=2)
        logger.info(f"Configuration saved to {file_path}")
    
    @classmethod
    def load_from_file(cls, file_path: Path) -> 'EnhancedRAGConfig':
        """Load configuration from JSON file."""
        with open(file_path, 'r') as f:
            config_dict = json.load(f)
        logger.info(f"Configuration loaded from {file_path}")
        return cls.from_dict(config_dict)
    
    def get_mode_config(self, mode: RAGMode) -> 'EnhancedRAGConfig':
        """Get configuration optimized for specific mode."""
        # Create a deep copy using dict conversion
        config_dict = asdict(self)
        config = EnhancedRAGConfig.from_dict(config_dict)
        config.mode = mode
        
        if mode == RAGMode.ULTRA_FAST:
            # Optimize for speed
            config.generation.best_of_n = 3
            config.generation.max_tokens = 256
            config.retriever.top_k = 3
            config.retriever.reranking["enabled"] = False
            config.preprocessing.condensation_enabled = False
            config.answer_reranking.enabled = False
            
        elif mode == RAGMode.QUALITY_FOCUSED:
            # Optimize for quality
            config.generation.best_of_n = 7
            config.generation.max_tokens = 768
            config.retriever.top_k = 8
            config.retriever.reranking["rerank_top_k"] = 5
            config.preprocessing.target_sentences = 4
            config.min_confidence_threshold = 0.7
            
        elif mode == RAGMode.STANDARD:
            # Balanced settings (default)
            pass
            
        return config

# Pre-defined configurations
def get_default_config() -> EnhancedRAGConfig:
    """Get default enhanced RAG configuration."""
    return EnhancedRAGConfig()

def get_ultra_fast_config() -> EnhancedRAGConfig:
    """Get ultra-fast RAG configuration."""
    return get_default_config().get_mode_config(RAGMode.ULTRA_FAST)

def get_quality_focused_config() -> EnhancedRAGConfig:
    """Get quality-focused RAG configuration."""
    return get_default_config().get_mode_config(RAGMode.QUALITY_FOCUSED)

def create_config_from_json(json_str: str) -> EnhancedRAGConfig:
    """Create configuration from JSON string."""
    config_dict = json.loads(json_str)
    return EnhancedRAGConfig.from_dict(config_dict)

# Configuration validation
def validate_config(config: EnhancedRAGConfig) -> Dict[str, Any]:
    """Validate RAG configuration and return validation report."""
    issues = []
    warnings = []
    
    # Check generation settings
    if config.generation.best_of_n > 10:
        warnings.append("High best_of_n value may impact performance")
    
    if config.generation.max_tokens > 1024:
        warnings.append("High max_tokens may increase latency")
    
    # Check retrieval settings
    if config.retriever.top_k > 20:
        warnings.append("High top_k may introduce noise")
    
    # Check compatibility
    if config.generation.use_best_of_n_sampling and config.generation.best_of_n < 2:
        issues.append("best_of_n must be >= 2 when use_best_of_n_sampling is enabled")
    
    if config.preprocessing.condensation_enabled and config.preprocessing.max_chunk_length < 50:
        warnings.append("Very small max_chunk_length may lose important information")
    
    return {
        "valid": len(issues) == 0,
        "issues": issues,
        "warnings": warnings,
        "config_mode": config.mode.value
    }

# Export sample configuration as JSON
SAMPLE_CONFIG_JSON = """{
  "mode": "enhanced",
  "retriever": {
    "model": "BAAI/bge-small-en-v1.5",
    "top_k": 5,
    "reranking": {
      "enabled": true,
      "model": "cross-encoder/ms-marco-MiniLM-L-6-v2",
      "rerank_top_k": 3
    },
    "chunking": {
      "chunk_size": 250,
      "overlap": 30
    }
  },
  "preprocessing": {
    "condensation_enabled": true,
    "condense_prompt": "Summarize the following chunk into 2–3 sentences that only retain the most relevant details to the user question.\\n\\nChunk:\\n{{chunk}}\\n\\nQuestion:\\n{{query}}\\n\\nCondensed Chunk:",
    "max_chunk_length": 250,
    "target_sentences": 3
  },
  "generation": {
    "model": "phi-2",
    "max_tokens": 512,
    "temperature": 0.7,
    "top_p": 0.95,
    "best_of_n": 5,
    "use_best_of_n_sampling": true
  },
  "answer_reranking": {
    "enabled": true,
    "method": "llm_vote"
  },
  "postprocessing": {
    "remove_redundant_prefix": true,
    "banned_phrases": ["Based on the document", "The document says", "According to the context"]
  }
}"""

# Export main classes
__all__ = [
    "EnhancedRAGConfig",
    "RetrieverConfig",
    "PreprocessingConfig", 
    "GenerationConfig",
    "AnswerRerankingConfig",
    "PostprocessingConfig",
    "RAGMode",
    "get_default_config",
    "get_ultra_fast_config", 
    "get_quality_focused_config",
    "validate_config",
    "SAMPLE_CONFIG_JSON"
]