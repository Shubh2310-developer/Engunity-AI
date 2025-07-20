/**
 * Authentication Type Definitions for Engunity AI
 * Futuristic AI SaaS Platform Authentication System
 * 
 * Stack: Next.js 14 + Supabase Auth + MongoDB
 * File: frontend/src/types/auth.ts
 */

// ========================================
// CORE AUTHENTICATION TYPES
// ========================================

/** User role enumeration for Role-Based Access Control (RBAC) */
export type UserRole = 
  | 'user'        // Standard user with basic access
  | 'pro'         // Pro subscription user with advanced features
  | 'admin'       // Platform administrator
  | 'moderator'   // Content moderator
  | 'developer'   // Developer with API access
  | 'enterprise'  // Enterprise user with custom features
  | 'super_admin' // Super administrator with full platform access
  | 'beta_tester'; // Beta tester with early feature access

/** User account status for account lifecycle management */
export type UserStatus = 
  | 'active'              // Account is active and verified
  | 'inactive'            // Account is temporarily disabled
  | 'pending_verification' // Email verification pending
  | 'suspended'           // Account suspended due to policy violations
  | 'banned'              // Account permanently banned
  | 'deleted';            // Account marked for deletion

/** Supported OAuth providers for social authentication */
export type OAuthProvider = 
  | 'google'    // Google OAuth
  | 'github'    // GitHub OAuth
  | 'discord'   // Discord OAuth
  | 'microsoft' // Microsoft OAuth
  | 'apple'     // Apple Sign In
  | 'linkedin'  // LinkedIn OAuth
  | 'twitter';  // Twitter OAuth

/** Authentication method used for login tracking */
export type AuthMethod = 
  | 'email_password' // Traditional email/password
  | 'oauth'         // OAuth provider
  | 'magic_link'    // Passwordless magic link
  | 'phone'         // SMS verification
  | 'api_key';      // API key authentication

/** Session device type for security tracking */
export type DeviceType = 
  | 'desktop'  // Desktop browser
  | 'mobile'   // Mobile browser
  | 'tablet'   // Tablet browser
  | 'api';     // API client

// ========================================
// AUTHENTICATION PAYLOADS
// ========================================

/** Login request payload for email/password authentication */
export interface LoginPayload {
  /** User's email address */
  email: string;
  /** User's password */
  password: string;
  /** Remember login session for extended duration */
  rememberMe?: boolean;
  /** Device information for security tracking */
  deviceInfo?: {
    type: DeviceType;
    name?: string;
    userAgent?: string;
    ip?: string;
  };
}

/** Registration request payload for new user signup */
export interface SignupPayload {
  /** User's full name */
  name: string;
  /** User's email address */
  email: string;
  /** User's chosen password */
  password: string;
  /** Password confirmation for validation */
  confirmPassword?: string;
  /** Agreement to terms of service */
  agreeToTerms: boolean;
  /** Consent for marketing communications */
  marketingConsent?: boolean;
  /** Referral code if applicable */
  referralCode?: string;
  /** Initial subscription tier selection */
  subscriptionTier?: 'free' | 'pro' | 'enterprise';
  /** Device information */
  deviceInfo?: {
    type: DeviceType;
    name?: string;
    userAgent?: string;
    ip?: string;
  };
}

/** OAuth authentication request payload */
export interface OAuthPayload {
  /** OAuth provider identifier */
  provider: OAuthProvider;
  /** Redirect URL after OAuth completion */
  redirectTo?: string;
  /** Additional scopes to request */
  scopes?: string[];
  /** State parameter for security */
  state?: string;
}

/** Password reset request payload */
export interface PasswordResetPayload {
  /** User's email address */
  email: string;
  /** Redirect URL for reset completion */
  redirectTo?: string;
}

/** Password update payload for authenticated users */
export interface PasswordUpdatePayload {
  /** Current password for verification */
  currentPassword: string;
  /** New password */
  newPassword: string;
  /** New password confirmation */
  confirmNewPassword: string;
}

/** Email verification request payload */
export interface EmailVerificationPayload {
  /** User's email address */
  email: string;
  /** Redirect URL after verification */
  redirectTo?: string;
}

/** Magic link authentication payload */
export interface MagicLinkPayload {
  /** User's email address */
  email: string;
  /** Redirect URL after magic link click */
  redirectTo?: string;
  /** Create account if email doesn't exist */
  createUser?: boolean;
}

// ========================================
// USER PROFILE TYPES
// ========================================

