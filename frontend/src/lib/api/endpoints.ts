/**
 * Centralized API endpoint definitions for Engunity AI
 * Location: frontend/src/lib/api/endpoints.ts
 * 
 * Purpose: Avoid hardcoding API routes throughout the application
 * Usage: Import specific endpoint groups as needed
 */

// ================================
// 🔐 Authentication & User Management
// ================================
export const AUTH_ENDPOINTS = {
  // Basic auth operations
  LOGIN: '/api/auth/login',
  REGISTER: '/api/auth/register',
  LOGOUT: '/api/auth/logout',
  SESSION: '/api/auth/session',
  
  // Password management
  FORGOT_PASSWORD: '/api/auth/forgot-password',
  RESET_PASSWORD: '/api/auth/reset-password',
  VERIFY_EMAIL: '/api/auth/verify-email',
  
  // OAuth providers
  GOOGLE_OAUTH: '/api/auth/oauth/google',
  GITHUB_OAUTH: '/api/auth/oauth/github',
  
  // Profile & settings
  PROFILE: '/api/auth/profile',
  UPDATE_PROFILE: '/api/auth/profile/update',
  DELETE_ACCOUNT: '/api/auth/profile/delete',
} as const;

// ================================
// 💬 Chat & AI Conversation
// ================================
export const CHAT_ENDPOINTS = {
  // Chat session management
  START_SESSION: '/api/chat/start',
  END_SESSION: (sessionId: string) => `/api/chat/${sessionId}/end`,
  
  // Message operations
  SEND_MESSAGE: '/api/chat/message',
  STREAM_MESSAGE: '/api/chat/stream',
  GET_HISTORY: '/api/chat/history',
  GET_THREAD: (threadId: string) => `/api/chat/thread/${threadId}`,
  DELETE_THREAD: (threadId: string) => `/api/chat/thread/${threadId}`,
  
  // AI model routing
  AI_ROUTER: '/api/chat/ai-router',
  MODEL_STATUS: '/api/chat/models/status',
} as const;

// ================================
// 📄 Document Processing & Q&A
// ================================
export const DOCUMENT_ENDPOINTS = {
  // Document management
  UPLOAD: '/api/documents/upload',
  GET_ALL: '/api/documents',
  GET_DOCUMENT: (docId: string) => `/api/documents/${docId}`,
  DELETE_DOCUMENT: (docId: string) => `/api/documents/${docId}`,
  UPDATE_DOCUMENT: (docId: string) => `/api/documents/${docId}`,
  
  // Document processing
  EXTRACT_TEXT: '/api/documents/extract',
  GENERATE_EMBEDDINGS: '/api/documents/embeddings',
  CHUNK_DOCUMENT: '/api/documents/chunk',
  
  // Q&A functionality
  ASK_QUESTION: '/api/documents/qa',
  SEARCH_DOCUMENTS: '/api/documents/search',
  GET_CITATIONS: '/api/documents/citations',
  
  // Document viewer
  VIEWER: (docId: string) => `/api/documents/${docId}/viewer`,
  DOWNLOAD: (docId: string) => `/api/documents/${docId}/download`,
} as const;

// ================================
// 💻 Code Assistant & Execution
// ================================
export const CODE_ENDPOINTS = {
  // Code generation
  GENERATE: '/api/code/generate',
  EXPLAIN: '/api/code/explain',
  DEBUG: '/api/code/debug',
  OPTIMIZE: '/api/code/optimize',
  
  // Code execution
  EXECUTE: '/api/code/execute',
  SANDBOX_STATUS: '/api/code/sandbox/status',
  CANCEL_EXECUTION: (executionId: string) => `/api/code/execute/${executionId}/cancel`,
  
  // Code templates
  TEMPLATES: '/api/code/templates',
  GET_TEMPLATE: (templateId: string) => `/api/code/templates/${templateId}`,
  
  // Security scanning
  SECURITY_SCAN: '/api/code/security/scan',
  VULNERABILITY_CHECK: '/api/code/security/vulnerabilities',
} as const;

