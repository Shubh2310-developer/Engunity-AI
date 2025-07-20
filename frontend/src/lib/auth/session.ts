/**
 * Authentication Session Management for Engunity AI
 * Location: frontend/src/lib/auth/session.ts
 * 
 * Purpose: Centralized utilities for managing user authentication sessions
 * Uses: Supabase Auth + MongoDB for extended user data
 */

import type { 
  Session, 
  User, 
  AuthError,
  AuthResponse,
} from '@supabase/supabase-js';
import { supabase } from './supabase';

// ================================
// 🔧 Type Definitions
// ================================

/**
 * User roles in the Engunity AI platform
 */
export type UserRole = 'free' | 'pro' | 'enterprise' | 'admin';

/**
 * User subscription tier
 */
export type SubscriptionTier = 'free' | 'starter' | 'professional' | 'enterprise';

/**
 * Extended user profile data from MongoDB
 */
export interface ExtendedUserProfile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  role: UserRole;
  subscription_tier: SubscriptionTier;
  subscription_status: 'active' | 'inactive' | 'canceled' | 'trialing';
  credits_remaining: number;
  api_calls_count: number;
  created_at: string;
  updated_at: string;
  preferences: {
    theme: 'light' | 'dark' | 'system';
    language: string;
    notifications_enabled: boolean;
    ai_model_preference: 'groq' | 'local' | 'auto';
  };
  features_enabled: {
    chat: boolean;
    code_assistant: boolean;
    document_qa: boolean;
    research_tools: boolean;
    data_analysis: boolean;
    blockchain_features: boolean;
  };
}

/**
 * Authentication context type
 */
export interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: ExtendedUserProfile | null;
  loading: boolean;
  error: AuthError | null;
}

/**
 * Session storage keys
 */
const SESSION_STORAGE_KEYS = {
  SESSION: 'engunity_session',
  USER: 'engunity_user',
  PROFILE: 'engunity_profile',
  LAST_REFRESH: 'engunity_last_refresh',
} as const;

// ================================
// 🔐 Core Session Management
// ================================

/**
 * Get the current Supabase session
 * @returns Promise<Session | null> Current session or null if not authenticated
 */
export async function getCurrentSession(): Promise<Session | null> {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Error fetching session:', error.message);
      return null;
    }
    
    // Store session locally if it exists
    if (session) {
      storeSessionLocally(session);
    }
    
    return session;
  } catch (error) {
    console.error('Unexpected error in getCurrentSession:', error);
    return null;
  }
}

/**
 * Get the current Supabase user
 * @returns Promise<User | null> Current user or null if not authenticated
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      console.error('Error fetching user:', error.message);
      return null;
    }
    
    // Store user locally if it exists
    if (user) {
      storeUserLocally(user);
    }
    
    return user;
  } catch (error) {
    console.error('Unexpected error in getCurrentUser:', error);
    return null;
  }
}

/**
 * Get extended user profile from MongoDB
 * @param userId - User ID from Supabase
 * @returns Promise<ExtendedUserProfile | null> Extended profile or null
 */
export async function getExtendedUserProfile(userId: string): Promise<ExtendedUserProfile | null> {
  try {
    const response = await fetch(`/api/auth/profile/${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch profile: ${response.statusText}`);
    }
    
    const profile = await response.json();
    
    // Store profile locally
    if (profile) {
      storeProfileLocally(profile);
    }
    
    return profile;
  } catch (error) {
    console.error('Error fetching extended user profile:', error);
    return null;
  }
}

/**
 * Get complete authentication context
 * @returns Promise<AuthContextType> Complete auth state
 */
export async function getAuthContext(): Promise<AuthContextType> {
  try {
    const session = await getCurrentSession();
    const user = await getCurrentUser();
    
    let profile: ExtendedUserProfile | null = null;
    if (user?.id) {
      profile = await getExtendedUserProfile(user.id);
    }
    
    return {
      session,
      user,
      profile,
      loading: false,
      error: null,
    };
  } catch (error) {
    console.error('Error getting auth context:', error);
    return {
      session: null,
      user: null,
      profile: null,
      loading: false,
      error: error as AuthError,
    };
  }
}

// ================================
// 🔄 Session Refresh & Validation
// ================================

/**
 * Refresh the current session if token is expired or close to expiry
 * @param forceRefresh - Force refresh even if token is still valid
 * @returns Promise<Session | null> Refreshed session or null
 */
export async function refreshSession(forceRefresh: boolean = false): Promise<Session | null> {
  try {
    const currentSession = await getCurrentSession();
    
    if (!currentSession) {
      return null;
    }
    
    // Check if refresh is needed
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = currentSession.expires_at || 0;
    const refreshThreshold = 60 * 5; // 5 minutes before expiry
    
    const needsRefresh = forceRefresh || (expiresAt - now) < refreshThreshold;
    
    if (!needsRefresh) {
      return currentSession;
    }
    
    // Perform refresh
    const { data: { session }, error } = await supabase.auth.refreshSession({
      refresh_token: currentSession.refresh_token,
    });
    
    if (error) {
      console.error('Error refreshing session:', error.message);
      await clearSession();
      return null;
    }
    
    if (session) {
      storeSessionLocally(session);
      updateLastRefreshTime();
    }
    
    return session;
  } catch (error) {
    console.error('Unexpected error in refreshSession:', error);
    return null;
  }
}

