"""
LLM Service for GPT-OSS-120B Integration
Handles natural language to SQL conversion and insight generation
"""

import requests
import json
import logging
from typing import Optional
import os
from pydantic import BaseModel

logger = logging.getLogger(__name__)

class LLMResponse(BaseModel):
    """Response model for LLM calls"""
    text: str
    success: bool
    error: Optional[str] = None

class LLMService:
    """Service for interacting with GPT-OSS-120B model"""
    
    def __init__(self):
        self.base_url = os.getenv("GPT_OSS_API_URL", "http://localhost:8001/v1/completions")
        self.model_name = "gpt-oss-120b"
        self.timeout = 30
        
        logger.info(f"LLM Service initialized with endpoint: {self.base_url}")
    
    def ask_gpt_oss(self, prompt: str, max_tokens: int = 512, temperature: float = 0.2) -> LLMResponse:
        """
        Call GPT-OSS-120B API with the given prompt
        
        Args:
            prompt: The input prompt
            max_tokens: Maximum tokens to generate
            temperature: Sampling temperature
            
        Returns:
            LLMResponse with generated text or error
        """
        try:
            payload = {
                "model": self.model_name,
                "prompt": prompt,
                "max_tokens": max_tokens,
                "temperature": temperature,
                "stop": ["\n\n", "---", "```"]  # Stop sequences to prevent over-generation
            }
            
            logger.info(f"Calling GPT-OSS API with prompt length: {len(prompt)}")
            
            response = requests.post(
                self.base_url, 
                json=payload, 
                timeout=self.timeout,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                result = response.json()
                generated_text = result.get("choices", [{}])[0].get("text", "").strip()
                
                logger.info(f"Successfully generated {len(generated_text)} characters")
                
                return LLMResponse(
                    text=generated_text,
                    success=True
                )
            else:
                error_msg = f"API returned status {response.status_code}: {response.text}"
                logger.error(error_msg)
                
                return LLMResponse(
                    text="",
                    success=False,
                    error=error_msg
                )
                
        except requests.exceptions.Timeout:
            error_msg = "Request timed out after 30 seconds"
            logger.error(error_msg)
            return LLMResponse(text="", success=False, error=error_msg)
            
        except requests.exceptions.ConnectionError:
            error_msg = "Could not connect to GPT-OSS API endpoint"
            logger.error(error_msg)
            return LLMResponse(text="", success=False, error=error_msg)
            
        except Exception as e:
            error_msg = f"Unexpected error calling GPT-OSS API: {str(e)}"
            logger.error(error_msg)
            return LLMResponse(text="", success=False, error=error_msg)
    
    def generate_sql_from_nlq(self, schema: dict, question: str) -> LLMResponse:
        """
        Convert natural language question to SQL query
        
        Args:
            schema: Database schema with columns and types
            question: Natural language question
            
        Returns:
            LLMResponse with SQL query
        """
        # Format schema for the prompt
        schema_text = self._format_schema_for_prompt(schema)
        
        prompt = f"""Convert this natural language question into a SQL query.

Database Schema:
{schema_text}

Question: {question}

Instructions:
- Generate ONLY the SQL query, no explanations
- Use proper SQL syntax for PostgreSQL
- Use appropriate WHERE, GROUP BY, ORDER BY, LIMIT clauses as needed
- Return only SELECT statements
- Use column names exactly as shown in schema
- For aggregations, use appropriate functions (COUNT, SUM, AVG, etc.)

SQL Query:"""

        return self.ask_gpt_oss(prompt, max_tokens=256, temperature=0.1)
    
    def generate_insight(self, question: str, sql: str, results: dict) -> LLMResponse:
        """
        Generate a one-line insight about the query results
        
        Args:
            question: Original question
            sql: Generated SQL query
            results: Query results (first 10 rows)
            
        Returns:
            LLMResponse with insight text
        """
        # Format results for prompt (first 10 rows)
        sample_data = self._format_results_for_prompt(results)
        
        prompt = f"""Generate a concise, one-sentence insight about these query results.

Original Question: {question}
SQL Query: {sql}

Sample Results:
{sample_data}

Generate a brief, informative insight that explains what the data shows. Keep it under 100 characters and focus on the key finding.

Insight:"""

        return self.ask_gpt_oss(prompt, max_tokens=64, temperature=0.3)
    
    def _format_schema_for_prompt(self, schema: dict) -> str:
        """Format database schema for LLM prompt"""
        if not schema.get('columns'):
            return "No schema available"
            
        lines = []
        table_name = schema.get('table_name', 'dataset')
        lines.append(f"Table: {table_name}")
        
        for col in schema['columns']:
            col_name = col.get('column_name', 'unknown')
            col_type = col.get('data_type', 'unknown')
            lines.append(f"  - {col_name}: {col_type}")
        
        return "\n".join(lines)
    
    def _format_results_for_prompt(self, results: dict) -> str:
        """Format query results for LLM prompt"""
        if not results.get('rows') or not results.get('columns'):
            return "No results"
        
        columns = results['columns']
        rows = results['rows'][:5]  # First 5 rows only
        total_rows = results.get('totalRows', len(rows))
        
        lines = []
        lines.append(f"Columns: {', '.join(columns)}")
        lines.append(f"Total Rows: {total_rows}")
        lines.append("Sample Data:")
        
        for i, row in enumerate(rows):
            row_data = []
            for j, col in enumerate(columns):
                value = row[j] if j < len(row) else 'NULL'
                row_data.append(f"{col}={value}")
            lines.append(f"  Row {i+1}: {', '.join(row_data)}")
        
        return "\n".join(lines)
    
    def sanitize_sql(self, sql: str, allowed_table_prefix: str = "dataset_") -> tuple[str, bool]:
        """
        Basic SQL sanitization and validation
        
        Args:
            sql: Generated SQL query
            allowed_table_prefix: Allowed table name prefix
            
        Returns:
            Tuple of (cleaned_sql, is_valid)
        """
        # Clean up the SQL
        sql = sql.strip()
        
        # Remove any markdown formatting
        if sql.startswith("```"):
            sql = sql.split("\n", 1)[1] if "\n" in sql else sql[3:]
        if sql.endswith("```"):
            sql = sql.rsplit("\n", 1)[0] if "\n" in sql else sql[:-3]
        
        sql = sql.strip()
        
        # Basic validation
        sql_upper = sql.upper()
        
        # Must be a SELECT statement
        if not sql_upper.startswith("SELECT"):
            return sql, False
            
        # Should not contain dangerous keywords
        dangerous_keywords = [
            "DROP", "DELETE", "INSERT", "UPDATE", "ALTER", "CREATE", 
            "TRUNCATE", "EXEC", "EXECUTE", "--", "/*", "*/"
        ]
        
        for keyword in dangerous_keywords:
            if keyword in sql_upper:
                logger.warning(f"Dangerous keyword '{keyword}' found in SQL: {sql}")
                return sql, False
        
        # Check table name format (basic check)
        if "FROM" in sql_upper:
            # Extract table name after FROM
            from_idx = sql_upper.find("FROM")
            after_from = sql[from_idx + 4:].strip()
            table_name = after_from.split()[0].strip()
            
            if not table_name.startswith(allowed_table_prefix):
                logger.warning(f"Invalid table name '{table_name}' - must start with '{allowed_table_prefix}'")
                return sql, False
        
        return sql, True

# Global service instance
llm_service = LLMService()