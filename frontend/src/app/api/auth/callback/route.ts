/**
 * OAuth Callback Handler for Engunity AI
 * Location: frontend/src/app/api/auth/callback/route.ts
 * 
 * Purpose: Handle OAuth authentication callbacks from Google and GitHub
 * Features: Auto-registration, email verification, dashboard redirect
 * Framework: Next.js 14 App Router + Supabase Auth
 */

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import type { Database } from '@/types/database';
import { getAuthFlowRedirect } from '@/lib/auth/flow';

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
      new URL(`/auth/login?error=${encodeURIComponent(errorMessage)}`, requestUrl.origin)
    );
  }

  // Handle missing authorization code
  if (!code) {
    console.error('No authorization code received');
    return NextResponse.redirect(
      new URL('/auth/login?error=No authorization code received', requestUrl.origin)
    );
  }

  try {
    const cookieStore = cookies();

    // Create Supabase client for PKCE flow - MUST use cookies to access code_verifier
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            try {
              cookieStore.set({ name, value, ...options });
            } catch (error) {
              // Cookie setting might fail in some cases
            }
          },
          remove(name: string, options: CookieOptions) {
            try {
              cookieStore.set({ name, value: '', ...options });
            } catch (error) {
              // Cookie removal might fail in some cases
            }
          },
        },
      }
    );

    // Exchange the code for a session - this will use the code_verifier from cookies
    const { data: authData, error: authError } = await supabase.auth.exchangeCodeForSession(code);

    if (authError) {
      console.error('Error exchanging code for session:', authError);
      return NextResponse.redirect(
        new URL(`/auth/login?error=${encodeURIComponent(authError.message)}`, requestUrl.origin)
      );
    }

    if (!authData.user) {
      console.error('No user data received after OAuth');
      return NextResponse.redirect(
        new URL('/auth/login?error=Authentication failed', requestUrl.origin)
      );
    }

    const user = authData.user;
    console.log('OAuth authentication successful:', {
      userId: user.id,
      email: user.email,
      provider: user.app_metadata?.provider,
      emailVerified: !!user.email_confirmed_at,
    });

    // Use centralized auth flow logic to determine redirect
    const authFlowResult = await getAuthFlowRedirect(user, redirectTo);
    
    console.log('Auth flow decision:', authFlowResult);
    const finalRedirect = authFlowResult.redirectPath;

    // Create response with redirect
    const response = NextResponse.redirect(new URL(finalRedirect, requestUrl.origin));
    
    // Set additional headers for better security
    response.headers.set('Cache-Control', 'no-cache, no-store, max-age=0, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    
    return response;

  } catch (error: any) {
    console.error('Unexpected error in OAuth callback:', error);
    
    return NextResponse.redirect(
      new URL(
        `/auth/login?error=${encodeURIComponent(
          error.message || 'An unexpected error occurred during authentication'
        )}`,
        requestUrl.origin
      )
    );
  }
}