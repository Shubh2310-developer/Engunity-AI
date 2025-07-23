/**
 * Integrated Authentication Service
 * Combines Supabase Auth with Firebase Firestore user management
 */

import { createClient, SupabaseClient, User as SupabaseUser, Session } from '@supabase/supabase-js';
import { User, UserService } from '../firebase/firestore';
import { Timestamp } from 'firebase/firestore';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
  }
});

// ================================
// TYPE DEFINITIONS
// ================================

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  supabaseUser: SupabaseUser;
  profile: User | null;
}

export interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  session: Session | null;
}

// ================================
// AUTHENTICATION SERVICE
// ================================

export class IntegratedAuthService {
  // ================================
  // AUTH STATE MANAGEMENT
  // ================================

  static async getCurrentSession(): Promise<{ data: { session: Session | null } }> {
    return await supabase.auth.getSession();
  }

  static async getCurrentUser(): Promise<SupabaseUser | null> {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user || null;
  }

  // ================================
  // SIGN IN METHODS
  // ================================

  static async signInWithEmail(email: string, password: string) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      if (data.user) {
        // Sync with Firestore
        await this.syncUserWithFirestore(data.user);
      }

      return { data, error: null };
    } catch (error) {
      console.error('❌ Email sign in error:', error);
      return { data: null, error };
    }
  }

  static async signInWithGoogle() {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?redirect_to=${window.location.pathname}`
        }
      });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('❌ Google sign in error:', error);
      return { data: null, error };
    }
  }

  static async signInWithGitHub() {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?redirect_to=${window.location.pathname}`
        }
      });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('❌ GitHub sign in error:', error);
      return { data: null, error };
    }
  }

  // ================================
  // SIGN UP METHODS
  // ================================

  static async signUpWithEmail(email: string, password: string, name?: string) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name || '',
            avatar_url: ''
          }
        }
      });

      if (error) throw error;

      if (data.user) {
        // Create Firestore profile
        await this.createFirestoreProfile(data.user, { name });
      }

      return { data, error: null };
    } catch (error) {
      console.error('❌ Email sign up error:', error);
      return { data: null, error };
    }
  }

  // ================================
  // SIGN OUT
  // ================================

  static async signOut() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      console.log('✅ User signed out successfully');
      return { error: null };
    } catch (error) {
      console.error('❌ Sign out error:', error);
      return { error };
    }
  }

  // ================================
  // FIRESTORE INTEGRATION
  // ================================

  static async syncUserWithFirestore(supabaseUser: SupabaseUser): Promise<User | null> {
    try {
      // Check if user exists in Firestore
      let firestoreProfile = await UserService.getUserProfile(supabaseUser.id);

      if (!firestoreProfile) {
        // Create new profile if doesn't exist
        firestoreProfile = await this.createFirestoreProfile(supabaseUser);
      } else {
        // Update last active
        await UserService.updateUserActivity(supabaseUser.id);
      }

      return firestoreProfile;
    } catch (error) {
      console.error('❌ Error syncing user with Firestore:', error);
      return null;
    }
  }

  static async createFirestoreProfile(
    supabaseUser: SupabaseUser, 
    additionalData?: { name?: string }
  ): Promise<User | null> {
    try {
      const name = additionalData?.name || 
                  supabaseUser.user_metadata?.full_name || 
                  supabaseUser.email?.split('@')[0] || 
                  'Anonymous User';

      const initials = name
        .split(' ')
        .map(word => word.charAt(0).toUpperCase())
        .slice(0, 2)
        .join('');

      const profileData: Partial<User> = {
        email: supabaseUser.email!,
        name,
        avatar: supabaseUser.user_metadata?.avatar_url || supabaseUser.user_metadata?.picture,
        role: 'User',
        plan: 'Free',
        initials,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      };

      await UserService.createUserProfile(supabaseUser.id, profileData);
      return await UserService.getUserProfile(supabaseUser.id);
    } catch (error) {
      console.error('❌ Error creating Firestore profile:', error);
      return null;
    }
  }

  // ================================
  // USER PROFILE MANAGEMENT
  // ================================

  static async updateUserProfile(updates: Partial<User>) {
    try {
      const user = await this.getCurrentUser();
      if (!user) throw new Error('No authenticated user');

      await UserService.updateUserProfile(user.id, updates);
      console.log('✅ User profile updated');
      return { error: null };
    } catch (error) {
      console.error('❌ Error updating user profile:', error);
      return { error };
    }
  }

  static async getUserProfile(): Promise<User | null> {
    try {
      const user = await this.getCurrentUser();
      if (!user) return null;

      return await UserService.getUserProfile(user.id);
    } catch (error) {
      console.error('❌ Error fetching user profile:', error);
      return null;
    }
  }

  // ================================
  // PASSWORD RESET
  // ================================

  static async resetPassword(email: string) {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`
      });

      if (error) throw error;
      return { error: null };
    } catch (error) {
      console.error('❌ Password reset error:', error);
      return { error };
    }
  }

  static async updatePassword(newPassword: string) {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;
      return { error: null };
    } catch (error) {
      console.error('❌ Password update error:', error);
      return { error };
    }
  }

  // ================================
  // AUTH LISTENERS
  // ================================

  static onAuthStateChange(callback: (event: string, session: Session | null) => void) {
    return supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔄 Auth state changed:', event, session?.user?.email);
      
      // Sync with Firestore on sign in
      if (event === 'SIGNED_IN' && session?.user) {
        this.syncUserWithFirestore(session.user);
      }
      
      callback(event, session);
    });
  }

  // ================================
  // UTILITY METHODS
  // ================================

  static async refreshSession() {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('❌ Session refresh error:', error);
      return { data: null, error };
    }
  }

  static getSupabaseClient(): SupabaseClient {
    return supabase;
  }
}

// Export convenience methods
export const auth = IntegratedAuthService;
export default IntegratedAuthService;