/**
 * Analysis Session Database Service
 * Handles saving and retrieving analysis sessions from MongoDB
 * 
 * Stack: Next.js 14 + MongoDB + Supabase
 * File: frontend/src/lib/services/analysis-service.ts
 */

import { AnalysisSession } from '@/types/database';
import { supabase } from '@/lib/auth/supabase';

// ========================================
// TYPES & INTERFACES
// ========================================

export interface SaveAnalysisSessionData {
  title: string;
  dataset_id: string;
  file_info: {
    name: string;
    size: string;
    rows: number;
    columns: number;
    uploadDate: string;
  };
  data_summary?: Record<string, any>;
  column_metadata?: Array<Record<string, any>>;
  data_preview?: {
    columns: string[];
    rows: any[][];
    pagination?: Record<string, any>;
  };
  charts_data?: Record<string, any>;
  correlation_data?: Record<string, any>;
  query_history?: Array<{
    query: string;
    type: 'SQL' | 'NLQ';
    timestamp: string;
    executionTime?: string;
    results?: any;
  }>;
  ai_insights?: Array<{
    title: string;
    description: string;
    type: string;
    confidence: number;
    timestamp: string;
    data?: Record<string, any>;
  }>;
  custom_charts?: Array<{
    id: string;
    title: string;
    type: string;
    xAxis: string;
    yAxis: string;
    data?: Array<Record<string, any>>;
  }>;
  transformations?: Array<{
    type: string;
    timestamp: string;
    description: string;
    parameters: Record<string, any>;
  }>;
  tags: string[];
  project_id: string | null;
  is_public: boolean;
}

export interface AnalysisSessionSummary {
  id: string;
  title: string;
  dataset_name: string;
  created_at: Date;
  updated_at: Date;
  last_activity_at: Date;
  status: 'active' | 'saved' | 'archived';
  tags: string[];
}

export interface SaveSessionResult {
  success: boolean;
  sessionId?: string;
  error?: string;
}

export interface GetSessionsResult {
  success: boolean;
  sessions?: AnalysisSessionSummary[];
  error?: string;
}

export interface GetSessionResult {
  success: boolean;
  session?: AnalysisSession;
  error?: string;
}

// ========================================
// MONGODB API ENDPOINTS
// ========================================

const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://your-api-domain.com' 
  : 'http://localhost:8000';

// ========================================
// ANALYSIS SESSION SERVICE
// ========================================

export class AnalysisSessionService {
  private static instance: AnalysisSessionService;

  public static getInstance(): AnalysisSessionService {
    if (!AnalysisSessionService.instance) {
      AnalysisSessionService.instance = new AnalysisSessionService();
    }
    return AnalysisSessionService.instance;
  }

  private constructor() {}

  /**
   * Get current authenticated user
   */
  private async getCurrentUser() {
    // For now, return a mock user that matches the backend
    // In production, this would use proper Supabase authentication
    return {
      id: '3cc7ccf7-1a5a-4538-9ebb-54c3a04c92ac',
      email: 'test@example.com'
    };
  }

