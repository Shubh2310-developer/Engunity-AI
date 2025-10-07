'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, 
  FileText, 
  Search, 
  Filter, 
  MoreVertical, 
  Eye, 
  MessageSquare, 
  Trash2,
  Download,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  FileSpreadsheet,
  Archive,
  Code,
  Book,
  Presentation,
  Brain,
  Zap,
  Activity
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';

import { useAuth } from '@/hooks/useAuth';
import { useRAG } from '@/hooks/useRAG';
import { supabase } from '@/lib/auth/supabase';
import type { SupabaseDocument } from '@/lib/supabase/document-storage-no-auth';

const statusConfig = {
  uploading: { 
    label: 'Uploading', 
    variant: 'secondary' as const, 
    icon: Loader2,
    className: 'animate-spin'
  },
  processing: { 
    label: 'Processing', 
    variant: 'secondary' as const, 
    icon: Clock,
    className: 'animate-pulse'
  },
  processed: { 
    label: 'Ready', 
    variant: 'default' as const, 
    icon: CheckCircle,
    className: ''
  },
  failed: { 
    label: 'Error', 
    variant: 'destructive' as const, 
    icon: AlertCircle,
    className: ''
  }
};

const DocumentsPage: React.FC = () => {
  const { user } = useAuth();
  const { error: showError, success: showSuccess } = useToast();
  const router = useRouter();
  const { analyzeDocument, loading: ragLoading } = useRAG();
  const [documents, setDocuments] = useState<SupabaseDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'uploading' | 'processing' | 'processed' | 'failed'>('all');
  const [uploadingFiles, setUploadingFiles] = useState<string[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [analyzingDocs, setAnalyzingDocs] = useState<Set<string>>(new Set());

  // Fetch documents on component mount
  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        setLoading(true);
        if (user) {
          console.log('🔍 Fetching documents for user:', {
            userId: user.id,
            userUid: user.uid,
            userEmail: user.email
          });
          
          // Get current session for authentication
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();
          
          if (sessionError) {
            console.error('❌ Session error:', sessionError);
            throw new Error(`Session error: ${sessionError.message}`);
          }

          if (!session || !session.access_token) {
            console.warn('⚠️ No active session found, user might need to re-authenticate');
            setDocuments([]);
            return;
          }

          console.log('✅ Valid session found, fetching documents via API');
          
          // Fetch documents via API route (bypasses RLS issues)
          const response = await fetch('/api/documents/list', {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json'
            }
          });

          if (!response.ok) {
            const errorData = await response.json();
            console.error('❌ API error:', errorData);
            throw new Error(errorData.error || `API request failed with status ${response.status}`);
          }

          const userDocs = await response.json();
          
          console.log('📋 Documents fetched successfully via API:', userDocs?.length || 0);
          console.log('📄 Documents data:', userDocs);
          
          // Convert to expected format
          const convertedDocs = (userDocs || []).map((doc: any) => ({
            id: doc.id,
            user_id: doc.user_id,
            name: doc.name,
            type: doc.type,
            size: doc.size,
            category: doc.category,
            status: doc.status,
            uploaded_at: doc.uploaded_at,
            processed_at: doc.processed_at,
            storage_url: doc.storage_url,
            metadata: doc.metadata || {},
            tags: doc.tags || []
          }));
          
          setDocuments(convertedDocs);
        } else {
          console.log('👤 No user logged in, showing empty state');
          // No user logged in, show empty state
          setDocuments([]);
        }
      } catch (error) {
        console.error('❌ Error fetching documents:', error);
        showError('Failed to load documents. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchDocuments();
  }, [user, showError]);

  // Filter documents based on search and status
  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = selectedStatus === 'all' || doc.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  const handleFileUpload = async (files: FileList) => {
    if (!files.length) return;

    // Check if user is authenticated
    if (!user) {
      showError('Please sign in to upload documents');
      return;
    }

    const uploadPromises = Array.from(files).map(async (file) => {
      const fileId = `${Date.now()}-${file.name}`;
      setUploadingFiles(prev => [...prev, fileId]);

      try {
        console.log('Starting upload for file:', file.name);
        
        // Get current session for authentication
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          throw new Error(`Authentication error: ${sessionError.message}`);
        }

        if (!session || !session.access_token) {
          throw new Error('No valid authentication session. Please sign in again.');
        }

        if (!user) {
          throw new Error('User not authenticated');
        }

        if (session.user?.id !== user.id) {
          throw new Error('User session mismatch. Please sign in again.');
        }
        
        const formData = new FormData();
        formData.append('file', file);
        formData.append('userId', user.id);

        const headers = {
          'Authorization': `Bearer ${session.access_token}`
        };

        console.log('Making upload request with auth header:', {
          fileName: file.name,
          userId: user.id,
          hasAuthHeader: !!headers.Authorization,
          tokenLength: session.access_token.length
        });

        const response = await fetch('/api/documents/upload', {
          method: 'POST',
          body: formData,
          headers: headers
        });

        const responseData = await response.json();
        
        if (!response.ok) {
          console.error('Upload response error:', responseData);
          throw new Error(responseData.error || 'Upload failed');
        }

        console.log('Upload successful:', responseData);
        setDocuments(prev => [responseData, ...prev]);
        
        showSuccess(`${file.name} uploaded successfully`);
      } catch (error: any) {
        console.error('Upload error for', file.name, ':', error);
        showError(`Failed to upload ${file.name}: ${error.message || error}`);
      } finally {
        setUploadingFiles(prev => prev.filter(id => id !== fileId));
      }
    });

    try {
      await Promise.all(uploadPromises);
      console.log('All uploads completed');
    } catch (error) {
      console.error('Upload batch error:', error);
    }
  };

  // Drag and drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files);
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    try {
      console.log('🗑️ Deleting document:', documentId);
      
      // Get current session for authentication
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        throw new Error(`Session error: ${sessionError.message}`);
      }

      if (!session || !session.access_token) {
        throw new Error('No valid authentication session. Please sign in again.');
      }

      // Delete document via API route
      const response = await fetch(`/api/documents/${documentId}/delete`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Delete API error:', errorData);
        throw new Error(errorData.error || `Delete request failed with status ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Document deleted successfully:', result);

      // Remove from UI
      setDocuments(prev => prev.filter(doc => doc.id !== documentId));
      showSuccess('Document deleted successfully');
      
    } catch (error: any) {
      console.error('❌ Delete error:', error);
      showError(`Failed to delete document: ${error.message}`);
    }
  };

  const handleAnalyzeDocument = async (documentId: string) => {
    try {
      setAnalyzingDocs(prev => new Set(prev).add(documentId));

      // Update UI immediately
      setDocuments(prev =>
        prev.map(doc =>
          doc.id === documentId
            ? { ...doc, status: 'processing' as SupabaseDocument['status'] }
            : doc
        )
      );

      // Start RAG analysis
      await analyzeDocument(documentId, {
        enable_advanced_processing: true,
        chunk_strategy: 'smart',
        extract_metadata: true
      });

      showSuccess('RAG document analysis started successfully!');

      // Poll for status updates using MongoDB API
      const pollInterval = setInterval(async () => {
        try {
          // Get current session for authentication
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();

          if (sessionError || !session) {
            console.error('Session error during polling:', sessionError);
            clearInterval(pollInterval);
            return;
          }

          // Fetch document status from MongoDB via API
          const response = await fetch('/api/documents/list', {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json'
            }
          });

          if (response.ok) {
            const docs = await response.json();
            const updatedDoc = docs.find((d: any) => d.id === documentId);

            if (updatedDoc && updatedDoc.status === 'processed') {
              setDocuments(prev =>
                prev.map(doc =>
                  doc.id === documentId
                    ? { ...doc, status: 'processed' as SupabaseDocument['status'] }
                    : doc
                )
              );
              clearInterval(pollInterval);
              setAnalyzingDocs(prev => {
                const newSet = new Set(prev);
                newSet.delete(documentId);
                return newSet;
              });
              showSuccess('Document is ready for AI questions!');

              // Automatically redirect to QA interface with longer delay for MongoDB sync
              setTimeout(() => {
                console.log('Redirecting to QA page for document:', documentId);
                router.push(`/dashboard/documents/${documentId}/qa`);
              }, 2500); // Increased to 2.5 seconds to allow MongoDB to sync
            }
          }
        } catch (error) {
          console.error('Status polling error:', error);
        }
      }, 3000);

      // Clean up after 2 minutes
      setTimeout(() => {
        clearInterval(pollInterval);
        setAnalyzingDocs(prev => {
          const newSet = new Set(prev);
          newSet.delete(documentId);
          return newSet;
        });
      }, 120000);

    } catch (error: any) {
      console.error('RAG Analysis error:', error);

      // Revert status on error
      setDocuments(prev =>
        prev.map(doc =>
          doc.id === documentId
            ? { ...doc, status: 'failed' as SupabaseDocument['status'] }
            : doc
        )
      );

      setAnalyzingDocs(prev => {
        const newSet = new Set(prev);
        newSet.delete(documentId);
        return newSet;
      });

      showError(`RAG analysis failed: ${error.message}`);
    }
  };


  const getDocumentIcon = (type: SupabaseDocument['type'], fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase() || '';
    
    // Check by file type first
    switch (type) {
      case 'PDF':
        return <FileText className="h-5 w-5 text-red-600" />;
      case 'XLSX':
        return <FileSpreadsheet className="h-5 w-5 text-green-600" />;
      case 'DOCX':
        return <FileText className="h-5 w-5 text-blue-600" />;
      case 'TXT':
        // Check specific extensions for better icons
        if (['py', 'js', 'ts', 'java', 'c', 'cpp', 'php', 'css', 'html', 'xml', 'json'].includes(extension)) {
          return <Code className="h-5 w-5 text-purple-600" />;
        }
        if (['md', 'markdown'].includes(extension)) {
          return <FileText className="h-5 w-5 text-gray-600" />;
        }
        return <FileText className="h-5 w-5 text-gray-600" />;
      case 'MD':
        return <FileText className="h-5 w-5 text-gray-600" />;
      default:
        // Fallback based on extension
        if (['zip', 'rar', '7z'].includes(extension)) {
          return <Archive className="h-5 w-5 text-orange-600" />;
        }
        if (['epub', 'mobi'].includes(extension)) {
          return <Book className="h-5 w-5 text-indigo-600" />;
        }
        if (['ppt', 'pptx', 'odp'].includes(extension)) {
          return <Presentation className="h-5 w-5 text-orange-600" />;
        }
        return <FileText className="h-5 w-5 text-ai-primary" />;
    }
  };

  const formatDate = (timestamp: any): string => {
    if (!timestamp) return 'Unknown';
    
    let date: Date;
    if (timestamp.toDate) {
      // Firebase Timestamp
      date = timestamp.toDate();
    } else if (timestamp.seconds) {
      // Firebase Timestamp-like object
      date = new Date(timestamp.seconds * 1000);
    } else if (timestamp instanceof Date) {
      date = timestamp;
    } else {
      // String or number timestamp
      date = new Date(timestamp);
    }
    
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const StatusBadge: React.FC<{ status: SupabaseDocument['status'] }> = ({ status }) => {
    const config = statusConfig[status];
    if (!config) return null;
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1.5">
        <Icon className={`h-3 w-3 ${config.className}`} />
        {config.label}
      </Badge>
    );
  };

  return (
    <div 
      className="container-premium py-8"
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-8"
      >
      
      {/* Drag overlay */}
      {dragActive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
          <div className="rounded-lg bg-white p-8 shadow-xl border-2 border-dashed border-ai-primary">
            <div className="text-center">
              <Upload className="h-12 w-12 text-ai-primary mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Drop files to upload</h3>
              <p className="text-slate-600">Release to upload your documents</p>
            </div>
          </div>
        </div>
      )}
        {/* Header Section */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="heading-lg">Document Library</h1>
              <div className="flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-ai-primary/10 to-purple-500/10 rounded-full border border-ai-primary/20">
                <Zap className="h-4 w-4 text-ai-primary" />
                <span className="text-sm font-medium text-ai-primary">RAG Powered</span>
              </div>
            </div>
            <p className="text-body text-slate-600 mt-2">
              Upload, process, and analyze your documents with AI-powered RAG (BGE + Phi-2) insights
            </p>
            <div className="mt-3 text-xs text-slate-500">
              <strong>Supported formats:</strong> PDF, Word (DOC/DOCX), Excel (XLS/XLSX), PowerPoint (PPT/PPTX), 
              Text (TXT/MD/CSV), Code files (JS/TS/PY/JAVA/C/C++/PHP), Archives (ZIP/RAR/7Z), 
              eBooks (EPUB/MOBI), and more
            </div>
            <div className="mt-2 text-xs text-ai-primary">
              <strong>✨ New:</strong> Advanced RAG analysis with BGE-small retrieval + Phi-2 generation for precise document Q&A
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              className="hover-lift"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
            
            <Button
              className="btn-primary hover-lift"
              onClick={() => document.getElementById('file-upload')?.click()}
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload Document
            </Button>
            
            <input
              id="file-upload"
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.md,.csv,.html,.xml,.json,.js,.css,.rtf,.odt,.ods,.odp,.zip,.rar,.7z,.epub,.mobi,.py,.java,.c,.cpp,.ts,.php,.vsd,.tex"
              className="hidden"
              onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
            />
          </div>
        </div>

        {/* Search and Filters */}
        <Card className="card hover-lift">
          <CardContent className="p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Search documents..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-600">Status:</span>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value as 'all' | 'uploading' | 'processing' | 'processed' | 'failed')}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-ai-primary focus:outline-none focus:ring-2 focus:ring-ai-primary/20"
                >
                  <option value="all">All</option>
                  <option value="processed">Ready</option>
                  <option value="processing">Processing</option>
                  <option value="failed">Error</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Documents Table */}
        <Card className="card">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Documents ({filteredDocuments.length})</span>
              {uploadingFiles.length > 0 && (
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Uploading {uploadingFiles.length} file{uploadingFiles.length !== 1 ? 's' : ''}...
                </div>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-12 w-12 rounded" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-1/3" />
                      <Skeleton className="h-3 w-1/4" />
                    </div>
                    <Skeleton className="h-6 w-16" />
                    <Skeleton className="h-8 w-8 rounded" />
                  </div>
                ))}
              </div>
            ) : filteredDocuments.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">
                  {searchTerm || selectedStatus !== 'all' ? 'No matching documents' : 'No documents yet'}
                </h3>
                <p className="text-slate-600 mb-6">
                  {searchTerm || selectedStatus !== 'all' 
                    ? 'Try adjusting your search or filter criteria'
                    : 'Upload your first document to get started with AI-powered analysis'
                  }
                </p>
                {!searchTerm && selectedStatus === 'all' && (
                  <Button
                    className="btn-primary"
                    onClick={() => document.getElementById('file-upload')?.click()}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Document
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Document</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Upload Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <AnimatePresence>
                      {filteredDocuments.map((document) => (
                        <motion.tr
                          key={document.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          transition={{ duration: 0.2 }}
                          className="hover:bg-slate-50/50 transition-colors"
                        >
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-primary/10">
                                {getDocumentIcon(document.type, document.name)}
                              </div>
                              <div>
                                <div className="font-medium text-slate-900">
                                  {document.name}
                                </div>
                                <div className="text-sm text-slate-500">
                                  {document.type} • {document.category} • {document.tags && document.tags.length > 0 ? document.tags.slice(0, 2).join(', ') : 'No tags'}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-slate-600">
                            {document.size}
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={document.status} />
                          </TableCell>
                          <TableCell className="text-slate-600">
                            {formatDate(new Date(document.uploaded_at).getTime())}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {document.status === 'processed' && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="hover-lift"
                                    onClick={() => router.push(`/dashboard/documents/${document.id}/viewer`)}
                                    title="View Document"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  
                                  <Button
                                    variant="ghost" 
                                    size="sm"
                                    className="hover-lift text-ai-primary hover:text-ai-primary/80"
                                    onClick={() => router.push(`/dashboard/documents/${document.id}/qa`)}
                                    title="Ask AI Questions"
                                  >
                                    <MessageSquare className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                              
                              {(document.status === 'uploading' || document.status === 'failed') && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="hover-lift text-blue-600 hover:text-blue-700"
                                  onClick={() => handleAnalyzeDocument(document.id)}
                                  disabled={analyzingDocs.has(document.id) || ragLoading}
                                  title="Start RAG Analysis"
                                >
                                  {analyzingDocs.has(document.id) ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Brain className="h-4 w-4" />
                                  )}
                                </Button>
                              )}
                              
                              {document.status === 'processing' && (
                                <div className="flex items-center gap-2 text-sm text-slate-600">
                                  <Activity className="h-4 w-4 animate-pulse text-ai-primary" />
                                  <span className="text-xs">Analyzing...</span>
                                </div>
                              )}
                              
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="hover-lift">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  {document.status !== 'processing' && (
                                    <DropdownMenuItem
                                      onClick={() => handleAnalyzeDocument(document.id)}
                                      disabled={analyzingDocs.has(document.id) || ragLoading}
                                    >
                                      <Brain className="h-4 w-4 mr-2" />
                                      {document.status === 'processed' ? 'Re-analyze with RAG' : 'Analyze with RAG'}
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem>
                                    <Download className="h-4 w-4 mr-2" />
                                    Download
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleDeleteDocument(document.id)}
                                    className="text-red-600 focus:text-red-600"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </TableCell>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default DocumentsPage;