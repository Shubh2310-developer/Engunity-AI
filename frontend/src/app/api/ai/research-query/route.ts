/**
 * AI Research Query API Endpoint
 * ==============================
 * 
 * POST /api/ai/research-query
 * Processes AI research queries using Gemini and user's documents
 */

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { getDatabase } from '@/lib/database/mongodb';
import { getGeminiService } from '@/lib/services/gemini-ai';

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
    const { query, context, documentIds } = await request.json();

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }

    // Get user's documents for context
    const db = await getDatabase();
    const documentsCollection = db.collection('documents');
    
    let documentsQuery: any = { user_id: userId, processing_status: 'completed' };
    
    // If specific document IDs are provided, filter by them
    if (documentIds && Array.isArray(documentIds) && documentIds.length > 0) {
      const { ObjectId } = require('mongodb');
      documentsQuery._id = { 
        $in: documentIds.map(id => {
          try {
            return new ObjectId(id);
          } catch {
            return id; // In case it's already a string ID
          }
        })
      };
    }

    // Get relevant documents (limit to recent ones if no specific IDs)
    const documents = await documentsCollection
      .find(documentsQuery)
      .sort({ created_at: -1 })
      .limit(documentIds && documentIds.length > 0 ? documentIds.length : 10)
      .toArray();

    // Prepare document context for AI
    const documentContext = documents
      .filter(doc => doc.extracted_text || doc.summary)
      .map(doc => ({
        title: doc.file_name || 'Untitled Document',
        content: doc.extracted_text?.substring(0, 3000) || '', // Limit content length
        summary: doc.summary || ''
      }));

    // Use Gemini AI to answer the research query
    const geminiService = getGeminiService();
    
    const researchQuery = {
      query: query.trim(),
      context: context || undefined
    };

    const queryContext = {
      documents: documentContext,
      previousQueries: [] // Could be extended to include chat history
    };

    const aiResponse = await geminiService.answerResearchQuery(researchQuery, queryContext);

    // Log the query activity (optional)
    try {
      const activitiesCollection = db.collection('research_activities');
      await activitiesCollection.insertOne({
        user_id: userId,
        activity_id: `query_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'query',
        action: 'AI Research Query',
        target: query.substring(0, 100) + (query.length > 100 ? '...' : ''),
        target_type: 'query',
        status: 'completed',
        result: {
          documentsUsed: documents.length,
          confidence: aiResponse.confidence,
          sourcesFound: aiResponse.sources.length
        },
        timestamp: new Date(),
        processing_time: Date.now() - Date.now() // Would need actual timing
      });
    } catch (logError) {
      console.warn('Failed to log query activity:', logError);
    }

    // Transform response for frontend
    const response = {
      answer: aiResponse.answer,
      sources: aiResponse.sources.map(source => ({
        document: source.document,
        relevance: source.relevance,
        excerpt: source.excerpt
      })),
      confidence: aiResponse.confidence,
      followUpQuestions: aiResponse.followUpQuestions || [],
      documentsUsed: documents.length,
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error processing research query:', error);
    
    // Return appropriate error response
    if (error instanceof Error && (error.message?.includes('API key') || error.message?.includes('authentication'))) {
      return NextResponse.json(
        { error: 'AI service temporarily unavailable' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to process research query' },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function GET() {
  try {
    const geminiService = getGeminiService();
    const isConnected = await geminiService.testConnection();
    
    return NextResponse.json({
      service: 'AI Research Query',
      status: isConnected ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({
      service: 'AI Research Query',
      status: 'unhealthy',
      error: 'Service unavailable',
      timestamp: new Date().toISOString()
    }, { status: 503 });
  }
}