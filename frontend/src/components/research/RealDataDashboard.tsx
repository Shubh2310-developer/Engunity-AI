'use client'

/**
 * Real Data Dashboard Component
 * Replaces mock data with real MongoDB user data
 * Implements document features research requirements
 */

import React, { useState, useEffect } from 'react'
import { userDataService } from '@/lib/services/user-data-service'
import { 
  Users, 
  FileText, 
  TrendingUp, 
  Activity, 
  Database,
  AlertCircle,
  CheckCircle,
  Clock,
  BarChart3
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Switch } from '@/components/ui/switch'

interface DashboardStats {
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

export const RealDataDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [insights, setInsights] = useState<UserInsight[]>([])
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [useMockData, setUseMockData] = useState(false)
  const [dataSource, setDataSource] = useState<string>('unknown')

  useEffect(() => {
    loadDashboardData()
    // Load user preferences
    loadUserPreferences()
  }, [])

  const loadUserPreferences = async () => {
    try {
      const preferences = await userDataService.getUserPreferences()
      setUseMockData(preferences.preferences.use_mock_data || false)
    } catch (error) {
      console.warn('Could not load user preferences:', error)
    }
  }

  const loadDashboardData = async (mockMode?: boolean) => {
    try {
      setLoading(true)
      setError(null)

      // Get comprehensive dashboard data
      const dashboardData = await userDataService.getDashboardData({
        useMock: mockMode ?? useMockData,
        includeAnalytics: true,
        includeInsights: true
      })

      // Set statistics
      setStats(dashboardData.statistics)
      setInsights(dashboardData.insights)
      setRecentActivity(dashboardData.recent_activity)
      setDataSource(dashboardData.data_source)

      console.log('Dashboard data loaded:', {
        source: dashboardData.data_source,
        documents: dashboardData.documents.total,
        insights: dashboardData.insights.length
      })

    } catch (error) {
      console.error('Error loading dashboard data:', error)
      setError('Failed to load dashboard data. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleMockData = async () => {
    try {
      const newMockMode = !useMockData
      await userDataService.toggleMockMode(newMockMode)
      setUseMockData(newMockMode)
      
      // Reload data with new mode
      await loadDashboardData(newMockMode)
    } catch (error) {
      console.error('Error toggling mock mode:', error)
    }
  }

  const getStatusColor = (type: string) => {
    switch (type) {
      case 'positive': return 'text-green-600 bg-green-100'
      case 'warning': return 'text-yellow-600 bg-yellow-100'
      case 'insight': return 'text-blue-600 bg-blue-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
    return num.toString()
  }

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}h ${mins}m`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="text-sm text-gray-600">Loading dashboard data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Alert className="mx-4">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => loadDashboardData()}
          className="ml-4"
        >
          Retry
        </Button>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      {/* Data Source Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Badge variant={dataSource === 'mongodb_real' ? 'default' : 'secondary'}>
            {dataSource === 'mongodb_real' ? 'Live Data' : 'Demo Mode'}
          </Badge>
          <span className="text-sm text-gray-600">
            Data from: {dataSource}
          </span>
        </div>
        
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">Demo Mode</span>
          <Switch
            checked={useMockData}
            onCheckedChange={handleToggleMockData}
          />
        </div>
      </div>

      {/* Statistics Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Documents</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.documents.total}</div>
              <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                <span>{stats.documents.processed} processed</span>
                <Badge variant="outline" className="text-xs">
                  {stats.documents.success_rate.toFixed(1)}% success
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Content</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatNumber(stats.content.total_word_count)}
              </div>
              <p className="text-xs text-muted-foreground">
                {formatDuration(stats.content.total_reading_time)} reading time
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Engagement</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.engagement.total_chats}</div>
              <p className="text-xs text-muted-foreground">
                {stats.engagement.chat_frequency.toFixed(1)} questions/day
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Research</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.research.total_citations}</div>
              <p className="text-xs text-muted-foreground">
                {stats.research.unique_entities} unique entities
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* AI Insights */}
      {insights.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5" />
              <span>AI Insights</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {insights.map((insight, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <Badge className={getStatusColor(insight.type)}>
                      {insight.type}
                    </Badge>
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">{insight.title}</h4>
                      <p className="text-sm text-gray-600 mt-1">{insight.description}</p>
                      <p className="text-xs text-blue-600 mt-2 italic">{insight.suggestion}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Activity */}
      {recentActivity.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="h-5 w-5" />
              <span>Recent Activity</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-2 h-2 mt-2 rounded-full bg-blue-500" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                    <p className="text-sm text-gray-600">{activity.description}</p>
                    <div className="flex items-center space-x-4 mt-1">
                      <span className="text-xs text-gray-500">
                        {new Date(activity.timestamp).toLocaleString()}
                      </span>
                      {activity.metadata.word_count && (
                        <Badge variant="outline" className="text-xs">
                          {activity.metadata.word_count} words
                        </Badge>
                      )}
                      {activity.metadata.confidence && (
                        <Badge variant="outline" className="text-xs">
                          {(activity.metadata.confidence * 100).toFixed(1)}% confidence
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Data Source Information */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Database className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-600">
                Data Source: <strong>{dataSource}</strong>
              </span>
            </div>
            <Button variant="outline" size="sm" onClick={() => loadDashboardData()}>
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default RealDataDashboard