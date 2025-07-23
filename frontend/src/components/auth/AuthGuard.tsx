/**
 * AuthGuard Component for Engunity AI
 * Location: frontend/src/components/auth/AuthGuard.tsx
 * 
 * Purpose: Protect client-side routes with authentication and role-based access control
 * Uses: Supabase Auth + RBAC system
 */

'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/auth/supabase';
import { hasRole, type UserRole, getRoleDisplayName } from '@/lib/auth/permissions';
import { 
  getCurrentSession, 
  getCurrentUser, 
  getExtendedUserProfile,
  type ExtendedUserProfile 
} from '@/lib/auth/session';

// ================================
// 🔧 Type Definitions
// ================================

/**
 * Props for the AuthGuard component
 */
export interface AuthGuardProps {
  /** Child components to render if access is granted */
  children: React.ReactNode;
  
  /** Minimum role required to access the protected content */
  requiredRole?: UserRole;
  
  /** Custom redirect path for unauthenticated users (default: '/auth/login') */
  redirectTo?: string;
  
  /** Whether to show loading spinner during auth check */
  showLoading?: boolean;
  
  /** Custom loading component */
  loadingComponent?: React.ReactNode;
  
  /** Custom access denied component */
  accessDeniedComponent?: React.ReactNode;
  
  /** Whether to check for active subscription (for subscription-based features) */
  requireActiveSubscription?: boolean;
  
  /** Minimum credits required to access the content */
  requiredCredits?: number;
  
  /** Custom error message for insufficient permissions */
  errorMessage?: string;
}

/**
 * Authentication state
 */
interface AuthState {
  session: Session | null;
  user: User | null;
  profile: ExtendedUserProfile | null;
  loading: boolean;
  error: string | null;
}

// ================================
// 🎨 Loading Components
// ================================

/**
 * Default loading spinner component
 */
const DefaultLoadingSpinner: React.FC = () => (
  <div className="flex items-center justify-center min-h-screen bg-gray-50">
    <div className="flex flex-col items-center space-y-4">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      <p className="text-gray-600 text-sm">Verifying authentication...</p>
    </div>
  </div>
);

/**
 * Compact loading spinner for smaller components
 */
const CompactLoadingSpinner: React.FC = () => (
  <div className="flex items-center justify-center p-8">
    <div className="flex flex-col items-center space-y-2">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      <p className="text-gray-500 text-xs">Loading...</p>
    </div>
  </div>
);

/**
 * Access denied component
 */
const DefaultAccessDenied: React.FC<{ 
  requiredRole?: UserRole; 
  userRole?: UserRole;
  errorMessage?: string;
}> = ({ requiredRole, userRole, errorMessage }) => (
  <div className="flex items-center justify-center min-h-screen bg-gray-50">
    <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
      <div className="mb-6">
        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100">
          <svg
            className="h-8 w-8 text-red-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
        </div>
      </div>
      
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        Access Denied
      </h3>
      
      <p className="text-gray-600 mb-4">
        {errorMessage || `You need ${requiredRole ? getRoleDisplayName(requiredRole) : 'higher'} privileges to access this content.`}
      </p>
      
      {userRole && requiredRole && (
        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <p className="text-sm text-gray-600">
            Your role: <span className="font-medium">{getRoleDisplayName(userRole)}</span>
          </p>
          <p className="text-sm text-gray-600">
            Required: <span className="font-medium">{getRoleDisplayName(requiredRole)}</span>
          </p>
        </div>
      )}
      
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={() => window.history.back()}
          className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
        >
          Go Back
        </button>
        <button
          onClick={() => window.location.href = '/dashboard'}
          className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
        >
          Dashboard
        </button>
      </div>
    </div>
  </div>
);

// ================================
// 🛡️ AuthGuard Component
// ================================

/**
 * AuthGuard component that protects routes with authentication and role-based access control
 */
