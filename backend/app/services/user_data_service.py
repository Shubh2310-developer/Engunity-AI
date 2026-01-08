"""
User Data Service - Real User Data from MongoDB
Replaces mock data with actual user-specific data from MongoDB
Implements the document features research requirements with real user data
"""

import os
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import asyncio

logger = logging.getLogger(__name__)

class UserDataService:
    """Service to provide real user data instead of mock data"""
    
    def __init__(self):
        # MongoDB connection
        mongodb_uri = os.getenv('MONGODB_URI', 'mongodb://localhost:27017/')
        db_name = os.getenv('DATABASE_NAME', 'engunity-ai')
        
        self.client = AsyncIOMotorClient(mongodb_uri)
        self.db = self.client[db_name]
        
        # Collections
        self.documents = self.db.research_documents
        self.chats = self.db.chat_history
        self.users = self.db.user_profiles
        self.analysis_sessions = self.db.analysis_sessions
        self.projects = self.db.projects
        self.citations = self.db.citations
        
        # Feature flags
        self.use_mock_fallback = os.getenv('USE_MOCK_FALLBACK', 'true').lower() == 'true'
        
        logger.info(f"UserDataService initialized with MongoDB: {db_name}")
    
    async def get_user_dashboard_data(self, user_id: str, use_mock: bool = False) -> Dict[str, Any]:
        """
        Get comprehensive dashboard data for a user
        Implements intelligent summarization and analytics as per research document
        """
        if use_mock and self.use_mock_fallback:
            return await self._get_mock_dashboard_data(user_id)
        
        try:
            # Get user documents with enhanced metadata
            documents = await self._get_user_documents_with_metadata(user_id)
            
            # Get analysis sessions
            sessions = await self._get_user_analysis_sessions(user_id)
            
            # Get chat history
            chats = await self._get_user_chats(user_id)
            
            # Get projects
            projects = await self._get_user_projects(user_id)
            
            # Calculate enhanced statistics
            stats = await self._calculate_user_statistics(user_id, documents, sessions, chats)
            
            # Get recent activity with AI insights
            recent_activity = await self._get_recent_activity_with_insights(user_id)
            
            # Get document analytics (as per research features)
            document_analytics = await self._get_document_analytics(user_id, documents)
            
            return {
                "user_id": user_id,
                "statistics": stats,
                "documents": {
                    "total": len(documents),
                    "recent": documents[:10],
                    "by_status": await self._group_documents_by_status(documents),
                    "analytics": document_analytics
                },
                "sessions": {
                    "total": len(sessions),
                    "recent": sessions[:5],
                    "by_status": await self._group_sessions_by_status(sessions)
                },
                "chats": {
                    "total": len(chats),
                    "recent": chats[:10]
                },
                "projects": {
                    "total": len(projects),
                    "recent": projects[:5]
                },
                "recent_activity": recent_activity,
                "insights": await self._generate_user_insights(user_id, stats),
                "timestamp": datetime.utcnow().isoformat(),
                "data_source": "mongodb_real"
            }
            
        except Exception as e:
            logger.error(f"Error getting user dashboard data for {user_id}: {e}")
            
            if self.use_mock_fallback:
                logger.info("Falling back to mock data due to error")
                return await self._get_mock_dashboard_data(user_id)
            
            raise
    
    async def _get_user_documents_with_metadata(self, user_id: str) -> List[Dict[str, Any]]:
        """Get user documents with enhanced metadata extraction"""
        try:
            cursor = self.documents.find({"user_id": user_id}).sort("created_at", -1).limit(100)
            documents = await cursor.to_list(length=100)
            
            # Enhance with metadata as per document features research
            enhanced_docs = []
            for doc in documents:
                enhanced_doc = dict(doc)
                enhanced_doc["_id"] = str(doc["_id"])
                
                # Add enhanced metadata if not present
                if "metadata" not in enhanced_doc:
                    enhanced_doc["metadata"] = await self._extract_document_metadata(doc)
                
                # Add analytics data
                enhanced_doc["analytics"] = await self._get_document_analytics_data(str(doc["_id"]))
                
                enhanced_docs.append(enhanced_doc)
            
            return enhanced_docs
            
        except Exception as e:
            logger.error(f"Error getting user documents: {e}")
            return []
    
    async def _extract_document_metadata(self, document: Dict[str, Any]) -> Dict[str, Any]:
        """Extract metadata using LLM (implementing research document features)"""
        try:
            # Basic metadata
            metadata = {
                "word_count": len(document.get("content", "").split()) if document.get("content") else 0,
                "reading_time_minutes": 0,
                "document_type": "unknown",
                "topics": [],
                "entities": [],
                "confidence_score": 0.0,
                "extracted_at": datetime.utcnow().isoformat()
            }
            
            # Calculate reading time (200 words per minute)
            if metadata["word_count"] > 0:
                metadata["reading_time_minutes"] = round(metadata["word_count"] / 200, 1)
            
            # TODO: Implement LLM-based extraction here
            # This would use the AI services to extract:
            # - Document type classification
            # - Key topics and themes
            # - Named entities
            # - Sentiment analysis
            
            return metadata
            
        except Exception as e:
            logger.error(f"Error extracting document metadata: {e}")
            return {"error": str(e)}
    
    async def _get_user_analysis_sessions(self, user_id: str) -> List[Dict[str, Any]]:
        """Get user analysis sessions"""
        try:
            cursor = self.analysis_sessions.find({"user_id": user_id}).sort("created_at", -1).limit(50)
            sessions = await cursor.to_list(length=50)
            
            for session in sessions:
                session["_id"] = str(session["_id"])
            
            return sessions
            
        except Exception as e:
            logger.error(f"Error getting user analysis sessions: {e}")
            return []
    
    async def _get_user_chats(self, user_id: str) -> List[Dict[str, Any]]:
        """Get user chat history"""
        try:
            cursor = self.chats.find({"user_id": user_id}).sort("created_at", -1).limit(50)
            chats = await cursor.to_list(length=50)
            
            for chat in chats:
                chat["_id"] = str(chat["_id"])
            
            return chats
            
        except Exception as e:
            logger.error(f"Error getting user chats: {e}")
            return []
    
    async def _get_user_projects(self, user_id: str) -> List[Dict[str, Any]]:
        """Get user projects"""
        try:
            cursor = self.projects.find({"user_id": user_id}).sort("created_at", -1).limit(20)
            projects = await cursor.to_list(length=20)
            
            for project in projects:
                project["_id"] = str(project["_id"])
            
            return projects
            
        except Exception as e:
            logger.error(f"Error getting user projects: {e}")
            return []
    
    async def _calculate_user_statistics(self, user_id: str, documents: List[Dict], 
                                       sessions: List[Dict], chats: List[Dict]) -> Dict[str, Any]:
        """Calculate comprehensive user statistics"""
        try:
            now = datetime.utcnow()
            week_ago = now - timedelta(days=7)
            month_ago = now - timedelta(days=30)
            
            # Document statistics
            total_documents = len(documents)
            processed_docs = len([d for d in documents if d.get("status") == "processed"])
            failed_docs = len([d for d in documents if d.get("status") == "failed"])
            
            # Time-based statistics
            recent_documents = len([d for d in documents 
                                  if datetime.fromisoformat(d.get("created_at", "1970-01-01T00:00:00")) > week_ago])
            
            # Content statistics
            total_word_count = sum(d.get("metadata", {}).get("word_count", 0) for d in documents)
            total_reading_time = sum(d.get("metadata", {}).get("reading_time_minutes", 0) for d in documents)
            
            # Analysis statistics
            total_sessions = len(sessions)
            active_sessions = len([s for s in sessions if s.get("status") != "completed"])
            
            # Chat statistics
            total_chats = len(chats)
            recent_chats = len([c for c in chats 
                              if datetime.fromisoformat(c.get("created_at", "1970-01-01T00:00:00")) > week_ago])
            
            # Citations and entities (from document metadata)
            total_citations = sum(len(d.get("citations", [])) for d in documents)
            unique_entities = set()
            for doc in documents:
                entities = doc.get("metadata", {}).get("entities", [])
                unique_entities.update(entities)
            
            return {
                "documents": {
                    "total": total_documents,
                    "processed": processed_docs,
                    "failed": failed_docs,
                    "success_rate": (processed_docs / total_documents * 100) if total_documents > 0 else 0,
                    "recent_uploads": recent_documents
                },
                "content": {
                    "total_word_count": total_word_count,
                    "total_reading_time": total_reading_time,
                    "average_document_length": total_word_count / total_documents if total_documents > 0 else 0
                },
                "analysis": {
                    "total_sessions": total_sessions,
                    "active_sessions": active_sessions,
                    "completion_rate": ((total_sessions - active_sessions) / total_sessions * 100) if total_sessions > 0 else 0
                },
                "engagement": {
                    "total_chats": total_chats,
                    "recent_chats": recent_chats,
                    "chat_frequency": recent_chats / 7 if recent_chats > 0 else 0  # per day
                },
                "research": {
                    "total_citations": total_citations,
                    "unique_entities": len(unique_entities),
                    "research_depth": total_citations / total_documents if total_documents > 0 else 0
                },
                "calculated_at": now.isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error calculating user statistics: {e}")
            return {"error": str(e)}
    
    async def _get_recent_activity_with_insights(self, user_id: str) -> List[Dict[str, Any]]:
        """Get recent user activity with AI-generated insights"""
        try:
            activities = []
            
            # Get recent documents
            recent_docs = await self.documents.find(
                {"user_id": user_id}
            ).sort("created_at", -1).limit(5).to_list(length=5)
            
            for doc in recent_docs:
                activities.append({
                    "type": "document_upload",
                    "title": f"Uploaded {doc.get('title', 'Untitled Document')}",
                    "description": f"Document processed with {doc.get('metadata', {}).get('confidence_score', 0):.1%} confidence",
                    "timestamp": doc.get("created_at"),
                    "metadata": {
                        "document_id": str(doc["_id"]),
                        "word_count": doc.get("metadata", {}).get("word_count", 0),
                        "status": doc.get("status", "unknown")
                    }
                })
            
            # Get recent chats
            recent_chats = await self.chats.find(
                {"user_id": user_id}
            ).sort("created_at", -1).limit(5).to_list(length=5)
            
            for chat in recent_chats:
                activities.append({
                    "type": "chat_interaction",
                    "title": "Document Q&A Session",
                    "description": f"Asked: {chat.get('question', 'N/A')[:50]}...",
                    "timestamp": chat.get("created_at"),
                    "metadata": {
                        "chat_id": str(chat["_id"]),
                        "document_id": chat.get("document_id"),
                        "confidence": chat.get("confidence", 0)
                    }
                })
            
            # Sort by timestamp
            activities.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
            
            return activities[:10]
            
        except Exception as e:
            logger.error(f"Error getting recent activity: {e}")
            return []
    
    async def _get_document_analytics(self, user_id: str, documents: List[Dict]) -> Dict[str, Any]:
        """Get document analytics as per research document features"""
        try:
            # Document type distribution
            doc_types = {}
            topics = {}
            confidence_scores = []
            
            for doc in documents:
                # Document type
                doc_type = doc.get("metadata", {}).get("document_type", "unknown")
                doc_types[doc_type] = doc_types.get(doc_type, 0) + 1
                
                # Topics
                doc_topics = doc.get("metadata", {}).get("topics", [])
                for topic in doc_topics:
                    topics[topic] = topics.get(topic, 0) + 1
                
                # Confidence scores
                confidence = doc.get("metadata", {}).get("confidence_score", 0)
                if confidence > 0:
                    confidence_scores.append(confidence)
            
            # Calculate averages
            avg_confidence = sum(confidence_scores) / len(confidence_scores) if confidence_scores else 0
            
            return {
                "document_types": doc_types,
                "popular_topics": dict(sorted(topics.items(), key=lambda x: x[1], reverse=True)[:10]),
                "confidence_stats": {
                    "average": avg_confidence,
                    "count": len(confidence_scores),
                    "distribution": self._get_confidence_distribution(confidence_scores)
                },
                "processing_stats": {
                    "total_processed": len([d for d in documents if d.get("status") == "processed"]),
                    "failed": len([d for d in documents if d.get("status") == "failed"]),
                    "pending": len([d for d in documents if d.get("status") == "processing"])
                }
            }
            
        except Exception as e:
            logger.error(f"Error getting document analytics: {e}")
            return {}
    
    def _get_confidence_distribution(self, scores: List[float]) -> Dict[str, int]:
        """Get confidence score distribution"""
        if not scores:
            return {}
        
        distribution = {
            "high (>80%)": 0,
            "medium (60-80%)": 0,
            "low (<60%)": 0
        }
        
        for score in scores:
            if score > 0.8:
                distribution["high (>80%)"] += 1
            elif score > 0.6:
                distribution["medium (60-80%)"] += 1
            else:
                distribution["low (<60%)"] += 1
        
        return distribution
    
    async def _generate_user_insights(self, user_id: str, stats: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Generate AI-powered insights about user behavior"""
        insights = []
        
        try:
            # Document upload patterns
            total_docs = stats.get("documents", {}).get("total", 0)
            if total_docs > 0:
                success_rate = stats.get("documents", {}).get("success_rate", 0)
                if success_rate > 90:
                    insights.append({
                        "type": "positive",
                        "title": "Excellent Document Processing",
                        "description": f"Your documents have a {success_rate:.1f}% success rate in processing.",
                        "suggestion": "Consider exploring advanced features like multi-document synthesis."
                    })
                elif success_rate < 70:
                    insights.append({
                        "type": "warning",
                        "title": "Document Processing Issues",
                        "description": f"Some documents failed to process ({success_rate:.1f}% success rate).",
                        "suggestion": "Try uploading smaller files or check document format compatibility."
                    })
            
            # Usage patterns
            chat_frequency = stats.get("engagement", {}).get("chat_frequency", 0)
            if chat_frequency > 2:
                insights.append({
                    "type": "positive",
                    "title": "Active Research User",
                    "description": f"You're asking {chat_frequency:.1f} questions per day on average.",
                    "suggestion": "Consider using templates to streamline your research workflow."
                })
            
            # Research depth
            research_depth = stats.get("research", {}).get("research_depth", 0)
            if research_depth > 5:
                insights.append({
                    "type": "insight",
                    "title": "Deep Research Analysis",
                    "description": f"Average of {research_depth:.1f} citations per document shows thorough research.",
                    "suggestion": "Try the knowledge graph feature to visualize connections between documents."
                })
            
        except Exception as e:
            logger.error(f"Error generating user insights: {e}")
        
        return insights
    
    async def _get_mock_dashboard_data(self, user_id: str) -> Dict[str, Any]:
        """Fallback mock data when real data is not available"""
        return {
            "user_id": user_id,
            "statistics": {
                "documents": {
                    "total": 12,
                    "processed": 10,
                    "failed": 1,
                    "success_rate": 83.3,
                    "recent_uploads": 3
                },
                "content": {
                    "total_word_count": 45000,
                    "total_reading_time": 225,
                    "average_document_length": 3750
                },
                "engagement": {
                    "total_chats": 28,
                    "recent_chats": 8,
                    "chat_frequency": 1.1
                }
            },
            "documents": {
                "total": 12,
                "recent": [],
                "by_status": {"processed": 10, "failed": 1, "processing": 1}
            },
            "insights": [
                {
                    "type": "info",
                    "title": "Demo Mode Active",
                    "description": "You're viewing mock data. Real user data will be displayed once you upload documents.",
                    "suggestion": "Upload your first document to see real analytics."
                }
            ],
            "timestamp": datetime.utcnow().isoformat(),
            "data_source": "mock_fallback"
        }
    
    # Helper methods for grouping data
    async def _group_documents_by_status(self, documents: List[Dict]) -> Dict[str, int]:
        status_count = {}
        for doc in documents:
            status = doc.get("status", "unknown")
            status_count[status] = status_count.get(status, 0) + 1
        return status_count
    
    async def _group_sessions_by_status(self, sessions: List[Dict]) -> Dict[str, int]:
        status_count = {}
        for session in sessions:
            status = session.get("status", "unknown")
            status_count[status] = status_count.get(status, 0) + 1
        return status_count
    
    async def _get_document_analytics_data(self, document_id: str) -> Dict[str, Any]:
        """Get analytics data for a specific document"""
        try:
            # Get views, questions, engagement for this document
            views = await self.chats.count_documents({"document_id": document_id})
            
            # Get average response time and confidence from chats
            chat_cursor = self.chats.find({"document_id": document_id})
            chats = await chat_cursor.to_list(length=100)
            
            avg_confidence = 0
            if chats:
                confidences = [c.get("confidence", 0) for c in chats if c.get("confidence")]
                avg_confidence = sum(confidences) / len(confidences) if confidences else 0
            
            return {
                "views": views,
                "questions_asked": len(chats),
                "avg_confidence": avg_confidence,
                "last_accessed": chats[0].get("created_at") if chats else None
            }
            
        except Exception as e:
            logger.error(f"Error getting document analytics: {e}")
            return {"views": 0, "questions_asked": 0, "avg_confidence": 0}

# Global service instance
user_data_service = UserDataService()