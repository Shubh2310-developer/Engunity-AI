#!/usr/bin/env python3
"""
Fix Dependencies for Dataset Analyzer
====================================

This script checks and fixes common dependency issues for the dataset analyzer.

Usage:
    python backend/data/training/fix_dependencies.py

Author: Engunity AI Team
Date: 2025-07-26
"""

import subprocess
import sys
import os
from pathlib import Path

def run_command(command, description):
    """Run a command and handle errors"""
    print(f"Running: {description}")
    print(f"Command: {command}")
    
    try:
        result = subprocess.run(command, shell=True, check=True, capture_output=True, text=True)
        print(f"✅ Success: {description}")
        if result.stdout:
            print(f"Output: {result.stdout}")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed: {description}")
        print(f"Error: {e.stderr}")
        return False

def check_python_version():
    """Check Python version compatibility"""
    print("Checking Python version...")
    version = sys.version_info
    print(f"Python version: {version.major}.{version.minor}.{version.micro}")
    
    if version.major < 3 or (version.major == 3 and version.minor < 8):
        print("⚠️  Warning: Python 3.8+ recommended")
        return False
    return True

def fix_numpy_scipy_compatibility():
    """Fix numpy/scipy compatibility issues"""
    print("\n🔧 Fixing numpy/scipy compatibility...")
    
    # Uninstall problematic versions
    commands = [
        ("pip uninstall -y scipy", "Uninstall scipy"),
        ("pip uninstall -y numpy", "Uninstall numpy"),
        ("pip install numpy==1.24.3", "Install compatible numpy"),
        ("pip install scipy==1.10.1", "Install compatible scipy"),
    ]
    
    for command, description in commands:
        if not run_command(command, description):
            print(f"Failed to execute: {command}")
    
    # Install other required packages
    other_packages = [
        "pandas>=1.5.0",
        "matplotlib>=3.5.0",
        "seaborn>=0.11.0"
    ]
    
    for package in other_packages:
        run_command(f"pip install {package}", f"Install {package}")

def create_alternative_analyzer():
    """Create a version of the analyzer without seaborn dependencies"""
    print("\n📝 Creating fallback analyzer...")
    
    script_path = Path("backend/data/training/dataset_analyzer_simple.py")
    
    analyzer_code = '''#!/usr/bin/env python3
"""
Simple Dataset Analyzer (No Seaborn Dependencies)
================================================

Fallback version of dataset analyzer that works without seaborn/scipy.
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

def analyze_dataset_simple(dataset_path: str = "backend/data/training/kaggle_cs_dataset/train.csv"):
    """Simple dataset analysis without complex dependencies"""
    
    print("🔍 Starting simple dataset analysis...")
    
    try:
        # Load dataset
        print(f"Loading dataset from {dataset_path}")
        df = pd.read_csv(dataset_path, encoding='utf-8')
        print(f"✅ Dataset loaded: {len(df)} rows, {len(df.columns)} columns")
        
        # Basic statistics
        print("\\n📊 Basic Statistics:")
        print(f"- Total rows: {len(df):,}")
        print(f"- Total columns: {len(df.columns)}")
        print(f"- Column names: {list(df.columns)}")
        print(f"- Memory usage: {df.memory_usage(deep=True).sum() / 1024 / 1024:.2f} MB")
        
        # Missing values
        missing = df.isnull().sum()
        if missing.sum() > 0:
            print(f"\\n⚠️  Missing values:")
            for col, count in missing[missing > 0].items():
                print(f"  - {col}: {count} ({count/len(df)*100:.1f}%)")
        
        # Text column analysis
        text_columns = []
        for col in df.columns:
            if df[col].dtype == 'object':
                avg_length = df[col].dropna().astype(str).str.len().mean()
                if avg_length > 20:
                    text_columns.append(col)
                    print(f"\\n📝 Text column '{col}':")
                    print(f"  - Average length: {avg_length:.1f} characters")
                    print(f"  - Max length: {df[col].dropna().astype(str).str.len().max()}")
                    print(f"  - Unique values: {df[col].nunique():,}")
        
        # Sample content
        if len(df) > 0:
            print(f"\\n📄 Sample data:")
            for col in df.columns[:3]:  # Show first 3 columns
                sample_value = str(df[col].iloc[0])[:100]
                print(f"  - {col}: {sample_value}...")
        
        # Create output directory
        output_dir = Path("backend/data/training/analysis_output")
        output_dir.mkdir(exist_ok=True)
        
        # Save basic analysis
        analysis_results = {
            "dataset_info": {
                "total_rows": len(df),
                "total_columns": len(df.columns),
                "columns": list(df.columns),
                "memory_usage_mb": df.memory_usage(deep=True).sum() / 1024 / 1024,
                "text_columns": text_columns
            },
            "analysis_date": datetime.now().isoformat(),
            "status": "completed_simple_analysis"
        }
        
        # Save to JSON
        with open(output_dir / "simple_analysis_results.json", 'w') as f:
            json.dump(analysis_results, f, indent=2)
        
        # Create simple visualization
        if text_columns:
            try:
                plt.figure(figsize=(10, 6))
                column_lengths = [df[col].dropna().astype(str).str.len().mean() for col in text_columns]
                plt.bar(range(len(text_columns)), column_lengths)
                plt.xticks(range(len(text_columns)), text_columns, rotation=45)
                plt.title("Average Text Length by Column")
                plt.ylabel("Average Characters")
                plt.tight_layout()
                plt.savefig(output_dir / "simple_analysis_chart.png", dpi=150, bbox_inches='tight')
                plt.close()
                print(f"\\n📊 Chart saved to {output_dir}/simple_analysis_chart.png")
            except Exception as e:
                print(f"⚠️  Could not create chart: {e}")
        
        print(f"\\n✅ Simple analysis completed successfully!")
        print(f"📁 Results saved to: {output_dir}")
        return True
        
    except Exception as e:
        print(f"❌ Analysis failed: {e}")
        return False

if __name__ == "__main__":
    analyze_dataset_simple()
'''
    
    try:
        with open(script_path, 'w') as f:
            f.write(analyzer_code)
        print(f"✅ Created fallback analyzer: {script_path}")
        return True
    except Exception as e:
        print(f"❌ Failed to create fallback analyzer: {e}")
        return False

def main():
    """Main function to fix dependencies"""
    print("🛠️  Engunity AI - Dependency Fixer")
    print("=" * 50)
    
    # Check Python version
    if not check_python_version():
        print("⚠️  Consider upgrading Python")
    
    # Try to fix numpy/scipy issues
    fix_numpy_scipy_compatibility()
    
    # Create fallback analyzer
    create_alternative_analyzer()
    
    print("\n🔧 Dependency fix attempts completed!")
    print("\n📋 Next steps:")
    print("1. Try running: python backend/data/training/dataset_analyzer.py")
    print("2. If that fails, use: python backend/data/training/dataset_analyzer_simple.py")
    print("3. Check virtual environment activation if issues persist")

if __name__ == "__main__":
    main()