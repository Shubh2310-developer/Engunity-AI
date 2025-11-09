import { NextRequest, NextResponse } from 'next/server';
import { ChatService } from '@/lib/database/mongodb';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const documentId = searchParams.get('documentId') || 'general_chat';

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    const sessions = await ChatService.getDocumentSessions(documentId, userId);
    
    return NextResponse.json({
      success: true,
      sessions
    });

  } catch (error: any) {
    console.error('Error fetching sessions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sessions' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { documentId = 'general_chat', userId, documentInfo, forceNew = false } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    let session;

    // For general_chat, always create a new session to keep chats separate
    // For document-specific chats, use getOrCreateSession to reuse existing sessions
    // forceNew can also be used to explicitly create a new session
    if (documentId === 'general_chat' || forceNew) {
      console.log('📝 Creating NEW session for:', documentId, 'userId:', userId);
      session = await ChatService.createNewSession(
        documentId,
        userId,
        documentInfo
      );
    } else {
      console.log('🔄 Getting or creating session for:', documentId, 'userId:', userId);
      session = await ChatService.getOrCreateSession(
        documentId,
        userId,
        documentInfo
      );
    }

    return NextResponse.json({
      success: true,
      session
    });

  } catch (error: any) {
    console.error('Error creating session:', error);
    return NextResponse.json(
      { error: 'Failed to create session' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, updates } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId is required' },
        { status: 400 }
      );
    }

    if (!updates || typeof updates !== 'object') {
      return NextResponse.json(
        { error: 'updates object is required' },
        { status: 400 }
      );
    }

    // Update the session
    const success = await ChatService.updateSession(sessionId, updates);

    if (!success) {
      return NextResponse.json(
        { error: 'Session not found or update failed' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Session updated successfully'
    });

  } catch (error: any) {
    console.error('Error updating session:', error);
    return NextResponse.json(
      { error: 'Failed to update session' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, userId } = body;

    if (!sessionId || !userId) {
      return NextResponse.json(
        { error: 'sessionId and userId are required' },
        { status: 400 }
      );
    }

    // Delete the session and all its messages
    const success = await ChatService.deleteSession(sessionId, userId);

    if (!success) {
      return NextResponse.json(
        { error: 'Session not found or delete failed' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Session deleted successfully'
    });

  } catch (error: any) {
    console.error('Error deleting session:', error);
    return NextResponse.json(
      { error: 'Failed to delete session' },
      { status: 500 }
    );
  }
}