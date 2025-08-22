import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zsevvvaakunsspxpplbh.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request: NextRequest) {
  try {
    const { sessionId, fileId, projectId, type, queryType, query, timestamp, cleaningOptions, insights } = await request.json();

    if (!fileId || !projectId || !type) {
      return NextResponse.json(
        { error: 'Missing required fields: fileId, projectId, type' },
        { status: 400 }
      );
    }

    // Get the file record from Supabase
    const { data: file, error: fetchError } = await supabase
      .from('files')
      .select('*')
      .eq('id', fileId)
      .single();

    if (fetchError || !file) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    // Create or update session record
    let sessionData: any = {
      file_id: fileId,
      project_id: projectId,
      session_type: type,
      last_updated: new Date().toISOString(),
      status: 'active'
    };

    // Add type-specific data
    if (type === 'upload') {
      sessionData.upload_timestamp = timestamp || new Date().toISOString();
      sessionData.file_metadata = {
        originalName: file.original_name,
        size: file.size_mb,
        rows: file.rows,
        columns: file.columns,
        format: file.metadata?.format
      };
    } else if (type === 'cleaning') {
      sessionData.cleaning_options = cleaningOptions;
      sessionData.cleaning_timestamp = timestamp || new Date().toISOString();
      sessionData.cleaning_results = {
        rowsBefore: file.rows,
        rowsAfter: file.rows, // This would be updated after cleaning
        qualityImprovement: '0%'
      };
    } else if (type === 'query') {
      sessionData.query_type = queryType;
      sessionData.query_text = query;
      sessionData.query_timestamp = timestamp || new Date().toISOString();
      sessionData.query_results = {
        rowCount: 0,
        executionTime: '0ms'
      };
    } else if (type === 'analysis') {
      sessionData.analysis_timestamp = timestamp || new Date().toISOString();
      sessionData.analysis_summary = {
        totalInsights: insights?.length || 0,
        insightTypes: insights?.map((i: any) => i.type) || []
      };
    }

    // Check if session already exists
    const existingSessionId = sessionId || `session_${fileId}_${Date.now()}`;
    
    // In production, you would save this to MongoDB for flexible session management
    // For now, we'll simulate session saving by returning success
    
    const sessionResult = {
      sessionId: existingSessionId,
      fileId: fileId,
      projectId: projectId,
      type: type,
      timestamp: timestamp || new Date().toISOString(),
      status: 'saved',
      metadata: {
        file: {
          name: file.original_name,
          size: file.size_mb,
          rows: file.rows,
          columns: file.columns
        },
        session: sessionData
      }
    };

    // Simulate saving to MongoDB (in production, this would be a real MongoDB operation)
    // await saveSessionToMongoDB(sessionResult);

    return NextResponse.json({
      success: true,
      session: sessionResult,
      message: 'Session saved successfully'
    });

  } catch (error: any) {
    console.error('Session save error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to save session',
        details: error.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const fileId = searchParams.get('fileId');

    if (!sessionId && !fileId) {
      return NextResponse.json(
        { error: 'Either sessionId or fileId parameter is required' },
        { status: 400 }
      );
    }

    // In production, you would retrieve the session from MongoDB
    // For now, return a mock session
    const mockSession = {
      sessionId: sessionId || `session_${fileId}_${Date.now()}`,
      fileId: fileId || 'unknown',
      projectId: 'demo-project',
      type: 'analysis',
      timestamp: new Date().toISOString(),
      status: 'active',
      steps: [
        {
          type: 'upload',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          status: 'completed'
        },
        {
          type: 'cleaning',
          timestamp: new Date(Date.now() - 1800000).toISOString(),
          status: 'completed'
        },
        {
          type: 'analysis',
          timestamp: new Date().toISOString(),
          status: 'in_progress'
        }
      ]
    };

    return NextResponse.json({
      success: true,
      session: mockSession,
      message: 'Session retrieved successfully'
    });

  } catch (error: any) {
    console.error('Session retrieval error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to retrieve session',
        details: error.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function PUT() {
  return NextResponse.json({
    service: 'session-management',
    status: 'operational',
    methods: ['POST', 'GET'],
    description: 'Manages analysis sessions and workflow state',
    session_types: ['upload', 'cleaning', 'query', 'analysis'],
    features: ['create', 'update', 'retrieve', 'track_progress']
  });
} 