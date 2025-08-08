"""
Quick Citation Purpose Classifier - Streamlined for Fast Training
"""

import json
import re
import warnings
from pathlib import Path
from typing import Dict, List, Tuple
import numpy as np
import random
from collections import defaultdict

# ML imports
from sklearn.metrics import accuracy_score, classification_report
from sklearn.model_selection import train_test_split
import torch
from transformers import (
    AutoTokenizer,
    AutoModelForSequenceClassification,
    TrainingArguments,
    Trainer,
    EvalPrediction
)
from datasets import Dataset as HFDataset
import logging

# Setup logging
logging.basicConfig(format='%(asctime)s - %(levelname)s - %(message)s', level=logging.INFO)
logger = logging.getLogger(__name__)
warnings.filterwarnings('ignore')

class QuickCitationClassifier:
    """Streamlined Citation Classifier for quick training"""
    
    def __init__(self, 
                 model_name: str = "distilbert-base-uncased",
                 max_length: int = 128,
                 batch_size: int = 16,
                 num_epochs: int = 2,
                 output_dir: str = "./quick_citation_model"):
        
        self.model_name = model_name
        self.labels = ["Background", "Method", "Comparison", "Result", "Other"]
        self.label2id = {label: i for i, label in enumerate(self.labels)}
        self.id2label = {i: label for i, label in enumerate(self.labels)}
        self.max_length = max_length
        self.batch_size = batch_size
        self.num_epochs = num_epochs
        self.output_dir = Path(output_dir)
        
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        logger.info(f"Using device: {self.device}")
        
    def generate_sample_data(self, num_samples=2000):
        """Generate quick sample data for testing"""
        templates = {
            'Background': [
                "Previous work {} established the foundation.",
                "Research {} shows the importance of this approach.",
                "Studies {} have demonstrated the effectiveness.",
            ],
            'Method': [
                "We follow the approach described in {}.",
                "The method from {} is applied with modifications.",
                "Using the framework in {}, we develop our solution.",
            ],
            'Comparison': [
                "Our results outperform {} by 10%.",
                "Compared to {}, our method shows improvement.",
                "Unlike {}, our approach achieves better results.",
            ],
            'Result': [
                "These findings align with {} results.",
                "The outcome supports conclusions in {}.",
                "Results validate the hypothesis from {}.",
            ],
            'Other': [
                "See {} for additional details.",
                "Implementation specifics in {} appendix.",
                "Further information available in {}.",
            ]
        }
        
        contexts = []
        labels = []
        
        samples_per_label = num_samples // len(self.labels)
        
        for label, template_list in templates.items():
            for _ in range(samples_per_label):
                template = random.choice(template_list)
                citation = random.choice(["[Smith et al., 2020]", "[1]", "[Jones, 2019]", "(Johnson, 2021)"])
                context = template.format(citation)
                
                # Add some variation
                if random.random() > 0.5:
                    context += " This approach has shown promising results in preliminary experiments."
                
                contexts.append(context)
                labels.append(label)
        
        return contexts, labels
    
    def compute_metrics(self, eval_pred: EvalPrediction):
        predictions = np.argmax(eval_pred.predictions, axis=1)
        labels = eval_pred.label_ids
        accuracy = accuracy_score(labels, predictions)
        return {'accuracy': accuracy}
    
    def train_quick_model(self):
        """Train a quick model for demonstration"""
        logger.info("Generating sample data...")
        contexts, labels = self.generate_sample_data()
        
        # Convert labels to IDs
        label_ids = [self.label2id[label] for label in labels]
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            contexts, label_ids, test_size=0.2, stratify=label_ids, random_state=42
        )
        
        logger.info(f"Train samples: {len(X_train)}, Test samples: {len(X_test)}")
        
        # Initialize model and tokenizer
        logger.info("Loading model and tokenizer...")
        tokenizer = AutoTokenizer.from_pretrained(self.model_name)
        model = AutoModelForSequenceClassification.from_pretrained(
            self.model_name,
            num_labels=len(self.labels),
            id2label=self.id2label,
            label2id=self.label2id
        )
        
        def tokenize_function(examples):
            return tokenizer(
                examples['text'],
                padding="max_length",
                truncation=True,
                max_length=self.max_length
            )
        
        # Create datasets
        train_dataset = HFDataset.from_dict({'text': X_train, 'labels': y_train})
        test_dataset = HFDataset.from_dict({'text': X_test, 'labels': y_test})
        
        train_dataset = train_dataset.map(tokenize_function, batched=True)
        test_dataset = test_dataset.map(tokenize_function, batched=True)
        
        # Create output directory
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
        # Training arguments - optimized for speed
        training_args = TrainingArguments(
            output_dir=str(self.output_dir),
            num_train_epochs=self.num_epochs,
            per_device_train_batch_size=self.batch_size,
            per_device_eval_batch_size=self.batch_size * 2,
            learning_rate=5e-5,
            warmup_steps=50,
            logging_steps=50,
            evaluation_strategy="epoch",
            save_strategy="epoch",
            load_best_model_at_end=True,
            metric_for_best_model="accuracy",
            fp16=torch.cuda.is_available(),
            save_total_limit=1,
            seed=42,
        )
        
        trainer = Trainer(
            model=model,
            args=training_args,
            train_dataset=train_dataset,
            eval_dataset=test_dataset,
            tokenizer=tokenizer,
            compute_metrics=self.compute_metrics,
        )
        
        logger.info("Starting training...")
        trainer.train()
        
        # Save model
        logger.info(f"Saving model to {self.output_dir}")
        trainer.save_model(str(self.output_dir))
        tokenizer.save_pretrained(str(self.output_dir))
        
        # Save label mapping
        with open(self.output_dir / 'label_mapping.json', 'w') as f:
            json.dump({
                'labels': self.labels,
                'label2id': self.label2id,
                'id2label': self.id2label
            }, f, indent=2)
        
        # Final evaluation
        test_results = trainer.evaluate(eval_dataset=test_dataset)
        
        logger.info("=" * 50)
        logger.info("TRAINING COMPLETE!")
        logger.info(f"Test Accuracy: {test_results['eval_accuracy']:.4f}")
        logger.info(f"Model saved to: {self.output_dir}")
        
        return trainer, test_results

def test_model():
    """Test the trained model"""
    model_path = "./quick_citation_model"
    
    if not Path(model_path).exists():
        logger.error("Model not found. Please train first.")
        return
    
    from transformers import pipeline
    
    classifier = pipeline(
        "text-classification",
        model=model_path,
        device=0 if torch.cuda.is_available() else -1
    )
    
    test_texts = [
        "Previous research [Smith et al., 2020] established the foundation.",
        "We follow the methodology described in [1] for preprocessing.",
        "Our model outperforms [Jones, 2019] by achieving 95% accuracy.",
        "These results align with findings from [2] on similar datasets.",
        "See [3] for additional implementation details."
    ]
    
    logger.info("\nTesting predictions:")
    for i, text in enumerate(test_texts):
        result = classifier(text)[0]
        logger.info(f"{i+1}. {text}")
        logger.info(f"   → {result['label']} ({result['score']:.3f})")

if __name__ == "__main__":
    logger.info("Quick Citation Classifier Training")
    
    # Train model
    classifier = QuickCitationClassifier()
    trainer, results = classifier.train_quick_model()
    
    # Test model
    test_model()