"""
Enhanced RAG System - Complete Implementation
============================================

Comprehensive RAG system that addresses all quality issues:
1. ✅ Enhanced Document Chunking (512-1024 tokens, 128 overlap)
2. ✅ BGE Reranker for better retrieval filtering
3. ✅ Best-of-N Generation with Phi-2 (N=5, advanced scoring)
4. ✅ Wikipedia Fallback Agent for unanswerable questions
5. ✅ JSON-formatted responses with proper English
6. ✅ Quality validation and confidence scoring

Usage:
    python enhanced_rag_system.py --query "What is TypeScript?"
"""

import os
import sys
import json
import logging
import asyncio
import argparse
from typing import Dict, List, Optional, Any
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent
sys.path.append(str(project_root))
sys.path.append(str(project_root / "app"))
sys.path.append(str(project_root / "app" / "services" / "rag"))

from app.services.rag.enhanced_document_chunker import EnhancedDocumentChunker
from app.services.rag.enhanced_reranker import EnhancedReranker
from app.services.rag.enhanced_best_of_n_generator import EnhancedBestOfNGenerator
from app.services.rag.wikipedia_fallback_agent import WikipediaFallbackAgent
from app.services.rag.bge_retriever import BGERetriever

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class EnhancedRAGSystem:
    """Complete enhanced RAG system with all improvements."""
    
    def __init__(
        self,
        index_path: str = "/home/ghost/engunity-ai/backend/models/documents/nq_faiss_index.faiss",
        metadata_path: str = "/home/ghost/engunity-ai/backend/models/documents/nq_metadata.pkl",
        confidence_threshold: float = 0.6
    ):
        self.confidence_threshold = confidence_threshold
        
        # Initialize components
        logger.info("Initializing Enhanced RAG System...")
        
        # 1. Document Chunker (for future document processing)
        self.chunker = EnhancedDocumentChunker(
            chunk_size=768,
            overlap_size=128
        )
        
        # 2. BGE Retriever
        self.retriever = BGERetriever(
            index_path=index_path,
            metadata_path=metadata_path,
            use_existing_index=True
        )
        
        # 3. Enhanced Reranker
        self.reranker = EnhancedReranker(
            model_name="BAAI/bge-reranker-base",
            use_fp16=True
        )
        
        # 4. Best-of-N Generator
        self.generator = EnhancedBestOfNGenerator(
            model_name="microsoft/phi-2",
            n_candidates=5
        )
        
        # 5. Wikipedia Fallback Agent
        self.wikipedia_agent = WikipediaFallbackAgent(
            max_search_results=3
        )
        
        logger.info("Enhanced RAG System initialized successfully!")
    
    async def process_query(self, query: str, document_id: Optional[str] = None) -> Dict[str, Any]:
        """Process a query through the enhanced RAG pipeline."""
        
        logger.info(f"Processing query: {query}")
        pipeline_metadata = {
            'query': query,
            'document_id': document_id,
            'pipeline_steps': [],
            'confidence_scores': {},
            'processing_times': {}
        }
        
        # Step 1: Retrieve relevant chunks
        logger.info("Step 1: Retrieving relevant chunks...")
        start_time = asyncio.get_event_loop().time()
        
        try:
            # Use the real BGE retriever
            retrieval_results = await self.retriever.retrieve_async(query, top_k=10)
            
            # Convert to expected format
            raw_passages = []
            for result in retrieval_results:
                raw_passages.append({
                    'content': result.content,
                    'score': result.score,
                    'metadata': result.metadata
                })
            
            pipeline_metadata['processing_times']['retrieval'] = asyncio.get_event_loop().time() - start_time
            pipeline_metadata['pipeline_steps'].append('bge_retrieval')
            
        except Exception as e:
            logger.error(f"BGE retrieval failed: {e}")
            raw_passages = []
        
        if not raw_passages:
            logger.warning("No passages retrieved, using Wikipedia fallback")
            return await self._wikipedia_fallback(query, pipeline_metadata)
        
        # Step 2: Rerank passages for quality
        logger.info("Step 2: Reranking passages...")
        start_time = asyncio.get_event_loop().time()
        
        try:
            reranked_passages = self.reranker.get_best_passages(
                query=query,
                passages=raw_passages,
                top_k=5,
                min_score=0.2
            )
            
            pipeline_metadata['processing_times']['reranking'] = asyncio.get_event_loop().time() - start_time
            pipeline_metadata['pipeline_steps'].append('bge_reranking')
            pipeline_metadata['confidence_scores']['retrieval_quality'] = (
                sum(p['score'] for p in reranked_passages) / len(reranked_passages) 
                if reranked_passages else 0.0
            )
            
        except Exception as e:
            logger.error(f"Reranking failed: {e}")
            reranked_passages = raw_passages[:5]  # Fallback to top 5
        
        if not reranked_passages:
            logger.warning("No relevant passages after reranking, using Wikipedia fallback")
            return await self._wikipedia_fallback(query, pipeline_metadata)
        
        # Step 3: Generate answer using Best-of-N
        logger.info("Step 3: Generating answer with Best-of-N...")
        start_time = asyncio.get_event_loop().time()
        
        try:
            context_chunks = [p['content'] for p in reranked_passages]
            
            generation_result = self.generator.generate_best_answer(
                query=query,
                context_chunks=context_chunks,
                n_candidates=5
            )
            
            pipeline_metadata['processing_times']['generation'] = asyncio.get_event_loop().time() - start_time
            pipeline_metadata['pipeline_steps'].append('best_of_n_generation')
            pipeline_metadata['confidence_scores']['generation_confidence'] = generation_result.confidence
            
            # Parse the generated answer
            try:
                answer_data = json.loads(generation_result.best_answer)
                local_confidence = answer_data.get('confidence', generation_result.confidence)
                local_answer = answer_data.get('answer', '')
            except json.JSONDecodeError:
                local_answer = generation_result.best_answer
                local_confidence = generation_result.confidence
            
        except Exception as e:
            logger.error(f"Generation failed: {e}")
            local_answer = ""
            local_confidence = 0.0
        
        # Step 4: Check if Wikipedia fallback is needed
        should_use_wikipedia = self.wikipedia_agent.should_trigger_fallback(
            local_confidence=local_confidence,
            local_answer=local_answer,
            confidence_threshold=self.confidence_threshold
        )
        
        if should_use_wikipedia:
            logger.info("Step 4: Triggering Wikipedia fallback...")
            return await self._wikipedia_fallback(query, pipeline_metadata, local_result={
                'answer': local_answer,
                'confidence': local_confidence,
                'sources': reranked_passages
            })
        
        # Step 5: Format final response
        logger.info("Step 5: Formatting final response...")
        
        # Ensure proper JSON format
        if isinstance(generation_result.best_answer, str):
            try:
                final_response = json.loads(generation_result.best_answer)
            except json.JSONDecodeError:
                final_response = {
                    "answer": generation_result.best_answer,
                    "confidence": generation_result.confidence,
                    "source_chunks_used": [f"Document chunk {i+1}" for i in range(len(context_chunks))]
                }
        else:
            final_response = generation_result.best_answer
        
        # Add enhanced metadata
        final_response['metadata'] = {
            **pipeline_metadata,
            'system_version': 'enhanced_rag_v1.0',
            'components_used': ['bge_retriever', 'bge_reranker', 'phi2_best_of_n'],
            'chunks_processed': len(raw_passages),
            'chunks_used': len(reranked_passages),
            'generation_candidates': len(generation_result.all_candidates),
            'final_confidence': final_response.get('confidence', generation_result.confidence)
        }
        
        logger.info(f"Query processed successfully with confidence: {final_response.get('confidence', 0)}")
        return final_response
    
    async def _wikipedia_fallback(
        self, 
        query: str, 
        pipeline_metadata: Dict[str, Any],
        local_result: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Use Wikipedia fallback for unanswerable questions."""
        
        logger.info("Using Wikipedia fallback...")
        start_time = asyncio.get_event_loop().time()
        
        try:
            wikipedia_result = self.wikipedia_agent.search_and_answer(query)
            
            pipeline_metadata['processing_times']['wikipedia_fallback'] = asyncio.get_event_loop().time() - start_time
            pipeline_metadata['pipeline_steps'].append('wikipedia_fallback')
            pipeline_metadata['confidence_scores']['wikipedia_confidence'] = wikipedia_result.confidence
            
            # Parse Wikipedia answer
            try:
                wikipedia_answer = json.loads(wikipedia_result.answer)
            except json.JSONDecodeError:
                wikipedia_answer = {
                    "answer": wikipedia_result.answer,
                    "confidence": wikipedia_result.confidence,
                    "source_chunks_used": [source.title for source in wikipedia_result.sources]
                }
            
            # Enhance with metadata
            wikipedia_answer['metadata'] = {
                **pipeline_metadata,
                'system_version': 'enhanced_rag_v1.0',
                'components_used': ['wikipedia_fallback'],
                'fallback_triggered': True,
                'wikipedia_sources': len(wikipedia_result.sources),
                'local_result_available': local_result is not None
            }
            
            if local_result:
                wikipedia_answer['metadata']['local_confidence'] = local_result['confidence']
                wikipedia_answer['metadata']['fallback_reason'] = 'low_confidence_or_poor_quality'
            
            return wikipedia_answer
            
        except Exception as e:
            logger.error(f"Wikipedia fallback failed: {e}")
            
            # Final fallback response
            return {
                "answer": "I apologize, but I'm unable to provide a satisfactory answer to your question based on the available information.",
                "confidence": 0.1,
                "source_chunks_used": [],
                "metadata": {
                    **pipeline_metadata,
                    'system_version': 'enhanced_rag_v1.0',
                    'components_used': ['error_fallback'],
                    'error': str(e)
                }
            }
    
    def process_query_sync(self, query: str, document_id: Optional[str] = None) -> Dict[str, Any]:
        """Synchronous wrapper for query processing."""
        return asyncio.run(self.process_query(query, document_id))

# CLI Interface
async def main():
    """Command-line interface for testing the enhanced RAG system."""
    
    parser = argparse.ArgumentParser(description='Enhanced RAG System')
    parser.add_argument('--query', '-q', type=str, required=True, help='Query to process')
    parser.add_argument('--document-id', '-d', type=str, help='Document ID (optional)')
    parser.add_argument('--confidence-threshold', '-c', type=float, default=0.6, help='Confidence threshold for fallback')
    parser.add_argument('--output', '-o', type=str, help='Output file for results')
    
    args = parser.parse_args()
    
    # Initialize system
    rag_system = EnhancedRAGSystem(confidence_threshold=args.confidence_threshold)
    
    # Process query
    result = await rag_system.process_query(args.query, args.document_id)
    
    # Output results
    output_text = json.dumps(result, indent=2, ensure_ascii=False)
    
    if args.output:
        with open(args.output, 'w', encoding='utf-8') as f:
            f.write(output_text)
        print(f"Results saved to {args.output}")
    else:
        print(output_text)

if __name__ == "__main__":
    asyncio.run(main())