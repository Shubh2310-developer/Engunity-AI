import { NextRequest, NextResponse } from 'next/server';
import { uploadDocument } from '@/lib/firebase/document-storage';

export async function POST(request: NextRequest) {
  try {
    console.log('API: Received upload request');
    
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const userId = formData.get('userId') as string;

    console.log('API: File:', file?.name, 'User:', userId);

    if (!file || !userId) {
      console.error('API: Missing file or userId');
      return NextResponse.json(
        { error: 'File and userId are required' },
        { status: 400 }
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

    // Convert File to browser File object for upload
    console.log('API: Converting file to array buffer');
    const arrayBuffer = await file.arrayBuffer();
    const browserFile = new File([arrayBuffer], file.name, {
      type: file.type,
    });

    console.log('API: Starting document upload');
    // Upload document using our document storage service
    const document = await uploadDocument(browserFile, userId);

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