#!/usr/bin/env python3
"""
Document Chat RAG - Flexible Conversational Document Analysis
=============================================================

Features:
- Upload PDF, DOCX, TXT, MD documents
- BGE embeddings (BAAI/bge-small-en-v1.5) for fast semantic search
- ChromaDB for persistent vector storage
- Groq API for generation
- Flexible answering: Document-grounded + general knowledge with context retention
- Streaming responses
- Session-based document management
- Citation support

Architecture:
- Document Upload → Text Extraction → Chunking → Embedding → ChromaDB Storage
- Query → Embed → Retrieve Relevant Chunks → Groq Generation with Context
- Maintains document context while allowing general conversations

Author: Engunity AI Team
Version: 1.0.0
Port: 8004
"""

import asyncio
import logging
import time
import os
import re
import hashlib
import json
from typing import Dict, List, Any, Optional
from pathlib import Path
from datetime import datetime
from dataclasses import dataclass, asdict

from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
import uvicorn
from dotenv import load_dotenv

# Document Processing
import PyPDF2
import docx
from io import BytesIO

# Vector & Embedding Libraries
from sentence_transformers import SentenceTransformer
import chromadb
from chromadb.config import Settings

# LLM Integration
from groq import Groq

# Load environment
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ============================================================================
# Configuration
# ============================================================================

class DocRAGConfig:
    """Configuration for Document Chat RAG"""

    # BGE Embeddings
    BGE_MODEL = "BAAI/bge-small-en-v1.5"
    EMBEDDING_DIM = 384

    # Retrieval Settings
    TOP_K_CHUNKS = 6
    SIMILARITY_THRESHOLD = 0.5

    # Groq LLM
    GROQ_MODEL = "llama-3.3-70b-versatile"
    GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
    MAX_TOKENS = 8192
    TEMPERATURE = 0.7

    # Document Processing
    CHUNK_SIZE = 600
    CHUNK_OVERLAP = 150
    MAX_FILE_SIZE_MB = 50
    ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.txt', '.md']

    # Storage
    CHROMA_PERSIST_DIR = "./data/document_chat_chroma"
    UPLOAD_DIR = "./data/uploaded_documents"

    # Server
    PORT = 8004


# ============================================================================
# Data Models
# ============================================================================

@dataclass
class DocumentMetadata:
    """Metadata for uploaded documents"""
    doc_id: str
    filename: str
    file_type: str
    size_bytes: int
    upload_time: str
    user_id: Optional[str]
    session_id: Optional[str]
    chunk_count: int
    page_count: Optional[int] = None


class UploadResponse(BaseModel):
    doc_id: str
    filename: str
    file_type: str
    size_bytes: int
    chunk_count: int
    page_count: Optional[int]
    status: str


class ChatRequest(BaseModel):
    session_id: str
    message: str
    user_id: Optional[str] = None
    doc_ids: Optional[List[str]] = Field(default_factory=list)
    mode: str = "hybrid"  # "document-only" or "hybrid"


class ChatResponse(BaseModel):
    answer: str
    sources: List[Dict[str, Any]]
    confidence: float
    mode_used: str
    processing_time: float


# ============================================================================
# Document Processor
# ============================================================================

