/**
 * LoginForm Component for Engunity AI SaaS Platform
 * Location: frontend/src/components/auth/LoginForm.tsx
 * 
 * Purpose: Secure user authentication with email verification enforcement
 * Framework: Next.js 14 App Router + Supabase Auth + ShadCN UI
 * Features: Email/password login, validation, error handling, verification checks
 */

'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { Eye, EyeOff, Mail, Lock, Loader2, AlertCircle } from 'lucide-react';

// ShadCN UI Components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';

// Auth components
import SocialAuth from '@/components/auth/SocialAuth';

// Supabase client
import { supabase } from '@/lib/auth/supabase';

// ================================
// 🔧 Type Definitions & Validation
// ================================

/**
 * Login form validation schema using Zod
 * Enforces email format and minimum password length
 */
const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address')
    .toLowerCase()
    .trim(),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(6, 'Password must be at least 6 characters long'),
});

/**
 * Inferred TypeScript type from Zod schema
 */
type LoginFormData = z.infer<typeof loginSchema>;

/**
 * Props interface for LoginForm component
 */
export interface LoginFormProps {
  /** Custom redirect path after successful login */
  redirectTo?: string;
  /** Custom title for the form */
  title?: string;
  /** Custom description for the form */
  description?: string;
  /** Whether to enforce email verification */
  requireEmailVerification?: boolean;
  /** Whether to show registration link */
  showRegisterLink?: boolean;
  /** Whether to show forgot password link */
  showForgotPasswordLink?: boolean;
  /** Whether to show OAuth options (Google, GitHub) */
  showOAuth?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Callback function on successful login */
  onSuccess?: (user: any) => void;
  /** Callback function on login error */
  onError?: (error: string) => void;
}

/**
 * Authentication error types for better error handling
 */
type AuthError = 
  | 'invalid_credentials'
  | 'email_not_confirmed'
  | 'too_many_requests'
  | 'network_error'
  | 'server_error'
  | 'unknown_error';

// ================================
// 🎨 LoginForm Component
// ================================

/**
 * Secure login form component with comprehensive error handling
 * and email verification enforcement for Engunity AI platform
 */
