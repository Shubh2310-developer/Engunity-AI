#!/usr/bin/env python3
"""
Dataset Analyzer for Engunity AI RAG Training
============================================

This script analyzes the Computer Science Q&A dataset to understand its structure,
content distribution, and relevance to Engunity AI's SaaS modules.

Usage:
    python backend/data/training/dataset_analyzer.py

Author: Engunity AI Team
Date: 2025-07-26
"""

import pandas as pd
import numpy as np
import json
import logging
import re
from pathlib import Path
from typing import Dict, List, Tuple, Optional
from collections import Counter, defaultdict
import matplotlib.pyplot as plt
from datetime import datetime
import warnings
warnings.filterwarnings('ignore')

# Handle scipy/seaborn import issues with fallback
try:
    import seaborn as sns
    HAS_SEABORN = True
except ImportError as e:
    print(f"Warning: Seaborn not available ({e}). Visualizations will use matplotlib only.")
    HAS_SEABORN = False
except Exception as e:
    print(f"Warning: Seaborn import failed ({e}). Using matplotlib only.")
    HAS_SEABORN = False

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('backend/data/training/dataset_analysis.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class EngunityDatasetAnalyzer:
    """
    Analyze CS dataset for Engunity AI RAG training pipeline
    """
    
    def __init__(self, dataset_path: str = "backend/data/training/kaggle_cs_dataset/train.csv"):
        """Initialize the analyzer with dataset path"""
        self.dataset_path = Path(dataset_path)
        self.output_dir = Path("backend/data/training/analysis_output")
        self.output_dir.mkdir(exist_ok=True)
        
        # Engunity AI module mapping
        self.engunity_modules = {
            'chat': {
                'keywords': ['conversation', 'dialogue', 'chat', 'interaction', 'communication'],
                'description': 'AI Chatbot Module',
                'priority': 'high'
            },
            'code_assistant': {
                'keywords': [
                    'programming', 'code', 'coding', 'algorithm', 'data structure',
                    'python', 'javascript', 'java', 'c++', 'debugging', 'syntax',
                    'function', 'class', 'variable', 'loop', 'recursion', 'optimization'
                ],
                'description': 'Code Generation & Debugging',
                'priority': 'high'
            },
            'document_qa': {
                'keywords': [
                    'documentation', 'text analysis', 'information retrieval',
                    'search', 'query', 'document', 'parsing', 'extraction'
                ],
                'description': 'Document Q&A System',
                'priority': 'high'
            },
            'research_tools': {
                'keywords': [
                    'research', 'analysis', 'academic', 'paper', 'study',
                    'methodology', 'evaluation', 'comparison', 'survey'
                ],
                'description': 'Research Writing Support',
                'priority': 'medium'
            },
            'data_analysis': {
                'keywords': [
                    'data', 'statistics', 'visualization', 'dataset', 'analysis',
                    'machine learning', 'ml', 'ai', 'model', 'training'
                ],
                'description': 'Data Analysis Module',
                'priority': 'medium'
            },
            'notebook': {
                'keywords': [
                    'jupyter', 'notebook', 'execution', 'interactive',
                    'scripting', 'development environment'
                ],
                'description': 'Interactive Notebook',
                'priority': 'medium'
            },
            'blockchain': {
                'keywords': [
                    'blockchain', 'smart contract', 'cryptocurrency', 'web3',
                    'ethereum', 'solidity', 'defi', 'nft', 'consensus'
                ],
                'description': 'Blockchain & Web3 Features',
                'priority': 'low'
            }
        }
        
        self.difficulty_keywords = {
            'beginner': [
                'basic', 'introduction', 'simple', 'fundamental', 'elementary',
                'beginner', 'start', 'first', 'what is', 'define'
            ],
            'intermediate': [
                'implementation', 'design', 'compare', 'analyze', 'explain',
                'difference', 'advantage', 'disadvantage', 'application'
            ],
            'advanced': [
                'optimize', 'complex', 'advanced', 'performance', 'scalability',
                'architecture', 'distributed', 'concurrent', 'parallel'
            ]
        }
        
        self.df = None
        self.analysis_results = {}
        
    def load_dataset(self) -> bool:
        """Load and validate the CS dataset"""
        try:
            logger.info(f"Loading dataset from {self.dataset_path}")
            
            if not self.dataset_path.exists():
                logger.error(f"Dataset file not found: {self.dataset_path}")
                return False
            
            # Load CSV with error handling
            self.df = pd.read_csv(self.dataset_path, encoding='utf-8')
            logger.info(f"Dataset loaded successfully: {len(self.df)} rows, {len(self.df.columns)} columns")
            
            # Display basic info
            logger.info(f"Dataset shape: {self.df.shape}")
            logger.info(f"Columns: {list(self.df.columns)}")
            
            # Check for missing values
            missing_info = self.df.isnull().sum()
            if missing_info.sum() > 0:
                logger.warning(f"Missing values found:\n{missing_info[missing_info > 0]}")
            
            return True
            
        except Exception as e:
            logger.error(f"Error loading dataset: {str(e)}")
            return False
    
    def analyze_structure(self) -> Dict:
        """Analyze the basic structure of the dataset"""
        logger.info("Analyzing dataset structure...")
        
        structure_analysis = {
            'total_rows': len(self.df),
            'total_columns': len(self.df.columns),
            'columns': list(self.df.columns),
            'data_types': self.df.dtypes.to_dict(),
            'missing_values': self.df.isnull().sum().to_dict(),
            'memory_usage_mb': self.df.memory_usage(deep=True).sum() / 1024 / 1024,
            'sample_rows': self.df.head().to_dict('records')
        }
        
        # Identify question and answer columns
        potential_question_cols = [col for col in self.df.columns 
                                 if any(keyword in col.lower() 
                                       for keyword in ['question', 'query', 'q', 'problem'])]
        
        potential_answer_cols = [col for col in self.df.columns 
                               if any(keyword in col.lower() 
                                     for keyword in ['answer', 'response', 'solution', 'a'])]
        
        structure_analysis['question_columns'] = potential_question_cols
        structure_analysis['answer_columns'] = potential_answer_cols
        
        logger.info(f"Potential question columns: {potential_question_cols}")
        logger.info(f"Potential answer columns: {potential_answer_cols}")
        
        return structure_analysis
    
    def analyze_content_distribution(self) -> Dict:
        """Analyze content distribution and topic mapping"""
        logger.info("Analyzing content distribution...")
        
        # Determine primary text columns for analysis
        text_columns = []
        for col in self.df.columns:
            if self.df[col].dtype == 'object':
                # Check if column contains substantial text
                avg_length = self.df[col].dropna().astype(str).str.len().mean()
                if avg_length > 20:  # Arbitrary threshold for meaningful text
                    text_columns.append(col)
        
        logger.info(f"Identified text columns: {text_columns}")
        
        content_analysis = {
            'text_columns': text_columns,
            'module_mapping': {},
            'difficulty_distribution': {},
            'topic_keywords': {},
            'question_types': {},
            'text_statistics': {}
        }
        
        # Analyze each text column
        for col in text_columns:
            content_analysis['text_statistics'][col] = self._analyze_text_column(col)
        
        # Map content to Engunity modules
        content_analysis['module_mapping'] = self._map_to_engunity_modules(text_columns)
        
        # Analyze difficulty levels
        content_analysis['difficulty_distribution'] = self._analyze_difficulty_levels(text_columns)
        
        # Extract topic keywords
        content_analysis['topic_keywords'] = self._extract_topic_keywords(text_columns)
        
        # Analyze question types
        content_analysis['question_types'] = self._analyze_question_types(text_columns)
        
        return content_analysis
    
    def _analyze_text_column(self, column: str) -> Dict:
        """Analyze statistics for a text column"""
        text_data = self.df[column].dropna().astype(str)
        
        return {
            'total_entries': len(text_data),
            'avg_length': text_data.str.len().mean(),
            'median_length': text_data.str.len().median(),
            'max_length': text_data.str.len().max(),
            'min_length': text_data.str.len().min(),
            'word_count_avg': text_data.str.split().str.len().mean(),
            'unique_entries': text_data.nunique(),
            'duplicate_percentage': ((len(text_data) - text_data.nunique()) / len(text_data)) * 100
        }
    
    def _map_to_engunity_modules(self, text_columns: List[str]) -> Dict:
        """Map content to Engunity AI modules based on keywords"""
        module_mapping = {}
        
        for module, config in self.engunity_modules.items():
            module_mapping[module] = {
                'description': config['description'],
                'priority': config['priority'],
                'matches': 0,
                'percentage': 0,
                'sample_questions': []
            }
        
        # Combine all text for analysis
        all_text = ""
        for col in text_columns:
            all_text += " " + self.df[col].fillna("").astype(str).str.cat(sep=" ")
        
        all_text = all_text.lower()
        
        # Count matches for each module
        total_matches = 0
        for module, config in self.engunity_modules.items():
            matches = sum(all_text.count(keyword) for keyword in config['keywords'])
            module_mapping[module]['matches'] = matches
            total_matches += matches
        
        # Calculate percentages
        if total_matches > 0:
            for module in module_mapping:
                module_mapping[module]['percentage'] = (
                    module_mapping[module]['matches'] / total_matches
                ) * 100
        
        # Find sample questions for each module
        for module, config in self.engunity_modules.items():
            samples = self._find_sample_questions(text_columns, config['keywords'], limit=3)
            module_mapping[module]['sample_questions'] = samples
        
        return module_mapping
    
    def _find_sample_questions(self, text_columns: List[str], keywords: List[str], limit: int = 3) -> List[str]:
        """Find sample questions that match specific keywords"""
        samples = []
        
        for col in text_columns:
            if 'question' in col.lower() or 'q' in col.lower():
                for idx, text in enumerate(self.df[col].fillna("").astype(str)):
                    if len(samples) >= limit:
                        break
                    
                    text_lower = text.lower()
                    if any(keyword in text_lower for keyword in keywords):
                        # Truncate long questions
                        if len(text) > 200:
                            text = text[:200] + "..."
                        samples.append(text)
                
                if len(samples) >= limit:
                    break
        
        return samples
    
    def _analyze_difficulty_levels(self, text_columns: List[str]) -> Dict:
        """Analyze difficulty distribution based on keywords"""
        difficulty_counts = {level: 0 for level in self.difficulty_keywords.keys()}
        
        # Combine all text
        all_text = ""
        for col in text_columns:
            all_text += " " + self.df[col].fillna("").astype(str).str.cat(sep=" ")
        
        all_text = all_text.lower()
        
        # Count difficulty indicators
        for level, keywords in self.difficulty_keywords.items():
            count = sum(all_text.count(keyword) for keyword in keywords)
            difficulty_counts[level] = count
        
        # Calculate percentages
        total = sum(difficulty_counts.values())
        difficulty_percentages = {}
        if total > 0:
            for level, count in difficulty_counts.items():
                difficulty_percentages[level] = (count / total) * 100
        else:
            difficulty_percentages = {level: 0 for level in difficulty_counts.keys()}
        
        return {
            'counts': difficulty_counts,
            'percentages': difficulty_percentages,
            'total_indicators': total
        }
    
    def _extract_topic_keywords(self, text_columns: List[str], top_n: int = 50) -> Dict:
        """Extract most common topic keywords"""
        from collections import Counter
        import re
        
        # Combine all text
        all_text = ""
        for col in text_columns:
            all_text += " " + self.df[col].fillna("").astype(str).str.cat(sep=" ")
        
        # Clean and tokenize
        all_text = all_text.lower()
        words = re.findall(r'\b[a-zA-Z]{3,}\b', all_text)  # Words with 3+ characters
        
        # Remove common stop words
        stop_words = {
            'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 
            'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 
            'how', 'man', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy', 
            'did', 'its', 'let', 'put', 'say', 'she', 'too', 'use', 'this', 'that',
            'with', 'have', 'from', 'they', 'know', 'want', 'been', 'good', 'much',
            'some', 'time', 'very', 'when', 'come', 'here', 'just', 'like', 'long',
            'make', 'many', 'over', 'such', 'take', 'than', 'them', 'well', 'were'
        }
        
        filtered_words = [word for word in words if word not in stop_words and len(word) > 3]
        
        # Count frequency
        word_counter = Counter(filtered_words)
        top_keywords = word_counter.most_common(top_n)
        
        return {
            'top_keywords': top_keywords,
            'total_unique_words': len(word_counter),
            'total_words': len(filtered_words)
        }
    
    def _analyze_question_types(self, text_columns: List[str]) -> Dict:
        """Analyze types of questions in the dataset"""
        question_patterns = {
            'what_is': r'\bwhat\s+is\b',
            'how_to': r'\bhow\s+to\b|\bhow\s+do\b|\bhow\s+can\b',
            'why': r'\bwhy\b',
            'when': r'\bwhen\b',
            'where': r'\bwhere\b',
            'which': r'\bwhich\b',
            'explain': r'\bexplain\b|\bdescribe\b',
            'compare': r'\bcompare\b|\bdifference\b|\bversus\b|\bvs\b',
            'implement': r'\bimplement\b|\bcreate\b|\bbuild\b|\bwrite\b',
            'debug': r'\bdebug\b|\berror\b|\bfix\b|\bissue\b|\bproblem\b'
        }
        
        question_counts = {pattern_name: 0 for pattern_name in question_patterns.keys()}
        
        # Find question columns
        question_cols = [col for col in text_columns 
                        if any(keyword in col.lower() 
                              for keyword in ['question', 'query', 'q', 'problem'])]
        
        if not question_cols and text_columns:
            question_cols = [text_columns[0]]  # Use first text column as fallback
        
        # Analyze patterns
        for col in question_cols:
            questions = self.df[col].fillna("").astype(str)
            for pattern_name, pattern in question_patterns.items():
                matches = questions.str.contains(pattern, case=False, regex=True).sum()
                question_counts[pattern_name] += matches
        
        # Calculate percentages
        total_questions = len(self.df) if question_cols else 0
        question_percentages = {}
        if total_questions > 0:
            for pattern_name, count in question_counts.items():
                question_percentages[pattern_name] = (count / total_questions) * 100
        
        return {
            'counts': question_counts,
            'percentages': question_percentages,
            'total_questions': total_questions,
            'question_columns': question_cols
        }
    
    def generate_recommendations(self) -> Dict:
        """Generate recommendations for RAG training based on analysis"""
        logger.info("Generating recommendations for RAG training...")
        
        recommendations = {
            'training_strategy': {},
            'data_filtering': {},
            'module_priorities': {},
            'preprocessing_steps': [],
            'synthetic_data_needs': {},
            'evaluation_metrics': []
        }
        
        # Training strategy based on module mapping
        module_mapping = self.analysis_results.get('content_distribution', {}).get('module_mapping', {})
        
        high_priority_modules = []
        medium_priority_modules = []
        low_priority_modules = []
        
        for module, data in module_mapping.items():
            if data['priority'] == 'high' and data['percentage'] > 5:
                high_priority_modules.append(module)
            elif data['priority'] == 'medium' and data['percentage'] > 2:
                medium_priority_modules.append(module)
            else:
                low_priority_modules.append(module)
        
        recommendations['training_strategy'] = {
            'phase_1_modules': high_priority_modules,
            'phase_2_modules': medium_priority_modules,
            'phase_3_modules': low_priority_modules,
            'recommended_training_split': {
                'cs_dataset': 60,
                'synthetic_data': 25,
                'user_documents': 15
            }
        }
        
        # Data filtering recommendations
        total_rows = self.analysis_results.get('structure', {}).get('total_rows', 0)
        
        if total_rows > 50000:
            filter_percentage = 70
        elif total_rows > 20000:
            filter_percentage = 80
        else:
            filter_percentage = 90
        
        recommendations['data_filtering'] = {
            'keep_percentage': filter_percentage,
            'filter_criteria': [
                'Remove duplicate questions',
                'Filter by relevance to Engunity modules',
                'Remove questions shorter than 10 words',
                'Remove answers shorter than 20 words',
                'Prioritize high-quality QA pairs'
            ],
            'estimated_final_size': int(total_rows * filter_percentage / 100)
        }
        
        # Module priorities based on data availability
        recommendations['module_priorities'] = {}
        for module, data in module_mapping.items():
            if data['percentage'] > 10:
                recommendations['module_priorities'][module] = 'high_data_available'
            elif data['percentage'] > 5:
                recommendations['module_priorities'][module] = 'medium_data_available'
            else:
                recommendations['module_priorities'][module] = 'low_data_need_synthesis'
        
        # Preprocessing steps
        recommendations['preprocessing_steps'] = [
            'Text normalization and cleaning',
            'Remove HTML tags and special characters',
            'Standardize code snippets formatting',
            'Extract and preserve technical terms',
            'Create topic-based clusters',
            'Generate difficulty level labels',
            'Create question-answer pair embeddings'
        ]
        
        # Synthetic data needs
        for module, data in module_mapping.items():
            if data['percentage'] < 5:
                recommendations['synthetic_data_needs'][module] = {
                    'current_percentage': data['percentage'],
                    'target_percentage': 10,
                    'synthetic_pairs_needed': int(total_rows * 0.05),
                    'generation_strategy': 'keyword_expansion_and_context_creation'
                }
        
        # Evaluation metrics
        recommendations['evaluation_metrics'] = [
            'Retrieval accuracy (top-k)',
            'Answer relevance score',
            'Module-specific accuracy',
            'Response time performance',
            'User satisfaction rating',
            'Code compilation success rate',
            'Document understanding accuracy'
        ]
        
        return recommendations
    
    def save_analysis_results(self) -> bool:
        """Save analysis results to files"""
        try:
            logger.info("Saving analysis results...")
            
            # Save JSON results
            results_file = self.output_dir / "dataset_analysis_results.json"
            with open(results_file, 'w', encoding='utf-8') as f:
                json.dump(self.analysis_results, f, indent=2, ensure_ascii=False, default=str)
            
            # Save CSV summary
            self._save_csv_summary()
            
            # Generate visualizations
            self._create_visualizations()
            
            # Generate markdown report
            self._generate_markdown_report()
            
            logger.info(f"Analysis results saved to {self.output_dir}")
            return True
            
        except Exception as e:
            logger.error(f"Error saving analysis results: {str(e)}")
            return False
    
    def _save_csv_summary(self):
        """Save summary statistics as CSV"""
        summary_data = []
        
        # Module mapping summary
        module_mapping = self.analysis_results.get('content_distribution', {}).get('module_mapping', {})
        for module, data in module_mapping.items():
            summary_data.append({
                'module': module,
                'description': data['description'],
                'priority': data['priority'],
                'percentage': data['percentage'],
                'matches': data['matches']
            })
        
        summary_df = pd.DataFrame(summary_data)
        summary_file = self.output_dir / "module_mapping_summary.csv"
        summary_df.to_csv(summary_file, index=False)
    
    def _create_visualizations(self):
        """Create analysis visualizations"""
        try:
            # Set matplotlib backend for compatibility
            plt.switch_backend('Agg')  # Use non-interactive backend
            plt.style.use('default')
            fig, axes = plt.subplots(2, 2, figsize=(15, 12))
            fig.suptitle('Engunity AI - CS Dataset Analysis', fontsize=16, fontweight='bold')
            
            # Module distribution
            module_mapping = self.analysis_results.get('content_distribution', {}).get('module_mapping', {})
            modules = list(module_mapping.keys())
            percentages = [module_mapping[m]['percentage'] for m in modules]
            
            axes[0, 0].pie(percentages, labels=modules, autopct='%1.1f%%', startangle=90)
            axes[0, 0].set_title('Content Distribution by Engunity Module')
            
            # Difficulty distribution
            difficulty_dist = self.analysis_results.get('content_distribution', {}).get('difficulty_distribution', {})
            if difficulty_dist.get('percentages'):
                levels = list(difficulty_dist['percentages'].keys())
                diff_percentages = list(difficulty_dist['percentages'].values())
                
                axes[0, 1].bar(levels, diff_percentages, color=['green', 'orange', 'red'])
                axes[0, 1].set_title('Difficulty Level Distribution')
                axes[0, 1].set_ylabel('Percentage')
            
            # Question types
            question_types = self.analysis_results.get('content_distribution', {}).get('question_types', {})
            if question_types.get('percentages'):
                types = list(question_types['percentages'].keys())
                type_percentages = list(question_types['percentages'].values())
                
                axes[1, 0].barh(types, type_percentages)
                axes[1, 0].set_title('Question Types Distribution')
                axes[1, 0].set_xlabel('Percentage')
            
            # Top keywords
            keywords_data = self.analysis_results.get('content_distribution', {}).get('topic_keywords', {})
            if keywords_data.get('top_keywords'):
                top_10_keywords = keywords_data['top_keywords'][:10]
                words, counts = zip(*top_10_keywords)
                
                axes[1, 1].bar(range(len(words)), counts)
                axes[1, 1].set_xticks(range(len(words)))
                axes[1, 1].set_xticklabels(words, rotation=45, ha='right')
                axes[1, 1].set_title('Top 10 Keywords')
                axes[1, 1].set_ylabel('Frequency')
            
            plt.tight_layout()
            viz_file = self.output_dir / "dataset_analysis_visualization.png"
            plt.savefig(viz_file, dpi=300, bbox_inches='tight')
            plt.close()
            
            logger.info(f"Visualizations saved to {viz_file}")
            
        except Exception as e:
            logger.warning(f"Could not create visualizations: {str(e)}")
    
    def _generate_markdown_report(self):
        """Generate a comprehensive markdown report"""
        report_file = self.output_dir / "dataset_analysis_report.md"
        
        with open(report_file, 'w', encoding='utf-8') as f:
            f.write("# Engunity AI - CS Dataset Analysis Report\n\n")
            f.write(f"**Generated on:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
            
            # Executive Summary
            f.write("## Executive Summary\n\n")
            structure = self.analysis_results.get('structure', {})
            f.write(f"- **Total Records:** {structure.get('total_rows', 'N/A'):,}\n")
            f.write(f"- **Dataset Size:** {structure.get('memory_usage_mb', 0):.2f} MB\n")
            f.write(f"- **Columns:** {structure.get('total_columns', 'N/A')}\n")
            f.write(f"- **Identified Text Columns:** {len(structure.get('question_columns', []) + structure.get('answer_columns', []))}\n\n")
            
            # Module Mapping
            f.write("## Engunity Module Mapping\n\n")
            module_mapping = self.analysis_results.get('content_distribution', {}).get('module_mapping', {})
            
            f.write("| Module | Priority | Coverage | Matches | Sample Question |\n")
            f.write("|--------|----------|----------|---------|----------------|\n")
            
            for module, data in module_mapping.items():
                sample = data['sample_questions'][0] if data['sample_questions'] else "No samples found"
                if len(sample) > 100:
                    sample = sample[:100] + "..."
                f.write(f"| {module.replace('_', ' ').title()} | {data['priority']} | {data['percentage']:.1f}% | {data['matches']} | {sample} |\n")
            
            # Recommendations
            f.write("\n## Training Recommendations\n\n")
            recommendations = self.analysis_results.get('recommendations', {})
            
            training_strategy = recommendations.get('training_strategy', {})
            if training_strategy:
                f.write("### Phase 1 Modules (High Priority)\n")
                for module in training_strategy.get('phase_1_modules', []):
                    f.write(f"- {module.replace('_', ' ').title()}\n")
                
                f.write("\n### Phase 2 Modules (Medium Priority)\n")
                for module in training_strategy.get('phase_2_modules', []):
                    f.write(f"- {module.replace('_', ' ').title()}\n")
            
            # Data Quality
            f.write("\n## Data Quality Assessment\n\n")
            content_dist = self.analysis_results.get('content_distribution', {})
            
            if content_dist.get('text_statistics'):
                f.write("### Text Statistics\n\n")
                for col, stats in content_dist['text_statistics'].items():
                    f.write(f"**{col}:**\n")
                    f.write(f"- Average length: {stats['avg_length']:.1f} characters\n")
                    f.write(f"- Average words: {stats['word_count_avg']:.1f}\n")
                    f.write(f"- Duplicate rate: {stats['duplicate_percentage']:.1f}%\n\n")
            
            # Next Steps
            f.write("## Next Steps\n\n")
            f.write("1. **Data Preprocessing:** Clean and filter the dataset based on recommendations\n")
            f.write("2. **Synthetic Data Generation:** Create additional Q&A pairs for low-coverage modules\n")
            f.write("3. **Embedding Training:** Start with high-priority modules\n")
            f.write("4. **Evaluation Setup:** Implement module-specific evaluation metrics\n")
            f.write("5. **Integration:** Connect with Engunity AI's existing systems\n\n")
        
        logger.info(f"Markdown report saved to {report_file}")
    
    def run_full_analysis(self) -> bool:
        """Run complete dataset analysis pipeline"""
        logger.info("Starting comprehensive dataset analysis for Engunity AI...")
        
        # Load dataset
        if not self.load_dataset():
            return False
        
        # Run analyses
        try:
            self.analysis_results['structure'] = self.analyze_structure()
            self.analysis_results['content_distribution'] = self.analyze_content_distribution()
            self.analysis_results['recommendations'] = self.generate_recommendations()
            
            # Save results
            self.save_analysis_results()
            
            # Print summary
            self._print_analysis_summary()
            
            logger.info("Dataset analysis completed successfully!")
            return True
            
        except Exception as e:
            logger.error(f"Error during analysis: {str(e)}")
            return False
    
    def _print_analysis_summary(self):
        """Print a comprehensive analysis summary to console"""
        print("\n" + "="*80)
        print("🎯 ENGUNITY AI - CS DATASET ANALYSIS SUMMARY")
        print("="*80)
        
        # Basic stats
        structure = self.analysis_results.get('structure', {})
        print(f"\n📊 DATASET OVERVIEW:")
        print(f"   • Total Records: {structure.get('total_rows', 'N/A'):,}")
        print(f"   • Columns: {structure.get('total_columns', 'N/A')}")
        print(f"   • Size: {structure.get('memory_usage_mb', 0):.2f} MB")
        print(f"   • Question Columns: {', '.join(structure.get('question_columns', ['None identified']))}")
        print(f"   • Answer Columns: {', '.join(structure.get('answer_columns', ['None identified']))}")
        
        # Module mapping
        print(f"\n🎯 ENGUNITY MODULE COVERAGE:")
        module_mapping = self.analysis_results.get('content_distribution', {}).get('module_mapping', {})
        
        for module, data in sorted(module_mapping.items(), key=lambda x: x[1]['percentage'], reverse=True):
            priority_emoji = "🔥" if data['priority'] == 'high' else "⚡" if data['priority'] == 'medium' else "📌"
            print(f"   {priority_emoji} {module.replace('_', ' ').title():<25} {data['percentage']:>6.1f}% ({data['matches']:,} matches)")
        
        # Training recommendations
        print(f"\n🚀 TRAINING RECOMMENDATIONS:")
        recommendations = self.analysis_results.get('recommendations', {})
        training_strategy = recommendations.get('training_strategy', {})
        
        if training_strategy.get('phase_1_modules'):
            print(f"   Phase 1 (High Priority): {', '.join(training_strategy['phase_1_modules'])}")
        if training_strategy.get('phase_2_modules'):
            print(f"   Phase 2 (Medium Priority): {', '.join(training_strategy['phase_2_modules'])}")
        
        data_filtering = recommendations.get('data_filtering', {})
        if data_filtering:
            print(f"   Recommended Keep Rate: {data_filtering.get('keep_percentage', 'N/A')}%")
            print(f"   Estimated Final Size: {data_filtering.get('estimated_final_size', 'N/A'):,} records")
        
        # Difficulty analysis
        difficulty_dist = self.analysis_results.get('content_distribution', {}).get('difficulty_distribution', {})
        if difficulty_dist.get('percentages'):
            print(f"\n📈 DIFFICULTY DISTRIBUTION:")
            for level, percentage in difficulty_dist['percentages'].items():
                emoji = "🟢" if level == 'beginner' else "🟡" if level == 'intermediate' else "🔴"
                print(f"   {emoji} {level.title():<12} {percentage:>6.1f}%")
        
        # Top question types
        question_types = self.analysis_results.get('content_distribution', {}).get('question_types', {})
        if question_types.get('percentages'):
            print(f"\n❓ TOP QUESTION TYPES:")
            sorted_types = sorted(question_types['percentages'].items(), key=lambda x: x[1], reverse=True)
            for qtype, percentage in sorted_types[:5]:
                if percentage > 0:
                    print(f"   • {qtype.replace('_', ' ').title():<15} {percentage:>6.1f}%")
        
        # Data quality insights
        content_dist = self.analysis_results.get('content_distribution', {})
        text_stats = content_dist.get('text_statistics', {})
        if text_stats:
            print(f"\n📋 DATA QUALITY INSIGHTS:")
            for col, stats in text_stats.items():
                if stats['duplicate_percentage'] > 20:
                    print(f"   ⚠️  High duplicates in {col}: {stats['duplicate_percentage']:.1f}%")
                if stats['avg_length'] < 50:
                    print(f"   ⚠️  Short content in {col}: avg {stats['avg_length']:.0f} chars")
        
        # Next steps
        print(f"\n🔄 NEXT STEPS:")
        print(f"   1. Run cs_preprocessor.py to clean and filter data")
        print(f"   2. Execute domain_mapper.py to create training splits")
        print(f"   3. Generate synthetic data for low-coverage modules")
        print(f"   4. Start embedding training with high-priority modules")
        
        print(f"\n📁 OUTPUT FILES:")
        print(f"   • Analysis Results: {self.output_dir}/dataset_analysis_results.json")
        print(f"   • Summary CSV: {self.output_dir}/module_mapping_summary.csv")
        print(f"   • Full Report: {self.output_dir}/dataset_analysis_report.md")
        print(f"   • Visualizations: {self.output_dir}/dataset_analysis_visualization.png")
        
        print("="*80)


def main():
    """Main execution function"""
    import argparse
    import sys
    
    parser = argparse.ArgumentParser(description='Analyze CS dataset for Engunity AI RAG training')
    parser.add_argument(
        '--dataset-path', 
        default='backend/data/training/kaggle_cs_dataset/train.csv',
        help='Path to the CS dataset CSV file'
    )
    parser.add_argument(
        '--output-dir',
        default='backend/data/training/analysis_output',
        help='Directory to save analysis outputs'
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
    
    # Initialize analyzer
    analyzer = EngunityDatasetAnalyzer(dataset_path=args.dataset_path)
    analyzer.output_dir = Path(args.output_dir)
    analyzer.output_dir.mkdir(exist_ok=True)
    
    # Run analysis
    success = analyzer.run_full_analysis()
    
    if success:
        print(f"\n✅ Analysis completed successfully!")
        print(f"📁 Results saved to: {analyzer.output_dir}")
        sys.exit(0)
    else:
        print(f"\n❌ Analysis failed. Check logs for details.")
        sys.exit(1)


if __name__ == "__main__":
    main()