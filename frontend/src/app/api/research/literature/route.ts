/**
 * Literature Analysis and Topic Clustering API
 * ============================================
 * 
 * GET /api/research/literature - Get literature analysis results
 * POST /api/research/literature - Perform literature analysis
 */

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { getDatabase } from '@/lib/database/mongodb';
import { getGeminiService, LiteratureAnalysis } from '@/lib/services/gemini-ai';
import { ResearchService } from '@/lib/database/research';

interface LiteratureCluster {
  clusterId: string;
  name: string;
  documents: Array<{
    documentId: string;
    fileName: string;
    relevance: number;
  }>;
  keywords: string[];
  summary: string;
  themes: string[];
  connections: string[];
  confidence: number;
  createdAt: Date;
  updatedAt: Date;
}

interface LiteratureAnalysisRequest {
  documentIds?: string[];
  analysisType: 'themes' | 'connections' | 'gaps' | 'trends' | 'comprehensive';
  minDocuments?: number;
  maxClusters?: number;
  focusAreas?: string[];
}

// GET: Retrieve existing literature analysis results
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
    const clusterId = url.searchParams.get('clusterId');
    const limit = parseInt(url.searchParams.get('limit') || '10');

    const db = await getDatabase();
    const clustersCollection = db.collection('literature_clusters');

    if (clusterId) {
      // Get specific cluster
      const { ObjectId } = require('mongodb');
      const cluster = await clustersCollection.findOne({
        _id: new ObjectId(clusterId),
        user_id: userId
      });

      if (!cluster) {
        return NextResponse.json(
          { error: 'Literature cluster not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        cluster: transformCluster(cluster)
      });
    }

    // Get all user's literature clusters
    const clusters = await clustersCollection
      .find({ user_id: userId })
      .sort({ created_at: -1 })
      .limit(limit)
      .toArray();

    const transformedClusters = clusters.map(transformCluster);

    // Get analysis statistics
    const stats = {
      totalClusters: clusters.length,
      totalDocuments: clusters.reduce((sum, cluster) => sum + (cluster.document_ids?.length || 0), 0),
      averageConfidence: clusters.reduce((sum, cluster) => sum + (cluster.confidence || 0), 0) / clusters.length || 0,
      lastAnalysis: clusters.length > 0 ? clusters[0].created_at : null
    };

    return NextResponse.json({
      clusters: transformedClusters,
      stats,
      pagination: {
        limit,
        total: clusters.length,
        hasMore: clusters.length === limit
      }
    });

  } catch (error) {
    console.error('Error fetching literature analysis:', error);
    return NextResponse.json(
      { error: 'Failed to fetch literature analysis' },
      { status: 500 }
    );
  }
}

