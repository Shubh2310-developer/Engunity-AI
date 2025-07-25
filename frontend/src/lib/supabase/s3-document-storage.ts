/**
 * Supabase S3-Compatible Document Storage Service
 * Uses Supabase's S3 API for document storage with Supabase Database
 */

import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { supabase } from '@/lib/auth/integrated-auth';

// ================================
// S3 CONFIGURATION
// ================================

const S3_CONFIG = {
  accessKeyId: process.env.SUPABASE_S3_ACCESS_KEY_ID || '4053573032b11a6796da9183cfab3066',
  secretAccessKey: process.env.SUPABASE_S3_SECRET_ACCESS_KEY || 'ebb970b4417c479254ba885f9c8aa0c03d51ea825d41a4a3085fa072edbcb93c',
  endpoint: process.env.SUPABASE_S3_ENDPOINT || 'https://zsevvvaakunsspxpplbh.supabase.co/storage/v1/s3',
  region: process.env.SUPABASE_S3_REGION || 'us-east-1', // Required for S3 client
  forcePathStyle: true, // Required for S3-compatible APIs
};

// Initialize S3 client
const s3Client = new S3Client({
  region: S3_CONFIG.region,
  endpoint: S3_CONFIG.endpoint,
  credentials: {
    accessKeyId: S3_CONFIG.accessKeyId,
    secretAccessKey: S3_CONFIG.secretAccessKey,
  },
  forcePathStyle: S3_CONFIG.forcePathStyle,
});

// ================================
// TYPE DEFINITIONS
// ================================

export interface SupabaseDocument {
  id: string;
  user_id: string;
  name: string;
  type: string;
  size: string;
  category: string;
  status: 'uploading' | 'processing' | 'processed' | 'failed';
  uploaded_at: string;
  processed_at?: string;
  storage_url: string;
  s3_key: string; // S3 object key
  metadata: {
    pages?: number;
    word_count?: number;
    language?: string;
    extracted_text?: string;
  };
  tags: string[];
}

// ================================
// S3 UTILITY FUNCTIONS
// ================================

/**
 * Generate S3 object key for document
 */
function generateS3Key(userId: string, filename: string): string {
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(2, 8);
  const fileExtension = filename.split('.').pop();
  const baseName = filename.substring(0, filename.lastIndexOf('.')) || filename;
  const uniqueFilename = `${timestamp}_${randomId}_${baseName}.${fileExtension}`;
  
  return `documents/${userId}/${uniqueFilename}`;
}

/**
 * Get public URL for S3 object
 */
function getS3PublicUrl(s3Key: string): string {
  // Construct public URL using Supabase storage format
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zsevvvaakunsspxpplbh.supabase.co';
  const baseUrl = `${supabaseUrl}/storage/v1/object/public`;
  return `${baseUrl}/documents/${s3Key.replace('documents/', '')}`;
}

// ================================
// DOCUMENT UPLOAD & PROCESSING
// ================================

/**
 * Upload document to S3 and create database record
 */
export async function uploadDocument(file: File, userId: string): Promise<SupabaseDocument> {
  try {
    console.log('Starting S3 upload for:', file.name, 'User:', userId);
    
    // Verify user is authenticated via Supabase
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      throw new Error('No authenticated user found. Please sign in to upload documents.');
    }
    
    if (session.user.id !== userId) {
      throw new Error('User ID does not match authenticated user.');
    }
    
    console.log('Supabase user authenticated successfully:', session.user.id);
    
    // Generate S3 key
    const s3Key = generateS3Key(userId, file.name);
    console.log('Generated S3 key:', s3Key);
    
    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Upload to S3
    console.log('Uploading to S3...');
    const uploadCommand = new PutObjectCommand({
      Bucket: 'documents', // Supabase bucket name
      Key: s3Key,
      Body: buffer,
      ContentType: file.type,
      ContentLength: file.size,
      Metadata: {
        'original-name': file.name,
        'user-id': userId,
        'upload-time': new Date().toISOString(),
      },
    });
    
    await s3Client.send(uploadCommand);
    console.log('S3 upload successful');
    
    // Generate public URL
    const publicUrl = getS3PublicUrl(s3Key);
    console.log('Document public URL:', publicUrl);
    
    // Create document record in Supabase database
    const documentData = {
      user_id: userId,
      name: file.name,
      type: getDocumentType(file.type),
      size: formatFileSize(file.size),
      category: 'general',
      status: 'processed' as const, // Skip processing for now
      uploaded_at: new Date().toISOString(),
      processed_at: new Date().toISOString(),
      storage_url: publicUrl,
      s3_key: s3Key,
      metadata: {
        pages: 0,
        word_count: 0,
        language: 'en'
      },
      tags: []
    };
    
    // Insert document into database
    const { data: dbData, error: dbError } = await supabase
      .from('documents')
      .insert(documentData)
      .select()
      .single();
    
    if (dbError) {
      console.error('Database insert error:', dbError);
      console.error('Database error details:', {
        code: dbError.code,
        message: dbError.message,
        details: dbError.details,
        hint: dbError.hint
      });
      
      // Try to clean up uploaded S3 file
      try {
        const deleteCommand = new DeleteObjectCommand({
          Bucket: 'documents',
          Key: s3Key,
        });
        await s3Client.send(deleteCommand);
        console.log('Cleaned up S3 file after database error');
      } catch (cleanupError) {
        console.warn('Failed to cleanup S3 file:', cleanupError);
      }
      
      // Provide helpful error messages
      if (dbError.code === '42P01') {
        throw new Error('Documents table does not exist. Please run the database setup script.');
      } else if (dbError.code === '23503') {
        throw new Error('User authentication error. Please sign in again.');
      } else {
        throw new Error(`Database error: ${dbError.message}`);
      }
    }
    
    console.log('Document record created successfully:', dbData.id);
    
    const finalDocument: SupabaseDocument = {
      id: dbData.id,
      user_id: dbData.user_id,
      name: dbData.name,
      type: dbData.type,
      size: dbData.size,
      category: dbData.category,
      status: dbData.status,
      uploaded_at: dbData.uploaded_at,
      processed_at: dbData.processed_at,
      storage_url: dbData.storage_url,
      s3_key: dbData.s3_key,
      metadata: dbData.metadata,
      tags: dbData.tags
    };
    
    return finalDocument;
    
  } catch (error: any) {
    console.error('S3 document upload error:', error);
    throw new Error(`Upload failed: ${error.message || error}`);
  }
}

