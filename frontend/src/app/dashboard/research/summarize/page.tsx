'use client'

import React, { useState, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { supabase } from '@/lib/auth/supabase'
import { 
  FileText, 
  Upload, 
  Sparkles, 
  MessageSquare,
  Brain,
  Clock,
  CheckCircle,
  AlertCircle,
  Send,
  Loader2,
  Tag,
  Lightbulb,
  BookOpen,
  BarChart3,
  Trash2,
  RefreshCw,
  Zap,
  Target,
  TrendingUp,
  FileDown,
  ArrowLeft,
  Bell,
  Activity
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Progress } from '@/components/ui/progress'
import { Label } from '@/components/ui/label'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

// User interface
interface UserData {
  id: string
  name: string
  email: string
  avatar?: string
  initials: string
}

// Mock data - will be replaced with real data from MongoDB
const mockSummaries = [
  {
    id: 1,
    fileName: "Attention Is All You Need.pdf",
    title: "Attention Is All You Need",
    uploadDate: "2024-01-15T10:30:00Z",
    status: "completed" as const,
    processingTime: "2.3s",
    abstract: "This paper introduces the Transformer, a novel neural network architecture based solely on attention mechanisms, dispensing with recurrence and convolutions entirely. The model achieves superior results on machine translation tasks while being more parallelizable and requiring significantly less time to train than architectures based on recurrent or convolutional layers.",
    keyPoints: [
      "Introduces the Transformer architecture based entirely on attention mechanisms",
      "Eliminates the need for recurrence and convolutions in sequence modeling",
      "Achieves state-of-the-art results on WMT 2014 English-to-German translation",
      "Demonstrates superior parallelization capabilities compared to RNNs",
      "Establishes attention as a powerful mechanism for modeling dependencies"
    ],
    topics: ["Neural Networks", "Attention Mechanisms", "Machine Translation", "Transformers", "Deep Learning"],
    confidence: {
      abstract: 95,
      keyPoints: 92,
      topics: 89
    },
    wordCount: 11532,
    pageCount: 15
  },
  {
    id: 2,
    fileName: "BERT Pre-training Deep Bidirectional.pdf", 
    title: "BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding",
    uploadDate: "2024-01-14T14:15:00Z",
    status: "processing" as const,
    processingTime: null,
    abstract: null,
    keyPoints: [],
    topics: [],
    confidence: {
      abstract: 0,
      keyPoints: 0, 
      topics: 0
    },
    wordCount: 8947,
    pageCount: 12
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

interface DocumentSummary {
  id: number
  fileName: string
  title: string
  uploadDate: string
  status: 'uploading' | 'processing' | 'completed' | 'error'
  processingTime: string | null
  abstract: string | null
  keyPoints: string[]
  topics: string[]
  confidence: {
    abstract: number
    keyPoints: number
    topics: number
  }
  wordCount: number
  pageCount: number
}

const ConfidenceBar = ({ score, label }: { score: number, label: string }) => (
  <div className="flex items-center gap-2">
    <span className="text-xs font-medium text-slate-600 dark:text-slate-400 w-16">{label}</span>
    <div className="flex-1">
      <Progress value={score} className="h-2" />
    </div>
    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 w-8">{score}%</span>
  </div>
)

const UploadZone = ({ onFileUpload }: { onFileUpload: (files: File[]) => void }) => {
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    
    const files = Array.from(e.dataTransfer.files).filter(
      file => file.type === 'application/pdf'
    )
    
    if (files.length > 0) {
      onFileUpload(files)
    }
  }, [onFileUpload])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      onFileUpload(files)
    }
  }, [onFileUpload])

  return (
    <motion.div
      variants={itemVariants}
      className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 cursor-pointer ${
        isDragOver 
          ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-600' 
          : 'border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500'
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf"
        onChange={handleFileSelect}
        className="hidden"
      />
      
      <motion.div
        animate={{ scale: isDragOver ? 1.1 : 1 }}
        transition={{ duration: 0.2 }}
        className="mx-auto w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mb-4"
      >
        <Upload className="h-8 w-8 text-white" />
      </motion.div>
      
      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
        Upload Research Documents
      </h3>
      <p className="text-slate-600 dark:text-slate-400 mb-4">
        Drag & drop PDF files here, or click to browse
      </p>
      <div className="flex items-center justify-center gap-4 text-sm text-slate-500 dark:text-slate-500">
        <div className="flex items-center gap-1">
          <FileText className="h-4 w-4" />
          PDF only
        </div>
        <div className="flex items-center gap-1">
          <Target className="h-4 w-4" />
          Max 10MB each
        </div>
        <div className="flex items-center gap-1">
          <TrendingUp className="h-4 w-4" />
          Multiple files
        </div>
      </div>
    </motion.div>
  )
}

