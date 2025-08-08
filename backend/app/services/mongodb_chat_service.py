#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
MongoDB Atlas Chat History Service
==================================

Service for storing and retrieving chat sessions using MongoDB Atlas.
Stores conversation history per document and user for context-aware RAG.

Features:
- Document-based chat sessions
- User-specific conversation history  
- Automatic session management
- Chat context retrieval for RAG
- Efficient querying and pagination

Author: Engunity AI Team
"""

import os
import logging
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any, Union
from dataclasses import dataclass, asdict
import asyncio
from bson import ObjectId
import json

try:
    import motor.motor_asyncio
    from pymongo import MongoClient, DESCENDING, ASCENDING
    from pymongo.errors import ConnectionFailure, OperationFailure
    MONGO_AVAILABLE = True
except ImportError:
    MONGO_AVAILABLE = False
    logging.warning("MongoDB not available. Install: pip install motor pymongo")

logger = logging.getLogger(__name__)

@dataclass
class ChatMessage:
    """Chat message structure."""
    id: str
    user_id: str
    document_id: str
    session_id: str
    role: str  # 'user' or 'assistant'
    content: str
    timestamp: datetime
    retrieved_chunks: Optional[List[Dict[str, Any]]] = None
    model_response_metadata: Optional[Dict[str, Any]] = None
    confidence: Optional[float] = None
    sources: Optional[List[Dict[str, Any]]] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for MongoDB storage."""
        data = asdict(self)
        data['timestamp'] = self.timestamp.isoformat()
        return data
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'ChatMessage':
        """Create from MongoDB document."""
        data['timestamp'] = datetime.fromisoformat(data['timestamp'])
        return cls(**data)

