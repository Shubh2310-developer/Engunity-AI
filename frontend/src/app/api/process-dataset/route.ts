import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';
    
    const response = await fetch(`${backendUrl}/api/process-dataset`, {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();
    
    if (!response.ok) {
      return NextResponse.json({ error: data.error || 'Failed to process dataset' }, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Process dataset proxy error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}