/**
 * Register API Route - MongoDB Authentication
 * Location: frontend/src/app/api/auth/register/route.ts
 *
 * Purpose: Handle user registration with MongoDB
 */

import { NextRequest, NextResponse } from 'next/server';
import { createUser } from '@/lib/auth/auth-helpers';
import { setSessionCookie } from '@/lib/auth/mongodb-session';
import { userToSession } from '@/lib/database/models/User';

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const { email, password, name } = body;

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    // Create user in MongoDB
    const user = await createUser(email, password, name);

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
    console.error('Registration error:', error);

    // Handle specific errors
    if (error.message === 'User with this email already exists') {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'An error occurred during registration' },
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