@dataclass  
class ChatSession:
    """Chat session structure."""
    session_id: str
    user_id: str
    document_id: str
    document_name: str
    created_at: datetime
    last_activity: datetime
    message_count: int = 0
    metadata: Optional[Dict[str, Any]] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for MongoDB storage."""
        data = asdict(self)
        data['created_at'] = self.created_at.isoformat()
        data['last_activity'] = self.last_activity.isoformat()
        return data
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'ChatSession':
        """Create from MongoDB document."""
        data['created_at'] = datetime.fromisoformat(data['created_at'])
        data['last_activity'] = datetime.fromisoformat(data['last_activity'])
        return cls(**data)

class MongoDBChatService:
    """MongoDB Atlas service for chat history management."""
    
    def __init__(
        self,
        connection_string: Optional[str] = None,
        database_name: str = "engunity_ai",
        messages_collection: str = "chat_messages",
        sessions_collection: str = "chat_sessions"
    ):
        """
        Initialize MongoDB chat service.
        
        Args:
            connection_string: MongoDB Atlas connection string
            database_name: Database name
            messages_collection: Collection for storing messages
            sessions_collection: Collection for storing sessions
        """
        if not MONGO_AVAILABLE:
            raise ImportError("MongoDB not available. Install: pip install motor pymongo")
        
        self.connection_string = connection_string or os.getenv(
            'MONGODB_CONNECTION_STRING',
            'mongodb+srv://your-cluster.mongodb.net/'
        )
        self.database_name = database_name
        self.messages_collection_name = messages_collection
        self.sessions_collection_name = sessions_collection
        
        # Initialize async client
        self.client = None
        self.database = None
        self.messages_collection = None
        self.sessions_collection = None
        
        logger.info("MongoDB Chat Service initialized")
    
    async def connect(self):
        """Connect to MongoDB Atlas."""
        try:
            self.client = motor.motor_asyncio.AsyncIOMotorClient(
                self.connection_string,
                maxPoolSize=20,
                retryWrites=True
            )
            
            # Test connection
            await self.client.admin.command('ping')
            
            self.database = self.client[self.database_name]
            self.messages_collection = self.database[self.messages_collection_name]
            self.sessions_collection = self.database[self.sessions_collection_name]
            
            # Create indexes for better performance
            await self._create_indexes()
            
            logger.info("Connected to MongoDB Atlas successfully")
            
        except Exception as e:
            logger.error(f"Failed to connect to MongoDB: {e}")
            raise
    
    async def _create_indexes(self):
        """Create database indexes for optimal performance."""
        try:
            # Messages collection indexes
            await self.messages_collection.create_index([
                ("user_id", ASCENDING),
                ("document_id", ASCENDING),
                ("timestamp", DESCENDING)
            ])
            
            await self.messages_collection.create_index([
                ("session_id", ASCENDING),
                ("timestamp", ASCENDING)
            ])
            
            await self.messages_collection.create_index("document_id")
            await self.messages_collection.create_index("user_id")
            
            # Sessions collection indexes
            await self.sessions_collection.create_index([
                ("user_id", ASCENDING),
                ("document_id", ASCENDING)
            ])
            
            await self.sessions_collection.create_index("session_id", unique=True)
            await self.sessions_collection.create_index("last_activity", DESCENDING)
            
            logger.info("Database indexes created successfully")
            
        except Exception as e:
            logger.warning(f"Error creating indexes: {e}")
    
    async def disconnect(self):
        """Disconnect from MongoDB."""
        if self.client:
            self.client.close()
            logger.info("Disconnected from MongoDB")
    
    async def create_session(
        self,
        user_id: str,
        document_id: str,
        document_name: str,
        session_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> ChatSession:
        """
        Create a new chat session.
        
        Args:
            user_id: User identifier
            document_id: Document identifier
            document_name: Document name
            session_id: Optional custom session ID
            metadata: Additional session metadata
            
        Returns:
            Created chat session
        """
        if not session_id:
            session_id = f"session_{document_id}_{user_id}_{int(datetime.now().timestamp())}"
        
        now = datetime.now(timezone.utc)
        session = ChatSession(
            session_id=session_id,
            user_id=user_id,
            document_id=document_id,
            document_name=document_name,
            created_at=now,
            last_activity=now,
            metadata=metadata or {}
        )
        
        try:
            await self.sessions_collection.insert_one(session.to_dict())
            logger.info(f"Created chat session: {session_id}")
            return session
            
        except Exception as e:
            logger.error(f"Error creating session: {e}")
            raise
    
    async def get_session(
        self,
        session_id: str
    ) -> Optional[ChatSession]:
        """
        Get chat session by ID.
        
        Args:
            session_id: Session identifier
            
        Returns:
            Chat session or None if not found
        """
        try:
            session_doc = await self.sessions_collection.find_one({"session_id": session_id})
            if session_doc:
                return ChatSession.from_dict(session_doc)
            return None
            
        except Exception as e:
            logger.error(f"Error getting session: {e}")
            return None
    
    async def get_or_create_session(
        self,
        user_id: str,
        document_id: str,
        document_name: str,
        session_id: Optional[str] = None
    ) -> ChatSession:
        """
        Get existing session or create new one.
        
        Args:
            user_id: User identifier
            document_id: Document identifier  
            document_name: Document name
            session_id: Optional session ID to look for
            
        Returns:
            Chat session
        """
        if session_id:
            session = await self.get_session(session_id)
            if session:
                return session
        
        # Try to find most recent session for this user/document
        try:
            session_doc = await self.sessions_collection.find_one(
                {"user_id": user_id, "document_id": document_id},
                sort=[("last_activity", DESCENDING)]
            )
            
            if session_doc:
                return ChatSession.from_dict(session_doc)
            
        except Exception as e:
            logger.warning(f"Error finding existing session: {e}")
        
        # Create new session
        return await self.create_session(user_id, document_id, document_name)
    
    async def save_message(
        self,
        user_id: str,
        document_id: str,
        session_id: str,
        role: str,
        content: str,
        retrieved_chunks: Optional[List[Dict[str, Any]]] = None,
        model_response_metadata: Optional[Dict[str, Any]] = None,
        confidence: Optional[float] = None,
        sources: Optional[List[Dict[str, Any]]] = None
    ) -> ChatMessage:
        """
        Save a chat message.
        
        Args:
            user_id: User identifier
            document_id: Document identifier
            session_id: Session identifier
            role: Message role ('user' or 'assistant')
            content: Message content
            retrieved_chunks: Retrieved document chunks (for assistant messages)
            model_response_metadata: Model generation metadata
            confidence: Response confidence score
            sources: Source information
            
        Returns:
            Saved chat message
        """
        message_id = str(ObjectId())
        now = datetime.now(timezone.utc)
        
        message = ChatMessage(
            id=message_id,
            user_id=user_id,
            document_id=document_id,
            session_id=session_id,
            role=role,
            content=content,
            timestamp=now,
            retrieved_chunks=retrieved_chunks,
            model_response_metadata=model_response_metadata,
            confidence=confidence,
            sources=sources
        )
        
        try:
            await self.messages_collection.insert_one(message.to_dict())
            
            # Update session last activity
            await self.sessions_collection.update_one(
                {"session_id": session_id},
                {
                    "$set": {"last_activity": now.isoformat()},
                    "$inc": {"message_count": 1}
                }
            )
            
            logger.debug(f"Saved message: {message_id}")
            return message
            
        except Exception as e:
            logger.error(f"Error saving message: {e}")
            raise
    
    async def get_chat_history(
        self,
        user_id: str,
        document_id: str,
        session_id: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[ChatMessage]:
        """
        Get chat history for a document session.
        
        Args:
            user_id: User identifier
            document_id: Document identifier
            session_id: Optional session identifier
            limit: Maximum number of messages
            offset: Number of messages to skip
            
        Returns:
            List of chat messages
        """
        try:
            query = {"user_id": user_id, "document_id": document_id}
            if session_id:
                query["session_id"] = session_id
            
            cursor = self.messages_collection.find(query).sort("timestamp", ASCENDING)
            if offset > 0:
                cursor = cursor.skip(offset)
            if limit > 0:  
                cursor = cursor.limit(limit)
            
            messages = []
            async for doc in cursor:
                messages.append(ChatMessage.from_dict(doc))
            
            logger.debug(f"Retrieved {len(messages)} messages for {document_id}")
            return messages
            
        except Exception as e:
            logger.error(f"Error getting chat history: {e}")
            return []
    
    async def get_recent_context(
        self,
        user_id: str,
        document_id: str,
        session_id: Optional[str] = None,
        max_messages: int = 10
    ) -> List[ChatMessage]:
        """
        Get recent chat context for RAG enhancement.
        
        Args:
            user_id: User identifier
            document_id: Document identifier
            session_id: Optional session identifier
            max_messages: Maximum context messages
            
        Returns:
            Recent chat messages for context
        """
        return await self.get_chat_history(
            user_id=user_id,
            document_id=document_id,
            session_id=session_id,
            limit=max_messages
        )
    
    async def get_user_sessions(
        self,
        user_id: str,
        limit: int = 20
    ) -> List[ChatSession]:
        """
        Get user's recent chat sessions.
        
        Args:
            user_id: User identifier
            limit: Maximum number of sessions
            
        Returns:
            List of chat sessions
        """
        try:
            cursor = self.sessions_collection.find({"user_id": user_id}).sort("last_activity", DESCENDING).limit(limit)
            
            sessions = []
            async for doc in cursor:
                sessions.append(ChatSession.from_dict(doc))
            
            return sessions
            
        except Exception as e:
            logger.error(f"Error getting user sessions: {e}")
            return []
    
    async def delete_session(
        self,
        session_id: str,
        user_id: str
    ) -> bool:
        """
        Delete a chat session and all its messages.
        
        Args:
            session_id: Session identifier
            user_id: User identifier (for security)
            
        Returns:
            True if deleted successfully
        """
        try:
            # Delete messages
            await self.messages_collection.delete_many({
                "session_id": session_id,
                "user_id": user_id
            })
            
            # Delete session
            result = await self.sessions_collection.delete_one({
                "session_id": session_id,
                "user_id": user_id
            })
            
            success = result.deleted_count > 0
            if success:
                logger.info(f"Deleted session: {session_id}")
            
            return success
            
        except Exception as e:
            logger.error(f"Error deleting session: {e}")
            return False
    
    async def get_stats(self) -> Dict[str, Any]:
        """Get service statistics."""
        try:
            stats = {}
            
            # Messages stats
            stats['total_messages'] = await self.messages_collection.count_documents({})
            stats['total_sessions'] = await self.sessions_collection.count_documents({})
            
            # Recent activity
            from datetime import timedelta
            recent_threshold = datetime.now(timezone.utc) - timedelta(days=7)
            stats['recent_messages'] = await self.messages_collection.count_documents({
                "timestamp": {"$gte": recent_threshold.isoformat()}
            })
            
            return stats
            
        except Exception as e:
            logger.error(f"Error getting stats: {e}")
            return {}

# Global service instance
_chat_service: Optional[MongoDBChatService] = None

async def get_chat_service() -> MongoDBChatService:
    """Get or create global chat service instance."""
    global _chat_service
    if _chat_service is None:
        _chat_service = MongoDBChatService()
        await _chat_service.connect()
    return _chat_service

async def initialize_chat_service(connection_string: Optional[str] = None) -> MongoDBChatService:
    """Initialize chat service with custom connection string."""
    global _chat_service
    _chat_service = MongoDBChatService(connection_string=connection_string)
    await _chat_service.connect()
    return _chat_service