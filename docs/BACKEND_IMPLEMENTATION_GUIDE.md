# Complete Backend Implementation Guide
## Document Intelligence System

**Status**: Foundation Complete ✅
**Next Steps**: API Routes → Frontend Integration → Testing

---

## ✅ Completed

### 1. MongoDB Schemas (`backend/app/models/document_models.py`)
- **Document**: Complete document model with metadata, versioning, annotations
- **DocumentMetadata**: AI-extracted metadata (entities, topics, sentiment)
- **DocumentAnalytics**: Usage tracking, performance metrics
- **ChatSession**: Q&A session management
- **DocumentComparison**: Semantic comparison results
- **DocumentAnnotation**: Collaboration features
- **UserDocumentPreferences**: User settings

### 2. Database Service (`backend/app/services/document_service.py`)
- MongoDB connection with connection pooling
- CRUD operations for all models
- Analytics tracking (views, questions, confidence)
- Dashboard statistics aggregation
- Chat session management
- Annotation operations
- Indexes for performance

---

## 🔨 Implementation Steps

### Phase 1: API Routes (Priority: HIGH)

Create `/home/shahs/Engunity-AI/backend/app/routes/document_routes.py`:

```python
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from typing import List, Optional
import hashlib
from datetime import datetime

from backend.app.services.document_service import get_document_db
from backend.app.models.document_models import Document, DocumentMetadata

router = APIRouter(prefix="/api/documents", tags=["documents"])
db = get_document_db()

@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    user_id: str = Form(...),
    session_id: Optional[str] = Form(None),
    category: Optional[str] = Form(None)
):
    """Upload and process a document"""
    # Implementation here

@router.get("/{doc_id}")
async def get_document(doc_id: str):
    """Get document by ID"""
    # Implementation here

@router.get("/user/{user_id}")
async def get_user_documents(
    user_id: str,
    skip: int = 0,
    limit: int = 50,
    category: Optional[str] = None
):
    """Get all documents for a user"""
    # Implementation here

@router.put("/{doc_id}")
async def update_document(doc_id: str, updates: dict):
    """Update document metadata"""
    # Implementation here

@router.delete("/{doc_id}")
async def delete_document(doc_id: str):
    """Delete a document"""
    # Implementation here

@router.post("/{doc_id}/view")
async def track_view(doc_id: str):
    """Track document view"""
    await db.increment_view_count(doc_id)
    return {"status": "success"}

@router.get("/stats/dashboard/{user_id}")
async def get_dashboard_stats(user_id: str):
    """Get dashboard statistics"""
    stats = await db.get_dashboard_stats(user_id)
    return stats
```

### Phase 2: Document Processing Service

Create `/home/shahs/Engunity-AI/backend/app/services/document_processor.py`:

```python
import os
from groq import Groq
import spacy

class DocumentProcessor:
    def __init__(self):
        self.groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))
        self.nlp = spacy.load("en_core_web_sm")  # Or en_core_web_lg

    async def generate_summary(self, text: str, summary_type="executive"):
        """Generate document summary"""
        prompts = {
            "executive": "Provide a concise 1-paragraph executive summary...",
            "key_points": "Extract 5-10 key points as bullets...",
            "detailed": "Create comprehensive multi-level summary..."
        }

        response = self.groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": "You are a professional document analyst."},
                {"role": "user", "content": f"{prompts[summary_type]}\n\nDocument:\n{text[:8000]}"}
            ],
            temperature=0.3
        )

        return response.choices[0].message.content

    async def extract_metadata(self, text: str, filename: str):
        """Extract document metadata using LLM"""
        prompt = f"""Analyze this document and extract:
        1. Document type (report, contract, proposal, etc.)
        2. Main topics (5-7 keywords)
        3. Key entities (people, organizations, locations)
        4. Important dates
        5. Industry/domain

        Return as JSON.

        Filename: {filename}
        Text: {text[:4000]}
        """

        response = self.groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": "You are a metadata extraction expert. Return valid JSON only."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.1
        )

        import json
        return json.loads(response.choices[0].message.content)

    async def extract_entities(self, text: str):
        """Extract named entities using spaCy"""
        doc = self.nlp(text[:100000])

        entities = {
            "people": [],
            "organizations": [],
            "locations": [],
            "dates": [],
            "money": []
        }

        for ent in doc.ents:
            if ent.label_ == "PERSON":
                entities["people"].append(ent.text)
            elif ent.label_ == "ORG":
                entities["organizations"].append(ent.text)
            elif ent.label_ == "GPE":
                entities["locations"].append(ent.text)
            elif ent.label_ == "DATE":
                entities["dates"].append(ent.text)
            elif ent.label_ == "MONEY":
                entities["money"].append(ent.text)

        # Deduplicate
        return {k: list(set(v)) for k, v in entities.items()}
```

### Phase 3: Frontend Integration

Update frontend API calls to use new backend:

```typescript
// frontend/src/lib/api/documents.ts

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function uploadDocument(file: File, userId: string) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('user_id', userId);

  const response = await fetch(`${API_BASE}/api/documents/upload`, {
    method: 'POST',
    body: formData,
  });

  return response.json();
}

export async function getUserDocuments(userId: string, filters?: any) {
  const params = new URLSearchParams({
    skip: '0',
    limit: '50',
    ...filters
  });

  const response = await fetch(
    `${API_BASE}/api/documents/user/${userId}?${params}`
  );

  return response.json();
}

export async function getDashboardStats(userId: string) {
  const response = await fetch(
    `${API_BASE}/api/documents/stats/dashboard/${userId}`
  );

  return response.json();
}
```

