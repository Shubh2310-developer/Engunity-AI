import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getDatabase } from '@/lib/database/mongodb';
import { ObjectId } from 'mongodb';

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

// Server-side document upload function
async function uploadDocumentServerSide(file: File, userId: string, user: any) {
  try {
    console.log('Server: Starting Supabase upload for:', file.name, 'User:', userId);
    
    // Generate unique filename
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 8);
    const fileExtension = file.name.split('.').pop();
    const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
    const uniqueFilename = `${timestamp}_${randomId}_${baseName}.${fileExtension}`;
    const storagePath = `documents/${userId}/${uniqueFilename}`;
    
    console.log('Server: Uploading to Supabase Storage path:', storagePath);
    
    // Upload file to Supabase Storage using admin client
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('documents')
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false
      });
    
    if (uploadError) {
      console.error('Server: Supabase Storage upload error:', uploadError);
      throw new Error(`Upload failed: ${uploadError.message}`);
    }
    
    console.log('Server: Supabase Storage upload successful:', uploadData.path);
    
    // Get public URL for the uploaded file
    const { data: urlData } = supabaseAdmin.storage
      .from('documents')
      .getPublicUrl(storagePath);
    
    const publicUrl = urlData.publicUrl;
    console.log('Server: Document public URL:', publicUrl);
    
    // Create document record in MongoDB Atlas
    const documentData = {
      user_id: userId,
      file_name: file.name,
      original_filename: file.name,
      file_type: file.type,
      file_size: file.size,
      file_path: storagePath,
      storage_url: publicUrl,
      processing_status: 'uploaded',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
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
      category: null,
      domain: null,
      authors: [],
      publication_date: null,
      journal: null,
      doi: null
    };
    
    // Insert document into MongoDB Atlas
    const db = await getDatabase();
    const documentsCollection = db.collection('documents');
    
    let insertResult;
    try {
      insertResult = await documentsCollection.insertOne(documentData);
      console.log('Server: Document record created successfully in MongoDB:', insertResult.insertedId);
    } catch (dbError: any) {
      console.error('Server: MongoDB insert error:', dbError);
      
      // Try to clean up uploaded file
      try {
        await supabaseAdmin.storage.from('documents').remove([storagePath]);
        console.log('Server: Cleaned up uploaded file after database error');
      } catch (cleanupError) {
        console.warn('Server: Failed to cleanup uploaded file:', cleanupError);
      }
      
      throw new Error(`Database error: ${dbError.message}`);
    }
    
    const dbData = {
      id: insertResult.insertedId.toString(),
      user_id: documentData.user_id,
      name: documentData.file_name,
      type: getDocumentType(file.type),
      size: formatFileSize(file.size),
      category: 'general',
      status: 'uploaded' as const,
      uploaded_at: documentData.created_at,
      processed_at: null,
      storage_url: publicUrl
    };
    
    console.log('Server: Document record created successfully:', dbData.id);
    
    return {
      id: dbData.id,
      userId: dbData.user_id,
      name: dbData.name,
      type: dbData.type,
      size: dbData.size,
      category: dbData.category,
      status: dbData.status,
      uploadedAt: { seconds: Math.floor(new Date(dbData.uploaded_at).getTime() / 1000) },
      processedAt: { seconds: Math.floor(new Date(dbData.processed_at).getTime() / 1000) },
      storageUrl: dbData.storage_url,
      metadata: dbData.metadata,
      tags: dbData.tags
    };
    
  } catch (error: any) {
    console.error('Server: Document upload error:', error);
    throw new Error(`Upload failed: ${error.message || error}`);
  }
}

// Utility functions
function getDocumentType(mimeType: string): string {
  const typeMap: Record<string, string> = {
    'application/pdf': 'PDF',
    'application/msword': 'DOCX',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
    'application/vnd.ms-excel': 'XLSX',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'XLSX',
    'application/vnd.ms-powerpoint': 'PPTX',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PPTX',
    'text/plain': 'TXT',
    'text/markdown': 'MD',
    'text/csv': 'CSV',
    'text/html': 'HTML',
    'text/xml': 'XML',
    'application/json': 'JSON',
    'application/rtf': 'RTF',
    'text/rtf': 'RTF',
  };
  
  return typeMap[mimeType] || 'TXT';
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export async function POST(request: NextRequest) {
  try {
    console.log('=== API UPLOAD DEBUG START ===');
    console.log('API: Received upload request');
    
    console.log('API: Request headers received:', {
      'content-type': request.headers.get('content-type'),
      'authorization': request.headers.get('authorization') ? 'Bearer [TOKEN_PRESENT]' : 'MISSING',
      'user-agent': request.headers.get('user-agent'),
      'x-forwarded-for': request.headers.get('x-forwarded-for')
    });
    
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const userId = formData.get('userId') as string;

    console.log('API: Form data:', {
      file: file ? `${file.name} (${file.size} bytes)` : 'MISSING',
      userId: userId || 'MISSING',
      formDataKeys: Array.from(formData.keys())
    });

    if (!file) {
      console.error('API: Missing file');
      return NextResponse.json(
        { error: 'File is required' },
        { status: 400 }
      );
    }

    // Require authenticated user - no anonymous uploads
    if (!userId) {
      console.error('API: Missing user ID - authentication required');
      return NextResponse.json(
        { error: 'User authentication required for document upload' },
        { status: 401 }
      );
    }

    // Get authentication token from Authorization header
    const authHeader = request.headers.get('authorization');
    console.log('API: Authorization header check:', {
      hasAuthHeader: !!authHeader,
      startsWithBearer: authHeader?.startsWith('Bearer '),
      authHeaderLength: authHeader?.length,
      authHeaderPreview: authHeader?.substring(0, 20) + '...'
    });
    
    if (!authHeader?.startsWith('Bearer ')) {
      console.error('API: Missing or invalid authorization header');
      console.log('=== API UPLOAD DEBUG END (AUTH HEADER ERROR) ===');
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    console.log('API: Extracted token:', {
      tokenLength: token.length,
      tokenPreview: token.substring(0, 30) + '...'
    });
    console.log('API: Attempting to verify Supabase token...');

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

      if (user.id !== userId) {
        console.error('API: User ID mismatch - token user:', user.id, 'provided user:', userId);
        return NextResponse.json(
          { error: 'User ID mismatch' },
          { status: 403 }
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

    console.log('API: Using authenticated user ID:', userId);

    // Validate file size (50MB limit)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      console.error('API: File too large:', file.size);
      return NextResponse.json(
        { error: 'File size exceeds 50MB limit' },
        { status: 400 }
      );
    }

    console.log('API: Starting authenticated document upload to Supabase');
    // Upload document directly using Supabase (since we have server-side auth)
    const document = await uploadDocumentServerSide(file, userId, authenticatedUser);

    console.log('API: Upload successful, document ID:', document.id);
    return NextResponse.json(document);
  } catch (error: any) {
    console.error('API: Upload error:', error);
    return NextResponse.json(
      { error: error.message || 'Upload failed' },
      { status: 500 }
    );
  }
}