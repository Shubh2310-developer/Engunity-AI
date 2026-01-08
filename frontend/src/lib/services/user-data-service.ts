/**
 * User Data Service - Real MongoDB Data Integration
 * Replaces mock data with real user data from MongoDB
 * Implements document features research requirements
 */

interface UserStatistics {
  documents: {
    total: number;
    processed: number;
    failed: number;
    success_rate: number;
    recent_uploads: number;
  };
  content: {
    total_word_count: number;
    total_reading_time: number;
    average_document_length: number;
  };
  analysis: {
    total_sessions: number;
    active_sessions: number;
    completion_rate: number;
  };
  engagement: {
    total_chats: number;
    recent_chats: number;
    chat_frequency: number;
  };
  research: {
    total_citations: number;
    unique_entities: number;
    research_depth: number;
  };
  calculated_at: string;
}

interface DocumentAnalytics {
  document_types: Record<string, number>;
  popular_topics: Record<string, number>;
  confidence_stats: {
    average: number;
    count: number;
    distribution: Record<string, number>;
  };
  processing_stats: {
    total_processed: number;
    failed: number;
    pending: number;
  };
}

interface UserInsight {
  type: 'positive' | 'warning' | 'insight' | 'info';
  title: string;
  description: string;
  suggestion: string;
}

interface RecentActivity {
  type: string;
  title: string;
  description: string;
  timestamp: string;
  metadata: Record<string, any>;
}

interface DashboardData {
  user_id: string;
  statistics: UserStatistics;
  documents: {
    total: number;
    recent: any[];
    by_status: Record<string, number>;
    analytics: DocumentAnalytics;
  };
  sessions: {
    total: number;
    recent: any[];
    by_status: Record<string, number>;
  };
  chats: {
    total: number;
    recent: any[];
  };
  projects: {
    total: number;
    recent: any[];
  };
  recent_activity: RecentActivity[];
  insights: UserInsight[];
  timestamp: string;
  data_source: string;
}

