# Complete Testing & QA Guide
## Document Intelligence System - End-to-End Testing

**Role**: Software Tester & QA Engineer
**Objective**: Verify all features work correctly across the entire stack
**Status**: Ready for Testing Phase

---

## 📋 Testing Phases

### Phase 1: Unit Testing ✅
### Phase 2: API Testing (In Progress)
### Phase 3: Integration Testing
### Phase 4: End-to-End Testing
### Phase 5: Performance Testing
### Phase 6: User Acceptance Testing

---

## 🧪 Phase 1: Backend Unit Tests

### Test MongoDB Connection
```bash
cd /home/shahs/Engunity-AI/backend
python -c "from app.services.document_service import get_document_db; db = get_document_db(); print('✅ MongoDB Connected')"
```

**Expected Output**: `✅ MongoDB Connected`

**❌ If Failed**:
- Check MongoDB is running: `sudo systemctl status mongod`
- Check `MONGODB_URI` in `.env`
- Start MongoDB: `sudo systemctl start mongod`

### Test Document Model Creation
```python
from backend.app.models.document_models import Document, DocumentMetadata

doc = Document(
    doc_id="test_doc_123",
    user_id="test_user",
    filename="test.pdf",
    original_filename="Test Document.pdf",
    file_hash="abc123",
    metadata=DocumentMetadata(
        file_size_bytes=1024,
        file_type="pdf",
        mime_type="application/pdf"
    )
)

print("✅ Document model created:", doc.doc_id)
```

---

## 🌐 Phase 2: API Testing

### Setup
```bash
# Terminal 1: Start Document RAG Server
cd /home/shahs/Engunity-AI/backend/servers
python document_chat_rag.py

# Terminal 2: Start Main API (if not already running)
cd /home/shahs/Engunity-AI/backend
uvicorn app.main:app --reload --port 8000

# Terminal 3: Start Frontend
cd /home/shahs/Engunity-AI/frontend
npm run dev
```

### Test 1: Health Check
```bash
curl http://localhost:8000/health
```
**Expected**: `{"status": "healthy"}`

### Test 2: Upload Document
```bash
curl -X POST http://localhost:8000/api/documents/upload \
  -F "file=@/path/to/test.pdf" \
  -F "user_id=test_user_123" \
  -F "category=technical"
```

**Expected Response**:
```json
{
  "success": true,
  "doc_id": "doc_abc123...",
  "filename": "test.pdf",
  "message": "Document uploaded successfully"
}
```

**✅ Pass Criteria**:
- Status code: 200
- `doc_id` is returned
- Document appears in MongoDB

**❌ Common Issues**:
- `500 Internal Server Error`: Check MongoDB connection
- `413 Payload Too Large`: File > 50MB (check server config)
- `400 Bad Request`: Missing required fields

### Test 3: Get User Documents
```bash
curl http://localhost:8000/api/documents/user/test_user_123
```

**Expected Response**:
```json
{
  "documents": [
    {
      "doc_id": "doc_abc123",
      "filename": "test.pdf",
      "upload_date": "2024-11-11T...",
      "processing_status": "ready",
      "view_count": 0,
      "question_count": 0
    }
  ],
  "total": 1
}
```

**✅ Pass Criteria**:
- Returns array of documents
- Document metadata is correct
- No sensitive data exposed

### Test 4: Get Document Details
```bash
curl http://localhost:8000/api/documents/doc_abc123
```

**✅ Pass Criteria**:
- Returns complete document object
- `view_count` incremented by 1
- All metadata fields present

### Test 5: Update Document
```bash
curl -X PUT http://localhost:8000/api/documents/doc_abc123 \
  -H "Content-Type: application/json" \
  -d '{
    "category": "product",
    "tags": ["requirements", "planning"],
    "summary": "This is a product requirements document"
  }'
```

**✅ Pass Criteria**:
- Status: 200
- Returns `{"success": true, "updated_fields": [...]}`
- Changes reflected in GET request

### Test 6: Get Dashboard Stats
```bash
curl http://localhost:8000/api/documents/stats/dashboard/test_user_123
```

**Expected Response**:
```json
{
  "totalDocuments": 5,
  "questionsAsked": 42,
  "avgConfidence": 87.5,
  "timeSaved": 2.1,
  "totalViews": 156
}
```

**✅ Pass Criteria**:
- All metrics present
- Numbers are realistic
- Stats update after interactions

### Test 7: Track View
```bash
curl -X POST http://localhost:8000/api/documents/doc_abc123/view
```

