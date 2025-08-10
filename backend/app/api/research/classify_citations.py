"""
Enhanced Citation Classifier API with Hybrid NLP Pipeline
Implements rule-based pre-classification + ML model for ambiguous cases
"""

import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import json
import re
from pathlib import Path
from typing import Dict, List, Optional, Tuple
import hashlib
import time
from dataclasses import dataclass
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
import numpy as np
import logging

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class ClassificationResult:
    """Structured classification result"""
    predicted_class: str
    confidence: float
    probabilities: Dict[str, float]
    method: str  # 'rule_based' or 'ml_model'
    normalized_text: str
    processing_time: float

class HybridCitationClassifier:
    """
    Hybrid Citation Classifier combining rule-based and ML approaches
    Following senior AI engineer recommendations
    """
    
    def __init__(self, 
                 model_path: str = "/home/ghost/engunity-ai/backend/training/citation_classifier_arxiv/checkpoint-1501",
                 confidence_threshold: float = 0.6,
                 cache_size: int = 10000):
        
        self.model_path = Path(model_path)
        self.confidence_threshold = confidence_threshold
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        
        # Classification cache for performance
        self.classification_cache: Dict[str, ClassificationResult] = {}
        self.cache_size = cache_size
        
        # Labels (consistent with training)
        self.labels = ['Background', 'Method', 'Comparison', 'Result', 'Other']
        
        # Rule-based patterns for fast pre-classification
        self.rule_patterns = self._initialize_rule_patterns()
        
        # Load ML model (lazy loading for performance)
        self.tokenizer = None
        self.model = None
        self._model_loaded = False
        
        logger.info(f"Hybrid Citation Classifier initialized with confidence threshold: {confidence_threshold}")
    
    def _initialize_rule_patterns(self) -> Dict[str, List[str]]:
        """Initialize regex patterns for rule-based classification"""
        return {
            'Method': [
                r'\b(?:following|using|adopting|implementing|applying|based on|according to|as in)\b.*\[?CITATION\]?',
                r'\[?CITATION\]?\s*(?:method|methodology|approach|algorithm|technique|framework|procedure)',
                r'\b(?:we use|we adopt|we follow|we implement|we apply)\b.*\[?CITATION\]?',
                r'\b(?:the|their|this)\s+(?:method|approach|algorithm|technique|framework)\s+(?:from|in|of)\b.*\[?CITATION\]?'
            ],
            'Comparison': [
                r'\b(?:compared? (?:to|with)|vs\.?|versus|outperform|better than|superior to|unlike)\b.*\[?CITATION\]?',
                r'\[?CITATION\]?\s*(?:achieve|report|show|demonstrate).*(?:higher|lower|better|worse)',
                r'\b(?:in contrast to|different from|unlike|while)\b.*\[?CITATION\]?',
                r'\b(?:our (?:method|approach|results)|we)\s+(?:outperform|exceed|surpass|improve (?:on|upon))\b.*\[?CITATION\]?'
            ],
            'Result': [
                r'\b(?:consistent with|similar to|align with|confirm|validate|support|corroborate)\b.*\[?CITATION\]?',
                r'\[?CITATION\]?\s*(?:also|similarly|likewise)\s+(?:found|showed|reported|observed)',
                r'\b(?:these (?:results|findings)|our (?:results|findings))\s+(?:are|show|demonstrate|indicate).*\[?CITATION\]?',
                r'\b(?:as (?:expected|predicted|shown)|this (?:confirms|validates|supports))\b.*\[?CITATION\]?'
            ],
            'Background': [
                r'\b(?:previous|prior|earlier|recent|extensive)\s+(?:work|research|studies|literature)\b.*\[?CITATION\]?',
                r'\[?CITATION\]?\s*(?:established|introduced|proposed|developed|presented)',
                r'\b(?:the field of|research in|studies on|work on)\b.*\[?CITATION\]?',
                r'\b(?:foundation|basis|groundwork|background)\b.*\[?CITATION\]?'
            ]
        }
    
    def _load_ml_model(self):
        """Lazy load the ML model when needed"""
        if self._model_loaded:
            return
            
        try:
            logger.info("Loading ML model for citation classification...")
            self.tokenizer = AutoTokenizer.from_pretrained(str(self.model_path))
            self.model = AutoModelForSequenceClassification.from_pretrained(str(self.model_path))
            self.model.to(self.device)
            self.model.eval()
            
            # Load label mapping
            label_map_path = self.model_path.parent / 'label_mapping.json'
            with open(label_map_path, 'r') as f:
                self.label_mapping = json.load(f)
            self.id2label = self.label_mapping['id2label']
            
            self._model_loaded = True
            logger.info("ML model loaded successfully")
            
        except Exception as e:
            logger.error(f"Failed to load ML model: {e}")
            raise HTTPException(status_code=500, detail=f"Model loading failed: {e}")
    
    def _normalize_citation_text(self, text: str) -> str:
        """Advanced citation text normalization"""
        # Remove extra whitespace
        text = re.sub(r'\s+', ' ', text.strip())
        
        # Normalize various citation formats to [CITATION]
        patterns = [
            r'\[([A-Za-z]+\s+et\s+al\.?,?\s*\d{4}[a-z]?)\]',  # [Smith et al., 2020]
            r'\[([A-Za-z]+,?\s*\d{4}[a-z]?)\]',               # [Smith, 2020]
            r'\(([A-Za-z]+\s+et\s+al\.?,?\s*\d{4}[a-z]?)\)',  # (Smith et al., 2020)
            r'\(([A-Za-z]+,?\s*\d{4}[a-z]?)\)',               # (Smith, 2020)
            r'([A-Za-z]+\s+et\s+al\.?)\s*\(\d{4}[a-z]?\)',    # Smith et al. (2020)
            r'([A-Za-z]+)\s*\(\d{4}[a-z]?\)',                 # Smith (2020)
            r'\[\d+\]',                                        # [1]
            r'\[\d+,\s*\d+(?:,\s*\d+)*\]',                   # [1, 2, 3]
            r'\[\d+-\d+\]'                                     # [1-5]
        ]
        
        for pattern in patterns:
            text = re.sub(pattern, '[CITATION]', text)
        
        return text
    
    def _get_cache_key(self, text: str) -> str:
        """Generate cache key for citation text"""
        return hashlib.md5(text.encode()).hexdigest()
    
    def _apply_rule_based_classification(self, text: str) -> Optional[Tuple[str, float]]:
        """
        Apply rule-based classification for obvious cases
        Returns (predicted_class, confidence) or None if no rule matches
        """
        text_lower = text.lower()
        
        for label, patterns in self.rule_patterns.items():
            for pattern in patterns:
                if re.search(pattern, text_lower):
                    # High confidence for rule-based matches
                    confidence = 0.95
                    logger.debug(f"Rule-based match: {label} with pattern: {pattern}")
                    return label, confidence
        
        return None
    
    def _ml_classify_citation(self, text: str) -> Dict:
        """Use ML model for classification"""
        self._load_ml_model()
        
        # Tokenize
        inputs = self.tokenizer(
            text,
            padding=True,
            truncation=True,
            max_length=256,
            return_tensors="pt"
        ).to(self.device)
        
        # Get predictions
        with torch.no_grad():
            outputs = self.model(**inputs)
            logits = outputs.logits
            probabilities = torch.nn.functional.softmax(logits, dim=-1)
        
        # Get predicted class and confidence
        predicted_id = torch.argmax(probabilities, dim=-1).item()
        confidence = probabilities[0][predicted_id].item()
        predicted_label = self.id2label[str(predicted_id)]
        
        # Get all class probabilities
        all_probabilities = {
            self.id2label[str(i)]: prob.item() 
            for i, prob in enumerate(probabilities[0])
        }
        
        return {
            'predicted_class': predicted_label,
            'confidence': confidence,
            'probabilities': all_probabilities
        }
    
    def classify_citation(self, citation_text: str) -> ClassificationResult:
        """
        Classify a single citation using hybrid approach
        1. Check cache
        2. Apply rule-based classification
        3. Fall back to ML model if needed
        4. Apply confidence thresholding
        """
        start_time = time.time()
        
        # Normalize text
        normalized_text = self._normalize_citation_text(citation_text)
        
        # Check cache first
        cache_key = self._get_cache_key(normalized_text)
        if cache_key in self.classification_cache:
            cached_result = self.classification_cache[cache_key]
            cached_result.processing_time = time.time() - start_time
            return cached_result
        
        # Try rule-based classification first
        rule_result = self._apply_rule_based_classification(normalized_text)
        
        if rule_result:
            predicted_class, confidence = rule_result
            
            # Create probability distribution (rule-based has high confidence for predicted class)
            probabilities = {label: 0.01 for label in self.labels}
            probabilities[predicted_class] = confidence
            
            # Distribute remaining probability among other classes
            remaining_prob = 1.0 - confidence
            other_classes = [l for l in self.labels if l != predicted_class]
            for label in other_classes:
                probabilities[label] = remaining_prob / len(other_classes)
            
            result = ClassificationResult(
                predicted_class=predicted_class,
                confidence=confidence,
                probabilities=probabilities,
                method='rule_based',
                normalized_text=normalized_text,
                processing_time=time.time() - start_time
            )
        else:
            # Fall back to ML model
            ml_result = self._ml_classify_citation(normalized_text)
            
            # Apply confidence thresholding
            if ml_result['confidence'] < self.confidence_threshold:
                predicted_class = 'Other'
                confidence = 0.5  # Medium confidence for uncertain cases
            else:
                predicted_class = ml_result['predicted_class']
                confidence = ml_result['confidence']
            
            result = ClassificationResult(
                predicted_class=predicted_class,
                confidence=confidence,
                probabilities=ml_result['probabilities'],
                method='ml_model',
                normalized_text=normalized_text,
                processing_time=time.time() - start_time
            )
        
        # Cache the result
        self._cache_result(cache_key, result)
        
        return result
    
    def _cache_result(self, cache_key: str, result: ClassificationResult):
        """Cache classification result with LRU eviction"""
        if len(self.classification_cache) >= self.cache_size:
            # Simple FIFO eviction (could be improved to LRU)
            oldest_key = next(iter(self.classification_cache))
            del self.classification_cache[oldest_key]
        
        self.classification_cache[cache_key] = result
    
    def batch_classify(self, citations: List[str]) -> List[ClassificationResult]:
        """Classify multiple citations efficiently"""
        results = []
        
        # Separate into rule-based and ML candidates
        rule_based_results = []
        ml_candidates = []
        ml_indices = []
        
        for i, citation in enumerate(citations):
            normalized = self._normalize_citation_text(citation)
            cache_key = self._get_cache_key(normalized)
            
            # Check cache first
            if cache_key in self.classification_cache:
                results.append(self.classification_cache[cache_key])
                continue
            
            # Try rule-based
            rule_result = self._apply_rule_based_classification(normalized)
            if rule_result:
                predicted_class, confidence = rule_result
                probabilities = {label: 0.01 for label in self.labels}
                probabilities[predicted_class] = confidence
                remaining_prob = 1.0 - confidence
                other_classes = [l for l in self.labels if l != predicted_class]
                for label in other_classes:
                    probabilities[label] = remaining_prob / len(other_classes)
                
                result = ClassificationResult(
                    predicted_class=predicted_class,
                    confidence=confidence,
                    probabilities=probabilities,
                    method='rule_based',
                    normalized_text=normalized,
                    processing_time=0.001  # Fast rule-based
                )
                results.append(result)
                self._cache_result(cache_key, result)
            else:
                # Queue for ML processing
                ml_candidates.append(normalized)
                ml_indices.append(i)
                results.append(None)  # Placeholder
        
        # Batch process ML candidates
        if ml_candidates:
            self._load_ml_model()
            
            # Tokenize all candidates at once
            inputs = self.tokenizer(
                ml_candidates,
                padding=True,
                truncation=True,
                max_length=256,
                return_tensors="pt"
            ).to(self.device)
            
            # Batch inference
            with torch.no_grad():
                outputs = self.model(**inputs)
                logits = outputs.logits
                probabilities = torch.nn.functional.softmax(logits, dim=-1)
            
            # Process batch results
            for i, (idx, text) in enumerate(zip(ml_indices, ml_candidates)):
                predicted_id = torch.argmax(probabilities[i], dim=-1).item()
                confidence = probabilities[i][predicted_id].item()
                predicted_label = self.id2label[str(predicted_id)]
                
                # Apply confidence thresholding
                if confidence < self.confidence_threshold:
                    predicted_class = 'Other'
                    confidence = 0.5
                else:
                    predicted_class = predicted_label
                
                all_probabilities = {
                    self.id2label[str(j)]: prob.item() 
                    for j, prob in enumerate(probabilities[i])
                }
                
                result = ClassificationResult(
                    predicted_class=predicted_class,
                    confidence=confidence,
                    probabilities=all_probabilities,
                    method='ml_model',
                    normalized_text=text,
                    processing_time=0.05  # Estimated batch time
                )
                
                results[idx] = result
                cache_key = self._get_cache_key(text)
                self._cache_result(cache_key, result)
        
        return results

