/**
 * Firebase Storage Service for Engunity AI
 * Handles file uploads, downloads, and management for chats, documents, and user data
 */

import {
  ref,
  uploadBytes,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  listAll,
  getMetadata,
  updateMetadata,
  UploadResult,
  UploadTask,
  StorageReference,
  FullMetadata
} from 'firebase/storage';
import { storage, auth } from './config';

// ================================
// TYPE DEFINITIONS
// ================================

export interface FileUploadResult {
  success: boolean;
  url?: string;
  path?: string;
  size?: number;
  error?: string;
  metadata?: FullMetadata;
}

export interface FileUploadOptions {
  /** Custom metadata */
  customMetadata?: Record<string, string>;
  /** Content type override */
  contentType?: string;
  /** Cache control headers */
  cacheControl?: string;
  /** Generate unique filename */
  generateUniqueFilename?: boolean;
  /** Progress callback for resumable uploads */
  onProgress?: (progress: number) => void;
  /** Completion callback */
  onComplete?: (result: FileUploadResult) => void;
  /** Error callback */
  onError?: (error: string) => void;
}

export interface ChatMessage {
  id: string;
  content: string;
  timestamp: Date;
  attachments?: FileAttachment[];
}

export interface FileAttachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  path: string;
}

export interface DocumentMetadata {
  userId: string;
  uploadedAt: Date;
  processedAt?: Date;
  category: string;
  tags: string[];
  extractedText?: string;
  pages?: number;
  wordCount?: number;
}

// ================================
// STORAGE PATHS CONFIGURATION
// ================================

export const STORAGE_PATHS = {
  AVATARS: 'avatars',
  CHAT_ATTACHMENTS: 'chat-attachments',
  DOCUMENTS: 'documents',
  CHAT_EXPORTS: 'chat-exports',
  TEMP_UPLOADS: 'temp-uploads',
  USER_DATA: 'user-data'
} as const;

// ================================
// UTILITY FUNCTIONS
// ================================

/**
 * Generate a unique filename with timestamp
 */
function generateUniqueFilename(originalName: string): string {
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(2, 8);
  const extension = originalName.split('.').pop();
  const nameWithoutExt = originalName.substring(0, originalName.lastIndexOf('.')) || originalName;
  
  return extension 
    ? `${timestamp}_${randomId}_${nameWithoutExt}.${extension}`
    : `${timestamp}_${randomId}_${originalName}`;
}

/**
 * Sanitize path for Firebase storage
 */
function sanitizePath(path: string): string {
  return path
    .replace(/[^a-zA-Z0-9.\-_/]/g, '_')
    .replace(/\/+/g, '/')
    .replace(/^\/|\/$/g, '');
}

/**
 * Get file extension from filename
 */
function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || '';
}

/**
 * Validate file type and size
 */
function validateFile(file: File, allowedTypes?: string[], maxSize?: number): { valid: boolean; error?: string } {
  // Check file size (default 50MB limit)
  const sizeLimit = maxSize || 50 * 1024 * 1024;
  if (file.size > sizeLimit) {
    const limitMB = (sizeLimit / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `File size (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds limit of ${limitMB}MB`
    };
  }

  // Check file type
  if (allowedTypes && allowedTypes.length > 0) {
    const fileType = file.type;
    const extension = getFileExtension(file.name);
    
    const isAllowed = allowedTypes.some(type => 
      fileType === type || 
      type.includes(extension) ||
      fileType.startsWith(type.split('/')[0] + '/')
    );

    if (!isAllowed) {
      return {
        valid: false,
        error: `File type not allowed. Supported types: ${allowedTypes.join(', ')}`
      };
    }
  }

  return { valid: true };
}

// ================================
// CORE UPLOAD FUNCTIONS
// ================================

/**
 * Upload file to Firebase Storage with progress tracking
 */
