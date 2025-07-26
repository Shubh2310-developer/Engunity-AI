/**
 * Document Storage Integration Service
 * Connects Firebase Storage with Firestore for comprehensive document management
 */

import { 
  uploadDocument as uploadToStorage, 
  deleteFile, 
  getFileURL,
  getFileMetadata,
  listFiles,
  saveUserData,
  loadUserData,
  uploadMultipleFiles
} from './storage';
import { DocumentService, Document } from './firestore';
import { DocumentStatus } from '@/types/documents';
import { Timestamp } from 'firebase/firestore';

// ================================
// TYPE DEFINITIONS
// ================================

export interface DocumentUploadResult {
  success: boolean;
  document?: Document;
  error?: string;
}

export interface DocumentProcessingOptions {
  extractText?: boolean;
  generateThumbnail?: boolean;
  analyzeContent?: boolean;
  autoTag?: boolean;
}

export interface DocumentAnalysis {
  wordCount: number;
  pages: number;
  language: string;
  topics: string[];
  sentiment?: 'positive' | 'negative' | 'neutral';
  readingTime: number; // in minutes
}

export interface DocumentBatch {
  documents: File[];
  category: string;
  tags: string[];
  processingOptions: DocumentProcessingOptions;
}

// ================================
// DOCUMENT UPLOAD & PROCESSING
// ================================

/**
 * Upload and process a single document
 */
export async function uploadAndProcessDocument(
  userId: string,
  file: File,
  metadata: {
    category?: string;
    tags?: string[];
    description?: string;
  } = {},
  options: DocumentProcessingOptions = {}
): Promise<DocumentUploadResult> {
  try {
    // Upload file to Firebase Storage
    const uploadResult = await uploadToStorage(userId, file, {
      category: metadata.category || 'general',
      tags: metadata.tags || []
    }, {
      onProgress: (progress) => {
        console.log(`Upload progress: ${progress}%`);
      }
    });

    if (!uploadResult.success) {
      return {
        success: false,
        error: uploadResult.error
      };
    }

    // Create document record in Firestore
    const documentData: Omit<Document, 'id'> = {
      userId,
      name: file.name,
      type: getDocumentType(file.type),
      size: formatFileSize(file.size),
      category: metadata.category || 'general',
      status: 'processing',
      uploadedAt: Timestamp.now(),
      metadata: {
        pages: 0,
        wordCount: 0,
        language: 'en'
      },
      storageUrl: uploadResult.url!,
      tags: metadata.tags || []
    };

    const documentId = await DocumentService.createDocument(documentData);

    // Process document if options are specified
    if (options.extractText || options.analyzeContent || options.autoTag) {
      try {
        const analysis = await processDocument(uploadResult.url!, options);
        
        // Update document with processing results
        await DocumentService.updateDocumentStatus(documentId, 'processed', {
          ...analysis,
          extractedText: analysis.extractedText
        });
        
        documentData.metadata = { ...documentData.metadata, ...analysis };
        documentData.status = 'processed';
        documentData.processedAt = Timestamp.now();
      } catch (processingError) {
        console.error('Document processing failed:', processingError);
        await DocumentService.updateDocumentStatus(documentId, 'failed');
        documentData.status = 'failed';
      }
    } else {
      // Mark as processed without analysis
      await DocumentService.updateDocumentStatus(documentId, 'processed');
      documentData.status = 'processed';
      documentData.processedAt = Timestamp.now();
    }

    const finalDocument: Document = {
      ...documentData,
      id: documentId
    };

    return {
      success: true,
      document: finalDocument
    };

  } catch (error: any) {
    return {
      success: false,
      error: `Document upload failed: ${error.message || error}`
    };
  }
}

/**
 * Upload multiple documents in batch
 */
export async function uploadDocumentBatch(
  userId: string,
  batch: DocumentBatch,
  onProgress?: (completed: number, total: number) => void
): Promise<{
  success: boolean;
  results: DocumentUploadResult[];
  successCount: number;
  errorCount: number;
}> {
  const results: DocumentUploadResult[] = [];
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < batch.documents.length; i++) {
    const file = batch.documents[i];
    
    try {
      const result = await uploadAndProcessDocument(
        userId,
        file,
        {
          category: batch.category,
          tags: batch.tags
        },
        batch.processingOptions
      );

      results.push(result);
      
      if (result.success) {
        successCount++;
      } else {
        errorCount++;
      }

      onProgress?.(i + 1, batch.documents.length);
    } catch (error: any) {
      results.push({
        success: false,
        error: `Failed to process ${file.name}: ${error.message || error}`
      });
      errorCount++;
      onProgress?.(i + 1, batch.documents.length);
    }
  }

  return {
    success: successCount > 0,
    results,
    successCount,
    errorCount
  };
}

