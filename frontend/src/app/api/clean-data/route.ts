import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';
    
    const response = await fetch(`${backendUrl}/api/clean-data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    
    if (!response.ok) {
      return NextResponse.json({ error: data.error || 'Failed to clean data' }, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Clean data proxy error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}