/**
 * ForgotPasswordForm Component for Engunity AI
 * Location: frontend/src/components/auth/ForgotPasswordForm.tsx
 * 
 * Purpose: Secure password reset form using Supabase email-based flow
 * Uses: Supabase Auth + ShadCN UI + React Hook Form + Zod validation
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { 
  Mail, 
  ArrowLeft, 
  Loader2, 
  CheckCircle, 
  AlertCircle,
  Clock,
  RefreshCw
} from 'lucide-react';

// ShadCN UI Components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Auth utilities
import { supabase } from '@/lib/auth/supabase';

// ================================
// 🔧 Type Definitions & Validation
// ================================

/**
 * Forgot password form validation schema using Zod
 */
const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address')
    .toLowerCase()
    .trim(),
});

/**
 * Inferred TypeScript type from Zod schema
 */
type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

/**
 * Form submission states
 */
type SubmissionState = 'idle' | 'loading' | 'success' | 'error';

/**
 * Props for the ForgotPasswordForm component
 */
interface ForgotPasswordFormProps {
  /** Custom redirect URL for password reset callback */
  redirectTo?: string;
  /** Custom title for the form */
  title?: string;
  /** Custom description for the form */
  description?: string;
  /** Callback function on successful email send */
  onSuccess?: (email: string) => void;
  /** Callback function on error */
  onError?: (error: string) => void;
  /** Whether to show back to login link */
  showBackToLogin?: boolean;
  /** Resend cooldown time in seconds */
  resendCooldown?: number;
}

// ================================
// 🎨 ForgotPasswordForm Component
// ================================

/**
 * Secure password reset form component with email validation and cooldown
 */
