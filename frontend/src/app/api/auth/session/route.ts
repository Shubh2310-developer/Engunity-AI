/**
 * Session API Route - MongoDB Authentication
 * Location: frontend/src/app/api/auth/session/route.ts
 *
 * Purpose: Get current user session
 */

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/mongodb-session';
import { findUserById } from '@/lib/auth/auth-helpers';

export async function GET() {
  try {
    // Get session from cookie
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { user: null, authenticated: false },
        { status: 200 }
      );
    }

    // Get full user data from MongoDB
    const user = await findUserById(session.userId);

    if (!user || !user.isActive) {
      return NextResponse.json(
        { user: null, authenticated: false },
        { status: 200 }
      );
    }

    // Return user data (without password)
    return NextResponse.json({
      authenticated: true,
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
    console.error('Session error:', error);
    return NextResponse.json(
      { user: null, authenticated: false },
      { status: 200 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Allow': 'GET, OPTIONS',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
