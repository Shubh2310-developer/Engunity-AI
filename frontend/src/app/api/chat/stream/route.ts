import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';

// Configuration
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';
const API_KEY = process.env.API_KEY;
const GROQ_API_KEY = process.env.GROQ_API_KEY || process.env.NEXT_PUBLIC_GROQ_API_KEY;

// Initialize Groq client
const groq = GROQ_API_KEY ? new Groq({ apiKey: GROQ_API_KEY }) : null;

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

    // Use Groq directly with GPT-OSS-120B model
    if (groq) {
      try {
        console.log('🚀 Using Groq GPT-OSS-120B model for chat');

        const chatCompletion = await groq.chat.completions.create({
          messages: [
            {
              role: 'system',
              content: "You are Engunity AI Chat & Code Assistant. You help with programming, engineering questions, and code generation. Be concise, accurate, and helpful. Format code blocks properly using markdown."
            },
            {
              role: 'user',
              content: body.message
            }
          ],
          model: 'llama-3.3-70b-versatile', // Using llama as GPT-OSS-120B may not be available
          temperature: body.temperature || 0.7,
          max_completion_tokens: body.maxTokens || 4096,
          top_p: 1,
          stream: false
        });

        const response = chatCompletion.choices[0]?.message?.content || 'No response generated';
        const usage = chatCompletion.usage;

        return NextResponse.json({
          success: true,
          response,
          sessionId: body.sessionId || `session_${Date.now()}`,
          messageId: `msg_${Date.now()}`,
          model: 'llama-3.3-70b-versatile',
          usage: {
            promptTokens: usage?.prompt_tokens || 0,
            completionTokens: usage?.completion_tokens || 0,
            totalTokens: usage?.total_tokens || 0
          },
          timestamp: new Date().toISOString()
        });

      } catch (groqError: any) {
        console.error('Groq API error:', groqError);
        // Fall through to fallback
      }
    }

    // Fallback response if Groq is unavailable
    const fallbackResponse = {
      success: true,
      response: `I received your message: "${body.message}"

I'm here to help with programming, engineering, and computer science questions. However, the AI service is currently in fallback mode.

**What I can help with:**
- Programming & Development (Code architecture, debugging, best practices)
- Algorithms & Data Structures (Design, complexity analysis, implementation)
- System Design (Scalability, performance optimization, distributed systems)
- Software Engineering (Design patterns, testing strategies, code quality)

Please note: The Groq API key is ${GROQ_API_KEY ? 'configured but experiencing issues' : 'not configured'}. For full capabilities, ensure the GROQ_API_KEY environment variable is set.`,
      sessionId: body.sessionId || `fallback_${Date.now()}`,
      messageId: `msg_${Date.now()}`,
      model: 'fallback',
      usage: {
        promptTokens: body.message.length,
        completionTokens: 150,
        totalTokens: body.message.length + 150
      },
      fallback: true,
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(fallbackResponse);

  } catch (error: any) {
    console.error('Chat stream error:', error);

    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      message: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
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