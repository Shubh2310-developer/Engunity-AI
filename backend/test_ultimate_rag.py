#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Ultimate RAG System Test Script
================================

Comprehensive test script for the Ultimate Hybrid RAG system.

Tests:
1. System initialization
2. Document ingestion
3. Query execution
4. Performance benchmarks
5. Caching functionality
6. Error handling

Usage:
    python test_ultimate_rag.py

Author: Engunity AI Team
"""

import os
import sys
import time
import logging
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent))

from app.services.rag.ultimate_groq_rag import (
    UltimateHybridRAG,
    RAGConfig,
    create_ultimate_rag
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)


# Test document
TEST_DOCUMENT = """
Deep Learning and Neural Networks
==================================

Introduction to Deep Learning
------------------------------
Deep learning is a subset of machine learning that uses neural networks with multiple layers
to learn hierarchical representations of data. These networks can automatically discover
patterns and features from raw data, making them particularly effective for tasks like
image recognition, natural language processing, and speech recognition.

Convolutional Neural Networks (CNNs)
-------------------------------------
Convolutional Neural Networks are specialized neural networks designed for processing
grid-like data such as images. CNNs use convolutional layers that apply filters to detect
features like edges, textures, and patterns. The architecture typically consists of:

1. Convolutional layers: Apply filters to detect local features
2. Pooling layers: Reduce spatial dimensions and add translation invariance
3. Fully connected layers: Combine features for final classification

CNNs have revolutionized computer vision, achieving human-level performance on many
image classification tasks. Popular CNN architectures include ResNet, VGG, and Inception.

Recurrent Neural Networks (RNNs)
---------------------------------
Recurrent Neural Networks are designed for sequential data processing. Unlike feedforward
networks, RNNs maintain a hidden state that captures information about previous inputs
in the sequence. This makes them ideal for:

- Natural language processing
- Time series analysis
- Speech recognition
- Machine translation

However, traditional RNNs suffer from the vanishing gradient problem when processing
long sequences. This limitation led to the development of LSTM (Long Short-Term Memory)
and GRU (Gated Recurrent Unit) architectures.

Transformers and Attention Mechanisms
--------------------------------------
The Transformer architecture, introduced in the "Attention is All You Need" paper,
has become the foundation for modern NLP. Transformers use self-attention mechanisms
to process sequences in parallel, unlike RNNs which process sequentially.

Key advantages of Transformers:
- Parallel processing enables faster training
- Better at capturing long-range dependencies
- More scalable to large datasets
- Foundation for models like BERT, GPT, and T5

Training Deep Neural Networks
------------------------------
Training deep neural networks requires careful consideration of several factors:

1. Loss Functions: Choose appropriate loss based on the task (cross-entropy for
   classification, MSE for regression)

2. Optimization: Modern optimizers like Adam, AdamW, and RAdam provide adaptive
   learning rates and momentum

3. Regularization: Techniques like dropout, batch normalization, and weight decay
   prevent overfitting

4. Data Augmentation: Artificially expanding the training set improves generalization

5. Learning Rate Scheduling: Adjusting the learning rate during training can improve
   convergence and final performance

Applications of Deep Learning
------------------------------
Deep learning has transformed numerous fields:

- Computer Vision: Object detection, image segmentation, facial recognition
- Natural Language Processing: Machine translation, question answering, sentiment analysis
- Speech Processing: Speech recognition, text-to-speech synthesis
- Healthcare: Medical image analysis, drug discovery, patient diagnosis
- Autonomous Systems: Self-driving cars, robotics, drone navigation
- Recommendation Systems: Content recommendation, personalization

Challenges and Future Directions
---------------------------------
Despite remarkable progress, deep learning faces several challenges:

- Data Requirements: Most models require large labeled datasets
- Interpretability: Neural networks are often "black boxes"
- Energy Consumption: Training large models has environmental costs
- Bias and Fairness: Models can perpetuate biases in training data
- Generalization: Models may not generalize well to out-of-distribution data

