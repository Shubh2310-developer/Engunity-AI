"""
MongoDB database service for research documents
Handles all database operations for documents, citations, chats, and user data
"""

import os
from datetime import datetime
from typing import List, Optional, Dict, Any
from pymongo import MongoClient
from motor.motor_asyncio import AsyncIOMotorClient
import logging
from bson import ObjectId
import gridfs
from io import BytesIO

from app.models.research_models import (
    ResearchDocument, Citation, ChatMessage, UserProfile,
    DocumentStatus, DocumentListResponse, ProcessingStatusResponse
)

logger = logging.getLogger(__name__)

class DatabaseService:
    def __init__(self):
        # MongoDB connection
        mongodb_uri = os.getenv('MONGODB_URI', 'mongodb://localhost:27017/')
        db_name = os.getenv('DATABASE_NAME', 'engunity-ai-dev')
        
        self.client = AsyncIOMotorClient(mongodb_uri)
        self.db = self.client[db_name]
        
        # Collections
        self.documents_collection = self.db.research_documents
        self.chats_collection = self.db.chat_history
        self.users_collection = self.db.user_profiles
        
        # GridFS for file storage
        self.fs = gridfs.AsyncGridFS(self.db)
        
        logger.info(f"Database service initialized - DB: {db_name}")
    
    async def create_indexes(self):
        """Create database indexes for better performance"""
        try:
            # Document indexes
            await self.documents_collection.create_index([("user_id", 1), ("created_at", -1)])
            await self.documents_collection.create_index([("document_id", 1)], unique=True)
            await self.documents_collection.create_index([("status", 1)])
            
            # Chat indexes
            await self.chats_collection.create_index([("user_id", 1), ("created_at", -1)])
            await self.chats_collection.create_index([("document_id", 1)])
            
            # User indexes
            await self.users_collection.create_index([("user_id", 1)], unique=True)
            await self.users_collection.create_index([("email", 1)], unique=True)
            
            logger.info("Database indexes created successfully")
        except Exception as e:
            logger.error(f"Error creating indexes: {e}")
    
    # Document operations
    async def create_document(self, document: ResearchDocument) -> str:
        """Create a new research document"""
        try:
            doc_dict = document.dict()
            result = await self.documents_collection.insert_one(doc_dict)
            logger.info(f"Created document: {document.document_id}")
            return str(result.inserted_id)
        except Exception as e:
            logger.error(f"Error creating document: {e}")
            raise
    
    async def get_document(self, document_id: str, user_id: str) -> Optional[ResearchDocument]:
        """Get a document by ID and user ID"""
        try:
            doc = await self.documents_collection.find_one({
                "document_id": document_id,
                "user_id": user_id
            })
            if doc:
                return ResearchDocument(**doc)
            return None
        except Exception as e:
            logger.error(f"Error getting document: {e}")
            return None
    
    async def get_user_documents(self, user_id: str, page: int = 1, per_page: int = 20) -> DocumentListResponse:
        """Get all documents for a user with pagination"""
        try:
            skip = (page - 1) * per_page
            
            cursor = self.documents_collection.find({"user_id": user_id}).sort("created_at", -1)
            total = await self.documents_collection.count_documents({"user_id": user_id})
            
            documents = []
            async for doc in cursor.skip(skip).limit(per_page):
                documents.append(ResearchDocument(**doc))
            
            return DocumentListResponse(
                documents=documents,
                total=total,
                page=page,
                per_page=per_page
            )
        except Exception as e:
            logger.error(f"Error getting user documents: {e}")
            raise
    
    async def update_document_status(self, document_id: str, status: DocumentStatus, 
                                   progress: float = None) -> bool:
        """Update document processing status"""
        try:
            update_data = {
                "status": status.value,
                "updated_at": datetime.utcnow()
            }
            
            if status == DocumentStatus.PROCESSING:
                update_data["processing_started_at"] = datetime.utcnow()
            elif status == DocumentStatus.PROCESSED:
                update_data["processing_completed_at"] = datetime.utcnow()
            
            result = await self.documents_collection.update_one(
                {"document_id": document_id},
                {"$set": update_data}
            )
            
            return result.modified_count > 0
        except Exception as e:
            logger.error(f"Error updating document status: {e}")
            return False
    
    async def update_document_content(self, document_id: str, **kwargs) -> bool:
        """Update document content (raw_text, citations, summary, etc.)"""
        try:
            kwargs["updated_at"] = datetime.utcnow()
            
            result = await self.documents_collection.update_one(
                {"document_id": document_id},
                {"$set": kwargs}
            )
            
            return result.modified_count > 0
        except Exception as e:
            logger.error(f"Error updating document content: {e}")
            return False
    
    async def delete_document(self, document_id: str, user_id: str) -> bool:
        """Delete a document and its associated data"""
        try:
            # Delete the document
            result = await self.documents_collection.delete_one({
                "document_id": document_id,
                "user_id": user_id
            })
            
            if result.deleted_count > 0:
                # Delete associated chats
                await self.chats_collection.delete_many({"document_id": document_id})
                logger.info(f"Deleted document: {document_id}")
                return True
            
            return False
        except Exception as e:
            logger.error(f"Error deleting document: {e}")
            return False
    
    # Citation operations
    async def add_citations(self, document_id: str, citations: List[Citation]) -> bool:
        """Add citations to a document"""
        try:
            citations_dict = [citation.dict() for citation in citations]
            
            result = await self.documents_collection.update_one(
                {"document_id": document_id},
                {
                    "$set": {
                        "citations": citations_dict,
                        "citation_count": len(citations_dict),
                        "updated_at": datetime.utcnow()
                    }
                }
            )
            
            return result.modified_count > 0
        except Exception as e:
            logger.error(f"Error adding citations: {e}")
            return False
    
    async def update_citation_classification(self, document_id: str, citation_id: str, 
                                           classification_data: Dict) -> bool:
        """Update citation classification data"""
        try:
            result = await self.documents_collection.update_one(
                {"document_id": document_id, "citations.id": citation_id},
                {
                    "$set": {
                        "citations.$.classification": classification_data.get("predicted_class"),
                        "citations.$.confidence": classification_data.get("confidence"),
                        "citations.$.classification_method": classification_data.get("method"),
                        "citations.$.probabilities": classification_data.get("probabilities"),
                        "citations.$.processing_time": classification_data.get("processing_time"),
                        "citations.$.updated_at": datetime.utcnow(),
                        "updated_at": datetime.utcnow()
                    }
                }
            )
            
            return result.modified_count > 0
        except Exception as e:
            logger.error(f"Error updating citation classification: {e}")
            return False
    
    # Chat operations
    async def create_chat_message(self, message: ChatMessage) -> str:
        """Create a new chat message"""
        try:
            message_dict = message.dict()
            result = await self.chats_collection.insert_one(message_dict)
            logger.info(f"Created chat message: {message.message_id}")
            return str(result.inserted_id)
        except Exception as e:
            logger.error(f"Error creating chat message: {e}")
            raise
    
    async def get_user_chats(self, user_id: str, limit: int = 50) -> List[ChatMessage]:
        """Get recent chat messages for a user"""
        try:
            cursor = self.chats_collection.find({"user_id": user_id}).sort("created_at", -1).limit(limit)
            
            chats = []
            async for chat in cursor:
                chats.append(ChatMessage(**chat))
            
            return chats
        except Exception as e:
            logger.error(f"Error getting user chats: {e}")
            return []
    
    async def get_document_chats(self, document_id: str, limit: int = 20) -> List[ChatMessage]:
        """Get chat messages related to a specific document"""
        try:
            cursor = self.chats_collection.find({"document_id": document_id}).sort("created_at", -1).limit(limit)
            
            chats = []
            async for chat in cursor:
                chats.append(ChatMessage(**chat))
            
            return chats
        except Exception as e:
            logger.error(f"Error getting document chats: {e}")
            return []
    
    # User operations
    async def create_or_update_user(self, user_profile: UserProfile) -> str:
        """Create or update user profile"""
        try:
            user_dict = user_profile.dict()
            
            result = await self.users_collection.update_one(
                {"user_id": user_profile.user_id},
                {"$set": user_dict},
                upsert=True
            )
            
            logger.info(f"Updated user profile: {user_profile.user_id}")
            return str(result.upserted_id) if result.upserted_id else user_profile.user_id
        except Exception as e:
            logger.error(f"Error creating/updating user: {e}")
            raise
    
    async def get_user_profile(self, user_id: str) -> Optional[UserProfile]:
        """Get user profile by ID"""
        try:
            user = await self.users_collection.find_one({"user_id": user_id})
            if user:
                return UserProfile(**user)
            return None
        except Exception as e:
            logger.error(f"Error getting user profile: {e}")
            return None
    
    async def update_user_stats(self, user_id: str, **stats) -> bool:
        """Update user statistics"""
        try:
            stats["updated_at"] = datetime.utcnow()
            
            result = await self.users_collection.update_one(
                {"user_id": user_id},
                {"$inc": stats}
            )
            
            return result.modified_count > 0
        except Exception as e:
            logger.error(f"Error updating user stats: {e}")
            return False
    
    # File operations using GridFS
    async def store_file(self, file_data: bytes, filename: str, metadata: Dict = None) -> str:
        """Store file in GridFS"""
        try:
            file_id = await self.fs.put(
                file_data, 
                filename=filename, 
                metadata=metadata or {}
            )
            logger.info(f"Stored file: {filename}")
            return str(file_id)
        except Exception as e:
            logger.error(f"Error storing file: {e}")
            raise
    
    async def get_file(self, file_id: str) -> Optional[bytes]:
        """Get file from GridFS"""
        try:
            file_doc = await self.fs.get(ObjectId(file_id))
            return await file_doc.read()
        except Exception as e:
            logger.error(f"Error getting file: {e}")
            return None
    
    async def delete_file(self, file_id: str) -> bool:
        """Delete file from GridFS"""
        try:
            await self.fs.delete(ObjectId(file_id))
            return True
        except Exception as e:
            logger.error(f"Error deleting file: {e}")
            return False

# Global database service instance
db_service = DatabaseService()