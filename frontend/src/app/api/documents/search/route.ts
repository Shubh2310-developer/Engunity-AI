import { NextRequest, NextResponse } from 'next/server';
import { getDocumentsByUserNoAuth } from '@/lib/supabase/document-storage-no-auth';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const userId = searchParams.get('userId') || 'anonymous-user';
    const category = searchParams.get('category');
    const status = searchParams.get('status');

    // Get all documents for the user
    const documents = await getDocumentsByUserNoAuth(userId);

    // Filter documents based on search criteria
    let filteredDocuments = documents;

    if (query) {
      filteredDocuments = filteredDocuments.filter(doc => 
        doc.name.toLowerCase().includes(query.toLowerCase()) ||
        doc.type.toLowerCase().includes(query.toLowerCase()) ||
        doc.category.toLowerCase().includes(query.toLowerCase()) ||
        doc.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase()))
      );
    }

    if (category && category !== 'all') {
      filteredDocuments = filteredDocuments.filter(doc => 
        doc.category.toLowerCase() === category.toLowerCase()
      );
    }

    if (status && status !== 'all') {
      filteredDocuments = filteredDocuments.filter(doc => 
        doc.status === status
      );
    }

    return NextResponse.json({
      success: true,
      documents: filteredDocuments,
      total: filteredDocuments.length,
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
      userId = 'anonymous-user', 
      filters = {}, 
      sort = { field: 'uploaded_at', direction: 'desc' },
      pagination = { page: 1, limit: 10 }
    } = body;

    // Get all documents for the user
    const documents = await getDocumentsByUserNoAuth(userId);

    // Apply filters
    let filteredDocuments = documents;

    if (query) {
      filteredDocuments = filteredDocuments.filter(doc => 
        doc.name.toLowerCase().includes(query.toLowerCase()) ||
        doc.type.toLowerCase().includes(query.toLowerCase()) ||
        doc.category.toLowerCase().includes(query.toLowerCase()) ||
        doc.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase()))
      );
    }

    if (filters.category && filters.category.length > 0) {
      filteredDocuments = filteredDocuments.filter(doc => 
        filters.category.includes(doc.category)
      );
    }

    if (filters.status && filters.status.length > 0) {
      filteredDocuments = filteredDocuments.filter(doc => 
        filters.status.includes(doc.status)
      );
    }

    if (filters.tags && filters.tags.length > 0) {
      filteredDocuments = filteredDocuments.filter(doc => 
        doc.tags.some(tag => filters.tags.includes(tag))
      );
    }

    // Apply sorting
    filteredDocuments.sort((a, b) => {
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
    const paginatedDocuments = filteredDocuments.slice(startIndex, endIndex);

    return NextResponse.json({
      success: true,
      documents: paginatedDocuments,
      total: filteredDocuments.length,
      page: pagination.page,
      limit: pagination.limit,
      hasMore: endIndex < filteredDocuments.length,
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