'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { SimpleDocument, SimpleDocumentStatus } from '@/types/simple-document';
import { supabase } from '@/lib/auth/supabase';
import { useToast } from '@/components/ui/use-toast';

interface DocumentsState {
  documents: SimpleDocument[];
  loading: boolean;
  error: string | null;
  uploading: string[];
}

export function useDocuments() {
  const { user } = useAuth();
  const { error: showError, success: showSuccess } = useToast();
  
  const [state, setState] = useState<DocumentsState>({
    documents: [],
    loading: true,
    error: null,
    uploading: [],
  });

  // Fetch documents from Supabase
  const fetchDocuments = useCallback(async () => {
    if (!user) {
      setState(prev => ({ ...prev, documents: [], loading: false }));
      return;
    }

    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      // Get documents from Supabase database
      const { data: documents, error } = await supabase
        .from('documents')
        .select('*')
        .eq('user_id', user.uid)
        .order('uploaded_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch documents: ${error.message}`);
      }

      // Convert Supabase format to expected SimpleDocument format
      const convertedDocs: SimpleDocument[] = (documents || []).map(doc => ({
        id: doc.id,
        userId: doc.user_id,
        name: doc.name,
        type: doc.type,
        size: doc.size,
        category: doc.category,
        status: doc.status,
        uploadedAt: { seconds: Math.floor(new Date(doc.uploaded_at).getTime() / 1000) },
        processedAt: doc.processed_at ? { seconds: Math.floor(new Date(doc.processed_at).getTime() / 1000) } : undefined,
        storageUrl: doc.storage_url,
        metadata: doc.metadata || {},
        tags: doc.tags || []
      }));

      setState(prev => ({ 
        ...prev, 
        documents: convertedDocs, 
        loading: false,
        error: null 
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch documents';
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: errorMessage 
      }));
      showError('Failed to load documents');
    }
  }, [user, showError]);

  // Initial fetch
  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Client-side upload function that goes through API
  const uploadDocumentViaAPI = useCallback(async (file: File) => {
    console.log('=== CLIENT UPLOAD DEBUG START ===');
    
    if (!user) {
      console.error('Client: No user found');
      throw new Error('User not authenticated');
    }

    console.log('Client: User found:', { uid: user.uid, email: user.email });

    // Get current session with detailed logging
    console.log('Client: Getting Supabase session...');
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    console.log('Client: Session result:', {
      hasSession: !!session,
      hasUser: !!session?.user,
      hasAccessToken: !!session?.access_token,
      sessionError: sessionError?.message,
      userIdMatch: session?.user?.id === user.uid,
      fullSession: session
    });
    
    if (sessionError) {
      console.error('Client: Session error:', sessionError);
      throw new Error(`Failed to get authentication session: ${sessionError.message}`);
    }

    if (!session) {
      console.error('Client: No session found');
      throw new Error('No authentication session found. Please sign in again.');
    }

    if (!session.access_token) {
      console.error('Client: No access token in session');
      throw new Error('No authentication token available. Please sign in again.');
    }

    if (session.user?.id !== user.uid) {
      console.error('Client: User ID mismatch:', {
        sessionUserId: session.user?.id,
        authUserId: user.uid
      });
      throw new Error('User session mismatch. Please sign in again.');
    }

    console.log('Client: Session validation passed');

    // Prepare request
    const formData = new FormData();
    formData.append('file', file);
    formData.append('userId', user.uid);

    const headers = {
      'Authorization': `Bearer ${session.access_token}`
    };

    console.log('Client: Request details:', {
      url: '/api/documents/upload',
      method: 'POST',
      fileName: file.name,
      fileSize: file.size,
      userId: user.uid,
      hasAuthHeader: !!headers.Authorization,
      tokenLength: session.access_token.length,
      tokenPreview: session.access_token.substring(0, 30) + '...',
      fullHeaders: headers
    });

    try {
      console.log('Client: Making fetch request with headers:', headers);
      console.log('Client: Full fetch request details:', {
        url: '/api/documents/upload',
        method: 'POST',
        bodyType: formData.constructor.name,
        headers: headers,
        formDataEntries: Array.from(formData.entries()).map(([k, v]) => [k, typeof v === 'string' ? v : `File: ${v.name}`])
      });
      
      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
        headers: headers
      });

      console.log('Client: Response received:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries())
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Client: Error response body:', errorText);
        
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText || `Request failed with status ${response.status}` };
        }
        
        throw new Error(errorData.error || `Upload failed with status ${response.status}`);
      }

      const document = await response.json();
      console.log('Client: Upload successful:', document);
      console.log('=== CLIENT UPLOAD DEBUG END ===');
      return document;
      
    } catch (fetchError) {
      console.error('Client: Fetch error:', fetchError);
      console.log('=== CLIENT UPLOAD DEBUG END (ERROR) ===');
      throw fetchError;
    }
  }, [user]);

  // Upload document
  const uploadDocuments = useCallback(async (files: FileList) => {
    if (!user || !files.length) return;

    const fileArray = Array.from(files);
    const uploadIds = fileArray.map(file => `${Date.now()}-${file.name}`);
    
    setState(prev => ({ 
      ...prev, 
      uploading: [...prev.uploading, ...uploadIds] 
    }));

    try {
      const uploadPromises = fileArray.map(async (file, index) => {
        const uploadId = uploadIds[index];
        
        try {
          const document = await uploadDocumentViaAPI(file);
          
          // Update documents list
          setState(prev => ({
            ...prev,
            documents: [document, ...prev.documents],
            uploading: prev.uploading.filter(id => id !== uploadId),
          }));

          showSuccess(`${file.name} uploaded successfully`);
          return document;
        } catch (error) {
          console.error(`Upload failed for ${file.name}:`, error);
          showError(`Failed to upload ${file.name}`);
          
          setState(prev => ({
            ...prev,
            uploading: prev.uploading.filter(id => id !== uploadId),
          }));
          
          throw error;
        }
      });

      const results = await Promise.allSettled(uploadPromises);
      const successful = results.filter(result => result.status === 'fulfilled').length;
      const failed = results.filter(result => result.status === 'rejected').length;

      if (failed > 0) {
        showError(`${failed} file(s) failed to upload`);
      }
      
      return results;
    } catch (error) {
      console.error('Upload error:', error);
      setState(prev => ({
        ...prev,
        uploading: prev.uploading.filter(id => !uploadIds.includes(id)),
      }));
    }
  }, [user, showError, showSuccess, uploadDocumentViaAPI]);

  // Delete document from Supabase
  const removeDocument = useCallback(async (documentId: string) => {
    if (!user) {
      showError('User not authenticated');
      return;
    }

    try {
      // Get document to find storage path and verify ownership
      const { data: document, error: fetchError } = await supabase
        .from('documents')
        .select('*')
        .eq('id', documentId)
        .eq('user_id', user.uid)
        .single();

      if (fetchError || !document) {
        throw new Error('Document not found or access denied');
      }

      // Delete from Supabase database
      const { error: dbError } = await supabase
        .from('documents')
        .delete()
        .eq('id', documentId)
        .eq('user_id', user.uid);

      if (dbError) {
        throw new Error(`Database delete failed: ${dbError.message}`);
      }

      // Delete from Supabase Storage
      if (document.storage_url) {
        try {
          // Extract path from URL
          const url = new URL(document.storage_url);
          const pathParts = url.pathname.split('/');
          const storagePathIndex = pathParts.findIndex(p => p === 'documents');
          if (storagePathIndex !== -1) {
            const storagePath = pathParts.slice(storagePathIndex).join('/');
            
            const { error: storageError } = await supabase.storage
              .from('documents')
              .remove([storagePath]);
              
            if (storageError) {
              console.warn('Failed to delete storage file:', storageError);
            }
          }
        } catch (storageError) {
          console.warn('Failed to delete storage file:', storageError);
        }
      }
      
      setState(prev => ({
        ...prev,
        documents: prev.documents.filter(doc => doc.id !== documentId),
      }));

      showSuccess('Document deleted successfully');
    } catch (error) {
      console.error('Delete error:', error);
      showError('Failed to delete document');
      throw error;
    }
  }, [user, showError]);

  // Update document status
  const updateStatus = useCallback(async (documentId: string, status: SimpleDocumentStatus) => {
    if (!user) {
      showError('User not authenticated');
      return;
    }

    try {
      const updates: any = { status };
      
      if (status === 'processed') {
        updates.processed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('documents')
        .update(updates)
        .eq('id', documentId)
        .eq('user_id', user.uid);

      if (error) {
        throw new Error(`Failed to update document status: ${error.message}`);
      }
      
      setState(prev => ({
        ...prev,
        documents: prev.documents.map(doc =>
          doc.id === documentId ? { ...doc, status } : doc
        ),
      }));
    } catch (error) {
      console.error('Status update error:', error);
      showError('Failed to update document status');
      throw error;
    }
  }, [user, showError]);

  // Process document for analysis
  const processDocument = useCallback(async (documentId: string) => {
    try {
      await updateStatus(documentId, 'processing');
      
      const response = await fetch('/api/documents/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId }),
      });

      if (!response.ok) {
        throw new Error('Processing failed');
      }

      showSuccess('Document processing started');
    } catch (error) {
      console.error('Processing error:', error);
      showError('Failed to process document');
      await updateStatus(documentId, 'error');
      throw error;
    }
  }, [updateStatus, showError]);

  // Get document by ID
  const getDocument = useCallback(async (documentId: string) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      const { data: document, error } = await supabase
        .from('documents')
        .select('*')
        .eq('id', documentId)
        .eq('user_id', user.uid)
        .single();

      if (error || !document) {
        throw new Error('Document not found or access denied');
      }

      // Convert to expected format
      return {
        id: document.id,
        userId: document.user_id,
        name: document.name,
        type: document.type,
        size: document.size,
        category: document.category,
        status: document.status,
        uploadedAt: { seconds: Math.floor(new Date(document.uploaded_at).getTime() / 1000) },
        processedAt: document.processed_at ? { seconds: Math.floor(new Date(document.processed_at).getTime() / 1000) } : undefined,
        storageUrl: document.storage_url,
        metadata: document.metadata || {},
        tags: document.tags || []
      };
    } catch (error) {
      console.error('Get document error:', error);
      showError('Failed to fetch document');
      throw error;
    }
  }, [user, showError]);

  // Refresh documents
  const refresh = useCallback(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Filter helpers
  const getDocumentsByStatus = useCallback((status: SimpleDocumentStatus) => {
    return state.documents.filter(doc => doc.status === status);
  }, [state.documents]);

  const searchDocuments = useCallback((query: string) => {
    if (!query.trim()) return state.documents;
    
    const lowercaseQuery = query.toLowerCase();
    return state.documents.filter(doc =>
      doc.name.toLowerCase().includes(lowercaseQuery) ||
      doc.type.toLowerCase().includes(lowercaseQuery) ||
      doc.category.toLowerCase().includes(lowercaseQuery) ||
      doc.tags.some(tag => tag.toLowerCase().includes(lowercaseQuery))
    );
  }, [state.documents]);

  // Stats
  const stats = {
    total: state.documents.length,
    ready: getDocumentsByStatus('ready').length,
    processing: getDocumentsByStatus('processing').length,
    error: getDocumentsByStatus('error').length,
    uploading: state.uploading.length,
  };

  return {
    ...state,
    uploadDocuments,
    removeDocument,
    updateStatus,
    processDocument,
    getDocument,
    refresh,
    getDocumentsByStatus,
    searchDocuments,
    stats,
    isUploading: state.uploading.length > 0,
  };
}