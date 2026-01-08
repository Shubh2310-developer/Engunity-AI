# Document Auto-Processing Setup Guide

## Overview

This guide explains how to set up and use the new **automatic document processing** features that were implemented based on the [DOCUMENT_FEATURES_RESEARCH.md](development/DOCUMENT_FEATURES_RESEARCH.md) requirements.

### What Happens When You Upload a Document

When a user uploads a document (PDF, DOCX, TXT, MD), the system now automatically:

1. **Extracts Enhanced Metadata** (2-3 seconds)
   - Word count, page count, reading time
   - Language detection
   - Complexity score

2. **Generates Intelligent Summary** (5 seconds)
   - Executive summary (1 paragraph)
   - Key points (5-10 bullets)
   - Uses Groq LLM (llama-3.3-70b-versatile)

3. **Extracts Entities** (3-5 seconds)
   - People, organizations, locations
   - Dates, money amounts
   - Products, technologies
   - Uses spaCy NER (en_core_web_sm)

4. **Classifies Document** (2 seconds)
   - Document type (report, contract, proposal, etc.)
   - Industry/domain
   - Main topics (5-7 keywords)
   - Sentiment analysis
   - Uses Groq LLM

5. **Analyzes Visual Elements** (5-10 seconds, PDF only)
   - Detects images, charts, tables
   - Counts visual elements
   - Identifies pages with visuals

### Total Processing Time
- **15-30 seconds** for a typical document
- Runs in background (non-blocking)
- User sees real-time progress

---

## Installation

### Step 1: Install Python Dependencies

```bash
# Navigate to backend directory
cd backend

# Install spaCy and download English model
pip install spacy>=3.7.0
python -m spacy download en_core_web_sm

# Or install from requirements file
pip install -r requirements-document-processing.txt
```

### Step 2: Verify Environment Variables

Ensure your `.env` file has the required API key:

```bash
# Required for summarization and classification
GROQ_API_KEY=your_groq_api_key_here

# MongoDB (already configured)
MONGODB_URI=mongodb://localhost:27017/
MONGODB_DB_NAME=engunity_ai
```

### Step 3: Verify spaCy Installation

```bash
# Test spaCy model
python -c "import spacy; nlp = spacy.load('en_core_web_sm'); print('✅ spaCy model loaded successfully')"
```

If you see the success message, you're ready to go!

---

## Usage

### Backend API

The auto-processing happens automatically when you upload a document:

```python
# POST /api/documents/upload
#
# The upload endpoint now:
# 1. Saves document to MongoDB
# 2. Triggers background auto-processing
# 3. Returns immediately with processing_status="processing"

# Response:
{
  "success": true,
  "doc_id": "doc_abc123",
  "filename": "report.pdf",
  "message": "Document uploaded successfully. AI processing started (summary, entities, classification).",
  "processing_status": "processing"
}
```

### Check Processing Status

```python
# GET /api/documents/{doc_id}/status
#
# Returns real-time processing status

# Response:
{
  "doc_id": "doc_abc123",
  "processing_status": "ready",  # pending, processing, ready, failed
  "progress": 100,  # 0-100
  "has_summary": true,
  "has_key_points": true,
  "has_entities": true,
  "has_topics": true,
  "metadata": {
    "word_count": 5234,
    "page_count": 15,
    "reading_time": 26.2,
    "document_type": "technical_report",
    "topics": ["AI", "machine learning", "document processing"]
  }
}
```

### Get Full Document Data