**✅ Pass Criteria**:
- Returns `{"success": true}`
- `view_count` incremented in database
- Analytics updated

### Test 8: RAG Q&A (Existing Server)
```bash
curl -X POST http://localhost:8004/chat \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "test_session_001",
    "message": "What is this document about?",
    "doc_ids": ["doc_abc123"],
    "mode": "document-only",
    "top_k": 5
  }'
```

**Expected Response**:
```json
{
  "response": "This document is about...",
  "confidence": 0.92,
  "sources": [
    {
      "page": 1,
      "chunk_text": "..."
    }
  ],
  "mode": "document-only"
}
```

**✅ Pass Criteria**:
- Response is relevant
- Confidence score between 0-1
- Sources are provided
- Response time < 5s

### Test 9: Delete Document
```bash
curl -X DELETE http://localhost:8000/api/documents/doc_abc123
```

**✅ Pass Criteria**:
- Status: 200
- Document removed from database
- Analytics removed
- ChromaDB collection cleaned up

---

## 🔗 Phase 3: Integration Testing

### Test 1: Complete Upload Flow
**Steps**:
1. Upload document via API
2. Wait for processing
3. Verify document status = "ready"
4. Verify ChromaDB collection created
5. Ask question via RAG
6. Verify analytics updated

**Python Script**:
```python
import requests
import time

# 1. Upload
with open('test.pdf', 'rb') as f:
    response = requests.post(
        'http://localhost:8000/api/documents/upload',
        files={'file': f},
        data={'user_id': 'test_user', 'category': 'technical'}
    )
    doc_id = response.json()['doc_id']
    print(f"✅ Uploaded: {doc_id}")

# 2. Wait for processing
time.sleep(3)

# 3. Check status
doc = requests.get(f'http://localhost:8000/api/documents/{doc_id}').json()
assert doc['processing_status'] == 'ready', "Processing failed"
print("✅ Document ready")

# 4. Ask question
qa_response = requests.post(
    'http://localhost:8004/chat',
    json={
        'session_id': 'test_session',
        'message': 'Summarize this document',
        'doc_ids': [doc_id],
        'mode': 'document-only'
    }
).json()
print(f"✅ Q&A works: {qa_response['response'][:100]}")

# 5. Check analytics
stats = requests.get(f'http://localhost:8000/api/documents/stats/dashboard/test_user').json()
assert stats['totalDocuments'] > 0, "Stats not updated"
print(f"✅ Analytics updated: {stats}")
```

### Test 2: Multi-Document Q&A
**Steps**:
1. Upload 3 documents
2. Ask cross-document question
3. Verify sources from multiple docs
4. Check response quality

### Test 3: Frontend → Backend Flow
**Manual Steps**:
1. Open `http://localhost:3000/dashboard/documents`
2. Click "Upload Document"
3. Select PDF file
4. Verify upload progress bar
5. Check document appears in list
6. Click document card
7. Verify document viewer opens
8. Ask question in chat
9. Verify response appears
10. Check dashboard stats updated

---

## 🎯 Phase 4: End-to-End Testing

### Scenario 1: New User Journey
**Steps**:
1. Sign in to dashboard
2. Navigate to Documents
3. Upload first document (PDF, 15 pages)
4. Wait for processing (< 30s)
5. Document appears with metadata
6. Click to open viewer
7. Ask 3 questions
8. Check confidence scores > 80%
9. Verify dashboard shows stats
10. Sign out

**✅ Success Criteria**:
- All steps complete without errors
- UI is responsive
- No console errors
- Data persists after refresh

### Scenario 2: Power User Workflow
**Steps**:
1. Upload 5 documents (mixed types)
2. Use search to find specific doc
3. Filter by category
4. Switch between grid/list view
5. Open document, ask complex question
6. View analytics dashboard
7. Export data (if implemented)

### Scenario 3: Collaboration Flow
**Steps**:
1. User A uploads document
2. User A adds annotation
3. User B views document
4. User B sees annotation
5. User B replies to thread
6. User A gets notification
7. Both see updated thread

---

## 📊 Phase 5: Performance Testing

### Load Test: Multiple Uploads
```python
import concurrent.futures
import requests

def upload_document(i):
    with open('test.pdf', 'rb') as f:
        response = requests.post(
            'http://localhost:8000/api/documents/upload',
            files={'file': f},
            data={'user_id': f'user_{i}'}
        )
    return response.status_code == 200

# Upload 50 documents concurrently
with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
    results = list(executor.map(upload_document, range(50)))

success_rate = sum(results) / len(results) * 100
print(f"Success Rate: {success_rate}%")
assert success_rate > 95, "Too many failures"
```

