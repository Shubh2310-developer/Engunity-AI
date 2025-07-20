/**
 * Global TypeScript Definitions for Engunity AI
 * Professional SaaS Platform Type System
 * 
 * Stack: Next.js 14 + Tailwind + ShadCN UI + Supabase + MongoDB Atlas
 * File: frontend/src/types/global.ts
 */

// ========================================
// UTILITY TYPES
// ========================================

/** Makes any type nullable */
export type Nullable<T> = T | null;

/** Makes any type optional nullable */
export type Optional<T> = T | undefined;

/** Extends any type with common timestamp fields */
export type WithTimestamps<T = {}> = T & {
  createdAt: Date | string;
  updatedAt: Date | string;
};

/** Extends any type with MongoDB ObjectId */
export type WithMongoId<T = {}> = T & {
  _id: string;
};

/** Extends any type with Supabase UUID */
export type WithSupabaseId<T = {}> = T & {
  id: string;
};

/** Common API response wrapper */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  statusCode?: number;
}

/** Pagination metadata for API responses */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/** Paginated API response */
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: PaginationMeta;
}

// ========================================
// AUTHENTICATION & USER MANAGEMENT
// ========================================

/** User role enumeration for RBAC */
export type UserRole = 'free' | 'pro' | 'enterprise' | 'admin' | 'super_admin';

/** User account status */
export type UserStatus = 'active' | 'inactive' | 'suspended' | 'pending_verification';

/** User subscription tier */
export type SubscriptionTier = 'free' | 'starter' | 'professional' | 'enterprise';

/** User profile interface with complete user information */
export interface UserProfile extends WithTimestamps {
  id: string; // Supabase UUID
  email: string;
  name: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: Nullable<string>;
  role: UserRole;
  status: UserStatus;
  subscriptionTier: SubscriptionTier;
  timezone?: string;
  locale?: string;
  emailVerified: boolean;
  lastLoginAt?: Nullable<Date | string>;
  metadata?: Record<string, any>; // Flexible user metadata
}

/** Simplified user info for UI components */
export interface UserInfo {
  id: string;
  name: string;
  email: string;
  avatarUrl?: Nullable<string>;
  role: UserRole;
}

/** Supabase authentication session wrapper */
export interface AuthSession {
  user: UserProfile;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  expiresIn: number;
}

/** Authentication state for context/store */
export interface AuthState {
  user: Nullable<UserProfile>;
  session: Nullable<AuthSession>;
  isLoading: boolean;
  isAuthenticated: boolean;
}

/** Login credentials interface */
export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

/** Registration data interface */
export interface RegisterData {
  email: string;
  password: string;
  name: string;
  firstName?: string;
  lastName?: string;
  agreeToTerms: boolean;
  marketingConsent?: boolean;
}

/** Password reset request */
export interface PasswordResetRequest {
  email: string;
}

