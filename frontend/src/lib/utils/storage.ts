/**
 * Supabase Storage Utilities for Engunity AI
 * Reusable functions for file upload, download, and management
 * 
 * Stack: Next.js 14 + Supabase Storage + TypeScript
 * File: frontend/src/lib/utils/storage.ts
 */

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { SupabaseClient } from '@supabase/supabase-js';

// ========================================
// TYPE DEFINITIONS
// ========================================

/** Upload operation result */
export interface UploadResult {
  success: boolean;
  url?: string;
  path?: string;
  size?: number;
  error?: string;
  metadata?: FileMetadata;
}

/** Download/URL result */
export interface UrlResult {
  success: boolean;
  url?: string;
  signedUrl?: string;
  expiresIn?: number;
  error?: string;
}

/** Delete operation result */
export interface DeleteResult {
  success: boolean;
  error?: string;
}

/** File listing result */
export interface ListResult {
  success: boolean;
  files?: FileObject[];
  folders?: string[];
  error?: string;
}

/** File metadata information */
export interface FileMetadata {
  name: string;
  size: number;
  mimeType: string;
  lastModified: number;
  etag?: string;
  cacheControl?: string;
  contentType?: string;
}

/** File object from Supabase storage */
export interface FileObject {
  name: string;
  id: string;
  updated_at: string;
  created_at: string;
  last_accessed_at: string;
  metadata: Record<string, any>;
  size?: number;
  mimetype?: string;
}

/** Upload options */
export interface UploadOptions {
  /** Whether to overwrite existing files */
  upsert?: boolean;
  /** Custom content type */
  contentType?: string;
  /** Cache control headers */
  cacheControl?: string;
  /** Generate UUID-based filename */
  generateUniqueFilename?: boolean;
  /** Custom metadata */
  metadata?: Record<string, any>;
  /** File size limit in bytes */
  maxSize?: number;
  /** Allowed file types */
  allowedTypes?: string[];
}

/** Signed URL options */
export interface SignedUrlOptions {
  /** Expiration time in seconds (default: 3600 = 1 hour) */
  expiresIn?: number;
  /** Transform options for images */
  transform?: {
    width?: number;
    height?: number;
    resize?: 'cover' | 'contain' | 'fill';
    format?: 'webp' | 'jpeg' | 'png';
    quality?: number;
  };
}

/** List options */
export interface ListOptions {
  /** Limit number of results */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
  /** Sort order */
  sortBy?: {
    column: 'name' | 'updated_at' | 'created_at' | 'size';
    order: 'asc' | 'desc';
  };
  /** Search pattern */
  search?: string;
}

// ========================================
// UTILITY FUNCTIONS
// ========================================

/**
 * Get or create Supabase client instance
 * @returns Supabase client
 */
function getSupabaseClient(): SupabaseClient {
  return createClientComponentClient();
}

/**
 * Normalize file path by removing leading/trailing slashes and ensuring proper format
 * @param path - Raw file path
 * @returns Normalized path
 * 
 * @example
 * normalizePath('/documents/file.pdf/') // 'documents/file.pdf'
 * normalizePath('//folder//file.txt') // 'folder/file.txt'
 */
export function normalizePath(path: string): string {
  return path
    .replace(/^\/+|\/+$/g, '') // Remove leading/trailing slashes
    .replace(/\/+/g, '/') // Replace multiple slashes with single slash
    .trim();
}

/**
 * Generate a unique filename with UUID prefix
 * @param originalFilename - Original filename
 * @param preserveExtension - Whether to preserve the file extension
 * @returns Unique filename
 * 
 * @example
 * generateUniqueFilename('document.pdf') // 'f47ac10b-58cc-4372-a567-0e02b2c3d479-document.pdf'
 * generateUniqueFilename('image.jpg', false) // 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
 */
export function generateUniqueFilename(
  originalFilename: string, 
  preserveExtension: boolean = true
): string {
  const uuid = crypto.randomUUID();
  
  if (!preserveExtension) {
    return uuid;
  }
  
  const extension = originalFilename.split('.').pop();
  const nameWithoutExt = originalFilename.substring(0, originalFilename.lastIndexOf('.')) || originalFilename;
  
  return extension ? `${uuid}-${nameWithoutExt}.${extension}` : `${uuid}-${originalFilename}`;
}

