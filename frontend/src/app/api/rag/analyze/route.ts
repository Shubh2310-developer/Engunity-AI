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
      // Try both lowercase and capitalized versions
      const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');

      // Debug: Log all headers
      const allHeaders: Record<string, string> = {};
      request.headers.forEach((value, key) => {
        allHeaders[key] = value.substring(0, 50); // Truncate for security
      });
      console.log('🔍 RAG Analyze - All headers:', allHeaders);

      console.log('🔍 RAG Analyze - Checking Authorization header:', {
        hasAuthHeader: !!authHeader,
        startsWithBearer: authHeader?.startsWith('Bearer '),
        headerLength: authHeader?.length
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

    const body = await request.json();
    const { documentId, userId, options = {} } = body;

    if (!documentId) {
      return NextResponse.json(
        { error: 'Document ID is required' },
        { status: 400 }
      );
    }

    // Use session user ID if available, otherwise use provided userId
    const effectiveUserId = session?.user?.id || userId;

    console.log('🔍 RAG Analyze - Looking for document:', { documentId, userId: effectiveUserId });

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

    // Build query - if we have a userId, check ownership, otherwise just find by ID
    const query: any = { _id: documentObjectId };
    if (effectiveUserId) {
      query.user_id = effectiveUserId;
    }

    const document = await documentsCollection.findOne(query);

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

    // For now, simply mark document as ready for Q&A
    // The actual RAG analysis happens on-demand during Q&A queries
    await documentsCollection.updateOne(
      { _id: documentObjectId },
      {
        $set: {
          processing_status: 'processed',
          updated_at: new Date(),
          analyzed_at: new Date()
        }
      }
    );

    console.log('✅ RAG Analyze - Document marked as ready for Q&A');

    return NextResponse.json({
      success: true,
      message: 'Document is ready for Q&A',
      data: {
        status: 'completed',
        document_id: documentId,
        document_name: document.file_name,
        ready_for_qa: true
      }
    });

  } catch (error) {
    console.error('RAG analyze error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}