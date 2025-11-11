'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  FileText,
  Download,
  Share2,
  Trash2,
  Send,
  Bot,
  User,
  Sparkles,
  Target,
  Clock,
  Brain,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize,
  Search,
  BookOpen,
  MessageCircle,
  FileCheck,
  Layers,
  BarChart3
} from 'lucide-react';
import {
  getDocument,
  askQuestion,
  trackView,
  deleteDocument as deleteDocumentAPI,
  formatFileSize,
  formatRelativeDate
} from '@/lib/api/documents';

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  confidence?: number;
  sources?: Array<{
    page?: number;
    chunk_text?: string;
  }>;
}

interface DocumentMetadata {
  filename: string;
  fileType: string;
  size: number;
  pages: number;
  wordCount: number;
  uploadedAt: Date;
  category: string;
}

export default function DocumentViewerPage() {
  const params = useParams();
  const router = useRouter();
  const docId = params.id as string;

  const [metadata, setMetadata] = useState<DocumentMetadata | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(100);
  const [showMetadata, setShowMetadata] = useState(true);

  const chatScrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetchDocumentMetadata();
    initializeChat();
  }, [docId]);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchDocumentMetadata = async () => {
    // Mock data - replace with API call
    setMetadata({
      filename: 'Product Requirements Document.pdf',
      fileType: 'pdf',
      size: 2457600,
      pages: 45,
      wordCount: 12500,
      uploadedAt: new Date('2024-11-10'),
      category: 'product'
    });
  };

  const initializeChat = () => {
    setMessages([{
      id: '1',
      type: 'assistant',
      content: "Hello! I'm your AI assistant. I've analyzed this document and I'm ready to answer your questions. What would you like to know?",
      timestamp: new Date(),
      confidence: 1.0
    }]);
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      // Replace with actual API call to document RAG server
      const response = await fetch('http://localhost:8004/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: `doc_${docId}`,
          message: inputMessage,
          doc_ids: [docId],
          mode: 'document-only',
          top_k: 5
        })
      });

      const data = await response.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: data.response || 'I apologize, but I encountered an error processing your question.',
        timestamp: new Date(),
        confidence: data.confidence,
        sources: data.sources
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: 'I apologize, but I encountered an error. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatFileSize = (bytes: number) => {
    const kb = bytes / 1024;
    const mb = kb / 1024;
    return mb >= 1 ? `${mb.toFixed(1)} MB` : `${kb.toFixed(1)} KB`;
  };

  if (!metadata) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto" />
          <p className="text-slate-600 text-lg">Loading document...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard/documents"
              className="p-2 text-slate-500 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>

            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900">{metadata.filename}</h1>
                <div className="flex items-center gap-3 text-sm text-slate-500">
                  <span>{formatFileSize(metadata.size)}</span>
                  <span>•</span>
                  <span>{metadata.pages} pages</span>
                  <span>•</span>
                  <span>{metadata.wordCount.toLocaleString()} words</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
              <Download className="w-4 h-4" />
              <span className="text-sm font-medium">Download</span>
            </button>
            <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
              <Share2 className="w-4 h-4" />
              <span className="text-sm font-medium">Share</span>
            </button>
            <button className="flex items-center gap-2 px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content - Split View */}
      <div className="flex-1 flex overflow-hidden">
        {/* Document Viewer */}
        <div className="flex-1 flex flex-col bg-slate-100 border-r border-slate-200 overflow-hidden">
          {/* PDF Controls */}
          <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-medium text-slate-700 min-w-[100px] text-center">
                Page {currentPage} of {metadata.pages}
              </span>
              <button
                onClick={() => setCurrentPage(Math.min(metadata.pages, currentPage + 1))}
                disabled={currentPage === metadata.pages}
                className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setZoom(Math.max(50, zoom - 10))}
                className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-sm font-medium text-slate-700 min-w-[60px] text-center">
                {zoom}%
              </span>
              <button
                onClick={() => setZoom(Math.min(200, zoom + 10))}
                className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button className="p-2 rounded-lg hover:bg-slate-100 transition-colors ml-2">
                <Maximize className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* PDF Viewer Placeholder */}
          <div className="flex-1 overflow-auto p-8">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{ zoom: `${zoom}%` }}
              className="max-w-4xl mx-auto bg-white rounded-lg shadow-2xl p-12 min-h-[1100px]"
            >
              <div className="prose prose-slate max-w-none">
                <h1 className="text-3xl font-bold text-slate-900 mb-6">
                  {metadata.filename.replace(/\.[^/.]+$/, '')}
                </h1>
                <div className="text-slate-600 leading-relaxed space-y-4">
                  <p>
                    This is a placeholder for the PDF viewer. In production, you would integrate a PDF rendering library
                    like PDF.js or react-pdf to display the actual document content here.
                  </p>
                  <p>
                    The document "{metadata.filename}" contains {metadata.pages} pages and approximately {metadata.wordCount.toLocaleString()} words.
                  </p>
                  <p>
                    Users can navigate between pages using the controls above, zoom in/out, and interact with the document
                    while asking questions through the AI chat interface on the right side.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Chat Interface */}
        <div className="w-[500px] flex flex-col bg-white overflow-hidden">
          {/* Chat Header */}
          <div className="px-6 py-4 border-b border-slate-200 flex-shrink-0">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-gradient-to-br from-violet-50 to-purple-50 rounded-xl">
                <Brain className="w-6 h-6 text-violet-600" />
              </div>
              <div>
                <h2 className="font-bold text-slate-900">Document Q&A</h2>
                <p className="text-sm text-slate-500">Ask anything about this document</p>
              </div>
            </div>

            <button
              onClick={() => setShowMetadata(!showMetadata)}
              className="w-full text-left px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100 hover:border-blue-200 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-blue-900">Quick Stats</span>
                <ChevronRight className={`w-4 h-4 text-blue-600 transition-transform ${showMetadata ? 'rotate-90' : ''}`} />
              </div>

              <AnimatePresence>
                {showMetadata && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="grid grid-cols-2 gap-3 mt-3"
                  >
                    <div className="text-center p-2 bg-white rounded-lg">
                      <div className="text-lg font-bold text-slate-900">{metadata.pages}</div>
                      <div className="text-xs text-slate-500">Pages</div>
                    </div>
                    <div className="text-center p-2 bg-white rounded-lg">
                      <div className="text-lg font-bold text-slate-900">{(metadata.wordCount / 1000).toFixed(1)}K</div>
                      <div className="text-xs text-slate-500">Words</div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
          </div>

          {/* Messages */}
          <div
            ref={chatScrollRef}
            className="flex-1 overflow-y-auto p-6 space-y-4"
          >
            {messages.map((message, index) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`flex gap-3 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.type === 'assistant' && (
                  <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                )}

                <div className={`max-w-[80%] ${message.type === 'user' ? 'order-first' : ''}`}>
                  <div className={`rounded-2xl px-4 py-3 ${
                    message.type === 'user'
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
                      : 'bg-slate-100 text-slate-900'
                  }`}>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                  </div>

                  {message.type === 'assistant' && message.confidence && (
                    <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
                      <Target className="w-3 h-3" />
                      <span>{(message.confidence * 100).toFixed(0)}% confidence</span>
                      {message.sources && message.sources.length > 0 && (
                        <>
                          <span>•</span>
                          <span>{message.sources.length} sources</span>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {message.type === 'user' && (
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-white" />
                  </div>
                )}
              </motion.div>
            ))}

            {isLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex gap-3"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-purple-600 rounded-full flex items-center justify-center">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="bg-slate-100 rounded-2xl px-4 py-3">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-slate-200 p-4 bg-white flex-shrink-0">
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-3">
              <textarea
                ref={inputRef}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Ask a question about this document..."
                className="w-full bg-transparent resize-none focus:outline-none text-slate-900 placeholder-slate-400 text-sm"
                rows={2}
                disabled={isLoading}
              />

              <div className="flex items-center justify-between mt-2">
                <div className="text-xs text-slate-500">
                  <kbd className="px-2 py-0.5 bg-white rounded border border-slate-200">Enter</kbd> to send
                </div>
                <button
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim() || isLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Send className="w-4 h-4" />
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
