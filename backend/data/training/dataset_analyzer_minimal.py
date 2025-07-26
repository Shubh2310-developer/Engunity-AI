#!/usr/bin/env python3
"""
Minimal Dataset Analyzer for Engunity AI
=======================================

A simplified version that works without scipy/seaborn dependencies.
Focuses on core analysis needed for RAG training.

Usage:
    python backend/data/training/dataset_analyzer_minimal.py

Author: Engunity AI Team
Date: 2025-07-26
"""

import pandas as pd
import numpy as np
import json
import logging
import re
from pathlib import Path
from typing import Dict, List, Optional
from collections import Counter
import matplotlib
matplotlib.use('Agg')  # Use non-interactive backend
import matplotlib.pyplot as plt
from datetime import datetime
import warnings
warnings.filterwarnings('ignore')

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('backend/data/training/minimal_analysis.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class MinimalDatasetAnalyzer:
    """Minimal dataset analyzer for Engunity AI RAG training"""
    
    def __init__(self, dataset_path: str = "backend/data/training/kaggle_cs_dataset/train.csv"):
        self.dataset_path = Path(dataset_path)
        self.output_dir = Path("backend/data/training/analysis_output")
        self.output_dir.mkdir(exist_ok=True)
        
        # Engunity module keywords (simplified)
        self.module_keywords = {
            'code_assistant': ['programming', 'code', 'algorithm', 'python', 'javascript', 'debugging'],
            'chat': ['conversation', 'dialogue', 'chat', 'interaction'],
            'document_qa': ['documentation', 'text', 'search', 'query', 'document'],
            'data_analysis': ['data', 'statistics', 'analysis', 'machine learning', 'ml'],
            'research_tools': ['research', 'academic', 'paper', 'study'],
            'notebook': ['jupyter', 'notebook', 'execution'],
            'blockchain': ['blockchain', 'smart contract', 'cryptocurrency', 'web3']
        }
        
        self.df = None
        self.results = {}
    
    def load_dataset(self) -> bool:
        """Load dataset with error handling"""
        try:
            logger.info(f"Loading dataset from {self.dataset_path}")
            
            if not self.dataset_path.exists():
                logger.error(f"Dataset file not found: {self.dataset_path}")
                return False
            
            self.df = pd.read_csv(self.dataset_path, encoding='utf-8')
            logger.info(f"Dataset loaded: {len(self.df)} rows, {len(self.df.columns)} columns")
            
            return True
            
        except Exception as e:
            logger.error(f"Error loading dataset: {str(e)}")
            return False
    
    def analyze_basic_structure(self) -> Dict:
        """Analyze basic dataset structure"""
        logger.info("Analyzing dataset structure...")
        
        structure = {
            'total_rows': len(self.df),
            'total_columns': len(self.df.columns),
            'columns': list(self.df.columns),
            'data_types': {col: str(dtype) for col, dtype in self.df.dtypes.items()},
            'missing_values': self.df.isnull().sum().to_dict(),
            'memory_usage_mb': self.df.memory_usage(deep=True).sum() / 1024 / 1024
        }
        
        # Identify text columns
        text_columns = []
        for col in self.df.columns:
            if self.df[col].dtype == 'object':
                avg_length = self.df[col].dropna().astype(str).str.len().mean()
                if avg_length > 20:
                    text_columns.append(col)
        
        structure['text_columns'] = text_columns
        
        # Identify potential Q&A columns
        question_cols = [col for col in self.df.columns 
                        if any(keyword in col.lower() for keyword in ['question', 'query', 'q'])]
        answer_cols = [col for col in self.df.columns 
                      if any(keyword in col.lower() for keyword in ['answer', 'response', 'a'])]
        
        structure['question_columns'] = question_cols
        structure['answer_columns'] = answer_cols
        
        return structure
    
    def analyze_content(self) -> Dict:
        """Analyze content distribution"""
        logger.info("Analyzing content distribution...")
        
        text_columns = self.results['structure']['text_columns']
        
        content_analysis = {
            'text_statistics': {},
            'module_relevance': {},
            'sample_data': {}
        }
        
        # Analyze each text column
        for col in text_columns:
            text_data = self.df[col].dropna().astype(str)
            
            content_analysis['text_statistics'][col] = {
                'total_entries': len(text_data),
                'avg_length': text_data.str.len().mean(),
                'max_length': text_data.str.len().max(),
                'min_length': text_data.str.len().min(),
                'unique_entries': text_data.nunique(),
                'avg_words': text_data.str.split().str.len().mean()
            }
            
            # Sample data
            if len(text_data) > 0:
                sample = str(text_data.iloc[0])
                content_analysis['sample_data'][col] = sample[:200] + "..." if len(sample) > 200 else sample
        
        # Analyze module relevance
        all_text = ""
        for col in text_columns:
            all_text += " " + self.df[col].fillna("").astype(str).str.cat(sep=" ")
        
        all_text = all_text.lower()
        
        for module, keywords in self.module_keywords.items():
            matches = sum(all_text.count(keyword) for keyword in keywords)
            content_analysis['module_relevance'][module] = {
                'matches': matches,
                'keywords': keywords
            }
        
        # Calculate percentages
        total_matches = sum(data['matches'] for data in content_analysis['module_relevance'].values())
        if total_matches > 0:
            for module in content_analysis['module_relevance']:
                matches = content_analysis['module_relevance'][module]['matches']
                content_analysis['module_relevance'][module]['percentage'] = (matches / total_matches) * 100
        
        return content_analysis
    
    def generate_simple_recommendations(self) -> Dict:
        """Generate basic recommendations"""
        logger.info("Generating recommendations...")
        
        structure = self.results['structure']
        content = self.results['content']
        
        recommendations = {
            'data_quality': [],
            'preprocessing': [],
            'training_priority': {},
            'next_steps': []
        }
        
        # Data quality checks
        total_rows = structure['total_rows']
        if total_rows < 1000:
            recommendations['data_quality'].append("Dataset is small - consider augmentation")
        elif total_rows > 100000:
            recommendations['data_quality'].append("Large dataset - consider sampling for initial training")
        
        # Check for missing values
        missing_values = structure['missing_values']
        high_missing = [col for col, count in missing_values.items() if count > total_rows * 0.1]
        if high_missing:
            recommendations['data_quality'].append(f"High missing values in: {', '.join(high_missing)}")
        
        # Preprocessing recommendations
        recommendations['preprocessing'] = [
            "Clean and normalize text data",
            "Remove or handle missing values",
            "Split into training/validation/test sets",
            "Create embeddings for text content"
        ]
        
        # Training priorities based on module relevance
        module_relevance = content['module_relevance']
        for module, data in module_relevance.items():
            percentage = data.get('percentage', 0)
            if percentage > 10:
                recommendations['training_priority'][module] = 'high'
            elif percentage > 5:
                recommendations['training_priority'][module] = 'medium'
            else:
                recommendations['training_priority'][module] = 'low'
        
        # Next steps
        recommendations['next_steps'] = [
            "Run data preprocessing pipeline",
            "Create training/validation splits",
            "Generate embeddings for high-priority modules",
            "Set up evaluation metrics",
            "Begin RAG model training"
        ]
        
        return recommendations
    
    def create_simple_visualizations(self):
        """Create basic visualizations"""
        try:
            logger.info("Creating visualizations...")
            
            fig, axes = plt.subplots(2, 2, figsize=(12, 10))
            fig.suptitle('Engunity AI - Dataset Analysis', fontsize=14, fontweight='bold')
            
            # Text column lengths
            text_stats = self.results['content']['text_statistics']
            if text_stats:
                columns = list(text_stats.keys())
                avg_lengths = [text_stats[col]['avg_length'] for col in columns]
                
                axes[0, 0].bar(range(len(columns)), avg_lengths)
                axes[0, 0].set_xticks(range(len(columns)))
                axes[0, 0].set_xticklabels(columns, rotation=45)
                axes[0, 0].set_title('Average Text Length by Column')
                axes[0, 0].set_ylabel('Characters')
            
            # Module relevance
            module_relevance = self.results['content']['module_relevance']
            modules = list(module_relevance.keys())
            percentages = [module_relevance[m].get('percentage', 0) for m in modules]
            
            axes[0, 1].pie(percentages, labels=modules, autopct='%1.1f%%', startangle=90)
            axes[0, 1].set_title('Content Relevance by Module')
            
            # Missing values
            missing_data = self.results['structure']['missing_values']
            cols_with_missing = {k: v for k, v in missing_data.items() if v > 0}
            if cols_with_missing:
                axes[1, 0].bar(range(len(cols_with_missing)), list(cols_with_missing.values()))
                axes[1, 0].set_xticks(range(len(cols_with_missing)))
                axes[1, 0].set_xticklabels(list(cols_with_missing.keys()), rotation=45)
                axes[1, 0].set_title('Missing Values by Column')
                axes[1, 0].set_ylabel('Count')
            else:
                axes[1, 0].text(0.5, 0.5, 'No Missing Values', ha='center', va='center', transform=axes[1, 0].transAxes)
                axes[1, 0].set_title('Missing Values')
            
            # Data types
            data_types = self.results['structure']['data_types']
            type_counts = Counter(data_types.values())
            
            axes[1, 1].pie(type_counts.values(), labels=type_counts.keys(), autopct='%1.1f%%')
            axes[1, 1].set_title('Data Types Distribution')
            
            plt.tight_layout()
            viz_file = self.output_dir / "minimal_analysis_visualization.png"
            plt.savefig(viz_file, dpi=300, bbox_inches='tight')
            plt.close()
            
            logger.info(f"Visualizations saved to {viz_file}")
            
        except Exception as e:
            logger.warning(f"Could not create visualizations: {str(e)}")
    
    def save_results(self):
        """Save analysis results"""
        try:
            # Save JSON results
            results_file = self.output_dir / "minimal_analysis_results.json"
            with open(results_file, 'w', encoding='utf-8') as f:
                json.dump(self.results, f, indent=2, ensure_ascii=False, default=str)
            
            # Create simple report
            self.create_text_report()
            
            logger.info(f"Results saved to {self.output_dir}")
            
        except Exception as e:
            logger.error(f"Error saving results: {str(e)}")
    
    def create_text_report(self):
        """Create a simple text report"""
        report_file = self.output_dir / "minimal_analysis_report.txt"
        
        with open(report_file, 'w', encoding='utf-8') as f:
            f.write("ENGUNITY AI - MINIMAL DATASET ANALYSIS REPORT\\n")
            f.write("=" * 50 + "\\n\\n")
            f.write(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\\n\\n")
            
            # Basic stats
            structure = self.results['structure']
            f.write("DATASET OVERVIEW:\\n")
            f.write(f"- Total rows: {structure['total_rows']:,}\\n")
            f.write(f"- Total columns: {structure['total_columns']}\\n")
            f.write(f"- Memory usage: {structure['memory_usage_mb']:.2f} MB\\n")
            f.write(f"- Text columns: {len(structure['text_columns'])}\\n\\n")
            
            # Module relevance
            f.write("MODULE RELEVANCE:\\n")
            module_relevance = self.results['content']['module_relevance']
            for module, data in sorted(module_relevance.items(), key=lambda x: x[1].get('percentage', 0), reverse=True):
                percentage = data.get('percentage', 0)
                matches = data['matches']
                f.write(f"- {module.replace('_', ' ').title()}: {percentage:.1f}% ({matches} matches)\\n")
            
            f.write("\\n")
            
            # Recommendations
            recommendations = self.results['recommendations']
            f.write("RECOMMENDATIONS:\\n")
            f.write("Data Quality Issues:\\n")
            for issue in recommendations['data_quality']:
                f.write(f"- {issue}\\n")
            
            f.write("\\nNext Steps:\\n")
            for step in recommendations['next_steps']:
                f.write(f"- {step}\\n")
        
        logger.info(f"Text report saved to {report_file}")
    
    def print_summary(self):
        """Print analysis summary to console"""
        print("\\n" + "=" * 60)
        print("🎯 ENGUNITY AI - MINIMAL DATASET ANALYSIS")
        print("=" * 60)
        
        structure = self.results['structure']
        print(f"\\n📊 DATASET OVERVIEW:")
        print(f"   • Total Records: {structure['total_rows']:,}")
        print(f"   • Columns: {structure['total_columns']}")
        print(f"   • Memory: {structure['memory_usage_mb']:.2f} MB")
        print(f"   • Text Columns: {', '.join(structure['text_columns'])}")
        
        print(f"\\n🎯 MODULE RELEVANCE:")
        module_relevance = self.results['content']['module_relevance']
        for module, data in sorted(module_relevance.items(), key=lambda x: x[1].get('percentage', 0), reverse=True):
            percentage = data.get('percentage', 0)
            matches = data['matches']
            emoji = "🔥" if percentage > 10 else "⚡" if percentage > 5 else "📌"
            print(f"   {emoji} {module.replace('_', ' ').title():<20} {percentage:>6.1f}% ({matches} matches)")
        
        print(f"\\n📁 OUTPUT FILES:")
        print(f"   • Results: {self.output_dir}/minimal_analysis_results.json")
        print(f"   • Report: {self.output_dir}/minimal_analysis_report.txt")
        print(f"   • Charts: {self.output_dir}/minimal_analysis_visualization.png")
        
        print("=" * 60)
    
    def run_analysis(self) -> bool:
        """Run complete minimal analysis"""
        logger.info("Starting minimal dataset analysis...")
        
        try:
            # Load dataset
            if not self.load_dataset():
                return False
            
            # Run analyses
            self.results['structure'] = self.analyze_basic_structure()
            self.results['content'] = self.analyze_content()
            self.results['recommendations'] = self.generate_simple_recommendations()
            self.results['analysis_date'] = datetime.now().isoformat()
            
            # Create outputs
            self.create_simple_visualizations()
            self.save_results()
            self.print_summary()
            
            logger.info("Minimal analysis completed successfully!")
            return True
            
        except Exception as e:
            logger.error(f"Analysis failed: {str(e)}")
            return False

def main():
    """Main execution function"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Minimal CS dataset analysis for Engunity AI')
    parser.add_argument(
        '--dataset-path',
        default='backend/data/training/kaggle_cs_dataset/train.csv',
        help='Path to the dataset CSV file'
    )
    
    args = parser.parse_args()
    
    # Run analysis
    analyzer = MinimalDatasetAnalyzer(dataset_path=args.dataset_path)
    success = analyzer.run_analysis()
    
    if success:
        print("\\n✅ Analysis completed successfully!")
    else:
        print("\\n❌ Analysis failed. Check logs for details.")
        return 1
    
    return 0

if __name__ == "__main__":
    import sys
    sys.exit(main())