import { NextRequest, NextResponse } from 'next/server';
import { getDocumentByIdNoAuth } from '@/lib/supabase/document-storage-no-auth';
import { extractS3KeyFromUrl } from '@/lib/storage/s3-storage';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const documentId = params.id;

    if (!documentId) {
      return NextResponse.json(
        { error: 'Document ID is required' },
        { status: 400 }
      );
    }

    const document = await getDocumentByIdNoAuth(documentId);

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Try to extract metadata from S3 file if not available
    let metadata = document.metadata || {};
    
    // If pages is not set and this is a PDF, try to get it from the file
    if (!metadata.pages && document.type === 'PDF') {
      try {
        // For PDF files, we can attempt to extract metadata
        // This is a placeholder - in a real implementation you'd use a PDF parsing library
        // or service to extract the actual page count
        metadata = {
          ...metadata,
          pages: 1, // Default for now
          estimated: true
        };
      } catch (error) {
        console.log('Could not extract PDF metadata:', error);
      }
    }

    // Return enhanced metadata
    return NextResponse.json({
      success: true,
      metadata: {
        ...metadata,
        pages: metadata.pages || 1,
        word_count: metadata.word_count || 0,
        language: metadata.language || 'en',
        file_size: document.size,
        file_type: document.type,
        upload_date: document.uploaded_at,
        processed_date: document.processed_at,
        status: document.status
      }
    });
  } catch (error) {
    console.error('Get document metadata error:', error);
    return NextResponse.json(
      { error: 'Failed to get document metadata' },
      { status: 500 }
    );
  }
}