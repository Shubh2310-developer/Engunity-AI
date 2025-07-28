import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const limit = parseInt(searchParams.get('limit') || '50');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Mock chat history - in production this would query your database
    const mockHistory = [
      {
        id: `msg_${Date.now() - 60000}`,
        sessionId,
        role: 'user',
        content: 'Hello, can you help me with JavaScript?',
        timestamp: new Date(Date.now() - 60000).toISOString()
      },
      {
        id: `msg_${Date.now() - 30000}`,
        sessionId,
        role: 'assistant', 
        content: 'Of course! I\'d be happy to help you with JavaScript. What specific topic would you like to explore?',
        timestamp: new Date(Date.now() - 30000).toISOString()
      }
    ];

    return NextResponse.json({
      success: true,
      messages: mockHistory.slice(0, limit),
      sessionId,
      totalMessages: mockHistory.length
    });

  } catch (error: any) {
    console.error('Chat history error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve chat history' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // In production, this would delete chat history from database
    return NextResponse.json({
      success: true,
      message: 'Chat history cleared',
      sessionId
    });

  } catch (error: any) {
    console.error('Delete chat history error:', error);
    return NextResponse.json(
      { error: 'Failed to clear chat history' },
      { status: 500 }
    );
  }
}