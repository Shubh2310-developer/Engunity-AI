/**
 * API Response Type Definitions for Engunity AI
 * Professional SaaS Platform API Layer
 * 
 * Stack: Next.js 14 + Supabase + MongoDB Atlas + Supabase Storage
 * File: frontend/src/types/api.ts
 */

import type { 
  UserProfile, 
  ChatMessage, 
  ChatSession, 
  DocumentMeta, 
  QAResult,
  UserMetric,
  Transaction
} from './global';

// ========================================
// CORE API UTILITY TYPES
// ========================================

/** Makes any type nullable for optional API responses */
export type Nullable<T> = T | null;

/** Makes any type undefined for optional API responses */
export type Optional<T> = T | undefined;

/** HTTP status codes commonly used in API responses */
export type HttpStatusCode = 200 | 201 | 400 | 401 | 403 | 404 | 409 | 422 | 429 | 500 | 502 | 503;

/** Request methods for API endpoints */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/** Generic successful API response wrapper */
export interface ApiResponse<T = any> {
  /** Indicates if the request was successful */
  success: true;
  /** The response payload data */
  data: T;
  /** Optional success message */
  message?: string;
  /** HTTP status code */
  statusCode?: HttpStatusCode;
  /** Server timestamp */
  timestamp?: string;
  /** Request correlation ID for debugging */
  requestId?: string;
}

/** Standardized API error response */
export interface ApiError {
  /** Always false for error responses */
  success: false;
  /** Human-readable error message */
  error: string;
  /** Machine-readable error code */
  errorCode?: string;
  /** HTTP status code */
  statusCode?: HttpStatusCode;
  /** Additional error details */
  details?: string;
  /** Server timestamp */
  timestamp?: string;
  /** Request correlation ID for debugging */
  requestId?: string;
  /** Validation errors for form submissions */
  validationErrors?: Record<string, string[]>;
  /** Suggested retry strategy */
  retryAfter?: number;
}

/** Union type for all API responses */
export type ApiResult<T> = ApiResponse<T> | ApiError;

/** Pagination metadata for list responses */
export interface PaginationMeta {
  /** Current page number (1-based) */
  page: number;
  /** Number of items per page */
  pageSize: number;
  /** Total number of items across all pages */
  total: number;
  /** Total number of pages */
  totalPages: number;
  /** Whether there's a next page */
  hasNext: boolean;
  /** Whether there's a previous page */
  hasPrevious: boolean;
  /** Number of items in current page */
  count: number;
}

/** Paginated list response with metadata */
export interface PaginatedResponse<T> {
  /** Indicates successful response */
  success: true;
  /** Array of items for current page */
  data: T[];
  /** Pagination metadata */
  pagination: PaginationMeta;
  /** Optional success message */
  message?: string;
  /** HTTP status code */
  statusCode?: HttpStatusCode;
  /** Server timestamp */
  timestamp?: string;
  /** Request correlation ID */
  requestId?: string;
}

/** Search/filter parameters for paginated endpoints */
export interface PaginationParams {
  /** Page number (1-based, default: 1) */
  page?: number;
  /** Items per page (default: 20, max: 100) */
  pageSize?: number;
  /** Search query string */
  search?: string;
  /** Sort field */
  sortBy?: string;
  /** Sort direction */
  sortOrder?: 'asc' | 'desc';
  /** Additional filters */
  filters?: Record<string, any>;
}

// ========================================
// AUTHENTICATION & USER MANAGEMENT
// ========================================

/** Successful login response with tokens and user data */
export interface LoginResponse {
  /** User profile information */
  user: UserProfile;
  /** JWT access token for API requests */
  accessToken: string;
  /** Refresh token for obtaining new access tokens */
  refreshToken: string;
  /** Access token expiration time (Unix timestamp) */
  expiresAt: number;
  /** Token expiration duration in seconds */
  expiresIn: number;
  /** Session metadata */
  sessionId?: string;
}

