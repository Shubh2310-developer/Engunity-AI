/**
 * Forgot Password Page for Engunity AI
 * Location: frontend/src/app/(auth)/forgot-password/page.tsx
 * 
 * Purpose: Route-level page component for password reset requests
 * Features: Email-based password reset, responsive design, accessible UI
 */

import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowLeft, Shield, Mail } from 'lucide-react';

// UI Components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

// Auth Components
import ForgotPasswordForm from '@/components/auth/ForgotPasswordForm';

// ================================
// 📄 Page Metadata
// ================================

export const metadata: Metadata = {
  title: 'Reset Password | Engunity AI',
  description: 'Reset your Engunity AI account password. Enter your email address to receive a secure password reset link.',
  keywords: ['password reset', 'forgot password', 'account recovery', 'Engunity AI'],
  openGraph: {
    title: 'Reset Your Password - Engunity AI',
    description: 'Securely reset your password and regain access to your AI-powered workspace.',
    type: 'website',
  },
  robots: {
    index: false, // Don't index password reset pages
    follow: false,
  },
};

// ================================
// 🎨 Forgot Password Page Component
// ================================

/**
 * Forgot password page with email-based reset functionality
 */
export default function ForgotPasswordPage(): React.JSX.Element {
  return (
    <div className="w-full max-w-md mx-auto space-y-6">
      {/* Header Section */}
      <div className="text-center space-y-3">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
            <Mail className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
        </div>
        
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
          Forgot your password?
        </h1>
        
        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed max-w-sm mx-auto">
          No worries! Enter your email address and we'll send you a secure link to reset your password.
        </p>
      </div>

      {/* Password Reset Card */}
      <Card className="border-0 shadow-lg bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
        <CardHeader className="space-y-1 pb-4">
          <CardTitle className="text-xl font-semibold text-center text-gray-900 dark:text-white">
            Reset your password
          </CardTitle>
          <CardDescription className="text-center text-gray-600 dark:text-gray-400">
            We'll email you a reset link
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Password Reset Form */}
          <ForgotPasswordForm
            redirectTo="/auth/update-password"
            title=""
            description=""
            showBackToLogin={false}
            resendCooldown={60}
          />
        </CardContent>
      </Card>

      {/* Navigation Links */}
      <div className="space-y-4">
        {/* Back to Login */}
        <div className="text-center">
          <Link
            href="/auth/login"
            className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 transition-colors group"
          >
            <ArrowLeft className="mr-1 h-3 w-3 transition-transform group-hover:-translate-x-0.5" />
            Back to sign in
          </Link>
        </div>

        {/* Alternative Actions */}
        <div className="text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Don't have an account?{' '}
            <Link
              href="/auth/register"
              className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
            >
              Create one
            </Link>
          </p>
        </div>
      </div>

      {/* Help & Security Information */}
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-center gap-2 text-sm font-medium text-gray-900 dark:text-white">
          <Shield className="w-4 h-4 text-green-500" />
          <span>Secure Password Reset</span>
        </div>
        
        <div className="space-y-2 text-xs text-gray-600 dark:text-gray-400">
          <div className="flex items-start gap-2">
            <span className="text-green-500 mt-0.5">•</span>
            <span>Reset links are valid for 24 hours and can only be used once</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-green-500 mt-0.5">•</span>
            <span>Links are sent from a verified Engunity AI email address</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-green-500 mt-0.5">•</span>
            <span>Check your spam folder if you don't see the email within 5 minutes</span>
          </div>
        </div>
      </div>

      {/* Additional Support */}
      <div className="text-center space-y-2">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Still having trouble accessing your account?
        </p>
        <Link
          href="/help/account-recovery"
          className="text-xs text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 transition-colors underline"
        >
          Contact our support team
        </Link>
      </div>

      {/* Security Notice */}
      <div className="text-center pt-2">
        <div className="flex flex-wrap justify-center gap-4 text-xs text-gray-400 dark:text-gray-500">
          <span className="flex items-center gap-1">
            <svg className="w-3 h-3 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            256-bit SSL encryption
          </span>
          <span className="flex items-center gap-1">
            <svg className="w-3 h-3 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            GDPR compliant
          </span>
        </div>
      </div>
    </div>
  );
}

// ================================
// 🧪 Usage Notes (Comments)
// ================================

/*
This forgot password page component:

1. **Uses the (auth) layout**: Automatically wrapped by layout.tsx in the (auth) folder
2. **Imports ForgotPasswordForm**: The form component handles all Supabase logic
3. **Provides structure**: Card-based layout with proper spacing and typography
4. **Security focused**: Includes security information and trust indicators
5. **User-friendly**: Clear instructions and helpful guidance
6. **Responsive design**: Works on mobile and desktop with Tailwind classes
7. **Dark mode ready**: Uses dark: prefixes for theme compatibility
8. **SEO considerations**: Proper metadata with noindex for security

Key features:
- **Visual hierarchy**: Mail icon, clear heading, and descriptive text
- **Security information**: Explains the reset process and security measures
- **Help resources**: Links to support and account recovery
- **Trust indicators**: SSL encryption and GDPR compliance badges
- **Clear navigation**: Easy paths back to login or to create account

The ForgotPasswordForm component handles:
- Email validation and submission
- Supabase password reset email sending
- Success/error state management
- Resend functionality with cooldown
- Loading states and user feedback

This page focuses on:
- User guidance and reassurance
- Security transparency
- Clear next steps
- Professional presentation
- Accessibility and responsive design

Password reset flow:
1. User enters email address
2. Supabase sends reset email with secure token
3. User clicks link in email
4. Redirects to /auth/update-password with token
5. User sets new password
6. Redirects to dashboard upon success

Security considerations:
- Reset tokens expire after 24 hours
- Tokens are single-use only
- Emails sent from verified domain
- Rate limiting prevents abuse
- Clear instructions reduce support burden
*/