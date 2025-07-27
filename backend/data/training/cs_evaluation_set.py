#!/usr/bin/env python3
"""
CS Evaluation Set Generator for Engunity AI
==========================================

This script creates comprehensive evaluation benchmarks for testing the RAG system
across different CS domains, difficulty levels, and SaaS module capabilities.

Evaluation Categories:
- Programming Comprehension Tests
- Algorithm Explanation Tasks  
- Code Documentation Q&A
- Data Analysis Challenges
- Research Tool Benchmarks
- Cross-Module Integration Tests

Usage:
    python backend/data/training/cs_evaluation_set.py

Author: Engunity AI Team
Date: 2025-07-26
"""

import json
import logging
import re
import random
from pathlib import Path
from typing import Dict, List, Optional
from collections import defaultdict, Counter
from datetime import datetime
import warnings
warnings.filterwarnings('ignore')

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('backend/data/training/evaluation_generation.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class EngunityCSEvaluationGenerator:
    """
    Generate comprehensive CS evaluation benchmarks for Engunity AI
    """
    
    def __init__(self, 
                 training_data_dir: str = "backend/data/training/processed/training_ready",
                 output_dir: str = "backend/data/training/evaluation"):
        """Initialize the evaluation generator"""
        self.training_data_dir = Path(training_data_dir)
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(exist_ok=True)
        
        # Evaluation benchmark categories
        self.evaluation_categories = {
            'programming_comprehension': {
                'description': 'Test understanding of code structure and logic',
                'target_modules': ['code_assistant', 'notebook'],
                'difficulty_levels': ['beginner', 'intermediate', 'advanced'],
                'question_types': [
                    'code_explanation', 'bug_identification', 'output_prediction',
                    'code_completion', 'refactoring_suggestions', 'best_practices'
                ],
                'target_count': 200,
                'weight': 1.0
            },
            'algorithm_explanation': {
                'description': 'Test ability to explain algorithmic concepts and complexity',
                'target_modules': ['research_tools', 'code_assistant', 'data_analysis'],
                'difficulty_levels': ['beginner', 'intermediate', 'advanced'],
                'question_types': [
                    'complexity_analysis', 'algorithm_comparison', 'implementation_choice',
                    'optimization_suggestions', 'trade_off_analysis', 'use_case_identification'
                ],
                'target_count': 150,
                'weight': 0.9
            },
            'code_documentation': {
                'description': 'Test generation and understanding of code documentation',
                'target_modules': ['document_qa', 'code_assistant'],
                'difficulty_levels': ['beginner', 'intermediate', 'advanced'],
                'question_types': [
                    'docstring_generation', 'api_documentation', 'readme_creation',
                    'comment_explanation', 'specification_understanding', 'usage_examples'
                ],
                'target_count': 120,
                'weight': 0.8
            },
            'data_analysis_tasks': {
                'description': 'Test data processing and analysis capabilities',
                'target_modules': ['data_analysis', 'notebook'],
                'difficulty_levels': ['beginner', 'intermediate', 'advanced'],
                'question_types': [
                    'data_cleaning', 'statistical_analysis', 'visualization_choice',
                    'model_selection', 'feature_engineering', 'interpretation'
                ],
                'target_count': 100,
                'weight': 0.85
            },
            'research_methodology': {
                'description': 'Test academic research and methodology understanding',
                'target_modules': ['research_tools', 'document_qa'],
                'difficulty_levels': ['intermediate', 'advanced'],
                'question_types': [
                    'literature_review', 'methodology_selection', 'result_interpretation',
                    'citation_analysis', 'gap_identification', 'hypothesis_formation'
                ],
                'target_count': 80,
                'weight': 0.7
            },
            'system_integration': {
                'description': 'Test understanding of system design and integration',
                'target_modules': ['document_qa', 'research_tools', 'code_assistant'],
                'difficulty_levels': ['intermediate', 'advanced'],
                'question_types': [
                    'architecture_design', 'component_interaction', 'scalability_analysis',
                    'security_considerations', 'performance_optimization', 'deployment_strategies'
                ],
                'target_count': 70,
                'weight': 0.75
            },
            'cross_module_integration': {
                'description': 'Test integration across multiple SaaS modules',
                'target_modules': ['code_assistant', 'document_qa', 'data_analysis', 'research_tools'],
                'difficulty_levels': ['intermediate', 'advanced'],
                'question_types': [
                    'workflow_design', 'tool_selection', 'multi_step_analysis',
                    'knowledge_synthesis', 'decision_making', 'problem_decomposition'
                ],
                'target_count': 60,
                'weight': 0.9
            }
        }
        
        # Difficulty level definitions
        self.difficulty_definitions = {
            'beginner': {
                'description': 'Basic concepts, single-step problems, common patterns',
                'complexity_indicators': ['basic', 'simple', 'introduction', 'what is', 'define'],
                'target_percentage': 40,
                'expected_response_length': (50, 200),  # words
                'requires_code': False,
                'max_concepts': 2
            },
            'intermediate': {
                'description': 'Multi-step problems, concept application, analysis',
                'complexity_indicators': ['analyze', 'compare', 'implement', 'explain how', 'design'],
                'target_percentage': 45,
                'expected_response_length': (100, 400),
                'requires_code': True,
                'max_concepts': 4
            },
            'advanced': {
                'description': 'Complex problems, optimization, research-level understanding',
                'complexity_indicators': ['optimize', 'evaluate', 'critique', 'research', 'prove'],
                'target_percentage': 15,
                'expected_response_length': (200, 800),
                'requires_code': True,
                'max_concepts': 6
            }
        }
        
        # Evaluation metrics for each category
        self.evaluation_metrics = {
            'correctness': {
                'weight': 0.3,
                'description': 'Factual accuracy and technical correctness'
            },
            'completeness': {
                'weight': 0.2,
                'description': 'Coverage of all relevant aspects'
            },
            'clarity': {
                'weight': 0.2,
                'description': 'Clear and understandable explanations'
            },
            'relevance': {
                'weight': 0.15,
                'description': 'Relevance to the specific question asked'
            },
            'code_quality': {
                'weight': 0.1,
                'description': 'Quality of code examples (if applicable)'
            },
            'innovation': {
                'weight': 0.05,
                'description': 'Creative or insightful approaches'
            }
        }
        
        # Quality gates for evaluation questions
        self.quality_gates = {
            'min_question_length': 15,  # words
            'min_answer_length': 30,    # words
            'max_question_length': 100, # words
            'max_answer_length': 1000,  # words
            'min_technical_terms': 2,
            'required_question_patterns': [r'\?', r'\bwhat\b', r'\bhow\b', r'\bwhy\b', r'\bexplain\b']
        }
        
        self.training_data = {}
        self.evaluation_sets = {}
        self.generation_stats = {}

    def _generate_from_template(self, template_info: Dict, record: Dict, 
                               code_snippet: Dict, test_type: str, difficulty: str) -> Optional[Dict]:
        """Generate a question from a template"""
        try:
            code_content = code_snippet.get('content', '')
            
            # Special handling for different test types
            if test_type == 'code_completion':
                # Create partial code by removing some lines
                lines = code_content.split('\n')
                if len(lines) > 3:
                    # Remove middle portion
                    partial_lines = lines[:len(lines)//2] + ['# TODO: Complete this implementation'] + lines[3*len(lines)//4:]
                    partial_code = '\n'.join(partial_lines)
                    
                    question = template_info['question_template'].format(
                        partial_code=partial_code,
                        requirement=record['question']
                    )
                else:
                    question = template_info['question_template'].format(
                        partial_code=code_content,
                        requirement=record['question']
                    )
            else:
                question = template_info['question_template'].format(code=code_content)
            
            return {
                'id': f"prog_{test_type}_{len(str(random.randint(1000, 9999)))}",
                'category': 'programming_comprehension',
                'subcategory': test_type,
                'difficulty': difficulty,
                'question': question,
                'reference_answer': record['answer'],
                'source_record_id': record.get('id', 'unknown'),
                'evaluation_criteria': template_info['evaluation_criteria'],
                'target_modules': ['code_assistant', 'notebook'],
                'metadata': {
                    'code_language': code_snippet.get('language', 'unknown'),
                    'code_type': code_snippet.get('type', 'unknown'),
                    'original_question': record['question'],
                    'difficulty_indicators': self.difficulty_definitions[difficulty]['complexity_indicators']
                }
            }
            
        except Exception as e:
            logger.warning(f"Error generating question from template: {str(e)}")
            return None
    
    def load_training_data(self) -> bool:
        """Load training data from all modules"""
        try:
            logger.info("Loading training data for evaluation generation...")
            
            if not self.training_data_dir.exists():
                logger.error(f"Training data directory not found: {self.training_data_dir}")
                logger.info("Please run domain_mapper.py first")
                return False
            
            # Load data from each module
            for module_dir in self.training_data_dir.iterdir():
                if module_dir.is_dir() and module_dir.name != 'configs':
                    module_name = module_dir.name
                    
                    # Load test set (these won't be used for training)
                    test_file = module_dir / "test.jsonl"
                    if test_file.exists():
                        records = []
                        with open(test_file, 'r', encoding='utf-8') as f:
                            for line in f:
                                if line.strip():
                                    records.append(json.loads(line.strip()))
                        
                        self.training_data[module_name] = records
                        logger.info(f"Loaded {len(records)} test records from {module_name}")
                    else:
                        logger.warning(f"No test file found for {module_name}")
            
            total_records = sum(len(records) for records in self.training_data.values())
            logger.info(f"Total training records loaded: {total_records}")
            
            return len(self.training_data) > 0
            
        except Exception as e:
            logger.error(f"Error loading training data: {str(e)}")
            return False
    
    def analyze_content_for_evaluation(self) -> Dict:
        """Analyze training content to inform evaluation generation"""
        logger.info("Analyzing content characteristics for evaluation design...")
        
        analysis = {
            'module_distributions': {},
            'difficulty_patterns': {},
            'question_types': {},
            'technical_coverage': {},
            'code_patterns': {},
            'quality_indicators': {}
        }
        
        all_records = []
        for module, records in self.training_data.items():
            all_records.extend(records)
            
            # Module-specific analysis
            analysis['module_distributions'][module] = {
                'total_records': len(records),
                'avg_question_length': sum(len(r['question'].split()) for r in records) / len(records) if records else 0,
                'avg_answer_length': sum(len(r['answer'].split()) for r in records) / len(records) if records else 0,
                'code_presence': sum(1 for r in records if r.get('has_code', False)) / len(records) if records else 0,
                'quality_distribution': dict(Counter(r.get('quality_tier', 'unknown') for r in records))
            }
        
        # Overall patterns analysis
        if all_records:
            # Difficulty patterns
            for level in self.difficulty_definitions:
                indicators = self.difficulty_definitions[level]['complexity_indicators']
                matching_records = 0
                
                for record in all_records:
                    text = (record['question'] + ' ' + record['answer']).lower()
                    if any(indicator in text for indicator in indicators):
                        matching_records += 1
                
                analysis['difficulty_patterns'][level] = {
                    'count': matching_records,
                    'percentage': matching_records / len(all_records) * 100
                }
            
            # Question type analysis
            question_patterns = {
                'what': r'\bwhat\b',
                'how': r'\bhow\b',
                'why': r'\bwhy\b',
                'explain': r'\bexplain\b',
                'describe': r'\bdescribe\b',
                'compare': r'\bcompare\b|\bdifference\b',
                'implement': r'\bimplement\b|\bcreate\b|\bbuild\b'
            }
            
            for pattern_name, pattern in question_patterns.items():
                count = sum(1 for r in all_records if re.search(pattern, r['question'], re.IGNORECASE))
                analysis['question_types'][pattern_name] = {
                    'count': count,
                    'percentage': count / len(all_records) * 100
                }
            
            # Technical coverage
            technical_terms = defaultdict(int)
            for record in all_records:
                for term_category, terms in record.get('technical_terms', {}).items():
                    for term in terms:
                        technical_terms[term] += 1
            
            analysis['technical_coverage'] = dict(sorted(technical_terms.items(), 
                                                       key=lambda x: x[1], reverse=True)[:50])
        
        logger.info(f"Content analysis completed for {len(all_records)} records")
        return analysis
    
    def generate_programming_comprehension_tests(self, target_count: int) -> List[Dict]:
        """Generate programming comprehension evaluation questions"""
        logger.info("Generating programming comprehension tests...")
        
        evaluation_questions = []
        
        # Get relevant records from code_assistant and notebook modules
        relevant_records = []
        for module in ['code_assistant', 'notebook']:
            if module in self.training_data:
                relevant_records.extend(self.training_data[module])
        
        if not relevant_records:
            logger.warning("No relevant records found for programming comprehension tests")
            return []
        
        # Filter for records with code
        code_records = [r for r in relevant_records if r.get('has_code', False)]
        
        # Template patterns for different test types
        test_templates = {
            'code_explanation': {
                'question_template': "Explain what the following code does and how it works:\n\n{code}\n\nProvide a step-by-step breakdown.",
                'evaluation_criteria': ['correctness', 'completeness', 'clarity'],
                'difficulty_weight': {'beginner': 0.4, 'intermediate': 0.4, 'advanced': 0.2}
            },
            'bug_identification': {
                'question_template': "Identify and explain the bug(s) in this code:\n\n{code}\n\nWhat would be the correct implementation?",
                'evaluation_criteria': ['correctness', 'completeness', 'code_quality'],
                'difficulty_weight': {'beginner': 0.2, 'intermediate': 0.5, 'advanced': 0.3}
            },
            'output_prediction': {
                'question_template': "What will be the output of this code?\n\n{code}\n\nExplain your reasoning step by step.",
                'evaluation_criteria': ['correctness', 'clarity', 'completeness'],
                'difficulty_weight': {'beginner': 0.5, 'intermediate': 0.3, 'advanced': 0.2}
            }
        }
        
        # Generate questions for each template type
        questions_per_type = target_count // len(test_templates)
        
        for test_type, template_info in test_templates.items():
            type_questions = []
            attempts = 0
            max_attempts = questions_per_type * 3
            
            while len(type_questions) < questions_per_type and attempts < max_attempts:
                attempts += 1
                
                # Select a random code record
                if not code_records:
                    break
                    
                record = random.choice(code_records)
                
                # Extract code snippets
                code_snippets = record.get('code_snippets', [])
                if not code_snippets:
                    continue
                
                # Select appropriate code snippet
                code_snippet = random.choice(code_snippets)
                if len(code_snippet.get('content', '')) < 20:  # Skip very short snippets
                    continue
                
                # Determine difficulty level
                difficulty = self._determine_question_difficulty(record, test_type, template_info)
                
                # Generate question based on template
                question_data = self._generate_from_template(
                    template_info, record, code_snippet, test_type, difficulty
                )
                
                if question_data and self._validate_evaluation_question(question_data):
                    type_questions.append(question_data)
            
            evaluation_questions.extend(type_questions)
            logger.info(f"Generated {len(type_questions)} {test_type} questions")
        
        return evaluation_questions[:target_count]
    
    def generate_algorithm_explanation_tests(self, target_count: int) -> List[Dict]:
        """Generate algorithm explanation evaluation questions"""
        logger.info("Generating algorithm explanation tests...")
        
        evaluation_questions = []
        
        # Get relevant records
        relevant_records = []
        for module in ['research_tools', 'code_assistant', 'data_analysis']:
            if module in self.training_data:
                relevant_records.extend(self.training_data[module])
        
        # Create some basic algorithm questions if no specific records found
        if not relevant_records:
            logger.info("Creating basic algorithm questions...")
            basic_algorithms = ['sorting', 'searching', 'recursion', 'dynamic programming']
            for i, algo in enumerate(basic_algorithms):
                if i >= target_count:
                    break
                question_data = {
                    'id': f"algo_basic_{i:04d}",
                    'category': 'algorithm_explanation',
                    'subcategory': 'complexity_analysis',
                    'difficulty': 'intermediate',
                    'question': f"Explain the {algo} algorithm and analyze its time complexity.",
                    'reference_answer': f"The {algo} algorithm is a fundamental computer science concept...",
                    'source_record_id': f'generated_{i}',
                    'evaluation_criteria': ['correctness', 'completeness', 'clarity'],
                    'target_modules': ['research_tools', 'code_assistant'],
                    'metadata': {
                        'algorithm_type': algo,
                        'difficulty_indicators': ['analyze', 'explain']
                    }
                }
                evaluation_questions.append(question_data)
            
            return evaluation_questions
        
        # Use actual records for algorithm questions (implementation here)
        return evaluation_questions[:target_count]
    
    def generate_code_documentation_tests(self, target_count: int) -> List[Dict]:
        """Generate code documentation evaluation questions"""
        logger.info("Generating code documentation tests...")
        return []  # Placeholder implementation
    
    def generate_cross_module_integration_tests(self, target_count: int) -> List[Dict]:
        """Generate cross-module integration evaluation questions"""
        logger.info("Generating cross-module integration tests...")
        return []  # Placeholder implementation
    
    def _determine_question_difficulty(self, record: Dict, question_type: str, template_info: Dict) -> str:
        """Determine the difficulty level for a question based on record and template"""
        # Simple implementation - can be enhanced
        weights = template_info.get('difficulty_weight', {'beginner': 0.4, 'intermediate': 0.4, 'advanced': 0.2})
        return random.choices(list(weights.keys()), weights=list(weights.values()))[0]
    
    def _validate_evaluation_question(self, question_data: Dict) -> bool:
        """Validate that an evaluation question meets quality standards"""
        try:
            question = question_data.get('question', '')
            reference_answer = question_data.get('reference_answer', '')
            
            # Basic validation
            if len(question.split()) < 5:
                return False
            if len(reference_answer.split()) < 10:
                return False
            
            # Required fields check
            required_fields = ['id', 'category', 'difficulty', 'question', 'target_modules']
            if not all(field in question_data for field in required_fields):
                return False
            
            return True
            
        except Exception as e:
            logger.warning(f"Error validating question: {str(e)}")
            return False
    
    def create_hierarchical_evaluation_sets(self) -> Dict:
        """Create hierarchical evaluation sets (Basic → Intermediate → Advanced)"""
        logger.info("Creating hierarchical evaluation sets...")
        
        hierarchical_sets = {
            'basic_concepts': {
                'description': 'Fundamental CS concepts and simple implementations',
                'difficulty_levels': ['beginner'],
                'categories': ['programming_comprehension', 'code_documentation'],
                'target_count': 100,
                'questions': []
            },
            'applied_knowledge': {
                'description': 'Applied CS knowledge with multi-step problems',
                'difficulty_levels': ['intermediate'],
                'categories': ['algorithm_explanation', 'cross_module_integration'],
                'target_count': 120,
                'questions': []
            },
            'advanced_synthesis': {
                'description': 'Complex problems requiring deep understanding and synthesis',
                'difficulty_levels': ['advanced'],
                'categories': ['cross_module_integration'],
                'target_count': 80,
                'questions': []
            }
        }
        
        # Distribute questions across hierarchical levels
        for level_name, level_config in hierarchical_sets.items():
            level_questions = []
            
            # Collect questions from all evaluation sets that match criteria
            for category in level_config['categories']:
                if category in self.evaluation_sets:
                    category_questions = [
                        q for q in self.evaluation_sets[category] 
                        if q['difficulty'] in level_config['difficulty_levels']
                    ]
                    level_questions.extend(category_questions)
            
            level_config['questions'] = level_questions[:level_config['target_count']]
            level_config['actual_count'] = len(level_config['questions'])
            
            logger.info(f"Created {level_name} set with {len(level_config['questions'])} questions")
        
        return hierarchical_sets
    
    def generate_evaluation_rubrics(self) -> Dict:
        """Generate detailed evaluation rubrics for each category"""
        logger.info("Generating evaluation rubrics...")
        
        rubrics = {}
        
        for category, config in self.evaluation_categories.items():
            rubric = {
                'category_description': config['description'],
                'evaluation_dimensions': {},
                'scoring_guidelines': {},
                'difficulty_adjustments': {}
            }
            
            # Define evaluation dimensions
            for metric, metric_config in self.evaluation_metrics.items():
                rubric['evaluation_dimensions'][metric] = {
                    'weight': metric_config['weight'],
                    'description': metric_config['description'],
                    'scoring_criteria': {
                        'excellent': f"Demonstrates exceptional {metric.replace('_', ' ')}",
                        'good': f"Shows good {metric.replace('_', ' ')}",
                        'fair': f"Adequate {metric.replace('_', ' ')}",
                        'poor': f"Insufficient {metric.replace('_', ' ')}"
                    }
                }
            
            rubrics[category] = rubric
        
        return rubrics
    
    def save_evaluation_sets(self, hierarchical_sets: Dict, rubrics: Dict) -> bool:
        """Save all evaluation sets and supporting materials"""
        try:
            logger.info("Saving evaluation sets...")
            
            # Create evaluation directory structure
            eval_dir = self.output_dir
            eval_dir.mkdir(exist_ok=True)
            
            # Save individual category evaluation sets
            categories_dir = eval_dir / "categories"
            categories_dir.mkdir(exist_ok=True)
            
            for category, questions in self.evaluation_sets.items():
                category_file = categories_dir / f"{category}_evaluation.jsonl"
                with open(category_file, 'w', encoding='utf-8') as f:
                    for question in questions:
                        f.write(json.dumps(question, ensure_ascii=False) + '\n')
                
                # Save category summary
                summary_file = categories_dir / f"{category}_summary.json"
                summary = {
                    'category': category,
                    'total_questions': len(questions),
                    'difficulty_distribution': dict(Counter(q['difficulty'] for q in questions)),
                    'target_modules': list(set().union(*[q['target_modules'] for q in questions])),
                    'description': self.evaluation_categories[category]['description']
                }
                
                with open(summary_file, 'w', encoding='utf-8') as f:
                    json.dump(summary, f, indent=2, ensure_ascii=False)
            
            # Save hierarchical evaluation sets
            hierarchical_dir = eval_dir / "hierarchical"
            hierarchical_dir.mkdir(exist_ok=True)
            
            for level_name, level_config in hierarchical_sets.items():
                level_file = hierarchical_dir / f"{level_name}_evaluation.jsonl"
                with open(level_file, 'w', encoding='utf-8') as f:
                    for question in level_config['questions']:
                        f.write(json.dumps(question, ensure_ascii=False) + '\n')
            
            # Save evaluation rubrics
            rubrics_file = eval_dir / "evaluation_rubrics.json"
            with open(rubrics_file, 'w', encoding='utf-8') as f:
                json.dump(rubrics, f, indent=2, ensure_ascii=False)
            
            logger.info(f"Evaluation sets saved to {eval_dir}")
            return True
            
        except Exception as e:
            logger.error(f"Error saving evaluation sets: {str(e)}")
            return False
    
    def run_evaluation_generation_pipeline(self) -> bool:
        """Run the complete evaluation generation pipeline"""
        logger.info("🚀 Starting CS evaluation set generation for Engunity AI...")
        
        try:
            # Step 1: Load training data
            if not self.load_training_data():
                return False
            
            # Step 2: Analyze content for evaluation design
            logger.info("Step 1: Analyzing content for evaluation design...")
            self.analyze_content_for_evaluation()
            
            # Step 3: Generate category-specific evaluation sets
            logger.info("Step 2: Generating category-specific evaluation questions...")
            
            # Programming comprehension tests
            prog_questions = self.generate_programming_comprehension_tests(
                self.evaluation_categories['programming_comprehension']['target_count']
            )
            self.evaluation_sets['programming_comprehension'] = prog_questions
            
            # Algorithm explanation tests
            algo_questions = self.generate_algorithm_explanation_tests(
                self.evaluation_categories['algorithm_explanation']['target_count']
            )
            self.evaluation_sets['algorithm_explanation'] = algo_questions
            
            # Code documentation tests
            doc_questions = self.generate_code_documentation_tests(
                self.evaluation_categories['code_documentation']['target_count']
            )
            self.evaluation_sets['code_documentation'] = doc_questions
            
            # Cross-module integration tests
            integration_questions = self.generate_cross_module_integration_tests(
                self.evaluation_categories['cross_module_integration']['target_count']
            )
            self.evaluation_sets['cross_module_integration'] = integration_questions
            
            # Step 4: Create hierarchical evaluation sets
            logger.info("Step 3: Creating hierarchical evaluation structure...")
            hierarchical_sets = self.create_hierarchical_evaluation_sets()
            
            # Step 5: Generate evaluation rubrics
            logger.info("Step 4: Generating evaluation rubrics...")
            rubrics = self.generate_evaluation_rubrics()
            
            # Step 6: Save evaluation sets
            logger.info("Step 5: Saving evaluation sets...")
            if not self.save_evaluation_sets(hierarchical_sets, rubrics):
                return False
            
            logger.info("✅ Evaluation generation completed successfully!")
            return True
            
        except Exception as e:
            logger.error(f"❌ Evaluation generation failed: {str(e)}")
            return False


def main():
    """Main execution function"""
    import argparse
    import sys
    
    parser = argparse.ArgumentParser(description='Generate CS evaluation sets for Engunity AI')
    parser.add_argument(
        '--training-data-dir',
        default='backend/data/training/processed/training_ready',
        help='Directory containing training-ready data'
    )
    parser.add_argument(
        '--output-dir',
        default='backend/data/training/evaluation',
        help='Directory to save evaluation sets'
    )
    parser.add_argument(
        '--verbose',
        action='store_true',
        help='Enable verbose logging'
    )
    
    args = parser.parse_args()
    
    # Set logging level
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)
    
    # Initialize evaluation generator
    generator = EngunityCSEvaluationGenerator(
        training_data_dir=args.training_data_dir,
        output_dir=args.output_dir
    )
    
    # Run evaluation generation
    success = generator.run_evaluation_generation_pipeline()
    
    if success:
        print(f"\n✅ Evaluation generation completed successfully!")
        print(f"📁 Evaluation sets saved to: {generator.output_dir}")
        sys.exit(0)
    else:
        print(f"\n❌ Evaluation generation failed. Check logs for details.")
        sys.exit(1)


if __name__ == "__main__":
    main()
