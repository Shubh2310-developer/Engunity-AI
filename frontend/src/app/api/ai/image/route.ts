import { NextRequest, NextResponse } from 'next/server';
import { generateImagesViaRest } from '@/lib/services/gemini-images';

export async function POST(request: NextRequest) {
  try {
    const { prompt, aspectRatio, n, quality } = await request.json();

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length < 3) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const start = Date.now();
    const result = await generateImagesViaRest({ prompt: prompt.trim(), aspectRatio, n, quality });

    const images = result.images.map(img => ({
      mimeType: img.mimeType,
      // return as data URLs to simplify frontend render
      dataUrl: `data:${img.mimeType};base64,${img.data}`
    }));

    return NextResponse.json({
      success: true,
      images,
      model: result.model,
      prompt: result.prompt,
      timingMs: Date.now() - start
    });
  } catch (error: any) {
    console.error('Image generation error:', error);
    const message = error?.message || 'Failed to generate image';
    const status = message.includes('Unauthorized') ? 401 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}

export async function GET() {
  // Health check and verification
  const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;

  return NextResponse.json({
    service: 'AI Image Generation',
    status: 'ok',
    model: 'imagen-3.0-fast',
    apiKeyConfigured: !!apiKey,
    apiKeyLength: apiKey ? apiKey.length : 0,
    ts: new Date().toISOString()
  });
}
