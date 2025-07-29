# Chat and Code Assistant System Documentation

## Overview
This document provides a comprehensive overview of all files responsible for the chat and code assistant functionality across the Engunity AI platform. The system implements a sophisticated Computer Science-enhanced RAG (Retrieval-Augmented Generation) architecture with local AI models.

## System Architecture

### Backend Components

#### Core Chat API
**File**: `/backend/app/api/v1/chat.py`
- **Description**: Main FastAPI endpoint for chat functionality using CS-Enhanced RAG with local models
- **Key Features**:
  - Streaming and non-streaming chat responses
  - Local RAG processing with CS-enhanced knowledge
  - Session management and token usage tracking
  - Temperature and model configuration support
- **Technologies**: FastAPI, Pydantic, asyncio
- **Location**: `backend/app/api/v1/chat.py:49` (main chat endpoint)

#### RAG Processing Service
**File**: `/backend/app/services/rag_processor.py`
- **Description**: Core service for processing RAG queries with document content, CS enhancement, and web search fallback
- **Key Features**:
  - Ultra-fast response generation (2-second timeout)
  - Instant response cache integration
  - Document content extraction and analysis
  - Multi-strategy document splitting and relevance scoring
  - Phi-2 model integration (when available)
- **Performance**: Sub-100ms cached responses, <2s processing time
- **Location**: `backend/app/services/rag_processor.py:52` (main processing method)

#### Adaptive Learning System
**File**: `/backend/app/services/adaptive_learning.py`
- **Description**: System that learns from user interactions to improve responses over time
- **Key Features**:
  - Question pattern recognition and tracking
  - Response feedback analysis
  - Common question identification
  - Performance optimization recommendations
- **Learning Data**: Stored in `backend/data/learning/`
- **Location**: `backend/app/services/adaptive_learning.py:88` (learning method)

#### Instant Response Cache
**File**: `/backend/app/services/instant_response_cache.py`
- **Description**: High-performance caching system for frequently asked questions
- **Performance**: Sub-100ms response times for cached queries
- **Integration**: Used by RAG processor for immediate responses

#### Local AI Model Service
**File**: `/backend/app/services/phi2_model_service.py`
- **Description**: Local Phi-2 model integration for enhanced CS-specific responses
- **Features**: Optimized inference, CS domain knowledge enhancement

### Frontend Components

#### Chat API Routes

**Stream Chat Route**: `/frontend/src/app/api/chat and chat/stream/route.ts`
- **Description**: Next.js API route for handling chat streaming requests
- **Key Features**:
  - Backend integration with fallback responses
  - Timeout handling (5-second backend timeout)
  - Support for both streaming and JSON responses
  - Error handling with graceful degradation
- **Fallback**: Provides helpful responses when backend is unavailable
- **Location**: `frontend/src/app/api/chat and chat/stream/route.ts:42` (backend call)

**Chat History Route**: `/frontend/src/app/api/chat and chat/history/route.ts`
- **Description**: API endpoint for managing chat history
- **Features**: Session management, message persistence

#### Core Chat Components

**Chat Interface**: `/frontend/src/components/chat/ChatInterface.tsx`
- **Description**: Main chat interface component (currently minimal)
- **Location**: Currently has minimal implementation - needs development

**Chat History**: `/frontend/src/components/chat/ChatHistory.tsx`
- **Description**: Component for displaying chat message history
- **Location**: Currently has minimal implementation - needs development

**Message Components**:
- **MessageBubble**: `/frontend/src/components/chat/MessageBubble.tsx` - Individual message display
- **TypingIndicator**: `/frontend/src/components/chat/TypingIndicator.tsx` - Shows when AI is responding
- **StreamingText**: `/frontend/src/components/chat/StreamingText.tsx` - Handles streaming text display

#### Code Editor Components

**Code Editor**: `/frontend/src/components/editor/CodeEditor.tsx`
- **Description**: Main code editor component (currently minimal)
- **Integration**: Works with chat for code-related discussions

**Editor Support**:
- **EditorToolbar**: `/frontend/src/components/editor/EditorToolbar.tsx` - Editor controls
- **LanguageSelector**: `/frontend/src/components/editor/LanguageSelector.tsx` - Programming language selection
- **OutputPanel**: `/frontend/src/components/editor/OutputPanel.tsx` - Code execution results
- **CollaborationCursor**: `/frontend/src/components/editor/CollaborationCursor.tsx` - Multi-user editing

#### Document Q&A System

**QA Interface**: `/frontend/src/app/dashboard/documents/components/QAInterface.tsx`
- **Description**: Interface for asking questions about uploaded documents
- **Integration**: Uses RAG processor for document-based conversations

**Document Pages**:
- **Document Q&A Page**: `/frontend/src/app/dashboard/documents/[id]/qa/page.tsx`
- **Document Q&A API**: `/frontend/src/app/api/documents/[id]/qa/route.ts`

### Data Layer

#### Hooks and State Management

