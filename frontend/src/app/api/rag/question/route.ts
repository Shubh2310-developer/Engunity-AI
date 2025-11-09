import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDatabase } from '@/lib/database/mongodb';
import { getServerUser } from '@/lib/auth/server-session';

const RAG_API_BASE = process.env.RAG_API_BASE || 'http://localhost:8000';

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 RAG Question - Starting question processing');

    // MongoDB authentication - get user from session cookie
    const user = await getServerUser();

    if (!user) {
      console.error('❌ RAG Question - No authenticated user found');
      return NextResponse.json(
        { error: 'Authentication required. Please sign in.' },
        { status: 401 }
      );
    }

    console.log('✅ RAG Question - User authenticated:', user.email);

    const body = await request.json();
    const {
      documentId,
      question,
      responseFormat = 'detailed',
      maxSources = 5
    } = body;

    if (!documentId || !question) {
      return NextResponse.json(
        { error: 'Document ID and question are required' },
        { status: 400 }
      );
    }

    // Verify document ownership and status from MongoDB
    const db = await getDatabase();
    const documentsCollection = db.collection('documents');

    let documentObjectId: ObjectId;
    try {
      documentObjectId = new ObjectId(documentId);
    } catch (err) {
      return NextResponse.json(
        { error: 'Invalid document ID format' },
        { status: 400 }
      );
    }

    // Use authenticated user's ID
    const effectiveUserId = user._id?.toString();

    const document = await documentsCollection.findOne({
      _id: documentObjectId,
      user_id: effectiveUserId
    });

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found or access denied' },
        { status: 404 }
      );
    }

    if (document.processing_status !== 'processed') {
      return NextResponse.json(
        {
          error: 'Document not ready for questions',
          status: document.processing_status,
          message: 'Please wait for document processing to complete'
        },
        { status: 400 }
      );
    }

    // Call RAG backend for question answering
    const ragResponse = await fetch(`${RAG_API_BASE}/rag/question-answer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        document_id: documentId,
        question: question,
        user_id: effectiveUserId,
        response_format: responseFormat,
        max_sources: maxSources
      }),
    });

    if (!ragResponse.ok) {
      const errorData = await ragResponse.json().catch(() => ({}));
      return NextResponse.json(
        { error: errorData.detail || 'Question processing failed' },
        { status: ragResponse.status }
      );
    }

    const result = await ragResponse.json();

    // Log the Q&A interaction in MongoDB (optional)
    try {
      await db.collection('document_interactions').insertOne({
        document_id: documentObjectId,
        user_id: effectiveUserId,
        interaction_type: 'question_answer',
        question: question,
        confidence: result.confidence,
        processing_time: result.processing_time,
        created_at: new Date()
      });
    } catch (logError) {
      // Non-critical error, don't fail the request
      console.warn('Failed to log Q&A interaction:', logError);
    }

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('RAG question error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}