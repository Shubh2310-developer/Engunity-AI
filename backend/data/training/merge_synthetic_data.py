#!/usr/bin/env python3
"""
Merge Synthetic Data with Existing Dataset
==========================================

Combines synthetic Q&A pairs with existing processed data for improved training coverage.
"""

import json
import logging
from pathlib import Path
from typing import List, Dict

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def load_jsonl(file_path: Path) -> List[Dict]:
    """Load JSONL file into list of dictionaries"""
    data = []
    if file_path.exists():
        with open(file_path, 'r', encoding='utf-8') as f:
            for line in f:
                data.append(json.loads(line.strip()))
    return data

def save_jsonl(data: List[Dict], file_path: Path):
    """Save list of dictionaries to JSONL file"""
    file_path.parent.mkdir(parents=True, exist_ok=True)
    with open(file_path, 'w', encoding='utf-8') as f:
        for item in data:
            f.write(json.dumps(item, ensure_ascii=False) + '\n')

def merge_datasets():
    """Merge existing processed data with synthetic data"""
    logger.info("🔄 Merging existing processed data with synthetic data...")
    
    # Paths
    processed_dir = Path("backend/data/training/processed")
    synthetic_dir = Path("backend/data/training/synthetic")
    
    # Load existing data
    existing_data = load_jsonl(processed_dir / "filtered_qa_pairs.jsonl")
    logger.info(f"Loaded {len(existing_data)} existing records")
    
    # Load synthetic data
    blockchain_synthetic = load_jsonl(synthetic_dir / "synthetic_blockchain_qa.jsonl")
    document_qa_synthetic = load_jsonl(synthetic_dir / "synthetic_document_qa_qa.jsonl")
    
    logger.info(f"Loaded {len(blockchain_synthetic)} synthetic blockchain records")
    logger.info(f"Loaded {len(document_qa_synthetic)} synthetic document QA records")
    
    # Merge all data
    merged_data = existing_data + blockchain_synthetic + document_qa_synthetic
    
    # Update IDs to avoid conflicts
    for i, record in enumerate(merged_data):
        if 'id' in record:
            if record['id'].startswith('synthetic'):
                continue  # Keep synthetic IDs as-is
            else:
                record['id'] = f"original_{i:06d}"
    
    # Add missing fields for consistency
    for record in merged_data:
        if 'module_relevance_scores' not in record:
            record['module_relevance_scores'] = {record.get('primary_module', 'unknown'): 1.0}
        if 'quality_metrics' not in record:
            record['quality_metrics'] = {'overall_score': 0.5}
        if 'overall_quality' not in record:
            record['overall_quality'] = 0.5
        if 'code_snippets' not in record:
            record['code_snippets'] = []
        if 'technical_terms' not in record:
            record['technical_terms'] = {}
        if 'question_length' not in record:
            record['question_length'] = len(record.get('question', '').split())
        if 'answer_length' not in record:
            record['answer_length'] = len(record.get('answer', '').split())
        if 'has_code' not in record:
            record['has_code'] = '```' in record.get('answer', '') or '`' in record.get('answer', '')
        if 'technical_complexity' not in record:
            record['technical_complexity'] = 1
        if 'quality_tier' not in record:
            quality = record.get('overall_quality', 0.5)
            if quality >= 0.7:
                record['quality_tier'] = 'high'
            elif quality >= 0.4:
                record['quality_tier'] = 'medium'
            else:
                record['quality_tier'] = 'low'
    
    # Save merged data
    merged_file = processed_dir / "filtered_qa_pairs_merged.jsonl"
    save_jsonl(merged_data, merged_file)
    
    # Also backup original and replace
    original_file = processed_dir / "filtered_qa_pairs.jsonl"
    backup_file = processed_dir / "filtered_qa_pairs_backup.jsonl"
    
    if original_file.exists():
        # Create backup
        import shutil
        shutil.copy2(original_file, backup_file)
        logger.info(f"Created backup: {backup_file}")
    
    # Replace original with merged data
    save_jsonl(merged_data, original_file)
    
    # Print summary
    module_counts = {}
    quality_counts = {'high': 0, 'medium': 0, 'low': 0}
    
    for record in merged_data:
        module = record.get('primary_module', 'unknown')
        module_counts[module] = module_counts.get(module, 0) + 1
        
        quality = record.get('quality_tier', 'low')
        quality_counts[quality] = quality_counts.get(quality, 0) + 1
    
    logger.info("\\n" + "="*80)
    logger.info("📊 MERGED DATASET SUMMARY")
    logger.info("="*80)
    logger.info(f"Total Records: {len(merged_data)}")
    logger.info(f"Original Records: {len(existing_data)}")
    logger.info(f"Synthetic Records: {len(blockchain_synthetic) + len(document_qa_synthetic)}")
    logger.info("")
    logger.info("🎯 MODULE DISTRIBUTION:")
    for module, count in sorted(module_counts.items(), key=lambda x: x[1], reverse=True):
        status = "✅" if count >= 50 else "⚠️" if count >= 10 else "❌"
        logger.info(f"   {status} {module.replace('_', ' ').title()}: {count} records")
    logger.info("")
    logger.info("🏆 QUALITY DISTRIBUTION:")
    total_quality = sum(quality_counts.values())
    for tier, count in quality_counts.items():
        percentage = (count / total_quality * 100) if total_quality > 0 else 0
        emoji = "🔥" if tier == 'high' else "⚡" if tier == 'medium' else "📌"
        logger.info(f"   {emoji} {tier.title()}: {count} ({percentage:.1f}%)")
    
    logger.info("="*80)
    logger.info("✅ Data merging completed successfully!")
    logger.info(f"📁 Merged data saved to: {original_file}")
    
    return len(merged_data)

if __name__ == "__main__":
    merge_datasets()