/** Successful signup response with user data and tokens */
export interface SignupResponse {
  /** Newly created user profile */
  user: UserProfile;
  /** JWT access token */
  accessToken: string;
  /** Refresh token */
  refreshToken: string;
  /** Token expiration time */
  expiresAt: number;
  /** Token expiration duration */
  expiresIn: number;
  /** Whether email verification is required */
  emailVerificationRequired: boolean;
  /** Verification email sent status */
  verificationEmailSent?: boolean;
}

/** Response from token refresh endpoint */
export interface TokenRefreshResponse {
  /** New access token */
  accessToken: string;
  /** New refresh token */
  refreshToken: string;
  /** Token expiration time */
  expiresAt: number;
  /** Token expiration duration */
  expiresIn: number;
}

/** Response from password reset request */
export interface PasswordResetResponse {
  /** Confirmation message */
  message: string;
  /** Whether reset email was sent */
  emailSent: boolean;
  /** Reset token expiration (for testing/dev) */
  expiresAt?: number;
}

/** Response from email verification */
export interface EmailVerificationResponse {
  /** Verification status */
  verified: boolean;
  /** Success message */
  message: string;
  /** Updated user profile */
  user?: UserProfile;
}

/** OAuth provider login response */
export interface OAuthResponse {
  /** OAuth provider redirect URL */
  authUrl: string;
  /** State parameter for security */
  state: string;
  /** OAuth provider name */
  provider: 'google' | 'github' | 'microsoft';
  /** Session ID for tracking */
  sessionId?: string;
}

/** User profile update response */
export interface UserUpdateResponse {
  /** Updated user profile */
  user: UserProfile;
  /** Success message */
  message: string;
  /** Fields that were updated */
  updatedFields: string[];
}

// ========================================
// DOCUMENT MANAGEMENT & STORAGE
// ========================================

/** Response from document upload endpoint */
export interface DocumentUploadResponse {
  /** Document metadata */
  document: DocumentMeta;
  /** Signed upload URL for client-side upload */
  uploadUrl?: string;
  /** Public access URL after upload */
  accessUrl: string;
  /** Upload session ID */
  uploadId: string;
  /** Maximum file size allowed */
  maxFileSize: number;
  /** Allowed MIME types */
  allowedTypes: string[];
}

/** Response from document processing status check */
export interface DocumentProcessingResponse {
  /** Document ID */
  documentId: string;
  /** Processing status */
  status: 'pending' | 'processing' | 'completed' | 'failed';
  /** Processing progress (0-100) */
  progress: number;
  /** Processing error message if failed */
  error?: string;
  /** Extracted text (when completed) */
  extractedText?: string;
  /** Number of pages processed */
  pagesProcessed?: number;
  /** Processing duration in milliseconds */
  processingTime?: number;
}

/** Response from document list endpoint */
export interface DocumentListResponse {
  /** List of documents */
  documents: DocumentMeta[];
  /** Pagination metadata */
  pagination: PaginationMeta;
  /** Total storage used in bytes */
  totalStorageUsed: number;
  /** Storage quota in bytes */
  storageQuota: number;
  /** Number of documents by type */
  documentCounts: Record<string, number>;
}

/** Response from document deletion */
export interface DocumentDeleteResponse {
  /** Deleted document ID */
  documentId: string;
  /** Success message */
  message: string;
  /** Whether file was permanently deleted */
  permanentlyDeleted: boolean;
  /** Storage space freed in bytes */
  spaceFreed: number;
}

/** Document sharing response */
export interface DocumentShareResponse {
  /** Share link URL */
  shareUrl: string;
  /** Share token */
  shareToken: string;
  /** Expiration date */
  expiresAt?: string;
  /** Permission level */
  permission: 'read' | 'comment' | 'edit';
  /** Success message */
  message: string;
}

// ========================================
// DOCUMENT Q&A & AI PROCESSING
// ========================================

