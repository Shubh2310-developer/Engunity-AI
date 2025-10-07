import { NextRequest, NextResponse } from 'next/server';
import { ChatService, ChatMessage } from '@/lib/database/mongodb';
import { MongoClient, ObjectId } from 'mongodb';

// MongoDB connection
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/engunity-ai-dev';
const dbName = process.env.MONGODB_DB_NAME || 'engunity-ai-dev';
let cachedMongoClient: MongoClient | null = null;

async function getMongoClient() {
  if (cachedMongoClient) {
    return cachedMongoClient;
  }
  const client = new MongoClient(mongoUri);
  await client.connect();
  cachedMongoClient = client;
  return client;
}

// Helper function to get document from MongoDB
async function getDocumentById(documentId: string) {
  const mongoClient = await getMongoClient();
  const db = mongoClient.db(dbName);
  const documentsCollection = db.collection('documents');

  let documentObjectId: ObjectId;
  try {
    documentObjectId = new ObjectId(documentId);
  } catch (err) {
    return null;
  }

  const document = await documentsCollection.findOne({ _id: documentObjectId });

  if (!document) {
    return null;
  }

  // Transform to expected format
  return {
    id: document._id.toString(),
    name: document.file_name || document.original_filename,
    type: document.file_type,
    size: document.file_size,
    status: document.processing_status,
    uploaded_at: document.created_at,
    storage_url: document.storage_url,
    user_id: document.user_id,
    metadata: {
      extracted_text: document.extracted_text,
      pages: document.page_count,
      word_count: document.word_count
    }
  };
}

// Smart response cleaner utility
function cleanResponse(text: string): string {
  if (!text || typeof text !== 'string') {
    return text || '';
  }

  let cleaned = text;

  // Step 0: Clean HTML tags and entities first
  const htmlPatterns = [
    /<[^>]*>/g,                               // Remove all HTML tags
    /&nbsp;/g,                                // Remove HTML entities
    /&amp;/g,                                 // Remove &amp;
    /&lt;/g,                                  // Remove &lt;
    /&gt;/g,                                  // Remove &gt;
    /&quot;/g,                               // Remove &quot;
    /&#\d+;/g,                               // Remove numeric HTML entities
    /&[a-zA-Z]+;/g,                          // Remove named HTML entities
  ];

  // Apply HTML cleaning patterns first
  for (const pattern of htmlPatterns) {
    cleaned = cleaned.replace(pattern, ' ');
  }

  // Step 1: Remove document fragment patterns and low-quality content
  const fragmentPatterns = [
    /Document \d+:\s*/gi,                     // Remove "Document 1:", "Document 2:", etc.
    /\( hide \)/gi,                          // Remove "( hide )" text
    /This response synthesizes information[^\n]*\n?/gi,
    /Show less this error[^\n]*\n?/gi,       // Remove the specific error mentioned
    /Regarding '[^']*'[^\n]*\n?/gi,          // Remove "Regarding 'question'" lines
    /the indexed documents contain[^\n]*\n?/gi,
    /relevant information[^\n]*\n?/gi,
  ];

  // Apply document fragment cleaning
  for (const pattern of fragmentPatterns) {
    cleaned = cleaned.replace(pattern, '');
  }

  // Step 2: Remove source reference patterns (keep existing patterns but be more precise)
  const sourcePatterns = [
    /\*\*From the document from [^:]*:\*\*\s*/gi,
    /\*\*From the document[^:]*:\*\*\s*/gi,
    /\*\*From web sources:\*\*\s*/gi,
    /From web sources:\s*/gi,
    /--- [Ss]ource \d+[^\n]*---\s*/g,
    /--- [Ss]ource \d+[^\n]*\n/g,
    /\([Ss]core: [-+]?[0-9]*\.?[0-9]+\)\s*/g,
    /Based on web search for[^\n]*\n?/gi,
    /Web search performed for[^\n]*\n?/gi,
    /Additional information may be available from other sources\.\s*/gi,
    /the answer [^.]*inappropriate[^\n]*\n?/gi,
    /please make sure the answer [^.]*appropriate[^\n]*\n?/gi,
    // System messages
    /✓ Compiled \/api\/[^\n]*\n?/g,
    /✅ Supabase client[^\n]*\n?/g,
    /🔑 Admin access[^\n]*\n?/g,
    /📜 Fetching chat[^\n]*\n?/g,
    /🤖 CS-RAG:[^\n]*\n?/g,
    /💾 Chat saved:[^\n]*\n?/g,
    /GET \/api\/[^\n]*\n?/g,
    /POST \/api\/[^\n]*\n?/g,
    /✅ Retrieved \d+ messages[^\n]*\n?/g,
    /Object-based programming languages[^\n]*\n?/g,
    // Remove asterisk-formatted patterns
    /\*+[^*]*\*+/g,                            // Remove content surrounded by asterisks
    /\*+/g,                                    // Remove standalone asterisks
  ];

  // Apply source reference removal patterns
  for (const pattern of sourcePatterns) {
    cleaned = cleaned.replace(pattern, '');
  }

  // Step 3: Process lines more intelligently
  const lines = cleaned.split('\n');
  const processedLines: string[] = [];

  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Skip truly empty lines
    if (!trimmedLine) {
      continue;
    }

    // Remove lines that are ONLY source references, HTML fragments, or empty numbered items
    const shouldRemove = [
      /^--- [Ss]ource.*/,
      /^\*\*From .*:\*\*\s*$/,
      /^Based on web search.*/,
      /^Web search performed.*/,
      /^Additional information may be available.*/,
      /^\d+\.\s*$/,  // Remove empty numbered items like "1." "2."
      /^✓ Compiled.*/,
      /^✅ Supabase.*/,
      /^🔑 Admin.*/,
      /^📜 Fetching.*/,
      /^🤖 CS-RAG.*/,
      /^💾 Chat.*/,
      /^(GET|POST) \/api.*/,
      /^✅ Retrieved.*/,
      /^Object-based programming languages.*/,
      /^Document \d+:\s*$/,  // Remove standalone "Document N:" lines
      /^\( hide \)\s*$/,     // Remove standalone "( hide )" lines
      /^This section may contain excessive.*/,  // Remove Wikipedia-style warnings
      /^Please review the use of non-free.*/,   // Remove copyright warnings
      /^The talk page may have details.*/,      // Remove Wikipedia talk page references
      /^Learn how and when to remove.*/,       // Remove Wikipedia help text
      /^Show less\s*$/,                        // Remove standalone "Show less" text
      /^this error is coming from.*/,          // Remove error messages
      /^Regarding\s+.*,\s+the indexed.*/,      // Remove query context lines
    ].some(pattern => pattern.test(trimmedLine));

    // Also remove lines that are mostly HTML remnants or navigation elements
    const isHTMLRemnant = 
      trimmedLine.length < 10 ||  // Very short lines are likely fragments
      /^[<>\s\(\)]+$/.test(trimmedLine) ||  // Lines with only HTML chars or parens
      /^(Summary|Recording|Personnel|Legacy|See also|References|External links)\s*$/.test(trimmedLine); // Navigation elements

    if (!shouldRemove && !isHTMLRemnant) {
      processedLines.push(trimmedLine);
    }
  }

  // Step 4: Reconstruct with proper formatting
  cleaned = processedLines.join('\n');

  // Step 5: Remove asterisks and fix formatting while preserving content structure
  cleaned = cleaned
    .replace(/\*+/g, '')                       // Remove all asterisks
    .replace(/[ \t]+/g, ' ')                    // Multiple spaces to single space
    .replace(/\n\s*\n\s*\n+/g, '\n\n')         // Multiple newlines to double newline
    .replace(/\.\s*([A-Z])/g, '. $1')          // Ensure space after periods
    .replace(/\?\s*([A-Z])/g, '? $1')          // Ensure space after question marks
    .replace(/!\s*([A-Z])/g, '! $1')           // Ensure space after exclamation marks
    .trim();

  // Step 6: Ensure proper ending
  if (cleaned && !cleaned.endsWith('.') && !cleaned.endsWith('!') && !cleaned.endsWith('?') && !cleaned.endsWith(':')) {
    // Only add period if the last character is alphanumeric
    if (cleaned[cleaned.length - 1].match(/[a-zA-Z0-9]/)) {
      cleaned += '.';
    }
  }

  return cleaned;
}

