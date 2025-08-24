"""
Analysis API routes for data processing and analysis
"""

from fastapi import APIRouter, File, UploadFile, Form, HTTPException, Query
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel
from typing import Dict, List, Optional, Any, Union
import pandas as pd
import numpy as np
import io
import uuid
import os
import json
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

router = APIRouter()

# MongoDB setup
mongo_uri = os.getenv("MONGO_URI", "mongodb://localhost:27017/engunity-ai")
try:
    mongo_client = MongoClient(mongo_uri)
    db = mongo_client["engunity-ai"]
    mongo_client.admin.command('ping')
    print(" MongoDB connected successfully")
except Exception as e:
    print(f"L MongoDB connection failed: {e}")
    db = None

# Groq setup for AI features
groq_client = None
if os.getenv("GROQ_API_KEY"):
    try:
        groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))
        print(" Groq client initialized")
    except Exception as e:
        print(f"L Groq client initialization failed: {e}")

# In-memory storage for datasets (with DuckDB backend)
datasets = {}
duckdb_connections = {}

def get_duckdb_connection(file_id: str):
    """Get or create DuckDB connection for a file"""
    if file_id not in duckdb_connections:
        duckdb_connections[file_id] = duckdb.connect(":memory:")
    return duckdb_connections[file_id]

def load_demo_datasets():
    """Load demo datasets on startup"""
    try:
        # Get the absolute path to the backend directory
        backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../../'))
        demo_files = {
            'demo-linear-regression': os.path.join(backend_dir, 'demo_data', 'linear_regression_demo.csv'),
            'sales-sample-2023': os.path.join(backend_dir, 'demo_data', 'sales_data_2023.csv'),
            'employee-data-sample': os.path.join(backend_dir, 'demo_data', 'employee_data_sample.csv')
        }
        
        for file_id, file_path in demo_files.items():
            print(f"Trying to load demo file: {file_path}")
            if os.path.exists(file_path):
                df = pd.read_csv(file_path)
                datasets[file_id] = df.copy()
                
                # Store in DuckDB for SQL queries
                conn = get_duckdb_connection(file_id)
                conn.execute("DROP TABLE IF EXISTS data")
                conn.execute("CREATE TABLE data AS SELECT * FROM df")
                
                print(f"✅ Loaded demo dataset: {file_id} with {len(df)} rows, {len(df.columns)} columns")
            else:
                print(f"⚠️ Demo file not found: {file_path}")
                
    except Exception as e:
        print(f"Error loading demo datasets: {e}")

# Demo datasets will be loaded during app startup in main.py

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

