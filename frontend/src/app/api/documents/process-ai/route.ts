/**
 * AI Document Processing Endpoint
 * ===============================
 * 
 * POST /api/documents/process-ai
 * Processes uploaded documents with AI analysis using Gemini
 * - Text extraction
 * - Summarization
 * - Citation extraction
 * - Keyword extraction
 * - Content analysis
 */

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { getDatabase } from '@/lib/database/mongodb';
import { getGeminiService } from '@/lib/services/gemini-ai';
import { ResearchService } from '@/lib/database/research';

// PDF text extraction (simplified - in production use PDF.js or similar)
async function extractTextFromPDF(fileUrl: string): Promise<string> {
  try {
    // This is a placeholder - in production you would use a proper PDF parser
    // For now, return a simple message indicating PDF processing
    return `[PDF Document processed from ${fileUrl}. In production, this would contain the actual extracted text using a PDF parsing library like PDF.js or similar.]`;
  } catch (error) {
    console.error('Error extracting PDF text:', error);
    throw new Error('Failed to extract text from PDF');
  }
}

// Generic text extraction based on file type
async function extractTextFromDocument(fileUrl: string, mimeType: string): Promise<string> {
  try {
    if (mimeType === 'application/pdf') {
      return await extractTextFromPDF(fileUrl);
    } else if (mimeType.startsWith('text/')) {
      // For text files, fetch and return content
      const response = await fetch(fileUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch document: ${response.statusText}`);
      }
      return await response.text();
    } else {
      // For other document types, use placeholder text
      return `[Document of type ${mimeType} processed from ${fileUrl}. Text extraction would be implemented based on file type.]`;
    }
  } catch (error) {
    console.error('Error extracting document text:', error);
    throw new Error('Failed to extract text from document');
  }
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
    const { documentId, fileUrl, fileName, mimeType } = await request.json();

    if (!documentId || !fileUrl || !fileName) {
      return NextResponse.json(
        { error: 'Missing required parameters: documentId, fileUrl, fileName' },
        { status: 400 }
      );
    }

    console.log(`Starting AI processing for document: ${fileName} (${documentId})`);

    // Update document status to processing
    const db = await getDatabase();
    const documentsCollection = db.collection('documents');
    
    await documentsCollection.updateOne(
      { _id: documentId, user_id: userId },
      {
        $set: {
          processing_status: 'processing',
          updated_at: new Date()
        }
      }
    );

    // Log processing activity
    await ResearchService.logActivity(userId, {
      type: 'process',
      action: 'Started AI Processing',
      target: fileName,
      targetType: 'document',
      status: 'in_progress'
    });

    let processingResults = {
      extractedText: '',
      summary: null,
      citations: [],
      keywords: [],
      confidence: 0,
      processingTime: 0
    };

    const startTime = Date.now();

    try {
      // Step 1: Extract text from document
      console.log('Extracting text from document...');
      const extractedText = await extractTextFromDocument(fileUrl, mimeType || 'application/pdf');
      processingResults.extractedText = extractedText;

      // Initialize Gemini AI service
      const geminiService = getGeminiService();

      // Step 2: Generate AI summary
      console.log('Generating AI summary...');
      try {
        const summary = await geminiService.summarizeDocument(
          extractedText,
          fileName,
          {
            style: 'academic',
            maxLength: 500
          }
        );
        processingResults.summary = summary;
        processingResults.confidence = Math.max(processingResults.confidence, summary.confidence);
      } catch (summaryError) {
        console.warn('Summary generation failed:', summaryError);
        processingResults.summary = {
          title: fileName,
          authors: [],
          abstract: 'Summary generation failed. Please try again.',
          keyFindings: [],
          methodology: '',
          conclusions: '',
          keywords: [],
          confidence: 0
        };
      }

      // Step 3: Extract citations
      console.log('Extracting citations...');
      try {
        const citations = await geminiService.extractCitations(extractedText, fileName);
        processingResults.citations = citations;
        
        // Save citations to database
        if (citations.length > 0) {
          await ResearchService.saveCitations(
            userId,
            documentId,
            citations.map(citation => ({
              type: citation.type,
              title: citation.title,
              authors: citation.authors,
              year: citation.year,
              journal: citation.journal,
              volume: citation.volume,
              issue: citation.issue,
              pages: citation.pages,
              publisher: citation.publisher,
              doi: citation.doi,
              url: citation.url,
              isbn: citation.isbn,
              abstract: citation.abstract,
              extractedFrom: citation.extractedFrom,
              confidence: citation.confidence,
              context: citation.originalText,
              apa: citation.formattedCitations.apa,
              mla: citation.formattedCitations.mla,
              ieee: citation.formattedCitations.ieee,
              harvard: citation.formattedCitations.chicago, // Using chicago as harvard
              chicago: citation.formattedCitations.chicago
            }))
          );
        }
      } catch (citationError) {
        console.warn('Citation extraction failed:', citationError);
        processingResults.citations = [];
      }

      // Step 4: Extract keywords
      console.log('Extracting keywords...');
      try {
        const keywords = await geminiService.extractKeywords(extractedText, 10);
        processingResults.keywords = keywords;
      } catch (keywordError) {
        console.warn('Keyword extraction failed:', keywordError);
        processingResults.keywords = [];
      }

      processingResults.processingTime = Date.now() - startTime;

      // Step 5: Update document in database with processing results
      const updateData = {
        processing_status: 'completed',
        processed_at: new Date(),
        extracted_text: extractedText,
        summary: processingResults.summary?.abstract || '',
        citations: processingResults.citations,
        keywords: processingResults.keywords,
        topics: processingResults.summary?.keywords || [],
        processing_time: processingResults.processingTime,
        confidence_score: processingResults.confidence,
        language: 'en', // Could be detected via Gemini
        word_count: extractedText.split(/\s+/).length,
        updated_at: new Date()
      };

      await documentsCollection.updateOne(
        { _id: documentId, user_id: userId },
        { $set: updateData }
      );

      // Update document processing in research service
      await ResearchService.updateDocumentProcessing(documentId, {
        status: 'processed',
        extractedText: extractedText,
        summary: processingResults.summary?.abstract,
        citations: processingResults.citations,
        keywords: processingResults.keywords,
        topics: processingResults.summary?.keywords || [],
        processingTime: processingResults.processingTime,
        confidence: processingResults.confidence,
        language: 'en',
        wordCount: extractedText.split(/\s+/).length
      });

      // Log successful processing
      await ResearchService.logActivity(userId, {
        type: 'process',
        action: 'Completed AI Processing',
        target: fileName,
        targetType: 'document',
        status: 'completed',
        result: {
          citationsFound: processingResults.citations.length,
          keywordsExtracted: processingResults.keywords.length,
          confidence: processingResults.confidence,
          processingTimeMs: processingResults.processingTime
        },
        processingTime: processingResults.processingTime
      });

      console.log(`AI processing completed successfully for ${fileName}`);

      return NextResponse.json({
        success: true,
        documentId,
        results: {
          extractedText: extractedText.substring(0, 1000) + (extractedText.length > 1000 ? '...' : ''),
          summary: processingResults.summary,
          citationsCount: processingResults.citations.length,
          keywordsCount: processingResults.keywords.length,
          confidence: processingResults.confidence,
          processingTime: processingResults.processingTime
        }
      });

    } catch (processingError) {
      console.error('AI processing error:', processingError);

      // Update document status to failed
      await documentsCollection.updateOne(
        { _id: documentId, user_id: userId },
        {
          $set: {
            processing_status: 'failed',
            error_message: processingError.message,
            updated_at: new Date()
          }
        }
      );

      // Log failed processing
      await ResearchService.logActivity(userId, {
        type: 'process',
        action: 'Failed AI Processing',
        target: fileName,
        targetType: 'document',
        status: 'failed',
        error: processingError.message
      });

      throw processingError;
    }

  } catch (error) {
    console.error('Document processing error:', error);
    return NextResponse.json(
      { 
        error: 'Document processing failed',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function GET(request: NextRequest) {
  try {
    const geminiService = getGeminiService();
    const isConnected = await geminiService.testConnection();
    
    return NextResponse.json({
      service: 'AI Document Processing',
      status: isConnected ? 'healthy' : 'degraded',
      features: [
        'Text extraction',
        'AI summarization',
        'Citation extraction',
        'Keyword extraction'
      ],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({
      service: 'AI Document Processing',
      status: 'unhealthy',
      error: 'Service unavailable',
      timestamp: new Date().toISOString()
    }, { status: 503 });
  }
}