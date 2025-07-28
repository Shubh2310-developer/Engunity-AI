import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // In production, this would authenticate with your auth service
    // For now, return a mock successful login
    const mockUser = {
      id: 'user_123',
      email,
      name: email.split('@')[0],
      role: 'user'
    };

    const mockToken = 'mock_jwt_token_' + Date.now();

    return NextResponse.json({
      success: true,
      user: mockUser,
      token: mockToken,
      expiresIn: 3600 // 1 hour
    });

  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Allow': 'POST, OPTIONS',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}