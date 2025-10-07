import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { MongoClient } from 'mongodb';

// Initialize Supabase client for authentication
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

// Create regular Supabase client for user authentication
const supabase = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

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

export async function GET(request: NextRequest) {
  try {
    console.log('=== API DOCUMENTS LIST DEBUG START ===');
    console.log('API: Received documents list request');
    
    // Get authentication token from Authorization header
    const authHeader = request.headers.get('authorization');
    console.log('API: Authorization header check:', {
      hasAuthHeader: !!authHeader,
      startsWithBearer: authHeader?.startsWith('Bearer ')
    });
    
    if (!authHeader?.startsWith('Bearer ')) {
      console.error('API: Missing or invalid authorization header');
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    console.log('API: Extracted token length:', token.length);

    // Verify Supabase authentication token
    let authenticatedUser;
    try {
      const { data: { user }, error } = await supabase.auth.getUser(token);
      
      if (error) {
        console.error('API: Token verification error:', error);
        return NextResponse.json(
          { error: 'Invalid authentication token' },
          { status: 401 }
        );
      }

      if (!user) {
        console.error('API: No user found from token');
        return NextResponse.json(
          { error: 'User not found' },
          { status: 401 }
        );
      }

      authenticatedUser = user;
      console.log('API: User authenticated successfully:', user.id);

    } catch (authError) {
      console.error('API: Authentication verification failed:', authError);
      return NextResponse.json(
        { error: 'Authentication verification failed' },
        { status: 401 }
      );
    }

    // Fetch documents from MongoDB
    console.log('API: Fetching documents for user:', authenticatedUser.id);

    const mongoClient = await getMongoClient();
    const db = mongoClient.db(dbName);
    const documentsCollection = db.collection('documents');

    const documents = await documentsCollection
      .find({ user_id: authenticatedUser.id })
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