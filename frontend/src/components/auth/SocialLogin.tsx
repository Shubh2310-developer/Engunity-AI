/**
 * SocialLogin Component for Engunity AI
 * Location: frontend/src/components/auth/SocialLogin.tsx
 * 
 * Purpose: OAuth authentication buttons for external providers
 * Uses: Supabase OAuth + ShadCN UI + accessible design
 * 
 * SECURITY NOTE: Only use NEXT_PUBLIC_ environment variables.
 * Never expose secret keys or server-side tokens in client components.
 */

'use client';

import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';

// ShadCN UI Components
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Auth utilities
import { supabase } from '@/lib/auth/supabase';

// ================================
// 🎨 Provider Icons & Configurations
// ================================

/**
 * Google icon component (custom SVG for brand accuracy)
 */
const GoogleIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
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
  <svg
    className={className}
    fill="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path
      fillRule="evenodd"
      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
      clipRule="evenodd"
    />
  </svg>
);

/**
 * Discord icon component
 */
const DiscordIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <svg
    className={className}
    fill="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419-.0002 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1568 2.4189Z" />
  </svg>
);

/**
 * Apple icon component
 */
const AppleIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <svg
    className={className}
    fill="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
  </svg>
);

// ================================
// 🔧 Type Definitions
// ================================

/**
 * Supported OAuth providers
 */
export type OAuthProvider = 'google' | 'github' | 'discord' | 'apple';

/**
 * Layout direction for buttons
 */
export type ButtonDirection = 'vertical' | 'horizontal';

/**
 * Button size variants
 */
export type ButtonSize = 'sm' | 'md' | 'lg';

/**
 * Props for the SocialLogin component
 */
export interface SocialLoginProps {
  /** Array of OAuth providers to display */
  providers?: OAuthProvider[];
  
  /** Redirect URL after successful authentication */
  redirectTo?: string;
  
  /** Layout direction for buttons */
  direction?: ButtonDirection;
  
  /** Button size */
  size?: ButtonSize;
  
  /** Whether to show the provider name in button text */
  showText?: boolean;
  
  /** Custom text prefix (default: "Continue with") */
  textPrefix?: string;
  
  /** Whether buttons should be full width */
  fullWidth?: boolean;
  
  /** Additional CSS classes */
  className?: string;
  
  /** Callback function on successful OAuth initiation */
  onSuccess?: (provider: OAuthProvider) => void;
  
  /** Callback function on OAuth error */
  onError?: (error: string, provider: OAuthProvider) => void;
  
  /** Whether to disable all buttons */
  disabled?: boolean;
}

/**
 * Provider configuration interface
 */
interface ProviderConfig {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  bgColor: string;
  textColor: string;
  hoverColor: string;
  borderColor?: string;
}

// ================================
// 🎨 Provider Configurations
// ================================

/**
 * OAuth provider configurations with styling
 */
const providerConfigs: Record<OAuthProvider, ProviderConfig> = {
  google: {
    name: 'Google',
    icon: GoogleIcon,
    bgColor: 'bg-white',
    textColor: 'text-gray-900',
    hoverColor: 'hover:bg-gray-50',
    borderColor: 'border-gray-300',
  },
  github: {
    name: 'GitHub',
    icon: GitHubIcon,
    bgColor: 'bg-gray-900',
    textColor: 'text-white',
    hoverColor: 'hover:bg-gray-800',
  },
  discord: {
    name: 'Discord',
    icon: DiscordIcon,
    bgColor: 'bg-indigo-600',
    textColor: 'text-white',
    hoverColor: 'hover:bg-indigo-700',
  },
  apple: {
    name: 'Apple',
    icon: AppleIcon,
    bgColor: 'bg-black',
    textColor: 'text-white',
    hoverColor: 'hover:bg-gray-800',
  },
};

// ================================
// 🎨 SocialLogin Component
// ================================

/**
 * Accessible OAuth login component with multiple provider support
 */
