import { NextRequest, NextResponse } from 'next/server';
import { updateDocumentStatusNoAuth } from '@/lib/supabase/document-storage-no-auth';

export async function POST(request: NextRequest) {
  try {
    const { documentId } = await request.json();

    if (!documentId) {
      return NextResponse.json(
        { error: 'Document ID is required' },
        { status: 400 }
      );
    }

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // In a real implementation, you would:
    // 1. Extract text from the document
    // 2. Generate embeddings
    // 3. Create searchable chunks
    // 4. Store processed content in database
    // 5. Trigger backend processing via Python services

    // For now, just mark as processed (using Supabase no-auth storage)
    await updateDocumentStatusNoAuth(documentId, 'processed');

    return NextResponse.json({ 
      success: true,
      message: 'Document processed successfully' 
    });
  } catch (error) {
    console.error('Processing error:', error);
    
    // Mark document as failed on error
    try {
      const { documentId } = await request.json();
      if (documentId) {
        await updateDocumentStatusNoAuth(documentId, 'failed');
      }
    } catch (updateError) {
      console.error('Failed to update document status:', updateError);
    }

    return NextResponse.json(
      { error: 'Processing failed' },
      { status: 500 }
    );
  }
}