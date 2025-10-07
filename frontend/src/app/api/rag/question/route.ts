import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { ObjectId } from 'mongodb';
import { getDatabase } from '@/lib/database/mongodb';

const RAG_API_BASE = process.env.RAG_API_BASE || 'http://localhost:8000';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            try {
              cookieStore.set({ name, value, ...options });
            } catch (error) {
              // The `set` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
          remove(name: string, options: CookieOptions) {
            try {
              cookieStore.set({ name, value: '', ...options });
            } catch (error) {
              // The `delete` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
        },
      }
    );

    // Try to get session from cookies first
    let session = (await supabase.auth.getSession()).data.session;
    let sessionError = (await supabase.auth.getSession()).error;

    console.log('🔍 RAG Question - Cookie session check:', {
      hasSession: !!session,
      hasSessionError: !!sessionError,
      userId: session?.user?.id
    });

    // If no session from cookies, try to get it from Authorization header
    if (!session) {
      const authHeader = request.headers.get('authorization');

      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        console.log('📝 RAG Question - Verifying token from header...');

        // Use the anon key client to verify the user's token
        const { data: { user }, error: userError } = await supabase.auth.getUser(token);

        if (user && !userError) {
          // Create a session-like object for consistency
          session = {
            access_token: token,
            user: user
          } as any;
          console.log('✅ RAG Question - User authenticated via header:', user.id);
        } else {
          console.error('❌ RAG Question - Token verification failed:', userError?.message);
        }
      }
    }

    if (!session) {
      console.error('❌ RAG Question - Authentication failed: No session found');
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

    // Verify document ownership and status from MongoDB
    const db = await getDatabase();
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

    const document = await documentsCollection.findOne({
      _id: documentObjectId,
      user_id: session.user.id
    });

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found or access denied' },
        { status: 404 }
      );
    }

    if (document.processing_status !== 'processed') {
      return NextResponse.json(
        {
          error: 'Document not ready for questions',
          status: document.processing_status,
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

    // Log the Q&A interaction in MongoDB (optional)
    try {
      await db.collection('document_interactions').insertOne({
        document_id: documentObjectId,
        user_id: session.user.id,
        interaction_type: 'question_answer',
        question: question,
        confidence: result.confidence,
        processing_time: result.processing_time,
        created_at: new Date()
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