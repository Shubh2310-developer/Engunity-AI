"""
CS Response Validation Module

Comprehensive validation system for AI-generated CS responses including
technical accuracy, code syntax validation, and complexity level matching.

File: backend/app/services/rag/cs_response_validator.py
"""

import ast
import re
import json
import subprocess
import tempfile
import logging
from typing import Dict, List, Optional, Tuple, Any, Set
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
import statistics
from collections import Counter

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '../../../'))
from app.models.cs_embedding_config import CSVocabularyConfig, get_cs_config

logger = logging.getLogger(__name__)


class ValidationLevel(str, Enum):
    """Validation strictness levels."""
    BASIC = "basic"
    STANDARD = "standard"
    STRICT = "strict"
    COMPREHENSIVE = "comprehensive"


class ComplexityLevel(str, Enum):
    """User complexity/skill levels."""
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"
    EXPERT = "expert"


class ValidationSeverity(str, Enum):
    """Severity levels for validation issues."""
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


@dataclass
class ValidationIssue:
    """Represents a validation issue found in the response."""
    severity: ValidationSeverity
    category: str
    message: str
    location: Optional[str] = None
    suggestion: Optional[str] = None
    confidence: float = 1.0


@dataclass
class ValidationResult:
    """Complete validation result for a CS response."""
    is_valid: bool
    overall_score: float
    technical_accuracy: float
    code_validity: float
    complexity_match: float
    issues: List[ValidationIssue] = field(default_factory=list)
    suggestions: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def add_issue(self, issue: ValidationIssue):
        """Add a validation issue to the result."""
        self.issues.append(issue)
        
        # Update overall validity
        if issue.severity in [ValidationSeverity.ERROR, ValidationSeverity.CRITICAL]:
            self.is_valid = False
    
    def get_issues_by_severity(self, severity: ValidationSeverity) -> List[ValidationIssue]:
        """Get issues filtered by severity level."""
        return [issue for issue in self.issues if issue.severity == severity]
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            "is_valid": self.is_valid,
            "overall_score": self.overall_score,
            "technical_accuracy": self.technical_accuracy,
            "code_validity": self.code_validity,
            "complexity_match": self.complexity_match,
            "issues": [
                {
                    "severity": issue.severity.value,
                    "category": issue.category,
                    "message": issue.message,
                    "location": issue.location,
                    "suggestion": issue.suggestion,
                    "confidence": issue.confidence
                }
                for issue in self.issues
            ],
            "suggestions": self.suggestions,
            "metadata": self.metadata
        }


