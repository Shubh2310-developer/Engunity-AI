/**
 * MongoDB Session Management Utilities
 * Location: frontend/src/lib/auth/mongodb-session.ts
 *
 * Purpose: Handle cookie-based session management for MongoDB authentication
 */

import { cookies } from 'next/headers';
import { IUserSession } from '../database/models/User';
import { generateToken, verifyToken } from './auth-helpers';

const SESSION_COOKIE_NAME = 'engunity_session';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

// ================================
// Session Cookie Management
// ================================

/**
 * Set session cookie with JWT token
 */
export async function setSessionCookie(session: IUserSession): Promise<void> {
  const token = generateToken(session);
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/'
  });
}

/**
 * Get session from cookie
 */
export async function getSession(): Promise<IUserSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  return verifyToken(token);
}

/**
 * Clear session cookie
 */
export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/'
  });
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const session = await getSession();
  return session !== null && session.isActive;
}

/**
 * Require authentication (for protected routes)
 */
export async function requireAuth(): Promise<IUserSession> {
  const session = await getSession();

  if (!session) {
    throw new Error('Authentication required');
  }

  if (!session.isActive) {
    throw new Error('Account is inactive');
  }

  return session;
}
