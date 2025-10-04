/**
 * Mock Supabase Client for Local Development
 * ==========================================
 * 
 * This provides a mock implementation of Supabase for local development
 * when you don't have access to actual Supabase credentials.
 */

// Mock user object
const mockUser = {
  id: 'local-dev-user-123',
  email: 'dev@localhost.local',
  user_metadata: {
    name: 'Development User',
    avatar_url: null
  },
  app_metadata: {},
  aud: 'authenticated',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

// Mock session object
const mockSession = {
  access_token: 'local-dev-access-token',
  refresh_token: 'local-dev-refresh-token',
  expires_in: 3600,
  token_type: 'bearer',
  user: mockUser
};

// Mock Supabase client
export const createMockSupabaseClient = () => ({
  auth: {
    getSession: async () => ({ 
      data: { session: mockSession }, 
      error: null 
    }),
    getUser: async () => ({ 
      data: { user: mockUser }, 
      error: null 
    }),
    signInWithPassword: async (credentials: any) => ({
      data: { user: mockUser, session: mockSession },
      error: null
    }),
    signUp: async (credentials: any) => ({
      data: { user: mockUser, session: mockSession },
      error: null
    }),
    signOut: async () => ({
      error: null
    }),
    signInWithOAuth: async (options: any) => ({
      data: { 
        url: `http://localhost:3000/auth/callback?code=mock-oauth-code&provider=${options.provider}`,
        provider: options.provider
      },
      error: null
    }),
    onAuthStateChange: (callback: any) => {
      // Simulate logged in state
      setTimeout(() => callback('SIGNED_IN', mockSession), 100);
      return { data: { subscription: { unsubscribe: () => {} } } };
    }
  },
  
  from: (table: string) => ({
    select: (columns?: string) => ({
      eq: (column: string, value: any) => ({
        single: async () => ({ data: null, error: null }),
        then: async (resolve: any) => resolve({ data: [], error: null })
      }),
      order: (column: string, options?: any) => ({
        limit: (count: number) => ({
          then: async (resolve: any) => resolve({ data: [], error: null })
        }),
        then: async (resolve: any) => resolve({ data: [], error: null })
      }),
      then: async (resolve: any) => resolve({ data: [], error: null })
    }),
    insert: (values: any) => ({
      select: () => ({
        single: async () => ({ data: values, error: null }),
        then: async (resolve: any) => resolve({ data: [values], error: null })
      }),
      then: async (resolve: any) => resolve({ data: [values], error: null })
    }),
    update: (values: any) => ({
      eq: (column: string, value: any) => ({
        select: () => ({
          single: async () => ({ data: { ...values, id: value }, error: null }),
          then: async (resolve: any) => resolve({ data: [{ ...values, id: value }], error: null })
        }),
        then: async (resolve: any) => resolve({ data: [{ ...values }], error: null })
      })
    }),
    delete: () => ({
      eq: (column: string, value: any) => ({
        then: async (resolve: any) => resolve({ data: null, error: null })
      })
    })
  }),
  
  storage: {
    from: (bucket: string) => ({
      upload: async (path: string, file: any) => ({
        data: { path, id: 'mock-file-id', fullPath: `${bucket}/${path}` },
        error: null
      }),
      download: async (path: string) => ({
        data: new Blob(['mock file content']),
        error: null
      }),
      remove: async (paths: string[]) => ({
        data: paths.map(path => ({ name: path })),
        error: null
      }),
      getPublicUrl: (path: string) => ({
        data: { publicUrl: `http://localhost:3000/storage/${bucket}/${path}` }
      })
    })
  }
});

// Export the mock client as default for easy replacement
export const mockSupabase = createMockSupabaseClient();