/**
 * Sanitize filename by removing special characters
 * @param filename - Original filename
 * @returns Sanitized filename
 * 
 * @example
 * sanitizeFilename('My Document (2024).pdf') // 'My-Document-2024.pdf'
 * sanitizeFilename('file@#$%.txt') // 'file.txt'
 */
export function sanitizeFilename(filename: string): string {
  // Replace special characters with hyphens, preserve dots for extensions
  return filename
    .replace(/[^a-zA-Z0-9.\-_]/g, '-')
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
    .toLowerCase();
}

/**
 * Get file extension from filename or MIME type
 * @param filename - Filename or MIME type
 * @returns File extension (without dot)
 * 
 * @example
 * getFileExtension('document.pdf') // 'pdf'
 * getFileExtension('application/pdf') // 'pdf'
 */
export function getFileExtension(filename: string): string {
  // Handle MIME types
  const mimeToExt: Record<string, string> = {
    'application/pdf': 'pdf',
    'application/msword': 'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'text/plain': 'txt',
    'text/markdown': 'md',
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'text/csv': 'csv',
    'application/json': 'json',
  };
  
  if (mimeToExt[filename]) {
    return mimeToExt[filename];
  }
  
  // Extract extension from filename
  const extension = filename.split('.').pop()?.toLowerCase();
  return extension || '';
}

/**
 * Validate file against size and type restrictions
 * @param file - File to validate
 * @param options - Validation options
 * @returns Validation result
 */
function validateFile(file: File, options: UploadOptions = {}): { valid: boolean; error?: string } {
  const { maxSize, allowedTypes } = options;
  
  // Check file size
  if (maxSize && file.size > maxSize) {
    const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `File size (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds limit of ${maxSizeMB}MB`
    };
  }
  
  // Check file type
  if (allowedTypes && allowedTypes.length > 0) {
    const isAllowed = allowedTypes.some(type => {
      // Support both MIME types and extensions
      return file.type === type || file.name.toLowerCase().endsWith(`.${type.toLowerCase()}`);
    });
    
    if (!isAllowed) {
      return {
        valid: false,
        error: `File type not allowed. Supported types: ${allowedTypes.join(', ')}`
      };
    }
  }
  
  return { valid: true };
}

// ========================================
// CORE STORAGE FUNCTIONS
// ========================================

/**
 * Upload a file to Supabase storage
 * 
 * @param bucket - Storage bucket name
 * @param path - File path within bucket
 * @param file - File object to upload
 * @param options - Upload options
 * @returns Upload result with URL and metadata
 * 
 * @example
 * const result = await uploadFile('documents', 'user123/report.pdf', file);
 * if (result.success) {
 *   console.log('File uploaded:', result.url);
 * }
 */
export async function uploadFile(
  bucket: string,
  path: string,
  file: File,
  options: UploadOptions = {}
): Promise<UploadResult> {
  try {
    const supabase = getSupabaseClient();
    
    // Validate file if restrictions are provided
    const validation = validateFile(file, options);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error
      };
    }
    
    // Normalize and potentially modify the path
    let finalPath = normalizePath(path);
    
    // Generate unique filename if requested
    if (options.generateUniqueFilename) {
      const directory = finalPath.includes('/') ? finalPath.substring(0, finalPath.lastIndexOf('/')) : '';
      const filename = finalPath.includes('/') ? finalPath.substring(finalPath.lastIndexOf('/') + 1) : finalPath;
      const uniqueFilename = generateUniqueFilename(filename);
      finalPath = directory ? `${directory}/${uniqueFilename}` : uniqueFilename;
    }
    
    // Prepare upload options
    const uploadOptions: any = {
      upsert: options.upsert ?? false,
      contentType: options.contentType || file.type,
      cacheControl: options.cacheControl || '3600', // 1 hour default
    };
    
    // Add metadata if provided
    if (options.metadata) {
      uploadOptions.metadata = options.metadata;
    }
    
    // Upload the file
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(finalPath, file, uploadOptions);
    
    if (error) {
      console.error('Upload error:', error);
      return {
        success: false,
        error: error.message || 'Upload failed'
      };
    }
    
    // Get public URL for the uploaded file
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(finalPath);
    
    // Prepare metadata
    const metadata: FileMetadata = {
      name: file.name,
      size: file.size,
      mimeType: file.type,
      lastModified: file.lastModified,
      contentType: options.contentType || file.type,
      cacheControl: options.cacheControl || '3600',
    };
    
    return {
      success: true,
      url: publicUrl,
      path: finalPath,
      size: file.size,
      metadata
    };
    
  } catch (error) {
    console.error('Upload exception:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown upload error'
    };
  }
}

