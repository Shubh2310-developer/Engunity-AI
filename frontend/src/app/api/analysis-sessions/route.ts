import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const user_id = searchParams.get('user_id');
    const limit = searchParams.get('limit') || '20';
    const offset = searchParams.get('offset') || '0';
    
    if (!user_id) {
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 });
    }
    
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';
    
    const response = await fetch(`${backendUrl}/api/analysis-sessions?user_id=${user_id}&limit=${limit}&offset=${offset}`, {
      method: 'GET',
    });

    const data = await response.json();
    
    if (!response.ok) {
      return NextResponse.json({ error: data.error || 'Failed to fetch analysis sessions' }, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Analysis sessions proxy error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';
    
    const response = await fetch(`${backendUrl}/api/analysis-sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    
    if (!response.ok) {
      return NextResponse.json({ error: data.error || 'Failed to save analysis session' }, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Save analysis session proxy error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}