# Global classifier instance (singleton)
classifier = HybridCitationClassifier()

# FastAPI models
class CitationRequest(BaseModel):
    citations: List[str]

class ClassificationResponse(BaseModel):
    predicted_class: str
    confidence: float
    probabilities: Dict[str, float]
    method: str
    normalized_text: str
    processing_time: float

class BatchClassificationResponse(BaseModel):
    results: List[ClassificationResponse]
    total_processing_time: float
    cache_hits: int
    rule_based_matches: int
    ml_classifications: int

# FastAPI router
router = APIRouter(prefix="/api/research", tags=["citation-classification"])

@router.post("/classify-citations", response_model=BatchClassificationResponse)
async def classify_citations(request: CitationRequest):
    """
    Classify citations using hybrid rule-based + ML approach
    
    Features:
    - Rule-based pre-classification for obvious cases (fast)
    - ML model for ambiguous cases
    - Confidence thresholding
    - Result caching
    - Batch processing
    """
    try:
        start_time = time.time()
        
        # Batch classify
        results = classifier.batch_classify(request.citations)
        
        # Convert to response format
        response_results = [
            ClassificationResponse(
                predicted_class=result.predicted_class,
                confidence=result.confidence,
                probabilities=result.probabilities,
                method=result.method,
                normalized_text=result.normalized_text,
                processing_time=result.processing_time
            )
            for result in results
        ]
        
        # Calculate statistics
        total_time = time.time() - start_time
        cache_hits = len([r for r in results if r.processing_time < 0.01])
        rule_based = len([r for r in results if r.method == 'rule_based'])
        ml_based = len([r for r in results if r.method == 'ml_model'])
        
        logger.info(f"Classified {len(request.citations)} citations in {total_time:.3f}s "
                   f"(Cache: {cache_hits}, Rules: {rule_based}, ML: {ml_based})")
        
        return BatchClassificationResponse(
            results=response_results,
            total_processing_time=total_time,
            cache_hits=cache_hits,
            rule_based_matches=rule_based,
            ml_classifications=ml_based
        )
    
    except Exception as e:
        logger.error(f"Classification error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/classification-stats")
async def get_classification_stats():
    """Get classifier statistics and cache info"""
    return {
        "cache_size": len(classifier.classification_cache),
        "max_cache_size": classifier.cache_size,
        "confidence_threshold": classifier.confidence_threshold,
        "model_loaded": classifier._model_loaded,
        "supported_labels": classifier.labels,
        "rule_patterns_count": sum(len(patterns) for patterns in classifier.rule_patterns.values())
    }

@router.post("/clear-cache")
async def clear_classification_cache():
    """Clear the classification cache"""
    classifier.classification_cache.clear()
    return {"message": "Classification cache cleared", "cache_size": 0}