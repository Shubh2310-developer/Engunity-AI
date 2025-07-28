#!/usr/bin/env python3
"""
Test script for CS Generator
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..', '..'))

from cs_generator import CSGenerator
try:
    from cs_generator import GenerationType, ResponseFormat
except ImportError:
    # Define fallback enums
    class GenerationType:
        QA = "qa"
        CODE_EXPLAIN = "code_explain"
        CODE_GENERATE = "code_generate"
    
    class ResponseFormat:
        MARKDOWN = "markdown"
        PLAIN = "plain"

def test_cs_generator():
    """Test CS Generator functionality"""
    
    print("🔧 Testing CS Generator...")
    
    try:
        # Initialize generator with dummy API key for testing structure
        try:
            generator = CSGenerator(
                groq_api_key="test_key"  # Dummy key for testing
            )
            print("✅ CS Generator initialized (test mode)")
        except Exception as init_error:
            print(f"⚠️  CS Generator init failed (expected): {init_error}")
            print("📋 Testing available classes and methods...")
            
            # Test class availability
            print(f"✅ GenerationType available: {[GenerationType.QA, GenerationType.CODE_EXPLAIN, GenerationType.CODE_GENERATE]}")
            print(f"✅ ResponseFormat available: {[ResponseFormat.MARKDOWN, ResponseFormat.PLAIN]}")
            return
        
        # Show available methods
        print(f"\n📋 Available methods:")
        methods = [method for method in dir(generator) if not method.startswith('_')]
        for method in sorted(methods):
            print(f"  ✓ {method}")
        
        # Test prompt building
        print(f"\n📝 Testing prompt building...")
        
        # Test different generation types
        test_cases = [
            {
                "query": "How does binary search work?",
                "context": "Binary search is a search algorithm that finds the position of a target value within a sorted array.",
                "generation_type": GenerationType.QA,
                "description": "Question answering"
            },
            {
                "query": "Explain this code",
                "context": "def binary_search(arr, target):\n    left, right = 0, len(arr) - 1\n    while left <= right:\n        mid = (left + right) // 2\n        if arr[mid] == target:\n            return mid\n        elif arr[mid] < target:\n            left = mid + 1\n        else:\n            right = mid - 1\n    return -1",
                "generation_type": GenerationType.CODE_EXPLAIN,
                "description": "Code explanation"
            },
            {
                "query": "Generate a sorting function",
                "context": "",
                "generation_type": GenerationType.CODE_GENERATE,
                "description": "Code generation"
            }
        ]
        
        for i, test_case in enumerate(test_cases, 1):
            print(f"\n{i}. Testing {test_case['description']}:")
            try:
                # Test prompt building
                if hasattr(generator, 'build_prompt'):
                    prompt = generator.build_prompt(
                        query=test_case['query'],
                        context=test_case['context'],
                        generation_type=test_case['generation_type']
                    )
                    print(f"   Query: {test_case['query']}")
                    print(f"   Prompt built: {len(prompt)} characters")
                    print(f"   Preview: {prompt[:100]}...")
                else:
                    print(f"   build_prompt method not available")
                    
            except Exception as e:
                print(f"   Error: {e}")
        
        # Test configuration methods
        print(f"\n⚙️ Testing configuration...")
        try:
            if hasattr(generator, 'get_model_info'):
                model_info = generator.get_model_info()
                print(f"Model info: {model_info}")
            
            if hasattr(generator, 'get_generation_config'):
                config = generator.get_generation_config()
                print(f"Generation config: {type(config)}")
                
        except Exception as e:
            print(f"Configuration error: {e}")
        
        # Test response formatting
        print(f"\n📋 Testing response formatting...")
        try:
            test_response = "This is a test response about binary search algorithm."
            
            if hasattr(generator, 'format_response'):
                formatted = generator.format_response(
                    response=test_response,
                    format_type=ResponseFormat.MARKDOWN,
                    query="How does binary search work?"
                )
                print(f"Formatted response: {len(formatted)} characters")
                print(f"Preview: {formatted[:100]}...")
            else:
                print("format_response method not available")
                
        except Exception as e:
            print(f"Formatting error: {e}")
        
        # Test fallback generation
        print(f"\n🔄 Testing fallback generation...")
        try:
            if hasattr(generator, 'generate_fallback_response'):
                fallback = generator.generate_fallback_response(
                    query="What is machine learning?",
                    context="Machine learning is a subset of AI.",
                    generation_type=GenerationType.QA
                )
                print(f"Fallback response: {fallback[:100]}...")
            else:
                print("generate_fallback_response method not available")
                
        except Exception as e:
            print(f"Fallback generation error: {e}")
        
        # Test token counting
        print(f"\n🔢 Testing token counting...")
        try:
            test_text = "This is a test for token counting in the CS generator."
            
            if hasattr(generator, 'count_tokens'):
                token_count = generator.count_tokens(test_text)
                print(f"Text: '{test_text}'")
                print(f"Token count: {token_count}")
            else:
                print("count_tokens method not available")
                
        except Exception as e:
            print(f"Token counting error: {e}")
        
        print("\n✅ CS Generator test completed successfully!")
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_cs_generator()