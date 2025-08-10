'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { supabase } from '@/lib/auth/supabase'
// Client-side types only - no server imports
interface ResearchStats {
  userId: string;
  uploadedPapers: number;
  processedDocuments: number;
  totalStorageUsed: number;
  extractedCitations: number;
  citationsByType: Record<string, number>;
  summarizedDocuments: number;
  literatureTopics: number;
  totalQueries: number;
  avgProcessingTime: number;
  avgConfidence: number;
  lastActivity: Date;
  totalSessions: number;
  createdAt: Date;
  updatedAt: Date;
}

interface ResearchActivity {
  activityId: string;
  type: 'upload' | 'process' | 'summarize' | 'extract_citations' | 'analyze' | 'query' | 'export';
  action: string;
  target: string;
  targetType: 'document' | 'citation' | 'summary' | 'query';
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  progress?: number;
  result?: any;
  error?: string;
  processingTime?: number;
  timestamp: Date;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
}

interface ResearchDocument {
  documentId: string;
  userId: string;
  name: string;
  type: string;
  size: number;
  uploadDate: Date;
  status: 'uploaded' | 'processing' | 'processed' | 'failed';
  originalName: string;
  mimeType: string;
  filePath?: string;
  extractedText?: string;
  summary?: string;
  citations?: any[];
  topics?: string[];
  keywords?: string[];
  processingTime?: number;
  confidence?: number;
  language?: string;
  pageCount?: number;
  wordCount?: number;
  category?: string;
  domain?: string;
  authors?: string[];
  publicationDate?: Date;
  journal?: string;
  doi?: string;
  createdAt: Date;
  updatedAt: Date;
}
import { 
  BookOpen, 
  FileText, 
  Quote, 
  TrendingUp, 
  Upload, 
  Search, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Zap,
  Brain,
  Users,
  Calendar,
  ArrowRight,
  Plus,
  BarChart3,
  Library,
  Sparkles,
  Bell,
  UploadCloud,
  Activity,
  MessageSquare
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'

// Mock data - replace with real data from Supabase
const mockData = {
  user: {
    name: "Shubhendra",
    avatar: "/api/placeholder/40/40",
    initials: "SH"
  },
  stats: {
    uploadedPapers: 24,
    extractedCitations: 156,
    summarizedDocuments: 18,
    literatureTopics: 7
  },
  recentActivity: [
    {
      id: 1,
      action: "Summarized",
      file: "Attention Is All You Need.pdf",
      timestamp: "2 hours ago",
      status: "completed"
    },
    {
      id: 2,
      action: "Extracted Citations",
      file: "BERT: Pre-training Deep Bidirectional.pdf", 
      timestamp: "4 hours ago",
      status: "completed"
    },
    {
      id: 3,
      action: "Literature Analysis",
      file: "GPT-3: Language Models are Few-Shot.pdf",
      timestamp: "1 day ago", 
      status: "in_progress"
    }
  ],
  recentFiles: [
    {
      id: 1,
      name: "Transformer Architecture Survey.pdf",
      uploadDate: "2024-01-15",
      status: "processed",
      size: "2.4 MB"
    },
    {
      id: 2,
      name: "Diffusion Models in Computer Vision.pdf", 
      uploadDate: "2024-01-14",
      status: "processing",
      size: "3.1 MB"
    },
    {
      id: 3,
      name: "Large Language Models Ethics.pdf",
      uploadDate: "2024-01-13", 
      status: "processed",
      size: "1.8 MB"
    }
  ],
  notifications: [
    {
      id: 1,
      type: "warning",
      title: "Unsaved Citation Export",
      message: "You have 12 citations ready for export to BibTeX format"
    },
    {
      id: 2,
      type: "info", 
      title: "Literature Clusters Ready",
      message: "3 new research clusters identified in your uploaded papers"
    }
  ]
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      duration: 0.6
    }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: "easeOut"
    }
  }
}

