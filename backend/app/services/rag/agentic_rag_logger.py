"""
Agentic RAG Logger and Metadata Storage
======================================

Advanced logging and metadata collection system for the Agentic RAG pipeline
that tracks performance, quality metrics, user feedback, and system health.

Features:
- Structured logging with JSON format
- Performance metrics tracking
- Quality score evolution
- User feedback collection
- A/B testing support
- Error analysis and debugging
- System health monitoring

Author: Engunity AI Team
"""

import os
import json
import logging
import asyncio
import time
from typing import Dict, List, Optional, Any, Union
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta
from pathlib import Path
import sqlite3
import threading
from collections import defaultdict, deque

logger = logging.getLogger(__name__)

@dataclass
class QueryLog:
    """Structured log entry for a query."""
    timestamp: str
    query: str
    user_id: Optional[str]
    session_id: Optional[str]
    document_id: Optional[str]
    
    # Processing metrics
    processing_time: float
    retrieval_time: float
    generation_time: float
    
    # Quality metrics
    confidence: float
    relevance_score: float
    coherence_score: float
    
    # System state
    local_chunks_found: int
    web_search_triggered: bool
    merge_strategy: str
    
    # Result metadata
    answer_length: int
    sources_count: int
    error: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

@dataclass
class FeedbackLog:
    """User feedback entry."""
    timestamp: str
    query_id: str
    user_id: str
    feedback_type: str  # 'rating', 'thumbs', 'correction', 'report'
    rating: Optional[int]  # 1-5 for rating feedback
    comment: Optional[str]
    correction: Optional[str]
    helpful: Optional[bool]
    metadata: Dict[str, Any]

@dataclass
class SystemMetrics:
    """System performance metrics."""
    timestamp: str
    active_sessions: int
    queries_per_minute: float
    average_response_time: float
    error_rate: float
    cache_hit_rate: float
    memory_usage: float
    disk_usage: float
    component_health: Dict[str, str]

