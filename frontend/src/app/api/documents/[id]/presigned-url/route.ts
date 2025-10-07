import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  _request: NextRequest,
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

    // Since we use Supabase Storage with public URLs and have a view proxy route,
    // we don't need presigned URLs. Just return the view endpoint URL.
    const viewUrl = `/api/documents/${documentId}/view`;

    return NextResponse.json({
      success: true,
      url: viewUrl,
      expiresIn: 3600 // Not actually expiring, but for compatibility
    });
  } catch (error: any) {
    console.error('Presigned URL generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate presigned URL' },
      { status: 500 }
    );
  }
}