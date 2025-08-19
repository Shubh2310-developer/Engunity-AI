'use client'

import React, { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { 
  Upload, 
  FileText, 
  Loader2, 
  CheckCircle, 
  AlertCircle,
  Plus,
  Brain,
  Zap
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { DocumentService } from '@/lib/services/document-service'

interface PDFUploadButtonProps {
  onUploadStart?: (files: File[]) => void
  onUploadComplete?: (results: any[]) => void
  onUploadError?: (error: string) => void
  variant?: 'button' | 'zone'
  className?: string
  disabled?: boolean
  showProgress?: boolean
  children?: React.ReactNode
}

interface UploadState {
  isUploading: boolean
  progress: number
  uploadedFiles: Array<{
    file: File
    status: 'uploading' | 'processing' | 'completed' | 'error'
    documentId?: string
    error?: string
  }>
}

export function PDFUploadButton({
  onUploadStart,
  onUploadComplete,
  onUploadError,
  variant = 'button',
  className = '',
  disabled = false,
  showProgress = true,
  children
}: PDFUploadButtonProps) {
  const [uploadState, setUploadState] = useState<UploadState>({
    isUploading: false,
    progress: 0,
    uploadedFiles: []
  })
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    if (files.length === 0) return

    // Filter for PDF files only
    const pdfFiles = files.filter(file => file.type === 'application/pdf' || file.name.endsWith('.pdf'))
    
    if (pdfFiles.length === 0) {
      onUploadError?.('Please select PDF files only')
      return
    }

    // Check file sizes
    const oversizedFiles = pdfFiles.filter(file => file.size > 10 * 1024 * 1024)
    if (oversizedFiles.length > 0) {
      onUploadError?.(`Files too large (max 10MB): ${oversizedFiles.map(f => f.name).join(', ')}`)
      return
    }

    await uploadFiles(pdfFiles)
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const uploadFiles = async (files: File[]) => {
    setUploadState({
      isUploading: true,
      progress: 0,
      uploadedFiles: files.map(file => ({
        file,
        status: 'uploading'
      }))
    })

    onUploadStart?.(files)

    const results: any[] = []
    let completedCount = 0

    try {
      // Upload files sequentially to avoid overwhelming the server
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        
        try {
          // Update file status to uploading
          setUploadState(prev => ({
            ...prev,
            uploadedFiles: prev.uploadedFiles.map((uf, index) => 
              index === i ? { ...uf, status: 'uploading' } : uf
            )
          }))

          // Upload the file
          const result = await DocumentService.uploadDocument(file)
          
          if (result.success) {
            // Update file status to processing
            setUploadState(prev => ({
              ...prev,
              uploadedFiles: prev.uploadedFiles.map((uf, index) => 
                index === i ? { 
                  ...uf, 
                  status: 'processing', 
                  documentId: result.document_id 
                } : uf
              )
            }))

            results.push({
              file,
              success: true,
              documentId: result.document_id,
              status: result.status
            })

            // Start polling for completion if document ID is available
            if (result.document_id) {
              pollDocumentProcessing(result.document_id, i)
            }
          } else {
            // Update file status to error
            setUploadState(prev => ({
              ...prev,
              uploadedFiles: prev.uploadedFiles.map((uf, index) => 
                index === i ? { 
                  ...uf, 
                  status: 'error', 
                  error: result.error 
                } : uf
              )
            }))

            results.push({
              file,
              success: false,
              error: result.error
            })
          }
        } catch (error) {
          // Update file status to error
          setUploadState(prev => ({
            ...prev,
            uploadedFiles: prev.uploadedFiles.map((uf, index) => 
              index === i ? { 
                ...uf, 
                status: 'error', 
                error: 'Upload failed' 
              } : uf
            )
          }))

          results.push({
            file,
            success: false,
            error: 'Upload failed'
          })
        }

        completedCount++
        const progress = (completedCount / files.length) * 100
        setUploadState(prev => ({ ...prev, progress }))
      }

      onUploadComplete?.(results)

      // Reset upload state after a delay
      setTimeout(() => {
        setUploadState({
          isUploading: false,
          progress: 0,
          uploadedFiles: []
        })
      }, 3000)

    } catch (error) {
      console.error('Upload error:', error)
      onUploadError?.('Upload failed due to network error')
      
      setUploadState({
        isUploading: false,
        progress: 0,
        uploadedFiles: []
      })
    }
  }

  const pollDocumentProcessing = async (documentId: string, fileIndex: number) => {
    let attempts = 0
    const maxAttempts = 30
    
    const poll = async () => {
      try {
        const document = await DocumentService.getDocument(documentId)
        
        if (document) {
          if (document.status === 'processed') {
            // Update file status to completed
            setUploadState(prev => ({
              ...prev,
              uploadedFiles: prev.uploadedFiles.map((uf, index) => 
                index === fileIndex ? { ...uf, status: 'completed' } : uf
              )
            }))
            return
          } else if (document.status === 'failed') {
            // Update file status to error
            setUploadState(prev => ({
              ...prev,
              uploadedFiles: prev.uploadedFiles.map((uf, index) => 
                index === fileIndex ? { ...uf, status: 'error', error: 'Processing failed' } : uf
              )
            }))
            return
          }
        }

        // Continue polling if not completed and under max attempts
        if (attempts < maxAttempts) {
          attempts++
          setTimeout(poll, 2000)
        }
      } catch (error) {
        console.error('Error polling document status:', error)
      }
    }

    // Start polling after 2 seconds
    setTimeout(poll, 2000)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'uploading':
        return <Upload className="h-3 w-3 text-blue-500" />
      case 'processing':
        return <Brain className="h-3 w-3 text-purple-500 animate-pulse" />
      case 'completed':
        return <CheckCircle className="h-3 w-3 text-green-500" />
      case 'error':
        return <AlertCircle className="h-3 w-3 text-red-500" />
      default:
        return <FileText className="h-3 w-3" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'uploading':
        return 'text-blue-600'
      case 'processing':
        return 'text-purple-600'
      case 'completed':
        return 'text-green-600'
      case 'error':
        return 'text-red-600'
      default:
        return 'text-slate-600'
    }
  }

  if (variant === 'zone') {
    return (
      <div className={`space-y-4 ${className}`}>
        <div
          className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-6 text-center hover:border-slate-400 dark:hover:border-slate-500 transition-colors cursor-pointer group"
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,application/pdf"
            onChange={handleFileSelect}
            className="hidden"
            disabled={disabled || uploadState.isUploading}
          />
          
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="mx-auto w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform"
          >
            {uploadState.isUploading ? (
              <Loader2 className="h-6 w-6 text-white animate-spin" />
            ) : (
              <Upload className="h-6 w-6 text-white" />
            )}
          </motion.div>
          
          <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-1">
            {children || 'Upload Research PDFs'}
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Drag & drop files here, or click to browse
          </p>
          <div className="flex items-center justify-center gap-4 mt-3 text-xs text-slate-500">
            <div className="flex items-center gap-1">
              <FileText className="h-3 w-3" />
              PDF only
            </div>
            <div className="flex items-center gap-1">
              <Zap className="h-3 w-3" />
              Max 10MB
            </div>
            <div className="flex items-center gap-1">
              <Brain className="h-3 w-3" />
              AI Processing
            </div>
          </div>
        </div>

        {/* Upload Progress */}
        {uploadState.isUploading && showProgress && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            <Alert className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20">
              <Brain className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <AlertDescription className="text-blue-800 dark:text-blue-300">
                <div className="flex items-center justify-between">
                  <span>Processing {uploadState.uploadedFiles.length} file{uploadState.uploadedFiles.length !== 1 ? 's' : ''}...</span>
                  <span className="text-sm">{Math.round(uploadState.progress)}%</span>
                </div>
                <Progress value={uploadState.progress} className="h-2 mt-2" />
              </AlertDescription>
            </Alert>

            {/* Individual file progress */}
            <div className="space-y-2">
              {uploadState.uploadedFiles.map((fileUpload, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700"
                >
                  {getStatusIcon(fileUpload.status)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                      {fileUpload.file.name}
                    </p>
                    <p className={`text-xs ${getStatusColor(fileUpload.status)}`}>
                      {fileUpload.status === 'uploading' && 'Uploading...'}
                      {fileUpload.status === 'processing' && 'AI processing...'}
                      {fileUpload.status === 'completed' && 'Processing complete'}
                      {fileUpload.status === 'error' && (fileUpload.error || 'Upload failed')}
                    </p>
                  </div>
                  <div className="text-xs text-slate-500">
                    {(fileUpload.file.size / 1024 / 1024).toFixed(1)}MB
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    )
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,application/pdf"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled || uploadState.isUploading}
      />
      
      <Button
        onClick={() => fileInputRef.current?.click()}
        disabled={disabled || uploadState.isUploading}
        className={className}
        variant="default"
      >
        {uploadState.isUploading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Uploading...
          </>
        ) : (
          <>
            <Plus className="mr-2 h-4 w-4" />
            {children || 'Upload PDF'}
          </>
        )}
      </Button>

      {/* Compact progress display for button variant */}
      {uploadState.isUploading && showProgress && variant === 'button' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mt-2"
        >
          <div className="text-xs text-slate-600 dark:text-slate-400 mb-1">
            Processing {uploadState.uploadedFiles.length} file{uploadState.uploadedFiles.length !== 1 ? 's' : ''}...
          </div>
          <Progress value={uploadState.progress} className="h-1" />
        </motion.div>
      )}
    </>
  )
}