const AuthGuard: React.FC<AuthGuardProps> = ({
  children,
  requiredRole,
  redirectTo = '/auth/login',
  showLoading = true,
  loadingComponent,
  accessDeniedComponent,
  requireActiveSubscription = false,
  requiredCredits,
  errorMessage,
}) => {
  const router = useRouter();
  const [authState, setAuthState] = useState<AuthState>({
    session: null,
    user: null,
    profile: null,
    loading: true,
    error: null,
  });

  // ================================
  // 🔄 Authentication Check
  // ================================

  useEffect(() => {
    let mounted = true;

    const checkAuthentication = async () => {
      try {
        // Get current session and user
        const [session, user] = await Promise.all([
          getCurrentSession(),
          getCurrentUser(),
        ]);

        if (!mounted) return;

        // If no session or user, redirect to login
        if (!session || !user) {
          router.push(redirectTo);
          return;
        }

        // Get extended user profile for role checking
        const profile = await getExtendedUserProfile(user.id);

        if (!mounted) return;

        setAuthState({
          session,
          user,
          profile,
          loading: false,
          error: null,
        });

      } catch (error) {
        console.error('Authentication check failed:', error);
        
        if (!mounted) return;

        setAuthState(prev => ({
          ...prev,
          loading: false,
          error: error instanceof Error ? error.message : 'Authentication failed',
        }));

        // Redirect on error
        router.push(redirectTo);
      }
    };

    checkAuthentication();

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        if (event === 'SIGNED_OUT' || !session) {
          router.push(redirectTo);
          return;
        }

        if (event === 'SIGNED_IN' && session) {
          // Refresh the auth state when user signs in
          await checkAuthentication();
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [router, redirectTo]);

  // ================================
  // 🔍 Permission Checks
  // ================================

  const checkPermissions = (): { hasAccess: boolean; errorMessage: string } => {
    const { profile } = authState;

    if (!profile) {
      return {
        hasAccess: false,
        errorMessage: 'User profile not found. Please try logging in again.',
      };
    }

    // Check role-based access
    if (requiredRole && !hasRole(profile.role, requiredRole)) {
      return {
        hasAccess: false,
        errorMessage: errorMessage || `This feature requires ${getRoleDisplayName(requiredRole)} access or higher.`,
      };
    }

    // Check subscription status
    if (requireActiveSubscription) {
      const hasActiveSubscription = 
        profile.subscription_status === 'active' || 
        profile.subscription_status === 'trialing';

      if (!hasActiveSubscription) {
        return {
          hasAccess: false,
          errorMessage: errorMessage || 'This feature requires an active subscription.',
        };
      }
    }

    // Check credits requirement
    if (requiredCredits && profile.credits_remaining < requiredCredits) {
      return {
        hasAccess: false,
        errorMessage: errorMessage || `This feature requires ${requiredCredits} credits. You have ${profile.credits_remaining} remaining.`,
      };
    }

    return { hasAccess: true, errorMessage: '' };
  };

  // ================================
  // 🎨 Render Logic
  // ================================

  // Show loading state
  if (authState.loading) {
    if (!showLoading) {
      return null;
    }

    if (loadingComponent) {
      return <>{loadingComponent}</>;
    }

    // Use compact loading for non-page components
    const isPageLevel = typeof window !== 'undefined' && 
                       window.location.pathname.split('/').length <= 3;
    
    return isPageLevel ? <DefaultLoadingSpinner /> : <CompactLoadingSpinner />;
  }

  // Show error state
  if (authState.error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <p className="text-red-600 mb-4">Authentication Error</p>
          <p className="text-gray-600 text-sm">{authState.error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Check permissions if user is authenticated
  if (authState.session && authState.user) {
    const { hasAccess, errorMessage: permissionError } = checkPermissions();

    if (!hasAccess) {
      if (accessDeniedComponent) {
        return <>{accessDeniedComponent}</>;
      }

      const accessDeniedProps: {
        requiredRole?: UserRole; 
        userRole?: UserRole;
        errorMessage?: string;
      } = {
        errorMessage: permissionError,
      };
      
      if (requiredRole) accessDeniedProps.requiredRole = requiredRole;
      if (authState.profile?.role) accessDeniedProps.userRole = authState.profile.role;

      return <DefaultAccessDenied {...accessDeniedProps} />;
    }

    // User is authenticated and has permission - render children
    return <>{children}</>;
  }

  // Fallback - should not reach here due to redirects
  return null;
};

// ================================
// 🎯 Higher-Order Component Wrapper
// ================================

/**
 * Higher-order component wrapper for AuthGuard
 * @param requiredRole - Minimum role required
 * @param options - Additional AuthGuard options
 */
export function withAuthGuard<T extends object>(
  requiredRole?: UserRole,
  options?: Omit<AuthGuardProps, 'children' | 'requiredRole'>
) {
  return function AuthGuardWrapper(
    Component: React.ComponentType<T>
  ): React.ComponentType<T> {
    return function GuardedComponent(props: T) {
      return (
        <AuthGuard {...(requiredRole && { requiredRole })} {...options}>
          <Component {...props} />
        </AuthGuard>
      );
    };
  };
}

// ================================
// 🎨 Utility Components
// ================================

/**
 * Simple authentication check hook for conditional rendering
 * @param requiredRole - Optional role requirement
 * @returns Object with authentication state and permission checks
 */
export function useAuthGuard(requiredRole?: UserRole) {
  const [authState, setAuthState] = useState<AuthState>({
    session: null,
    user: null,
    profile: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let mounted = true;

    const checkAuth = async () => {
      try {
        const [session, user] = await Promise.all([
          getCurrentSession(),
          getCurrentUser(),
        ]);

        if (!mounted) return;

        let profile = null;
        if (user) {
          profile = await getExtendedUserProfile(user.id);
        }

        if (!mounted) return;

        setAuthState({
          session,
          user,
          profile,
          loading: false,
          error: null,
        });
      } catch (error) {
        if (!mounted) return;
        
        setAuthState(prev => ({
          ...prev,
          loading: false,
          error: error instanceof Error ? error.message : 'Auth check failed',
        }));
      }
    };

    checkAuth();

    return () => {
      mounted = false;
    };
  }, []);

  const isAuthenticated = !!(authState.session && authState.user);
  const hasRequiredRole = requiredRole && authState.profile ? 
    hasRole(authState.profile.role, requiredRole) : true;

  return {
    ...authState,
    isAuthenticated,
    hasRequiredRole,
    canAccess: isAuthenticated && hasRequiredRole,
  };
}

/**
 * Conditional rendering component based on authentication state
 */
export const AuthConditional: React.FC<{
  children: React.ReactNode;
  requiredRole?: UserRole;
  fallback?: React.ReactNode;
  showLoading?: boolean;
}> = ({ 
  children, 
  requiredRole, 
  fallback = null, 
  showLoading = false 
}) => {
  const { canAccess, loading } = useAuthGuard(requiredRole);

  if (loading && showLoading) {
    return <CompactLoadingSpinner />;
  }

  return canAccess ? <>{children}</> : <>{fallback}</>;
};

export default AuthGuard;