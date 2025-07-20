/**
 * Supabase Client Configuration for Engunity AI
 * Authentication, Database, and Storage Client Setup
 * 
 * Stack: Next.js 14 + Supabase + TypeScript
 * File: frontend/src/lib/auth/supabase.ts
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createBrowserClient, createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/types/database';

// ========================================
// ENVIRONMENT VARIABLE VALIDATION
// ========================================

/** Supabase project URL */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

/** Supabase anonymous key (safe for client-side use) */
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/** Service role key (server-side only - DO NOT expose to client) */
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Validate required environment variables
if (!supabaseUrl) {
  throw new Error(
    'Missing NEXT_PUBLIC_SUPABASE_URL environment variable. ' +
    'Please add your Supabase project URL to your .env.local file.'
  );
}

if (!supabaseAnonKey) {
  throw new Error(
    'Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable. ' +
    'Please add your Supabase anonymous key to your .env.local file.'
  );
}

// Validate URL format
try {
  new URL(supabaseUrl);
} catch {
  throw new Error(
    'Invalid NEXT_PUBLIC_SUPABASE_URL format. ' +
    'Please ensure it follows the pattern: https://your-project.supabase.co'
  );
}

// ========================================
// TYPE DEFINITIONS
// ========================================

/** Enhanced Supabase client with typed database schema */
export type TypedSupabaseClient = SupabaseClient<Database>;

/** Client configuration options */
export interface SupabaseClientOptions {
  /** Custom auth configuration */
  auth?: {
    /** Auto refresh tokens */
    autoRefreshToken?: boolean;
    /** Persist session in localStorage */
    persistSession?: boolean;
    /** Detect session in URL hash */
    detectSessionInUrl?: boolean;
    /** Storage key for session */
    storageKey?: string;
  };
  /** Database configuration */
  db?: {
    /** Database schema */
    schema?: string;
  };
  /** Global request options */
  global?: {
    /** Default headers */
    headers?: Record<string, string>;
    /** Request timeout */
    timeout?: number;
  };
}

// ========================================
// CLIENT INSTANCES
// ========================================

/**
 * Standard Supabase client for general use
 * 
 * ⚠️ SECURITY NOTE: This uses the anonymous key which is safe for client-side use.
 * The anonymous key has limited permissions defined by your RLS policies.
 * Never expose the service role key to the client-side.
 */
export const supabase: TypedSupabaseClient = createClient<Database>(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      storageKey: 'engunity-auth-token',
      storage: {
        getItem: (key: string) => {
          if (typeof window === 'undefined') return null;
          const item = localStorage.getItem(key);
          if (!item) return null;
          
          try {
            const parsed = JSON.parse(item);
            // Check if session is still valid (1 day = 86400 seconds)
            if (parsed.expires_at && Date.now() / 1000 > parsed.expires_at) {
              localStorage.removeItem(key);
              return null;
            }
            return item;
          } catch {
            return item;
          }
        },
        setItem: (key: string, value: string) => {
          if (typeof window === 'undefined') return;
          localStorage.setItem(key, value);
        },
        removeItem: (key: string) => {
          if (typeof window === 'undefined') return;
          localStorage.removeItem(key);
        },
      },
    },
    db: {
      schema: 'public'
    },
    global: {
      headers: {
        'X-Client-Info': 'engunity-ai-web'
      }
    }
  }
);

/**
 * Server-side Supabase client with enhanced permissions
 * 
 * ⚠️ SERVER-SIDE ONLY: This client uses the service role key and should
 * NEVER be used on the client-side or exposed to the browser.
 */
export const supabaseAdmin: TypedSupabaseClient | null = supabaseServiceKey
  ? createClient<Database>(
      supabaseUrl,
      supabaseServiceKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false,
        },
        db: {
          schema: 'public'
        },
        global: {
          headers: {
            'X-Client-Info': 'engunity-ai-server-admin'
          }
        }
      }
    )
  : null;

// ========================================
// CLIENT FACTORY FUNCTIONS
// ========================================

