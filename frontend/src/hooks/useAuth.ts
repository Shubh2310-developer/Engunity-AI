'use client';

import { useEffect, useState } from 'react';

export interface AuthUser {
  id: string;
  uid: string;
  email: string;
  name?: string;
  role: string;
  isActive: boolean;
  emailVerified: boolean;
}

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let mounted = true;

    // Get initial session from MongoDB
    const getInitialSession = async () => {
      try {
        const response = await fetch('/api/auth/session');
        const data = await response.json();

        if (!mounted) return;

        if (data.authenticated && data.user) {
          const authUser: AuthUser = {
            id: data.user.id,
            uid: data.user.id,
            email: data.user.email,
            name: data.user.name,
            role: data.user.role,
            isActive: data.user.isActive,
            emailVerified: data.user.emailVerified,
          };

          setAuthState({
            user: authUser,
            loading: false,
            error: null,
          });
        } else {
          setAuthState({
            user: null,
            loading: false,
            error: null,
          });
        }
      } catch (error) {
        if (mounted) {
          setAuthState({
            user: null,
            loading: false,
            error: error instanceof Error ? error.message : 'Authentication error',
          });
        }
      }
    };

    getInitialSession();

    return () => {
      mounted = false;
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    setAuthState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const result = await response.json();

      if (!response.ok) {
        setAuthState(prev => ({
          ...prev,
          loading: false,
          error: result.error || 'Login failed',
        }));
        return { error: { message: result.error || 'Login failed' } };
      }

      const authUser: AuthUser = {
        id: result.user.id,
        uid: result.user.id,
        email: result.user.email,
        name: result.user.name,
        role: result.user.role,
        isActive: result.user.isActive,
        emailVerified: result.user.emailVerified,
      };

      setAuthState({
        user: authUser,
        loading: false,
        error: null,
      });

      return { user: authUser };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sign in failed';
      setAuthState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
      return { error: { message: errorMessage } };
    }
  };

  const signUp = async (email: string, password: string, options?: {
    data?: {
      first_name?: string;
      last_name?: string;
      full_name?: string;
    };
  }) => {
    setAuthState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const name = options?.data?.full_name ||
                   `${options?.data?.first_name || ''} ${options?.data?.last_name || ''}`.trim() ||
                   undefined;

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, name }),
      });

      const result = await response.json();

      if (!response.ok) {
        setAuthState(prev => ({
          ...prev,
          loading: false,
          error: result.error || 'Registration failed',
        }));
        return { error: { message: result.error || 'Registration failed' } };
      }

      return { data: result };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sign up failed';
      setAuthState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
      return { error: { message: errorMessage } };
    }
  };

  const signOut = async () => {
    setAuthState(prev => ({ ...prev, loading: true }));

    try {
      await fetch('/api/auth/logout', { method: 'POST' });

      setAuthState({
        user: null,
        loading: false,
        error: null,
      });

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sign out failed';
      setAuthState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
      return { error: { message: errorMessage } };
    }
  };

  const resetPassword = async (email: string) => {
    try {
      // TODO: Implement password reset with MongoDB
      console.log('Password reset not yet implemented for MongoDB');
      return { error: { message: 'Password reset not yet implemented' } };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Password reset failed';
      return { error: { message: errorMessage } };
    }
  };

  const updateProfile = async (updates: {
    email?: string;
    password?: string;
    data?: Record<string, any>;
  }) => {
    setAuthState(prev => ({ ...prev, loading: true, error: null }));

    try {
      // TODO: Implement profile update with MongoDB
      console.log('Profile update not yet implemented for MongoDB');
      setAuthState(prev => ({
        ...prev,
        loading: false,
        error: 'Profile update not yet implemented',
      }));
      return { error: { message: 'Profile update not yet implemented' } };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Profile update failed';
      setAuthState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
      return { error: { message: errorMessage } };
    }
  };

  return {
    ...authState,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updateProfile,
    isAuthenticated: !!authState.user,
    isLoading: authState.loading,
  };
}