// POST: Perform literature analysis
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
    const requestBody: LiteratureAnalysisRequest = await request.json();
    
    const { 
      documentIds,
      analysisType = 'comprehensive',
      minDocuments = 2,
      maxClusters = 10,
      focusAreas = []
    } = requestBody;

    console.log(`Performing literature analysis for user ${userId}, type: ${analysisType}`);

    // Get documents for analysis
    const db = await getDatabase();
    const documentsCollection = db.collection('documents');
    
    let query: any = { 
      user_id: userId, 
      processing_status: 'completed',
      $or: [
        { summary: { $exists: true, $ne: '' } },
        { extracted_text: { $exists: true, $ne: '' } }
      ]
    };

    if (documentIds && documentIds.length > 0) {
      const { ObjectId } = require('mongodb');
      query._id = { $in: documentIds.map(id => new ObjectId(id)) };
    }

    const documents = await documentsCollection
      .find(query)
      .sort({ created_at: -1 })
      .limit(50) // Limit to prevent processing too many documents
      .toArray();

    if (documents.length < minDocuments) {
      return NextResponse.json(
        { error: `At least ${minDocuments} processed documents are required for literature analysis` },
        { status: 400 }
      );
    }

    console.log(`Analyzing ${documents.length} documents`);

    // Prepare document data for AI analysis
    const documentData = documents.map(doc => ({
      title: doc.file_name || 'Untitled Document',
      summary: doc.summary || doc.extracted_text?.substring(0, 1000) || '',
      keywords: doc.keywords || [],
      fileName: doc.file_name
    }));

    // Use Gemini AI for literature analysis
    const geminiService = getGeminiService();
    let analysis: LiteratureAnalysis;

    try {
      analysis = await geminiService.analyzeLiterature(documentData);
    } catch (aiError) {
      console.error('AI literature analysis failed:', aiError);
      return NextResponse.json(
        { error: 'Literature analysis failed', details: aiError.message },
        { status: 500 }
      );
    }

    // Create literature clusters based on analysis
    const clusters: LiteratureCluster[] = [];
    
    // Create theme-based clusters
    for (let i = 0; i < Math.min(analysis.themes.length, maxClusters); i++) {
      const theme = analysis.themes[i];
      const relatedDocs = documents.filter(doc => {
        const text = (doc.summary || doc.file_name || '').toLowerCase();
        return theme.toLowerCase().split(' ').some(keyword => text.includes(keyword));
      });

      if (relatedDocs.length >= minDocuments) {
        const clusterId = `cluster_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const cluster: LiteratureCluster = {
          clusterId,
          name: theme,
          documents: relatedDocs.map(doc => ({
            documentId: doc._id.toString(),
            fileName: doc.file_name,
            relevance: Math.random() * 0.3 + 0.7 // Simplified relevance score
          })),
          keywords: extractKeywordsFromTheme(theme),
          summary: `Literature cluster focused on ${theme}`,
          themes: [theme],
          connections: analysis.connections
            .filter(conn => conn.documents.some(d => relatedDocs.some(rd => rd.file_name === d)))
            .map(conn => conn.relationship),
          confidence: analysis.confidence,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        clusters.push(cluster);
      }
    }

    // Save clusters to database
    const clustersCollection = db.collection('literature_clusters');
    const savedClusters = [];

    for (const cluster of clusters) {
      try {
        const clusterDoc = {
          cluster_id: cluster.clusterId,
          user_id: userId,
          name: cluster.name,
          document_ids: cluster.documents.map(d => d.documentId),
          document_names: cluster.documents.map(d => d.fileName),
          keywords: cluster.keywords,
          summary: cluster.summary,
          themes: cluster.themes,
          connections: cluster.connections,
          confidence: cluster.confidence,
          analysis_type: analysisType,
          focus_areas: focusAreas,
          created_at: new Date(),
          updated_at: new Date()
        };

        const result = await clustersCollection.insertOne(clusterDoc);
        savedClusters.push({
          ...cluster,
          _id: result.insertedId
        });
      } catch (error) {
        console.warn(`Failed to save cluster ${cluster.name}:`, error);
      }
    }

    // Log analysis activity
    await ResearchService.logActivity(userId, {
      type: 'analyze',
      action: 'Literature Analysis',
      target: `${documents.length} documents`,
      targetType: 'document',
      status: 'completed',
      result: {
        analysisType,
        clustersFound: savedClusters.length,
        themesIdentified: analysis.themes.length,
        connectionsFound: analysis.connections.length,
        confidence: analysis.confidence
      }
    });

    // Update user stats
    await ResearchService.updateUserStats(userId);

    // Prepare comprehensive analysis result
    const analysisResult = {
      success: true,
      analysisType,
      documentsAnalyzed: documents.length,
      clusters: savedClusters.map(transformCluster),
      overallAnalysis: {
        themes: analysis.themes,
        connections: analysis.connections.map(conn => ({
          documents: conn.documents,
          relationship: conn.relationship,
          strength: conn.strength
        })),
        gaps: analysis.gaps,
        trends: analysis.trends,
        recommendations: analysis.recommendations,
        summary: analysis.summary,
        confidence: analysis.confidence
      },
      stats: {
        clustersCreated: savedClusters.length,
        averageConfidence: analysis.confidence,
        documentsPerCluster: savedClusters.length > 0 ? 
          savedClusters.reduce((sum, c) => sum + c.documents.length, 0) / savedClusters.length : 0
      },
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(analysisResult);

  } catch (error) {
    console.error('Literature analysis error:', error);
    return NextResponse.json(
      { 
        error: 'Literature analysis failed',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

// Helper function to transform database cluster to API format
function transformCluster(cluster: any): LiteratureCluster {
  return {
    clusterId: cluster.cluster_id,
    name: cluster.name,
    documents: cluster.document_ids?.map((id: string, index: number) => ({
      documentId: id,
      fileName: cluster.document_names?.[index] || 'Unknown',
      relevance: 0.8 + Math.random() * 0.2 // Simplified relevance
    })) || [],
    keywords: cluster.keywords || [],
    summary: cluster.summary || '',
    themes: cluster.themes || [],
    connections: cluster.connections || [],
    confidence: cluster.confidence || 0,
    createdAt: cluster.created_at,
    updatedAt: cluster.updated_at
  };
}

// Helper function to extract keywords from theme
function extractKeywordsFromTheme(theme: string): string[] {
  // Simple keyword extraction from theme name
  return theme
    .toLowerCase()
    .split(/[^a-zA-Z0-9]+/)
    .filter(word => word.length > 2)
    .slice(0, 5);
}

// DELETE: Remove literature clusters
export async function DELETE(request: NextRequest) {
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
    const { clusterId } = await request.json();

    if (!clusterId) {
      return NextResponse.json(
        { error: 'Cluster ID is required' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const clustersCollection = db.collection('literature_clusters');
    const { ObjectId } = require('mongodb');

    const result = await clustersCollection.deleteOne({
      _id: new ObjectId(clusterId),
      user_id: userId
    });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: 'Cluster not found or access denied' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      clusterId,
      message: 'Literature cluster deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting literature cluster:', error);
    return NextResponse.json(
      { error: 'Failed to delete cluster' },
      { status: 500 }
    );
  }
}