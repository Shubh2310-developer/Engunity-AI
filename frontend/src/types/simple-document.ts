/**
 * Simplified Document Types for Current Implementation
 * Compatible with both Firebase and Supabase storage systems
 */

export interface SimpleDocument {
  id: string;
  userId: string;
  name: string;
  type: 'PDF' | 'DOCX' | 'XLSX' | 'TXT' | 'MD' | 'CSV' | 'HTML' | 'JSON' | 'RTF' | 'PPTX' | 'ODT' | 'ODS' | 'ODP';
  size: string; // Formatted size like "1.2 MB"
  category: string;
  status: 'uploading' | 'processing' | 'processed' | 'failed' | 'ready' | 'error';
  uploadedAt: { seconds: number } | Date;
  processedAt?: { seconds: number } | Date;
  storageUrl: string;
  metadata: {
    pages?: number;
    wordCount?: number;
    language?: string;
    extractedText?: string;
  };
  tags: string[];
}

export type SimpleDocumentStatus = SimpleDocument['status'];

export default SimpleDocument;