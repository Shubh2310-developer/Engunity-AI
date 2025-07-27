#!/usr/bin/env python3
"""
Domain Mapper for Engunity AI SaaS Modules
========================================

This script maps Computer Science topics to specific Engunity AI SaaS modules
and creates optimized training splits for the RAG system.

Mapping Strategy:
- Programming → Code Assistant
- Algorithms → Research Tools + Code Assistant  
- Data Structures → Data Analysis + Code Assistant
- Software Engineering → Document Q&A + Code Assistant
- Machine Learning → Data Analysis
- Natural Language Processing → Document Q&A + Chat
- Database Systems → Data Analysis
- Web Development → Code Assistant + Notebook
- Computer Networks → Research Tools
- Security → Research Tools + Document Q&A

Usage:
    python backend/data/training/domain_mapper.py

Author: Engunity AI Team
Date: 2025-07-26
"""

import pandas as pd
import numpy as np
import json
import logging
import re
from pathlib import Path
from typing import Dict, List, Tuple, Optional, Set
from collections import defaultdict, Counter
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import warnings
warnings.filterwarnings('ignore')

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('backend/data/training/domain_mapping.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class EngunityDomainMapper:
    """
    Map CS topics to Engunity AI SaaS modules and create training splits
    """
    
    def __init__(self, 
                 processed_data_dir: str = "backend/data/training/processed",
                 output_dir: str = "backend/data/training/processed"):
        """Initialize the domain mapper"""
        self.processed_data_dir = Path(processed_data_dir)
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(exist_ok=True)
        
        # Enhanced CS topic to SaaS module mapping
        self.cs_domain_mappings = {
            'programming_fundamentals': {
                'primary_module': 'code_assistant',
                'secondary_modules': ['notebook'],
                'keywords': [
                    'programming', 'coding', 'syntax', 'variable', 'function', 'class',
                    'method', 'object', 'inheritance', 'polymorphism', 'encapsulation',
                    'debugging', 'compilation', 'interpreter', 'ide', 'editor'
                ],
                'weight': 1.0,
                'description': 'Basic programming concepts and code development'
            },
            'algorithms': {
                'primary_module': 'research_tools',
                'secondary_modules': ['code_assistant', 'data_analysis'],
                'keywords': [
                    'algorithm', 'complexity', 'big o', 'time complexity', 'space complexity',
                    'searching', 'sorting', 'optimization', 'recursive', 'iterative',
                    'greedy', 'divide and conquer', 'dynamic programming', 'backtracking'
                ],
                'weight': 0.9,
                'description': 'Algorithmic thinking and computational efficiency'
            },
            'data_structures': {
                'primary_module': 'data_analysis',
                'secondary_modules': ['code_assistant', 'research_tools'],
                'keywords': [
                    'data structure', 'array', 'list', 'stack', 'queue', 'tree', 'graph',
                    'hash table', 'dictionary', 'linked list', 'binary tree', 'heap',
                    'set', 'map', 'matrix', 'vector', 'collection'
                ],
                'weight': 0.9,
                'description': 'Data organization and manipulation structures'
            },
            'software_engineering': {
                'primary_module': 'document_qa',
                'secondary_modules': ['code_assistant', 'research_tools'],
                'keywords': [
                    'software engineering', 'design pattern', 'architecture', 'framework',
                    'testing', 'unit test', 'integration test', 'documentation', 'requirement',
                    'specification', 'design', 'lifecycle', 'agile', 'scrum', 'version control',
                    'git', 'code review', 'refactoring', 'maintenance'
                ],
                'weight': 0.85,
                'description': 'Software development processes and best practices'
            },
            'machine_learning': {
                'primary_module': 'data_analysis',
                'secondary_modules': ['research_tools', 'notebook'],
                'keywords': [
                    'machine learning', 'deep learning', 'neural network', 'training',
                    'model', 'classification', 'regression', 'clustering', 'supervised',
                    'unsupervised', 'reinforcement learning', 'feature', 'dataset',
                    'cross validation', 'overfitting', 'underfitting', 'gradient descent'
                ],
                'weight': 0.95,
                'description': 'Machine learning algorithms and data science'
            },
            'natural_language_processing': {
                'primary_module': 'document_qa',
                'secondary_modules': ['chat', 'research_tools'],
                'keywords': [
                    'nlp', 'natural language processing', 'text analysis', 'sentiment analysis',
                    'tokenization', 'parsing', 'named entity recognition', 'pos tagging',
                    'text classification', 'language model', 'embedding', 'transformer',
                    'bert', 'gpt', 'text mining', 'information extraction'
                ],
                'weight': 0.95,
                'description': 'Text processing and language understanding'
            },
            'database_systems': {
                'primary_module': 'data_analysis',
                'secondary_modules': ['document_qa', 'code_assistant'],
                'keywords': [
                    'database', 'sql', 'nosql', 'query', 'table', 'index', 'relation',
                    'normalization', 'transaction', 'acid', 'join', 'select', 'insert',
                    'update', 'delete', 'mongodb', 'postgresql', 'mysql', 'data warehouse'
                ],
                'weight': 0.8,
                'description': 'Database design and data management'
            },
            'web_development': {
                'primary_module': 'code_assistant',
                'secondary_modules': ['notebook', 'document_qa'],
                'keywords': [
                    'web development', 'html', 'css', 'javascript', 'frontend', 'backend',
                    'api', 'rest', 'http', 'server', 'client', 'framework', 'react',
                    'angular', 'vue', 'node.js', 'express', 'django', 'flask'
                ],
                'weight': 0.8,
                'description': 'Web application development'
            },
            'computer_networks': {
                'primary_module': 'research_tools',
                'secondary_modules': ['document_qa'],
                'keywords': [
                    'network', 'protocol', 'tcp', 'udp', 'ip', 'routing', 'switching',
                    'ethernet', 'wifi', 'security', 'firewall', 'vpn', 'dns', 'dhcp',
                    'osi model', 'packet', 'bandwidth', 'latency'
                ],
                'weight': 0.7,
                'description': 'Network protocols and distributed systems'
            },
            'computer_security': {
                'primary_module': 'research_tools',
                'secondary_modules': ['document_qa', 'code_assistant'],
                'keywords': [
                    'security', 'cryptography', 'encryption', 'authentication', 'authorization',
                    'vulnerability', 'attack', 'malware', 'firewall', 'intrusion detection',
                    'penetration testing', 'secure coding', 'hash', 'digital signature'
                ],
                'weight': 0.75,
                'description': 'Cybersecurity and secure systems'
            },
            'operating_systems': {
                'primary_module': 'research_tools',
                'secondary_modules': ['code_assistant'],
                'keywords': [
                    'operating system', 'os', 'kernel', 'process', 'thread', 'memory management',
                    'file system', 'scheduling', 'synchronization', 'deadlock', 'virtual memory',
                    'linux', 'windows', 'unix', 'system call'
                ],
                'weight': 0.7,
                'description': 'Operating system concepts and system programming'
            },
            'human_computer_interaction': {
                'primary_module': 'chat',
                'secondary_modules': ['document_qa', 'research_tools'],
                'keywords': [
                    'hci', 'user interface', 'user experience', 'usability', 'interaction design',
                    'accessibility', 'user study', 'prototype', 'wireframe', 'user research',
                    'cognitive science', 'ergonomics'
                ],
                'weight': 0.6,
                'description': 'User interface design and interaction'
            }
        }
        
        # Training split configurations
        self.training_config = {
            'splits': {
                'train': 0.7,
                'validation': 0.15,
                'test': 0.15
            },
            'min_samples_per_module': 50,
            'max_samples_per_module': 5000,
            'quality_weights': {
                'high': 1.0,
                'medium': 0.7,
                'low': 0.3
            },
            'cross_module_overlap': 0.1  # Allow 10% overlap between modules
        }
        
        self.processed_records = []
        self.domain_mappings = {}
        self.training_splits = {}
        self.mapping_stats = {}
    
    def load_processed_data(self) -> bool:
        """Load preprocessed data from the previous step"""
        try:
            logger.info("Loading preprocessed data...")
            
            # Load main processed file
            main_file = self.processed_data_dir / "filtered_qa_pairs.jsonl"
            if not main_file.exists():
                logger.error(f"Processed data file not found: {main_file}")
                logger.info("Please run cs_preprocessor.py first")
                return False
            
            # Load records
            self.processed_records = []
            with open(main_file, 'r', encoding='utf-8') as f:
                for line in f:
                    if line.strip():
                        record = json.loads(line.strip())
                        self.processed_records.append(record)
            
            logger.info(f"Loaded {len(self.processed_records)} processed records")
            
            # Load preprocessing summary for context
            summary_file = self.processed_data_dir / "preprocessing_summary.json"
            if summary_file.exists():
                with open(summary_file, 'r', encoding='utf-8') as f:
                    preprocessing_summary = json.load(f)
                    logger.info(f"Previous processing summary: {preprocessing_summary.get('total_processed', 'unknown')} records")
            
            return True
            
        except Exception as e:
            logger.error(f"Error loading processed data: {str(e)}")
            return False
    
    def analyze_topic_distribution(self) -> Dict:
        """Analyze the distribution of CS topics in the dataset"""
        logger.info("Analyzing CS topic distribution...")
        
        topic_analysis = {
            'topic_counts': defaultdict(int),
            'topic_scores': defaultdict(list),
            'multi_topic_records': 0,
            'topic_examples': defaultdict(list)
        }
        
        for record in self.processed_records:
            question = record.get('question', '').lower()
            answer = record.get('answer', '').lower()
            combined_text = question + " " + answer
            
            # Calculate topic scores for this record
            record_topics = {}
            for topic, config in self.cs_domain_mappings.items():
                score = 0
                
                # Keyword matching with context awareness
                for keyword in config['keywords']:
                    # Exact match
                    if keyword in combined_text:
                        score += 1
                    
                    # Partial match for compound keywords
                    if ' ' in keyword:
                        words = keyword.split()
                        if all(word in combined_text for word in words):
                            score += 0.8
                    
                    # Stemmed/related matches
                    keyword_base = keyword.replace('ing', '').replace('ed', '')
                    if keyword_base in combined_text and keyword_base != keyword:
                        score += 0.5
                
                # Normalize by keyword count and apply weight
                if len(config['keywords']) > 0:
                    normalized_score = (score / len(config['keywords'])) * config['weight']
                    record_topics[topic] = normalized_score
            
            # Find primary topic(s)
            max_score = max(record_topics.values()) if record_topics else 0
            
            if max_score > 0:
                primary_topics = [topic for topic, score in record_topics.items() 
                                if score >= max_score * 0.8]  # Include topics within 80% of max
                
                # Update statistics
                for topic in primary_topics:
                    topic_analysis['topic_counts'][topic] += 1
                    topic_analysis['topic_scores'][topic].append(record_topics[topic])
                    
                    # Collect examples
                    if len(topic_analysis['topic_examples'][topic]) < 3:
                        example = {
                            'question': record['question'][:150] + "..." if len(record['question']) > 150 else record['question'],
                            'score': record_topics[topic],
                            'quality': record.get('quality_tier', 'unknown')
                        }
                        topic_analysis['topic_examples'][topic].append(example)
                
                if len(primary_topics) > 1:
                    topic_analysis['multi_topic_records'] += 1
            
            # Store topic mapping in record
            record['cs_topic_scores'] = record_topics
            record['primary_cs_topics'] = primary_topics if max_score > 0 else []
        
        # Calculate summary statistics
        topic_analysis['total_records_with_topics'] = sum(topic_analysis['topic_counts'].values())
        topic_analysis['avg_scores'] = {
            topic: np.mean(scores) for topic, scores in topic_analysis['topic_scores'].items()
        }
        
        logger.info(f"Topic analysis completed:")
        logger.info(f"  - Records with identified topics: {topic_analysis['total_records_with_topics']}")
        logger.info(f"  - Multi-topic records: {topic_analysis['multi_topic_records']}")
        logger.info(f"  - Top topics: {sorted(topic_analysis['topic_counts'].items(), key=lambda x: x[1], reverse=True)[:5]}")
        
        return dict(topic_analysis)
    
    def create_module_mappings(self) -> Dict:
        """Create mappings from CS topics to SaaS modules"""
        logger.info("Creating CS topic to SaaS module mappings...")
        
        module_mappings = defaultdict(lambda: {
            'records': [],
            'primary_topics': defaultdict(int),
            'quality_distribution': defaultdict(int),
            'avg_relevance_score': 0,
            'total_score': 0
        })
        
        # Map each record to appropriate modules
        for record in self.processed_records:
            primary_topics = record.get('primary_cs_topics', [])
            
            if not primary_topics:
                continue
            
            # Calculate module assignments based on topics
            module_scores = defaultdict(float)
            
            for topic in primary_topics:
                if topic in self.cs_domain_mappings:
                    topic_config = self.cs_domain_mappings[topic]
                    topic_score = record['cs_topic_scores'].get(topic, 0)
                    
                    # Primary module gets full score
                    primary_module = topic_config['primary_module']
                    module_scores[primary_module] += topic_score
                    
                    # Secondary modules get reduced score
                    for secondary_module in topic_config.get('secondary_modules', []):
                        module_scores[secondary_module] += topic_score * 0.5
            
            # Assign to modules above threshold
            threshold = max(module_scores.values()) * 0.3 if module_scores else 0
            
            for module, score in module_scores.items():
                if score >= threshold:
                    # Enhanced record with mapping information
                    enhanced_record = record.copy()
                    enhanced_record['module_assignment_score'] = score
                    enhanced_record['assignment_method'] = 'cs_topic_mapping'
                    enhanced_record['contributing_topics'] = [
                        topic for topic in primary_topics 
                        if self.cs_domain_mappings.get(topic, {}).get('primary_module') == module
                        or module in self.cs_domain_mappings.get(topic, {}).get('secondary_modules', [])
                    ]
                    
                    module_mappings[module]['records'].append(enhanced_record)
                    module_mappings[module]['total_score'] += score
                    module_mappings[module]['quality_distribution'][record.get('quality_tier', 'unknown')] += 1
                    
                    # Track primary topics
                    for topic in primary_topics:
                        module_mappings[module]['primary_topics'][topic] += 1
        
        # Calculate average scores
        for module in module_mappings:
            if module_mappings[module]['records']:
                module_mappings[module]['avg_relevance_score'] = (
                    module_mappings[module]['total_score'] / len(module_mappings[module]['records'])
                )
        
        # Convert to regular dict and log statistics
        module_mappings = dict(module_mappings)
        
        logger.info("Module mapping statistics:")
        for module, data in sorted(module_mappings.items(), key=lambda x: len(x[1]['records']), reverse=True):
            logger.info(f"  {module}: {len(data['records'])} records (avg score: {data['avg_relevance_score']:.2f})")
        
        return module_mappings
    
    def optimize_module_balance(self, module_mappings: Dict) -> Dict:
        """Optimize the balance of records across modules"""
        logger.info("Optimizing module balance...")
        
        optimized_mappings = {}
        
        # Calculate target distributions based on business priorities
        total_records = sum(len(data['records']) for data in module_mappings.values())
        
        target_distributions = {
            'code_assistant': 0.30,    # Highest priority
            'document_qa': 0.25,       # High priority  
            'data_analysis': 0.20,     # High priority
            'research_tools': 0.15,    # Medium priority
            'chat': 0.05,              # Medium priority
            'notebook': 0.03,          # Lower priority
            'blockchain': 0.02         # Lowest priority
        }
        
        # Calculate current vs target distributions
        current_distributions = {
            module: len(data['records']) / total_records 
            for module, data in module_mappings.items()
        }
        
        logger.info("Current vs Target distributions:")
        for module in target_distributions:
            current = current_distributions.get(module, 0)
            target = target_distributions[module]
            status = "✅" if current >= target * 0.8 else "⚠️" if current >= target * 0.5 else "❌"
            logger.info(f"  {module}: {current:.1%} vs {target:.1%} {status}")
        
        # Rebalance based on quality and relevance
        for module, data in module_mappings.items():
            records = data['records'].copy()
            
            # Sort by quality and relevance
            records.sort(key=lambda x: (
                x.get('overall_quality', 0) * 0.7 + 
                x.get('module_assignment_score', 0) * 0.3
            ), reverse=True)
            
            # Apply target limits
            target_count = int(total_records * target_distributions.get(module, 0.05))
            min_count = max(50, target_count // 2)  # Minimum viable dataset
            max_count = min(len(records), max(target_count, 200))  # Don't exceed target too much
            
            # Keep top quality records within limits
            if len(records) > max_count:
                records = records[:max_count]
            elif len(records) < min_count:
                # If insufficient, we'll note this for synthetic data generation
                logger.warning(f"{module}: Only {len(records)} records, need {min_count}")
            
            optimized_mappings[module] = {
                'records': records,
                'original_count': len(data['records']),
                'optimized_count': len(records),
                'target_count': target_count,
                'quality_distribution': self._calculate_quality_distribution(records),
                'avg_quality': np.mean([r.get('overall_quality', 0) for r in records]) if records else 0,
                'avg_relevance': np.mean([r.get('module_assignment_score', 0) for r in records]) if records else 0,
                'top_topics': self._get_top_topics(records),
                'needs_synthetic_data': len(records) < min_count
            }
        
        return optimized_mappings
    
    def _calculate_quality_distribution(self, records: List[Dict]) -> Dict:
        """Calculate quality distribution for a set of records"""
        distribution = defaultdict(int)
        for record in records:
            quality = record.get('quality_tier', 'unknown')
            distribution[quality] += 1
        return dict(distribution)
    
    def _get_top_topics(self, records: List[Dict], top_n: int = 5) -> List[Tuple[str, int]]:
        """Get top CS topics for a set of records"""
        topic_counts = defaultdict(int)
        for record in records:
            for topic in record.get('contributing_topics', []):
                topic_counts[topic] += 1
        
        return sorted(topic_counts.items(), key=lambda x: x[1], reverse=True)[:top_n]
    
    def create_training_splits(self, optimized_mappings: Dict) -> Dict:
        """Create train/validation/test splits for each module"""
        logger.info("Creating training splits...")
        
        training_splits = {}
        
        for module, data in optimized_mappings.items():
            records = data['records']
            
            if len(records) < 10:  # Skip modules with too few records
                logger.warning(f"Skipping {module}: insufficient records ({len(records)})")
                continue
            
            # Stratified split by quality
            quality_groups = defaultdict(list)
            for record in records:
                quality = record.get('quality_tier', 'medium')
                quality_groups[quality].append(record)
            
            # Create splits maintaining quality distribution
            train_records = []
            val_records = []
            test_records = []
            
            for quality, group_records in quality_groups.items():
                np.random.shuffle(group_records)  # Randomize within quality group
                
                n = len(group_records)
                train_end = int(n * self.training_config['splits']['train'])
                val_end = train_end + int(n * self.training_config['splits']['validation'])
                
                train_records.extend(group_records[:train_end])
                val_records.extend(group_records[train_end:val_end])
                test_records.extend(group_records[val_end:])
            
            # Shuffle the final splits
            np.random.shuffle(train_records)
            np.random.shuffle(val_records)
            np.random.shuffle(test_records)
            
            training_splits[module] = {
                'train': train_records,
                'validation': val_records,
                'test': test_records,
                'splits_info': {
                    'total_records': len(records),
                    'train_count': len(train_records),
                    'val_count': len(val_records),
                    'test_count': len(test_records),
                    'train_ratio': len(train_records) / len(records),
                    'val_ratio': len(val_records) / len(records),
                    'test_ratio': len(test_records) / len(records)
                },
                'quality_distribution': {
                    'train': self._calculate_quality_distribution(train_records),
                    'validation': self._calculate_quality_distribution(val_records),
                    'test': self._calculate_quality_distribution(test_records)
                }
            }
        
        logger.info(f"Created training splits for {len(training_splits)} modules")
        return training_splits
    
    def create_cross_module_dataset(self, training_splits: Dict) -> Dict:
        """Create a cross-module dataset for general training"""
        logger.info("Creating cross-module dataset...")
        
        # Collect samples from all modules
        all_train = []
        all_val = []
        all_test = []
        
        for module, splits in training_splits.items():
            # Take a portion from each module for cross-training
            overlap_ratio = self.training_config['cross_module_overlap']
            
            train_sample_size = int(len(splits['train']) * overlap_ratio)
            val_sample_size = int(len(splits['validation']) * overlap_ratio)
            test_sample_size = int(len(splits['test']) * overlap_ratio)
            
            # Sample high-quality records preferentially
            train_sample = sorted(splits['train'], key=lambda x: x.get('overall_quality', 0), reverse=True)[:train_sample_size]
            val_sample = sorted(splits['validation'], key=lambda x: x.get('overall_quality', 0), reverse=True)[:val_sample_size]
            test_sample = sorted(splits['test'], key=lambda x: x.get('overall_quality', 0), reverse=True)[:test_sample_size]
            
            # Mark records with their source module
            for record in train_sample:
                record['source_module'] = module
            for record in val_sample:
                record['source_module'] = module
            for record in test_sample:
                record['source_module'] = module
            
            all_train.extend(train_sample)
            all_val.extend(val_sample)
            all_test.extend(test_sample)
        
        # Shuffle cross-module datasets
        np.random.shuffle(all_train)
        np.random.shuffle(all_val)
        np.random.shuffle(all_test)
        
        cross_module_dataset = {
            'train': all_train,
            'validation': all_val,
            'test': all_test,
            'splits_info': {
                'total_records': len(all_train) + len(all_val) + len(all_test),
                'train_count': len(all_train),
                'val_count': len(all_val),
                'test_count': len(all_test)
            },
            'module_distribution': {
                split: dict(Counter(record['source_module'] for record in records))
                for split, records in [('train', all_train), ('validation', all_val), ('test', all_test)]
            }
        }
        
        logger.info(f"Cross-module dataset: {len(all_train)} train, {len(all_val)} val, {len(all_test)} test")
        return cross_module_dataset
    
    def save_training_datasets(self, training_splits: Dict, cross_module_dataset: Dict) -> bool:
        """Save all training datasets to files"""
        try:
            logger.info("Saving training datasets...")
            
            # Create training directory structure
            training_dir = self.output_dir / "training_ready"
            training_dir.mkdir(exist_ok=True)
            
            # Save module-specific datasets
            for module, splits in training_splits.items():
                module_dir = training_dir / module
                module_dir.mkdir(exist_ok=True)
                
                for split_name, records in splits.items():
                    if split_name not in ['splits_info', 'quality_distribution']:
                        split_file = module_dir / f"{split_name}.jsonl"
                        with open(split_file, 'w', encoding='utf-8') as f:
                            for record in records:
                                f.write(json.dumps(record, ensure_ascii=False) + '\n')
                
                # Save module info
                info_file = module_dir / "split_info.json"
                with open(info_file, 'w', encoding='utf-8') as f:
                    json.dump({
                        'splits_info': splits['splits_info'],
                        'quality_distribution': splits['quality_distribution']
                    }, f, indent=2, ensure_ascii=False)
            
            # Save cross-module dataset
            cross_dir = training_dir / "cross_module"
            cross_dir.mkdir(exist_ok=True)
            
            for split_name, records in cross_module_dataset.items():
                if split_name not in ['splits_info', 'module_distribution']:
                    split_file = cross_dir / f"{split_name}.jsonl"
                    with open(split_file, 'w', encoding='utf-8') as f:
                        for record in records:
                            f.write(json.dumps(record, ensure_ascii=False) + '\n')
            
            # Save cross-module info
            cross_info_file = cross_dir / "split_info.json"
            with open(cross_info_file, 'w', encoding='utf-8') as f:
                json.dump({
                    'splits_info': cross_module_dataset['splits_info'],
                    'module_distribution': cross_module_dataset['module_distribution']
                }, f, indent=2, ensure_ascii=False)
            
            # Save overall mapping summary
            summary = {
                'domain_mapping_summary': {
                    'total_modules': len(training_splits),
                    'total_records_mapped': sum(splits['splits_info']['total_records'] for splits in training_splits.values()),
                    'cross_module_records': cross_module_dataset['splits_info']['total_records'],
                    'cs_topic_mappings': {
                        topic: {
                            'primary_module': config['primary_module'],
                            'secondary_modules': config['secondary_modules'],
                            'description': config['description']
                        }
                        for topic, config in self.cs_domain_mappings.items()
                    }
                },
                'module_statistics': {
                    module: splits['splits_info'] for module, splits in training_splits.items()
                },
                'processing_metadata': {
                    'mapping_timestamp': pd.Timestamp.now().isoformat(),
                    'mapping_version': '1.0',
                    'training_config': self.training_config
                }
            }
            
            summary_file = training_dir / "domain_mapping_summary.json"
            with open(summary_file, 'w', encoding='utf-8') as f:
                json.dump(summary, f, indent=2, ensure_ascii=False, default=str)
            
            # Create training configuration files
            self._create_training_configs(training_dir, training_splits)
            
            logger.info(f"Training datasets saved to {training_dir}")
            logger.info(f"Module datasets: {len(training_splits)} modules")
            logger.info(f"Cross-module dataset: 1 unified dataset")
            
            return True
            
        except Exception as e:
            logger.error(f"Error saving training datasets: {str(e)}")
            return False
    
    def _create_training_configs(self, training_dir: Path, training_splits: Dict):
        """Create training configuration files for each module"""
        config_dir = training_dir / "configs"
        config_dir.mkdir(exist_ok=True)
        
        # Base training configuration
        base_config = {
            'model_config': {
                'embedding_model': 'sentence-transformers/all-MiniLM-L6-v2',
                'max_seq_length': 512,
                'batch_size': 32,
                'learning_rate': 2e-5,
                'num_epochs': 3,
                'warmup_steps': 100
            },
            'data_config': {
                'max_question_length': 200,
                'max_answer_length': 800,
                'train_batch_size': 16,
                'eval_batch_size': 32
            },
            'training_config': {
                'gradient_accumulation_steps': 2,
                'max_grad_norm': 1.0,
                'weight_decay': 0.01,
                'adam_epsilon': 1e-8,
                'save_steps': 500,
                'eval_steps': 500,
                'logging_steps': 100
            }
        }
        
        # Module-specific configurations
        for module, splits in training_splits.items():
            module_config = base_config.copy()
            
            # Adjust based on module characteristics
            if module == 'code_assistant':
                module_config['data_config']['max_answer_length'] = 1200  # Code can be longer
                module_config['model_config']['batch_size'] = 16  # Smaller batch for longer sequences
            elif module == 'data_analysis':
                module_config['model_config']['num_epochs'] = 4  # More epochs for complex data patterns
            elif module == 'document_qa':
                module_config['data_config']['max_answer_length'] = 600  # Moderate length answers
            
            # Add module-specific metadata
            module_config['module_info'] = {
                'module_name': module,
                'total_samples': splits['splits_info']['total_records'],
                'train_samples': splits['splits_info']['train_count'],
                'val_samples': splits['splits_info']['val_count'],
                'test_samples': splits['splits_info']['test_count'],
                'quality_distribution': splits['quality_distribution']['train']
            }
            
            # Save module config
            config_file = config_dir / f"{module}_training_config.json"
            with open(config_file, 'w', encoding='utf-8') as f:
                json.dump(module_config, f, indent=2, ensure_ascii=False)
        
        # Save base config
        base_config_file = config_dir / "base_training_config.json"
        with open(base_config_file, 'w', encoding='utf-8') as f:
            json.dump(base_config, f, indent=2, ensure_ascii=False)
    
    def generate_mapping_report(self, topic_analysis: Dict, optimized_mappings: Dict, 
                               training_splits: Dict) -> str:
        """Generate comprehensive domain mapping report"""
        report = []
        report.append("# CS Domain Mapping Report for Engunity AI")
        report.append(f"Generated on: {pd.Timestamp.now().strftime('%Y-%m-%d %H:%M:%S')}")
        report.append("")
        
        # Executive Summary
        report.append("## Executive Summary")
        total_mapped = sum(len(data['records']) for data in optimized_mappings.values())
        total_training_ready = sum(splits['splits_info']['total_records'] for splits in training_splits.values())
        
        report.append(f"- **Total Records Processed:** {len(self.processed_records):,}")
        report.append(f"- **Records Successfully Mapped:** {total_mapped:,}")
        report.append(f"- **Training-Ready Datasets:** {len(training_splits)} modules")
        report.append(f"- **Total Training Records:** {total_training_ready:,}")
        report.append(f"- **Mapping Success Rate:** {(total_mapped/len(self.processed_records)*100):.1f}%")
        report.append("")
        
        # CS Topic Analysis
        report.append("## CS Topic Distribution")
        report.append("### Identified Topics")
        
        sorted_topics = sorted(topic_analysis['topic_counts'].items(), key=lambda x: x[1], reverse=True)
        for topic, count in sorted_topics:
            percentage = (count / topic_analysis['total_records_with_topics']) * 100
            description = self.cs_domain_mappings.get(topic, {}).get('description', 'No description')
            report.append(f"- **{topic.replace('_', ' ').title()}:** {count:,} records ({percentage:.1f}%) - {description}")
        
        report.append("")
        
        # Module Mapping Results
        report.append("## SaaS Module Mapping Results")
        
        for module in ['code_assistant', 'document_qa', 'data_analysis', 'research_tools', 'chat', 'notebook', 'blockchain']:
            if module in optimized_mappings:
                data = optimized_mappings[module]
                report.append(f"### {module.replace('_', ' ').title()}")
                report.append(f"- **Records:** {data['optimized_count']:,} (originally {data['original_count']:,})")
                report.append(f"- **Average Quality:** {data['avg_quality']:.2f}")
                report.append(f"- **Average Relevance:** {data['avg_relevance']:.2f}")
                report.append(f"- **Needs Synthetic Data:** {'Yes' if data['needs_synthetic_data'] else 'No'}")
                
                # Quality breakdown
                quality_dist = data['quality_distribution']
                report.append(f"- **Quality Distribution:** High: {quality_dist.get('high', 0)}, Medium: {quality_dist.get('medium', 0)}, Low: {quality_dist.get('low', 0)}")
                
                # Top topics
                if data['top_topics']:
                    top_topics_str = ", ".join([f"{topic} ({count})" for topic, count in data['top_topics'][:3]])
                    report.append(f"- **Top Topics:** {top_topics_str}")
                
                report.append("")
        
        # Training Split Analysis
        report.append("## Training Dataset Analysis")
        
        for module, splits in training_splits.items():
            info = splits['splits_info']
            report.append(f"### {module.replace('_', ' ').title()}")
            report.append(f"- **Total Records:** {info['total_records']:,}")
            report.append(f"- **Train:** {info['train_count']:,} ({info['train_ratio']:.1%})")
            report.append(f"- **Validation:** {info['val_count']:,} ({info['val_ratio']:.1%})")
            report.append(f"- **Test:** {info['test_count']:,} ({info['test_ratio']:.1%})")
            report.append("")
        
        # Recommendations
        report.append("## Recommendations")
        
        report.append("### High Priority Actions")
        for module, data in optimized_mappings.items():
            if data['needs_synthetic_data']:
                deficit = 200 - data['optimized_count']  # Assuming 200 is minimum viable
                report.append(f"- **{module.replace('_', ' ').title()}:** Generate ~{deficit} synthetic Q&A pairs")
        
        report.append("")
        report.append("### Training Strategy")
        
        # Recommend training order based on data availability and priority
        training_priority = []
        for module, splits in training_splits.items():
            record_count = splits['splits_info']['total_records']
            if record_count >= 200:
                training_priority.append((module, record_count, 'ready'))
            elif record_count >= 100:
                training_priority.append((module, record_count, 'limited'))
            else:
                training_priority.append((module, record_count, 'insufficient'))
        
        # Sort by readiness and count
        training_priority.sort(key=lambda x: (x[2] == 'ready', x[1]), reverse=True)
        
        report.append("**Phase 1 (Ready for Training):**")
        for module, count, status in training_priority:
            if status == 'ready':
                report.append(f"- {module.replace('_', ' ').title()} ({count:,} records)")
        
        report.append("")
        report.append("**Phase 2 (After Synthetic Data Generation):**")
        for module, count, status in training_priority:
            if status in ['limited', 'insufficient']:
                report.append(f"- {module.replace('_', ' ').title()} ({count:,} records, needs augmentation)")
        
        report.append("")
        report.append("### Next Steps")
        report.append("1. **Start embedding training** with Phase 1 modules")
        report.append("2. **Generate synthetic data** for under-represented modules")
        report.append("3. **Implement cross-module training** for general knowledge")
        report.append("4. **Set up evaluation metrics** for each module")
        report.append("5. **Begin RAG system integration** with trained embeddings")
        
        return "\n".join(report)
    
    def run_domain_mapping_pipeline(self) -> bool:
        """Run the complete domain mapping pipeline"""
        logger.info("🚀 Starting CS domain mapping pipeline for Engunity AI...")
        
        try:
            # Step 1: Load processed data
            if not self.load_processed_data():
                return False
            
            # Step 2: Analyze topic distribution
            logger.info("Step 1: Analyzing CS topic distribution...")
            topic_analysis = self.analyze_topic_distribution()
            
            # Step 3: Create module mappings
            logger.info("Step 2: Mapping CS topics to SaaS modules...")
            module_mappings = self.create_module_mappings()
            
            # Step 4: Optimize module balance
            logger.info("Step 3: Optimizing module balance...")
            optimized_mappings = self.optimize_module_balance(module_mappings)
            
            # Step 5: Create training splits
            logger.info("Step 4: Creating training splits...")
            training_splits = self.create_training_splits(optimized_mappings)
            
            # Step 6: Create cross-module dataset
            logger.info("Step 5: Creating cross-module dataset...")
            cross_module_dataset = self.create_cross_module_dataset(training_splits)
            
            # Step 7: Save training datasets
            logger.info("Step 6: Saving training datasets...")
            if not self.save_training_datasets(training_splits, cross_module_dataset):
                return False
            
            # Step 8: Generate comprehensive report
            logger.info("Step 7: Generating mapping report...")
            report = self.generate_mapping_report(topic_analysis, optimized_mappings, training_splits)
            
            report_file = self.output_dir / "domain_mapping_report.md"
            with open(report_file, 'w', encoding='utf-8') as f:
                f.write(report)
            
            # Step 9: Print summary
            self._print_pipeline_summary(optimized_mappings, training_splits, cross_module_dataset)
            
            logger.info("✅ Domain mapping pipeline completed successfully!")
            return True
            
        except Exception as e:
            logger.error(f"❌ Domain mapping pipeline failed: {str(e)}")
            return False
    
    def _print_pipeline_summary(self, optimized_mappings: Dict, training_splits: Dict, cross_module_dataset: Dict):
        """Print comprehensive pipeline summary"""
        print("\n" + "="*80)
        print("🎯 ENGUNITY DOMAIN MAPPING SUMMARY")
        print("="*80)
        
        # Processing Overview
        total_mapped = sum(len(data['records']) for data in optimized_mappings.values())
        total_training = sum(splits['splits_info']['total_records'] for splits in training_splits.values())
        
        print(f"\n📊 MAPPING OVERVIEW:")
        print(f"   Original Records: {len(self.processed_records):,}")
        print(f"   Successfully Mapped: {total_mapped:,}")
        print(f"   Training-Ready: {total_training:,}")
        print(f"   Success Rate: {(total_mapped/len(self.processed_records)*100):.1f}%")
        
        # Module Distribution
        print(f"\n🎯 MODULE DISTRIBUTION:")
        print("   Module                  Records    Train/Val/Test    Status")
        print("   " + "-"*55)
        
        for module in ['code_assistant', 'document_qa', 'data_analysis', 'research_tools', 'chat', 'notebook', 'blockchain']:
            if module in training_splits:
                splits = training_splits[module]
                info = splits['splits_info']
                
                # Status determination
                if info['total_records'] >= 200:
                    status = "✅ Ready"
                elif info['total_records'] >= 100:
                    status = "⚠️  Limited"
                else:
                    status = "❌ Need Synthetic"
                
                print(f"   {module.replace('_', ' ').title():<22} {info['total_records']:>6,}    {info['train_count']:>4}/{info['val_count']:>3}/{info['test_count']:>4}      {status}")
            else:
                print(f"   {module.replace('_', ' ').title():<22}      0        0/0/0        ❌ No Data")
        
        # Training Readiness
        ready_modules = [m for m, s in training_splits.items() if s['splits_info']['total_records'] >= 200]
        limited_modules = [m for m, s in training_splits.items() if 100 <= s['splits_info']['total_records'] < 200]
        insufficient_modules = [m for m, s in training_splits.items() if s['splits_info']['total_records'] < 100]
        
        print(f"\n🚀 TRAINING READINESS:")
        if ready_modules:
            print(f"   ✅ Ready for Training ({len(ready_modules)}): {', '.join(ready_modules)}")
        if limited_modules:
            print(f"   ⚠️  Limited Data ({len(limited_modules)}): {', '.join(limited_modules)}")
        if insufficient_modules:
            print(f"   ❌ Need Synthetic ({len(insufficient_modules)}): {', '.join(insufficient_modules)}")
        
        # Cross-Module Dataset
        cross_info = cross_module_dataset['splits_info']
        print(f"\n🔄 CROSS-MODULE DATASET:")
        print(f"   Total Records: {cross_info['total_records']:,}")
        print(f"   Train/Val/Test: {cross_info['train_count']}/{cross_info['val_count']}/{cross_info['test_count']}")
        
        # Quality Analysis
        print(f"\n🏆 QUALITY OVERVIEW:")
        all_records = []
        for data in optimized_mappings.values():
            all_records.extend(data['records'])
        
        if all_records:
            high_quality = sum(1 for r in all_records if r.get('quality_tier') == 'high')
            medium_quality = sum(1 for r in all_records if r.get('quality_tier') == 'medium')
            low_quality = sum(1 for r in all_records if r.get('quality_tier') == 'low')
            
            total_quality = high_quality + medium_quality + low_quality
            print(f"   🔥 High Quality: {high_quality:,} ({high_quality/total_quality*100:.1f}%)")
            print(f"   ⚡ Medium Quality: {medium_quality:,} ({medium_quality/total_quality*100:.1f}%)")
            print(f"   📌 Low Quality: {low_quality:,} ({low_quality/total_quality*100:.1f}%)")
        
        # File Structure
        print(f"\n📁 TRAINING FILES CREATED:")
        print(f"   📊 Module Datasets: {len(training_splits)} directories")
        print(f"   🔄 Cross-Module Dataset: 1 directory")
        print(f"   ⚙️  Training Configs: {len(training_splits) + 1} files")
        print(f"   📋 Reports: domain_mapping_report.md")
        
        # Next Steps
        print(f"\n🔄 IMMEDIATE NEXT STEPS:")
        if ready_modules:
            print(f"   1. Start embedding training with: {ready_modules[0]}")
            print(f"   2. Set up evaluation pipeline")
        if limited_modules or insufficient_modules:
            print(f"   3. Generate synthetic data for: {', '.join(limited_modules + insufficient_modules)}")
        print(f"   4. Review domain_mapping_report.md for detailed analysis")
        print(f"   5. Begin RAG system integration")
        
        print("="*80)


def main():
    """Main execution function"""
    import argparse
    import sys
    
    parser = argparse.ArgumentParser(description='Map CS topics to Engunity AI SaaS modules')
    parser.add_argument(
        '--processed-data-dir',
        default='backend/data/training/processed',
        help='Directory containing preprocessed data'
    )
    parser.add_argument(
        '--output-dir',
        default='backend/data/training/processed',
        help='Directory to save domain mapping outputs'
    )
    parser.add_argument(
        '--min-samples',
        type=int,
        default=50,
        help='Minimum samples per module for training'
    )
    parser.add_argument(
        '--cross-module-overlap',
        type=float,
        default=0.1,
        help='Fraction of data to include in cross-module dataset (0.0-1.0)'
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
    
    # Initialize domain mapper
    mapper = EngunityDomainMapper(
        processed_data_dir=args.processed_data_dir,
        output_dir=args.output_dir
    )
    
    # Update configuration
    mapper.training_config['min_samples_per_module'] = args.min_samples
    mapper.training_config['cross_module_overlap'] = args.cross_module_overlap
    
    # Run domain mapping
    success = mapper.run_domain_mapping_pipeline()
    
    if success:
        print(f"\n✅ Domain mapping completed successfully!")
        print(f"📁 Training datasets saved to: {mapper.output_dir}/training_ready/")
        print(f"📋 Report saved to: {mapper.output_dir}/domain_mapping_report.md")
        sys.exit(0)
    else:
        print(f"\n❌ Domain mapping failed. Check logs for details.")
        sys.exit(1)


if __name__ == "__main__":
    main()