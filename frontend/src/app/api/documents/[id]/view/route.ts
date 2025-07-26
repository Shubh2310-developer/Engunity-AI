import { NextRequest, NextResponse } from 'next/server';
import { getDocumentByIdNoAuth } from '@/lib/supabase/document-storage-no-auth';

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

    // Get document details
    const document = await getDocumentByIdNoAuth(documentId);
    
    if (!document.storage_url) {
      return NextResponse.json(
        { error: 'Document storage URL not found' },
        { status: 404 }
      );
    }

    // Fetch the file from storage
    const response = await fetch(document.storage_url);
    
    if (!response.ok) {
      console.error('Failed to fetch document from storage:', response.status, response.statusText);
      return NextResponse.json(
        { error: 'Failed to fetch document from storage' },
        { status: 404 }
      );
    }

    const blob = await response.blob();
    
    // Return the file with proper headers
    return new NextResponse(blob, {
      headers: {
        'Content-Type': response.headers.get('content-type') || 'application/octet-stream',
        'Content-Disposition': `inline; filename="${document.name}"`,
        'Cache-Control': 'public, max-age=31536000',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error: any) {
    console.error('Document view error:', error);
    return NextResponse.json(
      { error: 'Failed to serve document' },
      { status: 500 }
    );
  }
}