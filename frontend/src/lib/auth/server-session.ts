/**
 * Server-side MongoDB Session Helpers
 * Location: frontend/src/lib/auth/server-session.ts
 *
 * Purpose: Server-side utilities for validating MongoDB sessions in API routes
 */

import { cookies } from 'next/headers';
import { verifyToken } from './auth-helpers';
import { findUserById } from './auth-helpers';
import type { IUserSession, IUser } from '@/lib/database/models/User';

const SESSION_COOKIE_NAME = 'engunity_session';

/**
 * Get the current MongoDB session from cookies (server-side)
 */
export async function getServerSession(): Promise<IUserSession | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!token) {
      return null;
    }

    const session = verifyToken(token);
    return session;
  } catch (error) {
    console.error('Error getting server session:', error);
    return null;
  }
}

/**
 * Get the current authenticated user (server-side)
 */
export async function getServerUser(): Promise<IUser | null> {
  try {
    const session = await getServerSession();

    if (!session) {
      return null;
    }

    const user = await findUserById(session.userId);

    if (!user || !user.isActive) {
      return null;
    }

    return user;
  } catch (error) {
    console.error('Error getting server user:', error);
    return null;
  }
}

/**
 * Validate Authorization header with Bearer token
 * For backwards compatibility with existing API routes
 */
export async function validateBearerToken(authHeader: string | null): Promise<IUser | null> {
  // For MongoDB sessions, we use cookies, not Authorization headers
  // But we'll check cookies anyway for compatibility
  return await getServerUser();
}

/**
 * Check if user is authenticated (server-side)
 */
export async function isServerAuthenticated(): Promise<boolean> {
  const session = await getServerSession();
  return session !== null;
}