/** Core user information from Supabase Auth */
export interface AuthUser {
  /** Unique user identifier (Supabase UUID) */
  id: string;
  /** User's email address */
  email: string;
  /** User's full name */
  fullName?: string;
  /** User's first name */
  firstName?: string;
  /** User's last name */
  lastName?: string;
  /** Profile avatar URL */
  avatarUrl?: string;
  /** User's role for RBAC */
  role: UserRole;
  /** Account status */
  status: UserStatus;
  /** Email verification status */
  emailVerified: boolean;
  /** Phone number */
  phone?: string;
  /** Phone verification status */
  phoneVerified?: boolean;
  /** User's timezone */
  timezone?: string;
  /** User's locale/language preference */
  locale?: string;
  /** Account creation timestamp */
  createdAt: string;
  /** Last profile update timestamp */
  updatedAt: string;
  /** Last login timestamp */
  lastLoginAt?: string;
  /** User metadata for additional information */
  metadata?: Record<string, any>;
}

/** Extended user profile with subscription and preferences */
export interface UserProfile extends AuthUser {
  /** Current subscription plan */
  subscriptionTier: 'free' | 'pro' | 'enterprise';
  /** Subscription status */
  subscriptionStatus: 'active' | 'inactive' | 'past_due' | 'canceled' | 'trialing';
  /** Subscription expiry date */
  subscriptionExpiresAt?: string;
  /** User preferences */
  preferences: {
    /** UI theme preference */
    theme: 'light' | 'dark' | 'system';
    /** Notification preferences */
    notifications: {
      email: boolean;
      push: boolean;
      sms: boolean;
      marketing: boolean;
    };
    /** Privacy settings */
    privacy: {
      profileVisibility: 'public' | 'private' | 'friends';
      showOnlineStatus: boolean;
      allowDirectMessages: boolean;
    };
    /** Feature preferences */
    features: {
      enabledModules: string[];
      defaultAIModel?: string;
      autoSave: boolean;
    };
  };
  /** Usage statistics */
  usage: {
    /** Total API calls made */
    totalApiCalls: number;
    /** Storage used in bytes */
    storageUsed: number;
    /** Credits remaining */
    creditsRemaining: number;
    /** Credits used this month */
    creditsUsedThisMonth: number;
  };
  /** OAuth provider connections */
  connectedProviders: Array<{
    provider: OAuthProvider;
    connectedAt: string;
    email?: string;
    isVerified: boolean;
  }>;
}

// ========================================
// SESSION & TOKEN TYPES
// ========================================

/** Supabase authentication session */
export interface AuthSession {
  /** JWT access token */
  access_token: string;
  /** Refresh token for obtaining new access tokens */
  refresh_token: string;
  /** Token expiration timestamp */
  expires_at: number;
  /** Token expiration duration in seconds */
  expires_in: number;
  /** Token type (usually 'bearer') */
  token_type: string;
  /** Authenticated user information */
  user: AuthUser;
  /** Provider token for OAuth sessions */
  provider_token?: string;
  /** Provider refresh token */
  provider_refresh_token?: string;
}

/** JWT access token payload structure */
export interface AccessTokenPayload {
  /** Token subject (user ID) */
  sub: string;
  /** User's email */
  email: string;
  /** User's role for RBAC */
  role: UserRole;
  /** Token issuer */
  iss: string;
  /** Token audience */
  aud: string;
  /** Token expiration time */
  exp: number;
  /** Token issued at time */
  iat: number;
  /** Session ID */
  session_id?: string;
  /** Additional claims */
  app_metadata?: Record<string, any>;
  user_metadata?: Record<string, any>;
}

/** Refresh token payload structure */
export interface RefreshTokenPayload {
  /** Token subject (user ID) */
  sub: string;
  /** Token issued at time */
  iat: number;
  /** Token expiration time */
  exp: number;
  /** Session ID */
  session_id: string;
  /** Token family ID for rotation */
  family_id?: string;
}

/** Session information for security tracking */
export interface SessionInfo {
  /** Session identifier */
  id: string;
  /** User ID */
  userId: string;
  /** Device information */
  device: {
    type: DeviceType;
    name: string;
    userAgent: string;
    ip: string;
    location?: {
      country: string;
      city: string;
      region: string;
    };
  };
  /** Session creation timestamp */
  createdAt: string;
  /** Last activity timestamp */
  lastActivityAt: string;
  /** Session expiration timestamp */
  expiresAt: string;
  /** Whether session is currently active */
  isActive: boolean;
  /** Authentication method used */
  authMethod: AuthMethod;
  /** OAuth provider if applicable */
  oauthProvider?: OAuthProvider;
}

// ========================================
// AUTHENTICATION CONTEXT
// ========================================

