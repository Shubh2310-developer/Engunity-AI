import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/auth/supabase';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Get authenticated Supabase client
    const supabase = getSupabaseServerClient(cookies());
    
    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user || user.id !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's documents
    const { data: documents, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('user_id', userId)
      .in('status', ['processed', 'ready']);

    if (docError) {
      console.error('Error fetching documents:', docError);
      return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 });
    }

    // Extract citations from documents
    const citations = documents?.map((doc, index) => {
      // Generate citations from document metadata if available
      if (doc.metadata?.citations) {
        return doc.metadata.citations;
      }
      
      // Generate basic citation info from document
      return {
        id: `doc-${doc.id}`,
        title: doc.name.replace('.pdf', '').replace(/[_-]/g, ' '),
        authors: doc.metadata?.authors || ['Unknown Author'],
        year: doc.metadata?.year || new Date().getFullYear(),
        journal: doc.metadata?.journal || 'Uploaded Document',
        volume: doc.metadata?.volume || '',
        pages: doc.metadata?.pages || '',
        url: doc.storage_url || '',
        doi: doc.metadata?.doi || '',
        citationCount: doc.metadata?.citationCount || 0,
        type: doc.metadata?.type || 'document',
        field: doc.metadata?.field || doc.category,
        extractedFrom: doc.name,
        verified: doc.status === 'processed'
      };
    }).filter(Boolean) || [];

    return NextResponse.json(citations);

  } catch (error) {
    console.error('Citation extraction error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}