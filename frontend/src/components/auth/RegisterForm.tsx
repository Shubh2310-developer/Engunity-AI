/**
 * RegisterForm Component for Engunity AI
 * Location: frontend/src/components/auth/RegisterForm.tsx
 * 
 * Purpose: Professional registration form with email/password signup and OAuth
 * Uses: Supabase Auth + ShadCN UI + React Hook Form + Zod validation
 */

'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { 
  Eye, 
  EyeOff, 
  Mail, 
  Lock, 
  User,
  Loader2,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

// ShadCN UI Components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';

// Auth components
import SocialAuth from '@/components/auth/SocialAuth';

// Auth utilities
import { supabase } from '@/lib/auth/supabase';

// ================================
// 🔧 Type Definitions & Validation
// ================================

/**
 * Registration form validation schema using Zod
 */
const registerSchema = z.object({
  name: z
    .string()
    .min(1, 'Full name is required')
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must not exceed 50 characters')
    .regex(/^[a-zA-Z\s]+$/, 'Name can only contain letters and spaces')
    .trim(),
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address')
    .refine((email) => {
      // Block common test/invalid domains that Supabase rejects
      const blockedDomains = ['example.com', 'test.com', 'fake.com', 'invalid.com'];
      const domain = email.split('@')[1]?.toLowerCase();
      return !blockedDomains.includes(domain);
    }, 'Please use a valid email domain (Gmail, Outlook, etc.)')
    .toLowerCase()
    .trim(),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(6, 'Password must be at least 6 characters')
    .max(100, 'Password must not exceed 100 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    ),
  confirmPassword: z
    .string()
    .min(1, 'Please confirm your password'),
  termsAccepted: z
    .boolean()
    .refine((val) => val === true, {
      message: 'You must accept the terms and conditions',
    }),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

/**
 * Inferred TypeScript type from Zod schema
 */
type RegisterFormData = z.infer<typeof registerSchema>;

/**
 * OAuth provider configuration
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface OAuthProvider {
  name: string;
  provider: 'google' | 'github' | 'apple' | 'discord';
  icon: React.ComponentType<any>; // More flexible type for Lucide icons
  buttonColor: string;
}

/**
 * Props for the RegisterForm component
 */
interface RegisterFormProps {
  /** Custom redirect path after successful registration */
  redirectTo?: string;
  /** Whether to show OAuth options */
  showOAuth?: boolean;
  /** Custom title for the form */
  title?: string;
  /** Custom description for the form */
  description?: string;
  /** Callback function on successful registration */
  onSuccess?: (user: any) => void;
  /** Callback function on registration error */
  onError?: (error: string) => void;
  /** Whether to require email verification */
  requireEmailVerification?: boolean;
}

// ================================
// 🌐 OAuth Provider Configuration
// ================================

// OAuth providers configuration (unused in current implementation, using SocialAuth component instead)
// const oauthProviders: OAuthProvider[] = [
//   {
//     name: 'Google',
//     provider: 'google',
//     icon: Chrome,
//     buttonColor: 'bg-white hover:bg-gray-50 text-gray-900 border border-gray-300',
//   },
//   {
//     name: 'GitHub',
//     provider: 'github',
//     icon: Github,
//     buttonColor: 'bg-gray-900 hover:bg-gray-800 text-white',
//   },
// ];

// ================================
// 🎨 RegisterForm Component
// ================================

/**
 * Professional registration form component with email/password and OAuth signup
 */
const RegisterForm: React.FC<RegisterFormProps> = ({
  redirectTo = '/dashboard',
  showOAuth = true,
  title = 'Create your Engunity AI account',
  description = 'Join thousands of researchers, developers, and innovators',
  onSuccess,
  onError,
  requireEmailVerification = true,
}) => {
  const router = useRouter();
  
  // Form state management
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);

  // React Hook Form setup with Zod validation
  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      termsAccepted: false,
    },
  });

  // ================================
  // 🔐 Authentication Handlers
  // ================================

  /**
   * Handle email/password registration submission
   */
  const handleEmailRegistration = async (data: RegisterFormData) => {
    setIsLoading(true);
    setAuthError(null);
    setAuthSuccess(null);

    try {
      const { data: authData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.name,
            name: data.name, // Fallback for compatibility
          },
          ...(requireEmailVerification && {
            emailRedirectTo: `${window.location.origin}/auth/callback?redirect_to=${encodeURIComponent(redirectTo)}`
          }),
        },
      });

      if (error) {
        throw error;
      }

      if (authData.user) {
        // Call success callback if provided
        onSuccess?.(authData.user);

        if (requireEmailVerification && !authData.session) {
          // Email verification required - redirect to verification page
          setAuthSuccess(
            `Registration successful! Redirecting to verification page...`
          );
          
          setTimeout(() => {
            router.push(`/auth/verify-email?email=${encodeURIComponent(data.email)}&redirect_to=${encodeURIComponent(redirectTo)}`);
          }, 1500);
        } else {
          // Direct sign-in (email verification disabled) - still show welcome flow for new users
          setAuthSuccess('Account created successfully! Setting up your account...');
          
          // All new registered users should see the welcome/verification flow
          const welcomeRedirect = `/auth/verify-email?email=${encodeURIComponent(data.email)}&verified=true&redirect_to=${encodeURIComponent(redirectTo)}`;
          
          // Redirect after a short delay to show success message
          setTimeout(() => {
            router.push(welcomeRedirect);
          }, 1500);
        }

        // Reset form
        form.reset();
      }

    } catch (error: any) {
      console.error('Registration error:', error);
      
      // Handle specific Supabase auth errors
      let errorMessage = 'An unexpected error occurred. Please try again.';
      
      if (error.message) {
        switch (error.message) {
          case 'User already registered':
            errorMessage = 'An account with this email already exists. Please sign in instead.';
            break;
          case 'Password should be at least 6 characters':
            errorMessage = 'Password must be at least 6 characters long.';
            break;
          case 'Signup is disabled':
            errorMessage = 'New registrations are currently disabled. Please contact support.';
            break;
          case 'Email rate limit exceeded':
            errorMessage = 'Too many registration attempts. Please wait a moment and try again.';
            break;
          default:
            errorMessage = error.message;
        }
      }
      
      // Handle specific error codes
      if (error.code) {
        switch (error.code) {
          case 'email_address_invalid':
            errorMessage = 'Please use a valid email address from a recognized domain (e.g., Gmail, Outlook, Yahoo).';
            break;
          case 'weak_password':
            errorMessage = 'Password is too weak. Please use a stronger password with mixed characters.';
            break;
          case 'email_taken':
            errorMessage = 'An account with this email already exists. Please sign in instead.';
            break;
        }
      }
      
      setAuthError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle OAuth provider registration
   */
  const _handleOAuthRegistration = async (provider: 'google' | 'github' | 'apple' | 'discord') => {
    setOauthLoading(provider);
    setAuthError(null);
    setAuthSuccess(null);

    try {
      const { data: _data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback?redirect_to=${encodeURIComponent(redirectTo)}`,
        },
      });

      if (error) {
        throw error;
      }

      // OAuth redirect will handle the rest
      console.log('OAuth registration initiated:', provider);

    } catch (error: any) {
      console.error('OAuth registration error:', error);
      
      const errorMessage = error.message || `Failed to sign up with ${provider}. Please try again.`;
      setAuthError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setOauthLoading(null);
    }
  };

  /**
   * Toggle password visibility
   */
  const togglePasswordVisibility = (field: 'password' | 'confirmPassword') => {
    if (field === 'password') {
      setShowPassword(!showPassword);
    } else {
      setShowConfirmPassword(!showConfirmPassword);
    }
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
          {/* Success Alert */}
          {authSuccess && (
            <Alert className="border-green-200 bg-green-50 dark:bg-green-950">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800 dark:text-green-200">
                {authSuccess}
              </AlertDescription>
            </Alert>
          )}

          {/* Error Alert */}
          {authError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{authError}</AlertDescription>
            </Alert>
          )}

          {/* OAuth Registration Section */}
          {showOAuth && (
            <>
              <SocialAuth
                buttonText="register"
                redirectTo={redirectTo}
                direction="vertical"
                disabled={isLoading}
                onSuccess={(provider, user) => {
                  console.log(`OAuth registration successful with ${provider}:`, user);
                  onSuccess?.(user);
                }}
                onError={(provider, error) => {
                  console.error(`OAuth registration failed with ${provider}:`, error);
                  setAuthError(error);
                  onError?.(error);
                }}
              />

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <Separator className="w-full" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Or create account with email
                  </span>
                </div>
              </div>
            </>
          )}

          {/* Email/Password Registration Form */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleEmailRegistration)} className="space-y-4">
              {/* Full Name Field */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">
                      Full Name *
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          {...field}
                          type="text"
                          placeholder="Enter your full name"
                          className="pl-9"
                          disabled={isLoading || !!oauthLoading}
                          autoComplete="name"
                          autoFocus
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Email Field */}
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">
                      Email Address *
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          {...field}
                          type="email"
                          placeholder="Enter your email"
                          className="pl-9"
                          disabled={isLoading || !!oauthLoading}
                          autoComplete="email"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Password Field */}
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">
                      Password *
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          {...field}
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Create a password"
                          className="pl-9 pr-9"
                          disabled={isLoading || !!oauthLoading}
                          autoComplete="new-password"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => togglePasswordVisibility('password')}
                          disabled={isLoading || !!oauthLoading}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4 text-gray-400" />
                          ) : (
                            <Eye className="h-4 w-4 text-gray-400" />
                          )}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                    <p className="text-xs text-gray-500 mt-1">
                      Must contain uppercase, lowercase, and number
                    </p>
                  </FormItem>
                )}
              />

              {/* Confirm Password Field */}
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">
                      Confirm Password *
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          {...field}
                          type={showConfirmPassword ? 'text' : 'password'}
                          placeholder="Confirm your password"
                          className="pl-9 pr-9"
                          disabled={isLoading || !!oauthLoading}
                          autoComplete="new-password"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => togglePasswordVisibility('confirmPassword')}
                          disabled={isLoading || !!oauthLoading}
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="h-4 w-4 text-gray-400" />
                          ) : (
                            <Eye className="h-4 w-4 text-gray-400" />
                          )}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Terms and Conditions */}
              <FormField
                control={form.control}
                name="termsAccepted"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={isLoading || !!oauthLoading}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="text-sm">
                        I agree to the{' '}
                        <Link
                          href="/terms"
                          className="text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 underline"
                        >
                          Terms of Service
                        </Link>{' '}
                        and{' '}
                        <Link
                          href="/privacy"
                          className="text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 underline"
                        >
                          Privacy Policy
                        </Link>
                      </FormLabel>
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                disabled={isLoading || !!oauthLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  'Create Account'
                )}
              </Button>
            </form>
          </Form>

          {/* Sign In Link */}
          <div className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Already have an account?{' '}
              <Link
                href="/auth/login"
                className="text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 font-medium transition-colors"
              >
                Sign in
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Additional Information */}
      <div className="mt-6 text-center">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {requireEmailVerification && (
            <>You'll receive an email verification link after registration.<br /></>
          )}
          Free forever plan • No credit card required
        </p>
      </div>
    </div>
  );
};

// ================================
// 🎯 Export Component
// ================================

export default RegisterForm;

// Named exports for additional flexibility
export { type RegisterFormProps };

// ================================
// 🧪 Usage Examples (Comments)
// ================================

/*
// Basic usage:
<RegisterForm />

// With custom props:
<RegisterForm
  redirectTo="/onboarding"
  title="Join Engunity AI"
  description="Start your AI journey today"
  requireEmailVerification={true}
  onSuccess={(user) => console.log('User created:', user)}
  onError={(error) => console.error('Registration failed:', error)}
/>

// OAuth only:
<RegisterForm
  showOAuth={true}
  title="Quick Sign Up"
  description="Get started in seconds"
/>

// In a page component:
export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <RegisterForm />
    </div>
  );
}
*/