'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, AlertCircle, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';

import QAInterface from '../../components/QAInterface';

import type { SupabaseDocument } from '@/lib/supabase/document-storage-no-auth';

const DocumentQAPage: React.FC = () => {
  const { id } = useParams();
  const router = useRouter();
  const { error: showError } = useToast();
  
  const [document, setDocument] = useState<SupabaseDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDocument = async () => {
      if (!id) {
        setError('Document ID not found');
        setLoading(false);
        return;
      }

      try {
        console.log('🔍 Fetching document for Q&A:', id);
        
        // Fetch document via API route (no auth required)
        const response = await fetch(`/api/documents/${id}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error('❌ API error:', errorData);
          throw new Error(errorData.error || `API request failed with status ${response.status}`);
        }

        const responseData = await response.json();
        const documentData = responseData.document;
        
        console.log('📋 Document fetched successfully:', documentData);
        
        if (!documentData) {
          throw new Error('Document data not found in response');
        }
        
        // Convert to expected format
        const convertedDoc: SupabaseDocument = {
          id: documentData.id,
          user_id: documentData.user_id,
          name: documentData.name || 'Unknown Document',
          type: documentData.type || 'Unknown',
          size: documentData.size || 'Unknown',
          category: documentData.category || 'uncategorized',
          status: documentData.status || 'unknown',
          uploaded_at: documentData.uploaded_at,
          processed_at: documentData.processed_at,
          storage_url: documentData.storage_url,
          metadata: documentData.metadata || {},
          tags: documentData.tags || []
        };
        
        console.log('📋 Converted document:', convertedDoc);
        
        // Try to fetch enhanced metadata
        try {
          const metadataResponse = await fetch(`/api/documents/${id}/metadata`);
          if (metadataResponse.ok) {
            const metadataData = await metadataResponse.json();
            convertedDoc.metadata = {
              ...convertedDoc.metadata,
              ...metadataData.metadata
            };
            console.log('📋 Enhanced metadata:', convertedDoc.metadata);
          }
        } catch (metadataError) {
          console.warn('Could not fetch enhanced metadata:', metadataError);
        }
        
        // Check if document is ready for Q&A
        if (convertedDoc.status !== 'processed') {
          const statusMessage = convertedDoc.status || 'undefined';
          setError(`Document is not ready for Q&A. Current status: ${statusMessage}`);
          setLoading(false);
          return;
        }
        
        setDocument(convertedDoc);
        
      } catch (error: any) {
        console.error('❌ Error fetching document:', error);
        setError(error.message || 'Failed to load document');
        showError('Failed to load document for Q&A');
      } finally {
        setLoading(false);
      }
    };

    fetchDocument();
  }, [id, showError]);

  const handleGoBack = () => {
    router.push('/dashboard/documents');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-25 to-slate-75 flex items-center justify-center">
        <Card className="w-96 shadow-professional-lg">
          <CardContent className="p-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-ai-primary" />
            <h3 className="heading-sm mb-2">Loading Document</h3>
            <p className="text-body text-slate-600">
              Preparing your document for Q&A...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !document) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-25 to-slate-75 flex items-center justify-center">
        <Card className="w-96 shadow-professional-lg">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-8 w-8 mx-auto mb-4 text-red-500" />
            <h3 className="heading-sm mb-2 text-red-900">Error Loading Document</h3>
            <p className="text-body text-slate-600 mb-6">
              {error || 'Document not found or not accessible.'}
            </p>
            <Button onClick={handleGoBack} className="btn-primary">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Documents
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-25 to-slate-75">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="h-screen flex flex-col"
      >
        {/* Header with back button */}
        <div className="bg-white/95 backdrop-blur-xl border-b border-slate-200/80 shadow-professional px-6 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleGoBack}
              className="hover:bg-slate-100 h-10 w-10 rounded-xl"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="heading-sm text-slate-900">Q&A with Document</h1>
              <p className="text-body text-slate-600 truncate max-w-md">
                {document.name}
              </p>
            </div>
          </div>
        </div>

        {/* Q&A Interface */}
        <div className="flex-1 overflow-hidden">
          <QAInterface 
            document={document}
            className="h-full"
          />
        </div>
      </motion.div>
    </div>
  );
};

export default DocumentQAPage;