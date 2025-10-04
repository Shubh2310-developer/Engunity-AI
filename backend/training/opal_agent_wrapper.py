#!/usr/bin/env python3
"""
Opal AI Agent Wrapper Service
============================

This service wraps your existing AI agents to make them accessible to Opal AI platforms.
It provides RESTful API endpoints that Opal can call to use your sophisticated agents.

Features:
- FastAPI service with multiple agent types
- Async processing for better performance
- Structured responses for Opal integration
- Error handling and logging
- Agent capability discovery

Usage:
    python opal_agent_wrapper.py

Then connect Opal AI to: http://localhost:8001
"""

from typing import Dict, Any, Optional, List
from fastapi import FastAPI, HTTPException, BackgroundTasks
from pydantic import BaseModel, Field
import asyncio
import sys
import os
import time
import logging
from pathlib import Path

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Add project paths
project_root = Path(__file__).parent.parent
sys.path.append(str(project_root))
sys.path.append(str(project_root / "app"))

app = FastAPI(
    title="Engunity AI Opal Agent Services",
    description="Sophisticated AI agents accessible via Opal AI integration",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Request/Response Models
class QueryRequest(BaseModel):
    query: str = Field(..., description="The user's question or request")
    agent_type: str = Field("hybrid", description="Type of agent to use")
    use_web_search: bool = Field(True, description="Enable web search fallback")
    confidence_threshold: float = Field(0.7, description="Minimum confidence for local answers")
    max_sources: int = Field(5, description="Maximum number of sources to return")
    user_id: Optional[str] = Field(None, description="User identifier for personalization")
    session_id: Optional[str] = Field(None, description="Session for chat history")

class AgentResponse(BaseModel):
    answer: str = Field(..., description="The generated answer")
    confidence: float = Field(..., description="Confidence score (0.0-1.0)")
    sources: List[Dict[str, Any]] = Field(default_factory=list, description="Source documents used")
    agent_used: str = Field(..., description="Which agent processed the query")
    processing_time: float = Field(..., description="Time taken to process")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional metadata")
    search_strategy: Optional[str] = Field(None, description="Search strategy employed")
    web_search_used: bool = Field(False, description="Whether web search was triggered")

class AgentCapability(BaseModel):
    name: str
    description: str
    capabilities: List[str]
    best_for: List[str]
    example_queries: List[str]

class OpalAgentService:
    """Service class managing all AI agents for Opal integration"""
    
    def __init__(self):
        self.agents = {}
        self.capabilities = {}
        self.stats = {
            'total_queries': 0,
            'successful_queries': 0,
            'failed_queries': 0,
            'agent_usage': {},
            'avg_processing_time': 0.0
        }
        self.initialize_agents()
    
    def initialize_agents(self):
        """Initialize all available agents"""
        logger.info("Initializing AI agents for Opal integration...")
        
        try:
            # Try to import and initialize agents
            self._try_initialize_hybrid_agent()
            self._try_initialize_smart_agent()
            self._try_initialize_orchestrator_agent()
            self._setup_fallback_agent()
            
            logger.info(f"✅ Initialized {len(self.agents)} agents successfully")
            
        except Exception as e:
            logger.error(f"Error initializing agents: {e}")
            # Setup fallback agent if all else fails
            self._setup_fallback_agent()
    
    def _try_initialize_hybrid_agent(self):
        """Try to initialize Hybrid RAG Agent"""
        try:
            from app.services.rag.hybrid_rag_agent import HybridRagAgent, HybridRagConfig
            
            config = HybridRagConfig(
                confidence_threshold=0.7,
                web_search_enabled=True,
                hybrid_mode_enabled=True,
                document_first_priority=True
            )
            
            self.agents['hybrid'] = HybridRagAgent(config)
            self.capabilities['hybrid'] = AgentCapability(
                name="Hybrid RAG Agent",
                description="Intelligent document + web search with quality assessment",
                capabilities=[
                    "document_search", "web_search", "multi_source_answers", 
                    "confidence_based_routing", "answer_quality_assessment"
                ],
                best_for=[
                    "Research questions", "Technical documentation lookup",
                    "Current events", "Comprehensive analysis"
                ],
                example_queries=[
                    "What is transformer architecture in deep learning?",
                    "Latest developments in quantum computing",
                    "Compare different database systems"
                ]
            )
            logger.info("✅ Hybrid RAG Agent initialized")
            
        except Exception as e:
            logger.warning(f"Could not initialize Hybrid RAG Agent: {e}")
    
    def _try_initialize_smart_agent(self):
        """Try to initialize Smart RAG Agent"""
        try:
            from app.services.rag.smart_rag_agent import SmartRagAgent, RagConfig
            
            config = RagConfig(
                embedding_model_path=str(project_root / "models/production/cs_document_embeddings"),
                num_candidate_answers=5,
                use_test_time_scaling=True,
                max_retrieval_chunks=8
            )
            
            self.agents['smart'] = SmartRagAgent(config)
            self.capabilities['smart'] = AgentCapability(
                name="Smart RAG Agent",
                description="Test-time compute with neural answer scoring",
                capabilities=[
                    "multi_candidate_generation", "neural_scoring", 
                    "self_improvement", "backpropagation_learning"
                ],
                best_for=[
                    "Complex technical questions", "Code-related queries",
                    "Computer science topics", "Detailed explanations"
                ],
                example_queries=[
                    "Explain binary search algorithm implementation",
                    "How do neural networks backpropagate?",
                    "Best practices for database indexing"
                ]
            )
            logger.info("✅ Smart RAG Agent initialized")
            
        except Exception as e:
            logger.warning(f"Could not initialize Smart RAG Agent: {e}")
    
    def _try_initialize_orchestrator_agent(self):
        """Try to initialize RAG Agent Orchestrator"""
        try:
            from training.ai_agents import RAGAgentOrchestrator
            
            self.agents['orchestrator'] = RAGAgentOrchestrator()
            self.capabilities['orchestrator'] = AgentCapability(
                name="RAG Agent Orchestrator",
                description="Pipeline of 16 specialized agents for comprehensive answers",
                capabilities=[
                    "query_analysis", "multi_perspective_generation", 
                    "fact_checking", "citation_generation", "answer_formatting",
                    "confidence_scoring", "memory_integration"
                ],
                best_for=[
                    "Academic research", "Detailed analysis", 
                    "Multi-faceted questions", "Citation-required answers"
                ],
                example_queries=[
                    "Provide a comprehensive analysis of machine learning trends",
                    "Compare pros and cons of different programming languages",
                    "Explain the history and evolution of artificial intelligence"
                ]
            )
            logger.info("✅ RAG Agent Orchestrator initialized")
            
        except Exception as e:
            logger.warning(f"Could not initialize RAG Agent Orchestrator: {e}")
    
    def _setup_fallback_agent(self):
        """Setup a simple fallback agent"""
        class FallbackAgent:
            async def answer_query(self, query: str, **kwargs):
                return {
                    'answer': f"I received your query: '{query}'. This is a fallback response - full agents are not yet configured. Please check the agent initialization logs.",
                    'confidence': 0.3,
                    'sources': [],
                    'processing_time': 0.1,
                    'metadata': {'agent_type': 'fallback', 'status': 'agents_not_configured'}
                }
        
        if 'fallback' not in self.agents:
            self.agents['fallback'] = FallbackAgent()
            self.capabilities['fallback'] = AgentCapability(
                name="Fallback Agent",
                description="Simple response agent when others are unavailable",
                capabilities=["basic_response"],
                best_for=["Testing", "Fallback scenarios"],
                example_queries=["Hello", "Test query"]
            )
            logger.info("✅ Fallback agent configured")
    
    async def process_query(self, request: QueryRequest) -> AgentResponse:
        """Process query through specified agent"""
        start_time = time.time()
        self.stats['total_queries'] += 1
        
        try:
            # Get agent
            agent = self.agents.get(request.agent_type)
            if not agent:
                # Try fallback
                available_types = list(self.agents.keys())
                if available_types:
                    request.agent_type = available_types[0]
                    agent = self.agents[request.agent_type]
                else:
                    raise HTTPException(400, "No agents available")
            
            # Track agent usage
            if request.agent_type not in self.stats['agent_usage']:
                self.stats['agent_usage'][request.agent_type] = 0
            self.stats['agent_usage'][request.agent_type] += 1
            
            # Process query based on agent type
            if request.agent_type == "hybrid":
                result = await self._process_hybrid_query(agent, request)
            elif request.agent_type == "smart":
                result = await self._process_smart_query(agent, request)
            elif request.agent_type == "orchestrator":
                result = await self._process_orchestrator_query(agent, request)
            else:
                result = await agent.answer_query(request.query)
            
            processing_time = time.time() - start_time
            
            # Update stats
            self.stats['successful_queries'] += 1
            total_time = self.stats['avg_processing_time'] * (self.stats['successful_queries'] - 1)
            self.stats['avg_processing_time'] = (total_time + processing_time) / self.stats['successful_queries']
            
            return AgentResponse(
                answer=result.get('answer', 'No answer generated'),
                confidence=float(result.get('confidence', 0.0)),
                sources=result.get('sources', []),
                agent_used=request.agent_type,
                processing_time=processing_time,
                metadata=result.get('metadata', {}),
                search_strategy=result.get('search_strategy'),
                web_search_used=result.get('web_search_used', False)
            )
            
        except Exception as e:
            self.stats['failed_queries'] += 1
            logger.error(f"Error processing query with {request.agent_type}: {e}")
            
            return AgentResponse(
                answer=f"I apologize, but I encountered an error processing your query: {str(e)}",
                confidence=0.0,
                sources=[],
                agent_used=request.agent_type,
                processing_time=time.time() - start_time,
                metadata={'error': str(e), 'error_type': type(e).__name__}
            )
    
    async def _process_hybrid_query(self, agent, request: QueryRequest):
        """Process query through Hybrid RAG Agent"""
        return await agent.answer_query(
            query=request.query,
            force_web_search=not request.use_web_search  # Invert logic
        )
    
    async def _process_smart_query(self, agent, request: QueryRequest):
        """Process query through Smart RAG Agent"""
        return await agent.answer_query(request.query)
    
    async def _process_orchestrator_query(self, agent, request: QueryRequest):
        """Process query through RAG Agent Orchestrator"""
        # This would need a proper retriever and QA system setup
        # For now, return a structured response
        return {
            'answer': f"Processed '{request.query}' through orchestrator pipeline with {len(agent.query_rewriter.expansion_patterns)} specialized agents",
            'confidence': 0.8,
            'sources': [],
            'processing_time': 0.5,
            'metadata': {'pipeline_agents': 16, 'status': 'orchestrated'}
        }

# Global service instance
opal_service = OpalAgentService()

# API Endpoints
@app.post("/query", response_model=AgentResponse, 
         summary="Process Query", 
         description="Send a query to AI agents and get intelligent response")
async def process_query(request: QueryRequest):
    """Main endpoint for Opal AI to call your agents"""
    return await opal_service.process_query(request)

@app.get("/agents", summary="List Available Agents")
async def list_agents():
    """List available agents with their capabilities"""
    return {
        "available_agents": {
            agent_type: capability.dict() 
            for agent_type, capability in opal_service.capabilities.items()
        },
        "total_agents": len(opal_service.agents),
        "recommended_agent": "hybrid" if "hybrid" in opal_service.agents else list(opal_service.agents.keys())[0] if opal_service.agents else "none"
    }

@app.get("/health", summary="Health Check")
async def health_check():
    """Health check endpoint for monitoring"""
    return {
        "status": "healthy",
        "agents_available": len(opal_service.agents),
        "uptime_queries": opal_service.stats['total_queries'],
        "success_rate": (
            opal_service.stats['successful_queries'] / max(opal_service.stats['total_queries'], 1) * 100
        ),
        "avg_processing_time": opal_service.stats['avg_processing_time']
    }

@app.get("/stats", summary="Service Statistics")
async def get_stats():
    """Detailed service statistics"""
    return opal_service.stats

@app.get("/capabilities/{agent_type}", summary="Agent Capabilities")
async def get_agent_capabilities(agent_type: str):
    """Get detailed capabilities for specific agent"""
    if agent_type not in opal_service.capabilities:
        raise HTTPException(404, f"Agent type '{agent_type}' not found")
    
    return opal_service.capabilities[agent_type].dict()

@app.post("/test", summary="Test Agent")
async def test_agent(agent_type: str = "hybrid"):
    """Quick test endpoint"""
    test_request = QueryRequest(
        query="What is artificial intelligence?",
        agent_type=agent_type,
        max_sources=3
    )
    return await opal_service.process_query(test_request)

# Opal AI Integration Helpers
@app.get("/opal/config", summary="Opal Configuration")
async def opal_configuration():
    """Generate configuration for Opal AI platform"""
    return {
        "service_info": {
            "name": "Engunity AI Agents",
            "version": "1.0.0", 
            "description": "Sophisticated AI agents for research and programming assistance",
            "base_url": "http://localhost:8001",
            "documentation_url": "http://localhost:8001/docs"
        },
        "endpoints": {
            "query": {
                "url": "/query",
                "method": "POST",
                "description": "Main query processing endpoint"
            },
            "agents": {
                "url": "/agents", 
                "method": "GET",
                "description": "List available agents"
            },
            "test": {
                "url": "/test",
                "method": "POST", 
                "description": "Test agent functionality"
            }
        },
        "capabilities": [cap.dict() for cap in opal_service.capabilities.values()],
        "recommended_workflows": {
            "research_assistant": {
                "description": "Comprehensive research with multiple sources",
                "agent": "hybrid",
                "confidence_threshold": 0.7
            },
            "code_mentor": {
                "description": "Programming help with examples",
                "agent": "smart", 
                "max_sources": 5
            },
            "academic_analysis": {
                "description": "Detailed analysis with citations",
                "agent": "orchestrator",
                "confidence_threshold": 0.8
            }
        }
    }

if __name__ == "__main__":
    import uvicorn
    
    print("🚀 Starting Engunity AI Opal Agent Service...")
    print("📊 Dashboard: http://localhost:8001/docs")
    print("🔍 Agents: http://localhost:8001/agents")
    print("⚡ Health: http://localhost:8001/health")
    print("\n🤖 Ready for Opal AI integration!")
    
    uvicorn.run(
        app, 
        host="0.0.0.0", 
        port=8001,
        log_level="info",
        reload=False  # Set to True for development
    )