export async function uploadFile(
  path: string,
  file: File,
  options: FileUploadOptions = {}
): Promise<FileUploadResult> {
  try {
    console.log('Upload attempt - Storage config:', {
      bucket: storage.app.options.storageBucket,
      projectId: storage.app.options.projectId,
      currentUser: auth.currentUser?.uid
    });

    // Check if user is authenticated (Supabase user should be signed into Firebase too)
    if (!auth.currentUser) {
      console.warn('No Firebase authenticated user found for upload');
      // Try to get Supabase user and sign them into Firebase
      const { supabase } = await import('../auth/integrated-auth');
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        console.log('Found Supabase user, but no Firebase user:', session.user.id);
        // TODO: Implement Firebase custom auth with Supabase token
        // For now, we'll proceed without Firebase auth but the upload will likely fail
        console.warn('Upload may fail due to Firebase Storage authentication requirements');
      } else {
        console.warn('No Supabase user found either');
      }
    }

    // Generate unique filename if requested
    let finalPath = sanitizePath(path);
    if (options.generateUniqueFilename) {
      const directory = finalPath.includes('/') ? finalPath.substring(0, finalPath.lastIndexOf('/')) : '';
      const filename = finalPath.includes('/') ? finalPath.substring(finalPath.lastIndexOf('/') + 1) : finalPath;
      const uniqueFilename = generateUniqueFilename(filename);
      finalPath = directory ? `${directory}/${uniqueFilename}` : uniqueFilename;
    }

    console.log('Final upload path:', finalPath);

    // Create storage reference
    const storageRef = ref(storage, finalPath);
    console.log('Storage reference created:', storageRef.fullPath);

    // Prepare metadata
    const metadata: any = {
      contentType: options.contentType || file.type,
      cacheControl: options.cacheControl || 'public, max-age=3600',
      customMetadata: {
        originalName: file.name,
        uploadedAt: new Date().toISOString(),
        ...options.customMetadata
      }
    };

    let uploadTask: UploadTask;
    let uploadResult: UploadResult;

    // Use resumable upload for larger files or when progress tracking is needed
    // Temporarily disable resumable upload to test basic functionality
    if (false && (file.size > 1024 * 1024 || options.onProgress)) { // 1MB threshold
      console.log('Starting resumable upload for file:', file.name, 'Size:', file.size);
      uploadTask = uploadBytesResumable(storageRef, file, metadata);

      return new Promise((resolve) => {
        uploadTask.on('state_changed',
          // Progress callback
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            console.log('Upload progress:', Math.round(progress) + '%');
            options.onProgress?.(progress);
          },
          // Error callback
          (error) => {
            const errorMessage = `Upload failed: ${error.message}`;
            console.error('Firebase upload error details:', {
              code: error.code,
              message: error.message,
              serverResponse: error.serverResponse,
              status: error.status_,
              customData: error.customData
            });
            options.onError?.(errorMessage);
            resolve({
              success: false,
              error: errorMessage
            });
          },
          // Complete callback
          async () => {
            try {
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              const metadata = await getMetadata(uploadTask.snapshot.ref);
              
              const result: FileUploadResult = {
                success: true,
                url: downloadURL,
                path: finalPath,
                size: file.size,
                metadata
              };

              options.onComplete?.(result);
              resolve(result);
            } catch (error) {
              const errorMessage = `Failed to get download URL: ${error}`;
              options.onError?.(errorMessage);
              resolve({
                success: false,
                error: errorMessage
              });
            }
          }
        );
      });
    } else {
      // Simple upload for smaller files
      console.log('Using simple upload for file:', file.name);
      try {
        uploadResult = await uploadBytes(storageRef, file, metadata);
        console.log('Upload bytes completed successfully');
        
        const downloadURL = await getDownloadURL(uploadResult.ref);
        console.log('Got download URL:', downloadURL);
        
        const fileMetadata = await getMetadata(uploadResult.ref);
        console.log('Got file metadata');

        const result: FileUploadResult = {
          success: true,
          url: downloadURL,
          path: finalPath,
          size: file.size,
          metadata: fileMetadata
        };

        options.onComplete?.(result);
        return result;
      } catch (uploadError: any) {
        console.error('Simple upload error:', {
          code: uploadError.code,
          message: uploadError.message,
          serverResponse: uploadError.serverResponse,
          status: uploadError.status_,
          customData: uploadError.customData
        });
        throw uploadError; // Re-throw to be caught by outer try-catch
      }
    }

  } catch (error: any) {
    const errorMessage = `Upload error: ${error.message || error}`;
    options.onError?.(errorMessage);
    return {
      success: false,
      error: errorMessage
    };
  }
}

