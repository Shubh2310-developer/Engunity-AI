# RAG Quality Assessment Guide

## Overview
The enhanced RAG system provides comprehensive quality assessment capabilities to evaluate your document Q&A system across multiple dimensions.

## Accessing the Enhanced Interface
```bash
cd /home/ghost/engunity-ai/backend/training
/home/ghost/anaconda3/envs/enginuity-ai/bin/python -m streamlit run enhanced_streamlit_rag_app.py --server.port 8502
```

Open http://localhost:8502 in your browser.

## Quality Assessment Features

### 🔹 Functional Verification
**Tests answer correctness and consistency**
- **Answer Consistency**: Tests how consistent answers are across different phrasings of the same question
- **Semantic Similarity**: Uses sentence transformers to measure answer similarity
- **Ground Truth Validation**: Compare answers against expected responses

### 🔹 Scalability & Stress Testing  
**Evaluates performance under load**
- **Concurrent Queries**: Tests multiple simultaneous questions
- **Latency Distribution**: Measures response time patterns (p50, p90, p99)
- **Throughput Measurement**: Queries per second capacity
- **Memory Monitoring**: VRAM and RAM usage tracking

### 🔹 Robustness & Edge Cases
**Tests system behavior with unusual inputs**
- **Empty Queries**: How system handles blank inputs
- **Very Long Queries**: Performance with extended questions
- **Irrelevant Queries**: Questions unrelated to document content
- **Ambiguous Questions**: Vague or unclear queries
- **Multilingual Inputs**: Non-English questions
- **Contradictory Queries**: Self-contradicting questions

### 🔹 Accuracy Evaluation
**Measures answer quality and relevance**
- **Hallucination Detection**: Identifies fabricated information not in source documents
- **Evidence Alignment**: Checks if answers align with retrieved document chunks
- **Confidence Scoring**: Estimates answer reliability
- **Word Overlap Analysis**: Measures content similarity between answer and sources

### 🔹 Security & Safety
**Validates system against malicious inputs**
- **Prompt Injection Testing**: Attempts to override system instructions
- **Information Leakage**: Tests for exposure of sensitive data
- **Jailbreak Attempts**: Tries to bypass safety restrictions
- **Role-playing Attacks**: Attempts to change AI behavior

## How to Use

### 1. Upload & Process Document
1. Go to "📄 Document & QA" tab
2. Upload PDF/DOCX/TXT file or use demo
3. Click "🚀 Process Document"
4. Wait for processing completion

### 2. Basic Q&A with Quality Metrics
- Ask questions in the Q&A interface
- Each answer shows:
  - **Response Time**: How long to generate answer
  - **Confidence Score**: Reliability estimate (0-1)
  - **Hallucination Risk**: Fabrication likelihood (0-1)

### 3. Comprehensive Quality Testing
1. Go to "🧪 Quality Tests" tab
2. Click "🧪 Run All Quality Tests"
3. Wait for test completion (may take several minutes)

### 4. View Results Dashboard
1. Go to "📊 Results Dashboard" tab
2. Review test results across categories:
   - **Overview**: Summary metrics
   - **Consistency**: Answer consistency analysis
   - **Edge Cases**: Robustness test results
   - **Security**: Safety assessment
   - **Performance**: Latency and throughput metrics

## Interpreting Results

### Quality Scores (0.0 - 1.0)
- **0.8 - 1.0**: Excellent quality
- **0.6 - 0.8**: Good quality  
- **0.4 - 0.6**: Fair quality
- **0.2 - 0.4**: Poor quality
- **0.0 - 0.2**: Very poor quality

### Performance Metrics
- **Latency**: < 2s excellent, 2-5s good, >5s needs optimization
- **Throughput**: Depends on hardware, measure baseline for comparison
- **Memory Usage**: Monitor VRAM to prevent system freezing

### Security Assessment
- **Safe**: No concerning behaviors detected
- **Unsafe**: Potential security issues found
- Review specific test results for details

## Best Practices

### Before Testing
1. Ensure sufficient system resources (6GB+ VRAM recommended)
2. Use representative documents for your use case
3. Close unnecessary applications to free memory

### During Testing
1. Monitor system resources via sidebar metrics
2. Don't run multiple test suites simultaneously
3. Allow tests to complete before starting new ones

### Interpreting Results
1. Focus on consistency scores > 0.7 for production use
2. Security tests should all pass as "Safe"
3. Edge case handling should gracefully degrade
4. Performance should meet your latency requirements

### Optimizing Performance
1. Use smaller documents for faster processing
2. Reduce chunk size if memory is limited
3. Monitor VRAM usage to prevent crashes
4. Consider CPU-only mode for large documents

## Troubleshooting

### Common Issues
- **Out of Memory**: Reduce document size or use CPU mode
- **Slow Performance**: Check GPU utilization and reduce batch size
- **Test Failures**: Ensure document is properly loaded first
- **Security Test Warnings**: Review prompts and system instructions

### Error Recovery
- Restart Streamlit app if system becomes unresponsive
- Clear GPU memory between test runs
- Use demo document if custom uploads fail

## Technical Details

### Models Used
- **Embeddings**: BGE-small-en-v1.5 (BAAI)
- **Language Model**: Phi-2 (Microsoft) 
- **Similarity**: all-MiniLM-L6-v2 (Sentence Transformers)
- **Vector Store**: FAISS with optimized indexing

### System Requirements
- **GPU**: 6GB+ VRAM recommended (RTX 4060+ or better)
- **RAM**: 8GB+ system memory
- **Python**: 3.8+ with required packages
- **Disk**: 10GB+ free space for models and data

### File Support
- **PDF**: Text extraction with PyPDF
- **DOCX**: Microsoft Word documents
- **TXT**: Plain text files
- **Size Limit**: Depends on available memory

## Advanced Usage

### Custom Test Cases
Modify `enhanced_streamlit_rag_app.py` to add custom:
- Question variations for consistency testing
- Edge case scenarios for robustness
- Security test prompts for threat assessment
- Performance benchmarks for your use case

### Integration
The quality assessment framework can be integrated into:
- CI/CD pipelines for automated testing
- Model evaluation workflows
- Production monitoring systems
- A/B testing frameworks

### Export Results
Test results can be accessed from `st.session_state.test_results` for:
- JSON export to external systems
- Custom analysis and visualization
- Long-term performance tracking
- Comparative analysis across models