class DocumentProcessor:
    """Handles document extraction and chunking"""

    @staticmethod
    def extract_text_from_pdf(file_bytes: bytes) -> tuple[str, int]:
        """Extract text from PDF"""
        try:
            pdf_reader = PyPDF2.PdfReader(BytesIO(file_bytes))
            text = ""
            for page in pdf_reader.pages:
                text += page.extract_text() + "\n\n"
            return text.strip(), len(pdf_reader.pages)
        except Exception as e:
            logger.error(f"PDF extraction error: {e}")
            raise HTTPException(status_code=400, detail=f"Failed to extract PDF: {str(e)}")

    @staticmethod
    def extract_text_from_docx(file_bytes: bytes) -> tuple[str, int]:
        """Extract text from DOCX"""
        try:
            doc = docx.Document(BytesIO(file_bytes))
            text = "\n\n".join([para.text for para in doc.paragraphs if para.text.strip()])
            # Approximate page count (avg 500 words per page)
            page_count = max(1, len(text.split()) // 500)
            return text.strip(), page_count
        except Exception as e:
            logger.error(f"DOCX extraction error: {e}")
            raise HTTPException(status_code=400, detail=f"Failed to extract DOCX: {str(e)}")

    @staticmethod
    def extract_text_from_txt(file_bytes: bytes) -> tuple[str, int]:
        """Extract text from TXT/MD"""
        try:
            text = file_bytes.decode('utf-8')
            page_count = max(1, len(text.split()) // 500)
            return text.strip(), page_count
        except Exception as e:
            logger.error(f"Text extraction error: {e}")
            raise HTTPException(status_code=400, detail=f"Failed to extract text: {str(e)}")

    @staticmethod
    def chunk_text(text: str, chunk_size: int = 600, overlap: int = 150) -> List[str]:
        """Split text into overlapping chunks"""
        if not text:
            return []

        # Split by sentences for better semantic coherence
        sentences = re.split(r'(?<=[.!?])\s+', text)

        chunks = []
        current_chunk = []
        current_length = 0

        for sentence in sentences:
            sentence_length = len(sentence)

            if current_length + sentence_length > chunk_size and current_chunk:
                # Save current chunk
                chunks.append(' '.join(current_chunk))

                # Start new chunk with overlap
                overlap_text = ' '.join(current_chunk)
                if len(overlap_text) > overlap:
                    overlap_words = overlap_text.split()[-overlap:]
                    current_chunk = overlap_words
                    current_length = len(' '.join(overlap_words))
                else:
                    current_chunk = []
                    current_length = 0

            current_chunk.append(sentence)
            current_length += sentence_length

        # Add final chunk
        if current_chunk:
            chunks.append(' '.join(current_chunk))

        return chunks


# ============================================================================
# Document Chat RAG Service
# ============================================================================

class DocumentChatRAG:
    """Main RAG service for document chat"""

    def __init__(self):
        self.config = DocRAGConfig()

        # Initialize storage directories
        os.makedirs(self.config.CHROMA_PERSIST_DIR, exist_ok=True)
        os.makedirs(self.config.UPLOAD_DIR, exist_ok=True)

        # Initialize BGE embeddings
        logger.info(f"Loading BGE model: {self.config.BGE_MODEL}")
        self.embedding_model = SentenceTransformer(self.config.BGE_MODEL)
        logger.info("✅ BGE model loaded")

        # Initialize ChromaDB
        logger.info("Initializing ChromaDB...")
        self.chroma_client = chromadb.PersistentClient(
            path=self.config.CHROMA_PERSIST_DIR,
            settings=Settings(anonymized_telemetry=False)
        )
        self.collection = self.chroma_client.get_or_create_collection(
            name="document_chat",
            metadata={"hnsw:space": "cosine"}
        )
        logger.info("✅ ChromaDB initialized")

        # Initialize Groq client
        if not self.config.GROQ_API_KEY:
            raise ValueError("GROQ_API_KEY not found in environment")
        self.groq_client = Groq(api_key=self.config.GROQ_API_KEY)
        logger.info("✅ Groq client initialized")

        # Document metadata cache
        self.document_metadata: Dict[str, DocumentMetadata] = {}
        self._load_metadata()

        logger.info(f"🚀 Document Chat RAG initialized on port {self.config.PORT}")

    def _load_metadata(self):
        """Load document metadata from disk"""
        metadata_file = Path(self.config.UPLOAD_DIR) / "metadata.json"
        if metadata_file.exists():
            try:
                with open(metadata_file, 'r') as f:
                    data = json.load(f)
                    self.document_metadata = {
                        k: DocumentMetadata(**v) for k, v in data.items()
                    }
                logger.info(f"Loaded metadata for {len(self.document_metadata)} documents")
            except Exception as e:
                logger.error(f"Failed to load metadata: {e}")

    def _save_metadata(self):
        """Save document metadata to disk"""
        metadata_file = Path(self.config.UPLOAD_DIR) / "metadata.json"
        try:
            with open(metadata_file, 'w') as f:
                json.dump({k: asdict(v) for k, v in self.document_metadata.items()}, f, indent=2)
        except Exception as e:
            logger.error(f"Failed to save metadata: {e}")

    def _generate_doc_id(self, filename: str, content: bytes) -> str:
        """Generate unique document ID"""
        hash_input = f"{filename}_{len(content)}_{time.time()}".encode()
        return hashlib.sha256(hash_input).hexdigest()[:16]

    async def upload_document(
        self,
        file: UploadFile,
        user_id: Optional[str] = None,
        session_id: Optional[str] = None
    ) -> UploadResponse:
        """Upload and index a document"""

        # Validate file extension
        file_ext = Path(file.filename).suffix.lower()
        if file_ext not in self.config.ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"File type {file_ext} not supported. Allowed: {self.config.ALLOWED_EXTENSIONS}"
            )

        # Read file content
        file_bytes = await file.read()
        file_size = len(file_bytes)

        # Validate file size
        if file_size > self.config.MAX_FILE_SIZE_MB * 1024 * 1024:
            raise HTTPException(
                status_code=400,
                detail=f"File too large. Max size: {self.config.MAX_FILE_SIZE_MB}MB"
            )

        # Extract text based on file type
        logger.info(f"Extracting text from {file.filename} ({file_ext})")

        if file_ext == '.pdf':
            text, page_count = DocumentProcessor.extract_text_from_pdf(file_bytes)
        elif file_ext == '.docx':
            text, page_count = DocumentProcessor.extract_text_from_docx(file_bytes)
        else:  # .txt, .md
            text, page_count = DocumentProcessor.extract_text_from_txt(file_bytes)

        if not text.strip():
            raise HTTPException(status_code=400, detail="No text could be extracted from document")

        # Generate document ID
        doc_id = self._generate_doc_id(file.filename, file_bytes)

        # Chunk the text
        logger.info(f"Chunking document: {file.filename}")
        chunks = DocumentProcessor.chunk_text(
            text,
            chunk_size=self.config.CHUNK_SIZE,
            overlap=self.config.CHUNK_OVERLAP
        )

        if not chunks:
            raise HTTPException(status_code=400, detail="Failed to create chunks from document")

        logger.info(f"Created {len(chunks)} chunks")

        # Generate embeddings
        logger.info("Generating embeddings...")
        embeddings = self.embedding_model.encode(chunks, show_progress_bar=False)

        # Store in ChromaDB
        logger.info("Storing in ChromaDB...")
        chunk_ids = [f"{doc_id}_chunk_{i}" for i in range(len(chunks))]
        metadatas = [
            {
                "doc_id": doc_id,
                "filename": file.filename,
                "chunk_index": i,
                "user_id": user_id or "anonymous",
                "session_id": session_id or "default",
                "upload_time": datetime.now().isoformat()
            }
            for i in range(len(chunks))
        ]

        self.collection.add(
            ids=chunk_ids,
            embeddings=embeddings.tolist(),
            documents=chunks,
            metadatas=metadatas
        )

        # Save document metadata
        metadata = DocumentMetadata(
            doc_id=doc_id,
            filename=file.filename,
            file_type=file_ext,
            size_bytes=file_size,
            upload_time=datetime.now().isoformat(),
            user_id=user_id,
            session_id=session_id,
            chunk_count=len(chunks),
            page_count=page_count
        )
        self.document_metadata[doc_id] = metadata
        self._save_metadata()

        # Save original file
        file_path = Path(self.config.UPLOAD_DIR) / f"{doc_id}{file_ext}"
        with open(file_path, 'wb') as f:
            f.write(file_bytes)

        logger.info(f"✅ Document uploaded and indexed: {doc_id}")

        return UploadResponse(
            doc_id=doc_id,
            filename=file.filename,
            file_type=file_ext,
            size_bytes=file_size,
            chunk_count=len(chunks),
            page_count=page_count,
            status="ready"
        )

    async def chat(self, request: ChatRequest) -> str:
        """Process chat query with document context"""
        start_time = time.time()

        # Embed the query
        query_embedding = self.embedding_model.encode([request.message])[0]

        # Build filters for retrieval
        # ChromaDB requires proper filter structure
        if request.doc_ids and len(request.doc_ids) > 0:
            # Filter by specific documents
            if len(request.doc_ids) == 1:
                where_filter = {
                    "$and": [
                        {"session_id": request.session_id},
                        {"doc_id": request.doc_ids[0]}
                    ]
                }
            else:
                where_filter = {
                    "$and": [
                        {"session_id": request.session_id},
                        {"doc_id": {"$in": request.doc_ids}}
                    ]
                }
        else:
            # Filter by session only
            where_filter = {"session_id": request.session_id}

        # Retrieve relevant chunks
        logger.info(f"Retrieving chunks for query: {request.message[:50]}...")
        results = self.collection.query(
            query_embeddings=[query_embedding.tolist()],
            n_results=self.config.TOP_K_CHUNKS,
            where=where_filter
        )

        chunks = results['documents'][0] if results['documents'] else []
        distances = results['distances'][0] if results['distances'] else []
        metadatas = results['metadatas'][0] if results['metadatas'] else []

        # Convert distances to similarities (cosine distance -> similarity)
        similarities = [1 - d for d in distances] if distances else []

        # Filter by similarity threshold
        filtered_chunks = []
        filtered_metadata = []
        for chunk, sim, meta in zip(chunks, similarities, metadatas):
            if sim >= self.config.SIMILARITY_THRESHOLD:
                filtered_chunks.append(chunk)
                filtered_metadata.append(meta)

        logger.info(f"Found {len(filtered_chunks)} relevant chunks (threshold: {self.config.SIMILARITY_THRESHOLD})")

        # Build prompt based on mode
        if request.mode == "document-only" and not filtered_chunks:
            # No relevant chunks found in document-only mode
            answer = (
                "I don't have enough information in the uploaded documents to answer that question. "
                "The question might be outside the scope of the documents, or the documents might not "
                "contain relevant information about this topic."
            )

            processing_time = time.time() - start_time
            response_data = {
                "answer": answer,
                "sources": [],
                "confidence": 0.0,
                "mode_used": "document-only",
                "processing_time": processing_time
            }

            async def generate():
                yield f"data: {json.dumps(response_data)}\n\n"

            return generate()

        # Build context from chunks
        context = "\n\n".join([
            f"[Chunk {i+1} from {meta.get('filename', 'document')}]:\n{chunk}"
            for i, (chunk, meta) in enumerate(zip(filtered_chunks, filtered_metadata))
        ])

        # Build system prompt based on mode
        if request.mode == "document-only":
            system_prompt = """You are a helpful AI assistant that answers questions based STRICTLY on the provided document context.

Rules:
1. Answer ONLY using information from the provided context
2. If the context doesn't contain the answer, say so explicitly
3. Cite the document chunks you use
4. Be concise but thorough
5. If asked about topics not in the documents, politely indicate that"""
        else:  # hybrid mode
            system_prompt = """You are a helpful AI assistant that answers questions using both document context and your general knowledge.

Rules:
1. PRIORITIZE information from the provided document context when available
2. You can supplement with general knowledge when helpful
3. Maintain awareness of the document context throughout the conversation
4. If using document info, mention it naturally
5. Be conversational like Gemini - helpful, clear, and engaging
6. You can answer general questions even if they're not in the documents
7. Keep the document context in mind for follow-up questions"""

        # Build user prompt
        if filtered_chunks:
            user_prompt = f"""Document Context:
{context}

User Question: {request.message}

Please provide a helpful answer. If using information from the documents, mention it naturally."""
        else:
            user_prompt = f"""User Question: {request.message}

(Note: No specific document context found for this question, but you can use your general knowledge to help.)"""

        # Generate response using Groq
        logger.info("Generating response with Groq...")

        async def generate():
            try:
                stream = self.groq_client.chat.completions.create(
                    model=self.config.GROQ_MODEL,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ],
                    max_tokens=self.config.MAX_TOKENS,
                    temperature=self.config.TEMPERATURE,
                    stream=True
                )

                full_answer = ""
                for chunk in stream:
                    if chunk.choices[0].delta.content:
                        content = chunk.choices[0].delta.content
                        full_answer += content
                        yield f"data: {json.dumps({'token': content})}\n\n"

                # Send final metadata
                processing_time = time.time() - start_time
                sources = [
                    {
                        "filename": meta.get("filename", "unknown"),
                        "chunk_index": meta.get("chunk_index", 0),
                        "doc_id": meta.get("doc_id", "")
                    }
                    for meta in filtered_metadata
                ]

                confidence = sum(similarities[:len(filtered_chunks)]) / len(similarities) if similarities else 0.0

                final_data = {
                    "type": "final",
                    "final": True,
                    "message": full_answer,  # Frontend expects 'message' not 'answer'
                    "answer": full_answer,   # Keep for backward compatibility
                    "sources": sources,
                    "confidence": round(confidence, 2),
                    "mode_used": request.mode,
                    "processing_time": round(processing_time, 2),
                    "chunks_used": len(filtered_chunks),
                    "usage": {
                        "totalTokens": len(full_answer.split()),
                        "promptTokens": len(request.message.split()),
                        "completionTokens": len(full_answer.split())
                    },
                    "sessionId": request.session_id,
                    "messageId": f"msg_{int(time.time() * 1000)}",
                    "timestamp": time.time()
                }

                yield f"data: {json.dumps(final_data)}\n\n"

            except Exception as e:
                logger.error(f"Generation error: {e}")
                error_data = {"error": str(e)}
                yield f"data: {json.dumps(error_data)}\n\n"

        return generate()

    def list_documents(self, session_id: Optional[str] = None) -> List[Dict]:
        """List all documents for a session"""
        docs = []
        for doc_id, metadata in self.document_metadata.items():
            if session_id is None or metadata.session_id == session_id:
                docs.append({
                    "doc_id": doc_id,
                    "filename": metadata.filename,
                    "file_type": metadata.file_type,
                    "size_bytes": metadata.size_bytes,
                    "chunk_count": metadata.chunk_count,
                    "page_count": metadata.page_count,
                    "upload_time": metadata.upload_time
                })
        return docs

    def delete_document(self, doc_id: str) -> bool:
        """Delete a document and its vectors"""
        if doc_id not in self.document_metadata:
            return False

        try:
            # Delete from ChromaDB
            chunk_ids = [f"{doc_id}_chunk_{i}" for i in range(self.document_metadata[doc_id].chunk_count)]
            self.collection.delete(ids=chunk_ids)

            # Delete file
            metadata = self.document_metadata[doc_id]
            file_path = Path(self.config.UPLOAD_DIR) / f"{doc_id}{metadata.file_type}"
            if file_path.exists():
                file_path.unlink()

            # Remove metadata
            del self.document_metadata[doc_id]
            self._save_metadata()

            logger.info(f"✅ Deleted document: {doc_id}")
            return True
        except Exception as e:
            logger.error(f"Failed to delete document {doc_id}: {e}")
            return False


