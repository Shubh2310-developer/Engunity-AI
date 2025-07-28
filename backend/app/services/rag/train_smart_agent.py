#!/usr/bin/env python3
"""
Training Script for Smart RAG Agent

This script trains the Smart RAG Agent using the CS dataset with:
1. Document embedding and retrieval
2. Multi-candidate generation with test-time compute
3. Answer scoring and selection
4. Backpropagation for continuous improvement

Usage:
    python train_smart_agent.py --data_path backend/data/training/processed/training_ready
                                --model_path backend/models/smart_rag_agent
                                --epochs 20
                                --batch_size 8
"""

import argparse
import asyncio
import json
import logging
import os
from pathlib import Path
from typing import List, Dict
import torch
from tqdm import tqdm
import matplotlib.pyplot as plt
import numpy as np

from smart_rag_agent import SmartRagAgent, RagConfig, SmartRagTrainer
from llm_integration import EnhancedSmartRagAgent, LLMConfig, MultiLLMGenerator

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('smart_agent_training.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class SmartAgentTrainingPipeline:
    """Complete training pipeline for the Smart RAG Agent"""
    
    def __init__(self, args):
        self.args = args
        self.setup_configs()
        self.setup_agent()
        self.training_stats = {
            'epoch_losses': [],
            'validation_scores': [],
            'best_score': 0.0,
            'best_epoch': 0
        }
    
    def setup_configs(self):
        """Setup configurations for training"""
        self.rag_config = RagConfig(
            embedding_model_path=self.args.embedding_model_path,
            max_retrieved_docs=self.args.max_docs,
            num_candidate_answers=self.args.num_candidates,
            learning_rate=self.args.learning_rate,
            device="cuda" if torch.cuda.is_available() else "cpu"
        )
        
        self.llm_config = LLMConfig(
            model_type=self.args.llm_type,
            model_name=self.args.llm_model,
            max_tokens=self.args.max_tokens,
            api_key=self.args.api_key
        )
        
        logger.info(f"Training configuration:")
        logger.info(f"  Device: {self.rag_config.device}")
        logger.info(f"  LLM Type: {self.llm_config.model_type}")
        logger.info(f"  LLM Model: {self.llm_config.model_name}")
        logger.info(f"  Candidates per query: {self.rag_config.num_candidate_answers}")
        logger.info(f"  Learning rate: {self.rag_config.learning_rate}")
    
    def setup_agent(self):
        """Initialize the Smart RAG Agent"""
        if self.args.use_llm:
            self.agent = EnhancedSmartRagAgent(self.rag_config, self.llm_config)
            logger.info("Initialized Enhanced Smart RAG Agent with LLM integration")
        else:
            self.agent = SmartRagAgent(self.rag_config)
            logger.info("Initialized base Smart RAG Agent")
    
    def load_training_data(self) -> Dict[str, List[Dict]]:
        """Load training data from processed datasets"""
        data_splits = {}
        
        # Load different categories of training data
        categories = ['document_qa', 'code_assistant', 'research_tools']
        
        for category in categories:
            category_path = Path(self.args.data_path) / category
            if not category_path.exists():
                logger.warning(f"Category path not found: {category_path}")
                continue
                
            category_data = {}
            for split in ['train', 'validation', 'test']:
                split_file = category_path / f"{split}.jsonl"
                if split_file.exists():
                    with open(split_file, 'r', encoding='utf-8') as f:
                        category_data[split] = [json.loads(line) for line in f]
                    logger.info(f"Loaded {len(category_data[split])} examples from {split_file}")
            
            data_splits[category] = category_data
        
        return data_splits
    
    def load_documents_for_retrieval(self):
        """Load documents into the agent's document processor"""
        # Look for document files in the data directory
        doc_paths = []
        
        # Add any existing document files
        data_dir = Path(self.args.data_path).parent
        
        # Look for text files, markdown files, etc.
        for ext in ['*.txt', '*.md', '*.py', '*.json']:
            doc_paths.extend(data_dir.rglob(ext))
        
        # Convert to strings and filter valid files
        valid_docs = []
        for path in doc_paths:
            if path.is_file() and path.stat().st_size > 100:  # At least 100 bytes
                valid_docs.append(str(path))
        
        if valid_docs:
            logger.info(f"Loading {len(valid_docs)} documents for retrieval...")
            if hasattr(self.agent, 'base_agent'):
                self.agent.base_agent.document_processor.load_documents(valid_docs[:100])  # Limit for memory
            else:
                self.agent.document_processor.load_documents(valid_docs[:100])
            logger.info("Documents loaded successfully")
        else:
            logger.warning("No documents found for retrieval")
    
    async def evaluate_on_dataset(self, dataset: List[Dict], max_samples: int = 50) -> Dict:
        """Evaluate agent performance on a dataset"""
        logger.info(f"Evaluating on {min(len(dataset), max_samples)} samples...")
        
        total_score = 0.0
        semantic_similarities = []
        response_lengths = []
        
        # Limit evaluation size for speed
        eval_dataset = dataset[:max_samples] if len(dataset) > max_samples else dataset
        
        for example in tqdm(eval_dataset, desc="Evaluating"):
            try:
                query = example.get('question', example.get('query', ''))
                ground_truth = example.get('answer', example.get('response', ''))
                
                if not query or not ground_truth:
                    continue
                
                # Get agent response
                result = await self.agent.answer_query(query)
                
                # Calculate semantic similarity (simple cosine similarity)
                similarity = self.calculate_semantic_similarity(
                    result['answer'], ground_truth
                )
                
                semantic_similarities.append(similarity)
                total_score += result['confidence']
                response_lengths.append(len(result['answer']))
                
            except Exception as e:
                logger.error(f"Error evaluating example: {e}")
                continue
        
        if semantic_similarities:
            metrics = {
                'avg_confidence': total_score / len(semantic_similarities),
                'avg_semantic_similarity': np.mean(semantic_similarities),
                'avg_response_length': np.mean(response_lengths),
                'num_evaluated': len(semantic_similarities)
            }
        else:
            metrics = {
                'avg_confidence': 0.0,
                'avg_semantic_similarity': 0.0,
                'avg_response_length': 0.0,
                'num_evaluated': 0
            }
        
        logger.info(f"Evaluation metrics: {metrics}")
        return metrics
    
    def calculate_semantic_similarity(self, text1: str, text2: str) -> float:
        """Calculate semantic similarity between two texts"""
        try:
            # Use the embedding model from the agent
            if hasattr(self.agent, 'base_agent'):
                embedding_model = self.agent.base_agent.embedding_model
            else:
                embedding_model = self.agent.embedding_model
            
            emb1 = embedding_model.encode(text1, convert_to_tensor=True)
            emb2 = embedding_model.encode(text2, convert_to_tensor=True)
            
            similarity = torch.cosine_similarity(emb1.unsqueeze(0), emb2.unsqueeze(0))
            return similarity.item()
        except Exception as e:
            logger.error(f"Error calculating similarity: {e}")
            return 0.0
    
    async def train_epoch(self, train_data: List[Dict], epoch: int) -> float:
        """Train for one epoch"""
        total_loss = 0.0
        num_processed = 0
        
        # Shuffle training data
        import random
        random.shuffle(train_data)
        
        # Limit training size for each epoch
        max_train_samples = min(len(train_data), self.args.max_train_samples)
        epoch_data = train_data[:max_train_samples]
        
        logger.info(f"Training epoch {epoch+1} on {len(epoch_data)} examples...")
        
        for i, example in enumerate(tqdm(epoch_data, desc=f"Epoch {epoch+1}")):
            try:
                query = example.get('question', example.get('query', ''))
                ground_truth = example.get('answer', example.get('response', ''))
                
                if not query or not ground_truth:
                    continue
                
                # Train with ground truth
                result = await self.agent.answer_query(query, ground_truth)
                
                if 'training_loss' in result:
                    total_loss += result['training_loss']
                    num_processed += 1
                
                # Log progress
                if (i + 1) % 10 == 0:
                    avg_loss = total_loss / max(num_processed, 1)
                    logger.info(f"  Step {i+1}/{len(epoch_data)}, Avg Loss: {avg_loss:.4f}")
                
            except Exception as e:
                logger.error(f"Error processing training example {i}: {e}")
                continue
        
        epoch_loss = total_loss / max(num_processed, 1)
        logger.info(f"Epoch {epoch+1} completed. Average loss: {epoch_loss:.4f}")
        
        return epoch_loss
    
    async def train(self):
        """Main training loop"""
        logger.info("Starting Smart RAG Agent training...")
        
        # Load data
        data_splits = self.load_training_data()
        
        # Load documents for retrieval
        self.load_documents_for_retrieval()
        
        # Combine training data from all categories
        all_train_data = []
        all_val_data = []
        
        for category, splits in data_splits.items():
            if 'train' in splits:
                all_train_data.extend(splits['train'])
            if 'validation' in splits:
                all_val_data.extend(splits['validation'])
        
        logger.info(f"Total training examples: {len(all_train_data)}")
        logger.info(f"Total validation examples: {len(all_val_data)}")
        
        if not all_train_data:
            logger.error("No training data found!")
            return
        
        # Training loop
        best_val_score = 0.0
        patience_counter = 0
        
        for epoch in range(self.args.epochs):
            logger.info(f"\n{'='*60}")
            logger.info(f"Epoch {epoch+1}/{self.args.epochs}")
            logger.info(f"{'='*60}")
            
            # Training phase
            epoch_loss = await self.train_epoch(all_train_data, epoch)
            self.training_stats['epoch_losses'].append(epoch_loss)
            
            # Validation phase
            if all_val_data and (epoch + 1) % self.args.eval_frequency == 0:
                val_metrics = await self.evaluate_on_dataset(all_val_data)
                val_score = val_metrics['avg_semantic_similarity']
                self.training_stats['validation_scores'].append(val_score)
                
                # Check for improvement
                if val_score > best_val_score:
                    best_val_score = val_score
                    self.training_stats['best_score'] = val_score
                    self.training_stats['best_epoch'] = epoch + 1
                    patience_counter = 0
                    
                    # Save best model
                    best_model_path = f"{self.args.model_path}_best.pt"
                    if hasattr(self.agent, 'base_agent'):
                        self.agent.base_agent.save_model(best_model_path)
                    else:
                        self.agent.save_model(best_model_path)
                    logger.info(f"New best model saved: {best_model_path}")
                else:
                    patience_counter += 1
                
                logger.info(f"Validation score: {val_score:.4f} (best: {best_val_score:.4f})")
                
                # Early stopping
                if patience_counter >= self.args.patience:
                    logger.info(f"Early stopping after {patience_counter} epochs without improvement")
                    break
            
            # Save checkpoint
            if (epoch + 1) % self.args.save_frequency == 0:
                checkpoint_path = f"{self.args.model_path}_epoch_{epoch+1}.pt"
                if hasattr(self.agent, 'base_agent'):
                    self.agent.base_agent.save_model(checkpoint_path)
                else:
                    self.agent.save_model(checkpoint_path)
                logger.info(f"Checkpoint saved: {checkpoint_path}")
        
        # Save final model
        final_model_path = f"{self.args.model_path}_final.pt"
        if hasattr(self.agent, 'base_agent'):
            self.agent.base_agent.save_model(final_model_path)
        else:
            self.agent.save_model(final_model_path)
        
        # Save training statistics
        stats_path = f"{self.args.model_path}_training_stats.json"
        with open(stats_path, 'w') as f:
            json.dump(self.training_stats, f, indent=2)
        
        # Generate training plots
        self.plot_training_curves()
        
        logger.info("Training completed!")
        logger.info(f"Best validation score: {self.training_stats['best_score']:.4f} at epoch {self.training_stats['best_epoch']}")
    
    def plot_training_curves(self):
        """Plot training loss and validation curves"""
        fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(15, 5))
        
        # Plot training loss
        if self.training_stats['epoch_losses']:
            ax1.plot(self.training_stats['epoch_losses'])
            ax1.set_title('Training Loss')
            ax1.set_xlabel('Epoch')
            ax1.set_ylabel('Loss')
            ax1.grid(True)
        
        # Plot validation score
        if self.training_stats['validation_scores']:
            eval_epochs = list(range(self.args.eval_frequency, 
                                   len(self.training_stats['validation_scores']) * self.args.eval_frequency + 1, 
                                   self.args.eval_frequency))
            ax2.plot(eval_epochs, self.training_stats['validation_scores'])
            ax2.set_title('Validation Semantic Similarity')
            ax2.set_xlabel('Epoch')
            ax2.set_ylabel('Similarity Score')
            ax2.grid(True)
        
        plt.tight_layout()
        plot_path = f"{self.args.model_path}_training_curves.png"
        plt.savefig(plot_path)
        plt.close()
        logger.info(f"Training curves saved: {plot_path}")

