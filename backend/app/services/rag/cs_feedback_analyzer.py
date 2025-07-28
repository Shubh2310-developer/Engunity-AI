"""
CS-Specific Feedback Analyzer

Comprehensive feedback collection and analysis system for CS RAG pipeline
including user satisfaction tracking, technical accuracy monitoring, and
learning progression analytics.

File: backend/app/services/rag/cs_feedback_analyzer.py
"""

import json
import logging
import statistics
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, field, asdict
from enum import Enum
import uuid
from collections import defaultdict, Counter
import numpy as np

# Database and storage imports
try:
    from supabase import create_client, Client
    from supabase.client import ClientOptions
    STORAGE_AVAILABLE = True
except ImportError:
    STORAGE_AVAILABLE = False
    logging.warning("Database libraries not available - using in-memory storage")

try:
    from backend.app.models.cs_embedding_config import CSVocabularyConfig, get_cs_config
except ImportError:
    # Handle case when running as script from different directory
    import sys
    import os
    sys.path.append(os.path.join(os.path.dirname(__file__), '../../../../'))
    from backend.app.models.cs_embedding_config import CSVocabularyConfig, get_cs_config

logger = logging.getLogger(__name__)


class FeedbackType(str, Enum):
    """Types of feedback that can be collected."""
    RATING = "rating"                    # Star rating (1-5)
    THUMBS = "thumbs"                   # Thumbs up/down
    DIFFICULTY = "difficulty"           # Too easy/just right/too hard
    ACCURACY = "accuracy"               # Technically correct/incorrect
    HELPFULNESS = "helpfulness"         # How helpful was the answer
    CLARITY = "clarity"                 # How clear was the explanation
    COMPLETENESS = "completeness"       # Was the answer complete
    CODE_QUALITY = "code_quality"       # Quality of code examples


class DifficultyLevel(str, Enum):
    """User perceived difficulty levels."""
    TOO_EASY = "too_easy"
    JUST_RIGHT = "just_right"
    TOO_HARD = "too_hard"
    UNCLEAR = "unclear"


class ContentCategory(str, Enum):
    """Categories of CS content for feedback analysis."""
    ALGORITHMS = "algorithms"
    DATA_STRUCTURES = "data_structures"
    PROGRAMMING = "programming"
    THEORY = "theory"
    CODE_REVIEW = "code_review"
    DEBUGGING = "debugging"
    COMPLEXITY_ANALYSIS = "complexity_analysis"
    SYSTEM_DESIGN = "system_design"


