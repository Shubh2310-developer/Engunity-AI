/**
 * Research Document Summarization API
 * ===================================
 * 
 * POST /api/research/summarize
 * Generate AI-powered summaries of research documents
 * Supports multiple summarization styles and formats
 */

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { getDatabase } from '@/lib/database/mongodb';
import { GroqAIService, DocumentSummary } from '@/lib/services/groq-ai';
import { ResearchService } from '@/lib/database/research';

interface SummarizeRequest {
  documentIds: string[];
  style: 'academic' | 'executive' | 'detailed' | 'brief';
  focus?: string[];
  maxLength?: number;
  format?: 'structured' | 'paragraph' | 'bullets';
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    
    if (authError || !session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const requestBody: SummarizeRequest = await request.json();
    
    const { 
      documentIds, 
      style = 'academic', 
      focus = [], 
      maxLength = 500,
      format = 'structured'
    } = requestBody;

    if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
      return NextResponse.json(
        { error: 'Document IDs are required' },
        { status: 400 }
      );
    }

    if (documentIds.length > 10) {
      return NextResponse.json(
        { error: 'Cannot summarize more than 10 documents at once' },
        { status: 400 }
      );
    }

    console.log(`Summarizing ${documentIds.length} documents for user ${userId}`);

    // Get documents from database
    const db = await getDatabase();
    const documentsCollection = db.collection('documents');
    
    const { ObjectId } = require('mongodb');
    const documents = await documentsCollection
      .find({
        _id: { $in: documentIds.map(id => new ObjectId(id)) },
        user_id: userId,
        processing_status: 'completed'
      })
      .toArray();

    if (documents.length === 0) {
      return NextResponse.json(
        { error: 'No accessible documents found' },
        { status: 404 }
      );
    }

    // Process documents with Groq AI service
    const summaries: (DocumentSummary & { documentId: string; fileName: string })[] = [];
    const errors: Array<{ documentId: string; fileName: string; error: string }> = [];

    // Process each document
    for (const doc of documents) {
      try {
        console.log(`Summarizing document: ${doc.file_name}`);
        
        const text = doc.extracted_text || '';
        if (!text) {
          errors.push({
            documentId: doc._id.toString(),
            fileName: doc.file_name,
            error: 'No extracted text available'
          });
          continue;
        }

        const summary = await GroqAIService.summarizeDocument(
          text,
          doc.file_name
        );

        summaries.push({
          ...summary,
          documentId: doc._id.toString(),
          fileName: doc.file_name
        });

        // Update document with new summary if better than existing
        if (!doc.summary || summary.confidence > (doc.confidence_score || 0)) {
          await documentsCollection.updateOne(
            { _id: doc._id },
            {
              $set: {
                summary: summary.abstract,
                confidence_score: summary.confidence,
                updated_at: new Date()
              }
            }
          );
        }

        // Log summarization activity
        await ResearchService.logActivity(userId, {
          type: 'summarize',
          action: 'Generated Summary',
          target: doc.file_name,
          targetType: 'document',
          status: 'completed',
          result: {
            style,
            confidence: summary.confidence,
            wordCount: summary.abstract.split(/\s+/).length
          }
        });

      } catch (error) {
        console.error(`Error summarizing document ${doc.file_name}:`, error);
        errors.push({
          documentId: doc._id.toString(),
          fileName: doc.file_name,
          error: error.message || 'Summarization failed'
        });
      }
    }

    // Generate combined summary if multiple documents
    let combinedSummary = null;
    if (summaries.length > 1) {
      try {
        console.log('Generating combined summary...');
        
        const combinedText = summaries
          .map(s => `Document: ${s.fileName}\nSummary: ${s.abstract}\nKey Findings: ${s.keyFindings.join(', ')}`)
          .join('\n\n---\n\n');

        const combined = await GroqAIService.summarizeDocument(
          combinedText,
          `Combined Summary of ${summaries.length} Documents`
        );

        combinedSummary = combined;
      } catch (error) {
        console.warn('Failed to generate combined summary:', error);
      }
    }

    // Format response based on requested format
    const formattedSummaries = summaries.map(summary => {
      switch (format) {
        case 'paragraph':
          return {
            documentId: summary.documentId,
            fileName: summary.fileName,
            summary: summary.abstract,
            confidence: summary.confidence
          };
        
        case 'bullets':
          return {
            documentId: summary.documentId,
            fileName: summary.fileName,
            summary: {
              abstract: summary.abstract,
              keyPoints: summary.keyFindings,
              methodology: summary.methodology,
              conclusions: summary.conclusions
            },
            confidence: summary.confidence
          };
        
        case 'structured':
        default:
          return {
            documentId: summary.documentId,
            fileName: summary.fileName,
            summary: {
              title: summary.title,
              authors: summary.authors,
              abstract: summary.abstract,
              keyFindings: summary.keyFindings,
              methodology: summary.methodology,
              conclusions: summary.conclusions,
              keywords: summary.keywords
            },
            confidence: summary.confidence
          };
      }
    });

    // Update user stats
    await ResearchService.updateUserStats(userId);

    const response = {
      success: true,
      totalDocuments: documentIds.length,
      processedDocuments: summaries.length,
      failedDocuments: errors.length,
      style,
      format,
      summaries: formattedSummaries,
      combinedSummary: combinedSummary ? {
        abstract: combinedSummary.abstract,
        keyFindings: combinedSummary.keyFindings,
        conclusions: combinedSummary.conclusions,
        confidence: combinedSummary.confidence
      } : null,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Summarization error:', error);
    return NextResponse.json(
      { 
        error: 'Summarization failed',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

// GET endpoint for summarization options and status
export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    
    if (authError || !session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const url = new URL(request.url);
    const documentId = url.searchParams.get('documentId');

    if (documentId) {
      // Get existing summary for a specific document
      const db = await getDatabase();
      const documentsCollection = db.collection('documents');
      const { ObjectId } = require('mongodb');
      
      const document = await documentsCollection.findOne({
        _id: new ObjectId(documentId),
        user_id: session.user.id
      });

      if (!document) {
        return NextResponse.json(
          { error: 'Document not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        documentId,
        fileName: document.file_name,
        hasSummary: !!document.summary,
        summary: document.summary,
        confidence: document.confidence_score,
        lastUpdated: document.updated_at,
        canSummarize: !!document.extracted_text
      });
    }

    // Return summarization options and capabilities
    return NextResponse.json({
      service: 'Document Summarization',
      status: 'available',
      options: {
        styles: ['academic', 'executive', 'detailed', 'brief'],
        formats: ['structured', 'paragraph', 'bullets'],
        maxDocuments: 10,
        maxLengthRange: [100, 2000]
      },
      features: [
        'Single document summarization',
        'Multi-document synthesis',
        'Custom focus areas',
        'Multiple output formats',
        'Confidence scoring'
      ],
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Summarization service error:', error);
    return NextResponse.json(
      { error: 'Service error' },
      { status: 500 }
    );
  }
}