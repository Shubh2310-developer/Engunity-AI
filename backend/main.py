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
    if db is not None:
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
    if db is not None:
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
        "mongodb": "connected" if db is not None else "disconnected",
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
        if db is not None:
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

# 2b. APPLY TRANSFORMATIONS
@app.post("/api/apply-transformations")
async def apply_transformations(request_data: dict):
    """Apply custom transformations to dataset"""
    try:
        file_id = request_data.get('fileId')
        rules = request_data.get('rules', [])
        project_id = request_data.get('projectId', '1')
        
        if not file_id or file_id not in datasets:
            raise HTTPException(status_code=404, detail="Dataset not found")
        
        df = datasets[file_id].copy()
        applied_transformations = []
        
        for rule in rules:
            try:
                rule_type = rule.get('type')
                column = rule.get('column')
                
                if rule_type == 'rename' and 'newName' in rule:
                    df = df.rename(columns={column: rule['newName']})
                    applied_transformations.append(f"Renamed column '{column}' to '{rule['newName']}'")
                
                elif rule_type == 'cast' and 'dataType' in rule:
                    if rule['dataType'] == 'numeric':
                        df[column] = pd.to_numeric(df[column], errors='coerce')
                    elif rule['dataType'] == 'datetime':
                        df[column] = pd.to_datetime(df[column], errors='coerce')
                    elif rule['dataType'] == 'string':
                        df[column] = df[column].astype(str)
                    applied_transformations.append(f"Cast column '{column}' to {rule['dataType']}")
                
                elif rule_type == 'replace' and 'find' in rule and 'replace' in rule:
                    df[column] = df[column].replace(rule['find'], rule['replace'])
                    applied_transformations.append(f"Replaced '{rule['find']}' with '{rule['replace']}' in column '{column}'")
                
                elif rule_type == 'regex' and 'pattern' in rule and 'replacement' in rule:
                    df[column] = df[column].str.replace(rule['pattern'], rule['replacement'], regex=True)
                    applied_transformations.append(f"Applied regex transformation to column '{column}'")
                
                elif rule_type == 'calculate' and 'expression' in rule:
                    # Simple calculation support (for basic expressions)
                    try:
                        df[column] = df.eval(rule['expression'])
                        applied_transformations.append(f"Applied calculation '{rule['expression']}' to column '{column}'")
                    except:
                        applied_transformations.append(f"Failed to apply calculation to column '{column}'")
            
            except Exception as rule_error:
                applied_transformations.append(f"Failed to apply rule to column '{column}': {str(rule_error)}")
        
        # Create new file ID for transformed dataset
        new_file_id = f"{file_id}_transformed_{uuid.uuid4().hex[:8]}"
        datasets[new_file_id] = df
        
        # Store in DuckDB
        conn = get_duckdb_connection(new_file_id)
        conn.register('dataset', df)
        
        # Store metadata
        metadata = {
            "originalFileId": file_id,
            "projectId": project_id,
            "transformations": applied_transformations,
            "rows": len(df),
            "columns": len(df.columns),
            "dataTypes": df.dtypes.to_dict()
        }
        store_dataset_metadata(new_file_id, metadata)
        
        return JSONResponse(content={
            "success": True,
            "fileId": new_file_id,
            "rowsAffected": len(df),
            "transformationsApplied": applied_transformations,
            "message": f"Applied {len(applied_transformations)} transformations successfully"
        })
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to apply transformations: {str(e)}")

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
    """Generate chart data based on actual dataset"""
    try:
        if fileId not in datasets:
            raise HTTPException(status_code=404, detail="Dataset not found")
        
        df = datasets[fileId]
        conn = get_duckdb_connection(fileId)
        
        # Get numerical and categorical columns
        numerical_cols = df.select_dtypes(include=[np.number]).columns.tolist()
        categorical_cols = df.select_dtypes(include=['object']).columns.tolist()
        
        charts_data = {}
        
        # 1. Time series / Trend chart - use actual data values
        if len(numerical_cols) >= 1:
            col_name = numerical_cols[0]
            trend_data = []
            
            # Use actual data values from the dataset
            values = df[col_name].dropna()
            for idx, value in enumerate(values[:6]):
                trend_data.append({
                    "month": f"Row {idx+1}",
                    "revenue": float(value)
                })
            
            # If we need more points and have more data, add them
            if len(trend_data) < 6 and len(values) > 6:
                # Take evenly spaced points from the dataset
                indices = np.linspace(0, len(values)-1, 6, dtype=int)
                trend_data = []
                for i, idx in enumerate(indices):
                    trend_data.append({
                        "month": f"Point {i+1}",
                        "revenue": float(values.iloc[idx])
                    })
            
            charts_data["revenueTrend"] = trend_data
        
        # 2. Bar chart from second numerical column (if exists)
        if len(numerical_cols) >= 2:
            col_name = numerical_cols[1]
            bar_data = []
            
            # Use actual data values from the second numerical column
            values = df[col_name].dropna()
            for idx, value in enumerate(values[:6]):
                bar_data.append({
                    "month": f"Row {idx+1}",
                    "sales": float(value)
                })
                        
            charts_data["salesByMonth"] = bar_data
        elif len(numerical_cols) == 1:
            # Use same column but display as bar chart
            col_name = numerical_cols[0]
            bar_data = []
            values = df[col_name].dropna()[:6]
            for idx, value in enumerate(values):
                bar_data.append({
                    "month": f"Row {idx+1}",
                    "sales": float(value)
                })
            charts_data["salesByMonth"] = bar_data
        
        # 3. Pie chart from categorical data
        if len(categorical_cols) > 0:
            col = categorical_cols[0]
            value_counts = df[col].value_counts().head(5)
            colors = ['#7B3FE4', '#3ECF8E', '#FF8C42', '#8B5CF6', '#F59E0B']
            
            pie_data = []
            for i, (name, value) in enumerate(value_counts.items()):
                pie_data.append({
                    "name": str(name),
                    "value": int(value),
                    "fill": colors[i % len(colors)]
                })
            
            charts_data["departmentDistribution"] = pie_data
        else:
            # If no categorical data, create distribution from numerical data
            if len(numerical_cols) > 0:
                col_name = numerical_cols[0]
                values = df[col_name].dropna()
                # Create bins for distribution
                quartiles = values.quantile([0.25, 0.5, 0.75]).tolist()
                bins = ['Q1', 'Q2', 'Q3', 'Q4']
                colors = ['#7B3FE4', '#3ECF8E', '#FF8C42', '#8B5CF6']
                
                pie_data = []
                prev_q = values.min()
                for i, q in enumerate(quartiles + [values.max()]):
                    if i < len(bins):
                        count = len(values[(values >= prev_q) & (values <= q)])
                        pie_data.append({
                            "name": bins[i],
                            "value": count,
                            "fill": colors[i]
                        })
                        prev_q = q
                
                charts_data["departmentDistribution"] = pie_data
        
        # 4. Scatter plot from two numerical columns
        if len(numerical_cols) >= 2:
            col1, col2 = numerical_cols[0], numerical_cols[1]
            scatter_data = []
            
            # Use actual data for scatter plot
            sample_df = df[[col1, col2]].dropna().head(8)
            
            for _, row in sample_df.iterrows():
                # Use a third numerical column if available, otherwise derive from first two
                customers_val = 250  # default
                if len(numerical_cols) >= 3:
                    third_col = numerical_cols[2]
                    if pd.notna(row.get(third_col)):
                        customers_val = int(row[third_col] * 50)  # Scale the third column
                
                scatter_data.append({
                    "sales": float(row[col1]),
                    "revenue": float(row[col2]),
                    "customers": customers_val
                })
            
            charts_data["salesVsRevenue"] = scatter_data
        elif len(numerical_cols) == 1:
            # Create scatter using index vs value
            col_name = numerical_cols[0]
            scatter_data = []
            
            values = df[col_name].dropna()
            for idx, value in enumerate(values[:8]):
                scatter_data.append({
                    "sales": float(idx + 1),  # Index as x-axis
                    "revenue": float(value),   # Actual value as y-axis
                    "customers": int(value) if abs(int(value)) < 1000 else int(value/100)  # Scaled value
                })
            
            charts_data["salesVsRevenue"] = scatter_data
        
        # Add default empty arrays if no data available
        if "revenueTrend" not in charts_data:
            charts_data["revenueTrend"] = []
        if "salesByMonth" not in charts_data:
            charts_data["salesByMonth"] = []
        if "departmentDistribution" not in charts_data:
            charts_data["departmentDistribution"] = []
        if "salesVsRevenue" not in charts_data:
            charts_data["salesVsRevenue"] = []
        
        return JSONResponse(content=charts_data)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate charts: {str(e)}")