/** Password update data */
export interface PasswordUpdate {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

// ========================================
// ANALYTICS & METRICS
// ========================================

/** Types of user metrics tracked */
export type MetricType = 
  | 'api_calls' 
  | 'storage_used' 
  | 'credits_consumed' 
  | 'documents_processed' 
  | 'chat_messages' 
  | 'code_generations'
  | 'analysis_runs'
  | 'login_count'
  | 'feature_usage';

/** User usage metrics for analytics */
export interface UserMetric extends WithTimestamps {
  id: string;
  userId: string;
  type: MetricType;
  value: number;
  unit?: string; // e.g., 'bytes', 'count', 'minutes'
  metadata?: Record<string, any>; // Additional context data
  source?: string; // Which feature/module generated this metric
}

/** Aggregated usage statistics */
export interface UsageStats {
  userId: string;
  period: 'daily' | 'weekly' | 'monthly' | 'yearly';
  totalApiCalls: number;
  totalStorageUsed: number; // in bytes
  totalCreditsConsumed: number;
  totalDocumentsProcessed: number;
  totalChatMessages: number;
  lastUpdated: Date | string;
}

/** Transaction types for billing */
export type TransactionType = 'credit' | 'debit' | 'refund' | 'subscription' | 'one_time';

/** Transaction status */
export type TransactionStatus = 'pending' | 'completed' | 'failed' | 'cancelled' | 'refunded';

/** Financial transaction record */
export interface Transaction extends WithTimestamps {
  id: string;
  userId: string;
  amount: number; // in cents (USD)
  currency: string; // ISO currency code (USD, EUR, etc.)
  type: TransactionType;
  status: TransactionStatus;
  description: string;
  metadata?: Record<string, any>; // Stripe session info, etc.
  stripePaymentIntentId?: string;
  invoiceId?: string;
  subscriptionId?: string;
}

// ========================================
// CHAT & MESSAGING SYSTEM
// ========================================

/** Message role in conversation */
export type MessageRole = 'user' | 'assistant' | 'system' | 'function';

/** Message content type */
export type MessageContentType = 'text' | 'code' | 'image' | 'file' | 'function_call';

/** AI model provider */
export type AIProvider = 'groq' | 'openai' | 'anthropic' | 'local' | 'custom';

/** Individual chat message */
export interface ChatMessage extends WithTimestamps, WithMongoId {
  userId: string;
  sessionId: string;
  content: string;
  role: MessageRole;
  contentType: MessageContentType;
  modelUsed?: string; // e.g., 'gpt-4', 'llama-70b'
  provider?: AIProvider;
  tokensUsed?: number;
  responseTime?: number; // in milliseconds
  metadata?: Record<string, any>; // Function calls, attachments, etc.
  parentMessageId?: Nullable<string>; // For threaded conversations
  isEdited?: boolean;
  editedAt?: Nullable<Date | string>;
}

/** Chat session/conversation container */
export interface ChatSession extends WithTimestamps, WithMongoId {
  userId: string;
  title: string;
  description?: string;
  isActive: boolean;
  isArchived: boolean;
  messageCount: number;
  totalTokensUsed: number;
  lastMessageAt: Date | string;
  tags?: string[]; // For organization
  settings?: {
    model?: string;
    provider?: AIProvider;
    systemPrompt?: string;
    temperature?: number;
    maxTokens?: number;
  };
}

/** Chat message with populated session info */
export interface ChatMessageWithSession extends ChatMessage {
  session: Pick<ChatSession, 'title' | 'isActive'>;
}

/** Chat thread for nested conversations */
export interface ChatThread {
  id: string;
  sessionId: string;
  parentMessageId: string;
  messages: ChatMessage[];
  createdAt: Date | string;
}

// ========================================
// DOCUMENT MANAGEMENT & Q&A
// ========================================

/** Supported document file types */
export type DocumentType = 'pdf' | 'docx' | 'txt' | 'md' | 'csv' | 'xlsx' | 'image' | 'code';

/** Document processing status */
export type DocumentStatus = 'uploading' | 'processing' | 'ready' | 'failed' | 'archived';

/** Document metadata and file information */
export interface DocumentMeta extends WithTimestamps, WithSupabaseId {
  name: string;
  originalName: string;
  size: number; // in bytes
  type: DocumentType;
  mimeType: string;
  uploadedBy: string; // userId
  uploadedAt: Date | string;
  status: DocumentStatus;
  isPublic: boolean;
  downloadCount: number;
  
  // Storage information
  storageUrl: string; // Supabase Storage URL
  storagePath: string; // Internal storage path
  thumbnailUrl?: Nullable<string>;
  
  // Processing metadata
  pageCount?: number; // For PDFs
  wordCount?: number; // For text documents
  extractedText?: string; // Processed text content
  embeddings?: number[]; // Vector embeddings for search
  processingError?: Nullable<string>;
  
