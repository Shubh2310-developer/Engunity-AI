/**
 * Login API Route - MongoDB Authentication
 * Location: frontend/src/app/api/auth/login/route.ts
 *
 * Purpose: Handle user login with MongoDB
 */

import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser } from '@/lib/auth/auth-helpers';
import { setSessionCookie } from '@/lib/auth/mongodb-session';
import { userToSession } from '@/lib/database/models/User';

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const { email, password } = body;

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Authenticate user with MongoDB
    const user = await authenticateUser(email, password);

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Create session
    const session = userToSession(user);
    await setSessionCookie(session);

    // Return user data (without password)
    return NextResponse.json({
      success: true,
      user: {
        id: user._id?.toString(),
        email: user.email,
        name: user.name,
        emailVerified: user.emailVerified,
        role: user.role,
        isActive: user.isActive
      }
    });

  } catch (error: any) {
    console.error('Login error:', error);

    // Handle specific errors
    if (error.message === 'Account is disabled') {
      return NextResponse.json(
        { error: 'Your account has been disabled. Please contact support.' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: 'An error occurred during login' },
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