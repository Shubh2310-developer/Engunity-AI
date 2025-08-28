import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest, { params }: { params: { sessionId: string } }) {
  try {
    const { searchParams } = new URL(request.url);
    const user_id = searchParams.get('user_id');
    
    if (!user_id) {
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 });
    }
    
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';
    
    const response = await fetch(`${backendUrl}/api/analysis-sessions/${params.sessionId}?user_id=${user_id}`, {
      method: 'GET',
    });

    const data = await response.json();
    
    if (!response.ok) {
      return NextResponse.json({ error: data.error || 'Failed to fetch analysis session' }, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Get analysis session proxy error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { sessionId: string } }) {
  try {
    const body = await request.json();
    
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';
    
    const response = await fetch(`${backendUrl}/api/analysis-sessions/${params.sessionId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    
    if (!response.ok) {
      return NextResponse.json({ error: data.error || 'Failed to update analysis session' }, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Update analysis session proxy error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { sessionId: string } }) {
  try {
    const { searchParams } = new URL(request.url);
    const user_id = searchParams.get('user_id');
    
    if (!user_id) {
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 });
    }
    
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';
    
    const response = await fetch(`${backendUrl}/api/analysis-sessions/${params.sessionId}?user_id=${user_id}`, {
      method: 'DELETE',
    });

    const data = await response.json();
    
    if (!response.ok) {
      return NextResponse.json({ error: data.error || 'Failed to delete analysis session' }, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Delete analysis session proxy error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}