const DocumentCard = ({ 
  document, 
  onDelete, 
  onReprocess 
}: { 
  document: DocumentSummary
  onDelete: (id: number) => void
  onReprocess: (id: number) => void
}) => {
  const [qaQuery, setQaQuery] = useState("")
  const [qaResponse, setQaResponse] = useState("")
  const [isQaLoading, setIsQaLoading] = useState(false)

  const handleQaSubmit = async () => {
    if (!qaQuery.trim()) return
    
    setIsQaLoading(true)
    try {
      // Simulate API call to /api/qa
      await new Promise(resolve => setTimeout(resolve, 2000))
      setQaResponse(`Based on the document analysis: ${qaQuery} - The paper concludes that attention mechanisms provide a powerful alternative to recurrence and convolution for sequence modeling tasks, achieving better performance with increased parallelization capabilities.`)
    } catch (error) {
      setQaResponse("Sorry, I couldn't process your question. Please try again.")
    } finally {
      setIsQaLoading(false)
    }
  }

  const handleExport = async (format: 'txt' | 'json' | 'md' | 'pdf') => {
    let content = ""
    let filename = ""
    let mimeType = ""

    const summary = {
      title: document.title,
      abstract: document.abstract,
      keyPoints: document.keyPoints,
      topics: document.topics,
      metadata: {
        fileName: document.fileName,
        wordCount: document.wordCount,
        pageCount: document.pageCount,
        processingTime: document.processingTime
      }
    }

    switch (format) {
      case 'txt':
        content = `${summary.title}\n\n` +
                 `Abstract:\n${summary.abstract}\n\n` +
                 `Key Points:\n${summary.keyPoints.map((point, i) => `${i + 1}. ${point}`).join('\n')}\n\n` +
                 `Topics: ${summary.topics.join(', ')}`
        filename = `${document.title.replace(/[^a-zA-Z0-9]/g, '_')}.txt`
        mimeType = "text/plain"
        break
      
      case 'json':
        content = JSON.stringify(summary, null, 2)
        filename = `${document.title.replace(/[^a-zA-Z0-9]/g, '_')}.json`
        mimeType = "application/json"
        break
      
      case 'md':
        content = `# ${summary.title}\n\n` +
                 `## Abstract\n${summary.abstract}\n\n` +
                 `## Key Points\n${summary.keyPoints.map(point => `- ${point}`).join('\n')}\n\n` +
                 `## Topics\n${summary.topics.map(topic => `- ${topic}`).join('\n')}`
        filename = `${document.title.replace(/[^a-zA-Z0-9]/g, '_')}.md`
        mimeType = "text/markdown"
        break
      
      case 'pdf':
        // For PDF export, you'd typically use a service or library
        alert('PDF export would be implemented with a PDF generation service')
        return
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

  const getStatusIcon = () => {
    switch (document.status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'processing':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="h-4 w-4 text-slate-400" />
    }
  }

  const getStatusColor = () => {
    switch (document.status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
      case 'processing':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
      case 'error':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
      default:
        return 'bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-400'
    }
  }

  return (
    <motion.div
      variants={itemVariants}
      layout
      className="group"
    >
      <Card className="hover:shadow-professional-lg transition-all duration-300 border-slate-200 dark:border-slate-700 overflow-hidden">
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                {getStatusIcon()}
                <Badge className={getStatusColor()}>
                  {document.status}
                </Badge>
                {document.processingTime && (
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Processed in {document.processingTime}
                  </span>
                )}
              </div>
              <CardTitle className="text-lg text-slate-900 dark:text-slate-100 leading-tight">
                {document.title}
              </CardTitle>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                {document.fileName} • {document.pageCount} pages • {document.wordCount.toLocaleString()} words
              </p>
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onReprocess(document.id)}
                      disabled={document.status === 'processing'}
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Reprocess document</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <FileDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleExport('txt')}>
                    Export as .txt
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport('json')}>
                    Export as .json
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport('md')}>
                    Export as .md
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport('pdf')}>
                    Export as .pdf
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(document.id)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Delete document</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </CardHeader>

        {document.status === 'completed' && (
          <CardContent className="space-y-6">
            <Tabs defaultValue="summary" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="summary">Summary</TabsTrigger>
                <TabsTrigger value="confidence">AI Confidence</TabsTrigger>
                <TabsTrigger value="qa">Ask Questions</TabsTrigger>
              </TabsList>

              <TabsContent value="summary" className="space-y-6 mt-6">
                {/* Abstract */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <BookOpen className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                    <Label className="font-semibold text-slate-900 dark:text-slate-100">Abstract</Label>
                  </div>
                  <ScrollArea className="h-24 w-full">
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border-l-4 border-blue-500">
                      <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                        {document.abstract}
                      </p>
                    </div>
                  </ScrollArea>
                </div>

                {/* Key Points */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Lightbulb className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                    <Label className="font-semibold text-slate-900 dark:text-slate-100">Key Points</Label>
                  </div>
                  <ScrollArea className="h-32 w-full">
                    <div className="space-y-2">
                      {document.keyPoints.map((point, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="flex items-start gap-3 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg"
                        >
                          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500 text-white text-xs font-semibold flex-shrink-0 mt-0.5">
                            {index + 1}
                          </div>
                          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                            {point}
                          </p>
                        </motion.div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>

                {/* Topics */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Tag className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                    <Label className="font-semibold text-slate-900 dark:text-slate-100">Topics & Keywords</Label>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {document.topics.map((topic, index) => (
                      <motion.div
                        key={topic}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <Badge variant="outline" className="bg-purple-50 border-purple-200 text-purple-700 dark:bg-purple-900/20 dark:border-purple-700 dark:text-purple-300">
                          {topic}
                        </Badge>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="confidence" className="space-y-4 mt-6">
                <div className="space-y-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                  <div className="flex items-center gap-2 mb-4">
                    <BarChart3 className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                    <Label className="font-semibold text-slate-900 dark:text-slate-100">AI Confidence Scores</Label>
                  </div>
                  <ConfidenceBar score={document.confidence.abstract} label="Abstract" />
                  <ConfidenceBar score={document.confidence.keyPoints} label="Key Points" />
                  <ConfidenceBar score={document.confidence.topics} label="Topics" />
                  <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <p className="text-xs text-blue-700 dark:text-blue-300">
                      Higher scores indicate greater AI confidence in the extracted information. 
                      Scores below 70% may require manual review.
                    </p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="qa" className="space-y-4 mt-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                    <Label className="font-semibold text-slate-900 dark:text-slate-100">Ask Follow-up Questions</Label>
                  </div>
                  
                  <div className="flex gap-2">
                    <Input
                      placeholder="What's the main conclusion? What methodology was used?"
                      value={qaQuery}
                      onChange={(e) => setQaQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleQaSubmit()}
                      disabled={isQaLoading}
                      className="flex-1"
                    />
                    <Button
                      onClick={handleQaSubmit}
                      disabled={!qaQuery.trim() || isQaLoading}
                      className="bg-gradient-to-r from-blue-500 to-purple-500 text-white"
                    >
                      {isQaLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>

                  {qaResponse && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg border border-blue-200 dark:border-blue-700"
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg">
                          <Brain className="h-4 w-4 text-white" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-1">AI Response</p>
                          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                            {qaResponse}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <Button variant="outline" size="sm" onClick={() => setQaQuery("What is the main conclusion?")}>
                      What's the conclusion?
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setQaQuery("What methodology was used?")}>
                      What methodology?
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setQaQuery("What are the key findings?")}>
                      Key findings?
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setQaQuery("What are the limitations?")}>
                      Limitations?
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        )}

        {document.status === 'processing' && (
          <CardContent>
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="mx-auto w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mb-4"
                >
                  <Sparkles className="h-6 w-6 text-white" />
                </motion.div>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                  AI is analyzing your document...
                </p>
                <div className="w-64 mx-auto">
                  <Progress value={65} className="h-2" />
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-500 mt-2">
                  This usually takes 30-60 seconds
                </p>
              </div>
            </div>
          </CardContent>
        )}

        {document.status === 'error' && (
          <CardContent>
            <Alert className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
              <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
              <AlertDescription className="text-red-800 dark:text-red-300">
                Failed to process this document. The file might be corrupted or in an unsupported format.
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onReprocess(document.id)}
                  className="ml-2 h-6"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Retry
                </Button>
              </AlertDescription>
            </Alert>
          </CardContent>
        )}
      </Card>
    </motion.div>
  )
}

export default function SummarizeDocuments() {
  const [documents, setDocuments] = useState<DocumentSummary[]>([])
  const [uploadingFiles, setUploadingFiles] = useState<string[]>([])
  
  // Authentication and user data
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState<UserData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  
  // Real-time data states
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  const [hasRealtimeUpdates, setHasRealtimeUpdates] = useState(false)
  const [isLoadingData, setIsLoadingData] = useState(false)

  const handleFileUpload = async (files: File[]) => {
    const newUploadingFiles = files.map(file => file.name)
    setUploadingFiles(prev => [...prev, ...newUploadingFiles])

    // Simulate file upload and processing
    for (const file of files) {
      const newDoc: DocumentSummary = {
        id: Date.now() + Math.random(),
        fileName: file.name,
        title: file.name.replace('.pdf', ''),
        uploadDate: new Date().toISOString(),
        status: 'uploading' as const,
        processingTime: null,
        abstract: null,
        keyPoints: [],
        topics: [],
        confidence: { abstract: 0, keyPoints: 0, topics: 0 },
        wordCount: 0,
        pageCount: 0
      }

      setDocuments(prev => [newDoc, ...prev])

      // Simulate upload completion and start processing
      setTimeout(() => {
        setDocuments(prev => prev.map(doc => 
          doc.id === newDoc.id ? { ...doc, status: 'processing' as const } : doc
        ))
      }, 1000)

      // Simulate processing completion
      setTimeout(() => {
        setDocuments(prev => prev.map(doc => 
          doc.id === newDoc.id ? {
            ...doc,
            status: 'completed' as const,
            processingTime: '3.2s',
            abstract: `AI-generated abstract for ${file.name}. This document discusses important concepts and methodologies relevant to the research field.`,
            keyPoints: [
              'First key insight extracted from the document',
              'Second important finding or methodology',
              'Third significant contribution or result'
            ],
            topics: ['AI', 'Research', 'Analysis'],
            confidence: { abstract: 87, keyPoints: 92, topics: 84 },
            wordCount: Math.floor(Math.random() * 10000) + 5000,
            pageCount: Math.floor(Math.random() * 20) + 10
          } : doc
        ))
        setUploadingFiles(prev => prev.filter(name => name !== file.name))
      }, 8000)
    }
  }

  const handleDeleteDocument = (id: number) => {
    setDocuments(prev => prev.filter(doc => doc.id !== id))
  }

  const handleReprocessDocument = (id: number) => {
    setDocuments(prev => prev.map(doc => 
      doc.id === id ? { ...doc, status: 'processing' as const } : doc
    ))

    // Simulate reprocessing
    setTimeout(() => {
      setDocuments(prev => prev.map(doc => 
        doc.id === id ? { 
          ...doc, 
          status: 'completed' as const,
          processingTime: '2.8s',
          confidence: { 
            abstract: Math.floor(Math.random() * 20) + 80, 
            keyPoints: Math.floor(Math.random() * 20) + 80, 
            topics: Math.floor(Math.random() * 20) + 80 
          }
        } : doc
      ))
    }, 5000)
  }

  // Simplified page loading - always show content immediately
  useEffect(() => {
    const loadPageData = async () => {
      console.log('Loading summarize documents page...')
      
      // Always load mock data first for immediate display
      setDocuments(mockSummaries)
      
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
          
          // Try to load real documents in background
          if (session.user.id) {
            loadUserDocuments(session.user.id).catch(err => {
              console.log('Background document loading failed:', err)
            })
          }
        } else {
          console.log('Using demo mode for document summarization')
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
          loadUserDocuments(session.user.id).catch(console.log)
        }
      } else if (event === 'SIGNED_OUT') {
        setIsAuthenticated(false)
        setUser({
          id: 'demo-user',
          name: 'Demo User',
          email: 'demo@example.com',
          initials: 'DU'
        })
        setDocuments(mockSummaries)
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
        // Transform MongoDB documents to summary format
        const processedDocs: DocumentSummary[] = docsData.map((doc: any, index: number) => ({
          id: index + 1,
          fileName: doc.name,
          title: doc.name.replace('.pdf', ''),
          uploadDate: doc.uploadDate,
          status: doc.status === 'completed' ? 'completed' : doc.status === 'processing' ? 'processing' : 'uploaded',
          processingTime: doc.processingTime || null,
          abstract: doc.summary || null,
          keyPoints: doc.keyPoints || [],
          topics: doc.topics || doc.keywords || [],
          confidence: {
            abstract: doc.confidence?.abstract || Math.floor(Math.random() * 20) + 80,
            keyPoints: doc.confidence?.keyPoints || Math.floor(Math.random() * 20) + 80,
            topics: doc.confidence?.topics || Math.floor(Math.random() * 20) + 80
          },
          wordCount: doc.wordCount || Math.floor(Math.random() * 10000) + 5000,
          pageCount: doc.pageCount || Math.floor(Math.random() * 20) + 10
        }))
        setDocuments(processedDocs)
      } else {
        console.error('Failed to fetch documents')
        // Fallback to mock data
        setDocuments(mockSummaries)
      }
    } catch (error) {
      console.error('Failed to load user documents:', error)
      // Fallback to mock data
      setDocuments(mockSummaries)
    } finally {
      setIsLoadingData(false)
    }
  }

  const completedDocs = documents.filter(doc => doc.status === 'completed').length
  const processingDocs = documents.filter(doc => doc.status === 'processing').length
  const totalDocs = documents.length

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto" />
          <p className="text-slate-600 text-lg">Loading document summarizer...</p>
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
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Summarize Documents</h1>
              <p className="text-lg text-slate-600 dark:text-slate-400">
                Use AI to extract key insights, abstracts, and structured summaries.
              </p>
            </div>
          </div>

          {/* Stats */}
          {totalDocs > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
              <Card className="border-slate-200 dark:border-slate-700">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Total Documents</span>
                  </div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{totalDocs}</p>
                </CardContent>
              </Card>
              <Card className="border-slate-200 dark:border-slate-700">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Completed</span>
                  </div>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">{completedDocs}</p>
                </CardContent>
              </Card>
              <Card className="border-slate-200 dark:border-slate-700">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Processing</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">{processingDocs}</p>
                </CardContent>
              </Card>
              <Card className="border-slate-200 dark:border-slate-700">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Avg. Processing</span>
                  </div>
                  <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">2.4s</p>
                </CardContent>
              </Card>
            </div>
          )}
        </motion.div>

        {/* Upload Section */}
        <motion.div variants={itemVariants} className="mb-8">
          <UploadZone onFileUpload={handleFileUpload} />
          
          {uploadingFiles.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4"
            >
              <Alert className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20">
                <Upload className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <AlertDescription className="text-blue-800 dark:text-blue-300">
                  Uploading {uploadingFiles.length} file{uploadingFiles.length !== 1 ? 's' : ''}...
                </AlertDescription>
              </Alert>
            </motion.div>
          )}
        </motion.div>

        {/* Documents Grid */}
        <AnimatePresence mode="wait">
          {documents.length === 0 ? (
            <motion.div
              key="empty-state"
              variants={itemVariants}
              className="text-center py-12"
            >
              <div className="mx-auto w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                <FileText className="h-8 w-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
                No documents uploaded yet
              </h3>
              <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                Upload your first research paper to start generating AI-powered summaries, abstracts, and key insights.
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="documents-grid"
              variants={containerVariants}
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                  Your Documents
                </h2>
                <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                  <Clock className="h-4 w-4" />
                  Last updated: {lastRefresh.toLocaleTimeString()}
                </div>
              </div>
              
              {documents.map((document) => (
                <DocumentCard
                  key={document.id}
                  document={document}
                  onDelete={handleDeleteDocument}
                  onReprocess={handleReprocessDocument}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Processing Queue Alert */}
        {processingDocs > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            className="fixed bottom-6 right-6 z-50"
          >
            <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800 min-w-[300px]">
              <Loader2 className="h-4 w-4 text-blue-600 dark:text-blue-400 animate-spin" />
              <AlertDescription className="text-blue-800 dark:text-blue-300">
                <div className="flex items-center justify-between">
                  <span>Processing {processingDocs} document{processingDocs !== 1 ? 's' : ''}...</span>
                  <div className="ml-4">
                    <Progress value={35} className="h-2 w-20" />
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          </motion.div>
        )}
      </motion.div>
    </div>
  )
}