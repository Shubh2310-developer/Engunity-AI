import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

const RAG_API_BASE = process.env.RAG_API_BASE || 'http://localhost:8000';

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get the current user session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { documentId, options = {} } = body;

    if (!documentId) {
      return NextResponse.json(
        { error: 'Document ID is required' },
        { status: 400 }
      );
    }

    // Verify document ownership
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('id, user_id, name, status')
      .eq('id', documentId)
      .eq('user_id', session.user.id)
      .single();

    if (docError || !document) {
      return NextResponse.json(
        { error: 'Document not found or access denied' },
        { status: 404 }
      );
    }

    // Call RAG backend
    const ragResponse = await fetch(`${RAG_API_BASE}/rag/analyze-document`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        document_id: documentId,
        user_id: session.user.id,
        options
      }),
    });

    if (!ragResponse.ok) {
      const errorData = await ragResponse.json().catch(() => ({}));
      return NextResponse.json(
        { error: errorData.detail || 'RAG analysis failed' },
        { status: ragResponse.status }
      );
    }

    const result = await ragResponse.json();

    // If analysis completed immediately, update status to ready
    if (result.status === 'completed') {
      await supabase
        .from('documents')
        .update({ 
          status: 'ready',
          updated_at: new Date().toISOString()
        })
        .eq('id', documentId);
    } else {
      // Update document status to processing
      await supabase
        .from('documents')
        .update({ 
          status: 'processing',
          updated_at: new Date().toISOString()
        })
        .eq('id', documentId);
    }

    return NextResponse.json({
      success: true,
      message: result.status === 'completed' ? 'Document analysis completed' : 'Document analysis started',
      data: result
    });

  } catch (error) {
    console.error('RAG analyze error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}