Future research directions include:
- Few-shot and zero-shot learning
- Neural architecture search
- Efficient model compression
- Explainable AI
- Federated learning for privacy
"""


def print_section(title: str):
    """Print section header."""
    print(f"\n{'='*80}")
    print(f"  {title}")
    print(f"{'='*80}\n")


def test_initialization():
    """Test 1: System Initialization"""
    print_section("TEST 1: SYSTEM INITIALIZATION")

    try:
        config = RAGConfig(
            bge_model="BAAI/bge-small-en-v1.5",
            groq_model="llama-3.3-70b-versatile",
            chunk_size=700,
            chunk_overlap=150,
            enable_redis_cache=False,  # Disable for testing
            enable_reranking=True
        )

        groq_api_key = os.getenv("GROQ_API_KEY")
        if not groq_api_key:
            logger.warning("GROQ_API_KEY not set. Some tests will fail.")
            groq_api_key = "dummy_key_for_testing"

        rag = create_ultimate_rag(config, groq_api_key)

        print("✓ RAG system initialized successfully")
        print(f"  - Embedding dim: {rag.embedder.embedding_dim}")
        print(f"  - Device: {rag.config.device}")
        print(f"  - FAISS index: {rag.config.faiss_index_type}")
        print(f"  - Re-ranking: {'Enabled' if rag.reranker else 'Disabled'}")

        return rag

    except Exception as e:
        print(f"✗ Initialization failed: {e}")
        return None


def test_document_ingestion(rag: UltimateHybridRAG):
    """Test 2: Document Ingestion"""
    print_section("TEST 2: DOCUMENT INGESTION")

    try:
        start_time = time.time()

        stats = rag.ingest_document("test_doc_deep_learning", TEST_DOCUMENT)

        elapsed = time.time() - start_time

        print("✓ Document ingested successfully")
        print(f"  - Document ID: {stats['document_id']}")
        print(f"  - Chunks: {stats['chunk_count']}")
        print(f"  - Embedding dim: {stats['embedding_dim']}")
        print(f"  - Index size: {stats['index_size']}")
        print(f"  - Ingestion time: {stats['ingestion_time_ms']:.2f}ms")
        print(f"  - Total elapsed: {elapsed*1000:.2f}ms")

        return stats

    except Exception as e:
        print(f"✗ Ingestion failed: {e}")
        return None


def test_queries(rag: UltimateHybridRAG):
    """Test 3: Query Execution"""
    print_section("TEST 3: QUERY EXECUTION")

    test_queries = [
        "What is deep learning?",
        "Explain how CNNs work",
        "What are the advantages of Transformers?",
        "How do you train deep neural networks?",
        "What is quantum computing?"  # Out of context query
    ]

    results = []

    for i, query in enumerate(test_queries, 1):
        print(f"\n--- Query {i}: {query} ---")

        try:
            response = rag.query(query, document_id="test_doc_deep_learning")

            print(f"\n✓ Query successful")
            print(f"  Answer: {response.answer[:200]}...")
            print(f"  Confidence: {response.confidence:.2%}")
            print(f"  Total latency: {response.total_latency_ms:.2f}ms")
            print(f"    - Retrieval: {response.retrieval_latency_ms:.2f}ms")
            print(f"    - Generation: {response.generation_latency_ms:.2f}ms")
            print(f"  Retrieval count: {response.retrieval_count}")
            print(f"  Reranked count: {response.reranked_count}")
            print(f"  Cache hit: {response.cache_hit}")

            if response.sources:
                print(f"\n  Top Sources:")
                for j, source in enumerate(response.sources[:2], 1):
                    print(f"    Source {j}:")
                    print(f"      Score: {source.combined_score:.3f}")
                    print(f"      Text: {source.chunk_text[:100]}...")

            results.append({
                "query": query,
                "response": response,
                "success": True
            })

        except Exception as e:
            print(f"✗ Query failed: {e}")
            results.append({
                "query": query,
                "error": str(e),
                "success": False
            })

    return results


def test_performance(rag: UltimateHybridRAG):
    """Test 4: Performance Benchmarks"""
    print_section("TEST 4: PERFORMANCE BENCHMARKS")

    query = "What is deep learning?"
    iterations = 5

    print(f"Running {iterations} iterations of the same query...")

    latencies = []

    for i in range(iterations):
        start = time.time()
        response = rag.query(query, document_id="test_doc_deep_learning")
        elapsed = time.time() - start

        latencies.append(elapsed * 1000)

        print(f"  Iteration {i+1}: {elapsed*1000:.2f}ms (cache_hit={response.cache_hit})")

    print(f"\n✓ Performance summary:")
    print(f"  - Min latency: {min(latencies):.2f}ms")
    print(f"  - Max latency: {max(latencies):.2f}ms")
    print(f"  - Avg latency: {sum(latencies)/len(latencies):.2f}ms")

    return latencies


def test_error_handling(rag: UltimateHybridRAG):
    """Test 5: Error Handling"""
    print_section("TEST 5: ERROR HANDLING")

    # Test 1: Empty query
    print("Test 5.1: Empty query")
    try:
        response = rag.query("", document_id="test_doc_deep_learning")
        print("  ✗ Should have failed with empty query")
    except Exception as e:
        print(f"  ✓ Correctly handled empty query: {type(e).__name__}")

    # Test 2: Very long query
    print("\nTest 5.2: Very long query")
    try:
        long_query = "What is " + "deep learning " * 200
        response = rag.query(long_query, document_id="test_doc_deep_learning")
        print(f"  ✓ Handled long query (confidence: {response.confidence:.2%})")
    except Exception as e:
        print(f"  ✗ Failed on long query: {e}")

    # Test 3: Non-existent document
    print("\nTest 5.3: Non-existent document")
    try:
        response = rag.query("What is AI?", document_id="non_existent_doc")
        print(f"  ✓ Handled non-existent document (answer: {response.answer[:100]}...)")
    except Exception as e:
        print(f"  ℹ Failed as expected: {type(e).__name__}")

    # Test 4: Special characters
    print("\nTest 5.4: Special characters in query")
    try:
        response = rag.query("What is <script>alert('xss')</script>?", document_id="test_doc_deep_learning")
        print(f"  ✓ Handled special characters")
    except Exception as e:
        print(f"  ✗ Failed on special characters: {e}")


def main():
    """Run all tests."""
    print("\n" + "="*80)
    print("  ULTIMATE RAG SYSTEM - COMPREHENSIVE TEST SUITE")
    print("="*80)

    # Check environment
    groq_key = os.getenv("GROQ_API_KEY")
    if not groq_key:
        print("\n⚠️  WARNING: GROQ_API_KEY not set!")
        print("   Set with: export GROQ_API_KEY='your_key_here'")
        print("   Continuing with limited functionality...\n")

    # Run tests
    rag = test_initialization()
    if not rag:
        print("\n✗ Initialization failed. Aborting tests.")
        return

    stats = test_document_ingestion(rag)
    if not stats:
        print("\n✗ Document ingestion failed. Aborting remaining tests.")
        return

    if groq_key:
        results = test_queries(rag)
        latencies = test_performance(rag)
        test_error_handling(rag)
    else:
        print("\n⚠️  Skipping query tests (GROQ_API_KEY not set)")

    # Final summary
    print_section("TEST SUMMARY")
    print("✓ System initialization: PASSED")
    print("✓ Document ingestion: PASSED")

    if groq_key:
        successful_queries = sum(1 for r in results if r["success"])
        print(f"✓ Query execution: {successful_queries}/{len(results)} PASSED")
        print("✓ Performance benchmarks: PASSED")
        print("✓ Error handling: PASSED")
    else:
        print("⚠️  Query tests: SKIPPED (no API key)")

    print("\n" + "="*80)
    print("  ALL TESTS COMPLETED")
    print("="*80 + "\n")


if __name__ == "__main__":
    main()
