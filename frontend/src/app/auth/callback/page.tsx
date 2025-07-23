'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/auth/supabase';

/**
 * Auth Callback Page
 * Handles OAuth redirects using client-side session handling
 */
export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const hasProcessed = useRef(false);
  const [status, setStatus] = useState('Processing authentication...');

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const processAuth = async () => {
      try {
        // Check URL hash for tokens (Supabase client-side flow)
        const hashFragment = window.location.hash;
        const urlParams = new URLSearchParams(hashFragment.substring(1));
        const accessToken = urlParams.get('access_token');
        const refreshToken = urlParams.get('refresh_token');
        
        if (accessToken) {
          setStatus('Found authentication tokens, processing...');
          
          // Set the session using the tokens
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || '',
          });
          
          if (error) {
            console.error('Error setting session:', error);
            setStatus('Authentication failed. Redirecting to login...');
            setTimeout(() => {
              router.push('/auth/login?error=' + encodeURIComponent(error.message));
            }, 2000);
            return;
          }
          
          if (data.session) {
            setStatus('Authentication successful! Redirecting...');
            
            // Set login time for 30-day persistence
            localStorage.setItem('engunity-login-time', Date.now().toString());
            
            const redirectTo = searchParams.get('redirect_to') || '/dashboard';
            setTimeout(() => {
              router.push(redirectTo);
            }, 1000);
            return;
          }
        }

        // Fallback: Check for authorization code and redirect to API route
        const code = searchParams.get('code');
        if (code) {
          setStatus('Processing authorization code...');
          const params = new URLSearchParams();
          searchParams.forEach((value, key) => {
            params.append(key, value);
          });
          
          const apiUrl = `/api/auth/callback?${params.toString()}`;
          window.location.href = apiUrl;
          return;
        }

        // No tokens or code found
        const error = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');
        
        if (error) {
          setStatus(`Authentication error: ${errorDescription || error}`);
          setTimeout(() => {
            router.push('/auth/login?error=' + encodeURIComponent(errorDescription || error));
          }, 3000);
        } else {
          setStatus('No authentication data found. Redirecting to login...');
          setTimeout(() => {
            router.push('/auth/login?error=No authentication data received');
          }, 2000);
        }

      } catch (error) {
        console.error('Auth callback error:', error);
        setStatus('Authentication processing failed. Redirecting to login...');
        setTimeout(() => {
          router.push('/auth/login?error=Authentication processing failed');
        }, 2000);
      }
    };

    processAuth();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto" />
        <div className="space-y-2">
          <p className="text-slate-600 text-lg">{status}</p>
          <p className="text-slate-500 text-sm">Please wait while we complete your sign-in.</p>
        </div>
      </div>
    </div>
  );
}