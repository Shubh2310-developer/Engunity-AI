import { NextRequest, NextResponse } from 'next/server';
import { MongoClient, ObjectId } from 'mongodb';
import { getServerUser } from '@/lib/auth/server-session';

// MongoDB connection
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/engunity-ai';
const dbName = process.env.MONGODB_DB_NAME || 'engunity-ai';
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
    console.log('=== GET DOCUMENT API START ===');
    console.log('Document ID:', documentId);

    if (!documentId) {
      console.error('No document ID provided');
      return NextResponse.json(
        { error: 'Document ID is required' },
        { status: 400 }
      );
    }

    // Verify MongoDB authentication
    console.log('Verifying MongoDB authentication...');
    const authenticatedUser = await getServerUser();

    if (!authenticatedUser) {
      console.error('No authenticated user found');
      return NextResponse.json(
        { error: 'Authentication required. Please sign in.' },
        { status: 401 }
      );
    }

    const userId = authenticatedUser._id?.toString();
    console.log('User authenticated via MongoDB:', authenticatedUser.email, 'ID:', userId);

    if (!userId) {
      console.error('Invalid user ID');
      return NextResponse.json(
        { error: 'Invalid user ID' },
        { status: 401 }
      );
    }

    // Fetch from MongoDB
    const mongoClient = await getMongoClient();
    const db = mongoClient.db(dbName);
    const documentsCollection = db.collection('documents');

    let documentObjectId: ObjectId;
    try {
      documentObjectId = new ObjectId(documentId);
    } catch (err) {
      console.error('Invalid ObjectId format:', documentId);
      return NextResponse.json(
        { error: 'Invalid document ID format' },
        { status: 400 }
      );
    }

    console.log('Querying MongoDB for:', { _id: documentObjectId, user_id: userId });

    const document = await documentsCollection.findOne({
      _id: documentObjectId,
      user_id: userId
    });

    console.log('Document found:', !!document);

    if (!document) {
      console.error('Document not found in MongoDB');
      return NextResponse.json(
        { error: 'Not found', detail: '404: Not Found' },
        { status: 404 }
      );
    }

    // Transform to expected format
    const transformedDoc = {
      id: document._id.toString(),
      name: document.file_name || document.original_filename,
      type: document.file_type,
      size: document.file_size,
      status: document.processing_status,
      uploaded_at: document.created_at,
      storage_url: document.storage_url,
      user_id: document.user_id,
      metadata: {
        extracted_text: document.extracted_text,
        pages: document.page_count,
        word_count: document.word_count
      }
    };

    return NextResponse.json({
      success: true,
      document: transformedDoc
    });
  } catch (error) {
    console.error('Get document error:', error);
    return NextResponse.json(
      { error: 'Failed to get document' },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    await deleteDocumentNoAuth(documentId);

    return NextResponse.json({
      success: true,
      message: 'Document deleted successfully'
    });
  } catch (error) {
    console.error('Delete document error:', error);
    return NextResponse.json(
      { error: 'Failed to delete document' },
      { status: 500 }
    );
  }
}