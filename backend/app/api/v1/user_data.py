"""
User Data API - Real User Data from MongoDB
Provides endpoints for user-specific data with optional mock fallback
Implements document features research requirements
"""

import logging
from datetime import datetime
from typing import Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from app.services.user_data_service import user_data_service
from auth.supabase_auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/user", tags=["user-data"])

class UserDataRequest(BaseModel):
    use_mock: bool = False
    include_analytics: bool = True
    include_insights: bool = True

class DashboardResponse(BaseModel):
    user_id: str
    statistics: Dict[str, Any]
    documents: Dict[str, Any]
    sessions: Dict[str, Any]
    chats: Dict[str, Any]
    projects: Dict[str, Any]
    recent_activity: list
    insights: list
    timestamp: str
    data_source: str

@router.get("/dashboard", response_model=DashboardResponse)
async def get_user_dashboard(
    use_mock: bool = Query(False, description="Use mock data instead of real user data"),
    include_analytics: bool = Query(True, description="Include document analytics"),
    include_insights: bool = Query(True, description="Include AI-generated insights"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get comprehensive dashboard data for the current user
    Implements intelligent summarization and analytics from document features research
    """
    try:
        user_id = current_user["id"]
        logger.info(f"Getting dashboard data for user {user_id} (mock: {use_mock})")
        
        dashboard_data = await user_data_service.get_user_dashboard_data(
            user_id=user_id,
            use_mock=use_mock
        )
        
        # Filter data based on request parameters
        if not include_analytics:
            dashboard_data.get("documents", {}).pop("analytics", None)
        
        if not include_insights:
            dashboard_data["insights"] = []
        
        logger.info(f"Retrieved dashboard data for user {user_id}: {dashboard_data.get('data_source')}")
        
        return DashboardResponse(**dashboard_data)
        
    except Exception as e:
        logger.error(f"Error getting user dashboard: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve dashboard data: {str(e)}")

@router.get("/documents/analytics")
async def get_user_document_analytics(
    use_mock: bool = Query(False, description="Use mock data"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get detailed document analytics for the user
    Implements document analytics dashboard from research features
    """
    try:
        user_id = current_user["id"]
        
        if use_mock:
            # Return mock analytics data
            return {
                "user_id": user_id,
                "analytics": {
                    "total_documents": 12,
                    "processed_documents": 10,
                    "avg_confidence": 82.4,
                    "time_saved_hours": 24,
                    "document_types": {
                        "research_paper": 5,
                        "report": 3,
                        "contract": 2,
                        "presentation": 2
                    },
                    "confidence_distribution": {
                        "high (>80%)": 7,
                        "medium (60-80%)": 3,
                        "low (<60%)": 2
                    }
                },
                "data_source": "mock"
            }
        
        # Get real user documents
        documents = await user_data_service._get_user_documents_with_metadata(user_id)
        analytics = await user_data_service._get_document_analytics(user_id, documents)
        
        return {
            "user_id": user_id,
            "analytics": analytics,
            "data_source": "mongodb"
        }
        
    except Exception as e:
        logger.error(f"Error getting document analytics: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/statistics")
async def get_user_statistics(
    use_mock: bool = Query(False, description="Use mock data"),
    period: str = Query("30d", description="Time period: 7d, 30d, 90d"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get user statistics for a specific time period
    """
    try:
        user_id = current_user["id"]
        
        if use_mock:
            return {
                "user_id": user_id,
                "period": period,
                "statistics": {
                    "documents_uploaded": 8,
                    "questions_asked": 45,
                    "analysis_sessions": 12,
                    "time_saved_hours": 18,
                    "avg_response_time": "2.3s",
                    "success_rate": 94.2
                },
                "data_source": "mock"
            }
        
        # Get real statistics from MongoDB
        documents = await user_data_service._get_user_documents_with_metadata(user_id)
        sessions = await user_data_service._get_user_analysis_sessions(user_id)
        chats = await user_data_service._get_user_chats(user_id)
        
        stats = await user_data_service._calculate_user_statistics(user_id, documents, sessions, chats)
        
        return {
            "user_id": user_id,
            "period": period,
            "statistics": stats,
            "data_source": "mongodb"
        }
        
    except Exception as e:
        logger.error(f"Error getting user statistics: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/insights")
async def get_user_insights(
    use_mock: bool = Query(False, description="Use mock data"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get AI-generated insights about user behavior and content
    Implements intelligent analysis from document features research
    """
    try:
        user_id = current_user["id"]
        
        if use_mock:
            return {
                "user_id": user_id,
                "insights": [
                    {
                        "type": "positive",
                        "title": "High Document Processing Success",
                        "description": "Your documents have a 94% success rate in processing.",
                        "suggestion": "Consider exploring advanced features like multi-document synthesis."
                    },
                    {
                        "type": "insight",
                        "title": "Research Pattern Detected",
                        "description": "You frequently ask questions about methodology sections.",
                        "suggestion": "Try using the entity extraction feature to automatically identify research methods."
                    }
                ],
                "data_source": "mock"
            }
        
        # Get real insights
        documents = await user_data_service._get_user_documents_with_metadata(user_id)
        sessions = await user_data_service._get_user_analysis_sessions(user_id)
        chats = await user_data_service._get_user_chats(user_id)
        
        stats = await user_data_service._calculate_user_statistics(user_id, documents, sessions, chats)
        insights = await user_data_service._generate_user_insights(user_id, stats)
        
        return {
            "user_id": user_id,
            "insights": insights,
            "data_source": "mongodb"
        }
        
    except Exception as e:
        logger.error(f"Error getting user insights: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/activity")
async def get_user_activity(
    use_mock: bool = Query(False, description="Use mock data"),
    limit: int = Query(20, description="Number of activities to return"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get recent user activity with AI insights
    """
    try:
        user_id = current_user["id"]
        
        if use_mock:
            return {
                "user_id": user_id,
                "activity": [
                    {
                        "type": "document_upload",
                        "title": "Uploaded Research Paper",
                        "description": "Document processed with 87% confidence",
                        "timestamp": "2024-01-15T10:30:00Z",
                        "metadata": {"word_count": 4500, "status": "processed"}
                    },
                    {
                        "type": "chat_interaction",
                        "title": "Document Q&A Session",
                        "description": "Asked: What is the main research hypothesis?",
                        "timestamp": "2024-01-15T09:45:00Z",
                        "metadata": {"confidence": 0.92}
                    }
                ],
                "data_source": "mock"
            }
        
        # Get real activity
        activity = await user_data_service._get_recent_activity_with_insights(user_id)
        
        return {
            "user_id": user_id,
            "activity": activity[:limit],
            "data_source": "mongodb"
        }
        
    except Exception as e:
        logger.error(f"Error getting user activity: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/toggle-mock-mode")
async def toggle_mock_mode(
    enable_mock: bool = Query(..., description="Enable or disable mock mode"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Toggle mock mode for the user (stored in user preferences)
    """
    try:
        user_id = current_user["id"]
        
        # Update user preferences in MongoDB
        await user_data_service.users.update_one(
            {"user_id": user_id},
            {
                "$set": {
                    "preferences.use_mock_data": enable_mock,
                    "preferences.updated_at": datetime.utcnow()
                }
            },
            upsert=True
        )
        
        logger.info(f"Mock mode {'enabled' if enable_mock else 'disabled'} for user {user_id}")
        
        return {
            "user_id": user_id,
            "mock_mode_enabled": enable_mock,
            "message": f"Mock mode {'enabled' if enable_mock else 'disabled'} successfully"
        }
        
    except Exception as e:
        logger.error(f"Error toggling mock mode: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/preferences")
async def get_user_preferences(
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get user preferences including mock mode setting
    """
    try:
        user_id = current_user["id"]
        
        user_profile = await user_data_service.users.find_one({"user_id": user_id})
        preferences = user_profile.get("preferences", {}) if user_profile else {}
        
        default_preferences = {
            "use_mock_data": False,
            "include_analytics": True,
            "include_insights": True,
            "dashboard_refresh_interval": 30000,
            "theme": "light"
        }
        
        # Merge with defaults
        merged_preferences = {**default_preferences, **preferences}
        
        return {
            "user_id": user_id,
            "preferences": merged_preferences
        }
        
    except Exception as e:
        logger.error(f"Error getting user preferences: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/health")
async def health_check():
    """Health check for user data service"""
    try:
        # Test MongoDB connection
        await user_data_service.users.find_one({}, {"_id": 1})
        
        return {
            "status": "healthy",
            "service": "user-data-api",
            "mongodb_connected": True,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return JSONResponse(
            status_code=503,
            content={
                "status": "unhealthy",
                "service": "user-data-api",
                "mongodb_connected": False,
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            }
        )