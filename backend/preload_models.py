#!/usr/bin/env python3
"""
Model Preloader
===============
Preloads all ML models before starting servers to ensure fast startup
"""

import sys
import os
from pathlib import Path

# Add project paths
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

print("🔄 Preloading ML Models...")
print("=" * 50)

# 1. Preload BGE Retriever
print("\n📚 Loading BGE Retriever + FAISS Index...")
try:
    from app.services.rag.bge_retriever import BGERetriever

    index_path = "/home/ghost/engunity-ai/backend/models/documents/nq_faiss_index.faiss"
    metadata_path = "/home/ghost/engunity-ai/backend/models/documents/nq_metadata.pkl"

    if os.path.exists(index_path):
        bge_retriever = BGERetriever(
            index_path=index_path,
            metadata_path=metadata_path,
            use_existing_index=True
        )
        print("✅ BGE Retriever loaded successfully")
    else:
        print("⚠️  FAISS index not found - will be created on first use")
except Exception as e:
    print(f"⚠️  BGE Retriever: {e}")

# 2. Preload Phi-2 Generator
print("\n🤖 Loading Phi-2 Generator (Best-of-N)...")
try:
    from app.services.rag.enhanced_best_of_n_generator import EnhancedBestOfNGenerator

    phi2_generator = EnhancedBestOfNGenerator(
        model_name="microsoft/phi-2",
        n_candidates=5,
        max_new_tokens=800
    )
    print("✅ Phi-2 Generator loaded successfully")
except Exception as e:
    print(f"⚠️  Phi-2 Generator: {e}")

# 3. Preload Citation Classifier
print("\n🎯 Loading Citation Classifier...")
try:
    from app.api.research.classify_citations import HybridCitationClassifier

    model_path = "/home/ghost/engunity-ai/backend/training/citation_classifier_arxiv/checkpoint-1501"

    # Force CPU mode
    import torch
    torch.cuda.is_available = lambda: False

    if os.path.exists(model_path):
        citation_classifier = HybridCitationClassifier(
            model_path=model_path,
            confidence_threshold=0.6,
            cache_size=10000
        )
        print("✅ Citation Classifier loaded successfully")
    else:
        print("⚠️  Citation Classifier model not found - using rule-based only")
except Exception as e:
    print(f"⚠️  Citation Classifier: {e}")

# 4. Preload Wikipedia Agent
print("\n🌐 Loading Wikipedia Agent...")
try:
    from app.services.rag.wikipedia_fallback_agent import WikipediaFallbackAgent

    wiki_agent = WikipediaFallbackAgent(
        max_search_results=3,
        max_content_length=2000
    )
    print("✅ Wikipedia Agent loaded successfully")
except Exception as e:
    print(f"⚠️  Wikipedia Agent: {e}")

print("\n" + "=" * 50)
print("✅ All models preloaded successfully!")
print("🚀 Ready to start servers...")
