#!/usr/bin/env python3
"""
Smart RAG Agent with Scaled Test-Time Compute and Backpropagation

This agent combines:
1. Document retrieval using trained CS embeddings
2. Multiple LLM output generation (scaled test-time compute)
3. Answer scoring and selection via backpropagation
4. Gradient-based optimization for best answer matching

Architecture:
- Document Processor: Uses CS embeddings for retrieval
- Multi-Output Generator: Generates N candidate answers
- Scoring Network: Evaluates answer quality
- Backprop Optimizer: Updates input representations
- Answer Selector: Picks best scored answer
"""

import logging
import torch
import torch.nn as nn
import torch.optim as optim
import numpy as np
from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass
from sentence_transformers import SentenceTransformer
import json
import asyncio
from pathlib import Path

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class RagConfig:
    """Configuration for the Smart RAG Agent"""
    embedding_model_path: str = "backend/models/production/cs_document_embeddings"
    max_retrieved_docs: int = 5
    num_candidate_answers: int = 8  # Number of outputs for test-time compute
    embedding_dim: int = 384
    hidden_dim: int = 512
    learning_rate: float = 1e-4
    device: str = "cuda" if torch.cuda.is_available() else "cpu"
    max_doc_length: int = 512
    temperature_range: Tuple[float, float] = (0.3, 1.2)  # For diverse generation
    
class DocumentProcessor:
    """Handles document embedding and retrieval"""
    
    def __init__(self, config: RagConfig):
        self.config = config
        self.embedding_model = SentenceTransformer(config.embedding_model_path)
        self.embedding_model.to(config.device)
        self.document_store = {}
        self.doc_embeddings = None
        
    def load_documents(self, document_paths: List[str]):
        """Load and embed documents"""
        logger.info(f"Loading documents from {len(document_paths)} paths...")
        
        documents = []
        for path in document_paths:
            try:
                with open(path, 'r', encoding='utf-8') as f:
                    content = f.read()
                    # Split large documents into chunks
                    chunks = self._chunk_document(content, self.config.max_doc_length)
                    for i, chunk in enumerate(chunks):
                        doc_id = f"{path}_chunk_{i}"
                        self.document_store[doc_id] = {
                            'content': chunk,
                            'source': path,
                            'chunk_id': i
                        }
                        documents.append(chunk)
            except Exception as e:
                logger.error(f"Error loading {path}: {e}")
                
        # Create embeddings for all document chunks
        logger.info(f"Creating embeddings for {len(documents)} document chunks...")
        self.doc_embeddings = self.embedding_model.encode(
            documents, 
            convert_to_tensor=True, 
            show_progress_bar=True,
            device=self.config.device
        )
        
        logger.info(f"Document processing complete: {len(documents)} chunks embedded")
        
    def _chunk_document(self, content: str, max_length: int) -> List[str]:
        """Split document into overlapping chunks"""
        words = content.split()
        chunks = []
        overlap = max_length // 4  # 25% overlap
        
        for i in range(0, len(words), max_length - overlap):
            chunk_words = words[i:i + max_length]
            if chunk_words:
                chunks.append(' '.join(chunk_words))
                
        return chunks if chunks else [content]
    
    def retrieve_documents(self, query: str, top_k: int = None) -> List[Dict]:
        """Retrieve most relevant documents for query"""
        if top_k is None:
            top_k = self.config.max_retrieved_docs
            
        # Encode query
        query_embedding = self.embedding_model.encode(
            query, 
            convert_to_tensor=True,
            device=self.config.device
        )
        
        # Compute similarities
        similarities = torch.cosine_similarity(
            query_embedding.unsqueeze(0), 
            self.doc_embeddings
        )
        
        # Get top-k documents
        top_indices = torch.topk(similarities, min(top_k, len(similarities))).indices
        
        retrieved_docs = []
        doc_ids = list(self.document_store.keys())
        
        for idx in top_indices:
            doc_id = doc_ids[idx.item()]
            doc_info = self.document_store[doc_id].copy()
            doc_info['similarity'] = similarities[idx].item()
            retrieved_docs.append(doc_info)
            
        return retrieved_docs