class TechnicalAccuracyValidator:
    """Validates technical accuracy of CS responses."""
    
    def __init__(self, cs_vocab: CSVocabularyConfig):
        self.cs_vocab = cs_vocab
        self.cs_knowledge_base = self._build_knowledge_base()
        self.algorithm_properties = self._build_algorithm_properties()
        self.common_misconceptions = self._build_misconceptions()
    
    def _build_knowledge_base(self) -> Dict[str, Dict[str, Any]]:
        """Build knowledge base of CS concepts and their properties."""
        return {
            "binary search": {
                "required_terms": ["divide", "conquer", "sorted", "logarithmic"],
                "complexity": "O(log n)",
                "type": "algorithm",
                "properties": ["requires sorted input", "divide and conquer"]
            },
            "merge sort": {
                "required_terms": ["divide", "conquer", "merge", "recursive"],
                "complexity": "O(n log n)",
                "type": "algorithm",
                "properties": ["stable sort", "divide and conquer", "recursive"]
            },
            "quicksort": {
                "required_terms": ["pivot", "partition", "divide", "conquer"],
                "complexity": "O(n log n) average, O(n²) worst",
                "type": "algorithm",
                "properties": ["unstable sort", "in-place", "divide and conquer"]
            },
            "hash table": {
                "required_terms": ["hash function", "collision", "buckets"],
                "complexity": "O(1) average",
                "type": "data structure",
                "properties": ["key-value pairs", "fast lookup"]
            },
            "binary tree": {
                "required_terms": ["node", "left", "right", "root"],
                "type": "data structure",
                "properties": ["hierarchical", "two children per node"]
            },
            "graph": {
                "required_terms": ["vertex", "edge", "node"],
                "type": "data structure",
                "properties": ["vertices and edges", "connections"]
            },
            "dynamic programming": {
                "required_terms": ["memoization", "optimal substructure", "overlapping"],
                "type": "technique",
                "properties": ["optimization", "caching results"]
            },
            "recursion": {
                "required_terms": ["base case", "recursive case", "call stack"],
                "type": "technique",
                "properties": ["self-calling", "divide problem"]
            }
        }
    
    def _build_algorithm_properties(self) -> Dict[str, List[str]]:
        """Build mapping of algorithms to their expected properties."""
        return {
            "sorting": ["time complexity", "space complexity", "stability", "comparison-based"],
            "searching": ["time complexity", "space complexity", "input requirements"],
            "graph": ["traversal method", "time complexity", "space complexity"],
            "dynamic_programming": ["memoization", "optimal substructure", "overlapping subproblems"]
        }
    
    def _build_misconceptions(self) -> List[Dict[str, str]]:
        """Build list of common CS misconceptions to check for."""
        return [
            {
                "misconception": "binary search works on unsorted arrays",
                "correction": "binary search requires sorted input",
                "pattern": r"binary search.*unsorted|unsorted.*binary search"
            },
            {
                "misconception": "quicksort is always O(n log n)",
                "correction": "quicksort worst case is O(n²)",
                "pattern": r"quicksort.*always.*O\(n log n\)"
            },
            {
                "misconception": "hash tables have O(1) worst case",
                "correction": "hash tables have O(1) average case, O(n) worst case",
                "pattern": r"hash.*worst.*O\(1\)"
            },
            {
                "misconception": "recursion is always slower than iteration",
                "correction": "recursion can be optimized and isn't always slower",
                "pattern": r"recursion.*always.*slower"
            }
        ]
    
    def validate_technical_accuracy(
        self,
        answer: str,
        original_question: str
    ) -> Tuple[float, List[ValidationIssue]]:
        """
        Validate technical accuracy of the response.
        
        Args:
            answer: Generated answer to validate
            original_question: Original user question
            
        Returns:
            Tuple of (accuracy_score, list_of_issues)
        """
        issues = []
        accuracy_score = 1.0
        
        # Extract CS concepts mentioned in the question
        question_concepts = self._extract_cs_concepts(original_question)
        answer_lower = answer.lower()
        
        # Check if answer addresses the main concepts
        concept_coverage = self._check_concept_coverage(question_concepts, answer, issues)
        
        # Validate technical definitions
        definition_accuracy = self._validate_definitions(answer, issues)
        
        # Check for common misconceptions
        misconception_score = self._check_misconceptions(answer, issues)
        
        # Validate complexity mentions
        complexity_accuracy = self._validate_complexity_mentions(answer, issues)
        
        # Calculate overall accuracy score
        scores = [concept_coverage, definition_accuracy, misconception_score, complexity_accuracy]
        accuracy_score = statistics.mean(scores)
        
        return accuracy_score, issues
    
    def _extract_cs_concepts(self, text: str) -> List[str]:
        """Extract CS concepts mentioned in the text."""
        concepts = []
        text_lower = text.lower()
        
        # Check knowledge base concepts
        for concept in self.cs_knowledge_base.keys():
            if concept in text_lower:
                concepts.append(concept)
        
        # Check vocabulary
        for keyword_list in [
            self.cs_vocab.programming_keywords,
            self.cs_vocab.systems_keywords,
            self.cs_vocab.ai_ml_keywords,
            self.cs_vocab.theory_keywords
        ]:
            for keyword in keyword_list:
                if keyword.lower() in text_lower:
                    concepts.append(keyword)
        
        return list(set(concepts))
    
    def _check_concept_coverage(
        self,
        question_concepts: List[str],
        answer: str,
        issues: List[ValidationIssue]
    ) -> float:
        """Check if answer adequately covers concepts from the question."""
        if not question_concepts:
            return 1.0
        
        answer_lower = answer.lower()
        covered_concepts = []
        
        for concept in question_concepts:
            if concept.lower() in answer_lower:
                covered_concepts.append(concept)
            else:
                # Check for synonyms or related terms
                concept_info = self.cs_knowledge_base.get(concept.lower())
                if concept_info and concept_info.get("required_terms"):
                    terms_found = sum(1 for term in concept_info["required_terms"] 
                                    if term in answer_lower)
                    if terms_found >= len(concept_info["required_terms"]) // 2:
                        covered_concepts.append(concept)
        
        coverage_ratio = len(covered_concepts) / len(question_concepts)
        
        if coverage_ratio < 0.5:
            issues.append(ValidationIssue(
                severity=ValidationSeverity.WARNING,
                category="concept_coverage",
                message=f"Answer may not adequately address key concepts: {', '.join(set(question_concepts) - set(covered_concepts))}",
                suggestion="Ensure the answer directly addresses all main concepts mentioned in the question"
            ))
        
        return coverage_ratio
    
    def _validate_definitions(self, answer: str, issues: List[ValidationIssue]) -> float:
        """Validate technical definitions in the answer."""
        definition_score = 1.0
        answer_lower = answer.lower()
        
        for concept, info in self.cs_knowledge_base.items():
            if concept in answer_lower:
                required_terms = info.get("required_terms", [])
                terms_found = sum(1 for term in required_terms if term in answer_lower)
                
                if required_terms and terms_found == 0:
                    issues.append(ValidationIssue(
                        severity=ValidationSeverity.WARNING,
                        category="definition_accuracy",
                        message=f"Definition of '{concept}' may be incomplete. Missing key terms: {', '.join(required_terms)}",
                        suggestion=f"Include important aspects: {', '.join(required_terms)}"
                    ))
                    definition_score -= 0.1
                elif required_terms and terms_found < len(required_terms) // 2:
                    issues.append(ValidationIssue(
                        severity=ValidationSeverity.INFO,
                        category="definition_completeness",
                        message=f"Definition of '{concept}' could be more comprehensive",
                        suggestion=f"Consider mentioning: {', '.join(set(required_terms) - {term for term in required_terms if term in answer_lower})}"
                    ))
                    definition_score -= 0.05
        
        return max(definition_score, 0.0)
    
    def _check_misconceptions(self, answer: str, issues: List[ValidationIssue]) -> float:
        """Check for common CS misconceptions in the answer."""
        misconception_score = 1.0
        
        for misconception_info in self.common_misconceptions:
            pattern = misconception_info["pattern"]
            
            if re.search(pattern, answer, re.IGNORECASE):
                issues.append(ValidationIssue(
                    severity=ValidationSeverity.ERROR,
                    category="misconception",
                    message=f"Potential misconception detected: {misconception_info['misconception']}",
                    suggestion=misconception_info["correction"]
                ))
                misconception_score -= 0.2
        
        return max(misconception_score, 0.0)
    
    def _validate_complexity_mentions(self, answer: str, issues: List[ValidationIssue]) -> float:
        """Validate complexity analysis mentions."""
        complexity_score = 1.0
        
        # Find complexity mentions
        complexity_pattern = r'O\([^)]+\)'
        complexity_mentions = re.findall(complexity_pattern, answer)
        
        if complexity_mentions:
            # Check if complexity mentions are reasonable
            for complexity in complexity_mentions:
                if not self._is_valid_complexity(complexity):
                    issues.append(ValidationIssue(
                        severity=ValidationSeverity.WARNING,
                        category="complexity_validity",
                        message=f"Unusual complexity notation: {complexity}",
                        suggestion="Verify complexity analysis is correct"
                    ))
                    complexity_score -= 0.1
        
        return max(complexity_score, 0.0)
    
    def _is_valid_complexity(self, complexity: str) -> bool:
        """Check if complexity notation is valid."""
        valid_patterns = [
            r'O\(1\)', r'O\(log n\)', r'O\(n\)', r'O\(n log n\)',
            r'O\(n\^?2\)', r'O\(n\^?3\)', r'O\(2\^?n\)', r'O\(n!\)',
            r'O\(m \+ n\)', r'O\(V \+ E\)', r'O\(E log V\)'
        ]
        
        return any(re.match(pattern, complexity, re.IGNORECASE) for pattern in valid_patterns)


