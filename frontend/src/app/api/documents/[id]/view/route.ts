import { NextRequest, NextResponse } from 'next/server';
import { MongoClient, ObjectId } from 'mongodb';

// Disable static optimization and caching for this route
export const dynamic = 'force-dynamic';
export const revalidate = 0;

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

    const document = await documentsCollection.findOne({ _id: documentObjectId });

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    if (!document.storage_url) {
      return NextResponse.json(
        { error: 'Document storage URL not found' },
        { status: 404 }
      );
    }

    // Fetch the file from storage
    const response = await fetch(document.storage_url);

    if (!response.ok) {
      console.error('Failed to fetch document from storage:', response.status, response.statusText);
      return NextResponse.json(
        { error: 'Failed to fetch document from storage' },
        { status: 404 }
      );
    }

    const fileName = document.file_name || document.original_filename || 'document.pdf';
    const contentType = response.headers.get('content-type') || document.file_type || 'application/octet-stream';

    // Get the response body as an array buffer for better streaming
    const buffer = await response.arrayBuffer();

    // Return the file with proper headers for PDF viewing
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${fileName}"`,
        'Content-Length': buffer.byteLength.toString(),
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'no-cache', // Disable caching for large files
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error: any) {
    console.error('Document view error:', error);
    return NextResponse.json(
      { error: 'Failed to serve document' },
      { status: 500 }
    );
  }
}