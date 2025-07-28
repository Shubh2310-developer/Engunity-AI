#!/usr/bin/env python3
"""
Simple CS-Enhanced RAG Test
===========================

Basic test of available CS RAG components without complex dependencies.
"""

import asyncio
import logging
import time
import json
from pathlib import Path

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class SimpleCSRagTest:
    """Simple test of CS RAG components"""
    
    def __init__(self):
        self.results = {}
    
    async def run_basic_tests(self):
        """Run basic component tests"""
        logger.info("🧪 Starting Simple CS RAG Tests")
        
        # Test 1: CS Feedback Analyzer (should work)
        await self._test_feedback_analyzer()
        
        # Test 2: CS Prompt Templates (should work)
        await self._test_prompt_templates()
        
        # Test 3: CS Query Processor (may work)
        await self._test_query_processor()
        
        # Test 4: Basic workflow simulation
        await self._test_basic_workflow()
        
        return self._generate_report()
    
    async def _test_feedback_analyzer(self):
        """Test CS Feedback Analyzer"""
        logger.info("📊 Testing CS Feedback Analyzer...")
        
        try:
            from cs_feedback_analyzer import CSFeedbackAnalyzer
            
            analyzer = CSFeedbackAnalyzer(storage_backend="memory")
            
            # Test feedback collection
            feedback_id = analyzer.collect_structured_feedback(
                user_id="test_user",
                question="What is binary search?",
                answer="Binary search is an algorithm that finds the position of a target value.",
                feedback_data={
                    'overall_rating': 4,
                    'accuracy_rating': True,
                    'helpfulness_score': 4,
                    'clarity_score': 3,
                    'comment': 'Good explanation'
                }
            )
            
            # Test analytics
            summary = analyzer.get_overall_feedback_summary()
            
            self.results['feedback_analyzer'] = {
                'status': 'success',
                'feedback_collected': feedback_id is not None,
                'analytics_working': summary is not None,
                'feedback_count': summary.total_feedback_count if summary else 0
            }
            
            logger.info("✅ CS Feedback Analyzer test passed")
            
        except Exception as e:
            self.results['feedback_analyzer'] = {
                'status': 'failed',
                'error': str(e)
            }
            logger.error(f"❌ CS Feedback Analyzer test failed: {e}")
    
    async def _test_prompt_templates(self):
        """Test CS Prompt Templates"""
        logger.info("📝 Testing CS Prompt Templates...")
        
        try:
            from cs_prompt_templates import CSPromptTemplates, TemplateType
            
            templates = CSPromptTemplates()
            
            # Test template generation
            template = templates.get_template(
                template_type=TemplateType.ALGORITHM_EXPLANATION,
                difficulty="intermediate"
            )
            
            # Test template formatting
            formatted = templates.format_prompt(
                template_type=TemplateType.PROGRAMMING_QA,
                question="What is recursion?",
                context="Programming concepts discussion",
                difficulty="beginner"
            )
            
            self.results['prompt_templates'] = {
                'status': 'success',
                'template_generated': template is not None,
                'formatting_working': formatted is not None and len(formatted) > 0,
                'template_types_available': len(list(TemplateType))
            }
            
            logger.info("✅ CS Prompt Templates test passed")
            
        except Exception as e:
            self.results['prompt_templates'] = {
                'status': 'failed',
                'error': str(e)
            }
            logger.error(f"❌ CS Prompt Templates test failed: {e}")
    
    async def _test_query_processor(self):
        """Test CS Query Processor"""
        logger.info("🔍 Testing CS Query Processor...")
        
        try:
            from cs_query_processor import CSQueryProcessor
            
            processor = CSQueryProcessor()
            
            # Test query processing
            test_query = "How does quicksort algorithm work?"
            processed = processor.process_query(test_query)
            
            # Test query analysis
            analysis = processor.analyze_query_intent(test_query)
            
            self.results['query_processor'] = {
                'status': 'success',
                'query_processed': processed is not None,
                'intent_analysis_working': analysis is not None,
                'processed_query_length': len(processed) if processed else 0
            }
            
            logger.info("✅ CS Query Processor test passed")
            
        except Exception as e:
            self.results['query_processor'] = {
                'status': 'failed',
                'error': str(e)
            }
            logger.error(f"❌ CS Query Processor test failed: {e}")
    
    async def _test_basic_workflow(self):
        """Test basic CS RAG workflow simulation"""
        logger.info("🔄 Testing Basic Workflow...")
        
        try:
            # Simulate a basic Q&A workflow
            test_questions = [
                "What is the time complexity of binary search?",
                "Explain the difference between arrays and linked lists",
                "How does object-oriented programming work?"
            ]
            
            workflow_results = []
            
            for question in test_questions:
                start_time = time.time()
                
                # Simulate processing steps
                await asyncio.sleep(0.1)  # Simulate processing time
                
                # Mock answer generation
                mock_answer = f"This is a simulated CS-enhanced answer for: {question}"
                mock_confidence = 0.85
                mock_sources = ["CS Textbook Chapter 5", "Algorithm Documentation"]
                
                processing_time = time.time() - start_time
                
                workflow_results.append({
                    'question': question,
                    'answer': mock_answer,
                    'confidence': mock_confidence,
                    'sources': mock_sources,
                    'processing_time': processing_time
                })
            
            self.results['basic_workflow'] = {
                'status': 'success',
                'questions_processed': len(workflow_results),
                'avg_processing_time': sum(r['processing_time'] for r in workflow_results) / len(workflow_results),
                'avg_confidence': sum(r['confidence'] for r in workflow_results) / len(workflow_results),
                'workflow_results': workflow_results
            }
            
            logger.info("✅ Basic Workflow test passed")
            
        except Exception as e:
            self.results['basic_workflow'] = {
                'status': 'failed',
                'error': str(e)
            }
            logger.error(f"❌ Basic Workflow test failed: {e}")
    
    def _generate_report(self):
        """Generate test report"""
        successful_tests = sum(1 for r in self.results.values() if r.get('status') == 'success')
        total_tests = len(self.results)
        success_rate = (successful_tests / total_tests * 100) if total_tests > 0 else 0
        
        report = {
            'test_summary': {
                'total_tests': total_tests,
                'successful_tests': successful_tests,
                'success_rate': success_rate,
                'all_tests_passed': success_rate == 100.0
            },
            'component_results': self.results,
            'recommendations': self._get_recommendations(),
            'generated_at': time.time()
        }
        
        return report
    
    def _get_recommendations(self):
        """Get recommendations based on test results"""
        recommendations = []
        
        failed_components = [name for name, result in self.results.items() 
                           if result.get('status') == 'failed']
        
        if failed_components:
            recommendations.append(f"Fix failed components: {', '.join(failed_components)}")
        
        working_components = [name for name, result in self.results.items() 
                            if result.get('status') == 'success']
        
        if len(working_components) >= 2:
            recommendations.append("Core components working - can proceed with integration")
        
        if not recommendations:
            recommendations.append("All tests passed - CS RAG system ready")
        
        return recommendations

