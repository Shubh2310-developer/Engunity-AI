#!/usr/bin/env python3
"""
Document Processing Script
Downloads document from Supabase and extracts text
"""
import sys
import os
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

from utils.document_processor import extract_text_from_file
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import asyncio
import tempfile
import requests

async def process_document(document_id: str):
    """Process a document by downloading and extracting text"""

    # Connect to MongoDB
    mongo_uri = os.getenv("MONGO_URI", "mongodb://localhost:27017/engunity-ai")
    db_name = os.getenv("MONGODB_DB_NAME", "engunity-ai")

    client = AsyncIOMotorClient(mongo_uri)
    db = client[db_name]
    documents_collection = db["documents"]

    # Get document
    doc = await documents_collection.find_one({"_id": ObjectId(document_id)})
    if not doc:
        print(f"❌ Document {document_id} not found")
        return

    print(f"📄 Processing: {doc['file_name']}")
    print(f"📍 Storage URL: {doc.get('storage_url', 'N/A')}")

    # Download file from Supabase
    storage_url = doc.get('storage_url')
    if not storage_url:
        print("❌ No storage URL found")
        return

    print("⬇️ Downloading document...")
    response = requests.get(storage_url)
    if response.status_code != 200:
        print(f"❌ Download failed: {response.status_code}")
        return

    # Save to temp file
    file_ext = os.path.splitext(doc['file_name'])[1]
    with tempfile.NamedTemporaryFile(delete=False, suffix=file_ext) as tmp_file:
        tmp_file.write(response.content)
        tmp_path = tmp_file.name

    try:
        # Extract text
        print("🔍 Extracting text...")
        extracted_text, metadata = extract_text_from_file(tmp_path, doc.get('file_type'))

        if not extracted_text:
            print("❌ Text extraction failed")
            return

        print(f"✅ Extracted {metadata['word_count']} words from {metadata.get('page_count', 'unknown')} pages")
        print(f"📝 Text preview: {extracted_text[:200]}...")

        # Update MongoDB
        print("💾 Updating database...")
        await documents_collection.update_one(
            {"_id": ObjectId(document_id)},
            {
                "$set": {
                    "extracted_text": extracted_text,
                    "word_count": metadata['word_count'],
                    "page_count": metadata.get('page_count'),
                    "char_count": metadata.get('char_count'),
                    "extraction_method": metadata.get('extraction_method'),
                    "text_extracted_at": asyncio.get_event_loop().time()
                }
            }
        )

        print("✅ Document processed successfully!")
        print(f"🎯 Document ready for RAG queries")

    finally:
        # Clean up temp file
        os.unlink(tmp_path)
        await client.close()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python process_document.py <document_id>")
        sys.exit(1)

    document_id = sys.argv[1]
    asyncio.run(process_document(document_id))
