import { NextRequest, NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';
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

export async function GET(request: NextRequest) {
  try {
    console.log('=== API DOCUMENTS LIST DEBUG START ===');
    console.log('API: Received documents list request');

    // Verify MongoDB authentication
    console.log('API: Verifying MongoDB authentication...');
    const authenticatedUser = await getServerUser();

    if (!authenticatedUser) {
      console.error('API: No authenticated user found');
      return NextResponse.json(
        { error: 'Authentication required. Please sign in.' },
        { status: 401 }
      );
    }

    const userId = authenticatedUser._id?.toString();
    console.log('API: User authenticated successfully via MongoDB:', authenticatedUser.email, 'ID:', userId);

    if (!userId) {
      console.error('API: Invalid user ID');
      return NextResponse.json(
        { error: 'Invalid user ID' },
        { status: 401 }
      );
    }

    // Fetch documents from MongoDB
    console.log('API: Fetching documents for user:', userId);

    const mongoClient = await getMongoClient();
    const db = mongoClient.db(dbName);
    const documentsCollection = db.collection('documents');

    const documents = await documentsCollection
      .find({ user_id: userId })
      .sort({ created_at: -1 })
      .toArray();

    console.log('API: Documents fetched successfully:', documents.length);

    // Transform MongoDB documents to match expected frontend format
    const transformedDocuments = documents.map(doc => ({
      id: doc._id.toString(),
      name: doc.file_name || doc.original_filename,
      type: getDocumentTypeFromMimeType(doc.file_type),
      size: formatFileSize(doc.file_size || 0),
      status: mapProcessingStatus(doc.processing_status),
      uploaded_at: doc.created_at,
      storage_url: doc.storage_url,
      user_id: doc.user_id
    }));

    console.log('=== API DOCUMENTS LIST DEBUG END ===');

    return NextResponse.json(transformedDocuments);

  } catch (error: any) {
    console.error('API: List documents error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to list documents' },
      { status: 500 }
    );
  }
}

// Helper functions
function getDocumentTypeFromMimeType(mimeType: string): string {
  if (!mimeType) return 'general';

  const typeMap: Record<string, string> = {
    'application/pdf': 'PDF',
    'application/msword': 'DOCX',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
    'application/vnd.ms-excel': 'XLSX',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'XLSX',
    'application/vnd.ms-powerpoint': 'PPTX',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PPTX',
    'text/plain': 'TXT',
    'text/markdown': 'MD',
    'text/csv': 'CSV',
    'text/html': 'HTML',
    'text/xml': 'XML',
    'application/json': 'JSON',
    'application/rtf': 'RTF',
    'text/rtf': 'RTF',
  };

  return typeMap[mimeType] || 'general';
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function mapProcessingStatus(status: string): string {
  const statusMap: Record<string, string> = {
    'uploaded': 'ready',
    'processing': 'processing',
    'processed': 'processed',
    'failed': 'failed'
  };

  return statusMap[status] || 'ready';
}