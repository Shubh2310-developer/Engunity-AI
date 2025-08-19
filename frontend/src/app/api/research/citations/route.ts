/**
 * Research Citations Management API
 * =================================
 * 
 * GET /api/research/citations - Get user's citations
 * POST /api/research/citations - Extract citations from documents
 * PUT /api/research/citations - Update citation formatting
 */

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { getDatabase } from '@/lib/database/mongodb';
import { GroqAIService, ExtractedCitation } from '@/lib/services/groq-ai';
import { ResearchService } from '@/lib/database/research';

// GET: Retrieve user's citations
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

    const userId = session.user.id;
    const url = new URL(request.url);
    
    const documentId = url.searchParams.get('documentId');
    const format = url.searchParams.get('format') as 'apa' | 'mla' | 'ieee' | 'chicago' | 'all';
    const type = url.searchParams.get('type') as 'book' | 'article' | 'website' | 'journal' | 'conference' | 'thesis';
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const export_format = url.searchParams.get('export');

    // Get citations using Research Service
    const citations = await ResearchService.getUserCitations(
      userId,
      documentId || undefined,
      limit,
      offset
    );

    // Filter by type if specified
    let filteredCitations = citations;
    if (type) {
      filteredCitations = citations.filter(citation => citation.type === type);
    }

    // Format citations based on request
    if (export_format === 'bibtex') {
      // Export as BibTeX format
      const bibtex = generateBibTeX(filteredCitations);
      return new NextResponse(bibtex, {
        headers: {
          'Content-Type': 'text/plain',
          'Content-Disposition': 'attachment; filename="citations.bib"'
        }
      });
    }

    if (export_format === 'ris') {
      // Export as RIS format
      const ris = generateRIS(filteredCitations);
      return new NextResponse(ris, {
        headers: {
          'Content-Type': 'text/plain',
          'Content-Disposition': 'attachment; filename="citations.ris"'
        }
      });
    }

    // Transform citations for API response
    const formattedCitations = filteredCitations.map(citation => {
      const baseCitation = {
        citationId: citation.citationId,
        documentId: citation.documentId,
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
        extractedFrom: citation.extractedFrom,
        confidence: citation.confidence,
        createdAt: citation.createdAt,
        updatedAt: citation.updatedAt
      };

      // Add formatted citations based on request
      if (format === 'all' || !format) {
        return {
          ...baseCitation,
          formattedCitations: {
            apa: citation.apa,
            mla: citation.mla,
            ieee: citation.ieee,
            chicago: citation.chicago
          }
        };
      } else {
        return {
          ...baseCitation,
          formatted: citation[format] || ''
        };
      }
    });

    // Get citation statistics
    const stats = {
      total: filteredCitations.length,
      byType: filteredCitations.reduce((acc, citation) => {
        acc[citation.type] = (acc[citation.type] || 0) + 1;
        return acc;
      }, {}),
      byYear: filteredCitations.reduce((acc, citation) => {
        const year = citation.year || 'unknown';
        acc[year] = (acc[year] || 0) + 1;
        return acc;
      }, {}),
      averageConfidence: filteredCitations.reduce((sum, c) => sum + c.confidence, 0) / filteredCitations.length || 0
    };

    return NextResponse.json({
      citations: formattedCitations,
      stats,
      pagination: {
        limit,
        offset,
        total: filteredCitations.length,
        hasMore: filteredCitations.length === limit
      }
    });

  } catch (error) {
    console.error('Error fetching citations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch citations' },
      { status: 500 }
    );
  }
}

