import { NextRequest, NextResponse } from 'next/server';
import { getDocumentByIdNoAuth } from '@/lib/supabase/document-storage-no-auth';
import { ChatService, ChatMessage } from '@/lib/database/mongodb';

// Configuration for CS-Enhanced RAG Backend
const RAG_BACKEND_URL = process.env.RAG_BACKEND_URL || 'http://localhost:8000';
const RAG_API_KEY = process.env.RAG_API_KEY;

interface CSRagRequest {
  question: string;
  session_id?: string;
  use_web_search?: boolean;
  temperature?: number;
  max_sources?: number;
}

interface CSRagResponse {
  success: boolean;
  answer: string;
  confidence: number;
  source_type: string;
  sources: Array<{
    type: string;
    title?: string;
    url?: string;
    document_id?: string;
    confidence: number;
    content: string;
  }>;
  session_id: string;
  message_id: string;
  response_time: number;
  token_usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  cs_enhanced: boolean;
}

async function callCSRagBackend(documentId: string, request: CSRagRequest): Promise<CSRagResponse> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (RAG_API_KEY) {
    headers['Authorization'] = `Bearer ${RAG_API_KEY}`;
  }

  const response = await fetch(`${RAG_BACKEND_URL}/api/v1/documents/${documentId}/qa`, {
    method: 'POST',
    headers,
    body: JSON.stringify(request),
    // Timeout after 30 seconds
    signal: AbortSignal.timeout(30000)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`RAG Backend error: ${response.status} - ${errorData.detail || 'Unknown error'}`);
  }

  return await response.json();
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const startTime = Date.now();
  
  try {
    const documentId = params.id;
    const { 
      question, 
      sessionId, 
      useWebSearch = true,
      temperature = 0.5,
      maxSources = 5 
    } = await request.json();

    if (!documentId || !question) {
      return NextResponse.json(
        { error: 'Document ID and question are required' },
        { status: 400 }
      );
    }

    // Validate question length
    if (question.length > 2000) {
      return NextResponse.json(
        { error: 'Question too long. Maximum 2000 characters allowed.' },
        { status: 400 }
      );
    }

    // Get the document to verify it exists
    const document = await getDocumentByIdNoAuth(documentId);

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Check if document is processed and ready for Q&A
    if (document.status !== 'processed') {
      return NextResponse.json(
        { 
          error: 'Document is not ready for Q&A',
          currentStatus: document.status,
          suggestion: 'Please wait for document processing to complete'
        },
        { status: 400 }
      );
    }

    console.log(`🤖 CS-RAG: Processing question for document ${documentId}`);
    
    // Get or create chat session
    const chatSession = await ChatService.getOrCreateSession(
      documentId,
      undefined, // userId - could be extracted from auth header
      {
        name: document.name,
        type: document.type,
        category: document.category
      }
    );
    
    const actualSessionId = sessionId || chatSession.sessionId;
    
    // Save user message to MongoDB
    const userMessage: Omit<ChatMessage, '_id'> = {
      sessionId: actualSessionId,
      documentId,
      role: 'user',
      content: question,
      timestamp: new Date(),
      messageId: `msg_user_${Date.now()}`
    };
    
    await ChatService.saveMessage(userMessage);
    
    try {
      // Call CS-Enhanced RAG Backend
      const ragResponse = await callCSRagBackend(documentId, {
        question,
        session_id: actualSessionId,
        use_web_search: useWebSearch,
        temperature,
        max_sources: maxSources
      });

      // Transform sources for frontend compatibility
      const transformedSources = ragResponse.sources.map((source, index) => ({
        id: `source_${index}`,
        type: source.type,
        title: source.title || document.name,
        url: source.url,
        pageNumber: source.type === 'document' ? 1 : undefined,
        content: source.content,
        confidence: source.confidence,
        documentId: source.document_id || documentId
      }));

      const processingTime = Date.now() - startTime;

      // Save assistant message to MongoDB
      const assistantMessage: Omit<ChatMessage, '_id'> = {
        sessionId: actualSessionId,
        documentId,
        role: 'assistant',
        content: ragResponse.answer,
        timestamp: new Date(),
        messageId: ragResponse.message_id,
        confidence: ragResponse.confidence,
        sourceType: ragResponse.source_type,
        sources: ragResponse.sources,
        processingTime,
        tokenUsage: ragResponse.token_usage,
        csEnhanced: ragResponse.cs_enhanced,
        ragVersion: '2.0-cs-enhanced',
        processingMode: ragResponse.source_type === 'hybrid' ? 'Document + Web' : 
                       ragResponse.source_type === 'web_primary' ? 'Web-first' : 'Document-only'
      };

      await ChatService.saveMessage(assistantMessage);

      // Enhanced response with CS-RAG metadata
      const response = {
        success: true,
        answer: ragResponse.answer,
        sources: transformedSources,
        confidence: ragResponse.confidence,
        sessionId: actualSessionId,
        messageId: ragResponse.message_id,
        responseTime: processingTime,
        tokenUsage: ragResponse.token_usage,
        // CS-Enhanced metadata
        csEnhanced: ragResponse.cs_enhanced,
        sourceType: ragResponse.source_type,
        processingMode: ragResponse.source_type === 'hybrid' ? 'Document + Web' : 
                       ragResponse.source_type === 'web_primary' ? 'Web-first' : 'Document-only',
        ragVersion: '2.0-cs-enhanced',
        documentInfo: {
          id: documentId,
          name: document.name,
          type: document.type,
          category: document.category
        },
        // Chat metadata
        chatPersisted: true,
        totalMessages: (await ChatService.getChatHistory(actualSessionId)).length
      };

      console.log(`✅ CS-RAG: Completed in ${processingTime}ms, confidence: ${ragResponse.confidence.toFixed(3)}, mode: ${ragResponse.source_type}`);
      console.log(`💾 Chat saved: ${userMessage.messageId} & ${assistantMessage.messageId} to session ${actualSessionId}`);
      
      return NextResponse.json(response);

    } catch (ragError: any) {
      console.error('🚨 CS-RAG Backend Error:', ragError);
      
      // Fallback to basic response if RAG backend fails
      const fallbackAnswer = `I apologize, but I'm having trouble accessing the advanced CS-enhanced analysis system right now. 

Based on the document "${document.name}", I can provide basic assistance with your question: "${question}"

For full CS-enhanced responses including web search integration, code analysis, and technical explanations, please try again in a moment when the system is fully operational.`;

      const fallbackSources = [{
        id: 'fallback_source',
        type: 'document',
        title: document.name,
        pageNumber: 1,
        content: "Fallback response - full document analysis temporarily unavailable",
        confidence: 0.5,
        documentId: documentId
      }];

      // Save fallback assistant message to MongoDB
      const fallbackAssistantMessage: Omit<ChatMessage, '_id'> = {
        sessionId: actualSessionId,
        documentId,
        role: 'assistant',
        content: fallbackAnswer,
        timestamp: new Date(),
        messageId: `msg_fallback_${Date.now()}`,
        confidence: 0.5,
        sourceType: 'fallback',
        sources: fallbackSources.map(s => ({
          type: s.type,
          title: s.title,
          confidence: s.confidence,
          content: s.content
        })),
        processingTime: Date.now() - startTime,
        tokenUsage: {
          promptTokens: question.length,
          completionTokens: fallbackAnswer.length,
          totalTokens: question.length + fallbackAnswer.length
        },
        csEnhanced: false,
        ragVersion: '1.0-fallback',
        processingMode: 'Fallback'
      };

      await ChatService.saveMessage(fallbackAssistantMessage);

      return NextResponse.json({
        success: true,
        answer: fallbackAnswer,
        sources: fallbackSources,
        confidence: 0.5,
        sessionId: actualSessionId,
        messageId: fallbackAssistantMessage.messageId,
        responseTime: Date.now() - startTime,
        tokenUsage: {
          promptTokens: question.length,
          completionTokens: fallbackAnswer.length,
          totalTokens: question.length + fallbackAnswer.length
        },
        // Indicate this is a fallback response
        csEnhanced: false,
        sourceType: 'fallback',
        processingMode: 'Fallback',
        ragVersion: '1.0-fallback',
        warning: 'CS-Enhanced RAG temporarily unavailable - using fallback response',
        documentInfo: {
          id: documentId,
          name: document.name,
          type: document.type,
          category: document.category
        },
        // Chat metadata
        chatPersisted: true,
        totalMessages: (await ChatService.getChatHistory(actualSessionId)).length
      });
    }

  } catch (error: any) {
    console.error('❌ Q&A Processing Error:', error);
    
    const processingTime = Date.now() - startTime;
    
    return NextResponse.json(
      { 
        error: 'Q&A processing failed',
        details: error.message,
        processingTime,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// Get Q&A history for a document
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const documentId = params.id;
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!documentId) {
      return NextResponse.json(
        { error: 'Document ID is required' },
        { status: 400 }
      );
    }

    console.log(`📜 Fetching chat history for document ${documentId}, session: ${sessionId || 'all'}`);

    let messages: ChatMessage[] = [];
    let chatSessions: any[] = [];

    if (sessionId) {
      // Get specific session history
      messages = await ChatService.getChatHistory(sessionId, limit, offset);
    } else {
      // Get all sessions for the document
      chatSessions = await ChatService.getDocumentSessions(documentId);
      
      // If there are sessions, get the most recent one's messages
      if (chatSessions.length > 0) {
        const mostRecentSession = chatSessions[0];
        messages = await ChatService.getChatHistory(mostRecentSession.sessionId, limit, offset);
      }
    }

    // Get document chat statistics
    const chatStats = await ChatService.getDocumentChatStats(documentId);

    // Format messages for frontend
    const formattedMessages = messages.map(msg => ({
      id: msg.messageId,
      sessionId: msg.sessionId,
      role: msg.role,
      content: msg.content,
      timestamp: msg.timestamp.toISOString(),
      confidence: msg.confidence,
      sourceType: msg.sourceType,
      sources: msg.sources || [],
      processingTime: msg.processingTime,
      tokenUsage: msg.tokenUsage,
      csEnhanced: msg.csEnhanced,
      ragVersion: msg.ragVersion
    }));

    console.log(`✅ Retrieved ${messages.length} messages from ${chatSessions.length} sessions`);

    return NextResponse.json({
      success: true,
      messages: formattedMessages,
      sessionId: sessionId || (chatSessions[0]?.sessionId),
      documentId,
      chatStats: {
        totalSessions: chatStats.totalSessions,
        totalMessages: chatStats.totalMessages,
        lastActivity: chatStats.lastActivity?.toISOString(),
        mostActiveSession: chatStats.mostActiveSession
      },
      sessions: chatSessions.map(session => ({
        sessionId: session.sessionId,
        title: session.title,
        createdAt: session.createdAt.toISOString(),
        updatedAt: session.updatedAt.toISOString(),
        messageCount: session.messageCount,
        isActive: session.isActive
      })),
      pagination: {
        limit,
        offset,
        hasMore: messages.length === limit
      }
    });
  } catch (error: any) {
    console.error('❌ Get Q&A history error:', error);
    return NextResponse.json(
      { error: 'Failed to get Q&A history', details: error.message },
      { status: 500 }
    );
  }
}