const LoginForm: React.FC<LoginFormProps> = ({
  redirectTo = '/dashboard',
  title = 'Welcome back',
  description = 'Sign in to your Engunity AI account',
  requireEmailVerification = true,
  showRegisterLink = true,
  showForgotPasswordLink = true,
  showOAuth = true,
  className = '',
  onSuccess,
  onError,
}) => {
  const router = useRouter();
  
  // ================================
  // 🎛️ State Management
  // ================================
  
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authErrorType, setAuthErrorType] = useState<AuthError | null>(null);

  // ================================
  // 📋 Form Setup with React Hook Form + Zod
  // ================================
  
  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
    mode: 'onBlur', // Validate on blur for better UX
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    setError,
    clearErrors,
  } = form;

  // ================================
  // 🔐 Authentication Logic
  // ================================

  /**
   * Determines the error type based on Supabase error message
   */
  const getErrorType = (errorMessage: string): AuthError => {
    const message = errorMessage.toLowerCase();
    
    if (message.includes('invalid login credentials') || message.includes('invalid email or password')) {
      return 'invalid_credentials';
    }
    if (message.includes('email not confirmed') || message.includes('email_confirmed_at')) {
      return 'email_not_confirmed';
    }
    if (message.includes('too many requests') || message.includes('rate limit')) {
      return 'too_many_requests';
    }
    if (message.includes('network') || message.includes('fetch')) {
      return 'network_error';
    }
    if (message.includes('server') || message.includes('internal')) {
      return 'server_error';
    }
    
    return 'unknown_error';
  };

  /**
   * Formats error messages for better user experience
   */
  const getErrorMessage = (errorType: AuthError, originalMessage: string): string => {
    switch (errorType) {
      case 'invalid_credentials':
        return 'Invalid email or password. Please check your credentials and try again.';
      case 'email_not_confirmed':
        return 'Please verify your email address before signing in. Check your inbox for a verification link.';
      case 'too_many_requests':
        return 'Too many login attempts. Please wait a few minutes before trying again.';
      case 'network_error':
        return 'Network error. Please check your internet connection and try again.';
      case 'server_error':
        return 'Server error. Please try again later or contact support if the problem persists.';
      default:
        return originalMessage || 'An unexpected error occurred. Please try again.';
    }
  };

  /**
   * Main login handler with comprehensive error handling
   */
  const handleLogin = async (data: LoginFormData): Promise<void> => {
    setIsLoading(true);
    setAuthError(null);
    setAuthErrorType(null);
    clearErrors();

    try {
      // Attempt to sign in with Supabase
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      // Handle Supabase authentication errors
      if (error) {
        const errorType = getErrorType(error.message);
        const errorMessage = getErrorMessage(errorType, error.message);
        
        setAuthError(errorMessage);
        setAuthErrorType(errorType);
        onError?.(errorMessage);
        
        // Set field-specific errors for better UX
        if (errorType === 'invalid_credentials') {
          setError('email', { type: 'manual', message: 'Please check your email' });
          setError('password', { type: 'manual', message: 'Please check your password' });
        }
        
        return;
      }

      // Check if user exists and is authenticated
      if (!authData.user) {
        const errorMessage = 'Authentication failed. Please try again.';
        setAuthError(errorMessage);
        setAuthErrorType('unknown_error');
        onError?.(errorMessage);
        return;
      }

      // Check email verification if required
      if (requireEmailVerification && !authData.user.email_confirmed_at) {
        const errorMessage = 'Please verify your email before logging in. Check your inbox for a verification link.';
        setAuthError(errorMessage);
        setAuthErrorType('email_not_confirmed');
        onError?.(errorMessage);
        
        // Sign out the user since they're not verified
        await supabase.auth.signOut();
        return;
      }

      // Success! Handle successful authentication
      console.log('Login successful:', {
        userId: authData.user.id,
        email: authData.user.email,
        emailVerified: !!authData.user.email_confirmed_at,
      });

      // Call success callback if provided
      onSuccess?.(authData.user);
      
      // Redirect to dashboard or specified path
      router.push(redirectTo);

    } catch (error: any) {
      console.error('Unexpected login error:', error);
      
      const errorType = getErrorType(error.message || '');
      const errorMessage = getErrorMessage(errorType, error.message || '');
      
      setAuthError(errorMessage);
      setAuthErrorType(errorType);
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Toggle password visibility
   */
  const togglePasswordVisibility = (): void => {
    setShowPassword(prev => !prev);
  };

  /**
   * Clear authentication errors when user starts typing
   */
  const clearAuthError = (): void => {
    if (authError) {
      setAuthError(null);
      setAuthErrorType(null);
    }
  };

  // ================================
  // 🎨 Render Component
  // ================================

  return (
    <Card className={`w-full max-w-md mx-auto shadow-lg ${className}`}>
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
          {title}
        </CardTitle>
        <CardDescription className="text-gray-600 dark:text-gray-400">
          {description}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Authentication Error Alert */}
        {authError && (
          <Alert variant="destructive" className="border-red-200 dark:border-red-800">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              {authError}
              {authErrorType === 'email_not_confirmed' && (
                <div className="mt-2">
                  <Link
                    href="/verify-email"
                    className="text-red-700 dark:text-red-400 underline hover:no-underline font-medium"
                  >
                    Resend verification email
                  </Link>
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* OAuth Login Section */}
        {showOAuth && (
          <>
            <SocialAuth
              buttonText="login"
              redirectTo={redirectTo}
              direction="vertical"
              disabled={isLoading}
              onSuccess={(provider, user) => {
                console.log(`OAuth login successful with ${provider}:`, user);
                onSuccess?.(user);
              }}
              onError={(provider, error) => {
                console.error(`OAuth login failed with ${provider}:`, error);
                setAuthError(error);
                setAuthErrorType('unknown_error');
                onError?.(error);
              }}
            />

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator className="w-full" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white dark:bg-gray-800 px-2 text-gray-500 dark:text-gray-400">
                  Or continue with email
                </span>
              </div>
            </div>
          </>
        )}

        {/* Email/Password Login Form */}
        <form onSubmit={handleSubmit(handleLogin)} className="space-y-4">
          {/* Email Field */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Email Address
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400 dark:text-gray-500" />
              <Input
                {...register('email')}
                id="email"
                type="email"
                placeholder="Enter your email address"
                className={`pl-9 ${errors.email ? 'border-red-500 focus:ring-red-500' : ''}`}
                disabled={isLoading}
                autoComplete="email"
                autoFocus
                onChange={(e) => {
                  register('email').onChange(e);
                  clearAuthError();
                }}
              />
            </div>
            {errors.email && (
              <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.email.message}
              </p>
            )}
          </div>

          {/* Password Field */}
          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Password
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400 dark:text-gray-500" />
              <Input
                {...register('password')}
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                className={`pl-9 pr-9 ${errors.password ? 'border-red-500 focus:ring-red-500' : ''}`}
                disabled={isLoading}
                autoComplete="current-password"
                onChange={(e) => {
                  register('password').onChange(e);
                  clearAuthError();
                }}
              />
              <button
                type="button"
                onClick={togglePasswordVisibility}
                className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
                disabled={isLoading}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.password.message}
              </p>
            )}
          </div>

          {/* Forgot Password Link */}
          {showForgotPasswordLink && (
            <div className="flex justify-end">
              <Link
                href="/forgot-password"
                className="text-sm text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
              >
                Forgot your password?
              </Link>
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white font-medium transition-colors"
            disabled={isLoading || !isValid}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </Button>
        </form>

        {/* Registration Link */}
        {showRegisterLink && (
          <div className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Don't have an account?{' '}
              <Link
                href="/register"
                className="text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 font-medium transition-colors"
              >
                Register
              </Link>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ================================
// 🎯 Export Component
// ================================

export default LoginForm;

// Named exports for additional flexibility
export { type LoginFormProps };

// ================================
// 🧪 Usage Examples (JSDoc Comments)
// ================================

/**
 * @example
 * // Basic usage
 * <LoginForm />
 * 
 * @example
 * // With custom props
 * <LoginForm
 *   redirectTo="/admin/dashboard"
 *   title="Admin Login"
 *   requireEmailVerification={true}
 *   onSuccess={(user) => {
 *     console.log('User logged in:', user.email);
 *     // Analytics tracking, etc.
 *   }}
 *   onError={(error) => {
 *     console.error('Login failed:', error);
 *     // Error tracking, etc.
 *   }}
 * />
 * 
 * @example
 * // Minimal version without links
 * <LoginForm
 *   showRegisterLink={false}
 *   showForgotPasswordLink={false}
 *   className="border-0 shadow-none"
 * />
 */