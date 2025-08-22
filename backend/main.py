from fastapi import FastAPI, File, UploadFile, Form, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from typing import Dict, List, Optional, Any, Union
import pandas as pd
import numpy as np
import io
import uuid
import os
import json
import sqlite3
import duckdb
from datetime import datetime, timezone
from pymongo import MongoClient
from dotenv import load_dotenv
from groq import Groq
import tempfile
import shutil
from pathlib import Path
import traceback

load_dotenv()

app = FastAPI(title="Engunity AI Data Analysis API", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Update this in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database connections
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_KEY")
mongo_uri = os.getenv("MONGO_URI", "mongodb://localhost:27017/engunity-ai")

# MongoDB setup
try:
    mongo_client = MongoClient(mongo_uri)
    db = mongo_client["engunity-ai"]
    # Test connection
    mongo_client.admin.command('ping')
    print("✅ MongoDB connected successfully")
except Exception as e:
    print(f"❌ MongoDB connection failed: {e}")
    db = None

# Groq setup for AI features
groq_client = None
if os.getenv("GROQ_API_KEY"):
    try:
        groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))
        print("✅ Groq client initialized")
    except Exception as e:
        print(f"❌ Groq client initialization failed: {e}")

# In-memory storage for datasets (with DuckDB backend)
datasets = {}
duckdb_connections = {}

def get_duckdb_connection(file_id: str):
    """Get or create DuckDB connection for a file"""
    if file_id not in duckdb_connections:
        duckdb_connections[file_id] = duckdb.connect(":memory:")
    return duckdb_connections[file_id]

def store_dataset_metadata(file_id: str, metadata: dict):
    """Store dataset metadata in MongoDB"""
    if db:
        try:
            db.datasets_metadata.insert_one({
                "_id": file_id,
                "datasetId": file_id,
                "createdAt": datetime.now(timezone.utc),
                "updatedAt": datetime.now(timezone.utc),
                **metadata
            })
        except Exception as e:
            print(f"Error storing metadata: {e}")

def update_dataset_metadata(file_id: str, updates: dict):
    """Update dataset metadata in MongoDB"""
    if db:
        try:
            db.datasets_metadata.update_one(
                {"_id": file_id},
                {"$set": {**updates, "updatedAt": datetime.now(timezone.utc)}}
            )
        except Exception as e:
            print(f"Error updating metadata: {e}")

@app.get("/")
async def root():
    return {"message": "Engunity AI Data Analysis API", "status": "running"}

