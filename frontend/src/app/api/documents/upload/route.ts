import { NextRequest, NextResponse } from 'next/server';
import { uploadDocumentNoAuth } from '@/lib/supabase/document-storage-no-auth';

export async function POST(request: NextRequest) {
  try {
    console.log('API: Received upload request');
    
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const userId = formData.get('userId') as string;

    console.log('API: File:', file?.name, 'User:', userId);

    if (!file) {
      console.error('API: Missing file');
      return NextResponse.json(
        { error: 'File is required' },
        { status: 400 }
      );
    }

    // Use default user ID if not provided (no auth required)
    const finalUserId = userId || 'anonymous-user';
    console.log('API: Using user ID:', finalUserId);

    // Validate file size (50MB limit)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      console.error('API: File too large:', file.size);
      return NextResponse.json(
        { error: 'File size exceeds 50MB limit' },
        { status: 400 }
      );
    }

    console.log('API: Starting document upload without authentication');
    // Upload document using our no-auth document storage service
    const document = await uploadDocumentNoAuth(file, finalUserId);

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