class CodeSyntaxValidator:
    """Validates code syntax and detects common logic errors."""
    
    def __init__(self):
        self.supported_languages = {
            "python": self._validate_python_code,
            "javascript": self._validate_javascript_code,
            "java": self._validate_java_code,
            "cpp": self._validate_cpp_code,
            "c": self._validate_c_code
        }
    
    def validate_code_syntax(
        self,
        answer: str,
        language: str = "python"
    ) -> Tuple[float, List[ValidationIssue]]:
        """
        Validate code syntax in the answer.
        
        Args:
            answer: Answer containing code
            language: Programming language
            
        Returns:
            Tuple of (validity_score, list_of_issues)
        """
        issues = []
        validity_score = 1.0
        
        # Extract code blocks from answer
        code_blocks = self._extract_code_blocks(answer, language)
        
        if not code_blocks:
            return validity_score, issues
        
        # Validate each code block
        for i, code_block in enumerate(code_blocks):
            if language.lower() in self.supported_languages:
                validator = self.supported_languages[language.lower()]
                block_score, block_issues = validator(code_block, f"block_{i}")
                
                validity_score = min(validity_score, block_score)
                issues.extend(block_issues)
            else:
                # Basic validation for unsupported languages
                basic_score, basic_issues = self._basic_code_validation(code_block, language)
                validity_score = min(validity_score, basic_score)
                issues.extend(basic_issues)
        
        return validity_score, issues
    
    def _extract_code_blocks(self, answer: str, language: str) -> List[str]:
        """Extract code blocks from the answer."""
        code_blocks = []
        
        # Extract markdown code blocks
        pattern = rf'```{language}?\s*\n(.*?)\n```'
        matches = re.findall(pattern, answer, re.DOTALL | re.IGNORECASE)
        code_blocks.extend(matches)
        
        # Extract inline code (simple heuristic)
        inline_pattern = r'`([^`]+)`'
        inline_matches = re.findall(inline_pattern, answer)
        
        # Filter inline matches that look like actual code
        for match in inline_matches:
            if self._looks_like_code(match, language):
                code_blocks.append(match)
        
        return code_blocks
    
    def _looks_like_code(self, text: str, language: str) -> bool:
        """Heuristic to determine if text looks like code."""
        code_indicators = {
            "python": ["def ", "class ", "import ", "from ", "return ", "if ", "for ", "while "],
            "javascript": ["function", "var ", "let ", "const ", "return ", "if ", "for "],
            "java": ["public ", "private ", "class ", "static ", "void ", "int ", "String "],
            "cpp": ["#include", "int ", "void ", "class ", "public:", "private:"],
            "c": ["#include", "int ", "void ", "char ", "printf", "scanf"]
        }
        
        indicators = code_indicators.get(language.lower(), ["(", ")", "{", "}", ";"])
        return any(indicator in text for indicator in indicators)
    
    def _validate_python_code(self, code: str, location: str) -> Tuple[float, List[ValidationIssue]]:
        """Validate Python code syntax and common issues."""
        issues = []
        score = 1.0
        
        try:
            # Parse AST to check syntax
            ast.parse(code)
        except SyntaxError as e:
            issues.append(ValidationIssue(
                severity=ValidationSeverity.ERROR,
                category="syntax_error",
                message=f"Python syntax error: {str(e)}",
                location=location,
                suggestion="Fix syntax error before using this code"
            ))
            score = 0.0
        except Exception as e:
            issues.append(ValidationIssue(
                severity=ValidationSeverity.WARNING,
                category="parsing_error",
                message=f"Could not parse Python code: {str(e)}",
                location=location
            ))
            score = 0.5
        
        # Check for common Python issues
        python_issues = self._check_python_issues(code, location)
        issues.extend(python_issues)
        
        if python_issues:
            score = max(score - len(python_issues) * 0.1, 0.0)
        
        return score, issues
    
    def _check_python_issues(self, code: str, location: str) -> List[ValidationIssue]:
        """Check for common Python coding issues."""
        issues = []
        
        # Check for common mistakes
        checks = [
            (r'if\s+.*=(?!=)', "Assignment in if condition (should be ==?)"),
            (r'range\(\s*len\([^)]+\)\s*\)', "Consider using 'for item in list' instead of 'for i in range(len(list))'"),
            (r'except\s*:', "Bare except clause - should specify exception type"),
            (r'==\s*True|==\s*False', "Use 'if condition:' instead of 'if condition == True:'"),
            (r'\.append\([^)]*\sfor\s[^)]*\)', "Consider list comprehension instead of append in loop")
        ]
        
        for pattern, message in checks:
            if re.search(pattern, code):
                issues.append(ValidationIssue(
                    severity=ValidationSeverity.INFO,
                    category="code_style",
                    message=message,
                    location=location,
                    suggestion="Consider following Python best practices"
                ))
        
        return issues
    
    def _validate_javascript_code(self, code: str, location: str) -> Tuple[float, List[ValidationIssue]]:
        """Validate JavaScript code syntax."""
        issues = []
        score = 1.0
        
        # Basic syntax checks for JavaScript
        js_checks = [
            (r'var\s+\w+(?:\s*,\s*\w+)*(?!\s*=)', "Uninitialized var declaration"),
            (r'==(?!=)', "Consider using === instead of =="),
            (r'function\s+\w+\s*\([^)]*\)\s*{[^}]*}(?!\s*[;}])', "Missing semicolon after function"),
        ]
        
        for pattern, message in js_checks:
            if re.search(pattern, code):
                issues.append(ValidationIssue(
                    severity=ValidationSeverity.WARNING,
                    category="javascript_style",
                    message=message,
                    location=location
                ))
                score -= 0.1
        
        return max(score, 0.0), issues
    
    def _validate_java_code(self, code: str, location: str) -> Tuple[float, List[ValidationIssue]]:
        """Validate Java code syntax."""
        issues = []
        score = 1.0
        
        # Check for basic Java syntax patterns
        if 'class ' in code and 'public class ' not in code and 'private class ' not in code:
            issues.append(ValidationIssue(
                severity=ValidationSeverity.WARNING,
                category="java_style",
                message="Class should have explicit access modifier",
                location=location
            ))
            score -= 0.1
        
        return score, issues
    
    def _validate_cpp_code(self, code: str, location: str) -> Tuple[float, List[ValidationIssue]]:
        """Validate C++ code syntax."""
        issues = []
        score = 1.0
        
        # Basic C++ checks
        if '#include' in code and 'using namespace std' in code:
            issues.append(ValidationIssue(
                severity=ValidationSeverity.INFO,
                category="cpp_style",
                message="Consider avoiding 'using namespace std' in header files",
                location=location
            ))
        
        return score, issues
    
    def _validate_c_code(self, code: str, location: str) -> Tuple[float, List[ValidationIssue]]:
        """Validate C code syntax."""
        issues = []
        score = 1.0
        
        # Basic C checks
        if 'printf' in code and '#include <stdio.h>' not in code:
            issues.append(ValidationIssue(
                severity=ValidationSeverity.WARNING,
                category="c_syntax",
                message="printf requires #include <stdio.h>",
                location=location
            ))
            score -= 0.2
        
        return score, issues
    
    def _basic_code_validation(self, code: str, language: str) -> Tuple[float, List[ValidationIssue]]:
        """Basic validation for unsupported languages."""
        issues = []
        score = 1.0
        
        # Check for basic syntax patterns
        if len(code.strip()) == 0:
            issues.append(ValidationIssue(
                severity=ValidationSeverity.WARNING,
                category="empty_code",
                message="Code block appears to be empty",
                suggestion="Provide meaningful code example"
            ))
            score = 0.5
        
        # Check for placeholder text
        placeholders = ['TODO', 'FIXME', '...', 'your code here', 'implement this']
        for placeholder in placeholders:
            if placeholder.lower() in code.lower():
                issues.append(ValidationIssue(
                    severity=ValidationSeverity.INFO,
                    category="incomplete_code",
                    message=f"Code contains placeholder: {placeholder}",
                    suggestion="Replace placeholders with actual implementation"
                ))
                score -= 0.1
        
        return max(score, 0.0), issues


