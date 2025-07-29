'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/auth/supabase';
import { 
  Send, 
  Bot, 
  User, 
  Wifi,
  WifiOff,
  AlertTriangle,
  RefreshCw,
  Terminal,
  Settings,
  LogOut,
  Plus,
  MessageCircle,
  Search,
  Menu,
  X,
  Calendar,
  Trash2,
  Edit3,
  Clock,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface Message {
  id: string;
  type: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
  tokens?: number;
  sessionId?: string;
  messageId?: string;
  confidence?: number;
}

interface ChatSession {
  sessionId: string;
  documentId: string;
  title: string;
  lastMessage: string;
  timestamp: Date;
  messageCount: number;
  isActive: boolean;
  userId?: string;
}

export default function ChatCodePage() {
  // Authentication & User State
  const [user, setUser] = useState<any>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // UI State
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Chat Sessions
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);

  // Chat State
  const [messages, setMessages] = useState<Message[]>([]);
  
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [systemStatus, setSystemStatus] = useState<'live' | 'fallback' | 'offline'>('live');

  // Refs
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLTextAreaElement>(null);

  // Authentication check
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setIsAuthenticated(true);
          setUser({
            id: session.user.id,
            email: session.user.email,
            name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User'
          });
          
          // Load user's chat sessions
          await loadUserSessions(session.user.id);
        } else {
          setIsAuthenticated(false);
          window.location.href = '/auth/login';
        }
      } catch (error) {
        console.error('Auth error:', error);
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setIsAuthenticated(false);
        setUser(null);
        window.location.href = '/auth/login';
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load user's chat sessions
  const loadUserSessions = async (userId: string) => {
    try {
      // Get all sessions for user via API
      const response = await fetch(`/api/chat/sessions?userId=${userId}&documentId=general_chat`);
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to load sessions');
      }
      
      const sessions = data.sessions || [];
      const formattedSessions: ChatSession[] = sessions.map((session: any) => ({
        sessionId: session.sessionId,
        documentId: session.documentId,
        title: session.title || 'New Chat',
        lastMessage: '',
        timestamp: new Date(session.updatedAt),
        messageCount: session.messageCount,
        isActive: false,
        userId: session.userId || userId
      }));
      
      setChatSessions(formattedSessions);
      
      // If no sessions exist, create a new one
      if (formattedSessions.length === 0) {
        await createNewChat();
      } else {
        // Set the first session as active and load its messages
        const firstSession = formattedSessions[0];
        if (firstSession) {
          setCurrentSessionId(firstSession.sessionId);
          setChatSessions(prev => prev.map(s => ({
            ...s,
            isActive: s.sessionId === firstSession.sessionId
          })));
          await loadSessionMessages(firstSession.sessionId);
        }
      }
    } catch (error) {
      console.error('Error loading user sessions:', error);
      // Create a new session if loading fails
      await createNewChat();
    }
  };

  // Load messages for a specific session
  const loadSessionMessages = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/chat/messages?sessionId=${sessionId}&limit=50`);
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to load messages');
      }
      
      const history = data.messages || [];
      const loadedMessages: Message[] = [
        {
          id: 'system-welcome',
          type: 'system',
          content: "Welcome to Engunity AI Chat & Code Assistant! I'm here to help you with programming, engineering questions, and code generation. How can I assist you today?",
          timestamp: new Date(),
          tokens: 42
        },
        ...history.map((msg: any) => ({
          id: msg.messageId,
          type: msg.role as 'user' | 'assistant',
          content: msg.content,
          timestamp: new Date(msg.timestamp),
          tokens: msg.tokenUsage?.totalTokens || 0,
          sessionId: msg.sessionId,
          messageId: msg.messageId,
          confidence: msg.confidence
        }))
      ];
      setMessages(loadedMessages);
    } catch (error) {
      console.error('Error loading session messages:', error);
      // Set default welcome message if loading fails
      setMessages([
        {
          id: 'system-welcome',
          type: 'system',
          content: "Welcome to Engunity AI Chat & Code Assistant! I'm here to help you with programming, engineering questions, and code generation. How can I assist you today?",
          timestamp: new Date(),
          tokens: 42
        }
      ]);
    }
  };

  // Auto-scroll
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (chatInputRef.current) {
      chatInputRef.current.style.height = 'auto';
      chatInputRef.current.style.height = Math.min(chatInputRef.current.scrollHeight, 120) + 'px';
    }
  }, [chatInput]);

  const createNewChat = async () => {
    if (!user?.id) return;
    
    try {
      // Create new session via API
      const response = await fetch('/api/chat/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentId: 'general_chat',
          userId: user.id,
          documentInfo: { name: 'General Chat', type: 'chat', category: 'general' }
        })
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to create session');
      }
      
      const session = data.session;
      
      const newSession: ChatSession = {
        sessionId: session.sessionId,
        documentId: session.documentId,
        title: 'New Chat',
        lastMessage: '',
        timestamp: new Date(),
        messageCount: 0,
        isActive: true,
        userId: user.id
      };

      setChatSessions(prev => [
        newSession,
        ...prev.map(s => ({ ...s, isActive: false }))
      ]);
      
      setCurrentSessionId(session.sessionId);
      setMessages([
        {
          id: 'system-welcome',
          type: 'system',
          content: "Welcome to Engunity AI Chat & Code Assistant! I'm here to help you with programming, engineering questions, and code generation. How can I assist you today?",
          timestamp: new Date(),
          tokens: 42
        }
      ]);
    } catch (error) {
      console.error('Error creating new chat:', error);
    }
  };

  const switchToSession = async (sessionId: string) => {
    setChatSessions(prev => prev.map(s => ({
      ...s,
      isActive: s.sessionId === sessionId
    })));
    setCurrentSessionId(sessionId);
    
    // Load messages for the selected session
    await loadSessionMessages(sessionId);
  };

  const deleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      // Delete from MongoDB (you may want to implement this in ChatService)
      // For now, just remove from UI
      setChatSessions(prev => prev.filter(s => s.sessionId !== sessionId));
      
      if (sessionId === currentSessionId) {
        const remainingSessions = chatSessions.filter(s => s.sessionId !== sessionId);
        if (remainingSessions.length > 0 && remainingSessions[0]) {
          await switchToSession(remainingSessions[0].sessionId);
        } else {
          await createNewChat();
        }
      }
    } catch (error) {
      console.error('Error deleting session:', error);
    }
  };

  const sendChatMessage = async (message: string) => {
    if (!message.trim() || isChatLoading || !isAuthenticated || !currentSessionId || !user?.id) return;

    const userMessageId = `msg_${Date.now()}`;
    const userMessage: Message = {
      id: userMessageId,
      type: 'user',
      content: message,
      timestamp: new Date(),
      tokens: Math.floor(message.split(' ').length * 1.3),
      sessionId: currentSessionId,
      messageId: userMessageId
    };

    setMessages(prev => [...prev, userMessage]);
    setChatInput('');
    setIsChatLoading(true);

    // Save user message via API
    try {
      await fetch('/api/chat/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: currentSessionId,
          documentId: 'general_chat',
          userId: user.id,
          role: 'user',
          content: message,
          timestamp: new Date(),
          messageId: userMessageId,
          tokenUsage: {
            promptTokens: Math.floor(message.split(' ').length * 1.3),
            completionTokens: 0,
            totalTokens: Math.floor(message.split(' ').length * 1.3)
          }
        })
      });
    } catch (error) {
      console.error('Error saving user message:', error);
    }

    // Update session with new message
    setChatSessions(prev => prev.map(s => 
      s.sessionId === currentSessionId 
        ? { 
            ...s, 
            lastMessage: message.length > 50 ? message.substring(0, 50) + '...' : message,
            timestamp: new Date(),
            messageCount: s.messageCount + 1,
            title: s.title === 'New Chat' ? (message.length > 30 ? message.substring(0, 30) + '...' : message) : s.title
          }
        : s
    ));

    const assistantMessageId = `msg_${Date.now() + 1}`;
    const assistantMessage: Message = {
      id: assistantMessageId,
      type: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true,
      tokens: 0,
      sessionId: currentSessionId,
      messageId: assistantMessageId
    };

    setMessages(prev => [...prev, assistantMessage]);

    try {
      // Call backend chat API
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: message,
          sessionId: currentSessionId,
          model: 'default',
          temperature: 0.7,
          maxTokens: 2000,
          stream: false
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setMessages(prev => prev.map(msg => 
          msg.id === assistantMessage.id 
            ? { 
                ...msg, 
                content: data.response, 
                isStreaming: false, 
                tokens: data.usage?.totalTokens || 0,
                confidence: data.confidence
              }
            : msg
        ));

        // Save assistant message via API
        try {
          await fetch('/api/chat/messages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              sessionId: currentSessionId,
              documentId: 'general_chat',
              userId: user.id,
              role: 'assistant',
              content: data.response,
              timestamp: new Date(),
              messageId: assistantMessageId,
              confidence: data.confidence,
              sources: data.sources,
              tokenUsage: data.usage,
              processingTime: data.response_time,
              csEnhanced: data.cs_enhanced,
              ragVersion: data.rag_version || '1.0.0',
              processingMode: data.processing_mode
            })
          });
        } catch (error) {
          console.error('Error saving assistant message:', error);
        }
      } else {
        throw new Error(data.error || 'Chat API failed');
      }
    } catch (error) {
      console.error('Chat error:', error);
      setSystemStatus('fallback');
      
      const fallbackResponse = `I apologize, but I'm currently running in fallback mode. Your question "${message}" has been received.\n\n**Fallback Response:**\nI'm here to help with engineering and technical questions. While the main AI system is temporarily unavailable, I can still provide guidance on:\n\n• **Programming & Development**: Code architecture, best practices, debugging\n• **System Design**: Scalability, performance optimization, microservices  \n• **DevOps & Infrastructure**: CI/CD, containerization, cloud platforms\n• **Data Engineering**: Database design, data pipelines, analytics\n\nPlease try again in a few moments for the full AI-powered experience.`;

      setMessages(prev => prev.map(msg => 
        msg.id === assistantMessage.id 
          ? { 
              ...msg, 
              content: fallbackResponse, 
              isStreaming: false, 
              tokens: Math.floor(fallbackResponse.split(' ').length * 1.3)
            }
          : msg
      ));

      // Save fallback message via API
      try {
        await fetch('/api/chat/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sessionId: currentSessionId,
            documentId: 'general_chat',
            userId: user.id,
            role: 'assistant',
            content: fallbackResponse,
            timestamp: new Date(),
            messageId: assistantMessageId,
            tokenUsage: {
              promptTokens: Math.floor(message.split(' ').length * 1.3),
              completionTokens: Math.floor(fallbackResponse.split(' ').length * 1.3),
              totalTokens: Math.floor((message + fallbackResponse).split(' ').length * 1.3)
            },
            processingMode: 'fallback'
          })
        });
      } catch (dbError) {
        console.error('Error saving fallback message:', dbError);
      }
    }
    
    setIsChatLoading(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendChatMessage(chatInput);
    }
  };

  const getStatusIcon = () => {
    switch (systemStatus) {
      case 'live': return <Wifi className="w-3 h-3 text-green-400" />;
      case 'fallback': return <AlertTriangle className="w-3 h-3 text-yellow-400" />;
      case 'offline': return <WifiOff className="w-3 h-3 text-red-400" />;
    }
  };

  const getStatusText = () => {
    switch (systemStatus) {
      case 'live': return 'Live API';
      case 'fallback': return 'Fallback Mode'; 
      case 'offline': return 'Offline';
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      window.location.href = '/auth/login';
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const filteredSessions = chatSessions.filter(session =>
    session.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    session.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto" />
          <p className="text-slate-600 text-lg">Loading your chat session...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex items-center justify-center">
        <div className="text-center space-y-6 p-8">
          <h1 className="text-3xl font-bold text-slate-900">Authentication Required</h1>
          <p className="text-slate-600 text-lg">Please sign in to access the chat assistant</p>
          <button 
            onClick={() => window.location.href = '/auth/login'}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  const messageCount = messages.filter(m => m.type !== 'system').length;
  const totalTokens = messages.reduce((sum, msg) => sum + (msg.tokens || 0), 0);

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const hours = diff / (1000 * 60 * 60);
    
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${Math.floor(hours)}h ago`;
    if (hours < 48) return 'Yesterday';
    return timestamp.toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-80' : 'w-0'} transition-all duration-300 bg-white border-r border-slate-200 flex flex-col overflow-hidden`}>
        {/* Sidebar Header */}
        <div className="p-4 border-b border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Chat History</h2>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-1 text-slate-500 hover:text-slate-700 lg:hidden"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          <button
            onClick={createNewChat}
            className="w-full flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Chat
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-slate-200">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>
        </div>

        {/* Chat Sessions List */}
        <div className="flex-1 overflow-y-auto">
          {filteredSessions.length === 0 ? (
            <div className="p-4 text-center text-slate-500">
              <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No conversations found</p>
            </div>
          ) : (
            <div className="space-y-1 p-2">
              {filteredSessions.map((session) => (
                <div
                  key={session.sessionId}
                  onClick={() => switchToSession(session.sessionId)}
                  className={`group relative p-3 rounded-lg cursor-pointer transition-colors ${
                    session.isActive 
                      ? 'bg-blue-50 border border-blue-200' 
                      : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className={`text-sm font-medium truncate ${
                        session.isActive ? 'text-blue-900' : 'text-slate-900'
                      }`}>
                        {session.title}
                      </h3>
                      <p className="text-xs text-slate-500 truncate mt-1">
                        {session.lastMessage || 'No messages yet'}
                      </p>
                      <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
                        <Clock className="w-3 h-3" />
                        <span>{formatTimestamp(session.timestamp)}</span>
                        <span>•</span>
                        <span>{session.messageCount} messages</span>
                      </div>
                    </div>
                    
                    <button
                      onClick={(e) => deleteSession(session.sessionId, e)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 transition-all"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* User Profile */}
        <div className="p-4 border-t border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">{user.name}</p>
              <p className="text-xs text-slate-500 truncate">{user.email}</p>
            </div>
            <button className="p-1 text-slate-400 hover:text-slate-600">
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-slate-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 text-slate-500 hover:text-slate-700 rounded-lg hover:bg-slate-100"
              >
                {sidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
              
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 via-violet-500 to-purple-600 rounded-xl flex items-center justify-center">
                <Terminal className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">
                  {chatSessions.find(s => s.sessionId === currentSessionId)?.title || 'Chat & Code Assistant'}
                </h1>
                <p className="text-sm text-slate-500">AI-powered programming assistance</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm">
                {getStatusIcon()}
                <span className="text-slate-600">{getStatusText()}</span>
              </div>
              
              <div className="flex items-center gap-4 text-sm text-slate-500">
                <span>{messageCount} messages</span>
                <span>{totalTokens.toLocaleString()} tokens</span>
              </div>
              
              <button 
                onClick={handleSignOut}
                className="p-2 text-slate-500 hover:text-red-600 rounded-lg hover:bg-red-50"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 flex flex-col">
          <div 
            ref={chatScrollRef}
            className="flex-1 overflow-y-auto p-6 space-y-6"
          >
            {messages.map((message, index) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`flex gap-4 ${message.type === 'user' ? 'justify-end' : ''}`}
              >
                {message.type !== 'user' && (
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    message.type === 'system' 
                      ? 'bg-emerald-100 text-emerald-600' 
                      : 'bg-blue-100 text-blue-600'
                  }`}>
                    {message.type === 'system' ? (
                      <Terminal className="w-4 h-4" />
                    ) : (
                      <Bot className="w-4 h-4" />
                    )}
                  </div>
                )}
                
                <div className={`max-w-[80%] ${message.type === 'user' ? 'order-2' : ''}`}>
                  <div className={`rounded-2xl px-4 py-3 ${
                    message.type === 'user'
                      ? 'bg-blue-600 text-white'
                      : message.type === 'system'
                      ? 'bg-slate-100 text-slate-700'
                      : 'bg-white border border-slate-200 text-slate-700 shadow-sm'
                  }`}>
                    <div className="whitespace-pre-wrap">
                      {message.content}
                      {message.isStreaming && (
                        <span className="inline-block w-1 h-4 bg-current ml-1 animate-pulse" />
                      )}
                    </div>
                  </div>
                  
                  <div className={`flex items-center gap-2 mt-1 text-xs text-slate-500 ${
                    message.type === 'user' ? 'justify-end' : ''
                  }`}>
                    <span>{message.timestamp.toLocaleTimeString()}</span>
                    {message.tokens && (
                      <>
                        <span>•</span>
                        <span>{message.tokens} tokens</span>
                      </>
                    )}
                    {message.confidence && (
                      <>
                        <span>•</span>
                        <span>{(message.confidence * 100).toFixed(0)}% confidence</span>
                      </>
                    )}
                  </div>
                </div>

                {message.type === 'user' && (
                  <div className="w-8 h-8 bg-slate-600 rounded-full flex items-center justify-center flex-shrink-0 order-1">
                    <User className="w-4 h-4 text-white" />
                  </div>
                )}
              </motion.div>
            ))}

            {isChatLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex gap-4">
                <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3 shadow-sm">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                    </div>
                    <span className="text-sm text-slate-500">Thinking...</span>
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* Input Area */}
          <div className="border-t border-slate-200 bg-white p-6">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <textarea
                  ref={chatInputRef}
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="Ask me anything about programming, engineering, or request code help..."
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none max-h-32"
                  rows={1}
                  disabled={isChatLoading}
                />
              </div>
              <button
                onClick={() => sendChatMessage(chatInput)}
                disabled={!chatInput.trim() || isChatLoading}
                className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
              >
                {isChatLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                Send
              </button>
            </div>
            
            <div className="flex items-center justify-between mt-3 text-sm text-slate-500">
              <div>
                Press <kbd className="px-2 py-1 bg-slate-100 rounded border text-xs">Enter</kbd> to send, 
                <kbd className="px-2 py-1 bg-slate-100 rounded border ml-1 text-xs">Shift + Enter</kbd> for new line
              </div>
              <div>
                {chatInput.length} characters • ~{Math.ceil(chatInput.split(' ').length * 1.3)} tokens
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}