"""
MongoDB Database Connection and Management
Handles MongoDB connections for the Engunity AI Backend

Stack: FastAPI + MongoDB + Motor (async)
File: backend/database/mongodb.py
"""

import os
import logging
from typing import Optional
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ========================================
# MONGODB CONNECTION CONFIGURATION
# ========================================

# MongoDB Configuration
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/engunity-ai")
DATABASE_NAME = "engunity-ai"

# Global MongoDB client instances
_mongo_client: Optional[AsyncIOMotorClient] = None
_database: Optional[AsyncIOMotorDatabase] = None
_sync_client: Optional[MongoClient] = None

# ========================================
# ASYNC MONGODB CONNECTION
# ========================================

async def connect_to_mongo():
    """Initialize MongoDB connection"""
    global _mongo_client, _database
    
    try:
        logger.info(f"Connecting to MongoDB at: {MONGO_URI}")
        _mongo_client = AsyncIOMotorClient(MONGO_URI)
        _database = _mongo_client[DATABASE_NAME]
        
        # Test the connection
        await _database.command('ping')
        logger.info("✅ MongoDB connected successfully (async)")
        
    except Exception as e:
        logger.error(f"❌ Failed to connect to MongoDB: {e}")
        raise

async def close_mongo_connection():
    """Close MongoDB connection"""
    global _mongo_client
    
    if _mongo_client:
        _mongo_client.close()
        logger.info("MongoDB connection closed")

async def get_mongo_db() -> AsyncIOMotorDatabase:
    """Get MongoDB database instance (dependency)"""
    global _database
    
    if _database is None:
        await connect_to_mongo()
    
    return _database

# ========================================
# SYNC MONGODB CONNECTION (for compatibility)
# ========================================

def get_sync_mongo_client() -> MongoClient:
    """Get synchronous MongoDB client"""
    global _sync_client
    
    if _sync_client is None:
        try:
            _sync_client = MongoClient(MONGO_URI)
            # Test connection
            _sync_client.admin.command('ping')
            logger.info("✅ MongoDB connected successfully (sync)")
        except Exception as e:
            logger.error(f"❌ Failed to connect to MongoDB (sync): {e}")
            raise
    
    return _sync_client

def get_sync_mongo_db():
    """Get synchronous MongoDB database"""
    client = get_sync_mongo_client()
    return client[DATABASE_NAME]

# ========================================
# HEALTH CHECK
# ========================================

async def check_mongo_health() -> dict:
    """Check MongoDB health status"""
    try:
        db = await get_mongo_db()
        await db.command('ping')
        
        # Get server status
        server_status = await db.command('serverStatus')
        
        return {
            "status": "healthy",
            "database": DATABASE_NAME,
            "version": server_status.get("version", "unknown"),
            "uptime": server_status.get("uptime", 0),
            "connections": server_status.get("connections", {}).get("current", 0)
        }
        
    except Exception as e:
        logger.error(f"MongoDB health check failed: {e}")
        return {
            "status": "unhealthy",
            "error": str(e)
        }

# ========================================
# DATABASE OPERATIONS HELPERS
# ========================================

async def ensure_indexes():
    """Create necessary database indexes"""
    try:
        db = await get_mongo_db()
        
        # Analysis sessions collection indexes
        analysis_sessions = db["analysis_sessions"]
        
        # Create indexes
        await analysis_sessions.create_index("user_id")
        await analysis_sessions.create_index([("user_id", 1), ("created_at", -1)])
        await analysis_sessions.create_index([("user_id", 1), ("status", 1)])
        await analysis_sessions.create_index([("user_id", 1), ("tags", 1)])
        await analysis_sessions.create_index("dataset_id")
        await analysis_sessions.create_index("updated_at")
        
        logger.info("✅ Database indexes created successfully")
        
    except Exception as e:
        logger.error(f"Failed to create database indexes: {e}")
        raise

# ========================================
# COLLECTION HELPERS
# ========================================

async def get_collection(collection_name: str):
    """Get a specific collection from the database"""
    db = await get_mongo_db()
    return db[collection_name]

# Export commonly used collections
async def get_analysis_sessions_collection():
    """Get analysis sessions collection"""
    return await get_collection("analysis_sessions")

async def get_users_collection():
    """Get users collection"""
    return await get_collection("users")

async def get_data_operations_collection():
    """Get data operations collection"""
    return await get_collection("data_operations")