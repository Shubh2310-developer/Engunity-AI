import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { getDatabase } from '@/lib/database/mongodb'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client for legacy document access
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user from Supabase
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    
    if (authError || !session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    const url = new URL(request.url)
    const limit = parseInt(url.searchParams.get('limit') || '10')
    const offset = parseInt(url.searchParams.get('offset') || '0')
    const status = url.searchParams.get('status')

    const db = await getDatabase()
    const documentsCollection = db.collection('documents')

    // Build query for MongoDB
    const mongoQuery: any = { user_id: userId }
    if (status) {
      mongoQuery.processing_status = status
    }

    // Get documents from MongoDB
    const mongoDocuments = await documentsCollection
      .find(mongoQuery)
      .sort({ created_at: -1 })
      .limit(limit) // We'll apply offset later after combining
      .toArray()

    // Get documents from Supabase (legacy)
    let supabaseQuery = supabaseAdmin
      .from('documents')
      .select('*')
      .eq('user_id', userId)
      .order('uploaded_at', { ascending: false });

    if (status) {
      supabaseQuery = supabaseQuery.eq('status', status);
    }

    const { data: supabaseDocuments, error: supabaseError } = await supabaseQuery;

    if (supabaseError) {
      console.warn('Error fetching legacy documents from Supabase:', supabaseError);
    }

    // Transform MongoDB documents
    const transformedMongoDocuments = mongoDocuments.map(doc => ({
      documentId: doc._id.toString(),
      userId: doc.user_id,
      name: doc.file_name || 'Untitled Document',
      type: doc.file_type || 'application/pdf',
      size: doc.file_size || 0,
      uploadDate: doc.created_at ? new Date(doc.created_at) : new Date(),
      status: mapProcessingStatus(doc.processing_status),
      originalName: doc.original_filename || doc.file_name || 'document.pdf',
      mimeType: doc.file_type || 'application/pdf',
      filePath: doc.file_path,
      extractedText: doc.extracted_text,
      summary: doc.summary,
      citations: doc.citations || [],
      topics: doc.topics || [],
      keywords: doc.keywords || [],
      processingTime: doc.processing_time,
      confidence: doc.confidence_score,
      language: doc.language || 'en',
      pageCount: doc.page_count,
      wordCount: doc.word_count,
      category: doc.category,
      domain: doc.domain,
      authors: doc.authors || [],
      publicationDate: doc.publication_date ? new Date(doc.publication_date) : undefined,
      journal: doc.journal,
      doi: doc.doi,
      createdAt: doc.created_at ? new Date(doc.created_at) : new Date(),
      updatedAt: (doc.updated_at || doc.created_at) ? new Date(doc.updated_at || doc.created_at) : new Date()
    }))

    // Transform Supabase documents (legacy)
    const transformedSupabaseDocuments = (supabaseDocuments || []).map(doc => ({
      documentId: doc.id,
      userId: doc.user_id,
      name: doc.name || 'Untitled Document',
      type: doc.type === 'general' ? 'application/pdf' : doc.type,
      size: parseInt(doc.size?.replace(/[^0-9]/g, '') || '0'),
      uploadDate: doc.uploaded_at ? new Date(doc.uploaded_at) : new Date(),
      status: mapProcessingStatus(doc.status),
      originalName: doc.name || 'document.pdf',
      mimeType: doc.type === 'general' ? 'application/pdf' : doc.type,
      filePath: null,
      extractedText: null,
      summary: null,
      citations: [],
      topics: [],
      keywords: [],
      processingTime: null,
      confidence: null,
      language: 'en',
      pageCount: null,
      wordCount: null,
      category: doc.category,
      domain: null,
      authors: [],
      publicationDate: undefined,
      journal: null,
      doi: null,
      createdAt: doc.uploaded_at ? new Date(doc.uploaded_at) : new Date(),
      updatedAt: (doc.processed_at || doc.uploaded_at) ? new Date(doc.processed_at || doc.uploaded_at) : new Date()
    }))

    // Combine and sort all documents
    const allDocuments = [...transformedMongoDocuments, ...transformedSupabaseDocuments]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(offset, offset + limit)

    return NextResponse.json(allDocuments)
  } catch (error) {
    console.error('Error fetching research documents:', error)
    return NextResponse.json(
      { error: 'Failed to fetch research documents' },
      { status: 500 }
    )
  }
}

// Helper function to map MongoDB processing status to our interface
function mapProcessingStatus(status: string): 'uploaded' | 'processing' | 'processed' | 'failed' {
  switch (status) {
    case 'completed':
      return 'processed'
    case 'processing':
      return 'processing'
    case 'failed':
    case 'error':
      return 'failed'
    default:
      return 'uploaded'
  }
}