@app.post("/api/custom-chart")
async def generate_custom_chart(payload: dict):
    """Generate custom chart data based on user selections"""
    try:
        file_id = payload.get("fileId")
        chart_type = payload.get("type", "bar")
        x_axis = payload.get("xAxis")
        y_axis = payload.get("yAxis")
        title = payload.get("title", "Custom Chart")
        
        if file_id not in datasets:
            raise HTTPException(status_code=404, detail="Dataset not found")
        
        if not x_axis or not y_axis:
            raise HTTPException(status_code=400, detail="Both xAxis and yAxis are required")
        
        df = datasets[file_id]
        
        # Check if columns exist
        if x_axis not in df.columns or y_axis not in df.columns:
            raise HTTPException(status_code=400, detail="One or more columns not found in dataset")
        
        chart_data = []
        
        if chart_type == "bar":
            # For bar chart, group by x_axis and aggregate y_axis
            if df[x_axis].dtype == 'object':  # Categorical x-axis
                grouped = df.groupby(x_axis)[y_axis].sum().reset_index()
                for _, row in grouped.iterrows():
                    chart_data.append({
                        "name": str(row[x_axis]),
                        "value": float(row[y_axis])
                    })
            else:  # Numerical x-axis
                # Use actual values for numerical x-axis
                sample_data = df[[x_axis, y_axis]].dropna().head(10)
                for _, row in sample_data.iterrows():
                    chart_data.append({
                        "name": str(row[x_axis]),
                        "value": float(row[y_axis])
                    })
        
        elif chart_type == "line":
            # Line chart - use sequential data
            sample_data = df[[x_axis, y_axis]].dropna().head(20)
            for i, (_, row) in enumerate(sample_data.iterrows()):
                chart_data.append({
                    "x": str(row[x_axis]),
                    "y": float(row[y_axis])
                })
        
        elif chart_type == "pie":
            # Pie chart - group by x_axis
            if df[x_axis].dtype == 'object':  # Categorical
                value_counts = df[x_axis].value_counts().head(8)
                colors = ['#7B3FE4', '#3ECF8E', '#FF8C42', '#8B5CF6', '#F59E0B', '#EC4899', '#10B981', '#F97316']
                for i, (name, count) in enumerate(value_counts.items()):
                    chart_data.append({
                        "name": str(name),
                        "value": int(count),
                        "fill": colors[i % len(colors)]
                    })
            else:  # For numerical data, create ranges
                values = df[x_axis].dropna()
                quartiles = values.quantile([0.25, 0.5, 0.75, 1.0])
                bins = ['Q1', 'Q2', 'Q3', 'Q4']
                colors = ['#7B3FE4', '#3ECF8E', '#FF8C42', '#8B5CF6']
                
                prev_q = values.min()
                for i, q in enumerate(quartiles):
                    if i < len(bins):
                        count = len(values[(values >= prev_q) & (values <= q)])
                        chart_data.append({
                            "name": bins[i],
                            "value": count,
                            "fill": colors[i]
                        })
                        prev_q = q
        
        elif chart_type == "scatter":
            # Scatter plot
            sample_data = df[[x_axis, y_axis]].dropna().head(50)
            for _, row in sample_data.iterrows():
                chart_data.append({
                    "x": float(row[x_axis]) if pd.api.types.is_numeric_dtype(df[x_axis]) else hash(str(row[x_axis])) % 100,
                    "y": float(row[y_axis])
                })
        
        elif chart_type == "area":
            # Area chart - similar to line chart
            sample_data = df[[x_axis, y_axis]].dropna().head(20)
            for i, (_, row) in enumerate(sample_data.iterrows()):
                chart_data.append({
                    "x": str(row[x_axis]),
                    "y": float(row[y_axis])
                })
        
        elif chart_type in ["column", "donut"]:
            # Column chart is similar to bar, donut similar to pie
            if df[x_axis].dtype == 'object':  # Categorical x-axis
                grouped = df.groupby(x_axis)[y_axis].sum().reset_index()
                for _, row in grouped.iterrows():
                    chart_data.append({
                        "name": str(row[x_axis]),
                        "value": float(row[y_axis])
                    })
            else:  # Numerical x-axis
                sample_data = df[[x_axis, y_axis]].dropna().head(10)
                for _, row in sample_data.iterrows():
                    chart_data.append({
                        "name": str(row[x_axis]),
                        "value": float(row[y_axis])
                    })
        
        elif chart_type == "heatmap":
            # Simple heatmap using categorical data
            if df[x_axis].dtype == 'object':
                value_counts = df[x_axis].value_counts().head(25)
                for name, count in value_counts.items():
                    chart_data.append({
                        "name": str(name),
                        "value": int(count)
                    })
            else:
                # For numerical data, create bins
                sample_data = df[[x_axis, y_axis]].dropna().head(25)
                for i, (_, row) in enumerate(sample_data.iterrows()):
                    chart_data.append({
                        "name": f"Item {i+1}",
                        "value": float(row[y_axis])
                    })
        
        result = {
            "type": chart_type,
            "title": title,
            "xAxis": x_axis,
            "yAxis": y_axis,
            "data": chart_data
        }
        
        return JSONResponse(content=result)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate custom chart: {str(e)}")

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
        if db is not None:
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
        if db is not None:
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
        if db is not None and insights:
            db.insights.insert_one({
                "fileId": fileId,
                "sessionId": sessionId,
                "insights": insights,
                "generatedAt": datetime.now(timezone.utc)
            })
        
        return JSONResponse(content={"insights": insights})
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate insights: {str(e)}")