/** Authentication context type for React Context */
export interface AuthContextType {
  /** Current authenticated user */
  user: AuthUser | null;
  /** Current Supabase session */
  session: AuthSession | null;
  /** Loading state for auth operations */
  isLoading: boolean;
  /** Whether user is authenticated */
  isAuthenticated: boolean;
  /** Whether initial auth check is complete */
  isInitialized: boolean;
  
  // Authentication methods
  /** Sign in with email and password */
  signIn: (payload: LoginPayload) => Promise<AuthResponse>;
  /** Sign up new user */
  signUp: (payload: SignupPayload) => Promise<AuthResponse>;
  /** Sign in with OAuth provider */
  signInWithOAuth: (payload: OAuthPayload) => Promise<void>;
  /** Sign in with magic link */
  signInWithMagicLink: (payload: MagicLinkPayload) => Promise<AuthResponse>;
  /** Sign out current user */
  signOut: () => Promise<void>;
  
  // Password management
  /** Reset password */
  resetPassword: (payload: PasswordResetPayload) => Promise<AuthResponse>;
  /** Update password */
  updatePassword: (payload: PasswordUpdatePayload) => Promise<AuthResponse>;
  
  // Email verification
  /** Send verification email */
  sendVerificationEmail: (payload: EmailVerificationPayload) => Promise<AuthResponse>;
  /** Verify email with token */
  verifyEmail: (token: string) => Promise<AuthResponse>;
  
  // Profile management
  /** Update user profile */
  updateProfile: (updates: Partial<UserProfile>) => Promise<AuthResponse>;
  /** Refresh user data */
  refreshUser: () => Promise<void>;
  
  // Session management
  /** Refresh current session */
  refreshSession: () => Promise<void>;
  /** Get all user sessions */
  getSessions: () => Promise<SessionInfo[]>;
  /** Revoke specific session */
  revokeSession: (sessionId: string) => Promise<void>;
  /** Revoke all other sessions */
  revokeOtherSessions: () => Promise<void>;
}

// ========================================
// AUTHENTICATION RESPONSES
// ========================================

/** Standard authentication response format */
export interface AuthResponse {
  /** Whether the operation was successful */
  success: boolean;
  /** Authenticated user data (on success) */
  user?: AuthUser;
  /** Authentication session (on success) */
  session?: AuthSession;
  /** JWT access token (on success) */
  accessToken?: string;
  /** Error message (on failure) */
  error?: string;
  /** Detailed error code */
  errorCode?: string;
  /** Additional response message */
  message?: string;
  /** Whether email verification is required */
  emailVerificationRequired?: boolean;
  /** Whether phone verification is required */
  phoneVerificationRequired?: boolean;
  /** Redirect URL for OAuth flows */
  redirectUrl?: string;
}

/** Login response with session information */
export interface LoginResponse extends AuthResponse {
  /** Device registration status */
  newDeviceDetected?: boolean;
  /** Two-factor authentication required */
  twoFactorRequired?: boolean;
  /** Available 2FA methods */
  availableTwoFactorMethods?: Array<'sms' | 'email' | 'authenticator'>;
  /** Whether this is the user's first login */
  isFirstLogin?: boolean;
}

/** Signup response with onboarding information */
export interface SignupResponse extends AuthResponse {
  /** Whether user needs to complete onboarding */
  onboardingRequired?: boolean;
  /** Verification email sent status */
  verificationEmailSent?: boolean;
  /** Welcome bonus credits awarded */
  welcomeCredits?: number;
  /** Referral bonus applied */
  referralBonusApplied?: boolean;
}

/** OAuth response for redirect-based flows */
export interface OAuthResponse {
  /** OAuth authorization URL */
  authUrl: string;
  /** State parameter for security */
  state: string;
  /** Provider identifier */
  provider: OAuthProvider;
  /** Session ID for tracking */
  sessionId?: string;
}

/** Password reset response */
export interface PasswordResetResponse extends AuthResponse {
  /** Whether reset email was sent */
  emailSent?: boolean;
  /** Reset token expiration time */
  resetTokenExpiresAt?: string;
}

/** Email verification response */
export interface EmailVerificationResponse extends AuthResponse {
  /** Whether email is now verified */
  emailVerified?: boolean;
  /** Verification timestamp */
  verifiedAt?: string;
}

// ========================================
// ROLE-BASED ACCESS CONTROL
// ========================================

/** Permission definition for RBAC */
export interface Permission {
  /** Permission identifier */
  id: string;
  /** Human-readable name */
  name: string;
  /** Permission description */
  description: string;
  /** Resource this permission applies to */
  resource: string;
  /** Action this permission allows */
  action: 'create' | 'read' | 'update' | 'delete' | 'execute' | 'admin';
  /** Additional permission metadata */
  metadata?: Record<string, any>;
}