/** Response from Q&A generation endpoint */
export interface QAGenerationResponse {
  /** Generated Q&A result */
  result: QAResult;
  /** Processing time in milliseconds */
  processingTime: number;
  /** Tokens consumed */
  tokensUsed: number;
  /** AI model used */
  modelUsed: string;
  /** Source document information */
  sourceDocument: {
    id: string;
    name: string;
    pageCount?: number;
  };
}

/** Response from bulk Q&A generation */
export interface BulkQAResponse {
  /** Array of Q&A results */
  results: QAResult[];
  /** Total questions processed */
  totalQuestions: number;
  /** Successful generations */
  successCount: number;
  /** Failed generations */
  failureCount: number;
  /** Total processing time */
  totalProcessingTime: number;
  /** Total tokens consumed */
  totalTokensUsed: number;
  /** Failed questions with errors */
  failures?: Array<{
    question: string;
    error: string;
  }>;
}

/** Document search response */
export interface DocumentSearchResponse {
  /** Search results */
  results: Array<{
    document: DocumentMeta;
    relevanceScore: number;
    matchedSnippets: string[];
    highlightedText?: string;
  }>;
  /** Total results found */
  totalResults: number;
  /** Search query */
  query: string;
  /** Search execution time */
  executionTime: number;
  /** Suggested corrections */
  suggestions?: string[];
}

// ========================================
// CHAT & AI CONVERSATION
// ========================================

/** Response from chat message endpoint */
export interface ChatResponse {
  /** AI assistant's response message */
  message: ChatMessage;
  /** Conversation session ID */
  sessionId: string;
  /** Tokens used in this response */
  tokensUsed: number;
  /** Response generation time */
  responseTime: number;
  /** AI model used */
  modelUsed: string;
  /** Whether this was a streaming response */
  isStreaming?: boolean;
  /** Cost in credits */
  creditsUsed: number;
}

/** Response from streaming chat endpoint */
export interface ChatStreamResponse {
  /** Partial message content */
  content: string;
  /** Whether this is the final chunk */
  done: boolean;
  /** Current session ID */
  sessionId: string;
  /** Message ID */
  messageId?: string;
  /** Tokens used so far */
  tokensUsed?: number;
  /** Error if streaming failed */
  error?: string;
}

/** Response from chat session list endpoint */
export interface SessionListResponse {
  /** List of chat sessions */
  sessions: ChatSession[];
  /** Pagination metadata */
  pagination: PaginationMeta;
  /** Total sessions count */
  totalSessions: number;
  /** Active sessions count */
  activeSessions: number;
  /** Total messages across all sessions */
  totalMessages: number;
}

/** Response from chat session creation */
export interface SessionCreateResponse {
  /** Newly created session */
  session: ChatSession;
  /** Success message */
  message: string;
  /** Initial system message ID */
  systemMessageId?: string;
}

/** Response from chat session update */
export interface SessionUpdateResponse {
  /** Updated session */
  session: ChatSession;
  /** Success message */
  message: string;
  /** Updated fields */
  updatedFields: string[];
}

/** Response from message history endpoint */
export interface MessageHistoryResponse {
  /** List of messages */
  messages: ChatMessage[];
  /** Session information */
  session: ChatSession;
  /** Pagination metadata */
  pagination: PaginationMeta;
  /** Total tokens used in session */
  totalTokensUsed: number;
  /** Session statistics */
  statistics: {
    messageCount: number;
    averageResponseTime: number;
    totalCreditsUsed: number;
  };
}

// ========================================
// AI MODELS & CAPABILITIES
// ========================================

/** Available AI models response */
export interface AIModelsResponse {
  /** List of available models */
  models: Array<{
    id: string;
    name: string;
    provider: string;
    description: string;
    maxTokens: number;
    costPerToken: number;
    capabilities: string[];
    isAvailable: boolean;
    isRecommended?: boolean;
  }>;
  /** Default model ID */
  defaultModel: string;
  /** User's preferred model */
  userPreferredModel?: string;
}

