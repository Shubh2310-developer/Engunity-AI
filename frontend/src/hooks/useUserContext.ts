/**
 * User Context Hook for Engunity AI
 * ==================================
 * 
 * Extracts user data from Supabase session and provides
 * role-based context for personalized dashboards.
 * 
 * @returns UserContext with role, permissions, organization
 */

'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/auth/supabase';
import { User } from '@supabase/supabase-js';

export type UserRole = 'Owner' | 'Admin' | 'Contributor' | 'Viewer';

export interface UserContext {
  user_id: string;
  email: string;
  name: string;
  role: UserRole;
  organization_id: string;
  token: string;
  avatar?: string;
  initials: string;
  isLoading: boolean;
  isAuthenticated: boolean;
  supabaseUser: User | null;
}

interface UserContextState {
  user: UserContext | null;
  loading: boolean;
  error: string | null;
}

export function useUserContext() {
  const [state, setState] = useState<UserContextState>({
    user: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let mounted = true;

    const loadUserContext = async () => {
      try {
        // Get current session
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('Session error:', error);
          if (mounted) {
            setState({
              user: null,
              loading: false,
              error: error.message,
            });
          }
          return;
        }

        if (!session?.user) {
          if (mounted) {
            setState({
              user: null,
              loading: false,
              error: null,
            });
          }
          return;
        }

        // Extract user metadata
        const supabaseUser = session.user;
        const metadata = supabaseUser.user_metadata || {};

        // Get role from metadata (default to Contributor)
        const role: UserRole = metadata.role || 'Contributor';

        // Get organization_id (default to a demo org)
        const organization_id = metadata.organization_id || 'org_demo';

        // Get name
        const full_name = metadata.full_name || metadata.name || supabaseUser.email?.split('@')[0] || 'User';

        // Get avatar
        const avatar = metadata.avatar_url || metadata.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${supabaseUser.email}`;

        // Generate initials
        const initials = full_name.split(' ')
          .map((n: string) => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2);

        // Get access token for API calls
        const token = session.access_token;

        // Construct user context
        const userContext: UserContext = {
          user_id: supabaseUser.id,
          email: supabaseUser.email!,
          name: full_name,
          role,
          organization_id,
          token,
          avatar,
          initials,
          isLoading: false,
          isAuthenticated: true,
          supabaseUser,
        };

        if (mounted) {
          setState({
            user: userContext,
            loading: false,
            error: null,
          });
        }

        console.log('✅ User context loaded:', {
          name: userContext.name,
          role: userContext.role,
          organization: userContext.organization_id,
        });

      } catch (error) {
        console.error('User context error:', error);
        if (mounted) {
          setState({
            user: null,
            loading: false,
            error: error instanceof Error ? error.message : 'Failed to load user context',
          });
        }
      }
    };

    loadUserContext();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        console.log('🔄 Auth state changed:', event);

        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          // Reload user context
          loadUserContext();
        } else if (event === 'SIGNED_OUT') {
          setState({
            user: null,
            loading: false,
            error: null,
          });
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return state.user;
}

/**
 * Hook to check if user has specific permission
 */
export function usePermission(resource: string, action: 'read' | 'write' | 'delete' | 'admin') {
  const user = useUserContext();

  if (!user) return false;

  // Owner has all permissions
  if (user.role === 'Owner') return true;

  // Admin permissions
  if (user.role === 'Admin') {
    if (action === 'admin' && resource === 'organization') return false;
    if (action === 'delete' && resource === 'organization') return false;
    return true;
  }

  // Contributor permissions
  if (user.role === 'Contributor') {
    if (resource === 'tasks' && (action === 'read' || action === 'write')) return true;
    if (resource === 'projects' && action === 'read') return true;
    if (resource === 'files' && (action === 'read' || action === 'write')) return true;
    return false;
  }

  // Viewer permissions (read-only)
  if (user.role === 'Viewer') {
    return action === 'read';
  }

  return false;
}