// ================================
// DOCUMENT PROCESSING
// ================================

/**
 * Process document for text extraction and analysis
 */
async function processDocument(
  fileUrl: string,
  options: DocumentProcessingOptions
): Promise<DocumentAnalysis & { extractedText?: string }> {
  try {
    // This is a simplified version - in a real implementation,
    // you would integrate with services like Google Cloud Document AI,
    // Amazon Textract, or similar OCR/document processing services
    
    // For now, we'll provide mock processing
    const mockAnalysis: DocumentAnalysis & { extractedText?: string } = {
      wordCount: Math.floor(Math.random() * 5000) + 100,
      pages: Math.floor(Math.random() * 50) + 1,
      language: 'en',
      topics: ['technology', 'business', 'development'],
      sentiment: 'neutral',
      readingTime: Math.floor(Math.random() * 30) + 5,
      extractedText: options.extractText ? 'This is mock extracted text content...' : undefined
    };

    // In a real implementation, you would:
    // 1. Download the file from Firebase Storage
    // 2. Use OCR services to extract text
    // 3. Use NLP services to analyze content
    // 4. Generate thumbnails if needed
    // 5. Auto-generate tags based on content

    return mockAnalysis;
  } catch (error) {
    throw new Error(`Document processing failed: ${error}`);
  }
}

// ================================
// DOCUMENT MANAGEMENT
// ================================

/**
 * Delete document and its storage file (legacy function)
 */
export async function deleteDocumentLegacy(
  documentId: string,
  storagePath: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Delete from Firestore
    await DocumentService.deleteDocument(documentId);
    
    // Delete from Firebase Storage
    const storageResult = await deleteFile(storagePath);
    
    if (!storageResult.success) {
      console.warn('Failed to delete storage file:', storageResult.error);
      // Don't fail the entire operation if storage delete fails
    }

    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      error: `Delete failed: ${error.message || error}`
    };
  }
}

/**
 * Get document download URL
 */
export async function getDocumentDownloadUrl(
  storagePath: string
): Promise<{ success: boolean; url?: string; error?: string }> {
  return await getFileURL(storagePath);
}

/**
 * Generate document sharing link
 */
