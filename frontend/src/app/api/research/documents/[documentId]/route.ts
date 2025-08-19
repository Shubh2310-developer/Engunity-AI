import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { getDatabase } from '@/lib/database/mongodb'
import { ObjectId } from 'mongodb'
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

export async function GET(
  request: NextRequest,
  { params }: { params: { documentId: string } }
) {
  try {
    // Get authenticated user from Supabase
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    
    if (authError || !session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    const { documentId } = params

    let document;

    // Try MongoDB first (for new ObjectId documents)
    if (ObjectId.isValid(documentId)) {
      const db = await getDatabase()
      const documentsCollection = db.collection('documents')
      
      document = await documentsCollection.findOne({
        _id: new ObjectId(documentId),
        user_id: userId
      });
    }

    // If not found and documentId looks like a UUID, try Supabase (for legacy documents)
    if (!document && documentId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      const { data: supabaseDoc, error } = await supabaseAdmin
        .from('documents')
        .select('*')
        .eq('id', documentId)
        .eq('user_id', userId)
        .single();

      if (!error && supabaseDoc) {
        // Transform Supabase document to match MongoDB format
        document = {
          _id: supabaseDoc.id,
          user_id: supabaseDoc.user_id,
          file_name: supabaseDoc.name,
          original_filename: supabaseDoc.name,
          file_type: supabaseDoc.type === 'general' ? 'application/pdf' : supabaseDoc.type,
          file_size: parseInt(supabaseDoc.size?.replace(/[^0-9]/g, '') || '0'),
          file_path: null,
          storage_url: supabaseDoc.storage_url,
          processing_status: supabaseDoc.status,
          created_at: supabaseDoc.uploaded_at,
          updated_at: supabaseDoc.processed_at || supabaseDoc.uploaded_at,
          extracted_text: null,
          summary: null,
          citations: [],
          topics: [],
          keywords: [],
          processing_time: null,
          confidence_score: null,
          language: 'en',
          page_count: null,
          word_count: null,
          category: supabaseDoc.category,
          domain: null,
          authors: [],
          publication_date: null,
          journal: null,
          doi: null
        };
      }
    }

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Transform MongoDB document to match our interface
    const transformedDocument = {
      documentId: document._id.toString(),
      userId: document.user_id,
      name: document.file_name || 'Untitled Document',
      type: document.file_type || 'application/pdf',
      size: document.file_size || 0,
      uploadDate: document.created_at ? new Date(document.created_at) : new Date(),
      status: mapProcessingStatus(document.processing_status),
      originalName: document.original_filename || document.file_name || 'document.pdf',
      mimeType: document.file_type || 'application/pdf',
      filePath: document.file_path,
      extractedText: document.extracted_text,
      summary: document.summary,
      citations: document.citations || [],
      topics: document.topics || [],
      keywords: document.keywords || [],
      processingTime: document.processing_time,
      confidence: document.confidence_score,
      language: document.language || 'en',
      pageCount: document.page_count,
      wordCount: document.word_count,
      category: document.category,
      domain: document.domain,
      authors: document.authors || [],
      publicationDate: document.publication_date ? new Date(document.publication_date) : undefined,
      journal: document.journal,
      doi: document.doi,
      createdAt: document.created_at ? new Date(document.created_at) : new Date(),
      updatedAt: (document.updated_at || document.created_at) ? new Date(document.updated_at || document.created_at) : new Date()
    }

    return NextResponse.json(transformedDocument)
  } catch (error) {
    console.error('Error fetching research document:', error)
    return NextResponse.json(
      { error: 'Failed to fetch research document' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { documentId: string } }
) {
  try {
    // Get authenticated user from Supabase
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    
    if (authError || !session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    const { documentId } = params

    let deletedFromMongo = false;
    let deletedFromSupabase = false;

    // Try to delete from MongoDB first (for new ObjectId documents)
    if (ObjectId.isValid(documentId)) {
      const db = await getDatabase()
      const documentsCollection = db.collection('documents')
      
      const mongoResult = await documentsCollection.deleteOne({
        _id: new ObjectId(documentId),
        user_id: userId
      });
      
      if (mongoResult.deletedCount > 0) {
        deletedFromMongo = true;
      }
    }

    // If not deleted from MongoDB and looks like UUID, try Supabase (legacy documents)
    if (!deletedFromMongo && documentId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      const { error: supabaseError } = await supabaseAdmin
        .from('documents')
        .delete()
        .eq('id', documentId)
        .eq('user_id', userId);

      if (!supabaseError) {
        deletedFromSupabase = true;
      }
    }

    if (deletedFromMongo || deletedFromSupabase) {
      return NextResponse.json({ message: 'Document deleted successfully' })
    } else {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

  } catch (error) {
    console.error('Error deleting research document:', error)
    return NextResponse.json(
      { error: 'Failed to delete research document' },
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