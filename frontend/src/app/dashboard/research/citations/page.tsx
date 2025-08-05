'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { supabase } from '@/lib/auth/supabase'
import { 
  Quote, 
  Download, 
  RefreshCw, 
  FileText, 
  Upload, 
  Search, 
  Copy,
  ExternalLink,
  BookOpen,
  Calendar,
  User,
  Globe,
  Edit3,
  Save,
  X,
  CheckCircle,
  AlertCircle,
  SortAsc,
  SortDesc,
  MoreVertical,
  Trash2,
  ArrowLeft,
  Bell,
  Activity
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Label } from '@/components/ui/label'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Alert, AlertDescription } from '@/components/ui/alert'

// User and document interfaces
interface UserData {
  id: string
  name: string
  email: string
  avatar?: string
  initials: string
}

interface ResearchDocument {
  documentId: string
  userId: string
  name: string
  uploadDate: Date
  citationCount: number
  status: 'uploaded' | 'processing' | 'processed' | 'failed'
  originalName: string
  extractedCitations?: Citation[]
}

// Mock data - will be replaced with real data from MongoDB
const mockDocuments: ResearchDocument[] = [
  {
    documentId: '1',
    userId: '',
    name: "Attention Is All You Need.pdf",
    uploadDate: new Date('2024-01-15'),
    citationCount: 12,
    status: "processed",
    originalName: "Attention Is All You Need.pdf"
  },
  {
    documentId: '2',
    userId: '',
    name: "BERT: Pre-training Deep Bidirectional.pdf",
    uploadDate: new Date('2024-01-14'),
    citationCount: 8,
    status: "processed",
    originalName: "BERT: Pre-training Deep Bidirectional.pdf"
  },
  {
    documentId: '3',
    userId: '',
    name: "GPT-3: Language Models are Few-Shot.pdf",
    uploadDate: new Date('2024-01-13'),
    citationCount: 15,
    status: "processing",
    originalName: "GPT-3: Language Models are Few-Shot.pdf"
  }
]

