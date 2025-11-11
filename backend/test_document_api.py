#!/usr/bin/env python3
"""
Simple test script to verify Document Intelligence API works correctly
"""

import sys
import asyncio
sys.path.insert(0, '/home/shahs/Engunity-AI')

from backend.app.services.document_service import get_document_db
from backend.app.models.document_models import Document, DocumentMetadata

async def test_document_api():
    """Test document CRUD operations"""

    print("=" * 60)
    print("Document Intelligence API Test")
    print("=" * 60)

    # Test 1: MongoDB Connection
    print("\n[TEST 1] MongoDB Connection...")
    try:
        db = get_document_db()
        collections = db.db.list_collection_names()
        print(f"✅ MongoDB Connected")
        print(f"   Database: engunity_ai")
        print(f"   Collections: {len(collections)} found")
    except Exception as e:
        print(f"❌ MongoDB Connection Failed: {e}")
        return

    # Test 2: Create Document
    print("\n[TEST 2] Create Document...")
    try:
        test_doc = Document(
            doc_id="test_doc_12345",
            user_id="test_user_123",
            session_id="test_session_001",
            filename="test_document.pdf",
            original_filename="Test Document.pdf",
            file_hash="abc123def456",
            metadata=DocumentMetadata(
                file_size_bytes=1024000,
                file_type="pdf",
                mime_type="application/pdf",
                word_count=5000,
                page_count=10
            ),
            category="technical",
            tags=["test", "api"],
            processing_status="ready"
        )

        doc_id = await db.create_document(test_doc)
        print(f"✅ Document Created")
        print(f"   Document ID: test_doc_12345")
        print(f"   MongoDB _id: {doc_id}")
    except Exception as e:
        print(f"❌ Create Failed: {e}")
        import traceback
        traceback.print_exc()

    # Test 3: Get Document
    print("\n[TEST 3] Get Document...")
    try:
        retrieved_doc = await db.get_document("test_doc_12345")
        if retrieved_doc:
            print(f"✅ Document Retrieved")
            print(f"   Filename: {retrieved_doc.filename}")
            print(f"   Category: {retrieved_doc.category}")
            print(f"   Status: {retrieved_doc.processing_status}")
        else:
            print(f"❌ Document Not Found")
    except Exception as e:
        print(f"❌ Retrieval Failed: {e}")

    # Test 4: Get User Documents
    print("\n[TEST 4] Get User Documents...")
    try:
        user_docs = await db.get_user_documents("test_user_123", skip=0, limit=10)
        print(f"✅ User Documents Retrieved")
        print(f"   Total documents: {len(user_docs)}")
        for doc in user_docs:
            print(f"   - {doc.filename} ({doc.category})")
    except Exception as e:
        print(f"❌ Get User Documents Failed: {e}")

    # Test 5: Update Document
    print("\n[TEST 5] Update Document...")
    try:
        success = await db.update_document(
            "test_doc_12345",
            {"summary": "This is a test document for API testing", "tags": ["test", "api", "updated"]}
        )
        if success:
            print(f"✅ Document Updated")
        else:
            print(f"❌ Update Failed")
    except Exception as e:
        print(f"❌ Update Failed: {e}")

    # Test 6: Track View
    print("\n[TEST 6] Track View...")
    try:
        await db.increment_view_count("test_doc_12345")
        await db.increment_view_count("test_doc_12345")
        doc = await db.get_document("test_doc_12345")
        print(f"✅ View Tracking Works")
        print(f"   View Count: {doc.view_count}")
    except Exception as e:
        print(f"❌ View Tracking Failed: {e}")

    # Test 7: Dashboard Stats
    print("\n[TEST 7] Dashboard Stats...")
    try:
        stats = await db.get_dashboard_stats("test_user_123")
        print(f"✅ Dashboard Stats Retrieved")
        print(f"   Total Documents: {stats.get('totalDocuments', 0)}")
        print(f"   Questions Asked: {stats.get('questionsAsked', 0)}")
        print(f"   Total Views: {stats.get('totalViews', 0)}")
    except Exception as e:
        print(f"❌ Dashboard Stats Failed: {e}")

    # Test 8: Delete Document
    print("\n[TEST 8] Delete Document...")
    try:
        success = await db.delete_document("test_doc_12345")
        if success:
            print(f"✅ Document Deleted")
            # Verify deletion
            deleted_doc = await db.get_document("test_doc_12345")
            if not deleted_doc:
                print(f"   Deletion verified - document not found")
        else:
            print(f"❌ Deletion Failed")
    except Exception as e:
        print(f"❌ Delete Failed: {e}")

    print("\n" + "=" * 60)
    print("All Tests Completed!")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(test_document_api())
