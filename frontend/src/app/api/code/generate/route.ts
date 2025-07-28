import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

export async function POST(request: NextRequest) {
  try {
    const { prompt, language, framework, requirements } = await request.json();

    if (!prompt) {
      return NextResponse.json(
        { error: 'Code prompt is required' },
        { status: 400 }
      );
    }

    // Try to call backend code generation service
    try {
      const backendResponse = await fetch(`${BACKEND_URL}/api/v1/code/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          language: language || 'python',
          framework,
          requirements
        }),
      });

      if (backendResponse.ok) {
        const data = await backendResponse.json();
        return NextResponse.json(data);
      }
    } catch (backendError) {
      console.warn('Backend code generation unavailable, using fallback');
    }

    // Fallback: Generate mock code response
    const mockCode = generateMockCode(prompt, language || 'python');
    
    return NextResponse.json({
      success: true,
      code: mockCode,
      language: language || 'python',
      explanation: `This is a ${language || 'Python'} implementation for: ${prompt}`,
      suggestions: [
        'Consider adding error handling',
        'Add type hints for better code clarity',
        'Include unit tests'
      ],
      generated_at: new Date().toISOString(),
      fallback: true
    });

  } catch (error: any) {
    console.error('Code generation error:', error);
    return NextResponse.json(
      { error: 'Code generation failed' },
      { status: 500 }
    );
  }
}

function generateMockCode(prompt: string, language: string): string {
  const templates: Record<string, string> = {
    python: `# Generated Python code for: ${prompt}
def solution():
    """
    Implementation based on: ${prompt}
    """
    # TODO: Implement the logic here
    result = "Generated solution"
    return result

if __name__ == "__main__":
    print(solution())`,
    
    javascript: `// Generated JavaScript code for: ${prompt}
function solution() {
    /**
     * Implementation based on: ${prompt}
     */
    // TODO: Implement the logic here
    const result = "Generated solution";
    return result;
}

console.log(solution());`,
    
    typescript: `// Generated TypeScript code for: ${prompt}
function solution(): string {
    /**
     * Implementation based on: ${prompt}
     */
    // TODO: Implement the logic here
    const result: string = "Generated solution";
    return result;
}

console.log(solution());`,
    
    java: `// Generated Java code for: ${prompt}
public class Solution {
    /**
     * Implementation based on: ${prompt}
     */
    public static String solution() {
        // TODO: Implement the logic here
        String result = "Generated solution";
        return result;
    }
    
    public static void main(String[] args) {
        System.out.println(solution());
    }
}`
  };

  if (language) {
    const lowerLang = language.toLowerCase();
    if (templates[lowerLang]) {
      return templates[lowerLang];
    }
  }
  return `# Generated Python code for: ${prompt}
def solution():
    """
    Implementation based on: ${prompt}
    """
    # TODO: Implement the logic here
    result = "Generated solution"
    return result

if __name__ == "__main__":
    print(solution())`;
}

export async function GET() {
  return NextResponse.json({
    service: 'code-generation',
    status: 'operational',
    supported_languages: ['python', 'javascript', 'typescript', 'java', 'cpp', 'rust'],
    methods: ['POST']
  });
}