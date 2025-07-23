'use client';

/**
 * User Context Provider
 * Manages user authentication state and Firestore profile data
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { UserProfile, UserService, ActivityService, DocumentService } from '@/lib/firebase/firestore';
import { IntegratedAuthService, AuthUser } from '@/lib/auth/integrated-auth';

// ================================
// TYPES
// ================================

interface UserContextType {
  // Auth State
  user: AuthUser | null;
  profile: UserProfile | null;
  session: Session | null;
  loading: boolean;
  error: string | null;

  // Profile Management
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  refreshProfile: () => Promise<void>;

  // Usage Stats
  incrementUsage: (stat: keyof UserProfile['usage']) => Promise<void>;
  
  // Activity Logging
  logActivity: (action: string, item: string, type: 'upload' | 'analysis' | 'code' | 'question' | 'chat') => Promise<void>;

  // Auth Actions
  signOut: () => Promise<void>;
}

// ================================
// CONTEXT CREATION
// ================================

const UserContext = createContext<UserContextType | undefined>(undefined);

// ================================
// PROVIDER COMPONENT
// ================================

interface UserProviderProps {
  children: React.ReactNode;
}

export function UserProvider({ children }: UserProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ================================
  // PROFILE MANAGEMENT
  // ================================

  const loadUserProfile = useCallback(async (supabaseUser: SupabaseUser) => {
    try {
      setError(null);
      
      // Sync with Firestore and get profile
      const firestoreProfile = await IntegratedAuthService.syncUserWithFirestore(supabaseUser);
      
      if (firestoreProfile) {
        setProfile(firestoreProfile);
        setUser({
          id: supabaseUser.id,
          email: supabaseUser.email!,
          name: firestoreProfile.name,
          avatar: firestoreProfile.avatar,
          supabaseUser,
          profile: firestoreProfile
        });
      }
    } catch (err) {
      console.error('❌ Error loading user profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to load user profile');
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    
    try {
      const updatedProfile = await UserService.getUserProfile(user.id);
      if (updatedProfile) {
        setProfile(updatedProfile);
        setUser(prev => prev ? { ...prev, profile: updatedProfile } : null);
      }
    } catch (err) {
      console.error('❌ Error refreshing profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to refresh profile');
    }
  }, [user]);

  const updateProfile = useCallback(async (updates: Partial<UserProfile>) => {
    if (!user) return;
    
    try {
      await UserService.updateUserProfile(user.id, updates);
      await refreshProfile();
    } catch (err) {
      console.error('❌ Error updating profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to update profile');
      throw err;
    }
  }, [user, refreshProfile]);

  // ================================
  // USAGE TRACKING
  // ================================

  const incrementUsage = useCallback(async (stat: keyof UserProfile['usage']) => {
    if (!user) return;
    
    try {
      await UserService.incrementUsageStats(user.id, stat);
      
      // Update local state optimistically
      setProfile(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          usage: {
            ...prev.usage,
            [stat]: prev.usage[stat] + 1
          }
        };
      });
    } catch (err) {
      console.error('❌ Error incrementing usage:', err);
      // Don't throw - usage tracking is non-critical
    }
  }, [user]);

  // ================================
  // ACTIVITY LOGGING
  // ================================

  const logActivity = useCallback(async (
    action: string, 
    item: string, 
    type: 'upload' | 'analysis' | 'code' | 'question' | 'chat'
  ) => {
    if (!user) return;
    
    try {
      await ActivityService.logActivity(user.id, {
        action,
        item,
        type,
        status: 'completed'
      });
    } catch (err) {
      console.error('❌ Error logging activity:', err);
      // Don't throw - activity logging is non-critical
    }
  }, [user]);

  // ================================
  // AUTH ACTIONS
  // ================================

  const signOut = useCallback(async () => {
    try {
      setLoading(true);
      await IntegratedAuthService.signOut();
      
      // Clear state
      setUser(null);
      setProfile(null);
      setSession(null);
      setError(null);
    } catch (err) {
      console.error('❌ Error signing out:', err);
      setError(err instanceof Error ? err.message : 'Failed to sign out');
    } finally {
      setLoading(false);
    }
  }, []);

  // ================================
  // INITIALIZATION & AUTH LISTENER
  // ================================

  useEffect(() => {
    let mounted = true;

    // Initialize auth state
    const initializeAuth = async () => {
      try {
        const { data: { session: initialSession } } = await IntegratedAuthService.getCurrentSession();
        
        if (!mounted) return;
        
        if (initialSession?.user) {
          setSession(initialSession);
          await loadUserProfile(initialSession.user);
        }
      } catch (err) {
        console.error('❌ Error initializing auth:', err);
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to initialize authentication');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // Set up auth state listener
    const { data: { subscription } } = IntegratedAuthService.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        console.log('🔄 Auth state change:', event, session?.user?.email);
        
        setSession(session);
        
        if (session?.user) {
          setLoading(true);
          await loadUserProfile(session.user);
          setLoading(false);
        } else {
          // User signed out
          setUser(null);
          setProfile(null);
          setError(null);
          setLoading(false);
        }
      }
    );

    // Cleanup
    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, [loadUserProfile]);

  // ================================
  // CONTEXT VALUE
  // ================================

  const contextValue: UserContextType = {
    user,
    profile,
    session,
    loading,
    error,
    updateProfile,
    refreshProfile,
    incrementUsage,
    logActivity,
    signOut
  };

  return (
    <UserContext.Provider value={contextValue}>
      {children}
    </UserContext.Provider>
  );
}

// ================================
// CUSTOM HOOK
// ================================

export function useUser(): UserContextType {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}

// ================================
// CONVENIENCE HOOKS
// ================================

export function useUserProfile() {
  const { profile, loading, error, updateProfile, refreshProfile } = useUser();
  return { profile, loading, error, updateProfile, refreshProfile };
}

export function useAuth() {
  const { user, session, loading, error, signOut } = useUser();
  return { 
    user, 
    session, 
    loading, 
    error, 
    signOut,
    isAuthenticated: !!user && !!session 
  };
}

export function useUsageTracking() {
  const { incrementUsage, logActivity, profile } = useUser();
  return { 
    incrementUsage, 
    logActivity, 
    usage: profile?.usage || {
      documentsProcessed: 0,
      codeGenerations: 0,
      aiQueries: 0,
      chatSessions: 0,
      insights: 0
    }
  };
}