/**
 * Get public URL for a file in storage
 * 
 * @param bucket - Storage bucket name
 * @param path - File path within bucket
 * @returns Public URL string
 * 
 * @example
 * const url = getPublicUrl('documents', 'user123/report.pdf');
 * console.log('File URL:', url);
 */
export function getPublicUrl(bucket: string, path: string): string {
  const supabase = getSupabaseClient();
  const normalizedPath = normalizePath(path);
  
  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(normalizedPath);
  
  return data.publicUrl;
}

/**
 * Get a signed URL with expiration for private files
 * 
 * @param bucket - Storage bucket name
 * @param path - File path within bucket
 * @param options - Signed URL options
 * @returns Signed URL result
 * 
 * @example
 * const result = await getSignedUrl('private-docs', 'user123/secret.pdf', { expiresIn: 3600 });
 * if (result.success) {
 *   console.log('Signed URL:', result.signedUrl);
 * }
 */
export async function getSignedUrl(
  bucket: string,
  path: string,
  options: SignedUrlOptions = {}
): Promise<UrlResult> {
  try {
    const supabase = getSupabaseClient();
    const normalizedPath = normalizePath(path);
    const expiresIn = options.expiresIn || 3600; // 1 hour default
    
    let requestOptions: any = { expiresIn };
    
    // Add transform options for images
    if (options.transform) {
      requestOptions.transform = options.transform;
    }
    
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(normalizedPath, expiresIn, requestOptions);
    
    if (error) {
      console.error('Signed URL error:', error);
      return {
        success: false,
        error: error.message || 'Failed to create signed URL'
      };
    }
    
    return {
      success: true,
      signedUrl: data.signedUrl,
      expiresIn: expiresIn
    };
    
  } catch (error) {
    console.error('Signed URL exception:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown signed URL error'
    };
  }
}

/**
 * Delete a file from storage
 * 
 * @param bucket - Storage bucket name
 * @param path - File path within bucket
 * @returns Delete operation result
 * 
 * @example
 * const result = await deleteFile('documents', 'user123/old-file.pdf');
 * if (result.success) {
 *   console.log('File deleted successfully');
 * }
 */
export async function deleteFile(bucket: string, path: string): Promise<DeleteResult> {
  try {
    const supabase = getSupabaseClient();
    const normalizedPath = normalizePath(path);
    
    const { error } = await supabase.storage
      .from(bucket)
      .remove([normalizedPath]);
    
    if (error) {
      console.error('Delete error:', error);
      return {
        success: false,
        error: error.message || 'Delete failed'
      };
    }
    
    return {
      success: true
    };
    
  } catch (error) {
    console.error('Delete exception:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown delete error'
    };
  }
}

/**
 * Delete multiple files from storage
 * 
 * @param bucket - Storage bucket name
 * @param paths - Array of file paths to delete
 * @returns Delete operation result
 * 
 * @example
 * const result = await deleteFiles('documents', ['file1.pdf', 'file2.pdf']);
 * if (result.success) {
 *   console.log('Files deleted successfully');
 * }
 */
export async function deleteFiles(bucket: string, paths: string[]): Promise<DeleteResult> {
  try {
    const supabase = getSupabaseClient();
    const normalizedPaths = paths.map(path => normalizePath(path));
    
    const { error } = await supabase.storage
      .from(bucket)
      .remove(normalizedPaths);
    
    if (error) {
      console.error('Bulk delete error:', error);
      return {
        success: false,
        error: error.message || 'Bulk delete failed'
      };
    }
    
    return {
      success: true
    };
    
  } catch (error) {
    console.error('Bulk delete exception:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown bulk delete error'
    };
  }
}

/**
 * List files in a storage bucket or folder
 * 
 * @param bucket - Storage bucket name
 * @param folder - Folder path (optional, defaults to root)
 * @param options - List options for pagination and sorting
 * @returns List of files and folders
 * 
 * @example
 * const result = await listFiles('documents', 'user123');
 * if (result.success) {
 *   console.log('Files:', result.files);
 * }
 */
