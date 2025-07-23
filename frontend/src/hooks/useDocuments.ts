'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Document, DocumentStatus } from '@/types/documents';
import { 
  getDocumentsByUser, 
  uploadDocument, 
  deleteDocument,
  updateDocumentStatus,
  getDocumentById
} from '@/lib/firebase/document-storage';
import { useToast } from '@/components/ui/use-toast';

interface DocumentsState {
  documents: Document[];
  loading: boolean;
  error: string | null;
  uploading: string[];
}

export function useDocuments() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [state, setState] = useState<DocumentsState>({
    documents: [],
    loading: true,
    error: null,
    uploading: [],
  });

  // Fetch documents
  const fetchDocuments = useCallback(async () => {
    if (!user) {
      setState(prev => ({ ...prev, documents: [], loading: false }));
      return;
    }

    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      const documents = await getDocumentsByUser(user.uid);
      setState(prev => ({ 
        ...prev, 
        documents, 
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
      toast.error('Failed to load documents');
    }
  }, [user, toast]);

  // Initial fetch
  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

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
          const document = await uploadDocument(file, user.uid);
          
          // Update documents list
          setState(prev => ({
            ...prev,
            documents: [document, ...prev.documents],
            uploading: prev.uploading.filter(id => id !== uploadId),
          }));

          toast.success(`${file.name} uploaded successfully`);
          return document;
        } catch (error) {
          console.error(`Upload failed for ${file.name}:`, error);
          toast.error(`Failed to upload ${file.name}`);
          
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
        toast.error(`${failed} file(s) failed to upload`);
      }
      
      return results;
    } catch (error) {
      console.error('Upload error:', error);
      setState(prev => ({
        ...prev,
        uploading: prev.uploading.filter(id => !uploadIds.includes(id)),
      }));
    }
  }, [user, toast]);

  // Delete document
  const removeDocument = useCallback(async (documentId: string) => {
    try {
      await deleteDocument(documentId, user?.uid);
      
      setState(prev => ({
        ...prev,
        documents: prev.documents.filter(doc => doc.id !== documentId),
      }));

      toast.success('Document deleted successfully');
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete document');
      throw error;
    }
  }, [user, toast]);

  // Update document status
  const updateStatus = useCallback(async (documentId: string, status: DocumentStatus) => {
    try {
      await updateDocumentStatus(documentId, status);
      
      setState(prev => ({
        ...prev,
        documents: prev.documents.map(doc =>
          doc.id === documentId ? { ...doc, status } : doc
        ),
      }));
    } catch (error) {
      console.error('Status update error:', error);
      toast.error('Failed to update document status');
      throw error;
    }
  }, [toast]);

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

      toast.success('Document processing started');
    } catch (error) {
      console.error('Processing error:', error);
      toast.error('Failed to process document');
      await updateStatus(documentId, 'error');
      throw error;
    }
  }, [updateStatus, toast]);

  // Get document by ID
  const getDocument = useCallback(async (documentId: string) => {
    try {
      const document = await getDocumentById(documentId);
      return document;
    } catch (error) {
      console.error('Get document error:', error);
      toast.error('Failed to fetch document');
      throw error;
    }
  }, [toast]);

  // Refresh documents
  const refresh = useCallback(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Filter helpers
  const getDocumentsByStatus = useCallback((status: DocumentStatus) => {
    return state.documents.filter(doc => doc.status === status);
  }, [state.documents]);

  const searchDocuments = useCallback((query: string) => {
    if (!query.trim()) return state.documents;
    
    const lowercaseQuery = query.toLowerCase();
    return state.documents.filter(doc =>
      doc.fileName.toLowerCase().includes(lowercaseQuery) ||
      doc.name?.toLowerCase().includes(lowercaseQuery) ||
      doc.description?.toLowerCase().includes(lowercaseQuery)
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