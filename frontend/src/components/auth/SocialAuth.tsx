/**
 * SocialAuth Component for Engunity AI
 * Location: frontend/src/components/auth/SocialAuth.tsx
 * 
 * Purpose: OAuth authentication with Google and GitHub
 * Features: Auto-registration, verification flow, error handling
 * Framework: Next.js 14 + Supabase Auth + ShadCN UI
 */

'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/auth/supabase';

// ================================
// 🎨 Provider Icons
// ================================

/**
 * Google icon component with brand colors
 */
const GoogleIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </svg>
);

/**
 * GitHub icon component
 */
const GitHubIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path
      fillRule="evenodd"
      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
      clipRule="evenodd"
    />
  </svg>
);

// ================================
// 🔧 Type Definitions
// ================================

/**
 * Supported OAuth providers
 */
export type OAuthProvider = 'google' | 'github';

/**
 * Props for SocialAuth component
 */
export interface SocialAuthProps {
  /** Redirect URL after successful authentication */
  redirectTo?: string;
  /** Text to display on buttons */
  buttonText?: 'login' | 'register' | 'continue';
  /** Show providers vertically or horizontally */
  direction?: 'vertical' | 'horizontal';
  /** Additional CSS classes */
  className?: string;
  /** Callback on successful OAuth */
  onSuccess?: (provider: OAuthProvider, user: any) => void;
  /** Callback on OAuth error */
  onError?: (provider: OAuthProvider, error: string) => void;
  /** Whether buttons should be disabled */
  disabled?: boolean;
}

/**
 * Provider configuration
 */
interface ProviderConfig {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  bgColor: string;
  textColor: string;
  hoverColor: string;
  borderColor: string;
}

// ================================
// 🎨 Provider Configurations
// ================================

const providerConfigs: Record<OAuthProvider, ProviderConfig> = {
  google: {
    name: 'Google',
    icon: GoogleIcon,
    bgColor: 'bg-white dark:bg-gray-800',
    textColor: 'text-gray-900 dark:text-gray-100',
    hoverColor: 'hover:bg-gray-50 dark:hover:bg-gray-700',
    borderColor: 'border-gray-300 dark:border-gray-600',
  },
  github: {
    name: 'GitHub',
    icon: GitHubIcon,
    bgColor: 'bg-gray-900 dark:bg-gray-800',
    textColor: 'text-white dark:text-gray-100',
    hoverColor: 'hover:bg-gray-800 dark:hover:bg-gray-700',
    borderColor: 'border-gray-900 dark:border-gray-600',
  },
};

// ================================
// 🎨 SocialAuth Component
// ================================

/**
 * Social authentication component with Google and GitHub OAuth
 * Handles automatic registration, verification, and dashboard redirect
 */