**✅ Pass Criteria**:
- Success rate > 95%
- Average response time < 3s
- No memory leaks
- Database connections managed properly

### Stress Test: Q&A Performance
```python
import time

questions = [
    "What is the main topic?",
    "Summarize the document",
    "Who are the key people mentioned?",
    "What are the dates discussed?",
    "List all recommendations"
]

times = []
for q in questions * 10:  # 50 total questions
    start = time.time()
    response = requests.post(
        'http://localhost:8004/chat',
        json={
            'session_id': 'perf_test',
            'message': q,
            'doc_ids': ['doc_abc123']
        }
    )
    times.append(time.time() - start)

avg_time = sum(times) / len(times)
print(f"Average Response Time: {avg_time:.2f}s")
assert avg_time < 5, "Q&A too slow"
```

**✅ Pass Criteria**:
- Average response time < 5s
- P95 response time < 8s
- No timeouts
- Consistent performance

---

## 🐛 Phase 6: Bug Hunting Checklist

### Data Integrity
- [ ] Uploads don't create duplicate records
- [ ] Deletes clean up all related data
- [ ] Updates don't corrupt existing data
- [ ] Concurrent uploads handled correctly
- [ ] File hash verification works

### Error Handling
- [ ] Invalid file types rejected gracefully
- [ ] Files > 50MB handled properly
- [ ] Missing required fields show clear errors
- [ ] Network errors don't crash app
- [ ] Database errors logged correctly

### Security
- [ ] Users can only see their own documents
- [ ] File uploads validated for malicious content
- [ ] SQL injection prevented (MongoDB)
- [ ] XSS prevented in responses
- [ ] CORS configured correctly

### UI/UX
- [ ] Loading states show during operations
- [ ] Error messages are user-friendly
- [ ] Success feedback provided
- [ ] No broken links or 404s
- [ ] Mobile responsive works

### Performance
- [ ] Page loads < 3s
- [ ] Large documents don't freeze UI
- [ ] Search is fast (< 1s)
- [ ] No memory leaks in frontend
- [ ] Images lazy-load properly

---

## ✅ Test Results Template

```markdown
## Test Run: [Date]
**Tester**: [Name]
**Environment**: Development/Staging/Production
**Browser**: Chrome 120 / Firefox 121 / Safari 17

### Backend API Tests
| Test | Status | Response Time | Notes |
|------|--------|---------------|-------|
| Upload Document | ✅ PASS | 1.2s | - |
| Get Documents | ✅ PASS | 450ms | - |
| Update Document | ✅ PASS | 320ms | - |
| Delete Document | ✅ PASS | 280ms | - |
| Dashboard Stats | ✅ PASS | 180ms | - |
| Q&A Endpoint | ✅ PASS | 3.8s | - |

### Integration Tests
| Test | Status | Notes |
|------|--------|-------|
| Upload Flow | ✅ PASS | All steps completed |
| Multi-Doc Q&A | ✅ PASS | Sources correct |
| Frontend Integration | ✅ PASS | UI responsive |

### E2E Tests
| Scenario | Status | Time | Issues |
|----------|--------|------|--------|
| New User Journey | ✅ PASS | 5min | None |
| Power User Workflow | ✅ PASS | 8min | None |

### Performance
- Upload Speed: 1.5 MB/s
- Q&A Avg Time: 3.2s
- Success Rate: 98.5%

### Bugs Found
1. [BUG-001] Document list doesn't refresh after upload - FIXED
2. [BUG-002] Analytics count off by 1 - INVESTIGATING

### Overall Status: ✅ PASS / ⚠️ PARTIAL / ❌ FAIL
```

---

## 🚀 Quick Test Commands

```bash
# Test all backend endpoints
./test_backend.sh

# Test frontend build
cd frontend && npm run build

# Run E2E tests
npm run test:e2e

# Check code quality
npm run lint

# Performance profiling
npm run profile
```

---

## 📞 Support Contacts

- **Backend Issues**: Check `backend/logs/error.log`
- **Frontend Issues**: Browser DevTools Console
- **Database Issues**: MongoDB logs at `/var/log/mongodb/`
- **RAG Issues**: Check port 8004 logs

---

**Last Updated**: November 11, 2024
**Version**: 1.0
**Status**: Ready for Testing Phase 2 (API Testing)
