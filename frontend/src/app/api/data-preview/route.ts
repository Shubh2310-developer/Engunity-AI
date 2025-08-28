import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('fileId');
    const page = searchParams.get('page') || '1';
    const pageSize = searchParams.get('pageSize') || '50';
    
    if (!fileId) {
      return NextResponse.json({ error: 'fileId is required' }, { status: 400 });
    }
    
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';
    
    const response = await fetch(`${backendUrl}/api/data-preview?fileId=${fileId}&page=${page}&pageSize=${pageSize}`, {
      method: 'GET',
    });

    const data = await response.json();
    
    if (!response.ok) {
      return NextResponse.json({ error: data.error || 'Failed to fetch data preview' }, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Data preview proxy error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}