const SocialAuth: React.FC<SocialAuthProps> = ({
  redirectTo = '/dashboard',
  buttonText = 'continue',
  direction = 'vertical',
  className = '',
  onSuccess,
  onError,
  disabled = false,
}) => {
  // State management
  const [loadingProvider, setLoadingProvider] = useState<OAuthProvider | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  /**
   * Get button text based on props
   */
  const getButtonText = (providerName: string): string => {
    switch (buttonText) {
      case 'login':
        return `Sign in with ${providerName}`;
      case 'register':
        return `Sign up with ${providerName}`;
      default:
        return `Continue with ${providerName}`;
    }
  };

  /**
   * Handle OAuth authentication with automatic registration
   */
  const handleOAuthLogin = async (provider: OAuthProvider): Promise<void> => {
    if (disabled || loadingProvider) return;

    setLoadingProvider(provider);
    setAuthError(null);

    try {
      console.log(`Initiating ${provider} OAuth...`);

      // Create the OAuth URL with proper configuration
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          // Redirect directly to the desired page after authentication
          redirectTo: `${window.location.origin}/auth/callback?redirect_to=${encodeURIComponent(redirectTo)}`,
          // Additional OAuth options for better user experience
          queryParams: {
            access_type: 'offline',
            prompt: 'select_account', // Allow users to select account
          },
          // Scopes for getting user information
          scopes: provider === 'github' ? 'user:email' : 'email profile',
        },
      });

      if (error) {
        throw error;
      }

      console.log(`${provider} OAuth initiated successfully:`, data);

      // Call success callback
      onSuccess?.(provider, data);

      // Note: The actual redirect and user creation happens in the callback
      // The OAuth flow will:
      // 1. Redirect to provider (Google/GitHub)
      // 2. User authorizes the app
      // 3. Provider redirects to our callback URL
      // 4. Callback handler processes the auth and creates/updates user
      // 5. User gets redirected to dashboard

    } catch (error: any) {
      console.error(`${provider} OAuth error:`, error);
      
      // Handle specific OAuth errors
      let errorMessage = `Failed to sign in with ${providerConfigs[provider].name}. Please try again.`;
      
      if (error.message) {
        switch (true) {
          case error.message.includes('OAuth provider not enabled'):
            errorMessage = `${providerConfigs[provider].name} authentication is not currently available.`;
            break;
          case error.message.includes('Invalid OAuth configuration'):
            errorMessage = 'Authentication service configuration error. Please contact support.';
            break;
          case error.message.includes('OAuth authorization cancelled'):
            errorMessage = 'Sign-in was cancelled. Please try again if you want to continue.';
            break;
          case error.message.includes('popup_blocked'):
            errorMessage = 'Popup was blocked. Please allow popups and try again.';
            break;
          case error.message.includes('network'):
            errorMessage = 'Network error. Please check your connection and try again.';
            break;
          default:
            errorMessage = error.message;
        }
      }
      
      setAuthError(errorMessage);
      onError?.(provider, errorMessage);
    } finally {
      setLoadingProvider(null);
    }
  };

  // ================================
  // 🎨 Render Component
  // ================================

  const providers: OAuthProvider[] = ['google', 'github'];
  const layoutClasses = direction === 'horizontal' ? 'flex flex-row gap-3' : 'flex flex-col gap-3';

  return (
    <div className={`${layoutClasses} ${className}`}>
      {/* Error Alert */}
      {authError && (
        <Alert variant="destructive" className="mb-3">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{authError}</AlertDescription>
        </Alert>
      )}

      {/* OAuth Provider Buttons */}
      {providers.map((provider) => {
        const config = providerConfigs[provider];
        const IconComponent = config.icon;
        const isLoading = loadingProvider === provider;
        const isDisabled = disabled || !!loadingProvider;

        return (
          <Button
            key={provider}
            type="button"
            variant="outline"
            onClick={() => handleOAuthLogin(provider)}
            disabled={isDisabled}
            className={`
              ${direction === 'horizontal' ? 'flex-1' : 'w-full'}
              ${config.bgColor}
              ${config.textColor}
              ${config.hoverColor}
              ${config.borderColor}
              border transition-all duration-200 ease-in-out
              focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
              disabled:opacity-50 disabled:cursor-not-allowed
              ${isLoading ? 'cursor-wait' : ''}
              font-medium
            `}
            aria-label={`${getButtonText(config.name)}`}
          >
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <IconComponent className="mr-2 h-4 w-4 flex-shrink-0" />
            )}
            
            <span className="truncate">
              {isLoading ? `Connecting to ${config.name}...` : getButtonText(config.name)}
            </span>
          </Button>
        );
      })}
    </div>
  );
};

// ================================
// 🎯 Export Component
// ================================

export default SocialAuth;

// Named exports for additional flexibility
// Types are already exported above at lines 66 and 71

// ================================
// 🧪 Usage Examples (JSDoc Comments)
// ================================

/**
 * @example
 * // Basic usage for login page
 * <SocialAuth buttonText="login" />
 * 
 * @example
 * // For registration page
 * <SocialAuth 
 *   buttonText="register"
 *   redirectTo="/onboarding"
 *   onSuccess={(provider, user) => {
 *     console.log(`User registered with ${provider}:`, user);
 *     analytics.track('oauth_registration', { provider });
 *   }}
 * />
 * 
 * @example
 * // Horizontal layout
 * <SocialAuth 
 *   direction="horizontal"
 *   buttonText="continue"
 *   className="max-w-sm"
 * />
 * 
 * @example
 * // With error handling
 * <SocialAuth
 *   onError={(provider, error) => {
 *     console.error(`${provider} auth failed:`, error);
 *     toast.error(`Failed to sign in with ${provider}`);
 *   }}
 * />
 */