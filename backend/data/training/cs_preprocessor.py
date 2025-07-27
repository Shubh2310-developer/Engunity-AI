#!/usr/bin/env python3
"""
CS Dataset Preprocessor for Engunity AI
=====================================

This script cleans, standardizes, and filters the Computer Science Q&A dataset
for optimal RAG training with Engunity AI's SaaS modules.

Features:
- Cleans and standardizes Q&A format
- Filters relevant questions for SaaS domains
- Extracts technical terms and code snippets
- Removes duplicates and low-quality content
- Creates module-specific training splits

Usage:
    python backend/data/training/cs_preprocessor.py

Author: Engunity AI Team
Date: 2025-07-26
"""

import pandas as pd
import numpy as np
import json
import logging
import re
import html
import unicodedata
from pathlib import Path
from typing import Dict, List, Tuple, Optional, Set
from collections import defaultdict, Counter
import warnings
warnings.filterwarnings('ignore')

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('backend/data/training/preprocessing.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class EngunityCSPreprocessor:
    """
    Preprocess CS dataset for Engunity AI RAG training
    """
    
    def __init__(self, 
                 input_path: str = "backend/data/training/kaggle_cs_dataset/train_reduced.csv",
                 output_dir: str = "backend/data/training/processed"):
        """Initialize the preprocessor"""
        self.input_path = Path(input_path)
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(exist_ok=True)
        
        # Quality thresholds
        self.min_question_length = 10  # words
        self.min_answer_length = 15    # words
        self.max_question_length = 500 # words
        self.max_answer_length = 2000  # words
        self.similarity_threshold = 0.85  # for duplicate detection
        
        # Engunity module definitions with expanded keywords
        self.engunity_modules = {
            'code_assistant': {
                'keywords': [
                    # Programming languages
                    'python', 'javascript', 'java', 'c++', 'cpp', 'c#', 'csharp', 'go', 'rust', 'kotlin',
                    'swift', 'php', 'ruby', 'scala', 'typescript', 'html', 'css', 'sql', 'r', 'matlab',
                    # Programming concepts
                    'algorithm', 'data structure', 'programming', 'code', 'coding', 'function', 'class',
                    'variable', 'loop', 'recursion', 'debugging', 'syntax', 'compilation', 'interpreter',
                    'ide', 'framework', 'library', 'api', 'sdk', 'version control', 'git', 'github',
                    # Code operations
                    'implement', 'write code', 'debug', 'test', 'refactor', 'optimize', 'compile',
                    'execute', 'run program', 'error handling', 'exception', 'memory management'
                ],
                'negative_keywords': ['theory only', 'mathematical proof', 'formal verification'],
                'priority': 'high',
                'target_percentage': 25
            },
            'document_qa': {
                'keywords': [
                    'documentation', 'text analysis', 'information retrieval', 'search', 'query',
                    'document', 'parsing', 'extraction', 'nlp', 'natural language processing',
                    'text mining', 'information extraction', 'semantic search', 'indexing',
                    'content analysis', 'text classification', 'sentiment analysis', 'summarization',
                    'question answering', 'reading comprehension', 'text understanding',
                    # Expanded keywords for better coverage
                    'text', 'string', 'file', 'read', 'write', 'pdf', 'csv', 'json', 'xml',
                    'regex', 'regular expression', 'word', 'sentence', 'paragraph', 'format',
                    'encode', 'decode', 'unicode', 'ascii', 'tokenize', 'stemming', 'lemmatization'
                ],
                'negative_keywords': ['image processing', 'computer vision', 'audio processing'],
                'priority': 'high',
                'target_percentage': 20
            },
            'data_analysis': {
                'keywords': [
                    'data', 'statistics', 'visualization', 'dataset', 'analysis', 'machine learning',
                    'ml', 'ai', 'artificial intelligence', 'model', 'training', 'neural network',
                    'deep learning', 'classification', 'regression', 'clustering', 'data mining',
                    'big data', 'data science', 'pandas', 'numpy', 'scipy', 'matplotlib', 'seaborn',
                    'scikit-learn', 'tensorflow', 'pytorch', 'data visualization', 'exploratory data analysis',
                    'feature engineering', 'cross validation', 'hyperparameter tuning'
                ],
                'negative_keywords': ['pure mathematics', 'theoretical physics'],
                'priority': 'high',
                'target_percentage': 20
            },
            'research_tools': {
                'keywords': [
                    'research', 'academic', 'paper', 'study', 'methodology', 'evaluation',
                    'comparison', 'survey', 'literature review', 'citation', 'bibliography',
                    'scholarly', 'publication', 'peer review', 'conference', 'journal',
                    'experimental design', 'hypothesis', 'validation', 'analysis',
                    'systematic review', 'meta-analysis', 'research methodology'
                ],
                'negative_keywords': ['implementation only', 'coding tutorial'],
                'priority': 'medium',
                'target_percentage': 15
            },
            'chat': {
                'keywords': [
                    'conversation', 'dialogue', 'chat', 'interaction', 'communication',
                    'natural language', 'conversational ai', 'chatbot', 'virtual assistant',
                    'question answering', 'response generation', 'dialogue system',
                    'conversational interface', 'human computer interaction',
                    # Expanded keywords for better coverage
                    'user input', 'user interface', 'ui', 'ux', 'interactive', 'prompt',
                    'response', 'reply', 'message', 'help', 'explain', 'tutorial',
                    'example', 'how to', 'what is', 'why', 'when', 'where'
                ],
                'negative_keywords': ['network protocols', 'low-level communication'],
                'priority': 'medium',
                'target_percentage': 10
            },
            'notebook': {
                'keywords': [
                    'jupyter', 'notebook', 'interactive', 'execution', 'scripting',
                    'development environment', 'code cell', 'markdown', 'visualization',
                    'data exploration', 'prototyping', 'ipython', 'kernel'
                ],
                'negative_keywords': ['production deployment', 'server configuration'],
                'priority': 'medium',
                'target_percentage': 5
            },
            'blockchain': {
                'keywords': [
                    'blockchain', 'smart contract', 'cryptocurrency', 'web3', 'ethereum',
                    'solidity', 'defi', 'nft', 'consensus', 'distributed ledger',
                    'cryptography', 'hash function', 'digital signature', 'mining',
                    'proof of work', 'proof of stake', 'decentralized', 'dapp',
                    # Expanded keywords for better coverage
                    'bitcoin', 'crypto', 'wallet', 'token', 'coin', 'transaction',
                    'merkle tree', 'block', 'chain', 'node', 'network', 'peer',
                    'security', 'encryption', 'hash', 'sha256', 'address'
                ],
                'negative_keywords': ['centralized database', 'traditional finance'],
                'priority': 'low',
                'target_percentage': 5
            }
        }
        
        # Technical term patterns
        self.technical_patterns = {
            'code_snippets': [
                r'```[\s\S]*?```',  # Code blocks
                r'`[^`\n]+`',       # Inline code
                r'\b(?:def|class|function|var|let|const|if|for|while|import|from)\b',  # Keywords
                r'\b[a-zA-Z_][a-zA-Z0-9_]*\([^)]*\)',  # Function calls
                r'\b[A-Z][a-zA-Z0-9]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*',  # Class names
            ],
            'algorithms': [
                r'\b(?:algorithm|sort|search|tree|graph|hash|dynamic programming)\b',
                r'\b(?:O\([^)]+\))',  # Big O notation
                r'\b(?:binary search|merge sort|quick sort|heap|stack|queue)\b'
            ],
            'data_structures': [
                r'\b(?:array|list|dictionary|hash table|linked list|tree|graph)\b',
                r'\b(?:stack|queue|heap|set|map|vector|matrix)\b'
            ],
            'ml_terms': [
                r'\b(?:neural network|deep learning|machine learning|regression|classification)\b',
                r'\b(?:training|validation|test|accuracy|precision|recall|f1-score)\b',
                r'\b(?:supervised|unsupervised|reinforcement learning)\b'
            ]
        }
        
        # Quality indicators
        self.quality_indicators = {
            'positive': [
                'example', 'step by step', 'detailed explanation', 'best practice',
                'comparison', 'pros and cons', 'use case', 'practical', 'real world'
            ],
            'negative': [
                'unclear', 'confusing', 'incomplete', 'wrong', 'error', 'mistake',
                'spam', 'advertisement', 'off topic', 'irrelevant'
            ]
        }
        
        self.df = None
        self.processed_data = {}
        self.stats = {
            'original_count': 0,
            'after_cleaning': 0,
            'after_filtering': 0,
            'after_deduplication': 0,
            'final_count': 0,
            'module_distribution': {},
            'quality_stats': {}
        }
    
    def load_dataset(self) -> bool:
        """Load the CS dataset"""
        try:
            logger.info(f"Loading dataset from {self.input_path}")
            
            if not self.input_path.exists():
                logger.error(f"Dataset file not found: {self.input_path}")
                return False
            
            # Use csv reader instead of pandas to avoid compatibility issues
            import csv
            rows = []
            headers = None
            
            with open(self.input_path, 'r', encoding='utf-8', errors='ignore') as f:
                reader = csv.reader(f)
                headers = next(reader)
                for row in reader:
                    if len(row) == len(headers):  # Only keep complete rows
                        rows.append(row)
            
            # Store as simple data structure to avoid numpy issues
            self.data = {
                'headers': headers,
                'rows': rows
            }
            # Create a minimal pandas-like interface
            class SimpleDF:
                def __init__(self, data, headers):
                    self.data = data
                    self.headers = headers
                    self.columns = headers
                
                def __len__(self):
                    return len(self.data)
                
                def iloc(self, idx):
                    return dict(zip(self.headers, self.data[idx]))
                
                def iterrows(self):
                    for i, row in enumerate(self.data):
                        yield i, dict(zip(self.headers, row))
                
                def to_dict(self, orient='records'):
                    return [dict(zip(self.headers, row)) for row in self.data]
                
                
                def dropna(self, subset=None):
                    """Simple dropna implementation"""
                    if subset is None:
                        return self
                    
                    # Filter out rows where any of the subset columns are empty
                    filtered_rows = []
                    subset_indices = [self.headers.index(col) for col in subset if col in self.headers]
                    
                    for row in self.data:
                        if all(row[idx] and row[idx].strip() for idx in subset_indices):
                            filtered_rows.append(row)
                    
                    return SimpleDF(filtered_rows, self.headers)
                
                def copy(self):
                    """Simple copy implementation"""
                    return SimpleDF(self.data.copy(), self.headers.copy())
                
                def drop_duplicates(self, subset=None):
                    """Simple drop_duplicates implementation"""
                    if subset is None:
                        return self
                    
                    # Remove duplicates based on subset columns
                    seen = set()
                    unique_rows = []
                    subset_indices = [self.headers.index(col) for col in subset if col in self.headers]
                    
                    for row in self.data:
                        # Create a key from subset columns
                        key = tuple(row[idx] for idx in subset_indices)
                        if key not in seen:
                            seen.add(key)
                            unique_rows.append(row)
                    
                    return SimpleDF(unique_rows, self.headers)
                
                def reset_index(self, drop=True):
                    """Simple reset_index implementation"""
                    return self
                
                def groupby(self, column):
                    """Simple groupby implementation"""
                    return SimpleGroupBy(self, column)
                
                @property
                def index(self):
                    """Return a simple index"""
                    return list(range(len(self.data)))
                
                @property
                def loc(self):
                    """Simple loc implementation"""
                    return self
                
                def __getitem__(self, key):
                    """Enhanced getitem for loc operations"""
                    if isinstance(key, list):
                        # Return filtered dataframe with specific indices
                        filtered_rows = [self.data[i] for i in key if i < len(self.data)]
                        return SimpleDF(filtered_rows, self.headers)
                    elif isinstance(key, str) and key in self.headers:
                        # Return column data as a SimpleSeries
                        col_idx = self.headers.index(key)
                        values = [row[col_idx] for row in self.data]
                        return SimpleSeries(values, self)
                    return None
                
                def __setitem__(self, key, value):
                    """Set column data"""
                    if key in self.headers:
                        col_idx = self.headers.index(key)
                        for i, val in enumerate(value):
                            if i < len(self.data):
                                row = list(self.data[i])
                                row[col_idx] = val
                                self.data[i] = row
                    else:
                        # Add new column
                        self.headers.append(key)
                        for i, val in enumerate(value):
                            if i < len(self.data):
                                self.data[i].append(val)
            
            class SimpleGroupBy:
                def __init__(self, df, column):
                    self.df = df
                    self.column = column
                    self._groups = {}
                    col_idx = df.headers.index(column)
                    for i, row in enumerate(df.data):
                        key = row[col_idx]
                        if key not in self._groups:
                            self._groups[key] = []
                        self._groups[key].append(i)
                
                def __iter__(self):
                    """Iterate over groups"""
                    for key, indices in self._groups.items():
                        group_data = [self.df.data[i] for i in indices]
                        group_df = SimpleDF(group_data, self.df.headers)
                        yield key, group_df
            
            class SimpleSeries:
                def __init__(self, values, parent_df):
                    self.values = values
                    self.parent_df = parent_df
                
                def __iter__(self):
                    """Make the series iterable"""
                    return iter(self.values)
                
                def __len__(self):
                    """Return length of series"""
                    return len(self.values)
                
                def __getitem__(self, index):
                    """Allow indexing"""
                    return self.values[index]
                
                def dropna(self):
                    """Remove NaN values"""
                    filtered = [v for v in self.values if v is not None and str(v).strip()]
                    return SimpleSeries(filtered, self.parent_df)
                
                def astype(self, dtype):
                    """Convert to specified type"""
                    if dtype == str:
                        converted = [str(v) if v is not None else '' for v in self.values]
                        return SimpleSeries(converted, self.parent_df)
                    return self
                
                def head(self, n=5):
                    """Return first n values"""
                    return SimpleSeries(self.values[:n], self.parent_df)
                
                def count(self, pattern):
                    """Count occurrences of pattern in each value"""
                    counts = [str(v).count(pattern) if v is not None else 0 for v in self.values]
                    return SimpleSeries(counts, self.parent_df)
                
                def mean(self):
                    """Calculate mean of numeric values"""
                    numeric_values = []
                    for v in self.values:
                        try:
                            numeric_values.append(float(v))
                        except (ValueError, TypeError):
                            continue
                    return sum(numeric_values) / len(numeric_values) if numeric_values else 0
                
                def idxmax(self):
                    """Return index of maximum value"""
                    if not self.values:
                        return None
                    max_val = max(self.values)
                    return self.values.index(max_val)
                
                @property
                def str(self):
                    """String operations"""
                    return SimpleStringAccessor(self)
            
            class SimpleStringAccessor:
                def __init__(self, series):
                    self.series = series
                
                def lower(self):
                    """Convert to lowercase"""
                    values = [str(v).lower() if v is not None else '' for v in self.series.values]
                    return SimpleSeries(values, self.series.parent_df)
                
                def replace(self, pattern, replacement, regex=False):
                    """Replace patterns"""
                    if regex:
                        import re
                        values = [re.sub(pattern, replacement, str(v)) if v is not None else '' for v in self.series.values]
                    else:
                        values = [str(v).replace(pattern, replacement) if v is not None else '' for v in self.series.values]
                    return SimpleSeries(values, self.series.parent_df)
                
                def len(self):
                    """Get length of each string value"""
                    lengths = [len(str(v)) if v is not None else 0 for v in self.series.values]
                    return SimpleSeries(lengths, self.series.parent_df)
                
                def count(self, pattern):
                    """Count occurrences of pattern in each string"""
                    counts = [str(v).count(pattern) if v is not None else 0 for v in self.series.values]
                    return SimpleSeries(counts, self.series.parent_df)
            
            self.df = SimpleDF(rows, headers)
            logger.info(f"Successfully loaded with csv reader")
            
            self.stats['original_count'] = len(self.df)
            logger.info(f"Loaded {len(self.df)} records with {len(self.df.columns)} columns")
            logger.info(f"Columns: {list(self.df.columns)}")
            
            return True
            
        except Exception as e:
            logger.error(f"Error loading dataset: {str(e)}")
            return False
    
    def detect_qa_columns(self) -> Tuple[Optional[str], Optional[str]]:
        """Auto-detect question and answer columns"""
        logger.info("Auto-detecting question and answer columns...")
        
        columns = list(self.df.columns)
        question_col = None
        answer_col = None
        
        # Look for obvious column names
        for col in columns:
            col_lower = col.lower()
            if any(keyword in col_lower for keyword in ['question', 'query', 'q', 'problem', 'ask']):
                if question_col is None:
                    question_col = col
            elif any(keyword in col_lower for keyword in ['answer', 'response', 'solution', 'a', 'reply']):
                if answer_col is None:
                    answer_col = col
        
        # If not found, analyze content
        if question_col is None or answer_col is None:
            text_columns = []
            for col in columns:
                try:
                    sample_data = self.df[col].dropna().astype(str).head(100)
                    if len(sample_data) > 0:
                        avg_length = sample_data.str.len().mean()
                        question_indicators = sample_data.str.count(r'\?').mean()
                        
                        if avg_length > 20:  # Meaningful text
                            text_columns.append({
                                'column': col,
                                'avg_length': avg_length,
                                'question_indicators': question_indicators
                            })
                except:
                    # Skip columns that can't be processed
                    continue
            
            # Sort by characteristics
            text_columns.sort(key=lambda x: x['question_indicators'], reverse=True)
            
            if len(text_columns) >= 2:
                if question_col is None:
                    question_col = text_columns[0]['column']
                if answer_col is None:
                    # Find answer column (usually longer than question)
                    for col_info in text_columns:
                        if col_info['column'] != question_col:
                            answer_col = col_info['column']
                            break
            elif len(text_columns) == 1:
                # Only one text column, might contain both Q&A
                logger.warning("Only one text column found - might need special handling")
                question_col = text_columns[0]['column']
                answer_col = text_columns[0]['column']
        
        logger.info(f"Detected columns - Question: {question_col}, Answer: {answer_col}")
        return question_col, answer_col
    
    def clean_text(self, text: str) -> str:
        """Clean and normalize text content"""
        if text is None or not isinstance(text, str):
            return ""
        
        # HTML decode
        text = html.unescape(text)
        
        # Unicode normalization
        text = unicodedata.normalize('NFKD', text)
        
        # Remove excessive whitespace but preserve code formatting
        lines = text.split('\n')
        cleaned_lines = []
        
        for line in lines:
            # Preserve code lines (lines with significant indentation or code indicators)
            if (re.match(r'^\s{4,}', line) or 
                re.search(r'[{}()\[\];]', line) or 
                re.search(r'\b(?:def|class|function|var|let|const|if|for|while)\b', line)):
                cleaned_lines.append(line.rstrip())
            else:
                # Regular text line - clean whitespace
                cleaned_lines.append(re.sub(r'\s+', ' ', line.strip()))
        
        text = '\n'.join(line for line in cleaned_lines if line)
        
        # Fix common encoding issues
        replacements = {
            'â€™': "'", 'â€œ': '"', 'â€': '"',
            'â€¢': '•', 'â€"': '–', 'â€"': '—',
            'Ã¡': 'á', 'Ã©': 'é', 'Ã­': 'í', 'Ã³': 'ó', 'Ãº': 'ú'
        }
        
        for old, new in replacements.items():
            text = text.replace(old, new)
        
        # Remove URLs but keep the context
        text = re.sub(r'http[s]?://\S+', '[URL]', text)
        
        # Clean up extra spaces
        text = re.sub(r'\s+', ' ', text)
        text = text.strip()
        
        return text
    
    def extract_code_snippets(self, text: str) -> List[Dict]:
        """Extract and catalog code snippets from text"""
        snippets = []
        
        # Extract code blocks
        code_blocks = re.findall(r'```(\w*)\n?([\s\S]*?)```', text)
        for lang, code in code_blocks:
            if code.strip():
                snippets.append({
                    'type': 'code_block',
                    'language': lang if lang else 'unknown',
                    'content': code.strip(),
                    'length': len(code.strip())
                })
        
        # Extract inline code
        inline_code = re.findall(r'`([^`\n]+)`', text)
        for code in inline_code:
            if len(code.strip()) > 3:  # Filter out very short snippets
                snippets.append({
                    'type': 'inline_code',
                    'language': 'unknown',
                    'content': code.strip(),
                    'length': len(code.strip())
                })
        
        # Extract function definitions
        func_patterns = [
            r'\b(def\s+\w+\s*\([^)]*\)\s*:)',  # Python
            r'\b(function\s+\w+\s*\([^)]*\)\s*{)',  # JavaScript
            r'\b(public\s+\w+\s+\w+\s*\([^)]*\)\s*{)',  # Java
        ]
        
        for pattern in func_patterns:
            matches = re.findall(pattern, text)
            for match in matches:
                snippets.append({
                    'type': 'function_definition',
                    'language': 'detected',
                    'content': match,
                    'length': len(match)
                })
        
        return snippets
    
    def extract_technical_terms(self, text: str) -> Dict[str, List[str]]:
        """Extract technical terms and categorize them"""
        terms = defaultdict(list)
        text_lower = text.lower()
        
        # Extract terms by category
        for category, patterns in self.technical_patterns.items():
            for pattern in patterns:
                matches = re.findall(pattern, text, re.IGNORECASE)
                if matches:
                    terms[category].extend(matches)
        
        # Remove duplicates and empty matches
        for category in terms:
            terms[category] = list(set(term.strip() for term in terms[category] if term.strip()))
        
        return dict(terms)
    
    def _get_timestamp(self):
        """Get current timestamp in ISO format"""
        from datetime import datetime
        return datetime.now().isoformat()
    
    def calculate_module_relevance(self, question: str, answer: str) -> Dict[str, float]:
        """Calculate relevance score for each Engunity module"""
        combined_text = (question + " " + answer).lower()
        relevance_scores = {}
        
        for module, config in self.engunity_modules.items():
            score = 0
            word_count = len(combined_text.split())
            
            # Positive keyword matching (more generous scoring)
            for keyword in config['keywords']:
                matches = combined_text.count(keyword.lower())
                if matches > 0:
                    # Weight by keyword importance and frequency (increased multiplier)
                    base_score = matches * (2.0 + len(keyword.split()) * 0.5)
                    # Bonus for exact matches in question titles
                    if keyword.lower() in question.lower():
                        base_score *= 1.5
                    score += base_score
            
            # Negative keyword penalty
            for neg_keyword in config.get('negative_keywords', []):
                matches = combined_text.count(neg_keyword.lower())
                score -= matches * 0.5
            
            # Normalize by text length
            if word_count > 0:
                score = score / word_count * 100
            
            relevance_scores[module] = max(0, score)  # Ensure non-negative
        
        return relevance_scores
    
    def assess_quality(self, question: str, answer: str) -> Dict[str, float]:
        """Assess the quality of a Q&A pair"""
        quality_metrics = {
            'length_score': 0,
            'structure_score': 0,
            'content_score': 0,
            'technical_score': 0,
            'overall_score': 0
        }
        
        # Length assessment
        q_words = len(question.split())
        a_words = len(answer.split())
        
        if self.min_question_length <= q_words <= self.max_question_length:
            quality_metrics['length_score'] += 0.3
        if self.min_answer_length <= a_words <= self.max_answer_length:
            quality_metrics['length_score'] += 0.7
        
        # Structure assessment
        combined_text = question + " " + answer
        
        # Check for question marks
        if '?' in question:
            quality_metrics['structure_score'] += 0.2
        
        # Check for proper capitalization
        if question and question[0].isupper():
            quality_metrics['structure_score'] += 0.1
        
        # Check for complete sentences
        if answer.count('.') >= 1:
            quality_metrics['structure_score'] += 0.2
        
        # Check for code formatting
        if '```' in combined_text or '`' in combined_text:
            quality_metrics['structure_score'] += 0.3
        
        # Content quality assessment
        combined_lower = combined_text.lower()
        
        # Positive indicators
        positive_count = sum(1 for indicator in self.quality_indicators['positive'] 
                           if indicator in combined_lower)
        quality_metrics['content_score'] += min(positive_count * 0.1, 0.5)
        
        # Negative indicators
        negative_count = sum(1 for indicator in self.quality_indicators['negative'] 
                           if indicator in combined_lower)
        quality_metrics['content_score'] -= min(negative_count * 0.2, 0.8)
        
        # Technical content assessment
        technical_terms = self.extract_technical_terms(combined_text)
        tech_diversity = len(technical_terms)
        quality_metrics['technical_score'] = min(tech_diversity * 0.1, 1.0)
        
        # Calculate overall score
        weights = {
            'length_score': 0.2,
            'structure_score': 0.3,
            'content_score': 0.3,
            'technical_score': 0.2
        }
        
        quality_metrics['overall_score'] = sum(
            quality_metrics[metric] * weight 
            for metric, weight in weights.items()
        )
        
        # Ensure scores are in [0, 1] range
        for metric in quality_metrics:
            quality_metrics[metric] = max(0, min(1, quality_metrics[metric]))
        
        return quality_metrics
    
    def remove_duplicates(self, df, question_col: str, answer_col: str):
        """Remove duplicate and near-duplicate Q&A pairs"""
        logger.info("Removing duplicates and near-duplicates...")
        
        initial_count = len(df)
        
        # Exact duplicates
        df_dedup = df.drop_duplicates(subset=[question_col, answer_col])
        exact_removed = initial_count - len(df_dedup)
        
        # Near-duplicates (simplified approach using normalized text)
        if len(df_dedup) > 1000:  # Only for large datasets to avoid performance issues
            logger.info("Checking for near-duplicates...")
            
            # Create normalized versions for comparison
            norm_questions = df_dedup[question_col].astype(str).str.lower().str.replace(r'[^\w\s]', '', regex=True)
            norm_answers = df_dedup[answer_col].astype(str).str.lower().str.replace(r'[^\w\s]', '', regex=True)
            
            df_dedup['_norm_question'] = norm_questions
            df_dedup['_norm_answer'] = norm_answers
            
            # Group by normalized question and keep best answer
            groups = df_dedup.groupby('_norm_question')
            keep_indices = []
            
            for name, group in groups:
                if len(group) > 1:
                    # Keep the longest answer (likely most comprehensive)
                    answer_lengths = group['_norm_answer'].str.len()
                    best_idx = answer_lengths.idxmax()
                    keep_indices.append(best_idx)
                else:
                    keep_indices.extend(group.index)
            
            # Filter to keep only selected indices
            filtered_data = []
            for i, row in enumerate(df_dedup.data):
                if i in keep_indices:
                    # Remove the temporary columns
                    filtered_row = row[:-2]  # Remove last 2 columns (_norm_question, _norm_answer)
                    filtered_data.append(filtered_row)
            
            # Create new dataframe without temporary columns
            original_headers = [h for h in df_dedup.headers if not h.startswith('_norm_')]
            df_dedup = type(df_dedup)(filtered_data, original_headers)
        
        near_removed = len(df_dedup) - (initial_count - exact_removed) if exact_removed > 0 else 0
        
        logger.info(f"Removed {exact_removed} exact duplicates and {abs(near_removed)} near-duplicates")
        return df_dedup.reset_index(drop=True)
    
    def filter_by_relevance(self, df, question_col: str, answer_col: str, 
                          min_relevance_score: float = 0.05):
        """Filter Q&A pairs by relevance to Engunity modules"""
        logger.info("Filtering by relevance to Engunity modules...")
        
        relevant_indices = []
        module_counts = defaultdict(int)
        
        for idx, row in df.iterrows():
            if isinstance(row, dict):
                question = str(row.get(question_col, "")) if row.get(question_col) else ""
                answer = str(row.get(answer_col, "")) if row.get(answer_col) else ""
            else:
                # Handle simple list/tuple row format
                question_idx = df.headers.index(question_col)
                answer_idx = df.headers.index(answer_col)
                question = str(row[question_idx]) if row[question_idx] else ""
                answer = str(row[answer_idx]) if row[answer_idx] else ""
            
            if not question or not answer:
                continue
            
            relevance_scores = self.calculate_module_relevance(question, answer)
            max_relevance = max(relevance_scores.values()) if relevance_scores else 0
            
            if max_relevance >= min_relevance_score:
                relevant_indices.append(idx)
                # Track which module this belongs to
                best_module = max(relevance_scores.items(), key=lambda x: x[1])[0]
                module_counts[best_module] += 1
        
        # Create filtered dataframe with only relevant indices
        filtered_data = [df.data[i] for i in relevant_indices]
        filtered_df = type(df)(filtered_data, df.headers)
        
        logger.info(f"Kept {len(filtered_df)} relevant records out of {len(df)}")
        logger.info(f"Module distribution: {dict(module_counts)}")
        
        self.stats['module_distribution'] = dict(module_counts)
        return filtered_df
    
    def create_processed_records(self, df, question_col: str, answer_col: str) -> List[Dict]:
        """Create standardized processed records"""
        logger.info("Creating standardized processed records...")
        
        processed_records = []
        quality_stats = {'high': 0, 'medium': 0, 'low': 0}
        
        for idx, row in df.iterrows():
            if isinstance(row, dict):
                question = str(row.get(question_col, "")) if row.get(question_col) else ""
                answer = str(row.get(answer_col, "")) if row.get(answer_col) else ""
            else:
                # Handle simple list/tuple row format
                question_idx = df.headers.index(question_col)
                answer_idx = df.headers.index(answer_col)
                question = str(row[question_idx]) if row[question_idx] else ""
                answer = str(row[answer_idx]) if row[answer_idx] else ""
            
            if not question or not answer:
                continue
            
            # Clean text
            clean_question = self.clean_text(question)
            clean_answer = self.clean_text(answer)
            
            if not clean_question or not clean_answer:
                continue
            
            # Quality assessment
            quality_metrics = self.assess_quality(clean_question, clean_answer)
            overall_quality = quality_metrics['overall_score']
            
            # Skip very low quality (lowered threshold to keep more data)
            if overall_quality < 0.1:
                continue
            
            # Module relevance
            relevance_scores = self.calculate_module_relevance(clean_question, clean_answer)
            primary_module = max(relevance_scores.items(), key=lambda x: x[1])[0]
            
            # Extract technical content
            code_snippets = self.extract_code_snippets(clean_question + " " + clean_answer)
            technical_terms = self.extract_technical_terms(clean_question + " " + clean_answer)
            
            # Create record
            record = {
                'id': f"cs_{idx:06d}",
                'question': clean_question,
                'answer': clean_answer,
                'primary_module': primary_module,
                'module_relevance_scores': relevance_scores,
                'quality_metrics': quality_metrics,
                'overall_quality': overall_quality,
                'code_snippets': code_snippets,
                'technical_terms': technical_terms,
                'question_length': len(clean_question.split()),
                'answer_length': len(clean_answer.split()),
                'has_code': len(code_snippets) > 0,
                'technical_complexity': len(technical_terms),
                'processing_metadata': {
                    'original_index': idx,
                    'processed_timestamp': self._get_timestamp(),
                    'preprocessing_version': '1.0'
                }
            }
            
            # Quality classification
            if overall_quality >= 0.7:
                record['quality_tier'] = 'high'
                quality_stats['high'] += 1
            elif overall_quality >= 0.4:
                record['quality_tier'] = 'medium'
                quality_stats['medium'] += 1
            else:
                record['quality_tier'] = 'low'
                quality_stats['low'] += 1
            
            processed_records.append(record)
        
        self.stats['quality_stats'] = quality_stats
        logger.info(f"Created {len(processed_records)} processed records")
        logger.info(f"Quality distribution: {quality_stats}")
        
        return processed_records
    
    def create_module_splits(self, processed_records: List[Dict]) -> Dict[str, List[Dict]]:
        """Create module-specific data splits"""
        logger.info("Creating module-specific data splits...")
        
        module_splits = defaultdict(list)
        
        for record in processed_records:
            primary_module = record['primary_module']
            module_splits[primary_module].append(record)
        
        # Sort each module by quality
        for module in module_splits:
            module_splits[module].sort(key=lambda x: x['overall_quality'], reverse=True)
        
        # Log statistics
        for module, records in module_splits.items():
            high_quality = sum(1 for r in records if r['quality_tier'] == 'high')
            medium_quality = sum(1 for r in records if r['quality_tier'] == 'medium')
            low_quality = sum(1 for r in records if r['quality_tier'] == 'low')
            
            logger.info(f"{module}: {len(records)} records (H:{high_quality}, M:{medium_quality}, L:{low_quality})")
        
        return dict(module_splits)
    
    def save_processed_data(self, processed_records: List[Dict], module_splits: Dict[str, List[Dict]]) -> bool:
        """Save processed data to various formats"""
        try:
            logger.info("Saving processed data...")
            
            # Save all processed records
            all_records_file = self.output_dir / "filtered_qa_pairs.jsonl"
            with open(all_records_file, 'w', encoding='utf-8') as f:
                for record in processed_records:
                    f.write(json.dumps(record, ensure_ascii=False) + '\n')
            
            # Save module-specific files
            for module, records in module_splits.items():
                module_file = self.output_dir / f"{module}_questions.jsonl"
                with open(module_file, 'w', encoding='utf-8') as f:
                    for record in records:
                        f.write(json.dumps(record, ensure_ascii=False) + '\n')
            
            # Save difficulty-based splits
            difficulty_splits = {'beginner': [], 'intermediate': [], 'advanced': []}
            
            for record in processed_records:
                question_text = record['question'].lower()
                answer_text = record['answer'].lower()
                combined_text = question_text + " " + answer_text
                
                # Classify difficulty based on content complexity
                beginner_indicators = sum(1 for keyword in ['basic', 'simple', 'introduction', 'what is', 'define', 'beginner']
                                        if keyword in combined_text)
                advanced_indicators = sum(1 for keyword in ['optimize', 'complex', 'advanced', 'performance', 'scalability', 'architecture']
                                        if keyword in combined_text)
                
                tech_complexity = record['technical_complexity']
                code_complexity = len(record['code_snippets'])
                
                # Scoring system for difficulty
                difficulty_score = 0
                difficulty_score += advanced_indicators * 2
                difficulty_score += tech_complexity * 0.5
                difficulty_score += code_complexity * 0.3
                difficulty_score -= beginner_indicators * 1
                
                if difficulty_score >= 3:
                    difficulty_splits['advanced'].append(record)
                elif difficulty_score >= 1 or tech_complexity >= 2:
                    difficulty_splits['intermediate'].append(record)
                else:
                    difficulty_splits['beginner'].append(record)
            
            # Save difficulty splits
            for difficulty, records in difficulty_splits.items():
                difficulty_file = self.output_dir / f"{difficulty}_level_questions.jsonl"
                with open(difficulty_file, 'w', encoding='utf-8') as f:
                    for record in records:
                        f.write(json.dumps(record, ensure_ascii=False) + '\n')
            
            # Save summary statistics
            summary_stats = {
                'processing_summary': self.stats,
                'module_distribution': {module: len(records) for module, records in module_splits.items()},
                'difficulty_distribution': {difficulty: len(records) for difficulty, records in difficulty_splits.items()},
                'quality_distribution': self.stats['quality_stats'],
                'total_processed': len(processed_records),
                'processing_timestamp': self._get_timestamp(),
                'file_locations': {
                    'all_records': str(all_records_file),
                    'module_splits': {module: f"{module}_questions.jsonl" for module in module_splits.keys()},
                    'difficulty_splits': {difficulty: f"{difficulty}_level_questions.jsonl" for difficulty in difficulty_splits.keys()}
                }
            }
            
            summary_file = self.output_dir / "preprocessing_summary.json"
            with open(summary_file, 'w', encoding='utf-8') as f:
                json.dump(summary_stats, f, indent=2, ensure_ascii=False, default=str)
            
            # Create CSV summaries for easy analysis
            self._create_csv_summaries(processed_records, module_splits, difficulty_splits)
            
            logger.info(f"Successfully saved processed data to {self.output_dir}")
            logger.info(f"Files created:")
            logger.info(f"  - Main file: {all_records_file}")
            logger.info(f"  - Module splits: {len(module_splits)} files")
            logger.info(f"  - Difficulty splits: {len(difficulty_splits)} files")
            logger.info(f"  - Summary: {summary_file}")
            
            return True
            
        except Exception as e:
            logger.error(f"Error saving processed data: {str(e)}")
            return False
    
    def _create_csv_summaries(self, processed_records: List[Dict], 
                             module_splits: Dict[str, List[Dict]], 
                             difficulty_splits: Dict[str, List[Dict]]):
        """Create CSV summaries for easy analysis"""
        
        # Overall summary
        summary_data = []
        for record in processed_records:
            summary_data.append({
                'id': record['id'],
                'primary_module': record['primary_module'],
                'quality_tier': record['quality_tier'],
                'overall_quality': record['overall_quality'],
                'question_length': record['question_length'],
                'answer_length': record['answer_length'],
                'has_code': record['has_code'],
                'technical_complexity': record['technical_complexity'],
                'question_preview': record['question'][:100] + "..." if len(record['question']) > 100 else record['question']
            })
        
        # Create CSV manually without pandas
        summary_csv = self.output_dir / "processed_summary.csv"
        with open(summary_csv, 'w', encoding='utf-8') as f:
            # Write header
            headers = list(summary_data[0].keys()) if summary_data else []
            f.write(','.join(headers) + '\n')
            # Write data
            for row in summary_data:
                values = [str(row.get(h, '')) for h in headers]
                f.write(','.join(values) + '\n')
        
        # Module statistics
        module_stats = []
        for module, records in module_splits.items():
            module_config = self.engunity_modules[module]
            module_stats.append({
                'module': module,
                'description': f"{module.replace('_', ' ').title()}",
                'priority': module_config['priority'],
                'target_percentage': module_config['target_percentage'],
                'actual_count': len(records),
                'high_quality_count': sum(1 for r in records if r['quality_tier'] == 'high'),
                'medium_quality_count': sum(1 for r in records if r['quality_tier'] == 'medium'),
                'low_quality_count': sum(1 for r in records if r['quality_tier'] == 'low'),
                'avg_quality_score': np.mean([r['overall_quality'] for r in records]),
                'code_snippets_count': sum(1 for r in records if r['has_code']),
                'avg_technical_complexity': np.mean([r['technical_complexity'] for r in records])
            })
        
        # Create CSV manually without pandas
        module_stats_csv = self.output_dir / "module_statistics.csv"
        with open(module_stats_csv, 'w', encoding='utf-8') as f:
            # Write header
            headers = list(module_stats[0].keys()) if module_stats else []
            f.write(','.join(headers) + '\n')
            # Write data
            for row in module_stats:
                values = [str(row.get(h, '')) for h in headers]
                f.write(','.join(values) + '\n')
        
        logger.info(f"CSV summaries saved: {summary_csv}, {module_stats_csv}")
    
    def generate_processing_report(self) -> str:
        """Generate a comprehensive processing report"""
        report = []
        report.append("# CS Dataset Preprocessing Report")
        from datetime import datetime
        report.append(f"Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        report.append("")
        
        # Processing statistics
        report.append("## Processing Statistics")
        report.append(f"- **Original records:** {self.stats['original_count']:,}")
        report.append(f"- **After cleaning:** {self.stats['after_cleaning']:,}")
        report.append(f"- **After filtering:** {self.stats['after_filtering']:,}")
        report.append(f"- **After deduplication:** {self.stats['after_deduplication']:,}")
        report.append(f"- **Final records:** {self.stats['final_count']:,}")
        report.append(f"- **Retention rate:** {(self.stats['final_count']/self.stats['original_count']*100):.1f}%")
        report.append("")
        
        # Quality distribution
        report.append("## Quality Distribution")
        quality_stats = self.stats['quality_stats']
        total_quality = sum(quality_stats.values())
        if total_quality > 0:
            for tier, count in quality_stats.items():
                percentage = (count / total_quality) * 100
                report.append(f"- **{tier.title()} quality:** {count:,} ({percentage:.1f}%)")
        report.append("")
        
        # Module distribution
        report.append("## Engunity Module Distribution")
        module_dist = self.stats['module_distribution']
        total_modules = sum(module_dist.values())
        
        for module, count in sorted(module_dist.items(), key=lambda x: x[1], reverse=True):
            percentage = (count / total_modules) * 100 if total_modules > 0 else 0
            target = self.engunity_modules[module]['target_percentage']
            status = "✅" if percentage >= target * 0.8 else "⚠️" if percentage >= target * 0.5 else "❌"
            report.append(f"- **{module.replace('_', ' ').title()}:** {count:,} ({percentage:.1f}%) {status}")
        report.append("")
        
        # Recommendations
        report.append("## Recommendations")
        report.append("### High Priority Actions")
        
        for module, count in module_dist.items():
            target = self.engunity_modules[module]['target_percentage']
            actual = (count / total_modules) * 100 if total_modules > 0 else 0
            
            if actual < target * 0.5:
                report.append(f"- **{module.replace('_', ' ').title()}:** Need {int(target * total_modules / 100 - count)} more records")
        
        report.append("")
        report.append("### Next Steps")
        report.append("1. **Review low-coverage modules** and generate synthetic data")
        report.append("2. **Quality enhancement** for medium-tier records")
        report.append("3. **Domain mapping** to create training-ready datasets")
        report.append("4. **Embedding training** starting with high-priority modules")
        
        return "\n".join(report)
    
    def run_preprocessing_pipeline(self) -> bool:
        """Run the complete preprocessing pipeline"""
        logger.info("🚀 Starting CS dataset preprocessing pipeline for Engunity AI...")
        
        try:
            # Step 1: Load dataset
            if not self.load_dataset():
                return False
            
            # Step 2: Detect Q&A columns
            question_col, answer_col = self.detect_qa_columns()
            if not question_col or not answer_col:
                logger.error("Could not detect question and answer columns")
                return False
            
            logger.info(f"Using columns - Question: {question_col}, Answer: {answer_col}")
            
            # Step 3: Initial filtering and cleaning
            logger.info("Step 1: Initial data cleaning...")
            
            # Remove rows with missing Q&A
            clean_df = self.df.dropna(subset=[question_col, answer_col]).copy()
            self.stats['after_cleaning'] = len(clean_df)
            
            # Step 4: Filter by relevance
            logger.info("Step 2: Filtering by relevance to Engunity modules...")
            filtered_df = self.filter_by_relevance(clean_df, question_col, answer_col)
            self.stats['after_filtering'] = len(filtered_df)
            
            # Step 5: Remove duplicates
            logger.info("Step 3: Removing duplicates...")
            dedup_df = self.remove_duplicates(filtered_df, question_col, answer_col)
            self.stats['after_deduplication'] = len(dedup_df)
            
            # Step 6: Create processed records
            logger.info("Step 4: Creating standardized records...")
            processed_records = self.create_processed_records(dedup_df, question_col, answer_col)
            self.stats['final_count'] = len(processed_records)
            
            # Step 7: Create module splits
            logger.info("Step 5: Creating module-specific splits...")
            module_splits = self.create_module_splits(processed_records)
            
            # Step 8: Save processed data
            logger.info("Step 6: Saving processed data...")
            if not self.save_processed_data(processed_records, module_splits):
                return False
            
            # Step 9: Generate report
            logger.info("Step 7: Generating processing report...")
            report = self.generate_processing_report()
            
            report_file = self.output_dir / "preprocessing_report.md"
            with open(report_file, 'w', encoding='utf-8') as f:
                f.write(report)
            
            # Print summary
            self._print_pipeline_summary(processed_records, module_splits)
            
            logger.info("✅ Preprocessing pipeline completed successfully!")
            return True
            
        except Exception as e:
            logger.error(f"❌ Preprocessing pipeline failed: {str(e)}")
            return False
    
    def _print_pipeline_summary(self, processed_records: List[Dict], module_splits: Dict[str, List[Dict]]):
        """Print pipeline execution summary"""
        print("\n" + "="*80)
        print("🎯 ENGUNITY CS PREPROCESSING SUMMARY")
        print("="*80)
        
        # Processing stats
        print(f"\n📊 PROCESSING STATISTICS:")
        print(f"   Original records: {self.stats['original_count']:,}")
        print(f"   Final records: {self.stats['final_count']:,}")
        print(f"   Retention rate: {(self.stats['final_count']/self.stats['original_count']*100):.1f}%")
        
        # Quality breakdown
        quality_stats = self.stats['quality_stats']
        print(f"\n🏆 QUALITY DISTRIBUTION:")
        for tier, count in quality_stats.items():
            emoji = "🔥" if tier == 'high' else "⚡" if tier == 'medium' else "📌"
            print(f"   {emoji} {tier.title()}: {count:,} records")
        
        # Module breakdown
        print(f"\n🎯 MODULE DISTRIBUTION:")
        total = sum(len(records) for records in module_splits.values())
        
        for module, records in sorted(module_splits.items(), key=lambda x: len(x[1]), reverse=True):
            percentage = (len(records) / total) * 100 if total > 0 else 0
            target = self.engunity_modules[module]['target_percentage']
            
            status_emoji = "✅" if percentage >= target * 0.8 else "⚠️" if percentage >= target * 0.5 else "❌"
            priority_emoji = "🔥" if self.engunity_modules[module]['priority'] == 'high' else "⚡" if self.engunity_modules[module]['priority'] == 'medium' else "📌"
            
            print(f"   {priority_emoji} {status_emoji} {module.replace('_', ' ').title():<20} {len(records):>5,} ({percentage:>5.1f}%)")
        
        # Files created
        print(f"\n📁 FILES CREATED:")
        print(f"   📄 Main dataset: filtered_qa_pairs.jsonl ({len(processed_records)} records)")
        print(f"   📁 Module splits: {len(module_splits)} files")
        print(f"   📊 CSV summaries: 2 files")
        print(f"   📋 Report: preprocessing_report.md")
        
        # Recommendations
        print(f"\n🔄 NEXT STEPS:")
        print(f"   1. Review preprocessing_report.md for detailed analysis")
        print(f"   2. Run domain_mapper.py to create training splits")
        print(f"   3. Generate synthetic data for low-coverage modules")
        print(f"   4. Start with {', '.join(k for k, v in module_splits.items() if len(v) > 100)} modules")
        
        print("="*80)


def main():
    """Main execution function"""
    import argparse
    import sys
    
    parser = argparse.ArgumentParser(description='Preprocess CS dataset for Engunity AI RAG training')
    parser.add_argument(
        '--input-path',
        default='backend/data/training/kaggle_cs_dataset/train_reduced.csv',
        help='Path to the input CS dataset CSV file'
    )
    parser.add_argument(
        '--output-dir',
        default='backend/data/training/processed',
        help='Directory to save processed outputs'
    )
    parser.add_argument(
        '--min-relevance',
        type=float,
        default=0.1,
        help='Minimum relevance score for filtering (0.0-1.0)'
    )
    parser.add_argument(
        '--quality-threshold',
        type=float,
        default=0.2,
        help='Minimum quality score to keep records (0.0-1.0)'
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
    
    # Initialize preprocessor
    preprocessor = EngunityCSPreprocessor(
        input_path=args.input_path,
        output_dir=args.output_dir
    )
    
    # Run preprocessing
    success = preprocessor.run_preprocessing_pipeline()
    
    if success:
        print(f"\n✅ Preprocessing completed successfully!")
        print(f"📁 Processed data saved to: {preprocessor.output_dir}")
        sys.exit(0)
    else:
        print(f"\n❌ Preprocessing failed. Check logs for details.")
        sys.exit(1)


if __name__ == "__main__":
    main()