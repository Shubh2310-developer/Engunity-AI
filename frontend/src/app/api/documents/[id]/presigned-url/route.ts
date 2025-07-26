import { NextRequest, NextResponse } from 'next/server';
import { getDocumentByIdNoAuth } from '@/lib/supabase/document-storage-no-auth';
import { generatePresignedUrl, extractS3KeyFromUrl } from '@/lib/storage/s3-storage';

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

    // Extract S3 key from URL or use stored key
    const s3Key = extractS3KeyFromUrl(document.storage_url) || 
                 (document.metadata as any)?.s3_key ||
                 document.storage_key;

    if (!s3Key) {
      return NextResponse.json(
        { error: 'Cannot generate presigned URL - S3 key not found' },
        { status: 400 }
      );
    }

    // Generate presigned URL (valid for 1 hour)
    const presignedUrl = await generatePresignedUrl(s3Key, 3600);

    return NextResponse.json({
      success: true,
      url: presignedUrl,
      expiresIn: 3600
    });
  } catch (error: any) {
    console.error('Presigned URL generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate presigned URL' },
      { status: 500 }
    );
  }
}