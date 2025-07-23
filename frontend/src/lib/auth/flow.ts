/**
 * Authentication Flow Logic for Engunity AI
 * Location: frontend/src/lib/auth/flow.ts
 * 
 * Purpose: Handle authentication flow decisions and redirects
 * Features: New vs returning user logic, email verification routing
 */

import { User } from '@supabase/supabase-js';
import { supabase } from './supabase';

export interface AuthFlowResult {
  shouldRedirect: boolean;
  redirectPath: string;
  reason: 'new_user_needs_verification' | 'existing_verified_user' | 'unverified_existing_user' | 'error';
  message?: string;
}

/**
 * Determine where to redirect user after authentication
 */
export async function getAuthFlowRedirect(
  user: User,
  requestedRedirect: string = '/dashboard'
): Promise<AuthFlowResult> {
  try {
    // Check if this is a new user by looking at creation date
    const userCreated = new Date(user.created_at);
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const isNewUser = userCreated > fiveMinutesAgo;

    // Check email verification status
    const isEmailVerified = !!user.email_confirmed_at;

    console.log('Auth flow analysis:', {
      userId: user.id,
      email: user.email,
      provider: user.app_metadata?.provider,
      isNewUser,
      isEmailVerified,
      createdAt: user.created_at,
    });

    // OAuth users (Google/GitHub) are automatically verified
    const isOAuthUser = user.app_metadata?.provider && 
                       ['google', 'github'].includes(user.app_metadata.provider);

    if (isOAuthUser) {
      if (isNewUser) {
        // New OAuth user - show verification page for welcome experience
        return {
          shouldRedirect: true,
          redirectPath: `/verify-email?email=${encodeURIComponent(user.email || '')}&oauth=true`,
          reason: 'new_user_needs_verification',
          message: 'Welcome! Setting up your account...'
        };
      } else {
        // Existing OAuth user - direct to dashboard
        return {
          shouldRedirect: true,
          redirectPath: requestedRedirect,
          reason: 'existing_verified_user',
          message: 'Welcome back!'
        };
      }
    }

    // Email/password users
    if (!isEmailVerified) {
      // Unverified email user
      return {
        shouldRedirect: true,
        redirectPath: `/verify-email?email=${encodeURIComponent(user.email || '')}`,
        reason: 'unverified_existing_user',
        message: 'Please verify your email to continue'
      };
    }

    if (isNewUser) {
      // New user with verified email - show verification page for welcome
      return {
        shouldRedirect: true,
        redirectPath: `/verify-email?email=${encodeURIComponent(user.email || '')}&verified=true`,
        reason: 'new_user_needs_verification',
        message: 'Account created successfully!'
      };
    }

    // Existing verified user - direct to dashboard
    return {
      shouldRedirect: true,
      redirectPath: requestedRedirect,
      reason: 'existing_verified_user',
      message: 'Welcome back!'
    };

  } catch (error: any) {
    console.error('Error in auth flow logic:', error);
    return {
      shouldRedirect: true,
      redirectPath: '/login?error=Authentication flow error',
      reason: 'error',
      message: 'Something went wrong. Please try again.'
    };
  }
}

/**
 * Check if user needs to go through verification flow
 */
export function shouldShowVerification(user: User): boolean {
  const isOAuthUser = user.app_metadata?.provider && 
                     ['google', 'github'].includes(user.app_metadata.provider);
  
  // OAuth users with verified emails skip verification unless they're new
  if (isOAuthUser && user.email_confirmed_at) {
    const userCreated = new Date(user.created_at);
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return userCreated > fiveMinutesAgo; // Only new users
  }
  
  // Email users without verification always need it
  return !user.email_confirmed_at;
}

/**
 * Get appropriate redirect after successful verification
 */
export function getPostVerificationRedirect(
  searchParams: URLSearchParams,
  fallback: string = '/dashboard'
): string {
  // Check for explicit redirect parameter
  const redirectTo = searchParams.get('redirect_to') || searchParams.get('redirectTo');
  if (redirectTo) {
    return redirectTo;
  }

  // Check if this was an OAuth flow
  const isOAuth = searchParams.get('oauth') === 'true';
  const isAlreadyVerified = searchParams.get('verified') === 'true';

  if (isOAuth || isAlreadyVerified) {
    return fallback;
  }

  return fallback;
}

/**
 * Store user preference for post-verification redirect
 */
export function setVerificationRedirect(redirectPath: string): void {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem('verification_redirect', redirectPath);
  }
}

/**
 * Get stored verification redirect and clear it
 */
export function getAndClearVerificationRedirect(): string | null {
  if (typeof window === 'undefined') return null;
  
  const redirect = sessionStorage.getItem('verification_redirect');
  if (redirect) {
    sessionStorage.removeItem('verification_redirect');
    return redirect;
  }
  
  return null;
}