@app.get("/api/health")
async def health_check():
    return {
        "status": "ok",
        "mongodb": "connected" if db else "disconnected",
        "groq": "available" if groq_client else "unavailable",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

# 1. FILE UPLOAD AND PROCESSING
@app.post("/api/process-dataset")
async def process_dataset(
    file: UploadFile = File(...),
    fileId: str = Form(...),
    projectId: str = Form(...),
    storagePath: str = Form(None)
):
    """Process uploaded dataset and extract metadata"""
    try:
        contents = await file.read()
        
        # Determine file type and read accordingly
        if file.filename.endswith('.csv'):
            df = pd.read_csv(io.BytesIO(contents))
        elif file.filename.endswith(('.xlsx', '.xls')):
            df = pd.read_excel(io.BytesIO(contents))
        elif file.filename.endswith('.json'):
            df = pd.read_json(io.BytesIO(contents))
        elif file.filename.endswith('.parquet'):
            df = pd.read_parquet(io.BytesIO(contents))
        else:
            raise HTTPException(status_code=400, detail="Unsupported file format")
        
        # Store dataset in memory and DuckDB
        datasets[fileId] = df
        conn = get_duckdb_connection(fileId)
        conn.register('dataset', df)
        
        # Generate metadata
        metadata = {
            "fileName": file.filename,
            "rows": len(df),
            "columns": len(df.columns),
            "columnNames": df.columns.tolist(),
            "columnTypes": df.dtypes.astype(str).to_dict(),
            "missingValues": df.isnull().sum().to_dict(),
            "projectId": projectId,
            "storagePath": storagePath,
            "fileSize": len(contents),
            "dataTypes": {
                "numerical": df.select_dtypes(include=[np.number]).columns.tolist(),
                "categorical": df.select_dtypes(include=['object']).columns.tolist(),
                "datetime": df.select_dtypes(include=['datetime64']).columns.tolist()
            }
        }
        
        # Store in MongoDB
        store_dataset_metadata(fileId, metadata)
        
        return JSONResponse(content={
            "fileId": fileId,
            "rows": len(df),
            "columns": len(df.columns),
            "metadata": metadata
        })
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process dataset: {str(e)}")

# 2. DATA CLEANING
@app.post("/api/clean-data")
async def clean_data(payload: dict):
    """Clean dataset based on provided options"""
    try:
        file_id = payload.get("fileId")
        options = payload.get("options", {})
        project_id = payload.get("projectId")
        
        if file_id not in datasets:
            raise HTTPException(status_code=404, detail="Dataset not found")
        
        df = datasets[file_id].copy()
        original_rows = len(df)
        original_cols = len(df.columns)
        
        # Apply cleaning operations
        if options.get("removeNulls", False):
            df = df.dropna()
        
        if options.get("dropDuplicates", False):
            df = df.drop_duplicates()
        
        if options.get("normalizeValues", False):
            # Normalize numerical columns
            numerical_cols = df.select_dtypes(include=[np.number]).columns
            for col in numerical_cols:
                if df[col].std() > 0:
                    df[col] = (df[col] - df[col].mean()) / df[col].std()
        
        if options.get("encodeCategorical", False):
            # One-hot encode categorical columns
            categorical_cols = df.select_dtypes(include=['object']).columns
            for col in categorical_cols:
                if df[col].nunique() <= 10:  # Only encode if reasonable number of categories
                    dummies = pd.get_dummies(df[col], prefix=col)
                    df = pd.concat([df.drop(col, axis=1), dummies], axis=1)
        
        # Generate new file ID for cleaned dataset
        new_file_id = str(uuid.uuid4())
        datasets[new_file_id] = df
        
        # Update DuckDB
        conn = get_duckdb_connection(new_file_id)
        conn.register('dataset', df)
        
        # Store new metadata
        metadata = {
            "fileName": f"cleaned_{datasets[file_id].attrs.get('fileName', 'dataset')}.csv",
            "rows": len(df),
            "columns": len(df.columns),
            "columnNames": df.columns.tolist(),
            "columnTypes": df.dtypes.astype(str).to_dict(),
            "projectId": project_id,
            "parentFileId": file_id,
            "cleaningOptions": options
        }
        store_dataset_metadata(new_file_id, metadata)
        
        # Log operation
        if db:
            db.data_operations.insert_one({
                "fileId": new_file_id,
                "originalFileId": file_id,
                "operation": "data_cleaning",
                "options": options,
                "timestamp": datetime.now(timezone.utc),
                "rowsChanged": original_rows - len(df),
                "columnsChanged": original_cols - len(df.columns)
            })
        
        return JSONResponse(content={
            "newFileId": new_file_id,
            "originalFileId": file_id,
            "cleaningOptions": options,
            "rowsBefore": original_rows,
            "rowsAfter": len(df),
            "columnsBefore": original_cols,
            "columnsAfter": len(df.columns),
            "processingTime": "< 1s",
            "qualityImprovement": f"{((len(df) / original_rows) * 100):.1f}%"
        })
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to clean data: {str(e)}")

# 3. DATA SUMMARY
@app.get("/api/data-summary")
async def get_data_summary(fileId: str):
    """Get comprehensive data summary"""
    try:
        if fileId not in datasets:
            raise HTTPException(status_code=404, detail="Dataset not found")
        
        df = datasets[fileId]
        
        # Calculate statistics
        total_cells = len(df) * len(df.columns)
        missing_cells = df.isnull().sum().sum()
        missing_percentage = (missing_cells / total_cells) * 100 if total_cells > 0 else 0
        
        numerical_columns = {}
        categorical_columns = {}
        
        # Analyze numerical columns
        for col in df.select_dtypes(include=[np.number]).columns:
            numerical_columns[col] = {
                "distribution": "Normal Distribution",  # Simplified for now
                "mean": float(df[col].mean()) if not df[col].isna().all() else 0,
                "std": float(df[col].std()) if not df[col].isna().all() else 0,
                "min": float(df[col].min()) if not df[col].isna().all() else 0,
                "max": float(df[col].max()) if not df[col].isna().all() else 0
            }
        
        # Analyze categorical columns
        for col in df.select_dtypes(include=['object']).columns:
            categorical_columns[col] = {
                "unique_count": int(df[col].nunique()),
                "most_frequent": str(df[col].mode().iloc[0]) if len(df[col].mode()) > 0 else "N/A"
            }
        
        summary = {
            "rows": len(df),
            "columns": len(df.columns),
            "missingValues": f"{missing_percentage:.2f}%",
            "dataQuality": f"{100 - missing_percentage:.2f}%",
            "numericalColumns": numerical_columns,
            "categoricalColumns": categorical_columns,
            "fileSize": f"{df.memory_usage(deep=True).sum() / (1024 * 1024):.2f} MB",
            "uploadDate": datetime.now().strftime("%Y-%m-%d"),
            "processingTime": "< 1s"
        }
        
        return JSONResponse(content=summary)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get data summary: {str(e)}")

# 4. CHARTS DATA
@app.get("/api/charts")
async def get_charts_data(fileId: str):
    """Generate chart data from dataset"""
    try:
        if fileId not in datasets:
            raise HTTPException(status_code=404, detail="Dataset not found")
        
        df = datasets[fileId]
        conn = get_duckdb_connection(fileId)
        
        # Revenue trend (if there are date and revenue-like columns)
        revenue_trend = []
        if len(df) > 0:
            # Create sample monthly data
            months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
            for i, month in enumerate(months):
                revenue_trend.append({
                    "month": month,
                    "revenue": int(np.random.randint(1000, 10000))  # Simulated data
                })
        
        # Sales by month (similar pattern)
        sales_by_month = []
        for i, month in enumerate(months):
            sales_by_month.append({
                "month": month,
                "sales": int(np.random.randint(500, 5000))
            })
        
        # Department distribution (if categorical data exists)
        department_distribution = []
        categorical_cols = df.select_dtypes(include=['object']).columns
        if len(categorical_cols) > 0:
            col = categorical_cols[0]
            value_counts = df[col].value_counts().head(4)
            colors = ['#7B3FE4', '#3ECF8E', '#FF8C42', '#8B5CF6']
            for i, (name, value) in enumerate(value_counts.items()):
                department_distribution.append({
                    "name": str(name),
                    "value": int(value),
                    "fill": colors[i % len(colors)]
                })
        else:
            # Default data if no categorical columns
            department_distribution = [
                {"name": "Category A", "value": 35, "fill": "#7B3FE4"},
                {"name": "Category B", "value": 25, "fill": "#3ECF8E"},
                {"name": "Category C", "value": 20, "fill": "#FF8C42"},
                {"name": "Category D", "value": 20, "fill": "#8B5CF6"}
            ]
        
        # Sales vs Revenue scatter
        sales_vs_revenue = []
        for i in range(6):
            sales_vs_revenue.append({
                "sales": int(np.random.randint(1000, 5000)),
                "revenue": int(np.random.randint(1000, 10000)),
                "customers": int(np.random.randint(200, 300))
            })
        
        charts_data = {
            "revenueTrend": revenue_trend,
            "salesByMonth": sales_by_month,
            "departmentDistribution": department_distribution,
            "salesVsRevenue": sales_vs_revenue
        }
        
        return JSONResponse(content=charts_data)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate charts: {str(e)}")

# 5. SQL QUERIES
@app.post("/api/query-sql")
async def execute_sql_query(payload: dict):
    """Execute SQL query on dataset"""
    try:
        file_id = payload.get("fileId")
        sql = payload.get("sql")
        
        if file_id not in datasets:
            raise HTTPException(status_code=404, detail="Dataset not found")
        
        conn = get_duckdb_connection(file_id)
        
        # Execute SQL query
        result = conn.execute(sql).fetchall()
        columns = [desc[0] for desc in conn.description]
        
        # Format results
        results = {
            "columns": columns,
            "rows": [dict(zip(columns, row)) for row in result],
            "totalRows": len(result),
            "executionTime": "< 1s",
            "sql": sql
        }
        
        # Log query
        if db:
            db.queries.insert_one({
                "fileId": file_id,
                "query": sql,
                "queryType": "SQL",
                "timestamp": datetime.now(timezone.utc),
                "resultCount": len(result)
            })
        
        return JSONResponse(content={"query": sql, "results": results})
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"SQL query failed: {str(e)}")

