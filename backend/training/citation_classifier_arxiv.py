"""
Citation Purpose Classifier - ArXiv Dataset Training Script
Optimized for local training with synthetic data generation
"""

import json
import os
import re
import warnings
from pathlib import Path
from typing import Dict, List, Tuple, Optional
import numpy as np
from datetime import datetime
import random
from collections import defaultdict

# ML imports
from sklearn.metrics import accuracy_score, precision_recall_fscore_support, classification_report
from sklearn.model_selection import train_test_split
import torch
from transformers import (
    AutoTokenizer,
    AutoModelForSequenceClassification,
    TrainingArguments,
    Trainer,
    EvalPrediction,
    DataCollatorWithPadding
)
from datasets import Dataset as HFDataset
import logging

# Setup logging
logging.basicConfig(
    format='%(asctime)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)
warnings.filterwarnings('ignore')

print("Dependencies imported successfully!")
print(f"PyTorch version: {torch.__version__}")
print(f"CUDA available: {torch.cuda.is_available()}")
if torch.cuda.is_available():
    print(f"CUDA device: {torch.cuda.get_device_name()}")

class ArXivCitationDataGenerator:
    """Generate synthetic citation contexts from arXiv papers"""
    
    def __init__(self, arxiv_file_path: str):
        self.arxiv_file_path = arxiv_file_path
        self.papers = []
        self.citation_templates = {
            'Background': [
                "Previous research {} has established the foundation for this work.",
                "Building on the work of {}, we extend the methodology to include",
                "The theoretical framework developed by {} provides the basis for",
                "As demonstrated in {}, the approach shows promise for",
                "Following the insights from {}, we investigate",
                "The seminal work {} laid the groundwork for understanding",
                "Prior studies {} have shown the importance of",
                "The foundational concepts introduced by {} are essential for"
            ],
            'Method': [
                "We adopt the methodology described in {} for data preprocessing.",
                "Following the approach outlined in {}, we implement",
                "The algorithm presented in {} is modified to handle",
                "Using the framework from {}, we develop a novel",
                "We extend the method proposed by {} to include",
                "The technique described in {} is applied with modifications",
                "Based on the procedure in {}, we construct",
                "The experimental setup follows {} with additional considerations"
            ],
            'Comparison': [
                "Our results outperform {} by achieving higher accuracy.",
                "Compared to the baseline established by {}, our method shows",
                "While {} achieved good results, our approach demonstrates",
                "The performance gains over {} are substantial, with",
                "In contrast to {}, our model exhibits improved",
                "Our approach surpasses the state-of-the-art {} in terms of",
                "The results compare favorably with {} across multiple metrics.",
                "Unlike the method in {}, our approach achieves"
            ],
            'Result': [
                "These findings are consistent with {} and further validate",
                "Our experimental results align with {} showing that",
                "The outcome supports the conclusions drawn in {} regarding",
                "Similar to the observations in {}, we find that",
                "The results corroborate the findings of {} and extend",
                "This validates the hypothesis proposed in {} about",
                "The data confirms the trend identified in {} where",
                "Our analysis supports the claims made in {} that"
            ],
            'Other': [
                "For additional details, see {} and related documentation.",
                "Comprehensive reviews can be found in {} and references therein.",
                "Implementation specifics are available in {} supplementary materials.",
                "Further information is provided in {} appendix section.",
                "Additional experiments are documented in {} extended version.",
                "Related work includes {} among other contributions.",
                "See {} for a complete list of parameters and settings.",
                "The full experimental protocol is described in {} methodology."
            ]
        }
        
    def load_arxiv_papers(self, max_papers: int = 50000):
        """Load arXiv papers from JSON file"""
        logger.info(f"Loading papers from {self.arxiv_file_path}")
        
        papers_loaded = 0
        with open(self.arxiv_file_path, 'r', encoding='utf-8') as f:
            for line in f:
                if papers_loaded >= max_papers:
                    break
                    
                try:
                    paper = json.loads(line.strip())
                    if paper.get('abstract') and len(paper['abstract'].strip()) > 100:
                        self.papers.append({
                            'id': paper['id'],
                            'title': paper['title'].replace('\n', ' ').strip(),
                            'abstract': paper['abstract'].replace('\n', ' ').strip(),
                            'authors': paper.get('authors', ''),
                            'categories': paper.get('categories', '')
                        })
                        papers_loaded += 1
                        
                except json.JSONDecodeError:
                    continue
                    
        logger.info(f"Loaded {len(self.papers)} papers")
        return self.papers
    
    def generate_citation_reference(self, paper: Dict) -> str:
        """Generate a realistic citation reference"""
        authors = paper['authors']
        if not authors:
            return f"[{paper['id']}]"
            
        # Parse first author
        first_author = authors.split(',')[0].strip()
        if ' ' in first_author:
            first_author = first_author.split()[-1]  # Last name
            
        # Generate different citation formats
        formats = [
            f"[{first_author} et al., 2020]",
            f"({first_author} et al., 2020)",
            f"[{random.randint(1, 100)}]",
            f"[{random.randint(1, 50)}, {random.randint(51, 100)}]",
            f"{first_author} et al. (2020)",
            f"({first_author}, 2020)"
        ]
        
        return random.choice(formats)
    
    def create_citation_context(self, citing_paper: Dict, cited_paper: Dict, purpose: str) -> str:
        """Create a citation context sentence"""
        citation_ref = self.generate_citation_reference(cited_paper)
        template = random.choice(self.citation_templates[purpose])
        
        # Create context sentence
        context = template.format(citation_ref)
        
        # Add some content from the citing paper's abstract
        abstract_sentences = citing_paper['abstract'].split('.')
        if len(abstract_sentences) > 1:
            # Add a sentence from the abstract for more context
            additional_context = random.choice(abstract_sentences[:3]).strip()
            if len(additional_context) > 20:
                context += f" {additional_context}."
        
        return context
    
    def generate_training_data(self, num_samples: int = 10000) -> Tuple[List[str], List[str]]:
        """Generate training data with citation contexts"""
        if not self.papers:
            self.load_arxiv_papers()
            
        contexts = []
        labels = []
        
        # Define label distribution (balanced)
        label_counts = {label: num_samples // len(self.citation_templates) for label in self.citation_templates}
        remaining = num_samples % len(self.citation_templates)
        
        # Distribute remaining samples
        for i, label in enumerate(self.citation_templates):
            if i < remaining:
                label_counts[label] += 1
        
        logger.info(f"Target label distribution: {label_counts}")
        
        for purpose, target_count in label_counts.items():
            generated = 0
            while generated < target_count:
                # Select random papers
                citing_paper = random.choice(self.papers)
                cited_paper = random.choice(self.papers)
                
                # Ensure they're different papers
                if citing_paper['id'] == cited_paper['id']:
                    continue
                
                try:
                    context = self.create_citation_context(citing_paper, cited_paper, purpose)
                    
                    # Quality filter
                    if len(context) > 50 and len(context) < 512:
                        contexts.append(context)
                        labels.append(purpose)
                        generated += 1
                        
                except Exception as e:
                    continue
        
        logger.info(f"Generated {len(contexts)} training samples")
        
        # Print actual distribution
        actual_counts = defaultdict(int)
        for label in labels:
            actual_counts[label] += 1
        logger.info(f"Actual label distribution: {dict(actual_counts)}")
        
        return contexts, labels

class CitationClassifierArXiv:
    """Citation Classifier optimized for arXiv dataset"""
    
    def __init__(self, 
                 model_name: str = "bert-base-uncased",
                 labels: List[str] = None,
                 max_length: int = 256,
                 batch_size: int = 16,
                 learning_rate: float = 2e-5,
                 num_epochs: int = 3,
                 warmup_steps: int = 500,
                 output_dir: str = "./citation_classifier_arxiv"):
        
        self.model_name = model_name
        self.labels = labels or ["Background", "Method", "Comparison", "Result", "Other"]
        self.label2id = {label: i for i, label in enumerate(self.labels)}
        self.id2label = {i: label for i, label in enumerate(self.labels)}
        self.max_length = max_length
        self.batch_size = batch_size
        self.learning_rate = learning_rate
        self.num_epochs = num_epochs
        self.warmup_steps = warmup_steps
        self.output_dir = Path(output_dir)
        
        # Device configuration
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        logger.info(f"Using device: {self.device}")
        
        # Mixed precision training
        self.use_fp16 = torch.cuda.is_available()
        if self.use_fp16:
            logger.info("Using mixed precision training (FP16)")
        
        self.tokenizer = None
        self.model = None
    
    @staticmethod
    def normalize_citation(text: str) -> str:
        """Normalize citation formats in the text"""
        text = re.sub(r'\s+', ' ', text)
        
        # Normalize various citation formats
        text = re.sub(r'\[([A-Za-z]+\s+et\s+al\.,?\s*\d{4})\]', '[CITATION]', text)
        text = re.sub(r'\[([A-Za-z]+,?\s*\d{4})\]', '[CITATION]', text)
        text = re.sub(r'\(([A-Za-z]+\s+et\s+al\.,?\s*\d{4})\)', '(CITATION)', text)
        text = re.sub(r'\(([A-Za-z]+,?\s*\d{4})\)', '(CITATION)', text)
        text = re.sub(r'([A-Za-z]+\s+et\s+al\.)\s*\(\d{4}\)', 'CITATION', text)
        text = re.sub(r'([A-Za-z]+)\s*\(\d{4}\)', 'CITATION', text)
        text = re.sub(r'\[\d+\]', '[CITATION]', text)
        text = re.sub(r'\[\d+,\s*\d+(?:,\s*\d+)*\]', '[CITATION]', text)
        text = re.sub(r'\[\d+-\d+\]', '[CITATION]', text)
        
        return text.strip()
    
    def prepare_datasets(self, contexts: List[str], labels: List[str]) -> Dict:
        """Split data into train/val/test sets"""
        # Normalize contexts
        contexts = [self.normalize_citation(ctx) for ctx in contexts]
        label_ids = [self.label2id[label] for label in labels]
        
        # 80/10/10 split
        X_temp, X_test, y_temp, y_test = train_test_split(
            contexts, label_ids, test_size=0.1, stratify=label_ids, random_state=42
        )
        
        X_train, X_val, y_train, y_val = train_test_split(
            X_temp, y_temp, test_size=0.111, stratify=y_temp, random_state=42
        )
        
        logger.info(f"Dataset splits - Train: {len(X_train)}, Val: {len(X_val)}, Test: {len(X_test)}")
        
        return {
            'train': {'contexts': X_train, 'labels': y_train},
            'val': {'contexts': X_val, 'labels': y_val},
            'test': {'contexts': X_test, 'labels': y_test}
        }
    
    def compute_metrics(self, eval_pred: EvalPrediction) -> Dict:
        """Compute evaluation metrics"""
        predictions = np.argmax(eval_pred.predictions, axis=1)
        labels = eval_pred.label_ids
        
        accuracy = accuracy_score(labels, predictions)
        precision, recall, f1, _ = precision_recall_fscore_support(
            labels, predictions, average='weighted', zero_division=0
        )
        
        per_class_metrics = precision_recall_fscore_support(
            labels, predictions, average=None, 
            labels=list(range(len(self.labels))), zero_division=0
        )
        
        metrics = {
            'accuracy': accuracy,
            'precision': precision,
            'recall': recall,
            'f1': f1,
        }
        
        for i, label in enumerate(self.labels):
            if i < len(per_class_metrics[2]):
                metrics[f'f1_{label}'] = per_class_metrics[2][i]
        
        return metrics
    
    def train(self, train_data: Dict, val_data: Dict):
        """Train the model"""
        logger.info("Initializing model and tokenizer...")
        
        self.tokenizer = AutoTokenizer.from_pretrained(self.model_name)
        self.model = AutoModelForSequenceClassification.from_pretrained(
            self.model_name,
            num_labels=len(self.labels),
            id2label=self.id2label,
            label2id=self.label2id
        )
        
        def tokenize_function(examples):
            return self.tokenizer(
                examples['context'],
                padding=False,  # Will be handled by data collator
                truncation=True,
                max_length=self.max_length
            )
        
        # Create datasets
        train_dataset = HFDataset.from_dict({
            'context': train_data['contexts'],
            'labels': train_data['labels']
        })
        val_dataset = HFDataset.from_dict({
            'context': val_data['contexts'],
            'labels': val_data['labels']
        })
        
        train_dataset = train_dataset.map(tokenize_function, batched=True)
        val_dataset = val_dataset.map(tokenize_function, batched=True)
        
        # Data collator for dynamic padding
        data_collator = DataCollatorWithPadding(tokenizer=self.tokenizer)
        
        # Create output directory
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
        # Training arguments
        training_args = TrainingArguments(
            output_dir=str(self.output_dir),
            num_train_epochs=self.num_epochs,
            per_device_train_batch_size=self.batch_size,
            per_device_eval_batch_size=self.batch_size * 2,
            warmup_steps=self.warmup_steps,
            learning_rate=self.learning_rate,
            weight_decay=0.01,
            logging_dir=str(self.output_dir / 'logs'),
            logging_steps=100,
            evaluation_strategy="epoch",
            save_strategy="epoch",
            load_best_model_at_end=True,
            metric_for_best_model="f1",
            greater_is_better=True,
            fp16=self.use_fp16,
            dataloader_drop_last=False,
            save_total_limit=2,
            seed=42,
        )
        
        trainer = Trainer(
            model=self.model,
            args=training_args,
            train_dataset=train_dataset,
            eval_dataset=val_dataset,
            tokenizer=self.tokenizer,
            data_collator=data_collator,
            compute_metrics=self.compute_metrics,
        )
        
        logger.info("Starting training...")
        trainer.train()
        
        logger.info(f"Saving model to {self.output_dir}")
        trainer.save_model(str(self.output_dir))
        self.tokenizer.save_pretrained(str(self.output_dir))
        
        # Save label mapping
        label_map_path = self.output_dir / 'label_mapping.json'
        with open(label_map_path, 'w') as f:
            json.dump({
                'label2id': self.label2id,
                'id2label': self.id2label,
                'labels': self.labels
            }, f, indent=2)
        logger.info(f"Label mapping saved to {label_map_path}")
        
        return trainer
    
    def evaluate_model(self, test_data: Dict, trainer: Trainer = None) -> Dict:
        """Evaluate model on test set"""
        if trainer is None:
            # Load saved model
            self.tokenizer = AutoTokenizer.from_pretrained(str(self.output_dir))
            self.model = AutoModelForSequenceClassification.from_pretrained(str(self.output_dir))
            
            data_collator = DataCollatorWithPadding(tokenizer=self.tokenizer)
            
            trainer = Trainer(
                model=self.model,
                tokenizer=self.tokenizer,
                data_collator=data_collator,
                compute_metrics=self.compute_metrics,
            )
        
        # Create test dataset
        test_dataset = HFDataset.from_dict({
            'context': test_data['contexts'],
            'labels': test_data['labels']
        })
        
        def tokenize_function(examples):
            return self.tokenizer(
                examples['context'],
                padding=False,
                truncation=True,
                max_length=self.max_length
            )
        
        test_dataset = test_dataset.map(tokenize_function, batched=True)
        
        # Evaluate
        test_results = trainer.evaluate(eval_dataset=test_dataset)
        
        # Generate predictions for detailed analysis
        predictions = trainer.predict(test_dataset)
        pred_labels = np.argmax(predictions.predictions, axis=1)
        true_labels = test_data['labels']
        
        # Classification report
        target_names = [self.id2label[i] for i in range(len(self.labels))]
        report = classification_report(
            true_labels, pred_labels, 
            target_names=target_names,
            output_dict=True
        )
        
        # Save detailed results
        results = {
            'test_metrics': test_results,
            'classification_report': report,
            'predictions': pred_labels.tolist(),
            'true_labels': true_labels
        }
        
        results_path = self.output_dir / 'test_results.json'
        with open(results_path, 'w') as f:
            json.dump(results, f, indent=2, default=str)
        
        return results

def main():
    """Main training pipeline"""
    
    # Configuration
    config = {
        'arxiv_file': '/home/ghost/engunity-ai/data/datasets/research-papers/CORNWELL ARXIV/arxiv-metadata-oai-snapshot.json',
        'model_name': 'bert-base-uncased',
        'labels': ['Background', 'Method', 'Comparison', 'Result', 'Other'],
        'max_length': 256,
        'batch_size': 8 if torch.cuda.is_available() else 4,
        'learning_rate': 2e-5,
        'num_epochs': 3,
        'warmup_steps': 500,
        'output_dir': './citation_classifier_arxiv',
        'num_samples': 15000,
        'max_papers': 50000
    }
    
    logger.info("Starting Citation Classifier Training Pipeline")
    logger.info(f"Configuration: {config}")
    
    # Generate training data
    logger.info("=" * 50)
    logger.info("STEP 1: Generating Training Data")
    logger.info("=" * 50)
    
    data_generator = ArXivCitationDataGenerator(config['arxiv_file'])
    contexts, labels = data_generator.generate_training_data(config['num_samples'])
    
    # Initialize classifier
    logger.info("=" * 50)
    logger.info("STEP 2: Initializing Classifier")
    logger.info("=" * 50)
    
    classifier = CitationClassifierArXiv(
        model_name=config['model_name'],
        labels=config['labels'],
        max_length=config['max_length'],
        batch_size=config['batch_size'],
        learning_rate=config['learning_rate'],
        num_epochs=config['num_epochs'],
        warmup_steps=config['warmup_steps'],
        output_dir=config['output_dir']
    )
    
    # Prepare datasets
    logger.info("=" * 50)
    logger.info("STEP 3: Preparing Datasets")
    logger.info("=" * 50)
    
    datasets = classifier.prepare_datasets(contexts, labels)
    
    # Train model
    logger.info("=" * 50)
    logger.info("STEP 4: Training Model")
    logger.info("=" * 50)
    
    trainer = classifier.train(datasets['train'], datasets['val'])
    
    # Evaluate model
    logger.info("=" * 50)
    logger.info("STEP 5: Evaluating Model")
    logger.info("=" * 50)
    
    results = classifier.evaluate_model(datasets['test'], trainer)
    
    # Print results
    logger.info("=" * 60)
    logger.info("TRAINING COMPLETE!")
    logger.info("=" * 60)
    
    test_metrics = results['test_metrics']
    logger.info(f"Test Accuracy: {test_metrics['eval_accuracy']:.4f}")
    logger.info(f"Test F1 Score: {test_metrics['eval_f1']:.4f}")
    logger.info(f"Test Precision: {test_metrics['eval_precision']:.4f}")
    logger.info(f"Test Recall: {test_metrics['eval_recall']:.4f}")
    
    # Per-class results
    logger.info("\nPer-class F1 Scores:")
    for label in config['labels']:
        f1_key = f'eval_f1_{label}'
        if f1_key in test_metrics:
            logger.info(f"  {label}: {test_metrics[f1_key]:.4f}")
    
    logger.info(f"\nModel saved to: {config['output_dir']}")
    logger.info(f"Detailed results saved to: {config['output_dir']}/test_results.json")
    
    return classifier, results

if __name__ == "__main__":
    classifier, results = main()