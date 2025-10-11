# 📊2111 Data Analysis Module - Complete Documentation

## 📋 Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Frontend Structure](#frontend-structure)
4. [Backend Structure](#backend-structure)
5. [API Routes](#api-routes)
6. [Database Schema](#database-schema)
7. [Features](#features)
8. [Data Flow](#data-flow)
9. [Chart Types](#chart-types)
10. [AI Integration](#ai-integration)
11. [Deployment](#deployment)

---

## 🎯 Overview

The **Data Analysis Module** is a comprehensive platform for uploading, analyzing, visualizing, and querying datasets with AI-powered insights. It combines traditional data analysis tools with modern AI capabilities.

### Purpose
- Upload and process datasets (CSV, Excel, JSON, Parquet)
- Perform exploratory data analysis (EDA)
- Create interactive visualizations
- Execute SQL queries with AI assistance
- Generate AI-powered insights
- Export professional PDF reports

### Tech Stack
- **Frontend**: Next.js 14, TypeScript, React, Recharts, Monaco Editor
- **Backend**: FastAPI (Python), DuckDB, Pandas, NumPy
- **Database**: MongoDB Atlas
- **AI**: Groq API (LLaMA models)
- **Visualization**: Recharts, D3.js
- **PDF Export**: jsPDF, html2canvas

---

## 🏗️ Architecture

### High-Level Architecture

\`\`\`
┌──────────────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                         │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  /dashboard/analysis/page.tsx (5092 lines)              │ │
│  │  - Dataset upload & management                          │ │
│  │  - Data preview & pagination                            │ │
│  │  - Interactive visualizations                           │ │
│  │  - SQL query editor (Monaco)                            │ │
│  │  - AI assistant integration                             │ │
│  │  - Chart builder                                        │ │
│  │  - PDF export                                           │ │
│  └─────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│                  Next.js API Routes                           │
│  ┌──────────────────┬──────────────────┐                    │
│  │ /api/analysis/   │ /api/analysis/   │                    │
│  │ process          │ visualize        │                    │
│  └──────────────────┴──────────────────┘                    │
└──────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│                  Backend (FastAPI)                            │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  /api/v1/analysis.py (1000+ lines)                      │ │
│  │  - Dataset processing                                   │ │
│  │  - DuckDB SQL execution                                 │ │
│  │  - Pandas data manipulation                             │ │
│  │  - Statistical analysis                                 │ │
│  │  - AI-powered insights (Groq)                           │ │
│  └─────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│                  Data Storage                                 │
│  ┌──────────────┬──────────────┬──────────────────────────┐ │
│  │ MongoDB      │ DuckDB       │ In-Memory                │ │
│  │ (Metadata)   │ (SQL Queries)│ (Active Datasets)        │ │
│  └──────────────┴──────────────┴──────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
\`\`\`

### Component Diagram

\`\`\`
Frontend Components
├── DataAnalysis (Main Page)
│   ├── Tabs
│   │   ├── Overview
│   │   ├── Dataset
│   │   ├── Cleaning
│   │   ├── Visualizations
│   │   ├── Correlations
│   │   ├── Queries
│   │   └── AI Insights
│   ├── DatasetUploader
│   ├── DataPreviewTable
│   ├── ChartBuilder
│   ├── SQLEditor (Monaco)
│   ├── CorrelationMatrix
│   └── AIAssistant
├── PDFExport
│   ├── SimplePDF
│   └── ProfessionalPDF
└── ChartComponents
    ├── BarChart
    ├── LineChart
    ├── PieChart
    ├── DonutChart
    ├── ScatterPlot
    ├── AreaChart
    └── Heatmap

Backend Services
├── DatasetProcessor
├── DuckDBEngine
├── StatisticalAnalyzer
├── ChartDataGenerator
├── GroqAIClient
└── MetadataManager
\`\`\`

---

## 💻 Frontend Structure

### File Organization

\`\`\`
frontend/src/app/dashboard/analysis/
├── page.tsx                           # Main analysis page (5092 lines)
├── upload/
│   └── page.tsx                       # Dataset upload page
├── [datasetId]/
│   └── page.tsx                       # Individual dataset page
└── export-preview/
    ├── page.tsx                       # Export preview
    ├── simple-pdf.tsx                 # Simple PDF template
    ├── professional-pdf.tsx           # Professional PDF template
    └── chart-capture-utils.tsx        # Chart capture utilities

frontend/src/app/api/analysis/
├── process/
│   └── route.ts                       # Dataset processing endpoint
└── visualize/
    └── route.ts                       # Visualization endpoint
\`\`\`

### Main Analysis Page (`page.tsx`)

**Location**: \`/home/ghost/engunity-ai/frontend/src/app/dashboard/analysis/page.tsx\`

**Size**: 5092 lines

**Key Features**:
1. **Multi-tab Interface** (7 tabs)
2. **Dataset Management**
3. **Real-time Preview**
4. **Interactive Charts**
5. **SQL Query Editor**
6. **AI-Powered Insights**
7. **PDF Export**

### State Management

\`\`\`typescript
// Dataset State
const [activeDataset, setActiveDataset] = useState<string | null>(null);
const [datasets, setDatasets] = useState<Map<string, any>>(new Map());
const [dataPreview, setDataPreview] = useState<DataPreview | null>(null);
const [currentPage, setCurrentPage] = useState(1);
const [pageSize, setPageSize] = useState(50);

// Analysis State
const [columnMetadata, setColumnMetadata] = useState<Map<string, ColumnMetadata>>(new Map());
const [correlationData, setCorrelationData] = useState<CorrelationData | null>(null);
const [statisticalSummary, setStatisticalSummary] = useState<any>(null);

// Visualization State
const [charts, setCharts] = useState<ChartConfig[]>([]);
const [activeChart, setActiveChart] = useState<string | null>(null);

// Query State
const [sqlQuery, setSqlQuery] = useState('SELECT * FROM data LIMIT 10');
const [queryResult, setQueryResult] = useState<any>(null);
const [queryHistory, setQueryHistory] = useState<QueryHistory[]>([]);

// AI State
const [aiInsights, setAiInsights] = useState<string[]>([]);
const [aiLoading, setAiLoading] = useState(false);

// Cleaning State
const [cleaningOperations, setCleaningOperations] = useState<any>({
  removeNulls: false,
  normalizeValues: false,
  encodeCategorical: false,
  dropDuplicates: false,
  detectOutliers: false
});
const [cleaningLog, setCleaningLog] = useState<CleaningLog[]>([]);

// UI State
const [activeTab, setActiveTab] = useState('overview');
const [isUploading, setIsUploading] = useState(false);
const [uploadProgress, setUploadProgress] = useState(0);
const [themeMode, setThemeMode] = useState<'light' | 'dark'>('light');
\`\`\`

### Tab System

#### 1. **Overview Tab**
- Dataset selection dropdown
- Quick statistics cards
  - Total rows
  - Total columns
  - Missing values
  - Data types
- Recent activity
- Quick actions

#### 2. **Dataset Tab**
- Paginated data table
- Column headers with sorting
- Row selection
- Filter controls
- Export options
- Column type indicators

#### 3. **Cleaning Tab**
- Quick cleaning toggles
  - Remove nulls
  - Normalize values
  - Encode categorical
  - Drop duplicates
  - Detect outliers
- Data quality score
- Cleaning log/history
- Preview changes
- Apply/Revert buttons

#### 4. **Visualizations Tab**
- Chart gallery
- Chart builder
  - Chart type selector
  - Axis configuration
  - Color picker
  - Filter builder
- Chart customization
- Export chart image
- Full-screen view

#### 5. **Correlations Tab**
- Correlation matrix heatmap
- Strong correlations list
- Correlation threshold slider
- Variable selection
- Statistical significance

#### 6. **Queries Tab**
- Monaco SQL editor
- Syntax highlighting
- Auto-completion
- Query history
- Saved queries
- Query templates
- Export results

#### 7. **AI Insights Tab**
- AI assistant chat
- Automated insights
  - Data quality issues
  - Anomaly detection
  - Pattern recognition
  - Recommendations
- Ask AI questions
- Insight categories

---

## 🔧 Backend Structure

### File Organization

\`\`\`
backend/app/api/v1/
├── analysis.py                  # Analysis endpoints (1000+ lines)
└── __init__.py

backend/app/models/
├── analysis.py                  # Analysis data models
└── __init__.py

backend/app/services/
├── duckdb_engine.py            # DuckDB query engine
├── stats_analyzer.py           # Statistical analysis
└── ai_insights.py              # AI-powered insights
\`\`\`

### Backend Endpoints

#### 1. **Dataset Processing** (`/process-dataset`)

**Method**: POST

**Purpose**: Upload and process dataset files

**Request**:
\`\`\`python
file: UploadFile                # Dataset file
fileId: str                     # Unique file identifier
projectId: str                  # Project identifier
storagePath: str (optional)     # Storage location
\`\`\`

**Response**:
\`\`\`python
{
    "success": True,
    "fileId": "dataset_123",
    "filename": "sales_data.csv",
    "rows": 10000,
    "columns": 25,
    "metadata": {
        "filename": "sales_data.csv",
        "uploadTime": "2025-01-07T12:00:00Z",
        "rows": 10000,
        "columns": 25,
        "size_mb": 2.5,
        "column_names": ["id", "name", "sales", ...],
        "data_types": {"id": "int64", "name": "object", ...},
        "missing_values": {"id": 0, "name": 5, ...},
        "numeric_columns": ["id", "sales", "quantity"],
        "categorical_columns": ["name", "category"],
        "datetime_columns": ["date"]
    }
}
\`\`\`

**Processing Steps**:
\`\`\`python
1. Read file (CSV, Excel, JSON, Parquet)
2. Validate dataset
   - Check if empty
   - Check size limit (1M rows)
3. Store in memory (datasets dict)
4. Create DuckDB table
5. Generate metadata
   - Column analysis
   - Data types
   - Missing values
   - Statistics
6. Store metadata in MongoDB
7. Return summary
\`\`\`

#### 2. **Data Preview** (`/data-preview`)

**Method**: GET

**Parameters**:
- `fileId`: Dataset identifier
- `page`: Page number (default: 1)
- `pageSize`: Rows per page (default: 50, max: 1000)

**Response**:
\`\`\`python
{
    "success": True,
    "data": {
        "columns": ["id", "name", "sales"],
        "rows": [[1, "Product A", 1500], [2, "Product B", 2000], ...],
        "pagination": {
            "page": 1,
            "pageSize": 50,
            "totalRows": 10000,
            "totalPages": 200,
            "hasNext": True,
            "hasPrev": False
        }
    }
}
\`\`\`

#### 3. **SQL Query Execution** (`/execute-query`)

**Method**: POST

**Request**:
\`\`\`python
{
    "fileId": "dataset_123",
    "query": "SELECT * FROM data WHERE sales > 1000 LIMIT 100",
    "page": 1,
    "pageSize": 50
}
\`\`\`

**Response**:
\`\`\`python
{
    "success": True,
    "result": {
        "columns": ["id", "name", "sales"],
        "rows": [[...], [...], ...],
        "rowCount": 856,
        "executionTime": 0.045,
        "pagination": {...}
    }
}
\`\`\`

**DuckDB Integration**:
\`\`\`python
# Get DuckDB connection for dataset
conn = get_duckdb_connection(fileId)

# Execute query
result = conn.execute(query).fetchdf()

# Apply pagination
start = (page - 1) * pageSize
end = start + pageSize
paginated = result.iloc[start:end]

return {
    "columns": paginated.columns.tolist(),
    "rows": paginated.values.tolist(),
    "rowCount": len(result),
    ...
}
\`\`\`

#### 4. **Statistical Summary** (`/statistical-summary`)

**Method**: GET

**Parameters**: `fileId`

**Response**:
\`\`\`python
{
    "success": True,
    "summary": {
        "numeric": {
            "sales": {
                "count": 9995,
                "mean": 2458.32,
                "std": 1254.67,
                "min": 100.0,
                "25%": 1250.0,
                "50%": 2400.0,
                "75%": 3500.0,
                "max": 9999.0
            },
            ...
        },
        "categorical": {
            "category": {
                "count": 10000,
                "unique": 12,
                "top": "Electronics",
                "freq": 2500
            },
            ...
        },
        "overall": {
            "total_rows": 10000,
            "total_columns": 25,
            "memory_usage_mb": 2.5,
            "missing_percentage": 0.5
        }
    }
}
\`\`\`

#### 5. **Correlation Analysis** (`/correlation-analysis`)

**Method**: POST

**Request**:
\`\`\`python
{
    "fileId": "dataset_123",
    "columns": ["sales", "quantity", "price"]  # Optional: specific columns
}
\`\`\`

**Response**:
\`\`\`python
{
    "success": True,
    "correlations": {
        "matrix": [
            [1.0, 0.85, 0.62],
            [0.85, 1.0, 0.54],
            [0.62, 0.54, 1.0]
        ],
        "columns": ["sales", "quantity", "price"],
        "strongCorrelations": [
            {
                "col1": "sales",
                "col2": "quantity",
                "correlation": 0.85,
                "strength": "strong"
            },
            ...
        ]
    }
}
\`\`\`

**Calculation**:
\`\`\`python
# Get numeric columns
numeric_df = df.select_dtypes(include=[np.number])

# Calculate correlation matrix
corr_matrix = numeric_df.corr()

# Find strong correlations (|r| > 0.7)
strong_corr = []
for i in range(len(columns)):
    for j in range(i+1, len(columns)):
        corr_value = corr_matrix.iloc[i, j]
        if abs(corr_value) > 0.7:
            strong_corr.append({
                "col1": columns[i],
                "col2": columns[j],
                "correlation": corr_value,
                "strength": "strong" if abs(corr_value) > 0.8 else "moderate"
            })
\`\`\`

#### 6. **AI Insights** (`/ai-insights`)

**Method**: POST

**Request**:
\`\`\`python
{
    "fileId": "dataset_123",
    "analysisType": "general" | "anomaly" | "patterns" | "recommendations"
}
\`\`\`

**Response**:
\`\`\`python
{
    "success": True,
    "insights": [
        {
            "type": "data_quality",
            "severity": "warning",
            "title": "Missing Values Detected",
            "description": "Column 'email' has 15% missing values (1500 out of 10000 rows)",
            "recommendation": "Consider imputing or removing rows with missing email values"
        },
        {
            "type": "pattern",
            "severity": "info",
            "title": "Strong Correlation Found",
            "description": "Sales and quantity show strong positive correlation (r=0.85)",
            "recommendation": "These variables move together predictably"
        },
        {
            "type": "anomaly",
            "severity": "error",
            "title": "Outliers Detected",
            "description": "12 extreme outliers found in 'price' column",
            "recommendation": "Review and potentially cap or remove outlier values"
        }
    ],
    "summary": "Dataset has good quality with minor issues in 2 columns"
}
\`\`\`

**AI Processing with Groq**:
\`\`\`python
# Prepare data summary
data_summary = {
    "rows": len(df),
    "columns": list(df.columns),
    "dtypes": df.dtypes.to_dict(),
    "missing": df.isnull().sum().to_dict(),
    "stats": df.describe().to_dict()
}

# Call Groq API
prompt = f"""
Analyze this dataset and provide insights:
{json.dumps(data_summary, indent=2)}

Provide insights about:
1. Data quality issues
2. Patterns and correlations
3. Anomalies or outliers
4. Recommendations for analysis
"""

response = groq_client.chat.completions.create(
    model="llama-3.1-70b-versatile",
    messages=[{"role": "user", "content": prompt}],
    temperature=0.3
)

# Parse AI response into structured insights
insights = parse_ai_response(response.choices[0].message.content)
\`\`\`

#### 7. **Chart Data Generation** (`/generate-chart-data`)

**Method**: POST

**Request**:
\`\`\`python
{
    "fileId": "dataset_123",
    "chartType": "bar" | "line" | "pie" | "scatter" | "area",
    "xAxis": "category",
    "yAxis": "sales",
    "aggregation": "sum" | "mean" | "count",
    "filters": {...}
}
\`\`\`

**Response**:
\`\`\`python
{
    "success": True,
    "chartData": [
        {"name": "Electronics", "value": 125000},
        {"name": "Clothing", "value": 98000},
        {"name": "Food", "value": 156000},
        ...
    ],
    "metadata": {
        "totalRecords": 10000,
        "filteredRecords": 10000,
        "aggregationType": "sum",
        "xAxisLabel": "Category",
        "yAxisLabel": "Total Sales"
    }
}
\`\`\`

**Data Processing**:
\`\`\`python
# Apply filters
filtered_df = df.copy()
for column, value in filters.items():
    filtered_df = filtered_df[filtered_df[column] == value]

# Group and aggregate
if chartType in ['bar', 'line', 'area']:
    grouped = filtered_df.groupby(xAxis)[yAxis].agg(aggregation)
    chart_data = [
        {"name": name, "value": value}
        for name, value in grouped.items()
    ]
elif chartType == 'pie':
    # Count frequency
    value_counts = filtered_df[xAxis].value_counts()
    chart_data = [
        {"name": name, "value": count}
        for name, count in value_counts.items()
    ]
elif chartType == 'scatter':
    # Return x, y pairs
    chart_data = [
        {"x": row[xAxis], "y": row[yAxis]}
        for _, row in filtered_df.iterrows()
    ]

return chart_data
\`\`\`

---

## 🗄️ Database Schema

### MongoDB Collections

#### 1. `datasets_metadata` Collection

**Purpose**: Store dataset metadata and analysis results

**Schema**:
\`\`\`typescript
{
  _id: string;                      // File ID
  datasetId: string;                // Dataset identifier
  filename: string;                 // Original filename
  fileId: string;                   // Unique file ID
  projectId: string;                // Project ID
  uploadTime: Date;                 // Upload timestamp
  createdAt: Date;
  updatedAt: Date;

  // Dataset info
  rows: number;                     // Row count
  columns: number;                  // Column count
  size_mb: number;                  // File size in MB
  column_names: string[];           // Column names
  data_types: {                     // Column types
    [column: string]: string;
  };
  missing_values: {                 // Missing value counts
    [column: string]: number;
  };
  numeric_columns: string[];        // Numeric column names
  categorical_columns: string[];    // Categorical column names
  datetime_columns: string[];       // Datetime column names

  // Analysis results
  statistical_summary?: any;        // Statistical summary
  correlation_matrix?: number[][];  // Correlation matrix
  ai_insights?: Array<{             // AI-generated insights
    type: string;
    severity: string;
    title: string;
    description: string;
    recommendation: string;
  }>;

  // Session data
  custom_charts?: ChartConfig[];    // Saved charts
  query_history?: QueryHistory[];   // SQL query history
  cleaning_operations?: any[];      // Applied cleaning operations
  transformations?: TransformationRule[];  // Applied transformations
}
\`\`\`

**Indexes**:
\`\`\`javascript
db.datasets_metadata.createIndex({ datasetId: 1 }, { unique: true });
db.datasets_metadata.createIndex({ projectId: 1 });
db.datasets_metadata.createIndex({ uploadTime: -1 });
\`\`\`

**Example Document**:
\`\`\`json
{
  "_id": "dataset_65a1b2c3d4e5f6",
  "datasetId": "dataset_65a1b2c3d4e5f6",
  "filename": "sales_data_2023.csv",
  "fileId": "dataset_65a1b2c3d4e5f6",
  "projectId": "proj_123",
  "uploadTime": "2025-01-07T10:30:00Z",
  "createdAt": "2025-01-07T10:30:00Z",
  "updatedAt": "2025-01-07T12:45:00Z",
  "rows": 10000,
  "columns": 25,
  "size_mb": 2.5,
  "column_names": ["id", "date", "product", "category", "sales", "quantity", "price"],
  "data_types": {
    "id": "int64",
    "date": "datetime64[ns]",
    "product": "object",
    "category": "object",
    "sales": "float64",
    "quantity": "int64",
    "price": "float64"
  },
  "missing_values": {
    "id": 0,
    "date": 0,
    "product": 5,
    "category": 0,
    "sales": 12,
    "quantity": 0,
    "price": 8
  },
  "numeric_columns": ["id", "sales", "quantity", "price"],
  "categorical_columns": ["product", "category"],
  "datetime_columns": ["date"],
  "statistical_summary": {
    "sales": {
      "count": 9988,
      "mean": 2458.32,
      "std": 1254.67,
      "min": 100.0,
      "max": 9999.0
    }
  },
  "correlation_matrix": [[1.0, 0.85], [0.85, 1.0]],
  "ai_insights": [
    {
      "type": "data_quality",
      "severity": "warning",
      "title": "Missing Values in 'product' column",
      "description": "0.05% of values are missing",
      "recommendation": "Review and handle missing product names"
    }
  ],
  "custom_charts": [
    {
      "id": "chart_1",
      "type": "bar",
      "title": "Sales by Category",
      "xAxis": "category",
      "yAxis": "sales"
    }
  ],
  "query_history": [
    {
      "id": "q_1",
      "query": "SELECT category, SUM(sales) FROM data GROUP BY category",
      "timestamp": "2025-01-07T11:00:00Z",
      "executionTime": 0.042
    }
  ]
}
\`\`\`

#### 2. `analysis_sessions` Collection

**Purpose**: Store analysis session state

**Schema**:
\`\`\`typescript
{
  _id: ObjectId;
  sessionId: string;
  userId: string;
  datasetId: string;
  startTime: Date;
  lastActivity: Date;

  // Session state
  activeTab: string;
  appliedFilters: any;
  currentQuery: string;
  selectedColumns: string[];

  // Charts
  charts: ChartConfig[];

  // History
  actions: Array<{
    type: string;
    timestamp: Date;
    details: any;
  }>;
}
\`\`\`

---

## 📊 Chart Types

### Supported Visualizations

#### 1. **Bar Chart**
- Vertical bars
- Grouped/stacked bars
- Custom colors
- Tooltips with value display
- Axis labels

**Use Cases**:
- Category comparisons
- Sales by region
- Product performance

**Data Format**:
\`\`\`json
[
  { "name": "Category A", "value": 4000 },
  { "name": "Category B", "value": 3000 },
  { "name": "Category C", "value": 2000 }
]
\`\`\`

#### 2. **Line Chart**
- Time series visualization
- Multiple lines support
- Trend analysis
- Smooth curves option
- Grid lines

**Use Cases**:
- Temporal trends
- Stock prices
- User growth

**Data Format**:
\`\`\`json
[
  { "date": "2023-01", "sales": 4000, "profit": 2400 },
  { "date": "2023-02", "sales": 3000, "profit": 1398 },
  { "date": "2023-03", "sales": 2000, "profit": 9800 }
]
\`\`\`

#### 3. **Pie Chart** ✅ (Now Colorful!)
- Percentage distribution
- Color-coded slices
- Labels with percentages
- Interactive tooltips

**Colors**: Blue, Green, Orange, Red, Purple, Cyan, Lime, Orange
\`\`\`javascript
const professionalColors = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#06b6d4', '#84cc16', '#f97316'
];
\`\`\`

**Use Cases**:
- Market share
- Budget allocation
- Category distribution

#### 4. **Donut Chart** ✅ (Now Colorful!)
- Similar to pie chart with center hole
- Colorful segments
- Better for displaying percentage

**Colors**: Blue, Green, Orange, Red, Purple, Cyan
\`\`\`javascript
const donutColors = [
  '#3b82f6', '#10b981', '#f59e0b',
  '#ef4444', '#8b5cf6', '#06b6d4'
];
\`\`\`

#### 5. **Scatter Plot**
- X-Y coordinate plotting
- Correlation visualization
- Bubble chart variant
- Custom point colors

**Use Cases**:
- Correlation analysis
- Outlier detection
- Cluster identification

#### 6. **Area Chart**
- Filled line chart
- Stacked area option
- Gradient fills
- Cumulative visualization

**Use Cases**:
- Cumulative totals
- Part-to-whole over time
- Volume trends

#### 7. **Column Chart**
- Horizontal bar chart
- Good for long labels
- Multi-series support

#### 8. **Heatmap**
- Color-coded grid
- Intensity visualization
- Correlation matrices

**Use Cases**:
- Correlation matrices
- Density visualization
- Pattern recognition

---

## 🤖 AI Integration

### AI-Powered Features

#### 1. **Automated Insights**
- Data quality assessment
- Pattern recognition
- Anomaly detection
- Correlation discovery

**Groq API Integration**:
\`\`\`python
groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))

response = groq_client.chat.completions.create(
    model="llama-3.1-70b-versatile",
    messages=[
        {
            "role": "system",
            "content": "You are a data analysis expert..."
        },
        {
            "role": "user",
            "content": f"Analyze this dataset: {data_summary}"
        }
    ],
    temperature=0.3,
    max_tokens=2000
)
\`\`\`

#### 2. **Natural Language Queries**
- Convert English to SQL
- Query suggestions
- Error explanations

**Example**:
\`\`\`
User: "Show me total sales by category"
AI: "SELECT category, SUM(sales) FROM data GROUP BY category"
\`\`\`

#### 3. **Smart Recommendations**
- Chart type suggestions
- Column pairing recommendations
- Cleaning operation suggestions

#### 4. **Anomaly Detection**
- Statistical outlier detection
- Pattern deviation alerts
- Data quality warnings

---

## 🔄 Data Flow

### Complete Analysis Flow

\`\`\`
1. User Uploads Dataset
   ↓
2. Frontend: File validation
   ↓
3. POST /api/analysis/process
   ↓
4. Backend: Process file
   - Read CSV/Excel/JSON/Parquet
   - Validate data
   - Store in memory
   - Create DuckDB table
   ↓
5. Backend: Generate metadata
   - Analyze columns
   - Calculate statistics
   - Detect data types
   ↓
6. Backend: Save to MongoDB
   ↓
7. Frontend: Load dataset
   - Fetch preview
   - Display statistics
   - Enable analysis tools
   ↓
8. User Interacts
   - Create charts
   - Run queries
   - Get AI insights
   - Clean data
   ↓
9. Backend: Process requests
   - Execute SQL queries
   - Generate chart data
   - Run AI analysis
   ↓
10. Frontend: Update UI
   - Display results
   - Update visualizations
   - Show insights
\`\`\`

---

## 🚀 Deployment

### Environment Variables

**Frontend (.env.local)**:
\`\`\`bash
# MongoDB
MONGODB_URI=mongodb+srv://...
MONGODB_DB_NAME=engunity-ai

# Backend
BACKEND_URL=http://localhost:8000
API_KEY=your_api_key

# Optional
GROQ_API_KEY=gsk_xxx...
\`\`\`

**Backend (.env)**:
\`\`\`bash
# MongoDB
MONGO_URI=mongodb://localhost:27017/engunity-ai

# Groq AI
GROQ_API_KEY=gsk_xxx...

# Server
HOST=0.0.0.0
PORT=8000
\`\`\`

### Startup

**Frontend**:
\`\`\`bash
cd frontend
npm install
npm run dev
# http://localhost:3000/dashboard/analysis
\`\`\`

**Backend**:
\`\`\`bash
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
\`\`\`

---

## 📚 Additional Features

### PDF Export
- Simple PDF template
- Professional PDF template
- Chart image capture
- Custom styling

### Session Persistence
- Auto-save analysis state
- Resume sessions
- Share analysis links

### Collaborative Features
- Multi-user support
- Real-time updates
- Shared datasets

---

**Last Updated**: January 7, 2025
**Version**: 1.0.0
**File Size**: 5092 lines (Main page)
**Maintainer**: Engunity AI Team
