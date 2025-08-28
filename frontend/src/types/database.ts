/**
 * Database Schema Type Definitions for Engunity AI
 * AI-Powered SaaS Platform Database Models
 * 
 * Stack: Next.js 14 + Supabase (PostgreSQL) + MongoDB Atlas
 * File: frontend/src/types/database.ts
 */

// Simple Database type for Supabase
export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          full_name?: string
          avatar_url?: string
          role: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          full_name?: string
          avatar_url?: string
          role?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          avatar_url?: string
          role?: string
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

// ========================================
// UTILITY TYPES
// ========================================

/** Makes any type nullable for optional fields */
export type Nullable<T> = T | null;

/** Makes all properties of a type optional */
export type Optional<T> = Partial<T>;

/** Adds common timestamp fields to any type */
export type WithTimestamps<T = {}> = T & {
  created_at: string;
  updated_at: string;
};

/** Adds MongoDB ObjectId to any type */
export type WithMongoId<T = {}> = T & {
  _id?: string;
};

/** Adds Supabase UUID to any type */
export type WithSupabaseId<T = {}> = T & {
  id: string;
};

/** Database operation result wrapper */
export interface DatabaseResult<T> {
  data: T | null;
  error: string | null;
  count?: number;
}

/** Pagination parameters for database queries */
export interface PaginationOptions {
  page?: number;
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

// ========================================
// SHARED ENUMS & CONSTANTS
// ========================================

/** User role enumeration for RBAC across both databases */
export type UserRole = 
  | 'user'        // Standard user with basic access
  | 'pro'         // Pro subscription user
  | 'admin'       // Platform administrator
  | 'moderator'   // Content moderator
  | 'developer'   // Developer with API access
  | 'enterprise'  // Enterprise user
  | 'super_admin' // Super administrator
  | 'beta_tester'; // Beta feature access

/** User account status */
export type UserStatus = 
  | 'active'              // Account is active
  | 'inactive'            // Temporarily disabled
  | 'pending_verification' // Email verification pending
  | 'suspended'           // Policy violation
  | 'deleted';            // Marked for deletion

/** Subscription tiers */
export type SubscriptionTier = 
  | 'free'       // Free tier with limitations
  | 'starter'    // Basic paid plan
  | 'pro'        // Professional plan
  | 'enterprise' // Enterprise plan
  | 'custom';    // Custom enterprise plan

/** Transaction types for billing */
export type TransactionType = 
  | 'credit'       // Credit added to account
  | 'debit'        // Credit deducted from account
  | 'refund'       // Refund transaction
  | 'subscription' // Subscription payment
  | 'one_time'     // One-time purchase
  | 'bonus';       // Promotional credit

/** Transaction status */
export type TransactionStatus = 
  | 'pending'   // Transaction initiated
  | 'completed' // Successfully processed
  | 'failed'    // Processing failed
  | 'cancelled' // Cancelled by user/system
  | 'refunded'; // Refund processed

/** Document/file types supported */
export type DocumentType = 
  | 'pdf'        // PDF documents
  | 'docx'       // Word documents
  | 'txt'        // Plain text files
  | 'md'         // Markdown files
  | 'csv'        // CSV data files
  | 'xlsx'       // Excel files
  | 'image'      // Image files (PNG, JPG, etc.)
  | 'code'       // Source code files
  | 'json'       // JSON data files
  | 'xml';       // XML files

/** Document processing status */
export type DocumentStatus = 
  | 'uploading'  // File upload in progress
  | 'processing' // AI processing document
  | 'ready'      // Ready for use
  | 'failed'     // Processing failed
  | 'archived';  // Archived document

/** AI tool types available in the platform */
export type ToolType = 
  | 'chat'         // AI chat assistant
  | 'docQA'        // Document Q&A
  | 'codegen'      // Code generation
  | 'analyzer'     // Data analysis
  | 'web3'         // Blockchain/Web3 tools
  | 'research'     // Research assistant
  | 'notebook'     // Code notebook
  | 'summarizer'   // Text summarization
  | 'translator'   // Language translation
  | 'image_gen';   // Image generation

/** Message roles in conversations */
export type MessageRole = 
  | 'user'      // User message
  | 'assistant' // AI assistant response
  | 'system'    // System message
  | 'function'; // Function call result

// ========================================
// SUPABASE (POSTGRESQL) TABLE SCHEMAS
// ========================================

/** Supabase users table - extends auth.users with profile data */
export interface SupabaseUser extends WithSupabaseId, WithTimestamps {
  /** User's email address (from auth.users) */
  email: string;
  /** User's full display name */
  full_name: Nullable<string>;
  /** User's first name */
  first_name: Nullable<string>;
  /** User's last name */
  last_name: Nullable<string>;
  /** Profile avatar image URL */
  avatar_url: Nullable<string>;
  /** User's role for access control */
  role: UserRole;
  /** Account status */
  status: UserStatus;
  /** Current subscription tier */
  subscription_tier: SubscriptionTier;
  /** Subscription status */
  subscription_status: 'active' | 'inactive' | 'past_due' | 'canceled' | 'trialing';
  /** Email verification status */
  email_verified: boolean;
  /** Phone number */
  phone: Nullable<string>;
  /** Phone verification status */
  phone_verified: boolean;
  /** User's timezone */
  timezone: Nullable<string>;
  /** User's locale/language */
  locale: Nullable<string>;
  /** Last login timestamp */
  last_login_at: Nullable<string>;
  /** User preferences as JSON */
  preferences: Nullable<Record<string, any>>;
  /** Additional user metadata */
  metadata: Nullable<Record<string, any>>;
}

/** Financial transactions table for billing and credits */
export interface Transaction extends WithSupabaseId, WithTimestamps {
  /** User who initiated the transaction */
  user_id: string;
  /** Transaction type */
  type: TransactionType;
  /** Transaction amount in cents (USD) */
  amount: number;
  /** Currency code (ISO 4217) */
  currency: string;
  /** Transaction status */
  status: TransactionStatus;
  /** Human-readable description */
  description: string;
  /** Payment provider reference ID */
  provider_id: Nullable<string>;
  /** Stripe payment intent ID */
  stripe_payment_intent_id: Nullable<string>;
  /** Invoice ID if applicable */
  invoice_id: Nullable<string>;
  /** Subscription ID if applicable */
  subscription_id: Nullable<string>;
  /** Processing error message */
  error_message: Nullable<string>;
  /** Transaction metadata */
  metadata: Nullable<Record<string, any>>;
}

/** Document files stored in Supabase Storage */
export interface DocumentFile extends WithSupabaseId, WithTimestamps {
  /** Owner of the document */
  user_id: string;
  /** Original filename */
  file_name: string;
  /** Sanitized filename for storage */
  storage_name: string;
  /** Document/file type */
  file_type: DocumentType;
  /** MIME type */
  mime_type: string;
  /** File size in bytes */
  size: number;
  /** Supabase Storage URL */
  url: string;
  /** Thumbnail URL for images/PDFs */
  thumbnail_url: Nullable<string>;
  /** Document processing status */
  status: DocumentStatus;
  /** Number of pages (for PDFs) */
  page_count: Nullable<number>;
  /** Word count (for text documents) */
  word_count: Nullable<number>;
  /** Extracted text content */
  extracted_text: Nullable<string>;
  /** Whether document is publicly accessible */
  is_public: boolean;
  /** Number of times downloaded */
  download_count: number;
  /** Folder ID for organization */
  folder_id: Nullable<string>;
  /** Document tags for categorization */
  tags: Nullable<string[]>;
  /** Processing error message */
  processing_error: Nullable<string>;
  /** Document metadata */
  metadata: Nullable<Record<string, any>>;
}

/** Document folders for organization */
export interface DocumentFolder extends WithSupabaseId, WithTimestamps {
  /** Owner of the folder */
  user_id: string;
  /** Folder name */
  name: string;
  /** Folder description */
  description: Nullable<string>;
  /** Parent folder ID for nesting */
  parent_id: Nullable<string>;
  /** Folder color for UI */
  color: Nullable<string>;
  /** Whether folder is shared */
  is_shared: boolean;
  /** Number of documents in folder */
  document_count: number;
}

/** User API keys for programmatic access */
export interface ApiKey extends WithSupabaseId, WithTimestamps {
  /** User who owns the API key */
  user_id: string;
  /** Human-readable key name */
  name: string;
  /** API key prefix (first 8 chars) */
  key_prefix: string;
  /** Hashed API key */
  key_hash: string;
  /** Permissions granted to this key */
  permissions: string[];
  /** Whether key is active */
  is_active: boolean;
  /** Last time key was used */
  last_used_at: Nullable<string>;
  /** Key expiration date */
  expires_at: Nullable<string>;
  /** Usage count */
  usage_count: number;
  /** Rate limit per hour */
  rate_limit: number;
}

/** User subscription details */
export interface Subscription extends WithSupabaseId, WithTimestamps {
  /** User who owns the subscription */
  user_id: string;
  /** Stripe subscription ID */
  stripe_subscription_id: string;
  /** Stripe customer ID */
  stripe_customer_id: string;
  /** Subscription plan identifier */
  plan_id: string;
  /** Subscription status */
  status: 'active' | 'inactive' | 'past_due' | 'canceled' | 'trialing';
  /** Current period start */
  current_period_start: string;
  /** Current period end */
  current_period_end: string;
  /** Whether to cancel at period end */
  cancel_at_period_end: boolean;
  /** Cancellation date */
  canceled_at: Nullable<string>;
  /** Trial end date */
  trial_end: Nullable<string>;
  /** Credits included in plan */
  credits_included: number;
  /** Additional credits purchased */
  credits_additional: number;
  /** Subscription metadata */
  metadata: Nullable<Record<string, any>>;
}

/** User usage metrics and analytics */
export interface UsageMetric extends WithSupabaseId, WithTimestamps {
  /** User being tracked */
  user_id: string;
  /** Metric type */
  metric_type: 'api_calls' | 'storage_used' | 'credits_consumed' | 'feature_usage';
  /** Metric value */
  value: number;
  /** Metric unit */
  unit: string;
  /** Date for this metric */
  date: string;
  /** Tool or feature that generated this metric */
  source: Nullable<string>;
  /** Additional metric metadata */
  metadata: Nullable<Record<string, any>>;
}

// ========================================
// MONGODB COLLECTION SCHEMAS
// ========================================

/** Chat messages collection - stores all conversation messages */
export interface ChatMessage extends WithMongoId {
  /** Chat session this message belongs to */
  session_id: string;
  /** User who sent the message (empty for AI responses) */
  user_id: string;
  /** Message role in conversation */
  role: MessageRole;
  /** Message content/text */
  content: string;
  /** Message content type */
  content_type: 'text' | 'code' | 'image' | 'file';
  /** AI model used for response (if role is 'assistant') */
  model_used: Nullable<string>;
  /** AI provider (groq, openai, etc.) */
  provider: Nullable<string>;
  /** Tokens consumed for this message */
  tokens_used: Nullable<number>;
  /** Response generation time in milliseconds */
  response_time: Nullable<number>;
  /** Parent message ID for threading */
  parent_message_id: Nullable<string>;
  /** Whether message was edited */
  is_edited: boolean;
  /** Edit timestamp */
  edited_at: Nullable<Date>;
  /** Message metadata (attachments, function calls, etc.) */
  metadata: Nullable<Record<string, any>>;
  /** Message creation timestamp */
  created_at: Date;
}

/** Chat sessions collection - groups messages into conversations */
export interface ChatSession extends WithMongoId {
  /** User who owns this session */
  user_id: string;
  /** Session title/name */
  title: string;
  /** Session description */
  description: Nullable<string>;
  /** Whether session is active */
  is_active: boolean;
  /** Whether session is archived */
  is_archived: boolean;
  /** Number of messages in session */
  message_count: number;
  /** Total tokens used in session */
  total_tokens_used: number;
  /** Last message timestamp */
  last_message_at: Date;
  /** Session tags for organization */
  tags: string[];
  /** AI model preferences for this session */
  model_settings: Nullable<{
    model: string;
    provider: string;
    temperature: number;
    max_tokens: number;
    system_prompt: Nullable<string>;
  }>;
  /** Project ID if session is part of a project */
  project_id: Nullable<string>;
  /** Session metadata */
  metadata: Nullable<Record<string, any>>;
  /** Session creation timestamp */
  created_at: Date;
  /** Last update timestamp */
  updated_at: Date;
}

/** Tool usage logs collection - tracks AI tool usage */
export interface ToolUsageLog extends WithMongoId {
  /** User who used the tool */
  user_id: string;
  /** Tool type used */
  tool: ToolType;
  /** Session ID if tool was used in a session */
  session_id: Nullable<string>;
  /** Brief summary of input provided */
  input_summary: string;
  /** Brief summary of output generated */
  output_summary: string;
  /** Tool execution status */
  status: 'success' | 'error' | 'timeout';
  /** Processing time in milliseconds */
  processing_time: number;
  /** Tokens consumed */
  tokens_used: number;
  /** Credits charged */
  credits_used: number;
  /** AI model used */
  model_used: Nullable<string>;
  /** Error message if status is 'error' */
  error_message: Nullable<string>;
  /** Input data size in bytes */
  input_size: Nullable<number>;
  /** Output data size in bytes */
  output_size: Nullable<number>;
  /** Tool-specific metadata */
  metadata: Nullable<Record<string, any>>;
  /** Log creation timestamp */
  created_at: Date;
}

/** User projects collection - workspace organization */
export interface Project extends WithMongoId {
  /** Project owner */
  user_id: string;
  /** Project name */
  name: string;
  /** Project description */
  description: Nullable<string>;
  /** Project status */
  status: 'active' | 'completed' | 'archived' | 'deleted';
  /** Project priority */
  priority: 'low' | 'medium' | 'high' | 'urgent';
  /** Project due date */
  due_date: Nullable<Date>;
  /** Project completion date */
  completed_at: Nullable<Date>;
  /** Collaborator user IDs */
  collaborators: string[];
  /** Whether project is public */
  is_public: boolean;
  /** Associated document IDs */
  document_ids: string[];
  /** Associated chat session IDs */
  session_ids: string[];
  /** Project tags */
  tags: string[];
  /** Project color for UI */
  color: Nullable<string>;
  /** Project thumbnail/cover image */
  thumbnail_url: Nullable<string>;
  /** Last activity timestamp */
  last_activity_at: Date;
  /** View count */
  view_count: number;
  /** Project metadata */
  metadata: Nullable<Record<string, any>>;
  /** Project creation timestamp */
  created_at: Date;
  /** Last update timestamp */
  updated_at: Date;
}

/** Code notebooks collection - Jupyter-style notebooks */
export interface CodeNotebook extends WithMongoId {
  /** Notebook owner */
  user_id: string;
  /** Notebook title */
  title: string;
  /** Notebook description */
  description: Nullable<string>;
  /** Programming language */
  language: 'python' | 'javascript' | 'typescript' | 'sql' | 'r' | 'julia';
  /** Notebook cells */
  cells: Array<{
    id: string;
    type: 'code' | 'markdown' | 'output';
    content: string;
    output: Nullable<string>;
    error: Nullable<string>;
    execution_count: number;
    metadata: Nullable<Record<string, any>>;
  }>;
  /** Whether notebook is public */
  is_public: boolean;
  /** Whether this is a template */
  is_template: boolean;
  /** Project ID if notebook is part of a project */
  project_id: Nullable<string>;
  /** Notebook version */
  version: number;
  /** Notebook tags */
  tags: string[];
  /** Share URL */
  share_url: Nullable<string>;
  /** Collaborator user IDs */
  collaborators: string[];
  /** Last execution timestamp */
  last_executed_at: Nullable<Date>;
  /** Total execution count */
  execution_count: number;
  /** Notebook metadata */
  metadata: Nullable<Record<string, any>>;
  /** Notebook creation timestamp */
  created_at: Date;
  /** Last update timestamp */
  updated_at: Date;
}

/** Data analysis datasets collection */
export interface Dataset extends WithMongoId {
  /** Dataset owner */
  user_id: string;
  /** Dataset name */
  name: string;
  /** Dataset description */
  description: Nullable<string>;
  /** Original filename */
  file_name: string;
  /** File type */
  file_type: 'csv' | 'xlsx' | 'json' | 'parquet';
  /** File size in bytes */
  file_size: number;
  /** Number of rows */
  row_count: number;
  /** Number of columns */
  column_count: number;
  /** Supabase storage URL */
  storage_url: string;
  /** Column schema information */
  schema: Array<{
    name: string;
    type: 'string' | 'number' | 'boolean' | 'date';
    nullable: boolean;
    unique: boolean;
  }>;
  /** Processing status */
  status: 'uploading' | 'processing' | 'ready' | 'error';
  /** Processing error message */
  processing_error: Nullable<string>;
  /** Statistical summary */
  summary: Nullable<Record<string, any>>;
  /** Sample data (first few rows) */
  sample_data: Nullable<any[]>;
  /** Whether dataset is public */
  is_public: boolean;
  /** Project ID if dataset is part of a project */
  project_id: Nullable<string>;
  /** Dataset tags */
  tags: string[];
  /** Dataset metadata */
  metadata: Nullable<Record<string, any>>;
  /** Dataset creation timestamp */
  created_at: Date;
  /** Last update timestamp */
  updated_at: Date;
}

/** Data analysis sessions collection - stores complete analysis workspace state */
export interface AnalysisSession extends WithMongoId {
  /** Session owner */
  user_id: string;
  /** Session title/name */
  title: string;
  /** Dataset file ID from analysis */
  dataset_id: string;
  /** Current dataset file information */
  file_info: {
    name: string;
    size: string;
    rows: number;
    columns: number;
    uploadDate: string;
  };
  /** Data summary and quality metrics */
  data_summary: Nullable<Record<string, any>>;
  /** Column metadata and statistics */
  column_metadata: Nullable<Array<Record<string, any>>>;
  /** Data preview (sample rows) */
  data_preview: Nullable<{
    columns: string[];
    rows: any[][];
    pagination?: Record<string, any>;
  }>;
  /** Generated charts and visualizations */
  charts_data: Nullable<Record<string, any>>;
  /** Correlation analysis results */
  correlation_data: Nullable<Record<string, any>>;
  /** Query execution history */
  query_history: Array<{
    query: string;
    type: 'SQL' | 'NLQ';
    timestamp: string;
    executionTime?: string;
    results?: any;
  }>;
  /** AI-generated insights */
  ai_insights: Array<{
    title: string;
    description: string;
    type: string;
    confidence: number;
    timestamp: string;
    data?: Record<string, any>;
  }>;
  /** Custom user-created charts */
  custom_charts: Array<{
    id: string;
    title: string;
    type: string;
    xAxis: string;
    yAxis: string;
    data?: Array<Record<string, any>>;
  }>;
  /** Data transformations applied */
  transformations: Array<{
    type: string;
    timestamp: string;
    description: string;
    parameters: Record<string, any>;
  }>;
  /** Session status */
  status: 'active' | 'saved' | 'archived';
  /** Whether session is shared publicly */
  is_public: boolean;
  /** Project ID if session is part of a project */
  project_id: Nullable<string>;
  /** Session tags for organization */
  tags: string[];
  /** Last activity timestamp */
  last_activity_at: Date;
  /** Session metadata */
  metadata: Nullable<Record<string, any>>;
  /** Session creation timestamp */
  created_at: Date;
  /** Last update timestamp */
  updated_at: Date;
}

/** User notifications collection */
export interface Notification extends WithMongoId {
  /** User who should receive the notification */
  user_id: string;
  /** Notification type */
  type: 'info' | 'success' | 'warning' | 'error' | 'feature_update' | 'billing';
  /** Notification title */
  title: string;
  /** Notification message */
  message: string;
  /** Whether notification has been read */
  is_read: boolean;
  /** Read timestamp */
  read_at: Nullable<Date>;
  /** Action URL to navigate when clicked */
  action_url: Nullable<string>;
  /** Action button text */
  action_label: Nullable<string>;
  /** Notification expiration date */
  expires_at: Nullable<Date>;
  /** Notification metadata */
  metadata: Nullable<Record<string, any>>;
  /** Notification creation timestamp */
  created_at: Date;
}

// ========================================
// CROSS-DATABASE RELATIONSHIP TYPES
// ========================================

/** User with chat session summary */
export interface UserWithSessions extends SupabaseUser {
  /** Number of active chat sessions */
  active_sessions: number;
  /** Total messages sent */
  total_messages: number;
  /** Last chat activity */
  last_chat_at: Nullable<string>;
}

/** Document with Q&A results */
export interface DocumentWithQA extends DocumentFile {
  /** Number of Q&A interactions */
  qa_count: number;
  /** Last Q&A timestamp */
  last_qa_at: Nullable<string>;
  /** Average confidence score */
  avg_confidence: Nullable<number>;
}

/** Project with related data */
export interface ProjectWithDetails extends Project {
  /** Associated documents */
  documents: DocumentFile[];
  /** Associated chat sessions */
  sessions: ChatSession[];
  /** Project owner details */
  owner: Pick<SupabaseUser, 'id' | 'full_name' | 'avatar_url'>;
  /** Collaborator details */
  collaborator_details: Pick<SupabaseUser, 'id' | 'full_name' | 'avatar_url'>[];
}

// ========================================
// DATABASE OPERATION TYPES
// ========================================

/** Insert types (without auto-generated fields) */
export type InsertSupabaseUser = Omit<SupabaseUser, 'id' | 'created_at' | 'updated_at'>;
export type InsertTransaction = Omit<Transaction, 'id' | 'created_at' | 'updated_at'>;
export type InsertDocumentFile = Omit<DocumentFile, 'id' | 'created_at' | 'updated_at'>;
export type InsertChatMessage = Omit<ChatMessage, '_id' | 'created_at'>;
export type InsertChatSession = Omit<ChatSession, '_id' | 'created_at' | 'updated_at'>;
export type InsertToolUsageLog = Omit<ToolUsageLog, '_id' | 'created_at'>;

/** Update types (all fields optional except ID) */
export type UpdateSupabaseUser = Partial<Omit<SupabaseUser, 'id' | 'created_at'>> & { updated_at: string };
export type UpdateTransaction = Partial<Omit<Transaction, 'id' | 'created_at'>> & { updated_at: string };
export type UpdateDocumentFile = Partial<Omit<DocumentFile, 'id' | 'created_at'>> & { updated_at: string };
export type UpdateChatSession = Partial<Omit<ChatSession, '_id' | 'created_at'>> & { updated_at: Date };
export type UpdateProject = Partial<Omit<Project, '_id' | 'created_at'>> & { updated_at: Date };

/** Filter types for database queries */
export interface UserFilter {
  role?: UserRole | UserRole[];
  status?: UserStatus | UserStatus[];
  subscription_tier?: SubscriptionTier | SubscriptionTier[];
  email_verified?: boolean;
  created_after?: string;
  created_before?: string;
}

export interface DocumentFilter {
  user_id?: string;
  file_type?: DocumentType | DocumentType[];
  status?: DocumentStatus | DocumentStatus[];
  is_public?: boolean;
  folder_id?: string;
  tags?: string[];
  created_after?: string;
  created_before?: string;
}

export interface ChatFilter {
  user_id?: string;
  is_active?: boolean;
  is_archived?: boolean;
  project_id?: string;
  tags?: string[];
  created_after?: Date;
  created_before?: Date;
}

// ========================================
// AGGREGATION & ANALYTICS TYPES
// ========================================

/** User activity summary */
export interface UserActivitySummary {
  user_id: string;
  total_sessions: number;
  total_messages: number;
  total_documents: number;
  total_projects: number;
  credits_used: number;
  last_active: Date;
  most_used_tool: ToolType;
  storage_used: number;
}

/** Platform analytics summary */
export interface PlatformAnalytics {
  total_users: number;
  active_users_today: number;
  active_users_week: number;
  active_users_month: number;
  total_messages: number;
  total_documents: number;
  total_projects: number;
  storage_used: number;
  credits_consumed: number;
  top_tools: Array<{ tool: ToolType; usage_count: number }>;
  user_growth: Array<{ date: string; new_users: number; total_users: number }>;
}

// ========================================
// EXPORT UTILITY TYPES
// ========================================

/** Union type of all Supabase table types */
export type SupabaseEntity = 
  | SupabaseUser 
  | Transaction 
  | DocumentFile 
  | DocumentFolder 
  | ApiKey 
  | Subscription 
  | UsageMetric;

/** Union type of all MongoDB collection types */
export type MongoEntity = 
  | ChatMessage 
  | ChatSession 
  | ToolUsageLog 
  | Project 
  | CodeNotebook 
  | Dataset 
  | AnalysisSession
  | Notification;

/** Union type of all database entities */
export type DatabaseEntity = SupabaseEntity | MongoEntity;

/** Database table/collection names */
export type SupabaseTable = 
  | 'users' 
  | 'transactions' 
  | 'documents' 
  | 'document_folders' 
  | 'api_keys' 
  | 'subscriptions' 
  | 'usage_metrics';

export type MongoCollection = 
  | 'chat_messages' 
  | 'chat_sessions' 
  | 'tool_usage_logs' 
  | 'projects' 
  | 'code_notebooks' 
  | 'datasets' 
  | 'analysis_sessions'
  | 'notifications';