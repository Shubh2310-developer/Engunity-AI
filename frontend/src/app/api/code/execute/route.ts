import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { code, language, input } = await request.json()

    if (!code || !language) {
      return NextResponse.json(
        { error: 'Code and language are required' },
        { status: 400 }
      )
    }

    // TODO: Integrate with backend code execution service
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
    
    const response = await fetch(`${backendUrl}/api/v1/code/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code,
        language,
        input: input || '',
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
      return NextResponse.json(
        { error: errorData.error || 'Execution failed' },
        { status: response.status }
      )
    }

    const result = await response.json()
    
    return NextResponse.json({
      output: result.output || '',
      error: result.error || null,
      executionTime: result.execution_time || 0,
      memoryUsage: result.memory_usage || 0,
    })
  } catch (error) {
    console.error('Code execution error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json(
    { 
      message: 'Code execution endpoint',
      supportedLanguages: [
        'python',
        'javascript',
        'typescript',
        'java',
        'cpp',
        'c',
        'go',
        'rust',
      ]
    }
  )
}