const StatCard = ({ title, value, icon: Icon, color, bgGradient }: {
  title: string
  value: number
  icon: React.ComponentType<any>
  color: string
  bgGradient: string
}) => (
  <motion.div
    whileHover={{ y: -4, scale: 1.02 }}
    transition={{ type: "spring", stiffness: 300, damping: 20 }}
  >
    <Card className={`bg-gradient-to-br ${bgGradient} border-slate-200/60 shadow-lg hover:shadow-xl transition-all duration-300 h-full`}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className={`p-3 rounded-2xl bg-gradient-to-br ${color} shadow-lg`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-slate-600 text-sm font-medium">{title}</p>
          <p className="text-3xl font-bold text-slate-900">{value.toLocaleString()}</p>
        </div>
      </CardContent>
    </Card>
  </motion.div>
)

const QuickActionCard = ({ title, description, href, icon: Icon, gradient }: {
  title: string
  description: string
  href: string
  icon: React.ComponentType<any>
  gradient: string
}) => (
  <motion.div
    variants={itemVariants}
    whileHover={{ scale: 1.02, y: -4 }}
    whileTap={{ scale: 0.98 }}
  >
    <Link href={href}>
      <Card className={`h-full border-0 ${gradient} text-white overflow-hidden relative group cursor-pointer`}>
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <CardHeader className="relative z-10">
          <div className="flex items-center justify-between">
            <Icon className="h-8 w-8 text-white/90" />
            <ArrowRight className="h-5 w-5 text-white/70 group-hover:translate-x-1 transition-transform duration-200" />
          </div>
          <CardTitle className="text-lg text-white">{title}</CardTitle>
          <p className="text-sm text-white/80">{description}</p>
        </CardHeader>
      </Card>
    </Link>
  </motion.div>
)


export default function ResearchAnalysisDashboard() {
  const [aiQuery, setAiQuery] = useState('')
  const [currentTime, setCurrentTime] = useState(new Date())
  const [mounted, setMounted] = useState(false)
  
  // Get authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [dashboardLoading, setDashboardLoading] = useState(true)
  
  // Research data state
  const [researchStats, setResearchStats] = useState<ResearchStats | null>(null)
  const [recentActivity, setRecentActivity] = useState<ResearchActivity[]>([])
  const [recentFiles, setRecentFiles] = useState<ResearchDocument[]>([])
  const [isLoadingData, setIsLoadingData] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  const [hasRealtimeUpdates, setHasRealtimeUpdates] = useState(false)

  // Real-time update checking
  useEffect(() => {
    if (!isAuthenticated || !user) return

    // Check for real-time updates more frequently
    const checkUpdatesInterval = setInterval(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return

        const response = await fetch(`/api/research/realtime?lastUpdate=${lastRefresh.toISOString()}`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        })

        if (response.ok) {
          const result = await response.json()
          
          // If there are updates, refresh the data
          if (result.hasUpdates && !isLoadingData) {
            setHasRealtimeUpdates(true)
            setIsLoadingData(true)
            await loadResearchData(user.id)
            setLastRefresh(new Date())
            setIsLoadingData(false)
            
            // Show update indicator briefly
            setTimeout(() => setHasRealtimeUpdates(false), 3000)
            console.log('Real-time update detected:', result.updateCounts)
          }
        }
      } catch (error) {
        console.error('Failed to check for real-time updates:', error)
      }
    }, 15000) // Check every 15 seconds for updates

    // Full refresh every 2 minutes as backup
    const fullRefreshInterval = setInterval(async () => {
      if (!isLoadingData) {
        setIsLoadingData(true)
        await loadResearchData(user.id)
        setLastRefresh(new Date())
        setIsLoadingData(false)
      }
    }, 120000) // Full refresh every 2 minutes

    return () => {
      clearInterval(checkUpdatesInterval)
      clearInterval(fullRefreshInterval)
    }
  }, [isAuthenticated, user, isLoadingData, lastRefresh])

  // Check authentication on mount - simplified to always load data immediately
  useEffect(() => {
    const loadPageData = async () => {
      console.log('Loading research page...')
      
      // Always load mock data first for immediate display
      const demoUserId = 'demo-user'
      setResearchStats({
        userId: demoUserId,
        uploadedPapers: mockData.stats.uploadedPapers,
        processedDocuments: mockData.stats.uploadedPapers,
        totalStorageUsed: 0,
        extractedCitations: mockData.stats.extractedCitations,
        citationsByType: {},
        summarizedDocuments: mockData.stats.summarizedDocuments,
        literatureTopics: mockData.stats.literatureTopics,
        totalQueries: 0,
        avgProcessingTime: 0,
        avgConfidence: 0,
        lastActivity: new Date(),
        totalSessions: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      
      setRecentActivity(mockData.recentActivity.map(activity => ({
        activityId: activity.id.toString(),
        type: 'process' as const,
        action: activity.action,
        target: activity.file,
        targetType: 'document' as const,
        status: activity.status as 'completed' | 'in_progress',
        timestamp: new Date(Date.now() - (activity.id * 3600000))
      })))
      
      setRecentFiles(mockData.recentFiles.map(file => ({
        documentId: file.id.toString(),
        userId: demoUserId,
        name: file.name,
        type: 'application/pdf',
        size: parseFloat(file.size) * 1024 * 1024,
        uploadDate: new Date(file.uploadDate),
        status: file.status as 'processed' | 'processing',
        originalName: file.name,
        mimeType: 'application/pdf',
        createdAt: new Date(file.uploadDate),
        updatedAt: new Date(file.uploadDate)
      })))

      // Set page as loaded
      setDashboardLoading(false)

      // Try to check auth in background (non-blocking)
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (!error && session?.user) {
          console.log('User authenticated:', session.user.email)
          setIsAuthenticated(true)
          const userData = {
            id: session.user.id,
            name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User',
            email: session.user.email,
            avatar: session.user.user_metadata?.avatar_url,
            initials: (session.user.user_metadata?.full_name || session.user.email || 'U').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
          }
          setUser(userData)
          
          // Try to load real data in background (don't block UI)
          loadResearchData(session.user.id).catch(err => {
            console.log('Background data loading failed:', err)
          })
        } else {
          console.log('Using demo mode - no authentication')
          setIsAuthenticated(false)
          setUser({
            id: 'demo-user',
            name: 'Demo User',
            email: 'demo@example.com',
            initials: 'DU'
          })
        }
      } catch (error) {
        console.log('Auth check failed, using demo mode:', error)
        setIsAuthenticated(false)
        setUser({
          id: 'demo-user',
          name: 'Demo User', 
          email: 'demo@example.com',
          initials: 'DU'
        })
      }
    }

    loadPageData()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setIsAuthenticated(true)
        const userData = {
          id: session.user.id,
          name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User',
          email: session.user.email,
          avatar: session.user.user_metadata?.avatar_url,
          initials: (session.user.user_metadata?.full_name || session.user.email || 'U').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
        }
        setUser(userData)
        await loadResearchData(session.user.id)
      } else if (event === 'SIGNED_OUT') {
        setIsAuthenticated(false)
        setUser(null)
        setResearchStats(null)
        setRecentActivity([])
        setRecentFiles([])
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    setMounted(true)
    const timer = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  // Load research data for authenticated user
  const loadResearchData = async (userId: string) => {
    try {
      console.log('Loading research data for user:', userId)
      
      // Always set fallback data first to ensure page doesn't get stuck
      setResearchStats({
        userId,
        uploadedPapers: mockData.stats.uploadedPapers,
        processedDocuments: mockData.stats.uploadedPapers,
        totalStorageUsed: 0,
        extractedCitations: mockData.stats.extractedCitations,
        citationsByType: {},
        summarizedDocuments: mockData.stats.summarizedDocuments,
        literatureTopics: mockData.stats.literatureTopics,
        totalQueries: 0,
        avgProcessingTime: 0,
        avgConfidence: 0,
        lastActivity: new Date(),
        totalSessions: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      
      setRecentActivity(mockData.recentActivity.map(activity => ({
        activityId: activity.id.toString(),
        type: 'process' as const,
        action: activity.action,
        target: activity.file,
        targetType: 'document' as const,
        status: activity.status as 'completed' | 'in_progress',
        timestamp: new Date(Date.now() - (activity.id * 3600000))
      })))
      
      setRecentFiles(mockData.recentFiles.map(file => ({
        documentId: file.id.toString(),
        userId,
        name: file.name,
        type: 'application/pdf',
        size: parseFloat(file.size) * 1024 * 1024,
        uploadDate: new Date(file.uploadDate),
        status: file.status as 'processed' | 'processing',
        originalName: file.name,
        mimeType: 'application/pdf',
        createdAt: new Date(file.uploadDate),
        updatedAt: new Date(file.uploadDate)
      })))

      // Try to get the session token for API calls
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        console.log('No session found for API calls, using mock data')
        return
      }

      // Try to fetch real data from API routes with timeout
      const fetchWithTimeout = (url: string, options: any, timeout = 5000) => {
        return Promise.race([
          fetch(url, options),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Request timeout')), timeout)
          )
        ])
      }

      try {
        const [statsResponse, activitiesResponse, documentsResponse] = await Promise.all([
          fetchWithTimeout('/api/research/stats', {
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json'
            }
          }).catch(() => null),
          fetchWithTimeout('/api/research/activities?limit=10', {
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json'
            }
          }).catch(() => null),
          fetchWithTimeout('/api/research/documents?limit=10', {
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json'
            }
          }).catch(() => null)
        ])

        // Update with real data if available
        if (statsResponse && (statsResponse as Response).ok) {
          const stats = await (statsResponse as Response).json()
          setResearchStats(stats)
          console.log('Loaded real stats data')
        }

        if (activitiesResponse && (activitiesResponse as Response).ok) {
          const activities = await (activitiesResponse as Response).json()
          const processedActivities = activities.map((activity: any) => ({
            ...activity,
            timestamp: new Date(activity.timestamp)
          }))
          setRecentActivity(processedActivities)
          console.log('Loaded real activities data')
        }

        if (documentsResponse && (documentsResponse as Response).ok) {
          const documents = await (documentsResponse as Response).json()
          const processedDocuments = documents.map((doc: any) => ({
            ...doc,
            uploadDate: new Date(doc.uploadDate),
            createdAt: new Date(doc.createdAt),
            updatedAt: new Date(doc.updatedAt),
            publicationDate: doc.publicationDate ? new Date(doc.publicationDate) : undefined
          }))
          setRecentFiles(processedDocuments)
          console.log('Loaded real documents data')
        }
      } catch (apiError) {
        console.log('API calls failed, using mock data:', apiError)
      }

    } catch (error) {
      console.error('Error in loadResearchData:', error)
      // Mock data is already set above, so no need to set it again
    }
  }

  const handleAiQuery = async () => {
    if (!aiQuery.trim()) return
    
    // Simulate AI query processing
    console.log('Processing AI query:', aiQuery)
    setAiQuery('')
    
    // Here you would integrate with your RAG system
    // const response = await fetch('/api/ai/research-query', {
    //   method: 'POST',
    //   body: JSON.stringify({ query: aiQuery })
    // })
  }

  // Manual refresh function
  const handleRefresh = async () => {
    if (!user?.id || isLoadingData) return
    
    setIsLoadingData(true)
    await loadResearchData(user.id)
    setLastRefresh(new Date())
    setIsLoadingData(false)
  }

  // Show loading state
  if (!mounted || dashboardLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto" />
          <p className="text-slate-600 text-lg">Loading your research workspace...</p>
        </div>
      </div>
    )
  }

  // Always show the dashboard content - no authentication wall
  // The page will work in demo mode if not authenticated

  return (
    <div className="min-h-screen bg-white">
      {/* Container with Max Width and Proper Padding */}
      <div className="max-w-[1800px] mx-auto px-6 lg:px-8 py-8">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="space-y-8"
        >
          {/* Professional Header Section */}
          <motion.section variants={itemVariants}>
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200/60 p-8 lg:p-10">
              <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-8">
                
                {/* User Info Section */}
                <div className="flex items-center gap-6">
                  <div className="relative">
                    <Avatar className="w-20 h-20 ring-4 ring-blue-100 shadow-lg">
                      <AvatarImage src={user?.avatar} alt={user?.name || 'User'} />
                      <AvatarFallback className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-bold text-xl">
                        {user?.initials || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full border-3 border-white shadow-md flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full" />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h1 className="text-3xl lg:text-4xl font-bold text-slate-900 tracking-tight">
                        Research Workspace 🔬
                      </h1>
                    </div>
                    <p className="text-slate-600 text-lg font-medium">Welcome back, {user?.name || 'User'} 👋</p>
                    <p className="text-slate-600 text-base max-w-2xl">
                      Organize, analyze, and summarize your research documents using AI.
                    </p>
                  </div>
                </div>
                
                {/* Time Info */}
                <div className="text-right">
                  <p className="text-slate-500 text-sm">
                    {currentTime.toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </p>
                  <p className="text-slate-400 text-xs">
                    {currentTime.toLocaleTimeString('en-US', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </p>
                </div>
              </div>
            </div>
          </motion.section>

          {/* Summary Cards */}
          <motion.section variants={itemVariants} className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl lg:text-3xl font-bold text-slate-900 mb-2">Research Overview</h2>
                <p className="text-slate-600 text-lg">Your research document processing metrics</p>
                <p className="text-slate-400 text-sm mt-1">
                  Last updated: {lastRefresh.toLocaleTimeString()} 
                  {isLoadingData && <span className="ml-2 animate-pulse text-blue-600">• Refreshing...</span>}
                  {hasRealtimeUpdates && <span className="ml-2 text-green-600 animate-pulse">• New data available!</span>}
                </p>
              </div>
              <Button 
                onClick={handleRefresh}
                disabled={isLoadingData}
                variant="outline"
                className="flex items-center gap-2"
              >
                <ArrowRight className={`h-4 w-4 ${isLoadingData ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard
                title="Uploaded Papers"
                value={researchStats?.uploadedPapers || 0}
                icon={FileText}
                color="from-blue-600 to-blue-700"
                bgGradient="from-blue-50 via-blue-25 to-white"
              />
              <StatCard
                title="Extracted Citations"
                value={researchStats?.extractedCitations || 0}
                icon={Quote}
                color="from-emerald-600 to-emerald-700"
                bgGradient="from-emerald-50 via-emerald-25 to-white"
              />
              <StatCard
                title="Summarized Documents"
                value={researchStats?.summarizedDocuments || 0}
                icon={BookOpen}
                color="from-violet-600 to-violet-700"
                bgGradient="from-violet-50 via-violet-25 to-white"
              />
              <StatCard
                title="Literature Topics"
                value={researchStats?.literatureTopics || 0}
                icon={TrendingUp}
                color="from-amber-600 to-amber-700"
                bgGradient="from-amber-50 via-amber-25 to-white"
              />
            </div>
          </motion.section>

          {/* Quick Actions Section */}
          <motion.section variants={itemVariants} className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl lg:text-3xl font-bold text-slate-900 mb-2">Quick Actions</h2>
                <p className="text-slate-600 text-lg">Streamlined access to research tools</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <QuickActionCard
                title="Literature Analysis"
                description="Discover patterns and connections in your research"
                href="/dashboard/research/literature"
                icon={Library}
                gradient="bg-gradient-to-br from-purple-500 to-purple-700"
              />
              <QuickActionCard
                title="Summarize Papers"
                description="Generate AI-powered summaries of research documents"
                href="/dashboard/research/summarize"
                icon={Sparkles}
                gradient="bg-gradient-to-br from-blue-500 to-blue-700"
              />
              <QuickActionCard
                title="Generate Citations"
                description="Format citations in APA, MLA, or IEEE styles"
                href="/dashboard/research/citations"
                icon={Quote}
                gradient="bg-gradient-to-br from-emerald-500 to-emerald-700"
              />
            </div>
          </motion.section>

          {/* Main Dashboard Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
            
            {/* Recent Activity */}
            <motion.section variants={itemVariants} className="xl:col-span-4">
              <Card className="bg-white border-slate-200/60 shadow-lg h-full">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-slate-900 text-xl font-bold mb-1">Recent Activity</CardTitle>
                      <p className="text-slate-600">Latest research interactions and processing</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="px-6 pb-6 space-y-1">
                    {recentActivity.length > 0 ? recentActivity.map((activity) => (
                      <motion.div
                        key={activity.activityId}
                        variants={itemVariants}
                        className="flex items-center space-x-3 p-3 rounded-lg hover:bg-slate-50 transition-colors duration-200"
                      >
                        <div className={`p-2 rounded-full ${
                          activity.status === 'completed' ? 'bg-green-100' : 'bg-blue-100'
                        }`}>
                          {activity.status === 'completed' ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <Clock className="h-4 w-4 text-blue-600" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900">
                            {activity.action}: <span className="text-slate-600">{activity.target}</span>
                          </p>
                          <p className="text-xs text-slate-500">
                            {activity.timestamp.toLocaleDateString()} {activity.timestamp.toLocaleTimeString()}
                          </p>
                        </div>
                      </motion.div>
                    )) : (
                      <div className="flex items-center justify-center h-[200px] text-center">
                        <div className="space-y-4">
                          <Activity className="w-12 h-12 text-slate-300 mx-auto" />
                          <div className="space-y-2">
                            <p className="text-slate-500 font-medium">No recent activity</p>
                            <p className="text-slate-400 text-sm">Upload documents to get started</p>
                          </div>
                        </div>
                      </div>
                    )}
                    {recentActivity.length > 0 && (
                      <motion.div variants={itemVariants} className="pt-4">
                        <Button variant="ghost" className="w-full justify-center text-slate-600 hover:text-slate-900">
                          View All Activity
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </motion.div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.section>

            {/* Recent Research Files */}
            <motion.section variants={itemVariants} className="xl:col-span-4">
              <Card className="bg-white border-slate-200/60 shadow-lg h-full">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-slate-900 text-xl font-bold mb-1">Recent Files</CardTitle>
                      <p className="text-slate-600">Recently processed research documents</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="px-6 pb-6 space-y-1">
                    {recentFiles.length > 0 ? recentFiles.map((file) => (
                      <motion.div
                        key={file.documentId}
                        variants={itemVariants}
                        className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 transition-colors duration-200"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-red-100 rounded-lg">
                            <FileText className="h-4 w-4 text-red-600" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-slate-900 truncate">
                              {file.name}
                            </p>
                            <p className="text-xs text-slate-500">
                              {file.uploadDate.toLocaleDateString()} • {(file.size / 1024 / 1024).toFixed(1)}MB
                            </p>
                          </div>
                        </div>
                        <Badge 
                          variant={file.status === 'processed' ? 'default' : 'secondary'}
                          className={file.status === 'processed' ? 'bg-green-100 text-green-800' : ''}
                        >
                          {file.status === 'processed' ? 'Processed' : 
                           file.status === 'processing' ? 'Processing' : 
                           file.status === 'failed' ? 'Failed' : 'Uploaded'}
                        </Badge>
                      </motion.div>
                    )) : (
                      <div className="flex items-center justify-center h-[200px] text-center">
                        <div className="space-y-4">
                          <FileText className="w-12 h-12 text-slate-300 mx-auto" />
                          <div className="space-y-2">
                            <p className="text-slate-500 font-medium">No documents yet</p>
                            <p className="text-slate-400 text-sm">Upload PDF files to get started</p>
                          </div>
                        </div>
                      </div>
                    )}
                    {recentFiles.length > 0 && (
                      <motion.div variants={itemVariants} className="pt-4">
                        <Button variant="ghost" className="w-full justify-center text-slate-600 hover:text-slate-900">
                          View All Files
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </motion.div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.section>

            {/* Chat History */}
            <motion.section variants={itemVariants} className="xl:col-span-4">
              <Card className="bg-white border-slate-200/60 shadow-lg h-full">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-slate-900 text-xl font-bold mb-1">Chat History</CardTitle>
                      <p className="text-slate-600">Recent AI research conversations</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="px-6 pb-6 space-y-1">
                    {/* Mock chat history - replace with real data */}
                    {[
                      { id: 1, question: "What are the key differences between BERT and GPT?", timestamp: "2 hours ago", status: "completed" },
                      { id: 2, question: "Summarize attention mechanisms in transformers", timestamp: "1 day ago", status: "completed" },
                      { id: 3, question: "Compare diffusion models to GANs", timestamp: "2 days ago", status: "completed" }
                    ].map((chat) => (
                      <motion.div
                        key={chat.id}
                        variants={itemVariants}
                        className="flex items-start space-x-3 p-3 rounded-lg hover:bg-slate-50 transition-colors duration-200 cursor-pointer"
                      >
                        <div className="p-2 rounded-full bg-purple-100">
                          <MessageSquare className="h-4 w-4 text-purple-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 line-clamp-2">
                            {chat.question}
                          </p>
                          <p className="text-xs text-slate-500 mt-1">
                            {chat.timestamp}
                          </p>
                        </div>
                        <div className="flex items-center">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        </div>
                      </motion.div>
                    ))}
                    <motion.div variants={itemVariants} className="pt-4">
                      <Button variant="ghost" className="w-full justify-center text-slate-600 hover:text-slate-900">
                        View All Conversations
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </motion.div>
                  </div>
                </CardContent>
              </Card>
            </motion.section>
          </div>

          {/* Bottom Section Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* AI Research Assistant */}
            <motion.section variants={itemVariants}>
              <Card className="bg-white border-slate-200/60 shadow-lg h-full">
                <CardHeader className="pb-4">
                  <CardTitle className="text-slate-900 text-xl font-bold mb-1 flex items-center gap-2">
                    <Brain className="h-5 w-5 text-purple-600" />
                    AI Research Assistant
                  </CardTitle>
                  <p className="text-slate-600">Ask questions about your research documents</p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Ask about your research documents..."
                        value={aiQuery}
                        onChange={(e) => setAiQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAiQuery()}
                        className="flex-1"
                      />
                      <Button 
                        onClick={handleAiQuery}
                        disabled={!aiQuery.trim()}
                        className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white"
                      >
                        <Zap className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="text-xs text-slate-500">
                      Try: "Summarize all papers on Diffusion Models" or "Find common themes in uploaded research"
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.section>

            {/* Upload Section */}
            <motion.section variants={itemVariants}>
              <Card className="bg-white border-slate-200/60 shadow-lg h-full hover:shadow-xl transition-all duration-200 cursor-pointer group">
                <CardHeader className="pb-4">
                  <CardTitle className="text-slate-900 text-xl font-bold mb-1 flex items-center gap-2">
                    <UploadCloud className="h-5 w-5 text-blue-600 group-hover:scale-110 transition-transform duration-200" />
                    Upload New Papers
                  </CardTitle>
                  <p className="text-slate-600">Add research documents for analysis</p>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <div className="mb-4">
                      <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-200">
                        <Upload className="h-8 w-8 text-blue-600" />
                      </div>
                      <p className="text-sm text-slate-600 mb-2">
                        Drag & drop PDF files here
                      </p>
                      <p className="text-xs text-slate-500">
                        Or click to browse files
                      </p>
                    </div>
                    <Button variant="outline" className="group-hover:border-blue-300">
                      <Plus className="mr-2 h-4 w-4" />
                      Select Files
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.section>
          </div>

          {/* Notifications */}
          {mockData.notifications.length > 0 && (
            <motion.section variants={itemVariants} className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl lg:text-3xl font-bold text-slate-900 mb-2 flex items-center gap-2">
                    <Bell className="h-7 w-7" />
                    Notifications
                  </h2>
                  <p className="text-slate-600 text-lg">Important updates and alerts</p>
                </div>
              </div>
              <div className="space-y-3">
                {mockData.notifications.map((notification) => (
                  <motion.div key={notification.id} variants={itemVariants}>
                    <Alert className={`${
                      notification.type === 'warning' 
                        ? 'border-amber-200 bg-amber-50' 
                        : 'border-blue-200 bg-blue-50'
                    } shadow-sm`}>
                      {notification.type === 'warning' ? (
                        <AlertCircle className="h-4 w-4 text-amber-600" />
                      ) : (
                        <Bell className="h-4 w-4 text-blue-600" />
                      )}
                      <AlertDescription>
                        <span className="font-medium">{notification.title}:</span> {notification.message}
                      </AlertDescription>
                    </Alert>
                  </motion.div>
                ))}
              </div>
            </motion.section>
          )}

          {/* Progress Section */}
          <motion.section variants={itemVariants}>
            <Card className="bg-white border-slate-200/60 shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="text-slate-900 text-xl font-bold mb-1 flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-slate-600" />
                  Research Progress
                </CardTitle>
                <p className="text-slate-600">Track your research processing pipeline</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-slate-700">Document Processing</span>
                      <span className="text-sm text-slate-500">18/24</span>
                    </div>
                    <Progress value={75} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-slate-700">Citation Extraction</span>
                      <span className="text-sm text-slate-500">156/200</span>
                    </div>
                    <Progress value={78} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-slate-700">Literature Analysis</span>
                      <span className="text-sm text-slate-500">7/10</span>
                    </div>
                    <Progress value={70} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.section>
        </motion.div>
      </div>
    </div>
  )
}