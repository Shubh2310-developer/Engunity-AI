import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { ObjectId } from 'mongodb';
import { getDatabase } from '@/lib/database/mongodb';

const RAG_API_BASE = process.env.RAG_API_BASE || 'http://localhost:8000';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies();

    // Debug: Log all cookies
    const allCookies = cookieStore.getAll();
    console.log('🍪 RAG Analyze - Available cookies:', allCookies.map(c => c.name));

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            const value = cookieStore.get(name)?.value;
            console.log(`🍪 Cookie get: ${name} = ${value ? 'found' : 'not found'}`);
            return value;
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

    console.log('🔍 RAG Analyze - Cookie session check:', {
      hasSession: !!session,
      hasSessionError: !!sessionError,
      sessionErrorMessage: sessionError?.message,
      userId: session?.user?.id
    });

    // If no session from cookies, try to get it from Authorization header
    if (!session) {
      const authHeader = request.headers.get('authorization');
      console.log('🔍 RAG Analyze - Checking Authorization header:', {
        hasAuthHeader: !!authHeader,
        startsWithBearer: authHeader?.startsWith('Bearer ')
      });

      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        console.log('📝 RAG Analyze - Verifying token from header...');

        // Use the anon key client to verify the user's token
        const { data: { user }, error: userError } = await supabase.auth.getUser(token);

        if (user && !userError) {
          // Create a session-like object for consistency
          session = {
            access_token: token,
            user: user
          } as any;
          console.log('✅ RAG Analyze - User authenticated via header:', user.id);
        } else {
          console.error('❌ RAG Analyze - Token verification failed:', userError?.message);
        }
      }
    }

    if (!session) {
      console.error('❌ RAG Analyze - Authentication failed: No session found');
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

    console.log('🔍 RAG Analyze - Looking for document:', { documentId, userId: session.user.id });

    // Verify document ownership from MongoDB
    const db = await getDatabase();
    const documentsCollection = db.collection('documents');

    let documentObjectId: ObjectId;
    try {
      documentObjectId = new ObjectId(documentId);
    } catch (err) {
      console.error('❌ RAG Analyze - Invalid document ID format:', documentId);
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
      console.error('❌ RAG Analyze - Document not found or access denied');
      return NextResponse.json(
        { error: 'Document not found or access denied' },
        { status: 404 }
      );
    }

    console.log('✅ RAG Analyze - Document found:', {
      id: document._id.toString(),
      name: document.file_name,
      status: document.processing_status
    });

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

    // Update document status in MongoDB
    const newStatus = result.status === 'completed' ? 'processed' : 'processing';
    await documentsCollection.updateOne(
      { _id: documentObjectId },
      {
        $set: {
          processing_status: newStatus,
          updated_at: new Date()
        }
      }
    );

    console.log('✅ RAG Analyze - Document status updated to:', newStatus);

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