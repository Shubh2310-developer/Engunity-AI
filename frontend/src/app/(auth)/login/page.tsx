/**
 * Login Page for Engunity AI
 * Location: frontend/src/app/(auth)/login/page.tsx
 * 
 * Purpose: Authentication page using the comprehensive LoginForm component
 * Features: Email/password login with validation, error handling, and verification
 */

'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import LoginForm from '@/components/auth/LoginForm';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

export default function LoginPage(): React.JSX.Element {
  const searchParams = useSearchParams();
  const [urlError, setUrlError] = useState<string | null>(null);

  useEffect(() => {
    const error = searchParams.get('error');
    if (error) {
      setUrlError(decodeURIComponent(error));
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 py-8">
      <div className="w-full max-w-md space-y-8">
        {/* OAuth Error Alert */}
        {urlError && (
          <Alert variant="destructive" className="border-red-200 dark:border-red-800">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              {urlError}
            </AlertDescription>
          </Alert>
        )}

        {/* Platform Header */}
        <div className="text-center space-y-3">
          <div className="mx-auto w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            Engunity AI
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 max-w-sm mx-auto">
            AI-powered productivity platform for engineers, researchers, and innovators
          </p>
        </div>

        {/* Login Form Component */}
        <LoginForm
          redirectTo="/dashboard"
          title="Welcome back"
          description="Sign in to access your AI workspace"
          requireEmailVerification={true}
          showRegisterLink={true}
          showForgotPasswordLink={true}
          onSuccess={(user) => {
            console.log('User successfully logged in:', user.email);
            // Optional: Add analytics tracking here
            // analytics.track('user_login', { userId: user.id, email: user.email });
          }}
          onError={(error) => {
            console.error('Login error:', error);
            // Optional: Add error tracking here
            // analytics.track('login_error', { error });
          }}
        />

        {/* Additional Navigation */}
        <div className="text-center space-y-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to home
          </Link>
          
          <div className="flex justify-center gap-6 text-xs text-gray-400 dark:text-gray-500">
            <Link href="/privacy" className="hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
              Terms
            </Link>
            <Link href="/support" className="hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
              Support
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}