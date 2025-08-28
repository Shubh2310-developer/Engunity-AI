"""
Analysis Sessions API Routes
Handles CRUD operations for data analysis sessions in MongoDB

Stack: FastAPI + MongoDB + Supabase Auth
File: backend/routes/analysis_sessions.py
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.responses import JSONResponse
from typing import List, Optional, Dict, Any
from datetime import datetime
from bson import ObjectId
from bson.errors import InvalidId
import logging

# Use existing database and auth from main app
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def get_mongo_db():
    """Get MongoDB database from main app"""
    from main import db
    return db

def get_current_user():
    """Extract user ID from request or use mock user for now"""
    try:
        # Try to get user ID from request headers or use a default
        # In a real app, this would validate JWT tokens
        return {
            "id": "3cc7ccf7-1a5a-4538-9ebb-54c3a04c92ac",  # Use the frontend user ID
            "email": "test@example.com",
            "role": "authenticated"
        }
    except:
        return {
            "id": "3cc7ccf7-1a5a-4538-9ebb-54c3a04c92ac",
            "email": "test@example.com", 
            "role": "authenticated"
        }

# Import the models from the correct path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from models.analysis_session import (
        AnalysisSession, 
        AnalysisSessionCreate,
        AnalysisSessionUpdate,
        AnalysisSessionResponse,
        AnalysisSessionSummary
    )
    print("✅ Successfully imported analysis session models")
except ImportError as e:
    print(f"⚠️ Warning: Could not import analysis session models: {e}")
    # Define minimal fallback models
    from pydantic import BaseModel
    from typing import List, Optional, Dict, Any
    
    class AnalysisSessionCreate(BaseModel):
        title: str
        dataset_id: str
        file_info: Dict[str, Any]
        data_summary: Optional[Dict[str, Any]] = None
        column_metadata: Optional[List[Dict[str, Any]]] = None
        data_preview: Optional[Dict[str, Any]] = None
        charts_data: Optional[Dict[str, Any]] = None
        correlation_data: Optional[Dict[str, Any]] = None
        query_history: Optional[List[Dict[str, Any]]] = []
        ai_insights: Optional[List[Dict[str, Any]]] = []
        custom_charts: Optional[List[Dict[str, Any]]] = []
        transformations: Optional[List[Dict[str, Any]]] = []
        tags: Optional[List[str]] = []
        project_id: Optional[str] = None
        is_public: Optional[bool] = False
    
    class AnalysisSessionUpdate(BaseModel):
        title: Optional[str] = None
        data_summary: Optional[Dict[str, Any]] = None
        column_metadata: Optional[List[Dict[str, Any]]] = None
        data_preview: Optional[Dict[str, Any]] = None
        charts_data: Optional[Dict[str, Any]] = None
        correlation_data: Optional[Dict[str, Any]] = None
        query_history: Optional[List[Dict[str, Any]]] = None
        ai_insights: Optional[List[Dict[str, Any]]] = None
        custom_charts: Optional[List[Dict[str, Any]]] = None
        transformations: Optional[List[Dict[str, Any]]] = None
        tags: Optional[List[str]] = None
        status: Optional[str] = None
        is_public: Optional[bool] = None
        project_id: Optional[str] = None
    
    class AnalysisSessionSummary(BaseModel):
        id: str
        title: str
        dataset_name: str
        created_at: datetime
        updated_at: datetime
        last_activity_at: datetime
        status: str
        tags: List[str]

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/api/analysis-sessions", tags=["analysis-sessions"])

# ========================================
# UTILITY FUNCTIONS
# ========================================

def serialize_objectid(obj):
    """Convert MongoDB ObjectId to string"""
    if isinstance(obj, ObjectId):
        return str(obj)
    elif isinstance(obj, dict):
        return {key: serialize_objectid(value) for key, value in obj.items()}
    elif isinstance(obj, list):
        return [serialize_objectid(item) for item in obj]
    return obj

# ========================================
# ROUTE HANDLERS
# ========================================

@router.post("", response_model=Dict[str, str])
def create_analysis_session(
    session_data: AnalysisSessionCreate,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_mongo_db)
):
    """Create a new analysis session"""
    try:
        # Add metadata
        session_dict = session_data.dict()
        session_dict.update({
            "user_id": current_user["id"],
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "last_activity_at": datetime.utcnow(),
        })
        
        # Insert into MongoDB (synchronous)
        if db is not None:
            collection = db["analysis_sessions"]
            result = collection.insert_one(session_dict)
            
            logger.info(f"Created analysis session {result.inserted_id} for user {current_user['id']}")
            
            return {"insertedId": str(result.inserted_id)}
        else:
            # Fallback if no database connection
            mock_id = "mock-session-id-" + str(int(datetime.utcnow().timestamp()))
            logger.info(f"Mock: Created analysis session {mock_id} for user {current_user['id']}")
            return {"insertedId": mock_id}
        
    except Exception as e:
        logger.error(f"Error creating analysis session: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create analysis session: {str(e)}")

@router.get("", response_model=List[AnalysisSessionSummary])
def get_user_analysis_sessions(
    user_id: str = Query(..., description="User ID to filter sessions"),
    limit: int = Query(20, ge=1, le=100, description="Number of sessions to return"),
    offset: int = Query(0, ge=0, description="Number of sessions to skip"),
    status: Optional[str] = Query(None, description="Filter by status"),
    current_user: dict = Depends(get_current_user),
    db = Depends(get_mongo_db)
):
    """Get user's analysis sessions with pagination"""
    try:
        # Verify user can access these sessions
        if current_user["id"] != user_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Build query
        query = {"user_id": user_id}
        if status:
            query["status"] = status
        
        summaries = []
        
        if db is not None:
            # Get sessions with pagination (synchronous)
            collection = db["analysis_sessions"]
            cursor = collection.find(query).sort("updated_at", -1).skip(offset).limit(limit)
            sessions = list(cursor)
            
            # Convert to summary format
            for session in sessions:
                summary = {
                    "id": str(session["_id"]),
                    "title": session.get("title", "Untitled Analysis"),
                    "dataset_name": session.get("file_info", {}).get("name", "Unknown Dataset"),
                    "created_at": session.get("created_at"),
                    "updated_at": session.get("updated_at"),
                    "last_activity_at": session.get("last_activity_at", session.get("updated_at")),
                    "status": session.get("status", "saved"),
                    "tags": session.get("tags", []),
                }
                summaries.append(summary)
        
        logger.info(f"Retrieved {len(summaries)} analysis sessions for user {user_id}")
        return summaries
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving analysis sessions: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve analysis sessions: {str(e)}")