export async function generateDocumentSharingLink(
  documentId: string,
  expiresInHours: number = 24
): Promise<{ success: boolean; shareUrl?: string; expiresAt?: Date; error?: string }> {
  try {
    // In a real implementation, you would create a secure sharing token
    // and store it in Firestore with expiration time
    
    const shareToken = `share_${documentId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const expiresAt = new Date(Date.now() + (expiresInHours * 60 * 60 * 1000));
    
    // Store sharing info (mock implementation)
    const sharingData = {
      documentId,
      shareToken,
      expiresAt: expiresAt.toISOString(),
      createdAt: new Date().toISOString()
    };

    // Save sharing data to Firebase Storage (in a real app, use Firestore)
    const saveResult = await saveUserData('shared', `share-${shareToken}`, sharingData);
    
    if (!saveResult.success) {
      return {
        success: false,
        error: saveResult.error
      };
    }

    const shareUrl = `${window.location.origin}/shared/${shareToken}`;
    
    return {
      success: true,
      shareUrl,
      expiresAt
    };
  } catch (error: any) {
    return {
      success: false,
      error: `Failed to generate sharing link: ${error.message || error}`
    };
  }
}

// ================================
// DOCUMENT ORGANIZATION
// ================================

/**
 * Organize documents by category and tags
 */
export async function organizeUserDocuments(
  userId: string
): Promise<{
  success: boolean;
  organization?: {
    byCategory: Record<string, Document[]>;
    byTag: Record<string, Document[]>;
    untagged: Document[];
    recentlyAdded: Document[];
  };
  error?: string;
}> {
  try {
    const documents = await DocumentService.getUserDocuments(userId, 1000);
    
    const byCategory: Record<string, Document[]> = {};
    const byTag: Record<string, Document[]> = {};
    const untagged: Document[] = [];
    const recentlyAdded: Document[] = [];
    
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    
    documents.forEach(doc => {
      // Organize by category
      if (!byCategory[doc.category]) {
        byCategory[doc.category] = [];
      }
      byCategory[doc.category].push(doc);
      
      // Organize by tags
      if (doc.tags && doc.tags.length > 0) {
        doc.tags.forEach(tag => {
          if (!byTag[tag]) {
            byTag[tag] = [];
          }
          byTag[tag].push(doc);
        });
      } else {
        untagged.push(doc);
      }
      
      // Check if recently added
      const uploadTime = doc.uploadedAt.seconds * 1000;
      if (uploadTime > thirtyDaysAgo) {
        recentlyAdded.push(doc);
      }
    });
    
    // Sort recently added by upload date
    recentlyAdded.sort((a, b) => b.uploadedAt.seconds - a.uploadedAt.seconds);
    
    return {
      success: true,
      organization: {
        byCategory,
        byTag,
        untagged,
        recentlyAdded
      }
    };
  } catch (error: any) {
    return {
      success: false,
      error: `Organization failed: ${error.message || error}`
    };
  }
}

/**
 * Search documents by content, tags, or metadata
 */
export async function searchDocuments(
  userId: string,
  query: string,
  filters?: {
    category?: string;
    tags?: string[];
    dateRange?: { start: Date; end: Date };
    fileTypes?: string[];
  }
): Promise<{
  success: boolean;
  results?: Document[];
  error?: string;
}> {
  try {
    const allDocuments = await DocumentService.getUserDocuments(userId, 1000);
    
    let filteredDocuments = allDocuments;
    
    // Apply filters
    if (filters) {
      if (filters.category) {
        filteredDocuments = filteredDocuments.filter(doc => doc.category === filters.category);
      }
      
      if (filters.tags && filters.tags.length > 0) {
        filteredDocuments = filteredDocuments.filter(doc => 
          doc.tags.some(tag => filters.tags!.includes(tag))
        );
      }
      
      if (filters.dateRange) {
        filteredDocuments = filteredDocuments.filter(doc => {
          const docDate = new Date(doc.uploadedAt.seconds * 1000);
          return docDate >= filters.dateRange!.start && docDate <= filters.dateRange!.end;
        });
      }
      
      if (filters.fileTypes && filters.fileTypes.length > 0) {
        filteredDocuments = filteredDocuments.filter(doc => 
          filters.fileTypes!.includes(doc.type)
        );
      }
    }
    
    // Search by query
    if (query.trim()) {
      const queryLower = query.toLowerCase();
      filteredDocuments = filteredDocuments.filter(doc => {
        return doc.name.toLowerCase().includes(queryLower) ||
               doc.category.toLowerCase().includes(queryLower) ||
               doc.tags.some(tag => tag.toLowerCase().includes(queryLower)) ||
               (doc.metadata.extractedText && doc.metadata.extractedText.toLowerCase().includes(queryLower));
      });
    }
    
    return {
      success: true,
      results: filteredDocuments
    };
  } catch (error: any) {
    return {
      success: false,
      error: `Search failed: ${error.message || error}`
    };
  }
}

// ================================
// UTILITY FUNCTIONS
// ================================

function getDocumentType(mimeType: string): Document['type'] {
  const typeMap: Record<string, Document['type']> = {
    // PDF files
    'application/pdf': 'PDF',
    
    // Microsoft Word documents
    'application/msword': 'DOCX',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
    
    // Microsoft Excel documents
    'application/vnd.ms-excel': 'XLSX',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'XLSX',
    
    // Microsoft PowerPoint documents
    'application/vnd.ms-powerpoint': 'DOCX', // Map to DOCX for simplicity
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'DOCX',
    
    // Text files
    'text/plain': 'TXT',
    'text/markdown': 'MD',
    'text/csv': 'TXT',
    'text/html': 'TXT',
    'text/xml': 'TXT',
    'application/json': 'TXT',
    'text/javascript': 'TXT',
    'text/css': 'TXT',
    
    // Rich Text Format
    'application/rtf': 'TXT',
    'text/rtf': 'TXT',
    
    // OpenDocument formats
    'application/vnd.oasis.opendocument.text': 'DOCX',
    'application/vnd.oasis.opendocument.spreadsheet': 'XLSX',
    'application/vnd.oasis.opendocument.presentation': 'DOCX',
    
    // Archives
    'application/zip': 'PDF', // Map to PDF for simplicity
    'application/x-rar-compressed': 'PDF',
    'application/x-7z-compressed': 'PDF',
    
    // eBooks
    'application/epub+zip': 'PDF',
    'application/x-mobipocket-ebook': 'PDF',
    
    // Code files
    'text/x-python': 'TXT',
    'text/x-java-source': 'TXT',
    'text/x-c': 'TXT',
    'text/x-c++': 'TXT',
    'application/typescript': 'TXT',
    'application/x-php': 'TXT',
    
    // Additional formats
    'application/vnd.visio': 'PDF',
    'application/x-latex': 'TXT',
  };
  
  return typeMap[mimeType] || 'TXT';
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// ================================
// DOCUMENT ANALYTICS
// ================================

/**
 * Generate document usage analytics
 */
export async function generateDocumentAnalytics(userId: string): Promise<{
  success: boolean;
  analytics?: {
    totalDocuments: number;
    totalSize: string;
    documentsByType: Record<string, number>;
    documentsByCategory: Record<string, number>;
    uploadTrend: Array<{ month: string; count: number }>;
    mostActiveCategory: string;
    averageDocumentSize: string;
    processingSuccessRate: number;
  };
  error?: string;
}> {
  try {
    const documents = await DocumentService.getUserDocuments(userId, 1000);
    
    if (documents.length === 0) {
      return {
        success: true,
        analytics: {
          totalDocuments: 0,
          totalSize: '0 B',
          documentsByType: {},
          documentsByCategory: {},
          uploadTrend: [],
          mostActiveCategory: 'none',
          averageDocumentSize: '0 B',
          processingSuccessRate: 0
        }
      };
    }
    
    // Calculate analytics
    const documentsByType: Record<string, number> = {};
    const documentsByCategory: Record<string, number> = {};
    const uploadsByMonth: Record<string, number> = {};
    let totalSizeBytes = 0;
    let processedCount = 0;
    
    documents.forEach(doc => {
      // Count by type
      documentsByType[doc.type] = (documentsByType[doc.type] || 0) + 1;
      
      // Count by category
      documentsByCategory[doc.category] = (documentsByCategory[doc.category] || 0) + 1;
      
      // Track uploads by month
      const month = new Date(doc.uploadedAt.seconds * 1000).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long' 
      });
      uploadsByMonth[month] = (uploadsByMonth[month] || 0) + 1;
      
      // Calculate total size (approximate from formatted size)
      const sizeMatch = doc.size.match(/^([\d.]+)\s*(\w+)$/);
      if (sizeMatch) {
        const [, value, unit] = sizeMatch;
        const multipliers: Record<string, number> = { B: 1, KB: 1024, MB: 1024 * 1024, GB: 1024 * 1024 * 1024 };
        totalSizeBytes += parseFloat(value) * (multipliers[unit] || 1);
      }
      
      // Count processed documents
      if (doc.status === 'processed') {
        processedCount++;
      }
    });
    
    const mostActiveCategory = Object.entries(documentsByCategory)
      .reduce((a, b) => a[1] > b[1] ? a : b, ['none', 0])[0];
    
    const uploadTrend = Object.entries(uploadsByMonth)
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());
    
    const analytics = {
      totalDocuments: documents.length,
      totalSize: formatFileSize(totalSizeBytes),
      documentsByType,
      documentsByCategory,
      uploadTrend,
      mostActiveCategory,
      averageDocumentSize: formatFileSize(totalSizeBytes / documents.length),
      processingSuccessRate: (processedCount / documents.length) * 100
    };
    
    // Save analytics
    await saveUserData(userId, 'document-analytics', analytics);
    
    return {
      success: true,
      analytics
    };
  } catch (error: any) {
    return {
      success: false,
      error: `Analytics generation failed: ${error.message || error}`
    };
  }
}

// ================================
// ADDITIONAL FUNCTIONS FOR DOCUMENTS PAGE
// ================================

/**
 * Get documents by user
 */
export async function getDocumentsByUser(userId: string): Promise<Document[]> {
  try {
    // Verify user is authenticated and requesting their own documents
    const { supabase } = await import('../auth/integrated-auth');
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      throw new Error('User authentication required to fetch documents');
    }
    
    if (session.user.id !== userId) {
      throw new Error('Permission denied: You can only access your own documents');
    }
    
    console.log('Fetching documents for authenticated user:', userId);
    return await DocumentService.getUserDocuments(userId, 1000);
  } catch (error: any) {
    throw new Error(`Failed to get user documents: ${error.message || error}`);
  }
}

/**
 * Get document by ID
 */
export async function getDocumentById(documentId: string, userId?: string): Promise<Document> {
  try {
    const document = await DocumentService.getDocument(documentId);
    
    // If userId is provided, verify ownership
    if (userId) {
      const { supabase } = await import('../auth/integrated-auth');
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user || session.user.id !== userId) {
        throw new Error('User authentication required');
      }
      
      if (document.userId !== userId) {
        throw new Error('Permission denied: You can only access your own documents');
      }
    }
    
    return document;
  } catch (error: any) {
    throw new Error(`Failed to get document: ${error.message || error}`);
  }
}

/**
 * Upload single document (simplified interface)
 */
export async function uploadDocument(file: File, userId: string): Promise<Document> {
  try {
    console.log('Starting upload for:', file.name, 'User:', userId);
    
    // Verify user is authenticated with Supabase (primary auth system)
    const { supabase } = await import('../auth/integrated-auth');
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      throw new Error('No authenticated user found. Please sign in to upload documents.');
    }
    
    if (session.user.id !== userId) {
      throw new Error('User ID does not match authenticated user. Permission denied.');
    }
    
    console.log('User authenticated successfully for document upload:', session.user.id);
    
    // Ensure user profile exists in Firestore for proper document association
    const { UserService } = await import('./firestore');
    let userProfile = await UserService.getUserProfile(userId);
    
    if (!userProfile) {
      console.log('Creating user profile in Firestore for document persistence...');
      const { IntegratedAuthService } = await import('../auth/integrated-auth');
      userProfile = await IntegratedAuthService.createFirestoreProfile(session.user);
      
      if (!userProfile) {
        throw new Error('Failed to create user profile. Cannot proceed with upload.');
      }
    }
    
    // Update user activity to ensure profile stays active
    await UserService.updateUserActivity(userId);
    
    const result = await uploadAndProcessDocument(userId, file, {
      category: 'general',
      tags: []
    }, {
      extractText: false,
      generateThumbnail: false,
      analyzeContent: false,
      autoTag: false
    });
    
    if (!result.success || !result.document) {
      console.error('Upload failed:', result.error);
      throw new Error(result.error || 'Upload failed');
    }
    
    console.log('Upload successful:', result.document.id);
    return result.document;
  } catch (error: any) {
    console.error('Document upload error:', error);
    throw new Error(`Upload failed: ${error.message || error}`);
  }
}

/**
 * Update document status
 */
export async function updateDocumentStatus(
  documentId: string, 
  status: DocumentStatus,
  metadata?: any
): Promise<void> {
  try {
    await DocumentService.updateDocumentStatus(documentId, status, metadata);
  } catch (error: any) {
    throw new Error(`Failed to update document status: ${error.message || error}`);
  }
}

/**
 * Delete document by ID and user ID
 */
export async function deleteDocument(documentId: string, userId?: string): Promise<void> {
  try {
    // Verify user is authenticated
    if (!userId) {
      throw new Error('User authentication required for document deletion');
    }
    
    const { supabase } = await import('../auth/integrated-auth');
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user || session.user.id !== userId) {
      throw new Error('User authentication failed. Permission denied.');
    }
    
    // Get document to find storage path and verify ownership
    const document = await DocumentService.getDocument(documentId);
    
    // Strictly verify user owns the document
    if (document.userId !== userId) {
      throw new Error('Permission denied: You can only delete your own documents');
    }
    
    console.log('Deleting document:', documentId, 'owned by user:', userId);
    
    // Delete from Firestore
    await DocumentService.deleteDocument(documentId);
    
    // Delete from storage (if storage URL exists)
    if (document.storageUrl) {
      try {
        await deleteFile(document.storageUrl);
        console.log('Successfully deleted storage file for document:', documentId);
      } catch (storageError) {
        console.warn('Failed to delete storage file:', storageError);
        // Don't fail the entire operation if storage delete fails
      }
    }
    
    console.log('Document deleted successfully:', documentId);
  } catch (error: any) {
    throw new Error(`Failed to delete document: ${error.message || error}`);
  }
}

// ================================
// EXPORTS
// ================================

export default {
  uploadAndProcessDocument,
  uploadDocumentBatch,
  deleteDocument: deleteDocumentLegacy,
  getDocumentDownloadUrl,
  generateDocumentSharingLink,
  organizeUserDocuments,
  searchDocuments,
  generateDocumentAnalytics,
  getDocumentsByUser,
  getDocumentById,
  uploadDocument,
  updateDocumentStatus
};