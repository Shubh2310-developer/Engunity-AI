"""
SQL Query API Endpoint
Executes direct SQL queries against datasets with validation and security
"""

import logging
import re
import time
from typing import Dict, Any, List
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, validator

# Import database service
from services.db import db_service, DatabaseError

logger = logging.getLogger(__name__)

# Router instance
router = APIRouter(prefix="/api", tags=["sql"])

# Request/Response Models
class SQLRequest(BaseModel):
    """Request model for SQL endpoint"""
    fileId: str
    projectId: str
    sql: str
    
    @validator('fileId')
    def validate_file_id(cls, v):
        if not v or len(v.strip()) == 0:
            raise ValueError('fileId cannot be empty')
        return v.strip()
    
    @validator('sql')
    def validate_sql(cls, v):
        if not v or len(v.strip()) == 0:
            raise ValueError('sql cannot be empty')
        if len(v) > 10000:
            raise ValueError('SQL query too long (max 10000 characters)')
        return v.strip()

class SQLResults(BaseModel):
    """Results model for query execution"""
    columns: List[str]
    rows: List[List[Any]]
    totalRows: int
    executionTime: str

class SQLResponse(BaseModel):
    """Response model for SQL endpoint"""
    results: SQLResults
    sql: str
    success: bool

class ErrorResponse(BaseModel):
    """Error response model"""
    error: str
    details: str = ""
    code: str = "INTERNAL_ERROR"
    success: bool = False

def validate_sql_security(sql: str, table_name: str) -> tuple[bool, str]:
    """
    Validate SQL query for security and safety
    
    Args:
        sql: SQL query to validate
        table_name: Expected table name (dataset)
        
    Returns:
        tuple: (is_valid, error_message)
    """
    sql_lower = sql.lower().strip()
    
    # Only allow SELECT statements
    if not sql_lower.startswith('select'):
        return False, "Only SELECT statements are allowed"
    
    # Check for dangerous keywords
    dangerous_keywords = [
        'drop', 'delete', 'insert', 'update', 'alter', 'create', 
        'truncate', 'replace', 'grant', 'revoke', 'exec', 'execute',
        'xp_', 'sp_', 'union', 'into outfile', 'load_file'
    ]
    
    for keyword in dangerous_keywords:
        if keyword in sql_lower:
            return False, f"Dangerous keyword '{keyword}' not allowed"
    
    # Check for comment-based SQL injection attempts
    if '--' in sql or '/*' in sql or '*/' in sql:
        return False, "SQL comments are not allowed"
    
    # Check for semicolon (except at the end)
    semicolon_positions = [i for i, c in enumerate(sql) if c == ';']
    if len(semicolon_positions) > 1:
        return False, "Multiple statements not allowed in single query"
    elif len(semicolon_positions) == 1 and semicolon_positions[0] != len(sql.strip()) - 1:
        return False, "Semicolon only allowed at end of query"
    
    return True, ""

def sanitize_sql(sql: str, file_id: str) -> str:
    """
    Sanitize SQL query by replacing table references with actual table name
    
    Args:
        sql: Original SQL query
        file_id: File ID to construct actual table name
        
    Returns:
        Sanitized SQL query
    """
    # Generate actual table name from file_id
    actual_table_name = db_service._get_table_name(file_id)
    
    # Replace 'dataset' with actual table name
    sanitized = re.sub(r'\bdataset\b', actual_table_name, sql, flags=re.IGNORECASE)
    
    # Remove trailing semicolon if present
    sanitized = sanitized.rstrip(';').strip()
    
    return sanitized

@router.post("/query-sql", response_model=SQLResponse)
async def query_sql(request: SQLRequest):
    """
    Execute SQL query against dataset
    
    This endpoint:
    1. Validates the SQL query for security
    2. Checks if dataset exists
    3. Executes the SQL query
    4. Returns results with execution time
    
    Args:
        request: SQL request with fileId, projectId, and sql
        
    Returns:
        SQL response with results and execution info
        
    Raises:
        HTTPException: For various error conditions
    """
    start_time = time.time()
    
    try:
        logger.info(f"Processing SQL request for fileId: {request.fileId}, SQL: '{request.sql[:100]}...'")
        
        # Step 1: Validate SQL for security
        is_valid, security_error = validate_sql_security(request.sql, request.fileId)
        if not is_valid:
            logger.error(f"SQL security validation failed: {security_error}")
            raise HTTPException(
                status_code=400,
                detail={
                    "error": "Invalid SQL",
                    "details": security_error,
                    "code": "INVALID_SQL",
                    "success": False
                }
            )
        
        # Step 2: Check if dataset table exists
        if not db_service.table_exists(request.fileId):
            logger.error(f"Dataset table not found for fileId: {request.fileId}")
            raise HTTPException(
                status_code=404,
                detail={
                    "error": "Dataset not found",
                    "details": f"No dataset found for fileId: {request.fileId}",
                    "code": "DATASET_NOT_FOUND",
                    "success": False
                }
            )
        
        # Step 3: Sanitize SQL
        clean_sql = sanitize_sql(request.sql, request.fileId)
        
        # Step 4: Execute SQL query
        try:
            query_results = db_service.execute_sql(clean_sql, limit=1000)
            execution_time = time.time() - start_time
            
            logger.info(f"Query executed successfully: {query_results.totalRows} rows returned in {execution_time:.3f}s")
            
            # Build response
            response = SQLResponse(
                results=SQLResults(
                    columns=query_results.columns,
                    rows=query_results.rows,
                    totalRows=query_results.totalRows,
                    executionTime=f"{execution_time*1000:.0f}ms"
                ),
                sql=clean_sql,
                success=True
            )
            
            return response
            
        except DatabaseError as e:
            logger.error(f"Query execution failed: {e}")
            raise HTTPException(
                status_code=500,
                detail={
                    "error": "Query execution failed",
                    "details": str(e),
                    "code": "QUERY_EXECUTION_ERROR",
                    "success": False
                }
            )
    
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    
    except Exception as e:
        logger.error(f"Unexpected error in SQL endpoint: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail={
                "error": "Internal server error",
                "details": "An unexpected error occurred while processing your request",
                "code": "INTERNAL_ERROR",
                "success": False
            }
        )

@router.get("/sql/health")
async def sql_health_check():
    """Health check endpoint for SQL service"""
    try:
        # Test database connection
        db_healthy = db_service.test_connection()
        
        status = "healthy" if db_healthy else "unhealthy"
        
        return {
            "status": status,
            "services": {
                "database": "healthy" if db_healthy else "unhealthy"
            },
            "timestamp": time.time()
        }
    
    except Exception as e:
        logger.error(f"SQL service health check failed: {e}")
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": time.time()
        }

@router.get("/sql/info")
async def sql_info():
    """Get information about the SQL service"""
    return {
        "service": "Direct SQL Query",
        "version": "1.0.0",
        "database": "Supabase PostgreSQL",
        "features": [
            "Direct SQL query execution",
            "Security validation and sanitization",
            "Support for SELECT statements only",
            "Result limiting for performance"
        ],
        "limits": {
            "max_sql_length": 10000,
            "max_result_rows": 1000,
            "query_timeout": 30,
            "allowed_operations": ["SELECT"]
        }
    }

# Export router
__all__ = ["router"]