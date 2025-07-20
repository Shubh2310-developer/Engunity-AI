/**
 * Auth Callback Page for Engunity AI
 * Location: frontend/src/app/auth/callback/page.tsx
 * 
 * Purpose: Handle OAuth authentication callbacks from Google and GitHub
 * Features: Auto-registration, email verification, dashboard redirect
 * Framework: Next.js 14 App Router + Supabase Auth
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/auth/supabase';
import { Loader2 } from 'lucide-react';

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processing authentication...');

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log('Processing OAuth callback...');
        
        // Get the redirect URL from query params
        const redirectTo = searchParams.get('redirect_to') || '/dashboard';
        
        // Get the current URL to check for auth parameters
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const urlParams = new URLSearchParams(window.location.search);
        
        // Check for error in URL
        const error = hashParams.get('error') || urlParams.get('error');
        const errorDescription = hashParams.get('error_description') || urlParams.get('error_description');
        
        if (error) {
          console.error('OAuth error from URL:', error, errorDescription);
          setStatus('error');
          setMessage(errorDescription || error || 'Authentication failed');
          
          setTimeout(() => {
            router.push(`/login?error=${encodeURIComponent(errorDescription || error)}`);
          }, 2000);
          return;
        }

        // Handle the auth callback - this processes the URL fragments
        const { data, error: authError } = await supabase.auth.getSession();
        
        if (authError) {
          console.error('Auth session error:', authError);
          setStatus('error');
          setMessage(authError.message || 'Authentication failed');
          
          setTimeout(() => {
            router.push(`/login?error=${encodeURIComponent(authError.message || 'Authentication failed')}`);
          }, 2000);
          return;
        }

        // Check if we have a session
        if (data.session?.user) {
          console.log('OAuth authentication successful:', {
            userId: data.session.user.id,
            email: data.session.user.email,
            provider: data.session.user.app_metadata?.provider,
            emailVerified: !!data.session.user.email_confirmed_at,
          });

          setStatus('success');
          setMessage('Authentication successful! Redirecting...');
          
          // Clear the URL hash to prevent issues
          if (window.location.hash) {
            window.history.replaceState(null, '', window.location.pathname + window.location.search);
          }
          
          // Redirect to the desired page
          setTimeout(() => {
            router.push(redirectTo);
          }, 1000);
        } else {
          // Try to get session from URL hash (for implicit flow)
          console.log('No active session, checking URL for auth data...');
          
          // Check if we have auth data in the URL
          const accessToken = hashParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token');
          
          if (accessToken) {
            console.log('Found access token in URL, setting session...');
            
            // Set the session manually
            const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken || '',
            });
            
            if (sessionError) {
              console.error('Error setting session:', sessionError);
              setStatus('error');
              setMessage(sessionError.message || 'Failed to establish session');
              
              setTimeout(() => {
                router.push(`/login?error=${encodeURIComponent(sessionError.message || 'Failed to establish session')}`);
              }, 2000);
              return;
            }
            
            if (sessionData.session?.user) {
              console.log('Session established successfully:', sessionData.session.user.email);
              setStatus('success');
              setMessage('Authentication successful! Redirecting...');
              
              // Clear the URL hash
              if (window.location.hash) {
                window.history.replaceState(null, '', window.location.pathname + window.location.search);
              }
              
              setTimeout(() => {
                router.push(redirectTo);
              }, 1000);
              return;
            }
          }
          
          // No session or auth data found
          console.error('No session or auth data found');
          setStatus('error');
          setMessage('No authentication data found');
          
          setTimeout(() => {
            router.push('/login?error=No authentication data found');
          }, 2000);
        }
      } catch (error: any) {
        console.error('Unexpected error in auth callback:', error);
        setStatus('error');
        setMessage(error.message || 'An unexpected error occurred');
        
        setTimeout(() => {
          router.push(`/login?error=${encodeURIComponent(error.message || 'An unexpected error occurred')}`);
        }, 2000);
      }
    };

    // Only run after component mounts to ensure window is available
    if (typeof window !== 'undefined') {
      handleAuthCallback();
    }
  }, [router, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center space-y-4">
        <div className="mx-auto w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
          {status === 'loading' && <Loader2 className="w-8 h-8 text-white animate-spin" />}
          {status === 'success' && (
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          )}
          {status === 'error' && (
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
        </div>
        
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {status === 'loading' && 'Completing sign in...'}
            {status === 'success' && 'Success!'}
            {status === 'error' && 'Authentication Error'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {message}
          </p>
        </div>
        
        {status === 'loading' && (
          <div className="flex items-center justify-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Please wait...</span>
          </div>
        )}
      </div>
    </div>
  );
}