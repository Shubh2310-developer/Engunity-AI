import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { getDatabase } from '@/lib/database/mongodb'

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

    // Build query
    const query: any = { user_id: userId }
    if (status) {
      query.processing_status = status
    }

    // Get documents from MongoDB
    const documents = await documentsCollection
      .find(query)
      .sort({ created_at: -1 })
      .skip(offset)
      .limit(limit)
      .toArray()

    // Transform MongoDB documents to match our interface
    const transformedDocuments = documents.map(doc => ({
      documentId: doc._id.toString(),
      userId: doc.user_id,
      name: doc.file_name || 'Untitled Document',
      type: doc.file_type || 'application/pdf',
      size: doc.file_size || 0,
      uploadDate: new Date(doc.created_at),
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
      createdAt: new Date(doc.created_at),
      updatedAt: new Date(doc.updated_at || doc.created_at)
    }))

    return NextResponse.json(transformedDocuments)
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