class ComplexityLevelValidator:
    """Validates if response complexity matches user level."""
    
    def __init__(self):
        self.complexity_indicators = self._build_complexity_indicators()
        self.readability_thresholds = {
            ComplexityLevel.BEGINNER: {"max_sentence_length": 20, "max_syllables_per_word": 2},
            ComplexityLevel.INTERMEDIATE: {"max_sentence_length": 30, "max_syllables_per_word": 3},
            ComplexityLevel.ADVANCED: {"max_sentence_length": 40, "max_syllables_per_word": 4},
            ComplexityLevel.EXPERT: {"max_sentence_length": 50, "max_syllables_per_word": 5}
        }
    
    def _build_complexity_indicators(self) -> Dict[ComplexityLevel, Dict[str, Any]]:
        """Build indicators for different complexity levels."""
        return {
            ComplexityLevel.BEGINNER: {
                "required_explanations": ["what is", "simply put", "basically", "in other words"],
                "avoid_terms": ["memoization", "amortized", "asymptotic", "polynomial", "np-complete"],
                "max_concepts_per_sentence": 1,
                "require_analogies": True
            },
            ComplexityLevel.INTERMEDIATE: {
                "expected_terms": ["complexity", "algorithm", "efficiency", "optimization"],
                "avoid_terms": ["amortized", "np-complete", "heuristic"],
                "max_concepts_per_sentence": 2,
                "require_examples": True
            },
            ComplexityLevel.ADVANCED: {
                "expected_terms": ["complexity", "optimization", "trade-off", "heuristic"],
                "allow_advanced_terms": True,
                "max_concepts_per_sentence": 3,
                "expect_analysis": True
            },
            ComplexityLevel.EXPERT: {
                "expect_advanced_terms": ["amortized", "asymptotic", "polynomial", "approximation"],
                "expect_formal_analysis": True,
                "allow_research_references": True
            }
        }
    
    def validate_complexity_level(
        self,
        answer: str,
        target_level: ComplexityLevel,
        question: str = ""
    ) -> Tuple[float, List[ValidationIssue]]:
        """
        Validate if answer complexity matches target level.
        
        Args:
            answer: Generated answer
            target_level: Target complexity level
            question: Original question for context
            
        Returns:
            Tuple of (match_score, list_of_issues)
        """
        issues = []
        
        # Analyze various complexity aspects
        vocabulary_score = self._analyze_vocabulary_complexity(answer, target_level, issues)
        structure_score = self._analyze_structure_complexity(answer, target_level, issues)
        concept_score = self._analyze_concept_density(answer, target_level, issues)
        explanation_score = self._analyze_explanation_style(answer, target_level, issues)
        
        # Calculate overall match score
        scores = [vocabulary_score, structure_score, concept_score, explanation_score]
        match_score = statistics.mean(scores)
        
        return match_score, issues
    
    def _analyze_vocabulary_complexity(
        self,
        answer: str,
        target_level: ComplexityLevel,
        issues: List[ValidationIssue]
    ) -> float:
        """Analyze vocabulary complexity."""
        indicators = self.complexity_indicators[target_level]
        answer_lower = answer.lower()
        score = 1.0
        
        # Check for terms that should be avoided at this level
        avoid_terms = indicators.get("avoid_terms", [])
        for term in avoid_terms:
            if term in answer_lower:
                issues.append(ValidationIssue(
                    severity=ValidationSeverity.WARNING,
                    category="vocabulary_complexity",
                    message=f"Term '{term}' may be too advanced for {target_level.value} level",
                    suggestion=f"Consider using simpler terminology for {target_level.value} audience"
                ))
                score -= 0.1
        
        # Check for required explanatory terms (for beginners)
        if target_level == ComplexityLevel.BEGINNER:
            required_explanations = indicators.get("required_explanations", [])
            explanation_found = any(phrase in answer_lower for phrase in required_explanations)
            
            if not explanation_found and len(answer) > 200:
                issues.append(ValidationIssue(
                    severity=ValidationSeverity.INFO,
                    category="explanation_style",
                    message="Consider adding explanatory phrases for beginner audience",
                    suggestion="Use phrases like 'simply put', 'in other words', 'basically'"
                ))
                score -= 0.05
        
        # Check for expected terms (intermediate and above)
        expected_terms = indicators.get("expected_terms", [])
        if expected_terms:
            terms_found = sum(1 for term in expected_terms if term in answer_lower)
            if terms_found == 0:
                issues.append(ValidationIssue(
                    severity=ValidationSeverity.INFO,
                    category="technical_depth",
                    message=f"Answer might benefit from more technical terminology appropriate for {target_level.value} level",
                    suggestion=f"Consider including terms like: {', '.join(expected_terms)}"
                ))
                score -= 0.05
        
        return max(score, 0.0)
    
    def _analyze_structure_complexity(
        self,
        answer: str,
        target_level: ComplexityLevel,
        issues: List[ValidationIssue]
    ) -> float:
        """Analyze sentence structure complexity."""
        sentences = re.split(r'[.!?]+', answer)
        sentences = [s.strip() for s in sentences if s.strip()]
        
        if not sentences:
            return 1.0
        
        thresholds = self.readability_thresholds[target_level]
        max_length = thresholds["max_sentence_length"]
        
        long_sentences = [s for s in sentences if len(s.split()) > max_length]
        
        score = 1.0
        if long_sentences and target_level in [ComplexityLevel.BEGINNER, ComplexityLevel.INTERMEDIATE]:
            ratio = len(long_sentences) / len(sentences)
            if ratio > 0.3:  # More than 30% long sentences
                issues.append(ValidationIssue(
                    severity=ValidationSeverity.INFO,
                    category="sentence_complexity",
                    message=f"Some sentences may be too long for {target_level.value} level",
                    suggestion="Consider breaking long sentences into shorter, clearer ones"
                ))
                score -= ratio * 0.2
        
        return max(score, 0.0)
    
    def _analyze_concept_density(
        self,
        answer: str,
        target_level: ComplexityLevel,
        issues: List[ValidationIssue]
    ) -> float:
        """Analyze density of CS concepts per sentence."""
        sentences = re.split(r'[.!?]+', answer)
        sentences = [s.strip() for s in sentences if s.strip()]
        
        if not sentences:
            return 1.0
        
        # CS concept patterns
        concept_patterns = [
            r'\b(?:algorithm|data structure|complexity|optimization)\b',
            r'\b(?:recursive|iterative|dynamic programming)\b',
            r'\b(?:hash|tree|graph|array|list|stack|queue)\b',
            r'O\([^)]+\)',  # Big O notation
            r'\b(?:memoization|backtracking|greedy|divide and conquer)\b'
        ]
        
        indicators = self.complexity_indicators[target_level]
        max_concepts = indicators.get("max_concepts_per_sentence", 2)
        
        score = 1.0
        problematic_sentences = 0
        
        for sentence in sentences:
            concept_count = sum(1 for pattern in concept_patterns 
                              if re.search(pattern, sentence, re.IGNORECASE))
            
            if concept_count > max_concepts:
                problematic_sentences += 1
        
        if problematic_sentences > 0:
            density_ratio = problematic_sentences / len(sentences)
            if density_ratio > 0.3:  # More than 30% of sentences are concept-heavy
                issues.append(ValidationIssue(
                    severity=ValidationSeverity.INFO,
                    category="concept_density",
                    message=f"Concept density may be too high for {target_level.value} level",
                    suggestion="Consider spacing out technical concepts more evenly"
                ))
                score -= density_ratio * 0.3
        
        return max(score, 0.0)
    
    def _analyze_explanation_style(
        self,
        answer: str,
        target_level: ComplexityLevel,
        issues: List[ValidationIssue]
    ) -> float:
        """Analyze explanation style appropriateness."""
        answer_lower = answer.lower()
        indicators = self.complexity_indicators[target_level]
        score = 1.0
        
        # Check for analogies (important for beginners)
        if indicators.get("require_analogies") and target_level == ComplexityLevel.BEGINNER:
            analogy_indicators = ["like", "similar to", "imagine", "think of", "as if", "metaphor"]
            has_analogy = any(indicator in answer_lower for indicator in analogy_indicators)
            
            if not has_analogy and len(answer) > 300:
                issues.append(ValidationIssue(
                    severity=ValidationSeverity.INFO,
                    category="explanation_style",
                    message="Consider adding analogies or examples for beginner audience",
                    suggestion="Use analogies to make abstract concepts more concrete"
                ))
                score -= 0.1
        
        # Check for examples (important for intermediate)
        if indicators.get("require_examples"):
            example_indicators = ["example", "for instance", "such as", "like this", "consider"]
            has_examples = any(indicator in answer_lower for indicator in example_indicators)
            
            if not has_examples:
                issues.append(ValidationIssue(
                    severity=ValidationSeverity.INFO,
                    category="explanation_style",
                    message="Consider adding concrete examples",
                    suggestion="Include practical examples to illustrate concepts"
                ))
                score -= 0.05
        
        # Check for formal analysis (expected for advanced/expert)
        if indicators.get("expect_analysis") or indicators.get("expect_formal_analysis"):
            analysis_indicators = ["analysis", "proof", "theorem", "lemma", "complexity analysis"]
            has_analysis = any(indicator in answer_lower for indicator in analysis_indicators)
            
            if not has_analysis and target_level in [ComplexityLevel.ADVANCED, ComplexityLevel.EXPERT]:
                issues.append(ValidationIssue(
                    severity=ValidationSeverity.INFO,
                    category="technical_depth",
                    message=f"Answer could benefit from more formal analysis for {target_level.value} level",
                    suggestion="Include complexity analysis or formal reasoning"
                ))
                score -= 0.05
        
        return max(score, 0.0)


