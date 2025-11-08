import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database/mongodb';
import { ObjectId } from 'mongodb';
import { getServerUser } from '@/lib/auth/server-session';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

// MongoDB-only implementation - NO SUPABASE
// Files are stored in local filesystem and referenced in MongoDB

// Server-side document upload function (MongoDB + Local Filesystem)
async function uploadDocumentServerSide(file: File, userId: string, user: any) {
  try {
    console.log('Server: Starting MongoDB upload for:', file.name, 'User:', userId);

    // Generate unique filename
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 8);
    const fileExtension = file.name.split('.').pop();
    const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
    const uniqueFilename = `${timestamp}_${randomId}_${baseName}.${fileExtension}`;

    // Define upload directory (public/uploads/documents)
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'documents', userId);
    const filePath = join(uploadDir, uniqueFilename);
    const storagePath = `uploads/documents/${userId}/${uniqueFilename}`;
    const publicUrl = `http://localhost:3000/${storagePath}`;

    console.log('Server: Uploading to local filesystem:', filePath);

    // Create directory if it doesn't exist
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
      console.log('Server: Created upload directory:', uploadDir);
    }

    // Convert file to buffer and save to filesystem
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    try {
      await writeFile(filePath, buffer);
      console.log('Server: File saved successfully to:', filePath);
    } catch (fsError: any) {
      console.error('Server: Filesystem write error:', fsError);
      throw new Error(`File write failed: ${fsError.message}`);
    }
    
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

      // Try to clean up uploaded file from filesystem
      try {
        const fs = require('fs');
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log('Server: Cleaned up uploaded file after database error');
        }
      } catch (cleanupError) {
        console.warn('Server: Failed to cleanup uploaded file:', cleanupError);
      }

      throw new Error(`Database error: ${dbError.message}`);
    }

    // Extract text from document in background (non-blocking)
    const documentId = insertResult.insertedId.toString();
    console.log('Server: Triggering text extraction for document:', documentId);

    // Call backend to process document asynchronously
    try {
      fetch(`http://localhost:8000/api/documents/${documentId}/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storage_url: publicUrl,
          file_type: file.type,
          file_name: file.name
        })
      }).catch(err => {
        console.warn('Server: Background text extraction failed:', err.message);
        // Don't block upload on extraction failure
      });
      console.log('Server: Text extraction triggered in background');
    } catch (extractError) {
      console.warn('Server: Failed to trigger text extraction:', extractError);
      // Don't fail upload if extraction fails
    }
    
    console.log('Server: Document record created successfully in MongoDB:', insertResult.insertedId);

    // Return document data in expected format
    return {
      id: insertResult.insertedId.toString(),
      user_id: userId,
      name: file.name,
      type: getDocumentType(file.type),
      size: formatFileSize(file.size),
      category: 'general',
      status: 'uploaded' as const,
      uploaded_at: documentData.created_at,
      processed_at: null,
      storage_url: publicUrl,
      metadata: {},
      tags: []
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

    // Verify MongoDB authentication
    console.log('API: Verifying MongoDB authentication...');

    try {
      const authenticatedUser = await getServerUser();

      if (!authenticatedUser) {
        console.error('API: No authenticated user found');
        return NextResponse.json(
          { error: 'Authentication required. Please sign in.' },
          { status: 401 }
        );
      }

      console.log('API: User authenticated successfully via MongoDB:', authenticatedUser.email);


      // Use authenticated user's ID
      const authUserId = authenticatedUser._id?.toString();

      if (!authUserId) {
        console.error('API: Invalid user ID');
        return NextResponse.json(
          { error: 'Invalid user ID' },
          { status: 401 }
        );
      }

      // If userId was provided in form, verify it matches authenticated user
      if (userId && userId !== authUserId) {
        console.error('API: User ID mismatch - authenticated:', authUserId, 'provided:', userId);
        return NextResponse.json(
          { error: 'User ID mismatch' },
          { status: 403 }
        );
      }

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
      const document = await uploadDocumentServerSide(file, authUserId, authenticatedUser);

      console.log('API: Upload successful, document ID:', document.id);
      return NextResponse.json(document);

    } catch (authError: any) {
      console.error('API: Authentication error:', authError);
      console.error('API: Error stack:', authError.stack);
      return NextResponse.json(
        { error: `Authentication failed: ${authError.message}` },
        { status: 401 }
      );
    }
  } catch (error: any) {
    console.error('API: Upload error:', error);
    return NextResponse.json(
      { error: error.message || 'Upload failed' },
      { status: 500 }
    );
  }
}