@router.post("/process-dataset")
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
        
        # Basic validation
        if df.empty:
            raise HTTPException(status_code=400, detail="Empty dataset")
        
        # Store in memory for analysis (limited to reasonable size)
        if len(df) > 1000000:  # 1M rows limit for memory safety
            raise HTTPException(status_code=400, detail="Dataset too large. Please use a smaller sample.")
        
        # Store dataset
        datasets[fileId] = df.copy()
        
        # Store in DuckDB for SQL queries
        conn = get_duckdb_connection(fileId)
        conn.execute("DROP TABLE IF EXISTS data")
        conn.execute("CREATE TABLE data AS SELECT * FROM df")
        
        # Generate metadata
        metadata = {
            "filename": file.filename,
            "fileId": fileId,
            "projectId": projectId,
            "uploadTime": datetime.now(timezone.utc).isoformat(),
            "rows": len(df),
            "columns": len(df.columns),
            "size_mb": len(contents) / (1024 * 1024),
            "column_names": df.columns.tolist(),
            "data_types": {col: str(dtype) for col, dtype in df.dtypes.items()},
            "missing_values": df.isnull().sum().to_dict(),
            "numeric_columns": df.select_dtypes(include=[np.number]).columns.tolist(),
            "categorical_columns": df.select_dtypes(include=['object']).columns.tolist(),
            "datetime_columns": df.select_dtypes(include=['datetime']).columns.tolist(),
        }
        
        # Store metadata in MongoDB
        store_dataset_metadata(fileId, metadata)
        
        return {
            "success": True,
            "fileId": fileId,
            "filename": file.filename,
            "rows": len(df),
            "columns": len(df.columns),
            "metadata": metadata
        }
        
    except Exception as e:
        print(f"Error processing dataset: {e}")
        print(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Error processing dataset: {str(e)}")

@router.get("/data-preview")
async def get_data_preview(
    fileId: str = Query(...),
    page: int = Query(1, ge=1),
    pageSize: int = Query(50, ge=1, le=1000)
):
    """Get paginated preview of dataset"""
    try:
        if fileId not in datasets:
            raise HTTPException(status_code=404, detail="Dataset not found")
        
        df = datasets[fileId]
        total_rows = len(df)
        
        # Calculate pagination
        start_idx = (page - 1) * pageSize
        end_idx = start_idx + pageSize
        
        # Get page data
        page_data = df.iloc[start_idx:end_idx]
        
        # Convert to records for JSON serialization
        records = []
        for _, row in page_data.iterrows():
            record = {}
            for col in df.columns:
                value = row[col]
                # Handle different data types for JSON serialization
                if pd.isna(value):
                    record[col] = None
                elif isinstance(value, (np.integer, np.floating)):
                    if pd.isna(value):
                        record[col] = None
                    else:
                        record[col] = float(value) if isinstance(value, np.floating) else int(value)
                elif isinstance(value, np.bool_):
                    record[col] = bool(value)
                else:
                    record[col] = str(value)
            records.append(record)
        
        return {
            "data": records,
            "columns": df.columns.tolist(),
            "totalRows": total_rows,
            "page": page,
            "pageSize": pageSize,
            "totalPages": (total_rows + pageSize - 1) // pageSize
        }
        
    except Exception as e:
        print(f"Error getting data preview: {e}")
        print(f"Available datasets: {list(datasets.keys())}")
        print(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Error getting data preview: {str(e)}")

@router.get("/column-metadata")
async def get_column_metadata(fileId: str = Query(...)):
    """Get detailed metadata for all columns"""
    try:
        if fileId not in datasets:
            raise HTTPException(status_code=404, detail="Dataset not found")
        
        df = datasets[fileId]
        metadata = {}
        
        for col in df.columns:
            col_data = df[col]
            col_type = str(col_data.dtype)
            
            # Basic stats
            stats = {
                "name": col,
                "type": col_type,
                "null_count": int(col_data.isnull().sum()),
                "null_percentage": float(col_data.isnull().mean() * 100),
                "unique_count": int(col_data.nunique()),
                "total_count": len(col_data)
            }
            
            # Type-specific stats
            if col_data.dtype in ['int64', 'float64']:
                stats.update({
                    "mean": float(col_data.mean()) if not col_data.isnull().all() else None,
                    "std": float(col_data.std()) if not col_data.isnull().all() else None,
                    "min": float(col_data.min()) if not col_data.isnull().all() else None,
                    "max": float(col_data.max()) if not col_data.isnull().all() else None,
                    "median": float(col_data.median()) if not col_data.isnull().all() else None,
                })
            elif col_data.dtype == 'object':
                # Most frequent value
                if not col_data.isnull().all():
                    mode_val = col_data.mode()
                    stats["most_frequent"] = str(mode_val.iloc[0]) if len(mode_val) > 0 else None
                    stats["most_frequent_count"] = int(col_data.value_counts().iloc[0]) if len(col_data.value_counts()) > 0 else 0
            
            # Sample values (non-null)
            non_null_values = col_data.dropna()
            if len(non_null_values) > 0:
                sample_size = min(5, len(non_null_values))
                stats["sample_values"] = [str(val) for val in non_null_values.sample(sample_size).tolist()]
            else:
                stats["sample_values"] = []
            
            metadata[col] = stats
        
        return {"columns": metadata}
        
    except Exception as e:
        print(f"Error getting column metadata: {e}")
        raise HTTPException(status_code=500, detail=f"Error getting column metadata: {str(e)}")

@router.get("/data-summary")
async def get_data_summary(fileId: str = Query(...)):
    """Get comprehensive data summary and insights"""
    try:
        if fileId not in datasets:
            raise HTTPException(status_code=404, detail="Dataset not found")
        
        df = datasets[fileId]
        
        # Basic info
        summary = {
            "basic_info": {
                "rows": len(df),
                "columns": len(df.columns),
                "memory_usage": f"{df.memory_usage(deep=True).sum() / 1024 / 1024:.2f} MB",
                "missing_values_total": int(df.isnull().sum().sum()),
                "missing_percentage": float(df.isnull().mean().mean() * 100),
                "duplicate_rows": int(df.duplicated().sum())
            },
            "column_types": {
                "numeric": len(df.select_dtypes(include=[np.number]).columns),
                "categorical": len(df.select_dtypes(include=['object']).columns),
                "datetime": len(df.select_dtypes(include=['datetime']).columns),
                "boolean": len(df.select_dtypes(include=['bool']).columns)
            },
            "data_quality": {
                "completeness": float((1 - df.isnull().mean().mean()) * 100),
                "columns_with_missing": int((df.isnull().sum() > 0).sum()),
                "highly_missing_columns": int((df.isnull().mean() > 0.5).sum())
            }
        }
        
        return summary
        
    except Exception as e:
        print(f"Error getting data summary: {e}")
        raise HTTPException(status_code=500, detail=f"Error getting data summary: {str(e)}")

@router.get("/correlation")
async def get_correlation_matrix(fileId: str = Query(...)):
    """Get correlation matrix for numeric columns"""
    try:
        if fileId not in datasets:
            raise HTTPException(status_code=404, detail="Dataset not found")
        
        df = datasets[fileId]
        numeric_df = df.select_dtypes(include=[np.number])
        
        if numeric_df.empty:
            return {"message": "No numeric columns found for correlation analysis"}
        
        # Calculate correlation matrix
        corr_matrix = numeric_df.corr()
        
        # Convert to format suitable for frontend
        correlation_data = []
        columns = corr_matrix.columns.tolist()
        
        for i, col1 in enumerate(columns):
            for j, col2 in enumerate(columns):
                correlation_data.append({
                    "x": col1,
                    "y": col2,
                    "value": float(corr_matrix.iloc[i, j]) if not pd.isna(corr_matrix.iloc[i, j]) else 0
                })
        
        return {
            "correlations": correlation_data,
            "columns": columns,
            "matrix": corr_matrix.values.tolist()
        }
        
    except Exception as e:
        print(f"Error calculating correlation: {e}")
        raise HTTPException(status_code=500, detail=f"Error calculating correlation: {str(e)}")

@router.get("/insights")
async def get_data_insights(fileId: str = Query(...)):
    """Generate AI-powered insights about the dataset"""
    try:
        if fileId not in datasets:
            raise HTTPException(status_code=404, detail="Dataset not found")
        
        df = datasets[fileId]
        insights = []
        
        # Basic insights
        if df.isnull().sum().sum() > 0:
            missing_cols = df.columns[df.isnull().sum() > 0].tolist()
            insights.append({
                "type": "data_quality",
                "severity": "medium",
                "title": "Missing Data Detected",
                "description": f"Found missing values in {len(missing_cols)} columns: {', '.join(missing_cols[:3])}{'...' if len(missing_cols) > 3 else ''}",
                "recommendation": "Consider data cleaning or imputation strategies."
            })
        
        # Duplicate detection
        if df.duplicated().sum() > 0:
            insights.append({
                "type": "data_quality",
                "severity": "high",
                "title": "Duplicate Rows Found",
                "description": f"Found {df.duplicated().sum()} duplicate rows out of {len(df)} total rows.",
                "recommendation": "Review and remove duplicates if they're not intentional."
            })
        
        # High cardinality detection
        for col in df.select_dtypes(include=['object']).columns:
            unique_ratio = df[col].nunique() / len(df)
            if unique_ratio > 0.8:
                insights.append({
                    "type": "data_structure",
                    "severity": "low",
                    "title": f"High Cardinality in {col}",
                    "description": f"Column '{col}' has {df[col].nunique()} unique values out of {len(df)} rows.",
                    "recommendation": "Consider if this column should be treated as an identifier rather than categorical."
                })
        
        # Numeric column insights
        for col in df.select_dtypes(include=[np.number]).columns:
            if df[col].std() == 0:
                insights.append({
                    "type": "data_structure",
                    "severity": "medium",
                    "title": f"Constant Values in {col}",
                    "description": f"Column '{col}' has the same value for all rows.",
                    "recommendation": "Consider removing this column as it provides no variance."
                })
        
        return {"insights": insights}
        
    except Exception as e:
        print(f"Error generating insights: {e}")
        raise HTTPException(status_code=500, detail=f"Error generating insights: {str(e)}")

@router.get("/charts")
async def get_chart_suggestions(fileId: str = Query(...)):
    """Get suggested charts based on data types and structure"""
    try:
        if fileId not in datasets:
            raise HTTPException(status_code=404, detail="Dataset not found")
        
        df = datasets[fileId]
        suggestions = []
        
        numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
        categorical_cols = df.select_dtypes(include=['object']).columns.tolist()
        
        # Histogram suggestions for numeric columns
        for col in numeric_cols[:5]:  # Limit to first 5
            suggestions.append({
                "type": "histogram",
                "title": f"Distribution of {col}",
                "description": f"Shows the frequency distribution of values in {col}",
                "columns": [col],
                "chart_type": "histogram"
            })
        
        # Bar chart suggestions for categorical columns
        for col in categorical_cols[:5]:
            if df[col].nunique() <= 20:  # Only for reasonable number of categories
                suggestions.append({
                    "type": "bar",
                    "title": f"Count by {col}",
                    "description": f"Shows the count of each category in {col}",
                    "columns": [col],
                    "chart_type": "bar"
                })
        
        # Scatter plot suggestions for numeric pairs
        if len(numeric_cols) >= 2:
            for i in range(min(3, len(numeric_cols))):
                for j in range(i+1, min(i+4, len(numeric_cols))):
                    suggestions.append({
                        "type": "scatter",
                        "title": f"{numeric_cols[i]} vs {numeric_cols[j]}",
                        "description": f"Shows the relationship between {numeric_cols[i]} and {numeric_cols[j]}",
                        "columns": [numeric_cols[i], numeric_cols[j]],
                        "chart_type": "scatter"
                    })
        
        return {"suggestions": suggestions[:10]}  # Limit total suggestions
        
    except Exception as e:
        print(f"Error generating chart suggestions: {e}")
        raise HTTPException(status_code=500, detail=f"Error generating chart suggestions: {str(e)}")

@router.get("/export")
async def export_data(
    fileId: str = Query(...),
    format: str = Query("csv", regex="^(csv|json|excel)$")
):
    """Export processed dataset in specified format"""
    try:
        if fileId not in datasets:
            raise HTTPException(status_code=404, detail="Dataset not found")
        
        df = datasets[fileId]
        
        if format == "csv":
            output = io.StringIO()
            df.to_csv(output, index=False)
            output.seek(0)
            
            return StreamingResponse(
                io.BytesIO(output.getvalue().encode()),
                media_type="text/csv",
                headers={"Content-Disposition": f"attachment; filename=exported_data_{fileId}.csv"}
            )
            
        elif format == "json":
            json_data = df.to_json(orient="records", indent=2)
            
            return StreamingResponse(
                io.BytesIO(json_data.encode()),
                media_type="application/json",
                headers={"Content-Disposition": f"attachment; filename=exported_data_{fileId}.json"}
            )
            
        elif format == "excel":
            output = io.BytesIO()
            with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
                df.to_excel(writer, sheet_name='Data', index=False)
            output.seek(0)
            
            return StreamingResponse(
                output,
                media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                headers={"Content-Disposition": f"attachment; filename=exported_data_{fileId}.xlsx"}
            )
        
    except Exception as e:
        print(f"Error exporting data: {e}")
        raise HTTPException(status_code=500, detail=f"Error exporting data: {str(e)}")

class ChartConfig(BaseModel):
    fileId: str
    type: str = "bar"
    xAxis: str
    yAxis: str
    title: Optional[str] = None

@router.post("/custom-chart")
async def create_custom_chart(chart_config: ChartConfig):
    """Create a custom chart with specified configuration"""
    try:
        print(f"Received chart config: {chart_config}")
        file_id = chart_config.fileId
        if not file_id or file_id not in datasets:
            print(f"Dataset not found for fileId: {file_id}")
            print(f"Available datasets: {list(datasets.keys())}")
            raise HTTPException(status_code=404, detail="Dataset not found")
        
        df = datasets[file_id]
        chart_type = chart_config.type
        x_axis = chart_config.xAxis
        y_axis = chart_config.yAxis
        
        if not x_axis or not y_axis:
            raise HTTPException(status_code=400, detail="Both xAxis and yAxis are required")
        
        if x_axis not in df.columns or y_axis not in df.columns:
            raise HTTPException(status_code=400, detail="Specified columns not found in dataset")
        
        # Generate chart data based on type
        chart_data = []
        
        if chart_type in ['bar', 'column']:
            # For categorical x-axis, group and aggregate
            if df[x_axis].dtype == 'object':
                grouped = df.groupby(x_axis)[y_axis].sum().reset_index()
                chart_data = [{"x": str(row[x_axis]), "y": float(row[y_axis])} for _, row in grouped.iterrows()]
            else:
                chart_data = [{"x": float(row[x_axis]), "y": float(row[y_axis])} for _, row in df.iterrows()]
                
        elif chart_type == 'line':
            chart_data = [{"x": float(row[x_axis]) if pd.api.types.is_numeric_dtype(df[x_axis]) else str(row[x_axis]), 
                          "y": float(row[y_axis])} for _, row in df.iterrows()]
            
        elif chart_type == 'scatter':
            chart_data = [{"x": float(row[x_axis]), "y": float(row[y_axis])} for _, row in df.iterrows()]
            
        elif chart_type == 'pie':
            # For pie charts, group by x_axis and sum y_axis
            if df[x_axis].dtype == 'object':
                grouped = df.groupby(x_axis)[y_axis].sum().reset_index()
                chart_data = [{"name": str(row[x_axis]), "value": float(row[y_axis])} for _, row in grouped.iterrows()]
            else:
                raise HTTPException(status_code=400, detail="Pie charts require categorical x-axis")
        
        return {
            "success": True,
            "data": chart_data,
            "config": {
                "type": chart_type,
                "xAxis": x_axis,
                "yAxis": y_axis,
                "title": chart_config.title or f"{y_axis} by {x_axis}"
            }
        }
        
    except Exception as e:
        print(f"Error creating custom chart: {e}")
        raise HTTPException(status_code=500, detail=f"Error creating custom chart: {str(e)}")

@router.get("/debug/datasets")
async def debug_datasets():
    """Debug endpoint to check loaded datasets"""
    return {
        "loaded_datasets": list(datasets.keys()),
        "dataset_info": {file_id: {"rows": len(df), "columns": list(df.columns)} for file_id, df in datasets.items()}
    }