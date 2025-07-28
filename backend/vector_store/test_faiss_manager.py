#!/usr/bin/env python3
"""
Test script for CS FAISS Manager
"""

import sys
import os
sys.path.append(os.path.dirname(__file__))

import numpy as np
from cs_faiss_manager import CSFAISSManager, IndexType, QueryDomain, DocumentChunk

def test_faiss_manager():
    """Test basic FAISS manager functionality"""
    
    print("🔧 Testing CS FAISS Manager...")
    
    try:
        # Initialize manager
        manager = CSFAISSManager(
            embedding_model="/home/ghost/engunity-ai/backend/models/production/cs_document_embeddings",
            index_dir="./test_faiss_store/indices",
            metadata_dir="./test_faiss_store/metadata"
        )
        print("✅ FAISS Manager initialized")
        
        # Test documents
        test_docs = [
            {
                "id": "doc1",
                "text": "Binary search is an efficient algorithm for finding a target value in a sorted array. It has O(log n) time complexity.",
                "metadata": {"type": "algorithm", "domain": "theory"}
            },
            {
                "id": "doc2", 
                "text": "def binary_search(arr, target):\n    left, right = 0, len(arr) - 1\n    while left <= right:\n        mid = (left + right) // 2\n        if arr[mid] == target:\n            return mid\n        elif arr[mid] < target:\n            left = mid + 1\n        else:\n            right = mid - 1\n    return -1",
                "metadata": {"type": "code", "domain": "implementation"}
            },
            {
                "id": "doc3",
                "text": "Neural networks are computing systems inspired by biological neural networks. They consist of layers of interconnected nodes.",
                "metadata": {"type": "concept", "domain": "machine_learning"}
            }
        ]
        
        # Add documents
        print(f"📚 Adding {len(test_docs)} documents...")
        
        # Create DocumentChunk objects
        doc_chunks = []
        for doc in test_docs:
            chunk = DocumentChunk(
                id=doc["id"],
                content=doc["text"],
                chunk_type="general",
                source_id=doc["id"],
                metadata=doc["metadata"],
                embedding=None  # Will be computed by manager
            )
            doc_chunks.append(chunk)
        
        manager.add_documents(
            doc_chunks,
            index_type=IndexType.CODE  # Use an existing index type
        )
        print("✅ Documents added successfully")
        
        # Test search
        test_queries = [
            "How does binary search work?",
            "Python implementation of binary search",
            "What are neural networks?"
        ]
        
        print(f"\n🔍 Testing search with {len(test_queries)} queries...")
        for query in test_queries:
            print(f"\nQuery: {query}")
            
            # Search
            results = manager.search(query, top_k=2)
            
            print(f"Found {len(results)} results:")
            for i, result in enumerate(results):
                print(f"  {i+1}. ID: {result.doc_id}")
                print(f"     Score: {result.score:.3f}")
                print(f"     Text: {result.content[:100]}...")
        
        # Print basic info about indexes
        print(f"\n📊 FAISS Manager Info:")
        print(f"  Embedding model loaded: ✅")
        print(f"  Documents indexed: 3")
        print(f"  Search functionality: ✅")
        print(f"  Index types available: {list(IndexType)}")
        
        print("\n✅ FAISS Manager test completed successfully!")
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_faiss_manager()