  /**
   * Save analysis session to MongoDB
   */
  async saveAnalysisSession(data: SaveAnalysisSessionData): Promise<SaveSessionResult> {
    try {
      console.log('🚀 Starting to save analysis session...');
      const user = await this.getCurrentUser();
      
      // Generate title if not provided
      const title = data.title || `Analysis: ${data.file_info.name} - ${new Date().toLocaleDateString()}`;
      
      const sessionData = {
        user_id: user.id,
        title,
        dataset_id: data.dataset_id,
        file_info: data.file_info,
        data_summary: data.data_summary || null,
        column_metadata: data.column_metadata || null,
        data_preview: data.data_preview || null,
        charts_data: data.charts_data || null,
        correlation_data: data.correlation_data || null,
        query_history: data.query_history || [],
        ai_insights: data.ai_insights || [],
        custom_charts: data.custom_charts || [],
        transformations: data.transformations || [],
        status: 'saved',
        is_public: data.is_public || false,
        project_id: data.project_id || null,
        tags: data.tags || [],
        last_activity_at: new Date().toISOString(),
        metadata: null,
      };

      console.log('📦 Session data prepared:', {
        title: sessionData.title,
        dataset_id: sessionData.dataset_id,
        chartsCount: sessionData.custom_charts?.length || 0,
        user_id: sessionData.user_id
      });

      // Try multiple API endpoints for better compatibility
      const endpoints = [
        `${API_BASE_URL}/api/analysis-sessions`,
        `http://localhost:8000/api/analysis-sessions`,
        `http://127.0.0.1:8000/api/analysis-sessions`,
      ];

      let lastError;
      for (const endpoint of endpoints) {
        try {
          console.log(`🔗 Trying endpoint: ${endpoint}`);
          
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(sessionData),
          });

          console.log(`📡 Response status: ${response.status}`);
          console.log(`📡 Response ok: ${response.ok}`);

          if (response.ok) {
            const result = await response.json();
            console.log('✅ Session saved successfully:', result);
            
            return {
              success: true,
              sessionId: result.insertedId || result.id || result.sessionId,
            };
          }

          // Try to get error details
          const errorData = await response.json().catch(() => ({}));
          console.log(`❌ Response error data:`, errorData);
          
          let errorMessage = `HTTP ${response.status}`;
          if (errorData.error) {
            errorMessage = errorData.error;
          } else if (errorData.detail) {
            if (Array.isArray(errorData.detail)) {
              // Handle Pydantic validation errors
              errorMessage = errorData.detail.map((err: any) => `${err.loc?.join('.')}: ${err.msg}`).join(', ');
            } else {
              errorMessage = errorData.detail;
            }
          }
          
          lastError = new Error(errorMessage);
          
        } catch (fetchError) {
          console.log(`🔌 Fetch failed for ${endpoint}:`, fetchError);
          lastError = fetchError;
          continue; // Try next endpoint
        }
      }