### Phase 4: Testing Checklist

#### Unit Tests
- [ ] Test MongoDB connection
- [ ] Test document CRUD operations
- [ ] Test analytics tracking
- [ ] Test chat session management

#### API Tests (use Thunder Client/Postman)
- [ ] POST /api/documents/upload - Upload PDF
- [ ] GET /api/documents/{doc_id} - Retrieve document
- [ ] GET /api/documents/user/{user_id} - List user documents
- [ ] PUT /api/documents/{doc_id} - Update document
- [ ] DELETE /api/documents/{doc_id} - Delete document
- [ ] GET /api/documents/stats/dashboard/{user_id} - Get stats
- [ ] POST /api/documents/{doc_id}/view - Track view
- [ ] POST /api/chat/ask - Ask question (existing RAG server)

#### Integration Tests
- [ ] Frontend → Backend upload flow
- [ ] Document list display with real data
- [ ] Analytics dashboard with real metrics
- [ ] Q&A with confidence tracking
- [ ] Search and filter functionality

#### End-to-End Tests
- [ ] User uploads document → processes → appears in list
- [ ] User clicks document → increments view count
- [ ] User asks question → saves to analytics
- [ ] Dashboard shows accurate statistics
- [ ] Search finds correct documents

---

## 📊 Database Schema Reference

### documents collection
```javascript
{
  _id: ObjectId,
  doc_id: "doc_abc123",
  user_id: "user_456",
  filename: "report.pdf",
  original_filename: "Annual Report.pdf",
  upload_date: ISODate("2024-11-11"),
  file_hash: "sha256_hash",
  cloudinary_url: "https://...",
  text_content: "Full document text...",
  chunk_count: 45,
  metadata: {
    word_count: 5000,
    page_count: 15,
    file_type: "pdf",
    document_type: "report",
    topics: ["AI", "Technology"],
    entities: {...}
  },
  category: "technical",
  tags: ["research", "2024"],
  processing_status: "ready",
  view_count: 124,
  question_count: 32,
  avg_confidence: 0.92
}
```

### document_analytics collection
```javascript
{
  _id: ObjectId,
  document_id: "doc_abc123",
  user_id: "user_456",
  views: 124,
  questions_asked: 32,
  avg_confidence_score: 0.92,
  avg_response_time_ms: 850,
  time_saved_hours: 2.5,
  popular_topics: ["revenue", "growth"],
  last_accessed: ISODate("2024-11-11")
}
```

---

## 🚀 Quick Start Commands

```bash
# Install Python dependencies
cd backend
pip install -r requirements.txt
python -m spacy download en_core_web_sm

# Set environment variables
export MONGODB_URI="mongodb://localhost:27017/"
export MONGODB_DB_NAME="engunity_ai"
export GROQ_API_KEY="your_key_here"
export CLOUDINARY_CLOUD_NAME="your_cloud"
export CLOUDINARY_API_KEY="your_key"
export CLOUDINARY_API_SECRET="your_secret"

# Start document RAG server (existing)
cd backend/servers
python document_chat_rag.py

# Start main backend API (new)
cd backend
uvicorn app.main:app --reload --port 8000

# Frontend
cd frontend
npm run dev
```

---

## 🔍 Manual Testing Steps

### 1. Upload Document
```bash
curl -X POST http://localhost:8000/api/documents/upload \
  -F "file=@test.pdf" \
  -F "user_id=user_123" \
  -F "category=technical"
```

### 2. Get User Documents
```bash
curl http://localhost:8000/api/documents/user/user_123
```

### 3. Get Dashboard Stats
```bash
curl http://localhost:8000/api/documents/stats/dashboard/user_123
```

### 4. Ask Question (RAG Server)
```bash
curl -X POST http://localhost:8004/chat \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "test_session",
    "message": "What is this document about?",
    "doc_ids": ["doc_abc123"],
    "mode": "document-only"
  }'
```

---

## ✅ Success Criteria

### Tier 1 (Quick Wins) - COMPLETE THESE FIRST
- [x] MongoDB schemas created
- [x] Database service layer created
- [ ] Basic API routes implemented
- [ ] Document upload working
- [ ] Document list displaying
- [ ] Basic analytics tracking

### Tier 2 (Core Features)
- [ ] Document summarization
- [ ] Entity extraction
- [ ] Metadata extraction
- [ ] Full analytics dashboard
- [ ] Search and filtering

### Tier 3 (Advanced)
- [ ] Document comparison
- [ ] Version control
- [ ] Annotations
- [ ] Real-time collaboration

---

## 📝 Next Actions

1. **Implement API Routes** (2-3 hours)
   - Create `backend/app/routes/document_routes.py`
   - Add to FastAPI app
   - Test with Thunder Client

2. **Create Document Processor** (2-3 hours)
   - Implement summarization
   - Implement entity extraction
   - Integrate with upload flow

3. **Frontend Integration** (2-3 hours)
   - Create API client functions
   - Connect components to real APIs
   - Replace mock data

4. **Testing** (2-3 hours)
   - Manual API testing
   - Frontend → Backend flow
   - Fix bugs

**Total Estimated Time**: 8-12 hours

---

## 🎯 Current Status

**✅ Foundation Complete**
- MongoDB models defined
- Database service implemented
- Indexes created
- Analytics structure ready

**🔨 In Progress**
- API routes (next)
- Document processor (next)
- Frontend integration (after APIs)

**⏳ Pending**
- Testing suite
- Error handling
- Performance optimization
- Documentation

---

**Last Updated**: November 11, 2024
**Version**: 1.0
**Status**: Phase 1 Complete, Phase 2 Ready to Start