# 6. NATURAL LANGUAGE QUERIES
@app.post("/api/query-nlq")
async def execute_nlq_query(payload: dict):
    """Convert natural language to SQL and execute"""
    try:
        file_id = payload.get("fileId")
        question = payload.get("question")
        model = payload.get("model", "Groq LLaMA 3.1")
        
        if file_id not in datasets:
            raise HTTPException(status_code=404, detail="Dataset not found")
        
        df = datasets[file_id]
        
        # Get schema information
        schema_info = f"Table schema: {', '.join([f'{col} ({dtype})' for col, dtype in df.dtypes.items()])}"
        
        # Generate SQL using AI if available
        generated_sql = None
        if groq_client:
            try:
                prompt = f"""
                Convert this natural language question to SQL:
                Question: {question}
                
                {schema_info}
                
                Return only the SQL query without explanation. Use 'dataset' as the table name.
                """
                
                response = groq_client.chat.completions.create(
                    model="llama3-8b-8192",
                    messages=[{"role": "user", "content": prompt}],
                    temperature=0.1,
                    max_tokens=200
                )
                generated_sql = response.choices[0].message.content.strip()
                
                # Clean up the SQL
                if generated_sql.startswith("```sql"):
                    generated_sql = generated_sql[6:]
                if generated_sql.endswith("```"):
                    generated_sql = generated_sql[:-3]
                generated_sql = generated_sql.strip()
                
            except Exception as e:
                print(f"Groq API error: {e}")
        
        # Fallback to simple pattern matching if AI fails
        if not generated_sql:
            if "average" in question.lower() and "salary" in question.lower():
                generated_sql = "SELECT AVG(salary) as avg_salary FROM dataset"
            elif "count" in question.lower():
                generated_sql = "SELECT COUNT(*) as count FROM dataset"
            else:
                generated_sql = "SELECT * FROM dataset LIMIT 10"
        
        # Execute the generated SQL
        conn = get_duckdb_connection(file_id)
        result = conn.execute(generated_sql).fetchall()
        columns = [desc[0] for desc in conn.description]
        
        # Format results
        results = {
            "columns": columns,
            "rows": [dict(zip(columns, row)) for row in result],
            "totalRows": len(result),
            "executionTime": "< 1s",
            "sql": generated_sql
        }
        
        # Generate insight
        insight = f"Based on your question '{question}', I found {len(result)} result(s)."
        if len(result) > 0 and len(columns) > 0:
            if "avg" in columns[0].lower() or "average" in question.lower():
                insight = f"The average value is {result[0][0]:.2f}."
            elif "count" in columns[0].lower():
                insight = f"The total count is {result[0][0]}."
        
        # Log query
        if db:
            db.queries.insert_one({
                "fileId": file_id,
                "query": question,
                "generatedSQL": generated_sql,
                "queryType": "NLQ",
                "model": model,
                "timestamp": datetime.now(timezone.utc),
                "resultCount": len(result)
            })
        
        return JSONResponse(content={
            "query": question,
            "generatedSQL": generated_sql,
            "results": results,
            "insight": insight,
            "confidence": 0.8
        })
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"NLQ query failed: {str(e)}")

