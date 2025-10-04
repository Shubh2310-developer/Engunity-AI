#!/usr/bin/env python3
"""
Opal AI Integration Test Script
==============================

This script tests your Opal agent wrapper to ensure everything works correctly
before connecting to Opal AI platforms.

Usage:
    python test_opal_integration.py
"""

import asyncio
import requests
import json
import time
from typing import Dict, Any

class OpalIntegrationTester:
    """Test suite for Opal AI agent integration"""
    
    def __init__(self, base_url: str = "http://localhost:8001"):
        self.base_url = base_url
        self.session = requests.Session()
        self.test_results = []
    
    def test_service_health(self):
        """Test if the service is running and healthy"""
        print("🏥 Testing service health...")
        
        try:
            response = self.session.get(f"{self.base_url}/health")
            if response.status_code == 200:
                health_data = response.json()
                print(f"✅ Service is healthy")
                print(f"   - Agents available: {health_data['agents_available']}")
                print(f"   - Success rate: {health_data['success_rate']:.1f}%")
                return True
            else:
                print(f"❌ Health check failed: {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ Cannot connect to service: {e}")
            return False
    
    def test_list_agents(self):
        """Test agent listing endpoint"""
        print("\n🤖 Testing agent listing...")
        
        try:
            response = self.session.get(f"{self.base_url}/agents")
            if response.status_code == 200:
                agents_data = response.json()
                print(f"✅ Found {agents_data['total_agents']} agents:")
                
                for agent_type, capability in agents_data['available_agents'].items():
                    print(f"   📋 {agent_type}: {capability['name']}")
                    print(f"      {capability['description']}")
                
                return agents_data
            else:
                print(f"❌ Failed to list agents: {response.status_code}")
                return None
        except Exception as e:
            print(f"❌ Error listing agents: {e}")
            return None
    
    def test_query_processing(self, agent_type: str = "hybrid"):
        """Test query processing with different agents"""
        print(f"\n🔍 Testing query processing with {agent_type} agent...")
        
        test_queries = [
            "What is artificial intelligence?",
            "Explain transformer architecture in deep learning",
            "How do I implement binary search in Python?"
        ]
        
        results = []
        
        for query in test_queries:
            print(f"   💭 Testing: {query[:50]}...")
            
            try:
                start_time = time.time()
                
                response = self.session.post(
                    f"{self.base_url}/query",
                    json={
                        "query": query,
                        "agent_type": agent_type,
                        "max_sources": 3
                    }
                )
                
                response_time = time.time() - start_time
                
                if response.status_code == 200:
                    result = response.json()
                    print(f"   ✅ Success ({response_time:.2f}s)")
                    print(f"      Confidence: {result['confidence']:.3f}")
                    print(f"      Answer length: {len(result['answer'])} chars")
                    print(f"      Sources: {len(result['sources'])}")
                    
                    results.append({
                        'query': query,
                        'success': True,
                        'confidence': result['confidence'],
                        'response_time': response_time,
                        'agent_used': result['agent_used']
                    })
                else:
                    print(f"   ❌ Failed: {response.status_code}")
                    results.append({
                        'query': query,
                        'success': False,
                        'error': response.text
                    })
                    
            except Exception as e:
                print(f"   ❌ Error: {e}")
                results.append({
                    'query': query,
                    'success': False,
                    'error': str(e)
                })
        
        return results
    
    def test_opal_configuration(self):
        """Test Opal configuration endpoint"""
        print("\n⚙️  Testing Opal configuration...")
        
        try:
            response = self.session.get(f"{self.base_url}/opal/config")
            if response.status_code == 200:
                config = response.json()
                print("✅ Opal configuration generated successfully")
                print(f"   Service: {config['service_info']['name']}")
                print(f"   Version: {config['service_info']['version']}")
                print(f"   Capabilities: {len(config['capabilities'])}")
                print(f"   Workflows: {len(config['recommended_workflows'])}")
                return config
            else:
                print(f"❌ Failed to get Opal config: {response.status_code}")
                return None
        except Exception as e:
            print(f"❌ Error getting Opal config: {e}")
            return None
    
    def test_all_agents(self):
        """Test all available agents"""
        print("\n🚀 Testing all available agents...")
        
        # Get agent list first
        agents_data = self.test_list_agents()
        if not agents_data:
            return
        
        all_results = {}
        
        for agent_type in agents_data['available_agents'].keys():
            print(f"\n--- Testing {agent_type} agent ---")
            results = self.test_query_processing(agent_type)
            all_results[agent_type] = results
        
        return all_results
    
    def run_comprehensive_test(self):
        """Run complete test suite"""
        print("🧪 Starting Opal AI Integration Test Suite")
        print("=" * 50)
        
        # Test 1: Service Health
        if not self.test_service_health():
            print("\n❌ Service is not running. Please start it first:")
            print("   cd /home/ghost/engunity-ai/backend/training")
            print("   python opal_agent_wrapper.py")
            return False
        
        # Test 2: Agent Listing
        agents_data = self.test_list_agents()
        if not agents_data:
            return False
        
        # Test 3: Query Processing (quick test)
        recommended_agent = agents_data.get('recommended_agent', 'fallback')
        self.test_query_processing(recommended_agent)
        
        # Test 4: Opal Configuration
        self.test_opal_configuration()
        
        print("\n" + "=" * 50)
        print("🎉 Test Suite Complete!")
        print("\nNext Steps:")
        print("1. Visit http://localhost:8001/docs to explore the API")
        print("2. Go to https://opal.withgoogle.com/ to create workflows")
        print("3. Connect Opal to your service at http://localhost:8001")
        print("4. Start building visual AI workflows!")
        
        return True

def main():
    """Main test function"""
    tester = OpalIntegrationTester()
    
    # Check if service is running
    print("🔍 Checking if Opal agent service is running...")
    if not tester.test_service_health():
        print("\n🚀 Starting Opal agent service...")
        print("Run this command in another terminal:")
        print("   cd /home/ghost/engunity-ai/backend/training")
        print("   python opal_agent_wrapper.py")
        print("\nThen run this test again.")
        return
    
    # Run comprehensive test
    tester.run_comprehensive_test()

if __name__ == "__main__":
    main()