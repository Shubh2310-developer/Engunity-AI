import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';
    
    const response = await fetch(`${backendUrl}/api/query-nlq`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    
    if (!response.ok) {
      return NextResponse.json({ error: data.error || 'Query execution failed' }, { status: response.status });
    }

    // Normalize NLQ response format to match SQL format (convert objects to arrays)
    if (data.results && data.results.rows && data.results.columns) {
      const normalizedRows = data.results.rows.map((row: any) => {
        if (typeof row === 'object' && row !== null && !Array.isArray(row)) {
          // Convert object to array in column order
          return data.results.columns.map((col: string) => row[col]);
        }
        return row; // Already an array
      });
      
      data.results.rows = normalizedRows;
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Query NLQ proxy error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}