import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDatabase } from '@/lib/database/mongodb';
import { getServerUser } from '@/lib/auth/server-session';

const RAG_API_BASE = process.env.RAG_API_BASE || 'http://localhost:8000';

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 RAG Analyze - Starting document analysis');

    // MongoDB authentication - get user from session cookie
    const user = await getServerUser();

    if (!user) {
      console.error('❌ RAG Analyze - No authenticated user found');
      return NextResponse.json(
        { error: 'Authentication required. Please sign in.' },
        { status: 401 }
      );
    }

    console.log('✅ RAG Analyze - User authenticated:', user.email);

    const body = await request.json();
    const { documentId, userId, options = {} } = body;

    if (!documentId) {
      return NextResponse.json(
        { error: 'Document ID is required' },
        { status: 400 }
      );
    }

    // Use authenticated user's ID
    const effectiveUserId = user._id?.toString() || userId;

    console.log('🔍 RAG Analyze - Looking for document:', { documentId, userId: effectiveUserId });

    // Verify document ownership from MongoDB
    const db = await getDatabase();
    const documentsCollection = db.collection('documents');

    let documentObjectId: ObjectId;
    try {
      documentObjectId = new ObjectId(documentId);
    } catch (err) {
      console.error('❌ RAG Analyze - Invalid document ID format:', documentId);
      return NextResponse.json(
        { error: 'Invalid document ID format' },
        { status: 400 }
      );
    }

    // Build query - if we have a userId, check ownership, otherwise just find by ID
    const query: any = { _id: documentObjectId };
    if (effectiveUserId) {
      query.user_id = effectiveUserId;
    }

    const document = await documentsCollection.findOne(query);

    if (!document) {
      console.error('❌ RAG Analyze - Document not found or access denied');
      return NextResponse.json(
        { error: 'Document not found or access denied' },
        { status: 404 }
      );
    }

    console.log('✅ RAG Analyze - Document found:', {
      id: document._id.toString(),
      name: document.file_name,
      status: document.processing_status
    });

    // For now, simply mark document as ready for Q&A
    // The actual RAG analysis happens on-demand during Q&A queries
    await documentsCollection.updateOne(
      { _id: documentObjectId },
      {
        $set: {
          processing_status: 'processed',
          updated_at: new Date(),
          analyzed_at: new Date()
        }
      }
    );

    console.log('✅ RAG Analyze - Document marked as ready for Q&A');

    return NextResponse.json({
      success: true,
      message: 'Document is ready for Q&A',
      data: {
        status: 'completed',
        document_id: documentId,
        document_name: document.file_name,
        ready_for_qa: true
      }
    });

  } catch (error) {
    console.error('RAG analyze error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}