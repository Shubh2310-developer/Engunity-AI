#!/usr/bin/env python3
"""
Simple test for CS Query Processor
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..', '..'))

from cs_query_processor import CSQueryProcessor

def test_cs_query_processor_simple():
    """Test CS Query Processor with its actual methods"""
    
    print("🔧 Testing CS Query Processor (Simple)...")
    
    try:
        # Initialize processor
        processor = CSQueryProcessor()
        print("✅ CS Query Processor initialized")
        
        # Show available methods
        print(f"\n📋 Available methods:")
        methods = [method for method in dir(processor) if not method.startswith('_')]
        for method in sorted(methods):
            print(f"  ✓ {method}")
        
        # Test query type detection
        print(f"\n🔍 Testing query type detection...")
        test_queries = [
            "How to implement binary search in Python?",
            "def quicksort(arr): return sorted(arr)",
            "What is machine learning?",
            "Compare BFS vs DFS algorithms"
        ]
        
        for query in test_queries:
            try:
                query_type = processor.detect_query_type(query)
                print(f"'{query[:40]}...' → Type: {query_type}")
            except Exception as e:
                print(f"Error detecting type for '{query[:40]}...': {e}")
        
        # Test query normalization
        print(f"\n🔧 Testing query normalization...")
        test_queries_norm = [
            "What is ML???",
            "HOW TO SORT AN ARRAY",
            "explain    neural    networks"
        ]
        
        for query in test_queries_norm:
            try:
                normalized = processor.normalize_query(query)
                print(f"'{query}' → '{normalized}'")
            except Exception as e:
                print(f"Error normalizing '{query}': {e}")
        
        # Test abbreviation expansion
        print(f"\n📝 Testing abbreviation expansion...")
        abbrev_queries = [
            "What is ML?",
            "Explain AI algorithms",
            "How does DFS work?",
            "What is API design?"
        ]
        
        for query in abbrev_queries:
            try:
                expanded = processor.expand_abbreviations(query)
                if query != expanded:
                    print(f"'{query}' → '{expanded}'")
                else:
                    print(f"'{query}' (no expansion needed)")
            except Exception as e:
                print(f"Error expanding '{query}': {e}")
        
        # Test query cleaning
        print(f"\n🧹 Testing query cleaning...")
        messy_queries = [
            "What is... umm... binary search???",
            "How to implement, you know, sorting algorithms?",
            "Explain ML (machine learning) please!"
        ]
        
        for query in messy_queries:
            try:
                cleaned = processor.clean_query_for_search(query)
                print(f"'{query}' → '{cleaned}'")
            except Exception as e:
                print(f"Error cleaning '{query}': {e}")
        
        # Test batch processing
        print(f"\n📦 Testing batch processing...")
        batch_queries = [
            "What is binary search?",
            "How to implement quicksort?",
            "Explain neural networks"
        ]
        
        try:
            batch_results = processor.batch_process_queries(batch_queries)
            print(f"Processed {len(batch_results)} queries in batch")
            for i, result in enumerate(batch_results[:2]):  # Show first 2
                print(f"  {i+1}. Result type: {type(result)}")
        except Exception as e:
            print(f"Batch processing error: {e}")
        
        # Test processing stats
        print(f"\n📊 Testing processing statistics...")
        try:
            stats = processor.get_processing_stats()
            print(f"Processing stats: {stats}")
        except Exception as e:
            print(f"Stats error: {e}")
        
        print("\n✅ CS Query Processor simple test completed successfully!")
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_cs_query_processor_simple()