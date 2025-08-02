'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, 
  Bot, 
  User, 
  FileText, 
  Copy, 
  ThumbsUp, 
  ThumbsDown,
  RefreshCw,
  Loader2,
  Quote,
  ExternalLink,
  Sparkles,
  MessageCircle,
  Clock,
  AlertCircle,
  Maximize2,
  Minimize2,
  MoreHorizontal,
  Bookmark,
  Share2,
  Download,
  Edit3,
  Zap,
  Brain,
  Search,
  Settings,
  Volume2,
  VolumeX
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useToast } from '@/components/ui/use-toast';

import { useAuth } from '@/hooks/useAuth';
// import { saveChatMessage, getChatHistory } from '@/lib/firebase/chat-storage';
// import { CodeBlock } from '@/components/shared/CodeHighlight';

import type { SupabaseDocument } from '@/lib/supabase/document-storage-no-auth';

// Local type definitions
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  documentId: string;
  sources?: Source[];
  isError?: boolean;
  confidence?: number;
  responseTime?: number;
  tokenUsage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  csEnhanced?: boolean;
  ragVersion?: string;
  isStreaming?: boolean;
  tokens?: number;
  metadata?: {
    tokensUsed?: number;
    processingTime?: number;
    model?: string;
  };
}

// Enhanced type definitions
interface QAInterfaceProps {
  document: SupabaseDocument;
  sessionId?: string;
  className?: string;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

interface Source {
  pageNumber: number;
  content: string;
  confidence: number;
  chunkId?: string;
}

interface StreamingMessage extends Omit<ChatMessage, 'sources'> {
  isStreaming: boolean;
  sources?: Source[];
  tokens?: number;
  responseTime?: number;
}


interface ChatSettings {
  autoScroll: boolean;
  soundEnabled: boolean;
  showTimestamps: boolean;
  showTokenCount: boolean;
  temperature: number;
  maxTokens: number;
  streamResponse: boolean;
}

// Enhanced Message Bubble Component
const MessageBubble: React.FC<{
  message: ChatMessage | StreamingMessage;
  documentId: string;
  settings: ChatSettings;
  onCopy: (content: string) => void;
  onFeedback: (messageId: string, type: 'positive' | 'negative') => void;
  onBookmark: (messageId: string) => void;
  onRegenerate?: (messageId: string) => void;
}> = React.memo(({ message, documentId, settings, onCopy, onFeedback, onBookmark, onRegenerate }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const isUser = message.role === 'user';
  const isStreaming = 'isStreaming' in message && message.isStreaming;
  const isError = 'isError' in message && message.isError;
  
  const messageContent = message.content || '';
  const messageLength = messageContent.length;
  const shouldTruncate = messageLength > 500 && !isExpanded;
  const displayContent = shouldTruncate 
    ? messageContent.substring(0, 500) + '...' 
    : messageContent;

  const formatTime = (timestamp: Date) => {
    return new Intl.DateTimeFormat('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: settings.showTimestamps ? '2-digit' : undefined
    }).format(new Date(timestamp));
  };

  const avatarClasses = `flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-lg transition-all duration-200 ${
    isUser 
      ? 'bg-slate-900 text-white' 
      : isError 
        ? 'bg-red-100 text-red-600'
        : 'bg-slate-100 text-slate-600'
  }`;

  const bubbleClasses = `relative rounded-2xl px-4 py-3 transition-all duration-200 ${
    isUser 
      ? 'bg-slate-900 text-white ml-auto' 
      : isError
        ? 'bg-red-50 border border-red-200 text-red-800'
        : 'bg-slate-50 text-slate-900'
  }`;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={`flex gap-4 group ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Avatar */}
      <div className={avatarClasses}>
        {isUser ? (
          <User className="h-4 w-4" />
        ) : (
          <Bot className="h-4 w-4" />
        )}
      </div>

      {/* Message Content */}
      <div className={`flex flex-col space-y-3 ${isUser ? 'items-end' : 'items-start'} max-w-[85%] min-w-0`}>
        {/* Main Message Bubble */}
        <div className={bubbleClasses}>
          {/* Message Header (for assistant messages) */}
          {!isUser && (
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-150">
              <div className="flex items-center gap-3">
                <Badge variant="secondary" className="text-xs font-medium bg-slate-100 text-slate-700 px-2 py-1">
                  <Brain className="h-3 w-3 mr-1" />
                  Agentic RAG
                </Badge>
                {isStreaming && (
                  <Badge variant="outline" className="text-xs animate-pulse border-ai-primary/30 text-ai-primary">
                    <Zap className="h-3 w-3 mr-1" />
                    Analyzing...
                  </Badge>
                )}
                {/* Show pipeline information */}
                {'metadata' in message && message.metadata?.pipeline === 'agentic_rag' && (
                  <Badge variant="outline" className="text-xs bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200 text-blue-700">
                    <Search className="h-3 w-3 mr-1" />
                    BGE + Phi-2
                  </Badge>
                )}
                {/* Show web search indicator */}
                {'metadata' in message && message.metadata?.web_search_triggered && (
                  <Badge variant="outline" className="text-xs bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 text-green-700">
                    <ExternalLink className="h-3 w-3 mr-1" />
                    Web Enhanced
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                {/* Show confidence score */}
                {message.confidence !== undefined && (
                  <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                    <span className={`inline-block w-2 h-2 rounded-full ${
                      message.confidence > 0.8 ? 'bg-green-500' : 
                      message.confidence > 0.6 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}></span>
                    {Math.round(message.confidence * 100)}%
                  </span>
                )}
                {settings.showTokenCount && 'tokens' in message && message.tokens && (
                  <span className="text-xs text-slate-500 font-medium">
                    {message.tokens} tokens
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Message Content */}
          <div className="prose prose-sm max-w-none">
            <div className={`whitespace-pre-wrap break-words leading-relaxed ${isUser ? '!text-white' : 'text-slate-800'} text-body`} style={isUser ? { color: '#ffffff !important' } : {}}>
              {displayContent}
              {isStreaming && (
                <motion.span
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="ml-1 inline-flex items-center"
                >
                  <div className="h-4 w-2 bg-current rounded-full" />
                </motion.span>
              )}
            </div>
            
            {/* Expand/Collapse for long messages */}
            {messageLength > 500 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="mt-3 h-8 text-xs hover:bg-slate-100 transition-colors"
              >
                {isExpanded ? 'Show less' : 'Show more'}
              </Button>
            )}
          </div>