```python
# GET /api/documents/{doc_id}
#
# Returns complete document with all auto-processed data

# Response includes:
{
  "doc_id": "doc_abc123",
  "filename": "report.pdf",
  "processing_status": "ready",

  # Auto-generated summary
  "summary": "This technical report discusses...",
  "key_points": [
    "Machine learning models achieve 95% accuracy",
    "Processing time reduced by 60%",
    "Cost savings of $100K annually"
  ],

  # Auto-extracted entities
  "extracted_entities": {
    "people": ["Dr. John Smith", "Jane Doe"],
    "organizations": ["Engunity AI", "OpenAI", "Google"],
    "locations": ["San Francisco", "New York"],
    "dates": ["2024", "Q1 2025"],
    "money": ["$100,000", "$2.5M"],
    "technologies": ["Python", "FastAPI", "GPT-4", "spaCy"]
  },

  # Auto-classified metadata
  "metadata": {
    "word_count": 5234,
    "page_count": 15,
    "reading_time_minutes": 26.2,
    "document_type": "technical_report",
    "industry": "technology",
    "topics": ["AI", "machine learning", "NLP"],
    "sentiment": "positive",
    "complexity_score": 0.72
  },

  # Auto-generated tags
  "tags": ["AI", "machine learning", "NLP", "document processing"],

  # Visual analysis (PDF only)
  "visual_elements": {
    "has_images": true,
    "image_count": 12,
    "has_tables": true,
    "table_count": 3,
    "pages_with_visuals": [3, 5, 7, 9]
  }
}
```

---

## Frontend Integration

The frontend automatically polls for processing status and displays:

### Upload Progress Stages

1. **Uploading file...** (0-20%)
2. **Indexing for Q&A...** (20-60%)
3. **Extracting metadata & entities...** (60-80%)
4. **Generating summary & extracting entities...** (80-95%)
5. **Complete!** (100%)

### Success Indicators

When complete, users see badges showing:
- ✓ Summary generated
- ✓ Entities extracted
- ✓ 5 topics identified

### Document Details Display

```
📄 Annual_Report_2024.pdf
2.4 MB • 15 pages • 5,234 words • 26 min read
Type: financial_report • Topics: revenue, growth, strategy
```

---

## Architecture

### Processing Pipeline

```
User Upload
    ↓
FastAPI Upload Endpoint
    ↓
Save to MongoDB (basic metadata)
    ↓
Trigger Background Task ← Returns immediately to user
    ↓
DocumentAutoProcessor.process_document()
    ├── Extract text (PyPDF2/python-docx)
    ├── Extract metadata (word count, pages, complexity)
    ├── Generate summary (Groq LLM)
    ├── Extract entities (spaCy NER)
    ├── Classify document (Groq LLM)
    └── Analyze visuals (PyPDF2)
    ↓
Update MongoDB with enriched data
    ↓
Status = "ready"
```

### Background Task Processing