const ForgotPasswordForm: React.FC<ForgotPasswordFormProps> = ({
  redirectTo = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/update-password`,
  title = 'Reset your password',
  description = 'Enter your email address and we\'ll send you a link to reset your password',
  onSuccess,
  onError,
  showBackToLogin = true,
  resendCooldown = 60, // 60 seconds cooldown
}) => {
  const router = useRouter();
  
  // Form state management
  const [submissionState, setSubmissionState] = useState<SubmissionState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);
  const [cooldownTime, setCooldownTime] = useState<number>(0);
  const [canResend, setCanResend] = useState<boolean>(true);

  // React Hook Form setup with Zod validation
  const form = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  // ================================
  // ⏱️ Cooldown Timer Management
  // ================================

  /**
   * Start cooldown timer to prevent spam
   */
  const startCooldown = () => {
    setCanResend(false);
    setCooldownTime(resendCooldown);
  };

  /**
   * Cooldown effect
   */
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (cooldownTime > 0) {
      interval = setInterval(() => {
        setCooldownTime((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [cooldownTime]);

  // ================================
  // 🔐 Password Reset Handler
  // ================================

  /**
   * Handle password reset email submission
   */
  const handlePasswordReset = async (data: ForgotPasswordFormData) => {
    setSubmissionState('loading');
    setErrorMessage(null);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo,
      });

      if (error) {
        throw error;
      }

      // Success state
      setSubmissionState('success');
      setSubmittedEmail(data.email);
      startCooldown();
      
      // Call success callback if provided
      onSuccess?.(data.email);

      // Reset form
      form.reset();

    } catch (error: any) {
      console.error('Password reset error:', error);
      
      // Handle specific Supabase auth errors
      let errorMsg = 'An unexpected error occurred. Please try again.';
      
      if (error.message) {
        switch (error.message) {
          case 'Email not found':
          case 'User not found':
            errorMsg = 'No account found with this email address. Please check your email or create a new account.';
            break;
          case 'Email rate limit exceeded':
            errorMsg = 'Too many password reset requests. Please wait a moment and try again.';
            break;
          case 'Invalid email':
            errorMsg = 'Please enter a valid email address.';
            break;
          case 'Password reset is disabled':
            errorMsg = 'Password reset is currently disabled. Please contact support.';
            break;
          default:
            errorMsg = error.message;
        }
      }
      
      setSubmissionState('error');
      setErrorMessage(errorMsg);
      onError?.(errorMsg);
    }
  };

  /**
   * Handle resend password reset email
   */
  const handleResend = async () => {
    if (!submittedEmail || !canResend) return;
    
    await handlePasswordReset({ email: submittedEmail });
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
  // 🎨 Render Component
  // ================================

  return (
    <div className="w-full max-w-md mx-auto">
      <Card className="w-full shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold tracking-tight">
            {title}
          </CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-400">
            {description}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Success State */}
          {submissionState === 'success' && (
            <Alert className="border-green-200 bg-green-50 dark:bg-green-950">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800 dark:text-green-200">
                <div className="space-y-2">
                  <p className="font-medium">Password reset link sent!</p>
                  <p className="text-sm">
                    We've sent a password reset link to{' '}
                    <span className="font-medium">{submittedEmail}</span>.
                    Please check your email and follow the instructions.
                  </p>
                  <p className="text-xs text-green-700 dark:text-green-300">
                    Don't see the email? Check your spam folder or try resending below.
                  </p>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Error State */}
          {submissionState === 'error' && errorMessage && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}

          {/* Password Reset Form */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handlePasswordReset)} className="space-y-4">
              {/* Email Field */}
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">
                      Email Address
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          {...field}
                          type="email"
                          placeholder="Enter your email address"
                          className="pl-9"
                          disabled={submissionState === 'loading'}
                          autoComplete="email"
                          autoFocus
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                disabled={submissionState === 'loading'}
              >
                {submissionState === 'loading' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending reset link...
                  </>
                ) : (
                  'Send Reset Link'
                )}
              </Button>
            </form>
          </Form>

          {/* Resend Section */}
          {submissionState === 'success' && submittedEmail && (
            <div className="space-y-3">
              <div className="text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  Didn't receive the email?
                </p>
                
                {canResend ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleResend}
                    className="w-full"
                    disabled={submissionState === 'loading'}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Resend Password Reset Link
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    disabled
                    className="w-full"
                  >
                    <Clock className="mr-2 h-4 w-4" />
                    Resend in {formatCooldownTime(cooldownTime)}
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Back to Login Link */}
          {showBackToLogin && (
            <div className="text-center">
              <Link
                href="/login"
                className="inline-flex items-center text-sm text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 font-medium transition-colors"
              >
                <ArrowLeft className="mr-1 h-3 w-3" />
                Remember your password? Sign in
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Help Text */}
      <div className="mt-6 text-center">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Need help? Contact our{' '}
          <Link
            href="/support"
            className="text-blue-600 hover:text-blue-500 dark:text-blue-400 underline"
          >
            support team
          </Link>
        </p>
      </div>
    </div>
  );
};

// ================================
// 🎯 Export Component
// ================================

export default ForgotPasswordForm;

// Named exports for additional flexibility
export { type ForgotPasswordFormProps };

// ================================
// 🧪 Usage Examples (Comments)
// ================================

/*
// Basic usage:
<ForgotPasswordForm />

// With custom props:
<ForgotPasswordForm
  redirectTo="/auth/update-password"
  title="Reset Password"
  description="Enter your email to receive a reset link"
  resendCooldown={120}
  onSuccess={(email) => {
    console.log('Reset email sent to:', email);
    // Analytics tracking
  }}
  onError={(error) => {
    console.error('Password reset failed:', error);
    // Error tracking
  }}
/>

// Custom styling:
<ForgotPasswordForm
  title="Forgot Your Password?"
  description="No worries! We'll help you reset it"
  showBackToLogin={true}
/>

// In a page component:
export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Engunity AI
          </h1>
        </div>
        <ForgotPasswordForm />
      </div>
    </div>
  );
}
*/