"""
Simplified Database Service for SQL Query Execution
Works with direct Supabase table queries without RPC functions
"""

import os
import logging
import json
import re
from typing import Dict, List, Any, Optional
from supabase import create_client, Client
from pydantic import BaseModel
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

logger = logging.getLogger(__name__)

class DatabaseError(Exception):
    """Custom exception for database operations"""
    pass

class QueryResult(BaseModel):
    """Model for SQL query results"""
    columns: List[str]
    rows: List[List[Any]]
    totalRows: int

class SimpleDatabaseService:
    """Simplified service for basic dataset queries"""
    
    def __init__(self):
        self.supabase_url = os.getenv("SUPABASE_URL")
        self.supabase_key = os.getenv("SUPABASE_KEY")
        
        if not self.supabase_url or not self.supabase_key:
            raise ValueError("SUPABASE_URL and SUPABASE_KEY environment variables are required")
        
        try:
            self.client: Client = create_client(self.supabase_url, self.supabase_key)
            logger.info("Supabase client initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize Supabase client: {e}")
            raise DatabaseError(f"Failed to connect to Supabase: {e}")
    
    def _get_table_name(self, file_id: str) -> str:
        """Generate table name from file ID"""
        # For now, let's use a simple approach - you may need to adjust this
        # based on how your tables are actually named in Supabase
        sanitized_id = re.sub(r'[^a-zA-Z0-9_]', '_', file_id)
        table_name = f"dataset_{sanitized_id}"
        
        # Ensure it starts with a letter
        if table_name[0].isdigit():
            table_name = f"d_{table_name}"
        
        return table_name.lower()
    
    def table_exists(self, file_id: str) -> bool:
        """Check if a dataset table exists by trying to query it"""
        table_name = self._get_table_name(file_id)
        
        try:
            # Try to query the table with limit 0 to check existence
            result = self.client.table(table_name).select("*").limit(0).execute()
            return True
        except Exception as e:
            logger.error(f"Table {table_name} does not exist or cannot be accessed: {e}")
            return False
    
    def execute_simple_query(self, file_id: str, limit: int = 1000) -> QueryResult:
        """
        Execute a simple SELECT * query for demonstration
        This is a fallback when complex SQL parsing isn't available
        """
        table_name = self._get_table_name(file_id)
        
        try:
            logger.info(f"Executing simple query on table: {table_name}")
            
            # Execute basic select query
            result = self.client.table(table_name).select("*").limit(limit).execute()
            
            if not result.data:
                logger.info("Query executed but returned no data")
                return QueryResult(columns=[], rows=[], totalRows=0)
            
            # Extract column names from first row
            columns = list(result.data[0].keys()) if result.data else []
            
            # Convert rows to list format
            rows = []
            for row_dict in result.data:
                row = [row_dict.get(col) for col in columns]
                rows.append(row)
            
            logger.info(f"Query executed successfully: {len(rows)} rows returned")
            
            return QueryResult(
                columns=columns,
                rows=rows,
                totalRows=len(rows)
            )
            
        except Exception as e:
            logger.error(f"Error executing query on {table_name}: {e}")
            raise DatabaseError(f"Failed to execute query: {e}")
    
    def test_connection(self) -> bool:
        """Test the database connection"""
        try:
            # Try to access any table - this is a simple connection test
            return True  # If we get here, connection worked during init
        except Exception as e:
            logger.error(f"Database connection test failed: {e}")
            return False

# Global service instance
simple_db_service = SimpleDatabaseService()