# ============================================================================
# FastAPI Application
# ============================================================================

app = FastAPI(
    title="Document Chat RAG API",
    description="Flexible conversational document analysis with BGE + Groq",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize RAG service
rag_service: Optional[DocumentChatRAG] = None


@app.on_event("startup")
async def startup_event():
    """Initialize RAG service on startup"""
    global rag_service
    try:
        rag_service = DocumentChatRAG()
        logger.info("✅ Document Chat RAG service started successfully")
    except Exception as e:
        logger.error(f"❌ Failed to start RAG service: {e}")
        raise


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "Document Chat RAG",
        "version": "1.0.0",
        "documents_indexed": len(rag_service.document_metadata) if rag_service else 0
    }


@app.post("/upload", response_model=UploadResponse)
async def upload_document(
    file: UploadFile = File(...),
    user_id: Optional[str] = Form(None),
    session_id: Optional[str] = Form(None)
):
    """Upload and index a document"""
    if not rag_service:
        raise HTTPException(status_code=503, detail="Service not ready")

    return await rag_service.upload_document(file, user_id, session_id)


@app.post("/chat")
async def chat(request: ChatRequest):
    """Chat with documents"""
    if not rag_service:
        raise HTTPException(status_code=503, detail="Service not ready")

    generator = await rag_service.chat(request)
    return StreamingResponse(
        generator,
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )


@app.get("/documents")
async def list_documents(session_id: Optional[str] = None):
    """List all documents"""
    if not rag_service:
        raise HTTPException(status_code=503, detail="Service not ready")

    docs = rag_service.list_documents(session_id)
    return {"documents": docs, "count": len(docs)}


@app.delete("/documents/{doc_id}")
async def delete_document(doc_id: str):
    """Delete a document"""
    if not rag_service:
        raise HTTPException(status_code=503, detail="Service not ready")

    success = rag_service.delete_document(doc_id)
    if success:
        return {"message": "Document deleted successfully"}
    else:
        raise HTTPException(status_code=404, detail="Document not found")


# ============================================================================
# Main Entry Point
# ============================================================================

if __name__ == "__main__":
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=DocRAGConfig.PORT,
        log_level="info"
    )
