/**
 * Supabase Document Storage Service - No Authentication Required
 * Uses Supabase Storage + Database without user authentication
 */

import { createClient } from '@supabase/supabase-js';

// ================================
// SUPABASE CLIENT SETUP
// ================================

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zsevvvaakunsspxpplbh.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Create Supabase client with service role key for bypassing RLS
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
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
  metadata: {
    pages?: number;
    word_count?: number;
    language?: string;
    extracted_text?: string;
  };
  tags: string[];
}

// ================================
// DOCUMENT UPLOAD & PROCESSING
// ================================

/**
 * Upload document without authentication requirements
 */
export async function uploadDocumentNoAuth(file: File, userId: string): Promise<SupabaseDocument> {
  try {
    console.log('Starting Supabase upload (no auth) for:', file.name, 'User:', userId);
    
    // Generate unique filename
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 8);
    const fileExtension = file.name.split('.').pop();
    const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
    const uniqueFilename = `${timestamp}_${randomId}_${baseName}.${fileExtension}`;
    const storagePath = `documents/${userId}/${uniqueFilename}`;
    
    console.log('Uploading to Supabase Storage path:', storagePath);
    
    // Upload file to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('documents')
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false
      });
    
    if (uploadError) {
      console.error('Supabase Storage upload error:', uploadError);
      throw new Error(`Upload failed: ${uploadError.message}`);
    }
    
    console.log('Supabase Storage upload successful:', uploadData.path);
    
    // Get public URL for the uploaded file
    const { data: urlData } = supabase.storage
      .from('documents')
      .getPublicUrl(storagePath);
    
    const publicUrl = urlData.publicUrl;
    console.log('Document public URL:', publicUrl);
    
    // Create document record in Supabase database
    const documentData = {
      user_id: userId,
      name: file.name,
      type: getDocumentType(file.type),
      size: formatFileSize(file.size),
      category: 'general',
      status: 'processed' as const,
      uploaded_at: new Date().toISOString(),
      processed_at: new Date().toISOString(),
      storage_url: publicUrl,
      metadata: {
        pages: 0,
        word_count: 0,
        language: 'en'
      },
      tags: []
    };
    
    // Insert document into database using service role (bypasses RLS)
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
      
      // Try to clean up uploaded file
      try {
        await supabase.storage.from('documents').remove([storagePath]);
        console.log('Cleaned up uploaded file after database error');
      } catch (cleanupError) {
        console.warn('Failed to cleanup uploaded file:', cleanupError);
      }
      
      // Provide helpful error messages
      if (dbError.code === '42P01') {
        throw new Error('Documents table does not exist. Please run the database setup script.');
      } else if (dbError.code === '23503') {
        throw new Error('Database constraint error. Please check your database schema.');
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
      metadata: dbData.metadata,
      tags: dbData.tags
    };
    
    return finalDocument;
    
  } catch (error: any) {
    console.error('Supabase document upload error (no auth):', error);
    throw new Error(`Upload failed: ${error.message || error}`);
  }
}

// ================================
// DOCUMENT MANAGEMENT
// ================================

/**
 * Get documents by user (no auth required)
 */
export async function getDocumentsByUserNoAuth(userId: string): Promise<SupabaseDocument[]> {
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
 * Get document by ID (no auth required)
 */
export async function getDocumentByIdNoAuth(documentId: string): Promise<SupabaseDocument> {
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
 * Delete document by ID (no auth required)
 */
export async function deleteDocumentNoAuth(documentId: string): Promise<void> {
  try {
    // Get document to find storage path
    const document = await getDocumentByIdNoAuth(documentId);
    
    // Delete from Supabase database
    const { error: dbError } = await supabase
      .from('documents')
      .delete()
      .eq('id', documentId);
    
    if (dbError) {
      throw new Error(`Database delete failed: ${dbError.message}`);
    }
    
    // Delete from Supabase Storage
    if (document.storage_url) {
      try {
        // Extract path from URL
        const url = new URL(document.storage_url);
        const pathParts = url.pathname.split('/');
        const storagePath = pathParts.slice(pathParts.findIndex(p => p === 'documents')).join('/');
        
        const { error: storageError } = await supabase.storage
          .from('documents')
          .remove([storagePath]);
        
        if (storageError) {
          console.warn('Failed to delete storage file:', storageError);
          // Don't fail the entire operation if storage delete fails
        }
      } catch (storageError) {
        console.warn('Failed to delete storage file:', storageError);
      }
    }
  } catch (error: any) {
    throw new Error(`Failed to delete document: ${error.message || error}`);
  }
}

/**
 * Update document status (no auth required)
 */
export async function updateDocumentStatusNoAuth(
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
  uploadDocumentNoAuth,
  getDocumentsByUserNoAuth,
  getDocumentByIdNoAuth,
  deleteDocumentNoAuth,
  updateDocumentStatusNoAuth
};