/**
 * Get a Supabase client for client-side components
 * 
 * This function returns a client that automatically handles authentication
 * state and session management in client components.
 * 
 * @param options - Optional client configuration
 * @returns Typed Supabase client
 * 
 * @example
 * // In a client component
 * 'use client';
 * const supabase = getSupabaseClient();
 * const { data: user } = await supabase.auth.getUser();
 */
export function getSupabaseClient(options?: SupabaseClientOptions): TypedSupabaseClient {
  return createBrowserClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        storageKey: 'engunity-auth-token',
        ...options?.auth
      },
      db: {
        schema: 'public',
        ...options?.db
      },
      global: {
        headers: {
          'X-Client-Info': 'engunity-ai-client',
          ...options?.global?.headers
        },
        ...options?.global
      }
    }
  );
}

/**
 * Get a Supabase client for server-side components
 * 
 * This function returns a client that can access the user's session
 * on the server-side using cookies.
 * 
 * @param cookieStore - Next.js cookies() function result
 * @param options - Optional client configuration
 * @returns Typed Supabase client
 * 
 * @example
 * // In a server component or API route
 * import { cookies } from 'next/headers';
 * const supabase = getSupabaseServerClient(cookies());
 * const { data: { user } } = await supabase.auth.getUser();
 */
export function getSupabaseServerClient(
  cookieStore: ReturnType<typeof cookies>,
  options?: SupabaseClientOptions
): TypedSupabaseClient {
  return createServerClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: any) {
          cookieStore.set({ name, value: '', ...options });
        },
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
        ...options?.auth
      },
      db: {
        schema: 'public',
        ...options?.db
      },
      global: {
        headers: {
          'X-Client-Info': 'engunity-ai-server',
          ...options?.global?.headers
        },
        ...options?.global
      }
    }
  );
}

/**
 * Get admin Supabase client with elevated permissions
 * 
 * ⚠️ SERVER-SIDE ONLY: This should only be used in API routes or server actions
 * where you need to bypass RLS policies.
 * 
 * @param options - Optional client configuration
 * @returns Admin Supabase client or null if service key not available
 * 
 * @example
 * // In an API route
 * const adminClient = getSupabaseAdminClient();
 * if (adminClient) {
 *   // Perform admin operations
 *   await adminClient.from('users').update({ role: 'admin' }).eq('id', userId);
 * }
 */
export function getSupabaseAdminClient(options?: SupabaseClientOptions): TypedSupabaseClient | null {
  if (!supabaseServiceKey) {
    console.warn(
      'Supabase service role key not found. Admin operations will not be available. ' +
      'Add SUPABASE_SERVICE_ROLE_KEY to your environment variables for admin functionality.'
    );
    return null;
  }

  return createClient<Database>(
    supabaseUrl,
    supabaseServiceKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
        ...options?.auth
      },
      db: {
        schema: 'public',
        ...options?.db
      },
      global: {
        headers: {
          'X-Client-Info': 'engunity-ai-admin',
          ...options?.global?.headers
        },
        ...options?.global
      }
    }
  );
}

// ========================================
// UTILITY FUNCTIONS
// ========================================

/**
 * Check if Supabase is properly configured
 * 
 * @returns Configuration status
 * 
 * @example
 * const status = checkSupabaseConfig();
 * if (!status.isConfigured) {
 *   console.error('Supabase configuration issues:', status.issues);
 * }
 */
