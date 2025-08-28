#!/usr/bin/env python3
"""
Mock Server for SQL Query Testing
A simple FastAPI server to test the frontend SQL editor functionality
"""

import logging
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Any
import time
import json

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(title="Mock SQL Query Server", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request/Response Models
class SQLRequest(BaseModel):
    fileId: str
    projectId: str
    sql: str

class QueryResults(BaseModel):
    columns: List[str]
    rows: List[List[Any]]
    totalRows: int
    executionTime: str

class SQLResponse(BaseModel):
    results: QueryResults
    sql: str
    success: bool

# Mock data for testing
MOCK_DATA = {
    "default": {
        "columns": ["id", "name", "age", "department", "salary"],
        "rows": [
            [1, "John Doe", 28, "Engineering", 75000],
            [2, "Jane Smith", 34, "Marketing", 68000],
            [3, "Bob Johnson", 45, "Engineering", 95000],
            [4, "Alice Brown", 29, "HR", 55000],
            [5, "Charlie Wilson", 38, "Engineering", 82000],
            [6, "Diana Davis", 31, "Marketing", 71000],
            [7, "Eve Anderson", 27, "Design", 63000],
            [8, "Frank Miller", 42, "Engineering", 98000],
            [9, "Grace Taylor", 35, "HR", 58000],
            [10, "Henry Clark", 33, "Marketing", 73000]
        ]
    }
}

@app.post("/api/query-sql", response_model=SQLResponse)
async def mock_query_sql(request: SQLRequest):
    """
    Mock SQL query endpoint that returns sample data
    """
    start_time = time.time()
    
    try:
        logger.info(f"Mock SQL query for fileId: {request.fileId}")
        logger.info(f"SQL: {request.sql}")
        
        # Simulate processing delay
        import asyncio
        await asyncio.sleep(0.1)
        
        # Get mock data
        mock_data = MOCK_DATA.get("default")
        
        # Simple query analysis to modify response based on SQL
        sql_lower = request.sql.lower()
        columns = mock_data["columns"]
        rows = mock_data["rows"]
        
        # Handle different SQL patterns
        if "limit" in sql_lower:
            # Extract limit value if possible
            import re
            limit_match = re.search(r'limit\s+(\d+)', sql_lower)
            if limit_match:
                limit = int(limit_match.group(1))
                rows = rows[:limit]
        
        if "count(*)" in sql_lower or "count(" in sql_lower:
            # Handle count queries
            columns = ["count"]
            rows = [[len(mock_data["rows"])]]
        
        elif "avg(" in sql_lower or "sum(" in sql_lower or "max(" in sql_lower or "min(" in sql_lower:
            # Handle aggregate queries
            if "salary" in sql_lower:
                salaries = [row[4] for row in mock_data["rows"]]
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
            # Handle group by queries (simplified)
            if "department" in sql_lower:
                dept_counts = {}
                for row in mock_data["rows"]:
                    dept = row[3]
                    dept_counts[dept] = dept_counts.get(dept, 0) + 1
                
                columns = ["department", "count"]
                rows = [[dept, count] for dept, count in dept_counts.items()]
        
        execution_time = time.time() - start_time
        
        response = SQLResponse(
            results=QueryResults(
                columns=columns,
                rows=rows,
                totalRows=len(rows),
                executionTime=f"{execution_time*1000:.0f}ms"
            ),
            sql=request.sql,
            success=True
        )
        
        logger.info(f"Mock query completed: {len(rows)} rows returned")
        return response
        
    except Exception as e:
        logger.error(f"Mock query error: {e}")
        raise HTTPException(
            status_code=500,
            detail={
                "error": "Mock query execution failed",
                "details": str(e),
                "code": "MOCK_ERROR",
                "success": False
            }
        )

@app.get("/api/query/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "Mock SQL Query Server",
        "timestamp": time.time()
    }

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Mock SQL Query Server is running",
        "endpoints": {
            "sql_query": "/api/query-sql",
            "health": "/api/query/health"
        }
    }

if __name__ == "__main__":
    import uvicorn
    print("🚀 Starting Mock SQL Query Server...")
    print("📊 Available endpoints:")
    print("   POST /api/query-sql - Execute mock SQL queries")
    print("   GET  /api/query/health - Health check")
    print("   GET  / - Server info")
    print()
    print("🎯 Test with curl:")
    print("   curl -X POST http://localhost:8000/api/query-sql \\")
    print("     -H 'Content-Type: application/json' \\")
    print("     -d '{\"fileId\":\"test\",\"projectId\":\"test\",\"sql\":\"SELECT * FROM dataset LIMIT 5\"}'")
    print()
    
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")