// ================================
// 🔬 Research & Analysis Tools
// ================================
export const RESEARCH_ENDPOINTS = {
  // Text analysis
  SUMMARIZE: '/api/research/summarize',
  PARAPHRASE: '/api/research/paraphrase',
  ANALYZE_SENTIMENT: '/api/research/sentiment',
  
  // Citation management
  CITATIONS: '/api/research/citations',
  FORMAT_CITATION: '/api/research/citations/format',
  EXTRACT_REFERENCES: '/api/research/citations/extract',
  
  // Literature review
  LITERATURE_REVIEW: '/api/research/literature',
  FIND_GAPS: '/api/research/literature/gaps',
  TREND_ANALYSIS: '/api/research/trends',
  
  // Paper analysis
  PAPER_ANALYZER: '/api/research/papers/analyze',
  MULTI_PAPER_COMPARE: '/api/research/papers/compare',
} as const;

// ================================
// 📊 Data Analysis & Visualization
// ================================
export const ANALYSIS_ENDPOINTS = {
  // Data upload & processing
  UPLOAD_DATASET: '/api/analysis/upload',
  PROCESS_DATA: '/api/analysis/process',
  GET_DATASETS: '/api/analysis/datasets',
  DELETE_DATASET: (datasetId: string) => `/api/analysis/datasets/${datasetId}`,
  
  // Statistical analysis
  DESCRIPTIVE_STATS: '/api/analysis/stats/descriptive',
  CORRELATION_ANALYSIS: '/api/analysis/stats/correlation',
  HYPOTHESIS_TEST: '/api/analysis/stats/hypothesis',
  
  // Visualization
  GENERATE_CHART: '/api/analysis/visualize',
  CHART_SUGGESTIONS: '/api/analysis/charts/suggestions',
  EXPORT_CHART: '/api/analysis/charts/export',
  
  // AI-powered insights
  GENERATE_INSIGHTS: '/api/analysis/insights',
  ANOMALY_DETECTION: '/api/analysis/anomalies',
} as const;

// ================================
// 📝 Notebook & Project Management
// ================================
export const NOTEBOOK_ENDPOINTS = {
  // Notebook CRUD
  CREATE: '/api/notebook/create',
  GET_ALL: '/api/notebook',
  GET_NOTEBOOK: (notebookId: string) => `/api/notebook/${notebookId}`,
  UPDATE: (notebookId: string) => `/api/notebook/${notebookId}`,
  DELETE: (notebookId: string) => `/api/notebook/${notebookId}`,
  
  // Version control
  SAVE_VERSION: (notebookId: string) => `/api/notebook/${notebookId}/versions`,
  GET_VERSIONS: (notebookId: string) => `/api/notebook/${notebookId}/versions`,
  RESTORE_VERSION: (notebookId: string, versionId: string) => 
    `/api/notebook/${notebookId}/versions/${versionId}/restore`,
  
  // Collaboration
  SHARE: (notebookId: string) => `/api/notebook/${notebookId}/share`,
  COLLABORATE: (notebookId: string) => `/api/notebook/${notebookId}/collaborate`,
  EXPORT: (notebookId: string) => `/api/notebook/${notebookId}/export`,
} as const;

// ================================
// 📋 Project Planning & Management
// ================================
export const PROJECT_ENDPOINTS = {
  // Project CRUD
  CREATE: '/api/projects/create',
  GET_ALL: '/api/projects',
  GET_PROJECT: (projectId: string) => `/api/projects/${projectId}`,
  UPDATE: (projectId: string) => `/api/projects/${projectId}`,
  DELETE: (projectId: string) => `/api/projects/${projectId}`,
  
  // Task management
  TASKS: (projectId: string) => `/api/projects/${projectId}/tasks`,
  CREATE_TASK: (projectId: string) => `/api/projects/${projectId}/tasks`,
  UPDATE_TASK: (projectId: string, taskId: string) => 
    `/api/projects/${projectId}/tasks/${taskId}`,
  
  // Kanban board
  KANBAN: (projectId: string) => `/api/projects/${projectId}/kanban`,
  MOVE_TASK: (projectId: string) => `/api/projects/${projectId}/kanban/move`,
  
  // AI planning
  GENERATE_MILESTONES: '/api/projects/ai/milestones',
  SUGGEST_TASKS: '/api/projects/ai/tasks',
} as const;

