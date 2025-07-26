import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client for server-side operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

// Create Supabase client with service role key for server-side operations
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Create regular Supabase client for user authentication
const supabase = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export async function GET(request: NextRequest) {
  try {
    console.log('=== API DOCUMENTS LIST DEBUG START ===');
    console.log('API: Received documents list request');
    
    // Get authentication token from Authorization header
    const authHeader = request.headers.get('authorization');
    console.log('API: Authorization header check:', {
      hasAuthHeader: !!authHeader,
      startsWithBearer: authHeader?.startsWith('Bearer ')
    });
    
    if (!authHeader?.startsWith('Bearer ')) {
      console.error('API: Missing or invalid authorization header');
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    console.log('API: Extracted token length:', token.length);

    // Verify Supabase authentication token
    let authenticatedUser;
    try {
      const { data: { user }, error } = await supabase.auth.getUser(token);
      
      if (error) {
        console.error('API: Token verification error:', error);
        return NextResponse.json(
          { error: 'Invalid authentication token' },
          { status: 401 }
        );
      }

      if (!user) {
        console.error('API: No user found from token');
        return NextResponse.json(
          { error: 'User not found' },
          { status: 401 }
        );
      }

      authenticatedUser = user;
      console.log('API: User authenticated successfully:', user.id);

    } catch (authError) {
      console.error('API: Authentication verification failed:', authError);
      return NextResponse.json(
        { error: 'Authentication verification failed' },
        { status: 401 }
      );
    }

    // Fetch documents using admin client to bypass RLS
    console.log('API: Fetching documents for user:', authenticatedUser.id);
    
    const { data: documents, error: fetchError } = await supabaseAdmin
      .from('documents')
      .select('*')
      .eq('user_id', authenticatedUser.id)
      .order('uploaded_at', { ascending: false });

    if (fetchError) {
      console.error('API: Error fetching documents:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch documents' },
        { status: 500 }
      );
    }

    console.log('API: Documents fetched successfully:', documents?.length || 0);
    console.log('=== API DOCUMENTS LIST DEBUG END ===');
    
    return NextResponse.json(documents || []);

  } catch (error: any) {
    console.error('API: List documents error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to list documents' },
      { status: 500 }
    );
  }
}