/** AI model usage statistics */
export interface ModelUsageResponse {
  /** Usage by model */
  modelUsage: Record<string, {
    requests: number;
    tokensUsed: number;
    creditsSpent: number;
    averageResponseTime: number;
  }>;
  /** Total statistics */
  totals: {
    totalRequests: number;
    totalTokens: number;
    totalCredits: number;
    averageResponseTime: number;
  };
  /** Time period for statistics */
  period: {
    start: string;
    end: string;
  };
}

// ========================================
// CREDITS & BILLING
// ========================================

/** User credits and usage response */
export interface CreditsResponse {
  /** Current credit balance */
  balance: number;
  /** Credits used this billing period */
  usedThisPeriod: number;
  /** Credit allowance per billing period */
  allowancePerPeriod: number;
  /** Percentage of allowance used */
  usagePercentage: number;
  /** Next billing date */
  nextBillingDate: string;
  /** Usage breakdown by feature */
  usageBreakdown: {
    chat: number;
    documentQA: number;
    codeGeneration: number;
    dataAnalysis: number;
    other: number;
  };
  /** Credit purchase options */
  purchaseOptions?: Array<{
    credits: number;
    price: number;
    currency: string;
    description: string;
  }>;
}

/** Credit transaction history */
export interface CreditTransactionResponse {
  /** List of transactions */
  transactions: Transaction[];
  /** Pagination metadata */
  pagination: PaginationMeta;
  /** Current balance */
  currentBalance: number;
  /** Total earned credits */
  totalEarned: number;
  /** Total spent credits */
  totalSpent: number;
}

/** Billing information response */
export interface BillingInfoResponse {
  /** Current subscription details */
  subscription: {
    plan: string;
    status: string;
    currentPeriodStart: string;
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
    price: number;
    currency: string;
  };
  /** Payment method */
  paymentMethod?: {
    type: 'card' | 'paypal';
    last4?: string;
    brand?: string;
    expiryMonth?: number;
    expiryYear?: number;
  };
  /** Billing address */
  billingAddress?: {
    country: string;
    city?: string;
    postalCode?: string;
    line1?: string;
    line2?: string;
  };
  /** Invoice history */
  recentInvoices: Array<{
    id: string;
    date: string;
    amount: number;
    status: string;
    downloadUrl: string;
  }>;
}

// ========================================
// ANALYTICS & METRICS
// ========================================

/** User analytics dashboard response */
export interface AnalyticsResponse {
  /** Usage metrics */
  metrics: UserMetric[];
  /** Summary statistics */
  summary: {
    totalApiCalls: number;
    totalStorageUsed: number;
    totalCreditsUsed: number;
    averageResponseTime: number;
    mostUsedFeature: string;
  };
  /** Usage trends over time */
  trends: Array<{
    date: string;
    apiCalls: number;
    storageUsed: number;
    creditsUsed: number;
  }>;
  /** Feature adoption rates */
  featureUsage: Record<string, {
    usage: number;
    percentage: number;
    trend: 'up' | 'down' | 'stable';
  }>;
  /** Time period for analytics */
  period: {
    start: string;
    end: string;
    granularity: 'day' | 'week' | 'month';
  };
}

/** Performance metrics response */
export interface PerformanceMetricsResponse {
  /** API response times */
  responseTimes: {
    average: number;
    p50: number;
    p95: number;
    p99: number;
  };
  /** Feature-specific performance */
  featurePerformance: Record<string, {
    averageResponseTime: number;
    successRate: number;
    errorRate: number;
  }>;
  /** System performance indicators */
  systemHealth: {
    uptime: number;
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
  };
}

// ========================================
// SYSTEM STATUS & HEALTH
// ========================================