class UserDataService {
  private baseUrl: string;
  private useMockData: boolean = false;

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    
    // Check localStorage for mock data preference
    if (typeof window !== 'undefined') {
      this.useMockData = localStorage.getItem('engunity_use_mock_data') === 'true';
    }
  }

  /**
   * Get comprehensive dashboard data for the user
   */
  async getDashboardData(options?: {
    useMock?: boolean;
    includeAnalytics?: boolean;
    includeInsights?: boolean;
  }): Promise<DashboardData> {
    try {
      const useMock = options?.useMock ?? this.useMockData;
      const includeAnalytics = options?.includeAnalytics ?? true;
      const includeInsights = options?.includeInsights ?? true;

      const params = new URLSearchParams({
        use_mock: useMock.toString(),
        include_analytics: includeAnalytics.toString(),
        include_insights: includeInsights.toString(),
      });

      const response = await this.makeRequest(`/api/v1/user/dashboard?${params}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch dashboard data: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Store the data source for debugging
      if (typeof window !== 'undefined') {
        localStorage.setItem('engunity_last_data_source', data.data_source);
      }

      return data;
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      
      // Fallback to mock data if real data fails
      if (!options?.useMock && this.shouldFallbackToMock()) {
        console.warn('Falling back to mock data due to API error');
        return this.getDashboardData({ ...options, useMock: true });
      }
      
      throw error;
    }
  }

  /**
   * Get detailed document analytics
   */
  async getDocumentAnalytics(useMock?: boolean): Promise<{
    user_id: string;
    analytics: DocumentAnalytics;
    data_source: string;
  }> {
    try {
      const params = new URLSearchParams({
        use_mock: (useMock ?? this.useMockData).toString(),
      });

      const response = await this.makeRequest(`/api/v1/user/documents/analytics?${params}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch document analytics: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching document analytics:', error);
      throw error;
    }
  }

  /**
   * Get user statistics for a specific period
   */
  async getUserStatistics(period: '7d' | '30d' | '90d' = '30d', useMock?: boolean): Promise<{
    user_id: string;
    period: string;
    statistics: UserStatistics;
    data_source: string;
  }> {
    try {
      const params = new URLSearchParams({
        use_mock: (useMock ?? this.useMockData).toString(),
        period,
      });

      const response = await this.makeRequest(`/api/v1/user/statistics?${params}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch user statistics: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching user statistics:', error);
      throw error;
    }
  }

  /**
   * Get AI-generated insights about user behavior
   */
  async getUserInsights(useMock?: boolean): Promise<{
    user_id: string;
    insights: UserInsight[];
    data_source: string;
  }> {
    try {
      const params = new URLSearchParams({
        use_mock: (useMock ?? this.useMockData).toString(),
      });

      const response = await this.makeRequest(`/api/v1/user/insights?${params}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch user insights: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching user insights:', error);
      throw error;
    }
  }

  /**
   * Get recent user activity
   */
  async getUserActivity(limit: number = 20, useMock?: boolean): Promise<{
    user_id: string;
    activity: RecentActivity[];
    data_source: string;
  }> {
    try {
      const params = new URLSearchParams({
        use_mock: (useMock ?? this.useMockData).toString(),
        limit: limit.toString(),
      });

      const response = await this.makeRequest(`/api/v1/user/activity?${params}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch user activity: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching user activity:', error);
      throw error;
    }
  }

  /**
   * Toggle mock mode for the user
   */
  async toggleMockMode(enableMock: boolean): Promise<{
    user_id: string;
    mock_mode_enabled: boolean;
    message: string;
  }> {
    try {
      const params = new URLSearchParams({
        enable_mock: enableMock.toString(),
      });

      const response = await this.makeRequest(`/api/v1/user/toggle-mock-mode?${params}`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error(`Failed to toggle mock mode: ${response.statusText}`);
      }

      const result = await response.json();
      
      // Update local state
      this.useMockData = enableMock;
      if (typeof window !== 'undefined') {
        localStorage.setItem('engunity_use_mock_data', enableMock.toString());
      }

      return result;
    } catch (error) {
      console.error('Error toggling mock mode:', error);
      throw error;
    }
  }

  /**
   * Get user preferences
   */
  async getUserPreferences(): Promise<{
    user_id: string;
    preferences: Record<string, any>;
  }> {
    try {
      const response = await this.makeRequest('/api/v1/user/preferences');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch user preferences: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Update local state with preferences
      if (data.preferences.use_mock_data !== undefined) {
        this.useMockData = data.preferences.use_mock_data;
        if (typeof window !== 'undefined') {
          localStorage.setItem('engunity_use_mock_data', data.preferences.use_mock_data.toString());
        }
      }

      return data;
    } catch (error) {
      console.error('Error fetching user preferences:', error);
      throw error;
    }
  }

  /**
   * Get current mock mode status
   */
  getMockModeStatus(): boolean {
    return this.useMockData;
  }

  /**
   * Set mock mode locally (will be synced with server on next API call)
   */
  setMockMode(enableMock: boolean): void {
    this.useMockData = enableMock;
    if (typeof window !== 'undefined') {
      localStorage.setItem('engunity_use_mock_data', enableMock.toString());
    }
  }

  /**
   * Check service health
   */
  async checkHealth(): Promise<{
    status: string;
    service: string;
    mongodb_connected: boolean;
    timestamp: string;
  }> {
    try {
      const response = await this.makeRequest('/api/v1/user/health');
      
      if (!response.ok) {
        throw new Error(`Health check failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Health check failed:', error);
      throw error;
    }
  }

  /**
   * Make authenticated API request
   */
  private async makeRequest(endpoint: string, options?: RequestInit): Promise<Response> {
    const url = `${this.baseUrl}${endpoint}`;
    
    // Get auth token from localStorage (adjust based on your auth implementation)
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options?.headers as Record<string, string>) || {}),
    };

    // Add auth header if available
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    } else {
      // For development: use mock user header
      headers['Authorization'] = 'mock-user:demo-user-123';
    }

    return fetch(url, {
      ...options,
      headers,
    });
  }

  /**
   * Check if we should fallback to mock data
   */
  private shouldFallbackToMock(): boolean {
    // Always fallback to mock in development or if explicitly enabled
    return process.env.NODE_ENV === 'development' || 
           process.env.NEXT_PUBLIC_USE_MOCK_FALLBACK === 'true';
  }

  /**
   * Get last data source used
   */
  getLastDataSource(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('engunity_last_data_source');
  }
}

// Export singleton instance
export const userDataService = new UserDataService();
export default userDataService;