/**
 * Local Development Supabase Client
 * ==================================
 * 
 * This provides a local development implementation that doesn't require
 * actual Supabase services or network connectivity.
 */

import { mockSupabase } from './supabase-mock';

// Check if we're in local development mode
const isLocalDevelopment = 
  process.env.NODE_ENV === 'development' && 
  (process.env.NEXT_PUBLIC_SUPABASE_URL === 'http://localhost:3000' ||
   process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('localhost'));

// Export mock client for local development
export const supabase = isLocalDevelopment ? mockSupabase : null;
export const supabaseAdmin = isLocalDevelopment ? mockSupabase : null;

// Export functions that return mock client in local development
export function getSupabaseClient() {
  return mockSupabase;
}

export function getSupabaseServerClient() {
  return mockSupabase;
}

export function getSupabaseAdminClient() {
  return mockSupabase;
}

// Mock utility functions for local development
export function checkSupabaseConfig() {
  return {
    isConfigured: true,
    issues: [],
    hasAdminAccess: true
  };
}

export async function testSupabaseConnection() {
  return true;
}

export async function getAuthStatus() {
  return {
    isAuthenticated: true,
    user: {
      id: 'local-dev-user-123',
      email: 'dev@localhost.local'
    },
    session: {
      access_token: 'local-dev-token'
    }
  };
}

export async function signOut() {
  return { success: true };
}

export function getStorageClient() {
  return mockSupabase.storage;
}

export function getAdminStorageClient() {
  return mockSupabase.storage;
}

export const SUPABASE_CONFIG = {
  url: 'http://localhost:3000',
  anonKey: 'local-dev-token',
  hasServiceKey: true,
  storageKey: 'engunity-auth-token'
} as const;

export const SUPABASE_ERROR_CODES = {
  INVALID_CREDENTIALS: 'invalid_credentials',
  USER_NOT_FOUND: 'user_not_found',
  EMAIL_NOT_CONFIRMED: 'email_not_confirmed',
  SIGNUP_DISABLED: 'signup_disabled',
  WEAK_PASSWORD: 'weak_password',
  TOO_MANY_REQUESTS: 'too_many_requests',
  CAPTCHA_FAILED: 'captcha_failed'
} as const;

export const STORAGE_BUCKETS = {
  AVATARS: 'avatars',
  DOCUMENTS: 'documents',
  DATASETS: 'datasets',
  EXPORTS: 'exports',
  TEMP: 'temp'
} as const;

export default mockSupabase;