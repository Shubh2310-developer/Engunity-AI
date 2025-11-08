import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { MongoClient, ObjectId } from 'mongodb';
import { getServerUser } from '@/lib/auth/server-session';

// Initialize Supabase client for storage only (not auth)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

// Create Supabase client with service role key for server-side storage operations
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

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

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('=== API DELETE DOCUMENT DEBUG START ===');
    console.log('API: Received delete request for document ID:', params.id);

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

    // First, get the document from MongoDB to verify ownership and get storage URL
    console.log('API: Fetching document details from MongoDB...');
    const mongoClient = await getMongoClient();
    const db = mongoClient.db(dbName);
    const documentsCollection = db.collection('documents');

    let documentObjectId: ObjectId;
    try {
      documentObjectId = new ObjectId(params.id);
    } catch (err) {
      console.error('API: Invalid document ID format:', params.id);
      return NextResponse.json(
        { error: 'Invalid document ID format' },
        { status: 400 }
      );
    }

    const document = await documentsCollection.findOne({
      _id: documentObjectId,
      user_id: userId
    });

    if (!document) {
      console.error('API: Document not found or user does not own it');
      return NextResponse.json(
        { error: 'Document not found or access denied' },
        { status: 404 }
      );
    }

    console.log('API: Document found in MongoDB, proceeding with deletion:', {
      documentId: params.id,
      documentName: document.name,
      hasStorageUrl: !!document.storageUrl
    });

    // Delete from MongoDB first
    console.log('API: Deleting from MongoDB...');
    const deleteResult = await documentsCollection.deleteOne({
      _id: documentObjectId,
      user_id: userId
    });

    if (deleteResult.deletedCount === 0) {
      console.error('API: MongoDB delete failed - no documents deleted');
      return NextResponse.json(
        { error: 'Failed to delete document from database' },
        { status: 500 }
      );
    }

    console.log('API: Document deleted from MongoDB successfully');

    // Delete from Supabase Storage
    if (document.storageUrl) {
      try {
        console.log('API: Deleting from storage...');

        // Extract storage path from URL
        const url = new URL(document.storageUrl);
        const pathParts = url.pathname.split('/');
        const documentsIndex = pathParts.findIndex((p: string) => p === 'documents');

        if (documentsIndex !== -1) {
          const storagePath = pathParts.slice(documentsIndex + 1).join('/');
          console.log('API: Attempting to delete storage path:', storagePath);

          const { error: storageError } = await supabaseAdmin.storage
            .from('documents')
            .remove([storagePath]);

          if (storageError) {
            console.warn('API: Storage delete warning (non-fatal):', storageError);
            // Don't fail the entire operation if storage delete fails
          } else {
            console.log('API: File deleted from storage successfully');
          }
        } else {
          console.warn('API: Could not parse storage path from URL');
        }
      } catch (storageError) {
        console.warn('API: Storage delete error (non-fatal):', storageError);
        // Don't fail the entire operation if storage delete fails
      }
    }

    console.log('API: Document deletion completed successfully');
    console.log('=== API DELETE DOCUMENT DEBUG END ===');
    
    return NextResponse.json({
      success: true,
      message: 'Document deleted successfully',
      deletedDocument: {
        id: params.id,
        name: document.name
      }
    });

  } catch (error: any) {
    console.error('API: Delete document error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete document' },
      { status: 500 }
    );
  }
}