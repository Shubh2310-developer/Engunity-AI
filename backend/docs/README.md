# Natural Language Query (NLQ) API

This module provides Natural Language Query functionality for the Enguinity AI platform, allowing users to query datasets using natural language questions.

## 🚀 Features

- **Natural Language to SQL**: Convert human questions to SQL queries using GPT-OSS-120B
- **Safe Query Execution**: Built-in SQL injection protection and validation
- **AI Insights**: Generate intelligent insights about query results
- **Supabase Integration**: Seamless integration with Supabase PostgreSQL
- **Error Handling**: Comprehensive error handling and logging

## 📁 File Structure

```
backend/
├── api/
│   ├── query_nlq.py      # FastAPI router with NLQ endpoint
│   └── README.md         # This file
├── services/
│   ├── llm.py           # GPT-OSS-120B integration service
│   └── db.py            # Supabase database service
└── requirements_nlq.txt # Additional dependencies
```

## 🔧 Setup

### 1. Environment Variables

Add these to your `.env` file:

```bash
# Required
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-service-key-here

# Optional (defaults shown)
GPT_OSS_API_URL=http://localhost:8001/v1/completions
```

### 2. Dependencies

Install additional dependencies:

```bash
pip install -r requirements_nlq.txt
```

### 3. Database Setup

Ensure you have a Supabase RPC function for SQL execution. Create this in your Supabase SQL editor:

```sql
CREATE OR REPLACE FUNCTION execute_sql(query text)
RETURNS TABLE(result json)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY EXECUTE 'SELECT row_to_json(t) FROM (' || query || ') t';
END;
$$;
```

### 4. Integration

The NLQ router is automatically loaded in `main.py`. If you need to manually integrate:

```python
from api.query_nlq import router as nlq_router
app.include_router(nlq_router, tags=["nlq"])
```

## 📖 API Usage

### Endpoint

```
POST /api/query-nlq
```

### Request Format

```json
{
    "fileId": "your-dataset-file-id",
    "projectId": "your-project-id", 
    "question": "How many users signed up last month?"
}
```

### Response Format

```json
{
    "results": {
        "columns": ["user_count"],
        "rows": [[1250]], 
        "totalRows": 1,
        "sql": "SELECT COUNT(*) as user_count FROM dataset_users WHERE created_at >= '2023-11-01'"
    },
    "insight": "1,250 users signed up last month, showing strong growth.",
    "confidence": 0.9
}
```

### Health Check

```
GET /api/nlq/health
```

### Service Info

```
GET /api/nlq/info
```

## 🔒 Security Features

- **SQL Injection Prevention**: Validates generated SQL for dangerous patterns
- **Table Name Validation**: Ensures queries only access allowed dataset tables
- **Query Type Restriction**: Only SELECT statements are permitted
- **Result Limiting**: Automatic LIMIT clauses to prevent resource exhaustion

## 🚦 Error Handling

The API returns structured error responses:

```json
{
    "error": "Dataset not found",
    "details": "No dataset found for fileId: invalid-id",
    "code": "DATASET_NOT_FOUND"
}
```

Common error codes:
- `DATASET_NOT_FOUND`: Dataset table doesn't exist
- `SCHEMA_ERROR`: Unable to retrieve table schema
- `SQL_GENERATION_ERROR`: GPT-OSS-120B failed to generate SQL
- `INVALID_SQL`: Generated SQL failed security validation
- `QUERY_EXECUTION_ERROR`: Database query execution failed

## 🧪 Testing

### Local Testing

1. Start your GPT-OSS-120B server on port 8001
2. Ensure Supabase is configured with test data
3. Run the FastAPI server:

```bash
python main.py
```

4. Test the endpoint:

```bash
curl -X POST "http://localhost:8000/api/query-nlq" \
  -H "Content-Type: application/json" \
  -d '{
    "fileId": "test-dataset",
    "projectId": "test-project",
    "question": "Show me the first 5 rows"
  }'
```

### Health Check

```bash
curl http://localhost:8000/api/nlq/health
```

## 🎯 Supported Query Types

The NLQ system supports various question types:

- **Data Exploration**: "Show me the first 10 rows", "What columns are available?"
- **Aggregations**: "How many users are there?", "What's the average age?"
- **Filtering**: "Show users from California", "Find orders over $100"
- **Grouping**: "Count users by state", "Average salary by department"
- **Sorting**: "Top 5 products by sales", "Latest orders first"
- **Complex Queries**: "Monthly revenue growth", "Users who haven't logged in recently"

## 📊 Performance

- **Query Generation**: ~1-2 seconds with GPT-OSS-120B
- **SQL Execution**: Varies by query complexity and dataset size
- **Result Limiting**: Default 1000 rows max for performance
- **Caching**: Consider adding Redis caching for common queries

## 🔧 Configuration

### Customizing LLM Service

Edit `services/llm.py` to modify:
- API endpoint URLs
- Model parameters (temperature, max_tokens)
- Prompt templates
- Safety validation rules

### Customizing Database Service

Edit `services/db.py` to modify:
- Table naming conventions
- Query result limits
- Schema detection methods
- Connection parameters

## 🚀 Deployment

For production deployment:

1. Set secure environment variables
2. Use HTTPS for API endpoints
3. Configure proper CORS origins
4. Set up monitoring and logging
5. Consider rate limiting
6. Scale GPT-OSS-120B service appropriately

## 📝 Logging

The module uses Python's standard logging. Set log levels:

```python
import logging
logging.getLogger('api.query_nlq').setLevel(logging.INFO)
logging.getLogger('services.llm').setLevel(logging.INFO)
logging.getLogger('services.db').setLevel(logging.INFO)
```

## 🤝 Contributing

When extending the NLQ module:

1. Add comprehensive error handling
2. Update tests and documentation
3. Follow existing code patterns
4. Validate SQL security measures
5. Test with various question types

## 📋 TODO / Future Enhancements

- [ ] Query result caching with Redis
- [ ] Multi-language support
- [ ] Query history and suggestions
- [ ] Advanced visualization hints
- [ ] Query optimization recommendations
- [ ] Batch query processing
- [ ] Export results to different formats
- [ ] Integration with data visualization tools