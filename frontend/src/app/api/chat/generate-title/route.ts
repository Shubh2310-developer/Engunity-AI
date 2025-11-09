import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || process.env.NEXT_PUBLIC_GROQ_API_KEY,
});

/**
 * POST /api/chat/generate-title
 * Generate a concise, meaningful title for a chat based on the user's message
 */
export async function POST(request: NextRequest) {
  try {
    const { userMessage } = await request.json();

    if (!userMessage || typeof userMessage !== 'string') {
      return NextResponse.json(
        { error: 'User message is required' },
        { status: 400 }
      );
    }

    // Use Groq to generate a concise title
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that generates concise, descriptive titles for chat conversations. Generate a title that is 3-6 words long, capturing the main topic or question. Do not use quotes, punctuation at the end, or any special formatting. Just return the plain title text.'
        },
        {
          role: 'user',
          content: `Generate a concise title (3-6 words) for a chat that starts with this message: "${userMessage}"`
        }
      ],
      temperature: 0.7,
      max_tokens: 50,
    });

    const title = completion.choices[0]?.message?.content?.trim() || 'New Chat';

    // Clean up the title (remove quotes if added, limit length)
    const cleanTitle = title
      .replace(/^["']|["']$/g, '') // Remove leading/trailing quotes
      .substring(0, 60) // Max 60 characters
      .trim();

    return NextResponse.json({
      success: true,
      title: cleanTitle
    });

  } catch (error: any) {
    console.error('Error generating chat title:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to generate title',
        title: 'New Chat' // Fallback title
      },
      { status: 500 }
    );
  }
}
