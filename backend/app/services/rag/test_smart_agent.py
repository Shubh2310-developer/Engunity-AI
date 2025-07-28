#!/usr/bin/env python3
"""
Test Script for Smart RAG Agent

This script tests the complete Smart RAG Agent pipeline including:
1. Document loading and embedding
2. Multi-candidate generation
3. Answer scoring and selection
4. Training with backpropagation

Usage:
    python test_smart_agent.py --quick  # Quick test with simulated LLM
    python test_smart_agent.py --full   # Full test with real LLM
"""

import asyncio
import json
import logging
import sys
import time
from pathlib import Path
import torch

# Add the current directory to Python path
sys.path.append(str(Path(__file__).parent))

from smart_rag_agent import SmartRagAgent, RagConfig
from llm_integration import EnhancedSmartRagAgent, LLMConfig

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class SmartAgentTester:
    """Test suite for the Smart RAG Agent"""
    
    def __init__(self, use_real_llm: bool = False):
        self.use_real_llm = use_real_llm
        self.setup_configs()
        self.test_results = {}
    
    def setup_configs(self):
        """Setup test configurations"""
        self.rag_config = RagConfig(
            embedding_model_path="/home/ghost/engunity-ai/backend/models/production/cs_document_embeddings",
            max_retrieved_docs=3,
            num_candidate_answers=4,  # Smaller for testing
            learning_rate=1e-4,
            device="cuda" if torch.cuda.is_available() else "cpu"
        )
        
        if self.use_real_llm:
            self.llm_config = LLMConfig(
                model_type="huggingface",
                model_name="microsoft/DialoGPT-small",  # Small model for testing
                max_tokens=128,
                device=self.rag_config.device
            )
        else:
            self.llm_config = None
        
        logger.info(f"Test configuration:")
        logger.info(f"  Device: {self.rag_config.device}")
        logger.info(f"  Use real LLM: {self.use_real_llm}")
        logger.info(f"  Embedding model: {self.rag_config.embedding_model_path}")
    
    def create_test_documents(self) -> list:
        """Create test documents for the agent"""
        test_docs = [
            """
            Binary Search Algorithm
            
            Binary search is an efficient algorithm for finding a target value in a sorted array.
            It works by repeatedly dividing the search interval in half.
            
            Time complexity: O(log n)
            Space complexity: O(1) for iterative implementation
            
            Steps:
            1. Compare target with middle element
            2. If target equals middle, return index
            3. If target is less than middle, search left half
            4. If target is greater than middle, search right half
            5. Repeat until found or interval is empty
            """,
            
            """
            Sorting Algorithms
            
            Common sorting algorithms include:
            - Quick Sort: Average O(n log n), worst O(n²)
            - Merge Sort: Always O(n log n), stable
            - Heap Sort: Always O(n log n), in-place
            - Bubble Sort: O(n²), simple but inefficient
            
            Quick Sort is often preferred for its average-case performance.
            Merge Sort is preferred when stability is required.
            """,
            
            """
            Data Structures
            
            Fundamental data structures:
            - Arrays: Fixed size, O(1) access
            - Linked Lists: Dynamic size, O(n) access
            - Hash Tables: O(1) average access
            - Trees: Hierarchical data, O(log n) operations
            - Graphs: Network structures, various algorithms
            
            Choose based on your access patterns and performance requirements.
            """,
            
            """
            Machine Learning Basics
            
            Key concepts:
            - Supervised Learning: Training with labeled data
            - Unsupervised Learning: Finding patterns in unlabeled data
            - Reinforcement Learning: Learning through rewards/penalties
            
            Common algorithms:
            - Linear Regression: Predicting continuous values
            - Decision Trees: Classification and regression
            - Neural Networks: Complex pattern recognition
            """
        ]
        
        # Write test documents to temporary files
        test_files = []
        for i, content in enumerate(test_docs):
            file_path = f"/tmp/test_doc_{i}.txt"
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            test_files.append(file_path)
        
        return test_files
    
    def create_test_queries(self) -> list:
        """Create test queries with expected answers"""
        return [
            {
                "query": "How does binary search work?",
                "expected_keywords": ["sorted array", "divide", "half", "O(log n)", "middle"],
                "category": "algorithms"
            },
            {
                "query": "What is the time complexity of quick sort?",
                "expected_keywords": ["O(n log n)", "average", "O(n²)", "worst"],
                "category": "algorithms"
            },
            {
                "query": "What are the main types of machine learning?",
                "expected_keywords": ["supervised", "unsupervised", "reinforcement"],
                "category": "machine_learning"
            },
            {
                "query": "How do hash tables work?",
                "expected_keywords": ["O(1)", "average", "access"],
                "category": "data_structures"
            }
        ]
    
    async def test_document_loading(self, agent) -> bool:
        """Test document loading and embedding"""
        logger.info("Testing document loading...")
        
        try:
            # Create test documents
            test_files = self.create_test_documents()
            
            # Load documents into agent
            if hasattr(agent, 'base_agent'):
                agent.base_agent.document_processor.load_documents(test_files)
                doc_count = len(agent.base_agent.document_processor.document_store)
            else:
                agent.document_processor.load_documents(test_files)
                doc_count = len(agent.document_processor.document_store)
            
            logger.info(f"Loaded {doc_count} document chunks")
            
            self.test_results['document_loading'] = {
                'success': True,
                'documents_loaded': doc_count,
                'message': f"Successfully loaded {doc_count} document chunks"
            }
            
            return True
            
        except Exception as e:
            logger.error(f"Document loading failed: {e}")
            self.test_results['document_loading'] = {
                'success': False,
                'error': str(e)
            }
            return False
    
    async def test_document_retrieval(self, agent) -> bool:
        """Test document retrieval"""
        logger.info("Testing document retrieval...")
        
        try:
            query = "What is binary search?"
            
            if hasattr(agent, 'base_agent'):
                retrieved_docs = agent.base_agent.document_processor.retrieve_documents(query)
            else:
                retrieved_docs = agent.document_processor.retrieve_documents(query)
            
            logger.info(f"Retrieved {len(retrieved_docs)} documents for query: {query}")
            
            # Check if relevant document was retrieved
            found_binary_search = any("binary search" in doc['content'].lower() 
                                    for doc in retrieved_docs)
            
            self.test_results['document_retrieval'] = {
                'success': True,
                'documents_retrieved': len(retrieved_docs),
                'relevant_found': found_binary_search,
                'message': f"Retrieved {len(retrieved_docs)} documents, relevant: {found_binary_search}"
            }
            
            return True
            
        except Exception as e:
            logger.error(f"Document retrieval failed: {e}")
            self.test_results['document_retrieval'] = {
                'success': False,
                'error': str(e)
            }
            return False
    
    async def test_answer_generation(self, agent) -> bool:
        """Test answer generation"""
        logger.info("Testing answer generation...")
        
        try:
            test_queries = self.create_test_queries()
            successful_queries = 0
            
            for test_case in test_queries:
                query = test_case['query']
                expected_keywords = test_case['expected_keywords']
                
                logger.info(f"Testing query: {query}")
                
                start_time = time.time()
                result = await agent.answer_query(query)
                response_time = time.time() - start_time
                
                # Check if answer contains expected keywords
                answer = result['answer'].lower()
                found_keywords = [kw for kw in expected_keywords if kw.lower() in answer]
                
                logger.info(f"  Answer: {result['answer'][:100]}...")
                logger.info(f"  Confidence: {result['confidence']:.3f}")
                logger.info(f"  Response time: {response_time:.2f}s")
                logger.info(f"  Found keywords: {found_keywords}")
                
                if len(found_keywords) > 0:
                    successful_queries += 1
            
            success_rate = successful_queries / len(test_queries)
            
            self.test_results['answer_generation'] = {
                'success': True,
                'total_queries': len(test_queries),
                'successful_queries': successful_queries,
                'success_rate': success_rate,
                'message': f"Success rate: {success_rate:.2%}"
            }
            
            return success_rate > 0.5  # At least 50% success rate
            
        except Exception as e:
            logger.error(f"Answer generation failed: {e}")
            self.test_results['answer_generation'] = {
                'success': False,
                'error': str(e)
            }
            return False
    
    async def test_training_loop(self, agent) -> bool:
        """Test training with backpropagation"""
        logger.info("Testing training loop...")
        
        try:
            # Create training examples
            training_examples = [
                {
                    "query": "What is the time complexity of binary search?",
                    "ground_truth": "Binary search has O(log n) time complexity because it divides the search space in half with each iteration."
                },
                {
                    "query": "How does quick sort work?",
                    "ground_truth": "Quick sort works by selecting a pivot element and partitioning the array around it, then recursively sorting the subarrays."
                }
            ]
            
            total_loss = 0.0
            successful_training = 0
            
            for example in training_examples:
                try:
                    result = await agent.answer_query(
                        example['query'], 
                        example['ground_truth']
                    )
                    
                    if 'training_loss' in result:
                        loss = result['training_loss']
                        total_loss += loss
                        successful_training += 1
                        logger.info(f"  Training loss: {loss:.4f}")
                    else:
                        logger.warning("No training loss returned")
                        
                except Exception as e:
                    logger.error(f"Error in training example: {e}")
            
            avg_loss = total_loss / max(successful_training, 1)
            
            self.test_results['training_loop'] = {
                'success': True,
                'examples_trained': successful_training,
                'average_loss': avg_loss,
                'message': f"Trained on {successful_training} examples, avg loss: {avg_loss:.4f}"
            }
            
            return successful_training > 0
            
        except Exception as e:
            logger.error(f"Training loop failed: {e}")
            self.test_results['training_loop'] = {
                'success': False,
                'error': str(e)
            }
            return False
    
    async def run_tests(self):
        """Run all tests"""
        logger.info("="*60)
        logger.info("Starting Smart RAG Agent Tests")
        logger.info("="*60)
        
        # Initialize agent
        if self.use_real_llm:
            agent = EnhancedSmartRagAgent(self.rag_config, self.llm_config)
            logger.info("Using Enhanced Smart RAG Agent with real LLM")
        else:
            agent = SmartRagAgent(self.rag_config)
            logger.info("Using base Smart RAG Agent with simulated LLM")
        
        # Run tests
        tests = [
            ("Document Loading", self.test_document_loading),
            ("Document Retrieval", self.test_document_retrieval),
            ("Answer Generation", self.test_answer_generation),
            ("Training Loop", self.test_training_loop)
        ]
        
        passed_tests = 0
        total_tests = len(tests)
        
        for test_name, test_func in tests:
            logger.info(f"\n{'-'*40}")
            logger.info(f"Running test: {test_name}")
            logger.info(f"{'-'*40}")
            
            try:
                success = await test_func(agent)
                if success:
                    logger.info(f"✅ {test_name} PASSED")
                    passed_tests += 1
                else:
                    logger.error(f"❌ {test_name} FAILED")
            except Exception as e:
                logger.error(f"❌ {test_name} ERROR: {e}")
                self.test_results[test_name.lower().replace(' ', '_')] = {
                    'success': False,
                    'error': str(e)
                }
        
        # Print summary
        logger.info(f"\n{'='*60}")
        logger.info("TEST SUMMARY")
        logger.info(f"{'='*60}")
        logger.info(f"Passed: {passed_tests}/{total_tests}")
        logger.info(f"Success Rate: {passed_tests/total_tests:.1%}")
        
        for test_name, result in self.test_results.items():
            status = "✅ PASS" if result['success'] else "❌ FAIL"
            message = result.get('message', result.get('error', 'No details'))
            logger.info(f"  {test_name}: {status} - {message}")
        
        # Save test results
        with open('smart_agent_test_results.json', 'w') as f:
            json.dump(self.test_results, f, indent=2)
        
        logger.info(f"\nTest results saved to: smart_agent_test_results.json")
        
        return passed_tests == total_tests

async def main():
    """Main test function"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Test Smart RAG Agent')
    parser.add_argument('--quick', action='store_true', 
                       help='Quick test with simulated LLM')
    parser.add_argument('--full', action='store_true',
                       help='Full test with real LLM')
    
    args = parser.parse_args()
    
    if args.full:
        use_real_llm = True
    else:
        use_real_llm = False  # Default to quick test
    
    tester = SmartAgentTester(use_real_llm=use_real_llm)
    success = await tester.run_tests()
    
    if success:
        logger.info("🎉 All tests passed!")
        return 0
    else:
        logger.error("💥 Some tests failed!")
        return 1

if __name__ == "__main__":
    exit_code = asyncio.run(main())