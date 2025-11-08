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
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const category = searchParams.get('category');
    const status = searchParams.get('status');

    // Verify MongoDB authentication
    const authenticatedUser = await getServerUser();

    if (!authenticatedUser) {
      return NextResponse.json(
        { error: 'Authentication required. Please sign in.' },
        { status: 401 }
      );
    }

    const userId = authenticatedUser._id?.toString();

    if (!userId) {
      return NextResponse.json(
        { error: 'Invalid user ID' },
        { status: 401 }
      );
    }

    // Get all documents for the authenticated user from MongoDB
    const mongoClient = await getMongoClient();
    const db = mongoClient.db(dbName);
    const documentsCollection = db.collection('documents');

    const documents = await documentsCollection
      .find({ user_id: userId })
      .sort({ created_at: -1 })
      .toArray();

    // Filter documents based on search criteria
    let filteredDocuments = documents;

    if (query) {
      filteredDocuments = filteredDocuments.filter(doc =>
        (doc.file_name && doc.file_name.toLowerCase().includes(query.toLowerCase())) ||
        (doc.original_filename && doc.original_filename.toLowerCase().includes(query.toLowerCase())) ||
        (doc.file_type && doc.file_type.toLowerCase().includes(query.toLowerCase())) ||
        (doc.category && doc.category.toLowerCase().includes(query.toLowerCase())) ||
        (doc.topics && doc.topics.some((tag: string) => tag.toLowerCase().includes(query.toLowerCase())))
      );
    }

    if (category && category !== 'all') {
      filteredDocuments = filteredDocuments.filter(doc =>
        doc.category && doc.category.toLowerCase() === category.toLowerCase()
      );
    }

    if (status && status !== 'all') {
      filteredDocuments = filteredDocuments.filter(doc =>
        doc.processing_status === status
      );
    }

    // Transform to expected format
    const transformedDocuments = filteredDocuments.map(doc => ({
      id: doc._id.toString(),
      name: doc.file_name || doc.original_filename,
      type: doc.file_type,
      size: formatFileSize(doc.file_size || 0),
      status: doc.processing_status,
      uploaded_at: doc.created_at,
      storage_url: doc.storage_url,
      user_id: doc.user_id,
      category: doc.category,
      tags: doc.topics || []
    }));

    return NextResponse.json({
      success: true,
      documents: transformedDocuments,
      total: transformedDocuments.length,
      query: query
    });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { error: 'Search failed' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      query = '',
      filters = {},
      sort = { field: 'uploaded_at', direction: 'desc' },
      pagination = { page: 1, limit: 10 }
    } = body;

    // Verify MongoDB authentication
    const authenticatedUser = await getServerUser();

    if (!authenticatedUser) {
      return NextResponse.json(
        { error: 'Authentication required. Please sign in.' },
        { status: 401 }
      );
    }

    const userId = authenticatedUser._id?.toString();

    if (!userId) {
      return NextResponse.json(
        { error: 'Invalid user ID' },
        { status: 401 }
      );
    }

    // Get all documents for the authenticated user from MongoDB
    const mongoClient = await getMongoClient();
    const db = mongoClient.db(dbName);
    const documentsCollection = db.collection('documents');

    const documents = await documentsCollection
      .find({ user_id: userId })
      .sort({ created_at: -1 })
      .toArray();

    // Apply filters
    let filteredDocuments = documents;

    if (query) {
      filteredDocuments = filteredDocuments.filter(doc =>
        (doc.file_name && doc.file_name.toLowerCase().includes(query.toLowerCase())) ||
        (doc.original_filename && doc.original_filename.toLowerCase().includes(query.toLowerCase())) ||
        (doc.file_type && doc.file_type.toLowerCase().includes(query.toLowerCase())) ||
        (doc.category && doc.category.toLowerCase().includes(query.toLowerCase())) ||
        (doc.topics && doc.topics.some((tag: string) => tag.toLowerCase().includes(query.toLowerCase())))
      );
    }

    if (filters.category && filters.category.length > 0) {
      filteredDocuments = filteredDocuments.filter(doc =>
        doc.category && filters.category.includes(doc.category)
      );
    }

    if (filters.status && filters.status.length > 0) {
      filteredDocuments = filteredDocuments.filter(doc =>
        filters.status.includes(doc.processing_status)
      );
    }

    if (filters.tags && filters.tags.length > 0) {
      filteredDocuments = filteredDocuments.filter(doc =>
        doc.topics && doc.topics.some((tag: string) => filters.tags.includes(tag))
      );
    }

    // Transform to expected format
    const transformedDocuments = filteredDocuments.map(doc => ({
      id: doc._id.toString(),
      name: doc.file_name || doc.original_filename,
      type: doc.file_type,
      size: formatFileSize(doc.file_size || 0),
      status: doc.processing_status,
      uploaded_at: doc.created_at,
      storage_url: doc.storage_url,
      user_id: doc.user_id,
      category: doc.category,
      tags: doc.topics || []
    }));

    // Apply sorting
    transformedDocuments.sort((a, b) => {
      let aValue, bValue;

      switch (sort.field) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'uploaded_at':
          aValue = new Date(a.uploaded_at).getTime();
          bValue = new Date(b.uploaded_at).getTime();
          break;
        case 'size':
          // Convert size string to number for sorting
          aValue = parseFloat(a.size.split(' ')[0]);
          bValue = parseFloat(b.size.split(' ')[0]);
          break;
        default:
          aValue = new Date(a.uploaded_at).getTime();
          bValue = new Date(b.uploaded_at).getTime();
      }

      if (sort.direction === 'desc') {
        return bValue > aValue ? 1 : -1;
      } else {
        return aValue > bValue ? 1 : -1;
      }
    });

    // Apply pagination
    const startIndex = (pagination.page - 1) * pagination.limit;
    const endIndex = startIndex + pagination.limit;
    const paginatedDocuments = transformedDocuments.slice(startIndex, endIndex);

    return NextResponse.json({
      success: true,
      documents: paginatedDocuments,
      total: transformedDocuments.length,
      page: pagination.page,
      limit: pagination.limit,
      hasMore: endIndex < transformedDocuments.length,
      query: query,
      searchTime: Date.now()
    });
  } catch (error) {
    console.error('Advanced search error:', error);
    return NextResponse.json(
      { error: 'Advanced search failed' },
      { status: 500 }
    );
  }
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
