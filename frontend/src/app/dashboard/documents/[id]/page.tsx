'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  FileText, 
  MessageSquare, 
  Download, 
  Share2, 
  Eye,
  ArrowLeft,
  Loader2,
  AlertCircle
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

import { useAuth } from '@/hooks/useAuth';
import type { SupabaseDocument } from '@/lib/supabase/document-storage-no-auth';

interface QAMessage {
  id: string;
  type: 'question' | 'answer';
  content: string;
  timestamp: Date;
  sources?: Array<{
    pageNumber: number;
    content: string;
    confidence: number;
  }>;
}

const DocumentViewPage: React.FC = () => {
  const params = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const documentId = params.id as string;
  const [document, setDocument] = useState<SupabaseDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Q&A state
  const [messages, setMessages] = useState<QAMessage[]>([]);
  const [question, setQuestion] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [sessionId] = useState(`session_${Date.now()}`);

  useEffect(() => {
    if (documentId) {
      fetchDocument();
    }
  }, [documentId]);

  const fetchDocument = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/documents/${documentId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch document');
      }
      
      const data = await response.json();
      setDocument(data.document);
    } catch (error: any) {
      console.error('Error fetching document:', error);
      setError(error.message || 'Failed to load document');
      toast('Failed to load document', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleAskQuestion = async () => {
    if (!question.trim() || isAsking || !document) return;

    const userMessage: QAMessage = {
      id: `user_${Date.now()}`,
      type: 'question',
      content: question,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsAsking(true);
    const currentQuestion = question;
    setQuestion('');

    try {
      const response = await fetch(`/api/documents/${documentId}/qa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: currentQuestion,
          sessionId
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get answer');
      }

      const data = await response.json();
      
      const aiMessage: QAMessage = {
        id: data.messageId,
        type: 'answer',
        content: data.answer,
        timestamp: new Date(),
        sources: data.sources
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error: any) {
      console.error('Q&A error:', error);
      toast('Failed to get answer', { variant: 'error' });
      
      const errorMessage: QAMessage = {
        id: `error_${Date.now()}`,
        type: 'answer',
        content: 'Sorry, I encountered an error while processing your question. Please try again.',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsAsking(false);
    }
  };

  const handleDownload = () => {
    if (document?.storage_url) {
      window.open(document.storage_url, '_blank');
    }
  };

  if (loading) {
    return (
      <div className="container-premium py-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <Skeleton className="h-8 w-64" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <Skeleton className="h-96 w-full" />
            </div>
            <div className="space-y-4">
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !document) {
    return (
      <div className="container-premium py-8">
        <div className="max-w-2xl mx-auto text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Document Not Found</h1>
          <p className="text-slate-600 mb-6">{error || 'The requested document could not be found.'}</p>
          <Button onClick={() => window.history.back()} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container-premium py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-6xl mx-auto space-y-6"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => window.history.back()}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{document.name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary">{document.type}</Badge>
                <Badge variant="outline">{document.category}</Badge>
                <span className="text-sm text-slate-500">
                  {new Date(document.uploaded_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
            <Button variant="outline" size="sm">
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Document Viewer */}
          <div className="lg:col-span-2">
            <Card className="card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Document Preview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-slate-50 rounded-lg p-8 min-h-[500px] flex items-center justify-center">
                  <div className="text-center">
                    <FileText className="h-16 w-16 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-900 mb-2">Document Preview</h3>
                    <p className="text-slate-600 mb-4">
                      Preview functionality will be implemented based on document type.
                    </p>
                    <Button onClick={handleDownload} variant="outline">
                      <Download className="h-4 w-4 mr-2" />
                      Open Document
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Q&A Interface */}
          <div className="space-y-6">
            {/* Document Info */}
            <Card className="card">
              <CardHeader>
                <CardTitle>Document Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600">Size:</span>
                  <span className="text-sm font-medium">{document.size}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600">Status:</span>
                  <Badge variant={document.status === 'processed' ? 'default' : 'secondary'}>
                    {document.status}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600">Category:</span>
                  <span className="text-sm font-medium">{document.category}</span>
                </div>
                {document.tags.length > 0 && (
                  <div>
                    <span className="text-sm text-slate-600">Tags:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {document.tags.map((tag, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Q&A Chat */}
            <Card className="card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Ask Questions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Messages */}
                <div className="max-h-64 overflow-y-auto space-y-3">
                  {messages.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-4">
                      Ask questions about this document to get started.
                    </p>
                  ) : (
                    messages.map((message) => (
                      <div
                        key={message.id}
                        className={`p-3 rounded-lg ${
                          message.type === 'question'
                            ? 'bg-blue-50 border-l-4 border-blue-500'
                            : 'bg-slate-50 border-l-4 border-slate-500'
                        }`}
                      >
                        <div className="text-sm font-medium mb-1">
                          {message.type === 'question' ? 'You' : 'AI Assistant'}
                        </div>
                        <div className="text-sm text-slate-700">{message.content}</div>
                        {message.sources && message.sources.length > 0 && (
                          <div className="mt-2 text-xs text-slate-500">
                            Sources: Page {message.sources.map(s => s.pageNumber).join(', ')}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                  
                  {isAsking && (
                    <div className="p-3 rounded-lg bg-slate-50 border-l-4 border-slate-500">
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm">AI is thinking...</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Input */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAskQuestion()}
                    placeholder="Ask a question about this document..."
                    disabled={isAsking}
                    className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <Button 
                    size="sm" 
                    onClick={handleAskQuestion}
                    disabled={!question.trim() || isAsking}
                  >
                    {isAsking ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <MessageSquare className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default DocumentViewPage;