class CSResponseValidator:
    """Main CS response validator combining all validation components."""
    
    def __init__(self, validation_level: ValidationLevel = ValidationLevel.STANDARD):
        # Load CS vocabulary configuration
        config = get_cs_config()
        self.cs_vocab = config.vocabulary_config
        
        # Initialize component validators
        self.technical_validator = TechnicalAccuracyValidator(self.cs_vocab)
        self.code_validator = CodeSyntaxValidator()
        self.complexity_validator = ComplexityLevelValidator()
        
        # Set validation strictness
        self.validation_level = validation_level
        self.validation_weights = self._get_validation_weights()
    
    def _get_validation_weights(self) -> Dict[str, float]:
        """Get validation weights based on validation level."""
        weights = {
            ValidationLevel.BASIC: {
                "technical_accuracy": 0.5,
                "code_validity": 0.3,
                "complexity_match": 0.2
            },
            ValidationLevel.STANDARD: {
                "technical_accuracy": 0.4,
                "code_validity": 0.4,
                "complexity_match": 0.2
            },
            ValidationLevel.STRICT: {
                "technical_accuracy": 0.4,
                "code_validity": 0.4,
                "complexity_match": 0.2
            },
            ValidationLevel.COMPREHENSIVE: {
                "technical_accuracy": 0.35,
                "code_validity": 0.35,
                "complexity_match": 0.3
            }
        }
        return weights[self.validation_level]
    
    def validate_response(
        self,
        answer: str,
        question: str,
        user_level: str = "intermediate",
        language: str = "python",
        additional_context: Optional[Dict[str, Any]] = None
    ) -> ValidationResult:
        """
        Comprehensive validation of CS response.
        
        Args:
            answer: Generated answer to validate
            question: Original user question
            user_level: User's complexity level
            language: Programming language (if applicable)
            additional_context: Additional validation context
            
        Returns:
            ValidationResult with comprehensive analysis
        """
        logger.info(f"Validating response for question: {question[:50]}...")
        
        # Initialize result
        result = ValidationResult(
            is_valid=True,
            overall_score=0.0,
            technical_accuracy=0.0,
            code_validity=0.0,
            complexity_match=0.0
        )
        
        additional_context = additional_context or {}
        
        try:
            # Validate technical accuracy
            tech_score, tech_issues = self.technical_validator.validate_technical_accuracy(
                answer, question
            )
            result.technical_accuracy = tech_score
            result.issues.extend(tech_issues)
            
            # Validate code syntax
            code_score, code_issues = self.code_validator.validate_code_syntax(
                answer, language
            )
            result.code_validity = code_score
            result.issues.extend(code_issues)
            
            # Validate complexity level
            try:
                complexity_level = ComplexityLevel(user_level.lower())
            except ValueError:
                complexity_level = ComplexityLevel.INTERMEDIATE
                logger.warning(f"Unknown user level: {user_level}, defaulting to intermediate")
            
            complexity_score, complexity_issues = self.complexity_validator.validate_complexity_level(
                answer, complexity_level, question
            )
            result.complexity_match = complexity_score
            result.issues.extend(complexity_issues)
            
            # Calculate overall score
            weights = self.validation_weights
            result.overall_score = (
                weights["technical_accuracy"] * tech_score +
                weights["code_validity"] * code_score +
                weights["complexity_match"] * complexity_score
            )
            
            # Determine overall validity
            critical_issues = result.get_issues_by_severity(ValidationSeverity.CRITICAL)
            error_issues = result.get_issues_by_severity(ValidationSeverity.ERROR)
            
            if critical_issues or len(error_issues) > 2:
                result.is_valid = False
            elif result.overall_score < 0.6:
                result.is_valid = False
            
            # Generate suggestions
            result.suggestions = self._generate_suggestions(result)
            
            # Add metadata
            result.metadata = {
                "validation_level": self.validation_level.value,
                "user_level": user_level,
                "language": language,
                "answer_length": len(answer),
                "question_length": len(question),
                "code_blocks_found": len(self.code_validator._extract_code_blocks(answer, language)),
                "validation_timestamp": str(logger.handlers[0].formatter.formatTime(logger.handlers[0], logger.handlers[0].format(logger.LogRecord("", 0, "", 0, "", (), None))) if logger.handlers else "unknown")
            }
            
        except Exception as e:
            logger.error(f"Error during validation: {e}")
            result.is_valid = False
            result.add_issue(ValidationIssue(
                severity=ValidationSeverity.ERROR,
                category="validation_error",
                message=f"Validation process failed: {str(e)}",
                suggestion="Please try validation again or contact support"
            ))
        
        logger.info(f"Validation completed. Score: {result.overall_score:.2f}, Valid: {result.is_valid}")
        return result
    
    def _generate_suggestions(self, result: ValidationResult) -> List[str]:
        """Generate actionable suggestions based on validation results."""
        suggestions = []
        
        # Technical accuracy suggestions
        if result.technical_accuracy < 0.7:
            suggestions.append("Review technical definitions and ensure they include key concepts")
            suggestions.append("Verify that complexity analysis is accurate and complete")
        
        # Code validity suggestions
        if result.code_validity < 0.8:
            suggestions.append("Check code syntax and fix any errors before sharing")
            suggestions.append("Follow language-specific best practices and conventions")
        
        # Complexity level suggestions
        if result.complexity_match < 0.7:
            complexity_issues = [issue for issue in result.issues if "complexity" in issue.category]
            if complexity_issues:
                suggestions.append("Adjust explanation complexity to match target audience level")
        
        # General suggestions based on issue patterns
        issue_categories = [issue.category for issue in result.issues]
        category_counts = Counter(issue_categories)
        
        if category_counts.get("concept_coverage", 0) > 0:
            suggestions.append("Ensure answer directly addresses all main concepts from the question")
        
        if category_counts.get("misconception", 0) > 0:
            suggestions.append("Review answer for potential misconceptions or inaccuracies")
        
        if category_counts.get("code_style", 0) > 2:
            suggestions.append("Consider improving code style and following best practices")
        
        return list(set(suggestions))  # Remove duplicates
    
    def validate_batch_responses(
        self,
        responses: List[Dict[str, Any]],
        validation_config: Optional[Dict[str, Any]] = None
    ) -> List[ValidationResult]:
        """
        Validate multiple responses in batch.
        
        Args:
            responses: List of response dictionaries with required fields
            validation_config: Optional validation configuration
            
        Returns:
            List of ValidationResult objects
        """
        results = []
        config = validation_config or {}
        
        for i, response_data in enumerate(responses):
            try:
                result = self.validate_response(
                    answer=response_data.get("answer", ""),
                    question=response_data.get("question", ""),
                    user_level=response_data.get("user_level", "intermediate"),
                    language=response_data.get("language", "python"),
                    additional_context=response_data.get("context", {})
                )
                results.append(result)
                
            except Exception as e:
                logger.error(f"Error validating response {i}: {e}")
                error_result = ValidationResult(
                    is_valid=False,
                    overall_score=0.0,
                    technical_accuracy=0.0,
                    code_validity=0.0,
                    complexity_match=0.0
                )
                error_result.add_issue(ValidationIssue(
                    severity=ValidationSeverity.ERROR,
                    category="batch_validation_error",
                    message=f"Failed to validate response {i}: {str(e)}"
                ))
                results.append(error_result)
        
        return results
    
    def get_validation_statistics(
        self,
        results: List[ValidationResult]
    ) -> Dict[str, Any]:
        """
        Get comprehensive statistics from validation results.
        
        Args:
            results: List of validation results
            
        Returns:
            Dictionary with validation statistics
        """
        if not results:
            return {}
        
        valid_results = [r for r in results if r.is_valid]
        
        # Basic statistics
        stats = {
            "total_responses": len(results),
            "valid_responses": len(valid_results),
            "validation_rate": len(valid_results) / len(results),
            "average_overall_score": statistics.mean([r.overall_score for r in results]),
            "average_technical_accuracy": statistics.mean([r.technical_accuracy for r in results]),
            "average_code_validity": statistics.mean([r.code_validity for r in results]),
            "average_complexity_match": statistics.mean([r.complexity_match for r in results])
        }
        
        # Issue statistics
        all_issues = [issue for result in results for issue in result.issues]
        if all_issues:
            issue_counts = Counter([issue.category for issue in all_issues])
            severity_counts = Counter([issue.severity.value for issue in all_issues])
            
            stats.update({
                "total_issues": len(all_issues),
                "issues_per_response": len(all_issues) / len(results),
                "top_issue_categories": dict(issue_counts.most_common(5)),
                "issues_by_severity": dict(severity_counts)
            })
        
        return stats