// ================================
// ⚙️ User Settings & Preferences
// ================================
export const SETTINGS_ENDPOINTS = {
  // User preferences
  PREFERENCES: '/api/settings/preferences',
  UPDATE_PREFERENCES: '/api/settings/preferences/update',
  
  // API key management
  API_KEYS: '/api/settings/api-keys',
  CREATE_API_KEY: '/api/settings/api-keys/create',
  DELETE_API_KEY: (keyId: string) => `/api/settings/api-keys/${keyId}`,
  
  // Billing & subscription
  BILLING: '/api/settings/billing',
  SUBSCRIPTION: '/api/settings/subscription',
  USAGE: '/api/settings/usage',
  
  // Security settings
  TWO_FACTOR: '/api/settings/2fa',
  SESSIONS: '/api/settings/sessions',
  AUDIT_LOG: '/api/settings/audit',
} as const;

// ================================
// 🔗 Web3 & Blockchain Features
// ================================
export const BLOCKCHAIN_ENDPOINTS = {
  // Wallet connection
  CONNECT_WALLET: '/api/web3/wallet/connect',
  DISCONNECT_WALLET: '/api/web3/wallet/disconnect',
  WALLET_STATUS: '/api/web3/wallet/status',
  
  // AI Marketplace
  MARKETPLACE: '/api/web3/marketplace',
  LIST_MODELS: '/api/web3/marketplace/models',
  GET_MODEL: (modelId: string) => `/api/web3/marketplace/models/${modelId}`,
  PURCHASE_MODEL: '/api/web3/marketplace/purchase',
  
  // Smart contract auditing
  AUDIT_CONTRACT: '/api/web3/audit',
  GET_AUDIT: (auditId: string) => `/api/web3/audit/${auditId}`,
  AUDIT_HISTORY: '/api/web3/audit/history',
  
  // Content provenance
  REGISTER_CONTENT: '/api/web3/provenance/register',
  VERIFY_CONTENT: '/api/web3/provenance/verify',
  
  // Credentials & certificates
  ISSUE_CREDENTIAL: '/api/web3/credentials/issue',
  VERIFY_CREDENTIAL: '/api/web3/credentials/verify',
  GET_CREDENTIALS: '/api/web3/credentials',
} as const;

// ================================
// 📁 File Storage & Management
// ================================
export const STORAGE_ENDPOINTS = {
  // File operations
  UPLOAD: '/api/storage/upload',
  DOWNLOAD: (fileId: string) => `/api/storage/download/${fileId}`,
  DELETE: (fileId: string) => `/api/storage/${fileId}`,
  
  // File metadata
  GET_FILE_INFO: (fileId: string) => `/api/storage/${fileId}/info`,
  UPDATE_METADATA: (fileId: string) => `/api/storage/${fileId}/metadata`,
  
  // Bulk operations
  BULK_UPLOAD: '/api/storage/bulk/upload',
  BULK_DELETE: '/api/storage/bulk/delete',
  
  // Storage analytics
  USAGE_STATS: '/api/storage/stats',
  CLEANUP: '/api/storage/cleanup',
} as const;

// ================================
// 🔔 Notifications & Webhooks
// ================================
export const NOTIFICATION_ENDPOINTS = {
  // User notifications
  GET_NOTIFICATIONS: '/api/notifications',
  MARK_READ: (notificationId: string) => `/api/notifications/${notificationId}/read`,
  MARK_ALL_READ: '/api/notifications/read-all',
  DELETE_NOTIFICATION: (notificationId: string) => `/api/notifications/${notificationId}`,
  
  // Webhook management
  WEBHOOKS: '/api/webhooks',
  CREATE_WEBHOOK: '/api/webhooks/create',
  DELETE_WEBHOOK: (webhookId: string) => `/api/webhooks/${webhookId}`,
  
  // External webhooks (receiving)
  STRIPE_WEBHOOK: '/api/webhooks/stripe',
  SUPABASE_WEBHOOK: '/api/webhooks/supabase',
} as const;

