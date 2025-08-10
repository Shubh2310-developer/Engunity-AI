'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/auth/supabase';
import { isSessionExpired, setLoginTime, clearPersistenceData } from '@/lib/auth/persistence';

interface AuthUser extends User {
  uid: string;
  name?: string;
  initials?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  session: Session | null;
  loading: boolean;
  isAuthenticated: boolean;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        // Check if persistent session has expired (>30 days)
        if (isSessionExpired()) {
          console.log('Persistent session expired, clearing data');
          clearPersistenceData();
          await supabase.auth.signOut();
          if (mounted) {
            setUser(null);
            setSession(null);
            setLoading(false);
          }
          return;
        }

        // Get current session
        const { data: { session: currentSession }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Session error:', error);
          if (mounted) {
            setUser(null);
            setSession(null);
            setLoading(false);
          }
          return;
        }

        if (currentSession?.user && mounted) {
          console.log('✅ Valid session found:', currentSession.user.email);
          
          const authUser: AuthUser = {
            ...currentSession.user,
            uid: currentSession.user.id,
            name: currentSession.user.user_metadata?.full_name || 
                  currentSession.user.email?.split('@')[0] || 'User',
            initials: (currentSession.user.user_metadata?.full_name || 
                      currentSession.user.email || 'U')
                      .split(' ')
                      .map((n: string) => n[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2)
          };

          setUser(authUser);
          setSession(currentSession);
          
          // Ensure login time is tracked for persistence
          if (!localStorage.getItem('engunity-login-time')) {
            setLoginTime();
          }
        } else {
          console.log('No valid session found');
          setUser(null);
          setSession(null);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        if (mounted) {
          setUser(null);
          setSession(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!mounted) return;

        console.log('🔄 Auth state changed:', event, newSession?.user?.email);

        if (event === 'SIGNED_IN' && newSession?.user) {
          const authUser: AuthUser = {
            ...newSession.user,
            uid: newSession.user.id,
            name: newSession.user.user_metadata?.full_name || 
                  newSession.user.email?.split('@')[0] || 'User',
            initials: (newSession.user.user_metadata?.full_name || 
                      newSession.user.email || 'U')
                      .split(' ')
                      .map((n: string) => n[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2)
          };

          setUser(authUser);
          setSession(newSession);
          setLoginTime(); // Track login time for 30-day persistence
        } else if (event === 'SIGNED_OUT') {
          console.log('❌ User signed out');
          setUser(null);
          setSession(null);
          clearPersistenceData(); // Clear persistence data on sign out
        } else if (event === 'TOKEN_REFRESHED' && newSession?.user) {
          console.log('🔄 Token refreshed');
          // Keep user logged in on token refresh - no need to update login time
          const authUser: AuthUser = {
            ...newSession.user,
            uid: newSession.user.id,
            name: newSession.user.user_metadata?.full_name || 
                  newSession.user.email?.split('@')[0] || 'User',
            initials: (newSession.user.user_metadata?.full_name || 
                      newSession.user.email || 'U')
                      .split(' ')
                      .map((n: string) => n[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2)
          };
          setUser(authUser);
          setSession(newSession);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    try {
      console.log('🚪 Signing out user...');
      clearPersistenceData(); // Clear persistence data
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const refreshSession = async () => {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) throw error;
      
      if (data.session?.user) {
        const authUser: AuthUser = {
          ...data.session.user,
          uid: data.session.user.id,
          name: data.session.user.user_metadata?.full_name || 
                data.session.user.email?.split('@')[0] || 'User',
          initials: (data.session.user.user_metadata?.full_name || 
                    data.session.user.email || 'U')
                    .split(' ')
                    .map((n: string) => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2)
        };
        setUser(authUser);
        setSession(data.session);
      }
    } catch (error) {
      console.error('Session refresh error:', error);
    }
  };

  const value: AuthContextType = {
    user,
    session,
    loading,
    isAuthenticated: !!user && !!session,
    signOut,
    refreshSession
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}