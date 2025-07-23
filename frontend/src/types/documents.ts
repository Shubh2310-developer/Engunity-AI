/**
 * Document Types for Engunity AI Platform
 * 
 * Comprehensive type definitions for document management,
 * processing, analysis, and Q&A functionality.
 */

// =================================
// Core Document Types
// =================================

export interface Document {
  id: string;
  name: string;
  fileName: string;
  mimeType: string;
  size: number;
  url: string;
  thumbnailUrl?: string;
  uploadedAt: Date;
  updatedAt: Date;
  userId: string;
  folderId?: string;
  
  // Processing metadata
  status: DocumentStatus;
  processingProgress?: number;
  processingError?: string;
  
  // Content analysis
  content?: DocumentContent;
  metadata: DocumentMetadata;
  
  // Permissions & sharing
  permissions: DocumentPermissions;
  shareSettings: ShareSettings;
  
  // Analytics
  analytics: DocumentAnalytics;
  
  // Tags & categorization
  tags: string[];
  category?: DocumentCategory;
  
  // Version control
  version: number;
  parentId?: string;
  isLatestVersion: boolean;
}

export interface DocumentContent {
  extractedText: string;
  textLength: number;
  pageCount?: number;
  language: string;
  encoding: string;
  
  // AI-generated summaries
  summary?: string;
  keyPoints?: string[];
  topics?: string[];
  
  // Searchable content
  searchableContent: string;
  chunks: DocumentChunk[];
  
  // Structured data extraction
  entities?: NamedEntity[];
  relationships?: EntityRelationship[];
}

export interface DocumentChunk {
  id: string;
  content: string;
  startIndex: number;
  endIndex: number;
  pageNumber?: number;
  chunkType: 'paragraph' | 'section' | 'table' | 'list' | 'code' | 'quote';
  embedding?: number[];
  relevanceScore?: number;
}

export interface DocumentMetadata {
  title?: string;
  author?: string;
  subject?: string;
  creator?: string;
  producer?: string;
  creationDate?: Date;
  modificationDate?: Date;
  keywords?: string[];
  
  // Technical metadata
  format: string;
  formatVersion?: string;
  pageCount?: number;
  wordCount?: number;
  characterCount?: number;
  
  // Security metadata
  isEncrypted: boolean;
  hasDigitalSignature: boolean;
  
  // Custom metadata
  customFields: Record<string, any>;
}

export interface DocumentPermissions {
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canShare: boolean;
  canDownload: boolean;
  canComment: boolean;
  canAnalyze: boolean;
}

export interface ShareSettings {
  isPublic: boolean;
  shareLink?: string;
  shareLinkExpiry?: Date;
  sharedWith: SharedUser[];
  allowComments: boolean;
  allowDownload: boolean;
  requireAuth: boolean;
}

export interface SharedUser {
  userId: string;
  email: string;
  name?: string;
  permissions: DocumentPermissions;
  sharedAt: Date;
  lastAccessed?: Date;
}

export interface DocumentAnalytics {
  viewCount: number;
  downloadCount: number;
  shareCount: number;
  commentCount: number;
  qaSessionCount: number;
  
  // Recent activity
  lastViewed?: Date;
  lastDownloaded?: Date;
  lastShared?: Date;
  lastAnalyzed?: Date;
  
  // Popular queries
  topQueries: string[];
  avgSessionDuration: number;
}

// =================================
// Document Processing Types
// =================================

export type DocumentStatus = 
  | 'uploading'
  | 'processing'
  | 'analyzing'
  | 'ready'
  | 'error'
  | 'archived'
  | 'deleted';

export type DocumentCategory = 
  | 'research'
  | 'legal'
  | 'technical'
  | 'financial'
  | 'marketing'
  | 'educational'
  | 'personal'
  | 'other';

export interface DocumentProcessingJob {
  id: string;
  documentId: string;
  type: ProcessingJobType;
  status: JobStatus;
  progress: number;
  startedAt: Date;
  completedAt?: Date;
  error?: string;
  result?: any;
}

export type ProcessingJobType = 
  | 'extract_text'
  | 'generate_summary'
  | 'analyze_content'
  | 'create_embeddings'
  | 'detect_entities'
  | 'classify_document';

export type JobStatus = 
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled';

// =================================
// Q&A and Chat Types
// =================================

export interface QASession {
  id: string;
  documentId: string;
  userId: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  messages: QAMessage[];
  isActive: boolean;
  
  // Session metadata
  totalMessages: number;
  avgResponseTime: number;
  satisfaction?: number;
  
  // Context and settings
  context: QAContext;
  settings: QASettings;
}

export interface QAMessage {
  id: string;
  sessionId: string;
  type: 'question' | 'answer' | 'system';
  content: string;
  timestamp: Date;
  
  // Question-specific fields
  isFollowUp?: boolean;
  parentMessageId?: string;
  
  // Answer-specific fields
  sources?: DocumentChunk[];
  confidence?: number;
  responseTime?: number;
  
  // User interaction
  isHelpful?: boolean;
  feedback?: string;
  
  // AI metadata
  model?: string;
  tokenUsage?: TokenUsage;
}

export interface QAContext {
  focusAreas: string[];
  excludeAreas: string[];
  previousQuestions: string[];
  documentSections: string[];
  userIntent: 'research' | 'summarize' | 'analyze' | 'compare' | 'extract';
}

export interface QASettings {
  responseLength: 'brief' | 'detailed' | 'comprehensive';
  includeReferences: boolean;
  includeSources: boolean;
  language: string;
  expertise: 'general' | 'technical' | 'academic' | 'business';
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cost?: number;
}

// =================================
// Named Entity Recognition
// =================================

