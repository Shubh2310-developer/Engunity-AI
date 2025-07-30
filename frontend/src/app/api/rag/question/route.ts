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
    const { 
      documentId, 
      question, 
      responseFormat = 'detailed',
      maxSources = 5 
    } = body;

    if (!documentId || !question) {
      return NextResponse.json(
        { error: 'Document ID and question are required' },
        { status: 400 }
      );
    }

    // Verify document ownership and status
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

    if (document.status !== 'ready' && document.status !== 'processed') {
      return NextResponse.json(
        { 
          error: 'Document not ready for questions',
          status: document.status,
          message: 'Please wait for document processing to complete'
        },
        { status: 400 }
      );
    }

    // Call RAG backend for question answering
    const ragResponse = await fetch(`${RAG_API_BASE}/rag/question-answer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        document_id: documentId,
        question: question,
        user_id: session.user.id,
        response_format: responseFormat,
        max_sources: maxSources
      }),
    });

    if (!ragResponse.ok) {
      const errorData = await ragResponse.json().catch(() => ({}));
      return NextResponse.json(
        { error: errorData.detail || 'Question processing failed' },
        { status: ragResponse.status }
      );
    }

    const result = await ragResponse.json();

    // Log the Q&A interaction (optional)
    try {
      await supabase
        .from('document_interactions')
        .insert({
          document_id: documentId,
          user_id: session.user.id,
          interaction_type: 'question_answer',
          question: question,
          confidence: result.confidence,
          processing_time: result.processing_time,
          created_at: new Date().toISOString()
        });
    } catch (logError) {
      // Non-critical error, don't fail the request
      console.warn('Failed to log Q&A interaction:', logError);
    }

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('RAG question error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}