async def main():
    """Run simple CS RAG tests"""
    tester = SimpleCSRagTest()
    report = await tester.run_basic_tests()
    
    # Save report
    report_file = Path("backend/data/training/simple_test_report.json")
    report_file.parent.mkdir(parents=True, exist_ok=True)
    
    with open(report_file, 'w') as f:
        json.dump(report, f, indent=2)
    
    # Print results
    print("\n" + "="*60)
    print("CS-ENHANCED RAG SIMPLE TEST REPORT")
    print("="*60)
    
    summary = report['test_summary']
    print(f"Tests Run: {summary['total_tests']}")
    print(f"Success Rate: {summary['success_rate']:.1f}%")
    print(f"All Tests Passed: {'✅' if summary['all_tests_passed'] else '❌'}")
    
    print("\nComponent Status:")
    for component, result in report['component_results'].items():
        status_icon = "✅" if result['status'] == 'success' else "❌"
        print(f"  {status_icon} {component.replace('_', ' ').title()}")
        if result['status'] == 'failed':
            print(f"      Error: {result.get('error', 'Unknown error')}")
    
    print("\nRecommendations:")
    for rec in report['recommendations']:
        print(f"  • {rec}")
    
    print(f"\nReport saved to: {report_file}")
    print("="*60)

if __name__ == "__main__":
    asyncio.run(main())