  // Organization
  folderId?: Nullable<string>;
  tags?: string[];
  description?: string;
}

/** Document folder for organization */
export interface DocumentFolder extends WithTimestamps, WithSupabaseId {
  name: string;
  description?: string;
  userId: string;
  parentId?: Nullable<string>; // For nested folders
  documentCount: number;
  isShared: boolean;
  color?: string; // UI customization
}

/** Question-Answer result from document processing */
export interface QAResult {
  id: string;
  documentId: string;
  userId: string;
  question: string;
  answer: string;
  confidence: number; // 0-1 confidence score
  sourcePage?: Nullable<number>; // Page number for PDFs
  sourceText?: string; // Extracted relevant text
  citations?: string[]; // Reference citations
  model?: string; // AI model used for answering
  responseTime: number; // in milliseconds
  createdAt: Date | string;
}

/** Document Q&A session */
export interface DocumentQASession extends WithTimestamps, WithSupabaseId {
  documentId: string;
  userId: string;
  title: string;
  questionCount: number;
  lastQuestionAt: Date | string;
  isActive: boolean;
}

/** Document sharing permission */
export interface DocumentShare extends WithTimestamps, WithSupabaseId {
  documentId: string;
  sharedBy: string; // userId
  sharedWith?: Nullable<string>; // userId or null for public
  permission: 'read' | 'comment' | 'edit';
  expiresAt?: Nullable<Date | string>;
  accessCount: number;
  lastAccessedAt?: Nullable<Date | string>;
}

// ========================================
// AI TOOL MODULES & FEATURES
// ========================================

/** Available AI tool modules in the platform */
export type ToolModuleType = 
  | 'chat' 
  | 'code_generator' 
  | 'document_qa' 
  | 'data_analysis' 
  | 'research_assistant'
  | 'notebook'
  | 'project_planner'
  | 'smart_contracts'
  | 'citation_manager'
  | 'literature_review';

/** AI tool module configuration */
export interface ToolModule {
  id: string;
  name: string;
  type: ToolModuleType;
  description: string;
  longDescription?: string;
  isActive: boolean;
  isNew: boolean;
  isBeta: boolean;
  icon: string; // Lucide icon name
  iconColor?: string;
  route: string; // Navigation route
  category: string; // For grouping in UI
  requiredSubscription: SubscriptionTier[];
  features?: string[]; // List of key features
  limitations?: Record<SubscriptionTier, any>; // Usage limits per tier
  metadata?: Record<string, any>;
}

/** User's feature usage tracking */
export interface FeatureUsage extends WithTimestamps {
  id: string;
  userId: string;
  moduleType: ToolModuleType;
  action: string; // e.g., 'generate_code', 'ask_question'
  count: number;
  lastUsedAt: Date | string;
  metadata?: Record<string, any>;
}

/** AI model configuration */
export interface AIModel {
  id: string;
  name: string;
  provider: AIProvider;
  description: string;
  maxTokens: number;
  costPerToken: number; // in credits
  isAvailable: boolean;
  requiredSubscription: SubscriptionTier[];
  capabilities: string[]; // e.g., ['text', 'code', 'analysis']
  metadata?: Record<string, any>;
}

// ========================================
// PROJECT MANAGEMENT
// ========================================

/** Project status */
export type ProjectStatus = 'draft' | 'active' | 'completed' | 'archived' | 'cancelled';

/** Project priority level */
export type ProjectPriority = 'low' | 'medium' | 'high' | 'urgent';

/** Project workspace */
export interface Project extends WithTimestamps, WithMongoId {
  userId: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  priority: ProjectPriority;
  dueDate?: Nullable<Date | string>;
  completedAt?: Nullable<Date | string>;
  
  // Collaboration
  collaborators: string[]; // userIds
  isPublic: boolean;
  shareLink?: string;
  
  // Content
  documentIds: string[]; // Associated documents
  chatSessionIds: string[]; // Associated chat sessions
  notebookIds: string[]; // Associated notebooks
  
  // Organization
  tags?: string[];
  color?: string;
  thumbnail?: string;
  
