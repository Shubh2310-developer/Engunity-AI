#!/usr/bin/env python3
"""
Simple Dataset Analyzer - Compatible version
"""

import csv
import json
from collections import Counter

def analyze_dataset():
    dataset_path = '/home/ghost/engunity-ai/backend/data/training/kaggle_cs_dataset/train_reduced.csv'
    
    print("🔍 Starting dataset analysis...")
    
    # Basic stats
    total_rows = 0
    headers = None
    sample_rows = []
    
    # Read and analyze
    try:
        with open(dataset_path, 'r', encoding='utf-8', errors='ignore') as f:
            reader = csv.reader(f)
            headers = next(reader)
            print(f"📊 Headers: {headers}")
            
            for i, row in enumerate(reader):
                total_rows += 1
                if i < 5:  # Keep first 5 rows as samples
                    sample_rows.append(row)
                
                if total_rows % 100000 == 0:
                    print(f"   Processed {total_rows:,} rows...")
        
        print(f"\n✅ Analysis Complete!")
        print(f"📈 Total rows: {total_rows:,}")
        print(f"📝 Columns: {len(headers)}")
        
        print(f"\n🔍 Sample data:")
        for i, row in enumerate(sample_rows[:3]):
            print(f"Row {i+1}:")
            for j, (header, value) in enumerate(zip(headers, row)):
                print(f"  {header}: {value[:100]}..." if len(str(value)) > 100 else f"  {header}: {value}")
            print()
            
        # File size
        import os
        file_size = os.path.getsize(dataset_path) / (1024**3)
        print(f"💾 File size: {file_size:.2f} GB")
        
        return {
            'total_rows': total_rows,
            'columns': headers,
            'file_size_gb': file_size
        }
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return None

if __name__ == "__main__":
    analyze_dataset()