# 8. DATA PREVIEW
@app.get("/api/data-preview")
async def get_data_preview(fileId: str, page: int = 1, pageSize: int = 50):
    """Get paginated preview of dataset"""
    try:
        if fileId not in datasets:
            raise HTTPException(status_code=404, detail="Dataset not found")
        
        df = datasets[fileId]
        
        # Calculate pagination
        start_idx = (page - 1) * pageSize
        end_idx = start_idx + pageSize
        
        # Get page data
        page_data = df.iloc[start_idx:end_idx]
        
        # Convert to records for JSON serialization
        records = []
        for idx, row in page_data.iterrows():
            record = {"_index": int(idx)}
            for col in df.columns:
                value = row[col]
                # Handle different data types for JSON serialization
                if pd.isna(value):
                    record[col] = None
                elif isinstance(value, (np.integer, np.floating)):
                    record[col] = float(value) if not np.isnan(value) else None
                elif isinstance(value, np.bool_):
                    record[col] = bool(value)
                else:
                    record[col] = str(value)
            records.append(record)
        
        return JSONResponse(content={
            "data": records,
            "pagination": {
                "page": page,
                "pageSize": pageSize,
                "total": len(df),
                "totalPages": (len(df) + pageSize - 1) // pageSize,
                "hasNext": end_idx < len(df),
                "hasPrev": page > 1
            }
        })
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get data preview: {str(e)}")