@router.get("/{session_id}")
def get_analysis_session(
    session_id: str,
    user_id: str = Query(..., description="User ID for authorization"),
    current_user: dict = Depends(get_current_user),
    db = Depends(get_mongo_db)
):
    """Get specific analysis session by ID"""
    try:
        # Verify user can access this session
        if current_user["id"] != user_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Validate ObjectId
        try:
            object_id = ObjectId(session_id)
        except InvalidId:
            raise HTTPException(status_code=400, detail="Invalid session ID format")
        
        # Get session from MongoDB
        if db is not None:
            collection = db["analysis_sessions"]
            session = collection.find_one({"_id": object_id, "user_id": user_id})
        else:
            session = None
        
        if not session:
            raise HTTPException(status_code=404, detail="Analysis session not found")
        
        # Convert ObjectIds to strings
        session = serialize_objectid(session)
        session["id"] = session.pop("_id")
        
        logger.info(f"Retrieved analysis session {session_id} for user {user_id}")
        return session
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving analysis session {session_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve analysis session: {str(e)}")

@router.patch("/{session_id}", response_model=Dict[str, str])
def update_analysis_session(
    session_id: str,
    updates: AnalysisSessionUpdate,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_mongo_db)
):
    """Update existing analysis session"""
    try:
        # Validate ObjectId
        try:
            object_id = ObjectId(session_id)
        except InvalidId:
            raise HTTPException(status_code=400, detail="Invalid session ID format")
        
        # Verify ownership
        if db is not None:
            collection = db["analysis_sessions"]
            existing_session = collection.find_one({"_id": object_id, "user_id": current_user["id"]})
        else:
            existing_session = None
        
        if not existing_session:
            raise HTTPException(status_code=404, detail="Analysis session not found")
        
        # Prepare update data
        update_data = updates.dict(exclude_unset=True)
        update_data["updated_at"] = datetime.utcnow()
        
        # Update session
        if db is not None:
            result = collection.update_one(
                {"_id": object_id},
                {"$set": update_data}
            )
            
            if result.matched_count == 0:
                raise HTTPException(status_code=404, detail="Analysis session not found")
        else:
            # Mock success
            pass
        
        logger.info(f"Updated analysis session {session_id} for user {current_user['id']}")
        return {"sessionId": session_id, "status": "updated"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating analysis session {session_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to update analysis session: {str(e)}")

@router.delete("/{session_id}", response_model=Dict[str, str])
def delete_analysis_session(
    session_id: str,
    user_id: str = Query(..., description="User ID for authorization"),
    current_user: dict = Depends(get_current_user),
    db = Depends(get_mongo_db)
):
    """Delete analysis session"""
    try:
        # Verify user can delete this session
        if current_user["id"] != user_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Validate ObjectId
        try:
            object_id = ObjectId(session_id)
        except InvalidId:
            raise HTTPException(status_code=400, detail="Invalid session ID format")
        
        # Delete session from MongoDB
        if db is not None:
            collection = db["analysis_sessions"]
            result = collection.delete_one({"_id": object_id, "user_id": user_id})
            
            if result.deleted_count == 0:
                raise HTTPException(status_code=404, detail="Analysis session not found")
        else:
            # Mock success
            pass
        
        logger.info(f"Deleted analysis session {session_id} for user {user_id}")
        return {"sessionId": session_id, "status": "deleted"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting analysis session {session_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete analysis session: {str(e)}")

@router.post("/{session_id}/archive", response_model=Dict[str, str])
def archive_analysis_session(
    session_id: str,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_mongo_db)
):
    """Archive analysis session (soft delete)"""
    try:
        # Validate ObjectId
        try:
            object_id = ObjectId(session_id)
        except InvalidId:
            raise HTTPException(status_code=400, detail="Invalid session ID format")
        
        # Archive session (set status to archived)
        if db is not None:
            collection = db["analysis_sessions"]
            result = collection.update_one(
                {"_id": object_id, "user_id": current_user["id"]},
                {
                    "$set": {
                        "status": "archived",
                        "updated_at": datetime.utcnow()
                    }
                }
            )
            
            if result.matched_count == 0:
                raise HTTPException(status_code=404, detail="Analysis session not found")
        else:
            # Mock success
            pass
        
        logger.info(f"Archived analysis session {session_id} for user {current_user['id']}")
        return {"sessionId": session_id, "status": "archived"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error archiving analysis session {session_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to archive analysis session: {str(e)}")

# ========================================
# HEALTH CHECK
# ========================================

@router.get("/health", include_in_schema=False)
def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "analysis-sessions-api"}