export interface NamedEntity {
  text: string;
  label: EntityLabel;
  startIndex: number;
  endIndex: number;
  confidence: number;
  normalizedValue?: string;
  metadata?: Record<string, any>;
}

export type EntityLabel = 
  | 'PERSON'
  | 'ORGANIZATION'
  | 'LOCATION'
  | 'DATE'
  | 'TIME'
  | 'MONEY'
  | 'PERCENTAGE'
  | 'EMAIL'
  | 'PHONE'
  | 'URL'
  | 'CUSTOM';

export interface EntityRelationship {
  sourceEntity: NamedEntity;
  targetEntity: NamedEntity;
  relationship: string;
  confidence: number;
}

// =================================
// Document Collections & Folders
// =================================

export interface DocumentFolder {
  id: string;
  name: string;
  description?: string;
  parentId?: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  
  // Folder contents
  documentCount: number;
  subfolderCount: number;
  totalSize: number;
  
  // Permissions
  permissions: DocumentPermissions;
  shareSettings: ShareSettings;
  
  // Organization
  color?: string;
  icon?: string;
  tags: string[];
}

export interface DocumentCollection {
  id: string;
  name: string;
  description?: string;
  documentIds: string[];
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  
  // Collection metadata
  isPublic: boolean;
  tags: string[];
  category?: string;
  
  // Analytics
  viewCount: number;
  collaborators: string[];
}

// =================================
// Search & Filtering
// =================================

export interface DocumentSearchQuery {
  query?: string;
  filters: DocumentFilters;
  sort: SortOption;
  pagination: PaginationOptions;
}

export interface DocumentFilters {
  category?: DocumentCategory[];
  status?: DocumentStatus[];
  dateRange?: DateRange;
  sizeRange?: SizeRange;
  mimeTypes?: string[];
  tags?: string[];
  folderId?: string;
  userId?: string;
  hasContent?: boolean;
}

export interface DateRange {
  start: Date;
  end: Date;
}

export interface SizeRange {
  min: number;
  max: number;
}

export interface SortOption {
  field: 'name' | 'uploadedAt' | 'updatedAt' | 'size' | 'relevance';
  direction: 'asc' | 'desc';
}

export interface PaginationOptions {
  page: number;
  limit: number;
  offset?: number;
}

export interface DocumentSearchResult {
  documents: Document[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
  
  // Search metadata
  query: string;
  searchTime: number;
  suggestions?: string[];
}

// =================================
// API Response Types
// =================================

export interface DocumentUploadResponse {
  success: boolean;
  document?: Document;
  error?: string;
  uploadId: string;
}

export interface DocumentProcessingResponse {
  success: boolean;
  jobId: string;
  estimatedTime?: number;
  error?: string;
}

export interface QAResponse {
  success: boolean;
  answer?: string;
  sources?: DocumentChunk[];
  confidence?: number;
  sessionId: string;
  messageId: string;
  responseTime: number;
  tokenUsage: TokenUsage;
  error?: string;
}

// =================================
// UI State Types
// =================================

export interface DocumentListState {
  documents: Document[];
  loading: boolean;
  error: string | null;
  searchQuery: string;
  filters: DocumentFilters;
  sort: SortOption;
  selectedIds: string[];
  view: 'grid' | 'list' | 'table';
}

export interface DocumentViewerState {
  document: Document | null;
  loading: boolean;
  error: string | null;
  currentPage: number;
  zoom: number;
  annotations: DocumentAnnotation[];
  highlights: TextHighlight[];
}

export interface DocumentAnnotation {
  id: string;
  type: 'note' | 'highlight' | 'bookmark';
  content: string;
  position: AnnotationPosition;
  userId: string;
  createdAt: Date;
}

export interface AnnotationPosition {
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TextHighlight {
  id: string;
  text: string;
  startIndex: number;
  endIndex: number;
  color: string;
  note?: string;
}

// =================================
// Utility Types
// =================================

export type DocumentEvent = 
  | 'uploaded'
  | 'processed'
  | 'analyzed'
  | 'viewed'
  | 'downloaded'
  | 'shared'
  | 'deleted'
  | 'restored'
  | 'commented'
  | 'qa_started'
  | 'qa_ended';

export interface DocumentEventLog {
  id: string;
  documentId: string;
  userId: string;
  event: DocumentEvent;
  metadata: Record<string, any>;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
}

// =================================
// Error Types
// =================================

export interface DocumentError {
  code: string;
  message: string;
  details?: Record<string, any>;
  timestamp: Date;
  documentId?: string;
  userId?: string;
}

export type DocumentErrorCode = 
  | 'UPLOAD_FAILED'
  | 'PROCESSING_FAILED'
  | 'ANALYSIS_FAILED'
  | 'PERMISSION_DENIED'
  | 'NOT_FOUND'
  | 'INVALID_FORMAT'
  | 'FILE_TOO_LARGE'
  | 'QUOTA_EXCEEDED'
  | 'NETWORK_ERROR'
  | 'UNKNOWN_ERROR';

// =================================
// Configuration Types
// =================================

export interface DocumentConfig {
  maxFileSize: number;
  allowedMimeTypes: string[];
  supportedLanguages: string[];
  processingTimeout: number;
  chunkSize: number;
  chunkOverlap: number;
  enableOCR: boolean;
  enableNER: boolean;
  enableSummary: boolean;
}

export interface QAConfig {
  maxSessionDuration: number;
  maxMessagesPerSession: number;
  defaultResponseLength: QASettings['responseLength'];
  enableSourceReferences: boolean;
  enableConfidenceScores: boolean;
  supportedModels: string[];
  defaultModel: string;
}

// Default export for stubbing
export default {};