# 9. COLUMN METADATA
@app.get("/api/column-metadata")
async def get_column_metadata(fileId: str):
    """Get detailed column metadata"""
    try:
        if fileId not in datasets:
            raise HTTPException(status_code=404, detail="Dataset not found")
        
        df = datasets[fileId]
        metadata = {}
        
        for col in df.columns:
            col_data = df[col]
            col_info = {
                "name": col,
                "dtype": str(col_data.dtype),
                "nullCount": int(col_data.isnull().sum()),
                "nullPercent": float(col_data.isnull().sum() / len(df) * 100),
                "uniqueCount": int(col_data.nunique()),
                "sampleValues": col_data.dropna().head(5).tolist()
            }
            
            # Add type-specific statistics
            if pd.api.types.is_numeric_dtype(col_data):
                col_info.update({
                    "min": float(col_data.min()) if not col_data.empty else None,
                    "max": float(col_data.max()) if not col_data.empty else None,
                    "mean": float(col_data.mean()) if not col_data.empty else None,
                    "std": float(col_data.std()) if not col_data.empty else None,
                    "median": float(col_data.median()) if not col_data.empty else None
                })
            elif pd.api.types.is_categorical_dtype(col_data) or col_data.dtype == 'object':
                value_counts = col_data.value_counts().head(10)
                col_info.update({
                    "topValues": [{"value": str(k), "count": int(v)} for k, v in value_counts.items()]
                })
            
            metadata[col] = col_info
        
        return JSONResponse(content={"columns": metadata})
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get column metadata: {str(e)}")