/** Health check response */
export interface HealthCheckResponse {
  /** Overall system status */
  status: 'healthy' | 'degraded' | 'unhealthy';
  /** System uptime in seconds */
  uptime: number;
  /** Current server timestamp */
  timestamp: string;
  /** Service-specific health checks */
  services: {
    database: 'up' | 'down' | 'degraded';
    storage: 'up' | 'down' | 'degraded';
    ai: 'up' | 'down' | 'degraded';
    auth: 'up' | 'down' | 'degraded';
  };
  /** System information */
  system: {
    version: string;
    environment: 'development' | 'staging' | 'production';
    region: string;
    nodeId: string;
  };
  /** Performance metrics */
  metrics: {
    responseTime: number;
    memoryUsage: number;
    cpuUsage: number;
  };
}

/** Feature availability response */
export interface FeatureStatusResponse {
  /** Feature availability by name */
  features: Record<string, {
    available: boolean;
    maintenanceMode: boolean;
    maintenanceMessage?: string;
    estimatedRestoreTime?: string;
  }>;
  /** Global maintenance status */
  globalMaintenance: boolean;
  /** System announcements */
  announcements: Array<{
    id: string;
    type: 'info' | 'warning' | 'maintenance';
    title: string;
    message: string;
    startTime: string;
    endTime?: string;
  }>;
}

// ========================================
// FILE UPLOADS & PROCESSING
// ========================================

/** Generic file upload response */
export interface FileUploadResponse {
  /** Uploaded file metadata */
  file: {
    id: string;
    name: string;
    originalName: string;
    size: number;
    mimeType: string;
    url: string;
    thumbnailUrl?: string;
  };
  /** Upload success message */
  message: string;
  /** Upload processing status */
  processingStatus: 'pending' | 'completed' | 'failed';
  /** Processing job ID */
  jobId?: string;
}

/** Batch file upload response */
export interface BatchUploadResponse {
  /** Successfully uploaded files */
  successful: FileUploadResponse[];
  /** Failed uploads with errors */
  failed: Array<{
    filename: string;
    error: string;
    errorCode: string;
  }>;
  /** Upload summary */
  summary: {
    totalFiles: number;
    successCount: number;
    failureCount: number;
    totalSize: number;
  };
}

// ========================================
// SEARCH & DISCOVERY
// ========================================

/** Global search response across all content types */
export interface GlobalSearchResponse {
  /** Search results grouped by type */
  results: {
    documents: Array<{
      item: DocumentMeta;
      score: number;
      highlights: string[];
    }>;
    chatSessions: Array<{
      item: ChatSession;
      score: number;
      highlights: string[];
    }>;
    projects: Array<{
      item: any; // Project type from global.ts
      score: number;
      highlights: string[];
    }>;
  };
  /** Total results across all types */
  totalResults: number;
  /** Search execution time */
  executionTime: number;
  /** Search suggestions */
  suggestions: string[];
  /** Applied filters */
  filters: Record<string, any>;
}

// ========================================
// EXPORT UTILITY TYPES
// ========================================

/** Union type of all successful API responses */
export type SuccessResponse = 
  | LoginResponse 
  | SignupResponse 
  | DocumentUploadResponse 
  | QAGenerationResponse 
  | ChatResponse 
  | SessionListResponse 
  | CreditsResponse 
  | HealthCheckResponse;

/** Union type of all paginated responses */
export type PaginatedApiResponse = 
  | DocumentListResponse 
  | SessionListResponse 
  | MessageHistoryResponse 
  | CreditTransactionResponse;

/** Generic type helper for API endpoint definitions */
export interface ApiEndpoint<TRequest = any, TResponse = any> {
  method: HttpMethod;
  path: string;
  requestType?: TRequest;
  responseType: TResponse;
  requiresAuth: boolean;
  rateLimit?: {
    requests: number;
    window: number; // in seconds
  };
}

/** Type helper for form validation errors */
export type ValidationErrors<T> = Partial<Record<keyof T, string[]>>;

/** Type helper for API request options */
export interface RequestOptions {
  timeout?: number;
  retries?: number;
  signal?: AbortSignal;
  headers?: Record<string, string>;
}