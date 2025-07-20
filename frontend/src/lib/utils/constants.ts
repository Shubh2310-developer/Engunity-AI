/**
 * Application Constants for Engunity AI
 * SaaS Platform Static Values and Configuration
 * 
 * Stack: Next.js 14 + Tailwind + ShadCN + Supabase + MongoDB
 * File: frontend/src/lib/utils/constants.ts
 */

// ========================================
// APPLICATION METADATA
// ========================================

/** Primary application name */
export const APP_NAME = 'Engunity AI' as const;

/** Application tagline/description */
export const APP_DESCRIPTION = 'Engineering Intelligence. Reimagined.' as const;

/** Application version */
export const APP_VERSION = '1.0.0' as const;

/** Application domain */
export const APP_DOMAIN = 'engunity.ai' as const;

/** Application URL */
export const APP_URL = 'https://engunity.ai' as const;

/** Company name */
export const COMPANY_NAME = 'Engunity Technologies' as const;

/** Copyright year */
export const COPYRIGHT_YEAR = '2024' as const;

/** Support email */
export const SUPPORT_EMAIL = 'support@engunity.ai' as const;

// ========================================
// USER ROLES & PERMISSIONS
// ========================================

/** Available user roles in the system */
export const USER_ROLES = [
  'user',        // Standard user with basic access
  'pro',         // Pro subscription user
  'admin',       // Platform administrator
  'moderator',   // Content moderator
  'developer',   // Developer with API access
  'enterprise',  // Enterprise user
  'super_admin', // Super administrator
  'beta_tester'  // Beta feature access
] as const;

/** Type definition for user roles */
export type UserRole = (typeof USER_ROLES)[number];

/** User account status options */
export const USER_STATUS = [
  'active',
  'inactive', 
  'pending_verification',
  'suspended',
  'deleted'
] as const;

/** Type definition for user status */
export type UserStatus = (typeof USER_STATUS)[number];

/** Subscription tiers */
export const SUBSCRIPTION_TIERS = [
  'free',
  'starter', 
  'pro',
  'enterprise',
  'custom'
] as const;

/** Type definition for subscription tiers */
export type SubscriptionTier = (typeof SUBSCRIPTION_TIERS)[number];

// ========================================
// APPLICATION ROUTES
// ========================================

/** Application route constants */
export const ROUTES = {
  // Public routes
  HOME: '/',
  ABOUT: '/about',
  PRICING: '/pricing',
  CONTACT: '/contact',
  BLOG: '/blog',
  
  // Authentication routes
  LOGIN: '/login',
  SIGNUP: '/signup',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  VERIFY_EMAIL: '/verify-email',
  
  // Dashboard routes
  DASHBOARD: '/dashboard',
  PROFILE: '/dashboard/profile',
  SETTINGS: '/dashboard/settings',
  BILLING: '/dashboard/billing',
  API_KEYS: '/dashboard/api-keys',
  
  // Feature routes
  CHAT: '/dashboard/chat',
  DOCUMENTS: '/dashboard/documents',
  CODE: '/dashboard/code',
  RESEARCH: '/dashboard/research',
  ANALYSIS: '/dashboard/analysis',
  NOTEBOOK: '/dashboard/notebook',
  PROJECTS: '/dashboard/projects',
  
  // Web3 routes
  MARKETPLACE: '/dashboard/marketplace',
  CONTRACTS: '/dashboard/contracts',
  AUDIT: '/dashboard/audit',
  
  // Admin routes
  ADMIN: '/admin',
  ADMIN_USERS: '/admin/users',
  ADMIN_ANALYTICS: '/admin/analytics',
  ADMIN_SETTINGS: '/admin/settings',
  
  // API routes
  API_AUTH: '/api/auth',
  API_CHAT: '/api/chat',
  API_DOCUMENTS: '/api/documents',
  API_UPLOAD: '/api/upload',
} as const;

/** Public routes that don't require authentication */
export const PUBLIC_ROUTES = [
  ROUTES.HOME,
  ROUTES.ABOUT,
  ROUTES.PRICING,
  ROUTES.CONTACT,
  ROUTES.BLOG,
  ROUTES.LOGIN,
  ROUTES.SIGNUP,
  ROUTES.FORGOT_PASSWORD,
  ROUTES.RESET_PASSWORD,
  ROUTES.VERIFY_EMAIL,
] as const;

