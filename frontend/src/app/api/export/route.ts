import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('fileId');
    const format = searchParams.get('format');
    
    if (!fileId || !format) {
      return NextResponse.json({ error: 'fileId and format are required' }, { status: 400 });
    }
    
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';
    
    const response = await fetch(`${backendUrl}/api/export?fileId=${fileId}&format=${format}`, {
      method: 'GET',
    });

    const data = await response.json();
    
    if (!response.ok) {
      return NextResponse.json({ error: data.error || 'Failed to export data' }, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Export proxy error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}