// ================================
// SPECIALIZED UPLOAD FUNCTIONS
// ================================

/**
 * Upload user avatar image
 */
export async function uploadAvatar(
  userId: string,
  file: File,
  options: FileUploadOptions = {}
): Promise<FileUploadResult> {
  // Validate image file
  const validation = validateFile(file, ['image/jpeg', 'image/png', 'image/gif', 'image/webp'], 2 * 1024 * 1024);
  if (!validation.valid) {
    return {
      success: false,
      error: validation.error
    };
  }

  const path = `${STORAGE_PATHS.AVATARS}/${userId}`;
  return uploadFile(path, file, {
    ...options,
    generateUniqueFilename: true,
    customMetadata: {
      type: 'avatar',
      userId,
      ...options.customMetadata
    }
  });
}

/**
 * Upload document file
 */
export async function uploadDocument(
  userId: string,
  file: File,
  metadata: Partial<DocumentMetadata> = {},
  options: FileUploadOptions = {}
): Promise<FileUploadResult> {
  // Validate document file - supporting comprehensive document types
  const allowedTypes = [
    // PDF files
    'application/pdf',
    
    // Microsoft Office documents
    'application/msword', // .doc
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    'application/vnd.ms-excel', // .xls
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-powerpoint', // .ppt
    'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
    
    // Text files
    'text/plain', // .txt
    'text/markdown', // .md
    'text/csv', // .csv
    'text/html', // .html
    'text/xml', // .xml
    'application/json', // .json
    'text/javascript', // .js
    'text/css', // .css
    
    // Rich Text Format
    'application/rtf', // .rtf
    'text/rtf', // .rtf
    
    // OpenDocument formats
    'application/vnd.oasis.opendocument.text', // .odt
    'application/vnd.oasis.opendocument.spreadsheet', // .ods
    'application/vnd.oasis.opendocument.presentation', // .odp
    
    // Archives (for document packages)
    'application/zip',
    'application/x-rar-compressed',
    'application/x-7z-compressed',
    
    // eBooks
    'application/epub+zip', // .epub
    'application/x-mobipocket-ebook', // .mobi
    
    // Code files
    'text/x-python', // .py
    'text/x-java-source', // .java
    'text/x-c', // .c
    'text/x-c++', // .cpp
    'application/typescript', // .ts
    'application/x-php', // .php
    
    // Additional formats
    'application/vnd.visio', // .vsd
    'application/x-latex', // .tex
  ];
  const validation = validateFile(file, allowedTypes, 50 * 1024 * 1024);
  if (!validation.valid) {
    return {
      success: false,
      error: validation.error
    };
  }

  const path = `${STORAGE_PATHS.DOCUMENTS}/${userId}/${file.name}`;
  return uploadFile(path, file, {
    ...options,
    generateUniqueFilename: true,
    customMetadata: {
      type: 'document',
      userId,
      category: metadata.category || 'general',
      tags: JSON.stringify(metadata.tags || []),
      uploadedAt: new Date().toISOString(),
      ...options.customMetadata
    }
  });
}

/**
 * Upload chat attachment
 */
export async function uploadChatAttachment(
  userId: string,
  chatId: string,
  file: File,
  options: FileUploadOptions = {}
): Promise<FileUploadResult> {
  // More permissive validation for chat attachments
  const validation = validateFile(file, undefined, 25 * 1024 * 1024); // 25MB limit
  if (!validation.valid) {
    return {
      success: false,
      error: validation.error
    };
  }

  const path = `${STORAGE_PATHS.CHAT_ATTACHMENTS}/${userId}/${chatId}/${file.name}`;
  return uploadFile(path, file, {
    ...options,
    generateUniqueFilename: true,
    customMetadata: {
      type: 'chat-attachment',
      userId,
      chatId,
      ...options.customMetadata
    }
  });
}

// ================================
// CHAT EXPORT FUNCTIONS
// ================================

/**
 * Export chat session to Firebase Storage
 */