# 7. AI INSIGHTS
@app.get("/api/insights")
async def get_ai_insights(fileId: str, sessionId: str = None):
    """Generate AI-powered insights about the dataset"""
    try:
        if fileId not in datasets:
            raise HTTPException(status_code=404, detail="Dataset not found")
        
        df = datasets[fileId]
        insights = []
        
        # Generate basic statistical insights
        numerical_cols = df.select_dtypes(include=[np.number]).columns
        
        if len(numerical_cols) >= 2:
            # Correlation insights
            corr_matrix = df[numerical_cols].corr()
            max_corr = 0
            max_pair = None
            
            for i in range(len(corr_matrix.columns)):
                for j in range(i+1, len(corr_matrix.columns)):
                    corr_val = abs(corr_matrix.iloc[i, j])
                    if corr_val > max_corr:
                        max_corr = corr_val
                        max_pair = (corr_matrix.columns[i], corr_matrix.columns[j])
            
            if max_pair and max_corr > 0.5:
                insights.append({
                    "type": "correlation",
                    "title": "Strong Correlation Detected",
                    "description": f"Strong correlation ({max_corr:.2f}) found between {max_pair[0]} and {max_pair[1]}",
                    "confidence": 0.9,
                    "data": {"correlation": max_corr, "variables": max_pair},
                    "timestamp": datetime.now(timezone.utc).isoformat()
                })
        
        # Missing values insight
        missing_percentage = (df.isnull().sum().sum() / (len(df) * len(df.columns))) * 100
        if missing_percentage > 10:
            insights.append({
                "type": "anomaly",
                "title": "High Missing Values",
                "description": f"Dataset has {missing_percentage:.1f}% missing values. Consider data cleaning.",
                "confidence": 0.95,
                "data": {"missing_percentage": missing_percentage},
                "timestamp": datetime.now(timezone.utc).isoformat()
            })
        
        # Data quality insight
        if missing_percentage < 5:
            insights.append({
                "type": "pattern",
                "title": "High Data Quality",
                "description": f"Dataset shows excellent quality with only {missing_percentage:.1f}% missing values.",
                "confidence": 0.9,
                "data": {"quality_score": 100 - missing_percentage},
                "timestamp": datetime.now(timezone.utc).isoformat()
            })
        
        # Store insights in MongoDB
        if db and insights:
            db.insights.insert_one({
                "fileId": fileId,
                "sessionId": sessionId,
                "insights": insights,
                "generatedAt": datetime.now(timezone.utc)
            })
        
        return JSONResponse(content={"insights": insights})
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate insights: {str(e)}")

