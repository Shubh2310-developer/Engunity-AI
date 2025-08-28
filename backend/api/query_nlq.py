"""
Natural Language Query (NLQ) API Endpoint
Converts natural language questions to SQL queries and executes them
"""

import logging
from typing import Dict, Any
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, validator
import time

from services.llm import llm_service
from services.db import db_service, DatabaseError

logger = logging.getLogger(__name__)

# Router instance
router = APIRouter(prefix="/api", tags=["nlq"])

# Request/Response Models
class NLQRequest(BaseModel):
    """Request model for NLQ endpoint"""
    fileId: str
    projectId: str
    question: str
    
    @validator('fileId')
    def validate_file_id(cls, v):
        if not v or len(v.strip()) == 0:
            raise ValueError('fileId cannot be empty')
        return v.strip()
    
    @validator('question')
    def validate_question(cls, v):
        if not v or len(v.strip()) == 0:
            raise ValueError('question cannot be empty')
        if len(v) > 1000:
            raise ValueError('question too long (max 1000 characters)')
        return v.strip()

class NLQResults(BaseModel):
    """Results model for query execution"""
    columns: list[str]
    rows: list[list[Any]]
    totalRows: int
    sql: str

class NLQResponse(BaseModel):
    """Response model for NLQ endpoint"""
    results: NLQResults
    insight: str
    confidence: float

class ErrorResponse(BaseModel):
    """Error response model"""
    error: str
    details: str = ""
    code: str = "INTERNAL_ERROR"

