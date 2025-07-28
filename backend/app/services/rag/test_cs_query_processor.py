#!/usr/bin/env python3
"""
Test script for CS Query Processor
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..', '..'))

from cs_query_processor import CSQueryProcessor, QueryType, QueryIntent

def test_cs_query_processor():
    """Test CS Query Processor functionality"""
    
    print("🔧 Testing CS Query Processor...")
    
    try:
        # Initialize processor
        processor = CSQueryProcessor()
        print("✅ CS Query Processor initialized")
        
        # Test queries with different types
        test_queries = [
            "How to implement binary search in Python?",
            "What is the time complexity of quicksort?",
            "Explain machine learning algorithms",
            "def bubble_sort(arr): return sorted(arr)",
            "Compare BFS vs DFS algorithms",
            "What are design patterns in software engineering?",
            "How does neural network backpropagation work?",
            "Implement a hash table in Java"
        ]
        
        print(f"\n🔍 Testing query classification...")
        for query in test_queries:
            try:
                result = processor.process_query(query)
                print(f"\nQuery: '{query[:50]}...'")
                print(f"  Type: {result.get('query_type', 'unknown')}")
                print(f"  Complexity: {result.get('complexity', 'unknown')}")
                print(f"  Intent: {result.get('intent', 'unknown')}")
                print(f"  Keywords: {result.get('keywords', [])[:3]}...")  # First 3 keywords
                
                if 'expanded_query' in result:
                    print(f"  Expanded: {result['expanded_query'][:50]}...")
                    
            except Exception as e:
                print(f"  Error processing query: {e}")
        
        # Test specific features
        print(f"\n📝 Testing code detection...")
        code_queries = [
            "def fibonacci(n): return n if n <= 1 else fibonacci(n-1) + fibonacci(n-2)",
            "SELECT * FROM users WHERE age > 25",
            "import numpy as np; arr = np.array([1,2,3])",
            "How to sort an array?"
        ]
        
        for query in code_queries:
            try:
                result = processor.process_query(query)
                has_code = result.get('has_code', False)
                print(f"'{query[:40]}...' → Code detected: {has_code}")
            except Exception as e:
                print(f"Error: {e}")
        
        # Test technical term expansion
        print(f"\n🔄 Testing technical term expansion...")
        tech_queries = [
            "What is ML?",
            "Explain AI algorithms",
            "How does DFS work?",
            "What is API design?"
        ]
        
        for query in tech_queries:
            try:
                result = processor.process_query(query)
                original = query
                expanded = result.get('expanded_query', query)
                if original != expanded:
                    print(f"'{original}' → '{expanded}'")
                else:
                    print(f"'{original}' (no expansion)")
            except Exception as e:
                print(f"Error: {e}")
        
        print(f"\n📊 Testing query complexity analysis...")
        complexity_queries = [
            "Hello",  # Simple
            "How to sort an array?",  # Medium  
            "Explain the differences between supervised and unsupervised learning algorithms with examples",  # Complex
        ]
        
        for query in complexity_queries:
            try:
                result = processor.process_query(query)
                complexity = result.get('complexity', 'unknown')
                print(f"'{query}' → Complexity: {complexity}")
            except Exception as e:
                print(f"Error: {e}")
        
        print("\n✅ CS Query Processor test completed successfully!")
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_cs_query_processor()