/** Role definition with permissions */
export interface RoleDefinition {
  /** Role identifier */
  role: UserRole;
  /** Human-readable role name */
  name: string;
  /** Role description */
  description: string;
  /** Permissions granted to this role */
  permissions: Permission[];
  /** Whether this is a system role */
  isSystemRole: boolean;
  /** Role hierarchy level */
  level: number;
  /** Features accessible to this role */
  features: string[];
  /** Rate limits for this role */
  rateLimits?: {
    apiCallsPerHour: number;
    storageQuota: number;
    creditsPerMonth: number;
  };
}

/** Permission check context */
export interface PermissionContext {
  /** User making the request */
  user: AuthUser;
  /** Resource being accessed */
  resource: string;
  /** Action being performed */
  action: string;
  /** Additional context data */
  context?: Record<string, any>;
}

// ========================================
// SECURITY & VALIDATION
// ========================================

/** Two-factor authentication setup */
export interface TwoFactorSetup {
  /** Whether 2FA is enabled */
  enabled: boolean;
  /** Available 2FA methods */
  methods: Array<{
    type: 'sms' | 'email' | 'authenticator' | 'backup_codes';
    enabled: boolean;
    verified: boolean;
    identifier?: string; // phone number, email, etc.
  }>;
  /** Backup codes */
  backupCodes?: string[];
  /** Recovery methods */
  recoveryMethods: string[];
}

/** Account security settings */
export interface SecuritySettings {
  /** Two-factor authentication configuration */
  twoFactor: TwoFactorSetup;
  /** Login notification preferences */
  loginNotifications: {
    newDevice: boolean;
    newLocation: boolean;
    failedAttempts: boolean;
  };
  /** Session security settings */
  sessionSecurity: {
    maxActiveSessions: number;
    sessionTimeout: number; // in seconds
    requireReauth: boolean;
    logoutOnInactivity: boolean;
  };
  /** API key management */
  apiKeys: Array<{
    id: string;
    name: string;
    keyPrefix: string;
    permissions: string[];
    createdAt: string;
    lastUsedAt?: string;
    expiresAt?: string;
    isActive: boolean;
  }>;
}

/** Password requirements configuration */
export interface PasswordRequirements {
  /** Minimum password length */
  minLength: number;
  /** Maximum password length */
  maxLength: number;
  /** Require uppercase letters */
  requireUppercase: boolean;
  /** Require lowercase letters */
  requireLowercase: boolean;
  /** Require numbers */
  requireNumbers: boolean;
  /** Require special characters */
  requireSpecialChars: boolean;
  /** Forbidden passwords */
  forbiddenPatterns: string[];
  /** Password history limit */
  historyLimit: number;
}

// ========================================
// UTILITY TYPES
// ========================================

/** Type guard for checking if user has specific role */
export type HasRole<T extends UserRole> = (user: AuthUser | null) => user is AuthUser & { role: T };

/** Type for authentication event listeners */
export type AuthEventType = 
  | 'SIGNED_IN' 
  | 'SIGNED_OUT' 
  | 'TOKEN_REFRESHED' 
  | 'USER_UPDATED' 
  | 'PASSWORD_RECOVERY'
  | 'EMAIL_VERIFIED'
  | 'MFA_CHALLENGE_STARTED'
  | 'MFA_CHALLENGE_COMPLETED';

/** Authentication event data */
export interface AuthEvent {
  /** Event type */
  type: AuthEventType;
  /** Event timestamp */
  timestamp: string;
  /** User associated with event */
  user?: AuthUser;
  /** Session associated with event */
  session?: AuthSession;
  /** Additional event data */
  data?: Record<string, any>;
}

/** Type for authentication event listeners */
export type AuthEventListener = (event: AuthEvent) => void;

/** Auth hook options */
export interface AuthHookOptions {
  /** Redirect to login if not authenticated */
  redirectToLogin?: boolean;
  /** Required role for access */
  requiredRole?: UserRole;
  /** Required permissions */
  requiredPermissions?: string[];
  /** Custom redirect path */
  redirectPath?: string;
}

// ========================================
// EXPORT UTILITY TYPES
// ========================================

/** Union type of all authentication payloads */
export type AuthPayload = 
  | LoginPayload 
  | SignupPayload 
  | OAuthPayload 
  | PasswordResetPayload 
  | PasswordUpdatePayload;

/** Union type of all authentication responses */
export type AuthResponseType = 
  | LoginResponse 
  | SignupResponse 
  | OAuthResponse 
  | PasswordResetResponse 
  | EmailVerificationResponse;

/** Type for role hierarchy checks */
export type RoleHierarchy = Record<UserRole, number>;

/** Type for feature access matrix */
export type FeatureAccess = Record<string, UserRole[]>;