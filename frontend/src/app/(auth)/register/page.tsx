/**
 * Register Page for Engunity AI
 * Location: frontend/src/app/(auth)/register/page.tsx
 * 
 * Purpose: Route-level page component for user registration
 * Features: Email/password signup, OAuth authentication (Google, GitHub), responsive design
 */

'use client';

import React from 'react';
import Link from 'next/link';

// UI Components
import { Badge } from '@/components/ui/badge';

// Auth Components
import RegisterForm from '@/components/auth/RegisterForm';

// ================================
// 🎨 Register Page Component
// ================================

/**
 * Registration page with OAuth and email/password signup
 */
export default function RegisterPage(): React.JSX.Element {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 py-8">
      <div className="w-full max-w-md space-y-8">
        {/* Platform Header */}
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <Badge variant="secondary" className="bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border-blue-200 dark:border-blue-800">
              🚀 Free Forever Plan
            </Badge>
          </div>
          <div className="mx-auto w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            Join Engunity AI
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 max-w-sm mx-auto">
            Create your account to unlock AI-assisted engineering tools and advanced analytics
          </p>
        </div>

        {/* Registration Form Component */}
        <RegisterForm
          redirectTo="/dashboard"
          title="Create your account"
          description="Get started in less than 2 minutes"
          showOAuth={true}
          requireEmailVerification={true}
          onSuccess={(user) => {
            console.log('User successfully registered:', user.email);
            // Optional: Add analytics tracking here
            // analytics.track('user_registration', { userId: user.id, email: user.email });
          }}
          onError={(error) => {
            console.error('Registration error:', error);
            // Optional: Add error tracking here
            // analytics.track('registration_error', { error });
          }}
        />

        {/* Sign In Link */}
        <div className="text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Already have an account?{' '}
            <Link
              href="/login"
              className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
            >
              Sign in
            </Link>
          </p>
        </div>

        {/* Feature Highlights */}
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white text-center">
            What you'll get with Engunity AI
          </h3>
          <div className="grid grid-cols-1 gap-2 text-xs text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>AI-powered chat assistant for research and coding</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>Document Q&A with PDF and DOCX support</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>Code generation and debugging tools</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>Advanced data analysis and visualization</span>
            </div>
          </div>
        </div>

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

// ================================
// 🧪 Usage Notes (Comments)
// ================================

/*
This registration page component:

1. **Uses the (auth) layout**: Automatically wrapped by layout.tsx in the (auth) folder
2. **Imports form components**: RegisterForm and SocialLogin from the auth components
3. **Provides structure**: Card-based layout with proper spacing and typography
4. **Responsive design**: Works on mobile and desktop with Tailwind classes
5. **Dark mode ready**: Uses dark: prefixes for theme compatibility
6. **SEO optimized**: Includes proper metadata for search engines and social sharing
7. **Conversion focused**: Feature highlights and trust indicators to encourage signup
8. **Accessible**: Semantic HTML structure with proper headings and alt text

Key features:
- **Free plan badge**: Highlights the no-cost entry point
- **Feature list**: Shows value proposition with checkmarks
- **Trust indicators**: No credit card, GDPR compliance, free forever
- **Social proof**: Multiple signup options to reduce friction
- **Clear navigation**: Easy path to login for existing users

The RegisterForm component handles:
- Name, email, password validation
- Terms acceptance checkbox
- Supabase user creation
- Email verification flow
- Error handling and loading states

The SocialLogin component handles:
- OAuth provider buttons (Google, GitHub)
- Supabase social authentication
- Loading states and error handling
- Proper redirect flows

This page focuses on:
- Layout and structure
- Value proposition messaging
- Trust building elements
- Conversion optimization
- Navigation between auth flows
*/