# 10. CORRELATION ANALYSIS
@app.get("/api/correlation")
async def get_correlation_data(fileId: str):
    """Get correlation matrix for numerical columns"""
    try:
        if fileId not in datasets:
            raise HTTPException(status_code=404, detail="Dataset not found")
        
        df = datasets[fileId]
        
        # Get only numerical columns
        numeric_df = df.select_dtypes(include=[np.number])
        
        if numeric_df.empty:
            return JSONResponse(content={"correlations": [], "message": "No numerical columns found for correlation analysis"})
        
        # Calculate correlation matrix
        correlation_matrix = numeric_df.corr()
        
        # Convert to format suitable for frontend
        correlations = []
        for i, col1 in enumerate(correlation_matrix.columns):
            for j, col2 in enumerate(correlation_matrix.columns):
                correlation_value = correlation_matrix.iloc[i, j]
                if not pd.isna(correlation_value):
                    correlations.append({
                        "x": col1,
                        "y": col2,
                        "correlation": float(correlation_value),
                        "absCorrelation": float(abs(correlation_value))
                    })
        
        # Get strong correlations (> 0.5 and != 1.0)
        strong_correlations = [
            corr for corr in correlations 
            if corr['absCorrelation'] > 0.5 and corr['absCorrelation'] < 1.0
        ]
        
        return JSONResponse(content={
            "correlations": correlations,
            "strongCorrelations": strong_correlations,
            "columnNames": correlation_matrix.columns.tolist()
        })
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to calculate correlations: {str(e)}")

# 11. SESSION MANAGEMENT
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
        
        if db is not None:
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

# ADVANCED DATA ANALYSIS FEATURES

# 12. VERSION HISTORY & UNDO/REDO
@app.get("/api/version-history")
async def get_version_history(fileId: str):
    """Get version history for a dataset"""
    try:
        versions = []
        if db is not None:
            cursor = db.data_operations.find(
                {"$or": [{"fileId": fileId}, {"originalFileId": fileId}]},
                sort=[("timestamp", -1)]
            )
            for doc in cursor:
                versions.append({
                    "id": str(doc["_id"]),
                    "name": f"Version {len(versions) + 1}",
                    "timestamp": doc["timestamp"].isoformat(),
                    "changes": [doc["operation"]],
                    "fileId": doc["fileId"],
                    "rowsAffected": doc.get("rowsChanged", 0)
                })
        
        return JSONResponse(content={"versions": versions})
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get version history: {str(e)}")

# 13. ANOMALY DETECTION
@app.get("/api/detect-anomalies")
async def detect_anomalies(fileId: str, method: str = "iqr"):
    """Detect anomalies in dataset"""
    try:
        if fileId not in datasets:
            raise HTTPException(status_code=404, detail="Dataset not found")
        
        df = datasets[fileId]
        anomalies = []
        
        numerical_cols = df.select_dtypes(include=[np.number]).columns
        
        for col in numerical_cols:
            if method == "iqr":
                Q1 = df[col].quantile(0.25)
                Q3 = df[col].quantile(0.75)
                IQR = Q3 - Q1
                lower_bound = Q1 - 1.5 * IQR
                upper_bound = Q3 + 1.5 * IQR
                
                outliers = df[(df[col] < lower_bound) | (df[col] > upper_bound)]
                
                for idx, row in outliers.iterrows():
                    anomalies.append({
                        "column": col,
                        "row_index": int(idx),
                        "value": float(row[col]),
                        "severity": "high" if abs(row[col] - df[col].mean()) > 2 * df[col].std() else "medium",
                        "method": "IQR",
                        "bounds": {"lower": float(lower_bound), "upper": float(upper_bound)}
                    })
        
        return JSONResponse(content={
            "anomalies": anomalies[:50],  # Limit to first 50 anomalies
            "total_anomalies": len(anomalies),
            "method": method,
            "columns_analyzed": list(numerical_cols)
        })
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to detect anomalies: {str(e)}")

