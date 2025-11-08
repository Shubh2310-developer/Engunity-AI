/**
 * MongoDB Session Management for Engunity AI
 * Location: frontend/src/lib/auth/mongo-session.ts
 *
 * Purpose: Centralized utilities for managing MongoDB user authentication sessions
 */

// ================================
// Type Definitions
// ================================

export type UserRole = 'user' | 'admin' | 'premium';

export interface MongoDBUser {
  id: string;
  email: string;
  name?: string;
  role: UserRole;
  isActive: boolean;
  emailVerified: boolean;
}

export interface MongoDBSession {
  authenticated: boolean;
  user: MongoDBUser | null;
}

// ================================
// Core Session Management
// ================================

/**
 * Get the current MongoDB session
 */
export async function getCurrentSession(): Promise<MongoDBSession> {
  try {
    const response = await fetch('/api/auth/session', {
      credentials: 'include', // Include cookies
    });

    if (!response.ok) {
      return { authenticated: false, user: null };
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching MongoDB session:', error);
    return { authenticated: false, user: null };
  }
}

/**
 * Get the current user from MongoDB session
 */
export async function getCurrentUser(): Promise<MongoDBUser | null> {
  const session = await getCurrentSession();
  return session.authenticated ? session.user : null;
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const session = await getCurrentSession();
  return session.authenticated;
}

/**
 * Sign out the current user
 */
export async function signOut(): Promise<void> {
  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    });

    // Clear any local storage
    localStorage.removeItem('engunity-login-time');
    localStorage.removeItem('engunity-auth-token');
  } catch (error) {
    console.error('Error during sign out:', error);
    throw error;
  }
}