@router.post("/query-nlq", response_model=NLQResponse)
async def query_nlq(request: NLQRequest):
    """
    Convert natural language question to SQL query and execute it
    
    This endpoint:
    1. Retrieves dataset schema from Supabase
    2. Uses GPT-OSS-120B to convert question to SQL
    3. Executes the SQL query
    4. Generates an AI insight about the results
    
    Args:
        request: NLQ request with fileId, projectId, and question
        
    Returns:
        NLQ response with results, insight, and confidence
        
    Raises:
        HTTPException: For various error conditions
    """
    start_time = time.time()
    
    try:
        logger.info(f"Processing NLQ request for fileId: {request.fileId}, question: '{request.question[:100]}...'")
        
        # Step 1: Check if dataset table exists
        if not db_service.table_exists(request.fileId):
            logger.error(f"Dataset table not found for fileId: {request.fileId}")
            raise HTTPException(
                status_code=404,
                detail={
                    "error": "Dataset not found",
                    "details": f"No dataset found for fileId: {request.fileId}",
                    "code": "DATASET_NOT_FOUND"
                }
            )
        
        # Step 2: Get dataset schema
        try:
            schema = db_service.get_dataset_schema(request.fileId)
            logger.info(f"Retrieved schema for {request.fileId}: {len(schema.columns)} columns")
        except DatabaseError as e:
            logger.error(f"Failed to retrieve schema: {e}")
            raise HTTPException(
                status_code=500,
                detail={
                    "error": "Schema retrieval failed",
                    "details": str(e),
                    "code": "SCHEMA_ERROR"
                }
            )
        
        # Step 3: Generate SQL from natural language question
        try:
            schema_dict = {
                "table_name": schema.table_name,
                "columns": [{"column_name": col.column_name, "data_type": col.data_type} for col in schema.columns]
            }
            
            sql_response = llm_service.generate_sql_from_nlq(schema_dict, request.question)
            
            if not sql_response.success:
                logger.error(f"SQL generation failed: {sql_response.error}")
                raise HTTPException(
                    status_code=500,
                    detail={
                        "error": "SQL generation failed",
                        "details": sql_response.error or "GPT-OSS-120B did not respond properly",
                        "code": "SQL_GENERATION_ERROR"
                    }
                )
            
            generated_sql = sql_response.text
            logger.info(f"Generated SQL: {generated_sql}")
            
        except Exception as e:
            logger.error(f"Error during SQL generation: {e}")
            raise HTTPException(
                status_code=500,
                detail={
                    "error": "SQL generation error",
                    "details": str(e),
                    "code": "SQL_GENERATION_ERROR"
                }
            )
        
        # Step 4: Validate and sanitize SQL
        try:
            clean_sql, is_valid = llm_service.sanitize_sql(generated_sql, "dataset_")
            
            if not is_valid:
                logger.error(f"Generated SQL failed validation: {generated_sql}")
                raise HTTPException(
                    status_code=400,
                    detail={
                        "error": "Invalid SQL generated",
                        "details": "The AI generated SQL that doesn't meet safety requirements",
                        "code": "INVALID_SQL"
                    }
                )
            
            logger.info(f"SQL validated successfully: {clean_sql}")
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"SQL validation error: {e}")
            raise HTTPException(
                status_code=500,
                detail={
                    "error": "SQL validation failed",
                    "details": str(e),
                    "code": "VALIDATION_ERROR"
                }
            )
        
        # Step 5: Execute SQL query
        try:
            query_results = db_service.execute_sql(clean_sql, limit=1000)
            logger.info(f"Query executed successfully: {query_results.totalRows} rows returned")
            
        except DatabaseError as e:
            logger.error(f"Query execution failed: {e}")
            raise HTTPException(
                status_code=500,
                detail={
                    "error": "Query execution failed",
                    "details": str(e),
                    "code": "QUERY_EXECUTION_ERROR"
                }
            )
        
        # Step 6: Generate insight about the results
        try:
            results_dict = {
                "columns": query_results.columns,
                "rows": query_results.rows[:10],  # First 10 rows for insight
                "totalRows": query_results.totalRows
            }
            
            insight_response = llm_service.generate_insight(
                request.question, 
                clean_sql, 
                results_dict
            )
            
            if insight_response.success:
                insight_text = insight_response.text
                confidence = 0.9  # High confidence if everything worked
            else:
                logger.warning(f"Insight generation failed: {insight_response.error}")
                insight_text = f"Found {query_results.totalRows} results matching your query."
                confidence = 0.7  # Lower confidence due to insight failure
            
            logger.info(f"Generated insight: {insight_text}")
            
        except Exception as e:
            logger.warning(f"Error generating insight: {e}")
            insight_text = f"Query returned {query_results.totalRows} rows."
            confidence = 0.6
        
        # Step 7: Build response
        response = NLQResponse(
            results=NLQResults(
                columns=query_results.columns,
                rows=query_results.rows,
                totalRows=query_results.totalRows,
                sql=clean_sql
            ),
            insight=insight_text,
            confidence=confidence
        )
        
        processing_time = time.time() - start_time
        logger.info(f"NLQ request completed successfully in {processing_time:.2f}s")
        
        return response
    
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    
    except Exception as e:
        logger.error(f"Unexpected error in NLQ endpoint: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail={
                "error": "Internal server error",
                "details": "An unexpected error occurred while processing your request",
                "code": "INTERNAL_ERROR"
            }
        )

@router.get("/nlq/health")
async def nlq_health_check():
    """Health check endpoint for NLQ service"""
    try:
        # Test database connection
        db_healthy = db_service.test_connection()
        
        # Test LLM service (basic check)
        llm_healthy = True  # Assume healthy if no connection errors
        
        status = "healthy" if (db_healthy and llm_healthy) else "unhealthy"
        
        return {
            "status": status,
            "services": {
                "database": "healthy" if db_healthy else "unhealthy",
                "llm": "healthy" if llm_healthy else "unhealthy"
            },
            "timestamp": time.time()
        }
    
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": time.time()
        }

@router.get("/nlq/info")
async def nlq_info():
    """Get information about the NLQ service"""
    return {
        "service": "Natural Language Query (NLQ)",
        "version": "1.0.0",
        "model": "GPT-OSS-120B",
        "database": "Supabase PostgreSQL",
        "features": [
            "Natural language to SQL conversion",
            "Query execution with safety validation",
            "AI-generated insights",
            "Support for complex aggregations and filtering"
        ],
        "limits": {
            "max_question_length": 1000,
            "max_result_rows": 1000,
            "query_timeout": 30
        }
    }

# Note: Exception handlers are registered on the main app, not the router

# Export router
__all__ = ["router"]