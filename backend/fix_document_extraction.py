#!/usr/bin/env python3
"""
Fix Document Text Extraction
=============================
This script re-processes documents to extract their text content properly.
"""

import sys
import os
import requests
from pymongo import MongoClient
from bson import ObjectId
import PyPDF2
from io import BytesIO

# MongoDB connection
MONGODB_URI = os.getenv('MONGODB_URI', 'mongodb://localhost:27017/engunity-ai')
DB_NAME = 'engunity-ai'

def get_mongo_client():
    """Connect to MongoDB"""
    client = MongoClient(MONGODB_URI)
    return client[DB_NAME]

def extract_text_from_pdf_url(pdf_url):
    """Download and extract text from PDF URL"""
    try:
        print(f"  📥 Downloading PDF from: {pdf_url}")

        # Download PDF
        response = requests.get(pdf_url, timeout=30)
        response.raise_for_status()

        print(f"  ✅ Downloaded {len(response.content)} bytes")

        # Extract text from PDF
        pdf_file = BytesIO(response.content)
        pdf_reader = PyPDF2.PdfReader(pdf_file)

        num_pages = len(pdf_reader.pages)
        print(f"  📄 PDF has {num_pages} pages")

        # Extract text from all pages
        extracted_text = []
        for page_num, page in enumerate(pdf_reader.pages, 1):
            try:
                text = page.extract_text()
                if text:
                    extracted_text.append(text)
                    print(f"    Page {page_num}/{num_pages}: {len(text)} chars")
            except Exception as page_error:
                print(f"    ⚠️  Page {page_num} extraction failed: {page_error}")

        full_text = '\n\n'.join(extracted_text)
        word_count = len(full_text.split())

        print(f"  ✅ Extracted {len(full_text)} characters, {word_count} words from {len(extracted_text)} pages")

        return {
            'text': full_text,
            'page_count': num_pages,
            'word_count': word_count
        }

    except Exception as e:
        print(f"  ❌ PDF extraction failed: {e}")
        return None

def fix_document(db, doc_id):
    """Fix a single document by extracting its text"""
    try:
        # Get document from MongoDB
        doc = db.documents.find_one({'_id': ObjectId(doc_id)})

        if not doc:
            print(f"❌ Document {doc_id} not found")
            return False

        print(f"\n{'='*60}")
        print(f"Processing: {doc.get('file_name', 'Unknown')}")
        print(f"Document ID: {doc_id}")
        print(f"Current Status: {doc.get('processing_status', 'unknown')}")
        print(f"Storage URL: {doc.get('storage_url', 'N/A')}")
        print(f"{'='*60}")

        # Check if already has text
        current_text = doc.get('extracted_text')
        if current_text and len(current_text) > 100:
            print(f"  ℹ️  Document already has extracted text ({len(current_text)} chars)")
            print(f"  ❓ Re-extract? (y/n): ", end='')
            response = input().strip().lower()
            if response != 'y':
                print(f"  ⏭️  Skipping...")
                return True

        # Get storage URL
        storage_url = doc.get('storage_url')
        if not storage_url:
            print(f"  ❌ No storage URL found")
            return False

        # Extract text
        extraction_result = extract_text_from_pdf_url(storage_url)

        if not extraction_result:
            print(f"  ❌ Text extraction failed")
            return False

        # Update MongoDB with extracted text
        update_data = {
            'extracted_text': extraction_result['text'],
            'page_count': extraction_result['page_count'],
            'word_count': extraction_result['word_count'],
            'processing_status': 'processed',
            'updated_at': db.command('serverStatus')['localTime']
        }

        result = db.documents.update_one(
            {'_id': ObjectId(doc_id)},
            {'$set': update_data}
        )

        if result.modified_count > 0:
            print(f"  ✅ Document updated successfully!")
            print(f"     - Extracted text: {len(extraction_result['text'])} chars")
            print(f"     - Page count: {extraction_result['page_count']}")
            print(f"     - Word count: {extraction_result['word_count']}")
            return True
        else:
            print(f"  ⚠️  Document not modified (may already be up to date)")
            return True

    except Exception as e:
        print(f"❌ Error processing document: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """Main function"""
    print("╔" + "="*58 + "╗")
    print("║" + " "*10 + "FIX DOCUMENT TEXT EXTRACTION" + " "*20 + "║")
    print("╚" + "="*58 + "╝")
    print()

    # Connect to MongoDB
    print("🔌 Connecting to MongoDB...")
    db = get_mongo_client()
    print(f"✅ Connected to database: {DB_NAME}\n")

    # Get all documents without extracted text or with status != processed
    query = {
        '$or': [
            {'extracted_text': None},
            {'extracted_text': ''},
            {'processing_status': {'$ne': 'processed'}}
        ]
    }

    documents = list(db.documents.find(query))

    if not documents:
        print("✅ No documents need text extraction!")
        print("\nChecking all documents...")
        all_docs = list(db.documents.find({}))
        print(f"📊 Total documents: {len(all_docs)}")

        for doc in all_docs:
            doc_id = str(doc['_id'])
            name = doc.get('file_name', 'Unknown')
            status = doc.get('processing_status', 'unknown')
            text_len = len(doc.get('extracted_text', '')) if doc.get('extracted_text') else 0
            print(f"  - {name} ({doc_id}): {status}, {text_len} chars")

        return

    print(f"📋 Found {len(documents)} document(s) needing text extraction:\n")

    for idx, doc in enumerate(documents, 1):
        doc_id = str(doc['_id'])
        name = doc.get('file_name', 'Unknown')
        status = doc.get('processing_status', 'unknown')
        print(f"{idx}. {name} ({doc_id}) - Status: {status}")

    print(f"\n{'='*60}")
    print("Process all documents? (y/n): ", end='')
    response = input().strip().lower()

    if response != 'y':
        print("Process specific document ID: ", end='')
        doc_id = input().strip()
        if doc_id:
            fix_document(db, doc_id)
        return

    # Process all documents
    print(f"\n🚀 Processing {len(documents)} documents...")

    success_count = 0
    fail_count = 0

    for doc in documents:
        doc_id = str(doc['_id'])
        if fix_document(db, doc_id):
            success_count += 1
        else:
            fail_count += 1

    print(f"\n{'='*60}")
    print(f"✅ Processing complete!")
    print(f"   - Successful: {success_count}")
    print(f"   - Failed: {fail_count}")
    print(f"   - Total: {len(documents)}")
    print(f"{'='*60}\n")

if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⚠️  Interrupted by user")
        sys.exit(0)
    except Exception as e:
        print(f"\n❌ Fatal error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