// POST: Extract citations from documents
export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    
    if (authError || !session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const { documentIds, reprocess = false } = await request.json();

    if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
      return NextResponse.json(
        { error: 'Document IDs are required' },
        { status: 400 }
      );
    }

    if (documentIds.length > 5) {
      return NextResponse.json(
        { error: 'Cannot process more than 5 documents at once' },
        { status: 400 }
      );
    }

    console.log(`Extracting citations from ${documentIds.length} documents for user ${userId}`);

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

    // Process citations with Groq AI service
    const results = [];
    const errors = [];

    // Process each document
    for (const doc of documents) {
      try {
        console.log(`Extracting citations from: ${doc.file_name}`);

        // Check if citations already exist and reprocessing is not requested
        if (!reprocess && doc.citations && doc.citations.length > 0) {
          results.push({
            documentId: doc._id.toString(),
            fileName: doc.file_name,
            citationsFound: doc.citations.length,
            skipped: true,
            reason: 'Citations already exist. Use reprocess=true to extract again.'
          });
          continue;
        }

        const text = doc.extracted_text || '';
        if (!text) {
          errors.push({
            documentId: doc._id.toString(),
            fileName: doc.file_name,
            error: 'No extracted text available'
          });
          continue;
        }

        // Extract citations using Gemini AI
        const citations = await GroqAIService.extractCitations(text);

        if (citations.length > 0) {
          // Save citations to database using Research Service
          await ResearchService.saveCitations(
            userId,
            doc._id.toString(),
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
              harvard: citation.formattedCitations.chicago,
              chicago: citation.formattedCitations.chicago
            }))
          );

          // Update document with citation count
          await documentsCollection.updateOne(
            { _id: doc._id },
            {
              $set: {
                citations: citations,
                citation_count: citations.length,
                updated_at: new Date()
              }
            }
          );
        }

        results.push({
          documentId: doc._id.toString(),
          fileName: doc.file_name,
          citationsFound: citations.length,
          citations: citations.map(c => ({
            title: c.title,
            authors: c.authors,
            type: c.type,
            confidence: c.confidence
          }))
        });

      } catch (error) {
        console.error(`Error extracting citations from ${doc.file_name}:`, error);
        errors.push({
          documentId: doc._id.toString(),
          fileName: doc.file_name,
          error: error.message || 'Citation extraction failed'
        });
      }
    }

    // Update user stats
    await ResearchService.updateUserStats(userId);

    return NextResponse.json({
      success: true,
      processed: results.length,
      errors: errors.length,
      results,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Citation extraction error:', error);
    return NextResponse.json(
      { 
        error: 'Citation extraction failed',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

// Helper function to generate BibTeX format
function generateBibTeX(citations: any[]): string {
  return citations.map((citation, index) => {
    const id = `citation_${index + 1}`;
    const type = citation.type === 'journal' ? '@article' : 
                 citation.type === 'book' ? '@book' :
                 citation.type === 'conference' ? '@inproceedings' :
                 '@misc';
    
    let entry = `${type}{${id},\n`;
    entry += `  title={${citation.title}},\n`;
    
    if (citation.authors.length > 0) {
      entry += `  author={${citation.authors.join(' and ')}},\n`;
    }
    
    if (citation.year) {
      entry += `  year={${citation.year}},\n`;
    }
    
    if (citation.journal) {
      entry += `  journal={${citation.journal}},\n`;
    }
    
    if (citation.volume) {
      entry += `  volume={${citation.volume}},\n`;
    }
    
    if (citation.issue) {
      entry += `  number={${citation.issue}},\n`;
    }
    
    if (citation.pages) {
      entry += `  pages={${citation.pages}},\n`;
    }
    
    if (citation.publisher) {
      entry += `  publisher={${citation.publisher}},\n`;
    }
    
    if (citation.doi) {
      entry += `  doi={${citation.doi}},\n`;
    }
    
    if (citation.url) {
      entry += `  url={${citation.url}},\n`;
    }
    
    entry += '}\n';
    return entry;
  }).join('\n');
}

// Helper function to generate RIS format
function generateRIS(citations: any[]): string {
  return citations.map(citation => {
    const type = citation.type === 'journal' ? 'JOUR' : 
                 citation.type === 'book' ? 'BOOK' :
                 citation.type === 'conference' ? 'CONF' :
                 'GEN';
    
    let entry = `TY  - ${type}\n`;
    entry += `TI  - ${citation.title}\n`;
    
    citation.authors.forEach(author => {
      entry += `AU  - ${author}\n`;
    });
    
    if (citation.year) {
      entry += `PY  - ${citation.year}\n`;
    }
    
    if (citation.journal) {
      entry += `JO  - ${citation.journal}\n`;
    }
    
    if (citation.volume) {
      entry += `VL  - ${citation.volume}\n`;
    }
    
    if (citation.issue) {
      entry += `IS  - ${citation.issue}\n`;
    }
    
    if (citation.pages) {
      entry += `SP  - ${citation.pages}\n`;
    }
    
    if (citation.publisher) {
      entry += `PB  - ${citation.publisher}\n`;
    }
    
    if (citation.doi) {
      entry += `DO  - ${citation.doi}\n`;
    }
    
    if (citation.url) {
      entry += `UR  - ${citation.url}\n`;
    }
    
    entry += 'ER  -\n\n';
    return entry;
  }).join('');
}