const SocialLogin: React.FC<SocialLoginProps> = ({
  providers = ['google'],
  redirectTo = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/dashboard`,
  direction = 'vertical',
  size = 'md',
  showText = true,
  textPrefix = 'Continue with',
  fullWidth = true,
  className = '',
  onSuccess,
  onError,
  disabled = false,
}) => {
  // State management
  const [loadingProvider, setLoadingProvider] = useState<OAuthProvider | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  // ================================
  // 🔐 OAuth Authentication Handler
  // ================================

  /**
   * Handle OAuth provider login
   */
  const handleOAuthLogin = async (provider: OAuthProvider) => {
    if (disabled || loadingProvider) return;

    setLoadingProvider(provider);
    setAuthError(null);

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        throw error;
      }

      // Call success callback
      onSuccess?.(provider);

      // OAuth redirect will handle the authentication flow
      console.log(`OAuth login initiated for ${provider}:`, data);

    } catch (error: any) {
      console.error(`OAuth login error for ${provider}:`, error);
      
      // Handle specific OAuth errors
      let errorMessage = `Failed to sign in with ${providerConfigs[provider].name}. Please try again.`;
      
      if (error.message) {
        switch (error.message) {
          case 'OAuth provider not enabled':
            errorMessage = `${providerConfigs[provider].name} login is not currently available.`;
            break;
          case 'Invalid OAuth configuration':
            errorMessage = 'Authentication service configuration error. Please contact support.';
            break;
          case 'OAuth authorization cancelled':
            errorMessage = 'Login was cancelled. Please try again if you want to continue.';
            break;
          default:
            errorMessage = error.message;
        }
      }
      
      setAuthError(errorMessage);
      onError?.(errorMessage, provider);
    } finally {
      setLoadingProvider(null);
    }
  };

  // ================================
  // 🎨 Button Styling
  // ================================

  /**
   * Get button size classes
   */
  const getSizeClasses = (): string => {
    switch (size) {
      case 'sm':
        return 'h-9 px-3 text-sm';
      case 'lg':
        return 'h-12 px-6 text-base';
      default:
        return 'h-10 px-4 text-sm';
    }
  };

  /**
   * Get layout classes
   */
  const getLayoutClasses = (): string => {
    const baseClasses = direction === 'horizontal' ? 'flex flex-row gap-3' : 'flex flex-col gap-3';
    return `${baseClasses} ${className}`;
  };

  /**
   * Get button width classes
   */
  const getWidthClasses = (): string => {
    if (fullWidth) return 'w-full';
    if (direction === 'horizontal') return 'flex-1';
    return 'w-full';
  };

  // ================================
  // 🎨 Render Component
  // ================================

  return (
    <div className={getLayoutClasses()}>
      {/* Error Alert */}
      {authError && (
        <Alert variant="destructive" className="mb-3">
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
              ${getSizeClasses()}
              ${getWidthClasses()}
              ${config.bgColor}
              ${config.textColor}
              ${config.hoverColor}
              ${config.borderColor ? `border ${config.borderColor}` : 'border'}
              transition-all duration-200 ease-in-out
              focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
              disabled:opacity-50 disabled:cursor-not-allowed
              ${isLoading ? 'cursor-wait' : ''}
            `}
            aria-label={`Sign in with ${config.name}`}
            aria-describedby={authError ? 'oauth-error' : undefined}
          >
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <IconComponent className="mr-2 h-4 w-4 flex-shrink-0" />
            )}
            
            {showText && (
              <span className="truncate">
                {isLoading ? `Connecting to ${config.name}...` : `${textPrefix} ${config.name}`}
              </span>
            )}
          </Button>
        );
      })}
    </div>
  );
};

// ================================
// 🎯 Export Component
// ================================

export default SocialLogin;

// Named exports for additional flexibility
export { 
  type SocialLoginProps,
  type OAuthProvider,
  type ButtonDirection,
  type ButtonSize,
  providerConfigs,
};

// ================================
// 🧪 Usage Examples (Comments)
// ================================

/*
// Basic usage:
<SocialLogin />

// Multiple providers:
<SocialLogin
  providers={['google', 'github', 'discord']}
  direction="vertical"
  fullWidth={true}
/>

// Horizontal layout:
<SocialLogin
  providers={['google', 'github']}
  direction="horizontal"
  size="lg"
  textPrefix="Sign in with"
/>

// Custom styling:
<SocialLogin
  providers={['google']}
  className="max-w-sm mx-auto"
  redirectTo="/dashboard"
  onSuccess={(provider) => {
    console.log(`Successfully initiated ${provider} login`);
    // Analytics tracking
  }}
  onError={(error, provider) => {
    console.error(`${provider} login failed:`, error);
    // Error tracking
  }}
/>

// Icon only buttons:
<SocialLogin
  providers={['google', 'github', 'discord']}
  showText={false}
  direction="horizontal"
  fullWidth={false}
  size="sm"
/>

// In a form component:
export default function LoginForm() {
  return (
    <div className="space-y-6">
      <SocialLogin providers={['google', 'github']} />
      
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <Separator className="w-full" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            Or continue with email
          </span>
        </div>
      </div>
      
      <EmailPasswordForm />
    </div>
  );
}
*/