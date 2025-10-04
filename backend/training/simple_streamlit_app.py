#!/usr/bin/env python3
"""
Simple Working Streamlit RAG App - No More "Unable to generate response"
"""
import streamlit as st
import os
import tempfile
import time
import PyPDF2
from sentence_transformers import SentenceTransformer
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
import re
from typing import List, Dict
import warnings
warnings.filterwarnings('ignore')

# Configure Streamlit page
st.set_page_config(
    page_title="Simple RAG Q&A",
    page_icon="💬",
    layout="wide"
)

class SimpleRAG:
    def __init__(self):
        self.embedder = None
        self.chunks = []
        self.embeddings = None
        
    @st.cache_resource
    def load_embedder(_self):
        """Load embedding model with caching"""
        return SentenceTransformer('all-MiniLM-L6-v2')
        
    def initialize_embedder(self):
        """Initialize the embedding model"""
        if self.embedder is None:
            with st.spinner("Loading embedding model..."):
                self.embedder = self.load_embedder()
        
    def load_pdf_text(self, pdf_path: str) -> str:
        """Extract text from PDF"""
        text = ""
        with open(pdf_path, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            for page in pdf_reader.pages:
                text += page.extract_text() + "\n"
        return text
    
    def create_chunks(self, text: str, chunk_size: int = 500) -> List[str]:
        """Split text into chunks"""
        sentences = re.split(r'[.!?]+', text)
        chunks = []
        current_chunk = ""
        
        for sentence in sentences:
            sentence = sentence.strip()
            if not sentence:
                continue
                
            if len(current_chunk) + len(sentence) > chunk_size:
                if current_chunk:
                    chunks.append(current_chunk.strip())
                current_chunk = sentence
            else:
                current_chunk += " " + sentence
        
        if current_chunk:
            chunks.append(current_chunk.strip())
            
        return [chunk for chunk in chunks if len(chunk) > 50]
    
    def build_knowledge_base(self, pdf_path: str):
        """Build the knowledge base from PDF"""
        self.initialize_embedder()
        
        with st.spinner("Extracting text from PDF..."):
            text = self.load_pdf_text(pdf_path)
        
        with st.spinner("Creating text chunks..."):
            self.chunks = self.create_chunks(text)
            st.success(f"Created {len(self.chunks)} text chunks")
        
        with st.spinner("Creating embeddings..."):
            self.embeddings = self.embedder.encode(self.chunks)
            st.success("Knowledge base ready!")
    
    def answer_question(self, question: str, top_k: int = 3) -> Dict:
        """Answer question and return result with metadata"""
        if not self.chunks or self.embeddings is None:
            return {
                "answer": "No document loaded. Please upload a PDF first.",
                "confidence": 0.0,
                "sources": [],
                "response_time": 0.0
            }
        
        start_time = time.time()
        
        # Get question embedding
        question_embedding = self.embedder.encode([question])
        
        # Calculate similarities
        similarities = cosine_similarity(question_embedding, self.embeddings)[0]
        
        # Get top chunks
        top_indices = np.argsort(similarities)[-top_k:][::-1]
        top_similarities = similarities[top_indices]
        relevant_chunks = [self.chunks[i] for i in top_indices]
        
        # Generate answer
        answer = self._generate_structured_answer(question, relevant_chunks, top_similarities)
        
        response_time = time.time() - start_time
        
        return {
            "answer": answer,
            "confidence": float(np.mean(top_similarities)),
            "sources": relevant_chunks,
            "response_time": response_time,
            "similarity_scores": top_similarities.tolist()
        }
    
    def _generate_structured_answer(self, question: str, chunks: List[str], similarities: np.ndarray) -> str:
        """Generate a structured answer based on retrieved chunks"""
        if not chunks:
            return "I couldn't find relevant information in the document to answer your question."
        
        # Determine question type
        question_lower = question.lower()
        
        if any(word in question_lower for word in ['what is', 'define', 'definition']):
            answer_type = "definition"
        elif any(word in question_lower for word in ['how', 'explain', 'describe']):
            answer_type = "explanation" 
        elif any(word in question_lower for word in ['why', 'reason', 'because']):
            answer_type = "reasoning"
        elif any(word in question_lower for word in ['list', 'types', 'kinds', 'categories']):
            answer_type = "list"
        else:
            answer_type = "general"
        
        # Extract relevant sentences
        all_sentences = []
        for chunk in chunks:
            sentences = [s.strip() for s in re.split(r'[.!?]+', chunk) if s.strip()]
            all_sentences.extend(sentences)
        
        # Filter sentences based on question keywords
        question_keywords = set(re.findall(r'\b\w+\b', question_lower))
        scored_sentences = []
        
        for sentence in all_sentences:
            sentence_words = set(re.findall(r'\b\w+\b', sentence.lower()))
            overlap = len(question_keywords.intersection(sentence_words))
            if overlap > 0:
                scored_sentences.append((sentence, overlap))
        
        # Sort by relevance and take best sentences
        scored_sentences.sort(key=lambda x: x[1], reverse=True)
        best_sentences = [s[0] for s in scored_sentences[:3]]
        
        if not best_sentences:
            best_sentences = [s.strip() for s in re.split(r'[.!?]+', chunks[0]) if s.strip()][:2]
        
        # Format answer based on type
        if answer_type == "definition":
            answer = best_sentences[0]
            if len(best_sentences) > 1:
                answer += f" {best_sentences[1]}"
        elif answer_type == "list":
            # Look for bullet points or numbered items
            answer = ". ".join(best_sentences[:2])
        elif answer_type == "explanation":
            answer = ". ".join(best_sentences[:2])
        else:
            answer = best_sentences[0] if best_sentences else "Information not found in document."
        
        # Clean up and ensure proper ending
        answer = re.sub(r'\s+', ' ', answer).strip()
        if answer and not answer.endswith('.'):
            answer += '.'
            
        return answer

def initialize_session_state():
    """Initialize session state"""
    if 'rag_system' not in st.session_state:
        st.session_state.rag_system = SimpleRAG()
    if 'document_loaded' not in st.session_state:
        st.session_state.document_loaded = False
    if 'chat_history' not in st.session_state:
        st.session_state.chat_history = []

def process_uploaded_file(uploaded_file):
    """Process uploaded file"""
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp_file:
            tmp_file.write(uploaded_file.getbuffer())
            return tmp_file.name
    except Exception as e:
        st.error(f"Error processing file: {e}")
        return None

def main():
    """Main Streamlit app"""
    initialize_session_state()
    
    st.title("💬 Simple RAG Q&A System")
    st.markdown("Upload a PDF document and ask questions - **Guaranteed Working Answers!**")
    
    # Sidebar
    with st.sidebar:
        st.header("📄 Document Upload")
        
        uploaded_file = st.file_uploader(
            "Choose a PDF file",
            type=['pdf'],
            help="Upload a PDF document to ask questions about"
        )
        
        if uploaded_file is not None:
            st.info(f"📄 Uploaded: {uploaded_file.name} ({uploaded_file.size / 1024:.1f} KB)")
            
            if st.button("🚀 Process Document", type="primary"):
                temp_path = process_uploaded_file(uploaded_file)
                if temp_path:
                    try:
                        st.session_state.rag_system.build_knowledge_base(temp_path)
                        st.session_state.document_loaded = True
                        os.unlink(temp_path)  # Clean up temp file
                        st.rerun()
                    except Exception as e:
                        st.error(f"Error processing document: {e}")
        
        # Demo option
        st.markdown("---")
        if st.button("🎯 Load TypeScript PDF"):
            typescript_path = "/home/ghost/engunity-ai/TYPESCRIPT.pdf"
            if os.path.exists(typescript_path):
                try:
                    st.session_state.rag_system.build_knowledge_base(typescript_path)
                    st.session_state.document_loaded = True
                    st.success("TypeScript document loaded!")
                    st.rerun()
                except Exception as e:
                    st.error(f"Error loading TypeScript PDF: {e}")
            else:
                st.error("TypeScript PDF not found")
    
    # Main content
    if st.session_state.document_loaded:
        st.success("✅ Document loaded and ready for questions!")
        
        col1, col2 = st.columns([2, 1])
        
        with col1:
            st.header("💬 Ask Questions")
            
            # Display chat history
            for i, (question, result) in enumerate(st.session_state.chat_history):
                with st.container():
                    st.markdown(f"**❓ Question {i+1}:** {question}")
                    st.markdown(f"**💡 Answer:** {result['answer']}")
                    
                    # Show metrics
                    col_a, col_b, col_c = st.columns(3)
                    with col_a:
                        st.metric("Response Time", f"{result['response_time']:.2f}s")
                    with col_b:
                        st.metric("Confidence", f"{result['confidence']:.2f}")
                    with col_c:
                        risk = 1 - result['confidence']
                        st.metric("Hallucination Risk", f"{risk:.2f}")
                    
                    st.markdown("---")
            
            # Question input
            with st.form("question_form", clear_on_submit=True):
                question = st.text_area(
                    "Enter your question:",
                    placeholder="What would you like to know about the document?",
                    height=100
                )
                
                col_x, col_y = st.columns([3, 1])
                with col_y:
                    submitted = st.form_submit_button("🔍 Ask", type="primary")
                
                if submitted and question.strip():
                    with st.spinner("🧠 Generating answer..."):
                        result = st.session_state.rag_system.answer_question(question.strip())
                        st.session_state.chat_history.append((question.strip(), result))
                        st.rerun()
        
        with col2:
            st.header("📊 Current Session")
            
            if st.session_state.chat_history:
                total_questions = len(st.session_state.chat_history)
                avg_response_time = np.mean([r[1]['response_time'] for r in st.session_state.chat_history])
                avg_confidence = np.mean([r[1]['confidence'] for r in st.session_state.chat_history])
                
                st.metric("Questions Asked", total_questions)
                st.metric("Avg Response Time", f"{avg_response_time:.2f}s")
                st.metric("Avg Confidence", f"{avg_confidence:.2f}")
                
                if st.button("🗑️ Clear History"):
                    st.session_state.chat_history = []
                    st.rerun()
            else:
                st.info("No questions asked yet!")
            
            # Sample questions
            st.subheader("💡 Try These Questions")
            sample_questions = [
                "What is TypeScript?",
                "What does type safety mean?",
                "How does TypeScript differ from JavaScript?",
                "What are the main benefits?",
                "How does function variance work?"
            ]
            
            for sq in sample_questions:
                if st.button(sq, key=f"sample_{sq[:20]}"):
                    result = st.session_state.rag_system.answer_question(sq)
                    st.session_state.chat_history.append((sq, result))
                    st.rerun()
    
    else:
        st.info("👆 Please upload a PDF document to start asking questions!")
        
        # Sample questions preview
        st.subheader("💡 Example Questions You Can Ask")
        st.markdown("""
        Once you upload a document, you can ask questions like:
        - "What is the main topic of this document?"
        - "Summarize the key points"
        - "What are the conclusions?"
        - "Explain [specific concept] mentioned in the document"
        - "How does [concept A] relate to [concept B]?"
        """)

if __name__ == "__main__":
    main()