          {/* Sources Section */}
          {message.sources && Array.isArray(message.sources) && message.sources.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-5 pt-4 border-t border-slate-200"
            >
              <div className="flex items-center gap-3 mb-4">
                <Quote className="h-4 w-4 text-slate-500" />
                <span className="text-sm font-medium text-slate-700">Sources Referenced</span>
                <Badge variant="outline" className="text-xs bg-slate-50 border-slate-200">
                  {message.sources.length}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-2">
                {message.sources.map((source, index) => {
                  // Defensive check for source object
                  if (!source || typeof source !== 'object') {
                    console.warn('Invalid source object at index', index, source);
                    return null;
                  }
                  return (
                  <TooltipProvider key={index}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge 
                          variant="secondary" 
                          className="text-xs cursor-pointer hover:bg-ai-primary hover:text-white transition-all duration-200 group bg-slate-100 border border-slate-200 text-slate-700 px-3 py-1.5"
                          onClick={() => window.open(`/dashboard/documents/${documentId}/viewer?page=${source.metadata?.page || source.pageNumber || 1}`, '_blank')}
                        >
                          <span className="font-medium">Page {source.metadata?.page || source.pageNumber || 1}</span>
                          <div className="ml-2 opacity-60 group-hover:opacity-100">
                            <ExternalLink className="h-3 w-3" />
                          </div>
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs bg-white border border-slate-200 shadow-professional">
                        <div className="space-y-2 p-2">
                          <p className="font-medium text-slate-900">Page {source.metadata?.page || source.pageNumber || 1}</p>
                          <p className="text-xs text-slate-600 leading-relaxed">
                            {(() => {
                              try {
                                const preview = source?.content_preview || source?.content || 'No preview available';
                                return typeof preview === 'string' ? preview.substring(0, 150) : 'No preview available';
                              } catch (error) {
                                console.error('Error rendering source preview:', error, source);
                                return 'No preview available';
                              }
                            })()}...
                          </p>
                          <p className="text-xs text-slate-500">
                            Confidence: <span className="font-medium">{Math.round((source.relevance_score || source.confidence || 0) * 100)}%</span>
                          </p>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Enhanced Performance Metrics for Agentic RAG */}
          {'metadata' in message && (message.responseTime || message.metadata?.processing_time) && (
            <div className="mt-3 pt-3 border-t border-slate-100">
              <div className="flex items-center gap-4 text-xs text-slate-500 mb-2">
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>{((message.responseTime || message.metadata?.processing_time || 0)).toFixed(1)}s</span>
                </div>
                {message.sources && (
                  <div className="flex items-center gap-1">
                    <Search className="h-3 w-3" />
                    <span>{message.sources.length} sources</span>
                  </div>
                )}
                {message.confidence !== undefined && (
                  <div className="flex items-center gap-1">
                    <div className={`h-3 w-3 rounded-full ${
                      message.confidence > 0.8 ? 'bg-green-500' : 
                      message.confidence > 0.6 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}></div>
                    <span>Confidence: {Math.round(message.confidence * 100)}%</span>
                  </div>
                )}
              </div>
              
              {/* Agentic RAG Pipeline Details */}
              {'metadata' in message && message.metadata?.pipeline === 'agentic_rag' && (
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-blue-50 rounded-lg p-2">
                    <div className="font-medium text-blue-700 mb-1 flex items-center gap-1">
                      <Brain className="h-3 w-3" />
                      BGE Retrieval
                    </div>
                    <div className="text-blue-600">
                      ✓ Vector search complete
                    </div>
                  </div>
                  
                  <div className="bg-purple-50 rounded-lg p-2">
                    <div className="font-medium text-purple-700 mb-1 flex items-center gap-1">
                      <Zap className="h-3 w-3" />
                      Phi-2 Generation
                    </div>
                    <div className="text-purple-600">
                      {message.metadata?.candidates_generated ? 
                        `✓ Best of ${message.metadata.candidates_generated}` : 
                        '✓ Generation complete'
                      }
                    </div>
                  </div>
                  
                  {message.metadata?.web_search_triggered && (
                    <div className="bg-green-50 rounded-lg p-2 col-span-2">
                      <div className="font-medium text-green-700 mb-1 flex items-center gap-1">
                        <ExternalLink className="h-3 w-3" />
                        Web Search Enhanced
                      </div>
                      <div className="text-green-600">
                        ✓ Gemini web search + answer merger
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Message Actions */}
        <AnimatePresence>
          {showActions && !isStreaming && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className={`flex items-center gap-1 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {!isUser && !isError && (
                <>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 hover:bg-green-100 hover:text-green-600"
                          onClick={() => onFeedback(message.id, 'positive')}
                        >
                          <ThumbsUp className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Good response</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 hover:bg-red-100 hover:text-red-600"
                          onClick={() => onFeedback(message.id, 'negative')}
                        >
                          <ThumbsDown className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Poor response</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </>
              )}

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 hover:bg-blue-100 hover:text-blue-600"
                      onClick={() => onCopy(message.content)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Copy message</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 hover:bg-yellow-100 hover:text-yellow-600"
                      onClick={() => onBookmark(message.id)}
                    >
                      <Bookmark className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Bookmark</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {!isUser && onRegenerate && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 hover:bg-purple-100 hover:text-purple-600"
                        onClick={() => onRegenerate(message.id)}
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Regenerate response</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 hover:bg-slate-100"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align={isUser ? "end" : "start"}>
                  <DropdownMenuItem onClick={() => onCopy(message.content)}>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy text
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Share2 className="h-4 w-4 mr-2" />
                    Share
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </DropdownMenuItem>
                  {!isUser && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem>
                        <Edit3 className="h-4 w-4 mr-2" />
                        Edit & resend
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Timestamp */}
        <div className={`text-xs text-slate-500 font-medium ${isUser ? 'text-right' : 'text-left'} mt-2`}>
          {formatTime(message.timestamp)}
          {isError && (
            <Badge variant="destructive" className="ml-3 text-xs">
              <AlertCircle className="h-3 w-3 mr-1" />
              Failed
            </Badge>
          )}
        </div>
      </div>
    </motion.div>
  );
});
MessageBubble.displayName = 'MessageBubble';

// Main QA Interface Component
const QAInterface: React.FC<QAInterfaceProps> = ({
  document, 
  sessionId: initialSessionId,
  className = '',
  isFullscreen = false,
  onToggleFullscreen
}) => {
  const { user } = useAuth();
  const { toast } = useToast();

  // Helper function for toast (memoized to prevent infinite loops)
  const showToast = useCallback((title: string, description: string, variant: 'default' | 'destructive' = 'default') => {
    toast({
      title,
      description,
      variant,
    });
  }, [toast]);
  
  // State management
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streamingMessage, setStreamingMessage] = useState<StreamingMessage | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  // Create stable session ID (memoized to prevent recreation)
  const sessionId = useMemo(() => {
    return initialSessionId || `doc_${document.id}_${Date.now()}`;
  }, [initialSessionId, document.id]);

  // Initialize session ID more reliably
  const [activeSessionId, setActiveSessionId] = useState<string>(() => {
    // Clear any potentially corrupted cached messages on component initialization
    try {
      const cacheKeys = Object.keys(localStorage).filter(key => 
        key.includes('qa_messages') || key.includes('chat_history') || key.includes('toast')
      );
      if (cacheKeys.length > 0) {
        console.log('🧹 Clearing potentially corrupted cache on component init (including toast cache)');
        cacheKeys.forEach(key => localStorage.removeItem(key));
      }
      
      // Clear session storage as well
      const sessionKeys = Object.keys(sessionStorage).filter(key => 
        key.includes('qa_messages') || key.includes('chat_history') || key.includes('toast')
      );
      if (sessionKeys.length > 0) {
        console.log('🧹 Clearing potentially corrupted session storage');
        sessionKeys.forEach(key => sessionStorage.removeItem(key));
      }
    } catch (error) {
      console.warn('Failed to clear cache on init:', error);
    }
    return sessionId;
  });
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<ChatSettings>({
    autoScroll: true,
    soundEnabled: false,
    showTimestamps: true,
    showTokenCount: false,
    temperature: 0.7,
    maxTokens: 1000,
    streamResponse: true
  });
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Suggested questions based on document type
  const suggestedQuestions = useMemo(() => {
    const baseQuestions = [
      "What is the main topic of this document?",
      "Can you summarize the key points?",
      "What are the important conclusions?",
      "Are there any specific recommendations?"
    ];
    
    // Add document-type specific questions
    if (document?.name?.toLowerCase().includes('report')) {
      return [...baseQuestions, "What are the findings?", "What methodology was used?"];
    } else if (document?.name?.toLowerCase().includes('contract')) {
      return [...baseQuestions, "What are the key terms?", "What are the obligations?"];
    }
    
    return baseQuestions;
  }, [document?.name]);

  // Load chat history (memoized to prevent loops)
  const loadChatHistory = useCallback(async () => {
    if (!user || !activeSessionId) {
      setIsLoadingHistory(false);
      return;
    }
    
    setIsLoadingHistory(true);
    try {
      // Fetch chat history from API
      const response = await fetch(`/api/documents/${document.id}/qa?sessionId=${activeSessionId}&limit=50`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.messages) {
          const formattedMessages: ChatMessage[] = data.messages.map((msg: any) => ({
            id: msg.id,
            role: msg.role,
            content: msg.content,
            timestamp: msg.timestamp,
            confidence: msg.confidence,
            sources: msg.sources || []
          }));
          setMessages(formattedMessages);
        }
      } else {
        // No history or error - start with empty messages
        setMessages([]);
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
      showToast('Error', 'Failed to load chat history.', 'destructive');
      setMessages([]); // Ensure we still set to empty array
    } finally {
      setIsLoadingHistory(false);
    }
  }, [user, activeSessionId, document.id, showToast]);

  useEffect(() => {
    loadChatHistory();
  }, [loadChatHistory]);

  // Auto-scroll functionality
  useEffect(() => {
    if (settings.autoScroll) {
      messagesEndRef.current?.scrollIntoView({ 
        behavior: 'smooth',
        block: 'end'
      });
    }
  }, [messages, streamingMessage, settings.autoScroll]);

  // Enhanced copy functionality
  const handleCopyMessage = useCallback(async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      showToast('Copied', 'Message copied to clipboard.');
    } catch (error) {
      console.error('Failed to copy:', error);
      showToast('Copy Failed', 'Could not copy message to clipboard.', 'destructive');
    }
  }, [showToast]);

  // Handle message feedback
  const handleFeedback = useCallback(async (messageId: string, type: 'positive' | 'negative') => {
    try {
      // Here you would typically send feedback to your analytics service
      console.log('Feedback submitted:', { messageId, type });
      
      showToast('Feedback Recorded', `Thank you for your ${type} feedback!`);
    } catch (error) {
      console.error('Failed to submit feedback:', error);
    }
  }, [showToast]);

  // Handle bookmark
  const handleBookmark = useCallback(async (messageId: string) => {
    try {
      // Here you would save the bookmark
      console.log('Bookmarked message:', messageId);
      
      showToast('Bookmarked', 'Message saved to bookmarks.');
    } catch (error) {
      console.error('Failed to bookmark:', error);
    }
  }, [showToast]);

  // Handle regenerate response
  const handleRegenerate = useCallback(async (messageId: string) => {
    const message = messages.find(m => m.id === messageId);
    if (!message || message.role !== 'assistant') return;

    // Find the previous user message
    const messageIndex = messages.findIndex(m => m.id === messageId);
    const userMessage = messages[messageIndex - 1];
    
    if (userMessage && userMessage.role === 'user') {
      // Remove the assistant message and regenerate
      setMessages(prev => prev.filter(m => m.id !== messageId));
      setInputValue(userMessage.content);
      inputRef.current?.focus();
    }
  }, [messages]);

  // Stop generation
  const handleStopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsLoading(false);
      setStreamingMessage(null);
      
      if (settings.soundEnabled) {
        // Play stop sound
        new Audio('/sounds/stop.mp3').play().catch(() => {});
      }
    }
  }, [settings.soundEnabled]);

  // Enhanced streaming handler
  const handleStreamedResponse = async (
    reader: ReadableStreamDefaultReader<Uint8Array>, 
    streamingId: string, 
    currentSessionId: string
  ) => {
    const decoder = new TextDecoder();
    let accumulatedContent = '';
    let sources: Source[] = [];
    let startTime = Date.now();
    let tokenCount = 0;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(line => line.startsWith('data: '));

        for (const line of lines) {
          try {
            const data = JSON.parse(line.slice(6));
            
            if (data.type === 'content') {
              accumulatedContent += data.content;
              tokenCount++;
              setStreamingMessage(prev => prev ? { 
                ...prev, 
                content: accumulatedContent,
                tokens: tokenCount
              } : null);
            } else if (data.type === 'sources') {
              sources = data.sources;
              setStreamingMessage(prev => prev ? { ...prev, sources } : null);
            } else if (data.type === 'done') {
              const responseTime = (Date.now() - startTime) / 1000;
              
              const finalMessage: ChatMessage = {
                id: streamingId,
                role: 'assistant',
                content: accumulatedContent,
                timestamp: new Date(),
                documentId: document.id,
                sources: sources,
                metadata: {
                  tokensUsed: tokenCount,
                  processingTime: responseTime,
                  model: 'groq-mixtral'
                }
              };

              setMessages(prev => [...prev, finalMessage]);
              setStreamingMessage(null);

              if (user) {
                // TODO: Save chat message
                // await saveChatMessage(user.uid, finalMessage, currentSessionId);
              }

              // Play completion sound
              if (settings.soundEnabled) {
                new Audio('/sounds/complete.mp3').play().catch(() => {});
              }

              return;
            }
          } catch (error) {
            console.error('Error parsing streaming data:', error);
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  };

  // Enhanced submit handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading || !user) return;

    // Use the stable session ID from useMemo
    const currentSessionId = activeSessionId || sessionId;
    if (!activeSessionId) {
      setActiveSessionId(currentSessionId);
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date(),
      documentId: document.id,
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    // TODO: Save user message
    // await saveChatMessage(user.uid, userMessage, currentSessionId);

    // Play send sound
    if (settings.soundEnabled) {
      new Audio('/sounds/send.mp3').play().catch(() => {});
    }

    abortControllerRef.current = new AbortController();

    try {
      // Use document-specific Q&A endpoint instead of general chat stream
      const response = await fetch(`/api/documents/${document.id}/qa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: userMessage.content,
          sessionId: currentSessionId,
          useWebSearch: true,
          temperature: settings.temperature,
          maxSources: 5
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`HTTP error! status: ${response.status} - ${errorData.error || 'Unknown error'}`);
      }

      // Handle JSON response instead of streaming
      const qaResponse = await response.json();
      
      if (!qaResponse.success) {
        throw new Error(qaResponse.error || 'Unknown error from Q&A service');
      }

      // Create assistant message from Q&A response
      const assistantMessage: ChatMessage = {
        id: qaResponse.messageId || Date.now().toString(),
        role: 'assistant',
        content: qaResponse.answer,
        timestamp: new Date(),
        documentId: document.id,
        sources: qaResponse.sources || [],
        confidence: qaResponse.confidence,
        responseTime: qaResponse.responseTime,
        tokenUsage: qaResponse.tokenUsage,
        csEnhanced: qaResponse.csEnhanced || false,
        ragVersion: qaResponse.ragVersion || '2.0.0'
      };

      // Add assistant message to chat
      setMessages(prev => [...prev, assistantMessage]);
      
      // Play receive sound
      if (settings.soundEnabled) {
        new Audio('/sounds/receive.mp3').play().catch(() => {});
      }

    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Request was aborted by the user.');
        return;
      }

      console.error('Error processing Q&A request:', error);
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `I apologize, but I encountered an error processing your question: ${error.message}. Please try again or contact support if the issue persists.`,
        timestamp: new Date(),
        documentId: document.id,
        isError: true,
      };
      
      setMessages(prev => [...prev, errorMessage]);
      
      showToast('Error', 'Failed to get a response from the assistant.', 'destructive');
    } finally {
      setIsLoading(false);
      setInputValue('');
      abortControllerRef.current = null;
      
      // Focus input for next question
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  // Handle input key events
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  // Welcome state component
  const renderWelcomeState = () => (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col items-center justify-center h-full text-center p-8"
    >
      <div className="mb-8">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 mb-4">
          <Bot className="h-8 w-8 text-slate-600" />
        </div>
      </div>
      
      <h3 className="text-xl font-medium text-slate-900 mb-3">
        Ask about this document
      </h3>
      <p className="text-slate-600 mb-4 max-w-md">
        Ask questions about <span className="font-medium">"{document.name}"</span>
      </p>
      <div className="flex items-center gap-2 mb-8 px-4 py-2 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200">
        <Brain className="h-5 w-5 text-blue-600" />
        <span className="text-sm font-medium text-blue-700">Powered by Agentic RAG</span>
        <span className="text-xs text-blue-600">BGE + Phi-2 + Web Search</span>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl">
        {suggestedQuestions.slice(0, 4).map((question, index) => (
          <motion.div
            key={question}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: index * 0.05 }}
          >
            <div
              className="p-4 border border-slate-200 rounded-xl cursor-pointer hover:border-slate-300 hover:bg-slate-50 transition-all duration-200 group"
              onClick={() => {
                setInputValue(question);
                inputRef.current?.focus();
              }}
            >
              <p className="text-sm text-slate-700 group-hover:text-slate-900">
                {question}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );

  // Loading skeleton component
  const renderLoadingSkeleton = () => (
    <div className="p-6 space-y-8">
      {[...Array(3)].map((_, i) => (
        <div key={i} className={`flex gap-4 ${i % 2 ? 'flex-row-reverse' : ''}`}>
          <Skeleton className="h-9 w-9 rounded-xl" />
          <div className="flex-1 space-y-3">
            <div className="space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-2/3" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-6 w-20" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  // Settings panel component
  const renderSettingsPanel = () => (
    <Card className="absolute right-6 top-20 w-96 z-50 shadow-professional-xl border border-slate-200 bg-white/95 backdrop-blur-xl">
      <CardHeader className="pb-5">
        <CardTitle className="heading-xs flex items-center gap-3">
          <Settings className="h-5 w-5 text-ai-primary" />
          Chat Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <label className="text-sm font-medium">Auto-scroll</label>
              <p className="text-xs text-slate-500">Automatically scroll to new messages</p>
            </div>
            <Switch
              checked={settings.autoScroll}
              onCheckedChange={(checked) => setSettings(prev => ({ ...prev, autoScroll: checked }))}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <label className="text-sm font-medium">Sound effects</label>
              <p className="text-xs text-slate-500">Play sounds for interactions</p>
            </div>
            <Switch
              checked={settings.soundEnabled}
              onCheckedChange={(checked) => setSettings(prev => ({ ...prev, soundEnabled: checked }))}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <label className="text-sm font-medium">Show timestamps</label>
              <p className="text-xs text-slate-500">Display message timestamps</p>
            </div>
            <Switch
              checked={settings.showTimestamps}
              onCheckedChange={(checked) => setSettings(prev => ({ ...prev, showTimestamps: checked }))}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <label className="text-sm font-medium">Token count</label>
              <p className="text-xs text-slate-500">Show token usage information</p>
            </div>
            <Switch
              checked={settings.showTokenCount}
              onCheckedChange={(checked) => setSettings(prev => ({ ...prev, showTokenCount: checked }))}
            />
          </div>
        </div>

        <Separator />

        <div className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Temperature</label>
              <span className="text-xs text-slate-500">{settings.temperature}</span>
            </div>
            <Slider
              value={[settings.temperature]}
              onValueChange={(value: number[]) => setSettings(prev => ({ ...prev, temperature: value[0] || 0.7 }))}
              min={0}
              max={1}
              step={0.1}
              className="w-full"
            />
            <p className="text-xs text-slate-500">Controls response creativity</p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Max tokens</label>
              <span className="text-xs text-slate-500">{settings.maxTokens}</span>
            </div>
            <Slider
              value={[settings.maxTokens]}
              onValueChange={(value: number[]) => setSettings(prev => ({ ...prev, maxTokens: value[0] || 1000 }))}
              min={100}
              max={2000}
              step={100}
              className="w-full"
            />
            <p className="text-xs text-slate-500">Maximum response length</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className={`flex flex-col h-full bg-white relative ${className}`}>
      {/* Minimal Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-white sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100">
            <FileText className="h-4 w-4 text-slate-600" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-medium text-slate-900 truncate" title={document.name}>
              {document.name}
            </h3>
            <p className="text-sm text-slate-500 flex items-center gap-2">
              <span>{document.metadata?.pages || 0} pages</span>
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-blue-50 to-purple-50 rounded-full border border-blue-200">
            <Brain className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-700">Agentic RAG</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <div className="h-2 w-2 rounded-full bg-green-500" />
            <span>Ready</span>
          </div>
        </div>
      </div>

      {/* Settings Panel */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute inset-0 z-50"
          >
            <div 
              className="absolute inset-0 bg-black/20 backdrop-blur-sm"
              onClick={() => setShowSettings(false)}
            />
            {renderSettingsPanel()}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages Area */}
      <div className="flex-1 overflow-hidden relative">
        <ScrollArea className="h-full" ref={messagesContainerRef}>
          <div className="min-h-full p-4 space-y-6">
            {isLoadingHistory ? renderLoadingSkeleton()
              : messages.length === 0 && !streamingMessage ? renderWelcomeState()
              : (
                <AnimatePresence mode="popLayout">
                  {messages.map((message) => (
                    <MessageBubble 
                      key={message.id} 
                      message={message} 
                      documentId={document.id}
                      settings={settings}
                      onCopy={handleCopyMessage}
                      onFeedback={handleFeedback}
                      onBookmark={handleBookmark}
                      onRegenerate={handleRegenerate}
                    />
                  ))}
                  {streamingMessage && (
                    <MessageBubble 
                      message={streamingMessage} 
                      documentId={document.id}
                      settings={settings}
                      onCopy={handleCopyMessage}
                      onFeedback={handleFeedback}
                      onBookmark={handleBookmark}
                    />
                  )}
                </AnimatePresence>
              )
            }
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Scroll to bottom button */}
        <AnimatePresence>
          {!settings.autoScroll && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute bottom-4 right-4"
            >
              <Button
                size="sm"
                variant="secondary"
                className="rounded-full shadow-lg hover:shadow-xl"
                onClick={() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })}
              >
                <span className="sr-only">Scroll to bottom</span>
                ↓
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Professional Input Area */}
      <div className="border-t border-slate-200 bg-slate-50/50 p-6">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
          <div className="flex items-end gap-4">
            <div className="flex-1 relative">
              <Textarea
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask a question about this document..."
                disabled={isLoading}
                className="min-h-[52px] max-h-32 resize-none pr-20 !text-white placeholder:!text-slate-400 !bg-slate-900 border border-slate-700 focus:border-blue-400 focus:ring-2 focus:ring-blue-200 rounded-2xl px-4 py-3 transition-all duration-200 shadow-sm font-medium"
                style={{ color: '#ffffff !important', backgroundColor: '#0f172a !important' }}
                maxLength={2000}
              />
              
              {/* Character count */}
              <div className="absolute bottom-3 right-4 flex items-center gap-2">
                <span className="text-xs text-slate-400 font-medium">
                  {(inputValue || '').length}/2000
                </span>
              </div>
            </div>
            
            <Button 
              type="submit" 
              disabled={!inputValue.trim() || isLoading} 
              className="h-[52px] w-[52px] bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-2xl transition-all duration-200 shadow-sm hover:shadow-md flex items-center justify-center"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </div>
          
          {/* Professional Status Indicator */}
          {streamingMessage && (
            <div className="flex items-center justify-center gap-2 text-sm text-slate-600 mt-3 py-2">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 bg-slate-400 rounded-full animate-pulse"></div>
                <span className="font-medium">AI is analyzing your question...</span>
              </div>
            </div>
          )}
          
          {/* Helper text */}
          <div className="flex items-center justify-between mt-3 text-xs text-slate-500">
            <span>Press Enter to send, Shift+Enter for new line</span>
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 bg-green-500 rounded-full animate-pulse"></div>
              <span>Ready</span>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default QAInterface;