# Utility functions for easy integration
def validate_cs_response(
    answer: str,
    question: str,
    user_level: str = "intermediate",
    language: str = "python",
    validation_level: str = "standard"
) -> Dict[str, Any]:
    """
    Quick validation function for single responses.
    
    Args:
        answer: Generated answer
        question: Original question
        user_level: User complexity level
        language: Programming language
        validation_level: Validation strictness
        
    Returns:
        Validation result as dictionary
    """
    try:
        level_enum = ValidationLevel(validation_level.lower())
    except ValueError:
        level_enum = ValidationLevel.STANDARD
    
    validator = CSResponseValidator(validation_level=level_enum)
    result = validator.validate_response(answer, question, user_level, language)
    
    return result.to_dict()


def check_code_syntax(code: str, language: str = "python") -> Dict[str, Any]:
    """
    Quick code syntax validation.
    
    Args:
        code: Code to validate
        language: Programming language
        
    Returns:
        Validation result for code syntax
    """
    validator = CodeSyntaxValidator()
    score, issues = validator.validate_code_syntax(code, language)
    
    return {
        "is_valid": score > 0.8,
        "syntax_score": score,
        "issues": [
            {
                "severity": issue.severity.value,
                "message": issue.message,
                "suggestion": issue.suggestion
            }
            for issue in issues
        ]
    }