@dataclass
class FeedbackEntry:
    """Structured feedback entry from users."""
    id: str
    user_id: str
    session_id: str
    question: str
    answer: str
    
    # Rating fields
    overall_rating: Optional[int] = None  # 1-5 scale
    thumbs_rating: Optional[bool] = None  # True=up, False=down
    difficulty_rating: Optional[DifficultyLevel] = None
    accuracy_rating: Optional[bool] = None  # True=accurate, False=inaccurate
    
    # Quality dimensions (1-5 scale)
    helpfulness_score: Optional[int] = None
    clarity_score: Optional[int] = None
    completeness_score: Optional[int] = None
    code_quality_score: Optional[int] = None
    
    # Metadata
    content_category: Optional[ContentCategory] = None
    difficulty_level: Optional[str] = None  # User's CS level
    response_time: Optional[float] = None
    contains_code: bool = False
    programming_language: Optional[str] = None
    
    # User context
    user_plan: Optional[str] = None  # Free, Pro, Enterprise
    user_experience: Optional[str] = None  # beginner, intermediate, advanced
    
    # Free text feedback
    comment: Optional[str] = None
    improvement_suggestion: Optional[str] = None
    
    # Timestamps and tracking
    timestamp: datetime = field(default_factory=datetime.now)
    feedback_duration: Optional[float] = None  # Time spent giving feedback
    
    # Technical details
    model_used: Optional[str] = None
    retrieval_context: Optional[str] = None
    generation_config: Optional[Dict[str, Any]] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for storage."""
        data = asdict(self)
        # Convert datetime to ISO string
        data['timestamp'] = self.timestamp.isoformat()
        # Convert enums to values
        if self.difficulty_rating:
            data['difficulty_rating'] = self.difficulty_rating.value
        if self.content_category:
            data['content_category'] = self.content_category.value
        return data
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'FeedbackEntry':
        """Create from dictionary."""
        # Convert timestamp back
        if 'timestamp' in data and isinstance(data['timestamp'], str):
            data['timestamp'] = datetime.fromisoformat(data['timestamp'])
        
        # Convert enum fields
        if 'difficulty_rating' in data and data['difficulty_rating']:
            data['difficulty_rating'] = DifficultyLevel(data['difficulty_rating'])
        if 'content_category' in data and data['content_category']:
            data['content_category'] = ContentCategory(data['content_category'])
        
        return cls(**data)


@dataclass
class FeedbackSummary:
    """Summary statistics for feedback analysis."""
    total_feedback_count: int
    average_rating: float
    thumbs_up_ratio: float
    accuracy_rate: float
    
    # Quality scores
    avg_helpfulness: float
    avg_clarity: float
    avg_completeness: float
    avg_code_quality: float
    
    # Difficulty distribution
    difficulty_distribution: Dict[str, float]
    
    # Category performance
    category_performance: Dict[str, float]
    
    # Trends
    trend_direction: str  # improving, declining, stable
    recent_change: float  # Change in last period
    
    # User segmentation
    performance_by_user_level: Dict[str, float]
    
    # Temporal analysis
    time_period: str
    feedback_velocity: float  # Feedback per day
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return asdict(self)


class FeedbackCollector:
    """Handles collection and initial processing of user feedback."""
    
    def __init__(self, storage_backend: str = "memory"):
        self.storage_backend = storage_backend
        self.cs_vocab = get_cs_config().vocabulary_config
        
        # Initialize storage
        if storage_backend == "supabase" and STORAGE_AVAILABLE:
            self.supabase_client = self._init_supabase()
        else:
            # In-memory storage for development/testing
            self.feedback_store: List[FeedbackEntry] = []
            logger.info("Using in-memory feedback storage")
    
    def _init_supabase(self) -> Optional[Client]:
        """Initialize Supabase client."""
        try:
            import os
            url = os.getenv("SUPABASE_URL")
            key = os.getenv("SUPABASE_ANON_KEY")
            if url and key:
                return create_client(url, key)
        except Exception as e:
            logger.error(f"Failed to initialize Supabase: {e}")
        return None
    
    
    def collect_feedback(
        self,
        user_id: str,
        question: str,
        answer: str,
        rating: Optional[int] = None,
        thumbs: Optional[bool] = None,
        difficulty: Optional[str] = None,
        accuracy: Optional[bool] = None,
        comment: Optional[str] = None,
        session_id: Optional[str] = None,
        **kwargs
    ) -> str:
        """
        Collect structured feedback from users.
        
        Args:
            user_id: Unique user identifier
            question: Original question asked
            answer: Generated answer
            rating: Overall rating (1-5)
            thumbs: Thumbs up/down (True/False)
            difficulty: Perceived difficulty (too_easy, just_right, too_hard)
            accuracy: Technical accuracy (True/False)
            comment: Free text comment
            session_id: Session identifier
            **kwargs: Additional feedback fields
            
        Returns:
            Feedback entry ID
        """
        # Generate unique feedback ID
        feedback_id = str(uuid.uuid4())
        session_id = session_id or str(uuid.uuid4())
        
        # Parse difficulty
        difficulty_enum = None
        if difficulty:
            try:
                difficulty_enum = DifficultyLevel(difficulty.lower())
            except ValueError:
                logger.warning(f"Invalid difficulty level: {difficulty}")
        
        # Infer content category
        content_category = self._infer_content_category(question, answer)
        
        # Check if contains code
        contains_code = self._detect_code_content(answer)
        
        # Extract programming language if present
        programming_language = self._extract_programming_language(answer)
        
        # Create feedback entry
        feedback_entry = FeedbackEntry(
            id=feedback_id,
            user_id=user_id,
            session_id=session_id,
            question=question,
            answer=answer,
            overall_rating=rating,
            thumbs_rating=thumbs,
            difficulty_rating=difficulty_enum,
            accuracy_rating=accuracy,
            comment=comment,
            content_category=content_category,
            contains_code=contains_code,
            programming_language=programming_language,
            
            # Extract additional fields from kwargs
            helpfulness_score=kwargs.get('helpfulness_score'),
            clarity_score=kwargs.get('clarity_score'),
            completeness_score=kwargs.get('completeness_score'),
            code_quality_score=kwargs.get('code_quality_score'),
            difficulty_level=kwargs.get('difficulty_level'),
            response_time=kwargs.get('response_time'),
            user_plan=kwargs.get('user_plan'),
            user_experience=kwargs.get('user_experience'),
            improvement_suggestion=kwargs.get('improvement_suggestion'),
            feedback_duration=kwargs.get('feedback_duration'),
            model_used=kwargs.get('model_used'),
            retrieval_context=kwargs.get('retrieval_context'),
            generation_config=kwargs.get('generation_config')
        )
        
        # Store feedback
        self._store_feedback(feedback_entry)
        
        logger.info(f"Collected feedback {feedback_id} from user {user_id}")
        return feedback_id
    
    def _infer_content_category(self, question: str, answer: str) -> ContentCategory:
        """Infer content category from question and answer."""
        combined_text = (question + " " + answer).lower()
        
        # Category keywords
        category_keywords = {
            ContentCategory.ALGORITHMS: ["algorithm", "sort", "search", "dijkstra", "bfs", "dfs"],
            ContentCategory.DATA_STRUCTURES: ["array", "list", "tree", "graph", "hash", "stack", "queue"],
            ContentCategory.PROGRAMMING: ["code", "implement", "function", "class", "python", "java"],
            ContentCategory.THEORY: ["complexity", "proof", "theorem", "definition", "concept"],
            ContentCategory.CODE_REVIEW: ["review", "improve", "optimize", "refactor", "best practice"],
            ContentCategory.DEBUGGING: ["debug", "error", "fix", "problem", "issue", "bug"],
            ContentCategory.COMPLEXITY_ANALYSIS: ["big o", "time complexity", "space complexity", "analysis"],
            ContentCategory.SYSTEM_DESIGN: ["design", "architecture", "system", "scalable", "distributed"]
        }
        
        # Score each category
        category_scores = {}
        for category, keywords in category_keywords.items():
            score = sum(1 for keyword in keywords if keyword in combined_text)
            category_scores[category] = score
        
        # Return category with highest score
        if category_scores:
            return max(category_scores, key=category_scores.get)
        
        return ContentCategory.THEORY  # Default
    
    def _detect_code_content(self, text: str) -> bool:
        """Detect if text contains code snippets."""
        code_indicators = ["```", "def ", "class ", "function", "import ", "return ", "{", "}", ";"]
        return any(indicator in text for indicator in code_indicators)
    
    def _extract_programming_language(self, text: str) -> Optional[str]:
        """Extract programming language from text."""
        language_patterns = {
            "python": ["def ", "import ", "print(", "len("],
            "java": ["public class", "public static", "System.out"],
            "javascript": ["function", "var ", "let ", "const "],
            "cpp": ["#include", "std::", "cout", "cin"],
            "sql": ["SELECT", "FROM", "WHERE", "INSERT"]
        }
        
        text_lower = text.lower()
        for language, patterns in language_patterns.items():
            if any(pattern.lower() in text_lower for pattern in patterns):
                return language
        
        return None
    
    def _store_feedback(self, feedback: FeedbackEntry):
        """Store feedback entry using configured backend."""
        if self.storage_backend == "supabase" and hasattr(self, 'supabase_client'):
            self._store_supabase(feedback)
        else:
            # In-memory storage
            self.feedback_store.append(feedback)
    
    def _store_supabase(self, feedback: FeedbackEntry):
        """Store feedback in Supabase."""
        try:
            data = feedback.to_dict()
            result = self.supabase_client.table("cs_feedback").insert(data).execute()
            logger.debug(f"Stored feedback in Supabase: {feedback.id}")
        except Exception as e:
            logger.error(f"Failed to store feedback in Supabase: {e}")
    


class AccuracyRatingAnalyzer:
    """Analyzes technical accuracy ratings and identifies weak areas."""
    
    def __init__(self, feedback_collector: FeedbackCollector):
        self.feedback_collector = feedback_collector
    
    def get_accuracy_ratings_summary(
        self,
        time_period: Optional[int] = 30,  # days
        category: Optional[ContentCategory] = None,
        user_level: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Compute accuracy score trends and identify weak areas.
        
        Args:
            time_period: Number of days to analyze
            category: Specific content category to analyze
            user_level: Specific user experience level
            
        Returns:
            Dictionary with accuracy analysis
        """
        # Get feedback data
        feedback_data = self._get_feedback_data(time_period, category, user_level)
        
        if not feedback_data:
            return {"error": "No feedback data available"}
        
        # Calculate accuracy metrics
        accuracy_data = [f for f in feedback_data if f.accuracy_rating is not None]
        
        if not accuracy_data:
            return {"error": "No accuracy ratings available"}
        
        # Overall accuracy rate
        total_accurate = sum(1 for f in accuracy_data if f.accuracy_rating)
        overall_accuracy = total_accurate / len(accuracy_data)
        
        # Accuracy by category
        category_accuracy = self._calculate_category_accuracy(accuracy_data)
        
        # Accuracy by difficulty level
        difficulty_accuracy = self._calculate_difficulty_accuracy(accuracy_data)
        
        # Identify weak areas
        weak_areas = self._identify_weak_areas(accuracy_data)
        
        # Trend analysis
        trend_analysis = self._analyze_accuracy_trends(accuracy_data)
        
        # Model performance comparison
        model_performance = self._analyze_model_performance(accuracy_data)
        
        return {
            "overall_accuracy": overall_accuracy,
            "total_ratings": len(accuracy_data),
            "category_accuracy": category_accuracy,
            "difficulty_accuracy": difficulty_accuracy,
            "weak_areas": weak_areas,
            "trend_analysis": trend_analysis,
            "model_performance": model_performance,
            "time_period": f"Last {time_period} days" if time_period else "All time"
        }
    
    def _get_feedback_data(
        self,
        time_period: Optional[int],
        category: Optional[ContentCategory],
        user_level: Optional[str]
    ) -> List[FeedbackEntry]:
        """Get filtered feedback data."""
        if hasattr(self.feedback_collector, 'feedback_store'):
            # In-memory storage
            feedback_data = self.feedback_collector.feedback_store
        else:
            # Would implement database queries for production
            feedback_data = []
        
        # Apply filters
        filtered_data = feedback_data
        
        # Time filter
        if time_period:
            cutoff_date = datetime.now() - timedelta(days=time_period)
            filtered_data = [f for f in filtered_data if f.timestamp >= cutoff_date]
        
        # Category filter
        if category:
            filtered_data = [f for f in filtered_data if f.content_category == category]
        
        # User level filter
        if user_level:
            filtered_data = [f for f in filtered_data if f.user_experience == user_level]
        
        return filtered_data
    
    def _calculate_category_accuracy(self, feedback_data: List[FeedbackEntry]) -> Dict[str, float]:
        """Calculate accuracy by content category."""
        category_stats = defaultdict(list)
        
        for feedback in feedback_data:
            if feedback.content_category and feedback.accuracy_rating is not None:
                category_stats[feedback.content_category.value].append(feedback.accuracy_rating)
        
        category_accuracy = {}
        for category, ratings in category_stats.items():
            if ratings:
                category_accuracy[category] = sum(ratings) / len(ratings)
        
        return category_accuracy
    
    def _calculate_difficulty_accuracy(self, feedback_data: List[FeedbackEntry]) -> Dict[str, float]:
        """Calculate accuracy by difficulty level."""
        difficulty_stats = defaultdict(list)
        
        for feedback in feedback_data:
            if feedback.difficulty_level and feedback.accuracy_rating is not None:
                difficulty_stats[feedback.difficulty_level].append(feedback.accuracy_rating)
        
        difficulty_accuracy = {}
        for difficulty, ratings in difficulty_stats.items():
            if ratings:
                difficulty_accuracy[difficulty] = sum(ratings) / len(ratings)
        
        return difficulty_accuracy
    
    def _identify_weak_areas(self, feedback_data: List[FeedbackEntry]) -> List[Dict[str, Any]]:
        """Identify areas with low accuracy ratings."""
        # Group by category and calculate accuracy
        category_stats = defaultdict(list)
        
        for feedback in feedback_data:
            if feedback.content_category and feedback.accuracy_rating is not None:
                category_stats[feedback.content_category.value].append(feedback.accuracy_rating)
        
        weak_areas = []
        for category, ratings in category_stats.items():
            if ratings:
                accuracy = sum(ratings) / len(ratings)
                if accuracy < 0.7:  # Threshold for weak areas
                    weak_areas.append({
                        "category": category,
                        "accuracy": accuracy,
                        "sample_size": len(ratings),
                        "severity": "high" if accuracy < 0.5 else "medium"
                    })
        
        # Sort by accuracy (worst first)
        weak_areas.sort(key=lambda x: x["accuracy"])
        
        return weak_areas
    
    def _analyze_accuracy_trends(self, feedback_data: List[FeedbackEntry]) -> Dict[str, Any]:
        """Analyze accuracy trends over time."""
        # Group by date
        daily_accuracy = defaultdict(list)
        
        for feedback in feedback_data:
            if feedback.accuracy_rating is not None:
                date_key = feedback.timestamp.date()
                daily_accuracy[date_key].append(feedback.accuracy_rating)
        
        # Calculate daily averages
        daily_averages = {}
        for date, ratings in daily_accuracy.items():
            daily_averages[date] = sum(ratings) / len(ratings)
        
        if len(daily_averages) < 2:
            return {"trend": "insufficient_data"}
        
        # Calculate trend
        dates = sorted(daily_averages.keys())
        accuracies = [daily_averages[date] for date in dates]
        
        # Simple linear trend
        if len(accuracies) >= 2:
            trend_slope = (accuracies[-1] - accuracies[0]) / len(accuracies)
            trend_direction = "improving" if trend_slope > 0.02 else "declining" if trend_slope < -0.02 else "stable"
        else:
            trend_direction = "stable"
            trend_slope = 0
        
        return {
            "trend": trend_direction,
            "slope": trend_slope,
            "recent_accuracy": accuracies[-1] if accuracies else 0,
            "baseline_accuracy": accuracies[0] if accuracies else 0,
            "data_points": len(accuracies)
        }
    
    def _analyze_model_performance(self, feedback_data: List[FeedbackEntry]) -> Dict[str, float]:
        """Analyze performance by model used."""
        model_stats = defaultdict(list)
        
        for feedback in feedback_data:
            if feedback.model_used and feedback.accuracy_rating is not None:
                model_stats[feedback.model_used].append(feedback.accuracy_rating)
        
        model_performance = {}
        for model, ratings in model_stats.items():
            if ratings:
                model_performance[model] = sum(ratings) / len(ratings)
        
        return model_performance