class AnswerScorer(nn.Module):
    """Neural network to score answer quality"""
    
    def __init__(self, config: RagConfig):
        super().__init__()
        self.config = config
        
        # Input: query_embedding + answer_embedding + context_embedding
        input_dim = config.embedding_dim * 3
        
        self.scorer = nn.Sequential(
            nn.Linear(input_dim, config.hidden_dim),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(config.hidden_dim, config.hidden_dim // 2),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(config.hidden_dim // 2, 1),
            nn.Sigmoid()  # Score between 0 and 1
        )
        
    def forward(self, query_emb: torch.Tensor, answer_emb: torch.Tensor, 
                context_emb: torch.Tensor) -> torch.Tensor:
        """Score answer quality given query, answer, and context embeddings"""
        combined = torch.cat([query_emb, answer_emb, context_emb], dim=-1)
        return self.scorer(combined)

class TestTimeComputeGenerator:
    """Generates multiple candidate answers with different strategies"""
    
    def __init__(self, config: RagConfig):
        self.config = config
        
    async def generate_candidates(self, query: str, context: str, 
                                num_candidates: int = None) -> List[str]:
        """Generate multiple candidate answers using different strategies"""
        if num_candidates is None:
            num_candidates = self.config.num_candidate_answers
            
        # Different generation strategies
        strategies = [
            {"temperature": 0.3, "strategy": "precise"},
            {"temperature": 0.7, "strategy": "balanced"},
            {"temperature": 1.0, "strategy": "creative"},
            {"temperature": 0.5, "strategy": "focused"},
            {"temperature": 0.9, "strategy": "diverse"},
            {"temperature": 0.4, "strategy": "conservative"},
            {"temperature": 0.8, "strategy": "exploratory"},
            {"temperature": 0.6, "strategy": "moderate"}
        ]
        
        candidates = []
        
        # For demonstration, we'll simulate different answers
        # In practice, you'd call your LLM with different parameters
        for i, strategy in enumerate(strategies[:num_candidates]):
            prompt = self._build_prompt(query, context, strategy["strategy"])
            
            # Simulate different answer generation (replace with actual LLM calls)
            answer = await self._simulate_llm_call(prompt, strategy["temperature"])
            candidates.append({
                "answer": answer,
                "strategy": strategy["strategy"],
                "temperature": strategy["temperature"],
                "confidence": np.random.uniform(0.6, 0.95)  # Simulated confidence
            })
            
        return candidates
    
    def _build_prompt(self, query: str, context: str, strategy: str) -> str:
        """Build prompt based on strategy"""
        strategy_prompts = {
            "precise": "Provide a precise, factual answer based strictly on the context.",
            "balanced": "Provide a well-balanced answer that covers key aspects.",
            "creative": "Provide an insightful answer that explores implications.",
            "focused": "Focus on the most important aspect of the question.",
            "diverse": "Provide a comprehensive answer covering multiple perspectives.",
            "conservative": "Provide a careful, well-supported answer.",
            "exploratory": "Explore different aspects and possibilities.",
            "moderate": "Provide a measured, thoughtful response."
        }
        
        instruction = strategy_prompts.get(strategy, strategy_prompts["balanced"])
        
        return f"""Context: {context}

Question: {query}

Instructions: {instruction}

Answer:"""
    
    async def _simulate_llm_call(self, prompt: str, temperature: float) -> str:
        """Simulate LLM call (replace with actual API calls)"""
        # This is a simulation - replace with actual LLM API calls
        await asyncio.sleep(0.1)  # Simulate API latency
        
        # Simulate different answers based on temperature
        base_answers = [
            "This is a detailed technical answer focusing on implementation aspects.",
            "The solution involves multiple steps and considerations for optimal results.",
            "Based on the provided context, the key factors are performance and scalability.",
            "The recommended approach balances efficiency with maintainability.",
            "Consider the trade-offs between different algorithmic approaches.",
            "The implementation should prioritize both correctness and performance.",
            "Multiple design patterns can be applied to solve this problem effectively.",
            "The solution requires careful consideration of edge cases and error handling."
        ]
        
        # Add temperature-based variation
        if temperature < 0.5:
            return base_answers[0] + " Precise implementation details are crucial."
        elif temperature < 0.8:
            return base_answers[1] + " Additional context considerations apply."
        else:
            return base_answers[2] + " Creative approaches may yield better results."

class SmartRagAgent:
    """Main agent that orchestrates the RAG pipeline with test-time compute"""
    
    def __init__(self, config: RagConfig = None):
        self.config = config or RagConfig()
        
        # Initialize components
        self.document_processor = DocumentProcessor(self.config)
        self.scorer = AnswerScorer(self.config).to(self.config.device)
        self.generator = TestTimeComputeGenerator(self.config)
        self.optimizer = optim.Adam(self.scorer.parameters(), lr=self.config.learning_rate)
        
        # Initialize embedding model for scoring
        self.embedding_model = SentenceTransformer(self.config.embedding_model_path)
        self.embedding_model.to(self.config.device)
        
        logger.info(f"SmartRagAgent initialized on {self.config.device}")
    
    async def answer_query(self, query: str, ground_truth: str = None) -> Dict:
        """Main method to answer a query using the smart RAG pipeline"""
        logger.info(f"Processing query: {query[:100]}...")
        
        # Step 1: Retrieve relevant documents
        retrieved_docs = self.document_processor.retrieve_documents(query)
        context = self._combine_documents(retrieved_docs)
        
        # Step 2: Generate multiple candidate answers
        candidates = await self.generator.generate_candidates(query, context)
        
        # Step 3: Score all candidates
        scored_candidates = await self._score_candidates(query, candidates, context)
        
        # Step 4: Select best answer
        best_candidate = max(scored_candidates, key=lambda x: x['score'])
        
        # Step 5: If ground truth provided, perform backpropagation
        if ground_truth:
            loss = await self._compute_loss_and_backprop(
                query, best_candidate, ground_truth, context
            )
        
        result = {
            "query": query,
            "answer": best_candidate['answer'],
            "confidence": best_candidate['score'],
            "strategy_used": best_candidate['strategy'],
            "retrieved_docs": len(retrieved_docs),
            "candidates_generated": len(candidates),
            "context_length": len(context)
        }
        
        if ground_truth:
            result["training_loss"] = loss
            
        return result
    
    def _combine_documents(self, docs: List[Dict]) -> str:
        """Combine retrieved documents into context"""
        combined = []
        for doc in docs:
            combined.append(f"[Source: {doc['source']}]\n{doc['content']}")
        return "\n\n".join(combined)
    
    async def _score_candidates(self, query: str, candidates: List[Dict], 
                              context: str) -> List[Dict]:
        """Score all candidate answers"""
        # Encode query and context
        query_emb = self.embedding_model.encode(
            query, convert_to_tensor=True, device=self.config.device
        )
        context_emb = self.embedding_model.encode(
            context, convert_to_tensor=True, device=self.config.device
        )
        
        scored_candidates = []
        
        for candidate in candidates:
            # Encode answer
            answer_emb = self.embedding_model.encode(
                candidate['answer'], convert_to_tensor=True, device=self.config.device
            )
            
            # Score with neural network
            with torch.no_grad():
                score = self.scorer(
                    query_emb.unsqueeze(0),
                    answer_emb.unsqueeze(0), 
                    context_emb.unsqueeze(0)
                ).item()
            
            candidate_copy = candidate.copy()
            candidate_copy['score'] = score
            scored_candidates.append(candidate_copy)
            
        return scored_candidates
    
    async def _compute_loss_and_backprop(self, query: str, predicted_candidate: Dict,
                                       ground_truth: str, context: str) -> float:
        """Compute loss and perform backpropagation"""
        # Encode all inputs
        query_emb = self.embedding_model.encode(
            query, convert_to_tensor=True, device=self.config.device
        )
        predicted_emb = self.embedding_model.encode(
            predicted_candidate['answer'], convert_to_tensor=True, device=self.config.device
        )
        ground_truth_emb = self.embedding_model.encode(
            ground_truth, convert_to_tensor=True, device=self.config.device
        )
        context_emb = self.embedding_model.encode(
            context, convert_to_tensor=True, device=self.config.device
        )
        
        # Forward pass for predicted answer
        predicted_score = self.scorer(
            query_emb.unsqueeze(0),
            predicted_emb.unsqueeze(0),
            context_emb.unsqueeze(0)
        )
        
        # Forward pass for ground truth
        ground_truth_score = self.scorer(
            query_emb.unsqueeze(0),
            ground_truth_emb.unsqueeze(0),
            context_emb.unsqueeze(0)
        )
        
        # Loss: ground truth should score higher than prediction if prediction is wrong
        similarity = torch.cosine_similarity(predicted_emb, ground_truth_emb, dim=0)
        target_score = torch.tensor([1.0], device=self.config.device)
        
        # If prediction is very similar to ground truth, target high score
        # Otherwise, penalize the scorer
        if similarity > 0.8:
            loss = nn.MSELoss()(predicted_score, target_score)
        else:
            # Ground truth should score higher
            loss = nn.MSELoss()(ground_truth_score, target_score) + \
                   torch.max(torch.tensor([0.0], device=self.config.device), 
                           predicted_score - ground_truth_score + 0.1)
        
        # Backpropagation
        self.optimizer.zero_grad()
        loss.backward()
        self.optimizer.step()
        
        return loss.item()
    
    def save_model(self, path: str):
        """Save the trained scorer model"""
        torch.save({
            'model_state_dict': self.scorer.state_dict(),
            'optimizer_state_dict': self.optimizer.state_dict(),
            'config': self.config
        }, path)
        logger.info(f"Model saved to {path}")
    
    def load_model(self, path: str):
        """Load a trained scorer model"""
        checkpoint = torch.load(path, map_location=self.config.device)
        self.scorer.load_state_dict(checkpoint['model_state_dict'])
        self.optimizer.load_state_dict(checkpoint['optimizer_state_dict'])
        logger.info(f"Model loaded from {path}")

class SmartRagTrainer:
    """Trainer for the Smart RAG Agent"""
    
    def __init__(self, agent: SmartRagAgent, training_data_path: str):
        self.agent = agent
        self.training_data = self._load_training_data(training_data_path)
        
    def _load_training_data(self, path: str) -> List[Dict]:
        """Load training data from JSONL file"""
        data = []
        with open(path, 'r', encoding='utf-8') as f:
            for line in f:
                data.append(json.loads(line.strip()))
        return data
    
    async def train(self, epochs: int = 10, save_path: str = None):
        """Train the agent on the loaded data"""
        logger.info(f"Starting training for {epochs} epochs on {len(self.training_data)} examples")
        
        total_loss = 0
        for epoch in range(epochs):
            epoch_loss = 0
            
            for i, example in enumerate(self.training_data):
                query = example['question']
                ground_truth = example['answer']
                
                # Process query and get loss
                result = await self.agent.answer_query(query, ground_truth)
                loss = result.get('training_loss', 0)
                
                epoch_loss += loss
                total_loss += loss
                
                if (i + 1) % 10 == 0:
                    logger.info(f"Epoch {epoch+1}, Step {i+1}/{len(self.training_data)}, "
                              f"Loss: {loss:.4f}")
            
            avg_epoch_loss = epoch_loss / len(self.training_data)
            logger.info(f"Epoch {epoch+1} completed. Average loss: {avg_epoch_loss:.4f}")
            
            # Save checkpoint
            if save_path and (epoch + 1) % 5 == 0:
                checkpoint_path = f"{save_path}_epoch_{epoch+1}.pt"
                self.agent.save_model(checkpoint_path)
        
        logger.info(f"Training completed. Total average loss: {total_loss / (epochs * len(self.training_data)):.4f}")
        
        if save_path:
            self.agent.save_model(f"{save_path}_final.pt")

# Example usage and testing
async def main():
    """Example usage of the Smart RAG Agent"""
    
    # Initialize configuration
    config = RagConfig(
        embedding_model_path="backend/models/production/cs_document_embeddings",
        num_candidate_answers=5,
        learning_rate=1e-4
    )
    
    # Initialize agent
    agent = SmartRagAgent(config)
    
    # Load some documents (you would replace with actual document paths)
    # agent.document_processor.load_documents([
    #     "path/to/document1.txt",
    #     "path/to/document2.txt"
    # ])
    
    # Example query
    query = "How do I implement a binary search algorithm efficiently?"
    
    # Get answer
    result = await agent.answer_query(query)
    
    print(f"Query: {result['query']}")
    print(f"Answer: {result['answer']}")
    print(f"Confidence: {result['confidence']:.3f}")
    print(f"Strategy: {result['strategy_used']}")
    print(f"Documents retrieved: {result['retrieved_docs']}")

if __name__ == "__main__":
    # Run example
    asyncio.run(main())