/** Protected routes that require authentication */
export const PROTECTED_ROUTES = [
  ROUTES.DASHBOARD,
  ROUTES.PROFILE,
  ROUTES.SETTINGS,
  ROUTES.BILLING,
  ROUTES.CHAT,
  ROUTES.DOCUMENTS,
  ROUTES.CODE,
  ROUTES.RESEARCH,
  ROUTES.ANALYSIS,
  ROUTES.NOTEBOOK,
  ROUTES.PROJECTS,
  ROUTES.MARKETPLACE,
  ROUTES.CONTRACTS,
  ROUTES.AUDIT,
] as const;

/** Admin routes that require admin privileges */
export const ADMIN_ROUTES = [
  ROUTES.ADMIN,
  ROUTES.ADMIN_USERS,
  ROUTES.ADMIN_ANALYTICS,
  ROUTES.ADMIN_SETTINGS,
] as const;

// ========================================
// FEATURE MODULES
// ========================================

/** Available AI-powered modules */
export const MODULES = [
  'AI Chat Assistant',
  'Document Q&A',
  'Code Generation & Review',
  'Data Analysis & Visualization',
  'Research & Citation Tools',
  'Code Notebook Environment',
  'Project Management',
  'Web3 Contract Scanner',
  'Smart Contract Auditor',
  'Literature Review Assistant',
  'Text Summarization',
  'Language Translation'
] as const;

/** Type definition for modules */
export type ModuleName = (typeof MODULES)[number];

/** Module categories for organization */
export const MODULE_CATEGORIES = {
  AI_TOOLS: 'AI Tools',
  DEVELOPMENT: 'Development',
  RESEARCH: 'Research',
  DATA: 'Data & Analytics',
  WEB3: 'Web3 & Blockchain',
  PRODUCTIVITY: 'Productivity'
} as const;

/** Module to category mapping */
export const MODULE_CATEGORY_MAP = {
  'AI Chat Assistant': MODULE_CATEGORIES.AI_TOOLS,
  'Document Q&A': MODULE_CATEGORIES.AI_TOOLS,
  'Code Generation & Review': MODULE_CATEGORIES.DEVELOPMENT,
  'Data Analysis & Visualization': MODULE_CATEGORIES.DATA,
  'Research & Citation Tools': MODULE_CATEGORIES.RESEARCH,
  'Code Notebook Environment': MODULE_CATEGORIES.DEVELOPMENT,
  'Project Management': MODULE_CATEGORIES.PRODUCTIVITY,
  'Web3 Contract Scanner': MODULE_CATEGORIES.WEB3,
  'Smart Contract Auditor': MODULE_CATEGORIES.WEB3,
  'Literature Review Assistant': MODULE_CATEGORIES.RESEARCH,
  'Text Summarization': MODULE_CATEGORIES.AI_TOOLS,
  'Language Translation': MODULE_CATEGORIES.AI_TOOLS,
} as const;

// ========================================
// AI MODELS & PROVIDERS
// ========================================

/** Supported AI models */
export const SUPPORTED_MODELS = [
  'groq-llama3-70b',
  'groq-llama3-8b',
  'groq-mixtral-8x7b',
  'phi-2-local',
  'phi-3-mini',
  'openai-gpt-4',
  'openai-gpt-3.5-turbo',
  'anthropic-claude-3',
  'anthropic-claude-2'
] as const;

/** Type definition for AI models */
export type AIModel = (typeof SUPPORTED_MODELS)[number];

/** AI providers */
export const AI_PROVIDERS = [
  'groq',
  'openai', 
  'anthropic',
  'local',
  'huggingface'
] as const;

/** Type definition for AI providers */
export type AIProvider = (typeof AI_PROVIDERS)[number];

/** Model to provider mapping */
export const MODEL_PROVIDER_MAP = {
  'groq-llama3-70b': 'groq',
  'groq-llama3-8b': 'groq',
  'groq-mixtral-8x7b': 'groq',
  'phi-2-local': 'local',
  'phi-3-mini': 'local',
  'openai-gpt-4': 'openai',
  'openai-gpt-3.5-turbo': 'openai',
  'anthropic-claude-3': 'anthropic',
  'anthropic-claude-2': 'anthropic',
} as const;

/** Default AI model */
export const DEFAULT_AI_MODEL: AIModel = 'groq-llama3-8b';

// ========================================
// FILE TYPES & STORAGE
// ========================================

/** Supported document file types */
export const SUPPORTED_FILE_TYPES = [
  'pdf',
  'docx',
  'txt',
  'md',
  'csv',
  'xlsx',
  'json',
  'xml',
  'html'
] as const;

