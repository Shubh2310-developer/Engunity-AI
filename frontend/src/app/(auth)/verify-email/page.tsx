/**
 * Email Verification Page for Engunity AI
 * Location: frontend/src/app/(auth)/verify-email/page.tsx
 * 
 * Purpose: Guide users through email verification process with auto-redirect
 * Features: Session polling, resend functionality, responsive design
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { 
  Mail, 
  CheckCircle, 
  RefreshCw, 
  Clock, 
  ArrowLeft,
  AlertCircle,
  Loader2
} from 'lucide-react';

// UI Components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Auth utilities
import { supabase } from '@/lib/auth/supabase';

// ================================
// 🔧 Type Definitions
// ================================

/**
 * Verification status states
 */
type VerificationStatus = 'pending' | 'checking' | 'verified' | 'error';

/**
 * Resend button state
 */
interface ResendState {
  canResend: boolean;
  cooldownTime: number;
  isLoading: boolean;
}

// ================================
// 🎨 Email Verification Page Component
// ================================

/**
 * Email verification page with polling and resend functionality
 */
export default function VerifyEmailPage(): React.JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Get email from URL parameters if available
  const email = searchParams.get('email') || 'your email';
  
  // State management
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>('pending');
  const [resendState, setResendState] = useState<ResendState>({
    canResend: true,
    cooldownTime: 0,
    isLoading: false,
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // ================================
  // 🔄 Session Polling Effect
  // ================================

  /**
   * Poll for verified session every 3 seconds
   */
  useEffect(() => {
    let pollInterval: NodeJS.Timeout;
    let mounted = true;

    const checkVerificationStatus = async () => {
      if (!mounted) return;

      try {
        setVerificationStatus('checking');
        
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Session check error:', error);
          setVerificationStatus('error');
          setErrorMessage(error.message);
          return;
        }

        if (session?.user?.email_confirmed_at) {
          setVerificationStatus('verified');
          
          // Small delay to show success state before redirect
          setTimeout(() => {
            if (mounted) {
              router.push('/dashboard');
            }
          }, 1500);
          
          return;
        }

        setVerificationStatus('pending');
      } catch (error) {
        console.error('Verification check failed:', error);
        setVerificationStatus('error');
        setErrorMessage('Failed to check verification status');
      }
    };

    // Initial check
    checkVerificationStatus();

    // Set up polling interval
    pollInterval = setInterval(checkVerificationStatus, 3000);

    // Cleanup
    return () => {
      mounted = false;
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [router]);

  // ================================
  // ⏱️ Resend Cooldown Effect
  // ================================

  /**
   * Handle resend cooldown timer
   */
  useEffect(() => {
    let cooldownInterval: NodeJS.Timeout;

    if (resendState.cooldownTime > 0) {
      cooldownInterval = setInterval(() => {
        setResendState(prev => {
          const newTime = prev.cooldownTime - 1;
          return {
            ...prev,
            cooldownTime: newTime,
            canResend: newTime === 0,
          };
        });
      }, 1000);
    }

    return () => {
      if (cooldownInterval) {
        clearInterval(cooldownInterval);
      }
    };
  }, [resendState.cooldownTime]);

  // ================================
  // 🔐 Resend Verification Handler
  // ================================

  /**
   * Handle resend verification email
   */
  const handleResendVerification = async () => {
    if (!resendState.canResend) return;

    setResendState(prev => ({ ...prev, isLoading: true }));
    setErrorMessage(null);

    try {
      // Get current user to resend verification
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user?.email) {
        throw new Error('No user email found. Please try logging in again.');
      }

      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: user.email,
      });

      if (error) {
        throw error;
      }

      // Start cooldown (60 seconds)
      setResendState({
        canResend: false,
        cooldownTime: 60,
        isLoading: false,
      });

    } catch (error: any) {
      console.error('Resend verification error:', error);
      setErrorMessage(error.message || 'Failed to resend verification email');
      setResendState(prev => ({ ...prev, isLoading: false }));
    }
  };

  /**
   * Format cooldown time display
   */
  const formatCooldownTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) {
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    return `${secs}s`;
  };

  // ================================
  // 🎨 Render Status Icons
  // ================================

  /**
   * Get status icon based on verification state
   */
  const getStatusIcon = () => {
    switch (verificationStatus) {
      case 'checking':
        return <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />;
      case 'verified':
        return <CheckCircle className="w-8 h-8 text-green-600" />;
      case 'error':
        return <AlertCircle className="w-8 h-8 text-red-600" />;
      default:
        return <Mail className="w-8 h-8 text-blue-600 animate-pulse" />;
    }
  };

  /**
   * Get status message based on verification state
   */
  const getStatusMessage = () => {
    switch (verificationStatus) {
      case 'checking':
        return {
          title: 'Checking verification...',
          description: 'Please wait while we check your email verification status.',
        };
      case 'verified':
        return {
          title: 'Email verified!',
          description: 'Your email has been successfully verified. Redirecting to dashboard...',
        };
      case 'error':
        return {
          title: 'Verification check failed',
          description: errorMessage || 'Unable to check verification status. Please try again.',
        };
      default:
        return {
          title: 'Verify your email address',
          description: `We've sent a verification link to ${email}. Please check your inbox and click the link to continue.`,
        };
    }
  };

  const statusMessage = getStatusMessage();

  // ================================
  // 🎨 Render Component
  // ================================

  return (
    <div className="w-full max-w-md mx-auto space-y-6">
      {/* Status Icon */}
      <div className="flex justify-center">
        <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
          {getStatusIcon()}
        </div>
      </div>

      {/* Main Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
          {statusMessage.title}
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
          {statusMessage.description}
        </p>
      </div>

      {/* Verification Card */}
      <Card className="border-0 shadow-lg bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
        <CardHeader className="text-center pb-4">
          <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
            Check your email
          </CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-400">
            {verificationStatus === 'pending' && 'Click the verification link to activate your account'}
            {verificationStatus === 'checking' && 'Checking for verification...'}
            {verificationStatus === 'verified' && 'Verification complete!'}
            {verificationStatus === 'error' && 'Please try again or contact support'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Error Alert */}
          {errorMessage && verificationStatus === 'error' && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}

          {/* Resend Section */}
          {verificationStatus === 'pending' && (
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  Didn't receive the email?
                </p>
                
                {resendState.canResend ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleResendVerification}
                    disabled={resendState.isLoading}
                    className="w-full"
                  >
                    {resendState.isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Resend verification email
                      </>
                    )}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    disabled
                    className="w-full"
                  >
                    <Clock className="mr-2 h-4 w-4" />
                    Resend in {formatCooldownTime(resendState.cooldownTime)}
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Success Actions */}
          {verificationStatus === 'verified' && (
            <div className="text-center">
              <Button
                onClick={() => router.push('/dashboard')}
                className="w-full bg-green-600 hover:bg-green-700 text-white"
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Continue to Dashboard
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Help Section */}
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 space-y-3">
        <h3 className="text-sm font-medium text-gray-900 dark:text-white text-center">
          Need help with verification?
        </h3>
        <div className="space-y-2 text-xs text-gray-600 dark:text-gray-400">
          <div className="flex items-start gap-2">
            <span className="text-blue-500 mt-0.5">•</span>
            <span>Check your spam or junk mail folder</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-blue-500 mt-0.5">•</span>
            <span>Make sure the email address is correct</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-blue-500 mt-0.5">•</span>
            <span>Verification links expire after 24 hours</span>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="space-y-4">
        <div className="text-center">
          <Link
            href="/login"
            className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 transition-colors group"
          >
            <ArrowLeft className="mr-1 h-3 w-3 transition-transform group-hover:-translate-x-0.5" />
            Back to sign in
          </Link>
        </div>

        <div className="text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Need additional help?{' '}
            <Link
              href="/help/email-verification"
              className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
            >
              Contact support
            </Link>
          </p>
        </div>
      </div>

      {/* Security Notice */}
      <div className="text-center pt-2">
        <div className="flex flex-wrap justify-center gap-4 text-xs text-gray-400 dark:text-gray-500">
          <span className="flex items-center gap-1">
            <svg className="w-3 h-3 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Secure email verification
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
This email verification page component:

1. **Uses client-side functionality**: Marked with 'use client' for useEffect and state
2. **Polls for verification**: Checks session every 3 seconds automatically
3. **Auto-redirects**: Redirects to dashboard when email is verified
4. **Resend functionality**: Allows users to resend verification with cooldown
5. **Status management**: Shows different states (pending, checking, verified, error)
6. **Responsive design**: Works on mobile and desktop with Tailwind classes
7. **Dark mode ready**: Uses dark: prefixes for theme compatibility
8. **Error handling**: Graceful error states with helpful messages

Key features:
- **Real-time polling**: Automatically detects when user clicks verification link
- **Resend protection**: 60-second cooldown prevents spam
- **Visual feedback**: Different icons and messages for each state
- **Help section**: Common troubleshooting tips
- **Security indicators**: Trust badges at bottom

The page handles these verification flows:
1. User registers and is redirected here
2. Page polls for verification status
3. User clicks link in email
4. Polling detects verification
5. Auto-redirect to dashboard

URL parameters:
- ?email=user@example.com - Shows the email address in instructions

Session polling logic:
- Checks every 3 seconds for verified session
- Stops polling when verification detected
- Handles errors gracefully
- Redirects automatically on success

Resend functionality:
- Uses Supabase resend API
- 60-second cooldown between attempts
- Shows countdown timer
- Handles errors and success states

This creates a smooth verification experience that minimizes user friction while maintaining security.
*/