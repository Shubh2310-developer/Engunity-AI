import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase for auth verification
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const userId = searchParams.get('userId');
    const category = searchParams.get('category');
    const status = searchParams.get('status');

    // Require authenticated user
    if (!userId) {
      return NextResponse.json(
        { error: 'User authentication required' },
        { status: 401 }
      );
    }

    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (error || !user || user.id !== userId) {
          return NextResponse.json(
            { error: 'Invalid authentication' },
            { status: 401 }
          );
        }
      } catch (authError) {
        return NextResponse.json(
          { error: 'Authentication verification failed' },
          { status: 401 }
        );
      }
    }

    // Get all documents for the authenticated user from Supabase
    const { data: documents, error: fetchError } = await supabase
      .from('documents')
      .select('*')
      .eq('user_id', userId)
      .order('uploaded_at', { ascending: false });

    if (fetchError) {
      throw new Error(`Failed to fetch documents: ${fetchError.message}`);
    }

    // Filter documents based on search criteria
    let filteredDocuments = documents;

    if (query) {
      filteredDocuments = filteredDocuments.filter(doc => 
        doc.name.toLowerCase().includes(query.toLowerCase()) ||
        doc.type.toLowerCase().includes(query.toLowerCase()) ||
        doc.category.toLowerCase().includes(query.toLowerCase()) ||
        (doc.tags && doc.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase())))
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
      userId, 
      filters = {}, 
      sort = { field: 'uploaded_at', direction: 'desc' },
      pagination = { page: 1, limit: 10 }
    } = body;

    // Require authenticated user
    if (!userId) {
      return NextResponse.json(
        { error: 'User authentication required' },
        { status: 401 }
      );
    }

    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (error || !user || user.id !== userId) {
          return NextResponse.json(
            { error: 'Invalid authentication' },
            { status: 401 }
          );
        }
      } catch (authError) {
        return NextResponse.json(
          { error: 'Authentication verification failed' },
          { status: 401 }
        );
      }
    }

    // Get all documents for the authenticated user from Supabase
    const { data: documents, error: fetchError } = await supabase
      .from('documents')
      .select('*')
      .eq('user_id', userId)
      .order('uploaded_at', { ascending: false });

    if (fetchError) {
      throw new Error(`Failed to fetch documents: ${fetchError.message}`);
    }

    // Apply filters
    let filteredDocuments = documents;

    if (query) {
      filteredDocuments = filteredDocuments.filter(doc => 
        doc.name.toLowerCase().includes(query.toLowerCase()) ||
        doc.type.toLowerCase().includes(query.toLowerCase()) ||
        doc.category.toLowerCase().includes(query.toLowerCase()) ||
        (doc.tags && doc.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase())))
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