def parse_args():
    """Parse command line arguments"""
    parser = argparse.ArgumentParser(description='Train Smart RAG Agent')
    
    # Data arguments
    parser.add_argument('--data_path', type=str, 
                       default='backend/data/training/processed/training_ready',
                       help='Path to training data directory')
    
    # Model arguments  
    parser.add_argument('--model_path', type=str,
                       default='backend/models/smart_rag_agent',
                       help='Path to save trained model')
    parser.add_argument('--embedding_model_path', type=str,
                       default='backend/models/production/cs_document_embeddings',
                       help='Path to CS embedding model')
    
    # Training arguments
    parser.add_argument('--epochs', type=int, default=20,
                       help='Number of training epochs')
    parser.add_argument('--learning_rate', type=float, default=1e-4,
                       help='Learning rate')
    parser.add_argument('--max_train_samples', type=int, default=100,
                       help='Max training samples per epoch')
    parser.add_argument('--eval_frequency', type=int, default=2,
                       help='Evaluate every N epochs')
    parser.add_argument('--save_frequency', type=int, default=5,
                       help='Save checkpoint every N epochs')
    parser.add_argument('--patience', type=int, default=5,
                       help='Early stopping patience')
    
    # Agent arguments
    parser.add_argument('--max_docs', type=int, default=5,
                       help='Max documents to retrieve')
    parser.add_argument('--num_candidates', type=int, default=6,
                       help='Number of candidate answers to generate')
    
    # LLM arguments
    parser.add_argument('--use_llm', action='store_true',
                       help='Use real LLM for generation')
    parser.add_argument('--llm_type', type=str, default='huggingface',
                       choices=['huggingface', 'openai', 'anthropic', 'custom'],
                       help='Type of LLM to use')
    parser.add_argument('--llm_model', type=str, default='microsoft/DialoGPT-small',
                       help='LLM model name')
    parser.add_argument('--max_tokens', type=int, default=256,
                       help='Max tokens for LLM generation')
    parser.add_argument('--api_key', type=str, default=None,
                       help='API key for external LLM services')
    
    return parser.parse_args()

async def main():
    """Main training function"""
    args = parse_args()
    
    # Create output directory
    os.makedirs(os.path.dirname(args.model_path), exist_ok=True)
    
    # Initialize and run training pipeline
    pipeline = SmartAgentTrainingPipeline(args)
    await pipeline.train()

if __name__ == "__main__":
    asyncio.run(main())