'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

interface AuthUser {
  id: string;
  uid: string;
  email: string;
  name?: string;
  initials?: string;
  role: string;
  isActive: boolean;
  emailVerified: boolean;
}

interface MongoDBSession {
  userId: string;
  email: string;
  name?: string;
  role: string;
  isActive: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  session: MongoDBSession | null;
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
  const [session, setSession] = useState<MongoDBSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        // Get current session from MongoDB
        const response = await fetch('/api/auth/session');
        const data = await response.json();

        if (!mounted) return;

        if (data.authenticated && data.user) {
          console.log('✅ Valid MongoDB session found:', data.user.email);

          const authUser: AuthUser = {
            id: data.user.id,
            uid: data.user.id,
            email: data.user.email,
            name: data.user.name || data.user.email?.split('@')[0] || 'User',
            initials: (data.user.name || data.user.email || 'U')
              .split(' ')
              .map((n: string) => n[0])
              .join('')
              .toUpperCase()
              .slice(0, 2),
            role: data.user.role,
            isActive: data.user.isActive,
            emailVerified: data.user.emailVerified,
          };

          const mongoSession: MongoDBSession = {
            userId: data.user.id,
            email: data.user.email,
            name: data.user.name,
            role: data.user.role,
            isActive: data.user.isActive,
          };

          setUser(authUser);
          setSession(mongoSession);

          // Track login time for session persistence
          if (!localStorage.getItem('engunity-login-time')) {
            localStorage.setItem('engunity-login-time', new Date().toISOString());
          }
        } else {
          console.log('No valid MongoDB session found');
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

    return () => {
      mounted = false;
    };
  }, []);

  const signOut = async () => {
    try {
      console.log('🚪 Signing out user from MongoDB...');
      localStorage.removeItem('engunity-login-time');
      localStorage.removeItem('engunity-auth-token');
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
      setSession(null);
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const refreshSession = async () => {
    try {
      const response = await fetch('/api/auth/session');
      const data = await response.json();

      if (data.authenticated && data.user) {
        const authUser: AuthUser = {
          id: data.user.id,
          uid: data.user.id,
          email: data.user.email,
          name: data.user.name || data.user.email?.split('@')[0] || 'User',
          initials: (data.user.name || data.user.email || 'U')
            .split(' ')
            .map((n: string) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2),
          role: data.user.role,
          isActive: data.user.isActive,
          emailVerified: data.user.emailVerified,
        };

        const mongoSession: MongoDBSession = {
          userId: data.user.id,
          email: data.user.email,
          name: data.user.name,
          role: data.user.role,
          isActive: data.user.isActive,
        };

        setUser(authUser);
        setSession(mongoSession);
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
    refreshSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