export async function listFiles(
  bucket: string,
  folder: string = '',
  options: ListOptions = {}
): Promise<ListResult> {
  try {
    const supabase = getSupabaseClient();
    const normalizedFolder = folder ? normalizePath(folder) : '';
    
    const listOptions: any = {
      limit: options.limit || 100,
      offset: options.offset || 0,
    };
    
    // Add sorting if specified
    if (options.sortBy) {
      listOptions.sortBy = options.sortBy;
    }
    
    // Add search if specified
    if (options.search) {
      listOptions.search = options.search;
    }
    
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(normalizedFolder, listOptions);
    
    if (error) {
      console.error('List error:', error);
      return {
        success: false,
        error: error.message || 'Failed to list files'
      };
    }
    
    // Separate files and folders
    const files = data?.filter(item => item.metadata) || [];
    const folders = data?.filter(item => !item.metadata).map(item => item.name) || [];
    
    return {
      success: true,
      files,
      folders
    };
    
  } catch (error) {
    console.error('List exception:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown list error'
    };
  }
}

/**
 * Get file metadata information
 * 
 * @param bucket - Storage bucket name
 * @param path - File path within bucket
 * @returns File metadata or error
 * 
 * @example
 * const info = await getFileInfo('documents', 'user123/report.pdf');
 * if (info.success) {
 *   console.log('File size:', info.metadata?.size);
 * }
 */
export async function getFileInfo(bucket: string, path: string): Promise<{
  success: boolean;
  metadata?: FileObject;
  error?: string;
}> {
  try {
    const supabase = getSupabaseClient();
    const normalizedPath = normalizePath(path);
    
    // Get the folder containing the file
    const folderPath = normalizedPath.includes('/') 
      ? normalizedPath.substring(0, normalizedPath.lastIndexOf('/'))
      : '';
    const fileName = normalizedPath.includes('/')
      ? normalizedPath.substring(normalizedPath.lastIndexOf('/') + 1)
      : normalizedPath;
    
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(folderPath, {
        search: fileName
      });
    
    if (error) {
      console.error('File info error:', error);
      return {
        success: false,
        error: error.message || 'Failed to get file info'
      };
    }
    
    const fileInfo = data?.find(item => item.name === fileName);
    
    if (!fileInfo) {
      return {
        success: false,
        error: 'File not found'
      };
    }
    
    return {
      success: true,
      metadata: fileInfo
    };
    
  } catch (error) {
    console.error('File info exception:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown file info error'
    };
  }
}

// ========================================
// CONVENIENCE FUNCTIONS
// ========================================

/**
 * Upload multiple files to storage
 * 
 * @param bucket - Storage bucket name
 * @param files - Array of files with their paths
 * @param options - Upload options
 * @returns Array of upload results
 * 
 * @example
 * const results = await uploadFiles('documents', [
 *   { path: 'doc1.pdf', file: file1 },
 *   { path: 'doc2.pdf', file: file2 }
 * ]);
 */
export async function uploadFiles(
  bucket: string,
  files: Array<{ path: string; file: File }>,
  options: UploadOptions = {}
): Promise<UploadResult[]> {
  const results: UploadResult[] = [];
  
  // Upload files sequentially to avoid overwhelming the API
  for (const { path, file } of files) {
    const result = await uploadFile(bucket, path, file, options);
    results.push(result);
  }
  
  return results;
}

/**
 * Move a file from one path to another within the same bucket
 * 
 * @param bucket - Storage bucket name
 * @param fromPath - Current file path
 * @param toPath - New file path
 * @returns Move operation result
 * 
 * @example
 * const result = await moveFile('documents', 'temp/file.pdf', 'permanent/file.pdf');
 */
export async function moveFile(
  bucket: string,
  fromPath: string,
  toPath: string
): Promise<{ success: boolean; error?: string; newUrl?: string }> {
  try {
    const supabase = getSupabaseClient();
    const normalizedFromPath = normalizePath(fromPath);
    const normalizedToPath = normalizePath(toPath);
    
    const { error } = await supabase.storage
      .from(bucket)
      .move(normalizedFromPath, normalizedToPath);
    
    if (error) {
      console.error('Move error:', error);
      return {
        success: false,
        error: error.message || 'Move failed'
      };
    }
    
    // Get new public URL
    const newUrl = getPublicUrl(bucket, normalizedToPath);
    
    return {
      success: true,
      newUrl
    };
    
  } catch (error) {
    console.error('Move exception:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown move error'
    };
  }
}