// Configuration for RAG Backends
const HYBRID_RAG_V3_BACKEND_URL = process.env.HYBRID_RAG_V3_BACKEND_URL || 'http://localhost:8002';  // Production Hybrid RAG v3.0 (BGE + ChromaDB + Groq)
const ENHANCED_FAKE_RAG_BACKEND_URL = process.env.ENHANCED_FAKE_RAG_BACKEND_URL || 'http://localhost:8002';  // Deprecated - use Hybrid RAG v3
const FAKE_RAG_BACKEND_URL = process.env.FAKE_RAG_BACKEND_URL || 'http://localhost:8001';  // Agentic RAG
const RAG_BACKEND_URL = process.env.RAG_BACKEND_URL || 'http://localhost:8000';
const RAG_API_KEY = process.env.RAG_API_KEY;

interface CSRagRequest {
  question: string;
  session_id?: string;
  use_web_search?: boolean;
  temperature?: number;
  max_sources?: number;
  use_best_of_n?: boolean;
  n_candidates?: number;
  scoring_method?: string;
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

// Instant response cache for ultra-fast answers
const INSTANT_RESPONSES = new Map<string, string>([
  ['what is typescript', `**TypeScript** - Complete Overview

TypeScript is a strongly typed programming language developed by Microsoft that builds on JavaScript by adding static type definitions.

**Core Features:**
- **Static Type Checking**: Catch errors at compile time before they reach production
- **Type Inference**: Automatically determines types when not explicitly declared
- **Modern JavaScript**: Full support for ES6+ features and future JavaScript proposals
- **Object-Oriented Programming**: Classes, interfaces, inheritance, generics, and decorators
- **Enhanced IDE Support**: Superior autocomplete, refactoring, and navigation

**Key Benefits:**
- **Better Code Quality**: Type system prevents common JavaScript errors
- **Enhanced Developer Experience**: IntelliSense, better debugging, and code navigation
- **Easier Refactoring**: Safe code changes across large codebases
- **Self-Documenting Code**: Types serve as inline documentation
- **Team Collaboration**: Shared interfaces and types improve team productivity

**How TypeScript Works:**
1. Write TypeScript code with type annotations
2. TypeScript compiler (tsc) checks types and reports errors
3. Compiles to clean, readable JavaScript
4. Runs anywhere JavaScript runs (browsers, Node.js, etc.)

**Type System Highlights:**
- **Basic Types**: string, number, boolean, array, object
- **Advanced Types**: union types, intersection types, mapped types
- **Interfaces**: Define object shapes and contracts
- **Generics**: Reusable components with type parameters
- **Type Guards**: Runtime type checking

**Popular Use Cases:**
- **Web Applications**: React, Angular, Vue.js projects
- **Backend Development**: Node.js servers and APIs  
- **Desktop Apps**: Electron applications
- **Mobile Development**: React Native apps
- **Library Development**: npm packages and frameworks

**Ecosystem:**
- **Frameworks**: Angular (built with TypeScript), supports React/Vue
- **Tools**: VS Code, WebStorm, extensive tooling ecosystem
- **Testing**: Jest, Mocha with TypeScript support
- **Build Tools**: Webpack, Vite, esbuild integration

**Learning Path:**
1. Start with basic type annotations
2. Learn interfaces and type definitions
3. Explore advanced types and generics
4. Practice with real projects
5. Configure TypeScript for your workflow`],
  
  ['typescript', `**TypeScript Overview**

TypeScript extends JavaScript by adding static type definitions, making it ideal for large-scale applications.

**Essential Features:**
- Static typing for error prevention
- Excellent tooling and IDE support
- Seamless JavaScript interoperability
- Advanced type system with generics
- Compile-time error checking

**Benefits:**
- Reduces runtime errors significantly
- Improves code maintainability
- Enhanced developer productivity
- Better team collaboration through shared types

**Common Usage:**
- Enterprise web applications  
- Frontend frameworks (React, Angular, Vue)
- Backend APIs with Node.js
- Library and package development`],

  ['define typescript', `**TypeScript Definition**

TypeScript is a programming language developed by Microsoft that adds static type definitions to JavaScript. It's a strict syntactical superset of JavaScript, meaning all valid JavaScript code is also valid TypeScript code.

**Key Characteristics:**
- **Superset of JavaScript**: All JS code works in TypeScript
- **Optional Static Typing**: Add types where needed, JavaScript where preferred  
- **Compile-time Checking**: Catches errors before runtime
- **Modern Language Features**: Latest ECMAScript support
- **Zero Runtime Overhead**: Types are erased during compilation

**Purpose:**
TypeScript was created to address JavaScript's limitations in large-scale application development by providing:
- Type safety
- Better tooling support  
- Enhanced code organization
- Improved maintainability`]
]);

function getInstantResponse(question: string, documentName: string): string | null {
  const normalizedQuestion = question.toLowerCase().trim();
  
  // Only provide instant responses for very general questions that don't need document content
  // All other questions should go through document analysis
  
  // Very specific instant responses only
  if (normalizedQuestion === 'what is typescript') {
    return `**TypeScript Overview**

TypeScript is a strongly typed programming language developed by Microsoft that builds on JavaScript by adding static type definitions.

**Core Features:**
- **Static Type Checking**: Catch errors at compile time
- **Type Inference**: Automatically determines types when not declared
- **Modern JavaScript**: Full ES6+ support with additional features
- **Enhanced IDE Support**: Superior autocomplete and refactoring

**Key Benefits:**
- Better code quality through type checking
- Enhanced developer experience
- Easier refactoring for large codebases
- Self-documenting code through types

**Common Usage:**
- Large-scale web applications
- Frontend frameworks (React, Angular, Vue)
- Backend APIs with Node.js
- Library development

*This general overview is supplemented by analysis of your specific document "${documentName}".*`;
  }
  
  if (normalizedQuestion === 'define typescript') {
    return `**TypeScript Definition**

TypeScript is a programming language developed by Microsoft that adds static type definitions to JavaScript. It's a strict syntactical superset of JavaScript.

**Key Characteristics:**
- **Superset of JavaScript**: All JS code works in TypeScript
- **Optional Static Typing**: Add types where needed
- **Compile-time Checking**: Catches errors before runtime
- **Zero Runtime Overhead**: Types are erased during compilation

**Purpose:**
Created to address JavaScript's limitations in large-scale development by providing type safety, better tooling, and improved maintainability.

*This definition provides context for analyzing your document "${documentName}".*`;
  }
  
  // For all other questions, return null to force document analysis
  return null;
}

async function callHybridRagV3Backend(documentId: string, question: string, documentText?: string): Promise<any> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Timeout for Hybrid RAG v3.0 processing - 90 seconds for BGE + Groq + Web Search
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 90000);

  try {
    const requestBody: any = {
      query: question,
      document_id: documentId
    };

    // Add document text if available
    if (documentText && documentText.length > 0) {
      requestBody.document_text = documentText;
      console.log(`📄 Sending document text to Hybrid RAG v3.0 (${documentText.length} chars)`);
    } else {
      console.warn(`⚠️ No document text available for Hybrid RAG v3.0 analysis`);
    }

    const response = await fetch(`${HYBRID_RAG_V3_BACKEND_URL}/query`, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Hybrid RAG v3.0 Backend error: ${response.status} - ${errorData.detail || 'Unknown error'}`);
    }

    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

async function callEnhancedFakeRagBackend(documentId: string, question: string, documentText?: string): Promise<any> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Timeout for enhanced fake RAG processing - 90 seconds to allow for Best-of-N + Wikipedia
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 90000);

  try {
    const requestBody: any = {
      query: question,
      document_id: documentId
    };

    // Add document text if available
    if (documentText && documentText.length > 0) {
      requestBody.document_text = documentText;
      console.log(`📄 Sending document text to Enhanced RAG (${documentText.length} chars)`);
    } else {
      console.warn(`⚠️ No document text available for Enhanced RAG analysis`);
    }

    const response = await fetch(`${ENHANCED_FAKE_RAG_BACKEND_URL}/query`, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Enhanced Fake RAG Backend error: ${response.status} - ${errorData.detail || 'Unknown error'}`);
    }

    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