// ================================
// 🌐 External API Integration
// ================================
export const EXTERNAL_APIS = {
  // AI/ML Services
  GROQ: {
    BASE_URL: 'https://api.groq.com/openai/v1',
    CHAT: 'https://api.groq.com/openai/v1/chat/completions',
    MODELS: 'https://api.groq.com/openai/v1/models',
  },
  
  OPENAI: {
    BASE_URL: 'https://api.openai.com/v1',
    CHAT: 'https://api.openai.com/v1/chat/completions',
    EMBEDDINGS: 'https://api.openai.com/v1/embeddings',
    MODELS: 'https://api.openai.com/v1/models',
  },
  
  HUGGING_FACE: {
    BASE_URL: 'https://api-inference.huggingface.co',
    INFERENCE: (model: string) => `https://api-inference.huggingface.co/models/${model}`,
  },
  
  // Blockchain Services
  ALCHEMY: {
    ETHEREUM: 'https://eth-mainnet.g.alchemy.com/v2',
    POLYGON: 'https://polygon-mainnet.g.alchemy.com/v2',
  },
  
  INFURA: {
    ETHEREUM: 'https://mainnet.infura.io/v3',
    IPFS: 'https://ipfs.infura.io:5001',
  },
  
  // Development Tools
  GITHUB: {
    BASE_URL: 'https://api.github.com',
    REPOS: 'https://api.github.com/repos',
    USER: 'https://api.github.com/user',
  },
  
  // Payment & Analytics
  STRIPE: {
    BASE_URL: 'https://api.stripe.com/v1',
    CHECKOUT: 'https://checkout.stripe.com',
  },
} as const;

// ================================
// 📊 Analytics & Monitoring
// ================================
export const ANALYTICS_ENDPOINTS = {
  // Usage analytics
  TRACK_EVENT: '/api/analytics/track',
  USER_STATS: '/api/analytics/user',
  FEATURE_USAGE: '/api/analytics/features',
  
  // Performance monitoring
  HEALTH_CHECK: '/api/health',
  SYSTEM_STATUS: '/api/status',
  METRICS: '/api/metrics',
  
  // Error tracking
  REPORT_ERROR: '/api/errors/report',
  ERROR_LOGS: '/api/errors/logs',
} as const;

// ================================
// 🔧 Utility Functions
// ================================

/**
 * Helper function to build query parameters
 */
export const buildQueryParams = (params: Record<string, any>): string => {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.append(key, String(value));
    }
  });
  return searchParams.toString();
};

/**
 * Helper function to build paginated endpoints
 */
export const buildPaginatedUrl = (
  baseUrl: string, 
  page: number = 1, 
  limit: number = 10,
  additionalParams: Record<string, any> = {}
): string => {
  const params = { page, limit, ...additionalParams };
  const queryString = buildQueryParams(params);
  return queryString ? `${baseUrl}?${queryString}` : baseUrl;
};

/**
 * Helper function to validate endpoint existence
 */
export const isValidEndpoint = (endpoint: string): boolean => {
  return endpoint.startsWith('/api/') || endpoint.startsWith('http');
};

// ================================
// 📝 Type Definitions
// ================================

export type EndpointGroup = 
  | typeof AUTH_ENDPOINTS
  | typeof CHAT_ENDPOINTS
  | typeof DOCUMENT_ENDPOINTS
  | typeof CODE_ENDPOINTS
  | typeof RESEARCH_ENDPOINTS
  | typeof ANALYSIS_ENDPOINTS
  | typeof NOTEBOOK_ENDPOINTS
  | typeof PROJECT_ENDPOINTS
  | typeof SETTINGS_ENDPOINTS
  | typeof BLOCKCHAIN_ENDPOINTS
  | typeof STORAGE_ENDPOINTS
  | typeof NOTIFICATION_ENDPOINTS;

export type ApiEndpoint = string | ((param: string) => string);

// Export all endpoint groups for easy importing
export const API_ENDPOINTS = {
  AUTH: AUTH_ENDPOINTS,
  CHAT: CHAT_ENDPOINTS,
  DOCUMENTS: DOCUMENT_ENDPOINTS,
  CODE: CODE_ENDPOINTS,
  RESEARCH: RESEARCH_ENDPOINTS,
  ANALYSIS: ANALYSIS_ENDPOINTS,
  NOTEBOOK: NOTEBOOK_ENDPOINTS,
  PROJECTS: PROJECT_ENDPOINTS,
  SETTINGS: SETTINGS_ENDPOINTS,
  BLOCKCHAIN: BLOCKCHAIN_ENDPOINTS,
  STORAGE: STORAGE_ENDPOINTS,
  NOTIFICATIONS: NOTIFICATION_ENDPOINTS,
  EXTERNAL: EXTERNAL_APIS,
  ANALYTICS: ANALYTICS_ENDPOINTS,
} as const;