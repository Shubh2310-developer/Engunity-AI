'use client';

import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { uploadDocument as uploadDocumentAPI, uploadToRAG } from '@/lib/api/documents';
import {
  Upload,
  FileText,
  X,
  Check,
  AlertCircle,
  ArrowLeft,
  Cloud,
  Sparkles,
  Zap,
  Shield,
  ChevronRight,
  File,
  FileCheck,
  Loader2,
  CheckCircle2,
  XCircle
} from 'lucide-react';

interface UploadedFile {
  id: string;
  file: File;
  status: 'uploading' | 'processing' | 'success' | 'error';
  progress: number;
  error?: string;
  docId?: string;
  metadata?: {
    pages?: number;
    chunks?: number;
    size: number;
  };
}

export default function UploadPage() {
  const router = useRouter();
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    handleFiles(droppedFiles);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      handleFiles(selectedFiles);
    }
  }, []);

  const handleFiles = async (newFiles: File[]) => {
    const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'text/markdown'];
    const maxSize = 50 * 1024 * 1024; // 50MB

    for (const file of newFiles) {
      if (!validTypes.includes(file.type)) {
        alert(`File type not supported: ${file.name}`);
        continue;
      }

      if (file.size > maxSize) {
        alert(`File too large: ${file.name}. Maximum size is 50MB.`);
        continue;
      }

      const fileId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const uploadFile: UploadedFile = {
        id: fileId,
        file,
        status: 'uploading',
        progress: 0,
        metadata: {
          size: file.size
        }
      };

      setFiles(prev => [...prev, uploadFile]);

      // Start upload
      uploadDocument(fileId, file);
    }
  };

  const uploadDocument = async (fileId: string, file: File) => {
    const userId = 'user_123'; // TODO: Replace with actual auth user ID
    const sessionId = `session_${Date.now()}`;

    try {
      // Update progress to 20%
      setFiles(prev => prev.map(f =>
        f.id === fileId ? { ...f, progress: 20, status: 'uploading' as const } : f
      ));

      // Step 1: Upload to MongoDB backend for metadata storage
      const backendResult = await uploadDocumentAPI(file, userId, sessionId);

      // Update progress to 50%
      setFiles(prev => prev.map(f =>
        f.id === fileId ? { ...f, progress: 50, status: 'processing' as const } : f
      ));

      // Step 2: Upload to RAG server for vectorization and Q&A
      const ragResult = await uploadToRAG(file, userId, sessionId);

      // Update progress to 80%
      setFiles(prev => prev.map(f =>
        f.id === fileId ? { ...f, progress: 80 } : f
      ));

      // Give a small delay to show completion
      await new Promise(resolve => setTimeout(resolve, 500));

      // Mark as complete
      setFiles(prev => prev.map(f =>
        f.id === fileId
          ? {
              ...f,
              status: 'success',
              progress: 100,
              docId: backendResult.doc_id,
              metadata: {
                size: f.file.size,
                pages: ragResult.page_count,
                chunks: ragResult.chunk_count
              }
            }
          : f
      ));
    } catch (error: any) {
      console.error('Upload failed:', error);
      setFiles(prev => prev.map(f =>
        f.id === fileId
          ? {
              ...f,
              status: 'error',
              error: error.message || 'Upload failed. Please try again.',
              progress: 0
            }
          : f
      ));
    }
  };

  const removeFile = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const retryUpload = (fileId: string) => {
    const file = files.find(f => f.id === fileId);
    if (file) {
      setFiles(prev => prev.map(f =>
        f.id === fileId
          ? { ...f, status: 'uploading', progress: 0, error: undefined }
          : f
      ));
      uploadDocument(fileId, file.file);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  const allCompleted = files.length > 0 && files.every(f => f.status === 'success' || f.status === 'error');
  const successCount = files.filter(f => f.status === 'success').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <Link
            href="/dashboard/documents"
            className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6 transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back to Documents
          </Link>

          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl font-bold text-slate-900 mb-2"
          >
            Upload Documents
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-slate-600 text-lg"
          >
            Upload PDF, DOCX, TXT, or MD files for AI-powered analysis
          </motion.p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-6 py-12">
        {/* Features Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12"
        >
          <div className="flex items-start gap-3 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-100">
            <div className="p-2 bg-white rounded-lg shadow-sm">
              <Zap className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 mb-1">Instant Processing</h3>
              <p className="text-sm text-slate-600">AI extracts and indexes content in seconds</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 bg-gradient-to-br from-violet-50 to-purple-50 rounded-2xl border border-violet-100">
            <div className="p-2 bg-white rounded-lg shadow-sm">
              <Sparkles className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 mb-1">Smart Q&A</h3>
              <p className="text-sm text-slate-600">Ask questions and get instant answers</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 bg-gradient-to-br from-emerald-50 to-green-50 rounded-2xl border border-emerald-100">
            <div className="p-2 bg-white rounded-lg shadow-sm">
              <Shield className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 mb-1">Secure & Private</h3>
              <p className="text-sm text-slate-600">Your documents are encrypted and secure</p>
            </div>
          </div>
        </motion.div>

        {/* Upload Area */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-3xl transition-all duration-300 ${
            isDragging
              ? 'border-blue-500 bg-blue-50 scale-[1.02]'
              : 'border-slate-300 bg-white hover:border-blue-400 hover:bg-blue-50/50'
          }`}
        >
          <div className="p-16 text-center">
            <motion.div
              animate={{
                scale: isDragging ? 1.1 : 1,
                rotate: isDragging ? 5 : 0
              }}
              className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 mb-8"
            >
              <Cloud className="w-12 h-12 text-blue-600" />
            </motion.div>

            <h3 className="text-2xl font-bold text-slate-900 mb-3">
              {isDragging ? 'Drop files here' : 'Drag & drop your files'}
            </h3>
            <p className="text-slate-600 mb-8 max-w-md mx-auto">
              Or click the button below to browse and select files from your computer
            </p>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.docx,.txt,.md"
              onChange={handleFileInput}
              className="hidden"
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 hover:scale-105 transition-all duration-200"
            >
              <Upload className="w-5 h-5" />
              Browse Files
            </button>

            <p className="mt-6 text-sm text-slate-500">
              Supported formats: PDF, DOCX, TXT, MD • Maximum size: 50MB per file
            </p>
          </div>
        </motion.div>

        {/* Uploaded Files List */}
        <AnimatePresence>
          {files.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mt-12"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-slate-900">
                  Uploaded Files ({files.length})
                </h2>
                {allCompleted && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    onClick={() => router.push('/dashboard/documents')}
                    className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-colors"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    Done - View Documents
                    <ChevronRight className="w-4 h-4" />
                  </motion.button>
                )}
              </div>

              <div className="space-y-4">
                {files.map((uploadFile, index) => (
                  <motion.div
                    key={uploadFile.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-lg transition-shadow"
                  >
                    <div className="flex items-start gap-4">
                      {/* File Icon */}
                      <div className={`p-3 rounded-xl ${
                        uploadFile.status === 'success' ? 'bg-green-50' :
                        uploadFile.status === 'error' ? 'bg-red-50' :
                        'bg-blue-50'
                      }`}>
                        {uploadFile.status === 'success' ? (
                          <FileCheck className="w-6 h-6 text-green-600" />
                        ) : uploadFile.status === 'error' ? (
                          <XCircle className="w-6 h-6 text-red-600" />
                        ) : (
                          <FileText className="w-6 h-6 text-blue-600" />
                        )}
                      </div>

                      {/* File Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-slate-900 truncate mb-1">
                              {uploadFile.file.name}
                            </h3>
                            <p className="text-sm text-slate-600">
                              {formatFileSize(uploadFile.file.size)}
                              {uploadFile.metadata?.pages && ` • ${uploadFile.metadata.pages} pages`}
                              {uploadFile.metadata?.chunks && ` • ${uploadFile.metadata.chunks} chunks`}
                            </p>
                          </div>

                          {/* Status Icon */}
                          <div className="ml-4">
                            {uploadFile.status === 'uploading' && (
                              <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                            )}
                            {uploadFile.status === 'success' && (
                              <CheckCircle2 className="w-5 h-5 text-green-600" />
                            )}
                            {uploadFile.status === 'error' && (
                              <XCircle className="w-5 h-5 text-red-600" />
                            )}
                          </div>
                        </div>

                        {/* Progress Bar */}
                        {(uploadFile.status === 'uploading' || uploadFile.status === 'processing') && (
                          <div className="mb-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs text-slate-600">
                                {uploadFile.status === 'uploading' ? 'Uploading...' : 'Processing...'}
                              </span>
                              <span className="text-xs font-medium text-blue-600">
                                {uploadFile.progress}%
                              </span>
                            </div>
                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${uploadFile.progress}%` }}
                                transition={{ duration: 0.3 }}
                                className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"
                              />
                            </div>
                          </div>
                        )}

                        {/* Error Message */}
                        {uploadFile.status === 'error' && uploadFile.error && (
                          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg mb-3">
                            <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                            <p className="text-sm text-red-700">{uploadFile.error}</p>
                          </div>
                        )}

                        {/* Success Message */}
                        {uploadFile.status === 'success' && (
                          <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                            <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                            <p className="text-sm text-green-700">
                              Document processed successfully! You can now ask questions about this file.
                            </p>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-2 mt-3">
                          {uploadFile.status === 'error' && (
                            <button
                              onClick={() => retryUpload(uploadFile.id)}
                              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                            >
                              <Upload className="w-4 h-4" />
                              Retry
                            </button>
                          )}
                          {uploadFile.status === 'success' && uploadFile.docId && (
                            <Link
                              href={`/dashboard/documents/${uploadFile.docId}`}
                              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                            >
                              <FileText className="w-4 h-4" />
                              Open Document
                              <ChevronRight className="w-4 h-4" />
                            </Link>
                          )}
                          <button
                            onClick={() => removeFile(uploadFile.id)}
                            className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                          >
                            <X className="w-4 h-4" />
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Summary */}
              {allCompleted && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-8 p-6 bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-2xl"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-white rounded-lg shadow-sm">
                      <CheckCircle2 className="w-6 h-6 text-green-600" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">Upload Complete!</h3>
                  </div>
                  <p className="text-slate-700">
                    Successfully uploaded {successCount} of {files.length} documents. Your files are now ready for AI-powered analysis.
                  </p>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