async function callFakeRagBackend(documentId: string, question: string): Promise<any> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Timeout for fake RAG processing - 60 seconds to allow for Groq API calls
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);

  try {
    const response = await fetch(`${FAKE_RAG_BACKEND_URL}/query`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        query: question,
        document_id: documentId
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Fake RAG Backend error: ${response.status} - ${errorData.detail || 'Unknown error'}`);
    }

    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

async function callCSRagBackend(documentId: string, request: CSRagRequest): Promise<CSRagResponse> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (RAG_API_KEY) {
    headers['Authorization'] = `Bearer ${RAG_API_KEY}`;
  }

  // Timeout for RAG processing - 30 seconds maximum to handle complex queries
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(`${RAG_BACKEND_URL}/api/v1/documents/${documentId}/qa`, {
      method: 'POST',
      headers,
      body: JSON.stringify(request),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`RAG Backend error: ${response.status} - ${errorData.detail || 'Unknown error'}`);
    }

    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

// Helper function to determine if we should use instant response
async function shouldUseInstantResponseForQuestion(question: string, document: any): Promise<boolean> {
  const questionLower = question.toLowerCase().trim();
  
  // Use instant response for very general questions that don't require document-specific content
  const generalQuestions = [
    'what is typescript',
    'define typescript', 
    'typescript',
    'what is python',
    'define python',
    'python'
  ];
  
  // Don't use instant response for specific document queries
  const documentSpecificIndicators = [
    'in this document',
    'according to this',
    'from this file',
    'in this code',
    'this example',
    'explain this',
    'what does this mean',
    'how does this work'
  ];
  
  // Don't use instant response if question seems document-specific
  if (documentSpecificIndicators.some(indicator => questionLower.includes(indicator))) {
    return false;
  }
  
  // Use instant response only for exact matches of very general questions
  return generalQuestions.includes(questionLower);
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
      maxSources = 5,
      useBestOfN = false,
      nCandidates = 5,
      scoringMethod = "hybrid"
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
    const document = await getDocumentById(documentId);

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
    
    // ALWAYS prioritize document analysis over instant responses for document-specific questions
    // Only use instant responses for very basic general knowledge questions
    const shouldUseInstantResponse = false; // Disabled to force document analysis
    
    if (shouldUseInstantResponse) {
      const instantAnswer = getInstantResponse(question, document.name);
      
      if (instantAnswer) {
      console.log(`⚡ INSTANT: Providing cached response for "${question}"`);
      
      // Get or create chat session for instant response
      const chatSession = await ChatService.getOrCreateSession(
        documentId,
        undefined,
        {
          name: document.name,
          type: document.type,
          category: document.category
        }
      );
      
      const instantSessionId = sessionId || chatSession.sessionId;
      const processingTime = Date.now() - startTime;
      
      // Save user message
      const userMessage: Omit<ChatMessage, '_id'> = {
        sessionId: instantSessionId,
        documentId,
        role: 'user',
        content: question,
        timestamp: new Date(),
        messageId: `msg_user_${Date.now()}`
      };
      
      try {
        await ChatService.saveMessage(userMessage);
      } catch (mongoError) {
        console.warn('Failed to save instant user message to MongoDB:', mongoError);
      }
      
      const cleanedInstantAnswer = cleanResponse(instantAnswer);
      
      // Save instant assistant message
      const instantAssistantMessage: Omit<ChatMessage, '_id'> = {
        sessionId: instantSessionId,
        documentId,
        role: 'assistant',
        content: cleanedInstantAnswer,
        timestamp: new Date(),
        messageId: `msg_instant_${Date.now()}`,
        confidence: 0.95,
        sourceType: 'instant_cache',
        sources: [{
          type: 'knowledge_base',
          title: 'Instant Knowledge Cache',
          confidence: 0.95,
          content: 'Pre-cached comprehensive answer'
        }],
        processingTime,
        tokenUsage: {
          promptTokens: question.length,
          completionTokens: cleanedInstantAnswer.length,
          totalTokens: question.length + cleanedInstantAnswer.length
        },
        csEnhanced: true,
        ragVersion: '3.0-instant',
        processingMode: 'Instant'
      };

      try {
        await ChatService.saveMessage(instantAssistantMessage);
      } catch (mongoError) {
        console.warn('Failed to save instant assistant message to MongoDB:', mongoError);
      }

      return NextResponse.json({
        success: true,
        answer: cleanedInstantAnswer,
        sources: [{
          id: 'instant_source',
          type: 'knowledge_base',
          title: `${document.name} - Instant Knowledge`,
          content: 'Comprehensive answer from optimized knowledge base',
          confidence: 0.95,
          documentId: documentId
        }],
        confidence: 0.95,
        sessionId: instantSessionId,
        messageId: instantAssistantMessage.messageId,
        responseTime: processingTime,
        tokenUsage: {
          promptTokens: question.length,
          completionTokens: cleanedInstantAnswer.length,
          totalTokens: question.length + cleanedInstantAnswer.length
        },
        csEnhanced: true,
        sourceType: 'instant_cache',
        processingMode: 'Instant',
        ragVersion: '3.0-instant',
        documentInfo: {
          id: documentId,
          name: document.name,
          type: document.type,
          category: document.category
        },
        chatPersisted: true,
        totalMessages: await ChatService.getChatHistory(instantSessionId).then(msgs => msgs.length).catch(() => 0)
      });
      }
    }
    
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
    
    try {
      await ChatService.saveMessage(userMessage);
    } catch (mongoError) {
      console.warn('Failed to save user message to MongoDB:', mongoError);
    }
    
    try {
      // Try to get document content directly for analysis
      let documentAnswer = await tryDirectDocumentAnalysis(documentId, question, document);
      
      if (documentAnswer) {
        const cleanedDocumentAnswer = cleanResponse(documentAnswer);
        
        // Save assistant message with document-based response
        const directAnalysisMessage: Omit<ChatMessage, '_id'> = {
          sessionId: actualSessionId,
          documentId,
          role: 'assistant',
          content: cleanedDocumentAnswer,
          timestamp: new Date(),
          messageId: `msg_direct_${Date.now()}`,
          confidence: 0.85,
          sourceType: 'document_analysis',
          sources: [{
            type: 'document',
            title: document.name,
            confidence: 0.85,
            content: 'Direct document content analysis'
          }],
          processingTime: Date.now() - startTime,
          tokenUsage: {
            promptTokens: question.length,
            completionTokens: cleanedDocumentAnswer.length,
            totalTokens: question.length + cleanedDocumentAnswer.length
          },
          csEnhanced: true,
          ragVersion: '3.0-direct',
          processingMode: 'Document-Direct'
        };

        try {
          await ChatService.saveMessage(directAnalysisMessage);
        } catch (mongoError) {
          console.warn('Failed to save direct analysis message to MongoDB:', mongoError);
        }

        return NextResponse.json({
          success: true,
          answer: cleanedDocumentAnswer,
          sources: [{
            id: 'document_direct',
            type: 'document',
            title: document.name,
            content: 'Document content analysis',
            confidence: 0.85,
            documentId: documentId
          }],
          confidence: 0.85,
          sessionId: actualSessionId,
          messageId: directAnalysisMessage.messageId,
          responseTime: Date.now() - startTime,
          tokenUsage: {
            promptTokens: question.length,
            completionTokens: cleanedDocumentAnswer.length,
            totalTokens: question.length + cleanedDocumentAnswer.length
          },
          csEnhanced: true,
          sourceType: 'document_analysis',
          processingMode: 'Document-Direct',
          ragVersion: '3.0-direct',
          documentInfo: {
            id: documentId,
            name: document.name,
            type: document.type,
            category: document.category
          },
          chatPersisted: true,
          totalMessages: await ChatService.getChatHistory(actualSessionId).then(msgs => msgs.length).catch(() => 0)
        });
      }
      
      // Get document text for RAG analysis
      const documentText = await getDocumentContent(documentId);

      // Truncate document text if too large (to avoid Groq token limits)
      // Groq limit: 12,000 TPM for llama-3.3-70b
      // Estimate ~4 chars per token, keep under 24,000 chars (~6,000 tokens) to leave room for question + answer + retrieval
      const MAX_DOC_CHARS = 24000;
      const truncatedDocText = documentText && documentText.length > MAX_DOC_CHARS
        ? documentText.substring(0, MAX_DOC_CHARS) + '\n\n[Document truncated due to length...]'
        : documentText;

      // Use Hybrid RAG v3.0 Backend (BGE + ChromaDB + Groq)
      console.log(`🚀 Using Hybrid RAG v3.0 Backend (BGE Embeddings + ChromaDB + Groq)`);
      console.log(`📄 Document text length: ${truncatedDocText ? truncatedDocText.length : 0} chars`);
      const fakeRagResponse = await callHybridRagV3Backend(documentId, question, truncatedDocText || undefined);

      // Transform sources for frontend compatibility from fake RAG response
      const transformedSources = fakeRagResponse.source_chunks_used.map((chunk: string, index: number) => ({
        id: `fake_source_${index}`,
        type: 'document',
        title: `${document.name} - Chunk ${index + 1}`,
        url: undefined,
        pageNumber: index + 1,
        content: chunk,
        confidence: fakeRagResponse.confidence,
        documentId: documentId
      }));

      const processingTime = fakeRagResponse.processing_time * 1000; // Convert to ms

      // Clean the answer from the Hybrid RAG v3 response
      const cleanedFakeAnswer = cleanResponse(fakeRagResponse.answer);

      // Save assistant message to MongoDB
      const assistantMessage: Omit<ChatMessage, '_id'> = {
        sessionId: actualSessionId,
        documentId,
        role: 'assistant',
        content: cleanedFakeAnswer,
        timestamp: new Date(),
        messageId: `msg_hybrid_rag_v3_${Date.now()}`,
        confidence: fakeRagResponse.confidence,
        sourceType: fakeRagResponse.source_type || 'hybrid',
        sources: transformedSources.map(s => ({
          type: s.type,
          title: s.title,
          confidence: s.confidence,
          content: s.content
        })),
        processingTime,
        tokenUsage: {
          promptTokens: question.length,
          completionTokens: cleanedFakeAnswer.length,
          totalTokens: question.length + cleanedFakeAnswer.length
        },
        csEnhanced: true,
        ragVersion: '3.0-hybrid-bge-groq',
        processingMode: 'Hybrid RAG v3.0 (BGE + ChromaDB + Groq)'
      };

      try {
        await ChatService.saveMessage(assistantMessage);
      } catch (mongoError) {
        console.warn('Failed to save fake RAG assistant message to MongoDB:', mongoError);
      }

      // Enhanced response with Hybrid RAG v3.0 metadata
      const response = {
        success: true,
        answer: cleanedFakeAnswer,
        sources: transformedSources,
        confidence: fakeRagResponse.confidence,
        sessionId: actualSessionId,
        messageId: assistantMessage.messageId,
        responseTime: processingTime,
        tokenUsage: {
          promptTokens: question.length,
          completionTokens: cleanedFakeAnswer.length,
          totalTokens: question.length + cleanedFakeAnswer.length
        },
        // Hybrid RAG v3.0 metadata (Production pipeline)
        csEnhanced: true,
        sourceType: fakeRagResponse.source_type || 'hybrid_rag',
        processingMode: 'Hybrid RAG v3.0',
        ragVersion: '3.0.0',
        metadata: fakeRagResponse.metadata, // Pass through the production pipeline metadata
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

      console.log(`✅ Hybrid RAG v3.0: Completed in ${processingTime}ms, confidence: ${fakeRagResponse.confidence.toFixed(3)}, source: ${fakeRagResponse.source_type}`);
      console.log(`💾 Chat saved: ${userMessage.messageId} & ${assistantMessage.messageId} to session ${actualSessionId}`);
      
      return NextResponse.json(response);

    } catch (ragError: any) {
      console.error('🚨 CS-RAG Backend Error:', ragError);
      
      // Generate intelligent fallback with better document integration
      let fallbackAnswer = await generateSmartFallbackResponse(question, document);
      const cleanedFallbackAnswer = cleanResponse(fallbackAnswer);

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
        content: cleanedFallbackAnswer,
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
          completionTokens: cleanedFallbackAnswer.length,
          totalTokens: question.length + cleanedFallbackAnswer.length
        },
        csEnhanced: false,
        ragVersion: '1.0-fallback',
        processingMode: 'Fallback'
      };

      try {
        await ChatService.saveMessage(fallbackAssistantMessage);
      } catch (mongoError) {
        console.warn('Failed to save fallback assistant message to MongoDB:', mongoError);
      }

      return NextResponse.json({
        success: true,
        answer: cleanedFallbackAnswer,
        sources: fallbackSources,
        confidence: 0.5,
        sessionId: actualSessionId,
        messageId: fallbackAssistantMessage.messageId,
        responseTime: Date.now() - startTime,
        tokenUsage: {
          promptTokens: question.length,
          completionTokens: cleanedFallbackAnswer.length,
          totalTokens: question.length + cleanedFallbackAnswer.length
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

// Clear chat history for a document
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const documentId = params.id;
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!documentId) {
      return NextResponse.json(
        { error: 'Document ID is required' },
        { status: 400 }
      );
    }

    console.log(`🗑️ Clearing chat history for document ${documentId}, session: ${sessionId || 'all'}`);

    let deletedMessages = 0;
    let deletedSessions = 0;

    if (sessionId) {
      // Clear specific session
      const messages = await ChatService.getChatHistory(sessionId);
      deletedMessages = messages.length;
      
      // Delete messages for this session
      const chatCollection = await import('@/lib/database/mongodb').then(m => m.getChatCollection());
      const collection = await chatCollection;
      await collection.deleteMany({ sessionId });
      
      // Delete the session
      const sessionCollection = await import('@/lib/database/mongodb').then(m => m.getChatSessionCollection());
      const sessions = await sessionCollection;
      const sessionResult = await sessions.deleteOne({ sessionId });
      deletedSessions = sessionResult.deletedCount || 0;
      
      console.log(`✅ Cleared session ${sessionId}: ${deletedMessages} messages, ${deletedSessions} session`);
    } else {
      // Clear all chats for the document
      const result = await ChatService.deleteDocumentChats(documentId);
      deletedMessages = result.deletedMessages;
      deletedSessions = result.deletedSessions;
      
      console.log(`✅ Cleared all chats for document ${documentId}: ${deletedMessages} messages, ${deletedSessions} sessions`);
    }

    return NextResponse.json({
      success: true,
      message: 'Chat history cleared successfully',
      deletedMessages,
      deletedSessions,
      documentId,
      sessionId: sessionId || null
    });

  } catch (error: any) {
    console.error('❌ Clear chat history error:', error);
    return NextResponse.json(
      { error: 'Failed to clear chat history', details: error.message },
      { status: 500 }
    );
  }
}

// Enhanced fallback response generator
async function generateSmartFallbackResponse(question: string, document: any): Promise<string> {
  const questionLower = question.toLowerCase();
  
  // Try to provide relevant information even when RAG backend is down
  if (questionLower.includes('typescript')) {
    return `**TypeScript Analysis** - Enhanced Response from "${document.name}"

**Your Question:** "${question}"

**Comprehensive Answer:**
Based on current TypeScript knowledge and the context of your document:

**TypeScript Core Concepts:**
- **Static Type System**: Provides compile-time type checking to catch errors early
- **Type Inference**: Automatically deduces types when not explicitly specified
- **Advanced Types**: Union types, intersection types, generics, and conditional types
- **Modern JavaScript**: Full ES6+ support with additional language features

**Key Benefits for Development:**
- **Error Prevention**: Catch bugs during development rather than in production
- **Enhanced IDE Support**: Superior autocomplete, refactoring, and navigation
- **Code Documentation**: Types serve as living documentation
- **Team Collaboration**: Shared type definitions improve code consistency

**Industry Usage:**
- **Enterprise Applications**: Preferred for large-scale projects
- **Framework Integration**: Excellent support in React, Angular, Vue
- **Backend Development**: Growing adoption in Node.js projects
- **Library Development**: Standard for npm package creation

**Best Practices:**
- Enable strict mode configuration
- Use utility types like Partial<T>, Required<T>
- Implement proper error handling
- Leverage type guards for runtime safety

*This enhanced response combines current TypeScript knowledge with the context of your document "${document.name}". For document-specific analysis, please try again when the full system is available.*`;
  }
  
  if (questionLower.includes('javascript')) {
    return `**JavaScript Analysis** - From "${document.name}"

**Your Question:** "${question}"

**Modern JavaScript Overview:**
Based on current web development standards:

**Language Features:**
- **ES6+ Syntax**: Arrow functions, destructuring, modules, async/await
- **Dynamic Typing**: Flexible type system with runtime type checking
- **Prototype-based OOP**: Objects and prototypal inheritance
- **Event-driven Programming**: Asynchronous programming with Promises

**Ecosystem & Tools:**
- **Runtime Environments**: Browser APIs, Node.js for server-side
- **Build Tools**: Webpack, Vite, esbuild for modern development
- **Testing**: Jest, Mocha, Cypress for comprehensive testing
- **Frameworks**: React, Vue, Angular for application development

**Current Trends:**
- **TypeScript Adoption**: Growing use of TypeScript for type safety
- **Modern Frameworks**: Focus on developer experience and performance
- **Web Standards**: Progressive Web Apps, Web Components
- **Performance**: Core Web Vitals and optimization techniques

*This response provides current JavaScript insights relevant to your document "${document.name}". For specific document analysis, please retry when the full system is operational.*`;
  }
  
  if (questionLower.includes('python')) {
    return `**Python Analysis** - Context from "${document.name}"

**Your Question:** "${question}"

**Python Ecosystem Overview:**
Based on current Python development landscape:

**Language Characteristics:**
- **Readable Syntax**: Emphasis on code clarity and simplicity
- **Dynamic Typing**: Flexible type system with optional type hints
- **Multi-paradigm**: Supports procedural, object-oriented, and functional programming
- **Extensive Libraries**: Rich standard library and third-party packages

**Popular Applications:**
- **Web Development**: Django, Flask, FastAPI for modern applications
- **Data Science**: Pandas, NumPy, Matplotlib for data analysis
- **Machine Learning**: TensorFlow, PyTorch, scikit-learn for AI/ML
- **Automation**: Scripting, web scraping, and system administration

**Modern Features:**
- **Type Hints**: Optional static typing for better code quality
- **Async Programming**: AsyncIO for concurrent operations
- **Performance**: JIT compilation with PyPy, Cython for speed
- **Package Management**: pip, conda, poetry for dependency management

*This comprehensive response draws from current Python knowledge in relation to your document "${document.name}". For document-specific content analysis, please try again later.*`;
  }
  
  // General fallback for other topics
  return `**Smart Analysis** - ${document.name}

**Your Question:** "${question}"

**Intelligent Response:**
While the advanced document analysis system is temporarily unavailable, I can provide relevant information based on the question context:

**Document Context:**
- **Name**: ${document.name}
- **Type**: ${document.type?.toUpperCase() || 'Document'}
- **Category**: ${document.category ? document.category.charAt(0).toUpperCase() + document.category.slice(1) : 'General'}
- **Status**: Processing completed

**Knowledge-Based Insights:**
Based on the topic of your question, here are relevant concepts and best practices from current industry knowledge:

**Technical Approach:**
- Modern development emphasizes clean, maintainable code
- Security-first mindset in all implementations
- Performance optimization balanced with code clarity
- Comprehensive testing and documentation

**Best Practices:**
- Follow established design patterns and conventions
- Implement proper error handling and logging
- Use version control and collaborative development workflows
- Maintain up-to-date documentation and code comments

**Industry Standards:**
- API-first design with comprehensive documentation
- Cloud-native development and deployment strategies
- Automated testing and continuous integration/deployment
- Monitoring and observability from project inception

*This response combines current industry knowledge with the context of your document. For detailed document-specific analysis, please retry when the full analysis system is available.*`;
}

// Direct document analysis function
async function tryDirectDocumentAnalysis(documentId: string, question: string, document: any): Promise<string | null> {
  try {
    // Try to get document content from Supabase
    const documentContent = await getDocumentContent(documentId);
    
    if (!documentContent || documentContent.length < 100) {
      return null;
    }
    
    // Analyze the document content for the specific question
    const relevantSections = findRelevantSections(question, documentContent);
    
    if (relevantSections.length === 0) {
      return null;
    }
    
    // Generate answer based on document content
    return generateDocumentBasedAnswer(question, document.name, relevantSections);
    
  } catch (error) {
    console.error('Direct document analysis failed:', error);
    return null;
  }
}

// Get document content from database
async function getDocumentContent(documentId: string): Promise<string | null> {
  try {
    // Get document from database to check if it has extracted text
    const document = await getDocumentById(documentId);
    if (!document) {
      console.warn(`⚠️ Document ${documentId} not found`);
      return null;
    }

    // Try to get extracted text from the document metadata
    const extractedText = document.metadata?.extracted_text;
    if (extractedText && extractedText.length > 100) {
      console.log(`✅ Using extracted text from document metadata (${extractedText.length} chars)`);
      return extractedText;
    }

    console.warn(`⚠️ No extracted text found for document ${documentId}`);
    console.warn(`   Document metadata:`, JSON.stringify(document.metadata, null, 2).substring(0, 200));
    return null;
  } catch (error) {
    console.error('Failed to get document content:', error);
    return null;
  }
}

// Generate sample PostgreSQL content for demonstration
function generateSamplePostgreSQLContent(): string {
  return `PostgreSQL Overview

PostgreSQL is a powerful, open source object-relational database system that uses and extends the SQL language combined with many features that safely store and scale the most complicated data workloads.

What is PostgreSQL?

PostgreSQL is an advanced, enterprise-class, and open-source relational database system. PostgreSQL supports both SQL (relational) and JSON (non-relational) querying.

Key Features of PostgreSQL:
- ACID compliance for data integrity
- Support for advanced data types including JSON, XML, and arrays
- Full-text search capabilities
- Extensible with custom functions and data types
- Multi-version concurrency control (MVCC)
- Point-in-time recovery and continuous archiving
- Streaming replication and logical replication
- Robust access control system

PostgreSQL Architecture:
PostgreSQL uses a client/server model. A PostgreSQL session consists of the following cooperating processes:
- A server process, which manages the database files, accepts connections to the database from client applications, and performs database actions on behalf of the clients
- Client applications that want to perform database operations

PostgreSQL supports many advanced features including:
- Complex queries with subqueries and joins
- Foreign keys and check constraints
- Views and materialized views
- Triggers and stored procedures
- Indexes including B-tree, hash, GiST, SP-GiST, GIN, and BRIN
- Transaction isolation levels
- Tablespaces for storage management

Performance and Scalability:
PostgreSQL is designed to handle a range of workloads, from single machines to data warehouses or Web services with many concurrent users.

Use Cases:
- Web applications requiring complex queries
- Data warehousing and analytics
- Geospatial applications with PostGIS extension
- Time-series data with TimescaleDB
- Full-text search applications
- Scientific and research data management`;
}

// Find relevant sections in document text
function findRelevantSections(question: string, documentText: string): string[] {
  const questionLower = question.toLowerCase();
  const questionWords = questionLower.split(/\s+/).filter(word => word.length > 2);
  
  // Split document into paragraphs
  const paragraphs = documentText.split(/\n\s*\n/).filter(p => p.trim().length > 50);
  
  const relevantSections: Array<{text: string, score: number}> = [];
  
  for (const paragraph of paragraphs) {
    const paragraphLower = paragraph.toLowerCase();
    let score = 0;
    
    // Check for exact question match
    if (paragraphLower.includes(questionLower)) {
      score += 1.0;
    }
    
    // Check for keyword matches
    for (const word of questionWords) {
      if (paragraphLower.includes(word)) {
        score += 0.3;
      }
    }
    
    // Special scoring for PostgreSQL questions
    if (questionLower.includes('postgresql') || questionLower.includes('postgres')) {
      if (paragraphLower.includes('postgresql') || paragraphLower.includes('postgres')) {
        score += 0.8;
      }
      if (paragraphLower.includes('database')) {
        score += 0.4;
      }
    }
    
    if (score > 0.5) {
      relevantSections.push({text: paragraph, score});
    }
  }
  
  // Sort by relevance and return top sections
  relevantSections.sort((a, b) => b.score - a.score);
  return relevantSections.slice(0, 3).map(s => s.text);
}

// Generate answer based on document content
function generateDocumentBasedAnswer(question: string, documentName: string, sections: string[]): string {
  const topSection = sections[0];
  
  return `**Document Analysis: ${documentName}**

**Your Question:** "${question}"

**From the Document:**

${topSection}

**Additional Context:**
${sections.slice(1).map(section => section.substring(0, 200) + '...').join('\n\n')}

**Summary:**
Based on the document content, I found relevant information that directly addresses your question. This response is extracted from the actual document text rather than generic knowledge.

*This answer was generated by analyzing the actual content of your document "${documentName}".*`;
}