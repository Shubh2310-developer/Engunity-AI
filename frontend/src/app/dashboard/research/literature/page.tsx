'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { supabase } from '@/lib/auth/supabase'
import { 
  Library, 
  FileText, 
  Search, 
  RefreshCw,
  Download,
  ArrowLeftRight,
  Network,
  Calendar,
  Users,
  Target,
  TrendingUp,
  BarChart3,
  GitBranch,
  Layers,
  BookOpen,
  Lightbulb,
  Beaker,
  CheckCircle,
  Sparkles,
  X,
  ArrowLeft,
  Bell,
  Activity
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'

// User and cluster interfaces
interface UserData {
  id: string
  name: string
  email: string
  avatar?: string
  initials: string
}

// Mock data - will be replaced with real data from MongoDB
const mockDocuments = [
  {
    id: 1,
    title: "Attention Is All You Need",
    authors: ["Vaswani, A.", "Shazeer, N.", "Parmar, N."],
    year: 2017,
    venue: "NeurIPS",
    type: "conference",
    field: "Natural Language Processing",
    tags: ["Transformers", "Attention", "Machine Translation"],
    abstract: "We propose a new simple network architecture, the Transformer, based solely on attention mechanisms...",
    methodology: "Encoder-decoder architecture with multi-head self-attention",
    keyFindings: "Transformers achieve better results than RNNs while being more parallelizable",
    researchQuestion: "Can attention mechanisms alone suffice for sequence modeling?",
    citationCount: 47291,
    uploadDate: "2024-01-15",
    clusterId: 1,
    similarity: 0.95
  },
  {
    id: 2,
    title: "BERT: Pre-training of Deep Bidirectional Transformers",
    authors: ["Devlin, J.", "Chang, M.", "Lee, K."],
    year: 2018,
    venue: "NAACL",
    type: "conference",
    field: "Natural Language Processing",
    tags: ["BERT", "Pre-training", "Language Models"],
    abstract: "We introduce BERT, which stands for Bidirectional Encoder Representations from Transformers...",
    methodology: "Masked language modeling and next sentence prediction pre-training",
    keyFindings: "Bidirectional training significantly improves language understanding",
    researchQuestion: "How can we better pre-train language representations?",
    citationCount: 39842,
    uploadDate: "2024-01-14",
    clusterId: 1,
    similarity: 0.89
  },
  {
    id: 3,
    title: "Denoising Diffusion Probabilistic Models",
    authors: ["Ho, J.", "Jain, A.", "Abbeel, P."],
    year: 2020,
    venue: "NeurIPS",
    type: "conference",
    field: "Computer Vision",
    tags: ["Diffusion Models", "Generative Models", "Image Generation"],
    abstract: "We present high quality image synthesis results using diffusion probabilistic models...",
    methodology: "Forward and reverse diffusion processes with neural network denoising",
    keyFindings: "Diffusion models can generate high-quality images competitive with GANs",
    researchQuestion: "Can diffusion processes be used for high-quality image generation?",
    citationCount: 8942,
    uploadDate: "2024-01-13",
    clusterId: 2,
    similarity: 0.82
  },
  {
    id: 4,
    title: "DALL-E 2: Hierarchical Text-Conditional Image Generation",
    authors: ["Ramesh, A.", "Dhariwal, P.", "Nichol, A."],
    year: 2022,
    venue: "arXiv",
    type: "preprint",
    field: "Computer Vision",
    tags: ["Text-to-Image", "Diffusion Models", "CLIP"],
    abstract: "We show that manipulating the CLIP embedding space allows for controllable image generation...",
    methodology: "CLIP embeddings with diffusion models for text-conditional generation",
    keyFindings: "Hierarchical generation enables high-resolution controllable image synthesis",
    researchQuestion: "How can we generate high-quality images from text descriptions?",
    citationCount: 3247,
    uploadDate: "2024-01-12",
    clusterId: 2,
    similarity: 0.78
  },
  {
    id: 5,
    title: "Graph Neural Networks: A Review of Methods and Applications",
    authors: ["Zhou, J.", "Cui, G.", "Hu, S."],
    year: 2020,
    venue: "AI Open",
    type: "journal",
    field: "Machine Learning",
    tags: ["Graph Neural Networks", "Survey", "Graph Learning"],
    abstract: "Graph neural networks (GNNs) have received increasing attention in recent years...",
    methodology: "Comprehensive survey and taxonomy of GNN approaches",
    keyFindings: "GNNs show promise across various domains but face scalability challenges",
    researchQuestion: "What are the current approaches and challenges in graph neural networks?",
    citationCount: 5683,
    uploadDate: "2024-01-11",
    clusterId: 3,
    similarity: 0.71
  }
]

const mockClusters = [
  {
    id: 1,
    name: "Transformer Models & Attention",
    description: "Papers focusing on transformer architectures and attention mechanisms",
    documentIds: [1, 2],
    topicKeywords: ["Transformers", "Attention", "BERT", "Language Models"],
    coherenceScore: 0.92,
    averageCitations: 43566,
    timespan: "2017-2018",
    color: "bg-blue-500"
  },
  {
    id: 2,
    name: "Diffusion Models & Image Generation",
    description: "Research on diffusion-based generative models for image synthesis",
    documentIds: [3, 4],
    topicKeywords: ["Diffusion Models", "Image Generation", "Text-to-Image", "DALL-E"],
    coherenceScore: 0.85,
    averageCitations: 6094,
    timespan: "2020-2022",
    color: "bg-purple-500"
  },
  {
    id: 3,
    name: "Graph Neural Networks",
    description: "Graph-based learning approaches and applications",
    documentIds: [5],
    topicKeywords: ["Graph Neural Networks", "Graph Learning", "Network Analysis"],
    coherenceScore: 0.78,
    averageCitations: 5683,
    timespan: "2020",
    color: "bg-green-500"
  }
]

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

interface Document {
  id: number
  title: string
  authors: string[]
  year: number
  venue: string
  type: string
  field: string
  tags: string[]
  abstract: string
  methodology: string
  keyFindings: string
  researchQuestion: string
  citationCount: number
  uploadDate: string
  clusterId: number
  similarity: number
}

interface Cluster {
  id: number
  name: string
  description: string
  documentIds: number[]
  topicKeywords: string[]
  coherenceScore: number
  averageCitations: number
  timespan: string
  color: string
}

const DocumentCard = ({ 
  document, 
  isSelected, 
  onSelect, 
  showClusterInfo = false 
}: { 
  document: Document
  isSelected: boolean
  onSelect: (id: number) => void
  showClusterInfo?: boolean
}) => {
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'conference': return <Users className="h-4 w-4" />
      case 'journal': return <BookOpen className="h-4 w-4" />
      case 'preprint': return <FileText className="h-4 w-4" />
      default: return <FileText className="h-4 w-4" />
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'conference': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
      case 'journal': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
      case 'preprint': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
    }
  }

  return (
    <motion.div
      variants={itemVariants}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
    >
      <Card className={`cursor-pointer transition-all duration-300 ${
        isSelected 
          ? 'ring-2 ring-blue-500 shadow-lg border-blue-300 dark:border-blue-600' 
          : 'hover:shadow-md border-slate-200 dark:border-slate-700'
      }`}
      onClick={() => onSelect(document.id)}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={isSelected}
                onChange={() => onSelect(document.id)}
                className="mt-1"
              />
              <div className="flex items-center gap-2">
                {getTypeIcon(document.type)}
                <Badge className={getTypeColor(document.type)} variant="secondary">
                  {document.type}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {document.field}
                </Badge>
              </div>
            </div>
            {showClusterInfo && (
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span className="text-xs text-slate-500">Cluster {document.clusterId}</span>
              </div>
            )}
          </div>
          <CardTitle className="text-base leading-tight text-slate-900 dark:text-slate-100 mt-2">
            {document.title}
          </CardTitle>
          <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
            <span>{document.authors.slice(0, 2).join(', ')}{document.authors.length > 2 && ' et al.'}</span>
            <span>•</span>
            <span>{document.year}</span>
            <span>•</span>
            <span>{document.venue}</span>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-slate-700 dark:text-slate-300 line-clamp-2">
            {document.abstract}
          </p>
          
          <div className="flex flex-wrap gap-1">
            {document.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
            {document.tags.length > 3 && (
              <Badge variant="secondary" className="text-xs">
                +{document.tags.length - 3} more
              </Badge>
            )}
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-500">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-3 w-3" />
              <span>{document.citationCount.toLocaleString()} citations</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-3 w-3" />
              <span>Added {new Date(document.uploadDate).toLocaleDateString()}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

const ClusterCard = ({ 
  cluster, 
  documents, 
  onDocumentSelect,
  selectedDocuments 
}: { 
  cluster: Cluster
  documents: Document[]
  onDocumentSelect: (id: number) => void
  selectedDocuments: number[]
}) => {
  const clusterDocs = documents.filter(doc => cluster.documentIds.includes(doc.id))

  return (
    <motion.div variants={itemVariants}>
      <Card className="border-slate-200 dark:border-slate-700 overflow-hidden">
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-4 h-4 rounded-full ${cluster.color}`}></div>
              <div>
                <CardTitle className="text-lg text-slate-900 dark:text-slate-100">
                  {cluster.name}
                </CardTitle>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  {cluster.description}
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {clusterDocs.length} papers
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-500">
                {cluster.timespan}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Cluster Metrics */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-600 dark:text-slate-400">Coherence Score</span>
                <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                  {Math.round(cluster.coherenceScore * 100)}%
                </span>
              </div>
              <Progress value={cluster.coherenceScore * 100} className="h-2" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-600 dark:text-slate-400">Avg Citations</span>
                <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                  {cluster.averageCitations.toLocaleString()}
                </span>
              </div>
              <Progress value={Math.min(cluster.averageCitations / 50000 * 100, 100)} className="h-2" />
            </div>
          </div>

          {/* Topic Keywords */}
          <div>
            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 block">
              Topic Keywords
            </Label>
            <div className="flex flex-wrap gap-1">
              {cluster.topicKeywords.map((keyword) => (
                <Badge key={keyword} variant="outline" className="text-xs">
                  {keyword}
                </Badge>
              ))}
            </div>
          </div>

          {/* Documents in Cluster */}
          <div>
            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 block">
              Documents in Cluster
            </Label>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {clusterDocs.map((doc) => (
                <motion.div
                  key={doc.id}
                  className={`p-2 rounded-lg border transition-all duration-200 cursor-pointer ${
                    selectedDocuments.includes(doc.id)
                      ? 'border-blue-300 bg-blue-50 dark:border-blue-600 dark:bg-blue-900/20'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                  onClick={() => onDocumentSelect(doc.id)}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                        {doc.title}
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                        {doc.authors[0]} et al. ({doc.year})
                      </p>
                    </div>
                    <div className="flex items-center ml-2">
                      <Checkbox
                        checked={selectedDocuments.includes(doc.id)}
                        onChange={() => onDocumentSelect(doc.id)}
                      />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

const ComparisonPanel = ({ 
  documents, 
  selectedDocs, 
  onClearSelection 
}: { 
  documents: Document[]
  selectedDocs: number[]
  onClearSelection: () => void
}) => {
  const selectedDocuments = documents.filter(doc => selectedDocs.includes(doc.id))

  if (selectedDocuments.length < 2) {
    return (
      <Card className="border-dashed border-2 border-slate-300 dark:border-slate-600">
        <CardContent className="text-center py-12">
          <div className="mx-auto w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
            <ArrowLeftRight className="h-8 w-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
            Select Papers to Compare
          </h3>
          <p className="text-slate-500 dark:text-slate-400">
            Choose 2-3 documents to see a side-by-side comparison of their research questions, 
            methodologies, and key findings.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          Comparing {selectedDocuments.length} Papers
        </h3>
        <Button variant="outline" onClick={onClearSelection}>
          <X className="mr-2 h-4 w-4" />
          Clear Selection
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Research Questions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              Research Questions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {selectedDocuments.map((doc) => (
                <div key={doc.id} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                    <span className="font-medium text-slate-900 dark:text-slate-100">
                      {doc.title}
                    </span>
                  </div>
                  <p className="text-sm text-slate-700 dark:text-slate-300">
                    {doc.researchQuestion}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Methodologies */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Beaker className="h-5 w-5 text-green-600 dark:text-green-400" />
              Methodologies
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {selectedDocuments.map((doc) => (
                <div key={doc.id} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span className="font-medium text-slate-900 dark:text-slate-100">
                      {doc.title}
                    </span>
                  </div>
                  <p className="text-sm text-slate-700 dark:text-slate-300">
                    {doc.methodology}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Key Findings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              Key Findings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {selectedDocuments.map((doc) => (
                <div key={doc.id} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <span className="font-medium text-slate-900 dark:text-slate-100">
                      {doc.title}
                    </span>
                  </div>
                  <p className="text-sm text-slate-700 dark:text-slate-300">
                    {doc.keyFindings}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Summary Comparison */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              Comparison Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-1">
                  {selectedDocuments.length}
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400">Papers Compared</div>
              </div>
              <div className="text-center p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-1">
                  {new Set(selectedDocuments.flatMap(d => d.tags)).size}
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400">Unique Topics</div>
              </div>
              <div className="text-center p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-1">
                  {Math.round(selectedDocuments.reduce((acc, doc) => acc + doc.year, 0) / selectedDocuments.length)}
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400">Avg Year</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function LiteratureAnalysis() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [clusters, setClusters] = useState<Cluster[]>([])
  const [selectedDocuments, setSelectedDocuments] = useState<number[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [filterField, setFilterField] = useState<string>("all")
  const [filterType, setFilterType] = useState<string>("all")
  const [sortBy, setSortBy] = useState<string>("year")
  const [viewMode, setViewMode] = useState<"documents" | "clusters" | "comparison" | "graph">("clusters")
  const [isReclustering, setIsReclustering] = useState(false)
  
  // Authentication and user data
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState<UserData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  
  // Real-time data states
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  const [hasRealtimeUpdates, setHasRealtimeUpdates] = useState(false)
  const [isLoadingData, setIsLoadingData] = useState(false)

  const filteredDocuments = useMemo(() => {
    return documents.filter(doc => {
      const matchesSearch = searchQuery === "" || 
        doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.authors.some(author => author.toLowerCase().includes(searchQuery.toLowerCase())) ||
        doc.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      
      const matchesField = filterField === "all" || doc.field === filterField
      const matchesType = filterType === "all" || doc.type === filterType
      
      return matchesSearch && matchesField && matchesType
    }).sort((a, b) => {
      switch (sortBy) {
        case "year":
          return b.year - a.year
        case "citations":
          return b.citationCount - a.citationCount
        case "title":
          return a.title.localeCompare(b.title)
        default:
          return 0
      }
    })
  }, [documents, searchQuery, filterField, filterType, sortBy])

  const handleDocumentSelect = (id: number) => {
    setSelectedDocuments(prev => {
      if (prev.includes(id)) {
        return prev.filter(docId => docId !== id)
      } else if (prev.length < 3) {
        return [...prev, id]
      } else {
        return [prev[1]!, prev[2]!, id] // Replace the oldest selection
      }
    })
  }

  // Simplified page loading - always show content immediately  
  useEffect(() => {
    const loadPageData = async () => {
      console.log('Loading literature analysis page...')
      
      // Always load mock data first for immediate display
      setDocuments(mockDocuments)
      setClusters(mockClusters)
      
      // Set default user for demo
      setUser({
        id: 'demo-user',
        name: 'Demo User',
        email: 'demo@example.com',
        initials: 'DU'
      })
      
      // Page is ready
      setIsLoading(false)
      
      // Try auth in background (non-blocking)
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (!error && session?.user) {
          console.log('User authenticated:', session.user.email)
          setIsAuthenticated(true)
          const userData: UserData = {
            id: session.user.id || 'demo-user',
            name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User',
            email: session.user.email || 'user@example.com',
            avatar: session.user.user_metadata?.avatar_url,
            initials: (session.user.user_metadata?.full_name || session.user.email || 'U').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
          }
          setUser(userData)
          
          // Try to load real data in background
          if (session.user.id) {
            loadUserData(session.user.id).catch(err => {
              console.log('Background data loading failed:', err)
            })
          }
        } else {
          console.log('Using demo mode for literature analysis')
          setIsAuthenticated(false)
        }
      } catch (error) {
        console.log('Auth check failed, using demo mode:', error)
        setIsAuthenticated(false)
      }
    }

    loadPageData()

    // Listen for auth changes (simplified)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setIsAuthenticated(true)
        const userData: UserData = {
          id: session.user.id || 'demo-user',
          name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User',
          email: session.user.email || 'user@example.com',
          avatar: session.user.user_metadata?.avatar_url,
          initials: (session.user.user_metadata?.full_name || session.user.email || 'U').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
        }
        setUser(userData)
        if (session.user.id) {
          loadUserData(session.user.id).catch(console.log)
        }
      } else if (event === 'SIGNED_OUT') {
        setIsAuthenticated(false)
        setUser({
          id: 'demo-user',
          name: 'Demo User',
          email: 'demo@example.com',
          initials: 'DU'
        })
        setDocuments(mockDocuments)
        setClusters(mockClusters)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // Real-time updates (disabled for stability)
  useEffect(() => {
    // Disabled real-time updates to prevent loading issues
    // Can be re-enabled once backend APIs are stable
    if (!isAuthenticated || !user) return

    console.log('Real-time updates disabled for stability')
    
    return () => {} // No cleanup needed
  }, [isAuthenticated, user])

  // Load user data function
  const loadUserData = async (userId: string) => {
    try {
      setIsLoadingData(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      // Load documents
      const documentsResponse = await fetch('/api/research/documents?limit=100', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      if (documentsResponse.ok) {
        const docsData = await documentsResponse.json()
        // Transform MongoDB documents to literature format
        const processedDocs: Document[] = docsData.map((doc: any, index: number) => ({
          id: index + 1,
          title: doc.name.replace('.pdf', ''),
          authors: [`${doc.name.split(' ')[0]}, A.`], // Simplified author extraction
          year: new Date(doc.uploadDate).getFullYear(),
          venue: 'Unknown',
          type: 'conference',
          field: 'Research',
          tags: doc.keywords || ['Research'],
          abstract: doc.summary || 'Abstract not available',
          methodology: 'Methodology analysis pending',
          keyFindings: 'Key findings analysis pending',
          researchQuestion: 'Research question analysis pending',
          citationCount: Math.floor(Math.random() * 1000),
          uploadDate: doc.uploadDate,
          clusterId: Math.floor(Math.random() * 3) + 1,
          similarity: Math.random()
        }))
        setDocuments(processedDocs)
        
        // Generate clusters based on documents
        generateClusters(processedDocs)
      } else {
        console.error('Failed to fetch documents')
        // Fallback to mock data
        setDocuments(mockDocuments)
        setClusters(mockClusters)
      }
    } catch (error) {
      console.error('Failed to load user data:', error)
      // Fallback to mock data
      setDocuments(mockDocuments)
      setClusters(mockClusters)
    } finally {
      setIsLoadingData(false)
    }
  }

  const generateClusters = (docs: Document[]) => {
    // Simple clustering logic - group by field and year range
    const clusterMap = new Map()
    
    docs.forEach(doc => {
      const key = `${doc.field}-${Math.floor(doc.year / 5) * 5}`
      if (!clusterMap.has(key)) {
        clusterMap.set(key, [])
      }
      clusterMap.get(key).push(doc.id)
    })
    
    const generatedClusters: Cluster[] = Array.from(clusterMap.entries()).map(([key, docIds], index) => {
      const [field, yearRange] = key.split('-')
      return {
        id: index + 1,
        name: `${field} Research Cluster`,
        description: `Research papers in ${field} from ${yearRange}s era`,
        documentIds: docIds,
        topicKeywords: [...new Set(docs.filter(d => docIds.includes(d.id)).flatMap(d => d.tags))],
        coherenceScore: Math.random() * 0.3 + 0.7,
        averageCitations: Math.floor(Math.random() * 5000) + 1000,
        timespan: `${yearRange}-${parseInt(yearRange) + 5}`,
        color: `bg-${['blue', 'purple', 'green', 'orange'][index % 4]}-500`
      }
    })
    
    setClusters(generatedClusters)
  }

  const handleRecluster = async () => {
    setIsReclustering(true)
    // Simulate re-clustering process
    await new Promise(resolve => setTimeout(resolve, 3000))
    
    // Regenerate clusters based on current documents
    if (documents.length > 0) {
      generateClusters(documents)
    }
    
    setIsReclustering(false)
  }

  const handleExport = async (format: 'json' | 'csv') => {
    const exportData = {
      clusters: clusters.map(cluster => ({
        ...cluster,
        documents: documents.filter(doc => cluster.documentIds.includes(doc.id))
      })),
      totalDocuments: documents.length,
      exportDate: new Date().toISOString()
    }

    let content = ""
    let filename = ""
    let mimeType = ""

    switch (format) {
      case 'json':
        content = JSON.stringify(exportData, null, 2)
        filename = "literature_analysis.json"
        mimeType = "application/json"
        break
      
      case 'csv':
        const csvRows = [
          ["Cluster ID", "Cluster Name", "Document ID", "Document Title", "Authors", "Year", "Citations"]
        ]
        
        clusters.forEach(cluster => {
          const clusterDocs = documents.filter(doc => cluster.documentIds.includes(doc.id))
          clusterDocs.forEach(doc => {
            csvRows.push([
              cluster.id.toString(),
              cluster.name,
              doc.id.toString(),
              doc.title,
              doc.authors.join('; '),
              doc.year.toString(),
              doc.citationCount.toString()
            ])
          })
        })
        
        content = csvRows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')
        filename = "literature_analysis.csv"
        mimeType = "text/csv"
        break
    }

    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const GraphView = () => (
    <Card className="h-96">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Network className="h-5 w-5" />
          Topic Similarity Graph
        </CardTitle>
      </CardHeader>
      <CardContent className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
            <GitBranch className="h-8 w-8 text-slate-400" />
          </div>
          <p className="text-slate-500 dark:text-slate-400 mb-4">
            Interactive graph visualization would be implemented here using D3.js or similar library
          </p>
          <Button variant="outline">
            <Network className="mr-2 h-4 w-4" />
            Generate Graph
          </Button>
        </div>
      </CardContent>
    </Card>
  )

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto" />
          <p className="text-slate-600 text-lg">Loading literature analysis...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800">
      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="container mx-auto px-4 py-8"
      >
        {/* Navigation Header */}
        <motion.div variants={itemVariants} className="mb-6">
          <div className="flex items-center gap-4 mb-4">
            <Link href="/dashboard/research">
              <Button variant="ghost" size="sm" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Research
              </Button>
            </Link>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <span>Welcome back, {user?.name || 'User'}</span>
              {hasRealtimeUpdates && (
                <div className="flex items-center gap-1 text-green-600">
                  <Bell className="h-3 w-3 animate-pulse" />
                  <span className="text-xs">Updated</span>
                </div>
              )}
              {isLoadingData && (
                <div className="flex items-center gap-1 text-blue-600">
                  <Activity className="h-3 w-3 animate-spin" />
                  <span className="text-xs">Refreshing...</span>
                </div>
              )}
            </div>
          </div>
          <div className="h-px bg-slate-200 dark:bg-slate-700" />
        </motion.div>
        {/* Header Section */}
        <motion.div variants={itemVariants} className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl">
              <Library className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Literature Analysis</h1>
              <p className="text-lg text-slate-600 dark:text-slate-400">
                Cluster research documents into topics, methods, and findings.
              </p>
            </div>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="border-slate-200 dark:border-slate-700">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Total Papers</span>
                </div>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                  {documents.length}
                </p>
              </CardContent>
            </Card>
            <Card className="border-slate-200 dark:border-slate-700">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Topic Clusters</span>
                </div>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                  {clusters.length}
                </p>
              </CardContent>
            </Card>
            <Card className="border-slate-200 dark:border-slate-700">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Avg Coherence</span>
                </div>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                  {clusters.length > 0 ? Math.round(clusters.reduce((acc, c) => acc + c.coherenceScore, 0) / clusters.length * 100) : 0}%
                </p>
              </CardContent>
            </Card>
            <Card className="border-slate-200 dark:border-slate-700">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Year Range</span>
                </div>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                  {documents.length > 0 ? `${Math.min(...documents.map(d => d.year))}-${Math.max(...documents.map(d => d.year))}` : 'N/A'}
                </p>
              </CardContent>
            </Card>
          </div>
        </motion.div>

        {/* Controls Bar */}
        <motion.div variants={itemVariants} className="mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
                {/* View Mode Tabs */}
                <Tabs value={viewMode} onValueChange={(value: any) => setViewMode(value)} className="w-full lg:w-auto">
                  <TabsList className="grid w-full grid-cols-4 lg:w-auto">
                    <TabsTrigger value="clusters" className="flex items-center gap-2">
                      <Layers className="h-4 w-4" />
                      Clusters
                    </TabsTrigger>
                    <TabsTrigger value="documents" className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Documents
                    </TabsTrigger>
                    <TabsTrigger value="comparison" className="flex items-center gap-2">
                      <ArrowLeftRight className="h-4 w-4" />
                      Compare
                    </TabsTrigger>
                    <TabsTrigger value="graph" className="flex items-center gap-2">
                      <Network className="h-4 w-4" />
                      Graph
                    </TabsTrigger>
                  </TabsList>
                </Tabs>

                {/* Action Buttons */}
                <div className="flex gap-2 w-full lg:w-auto">
                  <Button
                    variant="outline"
                    onClick={handleRecluster}
                    disabled={isReclustering}
                    className="flex-1 lg:flex-none"
                  >
                    {isReclustering ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Re-clustering...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Re-cluster
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleExport('json')}
                    className="flex-1 lg:flex-none"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Export JSON
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleExport('csv')}
                    className="flex-1 lg:flex-none"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Export CSV
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Filters and Search */}
        {(viewMode === "documents" || viewMode === "comparison") && (
          <motion.div variants={itemVariants} className="mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        placeholder="Search papers by title, author, or tags..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Select value={filterField} onValueChange={setFilterField}>
                      <SelectTrigger className="w-[160px]">
                        <SelectValue placeholder="Field" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Fields</SelectItem>
                        <SelectItem value="Natural Language Processing">NLP</SelectItem>
                        <SelectItem value="Computer Vision">Computer Vision</SelectItem>
                        <SelectItem value="Machine Learning">Machine Learning</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={filterType} onValueChange={setFilterType}>
                      <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder="Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="conference">Conference</SelectItem>
                        <SelectItem value="journal">Journal</SelectItem>
                        <SelectItem value="preprint">Preprint</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger className="w-[120px]">
                        <SelectValue placeholder="Sort" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="year">Year</SelectItem>
                        <SelectItem value="citations">Citations</SelectItem>
                        <SelectItem value="title">Title</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Selected Documents Banner */}
        {selectedDocuments.length > 0 && viewMode !== "comparison" && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    <span className="font-medium text-blue-900 dark:text-blue-100">
                      {selectedDocuments.length} paper{selectedDocuments.length !== 1 ? 's' : ''} selected for comparison
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setViewMode("comparison")}
                      className="bg-white dark:bg-slate-800"
                    >
                      <ArrowLeftRight className="mr-2 h-4 w-4" />
                      Compare Papers
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedDocuments([])}
                      className="text-blue-700 hover:text-blue-900 dark:text-blue-300"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Main Content */}
        <AnimatePresence mode="wait">
          {viewMode === "clusters" && (
            <motion.div
              key="clusters"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              className="space-y-6"
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {clusters.map((cluster) => (
                  <ClusterCard
                    key={cluster.id}
                    cluster={cluster}
                    documents={documents}
                    onDocumentSelect={handleDocumentSelect}
                    selectedDocuments={selectedDocuments}
                  />
                ))}
              </div>
            </motion.div>
          )}

          {viewMode === "documents" && (
            <motion.div
              key="documents"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                  Found {filteredDocuments.length} paper{filteredDocuments.length !== 1 ? 's' : ''}
                </h2>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredDocuments.map((document) => (
                  <DocumentCard
                    key={document.id}
                    document={document}
                    isSelected={selectedDocuments.includes(document.id)}
                    onSelect={handleDocumentSelect}
                    showClusterInfo={true}
                  />
                ))}
              </div>
            </motion.div>
          )}

          {viewMode === "comparison" && (
            <motion.div
              key="comparison"
              variants={itemVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
            >
              <ComparisonPanel
                documents={documents}
                selectedDocs={selectedDocuments}
                onClearSelection={() => setSelectedDocuments([])}
              />
            </motion.div>
          )}

          {viewMode === "graph" && (
            <motion.div
              key="graph"
              variants={itemVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
            >
              <GraphView />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Re-clustering Progress */}
        {isReclustering && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            className="fixed bottom-6 right-6 z-50"
          >
            <Card className="bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800 min-w-[300px]">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full">
                    <Sparkles className="h-5 w-5 text-white animate-pulse" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                      Re-clustering documents...
                    </p>
                    <Progress value={65} className="h-2" />
                    <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                      Analyzing document similarities and topics
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </motion.div>
    </div>
  )
}