def assess_complexity_match(
    answer: str,
    target_level: str = "intermediate"
) -> Dict[str, Any]:
    """
    Quick complexity level assessment.
    
    Args:
        answer: Answer to assess
        target_level: Target complexity level
        
    Returns:
        Complexity assessment result
    """
    try:
        level_enum = ComplexityLevel(target_level.lower())
    except ValueError:
        level_enum = ComplexityLevel.INTERMEDIATE
    
    validator = ComplexityLevelValidator()
    score, issues = validator.validate_complexity_level(answer, level_enum)
    
    return {
        "complexity_match": score,
        "target_level": target_level,
        "is_appropriate": score > 0.7,
        "suggestions": [issue.suggestion for issue in issues if issue.suggestion]
    }


# Factory function
def create_cs_validator(
    validation_level: str = "standard"
) -> CSResponseValidator:
    """
    Create a CS response validator with specified level.
    
    Args:
        validation_level: Validation strictness level
        
    Returns:
        Configured CSResponseValidator instance
    """
    try:
        level_enum = ValidationLevel(validation_level.lower())
    except ValueError:
        level_enum = ValidationLevel.STANDARD
        logger.warning(f"Unknown validation level: {validation_level}, using standard")
    
    return CSResponseValidator(validation_level=level_enum)


# Export main classes and functions
__all__ = [
    "CSResponseValidator",
    "ValidationResult",
    "ValidationIssue",
    "ValidationLevel",
    "ValidationSeverity",
    "ComplexityLevel",
    "TechnicalAccuracyValidator",
    "CodeSyntaxValidator",
    "ComplexityLevelValidator",
    "validate_cs_response",
    "check_code_syntax",
    "assess_complexity_match",
    "create_cs_validator"
]