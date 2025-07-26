'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  FileText, 
  Download, 
  ArrowLeft,
  Loader2,
  AlertCircle,
  ExternalLink,
  ZoomIn,
  ZoomOut
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

import type { SupabaseDocument } from '@/lib/supabase/document-storage-no-auth';

const DocumentViewerPage: React.FC = () => {
  const params = useParams();
  const { toast } = useToast();
  
  const documentId = params.id as string;
  const [document, setDocument] = useState<SupabaseDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(100);
  const [presignedUrl, setPresignedUrl] = useState<string | null>(null);

  useEffect(() => {
    if (documentId) {
      fetchDocument();
    }
  }, [documentId]);

  const fetchDocument = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/documents/${documentId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch document');
      }
      
      const data = await response.json();
      setDocument(data.document);
      
      // Generate presigned URL for secure access if needed
      if (data.document?.storage_url) {
        try {
          const presignedResponse = await fetch(`/api/documents/${documentId}/presigned-url`);
          if (presignedResponse.ok) {
            const presignedData = await presignedResponse.json();
            setPresignedUrl(presignedData.url);
          }
        } catch (error) {
          console.warn('Failed to get presigned URL, using direct URL:', error);
        }
      }
    } catch (error: any) {
      console.error('Error fetching document:', error);
      setError(error.message || 'Failed to load document');
      toast('Failed to load document', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (document) {
      const downloadUrl = `/api/documents/${documentId}/view`;
      const link = window.document.createElement('a');
      link.href = downloadUrl;
      link.download = document.name;
      link.click();
    }
  };

  const handleOpenExternal = () => {
    if (document) {
      window.open(`/api/documents/${documentId}/view`, '_blank');
    }
  };

  const adjustZoom = (delta: number) => {
    setZoom(prev => Math.max(25, Math.min(200, prev + delta)));
  };

  if (loading) {
    return (
      <div className="container-premium py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (error || !document) {
    return (
      <div className="container-premium py-8">
        <div className="max-w-2xl mx-auto text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Document Not Found</h1>
          <p className="text-slate-600 mb-6">{error || 'The requested document could not be found.'}</p>
          <Button onClick={() => window.history.back()} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const renderDocumentViewer = () => {
    const fileType = document.type.toLowerCase();
    // Use our local API endpoint to serve the document
    const viewUrl = `/api/documents/${documentId}/view`;
    
    if (fileType === 'pdf') {
      return (
        <div className="relative w-full h-full bg-slate-100 rounded-lg overflow-hidden">
          <iframe
            src={viewUrl}
            className="w-full h-full border-0"
            style={{ 
              width: '100%',
              height: '100%',
              transform: zoom !== 100 ? `scale(${zoom / 100})` : undefined,
              transformOrigin: 'top left'
            }}
            title={document.name}
            allow="fullscreen"
            frameBorder="0"
            scrolling="auto"
            onError={(e) => {
              console.error('Failed to load PDF in iframe:', e);
            }}
            onLoad={() => {
              console.log('PDF loaded successfully');
            }}
          />
          {/* Accessible download overlay */}
          <div className="absolute top-4 right-4 z-10">
            <div className="flex gap-2 bg-white/90 backdrop-blur-sm rounded-lg p-2 shadow-sm">
              <Button onClick={handleDownload} variant="outline" size="sm" title="Download PDF">
                <Download className="h-4 w-4" />
              </Button>
              <Button onClick={() => window.open(viewUrl, '_blank')} variant="outline" size="sm" title="Open in New Tab">
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      );
    }
    
    if (fileType === 'txt' || fileType === 'md') {
      return (
        <div 
          className="w-full h-full min-h-[600px] bg-white rounded-lg p-6 overflow-auto border"
          style={{ fontSize: `${zoom}%` }}
        >
          <div className="prose prose-slate max-w-none">
            <p className="text-slate-600 mb-4">
              Text content preview will be implemented. For now, download the file to view its contents.
            </p>
            <Button onClick={handleDownload} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Download to View Content
            </Button>
          </div>
        </div>
      );
    }
    
    // For images
    if (fileType.includes('image') || ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileType)) {
      return (
        <div className="w-full h-full min-h-[600px] bg-slate-100 rounded-lg flex items-center justify-center overflow-auto">
          <img 
            src={viewUrl} 
            alt={document.name}
            className="max-w-full max-h-full object-contain"
            style={{ transform: `scale(${zoom / 100})` }}
            onError={() => {
              console.error('Failed to load image');
            }}
          />
        </div>
      );
    }
    
    // Default viewer for other file types
    return (
      <div className="w-full h-full min-h-[600px] bg-slate-50 rounded-lg flex items-center justify-center">
        <div className="text-center max-w-md">
          <FileText className="h-16 w-16 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">Preview Not Available</h3>
          <p className="text-slate-600 mb-6">
            Preview is not available for {document.type} files. Download the file to view its contents.
          </p>
          <div className="flex gap-2 justify-center">
            <Button onClick={handleDownload} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
            <Button onClick={handleOpenExternal} variant="outline">
              <ExternalLink className="h-4 w-4 mr-2" />
              Open in New Tab
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="container-premium py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-6xl mx-auto space-y-6"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => window.history.back()}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{document.name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary">{document.type}</Badge>
                <Badge variant="outline">{document.size}</Badge>
                <span className="text-sm text-slate-500">
                  {new Date(document.uploaded_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => adjustZoom(-25)}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-sm text-slate-600 min-w-[4rem] text-center">
              {zoom}%
            </span>
            <Button variant="outline" size="sm" onClick={() => adjustZoom(25)}>
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
            <Button variant="outline" size="sm" onClick={handleOpenExternal}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Open in New Tab
            </Button>
          </div>
        </div>

        {/* Document Viewer */}
        <Card className="card">
          <CardContent className="p-2">
            <div className="w-full" style={{ height: 'calc(100vh - 200px)', minHeight: '800px' }}>
              {renderDocumentViewer()}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default DocumentViewerPage;