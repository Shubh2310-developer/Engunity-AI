"""
CS-Specific Contrastive Learning for Domain-Adaptive Embeddings

This module implements contrastive learning techniques specifically optimized for
Computer Science documents, aligning code snippets with natural language descriptions
and theoretical concepts with practical implementations.

File: backend/app/services/rag/cs_contrastive_learning.py
"""

import torch
import torch.nn as nn
import torch.nn.functional as F
import numpy as np
import faiss
import random
import re
import ast
from typing import List, Dict, Tuple, Optional, Union, Any
from dataclasses import dataclass
from collections import defaultdict
import logging
from sentence_transformers import SentenceTransformer, InputExample, losses
from sentence_transformers.evaluation import EmbeddingSimilarityEvaluator
from transformers import AutoTokenizer, AutoModel
import pandas as pd
from sklearn.metrics.pairwise import cosine_similarity
from pathlib import Path

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..', '..'))

try:
    from app.models.cs_embedding_config import (
        CSEmbeddingConfig, 
        CSVocabularyConfig,
        ContrastiveLossType,
        CodeEncodingStrategy
    )
except ImportError:
    # Fallback: create minimal config classes if not found
    from dataclasses import dataclass
    from enum import Enum
    
    class ContrastiveLossType(Enum):
        TRIPLET = "triplet"
        CONTRASTIVE = "contrastive"
        
    class CodeEncodingStrategy(Enum):
        RAW = "raw"
        AST = "ast"
        
    @dataclass
    class CSEmbeddingConfig:
        model_name: str = "sentence-transformers/all-MiniLM-L6-v2"
        max_seq_length: int = 512
        embedding_dim: int = 384
        
    @dataclass 
    class CSVocabularyConfig:
        include_code_tokens: bool = True
        include_math_symbols: bool = True

logger = logging.getLogger(__name__)


@dataclass
class ContrastivePair:
    """Represents a contrastive learning pair with metadata."""
    anchor: str
    positive: str
    negative: str
    anchor_type: str  # 'code', 'theory', 'description'
    positive_type: str
    negative_type: str
    similarity_score: float = 0.0
    difficulty: str = "medium"  # 'easy', 'medium', 'hard'


class CodeParser:
    """Utility class for parsing and analyzing code snippets."""
    
    def __init__(self):
        self.function_pattern = re.compile(r'def\s+(\w+)\s*\(', re.MULTILINE)
        self.class_pattern = re.compile(r'class\s+(\w+)\s*[\(:]', re.MULTILINE)
        self.import_pattern = re.compile(r'(?:from\s+\w+\s+)?import\s+([\w\s,]+)', re.MULTILINE)
    
    def extract_functions(self, code: str) -> List[str]:
        """Extract function names from code."""
        return self.function_pattern.findall(code)
    
    def extract_classes(self, code: str) -> List[str]:
        """Extract class names from code."""
        return self.class_pattern.findall(code)
    
    def extract_imports(self, code: str) -> List[str]:
        """Extract import statements from code."""
        imports = []
        for match in self.import_pattern.findall(code):
            imports.extend([imp.strip() for imp in match.split(',')])
        return imports
    
    def get_complexity_indicators(self, code: str) -> Dict[str, int]:
        """Analyze code complexity indicators."""
        return {
            'loops': len(re.findall(r'\b(?:for|while)\b', code)),
            'conditions': len(re.findall(r'\bif\b', code)),
            'functions': len(self.extract_functions(code)),
            'classes': len(self.extract_classes(code)),
            'lines': len(code.split('\n')),
            'nested_blocks': code.count('    ') // 4  # Rough indentation count
        }
    
    def extract_docstring(self, code: str) -> Optional[str]:
        """Extract docstring from function or class."""
        try:
            tree = ast.parse(code)
            if tree.body and isinstance(tree.body[0], (ast.FunctionDef, ast.ClassDef)):
                if (tree.body[0].body and 
                    isinstance(tree.body[0].body[0], ast.Expr) and
                    isinstance(tree.body[0].body[0].value, ast.Str)):
                    return tree.body[0].body[0].value.s
        except:
            pass
        return None