const mockCitations = [
  {
    id: 1,
    number: 1,
    authors: ["Vaswani, A.", "Shazeer, N.", "Parmar, N.", "Uszkoreit, J.", "Jones, L.", "Gomez, A. N.", "Kaiser, L.", "Polosukhin, I."],
    title: "Attention is all you need",
    journal: "Advances in Neural Information Processing Systems",
    year: 2017,
    pages: "5998-6008",
    url: "https://arxiv.org/abs/1706.03762",
    citationText: "Vaswani, A., Shazeer, N., Parmar, N., Uszkoreit, J., Jones, L., Gomez, A. N., ... & Polosukhin, I. (2017). Attention is all you need. Advances in Neural Information Processing Systems, 30.",
    format: "APA",
    note: "",
    type: "conference"
  },
  {
    id: 2,
    number: 2,
    authors: ["Devlin, J.", "Chang, M. W.", "Lee, K.", "Toutanova, K."],
    title: "BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding",
    journal: "arXiv preprint arXiv:1810.04805",
    year: 2018,
    pages: "",
    url: "https://arxiv.org/abs/1810.04805",
    citationText: "Devlin, J., Chang, M. W., Lee, K., & Toutanova, K. (2018). BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding. arXiv preprint arXiv:1810.04805.",
    format: "APA",
    note: "",
    type: "preprint"
  },
  {
    id: 3,
    number: 3,
    authors: ["Brown, T.", "Mann, B.", "Ryder, N.", "Subbiah, M.", "Kaplan, J. D.", "Dhariwal, P."],
    title: "Language models are few-shot learners",
    journal: "Advances in Neural Information Processing Systems",
    year: 2020,
    pages: "1877-1901",
    url: "https://arxiv.org/abs/2005.14165",
    citationText: "Brown, T., Mann, B., Ryder, N., Subbiah, M., Kaplan, J. D., Dhariwal, P., ... & Amodei, D. (2020). Language models are few-shot learners. Advances in Neural Information Processing Systems, 33, 1877-1901.",
    format: "APA", 
    note: "Foundational work on GPT-3",
    type: "conference"
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

interface Citation {
  id: number
  number: number
  authors: string[]
  title: string
  journal: string
  year: number
  pages: string
  url: string
  citationText: string
  format: string
  note: string
  type: string
}

const CitationCard = ({ 
  citation, 
  onUpdateNote, 
  onDelete 
}: { 
  citation: Citation
  onUpdateNote: (id: number, note: string) => void
  onDelete: (id: number) => void
}) => {
  const [isEditingNote, setIsEditingNote] = useState(false)
  const [noteText, setNoteText] = useState(citation.note)
  const [copied, setCopied] = useState(false)

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSaveNote = () => {
    onUpdateNote(citation.id, noteText)
    setIsEditingNote(false)
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
      <Card className="hover:shadow-lg transition-all duration-300 border-slate-200 dark:border-slate-700">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 text-white text-sm font-semibold">
                {citation.number}
              </div>
              <Badge className={getTypeColor(citation.type)} variant="secondary">
                {citation.type}
              </Badge>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleCopy(citation.citationText)}>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy Citation
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleCopy(citation.url)}>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Copy URL
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => onDelete(citation.id)}
                  className="text-red-600 dark:text-red-400"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Citation Text */}
          <div className="relative">
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border-l-4 border-blue-500">
              {citation.citationText}
            </p>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-2 right-2 h-8 w-8 p-0"
                    onClick={() => handleCopy(citation.citationText)}
                  >
                    {copied ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{copied ? 'Copied!' : 'Copy citation'}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* Metadata */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <User className="h-4 w-4 text-slate-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-slate-700 dark:text-slate-300">Authors</p>
                  <p className="text-slate-600 dark:text-slate-400">
                    {(citation.authors || []).slice(0, 3).join(', ')}
                    {(citation.authors || []).length > 3 && ` et al.`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-slate-500" />
                <div>
                  <span className="font-medium text-slate-700 dark:text-slate-300">Year: </span>
                  <span className="text-slate-600 dark:text-slate-400">{citation.year}</span>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <BookOpen className="h-4 w-4 text-slate-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-slate-700 dark:text-slate-300">Journal</p>
                  <p className="text-slate-600 dark:text-slate-400">{citation.journal}</p>
                </div>
              </div>
              {citation.url && (
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-slate-500" />
                  <a 
                    href={citation.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                  >
                    View Source
                  </a>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Notes Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Personal Notes
              </Label>
              {!isEditingNote && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditingNote(true)}
                  className="h-8 px-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
                >
                  <Edit3 className="h-3 w-3 mr-1" />
                  Edit
                </Button>
              )}
            </div>
            {isEditingNote ? (
              <div className="space-y-2">
                <Textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Add your notes about this citation..."
                  className="min-h-[80px] text-sm"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleSaveNote}
                    className="h-8"
                  >
                    <Save className="h-3 w-3 mr-1" />
                    Save
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsEditingNote(false)
                      setNoteText(citation.note)
                    }}
                    className="h-8"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="min-h-[60px] p-3 bg-slate-50 dark:bg-slate-800/30 rounded-md">
                {citation.note ? (
                  <p className="text-sm text-slate-600 dark:text-slate-400">{citation.note}</p>
                ) : (
                  <p className="text-sm text-slate-400 dark:text-slate-500 italic">
                    No notes added yet. Click edit to add your thoughts.
                  </p>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

export default function CitationsWorkspace() {
  const [selectedDocument, setSelectedDocument] = useState<string>("")
  const [citations, setCitations] = useState<Citation[]>(mockCitations)
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState<"number" | "year" | "author">("number")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [filterType, setFilterType] = useState<string>("all")
  
  // Authentication and user data
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState<UserData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  
  // Real-time data states
  const [documents, setDocuments] = useState<ResearchDocument[]>([])
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  const [hasRealtimeUpdates, setHasRealtimeUpdates] = useState(false)
  const [isLoadingData, setIsLoadingData] = useState(false)

  const filteredCitations = citations
    .filter(citation => {
      const matchesSearch = searchQuery === "" || 
        citation.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (citation.authors || []).some(author => author.toLowerCase().includes(searchQuery.toLowerCase())) ||
        citation.journal.toLowerCase().includes(searchQuery.toLowerCase())
      
      const matchesFilter = filterType === "all" || citation.type === filterType
      
      return matchesSearch && matchesFilter
    })
    .sort((a, b) => {
      let comparison = 0
      switch (sortBy) {
        case "number":
          comparison = a.number - b.number
          break
        case "year":
          comparison = a.year - b.year
          break
        case "author":
          comparison = ((a.authors && a.authors[0]) || '').localeCompare((b.authors && b.authors[0]) || '')
          break
      }
      return sortOrder === "asc" ? comparison : -comparison
    })

  const getFirstAuthor = (authors: string[] | undefined): string => {
    if (!authors || authors.length === 0) return 'unknown'
    return authors[0] || 'unknown'
  }

  const handleExport = async (format: 'bib' | 'txt' | 'json') => {
    let content = ""
    let filename = ""
    let mimeType = ""

    const safeCitations = citations || []

    switch (format) {
      case 'bib':
        const bibEntries = safeCitations.map(citation => {
          const firstAuthor = getFirstAuthor(citation.authors)
          const authorPart = firstAuthor.split(',')[0].toLowerCase()
          const key = authorPart + String(citation.year)
          return `@article{${key},
  title={${citation.title}},
  author={${(citation.authors || []).join(' and ')}},
  journal={${citation.journal}},
  year={${citation.year}},
  pages={${citation.pages}},
  url={${citation.url}}
}`
        })
        content = bibEntries.join('\n\n')
        filename = "citations.bib"
        mimeType = "application/x-bibtex"
        break
      
      case 'txt':
        content = (citations || []).map((citation, index) => 
          `${index + 1}. ${citation.citationText}`
        ).join('\n\n')
        filename = "citations.txt"
        mimeType = "text/plain"
        break
      
      case 'json':
        content = JSON.stringify(citations || [], null, 2)
        filename = "citations.json"
        mimeType = "application/json"
        break
    }

    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const a = window.document.createElement('a')
    a.href = url
    a.download = filename
    window.document.body.appendChild(a)
    a.click()
    window.document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleRegenerate = async () => {
    setIsRegenerating(true)
    // Simulate API call to regenerate citations
    await new Promise(resolve => setTimeout(resolve, 3000))
    setIsRegenerating(false)
  }

  const handleUpdateNote = (id: number, note: string) => {
    setCitations(prev => prev.map(citation => 
      citation.id === id ? { ...citation, note } : citation
    ))
  }

  const handleDeleteCitation = (id: number) => {
    setCitations(prev => prev.filter(citation => citation.id !== id))
  }

  const selectedDoc = documents.find(doc => doc.documentId === selectedDocument)

  // Simplified page loading - always show content immediately
  useEffect(() => {
    const loadPageData = async () => {
      console.log('Loading citations page...')
      
      // Always load demo data first for immediate display
      const demoUserId = 'demo-user'
      setDocuments(mockDocuments.map(doc => ({ ...doc, userId: demoUserId })))
      
      // Set default user for demo
      setUser({
        id: demoUserId,
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
            id: session.user.id,
            name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User',
            email: session.user.email || '',
            avatar: session.user.user_metadata?.avatar_url,
            initials: (session.user.user_metadata?.full_name || session.user.email || 'U').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
          }
          setUser(userData)
          
          // Try to load real documents in background
          loadUserDocuments(session.user.id).catch(err => {
            console.log('Background document loading failed:', err)
          })
        } else {
          console.log('Using demo mode for citations')
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
          id: session.user.id,
          name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User',
          email: session.user.email || '',
          avatar: session.user.user_metadata?.avatar_url,
          initials: (session.user.user_metadata?.full_name || session.user.email || 'U').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
        }
        setUser(userData)
        loadUserDocuments(session.user.id).catch(console.log)
      } else if (event === 'SIGNED_OUT') {
        setIsAuthenticated(false)
        setUser({
          id: 'demo-user',
          name: 'Demo User',
          email: 'demo@example.com',
          initials: 'DU'  
        })
        setDocuments(mockDocuments.map(doc => ({ ...doc, userId: 'demo-user' })))
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // Real-time updates (disabled for stability)
  useEffect(() => {
    // Disabled real-time updates to prevent loading issues
    // Can be re-enabled once backend APIs are stable
    if (!isAuthenticated || !user) return

    // Optional: Add manual refresh capability
    console.log('Real-time updates disabled for stability')
    
    return () => {} // No cleanup needed
  }, [isAuthenticated, user])

  // Load user documents function
  const loadUserDocuments = async (userId: string) => {
    try {
      setIsLoadingData(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch('/api/research/documents?limit=50', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const docsData = await response.json()
        const processedDocs: ResearchDocument[] = docsData.map((doc: any) => ({
          documentId: doc.documentId,
          userId: doc.userId,
          name: doc.name,
          uploadDate: new Date(doc.uploadDate),
          citationCount: doc.extractedCitations?.length || 0,
          status: doc.status as 'uploaded' | 'processing' | 'processed' | 'failed',
          originalName: doc.originalName,
          extractedCitations: doc.extractedCitations
        }))
        setDocuments(processedDocs)
        
        // If a document is selected, load its citations
        if (selectedDocument) {
          const selectedDoc = processedDocs.find(doc => doc.documentId === selectedDocument)
          if (selectedDoc?.extractedCitations) {
            setCitations(selectedDoc.extractedCitations)
          }
        }
      } else {
        console.error('Failed to fetch documents')
        // Fallback to mock data
        setDocuments(mockDocuments.map(doc => ({ ...doc, userId })))
      }
    } catch (error) {
      console.error('Failed to load user documents:', error)
      // Fallback to mock data
      setDocuments(mockDocuments.map(doc => ({ ...doc, userId })))
    } finally {
      setIsLoadingData(false)
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto" />
          <p className="text-slate-600 text-lg">Loading citations workspace...</p>
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
            </div>
          </div>
          <div className="h-px bg-slate-200 dark:bg-slate-700" />
        </motion.div>
        {/* Header Section */}
        <motion.div variants={itemVariants} className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl">
              <Quote className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Citations Workspace</h1>
              <p className="text-lg text-slate-600 dark:text-slate-400">
                Extract, view, and export references from your research papers.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Document Selection & Controls */}
        <motion.div variants={itemVariants} className="mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Document & Export Controls
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Document Selection */}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="document-select" className="text-sm font-medium mb-2 block">
                      Select Document
                    </Label>
                    <Select value={selectedDocument} onValueChange={setSelectedDocument}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a document to view citations" />
                      </SelectTrigger>
                      <SelectContent>
                        {documents.map((doc) => (
                          <SelectItem key={doc.documentId} value={doc.documentId}>
                            <div className="flex items-center justify-between w-full">
                              <span className="truncate">{doc.name}</span>
                              <Badge variant="secondary" className="ml-2">
                                {doc.citationCount} citations
                              </Badge>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedDoc && (
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-600 dark:text-slate-400">
                          Uploaded: {selectedDoc.uploadDate.toLocaleDateString()}
                        </span>
                        <Badge className={selectedDoc.status === 'processed' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}>
                          {selectedDoc.status}
                        </Badge>
                      </div>
                      {isLoadingData && (
                        <div className="mt-2 flex items-center gap-2 text-xs text-blue-600">
                          <Activity className="h-3 w-3 animate-spin" />
                          Refreshing citations...
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Export & Regenerate */}
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium mb-3 block">Export Citations</Label>
                    <div className="flex flex-wrap gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleExport('bib')}
                        disabled={citations.length === 0}
                      >
                        <Download className="mr-2 h-4 w-4" />
                        .bib
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleExport('txt')}
                        disabled={citations.length === 0}
                      >
                        <Download className="mr-2 h-4 w-4" />
                        .txt
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleExport('json')}
                        disabled={citations.length === 0}
                      >
                        <Download className="mr-2 h-4 w-4" />
                        .json
                      </Button>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    onClick={handleRegenerate}
                    disabled={isRegenerating || !selectedDocument}
                    className="w-full"
                  >
                    {isRegenerating ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Regenerating...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Regenerate Citations
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Search and Filter Controls */}
        <motion.div variants={itemVariants} className="mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Search citations by title, author, or journal..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="conference">Conference</SelectItem>
                      <SelectItem value="journal">Journal</SelectItem>
                      <SelectItem value="preprint">Preprint</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                    <SelectTrigger className="w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="number">Number</SelectItem>
                      <SelectItem value="year">Year</SelectItem>
                      <SelectItem value="author">Author</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                  >
                    {sortOrder === "asc" ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Citations List */}
        <motion.div variants={itemVariants}>
          {citations.length === 0 ? (
            <Card className="border-dashed border-2 border-slate-200 dark:border-slate-700">
              <CardContent className="text-center py-12">
                <div className="mx-auto w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                  <Quote className="h-8 w-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
                  No citations found
                </h3>
                <p className="text-slate-500 dark:text-slate-400 mb-4">
                  Select a document to view its extracted citations, or upload a new document.
                </p>
                <Button variant="outline">
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Document
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                  Found {filteredCitations.length} citation{filteredCitations.length !== 1 ? 's' : ''}
                </h2>
                {filteredCitations.length > 0 && (
                  <div className="text-sm text-slate-500 dark:text-slate-400">
                    Showing results for "{selectedDoc?.name}"
                  </div>
                )}
              </div>
              
              <AnimatePresence mode="wait">
                <motion.div
                  key={searchQuery + filterType + sortBy + sortOrder}
                  initial="hidden"
                  animate="visible"
                  exit="hidden"
                  variants={containerVariants}
                  className="space-y-6"
                >
                  {filteredCitations.map((citation) => (
                    <CitationCard
                      key={citation.id}
                      citation={citation}
                      onUpdateNote={handleUpdateNote}
                      onDelete={handleDeleteCitation}
                    />
                  ))}
                </motion.div>
              </AnimatePresence>
            </div>
          )}
        </motion.div>

        {/* Processing Alert */}
        {isRegenerating && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            className="fixed bottom-6 right-6 z-50"
          >
            <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800">
              <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <AlertDescription className="text-blue-800 dark:text-blue-300">
                Regenerating citations from document. This may take a few moments...
              </AlertDescription>
            </Alert>
          </motion.div>
        )}
      </motion.div>
    </div>
  )
}