# 8. SESSION MANAGEMENT
@app.post("/api/save-session")
async def save_analysis_session(payload: dict):
    """Save or update analysis session"""
    try:
        session_id = payload.get("sessionId")
        
        if not session_id:
            # Create new session
            session_id = str(uuid.uuid4())
            payload["sessionId"] = session_id
            payload["createdAt"] = datetime.now(timezone.utc).isoformat()
        
        payload["updatedAt"] = datetime.now(timezone.utc).isoformat()
        
        if db:
            db.analysis_sessions.replace_one(
                {"sessionId": session_id},
                payload,
                upsert=True
            )
        
        return JSONResponse(content=payload)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save session: {str(e)}")

# 9. DATA EXPORT
@app.get("/api/export")
async def export_dataset(fileId: str, format: str = "csv"):
    """Export dataset in specified format"""
    try:
        if fileId not in datasets:
            raise HTTPException(status_code=404, detail="Dataset not found")
        
        df = datasets[fileId]
        
        # Create temporary file
        temp_dir = tempfile.mkdtemp()
        temp_file = os.path.join(temp_dir, f"dataset_{fileId}.{format}")
        
        if format == "csv":
            df.to_csv(temp_file, index=False)
            media_type = "text/csv"
        elif format == "xlsx":
            df.to_excel(temp_file, index=False)
            media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        elif format == "json":
            df.to_json(temp_file, orient="records", indent=2)
            media_type = "application/json"
        else:
            raise HTTPException(status_code=400, detail="Unsupported format")
        
        # Return file as streaming response
        def cleanup():
            try:
                shutil.rmtree(temp_dir)
            except:
                pass
        
        return StreamingResponse(
            io.BytesIO(open(temp_file, 'rb').read()),
            media_type=media_type,
            headers={"Content-Disposition": f"attachment; filename=dataset_{fileId}.{format}"},
            background=BackgroundTasks().add_task(cleanup)
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Export failed: {str(e)}")

# Error handlers
@app.exception_handler(500)
async def internal_error_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error", "detail": str(exc)}
    )

@app.exception_handler(404)
async def not_found_handler(request, exc):
    return JSONResponse(
        status_code=404,
        content={"error": "Not found", "detail": str(exc)}
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)