class HardNegativeMiner:
    """Mines hard negatives for contrastive learning using various strategies."""
    
    def __init__(self, cs_vocab: CSVocabularyConfig):
        self.cs_vocab = cs_vocab
        self.code_parser = CodeParser()
        self.faiss_index = None
        self.corpus_embeddings = None
        self.corpus_texts = None
        
    def build_faiss_index(self, texts: List[str], embeddings: np.ndarray):
        """Build FAISS index for efficient similarity search."""
        dimension = embeddings.shape[1]
        self.faiss_index = faiss.IndexFlatIP(dimension)  # Inner product for cosine sim
        
        # Normalize embeddings for cosine similarity
        faiss.normalize_L2(embeddings)
        self.faiss_index.add(embeddings.astype('float32'))
        
        self.corpus_embeddings = embeddings
        self.corpus_texts = texts
        logger.info(f"Built FAISS index with {len(texts)} documents")
    
    def mine_hard_negatives(
        self,
        anchor: str,
        positive: str,
        anchor_embedding: np.ndarray,
        top_k: int = 10,
        exclude_indices: Optional[List[int]] = None
    ) -> List[Tuple[str, float]]:
        """
        Mine hard negatives using semantic similarity.
        
        Args:
            anchor: Anchor text
            positive: Positive text
            anchor_embedding: Pre-computed anchor embedding
            top_k: Number of candidates to retrieve
            exclude_indices: Indices to exclude from search
            
        Returns:
            List of (negative_text, similarity_score) tuples
        """
        if self.faiss_index is None:
            raise ValueError("FAISS index not built. Call build_faiss_index first.")
        
        # Search for similar items
        anchor_embedding = anchor_embedding.reshape(1, -1).astype('float32')
        faiss.normalize_L2(anchor_embedding)
        
        scores, indices = self.faiss_index.search(anchor_embedding, top_k * 2)
        
        hard_negatives = []
        exclude_set = set(exclude_indices or [])
        
        for idx, score in zip(indices[0], scores[0]):
            if idx in exclude_set:
                continue
                
            candidate = self.corpus_texts[idx]
            
            # Skip if too similar to positive (potential duplicate)
            if self._text_overlap(candidate, positive) > 0.7:
                continue
                
            # Skip if identical to anchor
            if self._text_overlap(candidate, anchor) > 0.9:
                continue
            
            hard_negatives.append((candidate, float(score)))
            
            if len(hard_negatives) >= top_k:
                break
                
        return hard_negatives
    
    def mine_topic_negatives(
        self,
        anchor: str,
        anchor_type: str,
        corpus: List[Dict[str, Any]]
    ) -> List[str]:
        """Mine negatives from same topic but different semantic meaning."""
        negatives = []
        
        # Extract keywords from anchor
        anchor_keywords = self._extract_cs_keywords(anchor)
        
        for item in corpus:
            text = item.get('text', '')
            item_type = item.get('type', 'unknown')
            
            # Skip same type comparisons for diversity
            if item_type == anchor_type:
                continue
                
            # Find items with keyword overlap but different context
            item_keywords = self._extract_cs_keywords(text)
            overlap = len(anchor_keywords & item_keywords)
            
            if 1 <= overlap <= 3:  # Some overlap but not too much
                negatives.append(text)
        
        return random.sample(negatives, min(len(negatives), 5))
    
    def mine_function_name_negatives(
        self,
        anchor_code: str,
        code_corpus: List[str]
    ) -> List[str]:
        """Mine negatives with same function names but different implementations."""
        anchor_functions = set(self.code_parser.extract_functions(anchor_code))
        
        if not anchor_functions:
            return []
        
        negatives = []
        for code in code_corpus:
            code_functions = set(self.code_parser.extract_functions(code))
            
            # Same function name but different implementation
            if anchor_functions & code_functions and code != anchor_code:
                # Verify it's actually different logic
                if self._code_similarity(anchor_code, code) < 0.8:
                    negatives.append(code)
        
        return random.sample(negatives, min(len(negatives), 3))
    
    def mine_cross_domain_negatives(
        self,
        anchor: str,
        anchor_domain: str,
        corpus_by_domain: Dict[str, List[str]]
    ) -> List[str]:
        """Mine negatives from different CS domains."""
        negatives = []
        other_domains = [d for d in corpus_by_domain.keys() if d != anchor_domain]
        
        for domain in other_domains:
            domain_texts = corpus_by_domain[domain]
            if domain_texts:
                # Sample from different domains
                sample_size = min(2, len(domain_texts))
                negatives.extend(random.sample(domain_texts, sample_size))
        
        return negatives
    
    def _extract_cs_keywords(self, text: str) -> set:
        """Extract CS keywords from text."""
        text_lower = text.lower()
        keywords = set()
        
        # Check against all vocabulary categories
        all_keywords = (
            self.cs_vocab.programming_keywords +
            self.cs_vocab.systems_keywords +
            self.cs_vocab.ai_ml_keywords +
            self.cs_vocab.theory_keywords +
            self.cs_vocab.code_patterns
        )
        
        for keyword in all_keywords:
            if keyword.lower() in text_lower:
                keywords.add(keyword.lower())
        
        return keywords
    
    def _text_overlap(self, text1: str, text2: str) -> float:
        """Calculate text overlap ratio."""
        words1 = set(text1.lower().split())
        words2 = set(text2.lower().split())
        
        if not words1 or not words2:
            return 0.0
            
        intersection = words1 & words2
        union = words1 | words2
        
        return len(intersection) / len(union)
    
    def _code_similarity(self, code1: str, code2: str) -> float:
        """Calculate structural similarity between code snippets."""
        # Remove comments and normalize whitespace
        clean_code1 = re.sub(r'#.*', '', code1).strip()
        clean_code2 = re.sub(r'#.*', '', code2).strip()
        
        # Compare by lines (simple approach)
        lines1 = [line.strip() for line in clean_code1.split('\n') if line.strip()]
        lines2 = [line.strip() for line in clean_code2.split('\n') if line.strip()]
        
        if not lines1 or not lines2:
            return 0.0
        
        common_lines = len(set(lines1) & set(lines2))
        total_lines = len(set(lines1) | set(lines2))
        
        return common_lines / total_lines if total_lines > 0 else 0.0


