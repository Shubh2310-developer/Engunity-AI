"""
Document Service Layer
======================

MongoDB operations for document management system
"""

import os
import hashlib
import logging
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from pymongo import MongoClient, ASCENDING, DESCENDING
from pymongo.errors import DuplicateKeyError
from bson import ObjectId
from dotenv import load_dotenv

from app.models.document_models import (
    Document,
    DocumentMetadata,
    DocumentAnalytics,
    ChatSession,
    DocumentComparison,
    DocumentAnnotation,
    UserDocumentPreferences
)

load_dotenv()
logger = logging.getLogger(__name__)


class DocumentDatabase:
    """MongoDB database operations for documents"""

    def __init__(self):
        self.mongo_uri = os.getenv("MONGODB_URI", "mongodb://localhost:27017/")
        self.db_name = os.getenv("MONGODB_DB_NAME", "engunity_ai")

        try:
            self.client = MongoClient(self.mongo_uri)
            self.db = self.client[self.db_name]

            # Collections
            self.documents = self.db["documents"]
            self.analytics = self.db["document_analytics"]
            self.chat_sessions = self.db["chat_sessions"]
            self.comparisons = self.db["document_comparisons"]
            self.preferences = self.db["user_document_preferences"]

            # Create indexes
            self._create_indexes()

            logger.info(f"✅ Connected to MongoDB: {self.db_name}")

        except Exception as e:
            logger.error(f"❌ Failed to connect to MongoDB: {e}")
            raise

    def _create_indexes(self):
        """Create database indexes for performance"""
        try:
            # Documents indexes
            self.documents.create_index([("doc_id", ASCENDING)], unique=True)
            self.documents.create_index([("user_id", ASCENDING)])
            self.documents.create_index([("upload_date", DESCENDING)])
            self.documents.create_index([("category", ASCENDING)])
            self.documents.create_index([("tags", ASCENDING)])
            self.documents.create_index([("processing_status", ASCENDING)])

            # Analytics indexes
            self.analytics.create_index([("document_id", ASCENDING)], unique=True)
            self.analytics.create_index([("user_id", ASCENDING)])
            self.analytics.create_index([("last_accessed", DESCENDING)])

            # Chat sessions indexes
            self.chat_sessions.create_index([("session_id", ASCENDING)], unique=True)
            self.chat_sessions.create_index([("user_id", ASCENDING)])
            self.chat_sessions.create_index([("last_active", DESCENDING)])

            logger.info("✅ Database indexes created")

        except Exception as e:
            logger.warning(f"⚠️ Error creating indexes: {e}")

    # ===========================================
    # Document CRUD Operations
    # ===========================================

    async def create_document(self, document: Document) -> str:
        """Create a new document"""
        try:
            # Convert to dict and handle ObjectId
            doc_dict = document.dict(by_alias=True, exclude={"id"})
            doc_dict["_id"] = ObjectId()

            result = self.documents.insert_one(doc_dict)

            # Create corresponding analytics entry
            analytics = DocumentAnalytics(
                document_id=document.doc_id,
                user_id=document.user_id
            )
            await self.create_analytics(analytics)

            logger.info(f"✅ Created document: {document.doc_id}")
            return str(result.inserted_id)

        except DuplicateKeyError:
            logger.error(f"❌ Document already exists: {document.doc_id}")
            raise ValueError(f"Document with ID {document.doc_id} already exists")
        except Exception as e:
            logger.error(f"❌ Error creating document: {e}")
            raise

    async def get_document(self, doc_id: str) -> Optional[Document]:
        """Get document by ID"""
        try:
            doc_dict = self.documents.find_one({"doc_id": doc_id})
            if doc_dict:
                return Document(**doc_dict)
            return None
        except Exception as e:
            logger.error(f"❌ Error getting document: {e}")
            raise

    async def get_user_documents(
        self,
        user_id: str,
        skip: int = 0,
        limit: int = 50,
        category: Optional[str] = None,
        search_query: Optional[str] = None
    ) -> List[Document]:
        """Get all documents for a user with pagination and filtering"""
        try:
            query = {"user_id": user_id}

            if category and category != "all":
                query["category"] = category

            if search_query:
                query["$or"] = [
                    {"filename": {"$regex": search_query, "$options": "i"}},
                    {"tags": {"$regex": search_query, "$options": "i"}},
                    {"custom_tags": {"$regex": search_query, "$options": "i"}}
                ]

            cursor = self.documents.find(query).sort("upload_date", DESCENDING).skip(skip).limit(limit)
            documents = [Document(**doc) for doc in cursor]

            return documents

        except Exception as e:
            logger.error(f"❌ Error getting user documents: {e}")
            raise

    async def update_document(self, doc_id: str, updates: Dict[str, Any]) -> bool:
        """Update document fields"""
        try:
            updates["last_modified"] = datetime.utcnow()
            result = self.documents.update_one(
                {"doc_id": doc_id},
                {"$set": updates}
            )
            return result.modified_count > 0
        except Exception as e:
            logger.error(f"❌ Error updating document: {e}")
            raise

    async def delete_document(self, doc_id: str) -> bool:
        """Delete a document"""
        try:
            result = self.documents.delete_one({"doc_id": doc_id})

            # Also delete related data
            self.analytics.delete_one({"document_id": doc_id})

            logger.info(f"✅ Deleted document: {doc_id}")
            return result.deleted_count > 0

        except Exception as e:
            logger.error(f"❌ Error deleting document: {e}")
            raise

    # ===========================================
    # Analytics Operations
    # ===========================================

    async def create_analytics(self, analytics: DocumentAnalytics) -> str:
        """Create analytics entry"""
        try:
            analytics_dict = analytics.dict(by_alias=True, exclude={"id"})
            analytics_dict["_id"] = ObjectId()
            result = self.analytics.insert_one(analytics_dict)
            return str(result.inserted_id)
        except Exception as e:
            logger.error(f"❌ Error creating analytics: {e}")
            raise

    async def get_analytics(self, document_id: str) -> Optional[DocumentAnalytics]:
        """Get analytics for a document"""
        try:
            analytics_dict = self.analytics.find_one({"document_id": document_id})
            if analytics_dict:
                return DocumentAnalytics(**analytics_dict)
            return None
        except Exception as e:
            logger.error(f"❌ Error getting analytics: {e}")
            raise

    async def increment_view_count(self, doc_id: str):
        """Increment document view count"""
        try:
            # Update document
            self.documents.update_one(
                {"doc_id": doc_id},
                {
                    "$inc": {"view_count": 1},
                    "$set": {"last_accessed": datetime.utcnow()}
                }
            )

            # Update analytics
            self.analytics.update_one(
                {"document_id": doc_id},
                {
                    "$inc": {"views": 1},
                    "$set": {"last_accessed": datetime.utcnow()}
                }
            )
        except Exception as e:
            logger.error(f"❌ Error incrementing view count: {e}")

    async def track_question(self, doc_id: str, question: str, response_time_ms: float, confidence: float):
        """Track a question asked about the document"""
        try:
            # Update document
            self.documents.update_one(
                {"doc_id": doc_id},
                {
                    "$inc": {"question_count": 1},
                    "$set": {
                        "avg_confidence": confidence,
                        "last_accessed": datetime.utcnow()
                    }
                }
            )

            # Update analytics
            self.analytics.update_one(
                {"document_id": doc_id},
                {
                    "$inc": {"questions_asked": 1},
                    "$set": {
                        "avg_response_time_ms": response_time_ms,
                        "avg_confidence_score": confidence,
                        "last_accessed": datetime.utcnow()
                    }
                }
            )
        except Exception as e:
            logger.error(f"❌ Error tracking question: {e}")

    async def get_dashboard_stats(self, user_id: str) -> Dict[str, Any]:
        """Get dashboard statistics for user"""
        try:
            # Total documents
            total_documents = self.documents.count_documents({"user_id": user_id})

            # Aggregate questions and confidence
            pipeline = [
                {"$match": {"user_id": user_id}},
                {"$group": {
                    "_id": None,
                    "total_questions": {"$sum": "$question_count"},
                    "avg_confidence": {"$avg": "$avg_confidence"},
                    "total_views": {"$sum": "$view_count"}
                }}
            ]
            stats = list(self.documents.aggregate(pipeline))

            if stats:
                result = stats[0]
                return {
                    "totalDocuments": total_documents,
                    "questionsAsked": result.get("total_questions", 0),
                    "avgConfidence": round(result.get("avg_confidence", 0) * 100, 1) if result.get("avg_confidence") else 0,
                    "timeSaved": round(result.get("total_questions", 0) * 0.05, 1),  # Estimate 3 min per question
                    "totalViews": result.get("total_views", 0)
                }

            return {
                "totalDocuments": total_documents,
                "questionsAsked": 0,
                "avgConfidence": 0,
                "timeSaved": 0,
                "totalViews": 0
            }

        except Exception as e:
            logger.error(f"❌ Error getting dashboard stats: {e}")
            return {
                "totalDocuments": 0,
                "questionsAsked": 0,
                "avgConfidence": 0,
                "timeSaved": 0,
                "totalViews": 0
            }

    # ===========================================
    # Chat Session Operations
    # ===========================================

    async def create_chat_session(self, session: ChatSession) -> str:
        """Create a chat session"""
        try:
            session_dict = session.dict(by_alias=True, exclude={"id"})
            session_dict["_id"] = ObjectId()
            result = self.chat_sessions.insert_one(session_dict)
            return str(result.inserted_id)
        except Exception as e:
            logger.error(f"❌ Error creating chat session: {e}")
            raise

    async def get_chat_session(self, session_id: str) -> Optional[ChatSession]:
        """Get chat session"""
        try:
            session_dict = self.chat_sessions.find_one({"session_id": session_id})
            if session_dict:
                return ChatSession(**session_dict)
            return None
        except Exception as e:
            logger.error(f"❌ Error getting chat session: {e}")
            raise

    async def add_message_to_session(self, session_id: str, message: Dict[str, Any]):
        """Add message to chat session"""
        try:
            self.chat_sessions.update_one(
                {"session_id": session_id},
                {
                    "$push": {"messages": message},
                    "$inc": {"message_count": 1},
                    "$set": {"last_active": datetime.utcnow()}
                }
            )
        except Exception as e:
            logger.error(f"❌ Error adding message: {e}")

    # ===========================================
    # Annotation Operations
    # ===========================================

    async def add_annotation(self, doc_id: str, annotation: DocumentAnnotation):
        """Add annotation to document"""
        try:
            annotation_dict = annotation.dict()
            self.documents.update_one(
                {"doc_id": doc_id},
                {"$push": {"annotations": annotation_dict}}
            )
            logger.info(f"✅ Added annotation to document: {doc_id}")
        except Exception as e:
            logger.error(f"❌ Error adding annotation: {e}")
            raise

    async def get_annotations(self, doc_id: str) -> List[DocumentAnnotation]:
        """Get all annotations for a document"""
        try:
            doc = await self.get_document(doc_id)
            if doc and doc.annotations:
                return doc.annotations
            return []
        except Exception as e:
            logger.error(f"❌ Error getting annotations: {e}")
            return []

    # ===========================================
    # Utility Methods
    # ===========================================

    def close(self):
        """Close database connection"""
        self.client.close()
        logger.info("✅ MongoDB connection closed")


# Singleton instance
_db_instance = None


def get_document_db() -> DocumentDatabase:
    """Get database instance (singleton)"""
    global _db_instance
    if _db_instance is None:
        _db_instance = DocumentDatabase()
    return _db_instance
