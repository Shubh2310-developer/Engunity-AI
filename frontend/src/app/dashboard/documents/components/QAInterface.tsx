'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  ExternalLink
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';

import { useAuth } from '@/hooks/useAuth';
import { saveChatMessage, getChatHistory } from '@/lib/firebase/chat-storage';
import { CodeBlock } from '@/components/shared/CodeHighlight';

import type { ChatMessage, ChatSession } from '@/types/chat';
import type { Document } from '@/types/documents';

// Enhanced type definitions for clarity
interface QAInterfaceProps {
  document: Document;
  sessionId?: string;
  className?: string;
}

interface Source {
  pageNumber: number;
  content: string;
  confidence: number;
}

interface StreamingMessage extends Omit<ChatMessage, 'sources'> {
  isStreaming: boolean;
  sources?: Source[];
}

// Sub-component for rendering each message bubble
const MessageBubble: React.FC<{
  message: ChatMessage | StreamingMessage;
  documentId: string;
  onCopy: (content: string) => void;
}> = React.memo(({ message, documentId, onCopy }) => {
  const isUser = message.role === 'user';
  const isStreaming = 'isStreaming' in message && message.isStreaming;
  const isError = 'isError' in message && message.isError;

  const avatarClasses = `flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-lg ${
    isUser 
      ? 'bg-gradient-primary text-white' 
      : isError 
        ? 'bg-red-100 text-red-600'
        : 'bg-gradient-ai text-white'
  }`;

  const bubbleClasses = `rounded-lg px-4 py-3 ${
    isUser 
      ? 'bg-gradient-primary text-white' 
      : isError
        ? 'bg-red-50 border border-red-200 text-red-800'
        : 'bg-white border border-slate-200 text-slate-900'
  }`;

  return (
    <motion.div
      key={message.id}
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={`flex gap-4 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
    >
      <div className={avatarClasses}>
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>

      <div className={`flex flex-col space-y-2 ${isUser ? 'items-end' : 'items-start'} max-w-[80%]`}>
        <div className={bubbleClasses}>
          <div className="prose prose-sm max-w-none text-inherit">
            {message.content.includes('```') ? (
              <CodeBlock content={message.content} />
            ) : (
              <p className="mb-0 whitespace-pre-wrap break-words">
                {message.content}
                {isStreaming && (
                  <motion.span
                    animate={{ opacity: [1, 0.5, 1] }}
                    transition={{ duration: 1.2, repeat: Infinity }}
                    className="ml-1 inline-block h-4 w-2 bg-current rounded-full"
                  />
                )}
              </p>
            )}
          </div>

          {message.sources && message.sources.length > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-200/50">
              <div className="flex items-center gap-2 mb-2">
                <Quote className="h-3 w-3 text-slate-500" />
                <span className="text-xs font-medium text-slate-600">Sources</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {message.sources.map((source, index) => (
                  <Badge 
                    key={index} 
                    variant="secondary" 
                    className="text-xs cursor-pointer hover:bg-slate-200"
                    onClick={() => window.open(`/dashboard/documents/${documentId}/viewer?page=${source.pageNumber}`, '_blank')}
                  >
                    Page {source.pageNumber}
                    <ExternalLink className="h-3 w-3 ml-1" />
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        {!isUser && !isStreaming && !isError && (
          <div className="flex items-center gap-1 text-slate-500">
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onCopy(message.content)}>
              <Copy className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6">
              <ThumbsUp className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6">
              <ThumbsDown className="h-3 w-3" />
            </Button>
          </div>
        )}

        <div className="text-xs text-slate-500">
          {new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit' }).format(new Date(message.timestamp))}
        </div>
      </div>
    </motion.div>
  );
});
MessageBubble.displayName = 'MessageBubble';


const QAInterface: React.FC<QAInterfaceProps> = ({
  document, 
  sessionId: initialSessionId,
  className = '' 
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streamingMessage, setStreamingMessage] = useState<StreamingMessage | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [activeSessionId, setActiveSessionId] = useState<string | null | undefined>(initialSessionId);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Load chat history
  useEffect(() => {
    const loadChatHistory = async () => {
      if (!user || !activeSessionId) {
        setIsLoadingHistory(false);
        return;
      }
      setIsLoadingHistory(true);
      try {
        const history = await getChatHistory(activeSessionId);
        setMessages(history);
      } catch (error) {
        console.error('Error loading chat history:', error);
        toast({
          title: 'Error',
          description: 'Failed to load chat history.',
          variant: 'destructive',
        });
      } finally {
        setIsLoadingHistory(false);
      }
    };

    loadChatHistory();
  }, [user, activeSessionId, toast]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingMessage]);

  const handleCopyMessage = useCallback(async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      toast({
        title: 'Copied',
        description: 'Message copied to clipboard.',
      });
    } catch (error) {
      console.error('Failed to copy:', error);
      toast({
        title: 'Copy Failed',
        description: 'Could not copy message to clipboard.',
        variant: 'destructive',
      });
    }
  }, [toast]);

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      // The rest of the cleanup is in the catch block of handleSubmit
    }
  };

  const handleStreamedResponse = async (reader: ReadableStreamDefaultReader<Uint8Array>, streamingId: string, currentSessionId: string) => {
    const decoder = new TextDecoder();
    let accumulatedContent = '';
    let sources: Source[] = [];

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
            setStreamingMessage(prev => prev ? { ...prev, content: accumulatedContent } : null);
          } else if (data.type === 'sources') {
            sources = data.sources;
            setStreamingMessage(prev => prev ? { ...prev, sources } : null);
          } else if (data.type === 'done') {
            const finalMessage: ChatMessage = {
              id: streamingId,
              role: 'assistant',
              content: accumulatedContent,
              timestamp: new Date(),
              documentId: document.id,
              sources: sources,
            };

            setMessages(prev => [...prev, finalMessage]);
            setStreamingMessage(null);

            if (user) {
              await saveChatMessage(user.uid, finalMessage, currentSessionId);
            }
            return; // Exit loop
          }
        } catch (error) {
          console.error('Error parsing streaming data:', error, 'raw line:', line);
        }
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading || !user) return;

    const currentSessionId = activeSessionId || `doc_${document.id}_${Date.now()}`;
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

    await saveChatMessage(user.uid, userMessage, currentSessionId);

    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          documentId: document.id,
          sessionId: currentSessionId,
          userId: user.uid,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok || !response.body) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
      }

      const streamingId = Date.now().toString();
      setStreamingMessage({
        id: streamingId,
        role: 'assistant',
        content: '',
        isStreaming: true,
        timestamp: new Date(),
        documentId: document.id,
        sources: [],
      });

      await handleStreamedResponse(response.body.getReader(), streamingId, currentSessionId);

    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Stream was aborted by the user.');
        setStreamingMessage(null); // Clear any partial message
        return;
      }

      console.error('Error streaming response:', error);
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: 'I apologize, but I encountered an error. Please try again or contact support.',
        timestamp: new Date(),
        documentId: document.id,
        isError: true,
      };
      setMessages(prev => [...prev, errorMessage]);
      setStreamingMessage(null);
      toast({
        title: 'An Error Occurred',
        description: 'Failed to get a response from the assistant.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const renderWelcomeState = () => (
    <div className="flex flex-col items-center justify-center h-full text-center p-4">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-ai/10 mb-4">
        <Bot className="h-8 w-8 text-ai-primary" />
      </div>
      <h3 className="text-lg font-semibold text-slate-900 mb-2">
        Start a conversation
      </h3>
      <p className="text-slate-600 mb-6 max-w-sm">
        Ask me anything about "{document.title}". I can help you understand, analyze, and extract insights.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl">
        {[
          "What is the main topic of this document?",
          "Can you summarize the key points?",
          "What are the important conclusions?",
          "Are there any specific recommendations?"
        ].map((question) => (
          <Card
            key={question}
            className="card cursor-pointer hover-lift transition-all duration-200 hover:border-ai-primary/20"
            onClick={() => {
              setInputValue(question);
              inputRef.current?.focus();
            }}
          >
            <CardContent className="p-3">
              <p className="text-sm text-slate-700">{question}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderLoadingSkeleton = () => (
    <div className="p-4 space-y-6">
      {[...Array(3)].map((_, i) => (
        <div key={i} className={`flex gap-4 ${i % 2 ? 'flex-row-reverse' : ''}`}>
          <Skeleton className="h-8 w-8 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className={`flex flex-col h-full bg-slate-50 ${className}`}>
      <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary/10">
            <FileText className="h-4 w-4 text-ai-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 truncate" title={document.title}>{document.title}</h3>
            <p className="text-sm text-slate-500">Ask questions about this document</p>
          </div>
        </div>
        <Badge variant="secondary" className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          Ready
        </Badge>
      </div>

      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto p-4 space-y-6">
          {isLoadingHistory ? renderLoadingSkeleton()
            : messages.length === 0 && !streamingMessage ? renderWelcomeState()
            : (
              <AnimatePresence initial={false}>
                {messages.map((message) => (
                  <MessageBubble key={message.id} message={message} documentId={document.id} onCopy={handleCopyMessage} />
                ))}
                {streamingMessage && (
                  <MessageBubble message={streamingMessage} documentId={document.id} onCopy={handleCopyMessage} />
                )}
              </AnimatePresence>
            )
          }
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="border-t border-slate-200 bg-white/90 backdrop-blur-sm p-4">
        <form onSubmit={handleSubmit}>
          <div className="flex items-end gap-3">
            <div className="flex-1 relative">
              <Input
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ask a question..."
                disabled={isLoading}
                className="min-h-[44px] resize-none pr-20 focus:border-ai-primary focus:ring-ai-primary/20"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e as any); // Cast to any to satisfy form event
                  }
                }}
                maxLength={2000}
              />
              <div className="absolute bottom-2.5 right-3 text-xs text-slate-400">
                {inputValue.length} / 2000
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {isLoading && (
                <Button type="button" variant="outline" size="icon" onClick={handleStopGeneration} className="h-[44px] w-[44px] hover-lift">
                  <RefreshCw className="h-4 w-4" />
                  <span className="sr-only">Stop</span>
                </Button>
              )}
              <Button type="submit" disabled={!inputValue.trim() || isLoading} className="btn-primary hover-lift w-[44px] h-[44px]">
                {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                <span className="sr-only">Send</span>
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default QAInterface;