class CSContrastiveLearning:
    """Main contrastive learning class for CS domain embeddings."""
    
    def __init__(
        self,
        config: CSEmbeddingConfig,
        cs_vocab: CSVocabularyConfig,
        model_name: str = "BAAI/bge-small-en-v1.5"
    ):
        self.config = config
        self.cs_vocab = cs_vocab
        self.model_name = model_name
        
        # Initialize model
        self.model = SentenceTransformer(model_name)
        self.tokenizer = AutoTokenizer.from_pretrained(model_name)
        
        # Initialize miners and parsers
        self.hard_negative_miner = HardNegativeMiner(cs_vocab)
        self.code_parser = CodeParser()
        
        # Training data storage
        self.training_pairs: List[ContrastivePair] = []
        self.corpus_by_domain: Dict[str, List[str]] = defaultdict(list)
        
        logger.info(f"Initialized CS contrastive learning with {model_name}")
    
    def prepare_contrastive_pairs(
        self,
        cs_dataset: List[Dict[str, Any]],
        user_documents: List[Dict[str, Any]] = None,
        synthetic_pairs: List[Dict[str, Any]] = None
    ) -> List[ContrastivePair]:
        """
        Prepare contrastive learning pairs from multiple data sources.
        
        Args:
            cs_dataset: CS Q&A dataset with questions, answers, code
            user_documents: User-uploaded documents with extracted text
            synthetic_pairs: Synthetically generated pairs
            
        Returns:
            List of ContrastivePair objects ready for training
        """
        all_pairs = []
        
        # Process CS dataset
        if cs_dataset:
            cs_pairs = self._create_cs_pairs(cs_dataset)
            all_pairs.extend(cs_pairs)
            logger.info(f"Created {len(cs_pairs)} pairs from CS dataset")
        
        # Process user documents
        if user_documents:
            doc_pairs = self._create_document_pairs(user_documents)
            all_pairs.extend(doc_pairs)
            logger.info(f"Created {len(doc_pairs)} pairs from user documents")
        
        # Add synthetic pairs
        if synthetic_pairs:
            synth_pairs = self._create_synthetic_pairs(synthetic_pairs)
            all_pairs.extend(synth_pairs)
            logger.info(f"Created {len(synth_pairs)} synthetic pairs")
        
        # Mine hard negatives for all pairs
        self._mine_hard_negatives_for_pairs(all_pairs)
        
        self.training_pairs = all_pairs
        logger.info(f"Total training pairs: {len(all_pairs)}")
        
        return all_pairs
    
    def _create_cs_pairs(self, cs_dataset: List[Dict[str, Any]]) -> List[ContrastivePair]:
        """Create contrastive pairs from CS dataset."""
        pairs = []
        
        for item in cs_dataset:
            question = item.get('question', '')
            answer = item.get('answer', '')
            code = item.get('code', '')
            topic = item.get('topic', 'general')
            
            # Store by domain for negative mining
            self.corpus_by_domain[topic].extend([question, answer])
            if code:
                self.corpus_by_domain[f"{topic}_code"].append(code)
            
            # Create question-answer pairs
            if question and answer:
                pair = ContrastivePair(
                    anchor=question,
                    positive=answer,
                    negative="",  # Will be filled by hard negative mining
                    anchor_type="question",
                    positive_type="answer",
                    negative_type="answer"
                )
                pairs.append(pair)
            
            # Create theory-code pairs
            if answer and code:
                # Theory to code
                theory_code_pair = ContrastivePair(
                    anchor=answer,
                    positive=code,
                    negative="",
                    anchor_type="theory",
                    positive_type="code",
                    negative_type="code"
                )
                pairs.append(theory_code_pair)
                
                # Code to theory (reverse)
                code_theory_pair = ContrastivePair(
                    anchor=code,
                    positive=answer,
                    negative="",
                    anchor_type="code",
                    positive_type="theory",
                    negative_type="theory"
                )
                pairs.append(code_theory_pair)
            
            # Create code-docstring pairs
            if code:
                docstring = self.code_parser.extract_docstring(code)
                if docstring:
                    doc_pair = ContrastivePair(
                        anchor=code,
                        positive=docstring,
                        negative="",
                        anchor_type="code",
                        positive_type="docstring",
                        negative_type="docstring"
                    )
                    pairs.append(doc_pair)
        
        return pairs
    
    def _create_document_pairs(self, documents: List[Dict[str, Any]]) -> List[ContrastivePair]:
        """Create pairs from user documents."""
        pairs = []
        
        for doc in documents:
            text = doc.get('text', '')
            doc_type = doc.get('type', 'document')
            chunks = doc.get('chunks', [])
            
            # Create chunk-to-chunk pairs within same document
            for i, chunk1 in enumerate(chunks):
                for j, chunk2 in enumerate(chunks[i+1:], i+1):
                    if self._are_related_chunks(chunk1, chunk2):
                        pair = ContrastivePair(
                            anchor=chunk1,
                            positive=chunk2,
                            negative="",
                            anchor_type="document_chunk",
                            positive_type="document_chunk",
                            negative_type="document_chunk"
                        )
                        pairs.append(pair)
        
        return pairs
    
    def _create_synthetic_pairs(self, synthetic_data: List[Dict[str, Any]]) -> List[ContrastivePair]:
        """Create pairs from synthetic data."""
        pairs = []
        
        for item in synthetic_data:
            query = item.get('query', '')
            response = item.get('response', '')
            pair_type = item.get('type', 'synthetic')
            
            if query and response:
                pair = ContrastivePair(
                    anchor=query,
                    positive=response,
                    negative="",
                    anchor_type="synthetic_query",
                    positive_type="synthetic_response",
                    negative_type="synthetic_response"
                )
                pairs.append(pair)
        
        return pairs
    
    def _mine_hard_negatives_for_pairs(self, pairs: List[ContrastivePair]):
        """Mine hard negatives for all contrastive pairs."""
        # Collect all texts for FAISS indexing
        all_texts = []
        text_to_pair_idx = {}
        
        for i, pair in enumerate(pairs):
            all_texts.extend([pair.anchor, pair.positive])
            text_to_pair_idx[pair.anchor] = i
            text_to_pair_idx[pair.positive] = i
        
        # Add corpus texts
        for domain_texts in self.corpus_by_domain.values():
            all_texts.extend(domain_texts)
        
        # Remove duplicates while preserving order
        unique_texts = list(dict.fromkeys(all_texts))
        
        # Generate embeddings for FAISS index
        logger.info("Generating embeddings for hard negative mining...")
        embeddings = self.model.encode(unique_texts, show_progress_bar=True)
        
        # Build FAISS index
        self.hard_negative_miner.build_faiss_index(unique_texts, embeddings)
        
        # Mine negatives for each pair
        logger.info("Mining hard negatives...")
        for i, pair in enumerate(pairs):
            if i % 100 == 0:
                logger.info(f"Processing pair {i}/{len(pairs)}")
            
            # Get anchor embedding
            anchor_idx = unique_texts.index(pair.anchor)
            anchor_embedding = embeddings[anchor_idx:anchor_idx+1]
            
            # Find positive index to exclude
            positive_idx = unique_texts.index(pair.positive)
            
            # Mine hard negatives
            hard_negatives = self.hard_negative_miner.mine_hard_negatives(
                anchor=pair.anchor,
                positive=pair.positive,
                anchor_embedding=anchor_embedding,
                top_k=5,
                exclude_indices=[anchor_idx, positive_idx]
            )
            
            if hard_negatives:
                # Select the hardest negative (highest similarity but still negative)
                pair.negative = hard_negatives[0][0]
                pair.similarity_score = hard_negatives[0][1]
                
                # Classify difficulty
                if pair.similarity_score > 0.8:
                    pair.difficulty = "hard"
                elif pair.similarity_score > 0.6:
                    pair.difficulty = "medium"
                else:
                    pair.difficulty = "easy"
            else:
                # Fallback to random negative from different domain
                other_domains = [d for d in self.corpus_by_domain.keys() 
                               if d != self._get_domain_from_type(pair.anchor_type)]
                if other_domains:
                    domain = random.choice(other_domains)
                    domain_texts = self.corpus_by_domain[domain]
                    if domain_texts:
                        pair.negative = random.choice(domain_texts)
                        pair.difficulty = "easy"
    
    def create_training_examples(self) -> List[InputExample]:
        """Convert contrastive pairs to SentenceTransformer training examples."""
        examples = []
        
        for pair in self.training_pairs:
            if not pair.negative:
                continue
            
            # Create triplet example (anchor, positive, negative)
            example = InputExample(
                texts=[pair.anchor, pair.positive, pair.negative],
                label=1.0  # Positive similarity for anchor-positive pair
            )
            examples.append(example)
        
        logger.info(f"Created {len(examples)} training examples")
        return examples
    
    def get_contrastive_loss(self) -> nn.Module:
        """Get the appropriate contrastive loss function."""
        if self.config.loss_type == ContrastiveLossType.SIMCSE:
            return losses.MultipleNegativesRankingLoss(self.model)
        elif self.config.loss_type == ContrastiveLossType.TRIPLET:
            return losses.TripletLoss(self.model, triplet_margin=self.config.margin)
        elif self.config.loss_type == ContrastiveLossType.COSINE:
            return losses.CosineSimilarityLoss(self.model)
        elif self.config.loss_type == ContrastiveLossType.INFONCE:
            return losses.MultipleNegativesRankingLoss(
                self.model, 
                scale=20.0, 
                similarity_fct=losses.SiameseDistanceMetric.COSINE_DISTANCE
            )
        else:
            raise ValueError(f"Unknown loss type: {self.config.loss_type}")
    
    def train_model(
        self,
        training_examples: List[InputExample],
        evaluation_examples: Optional[List[InputExample]] = None,
        output_path: str = "models/cs_embeddings"
    ) -> SentenceTransformer:
        """
        Train the contrastive model.
        
        Args:
            training_examples: Training examples
            evaluation_examples: Optional evaluation examples
            output_path: Path to save the trained model
            
        Returns:
            Trained SentenceTransformer model
        """
        # Create data loader
        train_dataloader = torch.utils.data.DataLoader(
            training_examples,
            shuffle=True,
            batch_size=self.config.batch_size
        )
        
        # Get loss function
        train_loss = self.get_contrastive_loss()
        
        # Setup evaluator if evaluation examples provided
        evaluator = None
        if evaluation_examples:
            evaluator = EmbeddingSimilarityEvaluator.from_input_examples(
                evaluation_examples,
                name="cs_eval"
            )
        
        # Train the model
        logger.info("Starting contrastive training...")
        self.model.fit(
            train_objectives=[(train_dataloader, train_loss)],
            evaluator=evaluator,
            epochs=self.config.epochs,
            evaluation_steps=self.config.eval_steps,
            warmup_steps=self.config.warmup_steps,
            output_path=output_path,
            save_best_model=True
        )
        
        logger.info(f"Training completed. Model saved to {output_path}")
        return self.model
    
    def _are_related_chunks(self, chunk1: str, chunk2: str) -> bool:
        """Determine if two chunks are semantically related."""
        # Simple heuristic: check for keyword overlap
        words1 = set(chunk1.lower().split())
        words2 = set(chunk2.lower().split())
        
        overlap = len(words1 & words2)
        min_length = min(len(words1), len(words2))
        
        # Require some overlap but not too much (avoid near-duplicates)
        return 3 <= overlap <= min_length * 0.5
    
    def _get_domain_from_type(self, content_type: str) -> str:
        """Map content type to domain for negative mining."""
        type_to_domain = {
            "code": "programming",
            "theory": "computer_science",
            "question": "general",
            "answer": "general",
            "docstring": "documentation",
            "document_chunk": "documents"
        }
        return type_to_domain.get(content_type, "general")
    
    def evaluate_model(
        self,
        test_pairs: List[ContrastivePair],
        similarity_threshold: float = 0.5
    ) -> Dict[str, float]:
        """
        Evaluate the trained model on test pairs.
        
        Args:
            test_pairs: Test contrastive pairs
            similarity_threshold: Threshold for binary classification
            
        Returns:
            Dictionary of evaluation metrics
        """
        anchors = [pair.anchor for pair in test_pairs]
        positives = [pair.positive for pair in test_pairs]
        negatives = [pair.negative for pair in test_pairs if pair.negative]
        
        # Get embeddings
        anchor_embeddings = self.model.encode(anchors)
        positive_embeddings = self.model.encode(positives)
        negative_embeddings = self.model.encode(negatives[:len(anchors)])
        
        # Calculate similarities
        pos_similarities = np.array([
            cosine_similarity([anchor_embeddings[i]], [positive_embeddings[i]])[0][0]
            for i in range(len(anchors))
        ])
        
        neg_similarities = np.array([
            cosine_similarity([anchor_embeddings[i]], [negative_embeddings[i]])[0][0]
            for i in range(min(len(anchors), len(negative_embeddings)))
        ])
        
        # Calculate metrics
        accuracy = np.mean(pos_similarities > neg_similarities[:len(pos_similarities)])
        avg_pos_sim = np.mean(pos_similarities)
        avg_neg_sim = np.mean(neg_similarities)
        
        metrics = {
            "accuracy": accuracy,
            "avg_positive_similarity": avg_pos_sim,
            "avg_negative_similarity": avg_neg_sim,
            "similarity_gap": avg_pos_sim - avg_neg_sim,
            "num_test_pairs": len(test_pairs)
        }
        
        logger.info(f"Evaluation metrics: {metrics}")
        return metrics


def create_cs_contrastive_trainer(
    config_path: Optional[str] = None,
    custom_config: Optional[Dict] = None
) -> CSContrastiveLearning:
    """
    Factory function to create a CS contrastive learning trainer.
    
    Args:
        config_path: Path to configuration file
        custom_config: Custom configuration overrides
        
    Returns:
        Configured CSContrastiveLearning instance
    """
    from backend.app.models.cs_embedding_config import get_cs_config
    
    # Load configuration
    full_config = get_cs_config(custom_config)
    
    # Create trainer
    trainer = CSContrastiveLearning(
        config=full_config.embedding_config,
        cs_vocab=full_config.vocabulary_config,
        model_name=full_config.embedding_config.base_model
    )
    
    return trainer


# Export main classes and functions
__all__ = [
    "CSContrastiveLearning",
    "ContrastivePair", 
    "HardNegativeMiner",
    "CodeParser",
    "create_cs_contrastive_trainer"
]