import { NextRequest, NextResponse } from 'next/server';
import { ChatService } from '@/lib/database/mongodb';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId is required' },
        { status: 400 }
      );
    }

    const messages = await ChatService.getChatHistory(sessionId, limit, offset);
    
    return NextResponse.json({
      success: true,
      messages
    });

  } catch (error: any) {
    console.error('Error fetching messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const messageData = await request.json();

    const savedMessage = await ChatService.saveMessage(messageData);

    return NextResponse.json({
      success: true,
      message: savedMessage
    });

  } catch (error: any) {
    console.error('Error saving message:', error);
    return NextResponse.json(
      { error: 'Failed to save message' },
      { status: 500 }
    );
  }
}