**Chat Hook**: `/frontend/src/hooks/useChat.ts`
- **Description**: React hook for chat functionality (currently minimal)
- **Location**: Needs implementation for chat state management

**Editor Hook**: `/frontend/src/hooks/useEditor.ts`
- **Description**: React hook for code editor functionality

**Store Management**:
- **Chat Store**: `/frontend/src/store/chatStore.ts` - Global chat state
- **Editor Store**: `/frontend/src/store/editorStore.ts` - Editor state management

#### Database Integration

**Supabase Service**: `/backend/app/services/supabase_service.py`
- **Description**: Database service for document and chat data persistence
- **Features**: Document storage, metadata management, user sessions

**Chat Storage**: `/frontend/src/lib/firebase/chat-storage.ts`
- **Description**: Firebase integration for chat message persistence

### AI and ML Components

#### Training Data Processing

**Computer Science Training Data**:
- **Location**: `/backend/data/training/processed/training_ready/code_assistant/`
- **Content**: Specialized training data for CS-enhanced responses
- **Files**: train.jsonl, validation.jsonl, test.jsonl

**CS-Specific Services**:
- **CS Query Processor**: `/backend/app/services/rag/cs_query_processor.py`
- **CS Response Generator**: `/backend/app/services/rag/cs_generator.py`
- **CS Feedback Analyzer**: `/backend/app/services/rag/cs_feedback_analyzer.py`

#### Vector Store Management

**FAISS Manager**: `/backend/vector_store/cs_faiss_manager.py`
- **Description**: CS-enhanced vector store for semantic search
- **Features**: Optimized embeddings, fast retrieval, CS domain knowledge

### Performance Optimizations

#### Response Time Targets
- **Instant Cache**: <100ms for common questions
- **Document Analysis**: <2 seconds maximum
- **Streaming**: Real-time response chunks
- **Fallback**: Immediate responses when systems unavailable

#### Caching Strategy
1. **Instant Response Cache**: Pre-computed answers for common questions
2. **Adaptive Learning**: Learns from interactions to improve response quality
3. **Document Preprocessing**: Pre-analyzed content for faster retrieval

## Current Development Status

### Implemented Features ✅
- Backend RAG processing with CS enhancement
- FastAPI chat endpoints with streaming support
- Document Q&A functionality
- Adaptive learning system
- Performance optimization with caching
- Local AI model integration (Phi-2)
- Frontend API routes with fallback handling

### Areas Needing Development 🚧
- **Frontend Chat Interface**: `/frontend/src/components/chat/ChatInterface.tsx` needs full implementation
- **Chat History Component**: `/frontend/src/components/chat/ChatHistory.tsx` needs development
- **Chat Hook**: `/frontend/src/hooks/useChat.ts` needs complete state management
- **Code Editor Integration**: Better integration between chat and code editor
- **Real-time Features**: WebSocket support for live collaboration

### Integration Points

#### Frontend ↔ Backend Communication
1. **Chat Streaming**: `frontend/api/chat` → `backend/api/v1/chat/stream`
2. **Document Q&A**: `frontend/api/documents/[id]/qa` → RAG processor
3. **Error Handling**: Graceful fallbacks when backend unavailable

#### AI Pipeline Flow
1. **Question Input** → **RAG Processor** → **Document Analysis** → **CS Enhancement** → **Response Generation**
2. **Cache Check** → **Instant Response** (if available)
3. **Learning System** → **Pattern Recognition** → **Response Optimization**

## Technical Specifications

### Backend Stack
- **Framework**: FastAPI with asyncio
- **AI Models**: Local Phi-2, BGE embeddings
- **Vector Store**: FAISS with CS-enhanced indexing
- **Database**: Supabase for persistence
- **Performance**: <2s response time, <100ms cached responses

### Frontend Stack
- **Framework**: Next.js 14 with TypeScript
- **State Management**: Zustand stores + React hooks
- **UI Components**: Tailwind CSS + custom components
- **Real-time**: API routes with streaming support

### Data Flow
```
User Question → Frontend → API Route → Backend RAG → AI Processing → Cached Learning → Response Stream → Frontend Display
```

## File Structure Summary

### Critical Chat Files
```
backend/
├── app/api/v1/chat.py                 # Main chat API endpoint
├── app/services/rag_processor.py      # Core RAG processing
├── app/services/adaptive_learning.py  # Learning system
└── app/services/instant_response_cache.py # Performance cache

frontend/
├── src/app/api/chat and chat/stream/route.ts    # Frontend chat API
├── src/components/chat/ChatInterface.tsx        # Main chat UI
├── src/hooks/useChat.ts                         # Chat state management
└── src/store/chatStore.ts                       # Global chat store
```

### Supporting Systems
- **Document Integration**: QA interfaces and document processing
- **Code Editor**: Integrated coding environment
- **Vector Store**: CS-enhanced semantic search
- **Training Data**: Specialized CS knowledge base

This documentation provides a complete overview of the chat and code assistant system architecture, highlighting both implemented features and areas for future development.