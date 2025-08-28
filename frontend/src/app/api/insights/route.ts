import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('fileId');
    
    if (!fileId) {
      return NextResponse.json({ error: 'fileId is required' }, { status: 400 });
    }
    
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';
    
    const response = await fetch(`${backendUrl}/api/insights?fileId=${fileId}`, {
      method: 'GET',
    });

    const data = await response.json();
    
    if (!response.ok) {
      return NextResponse.json({ error: data.error || 'Failed to fetch AI insights' }, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Insights proxy error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}