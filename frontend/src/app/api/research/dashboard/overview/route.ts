/**
 * Research Dashboard Overview Endpoint
 * ===================================
 * 
 * GET /api/research/dashboard/overview
 * Returns dashboard overview data including:
 * - User information
 * - Recent documents
 * - Recent chats
 * - Statistics and metrics
 */

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { getDatabase } from '@/lib/database/mongodb';

export async function GET(request: NextRequest) {
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
    const db = await getDatabase();

    // Fetch recent documents from MongoDB
    const documentsCollection = db.collection('documents');
    const recentDocuments = await documentsCollection
      .find({ user_id: userId })
      .sort({ created_at: -1 })
      .limit(10)
      .toArray();

    // Fetch recent chat activities (if available)
    const recentChats: any[] = [];
    try {
      const chatsCollection = db.collection('chats');
      const chatDocs = await chatsCollection
        .find({ user_id: userId })
        .sort({ created_at: -1 })
        .limit(5)
        .toArray();
      
      recentChats.push(...chatDocs.map(chat => ({
        message_id: chat._id,
        message: chat.message || 'Research query',
        created_at: chat.created_at,
        response_summary: chat.response ? chat.response.substring(0, 100) + '...' : ''
      })));
    } catch (error) {
      console.warn('Failed to fetch recent chats:', error);
    }

    // Calculate statistics
    const totalDocuments = await documentsCollection.countDocuments({ user_id: userId });
    const processedDocuments = await documentsCollection.countDocuments({ 
      user_id: userId, 
      processing_status: 'completed' 
    });
    
    // Count total citations
    let totalCitations = 0;
    try {
      const citationsCollection = db.collection('citations');
      totalCitations = await citationsCollection.countDocuments({ user_id: userId });
    } catch (error) {
      console.warn('Failed to count citations:', error);
    }

    // Build response data structure
    const dashboardData = {
      user_info: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User',
        avatar_url: session.user.user_metadata?.avatar_url,
        created_at: session.user.created_at,
        last_sign_in: session.user.last_sign_in_at
      },
      recent_documents: recentDocuments.map(doc => ({
        document_id: doc._id,
        name: doc.file_name || doc.name,
        file_name: doc.file_name || doc.name,
        file_type: doc.file_type || doc.type || 'PDF',
        file_size: doc.file_size || doc.size,
        status: doc.processing_status || doc.status || 'uploaded',
        upload_date: doc.created_at,
        created_at: doc.created_at,
        updated_at: doc.updated_at,
        summary: doc.summary || '',
        citations_count: doc.citations?.length || 0,
        keywords_count: doc.keywords?.length || 0,
        processing_time: doc.processing_time,
        confidence_score: doc.confidence_score
      })),
      recent_chats: recentChats,
      statistics: {
        total_documents: totalDocuments,
        processed_documents: processedDocuments,
        pending_documents: totalDocuments - processedDocuments,
        total_citations: totalCitations,
        processing_success_rate: totalDocuments > 0 ? Math.round((processedDocuments / totalDocuments) * 100) : 0
      },
      summary: {
        documents_this_month: totalDocuments, // Simplified for now
        citations_this_month: totalCitations,
        processing_hours_saved: Math.round(processedDocuments * 0.5), // Estimate
        research_efficiency: processedDocuments > 0 ? 'High' : 'Getting Started'
      },
      last_updated: new Date().toISOString()
    };

    return NextResponse.json(dashboardData);

  } catch (error) {
    console.error('Dashboard overview error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch dashboard overview',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function HEAD(request: NextRequest) {
  return NextResponse.json({ status: 'healthy' });
}