/**
 * Shared Document Service
 * Provides common functionality for document management across research pages
 */

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export interface DocumentUploadResult {
  success: boolean
  document_id?: string
  status: string
  message?: string
  error?: string
}

export interface ResearchDocument {
  documentId: string
  userId: string
  name: string
  type: string
  size: number
  uploadDate: Date
  status: 'uploading' | 'processing' | 'processed' | 'failed'
  originalName: string
  mimeType: string
  filePath?: string
  extractedText?: string
  summary?: any
  citations?: any[]
  topics?: string[]
  keywords?: string[]
  processingTime?: number
  confidence?: number
  language?: string
  pageCount?: number
  wordCount?: number
  category?: string
  domain?: string
  authors?: string[]
  publicationDate?: Date
  journal?: string
  doi?: string
  createdAt: Date
  updatedAt: Date
}

export class DocumentService {
  /**
   * Upload a document and start processing
   */
  static async uploadDocument(file: File): Promise<DocumentUploadResult> {
    try {
      if (!file.name.endsWith('.pdf')) {
        return {
          success: false,
          status: 'error',
          error: 'Only PDF files are supported'
        }
      }

      if (file.size > 50 * 1024 * 1024) {
        return {
          success: false,
          status: 'error', 
          error: 'File too large (max 50MB)'
        }
      }

      // Get authenticated session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError || !session?.user) {
        return {
          success: false,
          status: 'error',
          error: 'Authentication required'
        }
      }

      // Step 1: Upload document to storage
      const formData = new FormData()
      formData.append('file', file)
      formData.append('userId', session.user.id)
      
      const uploadResponse = await fetch('/api/documents/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        },
        body: formData,
      })
      
      if (!uploadResponse.ok) {
        const error = await uploadResponse.json()
        return {
          success: false,
          status: 'error',
          error: error.error || 'Upload failed'
        }
      }

      const uploadResult = await uploadResponse.json()
      console.log('Upload successful, document ID:', uploadResult.id)

