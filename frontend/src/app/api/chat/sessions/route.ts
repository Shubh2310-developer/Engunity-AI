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
    const { documentId = 'general_chat', userId, documentInfo } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    const session = await ChatService.getOrCreateSession(
      documentId,
      userId,
      documentInfo
    );

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