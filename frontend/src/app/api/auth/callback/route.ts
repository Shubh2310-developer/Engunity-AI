/**
 * OAuth Callback Handler for Engunity AI
 * Location: frontend/src/app/api/auth/callback/route.ts
 * 
 * Purpose: Handle OAuth authentication callbacks from Google and GitHub
 * Features: Auto-registration, email verification, dashboard redirect
 * Framework: Next.js 14 App Router + Supabase Auth
 */

import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import type { Database } from '@/types/database';

/**
 * Handle OAuth callback from Google and GitHub
 * Automatically registers users and handles verification flow
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const redirectTo = requestUrl.searchParams.get('redirect_to') || '/dashboard';
  const error = requestUrl.searchParams.get('error');
  const errorDescription = requestUrl.searchParams.get('error_description');

  console.log('OAuth callback received:', {
    code: !!code,
    redirectTo,
    error,
    errorDescription,
  });

  // Handle OAuth errors
  if (error) {
    console.error('OAuth error:', error, errorDescription);
    
    let errorMessage = 'Authentication failed. Please try again.';
    switch (error) {
      case 'access_denied':
        errorMessage = 'Access was denied. Please try again and grant the necessary permissions.';
        break;
      case 'invalid_request':
        errorMessage = 'Invalid authentication request. Please try again.';
        break;
      case 'server_error':
        errorMessage = 'Server error during authentication. Please try again later.';
        break;
    }
    
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(errorMessage)}`, requestUrl.origin)
    );
  }

  // Handle missing authorization code
  if (!code) {
    console.error('No authorization code received');
    return NextResponse.redirect(
      new URL('/login?error=No authorization code received', requestUrl.origin)
    );
  }

  try {
    // Create Supabase client for route handler
    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Exchange the code for a session
    const { data: authData, error: authError } = await supabase.auth.exchangeCodeForSession(code);

    if (authError) {
      console.error('Error exchanging code for session:', authError);
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(authError.message)}`, requestUrl.origin)
      );
    }

    if (!authData.user) {
      console.error('No user data received after OAuth');
      return NextResponse.redirect(
        new URL('/login?error=Authentication failed', requestUrl.origin)
      );
    }

    const user = authData.user;
    console.log('OAuth authentication successful:', {
      userId: user.id,
      email: user.email,
      provider: user.app_metadata?.provider,
      emailVerified: !!user.email_confirmed_at,
    });

    // Success! Redirect to dashboard or specified URL
    console.log(`Redirecting authenticated user to: ${redirectTo}`);
    
    // Create response with redirect
    const response = NextResponse.redirect(new URL(redirectTo, requestUrl.origin));
    
    // Set additional headers for better security
    response.headers.set('Cache-Control', 'no-cache, no-store, max-age=0, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    
    return response;

  } catch (error: any) {
    console.error('Unexpected error in OAuth callback:', error);
    
    return NextResponse.redirect(
      new URL(
        `/login?error=${encodeURIComponent(
          error.message || 'An unexpected error occurred during authentication'
        )}`,
        requestUrl.origin
      )
    );
  }
}