# 14. ADVANCED CHART RECOMMENDATIONS
@app.get("/api/chart-recommendations")
async def get_chart_recommendations(fileId: str):
    """Get AI-powered chart recommendations"""
    try:
        if fileId not in datasets:
            raise HTTPException(status_code=404, detail="Dataset not found")
        
        df = datasets[fileId]
        recommendations = []
        
        numerical_cols = df.select_dtypes(include=[np.number]).columns.tolist()
        categorical_cols = df.select_dtypes(include=['object']).columns.tolist()
        
        # Recommend charts based on data types
        if len(numerical_cols) >= 2:
            recommendations.append({
                "type": "scatter",
                "title": f"Scatter Plot: {numerical_cols[0]} vs {numerical_cols[1]}",
                "xAxis": numerical_cols[0],
                "yAxis": numerical_cols[1],
                "reason": "Two numerical columns detected - ideal for correlation analysis",
                "confidence": 0.9
            })
            
            recommendations.append({
                "type": "line",
                "title": f"Trend Analysis: {numerical_cols[0]}",
                "xAxis": "index",
                "yAxis": numerical_cols[0],
                "reason": "Time series analysis or trend visualization",
                "confidence": 0.8
            })
        
        if len(categorical_cols) >= 1 and len(numerical_cols) >= 1:
            recommendations.append({
                "type": "bar",
                "title": f"{categorical_cols[0]} by {numerical_cols[0]}",
                "xAxis": categorical_cols[0],
                "yAxis": numerical_cols[0],
                "reason": "Categorical vs numerical data - perfect for comparison",
                "confidence": 0.95
            })
        
        if len(categorical_cols) >= 1:
            recommendations.append({
                "type": "pie",
                "title": f"Distribution of {categorical_cols[0]}",
                "xAxis": categorical_cols[0],
                "yAxis": "count",
                "reason": "Categorical data ideal for proportion visualization",
                "confidence": 0.85
            })
        
        if len(numerical_cols) >= 3:
            recommendations.append({
                "type": "heatmap",
                "title": "Correlation Heatmap",
                "xAxis": "variables",
                "yAxis": "variables",
                "reason": "Multiple numerical variables - correlation patterns analysis",
                "confidence": 0.8
            })
        
        return JSONResponse(content={"recommendations": recommendations})
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get chart recommendations: {str(e)}")

# 15. ENHANCED INSIGHTS WITH EXPLANATIONS
@app.get("/api/enhanced-insights")
async def get_enhanced_insights(fileId: str):
    """Get enhanced AI insights with explanations"""
    try:
        if fileId not in datasets:
            raise HTTPException(status_code=404, detail="Dataset not found")
        
        df = datasets[fileId]
        insights = []
        
        # Data quality insights
        missing_pct = (df.isnull().sum().sum() / (len(df) * len(df.columns))) * 100
        insights.append({
            "type": "data_quality",
            "title": "Data Quality Assessment",
            "description": f"Dataset has {missing_pct:.2f}% missing values",
            "explanation": "Data quality is measured by completeness. Lower missing values indicate higher quality data suitable for analysis.",
            "recommendation": "Consider data cleaning if missing values exceed 10%" if missing_pct > 10 else "Data quality is good for analysis",
            "confidence": 0.95,
            "data": {"missing_percentage": missing_pct, "total_cells": len(df) * len(df.columns)}
        })
        
        # Distribution insights
        numerical_cols = df.select_dtypes(include=[np.number]).columns
        for col in numerical_cols[:3]:  # Limit to first 3 columns
            skewness = df[col].skew()
            if abs(skewness) > 1:
                insights.append({
                    "type": "distribution",
                    "title": f"Skewed Distribution in {col}",
                    "description": f"Column '{col}' shows {'positive' if skewness > 0 else 'negative'} skew ({skewness:.2f})",
                    "explanation": "Skewness measures asymmetry in data distribution. Values > 1 or < -1 indicate significant skew.",
                    "recommendation": "Consider data transformation (log, square root) for better analysis" if abs(skewness) > 2 else "Moderate skew acceptable for most analyses",
                    "confidence": 0.8,
                    "data": {"column": col, "skewness": float(skewness)}
                })
        
        # Correlation insights with explanations
        if len(numerical_cols) >= 2:
            corr_matrix = df[numerical_cols].corr()
            strong_correlations = []
            
            for i in range(len(corr_matrix.columns)):
                for j in range(i+1, len(corr_matrix.columns)):
                    corr_val = corr_matrix.iloc[i, j]
                    if abs(corr_val) > 0.5:
                        col1, col2 = corr_matrix.columns[i], corr_matrix.columns[j]
                        strong_correlations.append({
                            "variables": [col1, col2],
                            "correlation": float(corr_val),
                            "strength": "strong" if abs(corr_val) > 0.7 else "moderate",
                            "direction": "positive" if corr_val > 0 else "negative"
                        })
            
            if strong_correlations:
                best_corr = max(strong_correlations, key=lambda x: abs(x["correlation"]))
                insights.append({
                    "type": "correlation",
                    "title": f"Strong Correlation Found",
                    "description": f"{best_corr['strength'].title()} {best_corr['direction']} correlation ({best_corr['correlation']:.3f}) between {best_corr['variables'][0]} and {best_corr['variables'][1]}",
                    "explanation": "Correlation measures linear relationship between variables. Values near 1/-1 indicate strong relationships.",
                    "recommendation": f"{'Consider these variables may be measuring similar concepts' if abs(best_corr['correlation']) > 0.8 else 'This relationship may be useful for predictive modeling'}",
                    "confidence": 0.9,
                    "data": best_corr
                })
        
        return JSONResponse(content={
            "insights": insights,
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "dataset_info": {
                "rows": len(df),
                "columns": len(df.columns),
                "numerical_columns": len(numerical_cols),
                "categorical_columns": len(df.select_dtypes(include=['object']).columns)
            }
        })
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate enhanced insights: {str(e)}")

