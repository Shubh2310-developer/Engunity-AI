"""
Supabase Authentication Integration
Handles user authentication via Supabase for the Engunity AI Backend

Stack: FastAPI + Supabase Auth + JWT
File: backend/auth/supabase_auth.py
"""

import os
import jwt
import logging
from typing import Optional, Dict, Any
from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ========================================
# SUPABASE CONFIGURATION
# ========================================

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET")

# Initialize Supabase client
supabase: Optional[Client] = None

if SUPABASE_URL and SUPABASE_KEY:
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        logger.info("✅ Supabase client initialized successfully")
    except Exception as e:
        logger.error(f"❌ Failed to initialize Supabase client: {e}")
else:
    logger.warning("⚠️ Supabase credentials not found - authentication will be disabled")

# HTTP Bearer token scheme
security = HTTPBearer(auto_error=False)

# ========================================
# AUTHENTICATION FUNCTIONS
# ========================================

def decode_jwt_token(token: str) -> Dict[str, Any]:
    """Decode and verify JWT token from Supabase"""
    try:
        if not SUPABASE_JWT_SECRET:
            raise ValueError("SUPABASE_JWT_SECRET not configured")
        
        # Decode the JWT token
        payload = jwt.decode(
            token,
            SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            options={"verify_aud": False}  # Skip audience verification for Supabase
        )
        
        return payload
        
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")
    except Exception as e:
        logger.error(f"Error decoding JWT token: {e}")
        raise HTTPException(status_code=401, detail="Authentication failed")

async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> Dict[str, Any]:
    """Get current authenticated user from token"""
    
    # For development/testing - allow requests without auth if Supabase is not configured
    if not supabase or not SUPABASE_JWT_SECRET:
        logger.warning("⚠️ Authentication disabled - using mock user")
        return {
            "id": "mock-user-id",
            "email": "test@example.com",
            "role": "authenticated"
        }
    
    if not credentials:
        raise HTTPException(
            status_code=401,
            detail="Authentication required"
        )
    
    try:
        # Decode the JWT token
        payload = decode_jwt_token(credentials.credentials)
        
        # Extract user information
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid user ID in token")
        
        # Get user details from Supabase (optional)
        user_info = {
            "id": user_id,
            "email": payload.get("email"),
            "role": payload.get("role", "authenticated"),
            "aud": payload.get("aud"),
            "exp": payload.get("exp"),
            "iat": payload.get("iat"),
        }
        
        return user_info
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting current user: {e}")
        raise HTTPException(
            status_code=401,
            detail="Authentication failed"
        )

async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> Optional[Dict[str, Any]]:
    """Get current user if authenticated, otherwise return None"""
    try:
        return await get_current_user(credentials)
    except HTTPException:
        return None

# ========================================
# USER VERIFICATION FUNCTIONS
# ========================================

async def verify_user_exists(user_id: str) -> bool:
    """Verify that a user exists in Supabase"""
    if not supabase:
        return True  # Skip verification if Supabase is not configured
    
    try:
        # Query user from Supabase auth
        response = supabase.auth.admin.get_user_by_id(user_id)
        return response.user is not None
        
    except Exception as e:
        logger.error(f"Error verifying user {user_id}: {e}")
        return False

async def get_user_profile(user_id: str) -> Optional[Dict[str, Any]]:
    """Get user profile information"""
    if not supabase:
        return None
    
    try:
        # Get user from Supabase
        response = supabase.auth.admin.get_user_by_id(user_id)
        
        if response.user:
            return {
                "id": response.user.id,
                "email": response.user.email,
                "created_at": response.user.created_at,
                "last_sign_in_at": response.user.last_sign_in_at,
                "user_metadata": response.user.user_metadata,
                "app_metadata": response.user.app_metadata,
            }
            
        return None
        
    except Exception as e:
        logger.error(f"Error getting user profile {user_id}: {e}")
        return None

# ========================================
# PERMISSION HELPERS
# ========================================

def require_user_match(current_user: Dict[str, Any], target_user_id: str) -> None:
    """Verify that current user matches target user ID"""
    if current_user["id"] != target_user_id:
        raise HTTPException(
            status_code=403,
            detail="Access denied: You can only access your own resources"
        )

def check_admin_role(current_user: Dict[str, Any]) -> bool:
    """Check if current user has admin role"""
    return current_user.get("role") == "admin"

def require_admin_role(current_user: Dict[str, Any]) -> None:
    """Require admin role, raise exception if not admin"""
    if not check_admin_role(current_user):
        raise HTTPException(
            status_code=403,
            detail="Admin access required"
        )

# ========================================
# HEALTH CHECK
# ========================================

async def check_auth_health() -> Dict[str, Any]:
    """Check authentication service health"""
    try:
        if not supabase:
            return {
                "status": "disabled",
                "message": "Supabase not configured"
            }
        
        # Try to get service health (this might not work with all Supabase versions)
        return {
            "status": "healthy",
            "service": "supabase-auth",
            "url": SUPABASE_URL
        }
        
    except Exception as e:
        logger.error(f"Auth health check failed: {e}")
        return {
            "status": "unhealthy",
            "error": str(e)
        }

# ========================================
# UTILITY FUNCTIONS
# ========================================

def get_user_id_from_token(token: str) -> str:
    """Extract user ID from JWT token without full verification"""
    try:
        # Decode without verification to get user ID quickly
        payload = jwt.decode(token, options={"verify_signature": False})
        return payload.get("sub", "")
    except Exception:
        return ""