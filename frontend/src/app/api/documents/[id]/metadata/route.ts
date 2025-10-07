import { NextRequest, NextResponse } from 'next/server';
import { MongoClient, ObjectId } from 'mongodb';

// MongoDB connection
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/engunity-ai-dev';
const dbName = process.env.MONGODB_DB_NAME || 'engunity-ai-dev';
let cachedMongoClient: MongoClient | null = null;

async function getMongoClient() {
  if (cachedMongoClient) {
    return cachedMongoClient;
  }
  const client = new MongoClient(mongoUri);
  await client.connect();
  cachedMongoClient = client;
  return client;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const documentId = params.id;

    if (!documentId) {
      return NextResponse.json(
        { error: 'Document ID is required' },
        { status: 400 }
      );
    }

    // Get document from MongoDB
    const mongoClient = await getMongoClient();
    const db = mongoClient.db(dbName);
    const documentsCollection = db.collection('documents');

    let documentObjectId: ObjectId;
    try {
      documentObjectId = new ObjectId(documentId);
    } catch (err) {
      return NextResponse.json(
        { error: 'Invalid document ID format' },
        { status: 400 }
      );
    }

    const doc = await documentsCollection.findOne({ _id: documentObjectId });

    if (!doc) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    const document = {
      id: doc._id.toString(),
      type: doc.file_type,
      size: doc.file_size,
      uploaded_at: doc.created_at,
      processed_at: doc.updated_at,
      status: doc.processing_status,
      metadata: {
        pages: doc.page_count,
        word_count: doc.word_count,
        language: doc.language
      }
    };

    // Try to extract metadata from S3 file if not available
    let metadata = document.metadata || {};
    
    // If pages is not set and this is a PDF, try to extract from extracted_text
    if (!metadata.pages && (document.type === 'PDF' || document.type === 'application/pdf')) {
      try {
        // Try to estimate pages from extracted text if available
        const extractedText = doc.extracted_text;
        if (extractedText && extractedText.length > 0) {
          // Rough estimate: average 3000 characters per page
          const estimatedPages = Math.max(1, Math.ceil(extractedText.length / 3000));
          metadata = {
            ...metadata,
            pages: estimatedPages,
            estimated: true
          };
        } else {
          metadata = {
            ...metadata,
            pages: 1, // Default if no text extracted
            estimated: true
          };
        }
      } catch (error) {
        console.log('Could not extract PDF metadata:', error);
      }
    }

    // Return enhanced metadata
    return NextResponse.json({
      success: true,
      metadata: {
        ...metadata,
        pages: metadata.pages || 1,
        word_count: metadata.word_count || 0,
        language: metadata.language || 'en',
        file_size: document.size,
        file_type: document.type,
        upload_date: document.uploaded_at,
        processed_date: document.processed_at,
        status: document.status
      }
    });
  } catch (error) {
    console.error('Get document metadata error:', error);
    return NextResponse.json(
      { error: 'Failed to get document metadata' },
      { status: 500 }
    );
  }
}