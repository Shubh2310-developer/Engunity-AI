"""
Database Service for Supabase Integration
Handles dataset schema retrieval and SQL query execution
"""

import os
import logging
import json
from typing import Dict, List, Any, Optional, Tuple
from supabase import create_client, Client
from pydantic import BaseModel
import re

logger = logging.getLogger(__name__)

class DatabaseError(Exception):
    """Custom exception for database operations"""
    pass

class QueryResult(BaseModel):
    """Model for SQL query results"""
    columns: List[str]
    rows: List[List[Any]]
    totalRows: int

class SchemaColumn(BaseModel):
    """Model for database column schema"""
    column_name: str
    data_type: str
    is_nullable: bool = True
    column_default: Optional[str] = None

class DatasetSchema(BaseModel):
    """Model for dataset schema"""
    table_name: str
    columns: List[SchemaColumn]
    total_rows: int = 0

class DatabaseService:
    """Service for interacting with Supabase database"""
    
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
    
    def get_dataset_schema(self, file_id: str) -> DatasetSchema:
        """
        Get schema information for a dataset table
        
        Args:
            file_id: The file ID to construct table name
            
        Returns:
            DatasetSchema with column information
        """
        table_name = self._get_table_name(file_id)
        
        try:
            # Query information_schema to get column details
            schema_query = f"""
            SELECT 
                column_name,
                data_type,
                is_nullable,
                column_default
            FROM information_schema.columns 
            WHERE table_name = '{table_name}'
            AND table_schema = 'public'
            ORDER BY ordinal_position;
            """
            
            logger.info(f"Fetching schema for table: {table_name}")
            
            # Execute the schema query
            result = self.client.rpc('execute_sql', {'query': schema_query})
            
            if not result.data:
                # Try alternative method - direct table inspection
                return self._get_schema_fallback(table_name)
            
            # Parse schema results
            columns = []
            for row in result.data:
                columns.append(SchemaColumn(
                    column_name=row['column_name'],
                    data_type=row['data_type'],
                    is_nullable=row['is_nullable'] == 'YES',
                    column_default=row.get('column_default')
                ))
            
            # Get row count
            row_count = self._get_table_row_count(table_name)
            
            logger.info(f"Retrieved schema for {table_name}: {len(columns)} columns, {row_count} rows")
            
            return DatasetSchema(
                table_name=table_name,
                columns=columns,
                total_rows=row_count
            )
            
        except Exception as e:
            logger.error(f"Error fetching schema for {table_name}: {e}")
            raise DatabaseError(f"Failed to retrieve schema for dataset {file_id}: {e}")
    
    def _get_schema_fallback(self, table_name: str) -> DatasetSchema:
        """
        Fallback method to get schema by inspecting first row
        """
        try:
            # Get first row to infer column structure
            result = self.client.table(table_name).select("*").limit(1).execute()
            
            if not result.data:
                raise DatabaseError(f"Table {table_name} is empty or does not exist")
            
            first_row = result.data[0]
            columns = []
            
            for col_name, value in first_row.items():
                # Infer data type from value
                if isinstance(value, int):
                    data_type = "integer"
                elif isinstance(value, float):
                    data_type = "numeric"
                elif isinstance(value, bool):
                    data_type = "boolean"
                else:
                    data_type = "text"
                
                columns.append(SchemaColumn(
                    column_name=col_name,
                    data_type=data_type,
                    is_nullable=True
                ))
            
            # Get row count
            row_count = self._get_table_row_count(table_name)
            
            return DatasetSchema(
                table_name=table_name,
                columns=columns,
                total_rows=row_count
            )
            
        except Exception as e:
            logger.error(f"Fallback schema retrieval failed for {table_name}: {e}")
            raise DatabaseError(f"Could not retrieve schema for table {table_name}")
    
    def _get_table_row_count(self, table_name: str) -> int:
        """Get the total number of rows in a table"""
        try:
            result = self.client.table(table_name).select("*", count="exact").limit(1).execute()
            return result.count or 0
        except Exception as e:
            logger.warning(f"Could not get row count for {table_name}: {e}")
            return 0
    
    def execute_sql(self, sql: str, limit: int = 1000) -> QueryResult:
        """
        Execute SQL query and return results
        
        Args:
            sql: SQL query to execute
            limit: Maximum number of rows to return
            
        Returns:
            QueryResult with columns, rows, and total count
        """
        try:
            # Add LIMIT clause if not present and not an aggregate query
            limited_sql = self._add_limit_if_needed(sql, limit)
            
            logger.info(f"Executing SQL query: {limited_sql}")
            
            # Execute query using Supabase RPC
            result = self.client.rpc('execute_sql', {'query': limited_sql})
            
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
            
            # Get total count (for pagination info)
            total_count = len(rows)
            
            # If we hit the limit, try to get actual total count
            if len(rows) == limit:
                total_count = self._get_query_total_count(sql)
            
            logger.info(f"Query executed successfully: {len(rows)} rows returned, {total_count} total")
            
            return QueryResult(
                columns=columns,
                rows=rows,
                totalRows=total_count
            )
            
        except Exception as e:
            logger.error(f"Error executing SQL query: {e}")
            logger.error(f"Query was: {sql}")
            raise DatabaseError(f"Failed to execute query: {e}")
    
    def _add_limit_if_needed(self, sql: str, limit: int) -> str:
        """Add LIMIT clause to SQL if not present and not an aggregate query"""
        sql_upper = sql.upper().strip()
        
        # Don't add limit if already present
        if "LIMIT" in sql_upper:
            return sql
        
        # Don't add limit for aggregate queries (they typically return few rows)
        aggregate_functions = ["COUNT", "SUM", "AVG", "MIN", "MAX", "GROUP BY"]
        if any(func in sql_upper for func in aggregate_functions):
            return sql
        
        # Add limit
        return f"{sql.rstrip(';')} LIMIT {limit}"
    
    def _get_query_total_count(self, sql: str) -> int:
        """Get total count for a query (for pagination)"""
        try:
            # Convert SELECT query to COUNT query
            count_sql = self._convert_to_count_query(sql)
            result = self.client.rpc('execute_sql', {'query': count_sql})
            
            if result.data and len(result.data) > 0:
                return result.data[0].get('count', 0)
            
            return 0
            
        except Exception as e:
            logger.warning(f"Could not get total count for query: {e}")
            return 0
    
    def _convert_to_count_query(self, sql: str) -> str:
        """Convert a SELECT query to a COUNT query"""
        try:
            # Simple approach: wrap the query in COUNT(*)
            # Remove any LIMIT clause first
            sql_no_limit = re.sub(r'\s+LIMIT\s+\d+\s*;?\s*$', '', sql, flags=re.IGNORECASE)
            return f"SELECT COUNT(*) as count FROM ({sql_no_limit}) as subquery"
        except:
            # Fallback - just return 0
            return "SELECT 0 as count"
    
    def _get_table_name(self, file_id: str) -> str:
        """
        Generate table name from file ID
        
        Args:
            file_id: File identifier
            
        Returns:
            Sanitized table name
        """
        # Sanitize file_id to create valid table name
        sanitized_id = re.sub(r'[^a-zA-Z0-9_]', '_', file_id)
        table_name = f"dataset_{sanitized_id}"
        
        # Ensure it starts with a letter (PostgreSQL requirement)
        if table_name[0].isdigit():
            table_name = f"d_{table_name}"
        
        return table_name.lower()
    
    def test_connection(self) -> bool:
        """Test the database connection"""
        try:
            # Simple query to test connection
            result = self.client.rpc('execute_sql', {'query': 'SELECT 1 as test'})
            return result.data is not None
        except Exception as e:
            logger.error(f"Database connection test failed: {e}")
            return False
    
    def table_exists(self, file_id: str) -> bool:
        """Check if a dataset table exists"""
        table_name = self._get_table_name(file_id)
        
        try:
            # Query information_schema to check if table exists
            check_query = f"""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = '{table_name}'
            );
            """
            
            result = self.client.rpc('execute_sql', {'query': check_query})
            
            if result.data and len(result.data) > 0:
                return result.data[0].get('exists', False)
            
            return False
            
        except Exception as e:
            logger.error(f"Error checking if table {table_name} exists: {e}")
            return False

# Global service instance
db_service = DatabaseService()