  // Metrics
  lastActivityAt: Date | string;
  viewCount: number;
}

/** Project task/milestone */
export interface ProjectTask extends WithTimestamps, WithSupabaseId {
  projectId: string;
  userId: string;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'review' | 'completed';
  priority: ProjectPriority;
  assignedTo?: Nullable<string>; // userId
  dueDate?: Nullable<Date | string>;
  completedAt?: Nullable<Date | string>;
  dependencies?: string[]; // taskIds
  estimatedHours?: number;
  actualHours?: number;
  tags?: string[];
}

// ========================================
// CODE EXECUTION & NOTEBOOKS
// ========================================

/** Supported programming languages */
export type ProgrammingLanguage = 
  | 'python' 
  | 'javascript' 
  | 'typescript' 
  | 'java' 
  | 'cpp' 
  | 'rust' 
  | 'go' 
  | 'sql' 
  | 'html' 
  | 'css'
  | 'bash'
  | 'markdown';

/** Code execution result */
export interface CodeExecutionResult {
  id: string;
  code: string;
  language: ProgrammingLanguage;
  output?: string;
  error?: string;
  executionTime: number; // in milliseconds
  memoryUsed?: number; // in bytes
  exitCode?: number;
  createdAt: Date | string;
}

/** Notebook cell types */
export type NotebookCellType = 'code' | 'markdown' | 'output';

/** Individual notebook cell */
export interface NotebookCell {
  id: string;
  type: NotebookCellType;
  content: string;
  language?: ProgrammingLanguage; // For code cells
  output?: string; // Execution output
  error?: string; // Execution errors
  metadata?: Record<string, any>;
  isExecuting?: boolean;
  executionCount?: number;
}

/** Jupyter-style notebook */
export interface Notebook extends WithTimestamps, WithMongoId {
  userId: string;
  title: string;
  description?: string;
  cells: NotebookCell[];
  language: ProgrammingLanguage;
  isPublic: boolean;
  isTemplate: boolean;
  projectId?: Nullable<string>;
  
  // Versioning
  version: number;
  versionHistory?: Array<{
    version: number;
    createdAt: Date | string;
    changes: string;
  }>;
  
  // Sharing
  shareLink?: string;
  collaborators?: string[]; // userIds
  
  // Metadata
  tags?: string[];
  lastExecutedAt?: Nullable<Date | string>;
  executionCount: number;
}

// ========================================
// DATA ANALYSIS & VISUALIZATION
// ========================================

/** Supported data file formats */
export type DataFileType = 'csv' | 'xlsx' | 'json' | 'xml' | 'tsv' | 'parquet';

/** Chart/visualization types */
export type ChartType = 
  | 'line' 
  | 'bar' 
  | 'pie' 
  | 'scatter' 
  | 'histogram' 
  | 'heatmap' 
  | 'box' 
  | 'area'
  | 'table';

/** Data analysis dataset */
export interface Dataset extends WithTimestamps, WithSupabaseId {
  userId: string;
  name: string;
  description?: string;
  fileType: DataFileType;
  fileName: string;
  fileSize: number;
  rowCount: number;
  columnCount: number;
  storageUrl: string;
  
  // Schema information
  columns: Array<{
    name: string;
    type: 'string' | 'number' | 'boolean' | 'date';
    nullable: boolean;
    unique: boolean;
  }>;
  
  // Processing status
  status: 'uploading' | 'processing' | 'ready' | 'error';
  processingError?: string;
  
  // Analysis metadata
  summary?: Record<string, any>; // Statistical summary
  sampleData?: any[]; // First few rows for preview
  isPublic: boolean;
  projectId?: Nullable<string>;
}

/** Data visualization/chart configuration */
export interface DataVisualization extends WithTimestamps, WithSupabaseId {
  userId: string;
  datasetId: string;
  title: string;
  description?: string;
  chartType: ChartType;
  configuration: Record<string, any>; // Chart-specific config
  queryFilters?: Record<string, any>; // Data filtering
  isPublic: boolean;
  shareLink?: string;
  viewCount: number;
  projectId?: Nullable<string>;
}

// ========================================
// RESEARCH & CITATIONS
// ========================================

/** Citation format styles */
export type CitationStyle = 'apa' | 'mla' | 'chicago' | 'ieee' | 'harvard' | 'vancouver';

/** Source types for citations */
export type SourceType = 
  | 'journal_article' 
  | 'book' 
  | 'website' 
  | 'conference_paper' 
  | 'thesis'
  | 'report'
  | 'news_article'
  | 'patent';

/** Research citation entry */
export interface Citation extends WithTimestamps, WithSupabaseId {
  userId: string;
  title: string;
  authors: string[]; // Array of author names
  sourceType: SourceType;
  publicationYear?: number;
  journal?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  publisher?: string;
  url?: string;
  doi?: string;
  isbn?: string;
  abstract?: string;
  keywords?: string[];
  notes?: string;
  
