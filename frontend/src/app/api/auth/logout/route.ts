/**
 * Logout API Route - MongoDB Authentication
 * Location: frontend/src/app/api/auth/logout/route.ts
 *
 * Purpose: Handle user logout by clearing session cookie
 */

import { NextResponse } from 'next/server';
import { clearSessionCookie } from '@/lib/auth/mongodb-session';

export async function POST() {
  try {
    // Clear the session cookie
    await clearSessionCookie();

    return NextResponse.json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error: any) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Logout failed' },
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