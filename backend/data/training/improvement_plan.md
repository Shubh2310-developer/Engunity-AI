# Dataset Improvement Plan for Engunity AI

## Current Status After Improvements
- **Significant progress**: All modules now have data (was 3 missing before)
- **Volume increase**: Much higher record retention
- **Better coverage**: Expanded keyword matching working

## Immediate Next Steps

### 1. Data Augmentation Techniques
```python
# Implement these in a new script: data_augmenter.py

def paraphrase_questions(question, answer):
    """Generate variations of questions while keeping answers intact"""
    variations = [
        f"How do I {question.lower().replace('how to', '').strip()}?",
        f"What's the best way to {question.lower().replace('how to', '').strip()}?",
        f"Can you explain {question.lower().replace('how to', '').strip()}?",
        f"I need help with {question.lower().replace('how to', '').strip()}"
    ]
    return variations

def expand_answers(question, answer):
    """Add more context to answers"""
    expanded = f"{answer}\n\nAdditional context: This relates to {extract_topic(question)}"
    return expanded
```

### 2. Quality Enhancement
- **Add code validation**: Check if code snippets actually run
- **Answer completeness**: Flag incomplete or truncated answers
- **Technical accuracy**: Basic validation for common programming concepts

### 3. Module-Specific Boosts

#### Document QA (Currently 60 records, need 50+) ✅
- Target: Text processing, file handling, regex questions
- Keywords to emphasize: file I/O, parsing, text manipulation

#### Blockchain (Currently 24 records, need 50)
- Search specifically for: cryptocurrency, smart contracts, Web3
- Consider synthetic generation for this specialized domain

#### Chat (Currently 96 records, need 50+) ✅  
- Target: UI/UX, help documentation, tutorials
- Focus on "how-to" and explanatory content

### 4. Synthetic Data Generation
Create templates for underrepresented modules:

```python
def generate_blockchain_qa():
    templates = [
        ("What is {concept} in blockchain?", "detailed_explanation_template"),
        ("How do you implement {feature} in {platform}?", "code_example_template"),
        ("What are the benefits of {technology}?", "comparison_template")
    ]
    
def generate_document_qa():
    templates = [
        ("How to parse {format} files?", "parsing_code_template"),
        ("What's the best way to {operation} text?", "text_processing_template")
    ]
```

### 5. Advanced Filtering
- **Relevance scoring v2**: Use TF-IDF or embeddings for better matching
- **Quality metrics v2**: Add readability scores, technical depth metrics
- **Duplicate detection v2**: Semantic similarity instead of just text matching

### 6. Quality Tiers Strategy
Instead of filtering out low-quality data, categorize it:
- **Tier 1**: High-quality for primary training
- **Tier 2**: Medium-quality for augmentation  
- **Tier 3**: Low-quality for validation/testing only

### 7. Domain Mapping Improvements
- **Multi-module assignment**: Allow records to belong to multiple modules
- **Confidence scoring**: Track how confident we are about module assignments
- **Manual review flags**: Mark ambiguous cases for human review

## Expected Outcomes

### Short-term (After current improvements):
- All modules with 50+ records minimum
- 10x increase in total training data volume
- Better module balance distribution

### Medium-term (With augmentation):
- 500+ records per high-priority module
- Synthetic data for specialized domains (blockchain)
- Quality-tiered training pipelines

### Long-term (Production ready):
- Continuous data pipeline with quality monitoring
- Automated synthetic data generation
- Real-time model performance feedback loop

## Implementation Priority

1. **P0**: Complete current preprocessing run
2. **P0**: Run domain mapper with improved data
3. **P1**: Implement basic data augmentation
4. **P1**: Create synthetic data for blockchain module
5. **P2**: Advanced quality metrics and filtering
6. **P2**: Semantic similarity-based improvements

## Monitoring & Metrics

Track these KPIs:
- Records per module (target: 50+ minimum, 200+ ideal)
- Quality distribution (target: 40% high, 40% medium, 20% low)
- Module coverage (target: 100% modules with data)
- Training performance (measure downstream model quality)