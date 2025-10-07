'use client';

import { useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/auth/integrated-auth';

export interface AuthUser extends User {
  uid: string;
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

    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          if (mounted) {
            setAuthState({
              user: null,
              loading: false,
              error: error.message,
            });
          }
          return;
        }

        const user = session?.user ? {
          ...session.user,
          uid: session.user.id,
        } as AuthUser : null;

        if (mounted) {
          setAuthState({
            user,
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

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        const user = session?.user ? {
          ...session.user,
          uid: session.user.id,
        } as AuthUser : null;

        setAuthState({
          user,
          loading: false,
          error: null,
        });
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    setAuthState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setAuthState(prev => ({
          ...prev,
          loading: false,
          error: error.message,
        }));
        return { error };
      }

      const user = data.user ? {
        ...data.user,
        uid: data.user.id,
      } as AuthUser : null;

      setAuthState({
        user,
        loading: false,
        error: null,
      });

      return { user };
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
    };
  }) => {
    setAuthState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options,
      });

      if (error) {
        setAuthState(prev => ({
          ...prev,
          loading: false,
          error: error.message,
        }));
        return { error };
      }

      return { data };
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
      const { error } = await supabase.auth.signOut();

      if (error) {
        setAuthState(prev => ({
          ...prev,
          loading: false,
          error: error.message,
        }));
        return { error };
      }

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
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) {
        return { error };
      }

      return { success: true };
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
      const { data, error } = await supabase.auth.updateUser(updates);

      if (error) {
        setAuthState(prev => ({
          ...prev,
          loading: false,
          error: error.message,
        }));
        return { error };
      }

      const user = data.user ? {
        ...data.user,
        uid: data.user.id,
      } as AuthUser : null;

      setAuthState(prev => ({
        ...prev,
        user,
        loading: false,
        error: null,
      }));

      return { user };
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