import { NextRequest, NextResponse } from 'next/server';

// Configuration
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';
const API_KEY = process.env.API_KEY;

interface ChatStreamRequest {
  message: string;
  sessionId?: string;
  userId?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const body: ChatStreamRequest = await request.json();
    
    if (!body.message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Prepare headers for backend request
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (API_KEY) {
      headers['Authorization'] = `Bearer ${API_KEY}`;
    }

    // Try to call backend chat API with timeout
    let backendResponse;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      backendResponse = await fetch(`${BACKEND_URL}/api/v1/chat/stream`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: body.message,
          session_id: body.sessionId || `session_${Date.now()}`,
          model: body.model || 'default',
          temperature: body.temperature || 0.7,
          max_tokens: body.maxTokens || 2000,
          stream: body.stream !== false
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (!backendResponse.ok) {
        throw new Error(`Backend responded with status ${backendResponse.status}`);
      }
    } catch (fetchError: any) {
      console.warn('Backend chat service unavailable, using fallback response:', fetchError.message);
      
      // Return immediate fallback response instead of trying to process further
      const fallbackResponse = {
        success: true,
        response: `I apologize, but the chat service is temporarily unavailable. I received your message: "${body.message}"

I would normally provide a detailed response using our CS-enhanced system, but the backend service isn't currently running. Please try again once the backend service is started.

To start the backend service, run: \`python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000\``,
        sessionId: body.sessionId || `fallback_${Date.now()}`,
        messageId: `msg_${Date.now()}`,
        model: 'fallback',
        usage: {
          promptTokens: body.message.length,
          completionTokens: 100,
          totalTokens: body.message.length + 100
        },
        fallback: true,
        error: 'Backend service unavailable'
      };

      return NextResponse.json(fallbackResponse);
    }

    // If streaming is requested, return the stream
    if (body.stream !== false && backendResponse.body) {
      return new NextResponse(backendResponse.body, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    // Otherwise return JSON response
    const data = await backendResponse.json();
    return NextResponse.json(data);

  } catch (error: any) {
    console.error('Chat stream error:', error);
    
    // Fallback response if backend is unavailable
    const fallbackResponse = {
      success: true,
      response: `I apologize, but the chat service is temporarily unavailable. Your question has been received, but I cannot process it right now. Please try again in a moment.`,
      sessionId: `fallback_${Date.now()}`,
      messageId: `msg_${Date.now()}`,
      model: 'fallback',
      usage: {
        promptTokens: 0,
        completionTokens: 50,
        totalTokens: 50
      },
      fallback: true
    };

    return NextResponse.json(fallbackResponse);
  }
}

export async function GET() {
  // Health check endpoint
  return NextResponse.json({
    status: 'healthy',
    service: 'chat-stream-api',
    timestamp: new Date().toISOString(),
    methods: ['POST']
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Allow': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}