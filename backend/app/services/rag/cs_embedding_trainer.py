#!/usr/bin/env python3
"""
CS Domain Embedding Trainer for Engunity AI Document Analysis
============================================================

This script fine-tunes bge-small-en-v1.5 specifically for document analysis
in computer science domains, improving technical term understanding and 
code-text semantic alignment for the RAG system.

Focus Areas:
- CS technical terminology comprehension
- Code snippet semantic understanding
- Document Q&A optimization
- Cross-domain knowledge alignment

Usage:
    python backend/app/services/rag/cs_embedding_trainer.py

Author: Engunity AI Team
Date: 2025-07-26
"""

import os
import sys
import torch
import numpy as np
import pandas as pd
import json
import logging
from pathlib import Path
from typing import Dict, List
from dataclasses import dataclass
import warnings
warnings.filterwarnings('ignore')

# Core ML libraries
from sentence_transformers import SentenceTransformer, InputExample, losses
from sentence_transformers.evaluation import EmbeddingSimilarityEvaluator
from torch.utils.data import Dataset, DataLoader
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.model_selection import train_test_split

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('backend/app/services/rag/embedding_training.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

@dataclass
class CSEmbeddingConfig:
    """Configuration for CS domain embedding training"""
    
    # Model configuration
    base_model_name: str = "BAAI/bge-small-en-v1.5"
    max_seq_length: int = 512
    pooling_mode: str = "mean"  # mean, cls, max
    
    # Training configuration
    batch_size: int = 16
    learning_rate: float = 2e-5
    num_epochs: int = 3
    warmup_steps: int = 100
    gradient_accumulation_steps: int = 2
    max_grad_norm: float = 1.0
    weight_decay: float = 0.01
    
    # Data configuration
    train_split: float = 0.8
    val_split: float = 0.1
    test_split: float = 0.1
    min_sentence_length: int = 10
    max_sentence_length: int = 400
    
    # CS-specific configuration
    code_weight: float = 1.2  # Higher weight for code-related pairs
    technical_term_weight: float = 1.1  # Higher weight for technical terms
    cross_domain_weight: float = 0.9  # Lower weight for cross-domain pairs
    
    # Hardware configuration
    device: str = "cuda" if torch.cuda.is_available() else "cpu"
    fp16: bool = torch.cuda.is_available()
    dataloader_num_workers: int = 4
    
    # Output configuration
    output_dir: str = "backend/models/cs_embeddings"
    save_steps: int = 500
    eval_steps: int = 500
    logging_steps: int = 100

class CSDocumentDataset(Dataset):
    """Custom dataset for CS document analysis training"""
    
    def __init__(self, examples: List[InputExample], tokenizer, max_length: int = 512):
        self.examples = examples
        self.tokenizer = tokenizer
        self.max_length = max_length
    
    def __len__(self):
        return len(self.examples)
    
    def __getitem__(self, idx):
        example = self.examples[idx]
        
        # Tokenize texts
        anchor_encoding = self.tokenizer(
            example.texts[0],
            truncation=True,
            padding='max_length',
            max_length=self.max_length,
            return_tensors='pt'
        )
        
        positive_encoding = self.tokenizer(
            example.texts[1],
            truncation=True,
            padding='max_length',
            max_length=self.max_length,
            return_tensors='pt'
        )
        
        return {
            'anchor_input_ids': anchor_encoding['input_ids'].squeeze(),
            'anchor_attention_mask': anchor_encoding['attention_mask'].squeeze(),
            'positive_input_ids': positive_encoding['input_ids'].squeeze(),
            'positive_attention_mask': positive_encoding['attention_mask'].squeeze(),
            'label': torch.tensor(example.label, dtype=torch.float)
        }

class CSEmbeddingTrainer:
    """CS Domain Embedding Trainer for Document Analysis"""
    
    def __init__(self, config: CSEmbeddingConfig = None):
        """Initialize the CS embedding trainer"""
        self.config = config or CSEmbeddingConfig()
        self.device = torch.device(self.config.device)
        
        # Create output directory
        Path(self.config.output_dir).mkdir(parents=True, exist_ok=True)
        
        # Initialize model and tokenizer
        self.model = None
        self.tokenizer = None
        self.sentence_transformer = None
        
        # Training data
        self.train_examples = []
        self.val_examples = []
        self.test_examples = []
        
        # Training stats
        self.training_stats = {
            'total_examples': 0,
            'cs_examples': 0,
            'code_examples': 0,
            'document_examples': 0,
            'best_eval_score': 0.0,
            'training_history': []
        }
        
        logger.info(f"Initialized CS Embedding Trainer")
        logger.info(f"Device: {self.device}")
        logger.info(f"Model: {self.config.base_model_name}")
    
    def download_and_load_model(self) -> bool:
        """Download and load the base embedding model"""
        try:
            logger.info(f"Downloading and loading model: {self.config.base_model_name}")
            
            # Download using SentenceTransformers (handles BGE models well)
            self.sentence_transformer = SentenceTransformer(
                self.config.base_model_name,
                device=self.device
            )
            
            # Set max sequence length
            self.sentence_transformer.max_seq_length = self.config.max_seq_length
            
            # Get tokenizer for manual processing
            self.tokenizer = self.sentence_transformer.tokenizer
            
            logger.info("Model downloaded and loaded successfully")
            logger.info(f"Model max sequence length: {self.sentence_transformer.max_seq_length}")
            logger.info(f"Tokenizer vocab size: {len(self.tokenizer)}")
            
            return True
            
        except Exception as e:
            logger.error(f"Error downloading/loading model: {str(e)}")
            return False
    
    def load_training_data(self, training_data_dir: str = "backend/data/training/processed/training_ready") -> bool:
        """Load and prepare training data for embedding training"""
        try:
            logger.info("Loading training data for embedding training...")
            
            training_dir = Path(training_data_dir)
            if not training_dir.exists():
                logger.error(f"Training data directory not found: {training_dir}")
                return False
            
            all_examples = []
            
            # Focus on document-heavy modules for document analysis
            target_modules = ['document_qa', 'research_tools', 'code_assistant']
            
            for module in target_modules:
                module_dir = training_dir / module
                if not module_dir.exists():
                    logger.warning(f"Module directory not found: {module_dir}")
                    continue
                
                # Load training data
                train_file = module_dir / "train.jsonl"
                if train_file.exists():
                    module_examples = self._process_module_data(train_file, module)
                    all_examples.extend(module_examples)
                    logger.info(f"Loaded {len(module_examples)} examples from {module}")
            
            if not all_examples:
                logger.error("No training data found")
                return False
            
            # Split data
            train_examples, temp_examples = train_test_split(
                all_examples, 
                test_size=1-self.config.train_split,
                random_state=42
            )
            
            val_size = self.config.val_split / (self.config.val_split + self.config.test_split)
            val_examples, test_examples = train_test_split(
                temp_examples,
                test_size=1-val_size,
                random_state=42
            )
            
            self.train_examples = train_examples
            self.val_examples = val_examples
            self.test_examples = test_examples
            
            # Update stats
            self.training_stats['total_examples'] = len(all_examples)
            self.training_stats['cs_examples'] = sum(1 for ex in all_examples if 'cs_' in ex.guid)
            self.training_stats['code_examples'] = sum(1 for ex in all_examples if 'code_' in ex.guid)
            self.training_stats['document_examples'] = sum(1 for ex in all_examples if 'doc_' in ex.guid)
            
            logger.info(f"Training data loaded successfully:")
            logger.info(f"  Train: {len(self.train_examples)} examples")
            logger.info(f"  Validation: {len(self.val_examples)} examples")
            logger.info(f"  Test: {len(self.test_examples)} examples")
            logger.info(f"  CS examples: {self.training_stats['cs_examples']}")
            logger.info(f"  Code examples: {self.training_stats['code_examples']}")
            
            return True
            
        except Exception as e:
            logger.error(f"Error loading training data: {str(e)}")
            return False
    
    def _process_module_data(self, data_file: Path, module: str) -> List[InputExample]:
        """Process module-specific data into training examples"""
        examples = []
        
        try:
            with open(data_file, 'r', encoding='utf-8') as f:
                for line_idx, line in enumerate(f):
                    if not line.strip():
                        continue
                    
                    record = json.loads(line.strip())
                    module_examples = self._create_training_examples(record, module, line_idx)
                    examples.extend(module_examples)
            
        except Exception as e:
            logger.warning(f"Error processing {data_file}: {str(e)}")
        
        return examples
    
    def _create_training_examples(self, record: Dict, module: str, idx: int) -> List[InputExample]:
        """Create training examples from a single record"""
        examples = []
        
        question = record.get('question', '').strip()
        answer = record.get('answer', '').strip()
        
        if not question or not answer:
            return examples
        
        # Filter by length
        if (len(question.split()) < self.config.min_sentence_length or 
            len(question.split()) > self.config.max_sentence_length or
            len(answer.split()) < self.config.min_sentence_length or
            len(answer.split()) > self.config.max_sentence_length):
            return examples
        
        # Create positive pair (question-answer)
        positive_example = InputExample(
            guid=f"{module}_qa_{idx}",
            texts=[question, answer],
            label=1.0
        )
        examples.append(positive_example)
        
        # Create additional examples for code-related content
        if record.get('has_code', False):
            code_snippets = record.get('code_snippets', [])
            for code_idx, snippet in enumerate(code_snippets[:2]):  # Limit to 2 snippets
                code_content = snippet.get('content', '').strip()
                if code_content and len(code_content.split()) >= 5:
                    # Question-code pair
                    code_example = InputExample(
                        guid=f"{module}_code_{idx}_{code_idx}",
                        texts=[question, code_content],
                        label=0.8  # Slightly lower similarity than Q-A
                    )
                    examples.append(code_example)
                    
                    # Answer-code pair
                    if len(answer.split()) < 200:  # Don't pair with very long answers
                        answer_code_example = InputExample(
                            guid=f"{module}_answer_code_{idx}_{code_idx}",
                            texts=[answer, code_content],
                            label=0.7
                        )
                        examples.append(answer_code_example)
        
        # Create technical term examples
        technical_terms = record.get('technical_terms', {})
        if technical_terms:
            # Extract key technical terms
            all_terms = []
            for category, terms in technical_terms.items():
                all_terms.extend(terms[:3])  # Limit terms per category
            
            if all_terms:
                terms_text = " ".join(all_terms)
                technical_example = InputExample(
                    guid=f"{module}_tech_{idx}",
                    texts=[question, terms_text],
                    label=0.6
                )
                examples.append(technical_example)
        
        return examples
    
    def create_hard_negatives(self, examples: List[InputExample], 
                            negative_ratio: float = 0.3) -> List[InputExample]:
        """Create hard negative examples for contrastive learning"""
        logger.info("Creating hard negative examples...")
        
        # Group examples by module/category
        grouped_examples = {}
        for ex in examples:
            module = ex.guid.split('_')[0]
            if module not in grouped_examples:
                grouped_examples[module] = []
            grouped_examples[module].append(ex)
        
        negative_examples = []
        num_negatives = int(len(examples) * negative_ratio)
        
        modules = list(grouped_examples.keys())
        
        for _ in range(num_negatives):
            # Select two different modules
            if len(modules) >= 2:
                module1, module2 = np.random.choice(modules, 2, replace=False)
                
                ex1 = np.random.choice(grouped_examples[module1])
                ex2 = np.random.choice(grouped_examples[module2])
                
                # Create negative pair
                negative_example = InputExample(
                    guid=f"neg_{module1}_{module2}_{len(negative_examples)}",
                    texts=[ex1.texts[0], ex2.texts[1]],  # Question from ex1, answer from ex2
                    label=0.0
                )
                negative_examples.append(negative_example)
        
        logger.info(f"Created {len(negative_examples)} hard negative examples")
        return negative_examples
    
    def setup_training(self) -> bool:
        """Setup training configuration and data loaders"""
        try:
            logger.info("Setting up training configuration...")
            
            # Add hard negatives to training data
            hard_negatives = self.create_hard_negatives(self.train_examples)
            self.train_examples.extend(hard_negatives)
            
            # Create evaluation dataset
            evaluator = EmbeddingSimilarityEvaluator.from_input_examples(
                self.val_examples,
                name='cs_validation'
            )
            
            # Setup training arguments for SentenceTransformers
            train_dataloader = DataLoader(
                self.train_examples,
                shuffle=True,
                batch_size=self.config.batch_size
            )
            
            # Configure loss function with CS-specific weighting
            train_loss = losses.CosineSimilarityLoss(self.sentence_transformer)
            
            # Store training components
            self.train_dataloader = train_dataloader
            self.evaluator = evaluator
            self.train_loss = train_loss
            
            logger.info("Training setup completed successfully")
            logger.info(f"Training examples: {len(self.train_examples)}")
            logger.info(f"Validation examples: {len(self.val_examples)}")
            
            return True
            
        except Exception as e:
            logger.error(f"Error setting up training: {str(e)}")
            return False
    
    def train_model(self) -> bool:
        """Train the CS domain embedding model"""
        try:
            logger.info("Starting CS domain embedding training...")
            
            # Calculate training steps
            total_steps = len(self.train_dataloader) * self.config.num_epochs
            warmup_steps = min(self.config.warmup_steps, total_steps // 10)
            
            logger.info(f"Training configuration:")
            logger.info(f"  Total steps: {total_steps}")
            logger.info(f"  Warmup steps: {warmup_steps}")
            logger.info(f"  Learning rate: {self.config.learning_rate}")
            logger.info(f"  Batch size: {self.config.batch_size}")
            logger.info(f"  Epochs: {self.config.num_epochs}")
            
            # Train the model
            self.sentence_transformer.fit(
                train_objectives=[(self.train_dataloader, self.train_loss)],
                evaluator=self.evaluator,
                epochs=self.config.num_epochs,
                evaluation_steps=self.config.eval_steps,
                warmup_steps=warmup_steps,
                output_path=self.config.output_dir,
                save_best_model=True,
                optimizer_params={'lr': self.config.learning_rate},
                scheduler='WarmupLinear',
                weight_decay=self.config.weight_decay,
                use_amp=self.config.fp16
            )
            
            logger.info("Training completed successfully")
            return True
            
        except Exception as e:
            logger.error(f"Error during training: {str(e)}")
            return False
    
    def evaluate_model(self) -> Dict[str, float]:
        """Evaluate the trained model on test set"""
        try:
            logger.info("Evaluating trained model...")
            
            # Load the best trained model
            model_path = self.config.output_dir
            trained_model = SentenceTransformer(model_path)
            
            # Evaluate on test set
            test_evaluator = EmbeddingSimilarityEvaluator.from_input_examples(
                self.test_examples,
                name='cs_test'
            )
            
            test_score = test_evaluator(trained_model, self.config.output_dir)
            
            # Additional CS-specific evaluations
            cs_scores = self._evaluate_cs_specific_tasks(trained_model)
            
            evaluation_results = {
                'test_cosine_similarity': test_score,
                **cs_scores
            }
            
            # Save evaluation results
            eval_file = Path(self.config.output_dir) / "evaluation_results.json"
            with open(eval_file, 'w') as f:
                json.dump(evaluation_results, f, indent=2)
            
            logger.info("Evaluation completed:")
            for metric, score in evaluation_results.items():
                logger.info(f"  {metric}: {score:.4f}")
            
            return evaluation_results
            
        except Exception as e:
            logger.error(f"Error during evaluation: {str(e)}")
            return {}
    
    def _evaluate_cs_specific_tasks(self, model: SentenceTransformer) -> Dict[str, float]:
        """Evaluate CS-specific embedding quality"""
        scores = {}
        
        try:
            # 1. Code-text semantic alignment
            code_examples = [ex for ex in self.test_examples if 'code' in ex.guid]
            if code_examples:
                code_similarities = []
                for ex in code_examples[:50]:  # Sample for efficiency
                    embeddings = model.encode(ex.texts)
                    similarity = cosine_similarity([embeddings[0]], [embeddings[1]])[0][0]
                    code_similarities.append(similarity)
                
                scores['code_text_alignment'] = np.mean(code_similarities)
            
            # 2. Technical term understanding
            tech_examples = [ex for ex in self.test_examples if 'tech' in ex.guid]
            if tech_examples:
                tech_similarities = []
                for ex in tech_examples[:50]:
                    embeddings = model.encode(ex.texts)
                    similarity = cosine_similarity([embeddings[0]], [embeddings[1]])[0][0]
                    tech_similarities.append(similarity)
                
                scores['technical_term_understanding'] = np.mean(tech_similarities)
            
            # 3. Cross-domain consistency
            qa_examples = [ex for ex in self.test_examples if 'qa' in ex.guid]
            if qa_examples:
                qa_similarities = []
                for ex in qa_examples[:100]:
                    embeddings = model.encode(ex.texts)
                    similarity = cosine_similarity([embeddings[0]], [embeddings[1]])[0][0]
                    qa_similarities.append(similarity)
                
                scores['qa_consistency'] = np.mean(qa_similarities)
            
        except Exception as e:
            logger.warning(f"Error in CS-specific evaluation: {str(e)}")
        
        return scores
    
    def save_model_for_production(self) -> bool:
        """Save the model in production-ready format"""
        try:
            logger.info("Saving model for production use...")
            
            # Load the best trained model
            trained_model = SentenceTransformer(self.config.output_dir)
            
            # Save in multiple formats
            production_dir = Path("backend/models/production")
            production_dir.mkdir(parents=True, exist_ok=True)
            
            # 1. SentenceTransformers format
            st_path = production_dir / "cs_document_embeddings"
            trained_model.save(str(st_path))
            
            # 2. Save model configuration
            config_dict = {
                'model_name': 'cs_document_embeddings',
                'base_model': self.config.base_model_name,
                'max_seq_length': self.config.max_seq_length,
                'embedding_dim': trained_model.get_sentence_embedding_dimension(),
                'training_stats': self.training_stats,
                'model_path': str(st_path),
                'usage': 'document_analysis_embeddings'
            }
            
            config_file = production_dir / "cs_embedding_config.json"
            with open(config_file, 'w') as f:
                json.dump(config_dict, f, indent=2)
            
            # 3. Create usage example
            usage_example = self._create_usage_example(trained_model)
            example_file = production_dir / "usage_example.py"
            with open(example_file, 'w') as f:
                f.write(usage_example)
            
            logger.info(f"Production model saved to: {production_dir}")
            logger.info(f"Model embedding dimension: {trained_model.get_sentence_embedding_dimension()}")
            
            return True
            
        except Exception as e:
            logger.error(f"Error saving production model: {str(e)}")
            return False
    
    def _create_usage_example(self, model: SentenceTransformer) -> str:
        """Create usage example for the trained model"""
        return f'''"""
CS Document Embeddings - Usage Example
Generated for Engunity AI Document Analysis
"""

from sentence_transformers import SentenceTransformer
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity

# Load the trained CS document embedding model
model = SentenceTransformer('backend/models/production/cs_document_embeddings')

# Example usage for document analysis
def analyze_document_similarity(documents: list, query: str):
    """
    Analyze similarity between documents and a query
    Optimized for CS technical content and code understanding
    """
    # Encode documents and query
    doc_embeddings = model.encode(documents)
    query_embedding = model.encode([query])
    
    # Calculate similarities
    similarities = cosine_similarity(query_embedding, doc_embeddings)[0]
    
    # Return ranked results
    results = [(doc, sim) for doc, sim in zip(documents, similarities)]
    return sorted(results, key=lambda x: x[1], reverse=True)

# Example documents (CS-focused)
documents = [
    "Binary search algorithm implementation in Python with O(log n) complexity",
    "Machine learning model evaluation using cross-validation techniques",
    "Database normalization principles and third normal form",
    "RESTful API design patterns for microservices architecture"
]

query = "How to implement efficient searching algorithms?"

# Get ranked results
results = analyze_document_similarity(documents, query)

print("Document Analysis Results:")
for i, (doc, similarity) in enumerate(results):
    print(f"{{i+1}}. [{{similarity:.3f}}] {{doc[:60]}}...")

# Advanced usage for code-text alignment
def encode_code_and_description(code: str, description: str):
    """
    Encode code snippet and its description for semantic alignment
    """
    embeddings = model.encode([code, description])
    similarity = cosine_similarity([embeddings[0]], [embeddings[1]])[0][0]
    return embeddings, similarity

# Example
code = """
def binary_search(arr, target):
    left, right = 0, len(arr) - 1
    while left <= right:
        mid = (left + right) // 2
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            left = mid + 1
        else:
            right = mid - 1
    return -1
"""

description = "Efficient algorithm for finding elements in sorted arrays"
embeddings, similarity = encode_code_and_description(code, description)
print(f"\\nCode-Description Similarity: {{{{similarity:.3f}}}}")

# Model specifications
print(f"\\nModel Specifications:")
print(f"- Embedding Dimension: {{{{model.get_sentence_embedding_dimension()}}}}")
print(f"- Max Sequence Length: {{{{model.max_seq_length}}}}")
print(f"- Optimized for: CS technical content, code understanding, document analysis")
'''
    
    def generate_training_report(self) -> str:
        """Generate comprehensive training report"""
        report = []
        report.append("# CS Domain Embedding Training Report")
        report.append(f"Generated on: {pd.Timestamp.now().strftime('%Y-%m-%d %H:%M:%S')}")
        report.append("")
        
        # Training Summary
        report.append("## Training Summary")
        report.append(f"- **Base Model:** {self.config.base_model_name}")
        report.append(f"- **Training Examples:** {len(self.train_examples):,}")
        report.append(f"- **Validation Examples:** {len(self.val_examples):,}")
        report.append(f"- **Test Examples:** {len(self.test_examples):,}")
        report.append(f"- **Training Epochs:** {self.config.num_epochs}")
        report.append(f"- **Batch Size:** {self.config.batch_size}")
        report.append(f"- **Learning Rate:** {self.config.learning_rate}")
        report.append("")
        
        # Data Composition
        report.append("## Training Data Composition")
        report.append(f"- **CS Examples:** {self.training_stats['cs_examples']:,}")
        report.append(f"- **Code Examples:** {self.training_stats['code_examples']:,}")
        report.append(f"- **Document Examples:** {self.training_stats['document_examples']:,}")
        report.append("")
        
        # Configuration
        report.append("## Model Configuration")
        report.append(f"- **Max Sequence Length:** {self.config.max_seq_length}")
        report.append(f"- **Device:** {self.config.device}")
        report.append(f"- **FP16 Training:** {self.config.fp16}")
        report.append(f"- **Output Directory:** {self.config.output_dir}")
        report.append("")
        
        # Usage Instructions
        report.append("## Usage Instructions")
        report.append("### Loading the Model")
        report.append("```python")
        report.append("from sentence_transformers import SentenceTransformer")
        report.append("model = SentenceTransformer('backend/models/production/cs_document_embeddings')")
        report.append("```")
        report.append("")
        
        report.append("### Document Analysis")
        report.append("```python")
        report.append("# Encode documents for similarity search")
        report.append("documents = ['Your CS documents here...']")
        report.append("embeddings = model.encode(documents)")
        report.append("```")
        report.append("")
        
        # Integration Guide
        report.append("## RAG System Integration")
        report.append("1. **Replace existing embeddings** in document Q&A module")
        report.append("2. **Update vector store** with new embeddings")
        report.append("3. **Configure retrieval pipeline** to use CS-optimized model")
        report.append("4. **Test performance** on CS-specific queries")
        report.append("")
        
        return "\n".join(report)
    
    def run_complete_training_pipeline(self) -> bool:
        """Run the complete CS embedding training pipeline"""
        logger.info("🚀 Starting CS Domain Embedding Training Pipeline...")
        
        try:
            # Step 1: Download and load model
            logger.info("Step 1: Downloading and loading base model...")
            if not self.download_and_load_model():
                return False
            
            # Step 2: Load training data
            logger.info("Step 2: Loading and processing training data...")
            if not self.load_training_data():
                return False
            
            # Step 3: Setup training
            logger.info("Step 3: Setting up training configuration...")
            if not self.setup_training():
                return False
            
            # Step 4: Train model
            logger.info("Step 4: Training CS domain embeddings...")
            if not self.train_model():
                return False
            
            # Step 5: Evaluate model
            logger.info("Step 5: Evaluating trained model...")
            evaluation_results = self.evaluate_model()
            
            # Step 6: Save for production
            logger.info("Step 6: Saving model for production...")
            if not self.save_model_for_production():
                return False
            
            # Step 7: Generate report
            logger.info("Step 7: Generating training report...")
            report = self.generate_training_report()
            
            report_file = Path(self.config.output_dir) / "training_report.md"
            with open(report_file, 'w', encoding='utf-8') as f:
                f.write(report)
            
            # Step 8: Print summary
            self._print_training_summary(evaluation_results)
            
            logger.info("✅ CS Domain Embedding Training completed successfully!")
            return True
            
        except Exception as e:
            logger.error(f"❌ Training pipeline failed: {str(e)}")
            return False
    
    def _print_training_summary(self, evaluation_results: Dict[str, float]):
        """Print comprehensive training summary"""
        print("\n" + "="*80)
        print("🧠 CS DOMAIN EMBEDDING TRAINING SUMMARY")
        print("="*80)
        
        # Model Information
        print(f"\n📊 MODEL INFORMATION:")
        print(f"   Base Model: {self.config.base_model_name}")
        print(f"   Target Use: Document Analysis & RAG")
        print(f"   Max Sequence Length: {self.config.max_seq_length}")
        print(f"   Device: {self.config.device}")
        
        # Training Data Stats
        print(f"\n📈 TRAINING DATA:")
        print(f"   Total Examples: {len(self.train_examples):,}")
        print(f"   Training: {len(self.train_examples):,}")
        print(f"   Validation: {len(self.val_examples):,}")
        print(f"   Test: {len(self.test_examples):,}")
        print(f"   CS Examples: {self.training_stats['cs_examples']:,}")
        print(f"   Code Examples: {self.training_stats['code_examples']:,}")
        
        # Training Configuration
        print(f"\n⚙️  TRAINING CONFIG:")
        print(f"   Epochs: {self.config.num_epochs}")
        print(f"   Batch Size: {self.config.batch_size}")
        print(f"   Learning Rate: {self.config.learning_rate}")
        print(f"   Weight Decay: {self.config.weight_decay}")
        
        # Evaluation Results
        if evaluation_results:
            print(f"\n🎯 EVALUATION RESULTS:")
            for metric, score in evaluation_results.items():
                emoji = "🔥" if score > 0.8 else "⚡" if score > 0.6 else "📌"
                print(f"   {emoji} {metric.replace('_', ' ').title()}: {score:.4f}")
        
        # Model Output
        print(f"\n📁 MODEL OUTPUT:")
        print(f"   Training Output: {self.config.output_dir}")
        print(f"   Production Model: backend/models/production/cs_document_embeddings")
        print(f"   Configuration: backend/models/production/cs_embedding_config.json")
        print(f"   Usage Example: backend/models/production/usage_example.py")
        
        # Integration Steps
        print(f"\n🔄 NEXT STEPS:")
        print(f"   1. Test model: python -c \"from sentence_transformers import SentenceTransformer; print('✅ Model loaded successfully')\"")
        print(f"   2. Update RAG pipeline to use new embeddings")
        print(f"   3. Rebuild vector store with CS-optimized embeddings")
        print(f"   4. Test document Q&A performance")
        print(f"   5. Monitor embedding quality in production")
        
        # Quick Test
        print(f"\n🧪 QUICK TEST:")
        print(f"   Load model: SentenceTransformer('backend/models/production/cs_document_embeddings')")
        print(f"   Test query: 'How to implement binary search algorithm?'")
        print(f"   Expected: High-quality embeddings optimized for CS content")
        
        print("="*80)


def main():
    """Main execution function for CS embedding training"""
    import argparse
    import sys
    
    parser = argparse.ArgumentParser(description='Train CS domain embeddings for Engunity AI document analysis')
    parser.add_argument(
        '--training-data-dir',
        default='backend/data/training/processed/training_ready',
        help='Directory containing training-ready data'
    )
    parser.add_argument(
        '--output-dir',
        default='backend/models/cs_embeddings',
        help='Directory to save trained model'
    )
    parser.add_argument(
        '--base-model',
        default='BAAI/bge-small-en-v1.5',
        help='Base model to fine-tune'
    )
    parser.add_argument(
        '--epochs',
        type=int,
        default=3,
        help='Number of training epochs'
    )
    parser.add_argument(
        '--batch-size',
        type=int,
        default=16,
        help='Training batch size'
    )
    parser.add_argument(
        '--learning-rate',
        type=float,
        default=2e-5,
        help='Learning rate'
    )
    parser.add_argument(
        '--max-seq-length',
        type=int,
        default=512,
        help='Maximum sequence length'
    )
    parser.add_argument(
        '--no-fp16',
        action='store_true',
        help='Disable FP16 training'
    )
    parser.add_argument(
        '--cpu-only',
        action='store_true',
        help='Force CPU training (ignore GPU)'
    )
    parser.add_argument(
        '--quick-test',
        action='store_true',
        help='Run quick test with reduced data'
    )
    parser.add_argument(
        '--verbose',
        action='store_true',
        help='Enable verbose logging'
    )
    
    args = parser.parse_args()
    
    # Set logging level
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)
    
    # Create configuration
    config = CSEmbeddingConfig(
        base_model_name=args.base_model,
        output_dir=args.output_dir,
        num_epochs=args.epochs,
        batch_size=args.batch_size,
        learning_rate=args.learning_rate,
        max_seq_length=args.max_seq_length,
        fp16=not args.no_fp16 and torch.cuda.is_available(),
        device="cpu" if args.cpu_only else ("cuda" if torch.cuda.is_available() else "cpu")
    )
    
    # Quick test mode
    if args.quick_test:
        config.num_epochs = 1
        config.batch_size = 8
        config.eval_steps = 100
        config.save_steps = 100
        logger.info("Running in quick test mode with reduced parameters")
    
    # Initialize trainer
    trainer = CSEmbeddingTrainer(config)
    
    # Check for training data
    training_data_dir = Path(args.training_data_dir)
    if not training_data_dir.exists():
        print(f"\n❌ Training data directory not found: {training_data_dir}")
        print("Please run the following steps first:")
        print("1. python backend/data/training/dataset_analyzer.py")
        print("2. python backend/data/training/cs_preprocessor.py")
        print("3. python backend/data/training/domain_mapper.py")
        sys.exit(1)
    
    # Check available memory and adjust config if needed
    if torch.cuda.is_available() and not args.cpu_only:
        gpu_memory = torch.cuda.get_device_properties(0).total_memory / 1e9
        logger.info(f"Available GPU memory: {gpu_memory:.1f} GB")
        
        if gpu_memory < 6:  # Less than 6GB VRAM
            logger.warning("Limited GPU memory detected, adjusting configuration...")
            config.batch_size = min(config.batch_size, 8)
            config.gradient_accumulation_steps = 4
            config.dataloader_num_workers = 2
            logger.info(f"Adjusted batch size to {config.batch_size}")
    
    # Run training
    print(f"\n🚀 Starting CS Domain Embedding Training...")
    print(f"📊 Base Model: {config.base_model_name}")
    print(f"🎯 Target: Document Analysis & RAG")
    print(f"💾 Device: {config.device}")
    print(f"📁 Output: {config.output_dir}")
    
    success = trainer.run_complete_training_pipeline()
    
    if success:
        print(f"\n✅ Training completed successfully!")
        print(f"📁 Model saved to: backend/models/production/cs_document_embeddings")
        print(f"📖 See training_report.md for detailed results")
        print(f"\n🔄 Next steps:")
        print(f"1. Test the model with your CS documents")
        print(f"2. Integrate with your RAG pipeline")
        print(f"3. Update document Q&A module")
        sys.exit(0)
    else:
        print(f"\n❌ Training failed. Check logs for details.")
        print(f"📋 Log file: backend/app/services/rag/embedding_training.log")
        sys.exit(1)


# Utility functions for testing and validation
def test_trained_model(model_path: str = "backend/models/production/cs_document_embeddings"):
    """Test the trained CS embedding model"""
    try:
        from sentence_transformers import SentenceTransformer
        import numpy as np
        from sklearn.metrics.pairwise import cosine_similarity
        
        print("🧪 Testing trained CS embedding model...")
        
        # Load model
        model = SentenceTransformer(model_path)
        print(f"✅ Model loaded successfully")
        print(f"📏 Embedding dimension: {model.get_sentence_embedding_dimension()}")
        print(f"📐 Max sequence length: {model.max_seq_length}")
        
        # Test CS-specific content
        test_texts = [
            "Binary search algorithm implementation in Python",
            "Machine learning model training with scikit-learn",
            "Database indexing for query optimization",
            "RESTful API design patterns",
            "def binary_search(arr, target): return -1",
            "SELECT * FROM users WHERE age > 25"
        ]
        
        print(f"\n🔍 Testing embeddings...")
        embeddings = model.encode(test_texts)
        print(f"📊 Generated embeddings shape: {embeddings.shape}")
        
        # Test similarity
        query = "How to implement efficient search algorithms?"
        query_embedding = model.encode([query])
        
        similarities = cosine_similarity(query_embedding, embeddings)[0]
        
        print(f"\n🎯 Similarity test results:")
        print(f"Query: '{query}'")
        print("-" * 50)
        
        for text, sim in zip(test_texts, similarities):
            print(f"{sim:.3f} | {text[:50]}...")
        
        print(f"\n✅ Model test completed successfully!")
        return True
        
    except Exception as e:
        print(f"❌ Model test failed: {str(e)}")
        return False

def create_embedding_integration_guide():
    """Create integration guide for RAG system"""
    guide_content = '''# CS Embedding Integration Guide

## Overview
This guide explains how to integrate the trained CS domain embeddings into your Engunity AI RAG system.

## Quick Integration

### 1. Load the Model
```python
from sentence_transformers import SentenceTransformer

# Load CS-optimized embeddings
cs_embeddings = SentenceTransformer('backend/models/production/cs_document_embeddings')
```

### 2. Update Document Q&A Module
```python
# In backend/app/services/document/vectorizer.py
class CSDocumentVectorizer:
    def __init__(self):
        self.model = SentenceTransformer('backend/models/production/cs_document_embeddings')
    
    def encode_documents(self, documents):
        return self.model.encode(documents)
    
    def encode_query(self, query):
        return self.model.encode([query])
```

### 3. Update Vector Store
```python
# Rebuild your FAISS index with new embeddings
import faiss
import numpy as np

# Re-encode all documents
document_embeddings = cs_embeddings.encode(all_documents)

# Create new FAISS index
index = faiss.IndexFlatIP(document_embeddings.shape[1])
index.add(document_embeddings.astype('float32'))

# Save updated index
faiss.write_index(index, 'backend/vector_store/cs_optimized_index.faiss')
```

### 4. Test Integration
```python
# Test document retrieval
query = "How to implement binary search?"
query_embedding = cs_embeddings.encode([query])

# Search similar documents
scores, indices = index.search(query_embedding.astype('float32'), k=5)

print("Top 5 similar documents:")
for score, idx in zip(scores[0], indices[0]):
    print(f"{score:.3f}: {documents[idx][:100]}...")
```

## Performance Optimization

### Memory Usage
- Model size: ~120MB
- Embedding dimension: 384
- Recommended batch size: 32 for encoding

### Speed Optimization
```python
# Use GPU if available
cs_embeddings = SentenceTransformer(
    'backend/models/production/cs_document_embeddings',
    device='cuda' if torch.cuda.is_available() else 'cpu'
)

# Batch processing for multiple documents
embeddings = cs_embeddings.encode(documents, batch_size=32, show_progress_bar=True)
```

## Monitoring & Evaluation

### Quality Metrics
- Monitor cosine similarity scores
- Track retrieval accuracy
- Measure user satisfaction

### A/B Testing
- Compare against original embeddings
- Measure improvement in CS-specific queries
- Track user engagement metrics

## Troubleshooting

### Common Issues
1. **CUDA out of memory**: Reduce batch size
2. **Slow encoding**: Enable GPU acceleration
3. **Poor similarity scores**: Check document preprocessing

### Performance Tuning
- Adjust similarity thresholds
- Fine-tune retrieval parameters
- Monitor embedding quality
'''
    
    guide_file = Path("backend/models/production/integration_guide.md")
    with open(guide_file, 'w', encoding='utf-8') as f:
        f.write(guide_content)
    
    print(f"📖 Integration guide created: {guide_file}")

if __name__ == "__main__":
    # Check if this is being run as a test
    if len(sys.argv) > 1 and sys.argv[1] == "--test-model":
        test_trained_model()
    elif len(sys.argv) > 1 and sys.argv[1] == "--create-guide":
        create_embedding_integration_guide()
    else:
        main()