export async function exportChatSession(
  userId: string,
  chatId: string,
  chatData: any,
  format: 'json' | 'txt' | 'md' = 'json'
): Promise<FileUploadResult> {
  try {
    let content: string;
    let contentType: string;
    let filename: string;

    switch (format) {
      case 'json':
        content = JSON.stringify(chatData, null, 2);
        contentType = 'application/json';
        filename = `chat_${chatId}_${Date.now()}.json`;
        break;
      case 'txt':
        content = chatData.messages?.map((msg: any) => 
          `[${msg.timestamp}] ${msg.role}: ${msg.content}`
        ).join('\n\n') || '';
        contentType = 'text/plain';
        filename = `chat_${chatId}_${Date.now()}.txt`;
        break;
      case 'md':
        content = `# Chat Session: ${chatData.title || 'Untitled'}\n\n` +
          chatData.messages?.map((msg: any) => 
            `## ${msg.role === 'user' ? 'You' : 'Assistant'}\n\n${msg.content}\n\n---\n`
          ).join('\n') || '';
        contentType = 'text/markdown';
        filename = `chat_${chatId}_${Date.now()}.md`;
        break;
    }

    // Create a blob from the content
    const blob = new Blob([content], { type: contentType });
    const file = new File([blob], filename, { type: contentType });

    const path = `${STORAGE_PATHS.CHAT_EXPORTS}/${userId}/${filename}`;
    return uploadFile(path, file, {
      contentType,
      customMetadata: {
        type: 'chat-export',
        userId,
        chatId,
        format,
        exportedAt: new Date().toISOString()
      }
    });

  } catch (error: any) {
    return {
      success: false,
      error: `Export failed: ${error.message || error}`
    };
  }
}

// ================================
// FILE MANAGEMENT FUNCTIONS
// ================================

/**
 * Delete file from Firebase Storage
 */
export async function deleteFile(path: string): Promise<{ success: boolean; error?: string }> {
  try {
    const fileRef = ref(storage, sanitizePath(path));
    await deleteObject(fileRef);
    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      error: `Delete failed: ${error.message || error}`
    };
  }
}

/**
 * Get file download URL
 */
export async function getFileURL(path: string): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const fileRef = ref(storage, sanitizePath(path));
    const url = await getDownloadURL(fileRef);
    return { success: true, url };
  } catch (error: any) {
    return {
      success: false,
      error: `Failed to get URL: ${error.message || error}`
    };
  }
}

/**
 * List files in a directory
 */
export async function listFiles(path: string): Promise<{
  success: boolean;
  files?: { name: string; path: string; url: string }[];
  error?: string;
}> {
  try {
    const dirRef = ref(storage, sanitizePath(path));
    const result = await listAll(dirRef);
    
    const files = await Promise.all(
      result.items.map(async (itemRef) => {
        const url = await getDownloadURL(itemRef);
        return {
          name: itemRef.name,
          path: itemRef.fullPath,
          url
        };
      })
    );

    return { success: true, files };
  } catch (error: any) {
    return {
      success: false,
      error: `List failed: ${error.message || error}`
    };
  }
}

/**
 * Get file metadata
 */
export async function getFileMetadata(path: string): Promise<{
  success: boolean;
  metadata?: FullMetadata;
  error?: string;
}> {
  try {
    const fileRef = ref(storage, sanitizePath(path));
    const metadata = await getMetadata(fileRef);
    return { success: true, metadata };
  } catch (error: any) {
    return {
      success: false,
      error: `Failed to get metadata: ${error.message || error}`
    };
  }
}

// ================================
// BATCH OPERATIONS
// ================================

/**
 * Upload multiple files
 */
export async function uploadMultipleFiles(
  files: Array<{ path: string; file: File; options?: FileUploadOptions }>,
  onProgress?: (completed: number, total: number) => void
): Promise<FileUploadResult[]> {
  const results: FileUploadResult[] = [];
  let completed = 0;

  for (const { path, file, options } of files) {
    const result = await uploadFile(path, file, options);
    results.push(result);
    completed++;
    onProgress?.(completed, files.length);
  }

  return results;
}

/**
 * Delete multiple files
 */
