/**
 * AuthGuard Component for Engunity AI
 * Location: frontend/src/components/auth/AuthGuard.tsx
 *
 * Purpose: Protect client-side routes with MongoDB authentication
 */

'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  getCurrentSession,
  getCurrentUser,
  type MongoDBUser,
  type UserRole,
} from '@/lib/auth/mongo-session';

// ================================
// Type Definitions
// ================================

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

  /** Custom error message for insufficient permissions */
  errorMessage?: string;
}

interface AuthState {
  user: MongoDBUser | null;
  loading: boolean;
  error: string | null;
}

// ================================
// Loading Components
// ================================

const DefaultLoadingSpinner: React.FC = () => (
  <div className="flex items-center justify-center min-h-screen bg-gray-50">
    <div className="flex flex-col items-center space-y-4">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      <p className="text-gray-600 text-sm">Verifying authentication...</p>
    </div>
  </div>
);

const CompactLoadingSpinner: React.FC = () => (
  <div className="flex items-center justify-center p-8">
    <div className="flex flex-col items-center space-y-2">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      <p className="text-gray-500 text-xs">Loading...</p>
    </div>
  </div>
);

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

      <h3 className="text-lg font-semibold text-gray-900 mb-2">Access Denied</h3>

      <p className="text-gray-600 mb-4">
        {errorMessage ||
          `You need ${requiredRole ? requiredRole : 'higher'} privileges to access this content.`}
      </p>

      {userRole && requiredRole && (
        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <p className="text-sm text-gray-600">
            Your role: <span className="font-medium capitalize">{userRole}</span>
          </p>
          <p className="text-sm text-gray-600">
            Required: <span className="font-medium capitalize">{requiredRole}</span>
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
          onClick={() => (window.location.href = '/dashboard')}
          className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
        >
          Dashboard
        </button>
      </div>
    </div>
  </div>
);

// ================================
// AuthGuard Component
// ================================

const AuthGuard: React.FC<AuthGuardProps> = ({
  children,
  requiredRole,
  redirectTo = '/auth/login',
  showLoading = true,
  loadingComponent,
  accessDeniedComponent,
  errorMessage,
}) => {
  const router = useRouter();
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let mounted = true;

    const checkAuthentication = async () => {
      try {
        const user = await getCurrentUser();

        if (!mounted) return;

        if (!user) {
          router.push(redirectTo);
          return;
        }

        if (!user.isActive) {
          setAuthState({
            user: null,
            loading: false,
            error: 'Account is inactive',
          });
          router.push(redirectTo);
          return;
        }

        setAuthState({
          user,
          loading: false,
          error: null,
        });
      } catch (error) {
        console.error('Authentication check failed:', error);

        if (!mounted) return;

        setAuthState({
          user: null,
          loading: false,
          error: error instanceof Error ? error.message : 'Authentication failed',
        });

        router.push(redirectTo);
      }
    };

    checkAuthentication();

    return () => {
      mounted = false;
    };
  }, [router, redirectTo]);

  // Check permissions
  const checkPermissions = (): { hasAccess: boolean; errorMessage: string } => {
    const { user } = authState;

    if (!user) {
      return {
        hasAccess: false,
        errorMessage: 'User not found. Please try logging in again.',
      };
    }

    // Role hierarchy: user < premium < admin
    const roleHierarchy: Record<UserRole, number> = {
      user: 1,
      premium: 2,
      admin: 3,
    };

    if (requiredRole) {
      const userRoleLevel = roleHierarchy[user.role] || 0;
      const requiredRoleLevel = roleHierarchy[requiredRole] || 0;

      if (userRoleLevel < requiredRoleLevel) {
        return {
          hasAccess: false,
          errorMessage:
            errorMessage || `This feature requires ${requiredRole} access or higher.`,
        };
      }
    }

    return { hasAccess: true, errorMessage: '' };
  };

  // Show loading state
  if (authState.loading) {
    if (!showLoading) {
      return null;
    }

    if (loadingComponent) {
      return <>{loadingComponent}</>;
    }

    const isPageLevel =
      typeof window !== 'undefined' && window.location.pathname.split('/').length <= 3;

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
  if (authState.user) {
    const { hasAccess, errorMessage: permissionError } = checkPermissions();

    if (!hasAccess) {
      if (accessDeniedComponent) {
        return <>{accessDeniedComponent}</>;
      }

      const accessDeniedProps = {
        errorMessage: permissionError,
        requiredRole,
        userRole: authState.user.role,
      };

      return <DefaultAccessDenied {...accessDeniedProps} />;
    }

    // User is authenticated and has permission - render children
    return <>{children}</>;
  }

  // Fallback
  return null;
};

// ================================
// Higher-Order Component Wrapper
// ================================

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
// Utility Components
// ================================

export function useAuthGuard(requiredRole?: UserRole) {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let mounted = true;

    const checkAuth = async () => {
      try {
        const user = await getCurrentUser();

        if (!mounted) return;

        setAuthState({
          user,
          loading: false,
          error: null,
        });
      } catch (error) {
        if (!mounted) return;

        setAuthState({
          user: null,
          loading: false,
          error: error instanceof Error ? error.message : 'Auth check failed',
        });
      }
    };

    checkAuth();

    return () => {
      mounted = false;
    };
  }, []);

  const isAuthenticated = !!authState.user;

  const roleHierarchy: Record<UserRole, number> = {
    user: 1,
    premium: 2,
    admin: 3,
  };

  const hasRequiredRole =
    requiredRole && authState.user
      ? roleHierarchy[authState.user.role] >= roleHierarchy[requiredRole]
      : true;

  return {
    ...authState,
    isAuthenticated,
    hasRequiredRole,
    canAccess: isAuthenticated && hasRequiredRole,
  };
}

export const AuthConditional: React.FC<{
  children: React.ReactNode;
  requiredRole?: UserRole;
  fallback?: React.ReactNode;
  showLoading?: boolean;
}> = ({ children, requiredRole, fallback = null, showLoading = false }) => {
  const { canAccess, loading } = useAuthGuard(requiredRole);

  if (loading && showLoading) {
    return <CompactLoadingSpinner />;
  }

  return canAccess ? <>{children}</> : <>{fallback}</>;
};

export default AuthGuard;