# 16. QUERY PERFORMANCE STATS
@app.get("/api/query-stats")
async def get_query_stats(fileId: str = None):
    """Get query performance statistics"""
    try:
        stats = {
            "total_queries": 0,
            "average_execution_time": "< 1s",
            "most_common_queries": [],
            "recent_queries": [],
            "query_types": {"SQL": 0, "NLQ": 0}
        }
        
        if db is not None:
            # Get query statistics
            filter_query = {"fileId": fileId} if fileId else {}
            
            # Total queries
            stats["total_queries"] = db.queries.count_documents(filter_query)
            
            # Query type distribution
            for query_type in ["SQL", "NLQ"]:
                count = db.queries.count_documents({**filter_query, "queryType": query_type})
                stats["query_types"][query_type] = count
            
            # Recent queries
            recent_queries = db.queries.find(
                filter_query,
                {"query": 1, "queryType": 1, "timestamp": 1, "resultCount": 1},
                sort=[("timestamp", -1)],
                limit=10
            )
            
            stats["recent_queries"] = [
                {
                    "query": doc["query"][:100] + "..." if len(doc["query"]) > 100 else doc["query"],
                    "type": doc["queryType"],
                    "timestamp": doc["timestamp"].isoformat(),
                    "results": doc.get("resultCount", 0)
                }
                for doc in recent_queries
            ]
            
            # Most common query patterns (simplified)
            pipeline = [
                {"$match": filter_query},
                {"$group": {"_id": "$queryType", "count": {"$sum": 1}}},
                {"$sort": {"count": -1}}
            ]
            
            common_queries = list(db.queries.aggregate(pipeline))
            stats["most_common_queries"] = [
                {"pattern": doc["_id"], "count": doc["count"]}
                for doc in common_queries
            ]
        
        return JSONResponse(content=stats)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get query stats: {str(e)}")

# 17. BATCH DATA PROCESSING
@app.post("/api/batch-process")
async def batch_process_files(files: List[UploadFile] = File(...), projectId: str = Form(...)):
    """Process multiple files at once"""
    try:
        results = []
        
        for file in files:
            try:
                file_id = str(uuid.uuid4())
                contents = await file.read()
                
                # Process based on file type
                if file.filename.endswith('.csv'):
                    df = pd.read_csv(io.BytesIO(contents))
                elif file.filename.endswith(('.xlsx', '.xls')):
                    df = pd.read_excel(io.BytesIO(contents))
                elif file.filename.endswith('.json'):
                    df = pd.read_json(io.BytesIO(contents))
                else:
                    results.append({
                        "fileName": file.filename,
                        "fileId": file_id,
                        "status": "error",
                        "error": "Unsupported file format"
                    })
                    continue
                
                # Store dataset
                datasets[file_id] = df
                conn = get_duckdb_connection(file_id)
                conn.register('dataset', df)
                
                # Store metadata
                metadata = {
                    "fileName": file.filename,
                    "rows": len(df),
                    "columns": len(df.columns),
                    "projectId": projectId
                }
                store_dataset_metadata(file_id, metadata)
                
                results.append({
                    "fileName": file.filename,
                    "fileId": file_id,
                    "status": "success",
                    "rows": len(df),
                    "columns": len(df.columns)
                })
                
            except Exception as file_error:
                results.append({
                    "fileName": file.filename,
                    "fileId": str(uuid.uuid4()),
                    "status": "error",
                    "error": str(file_error)
                })
        
        return JSONResponse(content={
            "processed": len([r for r in results if r["status"] == "success"]),
            "failed": len([r for r in results if r["status"] == "error"]),
            "results": results
        })
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Batch processing failed: {str(e)}")