  // Organization
  projectId?: Nullable<string>;
  folderId?: Nullable<string>;
  tags?: string[];
  
  // Generated citations
  formattedCitations: Record<CitationStyle, string>;
}

/** Research literature review */
export interface LiteratureReview extends WithTimestamps, WithSupabaseId {
  userId: string;
  title: string;
  description?: string;
  topic: string;
  citationIds: string[]; // Associated citations
  content?: string; // Generated review content
  summary?: string;
  keyFindings?: string[];
  researchGaps?: string[];
  recommendations?: string[];
  projectId?: Nullable<string>;
  isPublic: boolean;
  wordCount?: number;
}

// ========================================
// NOTIFICATIONS & ALERTS
// ========================================

/** Notification types */
export type NotificationType = 
  | 'info' 
  | 'success' 
  | 'warning' 
  | 'error' 
  | 'feature_update'
  | 'billing'
  | 'security'
  | 'collaboration';

/** User notification */
export interface Notification extends WithTimestamps, WithSupabaseId {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  readAt?: Nullable<Date | string>;
  actionUrl?: string; // URL to navigate when clicked
  actionLabel?: string; // Button text for action
  metadata?: Record<string, any>;
  expiresAt?: Nullable<Date | string>;
}

// ========================================
// SYSTEM CONFIGURATION
// ========================================

/** Application-wide settings */
export interface AppSettings {
  maintenanceMode: boolean;
  maintenanceMessage?: string;
  allowRegistration: boolean;
  allowPasswordReset: boolean;
  maxFileUploadSize: number; // in bytes
  supportedFileTypes: string[];
  defaultAIModel: string;
  billingEnabled: boolean;
  analyticsEnabled: boolean;
  lastUpdated: Date | string;
}

/** Feature flags for A/B testing */
export interface FeatureFlag {
  id: string;
  name: string;
  description: string;
  isEnabled: boolean;
  rolloutPercentage: number; // 0-100
  targetUserIds?: string[]; // Specific user targeting
  metadata?: Record<string, any>;
  createdAt: Date | string;
  updatedAt: Date | string;
}

// ========================================
// ERROR HANDLING
// ========================================

/** Standardized error interface */
export interface AppError {
  code: string;
  message: string;
  details?: string;
  statusCode?: number;
  timestamp: Date | string;
  userId?: string;
  context?: Record<string, any>;
}

/** API error response format */
export interface ErrorResponse {
  success: false;
  error: AppError;
  requestId?: string;
}

// ========================================
// SEARCH & FILTERING
// ========================================

/** Generic search parameters */
export interface SearchParams {
  query?: string;
  filters?: Record<string, any>;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
  includeDeleted?: boolean;
}

/** Search result with highlighting */
export interface SearchResult<T> {
  item: T;
  score: number;
  highlights?: Record<string, string[]>;
  metadata?: Record<string, any>;
}

/** Search response with facets */
export interface SearchResponse<T> {
  results: SearchResult<T>[];
  total: number;
  facets?: Record<string, Array<{ value: string; count: number }>>;
  query: string;
  executionTime: number;
  pagination: PaginationMeta;
}

// ========================================
// EXPORT TYPES FOR CONVENIENCE
// ========================================

/** Union type of all database entity types */
export type DatabaseEntity = 
  | UserProfile 
  | ChatMessage 
  | ChatSession 
  | DocumentMeta 
  | Project 
  | Notebook
  | Dataset
  | Citation
  | Transaction
  | UserMetric;

/** Union type of all timestamps-enabled entities */
export type TimestampedEntity = WithTimestamps<DatabaseEntity>;

/** Generic ID type for flexibility */
export type EntityId = string;

/** Status types union */
export type EntityStatus = UserStatus | DocumentStatus | ProjectStatus | TransactionStatus;