export function checkSupabaseConfig(): {
  isConfigured: boolean;
  issues: string[];
  hasAdminAccess: boolean;
} {
  const issues: string[] = [];

  if (!supabaseUrl) {
    issues.push('Missing NEXT_PUBLIC_SUPABASE_URL');
  }

  if (!supabaseAnonKey) {
    issues.push('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }

  // Check URL format
  if (supabaseUrl) {
    try {
      const url = new URL(supabaseUrl);
      if (!url.hostname.includes('supabase')) {
        issues.push('Supabase URL does not appear to be a valid Supabase endpoint');
      }
    } catch {
      issues.push('Invalid Supabase URL format');
    }
  }

  return {
    isConfigured: issues.length === 0,
    issues,
    hasAdminAccess: !!supabaseServiceKey
  };
}

/**
 * Test Supabase connection
 * 
 * @returns Promise resolving to connection status
 * 
 * @example
 * const isConnected = await testSupabaseConnection();
 * if (isConnected) {
 *   console.log('Supabase connection successful');
 * }
 */
export async function testSupabaseConnection(): Promise<boolean> {
  try {
    // Try to make a simple request to test connectivity
    const { error } = await supabase.from('users').select('count').limit(1);
    return !error || error.code === 'PGRST116'; // PGRST116 = no rows returned, which is fine
  } catch (error) {
    console.error('Supabase connection test failed:', error);
    return false;
  }
}

/**
 * Get current authentication status
 * 
 * @returns Promise resolving to auth status
 * 
 * @example
 * const authStatus = await getAuthStatus();
 * console.log('User authenticated:', authStatus.isAuthenticated);
 */
export async function getAuthStatus(): Promise<{
  isAuthenticated: boolean;
  user: any | null;
  session: any | null;
  error?: string;
}> {
  try {
    const { data: { user, session }, error } = await supabase.auth.getUser();
    
    return {
      isAuthenticated: !!user && !!session,
      user,
      session,
      error: error?.message
    };
  } catch (error) {
    return {
      isAuthenticated: false,
      user: null,
      session: null,
      error: error instanceof Error ? error.message : 'Unknown auth error'
    };
  }
}

/**
 * Sign out user and clear session
 * 
 * @returns Promise resolving to sign out result
 * 
 * @example
 * const result = await signOut();
 * if (result.success) {
 *   // Redirect to login page
 * }
 */
export async function signOut(): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      return { success: false, error: error.message };
    }
    
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown sign out error'
    };
  }
}

// ========================================
// STORAGE HELPERS
// ========================================

/**
 * Get configured storage client
 * 
 * @returns Supabase storage client
 * 
 * @example
 * const storage = getStorageClient();
 * const { data, error } = await storage.from('documents').list();
 */
export function getStorageClient() {
  return supabase.storage;
}

/**
 * Get storage client with admin permissions
 * 
 * @returns Admin storage client or null
 */
export function getAdminStorageClient() {
  return supabaseAdmin?.storage || null;
}

// ========================================
// EXPORTED CONSTANTS
// ========================================

/** Supabase project configuration */
export const SUPABASE_CONFIG = {
  url: supabaseUrl,
  anonKey: supabaseAnonKey,
  hasServiceKey: !!supabaseServiceKey,
  storageKey: 'engunity-auth-token'
} as const;

/** Common Supabase error codes */
export const SUPABASE_ERROR_CODES = {
  INVALID_CREDENTIALS: 'invalid_credentials',
  USER_NOT_FOUND: 'user_not_found',
  EMAIL_NOT_CONFIRMED: 'email_not_confirmed',
  SIGNUP_DISABLED: 'signup_disabled',
  WEAK_PASSWORD: 'weak_password',
  TOO_MANY_REQUESTS: 'too_many_requests',
  CAPTCHA_FAILED: 'captcha_failed'
} as const;

/** Default bucket names for file storage */
export const STORAGE_BUCKETS = {
  AVATARS: 'avatars',
  DOCUMENTS: 'documents',
  DATASETS: 'datasets',
  EXPORTS: 'exports',
  TEMP: 'temp'
} as const;

// ========================================
// DEFAULT EXPORT
// ========================================

/**
 * Default Supabase client export
 * 
 * This is the main client instance that should be used for most operations.
 * It's configured with appropriate defaults for the Engunity AI platform.
 */
export default supabase;

// ========================================
// DEVELOPMENT HELPERS
// ========================================

// Log configuration status in development
if (process.env.NODE_ENV === 'development') {
  const config = checkSupabaseConfig();
  
  if (config.isConfigured) {
    console.log('✅ Supabase client configured successfully');
    if (config.hasAdminAccess) {
      console.log('🔑 Admin access available');
    }
  } else {
    console.error('❌ Supabase configuration issues:', config.issues);
  }
}

// Test connection in development (non-blocking)
if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
  testSupabaseConnection().then(isConnected => {
    if (isConnected) {
      console.log('🌐 Supabase connection test successful');
    } else {
      console.warn('⚠️ Supabase connection test failed');
    }
  }).catch(() => {
    // Silently fail in case of network issues during development
  });
}