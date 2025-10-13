/**
 * Mock Supabase client that disables OAuth redirects
 * Use this when you want to bypass authentication
 */

// Create a mock auth object that doesn't trigger OAuth
const mockAuth = {
  getUser: async () => ({ data: { user: null, session: null }, error: null }),
  getSession: async () => ({ data: { session: null }, error: null }),
  onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
  signInWithOAuth: async () => ({ data: null, error: new Error('OAuth disabled in development') }),
  signInWithPassword: async () => ({ data: null, error: new Error('Auth disabled in development') }),
  signOut: async () => ({ error: null }),
  signUp: async () => ({ data: null, error: new Error('Auth disabled in development') }),
};

// Create a mock Supabase client
export const supabase = {
  auth: mockAuth,
  from: () => ({
    select: () => ({ data: [], error: null }),
    insert: () => ({ data: null, error: null }),
    update: () => ({ data: null, error: null }),
    delete: () => ({ data: null, error: null }),
  }),
  storage: {
    from: () => ({
      list: async () => ({ data: [], error: null }),
      upload: async () => ({ data: null, error: null }),
      download: async () => ({ data: null, error: null }),
    }),
  },
};

export default supabase;