- Uses FastAPI `BackgroundTasks`
- Non-blocking (user doesn't wait)
- Async processing
- Error handling with status updates
- Graceful degradation (processing continues even if user closes browser)

---

## Implementation Files

### Backend

1. **`backend/app/services/document_auto_processor.py`** (NEW)
   - Main auto-processing service
   - 600+ lines of code
   - Handles all AI enrichment

2. **`backend/app/routes/document_routes.py`** (UPDATED)
   - Added `BackgroundTasks` to upload endpoint
   - Added `/status` endpoint for polling
   - Triggers auto-processing on upload

3. **`backend/app/models/document_models.py`** (EXISTING)
   - Already had all required fields
   - No changes needed

4. **`backend/app/services/document_service.py`** (EXISTING)
   - MongoDB operations
   - No changes needed

### Frontend

1. **`frontend/src/lib/api/documents.ts`** (UPDATED)
   - Added `getDocumentStatus()` function
   - Polls backend for processing status

2. **`frontend/src/app/dashboard/documents/upload/page.tsx`** (UPDATED)
   - Added processing stages display
   - Added status polling logic
   - Shows enriched metadata on completion

---

## Testing

### Test Auto-Processing

1. **Start the backend server:**
   ```bash
   cd backend
   uvicorn app.main:app --reload --port 8000
   ```

2. **Upload a test document:**
   ```bash
   curl -X POST "http://localhost:8000/api/documents/upload" \
     -F "file=@test_document.pdf" \
     -F "user_id=test_user" \
     -F "category=technical"
   ```

3. **Check processing status:**
   ```bash
   # Replace {doc_id} with the doc_id from upload response
   curl "http://localhost:8000/api/documents/{doc_id}/status"
   ```

4. **Wait 15-30 seconds, then check again:**
   ```bash
   curl "http://localhost:8000/api/documents/{doc_id}/status"
   ```

5. **Get full enriched document:**
   ```bash
   curl "http://localhost:8000/api/documents/{doc_id}"
   ```

### Expected Results

You should see:
- ✅ `summary`: 2-3 sentence executive summary
- ✅ `key_points`: 5-10 bullet points
- ✅ `extracted_entities`: People, orgs, locations, dates, money
- ✅ `metadata.document_type`: Classified type (e.g., "technical_report")
- ✅ `metadata.topics`: 5-7 main topics
- ✅ `metadata.word_count`: Actual word count
- ✅ `metadata.page_count`: Actual page count
- ✅ `metadata.reading_time_minutes`: Estimated reading time
- ✅ `tags`: Auto-generated tags from topics

### Test with Frontend

1. **Start frontend dev server:**
   ```bash
   cd frontend
   npm run dev
   ```

2. **Navigate to:** `http://localhost:3000/dashboard/documents/upload`

3. **Upload a PDF/DOCX file**

4. **Watch the progress:**
   - Should show: "Uploading file..."
   - Then: "Indexing for Q&A..."
   - Then: "Extracting metadata & entities..."
   - Then: "Generating summary & extracting entities..."
   - Finally: "Complete!" with badges

5. **Verify enriched metadata displayed:**
   - Word count
   - Reading time
   - Document type
   - Topics
   - Summary/entities badges

---

## Troubleshooting

### spaCy Model Not Found

```
Error: [E050] Can't find model 'en_core_web_sm'
```

**Solution:**
```bash
python -m spacy download en_core_web_sm
```

### Groq API Key Missing

```
Error: GROQ_API_KEY environment variable not set
```

**Solution:**
Add to `.env`:
```
GROQ_API_KEY=your_actual_api_key_here
```

### Processing Takes Too Long

- Normal processing: 15-30 seconds
- If > 60 seconds, check:
  - Groq API rate limits
  - Document size (should be < 50MB)
  - Network connectivity

### Processing Status Stuck on "processing"

- Check backend logs for errors
- Verify spaCy model is installed
- Verify Groq API key is valid
- Check MongoDB connection

---

## Performance & Costs

### Processing Times (Typical)

| Feature | Time |
|---------|------|
| Metadata extraction | 1-2s |
| Summary generation | 3-5s |
| Entity extraction | 2-4s |
| Document classification | 2-3s |
| Visual analysis | 2-5s |
| **Total** | **10-20s** |

### API Costs (Groq)

- Summary: ~500 tokens input, 200 tokens output
- Classification: ~500 tokens input, 100 tokens output
- Key points: ~500 tokens input, 300 tokens output
- **Total per document:** ~3000 tokens
- **Cost:** $0.01-0.02 per document (Groq pricing)

### Resource Usage

- CPU: Moderate (spaCy NER)
- Memory: ~200-500 MB per document
- Network: 2-3 API calls to Groq

---

## Next Steps

### Implemented (Tier 1 - P0)
- ✅ Intelligent Summarization
- ✅ Enhanced Metadata Extraction
- ✅ Entity Recognition & Extraction
- ✅ Document Classification
- ✅ Basic Visual Analysis

### To Implement (Tier 2 - P1)
- ⬜ Advanced Visual Analysis (GPT-4o Vision for chart/table extraction)
- ⬜ Multi-Document Synthesis
- ⬜ Document Comparison & Versioning
- ⬜ Smart Templates & Generation
- ⬜ Collaboration & Annotations (real-time)

### To Implement (Tier 3 - P2+)
- ⬜ Compliance & Security (PII redaction)
- ⬜ Agentic Workflows
- ⬜ Knowledge Graphs
- ⬜ Advanced Analytics Dashboard

---

## Support

For issues or questions:
1. Check backend logs: `backend/logs/`
2. Check frontend console
3. Review this documentation
4. Check research document: [DOCUMENT_FEATURES_RESEARCH.md](development/DOCUMENT_FEATURES_RESEARCH.md)

---

**Version:** 1.0.0
**Date:** November 11, 2025
**Author:** Engunity AI Team
