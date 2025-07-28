#!/usr/bin/env python3
"""
Test Script for Hybrid RAG Agent

Tests the complete Document + Web Search hybrid functionality
"""

import asyncio
import sys
import os
from pathlib import Path

# Add the current directory to Python path
sys.path.append(str(Path(__file__).parent))

from hybrid_rag_agent import HybridRagAgent, HybridRagConfig
from smart_rag_agent import RagConfig
from web_search_integration import WebSearchConfig

async def test_hybrid_agent():
    """Test the hybrid agent with different scenarios"""
    
    print("🔧 Setting up Hybrid RAG Agent...")
    
    # Configuration
    rag_config = RagConfig(
        embedding_model_path="/home/ghost/engunity-ai/backend/models/production/cs_document_embeddings",
        num_candidate_answers=3,  # Smaller for testing
        max_retrieved_docs=2
    )
    
    web_config = WebSearchConfig(
        search_providers=['duckduckgo'],
        max_search_results=2,
        document_confidence_threshold=0.6
    )
    
    hybrid_config = HybridRagConfig(
        rag_config=rag_config,
        web_search_config=web_config,
        confidence_threshold=0.6,
        web_search_enabled=True
    )
    
    # Initialize agent
    try:
        agent = HybridRagAgent(hybrid_config)
        print("✅ Hybrid RAG Agent initialized successfully")
    except Exception as e:
        print(f"❌ Failed to initialize agent: {e}")
        return
    
    # Test scenarios
    test_cases = [
        {
            "query": "What is binary search algorithm?",
            "expected_source": "document",
            "description": "Should find answer in documents (CS algorithm)"
        },
        {
            "query": "What are the latest ChatGPT updates in 2024?",
            "expected_source": "web",
            "description": "Should use web search (recent news)"
        },
        {
            "query": "How do neural networks work?",
            "expected_source": "hybrid",
            "description": "Might use both sources (general CS topic)"
        },
        {
            "query": "What is quantum supremacy in computing?",
            "expected_source": "web",
            "description": "Should use web search (advanced topic)"
        }
    ]
    
    print(f"\n🧪 Testing {len(test_cases)} scenarios...\n")
    
    for i, test_case in enumerate(test_cases, 1):
        print(f"{'='*60}")
        print(f"TEST {i}: {test_case['description']}")
        print(f"Query: {test_case['query']}")
        print(f"Expected source: {test_case['expected_source']}")
        print('='*60)
        
        try:
            # Process query
            result = await agent.answer_query(test_case['query'])
            
            # Display results
            print(f"✅ Answer generated successfully")
            print(f"📝 Answer: {result['answer'][:200]}{'...' if len(result['answer']) > 200 else ''}")
            print(f"🎯 Source type: {result['source_type']}")
            print(f"📊 Confidence: {result['confidence']:.3f}")
            print(f"🌐 Web search used: {result['web_search_used']}")
            print(f"📚 Document sources: {result['document_answer']['sources']}")
            print(f"⏱️  Processing time: {result['processing_time']:.2f}s")
            print(f"🔄 Strategy: {result.get('strategy_used', 'unknown')}")
            
            # Quality assessment
            quality = result.get('quality_assessment', {})
            if quality:
                print(f"📈 Answer sufficient: {quality.get('is_sufficient', 'unknown')}")
                print(f"🔍 Semantic similarity: {quality.get('semantic_similarity', 0):.3f}")
            
            # Check if expectation was met
            actual_source = result['source_type']
            expected = test_case['expected_source']
            
            if expected in actual_source or actual_source in expected or expected == "hybrid":
                print(f"✅ Source expectation met: {actual_source}")
            else:
                print(f"⚠️  Source expectation not met: expected {expected}, got {actual_source}")
            
        except Exception as e:
            print(f"❌ Test failed: {e}")
            import traceback
            traceback.print_exc()
        
        print()
    
    # Print agent statistics
    print("📊 AGENT USAGE STATISTICS")
    print('='*60)
    stats = agent.get_stats()
    for key, value in stats.items():
        if isinstance(value, float):
            print(f"{key}: {value:.2f}")
        else:
            print(f"{key}: {value}")
    
    print("\n✨ Hybrid RAG Agent test completed!")

if __name__ == "__main__":
    asyncio.run(test_hybrid_agent())