// ================================
// DOCUMENT MANAGEMENT
// ================================

/**
 * Get documents by user
 */
export async function getDocumentsByUser(userId: string): Promise<SupabaseDocument[]> {
  try {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('user_id', userId)
      .order('uploaded_at', { ascending: false });
    
    if (error) {
      throw new Error(`Failed to fetch documents: ${error.message}`);
    }
    
    return data || [];
  } catch (error: any) {
    throw new Error(`Failed to get user documents: ${error.message || error}`);
  }
}

/**
 * Get document by ID
 */
export async function getDocumentById(documentId: string): Promise<SupabaseDocument> {
  try {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single();
    
    if (error) {
      throw new Error(`Failed to fetch document: ${error.message}`);
    }
    
    return data;
  } catch (error: any) {
    throw new Error(`Failed to get document: ${error.message || error}`);
  }
}

/**
 * Delete document by ID
 */
export async function deleteDocument(documentId: string, userId?: string): Promise<void> {
  try {
    // Get document to find S3 key
    const document = await getDocumentById(documentId);
    
    // Verify user owns the document
    if (userId && document.user_id !== userId) {
      throw new Error('Permission denied');
    }
    
    // Delete from Supabase database
    const { error: dbError } = await supabase
      .from('documents')
      .delete()
      .eq('id', documentId);
    
    if (dbError) {
      throw new Error(`Database delete failed: ${dbError.message}`);
    }
    
    // Delete from S3
    if (document.s3_key) {
      try {
        const deleteCommand = new DeleteObjectCommand({
          Bucket: 'documents',
          Key: document.s3_key,
        });
        
        await s3Client.send(deleteCommand);
        console.log('S3 file deleted successfully:', document.s3_key);
      } catch (s3Error) {
        console.warn('Failed to delete S3 file:', s3Error);
        // Don't fail the entire operation if S3 delete fails
      }
    }
  } catch (error: any) {
    throw new Error(`Failed to delete document: ${error.message || error}`);
  }
}

/**
 * Update document status
 */
export async function updateDocumentStatus(
  documentId: string, 
  status: 'uploading' | 'processing' | 'processed' | 'failed',
  metadata?: any
): Promise<void> {
  try {
    const updates: any = { status };
    
    if (status === 'processed') {
      updates.processed_at = new Date().toISOString();
    }
    
    if (metadata) {
      updates.metadata = metadata;
    }
    
    const { error } = await supabase
      .from('documents')
      .update(updates)
      .eq('id', documentId);
    
    if (error) {
      throw new Error(`Failed to update document status: ${error.message}`);
    }
  } catch (error: any) {
    throw new Error(`Failed to update document status: ${error.message || error}`);
  }
}

/**
 * Get signed URL for private document access
 */
export async function getDocumentSignedUrl(s3Key: string, expiresIn: number = 3600): Promise<string> {
  try {
    const command = new GetObjectCommand({
      Bucket: 'documents',
      Key: s3Key,
    });
    
    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn });
    return signedUrl;
  } catch (error: any) {
    throw new Error(`Failed to generate signed URL: ${error.message || error}`);
  }
}

// ================================
// UTILITY FUNCTIONS
// ================================

function getDocumentType(mimeType: string): string {
  const typeMap: Record<string, string> = {
    // PDF files
    'application/pdf': 'PDF',
    
    // Microsoft Word documents
    'application/msword': 'DOCX',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
    
    // Microsoft Excel documents
    'application/vnd.ms-excel': 'XLSX',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'XLSX',
    
    // Microsoft PowerPoint documents
    'application/vnd.ms-powerpoint': 'PPTX',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PPTX',
    
    // Text files
    'text/plain': 'TXT',
    'text/markdown': 'MD',
    'text/csv': 'CSV',
    'text/html': 'HTML',
    'text/xml': 'XML',
    'application/json': 'JSON',
    
    // Rich Text Format
    'application/rtf': 'RTF',
    'text/rtf': 'RTF',
    
    // OpenDocument formats
    'application/vnd.oasis.opendocument.text': 'ODT',
    'application/vnd.oasis.opendocument.spreadsheet': 'ODS',
    'application/vnd.oasis.opendocument.presentation': 'ODP',
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
// EXPORTS
// ================================

export default {
  uploadDocument,
  getDocumentsByUser,
  getDocumentById,
  deleteDocument,
  updateDocumentStatus,
  getDocumentSignedUrl
};