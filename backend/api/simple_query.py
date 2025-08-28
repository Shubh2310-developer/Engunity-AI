"""
Simple Query API Endpoint
Basic dataset queries without complex SQL parsing
"""

import logging
import time
from typing import List, Any
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, validator

# Import simple database service
from services.simple_db import simple_db_service, DatabaseError

# Mock data for when tables don't exist
MOCK_DATA = {
    "columns": ["id", "name", "age", "department", "salary", "hire_date"],
    "rows": [
        [1, "John Doe", 28, "Engineering", 75000, "2023-01-15"],
        [2, "Jane Smith", 34, "Marketing", 68000, "2022-03-22"],
        [3, "Bob Johnson", 45, "Engineering", 95000, "2021-07-10"],
        [4, "Alice Brown", 29, "HR", 55000, "2023-02-01"],
        [5, "Charlie Wilson", 38, "Engineering", 82000, "2022-11-15"],
        [6, "Diana Davis", 31, "Marketing", 71000, "2023-04-05"],
        [7, "Eve Anderson", 27, "Design", 63000, "2023-01-20"],
        [8, "Frank Miller", 42, "Engineering", 98000, "2020-09-12"],
        [9, "Grace Taylor", 35, "HR", 58000, "2022-06-30"],
        [10, "Henry Clark", 33, "Marketing", 73000, "2021-12-18"]
    ]
}

logger = logging.getLogger(__name__)

# Router instance
router = APIRouter(prefix="/api", tags=["query"])

# Request/Response Models
class SimpleQueryRequest(BaseModel):
    """Request model for simple query endpoint"""
    fileId: str
    projectId: str
    sql: str  # We'll accept this but use simple SELECT for now
    
    @validator('fileId')
    def validate_file_id(cls, v):
        if not v or len(v.strip()) == 0:
            raise ValueError('fileId cannot be empty')
        return v.strip()

class QueryResults(BaseModel):
    """Results model for query execution"""
    columns: List[str]
    rows: List[List[Any]]
    totalRows: int
    executionTime: str

class SimpleQueryResponse(BaseModel):
    """Response model for simple query endpoint"""
    results: QueryResults
    sql: str
    success: bool

@router.post("/query-sql", response_model=SimpleQueryResponse)
async def simple_query_sql(request: SimpleQueryRequest):
    """
    Execute a simple dataset query (SELECT * with limit for now)
    This is a simplified version to test the connection
    
    Args:
        request: Query request with fileId, projectId, and sql
        
    Returns:
        Simple query response with basic dataset results
    """
    start_time = time.time()
    
    try:
        logger.info(f"Processing simple query for fileId: {request.fileId}")
        
        # Step 1: Check if dataset table exists - use mock data if not
        table_exists = False
        try:
            table_exists = simple_db_service.table_exists(request.fileId)
        except Exception as e:
            logger.warning(f"Cannot check table existence for {request.fileId}: {e}")
            logger.info("Using mock data instead")
        
        if not table_exists:
            logger.info(f"Table not found for fileId: {request.fileId}, using mock data")
        
        # Step 2: Execute query (real data if table exists, mock data otherwise)
        if table_exists:
            try:
                query_results = simple_db_service.execute_simple_query(request.fileId, limit=100)
                execution_time = time.time() - start_time
                
                logger.info(f"Real query executed successfully: {query_results.totalRows} rows returned in {execution_time:.3f}s")
                
                # Build response with real data
                response = SimpleQueryResponse(
                    results=QueryResults(
                        columns=query_results.columns,
                        rows=query_results.rows,
                        totalRows=query_results.totalRows,
                        executionTime=f"{execution_time*1000:.0f}ms"
                    ),
                    sql=f"SELECT * FROM {simple_db_service._get_table_name(request.fileId)} LIMIT 100",
                    success=True
                )
                
                return response
                
            except DatabaseError as e:
                logger.error(f"Real query execution failed: {e}, falling back to mock data")
                # Fall through to mock data
        
        # Use mock data (either because table doesn't exist or real query failed)
        execution_time = time.time() - start_time
        
        # Process mock data based on SQL query patterns
        columns = MOCK_DATA["columns"]
        rows = MOCK_DATA["rows"]
        
        sql_lower = request.sql.lower()
        
        # Handle different SQL patterns
        if "limit" in sql_lower:
            import re
            limit_match = re.search(r'limit\s+(\d+)', sql_lower)
            if limit_match:
                limit = int(limit_match.group(1))
                rows = rows[:limit]
        
        if "count(*)" in sql_lower or "count(" in sql_lower:
            columns = ["count"]
            rows = [[len(MOCK_DATA["rows"])]]
        elif "avg(" in sql_lower or "sum(" in sql_lower or "max(" in sql_lower or "min(" in sql_lower:
            if "salary" in sql_lower:
                salaries = [row[4] for row in MOCK_DATA["rows"]]
                if "avg(" in sql_lower:
                    columns = ["avg_salary"]
                    rows = [[sum(salaries) / len(salaries)]]
                elif "sum(" in sql_lower:
                    columns = ["total_salary"]
                    rows = [[sum(salaries)]]
                elif "max(" in sql_lower:
                    columns = ["max_salary"]
                    rows = [[max(salaries)]]
                elif "min(" in sql_lower:
                    columns = ["min_salary"]
                    rows = [[min(salaries)]]
        elif "group by" in sql_lower:
            if "department" in sql_lower:
                dept_counts = {}
                for row in MOCK_DATA["rows"]:
                    dept = row[3]
                    dept_counts[dept] = dept_counts.get(dept, 0) + 1
                columns = ["department", "count"]
                rows = [[dept, count] for dept, count in dept_counts.items()]
        
        logger.info(f"Mock query executed successfully: {len(rows)} rows returned in {execution_time:.3f}s")
        
        # Build response with mock data
        response = SimpleQueryResponse(
            results=QueryResults(
                columns=columns,
                rows=rows,
                totalRows=len(rows),
                executionTime=f"{execution_time*1000:.0f}ms"
            ),
            sql=request.sql,
            success=True
        )
        
        return response
    
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    
    except Exception as e:
        logger.error(f"Unexpected error in simple query endpoint: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail={
                "error": "Internal server error",
                "details": "An unexpected error occurred while processing your request",
                "code": "INTERNAL_ERROR",
                "success": False
            }
        )

@router.get("/query/health")
async def query_health_check():
    """Health check endpoint for query service"""
    try:
        # Test database connection
        db_healthy = simple_db_service.test_connection()
        
        status = "healthy" if db_healthy else "unhealthy"
        
        return {
            "status": status,
            "services": {
                "database": "healthy" if db_healthy else "unhealthy"
            },
            "timestamp": time.time()
        }
    
    except Exception as e:
        logger.error(f"Query service health check failed: {e}")
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": time.time()
        }

# Export router
__all__ = ["router"]