      // Step 2: Start AI processing
      const processingResponse = await fetch('/api/documents/process-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          documentId: uploadResult.id,
          fileUrl: uploadResult.storageUrl,
          fileName: file.name,
          mimeType: file.type || 'application/pdf'
        }),
      })
      
      if (processingResponse.ok) {
        return {
          success: true,
          document_id: uploadResult.id,
          status: 'processing',
          message: 'Document uploaded successfully and processing started'
        }
      } else {
        const error = await processingResponse.json()
        // Upload succeeded but processing failed - still return success with warning
        console.warn('Processing failed but upload succeeded:', error)
        return {
          success: true,
          document_id: uploadResult.id,
          status: 'uploaded',
          message: 'Document uploaded successfully but processing failed. You can retry processing later.'
        }
      }
    } catch (error) {
      console.error('Upload error:', error)
      return {
        success: false,
        status: 'error',
        error: 'Upload failed due to network error'
      }
    }
  }

  /**
   * Get all user documents
   */
  static async getUserDocuments(limit: number = 50): Promise<ResearchDocument[]> {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return []
      
      const response = await fetch(`/api/research/documents?limit=${limit}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        const documents = await response.json()
        return documents.map(this.transformDocument)
      } else {
        console.error('Failed to fetch documents')
        return []
      }
    } catch (error) {
      console.error('Error fetching documents:', error)
      return []
    }
  }

  /**
   * Get a specific document by ID
   */
  static async getDocument(documentId: string): Promise<ResearchDocument | null> {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return null
      
      const response = await fetch(`/api/research/documents/${documentId}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        const document = await response.json()
        return this.transformDocument(document)
      } else {
        console.error('Failed to fetch document')
        return null
      }
    } catch (error) {
      console.error('Error fetching document:', error)
      return null
    }
  }

  /**
   * Get document citations
   */
  static async getDocumentCitations(documentId: string) {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return []
      
      const response = await fetch(`/api/research/documents/${documentId}/citations`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        const result = await response.json()
        return result.citations || []
      } else {
        console.error('Failed to fetch citations')
        return []
      }
    } catch (error) {
      console.error('Error fetching citations:', error)
      return []
    }
  }

  /**
   * Get document summary
   */
  static async getDocumentSummary(documentId: string) {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return null
      
      const response = await fetch(`/api/research/documents/${documentId}/summary`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        const result = await response.json()
        return result.summary
      } else {
        console.error('Failed to fetch summary')
        return null
      }
    } catch (error) {
      console.error('Error fetching summary:', error)
      return null
    }
  }

  /**
   * Get document literature analysis
   */
  static async getDocumentLiteratureAnalysis(documentId: string) {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return null
      
      const response = await fetch(`/api/research/documents/${documentId}/literature-analysis`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        const result = await response.json()
        return result.literature_analysis
      } else {
        console.error('Failed to fetch literature analysis')
        return null
      }
    } catch (error) {
      console.error('Error fetching literature analysis:', error)
      return null
    }
  }

  /**
   * Poll for document processing status
   */
  static async pollDocumentStatus(
    documentId: string, 
    onUpdate: (document: ResearchDocument) => void,
    maxAttempts: number = 30
  ): Promise<void> {
    let attempts = 0
    
    const poll = async () => {
      try {
        const document = await this.getDocument(documentId)
        if (!document) return
        
        onUpdate(document)
        
        if (document.status === 'processed' || document.status === 'failed') {
          return // Done polling
        }
        
        if (attempts < maxAttempts) {
          attempts++
          setTimeout(poll, 2000) // Poll every 2 seconds
        }
      } catch (error) {
        console.error('Error polling document status:', error)
      }
    }
    
    // Start polling after 1 second
    setTimeout(poll, 1000)
  }

  /**
   * Delete a document
   */
  static async deleteDocument(documentId: string): Promise<boolean> {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return false
      
      const response = await fetch(`/api/research/documents/${documentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })
      
      return response.ok
    } catch (error) {
      console.error('Error deleting document:', error)
      return false
    }
  }

  /**
   * Transform raw document data to ResearchDocument interface
   */
  private static transformDocument(doc: any): ResearchDocument {
    return {
      documentId: doc.documentId || doc._id,
      userId: doc.userId || doc.user_id,
      name: doc.name || doc.file_name,
      type: doc.type || doc.file_type || 'application/pdf',
      size: doc.size || doc.file_size || 0,
      uploadDate: new Date(doc.uploadDate || doc.created_at),
      status: this.mapStatus(doc.status || doc.processing_status),
      originalName: doc.originalName || doc.original_filename || doc.name,
      mimeType: doc.mimeType || doc.file_type || 'application/pdf',
      filePath: doc.filePath || doc.file_path,
      extractedText: doc.extractedText || doc.extracted_text,
      summary: doc.summary,
      citations: doc.citations || [],
      topics: doc.topics || [],
      keywords: doc.keywords || [],
      processingTime: doc.processingTime || doc.processing_time,
      confidence: doc.confidence || doc.confidence_score,
      language: doc.language || 'en',
      pageCount: doc.pageCount || doc.page_count,
      wordCount: doc.wordCount || doc.word_count,
      category: doc.category,
      domain: doc.domain,
      authors: doc.authors || [],
      publicationDate: doc.publicationDate ? new Date(doc.publicationDate) : new Date(),
      journal: doc.journal,
      doi: doc.doi,
      createdAt: new Date(doc.createdAt || doc.created_at),
      updatedAt: new Date(doc.updatedAt || doc.updated_at || doc.created_at)
    }
  }

  /**
   * Map different status formats to standard format
   */
  private static mapStatus(status: string): 'uploading' | 'processing' | 'processed' | 'failed' {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'processed':
        return 'processed'
      case 'processing':
        return 'processing'
      case 'failed':
      case 'error':
        return 'failed'
      default:
        return 'uploading'
    }
  }
}

export default DocumentService