/**
 * Copy a file to a new path within the same bucket
 * 
 * @param bucket - Storage bucket name
 * @param fromPath - Source file path
 * @param toPath - Destination file path
 * @returns Copy operation result
 * 
 * @example
 * const result = await copyFile('documents', 'original.pdf', 'backup/original.pdf');
 */
export async function copyFile(
  bucket: string,
  fromPath: string,
  toPath: string
): Promise<{ success: boolean; error?: string; newUrl?: string }> {
  try {
    const supabase = getSupabaseClient();
    const normalizedFromPath = normalizePath(fromPath);
    const normalizedToPath = normalizePath(toPath);
    
    const { error } = await supabase.storage
      .from(bucket)
      .copy(normalizedFromPath, normalizedToPath);
    
    if (error) {
      console.error('Copy error:', error);
      return {
        success: false,
        error: error.message || 'Copy failed'
      };
    }
    
    // Get new public URL
    const newUrl = getPublicUrl(bucket, normalizedToPath);
    
    return {
      success: true,
      newUrl
    };
    
  } catch (error) {
    console.error('Copy exception:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown copy error'
    };
  }
}

// ========================================
// BUCKET MANAGEMENT
// ========================================

/**
 * Create a new storage bucket
 * 
 * ⚠️ Note: This requires appropriate permissions and is typically done server-side
 * 
 * @param bucketName - Name of the bucket to create
 * @param options - Bucket creation options
 * @returns Creation result
 */
export async function createBucket(
  bucketName: string,
  options: {
    public?: boolean;
    allowedMimeTypes?: string[];
    fileSizeLimit?: number;
  } = {}
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getSupabaseClient();
    
    const { error } = await supabase.storage.createBucket(bucketName, {
      public: options.public ?? false,
      allowedMimeTypes: options.allowedMimeTypes,
      fileSizeLimit: options.fileSizeLimit
    });
    
    if (error) {
      console.error('Bucket creation error:', error);
      return {
        success: false,
        error: error.message || 'Failed to create bucket'
      };
    }
    
    return {
      success: true
    };
    
  } catch (error) {
    console.error('Bucket creation exception:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown bucket creation error'
    };
  }
}

// ========================================
// EXPORTED CONSTANTS
// ========================================

/** Common file type groups for validation */
export const FILE_TYPES = {
  IMAGES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
  DOCUMENTS: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  SPREADSHEETS: ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  TEXT: ['text/plain', 'text/markdown', 'text/csv'],
  CODE: ['text/javascript', 'text/typescript', 'text/html', 'text/css', 'application/json'],
  ALL_SUPPORTED: [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain', 'text/markdown', 'text/csv', 'application/json'
  ]
} as const;

/** Common file size limits */
export const FILE_SIZE_LIMITS = {
  SMALL: 1 * 1024 * 1024,      // 1MB
  MEDIUM: 10 * 1024 * 1024,    // 10MB
  LARGE: 50 * 1024 * 1024,     // 50MB
  XLARGE: 100 * 1024 * 1024,   // 100MB
} as const;

/** Default upload options for different use cases */
export const DEFAULT_UPLOAD_OPTIONS = {
  AVATAR: {
    maxSize: FILE_SIZE_LIMITS.SMALL,
    allowedTypes: FILE_TYPES.IMAGES,
    generateUniqueFilename: true,
    cacheControl: '86400' // 24 hours
  },
  DOCUMENT: {
    maxSize: FILE_SIZE_LIMITS.LARGE,
    allowedTypes: [...FILE_TYPES.DOCUMENTS, ...FILE_TYPES.TEXT],
    generateUniqueFilename: true,
    cacheControl: '3600' // 1 hour
  },
  DATA: {
    maxSize: FILE_SIZE_LIMITS.XLARGE,
    allowedTypes: [...FILE_TYPES.SPREADSHEETS, ...FILE_TYPES.TEXT],
    generateUniqueFilename: true,
    cacheControl: '3600' // 1 hour
  }
} as const;