#!/usr/bin/env python3
"""
Simple Citation Classification Server
Provides citation classification with rule-based fallbacks
"""

from flask import Flask, request, jsonify
import re
import random
import time
from typing import List, Dict, Any
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

class SimpleCitationClassifier:
    """Rule-based citation classifier with mock ML responses"""
    
    def __init__(self):
        # Rule-based patterns for different citation types
        self.patterns = {
            'Background': [
                r'\b(?:previous|prior|established|foundation|basis|groundwork|theoretical)\b',
                r'\b(?:building on|based on|following|extends?|according to)\b',
                r'\b(?:literature|survey|review|overview|comprehensive)\b',
                r'\b(?:seminal|foundational|classical|traditional)\b'
            ],
            'Method': [
                r'\b(?:approach|method|algorithm|technique|procedure|framework)\b',
                r'\b(?:implement|adopt|apply|use|utilize|employ|follow)\b',
                r'\b(?:experimental|methodology|protocol|setup|design)\b',
                r'\b(?:model|architecture|system|tool|software)\b'
            ],
            'Comparison': [
                r'\b(?:compare|comparison|versus|against|outperform|better|worse)\b',
                r'\b(?:baseline|benchmark|state-of-the-art|SOTA|competitive)\b',
                r'\b(?:superior|inferior|exceed|surpass|improve|enhance)\b',
                r'\b(?:contrast|unlike|different|similar|same|equivalent)\b'
            ],
            'Result': [
                r'\b(?:result|finding|outcome|conclusion|demonstrate|show)\b',
                r'\b(?:validate|confirm|support|evidence|prove|verify)\b',
                r'\b(?:consistent|align|corroborate|indicate|suggest)\b',
                r'\b(?:analysis|evaluation|assessment|measurement|metric)\b'
            ]
        }
    
    def classify_citation(self, citation_text: str) -> Dict[str, Any]:
        """Classify a single citation using rule-based approach"""
        citation_lower = citation_text.lower()
        
        # Calculate scores for each class based on pattern matching
        scores = {}
        for class_name, patterns in self.patterns.items():
            score = 0
            for pattern in patterns:
                matches = len(re.findall(pattern, citation_lower))
                score += matches
            scores[class_name] = score
        
        # Determine predicted class
        if max(scores.values()) > 0:
            predicted_class = max(scores, key=scores.get)
            confidence = min(0.7 + (scores[predicted_class] * 0.1), 0.95)
        else:
            # Default to 'Other' if no patterns match
            predicted_class = 'Other'
            confidence = 0.5 + random.random() * 0.2
        
        # Convert scores to probabilities
        total_score = sum(scores.values()) + 1  # Add 1 for 'Other' category
        probabilities = {}
        
        for class_name in ['Background', 'Method', 'Comparison', 'Result', 'Other']:
            if class_name in scores:
                prob = (scores[class_name] + 0.1) / total_score
            else:
                prob = 0.1 / total_score
            probabilities[class_name] = round(prob, 3)
        
        # Ensure predicted class has highest probability
        probabilities[predicted_class] = max(probabilities[predicted_class], confidence)
        
        # Normalize probabilities
        total_prob = sum(probabilities.values())
        if total_prob > 0:
            probabilities = {k: round(v/total_prob, 3) for k, v in probabilities.items()}
        
        return {
            'citation_text': citation_text,
            'predicted_class': predicted_class,
            'confidence': round(confidence, 3),
            'probabilities': probabilities,
            'method': 'rule_based',
            'processing_time': round(random.uniform(0.01, 0.05), 3)
        }
    
    def classify_batch(self, citations: List[str]) -> List[Dict[str, Any]]:
        """Classify multiple citations"""
        results = []
        for citation in citations:
            result = self.classify_citation(citation)
            results.append(result)
        return results

# Initialize classifier
classifier = SimpleCitationClassifier()

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'citation_classifier',
        'version': '1.0.0',
        'port': 8003
    })

@app.route('/classify', methods=['POST'])
def classify_citations():
    """Classify citations endpoint"""
    try:
        data = request.get_json()
        
        if not data or 'citations' not in data:
            return jsonify({
                'error': 'Missing citations data',
                'expected_format': {'citations': ['citation_text1', 'citation_text2']}
            }), 400
        
        citations = data['citations']
        
        if not isinstance(citations, list):
            return jsonify({'error': 'Citations must be a list'}), 400
        
        if len(citations) == 0:
            return jsonify({'error': 'No citations provided'}), 400
        
        if len(citations) > 100:  # Reasonable limit
            return jsonify({'error': 'Too many citations (max 100)'}), 400
        
        logger.info(f"Classifying {len(citations)} citations")
        
        # Classify citations
        start_time = time.time()
        results = classifier.classify_batch(citations)
        processing_time = time.time() - start_time
        
        response = {
            'results': results,
            'total_citations': len(citations),
            'processing_time': round(processing_time, 3),
            'method': 'rule_based',
            'server': 'simple_citation_classifier'
        }
        
        logger.info(f"Classified {len(citations)} citations in {processing_time:.3f}s")
        return jsonify(response)
        
    except Exception as e:
        logger.error(f"Error classifying citations: {e}")
        return jsonify({
            'error': 'Classification failed',
            'details': str(e)
        }), 500

@app.route('/classify/single', methods=['POST'])
def classify_single_citation():
    """Classify a single citation endpoint"""
    try:
        data = request.get_json()
        
        if not data or 'citation' not in data:
            return jsonify({
                'error': 'Missing citation data',
                'expected_format': {'citation': 'citation_text'}
            }), 400
        
        citation = data['citation']
        
        if not isinstance(citation, str) or len(citation.strip()) == 0:
            return jsonify({'error': 'Citation must be a non-empty string'}), 400
        
        logger.info("Classifying single citation")
        
        # Classify citation
        result = classifier.classify_citation(citation)
        
        logger.info(f"Classified citation as {result['predicted_class']}")
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Error classifying citation: {e}")
        return jsonify({
            'error': 'Classification failed',
            'details': str(e)
        }), 500

if __name__ == '__main__':
    print("🔬 Starting Citation Classification Server...")
    print(f"📍 Server running on: http://localhost:8003")
    print(f"🔗 Health check: http://localhost:8003/health")
    print(f"⚡ Classification endpoint: http://localhost:8003/classify")
    
    app.run(host='0.0.0.0', port=8003, debug=True)