class AgenticRAGLogger:
    """Advanced logger for Agentic RAG system."""
    
    def __init__(
        self,
        log_directory: str = "./logs/agentic_rag",
        db_path: str = "./logs/agentic_rag.db",
        enable_file_logging: bool = True,
        enable_db_logging: bool = True,
        log_level: str = "INFO",
        max_memory_logs: int = 10000,
        flush_interval: int = 60  # seconds
    ):
        """
        Initialize Agentic RAG Logger.
        
        Args:
            log_directory: Directory for log files
            db_path: Path to SQLite database
            enable_file_logging: Enable file-based logging
            enable_db_logging: Enable database logging
            log_level: Logging level
            max_memory_logs: Maximum logs to keep in memory
            flush_interval: Interval to flush logs to storage
        """
        self.log_directory = Path(log_directory)
        self.db_path = db_path
        self.enable_file_logging = enable_file_logging
        self.enable_db_logging = enable_db_logging
        self.max_memory_logs = max_memory_logs
        self.flush_interval = flush_interval
        
        # Create directories
        self.log_directory.mkdir(parents=True, exist_ok=True)
        
        # In-memory storage for fast access
        self.query_logs: deque = deque(maxlen=max_memory_logs)
        self.feedback_logs: deque = deque(maxlen=max_memory_logs)
        self.metrics_logs: deque = deque(maxlen=max_memory_logs)
        
        # Performance tracking
        self.stats = {
            'total_queries': 0,
            'successful_queries': 0,
            'failed_queries': 0,
            'web_searches': 0,
            'feedback_count': 0,
            'avg_confidence': 0.0,
            'avg_response_time': 0.0
        }
        
        # Rate tracking
        self.query_times = deque(maxlen=1000)  # Last 1000 query times
        self.error_times = deque(maxlen=1000)  # Last 1000 error times
        
        # Thread safety
        self.lock = threading.RLock()
        
        # Setup logging
        self._setup_file_logging(log_level)
        
        # Setup database
        if enable_db_logging:
            self._setup_database()
        
        # Start background flush thread
        self._start_flush_thread()
        
        logger.info("Agentic RAG Logger initialized")
    
    def _setup_file_logging(self, log_level: str):
        """Setup structured file logging."""
        if not self.enable_file_logging:
            return
        
        try:
            # Create JSON log file handler
            json_log_file = self.log_directory / f"agentic_rag_{datetime.now().strftime('%Y%m%d')}.jsonl"
            
            # Create custom formatter for JSON logs
            class JsonFormatter(logging.Formatter):
                def format(self, record):
                    log_entry = {
                        'timestamp': datetime.fromtimestamp(record.created).isoformat(),
                        'level': record.levelname,
                        'logger': record.name,
                        'message': record.getMessage(),
                        'module': record.module,
                        'function': record.funcName,
                        'line': record.lineno
                    }
                    
                    # Add extra fields if present
                    if hasattr(record, 'extra_data'):
                        log_entry.update(record.extra_data)
                    
                    return json.dumps(log_entry)
            
            # Setup file handler
            file_handler = logging.FileHandler(json_log_file)
            file_handler.setLevel(getattr(logging, log_level.upper()))
            file_handler.setFormatter(JsonFormatter())
            
            # Add to root logger
            logging.getLogger().addHandler(file_handler)
            
            logger.info(f"File logging setup: {json_log_file}")
            
        except Exception as e:
            logger.error(f"Failed to setup file logging: {e}")
    
    def _setup_database(self):
        """Setup SQLite database for structured storage."""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Create tables
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS query_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp TEXT NOT NULL,
                    query TEXT NOT NULL,
                    user_id TEXT,
                    session_id TEXT,
                    document_id TEXT,
                    processing_time REAL,
                    retrieval_time REAL,
                    generation_time REAL,
                    confidence REAL,
                    relevance_score REAL,
                    coherence_score REAL,
                    local_chunks_found INTEGER,
                    web_search_triggered BOOLEAN,
                    merge_strategy TEXT,
                    answer_length INTEGER,
                    sources_count INTEGER,
                    error TEXT,
                    metadata TEXT  -- JSON
                )
            ''')
            
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS feedback_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp TEXT NOT NULL,
                    query_id TEXT NOT NULL,
                    user_id TEXT NOT NULL,
                    feedback_type TEXT NOT NULL,
                    rating INTEGER,
                    comment TEXT,
                    correction TEXT,
                    helpful BOOLEAN,
                    metadata TEXT  -- JSON
                )
            ''')
            
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS system_metrics (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp TEXT NOT NULL,
                    active_sessions INTEGER,
                    queries_per_minute REAL,
                    average_response_time REAL,
                    error_rate REAL,
                    cache_hit_rate REAL,
                    memory_usage REAL,
                    disk_usage REAL,
                    component_health TEXT  -- JSON
                )
            ''')
            
            # Create indexes
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_query_timestamp ON query_logs(timestamp)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_query_user ON query_logs(user_id)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_feedback_query ON feedback_logs(query_id)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_metrics_timestamp ON system_metrics(timestamp)')
            
            conn.commit()
            conn.close()
            
            logger.info(f"Database setup complete: {self.db_path}")
            
        except Exception as e:
            logger.error(f"Failed to setup database: {e}")
            self.enable_db_logging = False
    
    def _start_flush_thread(self):
        """Start background thread to flush logs periodically."""
        def flush_worker():
            while True:
                try:
                    time.sleep(self.flush_interval)
                    self.flush_logs()
                except Exception as e:
                    logger.error(f"Error in flush worker: {e}")
        
        flush_thread = threading.Thread(target=flush_worker, daemon=True)
        flush_thread.start()
    
    def log_query(
        self,
        query: str,
        response_data: Dict[str, Any],
        processing_metrics: Dict[str, float],
        user_id: Optional[str] = None,
        session_id: Optional[str] = None,
        document_id: Optional[str] = None,
        error: Optional[str] = None
    ) -> str:
        """
        Log a query and its response.
        
        Args:
            query: User query
            response_data: Response data and quality metrics
            processing_metrics: Timing and performance metrics
            user_id: User identifier
            session_id: Session identifier
            document_id: Document identifier
            error: Error message if any
            
        Returns:
            Query log ID
        """
        with self.lock:
            timestamp = datetime.now().isoformat()
            query_id = f"q_{int(time.time())}_{len(self.query_logs)}"
            
            # Create query log entry
            query_log = QueryLog(
                timestamp=timestamp,
                query=query[:1000],  # Limit query length
                user_id=user_id,
                session_id=session_id,
                document_id=document_id,
                processing_time=processing_metrics.get('total_time', 0.0),
                retrieval_time=processing_metrics.get('retrieval_time', 0.0),
                generation_time=processing_metrics.get('generation_time', 0.0),
                confidence=response_data.get('confidence', 0.0),
                relevance_score=response_data.get('relevance_score', 0.0),
                coherence_score=response_data.get('coherence_score', 0.0),
                local_chunks_found=response_data.get('local_chunks_count', 0),
                web_search_triggered=response_data.get('web_search_performed', False),
                merge_strategy=response_data.get('merge_strategy', 'unknown'),
                answer_length=len(response_data.get('answer', '')),
                sources_count=len(response_data.get('sources', [])),
                error=error
            )
            
            # Add to memory
            self.query_logs.append((query_id, query_log))
            
            # Update statistics
            self.stats['total_queries'] += 1
            if error:
                self.stats['failed_queries'] += 1
                self.error_times.append(time.time())
            else:
                self.stats['successful_queries'] += 1
            
            if response_data.get('web_search_performed'):
                self.stats['web_searches'] += 1
            
            # Update running averages
            total_successful = self.stats['successful_queries']
            if total_successful > 0:
                # Update confidence average
                old_avg_conf = self.stats['avg_confidence']
                new_conf = response_data.get('confidence', 0.0)
                self.stats['avg_confidence'] = (old_avg_conf * (total_successful - 1) + new_conf) / total_successful
                
                # Update response time average
                old_avg_time = self.stats['avg_response_time']
                new_time = processing_metrics.get('total_time', 0.0)
                self.stats['avg_response_time'] = (old_avg_time * (total_successful - 1) + new_time) / total_successful
            
            # Track query rate
            self.query_times.append(time.time())
            
            logger.info(f"Query logged: {query_id}", extra={'extra_data': {
                'query_id': query_id,
                'confidence': response_data.get('confidence', 0.0),
                'processing_time': processing_metrics.get('total_time', 0.0),
                'web_search': response_data.get('web_search_performed', False)
            }})
            
            return query_id
    
    def log_feedback(
        self,
        query_id: str,
        user_id: str,
        feedback_type: str,
        rating: Optional[int] = None,
        comment: Optional[str] = None,
        correction: Optional[str] = None,
        helpful: Optional[bool] = None,
        metadata: Optional[Dict[str, Any]] = None
    ):
        """
        Log user feedback.
        
        Args:
            query_id: Query identifier
            user_id: User identifier
            feedback_type: Type of feedback
            rating: Rating score (1-5)
            comment: User comment
            correction: User correction
            helpful: Whether response was helpful
            metadata: Additional metadata
        """
        with self.lock:
            feedback_log = FeedbackLog(
                timestamp=datetime.now().isoformat(),
                query_id=query_id,
                user_id=user_id,
                feedback_type=feedback_type,
                rating=rating,
                comment=comment[:500] if comment else None,  # Limit comment length
                correction=correction[:1000] if correction else None,  # Limit correction length
                helpful=helpful,
                metadata=metadata or {}
            )
            
            self.feedback_logs.append(feedback_log)
            self.stats['feedback_count'] += 1
            
            logger.info(f"Feedback logged for query {query_id}", extra={'extra_data': {
                'query_id': query_id,
                'feedback_type': feedback_type,
                'rating': rating,
                'helpful': helpful
            }})
    
    def log_system_metrics(self, metrics: SystemMetrics):
        """Log system performance metrics."""
        with self.lock:
            self.metrics_logs.append(metrics)
            
            logger.info("System metrics logged", extra={'extra_data': {
                'active_sessions': metrics.active_sessions,
                'queries_per_minute': metrics.queries_per_minute,
                'error_rate': metrics.error_rate,
                'memory_usage': metrics.memory_usage
            }})
    
    def get_performance_stats(self, time_window_hours: int = 24) -> Dict[str, Any]:
        """Get performance statistics for a time window."""
        with self.lock:
            cutoff_time = datetime.now() - timedelta(hours=time_window_hours)
            
            # Filter recent queries
            recent_queries = [
                (qid, qlog) for qid, qlog in self.query_logs
                if datetime.fromisoformat(qlog.timestamp) > cutoff_time
            ]
            
            if not recent_queries:
                return {
                    'time_window_hours': time_window_hours,
                    'total_queries': 0,
                    'message': 'No queries in time window'
                }
            
            # Calculate metrics
            total_queries = len(recent_queries)
            successful_queries = sum(1 for _, qlog in recent_queries if not qlog.error)
            failed_queries = total_queries - successful_queries
            
            processing_times = [qlog.processing_time for _, qlog in recent_queries if not qlog.error]
            confidences = [qlog.confidence for _, qlog in recent_queries if not qlog.error]
            web_searches = sum(1 for _, qlog in recent_queries if qlog.web_search_triggered)
            
            # Calculate rates
            now = time.time()
            recent_query_times = [t for t in self.query_times if now - t < time_window_hours * 3600]
            queries_per_hour = len(recent_query_times) / time_window_hours if time_window_hours > 0 else 0
            
            recent_error_times = [t for t in self.error_times if now - t < time_window_hours * 3600]
            error_rate = len(recent_error_times) / max(len(recent_query_times), 1)
            
            return {
                'time_window_hours': time_window_hours,
                'total_queries': total_queries,
                'successful_queries': successful_queries,
                'failed_queries': failed_queries,
                'success_rate': successful_queries / total_queries if total_queries > 0 else 0,
                'error_rate': error_rate,
                'queries_per_hour': queries_per_hour,
                'web_searches': web_searches,
                'web_search_rate': web_searches / total_queries if total_queries > 0 else 0,
                'avg_processing_time': sum(processing_times) / len(processing_times) if processing_times else 0,
                'avg_confidence': sum(confidences) / len(confidences) if confidences else 0,
                'min_processing_time': min(processing_times) if processing_times else 0,
                'max_processing_time': max(processing_times) if processing_times else 0,
                'p95_processing_time': sorted(processing_times)[int(0.95 * len(processing_times))] if len(processing_times) > 20 else 0
            }
    
    def get_quality_trends(self, time_window_hours: int = 168) -> Dict[str, Any]:  # Default 1 week
        """Get quality metric trends over time."""
        with self.lock:
            cutoff_time = datetime.now() - timedelta(hours=time_window_hours)
            
            # Group queries by hour
            hourly_metrics = defaultdict(list)
            
            for qid, qlog in self.query_logs:
                if datetime.fromisoformat(qlog.timestamp) > cutoff_time and not qlog.error:
                    hour = qlog.timestamp[:13]  # YYYY-MM-DDTHH
                    hourly_metrics[hour].append({
                        'confidence': qlog.confidence,
                        'relevance': qlog.relevance_score,
                        'coherence': qlog.coherence_score,
                        'processing_time': qlog.processing_time
                    })
            
            # Calculate hourly averages
            trends = []
            for hour in sorted(hourly_metrics.keys()):
                metrics = hourly_metrics[hour]
                if metrics:
                    trends.append({
                        'hour': hour,
                        'query_count': len(metrics),
                        'avg_confidence': sum(m['confidence'] for m in metrics) / len(metrics),
                        'avg_relevance': sum(m['relevance'] for m in metrics) / len(metrics),
                        'avg_coherence': sum(m['coherence'] for m in metrics) / len(metrics),
                        'avg_processing_time': sum(m['processing_time'] for m in metrics) / len(metrics)
                    })
            
            return {
                'time_window_hours': time_window_hours,
                'trends': trends,
                'total_hours': len(trends)
            }
    
    def flush_logs(self):
        """Flush in-memory logs to persistent storage."""
        if not (self.enable_file_logging or self.enable_db_logging):
            return
        
        with self.lock:
            try:
                if self.enable_db_logging:
                    self._flush_to_database()
                
                logger.debug("Logs flushed to storage")
                
            except Exception as e:
                logger.error(f"Error flushing logs: {e}")
    
    def _flush_to_database(self):
        """Flush logs to SQLite database."""
        if not self.query_logs and not self.feedback_logs and not self.metrics_logs:
            return
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            # Flush query logs
            for query_id, qlog in list(self.query_logs):
                cursor.execute('''
                    INSERT OR IGNORE INTO query_logs (
                        timestamp, query, user_id, session_id, document_id,
                        processing_time, retrieval_time, generation_time,
                        confidence, relevance_score, coherence_score,
                        local_chunks_found, web_search_triggered, merge_strategy,
                        answer_length, sources_count, error, metadata
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    qlog.timestamp, qlog.query, qlog.user_id, qlog.session_id, qlog.document_id,
                    qlog.processing_time, qlog.retrieval_time, qlog.generation_time,
                    qlog.confidence, qlog.relevance_score, qlog.coherence_score,
                    qlog.local_chunks_found, qlog.web_search_triggered, qlog.merge_strategy,
                    qlog.answer_length, qlog.sources_count, qlog.error,
                    json.dumps({'query_id': query_id})
                ))
            
            # Flush feedback logs
            for flog in list(self.feedback_logs):
                cursor.execute('''
                    INSERT OR IGNORE INTO feedback_logs (
                        timestamp, query_id, user_id, feedback_type,
                        rating, comment, correction, helpful, metadata
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    flog.timestamp, flog.query_id, flog.user_id, flog.feedback_type,
                    flog.rating, flog.comment, flog.correction, flog.helpful,
                    json.dumps(flog.metadata)
                ))
            
            # Flush metrics logs
            for mlog in list(self.metrics_logs):
                cursor.execute('''
                    INSERT OR IGNORE INTO system_metrics (
                        timestamp, active_sessions, queries_per_minute,
                        average_response_time, error_rate, cache_hit_rate,
                        memory_usage, disk_usage, component_health
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    mlog.timestamp, mlog.active_sessions, mlog.queries_per_minute,
                    mlog.average_response_time, mlog.error_rate, mlog.cache_hit_rate,
                    mlog.memory_usage, mlog.disk_usage,
                    json.dumps(mlog.component_health)
                ))
            
            conn.commit()
            
        finally:
            conn.close()

# Global logger instance
_logger: Optional[AgenticRAGLogger] = None

def get_agentic_rag_logger(
    log_directory: str = "./logs/agentic_rag",
    **kwargs
) -> AgenticRAGLogger:
    """Get or create global Agentic RAG logger."""
    global _logger
    if _logger is None:
        _logger = AgenticRAGLogger(log_directory=log_directory, **kwargs)
    return _logger

# Export main classes
__all__ = [
    "AgenticRAGLogger",
    "QueryLog",
    "FeedbackLog", 
    "SystemMetrics",
    "get_agentic_rag_logger"
]