export async function deleteMultipleFiles(paths: string[]): Promise<{
  success: boolean;
  results: Array<{ path: string; success: boolean; error?: string }>;
}> {
  const results = await Promise.all(
    paths.map(async (path) => {
      const result = await deleteFile(path);
      return { path, ...result };
    })
  );

  const success = results.every(result => result.success);
  return { success, results };
}

// ================================
// USER DATA MANAGEMENT
// ================================

/**
 * Save user data as JSON to Firebase Storage
 */
export async function saveUserData(
  userId: string,
  dataType: string,
  data: any
): Promise<FileUploadResult> {
  try {
    const content = JSON.stringify(data, null, 2);
    const blob = new Blob([content], { type: 'application/json' });
    const filename = `${dataType}_${Date.now()}.json`;
    const file = new File([blob], filename, { type: 'application/json' });

    const path = `${STORAGE_PATHS.USER_DATA}/${userId}/${filename}`;
    return uploadFile(path, file, {
      contentType: 'application/json',
      customMetadata: {
        type: 'user-data',
        dataType,
        userId,
        savedAt: new Date().toISOString()
      }
    });
  } catch (error: any) {
    return {
      success: false,
      error: `Save user data failed: ${error.message || error}`
    };
  }
}

/**
 * Load user data from Firebase Storage
 */
export async function loadUserData(path: string): Promise<{
  success: boolean;
  data?: any;
  error?: string;
}> {
  try {
    const { success, url, error } = await getFileURL(path);
    if (!success || !url) {
      return { success: false, error };
    }

    const response = await fetch(url);
    if (!response.ok) {
      return { success: false, error: 'Failed to fetch data' };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error: any) {
    return {
      success: false,
      error: `Load user data failed: ${error.message || error}`
    };
  }
}

// ================================
// CLEANUP FUNCTIONS
// ================================

/**
 * Clean up temporary files older than specified hours
 */
export async function cleanupTempFiles(userId: string, olderThanHours: number = 24): Promise<{
  success: boolean;
  deletedCount: number;
  error?: string;
}> {
  try {
    const tempPath = `${STORAGE_PATHS.TEMP_UPLOADS}/${userId}`;
    const { success, files, error } = await listFiles(tempPath);
    
    if (!success || !files) {
      return { success: false, deletedCount: 0, error };
    }

    const cutoffTime = Date.now() - (olderThanHours * 60 * 60 * 1000);
    const filesToDelete = [];

    for (const file of files) {
      const { success: metaSuccess, metadata } = await getFileMetadata(file.path);
      if (metaSuccess && metadata?.timeCreated) {
        const fileTime = new Date(metadata.timeCreated).getTime();
        if (fileTime < cutoffTime) {
          filesToDelete.push(file.path);
        }
      }
    }

    if (filesToDelete.length > 0) {
      const { success: deleteSuccess } = await deleteMultipleFiles(filesToDelete);
      return {
        success: deleteSuccess,
        deletedCount: filesToDelete.length
      };
    }

    return { success: true, deletedCount: 0 };
  } catch (error: any) {
    return {
      success: false,
      deletedCount: 0,
      error: `Cleanup failed: ${error.message || error}`
    };
  }
}

// ================================
// CONSTANTS & CONFIGURATION
// ================================

export const FILE_TYPE_CONFIGS = {
  AVATAR: {
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    maxSize: 2 * 1024 * 1024, // 2MB
    path: STORAGE_PATHS.AVATARS
  },
  DOCUMENT: {
    allowedTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/markdown',
      'text/csv'
    ],
    maxSize: 50 * 1024 * 1024, // 50MB
    path: STORAGE_PATHS.DOCUMENTS
  },
  CHAT_ATTACHMENT: {
    allowedTypes: [], // No restrictions for chat attachments
    maxSize: 25 * 1024 * 1024, // 25MB
    path: STORAGE_PATHS.CHAT_ATTACHMENTS
  }
} as const;

export default {
  uploadFile,
  uploadAvatar,
  uploadDocument,
  uploadChatAttachment,
  exportChatSession,
  deleteFile,
  getFileURL,
  listFiles,
  getFileMetadata,
  uploadMultipleFiles,
  deleteMultipleFiles,
  saveUserData,
  loadUserData,
  cleanupTempFiles,
  STORAGE_PATHS,
  FILE_TYPE_CONFIGS
};