# 18. DATA COMPARISON
@app.post("/api/compare-datasets")
async def compare_datasets(payload: dict):
    """Compare two datasets"""
    try:
        file_id1 = payload.get("fileId1")
        file_id2 = payload.get("fileId2")
        
        if file_id1 not in datasets or file_id2 not in datasets:
            raise HTTPException(status_code=404, detail="One or both datasets not found")
        
        df1, df2 = datasets[file_id1], datasets[file_id2]
        
        comparison = {
            "basic_stats": {
                "dataset1": {"rows": len(df1), "columns": len(df1.columns)},
                "dataset2": {"rows": len(df2), "columns": len(df2.columns)}
            },
            "common_columns": list(set(df1.columns).intersection(set(df2.columns))),
            "unique_columns": {
                "dataset1": list(set(df1.columns) - set(df2.columns)),
                "dataset2": list(set(df2.columns) - set(df1.columns))
            },
            "schema_differences": [],
            "data_quality": {
                "dataset1": {"missing_pct": (df1.isnull().sum().sum() / (len(df1) * len(df1.columns))) * 100},
                "dataset2": {"missing_pct": (df2.isnull().sum().sum() / (len(df2) * len(df2.columns))) * 100}
            }
        }
        
        # Compare data types for common columns
        for col in comparison["common_columns"]:
            if str(df1[col].dtype) != str(df2[col].dtype):
                comparison["schema_differences"].append({
                    "column": col,
                    "dataset1_type": str(df1[col].dtype),
                    "dataset2_type": str(df2[col].dtype)
                })
        
        return JSONResponse(content=comparison)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Dataset comparison failed: {str(e)}")

# 19. PREDICTION MODE (Basic ML)
@app.post("/api/predict")
async def make_predictions(payload: dict):
    """Basic machine learning predictions"""
    try:
        file_id = payload.get("fileId")
        target_column = payload.get("targetColumn")
        prediction_type = payload.get("type", "classification")  # classification or regression
        
        if file_id not in datasets:
            raise HTTPException(status_code=404, detail="Dataset not found")
        
        df = datasets[file_id]
        
        if target_column not in df.columns:
            raise HTTPException(status_code=400, detail="Target column not found")
        
        try:
            from sklearn.model_selection import train_test_split
            from sklearn.ensemble import RandomForestRegressor, RandomForestClassifier
            from sklearn.metrics import accuracy_score, r2_score
            from sklearn.preprocessing import LabelEncoder
            
            # Prepare data
            numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
            if target_column in numeric_cols:
                numeric_cols.remove(target_column)
            
            if len(numeric_cols) == 0:
                raise HTTPException(status_code=400, detail="No numerical features available for prediction")
            
            X = df[numeric_cols].fillna(0)
            y = df[target_column].fillna(0)
            
            # Handle categorical target for classification
            le = None
            if prediction_type == "classification" and y.dtype == 'object':
                le = LabelEncoder()
                y = le.fit_transform(y)
            
            # Train/test split
            X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
            
            # Train model
            if prediction_type == "classification":
                model = RandomForestClassifier(n_estimators=10, random_state=42)
                model.fit(X_train, y_train)
                predictions = model.predict(X_test)
                score = accuracy_score(y_test, predictions)
                metric = "accuracy"
            else:
                model = RandomForestRegressor(n_estimators=10, random_state=42)
                model.fit(X_train, y_train)
                predictions = model.predict(X_test)
                score = r2_score(y_test, predictions)
                metric = "r2_score"
            
            # Feature importance
            feature_importance = [
                {"feature": col, "importance": float(imp)}
                for col, imp in zip(numeric_cols, model.feature_importances_)
            ]
            feature_importance.sort(key=lambda x: x["importance"], reverse=True)
            
            result = {
                "prediction_type": prediction_type,
                "target_column": target_column,
                "features_used": numeric_cols,
                "model_performance": {
                    metric: float(score),
                    "test_samples": len(X_test)
                },
                "feature_importance": feature_importance[:10],  # Top 10 features
                "predictions_sample": [
                    {
                        "actual": float(y_test.iloc[i]) if prediction_type == "regression" else (le.inverse_transform([int(y_test.iloc[i])])[0] if le else int(y_test.iloc[i])),
                        "predicted": float(predictions[i]) if prediction_type == "regression" else (le.inverse_transform([int(predictions[i])])[0] if le else int(predictions[i]))
                    }
                    for i in range(min(10, len(predictions)))
                ]
            }
            
            return JSONResponse(content=result)
            
        except ImportError:
            raise HTTPException(status_code=500, detail="Machine learning libraries not available")
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")

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