/**
 * Check if the current session is valid and not expired
 * @returns Promise<boolean> True if session is valid
 */
export async function isSessionValid(): Promise<boolean> {
  try {
    const session = await getCurrentSession();
    
    if (!session) {
      return false;
    }
    
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = session.expires_at || 0;
    
    return expiresAt > now;
  } catch (error) {
    console.error('Error checking session validity:', error);
    return false;
  }
}

/**
 * Automatically refresh session if needed
 * @returns Promise<Session | null> Current or refreshed session
 */
export async function ensureValidSession(): Promise<Session | null> {
  const isValid = await isSessionValid();
  
  if (!isValid) {
    return await refreshSession(true);
  }
  
  return await getCurrentSession();
}

// ================================
// 🚪 Logout & Session Cleanup
// ================================

/**
 * Log out the current user and clear all session data
 * @returns Promise<void>
 */
export async function logout(): Promise<void> {
  try {
    // Sign out from Supabase
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      console.error('Error during logout:', error.message);
    }
    
    // Clear all local storage regardless of Supabase error
    await clearSession();
    
    // Redirect to login page
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  } catch (error) {
    console.error('Unexpected error during logout:', error);
    // Still clear local storage even if there's an error
    await clearSession();
  }
}

/**
 * Clear all session-related data from local storage
 * @returns Promise<void>
 */
export async function clearSession(): Promise<void> {
  try {
    if (typeof window !== 'undefined') {
      // Clear localStorage
      Object.values(SESSION_STORAGE_KEYS).forEach(key => {
        localStorage.removeItem(key);
      });
      
      // Clear sessionStorage
      sessionStorage.clear();
      
      // Clear any auth-related cookies if needed
      document.cookie.split(";").forEach(cookie => {
        const eqPos = cookie.indexOf("=");
        const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
        if (name.startsWith('engunity_') || name.includes('auth')) {
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
        }
      });
    }
  } catch (error) {
    console.error('Error clearing session data:', error);
  }
}

// ================================
// 💾 Local Storage Management
// ================================

/**
 * Store session data in localStorage
 * @param session - Supabase session to store
 */
export function storeSessionLocally(session: Session): void {
  try {
    if (typeof window !== 'undefined') {
      // Store session without sensitive tokens
      const sessionToStore = {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_at: session.expires_at,
        expires_in: session.expires_in,
        token_type: session.token_type,
        user: session.user,
      };
      
      localStorage.setItem(SESSION_STORAGE_KEYS.SESSION, JSON.stringify(sessionToStore));
    }
  } catch (error) {
    console.error('Error storing session locally:', error);
  }
}

/**
 * Store user data in localStorage
 * @param user - Supabase user to store
 */
export function storeUserLocally(user: User): void {
  try {
    if (typeof window !== 'undefined') {
      // Store only non-sensitive user data
      const userToStore = {
        id: user.id,
        email: user.email,
        phone: user.phone,
        email_confirmed_at: user.email_confirmed_at,
        phone_confirmed_at: user.phone_confirmed_at,
        last_sign_in_at: user.last_sign_in_at,
        created_at: user.created_at,
        updated_at: user.updated_at,
        user_metadata: user.user_metadata,
        app_metadata: user.app_metadata,
      };
      
      localStorage.setItem(SESSION_STORAGE_KEYS.USER, JSON.stringify(userToStore));
    }
  } catch (error) {
    console.error('Error storing user locally:', error);
  }
}

/**
 * Store extended user profile in localStorage
 * @param profile - Extended user profile to store
 */
export function storeProfileLocally(profile: ExtendedUserProfile): void {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(SESSION_STORAGE_KEYS.PROFILE, JSON.stringify(profile));
    }
  } catch (error) {
    console.error('Error storing profile locally:', error);
  }
}

/**
 * Get session from localStorage
 * @returns Session | null
 */
export function getSessionFromStorage(): Session | null {
  try {
    if (typeof window !== 'undefined') {
      const sessionData = localStorage.getItem(SESSION_STORAGE_KEYS.SESSION);
      return sessionData ? JSON.parse(sessionData) : null;
    }
    return null;
  } catch (error) {
    console.error('Error getting session from storage:', error);
    return null;
  }
}

/**
 * Get user from localStorage
 * @returns User | null
 */
export function getUserFromStorage(): User | null {
  try {
    if (typeof window !== 'undefined') {
      const userData = localStorage.getItem(SESSION_STORAGE_KEYS.USER);
      return userData ? JSON.parse(userData) : null;
    }
    return null;
  } catch (error) {
    console.error('Error getting user from storage:', error);
    return null;
  }
}

