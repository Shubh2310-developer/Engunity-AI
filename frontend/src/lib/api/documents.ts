/**
 * Document Intelligence API Client
 * Frontend API calls to backend document management system
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface DocumentMetadata {
  word_count?: number;
  page_count?: number;
  reading_time_minutes?: number;
  file_size_bytes: number;
  file_type: string;
  mime_type: string;
  language?: string;
  document_type?: string;
  industry?: string;
  topics?: string[];
  entities?: {
    [key: string]: string[];
  };
  key_dates?: string[];
  sentiment?: string;
  complexity_score?: number;
}

export interface Document {
  _id?: string;
  doc_id: string;
  user_id: string;
  session_id?: string;
  filename: string;
  original_filename: string;
  file_hash: string;
  metadata: DocumentMetadata;
  category: string;
  tags?: string[];
  custom_tags?: string[];
  summary?: string;
  key_points?: string[];
  processing_status: 'pending' | 'processing' | 'ready' | 'failed';
  error_message?: string;
  upload_date?: string;
  last_accessed?: string;
  view_count: number;
  question_count: number;
  avg_confidence?: number;
  cloudinary_url?: string;
  storage_path?: string;
}

export interface DashboardStats {
  totalDocuments: number;
  questionsAsked: number;
  avgConfidence: number;
  timeSaved: number;
  totalViews: number;
  recentActivity?: Array<{
    doc_id: string;
    filename: string;
    action: string;
    timestamp: string;
  }>;
}

export interface DocumentAnalytics {
  document_id: string;
  view_count: number;
  question_count: number;
  avg_confidence: number;
  total_time_spent_minutes: number;
  last_accessed: string;
  question_history?: Array<{
    question: string;
    timestamp: string;
    confidence: number;
  }>;
}

/**
 * Upload a document to the system
 */
export async function uploadDocument(
  file: File,
  userId: string,
  sessionId?: string,
  category?: string
): Promise<{
  success: boolean;
  doc_id: string;
  filename: string;
  message: string;
  mongo_id: string;
}> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('user_id', userId);
  if (sessionId) formData.append('session_id', sessionId);
  if (category) formData.append('category', category);

  const response = await fetch(`${API_BASE}/api/documents/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Upload failed');
  }

  return response.json();
}

/**
 * Get a document by ID
 */
export async function getDocument(docId: string): Promise<Document> {
  const response = await fetch(`${API_BASE}/api/documents/${docId}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to fetch document');
  }

  return response.json();
}

/**
 * Get all documents for a user
 */
export async function getUserDocuments(
  userId: string,
  filters?: {
    skip?: number;
    limit?: number;
    category?: string;
    search?: string;
  }
): Promise<{
  documents: Document[];
  total: number;
  skip: number;
  limit: number;
}> {
  const params = new URLSearchParams({
    skip: filters?.skip?.toString() || '0',
    limit: filters?.limit?.toString() || '50',
  });

  if (filters?.category) {
    params.append('category', filters.category);
  }
  if (filters?.search) {
    params.append('search', filters.search);
  }

  const response = await fetch(
    `${API_BASE}/api/documents/user/${userId}?${params}`
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to fetch documents');
  }

  return response.json();
}

/**
 * Update document metadata
 */
export async function updateDocument(
  docId: string,
  updates: {
    filename?: string;
    category?: string;
    tags?: string[];
    custom_tags?: string[];
    summary?: string;
    key_points?: string[];
    processing_status?: string;
  }
): Promise<{
  success: boolean;
  updated_fields: string[];
}> {
  const response = await fetch(`${API_BASE}/api/documents/${docId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to update document');
  }

  return response.json();
}

/**
 * Delete a document
 */
export async function deleteDocument(
  docId: string
): Promise<{
  success: boolean;
  message: string;
}> {
  const response = await fetch(`${API_BASE}/api/documents/${docId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to delete document');
  }

  return response.json();
}

/**
 * Track document view
 */
export async function trackView(docId: string): Promise<{ success: boolean }> {
  const response = await fetch(`${API_BASE}/api/documents/${docId}/view`, {
    method: 'POST',
  });

  if (!response.ok) {
    // Non-critical - don't throw error
    console.warn('Failed to track view');
    return { success: false };
  }

  return response.json();
}

/**
 * Get dashboard statistics for a user
 */
export async function getDashboardStats(
  userId: string
): Promise<DashboardStats> {
  const response = await fetch(
    `${API_BASE}/api/documents/stats/dashboard/${userId}`
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to fetch stats');
  }

  return response.json();
}

/**
 * Get analytics for a specific document
 */
export async function getDocumentAnalytics(
  docId: string
): Promise<DocumentAnalytics> {
  const response = await fetch(
    `${API_BASE}/api/documents/${docId}/analytics`
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to fetch analytics');
  }

  return response.json();
}

/**
 * Add an annotation to a document
 */
export async function addAnnotation(
  docId: string,
  annotation: {
    user_id: string;
    user_name: string;
    annotation_type: string;
    content: string;
    page_number?: number;
    chunk_id?: string;
    coordinates?: { [key: string]: number };
  }
): Promise<{
  success: boolean;
  annotation_id: string;
}> {
  const response = await fetch(
    `${API_BASE}/api/documents/${docId}/annotations`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(annotation),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to add annotation');
  }

  return response.json();
}

/**
 * Get all annotations for a document
 */
export async function getAnnotations(
  docId: string
): Promise<{
  annotations: Array<{
    id: string;
    user_id: string;
    user_name: string;
    annotation_type: string;
    content: string;
    page_number?: number;
    created_at: string;
    updated_at: string;
  }>;
}> {
  const response = await fetch(
    `${API_BASE}/api/documents/${docId}/annotations`
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to fetch annotations');
  }

  return response.json();
}

/**
 * Ask a question about a document using RAG server
 */
export async function askQuestion(
  docIds: string[],
  question: string,
  sessionId: string,
  mode: 'document-only' | 'web-enhanced' | 'hybrid' = 'document-only',
  topK: number = 5
): Promise<{
  response: string;
  confidence: number;
  sources: Array<{
    page?: number;
    chunk_text: string;
    relevance_score?: number;
  }>;
  mode: string;
}> {
  const RAG_BASE = process.env.NEXT_PUBLIC_RAG_URL || 'http://localhost:8004';

  const response = await fetch(`${RAG_BASE}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      session_id: sessionId,
      message: question,
      doc_ids: docIds,
      mode,
      top_k: topK,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'RAG server error' }));
    throw new Error(error.detail || 'Failed to get answer');
  }

  return response.json();
}

/**
 * Upload document to RAG server for indexing
 */
export async function uploadToRAG(
  file: File,
  userId: string,
  sessionId?: string
): Promise<{
  success: boolean;
  doc_id: string;
  page_count: number;
  chunk_count: number;
}> {
  const RAG_BASE = process.env.NEXT_PUBLIC_RAG_URL || 'http://localhost:8004';

  const formData = new FormData();
  formData.append('file', file);
  formData.append('user_id', userId);
  if (sessionId) formData.append('session_id', sessionId);

  const response = await fetch(`${RAG_BASE}/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'RAG upload failed' }));
    throw new Error(error.detail || 'Failed to upload to RAG');
  }

  return response.json();
}

/**
 * Get categories for filtering
 */
export function getCategories(): string[] {
  return [
    'technical',
    'business',
    'legal',
    'financial',
    'research',
    'product',
    'marketing',
    'other',
    'uncategorized',
  ];
}

/**
 * Format file size in human-readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

/**
 * Format date relative to now
 */
export function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 30) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

  return date.toLocaleDateString();
}