/** Type definition for file types */
export type FileType = (typeof SUPPORTED_FILE_TYPES)[number];

/** Supported image file types */
export const SUPPORTED_IMAGE_TYPES = [
  'jpg',
  'jpeg',
  'png',
  'gif',
  'webp',
  'svg'
] as const;

/** Type definition for image types */
export type ImageType = (typeof SUPPORTED_IMAGE_TYPES)[number];

/** Supported code file types */
export const SUPPORTED_CODE_TYPES = [
  'js',
  'ts',
  'py',
  'java',
  'cpp',
  'c',
  'rust',
  'go',
  'php',
  'ruby',
  'swift',
  'kotlin',
  'scala',
  'sql'
] as const;

/** Type definition for code types */
export type CodeType = (typeof SUPPORTED_CODE_TYPES)[number];

/** Maximum file sizes (in bytes) */
export const MAX_FILE_SIZES = {
  DOCUMENT: 50 * 1024 * 1024,    // 50MB
  IMAGE: 10 * 1024 * 1024,       // 10MB
  CODE: 5 * 1024 * 1024,         // 5MB
  AVATAR: 2 * 1024 * 1024,       // 2MB
  DATASET: 100 * 1024 * 1024,    // 100MB
} as const;

// ========================================
// EXTERNAL LINKS & INTEGRATIONS
// ========================================

/** External platform links */
export const EXTERNAL_LINKS = {
  GITHUB: 'https://github.com/engunity-ai/platform',
  DISCORD: 'https://discord.gg/engunity-ai',
  TWITTER: 'https://twitter.com/engunityai',
  LINKEDIN: 'https://linkedin.com/company/engunity-ai',
  YOUTUBE: 'https://youtube.com/@engunityai',
  DOCS: 'https://docs.engunity.ai',
  STATUS: 'https://status.engunity.ai',
  BLOG: 'https://blog.engunity.ai',
  COMMUNITY: 'https://community.engunity.ai',
  CHANGELOG: 'https://changelog.engunity.ai',
} as const;

/** Documentation links */
export const DOCS_LINKS = {
  GETTING_STARTED: 'https://docs.engunity.ai/getting-started',
  API_REFERENCE: 'https://docs.engunity.ai/api',
  INTEGRATIONS: 'https://docs.engunity.ai/integrations',
  TUTORIALS: 'https://docs.engunity.ai/tutorials',
  FAQ: 'https://docs.engunity.ai/faq',
  TROUBLESHOOTING: 'https://docs.engunity.ai/troubleshooting',
} as const;

/** Legal page links */
export const LEGAL_LINKS = {
  TERMS: '/legal/terms',
  PRIVACY: '/legal/privacy',
  COOKIES: '/legal/cookies',
  GDPR: '/legal/gdpr',
  SECURITY: '/legal/security',
} as const;

// ========================================
// API CONFIGURATION
// ========================================

/** API endpoints */
export const API_ENDPOINTS = {
  // Authentication
  LOGIN: '/api/auth/login',
  LOGOUT: '/api/auth/logout',
  SIGNUP: '/api/auth/signup',
  REFRESH: '/api/auth/refresh',
  
  // Chat
  CHAT_SEND: '/api/chat/send',
  CHAT_STREAM: '/api/chat/stream',
  CHAT_SESSIONS: '/api/chat/sessions',
  CHAT_HISTORY: '/api/chat/history',
  
  // Documents
  DOC_UPLOAD: '/api/documents/upload',
  DOC_LIST: '/api/documents/list',
  DOC_DELETE: '/api/documents/delete',
  DOC_QA: '/api/documents/qa',
  
  // Analysis
  ANALYZE_DATA: '/api/analysis/data',
  ANALYZE_CODE: '/api/analysis/code',
  GENERATE_CHART: '/api/analysis/chart',
  
  // User
  USER_PROFILE: '/api/user/profile',
  USER_SETTINGS: '/api/user/settings',
  USER_USAGE: '/api/user/usage',
  
  // Admin
  ADMIN_USERS: '/api/admin/users',
  ADMIN_ANALYTICS: '/api/admin/analytics',
  ADMIN_SYSTEM: '/api/admin/system',
} as const;

/** HTTP status codes */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
} as const;