/**
 * Get extended profile from localStorage
 * @returns ExtendedUserProfile | null
 */
export function getProfileFromStorage(): ExtendedUserProfile | null {
  try {
    if (typeof window !== 'undefined') {
      const profileData = localStorage.getItem(SESSION_STORAGE_KEYS.PROFILE);
      return profileData ? JSON.parse(profileData) : null;
    }
    return null;
  } catch (error) {
    console.error('Error getting profile from storage:', error);
    return null;
  }
}

// ================================
// 🔍 Session Utilities
// ================================

/**
 * Check if user has specific role
 * @param requiredRole - Role to check
 * @returns Promise<boolean> True if user has the required role
 */
export async function hasRole(requiredRole: UserRole): Promise<boolean> {
  try {
    const user = await getCurrentUser();
    if (!user) return false;
    
    const profile = await getExtendedUserProfile(user.id);
    if (!profile) return false;
    
    const roleHierarchy: Record<UserRole, number> = {
      'free': 1,
      'pro': 2,
      'enterprise': 3,
      'admin': 4,
    };
    
    return roleHierarchy[profile.role] >= roleHierarchy[requiredRole];
  } catch (error) {
    console.error('Error checking user role:', error);
    return false;
  }
}

/**
 * Check if user has active subscription
 * @returns Promise<boolean> True if user has active subscription
 */
export async function hasActiveSubscription(): Promise<boolean> {
  try {
    const user = await getCurrentUser();
    if (!user) return false;
    
    const profile = await getExtendedUserProfile(user.id);
    if (!profile) return false;
    
    return profile.subscription_status === 'active' || profile.subscription_status === 'trialing';
  } catch (error) {
    console.error('Error checking subscription status:', error);
    return false;
  }
}

/**
 * Check if user has remaining credits
 * @param requiredCredits - Number of credits required (default: 1)
 * @returns Promise<boolean> True if user has enough credits
 */
export async function hasCredits(requiredCredits: number = 1): Promise<boolean> {
  try {
    const user = await getCurrentUser();
    if (!user) return false;
    
    const profile = await getExtendedUserProfile(user.id);
    if (!profile) return false;
    
    return profile.credits_remaining >= requiredCredits;
  } catch (error) {
    console.error('Error checking user credits:', error);
    return false;
  }
}

/**
 * Update last refresh timestamp
 */
function updateLastRefreshTime(): void {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(SESSION_STORAGE_KEYS.LAST_REFRESH, Date.now().toString());
    }
  } catch (error) {
    console.error('Error updating last refresh time:', error);
  }
}

/**
 * Get time since last session refresh
 * @returns number - Milliseconds since last refresh
 */
export function getTimeSinceLastRefresh(): number {
  try {
    if (typeof window !== 'undefined') {
      const lastRefresh = localStorage.getItem(SESSION_STORAGE_KEYS.LAST_REFRESH);
      if (lastRefresh) {
        return Date.now() - parseInt(lastRefresh, 10);
      }
    }
    return 0;
  } catch (error) {
    console.error('Error getting time since last refresh:', error);
    return 0;
  }
}

// ================================
// 📱 Client-Side Session Monitoring
// ================================

/**
 * Set up automatic session refresh
 * @param intervalMinutes - Interval in minutes to check session (default: 5)
 */
export function setupAutoRefresh(intervalMinutes: number = 5): () => void {
  const interval = setInterval(async () => {
    const session = await getCurrentSession();
    if (session) {
      await refreshSession();
    }
  }, intervalMinutes * 60 * 1000);
  
  // Return cleanup function
  return () => clearInterval(interval);
}

/**
 * Listen for auth state changes
 * @param callback - Function to call when auth state changes
 * @returns Cleanup function
 */
export function onAuthStateChange(
  callback: (session: Session | null, user: User | null) => void
): () => void {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    async (event, session) => {
      console.log('Auth state changed:', event);
      
      if (event === 'SIGNED_OUT') {
        await clearSession();
      } else if (event === 'SIGNED_IN' && session) {
        storeSessionLocally(session);
        if (session.user) {
          storeUserLocally(session.user);
        }
      }
      
      callback(session, session?.user || null);
    }
  );
  
  return () => subscription.unsubscribe();
}

// ================================
// 🧪 Development Utilities
// ================================

/**
 * Debug function to log current auth state (development only)
 */
export async function debugAuthState(): Promise<void> {
  if (process.env.NODE_ENV !== 'development') {
    return;
  }
  
  console.group('🔐 Engunity AI Auth Debug');
  
  try {
    const session = await getCurrentSession();
    const user = await getCurrentUser();
    const profile = user ? await getExtendedUserProfile(user.id) : null;
    
    console.log('Session:', session);
    console.log('User:', user);
    console.log('Profile:', profile);
    console.log('Session Valid:', await isSessionValid());
    console.log('Time Since Last Refresh:', getTimeSinceLastRefresh());
    
  } catch (error) {
    console.error('Error in debug:', error);
  }
  
  console.groupEnd();
}