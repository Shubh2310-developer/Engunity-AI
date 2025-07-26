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

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('=== API DELETE DOCUMENT DEBUG START ===');
    console.log('API: Received delete request for document ID:', params.id);
    
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

    // First, get the document to verify ownership and get storage URL
    console.log('API: Fetching document details for deletion...');
    const { data: document, error: fetchError } = await supabaseAdmin
      .from('documents')
      .select('*')
      .eq('id', params.id)
      .eq('user_id', authenticatedUser.id)
      .single();

    if (fetchError) {
      console.error('API: Error fetching document:', fetchError);
      return NextResponse.json(
        { error: 'Document not found or access denied' },
        { status: 404 }
      );
    }

    if (!document) {
      console.error('API: Document not found or user does not own it');
      return NextResponse.json(
        { error: 'Document not found or access denied' },
        { status: 404 }
      );
    }

    console.log('API: Document found, proceeding with deletion:', {
      documentId: document.id,
      documentName: document.name,
      hasStorageUrl: !!document.storage_url
    });

    // Delete from Supabase database first
    console.log('API: Deleting from database...');
    const { error: dbError } = await supabaseAdmin
      .from('documents')
      .delete()
      .eq('id', params.id)
      .eq('user_id', authenticatedUser.id);

    if (dbError) {
      console.error('API: Database delete error:', dbError);
      return NextResponse.json(
        { error: `Database delete failed: ${dbError.message}` },
        { status: 500 }
      );
    }

    console.log('API: Document deleted from database successfully');

    // Delete from Supabase Storage
    if (document.storage_url) {
      try {
        console.log('API: Deleting from storage...');
        
        // Extract storage path from URL
        const url = new URL(document.storage_url);
        const pathParts = url.pathname.split('/');
        const documentsIndex = pathParts.findIndex(p => p === 'documents');
        
        if (documentsIndex !== -1) {
          const storagePath = pathParts.slice(documentsIndex).join('/');
          console.log('API: Attempting to delete storage path:', storagePath);
          
          const { error: storageError } = await supabaseAdmin.storage
            .from('documents')
            .remove([storagePath]);
          
          if (storageError) {
            console.warn('API: Storage delete warning (non-fatal):', storageError);
            // Don't fail the entire operation if storage delete fails
          } else {
            console.log('API: File deleted from storage successfully');
          }
        } else {
          console.warn('API: Could not parse storage path from URL');
        }
      } catch (storageError) {
        console.warn('API: Storage delete error (non-fatal):', storageError);
        // Don't fail the entire operation if storage delete fails
      }
    }

    console.log('API: Document deletion completed successfully');
    console.log('=== API DELETE DOCUMENT DEBUG END ===');
    
    return NextResponse.json({ 
      success: true, 
      message: 'Document deleted successfully',
      deletedDocument: {
        id: document.id,
        name: document.name
      }
    });

  } catch (error: any) {
    console.error('API: Delete document error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete document' },
      { status: 500 }
    );
  }
}