/** Request timeout durations (in milliseconds) */
export const TIMEOUTS = {
  API_REQUEST: 30000,        // 30 seconds
  FILE_UPLOAD: 300000,       // 5 minutes
  AI_GENERATION: 120000,     // 2 minutes
  STREAM_TIMEOUT: 60000,     // 1 minute
} as const;

// ========================================
// UI CONFIGURATION
// ========================================

/** Theme options */
export const THEMES = ['light', 'dark', 'system'] as const;

/** Type definition for themes */
export type Theme = (typeof THEMES)[number];

/** Default theme */
export const DEFAULT_THEME: Theme = 'system';

/** Color schemes for the application */
export const COLOR_SCHEMES = {
  PRIMARY: 'blue',
  SECONDARY: 'purple',
  ACCENT: 'indigo',
  SUCCESS: 'green',
  WARNING: 'yellow',
  ERROR: 'red',
  INFO: 'cyan',
} as const;

/** Animation durations (in milliseconds) */
export const ANIMATION_DURATION = {
  FAST: 150,
  NORMAL: 300,
  SLOW: 500,
  VERY_SLOW: 1000,
} as const;

/** Z-index layers */
export const Z_INDEX = {
  DROPDOWN: 1000,
  STICKY: 1020,
  FIXED: 1030,
  MODAL_BACKDROP: 1040,
  MODAL: 1050,
  POPOVER: 1060,
  TOOLTIP: 1070,
  TOAST: 1080,
} as const;

// ========================================
// BUSINESS LOGIC CONSTANTS
// ========================================

/** Credit costs for different operations */
export const CREDIT_COSTS = {
  CHAT_MESSAGE: 1,
  DOCUMENT_QA: 2,
  CODE_GENERATION: 3,
  DATA_ANALYSIS: 5,
  CONTRACT_AUDIT: 10,
  LARGE_DOCUMENT_PROCESSING: 15,
} as const;

/** Rate limits per user tier */
export const RATE_LIMITS = {
  FREE: {
    REQUESTS_PER_HOUR: 100,
    REQUESTS_PER_DAY: 1000,
    STORAGE_MB: 100,
    CREDITS_PER_MONTH: 1000,
  },
  PRO: {
    REQUESTS_PER_HOUR: 1000,
    REQUESTS_PER_DAY: 10000,
    STORAGE_MB: 10000,
    CREDITS_PER_MONTH: 50000,
  },
  ENTERPRISE: {
    REQUESTS_PER_HOUR: 10000,
    REQUESTS_PER_DAY: 100000,
    STORAGE_MB: 100000,
    CREDITS_PER_MONTH: 500000,
  },
} as const;

/** Pagination defaults */
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  DEFAULT_PAGE: 1,
} as const;

// ========================================
// REGEX PATTERNS
// ========================================

/** Common validation patterns */
export const REGEX_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  PHONE: /^\+?[\d\s-()]+$/,
  URL: /^https?:\/\/.+$/,
  SLUG: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
  USERNAME: /^[a-zA-Z0-9_-]{3,20}$/,
  API_KEY: /^[a-zA-Z0-9]{32,}$/,
} as const;

// ========================================
// ERROR MESSAGES
// ========================================

/** Standard error messages */
export const ERROR_MESSAGES = {
  GENERIC: 'An unexpected error occurred. Please try again.',
  NETWORK: 'Network error. Please check your connection.',
  UNAUTHORIZED: 'You are not authorized to perform this action.',
  FORBIDDEN: 'Access denied. Insufficient permissions.',
  NOT_FOUND: 'The requested resource was not found.',
  VALIDATION: 'Please check your input and try again.',
  RATE_LIMITED: 'Too many requests. Please wait before trying again.',
  FILE_TOO_LARGE: 'File size exceeds the maximum limit.',
  UNSUPPORTED_FILE: 'File type not supported.',
  CREDITS_INSUFFICIENT: 'Insufficient credits to complete this action.',
} as const;

// ========================================
// SUCCESS MESSAGES
// ========================================

/** Standard success messages */
export const SUCCESS_MESSAGES = {
  LOGIN: 'Successfully logged in!',
  LOGOUT: 'Successfully logged out!',
  SIGNUP: 'Account created successfully!',
  PROFILE_UPDATED: 'Profile updated successfully!',
  FILE_UPLOADED: 'File uploaded successfully!',
  MESSAGE_SENT: 'Message sent successfully!',
  SETTINGS_SAVED: 'Settings saved successfully!',
  PASSWORD_CHANGED: 'Password changed successfully!',
  EMAIL_VERIFIED: 'Email verified successfully!',
} as const;