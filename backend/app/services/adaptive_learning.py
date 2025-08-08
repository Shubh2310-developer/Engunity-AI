#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Adaptive Learning System for RAG Responses
==========================================

System that learns from user interactions and improves responses over time.

Author: Engunity AI Team
"""

import json
import logging
import asyncio
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from pathlib import Path
import hashlib

logger = logging.getLogger(__name__)

class AdaptiveLearningSystem:
    """System that learns from user interactions to improve responses"""
    
    def __init__(self, learning_data_path: str = "backend/data/learning"):
        self.learning_data_path = Path(learning_data_path)
        self.learning_data_path.mkdir(parents=True, exist_ok=True)
        
        # Load existing learning data
        self.question_patterns = self._load_question_patterns()
        self.response_feedback = self._load_response_feedback()
        self.common_questions = self._load_common_questions()
        
        logger.info(f"Initialized adaptive learning system with {len(self.question_patterns)} patterns")
    
    def _load_question_patterns(self) -> Dict[str, Any]:
        """Load learned question patterns"""
        patterns_file = self.learning_data_path / "question_patterns.json"
        if patterns_file.exists():
            try:
                with open(patterns_file, 'r') as f:
                    return json.load(f)
            except Exception as e:
                logger.error(f"Error loading question patterns: {e}")
        return {}
    
    def _load_response_feedback(self) -> Dict[str, Any]:
        """Load response feedback data"""
        feedback_file = self.learning_data_path / "response_feedback.json"
        if feedback_file.exists():
            try:
                with open(feedback_file, 'r') as f:
                    return json.load(f)
            except Exception as e:
                logger.error(f"Error loading response feedback: {e}")
        return {}
    
    def _load_common_questions(self) -> Dict[str, Any]:
        """Load frequently asked questions"""
        questions_file = self.learning_data_path / "common_questions.json"
        if questions_file.exists():
            try:
                with open(questions_file, 'r') as f:
                    return json.load(f)
            except Exception as e:
                logger.error(f"Error loading common questions: {e}")
        return {}
    
    def _save_learning_data(self):
        """Save all learning data to disk"""
        try:
            # Save question patterns
            with open(self.learning_data_path / "question_patterns.json", 'w') as f:
                json.dump(self.question_patterns, f, indent=2)
            
            # Save response feedback
            with open(self.learning_data_path / "response_feedback.json", 'w') as f:
                json.dump(self.response_feedback, f, indent=2)
            
            # Save common questions
            with open(self.learning_data_path / "common_questions.json", 'w') as f:
                json.dump(self.common_questions, f, indent=2)
                
            logger.info("Learning data saved successfully")
        except Exception as e:
            logger.error(f"Error saving learning data: {e}")
    
    def learn_from_interaction(
        self, 
        question: str, 
        response: str, 
        document_id: str,
        response_time: float,
        user_feedback: Optional[str] = None
    ):
        """Learn from user interaction"""
        try:
            question_hash = hashlib.md5(question.lower().encode()).hexdigest()
            timestamp = datetime.now().isoformat()
            
            # Track question patterns
            normalized_question = question.lower().strip()
            if normalized_question not in self.question_patterns:
                self.question_patterns[normalized_question] = {
                    "count": 0,
                    "first_seen": timestamp,
                    "documents": set(),
                    "response_times": [],
                    "keywords": self._extract_keywords(question)
                }
            
            # Update pattern data
            pattern = self.question_patterns[normalized_question]
            pattern["count"] += 1
            pattern["last_seen"] = timestamp
            pattern["documents"] = list(set(list(pattern.get("documents", [])) + [document_id]))
            pattern["response_times"].append(response_time)
            
            # Track common questions
            if pattern["count"] >= 3:  # Question asked 3+ times
                self.common_questions[normalized_question] = {
                    "question": question,
                    "count": pattern["count"],
                    "best_response": response,
                    "avg_response_time": sum(pattern["response_times"]) / len(pattern["response_times"]),
                    "keywords": pattern["keywords"]
                }
            
            # Track response feedback
            response_hash = hashlib.md5(response.encode()).hexdigest()
            if response_hash not in self.response_feedback:
                self.response_feedback[response_hash] = {
                    "question": question,
                    "response": response[:500],  # Store first 500 chars
                    "usage_count": 0,
                    "positive_feedback": 0,
                    "negative_feedback": 0
                }
            
            self.response_feedback[response_hash]["usage_count"] += 1
            
            if user_feedback == "positive":
                self.response_feedback[response_hash]["positive_feedback"] += 1
            elif user_feedback == "negative":
                self.response_feedback[response_hash]["negative_feedback"] += 1
            
            # Save learning data periodically
            if len(self.question_patterns) % 10 == 0:  # Save every 10 interactions
                self._save_learning_data()
                
            logger.info(f"Learned from interaction: '{question[:50]}...' (count: {pattern['count']})")
            
        except Exception as e:
            logger.error(f"Error learning from interaction: {e}")
    
    def _extract_keywords(self, question: str) -> List[str]:
        """Extract keywords from question"""
        # Simple keyword extraction
        stopwords = {'what', 'is', 'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'}
        words = question.lower().split()
        keywords = [word for word in words if word not in stopwords and len(word) > 2]
        return keywords[:10]  # Top 10 keywords
    
    def get_suggested_response(self, question: str) -> Optional[str]:
        """Get suggested response based on learning"""
        normalized_question = question.lower().strip()
        
        # Check if we have a learned response for this exact question
        if normalized_question in self.common_questions:
            common_q = self.common_questions[normalized_question]
            if common_q["count"] >= 5:  # High confidence threshold
                logger.info(f"Providing learned response for: '{question[:50]}...'")
                return common_q["best_response"]
        
        # Check for similar questions based on keywords
        question_keywords = set(self._extract_keywords(question))
        best_match = None
        best_score = 0
        
        for learned_question, data in self.common_questions.items():
            learned_keywords = set(data.get("keywords", []))
            overlap = len(question_keywords.intersection(learned_keywords))
            
            if overlap > 0:
                score = overlap / len(question_keywords.union(learned_keywords))
                if score > best_score and score > 0.6:  # 60% similarity threshold
                    best_score = score
                    best_match = data
        
        if best_match and best_match["count"] >= 3:
            logger.info(f"Providing similar learned response (score: {best_score:.2f})")
            return best_match["best_response"]
        
        return None
    
    def get_learning_stats(self) -> Dict[str, Any]:
        """Get learning system statistics"""
        total_interactions = sum(p.get("count", 0) for p in self.question_patterns.values())
        
        # Most common questions
        top_questions = sorted(
            [(q, data["count"]) for q, data in self.question_patterns.items()],
            key=lambda x: x[1],
            reverse=True
        )[:10]
        
        # Response quality stats
        positive_responses = sum(r.get("positive_feedback", 0) for r in self.response_feedback.values())
        negative_responses = sum(r.get("negative_feedback", 0) for r in self.response_feedback.values())
        
        return {
            "total_interactions": total_interactions,
            "unique_questions": len(self.question_patterns),
            "common_questions": len(self.common_questions),
            "top_questions": top_questions,
            "positive_feedback": positive_responses,
            "negative_feedback": negative_responses,
            "response_quality": positive_responses / (positive_responses + negative_responses) if (positive_responses + negative_responses) > 0 else 0
        }
    
    def optimize_cache(self) -> Dict[str, str]:
        """Generate optimized cache entries based on learning"""
        optimized_cache = {}
        
        # Add frequently asked questions to cache
        for question, data in self.common_questions.items():
            if data["count"] >= 5 and data["avg_response_time"] > 1.0:  # Slow responses
                optimized_cache[question] = data["best_response"]
        
        logger.info(f"Generated {len(optimized_cache)} optimized cache entries")
        return optimized_cache
    
    def should_update_response(self, question: str, current_response: str) -> bool:
        """Determine if response should be updated based on learning"""
        normalized_question = question.lower().strip()
        
        if normalized_question in self.question_patterns:
            pattern = self.question_patterns[normalized_question]
            
            # If question is asked frequently but response time is slow
            if pattern["count"] >= 5 and len(pattern["response_times"]) > 0:
                avg_time = sum(pattern["response_times"]) / len(pattern["response_times"])
                if avg_time > 2.0:  # Slow response
                    return True
            
            # If we have negative feedback on current response
            response_hash = hashlib.md5(current_response.encode()).hexdigest()
            if response_hash in self.response_feedback:
                feedback = self.response_feedback[response_hash]
                if feedback["negative_feedback"] > feedback["positive_feedback"]:
                    return True
        
        return False

# Global learning system instance
_learning_system: Optional[AdaptiveLearningSystem] = None

def get_learning_system() -> AdaptiveLearningSystem:
    """Get or create learning system instance"""
    global _learning_system
    if _learning_system is None:
        _learning_system = AdaptiveLearningSystem()
    return _learning_system

async def learn_from_interaction(
    question: str,
    response: str, 
    document_id: str,
    response_time: float,
    user_feedback: Optional[str] = None
):
    """Convenience function to learn from interaction"""
    learning_system = get_learning_system()
    learning_system.learn_from_interaction(question, response, document_id, response_time, user_feedback)