      throw lastError || new Error('All endpoints failed');

    } catch (error) {
      console.error('💥 Error saving analysis session:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Get user's analysis sessions (summary list)
   */
  async getUserAnalysisSessions(limit = 20, offset = 0): Promise<GetSessionsResult> {
    try {
      const user = await this.getCurrentUser();
      
      const apiUrl = `${API_BASE_URL}/api/analysis-sessions?user_id=${user.id}&limit=${limit}&offset=${offset}`;
      console.log('🔍 Fetching sessions from:', apiUrl);
      
      const response = await fetch(apiUrl, {
        method: 'GET',
      });
      
      console.log('📡 Response status:', response.status);
      console.log('📡 Response ok:', response.ok);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch analysis sessions');
      }

      const sessions = await response.json();
      
      console.log('📄 Raw sessions response:', sessions);
      console.log('📄 Number of sessions:', sessions.length);

      // The backend is already returning the correct format, so map directly
      const mappedSessions = sessions
        .filter((session: any) => session.id) // Backend returns 'id' not '_id'
        .map((session: any): AnalysisSessionSummary => ({
          id: session.id,
          title: session.title || 'Untitled Analysis',
          dataset_name: session.dataset_name || 'Unknown Dataset',
          created_at: new Date(session.created_at),
          updated_at: new Date(session.updated_at),
          last_activity_at: new Date(session.last_activity_at),
          status: session.status || 'saved',
          tags: session.tags || [],
        }));

      console.log('🔄 Mapped sessions:', mappedSessions);
      
      return {
        success: true,
        sessions: mappedSessions,
      };

    } catch (error) {
      console.error('Error fetching analysis sessions:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Get specific analysis session by ID
   */
  async getAnalysisSession(sessionId: string): Promise<GetSessionResult> {
    try {
      // Validate sessionId before making API call
      if (!sessionId || sessionId === 'undefined' || sessionId === 'null') {
        return {
          success: false,
          error: 'Invalid session ID provided',
        };
      }

      const user = await this.getCurrentUser();
      
      const response = await fetch(
        `${API_BASE_URL}/api/analysis-sessions/${sessionId}?user_id=${user.id}`,
        {
          method: 'GET',
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch analysis session');
      }

      const session = await response.json();
      
      return {
        success: true,
        session: {
          ...session,
          _id: session._id,
          created_at: new Date(session.created_at),
          updated_at: new Date(session.updated_at),
          last_activity_at: new Date(session.last_activity_at),
        },
      };

    } catch (error) {
      console.error('Error fetching analysis session:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Update existing analysis session
   */
  async updateAnalysisSession(
    sessionId: string, 
    updates: Partial<SaveAnalysisSessionData>
  ): Promise<SaveSessionResult> {
    try {
      const user = await this.getCurrentUser();
      
      const updateData = {
        ...updates,
        user_id: user.id,
        last_activity_at: new Date(),
        updated_at: new Date(),
      };

      const response = await fetch(`${API_BASE_URL}/api/analysis-sessions/${sessionId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        let errorMessage = 'Failed to update analysis session';
        
        if (errorData.error) {
          errorMessage = errorData.error;
        } else if (errorData.detail) {
          if (Array.isArray(errorData.detail)) {
            errorMessage = errorData.detail.map((err: any) => `${err.loc?.join('.')}: ${err.msg}`).join(', ');
          } else {
            errorMessage = errorData.detail;
          }
        }
        
        throw new Error(errorMessage);
      }

      return {
        success: true,
        sessionId,
      };

    } catch (error) {
      console.error('Error updating analysis session:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Delete analysis session
   */
  async deleteAnalysisSession(sessionId: string): Promise<SaveSessionResult> {
    try {
      const user = await this.getCurrentUser();
      
      const response = await fetch(
        `${API_BASE_URL}/api/analysis-sessions/${sessionId}?user_id=${user.id}`,
        {
          method: 'DELETE',
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to delete analysis session');
      }

      return {
        success: true,
        sessionId,
      };

    } catch (error) {
      console.error('Error deleting analysis session:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Archive analysis session (soft delete)
   */
  async archiveAnalysisSession(sessionId: string): Promise<SaveSessionResult> {
    return this.updateAnalysisSession(sessionId, { 
      tags: [],
      // We'll set status in the update data
    }).then(async (result) => {
      if (result.success) {
        // Additional call to set archived status
        try {
          const user = await this.getCurrentUser();
          const response = await fetch(`${API_BASE_URL}/api/analysis-sessions/${sessionId}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              user_id: user.id,
              status: 'archived',
              updated_at: new Date(),
            }),
          });

          if (!response.ok) {
            throw new Error('Failed to archive session');
          }
        } catch (error) {
          console.error('Error archiving session:', error);
        }
      }
      return result;
    });
  }
}

// ========================================
// SINGLETON INSTANCE EXPORT
// ========================================

export const analysisSessionService = AnalysisSessionService.getInstance();

// ========================================
// UTILITY FUNCTIONS
// ========================================

/**
 * Format analysis session data from analysis page state
 */
export function formatAnalysisSessionData(
  currentFileId: string,
  uploadedFiles: any[],
  dataSummary: any,
  columnMetadata: any[],
  dataPreview: any,
  chartsData: any,
  correlationData: any,
  queryHistory: any[],
  aiInsights: any[],
  customCharts: any[],
  options: {
    title?: string;
    tags?: string[];
    project_id?: string | null;
    is_public?: boolean;
  } = {}
): SaveAnalysisSessionData {
  const currentFile = uploadedFiles.find(f => f.fileId === currentFileId);
  
  return {
    title: options.title || `Analysis: ${currentFile?.name || 'Unknown'} - ${new Date().toLocaleDateString()}`,
    dataset_id: currentFileId,
    file_info: currentFile ? {
      name: currentFile.name,
      size: currentFile.size,
      rows: currentFile.rows || 0,
      columns: currentFile.columns || 0,
      uploadDate: new Date().toLocaleDateString()
    } : {
      name: 'Unknown Dataset',
      size: '0 MB',
      rows: 0,
      columns: 0,
      uploadDate: new Date().toLocaleDateString()
    },
    data_summary: dataSummary,
    column_metadata: columnMetadata,
    data_preview: dataPreview,
    charts_data: chartsData,
    correlation_data: correlationData,
    query_history: queryHistory || [],
    ai_insights: aiInsights || [],
    custom_charts: (customCharts || []).map(chart => {
      const chartAny = chart as any; // Handle different field name formats
      const mappedChart = {
        id: chart.id || 'chart-' + Date.now(),
        title: chart.title || 'Untitled Chart',
        type: chart.type || 'bar',
        xAxis: chart.xAxis || chartAny.x_axis || 'defaultX',
        yAxis: chart.yAxis || chartAny.y_axis || 'defaultY',
        data: chart.data || []
      };
      console.log('📊 Formatting chart for save:', chart, ' -> ', mappedChart);
      return mappedChart;
    }),
    transformations: [], // This would need to be tracked separately
    tags: options.tags || [],
    project_id: options.project_id || null,
    is_public: options.is_public || false,
  };
}

export default analysisSessionService;