'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/auth/supabase';
import MessageRenderer from '@/components/chat/MessageRenderer';
import EnhancedMessageRenderer from '@/components/chat/EnhancedMessageRenderer';
import ServiceLoader from '@/components/services/ServiceLoader';
import { ProseMessage, SourcesPanel, ChatBubble, StreamingIndicator, useTokenRate } from '@/components/chat';
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
  ChevronRight,
  ChevronDown,
  Check,
  Sparkles,
  FileText,
  Paperclip,
  Upload,
  Sliders,
  Zap,
  Target,
  Thermometer,
  Layers,
  Copy,
  CheckCheck
} from 'lucide-react';
import { Image as ImageIcon } from 'lucide-react';

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
  sources?: Array<{
    filename: string;
    page?: number;
    section?: string;
    confidence?: number;
    chunk_text?: string;
    metadata?: Record<string, any>;
  }>;
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

interface UploadedDocument {
  doc_id: string;
  filename: string;
  file_type: string;
  size_bytes: number;
  chunk_count: number;
  page_count?: number;
  upload_time: string;
}

function ChatCodePageContent() {
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
  const [isImageLoading, setIsImageLoading] = useState(false);
  const [systemStatus, setSystemStatus] = useState<'live' | 'fallback' | 'offline'>('live');
  const [selectedMode, setSelectedMode] = useState<'chat' | 'image'>('chat');
  const [showModeDropdown, setShowModeDropdown] = useState(false);

  // Document RAG State
  const [uploadedDocuments, setUploadedDocuments] = useState<UploadedDocument[]>([]);
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [showDocumentPanel, setShowDocumentPanel] = useState(false);

  // Document RAG Settings
  const [ragMode, setRagMode] = useState<'hybrid' | 'document-only'>('hybrid');
  const [topK, setTopK] = useState<number>(6);
  const [similarityThreshold, setSimilarityThreshold] = useState<number>(0.5);
  const [temperature, setTemperature] = useState<number>(0.7);
  const [model, setModel] = useState<string>('llama-3.3-70b-versatile');
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);

  // Refs
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Copy state
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

  // Authentication check
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/session', {
          credentials: 'include'
        });
        const data = await response.json();

        if (data.authenticated && data.user) {
          setIsAuthenticated(true);
          setUser({
            id: data.user.id,
            email: data.user.email,
            name: data.user.name || data.user.email?.split('@')[0] || 'User'
          });

          // Load user's chat sessions
          await loadUserSessions(data.user.id);
        } else {
          setIsAuthenticated(false);
          window.location.href = '/auth/login';
        }
      } catch (error) {
        console.error('Auth error:', error);
        setIsAuthenticated(false);
        window.location.href = '/auth/login';
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
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
        // Try to restore the last active session from localStorage
        const savedSessionId = localStorage.getItem(`chatandcode_active_session_${userId}`);

        // Check if the saved session still exists in the loaded sessions
        const savedSession = savedSessionId
          ? formattedSessions.find(s => s.sessionId === savedSessionId)
          : null;

        // Use the saved session if it exists, otherwise use the most recent (first) session
        const sessionToLoad = savedSession || formattedSessions[0];

        if (sessionToLoad) {
          setCurrentSessionId(sessionToLoad.sessionId);
          setChatSessions(prev => prev.map(s => ({
            ...s,
            isActive: s.sessionId === sessionToLoad.sessionId
          })));
          await loadSessionMessages(sessionToLoad.sessionId);

          // Restore uploaded documents for the initial session
          const currentSession = sessions.find((s: any) => s.sessionId === sessionToLoad.sessionId);
          if (currentSession && currentSession.uploadedDocuments) {
            setUploadedDocuments(currentSession.uploadedDocuments);
            setSelectedDocuments(currentSession.uploadedDocuments.map((d: any) => d.doc_id));
          }
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

      // Convert and sort messages by timestamp (ascending - oldest first)
      const sortedHistory = history
        .map((msg: any) => ({
          id: msg.messageId,
          type: msg.role as 'user' | 'assistant',
          content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
          timestamp: new Date(msg.timestamp),
          tokens: msg.tokenUsage?.totalTokens || 0,
          sessionId: msg.sessionId,
          messageId: msg.messageId,
          confidence: msg.confidence
        }))
        .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

      const loadedMessages: Message[] = [
        {
          id: 'system-welcome',
          type: 'system',
          content: "Welcome to Engunity AI Chat & Code Assistant! I'm here to help you with programming, engineering questions, and code generation. How can I assist you today?",
          timestamp: new Date(),
          tokens: 42
        },
        ...sortedHistory
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

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowModeDropdown(false);
      }
    };

    if (showModeDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showModeDropdown]);

  const createNewChat = async () => {
    if (!user?.id) {
      console.error('❌ Cannot create chat - no user');
      return null;
    }

    try {
      console.log('🆕 Creating new chat session...');
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
      console.log('📡 Session API response:', { success: data.success, sessionId: data.session?.sessionId });

      if (!data.success) {
        console.error('❌ Session creation failed:', data.error);
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

      // Save new session as active in localStorage
      localStorage.setItem(`chatandcode_active_session_${user.id}`, session.sessionId);

      setMessages([
        {
          id: 'system-welcome',
          type: 'system',
          content: "Welcome to Engunity AI Chat & Code Assistant! I'm here to help you with programming, engineering questions, and code generation. How can I assist you today?",
          timestamp: new Date(),
          tokens: 42
        }
      ]);

      // Clear uploaded documents for new chat
      setUploadedDocuments([]);
      setSelectedDocuments([]);

      console.log('✅ New chat session created:', session.sessionId);
      return session.sessionId;
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

    // Save active session to localStorage for persistence across page reloads
    if (user?.id) {
      localStorage.setItem(`chatandcode_active_session_${user.id}`, sessionId);
    }

    // Load messages for the selected session
    await loadSessionMessages(sessionId);

    // Restore uploaded documents for this session
    try {
      const sessionResponse = await fetch(`/api/chat/sessions?userId=${user?.id}&documentId=general_chat`);
      const sessionData = await sessionResponse.json();

      if (sessionData.success && sessionData.sessions) {
        const currentSession = sessionData.sessions.find((s: any) => s.sessionId === sessionId);
        if (currentSession && currentSession.uploadedDocuments) {
          setUploadedDocuments(currentSession.uploadedDocuments);
          setSelectedDocuments(currentSession.uploadedDocuments.map((d: any) => d.doc_id));
        } else {
          // Clear documents if session has none
          setUploadedDocuments([]);
          setSelectedDocuments([]);
        }
      }
    } catch (err) {
      console.error('Failed to restore documents for session:', err);
      // Clear documents on error to avoid showing wrong documents
      setUploadedDocuments([]);
      setSelectedDocuments([]);
    }
  };

  const deleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    try {
      // Delete from MongoDB backend
      const response = await fetch('/api/chat/sessions', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId, userId: user?.id })
      });

      if (!response.ok) {
        console.error('Failed to delete session from backend');
      }

      // Remove from UI
      setChatSessions(prev => prev.filter(s => s.sessionId !== sessionId));

      if (sessionId === currentSessionId) {
        const remainingSessions = chatSessions.filter(s => s.sessionId !== sessionId);
        if (remainingSessions.length > 0 && remainingSessions[0]) {
          await switchToSession(remainingSessions[0].sessionId);
        } else {
          // Clear localStorage when deleting the last session
          if (user?.id) {
            localStorage.removeItem(`chatandcode_active_session_${user.id}`);
          }
          await createNewChat();
        }
      }
    } catch (error) {
      console.error('Error deleting session:', error);
    }
  };

  const generateImageFromPrompt = async (rawPrompt: string) => {
    console.log('🎨 generateImageFromPrompt called with:', rawPrompt.substring(0, 100));

    const prompt = rawPrompt.replace(/^\s*\/imagine\s*/i, '').trim();
    if (!prompt) {
      alert('Please enter a description for the image you want to generate.');
      return;
    }

    console.log('✅ Prompt validated:', prompt.substring(0, 100));

    if (!isAuthenticated || !user?.id) {
      alert('Please sign in to generate images.');
      return;
    }

    if (!currentSessionId) {
      console.error('❌ No active session for image generation');
      alert('Creating new chat session...');
      await createNewChat();
      if (!currentSessionId) {
        alert('Failed to create chat session. Please refresh the page.');
        return;
      }
    }

    const userMessageId = `msg_${Date.now()}`;
    const userMessage: Message = {
      id: userMessageId,
      type: 'user',
      content: `🎨 Generate image: ${prompt}`,
      timestamp: new Date(),
      tokens: Math.floor(prompt.split(' ').length * 1.1),
      sessionId: currentSessionId,
      messageId: userMessageId
    };
    setMessages(prev => [...prev, userMessage]);

    const assistantMessageId = `msg_${Date.now() + 1}`;
    const assistantMessage: Message = {
      id: assistantMessageId,
      type: 'assistant',
      content: '✨ Generating your image with Gemini Imagen 3.0...\n',
      timestamp: new Date(),
      isStreaming: true,
      tokens: 0,
      sessionId: currentSessionId,
      messageId: assistantMessageId
    };
    setMessages(prev => [...prev, assistantMessage]);

    setIsImageLoading(true);
    try {
      console.log('🎨 Calling image generation API with prompt:', prompt);
      const res = await fetch('/api/ai/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, n: 1, aspectRatio: '16:9', quality: 'standard' })
      });

      console.log('📡 Image API response status:', res.status);
      const data = await res.json();
      console.log('📦 Image API response data:', data);

      if (!res.ok || !data?.success) {
        throw new Error(data?.error || 'Failed to generate image');
      }

      if (!data.images || data.images.length === 0) {
        throw new Error('No images returned from API');
      }

      console.log('📦 Received images:', data.images.length);

      // Generate markdown for images
      const imagesMd = data.images.map((img: any, i: number) => {
        console.log(`🖼️ Image ${i+1} - mimeType: ${img.mimeType}, dataUrl length: ${img.dataUrl?.length || 0}`);
        return `![${prompt} - Image ${i+1}](${img.dataUrl})

**Generated Image ${i+1}**
*Prompt: "${prompt}"*
*Model: Gemini Imagen 3.0 Fast*`;
      }).join('\n\n---\n\n');

      console.log('📝 Generated markdown:', imagesMd.substring(0, 200));

      setMessages(prev => prev.map(m => m.id === assistantMessageId ? {
        ...m,
        content: imagesMd,
        isStreaming: false,
        tokens: Math.ceil((prompt.split(' ').length + 20) * 1.1)
      } : m));

      console.log('✅ Image generation successful - message updated');
    } catch (err: any) {
      console.error('❌ Image generation error:', err);
      const msg = `❌ Image generation failed: ${err?.message || 'unknown error'}\n\nPlease try again or check your API configuration.`;
      setMessages(prev => prev.map(m => m.id === assistantMessageId ? { ...m, content: msg, isStreaming: false } : m));
    } finally {
      setIsImageLoading(false);
    }
  };

  // Document RAG Functions
  const handleDocumentUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const allowedTypes = ['.pdf', '.docx', '.txt', '.md'];
    const fileExt = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();

    if (!allowedTypes.includes(fileExt)) {
      alert(`File type ${fileExt} not supported. Please upload PDF, DOCX, TXT, or MD files.`);
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      alert('File too large. Maximum size is 50MB.');
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('user_id', user?.id || 'anonymous');
      formData.append('session_id', currentSessionId);

      const response = await fetch('http://localhost:8004/upload', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      console.log('Upload response data:', data);

      // Update UI state
      const newDocuments = [...uploadedDocuments, data];
      setUploadedDocuments(newDocuments);
      setSelectedDocuments(prev => [...prev, data.doc_id]);

      // Persist documents to session in MongoDB
      try {
        await fetch('/api/chat/sessions', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sessionId: currentSessionId,
            updates: {
              uploadedDocuments: newDocuments
            }
          })
        });
      } catch (err) {
        console.error('Failed to persist documents to session:', err);
      }

      // Add system message with proper formatting
      const systemMsg: Message = {
        id: `msg_${Date.now()}`,
        type: 'system',
        content: `## 📄 Document Uploaded Successfully

**Filename:** ${data.filename}

### Document Details

- 📄 **Pages:** ${data.page_count || 'N/A'}
- 🧩 **Chunks:** ${data.chunk_count}
- 📊 **File Size:** ${(data.size_bytes / 1024).toFixed(2)} KB
- 🆔 **Document ID:** \`${data.doc_id}\`

✅ **You can now ask questions about this document!**`,
        timestamp: new Date(),
        sessionId: currentSessionId
      };
      setMessages(prev => [...prev, systemMsg]);

      alert(`✅ Document "${file.name}" uploaded successfully!`);
    } catch (error: any) {
      console.error('Upload error:', error);
      alert(`Failed to upload document: ${error.message}`);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const fetchDocuments = async () => {
    try {
      const response = await fetch(`http://localhost:8004/documents?session_id=${currentSessionId}`);
      if (response.ok) {
        const data = await response.json();
        setUploadedDocuments(data.documents || []);
      }
    } catch (error) {
      console.error('Failed to fetch documents:', error);
    }
  };

  const deleteDocument = async (docId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
      const response = await fetch(`http://localhost:8004/documents/${docId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setUploadedDocuments(prev => prev.filter(d => d.doc_id !== docId));
        setSelectedDocuments(prev => prev.filter(id => id !== docId));
        alert('Document deleted successfully');
      } else {
        throw new Error('Delete failed');
      }
    } catch (error: any) {
      console.error('Delete error:', error);
      alert(`Failed to delete document: ${error.message}`);
    }
  };

  const sendChatMessage = async (message: string) => {
    if (!message.trim() || isChatLoading) {
      console.log('❌ Cannot send message:', { message: message.trim(), isChatLoading, isAuthenticated, currentSessionId, userId: user?.id });
      return;
    }

    if (!isAuthenticated || !user?.id) {
      console.error('❌ User not authenticated');
      alert('Please sign in to send messages.');
      return;
    }

    if (!currentSessionId) {
      console.error('❌ No active session');
      alert('Creating new chat session...');
      await createNewChat();
      if (!currentSessionId) {
        alert('Failed to create chat session. Please refresh the page.');
        return;
      }
    }

    // Check if we should use document RAG
    const useDocumentRAG = uploadedDocuments.length > 0;

    console.log('📤 Sending message:', {
      message: message.substring(0, 50),
      sessionId: currentSessionId,
      userId: user.id,
      useDocumentRAG,
      documentCount: uploadedDocuments.length
    });

    // Capture timestamp ONCE for proper message ordering
    const messageTimestamp = new Date();
    const userMessageId = `msg_${Date.now()}`;
    const userMessage: Message = {
      id: userMessageId,
      type: 'user',
      content: message,
      timestamp: messageTimestamp,
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
          timestamp: messageTimestamp,
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
            timestamp: messageTimestamp,
            messageCount: s.messageCount + 1,
            title: s.title === 'New Chat' ? (message.length > 30 ? message.substring(0, 30) + '...' : message) : s.title
          }
        : s
    ));

    // Assistant message timestamp should be AFTER user message
    const assistantMessageId = `msg_${Date.now() + 1}`;
    const assistantTimestamp = new Date(messageTimestamp.getTime() + 1); // 1ms after user message
    const assistantMessage: Message = {
      id: assistantMessageId,
      type: 'assistant',
      content: '',
      timestamp: assistantTimestamp,
      isStreaming: true,
      tokens: 0,
      sessionId: currentSessionId,
      messageId: assistantMessageId
    };

    setMessages(prev => [...prev, assistantMessage]);

    try {
      let response;

      if (useDocumentRAG) {
        // Use Document RAG server
        console.log('📚 Using Document RAG server with settings:', {
          mode: ragMode,
          topK,
          threshold: similarityThreshold,
          temperature,
          model
        });

        const requestBody = {
          session_id: currentSessionId,
          message: message,
          user_id: user.id,
          doc_ids: selectedDocuments,
          mode: ragMode,  // Use configured mode
          top_k: topK,
          threshold: similarityThreshold,
          temperature: temperature,
          model: model
        };

        response = await fetch('http://localhost:8004/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody)
        });
      } else {
        // Use regular chat API
        console.log('🔄 Starting SSE streaming to /api/chat/stream...');

        const requestBody = {
          message: message,
          sessionId: currentSessionId,
          userId: user.id,
          model: 'llama-3.3-70b-versatile',
          temperature: 0.7,
          maxTokens: 4096,
          stream: true  // Enable streaming
        };

        response = await fetch('/api/chat/stream', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody)
        });
      }

      console.log('📡 Response status:', response.status, 'Content-Type:', response.headers.get('Content-Type'));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API Error:', errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Check if response is SSE
      const contentType = response.headers.get('Content-Type');
      if (contentType?.includes('text/event-stream')) {
        // SSE Streaming mode
        console.log('✅ SSE stream detected - processing tokens...');

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let fullText = '';
        let tokenCount = 0;

        if (!reader) {
          throw new Error('Response body is not readable');
        }

        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            console.log('✅ Stream complete');
            break;
          }

          // Decode chunk and add to buffer
          buffer += decoder.decode(value, { stream: true });

          // Process all complete SSE events in buffer
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Keep incomplete line in buffer

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const eventData = line.slice(6); // Remove 'data: ' prefix

              try {
                const event = JSON.parse(eventData);

                // Handle different event types from different servers
                if (event.type === 'token' || event.token) {
                  // Regular chat or document RAG token
                  const tokenDelta = typeof (event.delta || event.token) === 'string' ? (event.delta || event.token) : '';
                  fullText += tokenDelta;
                  tokenCount = event.tokenCount || (fullText.split(' ').length * 1.3);

                  // Update message in UI with new token
                  setMessages(prev => prev.map(msg =>
                    msg.id === assistantMessage.id
                      ? {
                          ...msg,
                          content: fullText,
                          isStreaming: true,
                          tokens: Math.floor(tokenCount)
                        }
                      : msg
                  ));
                } else if (event.type === 'final' || event.final) {
                  // Final event with metadata
                  console.log('✅ Final event received:', {
                    messageLength: event.message?.length,
                    tokens: event.usage?.totalTokens,
                    model: event.model
                  });

                  // Ensure message content is a string
                  const finalContent = typeof event.message === 'string' ? event.message : JSON.stringify(event.message || '');

                  // Update message with final content
                  setMessages(prev => prev.map(msg =>
                    msg.id === assistantMessage.id
                      ? {
                          ...msg,
                          content: finalContent,
                          isStreaming: false,
                          tokens: event.usage?.totalTokens || tokenCount,
                          sessionId: event.sessionId,
                          messageId: event.messageId
                        }
                      : msg
                  ));

                  // Save assistant message to database
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
                        content: finalContent,
                        timestamp: assistantTimestamp, // Use pre-calculated timestamp from line 759
                        messageId: event.messageId,
                        tokenUsage: event.usage,
                        ragVersion: '2.0.0',
                        processingMode: 'streaming'
                      })
                    });
                  } catch (error) {
                    console.error('Error saving assistant message:', error);
                  }

                  // Generate title for new chats (after first user message)
                  const currentSession = chatSessions.find(s => s.sessionId === currentSessionId);
                  if (currentSession && (currentSession.title === 'New Chat' || currentSession.title.startsWith('Chat about'))) {
                    try {
                      console.log('🏷️ Generating title for chat...');
                      const titleResponse = await fetch('/api/chat/generate-title', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ userMessage: message })
                      });

                      const titleData = await titleResponse.json();
                      if (titleData.success && titleData.title) {
                        const newTitle = titleData.title;
                        console.log('✅ Generated title:', newTitle);

                        // Update session title in database
                        await fetch('/api/chat/sessions', {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            sessionId: currentSessionId,
                            updates: { title: newTitle }
                          })
                        });

                        // Update local state
                        setChatSessions(prev => prev.map(s =>
                          s.sessionId === currentSessionId
                            ? { ...s, title: newTitle }
                            : s
                        ));
                      }
                    } catch (error) {
                      console.error('Error generating chat title:', error);
                      // Silently fail - title generation is not critical
                    }
                  }
                }
              } catch (parseError) {
                console.error('Failed to parse SSE event:', eventData, parseError);
              }
            }
          }
        }

        setSystemStatus('live');
      } else {
        // Non-streaming fallback (JSON response)
        console.log('⚠️ Non-streaming response detected');
        const data = await response.json();
        console.log('✅ API Response:', { success: data.success, responseLength: data.response?.length, model: data.model });

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
                timestamp: assistantTimestamp, // Use consistent timestamp
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

          setSystemStatus('live');
        } else {
          throw new Error(data.error || 'Chat API failed');
        }
      }
    } catch (error: any) {
      console.error('❌ Chat error:', error);
      console.error('❌ Error details:', { message: error.message, stack: error.stack });
      setSystemStatus('fallback');

      // Show user-friendly error
      alert(`Chat Error: ${error.message}\n\nPlease check:\n1. Backend server is running on port 8000\n2. MongoDB is running\n3. Network connection is stable\n\nCheck browser console for details.`);
      
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
      if (selectedMode === 'image') {
        generateImageFromPrompt(chatInput);
        setChatInput('');
      } else {
        sendChatMessage(chatInput);
      }
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
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
      window.location.href = '/auth/login';
    } catch (error) {
      console.error('Sign out error:', error);
      window.location.href = '/auth/login';
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

  // Strip citation numbers [1][2][3] from text
  const stripCitations = (text: string | any): string => {
    // Ensure text is a string
    const textStr = typeof text === 'string' ? text : (text ? JSON.stringify(text) : '');
    return textStr.replace(/\[\d+\]/g, '');
  };

  // Copy message to clipboard
  const copyToClipboard = async (content: string, messageId: string) => {
    try {
      const cleanContent = stripCitations(content);
      await navigator.clipboard.writeText(cleanContent);
      setCopiedMessageId(messageId);
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
      alert('Failed to copy to clipboard');
    }
  };

  // Edit/regenerate message
  const handleEditMessage = (content: string) => {
    setChatInput(content);
    if (chatInputRef.current) {
      chatInputRef.current.focus();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex h-screen overflow-hidden">
      {/* Sidebar - FIXED, NO SCROLLING */}
      <div className={`${sidebarOpen ? 'w-80' : 'w-0'} transition-all duration-300 bg-white border-r border-slate-200 flex flex-col overflow-hidden h-screen`}>
        {/* Sidebar Header */}
        <div className="p-4 border-b border-slate-200 flex-shrink-0">
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
        <div className="p-4 border-b border-slate-200 flex-shrink-0">
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

        {/* Chat Sessions List - SCROLLABLE */}
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
        <div className="p-4 border-t border-slate-200 flex-shrink-0">
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

      {/* Main Content - FIXED HEIGHT */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Header - FIXED */}
        <div className="bg-white border-b border-slate-200 px-6 py-4 flex-shrink-0">
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

        {/* Messages - SCROLLABLE SECTION */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div
            ref={chatScrollRef}
            className="flex-1 overflow-y-auto p-6 space-y-6"
          >
            {messages.map((message, index) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <ChatBubble
                  role={message.type === 'user' ? 'user' : 'assistant'}
                  timestamp={message.timestamp}
                  isStreaming={message.isStreaming}
                >
                  {message.type === 'user' ? (
                    <div className="whitespace-pre-wrap">
                      {message.content}
                      {message.isStreaming && <StreamingIndicator className="ml-1" />}
                    </div>
                  ) : (
                    <>
                      {/* Message Content - Enhanced with visual improvements */}
                      <EnhancedMessageRenderer
                        content={stripCitations(message.content)}
                        type={message.type}
                        confidence={message.confidence}
                        sourceName={message.sources && message.sources.length > 0 ? message.sources[0].filename : undefined}
                        keywords={chatInput.split(' ').filter(w => w.length > 3)}
                      />

                      {message.sources && message.sources.length > 0 && (
                        <SourcesPanel sources={message.sources} />
                      )}

                      {/* Metadata Footer */}
                      {!message.isStreaming && (
                        <div className="flex items-center gap-3 mt-4 pt-3 border-t border-zinc-200 dark:border-zinc-700 text-xs text-zinc-500 dark:text-zinc-400">
                          {message.tokens && (
                            <span className="flex items-center gap-1">
                              <Sparkles className="w-3 h-3" />
                              {message.tokens} tokens
                            </span>
                          )}
                          {message.confidence && (
                            <span className="flex items-center gap-1">
                              <Target className="w-3 h-3" />
                              {(message.confidence * 100).toFixed(0)}% confidence
                            </span>
                          )}
                          <span>•</span>
                          <button
                            onClick={() => copyToClipboard(message.content, message.id)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                          >
                            {copiedMessageId === message.id ? (
                              <>
                                <CheckCheck className="w-3 h-3 text-green-600" />
                                <span className="text-green-600">Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Copy</span>
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => handleEditMessage(stripCitations(message.content))}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>Edit</span>
                          </button>
                        </div>
                      )}

                      {/* Streaming Indicator */}
                      {message.isStreaming && (
                        <div className="mt-2">
                          <StreamingIndicator />
                        </div>
                      )}
                    </>
                  )}
                </ChatBubble>
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

          {/* Document RAG Settings Panel */}
          {showSettingsPanel && uploadedDocuments.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="border-t border-slate-200 bg-gradient-to-b from-slate-50 to-white p-6"
            >
              <div className="max-w-4xl mx-auto">
                <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-blue-100">
                        <Sliders className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900">Document RAG Settings</h3>
                        <p className="text-xs text-slate-500 mt-0.5">Fine-tune retrieval and generation parameters</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowSettingsPanel(false)}
                      className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5 text-slate-400" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Mode Toggle */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-slate-700 mb-3">
                        <div className="flex items-center gap-2">
                          <Target className="w-4 h-4" />
                          Response Mode
                        </div>
                      </label>
                      <div className="flex gap-3">
                        <button
                          onClick={() => setRagMode('hybrid')}
                          className={`flex-1 px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
                            ragMode === 'hybrid'
                              ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          <div className="flex items-center justify-center gap-2">
                            <Zap className="w-4 h-4" />
                            Hybrid Mode
                          </div>
                          <p className="text-xs mt-1 opacity-80">Documents + General Knowledge</p>
                        </button>
                        <button
                          onClick={() => setRagMode('document-only')}
                          className={`flex-1 px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
                            ragMode === 'document-only'
                              ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          <div className="flex items-center justify-center gap-2">
                            <FileText className="w-4 h-4" />
                            Document Only
                          </div>
                          <p className="text-xs mt-1 opacity-80">Strict document grounding</p>
                        </button>
                      </div>
                    </div>

                    {/* Top-K Slider */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Layers className="w-4 h-4" />
                            Chunks to Retrieve (Top-K)
                          </div>
                          <span className="text-blue-600 font-semibold">{topK}</span>
                        </div>
                      </label>
                      <input
                        type="range"
                        min="3"
                        max="15"
                        step="1"
                        value={topK}
                        onChange={(e) => setTopK(parseInt(e.target.value))}
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
                      />
                      <div className="flex justify-between text-xs text-slate-500 mt-1">
                        <span>3 (Fast)</span>
                        <span>15 (Thorough)</span>
                      </div>
                    </div>

                    {/* Similarity Threshold Slider */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Target className="w-4 h-4" />
                            Similarity Threshold
                          </div>
                          <span className="text-blue-600 font-semibold">{similarityThreshold.toFixed(2)}</span>
                        </div>
                      </label>
                      <input
                        type="range"
                        min="0.3"
                        max="0.9"
                        step="0.05"
                        value={similarityThreshold}
                        onChange={(e) => setSimilarityThreshold(parseFloat(e.target.value))}
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
                      />
                      <div className="flex justify-between text-xs text-slate-500 mt-1">
                        <span>0.3 (Loose)</span>
                        <span>0.9 (Strict)</span>
                      </div>
                    </div>

                    {/* Temperature Slider */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Thermometer className="w-4 h-4" />
                            Temperature (Creativity)
                          </div>
                          <span className="text-blue-600 font-semibold">{temperature.toFixed(2)}</span>
                        </div>
                      </label>
                      <input
                        type="range"
                        min="0.0"
                        max="1.0"
                        step="0.1"
                        value={temperature}
                        onChange={(e) => setTemperature(parseFloat(e.target.value))}
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
                      />
                      <div className="flex justify-between text-xs text-slate-500 mt-1">
                        <span>0.0 (Focused)</span>
                        <span>1.0 (Creative)</span>
                      </div>
                    </div>

                    {/* Model Selector */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4" />
                          LLM Model
                        </div>
                      </label>
                      <select
                        value={model}
                        onChange={(e) => setModel(e.target.value)}
                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                      >
                        <option value="llama-3.3-70b-versatile">Llama 3.3 70B (Recommended)</option>
                        <option value="llama-3.1-70b-versatile">Llama 3.1 70B</option>
                        <option value="mixtral-8x7b-32768">Mixtral 8x7B</option>
                        <option value="gemma2-9b-it">Gemma 2 9B</option>
                      </select>
                    </div>
                  </div>

                  <div className="mt-6 pt-6 border-t border-slate-200">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Sparkles className="w-4 h-4" />
                      <span>Settings are auto-saved and persist per session</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Input Area - Gemini Style */}
          <div className="border-t border-slate-200 bg-gradient-to-b from-white to-slate-50 p-6">
            <div className="max-w-4xl mx-auto">
              {/* Main Input Container */}
              <div className="relative bg-white rounded-2xl shadow-lg border border-slate-200 hover:border-slate-300 transition-all duration-200">
                <div className="flex items-end gap-3 p-4">
                  {/* Mode Selector Dropdown */}
                  <div className="relative" ref={dropdownRef}>
                    <button
                      onClick={() => setShowModeDropdown(!showModeDropdown)}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 border border-blue-200 transition-all duration-200 group"
                    >
                      {selectedMode === 'chat' ? (
                        <>
                          <MessageCircle className="w-5 h-5 text-blue-600" />
                          <span className="font-medium text-blue-900 text-sm">Chat</span>
                        </>
                      ) : (
                        <>
                          <ImageIcon className="w-5 h-5 text-purple-600" />
                          <span className="font-medium text-purple-900 text-sm">Image</span>
                        </>
                      )}
                      <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showModeDropdown ? 'rotate-180' : ''} ${selectedMode === 'chat' ? 'text-blue-600' : 'text-purple-600'}`} />
                    </button>

                    {/* Dropdown Menu */}
                    {showModeDropdown && (
                      <div className="absolute bottom-full left-0 mb-2 w-72 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
                        {/* Chat Mode */}
                        <button
                          onClick={() => {
                            setSelectedMode('chat');
                            setShowModeDropdown(false);
                          }}
                          className="w-full px-4 py-3 flex items-start gap-3 hover:bg-blue-50 transition-colors group"
                        >
                          <div className="p-2 rounded-lg bg-blue-100 group-hover:bg-blue-200 transition-colors">
                            <MessageCircle className="w-5 h-5 text-blue-600" />
                          </div>
                          <div className="flex-1 text-left">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-900">Chat Mode</span>
                              {selectedMode === 'chat' && <Check className="w-4 h-4 text-blue-600" />}
                            </div>
                            <p className="text-xs text-slate-600 mt-0.5">Conversational AI powered by Groq</p>
                          </div>
                        </button>

                        <div className="h-px bg-slate-200" />

                        {/* Image Mode */}
                        <button
                          onClick={() => {
                            setSelectedMode('image');
                            setShowModeDropdown(false);
                          }}
                          className="w-full px-4 py-3 flex items-start gap-3 hover:bg-purple-50 transition-colors group"
                        >
                          <div className="p-2 rounded-lg bg-purple-100 group-hover:bg-purple-200 transition-colors">
                            <ImageIcon className="w-5 h-5 text-purple-600" />
                          </div>
                          <div className="flex-1 text-left">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-900">Image Generation</span>
                              {selectedMode === 'image' && <Check className="w-4 h-4 text-purple-600" />}
                            </div>
                            <p className="text-xs text-slate-600 mt-0.5">Create images with Gemini Imagen 3.0</p>
                          </div>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Document Upload Button */}
                  {selectedMode === 'chat' && (
                    <>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.docx,.txt,.md"
                        onChange={handleDocumentUpload}
                        className="hidden"
                      />
                      <div className="relative group">
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isUploading}
                          className="p-3 rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100 border border-green-200 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed relative"
                          title="Upload document (PDF, DOCX, TXT, MD)"
                        >
                          {isUploading ? (
                            <RefreshCw className="w-5 h-5 text-green-600 animate-spin" />
                          ) : (
                            <Paperclip className="w-5 h-5 text-green-600" />
                          )}
                          {uploadedDocuments.length > 0 && (
                            <span className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                              {uploadedDocuments.length}
                            </span>
                          )}
                        </button>

                        {/* Document Preview Popup on Hover */}
                        {uploadedDocuments.length > 0 && (
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-3 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none group-hover:pointer-events-auto z-50">
                            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 w-80 max-h-96 overflow-y-auto">
                              <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-200">
                                <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                                  <FileText className="w-4 h-4 text-green-600" />
                                  Uploaded Documents ({uploadedDocuments.length})
                                </h3>
                              </div>

                              <div className="space-y-2">
                                {uploadedDocuments.map((doc, index) => (
                                  <div
                                    key={doc.doc_id}
                                    className="flex items-start gap-3 p-3 rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100 transition-all duration-200 border border-green-200"
                                  >
                                    <div className="p-2 rounded-lg bg-white shadow-sm">
                                      <FileText className="w-4 h-4 text-green-600" />
                                    </div>

                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium text-slate-900 truncate">
                                        {doc.filename}
                                      </p>
                                      <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                                        <span>{doc.file_type.toUpperCase()}</span>
                                        <span>•</span>
                                        <span>{(doc.size_bytes / 1024).toFixed(1)} KB</span>
                                        <span>•</span>
                                        <span>{doc.chunk_count} chunks</span>
                                      </div>
                                      {doc.page_count && (
                                        <div className="text-xs text-slate-500 mt-1">
                                          {doc.page_count} pages
                                        </div>
                                      )}
                                    </div>

                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        deleteDocument(doc.doc_id);
                                      }}
                                      className="p-1.5 rounded-lg hover:bg-red-100 text-slate-400 hover:text-red-600 transition-colors"
                                      title="Delete document"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ))}
                              </div>

                              <div className="mt-3 pt-3 border-t border-slate-200 text-center">
                                <p className="text-xs text-slate-500">
                                  Click the button to upload more documents
                                </p>
                              </div>
                            </div>

                            {/* Arrow pointer */}
                            <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                              <div className="w-3 h-3 bg-white border-r border-b border-slate-200 transform rotate-45"></div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Settings Button (only show when documents are uploaded) */}
                      {uploadedDocuments.length > 0 && (
                        <button
                          onClick={() => setShowSettingsPanel(!showSettingsPanel)}
                          className={`p-3 rounded-xl transition-all duration-200 ${
                            showSettingsPanel
                              ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white'
                              : 'bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 border border-blue-200'
                          }`}
                          title="Document RAG Settings"
                        >
                          <Sliders className={`w-5 h-5 ${showSettingsPanel ? 'text-white' : 'text-blue-600'}`} />
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1 bg-slate-800 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                            RAG Settings
                          </div>
                        </button>
                      )}
                    </>
                  )}

                  {/* Text Input */}
                  <div className="flex-1 min-w-0">
                    <textarea
                      ref={chatInputRef}
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={handleKeyPress}
                      placeholder={selectedMode === 'chat'
                        ? uploadedDocuments.length > 0
                          ? "Ask questions about your documents or anything else..."
                          : "Ask me anything about programming, engineering, or request code help..."
                        : "Describe the image you want to generate..."}
                      className="w-full px-2 py-2 bg-transparent focus:outline-none resize-none max-h-32 text-slate-900 placeholder-slate-400 text-base"
                      rows={1}
                      disabled={isChatLoading || isImageLoading}
                    />
                  </div>

                  {/* Send Button */}
                  <button
                    onClick={() => {
                      console.log('🎯 Send button clicked - Mode:', selectedMode, 'Input:', chatInput.substring(0, 50));

                      if (!chatInput.trim()) {
                        console.log('❌ Empty input');
                        return;
                      }

                      if (selectedMode === 'image') {
                        console.log('🎨 Routing to image generation');
                        generateImageFromPrompt(chatInput);
                        setChatInput('');
                      } else {
                        console.log('💬 Routing to chat');
                        sendChatMessage(chatInput);
                        setChatInput('');
                      }
                    }}
                    disabled={!chatInput.trim() || isChatLoading || isImageLoading}
                    className={`p-3 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                      selectedMode === 'chat'
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/30'
                        : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg shadow-purple-500/30'
                    }`}
                  >
                    {isChatLoading || isImageLoading ? (
                      <RefreshCw className="w-5 h-5 animate-spin" />
                    ) : selectedMode === 'image' ? (
                      <Sparkles className="w-5 h-5" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                  </button>
                </div>

                {/* Bottom Info Bar */}
                <div className="px-4 pb-3 pt-1 flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-2">
                    <kbd className="px-2 py-1 bg-slate-100 rounded text-xs border border-slate-200">Enter</kbd>
                    <span>to send</span>
                    <span className="text-slate-300">•</span>
                    <kbd className="px-2 py-1 bg-slate-100 rounded text-xs border border-slate-200">Shift + Enter</kbd>
                    <span>for new line</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>{chatInput.length} chars</span>
                    <span className="text-slate-300">•</span>
                    <span>~{Math.ceil(chatInput.split(' ').length * 1.3)} tokens</span>
                  </div>
                </div>
              </div>

              {/* Mode Indicator */}
              <div className="mt-3 text-center">
                {selectedMode === 'chat' ? (
                  <p className="text-xs text-slate-500 flex items-center justify-center gap-1">
                    <Wifi className="w-3 h-3" />
                    Chat mode active • Powered by llama-3.3-70b-versatile
                  </p>
                ) : (
                  <p className="text-xs text-slate-500 flex items-center justify-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    Image generation mode • Powered by Gemini Imagen 3.0 Fast
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
export default function ChatCodePage() {
  return (
    <ServiceLoader feature="chatandcode">
      <ChatCodePageContent />
    </ServiceLoader>
  );
}
