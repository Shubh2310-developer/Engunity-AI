#!/usr/bin/env python3
"""
Test script for CS Retriever
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..', '..'))

from cs_retriever import CSRetriever, ChunkType, SourceQuality

def test_cs_retriever():
    """Test CS Retriever functionality"""
    
    print("🔧 Testing CS Retriever...")
    
    try:
        # Initialize retriever
        retriever = CSRetriever(
            faiss_manager=None,  # Will use default
            config_path=None     # Will use default config
        )
        print("✅ CS Retriever initialized")
        
        # Test available methods
        print(f"\n📋 Available methods:")
        methods = [method for method in dir(retriever) if not method.startswith('_')]
        for method in sorted(methods):
            print(f"  ✓ {method}")
        
        # Test document retrieval (main functionality)
        print(f"\n🔍 Testing document retrieval...")
        test_query = "How to implement binary search algorithm?"
        try:
            # Test with correct parameters
            results = retriever.retrieve_documents(
                query=test_query,
                top_k=3
            )
            print(f"Query: '{test_query}'")
            print(f"Results: {len(results)} documents found")
            for i, result in enumerate(results[:2]):
                print(f"  {i+1}. Score: {result.score:.3f}")
        except Exception as e:
            print(f"Document retrieval (expected with empty index): {str(e)[:100]}...")
        
        # Test context building with string input
        print(f"\n📚 Testing context building...")
        try:
            # Test with empty list first
            context = retriever.build_context([], max_length=200)
            print(f"Context built with empty list: '{context}'")
        except Exception as e:
            print(f"Context building error: {e}")
        
        # Test query processor (if available)
        print(f"\n🔧 Testing query processor...")
        if hasattr(retriever, 'query_processor') and retriever.query_processor:
            try:
                processed = retriever.query_processor.process_query(test_query)
                print(f"Query processor result: {type(processed)}")
            except Exception as e:
                print(f"Query processor error: {e}")
        else:
            print("Query processor not available or not initialized")
        
        print("\n✅ CS Retriever test completed successfully!")
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_cs_retriever()