class LearningProgressionTracker:
    """Tracks user learning progression and adaptation over time."""
    
    def __init__(self, feedback_collector: FeedbackCollector):
        self.feedback_collector = feedback_collector
    
    def track_user_learning(
        self,
        user_id: str,
        time_period: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Analyze how a user's understanding evolves over time.
        
        Args:
            user_id: User to analyze
            time_period: Number of days to analyze (None for all time)
            
        Returns:
            Dictionary with learning progression analysis
        """
        # Get user's feedback history
        user_feedback = self._get_user_feedback(user_id, time_period)
        
        if not user_feedback:
            return {"error": f"No feedback data found for user {user_id}"}
        
        # Sort by timestamp
        user_feedback.sort(key=lambda x: x.timestamp)
        
        # Analyze progression
        progression_analysis = {
            "user_id": user_id,
            "total_interactions": len(user_feedback),
            "time_span": self._calculate_time_span(user_feedback),
            "rating_progression": self._analyze_rating_progression(user_feedback),
            "difficulty_progression": self._analyze_difficulty_progression(user_feedback),
            "category_engagement": self._analyze_category_engagement(user_feedback),
            "learning_velocity": self._calculate_learning_velocity(user_feedback),
            "mastery_indicators": self._identify_mastery_indicators(user_feedback),
            "struggle_areas": self._identify_struggle_areas(user_feedback),
            "recommendations": self._generate_learning_recommendations(user_feedback)
        }
        
        return progression_analysis
    
    def _get_user_feedback(self, user_id: str, time_period: Optional[int]) -> List[FeedbackEntry]:
        """Get feedback data for specific user."""
        if hasattr(self.feedback_collector, 'feedback_store'):
            # In-memory storage
            user_feedback = [f for f in self.feedback_collector.feedback_store if f.user_id == user_id]
        else:
            # Would implement database query for production
            user_feedback = []
        
        # Apply time filter
        if time_period:
            cutoff_date = datetime.now() - timedelta(days=time_period)
            user_feedback = [f for f in user_feedback if f.timestamp >= cutoff_date]
        
        return user_feedback
    
    def _calculate_time_span(self, feedback_data: List[FeedbackEntry]) -> Dict[str, Any]:
        """Calculate time span of user's learning journey."""
        if not feedback_data:
            return {}
        
        first_interaction = min(f.timestamp for f in feedback_data)
        last_interaction = max(f.timestamp for f in feedback_data)
        
        return {
            "first_interaction": first_interaction.isoformat(),
            "last_interaction": last_interaction.isoformat(),
            "total_days": (last_interaction - first_interaction).days,
            "interactions_per_week": len(feedback_data) / max((last_interaction - first_interaction).days / 7, 1)
        }
    
    def _analyze_rating_progression(self, feedback_data: List[FeedbackEntry]) -> Dict[str, Any]:
        """Analyze how user ratings change over time."""
        rated_feedback = [f for f in feedback_data if f.overall_rating is not None]
        
        if len(rated_feedback) < 2:
            return {"insufficient_data": True}
        
        # Calculate moving average
        window_size = min(5, len(rated_feedback))
        ratings = [f.overall_rating for f in rated_feedback]
        
        moving_averages = []
        for i in range(len(ratings) - window_size + 1):
            window = ratings[i:i + window_size]
            moving_averages.append(sum(window) / len(window))
        
        # Calculate trend
        if len(moving_averages) >= 2:
            trend = (moving_averages[-1] - moving_averages[0]) / len(moving_averages)
            trend_direction = "improving" if trend > 0.1 else "declining" if trend < -0.1 else "stable"
        else:
            trend_direction = "stable"
            trend = 0
        
        return {
            "initial_average": statistics.mean(ratings[:window_size]),
            "recent_average": statistics.mean(ratings[-window_size:]),
            "overall_trend": trend_direction,
            "trend_magnitude": trend,
            "total_ratings": len(ratings),
            "best_rating": max(ratings),
            "worst_rating": min(ratings)
        }
    
    def _analyze_difficulty_progression(self, feedback_data: List[FeedbackEntry]) -> Dict[str, Any]:
        """Analyze how user's perceived difficulty changes."""
        difficulty_feedback = [f for f in feedback_data if f.difficulty_rating is not None]
        
        if not difficulty_feedback:
            return {"no_difficulty_data": True}
        
        # Track difficulty over time
        difficulty_timeline = []
        for feedback in difficulty_feedback:
            difficulty_timeline.append({
                "timestamp": feedback.timestamp.isoformat(),
                "difficulty": feedback.difficulty_rating.value,
                "category": feedback.content_category.value if feedback.content_category else "unknown"
            })
        
        # Calculate difficulty distribution over time
        early_half = difficulty_feedback[:len(difficulty_feedback)//2]
        late_half = difficulty_feedback[len(difficulty_feedback)//2:]
        
        early_too_hard = sum(1 for f in early_half if f.difficulty_rating == DifficultyLevel.TOO_HARD)
        late_too_hard = sum(1 for f in late_half if f.difficulty_rating == DifficultyLevel.TOO_HARD)
        
        early_just_right = sum(1 for f in early_half if f.difficulty_rating == DifficultyLevel.JUST_RIGHT)
        late_just_right = sum(1 for f in late_half if f.difficulty_rating == DifficultyLevel.JUST_RIGHT)
        
        return {
            "difficulty_timeline": difficulty_timeline,
            "early_period": {
                "too_hard_ratio": early_too_hard / len(early_half) if early_half else 0,
                "just_right_ratio": early_just_right / len(early_half) if early_half else 0
            },
            "late_period": {
                "too_hard_ratio": late_too_hard / len(late_half) if late_half else 0,
                "just_right_ratio": late_just_right / len(late_half) if late_half else 0
            },
            "difficulty_adaptation": "improving" if (late_just_right / len(late_half) if late_half else 0) > (early_just_right / len(early_half) if early_half else 0) else "stable"
        }
    
    def _analyze_category_engagement(self, feedback_data: List[FeedbackEntry]) -> Dict[str, Any]:
        """Analyze user's engagement across different CS categories."""
        category_stats = defaultdict(list)
        
        for feedback in feedback_data:
            if feedback.content_category:
                category_stats[feedback.content_category.value].append({
                    "rating": feedback.overall_rating,
                    "timestamp": feedback.timestamp,
                    "difficulty": feedback.difficulty_rating.value if feedback.difficulty_rating else None
                })
        
        engagement_analysis = {}
        for category, interactions in category_stats.items():
            engagement_analysis[category] = {
                "interaction_count": len(interactions),
                "avg_rating": statistics.mean([i["rating"] for i in interactions if i["rating"] is not None]) if any(i["rating"] for i in interactions) else None,
                "most_recent": max(i["timestamp"] for i in interactions).isoformat(),
                "engagement_trend": "active" if len(interactions) > len(feedback_data) / len(category_stats) else "low"
            }
        
        return engagement_analysis
    
    def _calculate_learning_velocity(self, feedback_data: List[FeedbackEntry]) -> Dict[str, float]:
        """Calculate how quickly user is progressing."""
        if len(feedback_data) < 2:
            return {"insufficient_data": True}
        
        # Time-based metrics
        time_span = (feedback_data[-1].timestamp - feedback_data[0].timestamp).total_seconds() / (24 * 3600)  # days
        interactions_per_day = len(feedback_data) / max(time_span, 1)
        
        # Quality progression
        rated_feedback = [f for f in feedback_data if f.overall_rating is not None]
        if len(rated_feedback) >= 2:
            initial_rating = statistics.mean([f.overall_rating for f in rated_feedback[:3]])
            recent_rating = statistics.mean([f.overall_rating for f in rated_feedback[-3:]])
            quality_improvement_rate = (recent_rating - initial_rating) / max(time_span, 1)
        else:
            quality_improvement_rate = 0
        
        # Category exploration rate
        unique_categories = len(set(f.content_category for f in feedback_data if f.content_category))
        category_exploration_rate = unique_categories / max(time_span, 1)
        
        return {
            "interactions_per_day": interactions_per_day,
            "quality_improvement_rate": quality_improvement_rate,
            "category_exploration_rate": category_exploration_rate,
            "total_time_span_days": time_span
        }
    
    def _identify_mastery_indicators(self, feedback_data: List[FeedbackEntry]) -> List[Dict[str, Any]]:
        """Identify areas where user shows mastery."""
        mastery_indicators = []
        
        # Group by category
        category_feedback = defaultdict(list)
        for feedback in feedback_data:
            if feedback.content_category:
                category_feedback[feedback.content_category.value].append(feedback)
        
        for category, feedbacks in category_feedback.items():
            if len(feedbacks) >= 3:  # Need sufficient data
                recent_feedbacks = sorted(feedbacks, key=lambda x: x.timestamp)[-3:]
                
                # Check for consistent high ratings
                high_ratings = [f for f in recent_feedbacks if f.overall_rating and f.overall_rating >= 4]
                appropriate_difficulty = [f for f in recent_feedbacks if f.difficulty_rating == DifficultyLevel.JUST_RIGHT]
                high_accuracy = [f for f in recent_feedbacks if f.accuracy_rating is True]
                
                mastery_score = (
                    len(high_ratings) / len(recent_feedbacks) * 0.4 +
                    len(appropriate_difficulty) / len(recent_feedbacks) * 0.3 +
                    len(high_accuracy) / len(recent_feedbacks) * 0.3
                )
                
                if mastery_score >= 0.7:
                    mastery_indicators.append({
                        "category": category,
                        "mastery_score": mastery_score,
                        "evidence": {
                            "high_rating_ratio": len(high_ratings) / len(recent_feedbacks),
                            "appropriate_difficulty_ratio": len(appropriate_difficulty) / len(recent_feedbacks),
                            "accuracy_ratio": len(high_accuracy) / len(recent_feedbacks)
                        },
                        "sample_size": len(recent_feedbacks)
                    })
        
        return sorted(mastery_indicators, key=lambda x: x["mastery_score"], reverse=True)
    
    def _identify_struggle_areas(self, feedback_data: List[FeedbackEntry]) -> List[Dict[str, Any]]:
        """Identify areas where user is struggling."""
        struggle_areas = []
        
        # Group by category
        category_feedback = defaultdict(list)
        for feedback in feedback_data:
            if feedback.content_category:
                category_feedback[feedback.content_category.value].append(feedback)
        
        for category, feedbacks in category_feedback.items():
            if len(feedbacks) >= 2:
                # Check for concerning patterns
                low_ratings = [f for f in feedbacks if f.overall_rating and f.overall_rating <= 2]
                too_hard_feedback = [f for f in feedbacks if f.difficulty_rating == DifficultyLevel.TOO_HARD]
                low_accuracy = [f for f in feedbacks if f.accuracy_rating is False]
                
                struggle_score = (
                    len(low_ratings) / len(feedbacks) * 0.4 +
                    len(too_hard_feedback) / len(feedbacks) * 0.3 +
                    len(low_accuracy) / len(feedbacks) * 0.3
                )
                
                if struggle_score >= 0.4:
                    struggle_areas.append({
                        "category": category,
                        "struggle_score": struggle_score,
                        "issues": {
                            "low_rating_ratio": len(low_ratings) / len(feedbacks),
                            "too_hard_ratio": len(too_hard_feedback) / len(feedbacks),
                            "low_accuracy_ratio": len(low_accuracy) / len(feedbacks)
                        },
                        "sample_size": len(feedbacks),
                        "severity": "high" if struggle_score >= 0.7 else "moderate"
                    })
        
        return sorted(struggle_areas, key=lambda x: x["struggle_score"], reverse=True)
    
    def _generate_learning_recommendations(self, feedback_data: List[FeedbackEntry]) -> List[str]:
        """Generate personalized learning recommendations."""
        recommendations = []
        
        # Analyze recent performance
        recent_feedback = feedback_data[-10:] if len(feedback_data) >= 10 else feedback_data
        
        # Check difficulty patterns
        too_hard_count = sum(1 for f in recent_feedback if f.difficulty_rating == DifficultyLevel.TOO_HARD)
        too_easy_count = sum(1 for f in recent_feedback if f.difficulty_rating == DifficultyLevel.TOO_EASY)
        
        if too_hard_count > len(recent_feedback) * 0.6:
            recommendations.append("Consider reviewing fundamental concepts before tackling advanced topics")
        elif too_easy_count > len(recent_feedback) * 0.6:
            recommendations.append("You're ready for more challenging problems - try advanced level content")
        
        # Check category diversity
        categories_engaged = set(f.content_category for f in recent_feedback if f.content_category)
        if len(categories_engaged) < 3:
            recommendations.append("Explore different CS topics to build a well-rounded foundation")
        
        # Check accuracy patterns
        accuracy_feedback = [f for f in recent_feedback if f.accuracy_rating is not None]
        if accuracy_feedback:
            accuracy_rate = sum(1 for f in accuracy_feedback if f.accuracy_rating) / len(accuracy_feedback)
            if accuracy_rate < 0.5:
                recommendations.append("Focus on understanding concepts deeply rather than rushing through topics")
        
        # Check engagement patterns
        if len(feedback_data) > 5:
            recent_ratings = [f.overall_rating for f in recent_feedback if f.overall_rating]
            if recent_ratings and statistics.mean(recent_ratings) < 3:
                recommendations.append("Consider adjusting learning pace or seeking additional explanations")
        
        return recommendations


class CSFeedbackAnalyzer:
    """Main feedback analysis service for CS RAG pipeline."""
    
    def __init__(self, storage_backend: str = "memory"):
        self.feedback_collector = FeedbackCollector(storage_backend)
        self.accuracy_analyzer = AccuracyRatingAnalyzer(self.feedback_collector)
        self.progression_tracker = LearningProgressionTracker(self.feedback_collector)
    
    def collect_structured_feedback(
        self,
        user_id: str,
        question: str,
        answer: str,
        feedback_data: Dict[str, Any]
    ) -> str:
        """
        Collect comprehensive feedback with all dimensions.
        
        Args:
            user_id: User identifier
            question: Original question
            answer: Generated answer
            feedback_data: Dictionary containing all feedback fields
            
        Returns:
            Feedback entry ID
        """
        return self.feedback_collector.collect_feedback(
            user_id=user_id,
            question=question,
            answer=answer,
            **feedback_data
        )
    
    def get_overall_feedback_summary(
        self,
        time_period: Optional[int] = 30,
        category: Optional[str] = None
    ) -> FeedbackSummary:
        """
        Get comprehensive feedback summary.
        
        Args:
            time_period: Number of days to analyze
            category: Specific category to analyze
            
        Returns:
            FeedbackSummary object
        """
        # Get filtered feedback data
        category_enum = ContentCategory(category) if category else None
        feedback_data = self.accuracy_analyzer._get_feedback_data(time_period, category_enum, None)
        
        if not feedback_data:
            return FeedbackSummary(
                total_feedback_count=0,
                average_rating=0.0,
                thumbs_up_ratio=0.0,
                accuracy_rate=0.0,
                avg_helpfulness=0.0,
                avg_clarity=0.0,
                avg_completeness=0.0,
                avg_code_quality=0.0,
                difficulty_distribution={},
                category_performance={},
                trend_direction="stable",
                recent_change=0.0,
                performance_by_user_level={},
                time_period=f"Last {time_period} days" if time_period else "All time",
                feedback_velocity=0.0
            )
        
        # Calculate metrics
        rated_feedback = [f for f in feedback_data if f.overall_rating is not None]
        thumbs_feedback = [f for f in feedback_data if f.thumbs_rating is not None]
        accuracy_feedback = [f for f in feedback_data if f.accuracy_rating is not None]
        
        # Basic metrics
        average_rating = statistics.mean([f.overall_rating for f in rated_feedback]) if rated_feedback else 0.0
        thumbs_up_ratio = sum(1 for f in thumbs_feedback if f.thumbs_rating) / len(thumbs_feedback) if thumbs_feedback else 0.0
        accuracy_rate = sum(1 for f in accuracy_feedback if f.accuracy_rating) / len(accuracy_feedback) if accuracy_feedback else 0.0
        
        # Quality metrics
        helpfulness_feedback = [f for f in feedback_data if f.helpfulness_score is not None]
        clarity_feedback = [f for f in feedback_data if f.clarity_score is not None]
        completeness_feedback = [f for f in feedback_data if f.completeness_score is not None]
        code_quality_feedback = [f for f in feedback_data if f.code_quality_score is not None]
        
        avg_helpfulness = statistics.mean([f.helpfulness_score for f in helpfulness_feedback]) if helpfulness_feedback else 0.0
        avg_clarity = statistics.mean([f.clarity_score for f in clarity_feedback]) if clarity_feedback else 0.0
        avg_completeness = statistics.mean([f.completeness_score for f in completeness_feedback]) if completeness_feedback else 0.0
        avg_code_quality = statistics.mean([f.code_quality_score for f in code_quality_feedback]) if code_quality_feedback else 0.0
        
        # Difficulty distribution
        difficulty_feedback = [f for f in feedback_data if f.difficulty_rating is not None]
        difficulty_counts = Counter([f.difficulty_rating.value for f in difficulty_feedback])
        total_difficulty_feedback = len(difficulty_feedback)
        difficulty_distribution = {k: v / total_difficulty_feedback for k, v in difficulty_counts.items()} if total_difficulty_feedback > 0 else {}
        
        # Category performance
        category_stats = defaultdict(list)
        for feedback in rated_feedback:
            if feedback.content_category:
                category_stats[feedback.content_category.value].append(feedback.overall_rating)
        
        category_performance = {k: statistics.mean(v) for k, v in category_stats.items()}
        
        # User level performance
        user_level_stats = defaultdict(list)
        for feedback in rated_feedback:
            if feedback.user_experience:
                user_level_stats[feedback.user_experience].append(feedback.overall_rating)
        
        performance_by_user_level = {k: statistics.mean(v) for k, v in user_level_stats.items()}
        
        # Trend analysis
        if len(rated_feedback) >= 10:
            mid_point = len(rated_feedback) // 2
            early_avg = statistics.mean([f.overall_rating for f in rated_feedback[:mid_point]])
            recent_avg = statistics.mean([f.overall_rating for f in rated_feedback[mid_point:]])
            recent_change = recent_avg - early_avg
            
            if recent_change > 0.2:
                trend_direction = "improving"
            elif recent_change < -0.2:
                trend_direction = "declining"
            else:
                trend_direction = "stable"
        else:
            trend_direction = "stable"
            recent_change = 0.0
        
        # Feedback velocity
        if feedback_data and time_period:
            feedback_velocity = len(feedback_data) / time_period
        else:
            feedback_velocity = 0.0
        
        return FeedbackSummary(
            total_feedback_count=len(feedback_data),
            average_rating=average_rating,
            thumbs_up_ratio=thumbs_up_ratio,
            accuracy_rate=accuracy_rate,
            avg_helpfulness=avg_helpfulness,
            avg_clarity=avg_clarity,
            avg_completeness=avg_completeness,
            avg_code_quality=avg_code_quality,
            difficulty_distribution=difficulty_distribution,
            category_performance=category_performance,
            trend_direction=trend_direction,
            recent_change=recent_change,
            performance_by_user_level=performance_by_user_level,
            time_period=f"Last {time_period} days" if time_period else "All time",
            feedback_velocity=feedback_velocity
        )
    
    def get_user_dashboard_data(self, user_id: str) -> Dict[str, Any]:
        """
        Get comprehensive dashboard data for a user.
        
        Args:
            user_id: User identifier
            
        Returns:
            Dictionary with user dashboard data
        """
        # Get user learning progression
        progression = self.progression_tracker.track_user_learning(user_id)
        
        # Get user's recent feedback summary
        user_feedback = self.progression_tracker._get_user_feedback(user_id, 30)
        
        # Calculate user-specific metrics
        dashboard_data = {
            "user_id": user_id,
            "learning_progression": progression,
            "recent_activity": {
                "total_interactions": len(user_feedback),
                "avg_rating": statistics.mean([f.overall_rating for f in user_feedback if f.overall_rating]) if any(f.overall_rating for f in user_feedback) else None,
                "categories_explored": len(set(f.content_category for f in user_feedback if f.content_category)),
                "last_interaction": max(f.timestamp for f in user_feedback).isoformat() if user_feedback else None
            },
            "performance_insights": self._generate_user_insights(user_feedback),
            "next_steps": progression.get("recommendations", [])
        }
        
        return dashboard_data
    
    def _generate_user_insights(self, user_feedback: List[FeedbackEntry]) -> List[str]:
        """Generate insights for user dashboard."""
        insights = []
        
        if not user_feedback:
            return ["Start exploring CS topics to see your progress!"]
        
        # Recent performance
        recent_ratings = [f.overall_rating for f in user_feedback[-5:] if f.overall_rating]
        if recent_ratings:
            avg_recent = statistics.mean(recent_ratings)
            if avg_recent >= 4.0:
                insights.append("Great job! Your recent interactions show strong understanding.")
            elif avg_recent >= 3.0:
                insights.append("Good progress! You're building solid CS knowledge.")
            else:
                insights.append("Keep practicing! Understanding will improve with time.")
        
        # Category strength
        category_stats = defaultdict(list)
        for feedback in user_feedback:
            if feedback.content_category and feedback.overall_rating:
                category_stats[feedback.content_category.value].append(feedback.overall_rating)
        
        if category_stats:
            best_category = max(category_stats.items(), key=lambda x: statistics.mean(x[1]))
            insights.append(f"You're strongest in {best_category[0].replace('_', ' ').title()}")
        
        # Engagement pattern
        if len(user_feedback) >= 10:
            insights.append("You're an active learner! Consistent practice is key to mastery.")
        
        return insights
    
    def get_content_performance_report(self) -> Dict[str, Any]:
        """Generate comprehensive content performance report."""
        # Get accuracy summary
        accuracy_summary = self.accuracy_analyzer.get_accuracy_ratings_summary()
        
        # Get overall feedback summary
        feedback_summary = self.get_overall_feedback_summary()
        
        # Combine into comprehensive report
        report = {
            "accuracy_analysis": accuracy_summary,
            "feedback_summary": feedback_summary.to_dict(),
            "recommendations": self._generate_content_recommendations(accuracy_summary, feedback_summary),
            "generated_at": datetime.now().isoformat()
        }
        
        return report
    
    def _generate_content_recommendations(self, accuracy_summary: Dict, feedback_summary: FeedbackSummary) -> List[str]:
        """Generate recommendations for content improvement."""
        recommendations = []
        
        # Accuracy-based recommendations
        if "weak_areas" in accuracy_summary:
            for weak_area in accuracy_summary["weak_areas"][:3]:
                recommendations.append(f"Improve {weak_area['category']} explanations - current accuracy: {weak_area['accuracy']:.1%}")
        
        # Quality-based recommendations
        if feedback_summary.avg_clarity < 3.5:
            recommendations.append("Focus on making explanations clearer and more understandable")
        
        if feedback_summary.avg_completeness < 3.5:
            recommendations.append("Ensure answers are more comprehensive and complete")
        
        if feedback_summary.avg_code_quality < 3.5:
            recommendations.append("Improve code example quality and explanations")
        
        # Difficulty-based recommendations
        if "too_hard" in feedback_summary.difficulty_distribution and feedback_summary.difficulty_distribution["too_hard"] > 0.4:
            recommendations.append("Consider simplifying explanations - too many users find content too difficult")
        
        return recommendations


# Utility functions for integration
def collect_user_feedback(
    user_id: str,
    question: str,
    answer: str,
    rating: int,
    **kwargs
) -> str:
    """Quick feedback collection function."""
    analyzer = CSFeedbackAnalyzer()
    return analyzer.collect_structured_feedback(user_id, question, answer, {
        "overall_rating": rating,
        **kwargs
    })


def get_quick_analytics(days: int = 7) -> Dict[str, Any]:
    """Get quick analytics for recent period."""
    analyzer = CSFeedbackAnalyzer()
    summary = analyzer.get_overall_feedback_summary(time_period=days)
    
    return {
        "period": f"Last {days} days",
        "total_feedback": summary.total_feedback_count,
        "average_rating": round(summary.average_rating, 2),
        "accuracy_rate": round(summary.accuracy_rate * 100, 1),
        "thumbs_up_percentage": round(summary.thumbs_up_ratio * 100, 1),
        "trend": summary.trend_direction
    }


def monitor_user_progress(user_id: str) -> Dict[str, Any]:
    """Monitor specific user's learning progress."""
    analyzer = CSFeedbackAnalyzer()
    return analyzer.get_user_dashboard_data(user_id)


# Export main classes and functions
__all__ = [
    "CSFeedbackAnalyzer",
    "FeedbackCollector",
    "AccuracyRatingAnalyzer", 
    "LearningProgressionTracker",
    "FeedbackEntry",
    "FeedbackSummary",
    "FeedbackType",
    "DifficultyLevel",
    "ContentCategory",
    "collect_user_feedback",
    "get_quick_analytics",
    "monitor_user_progress"
]