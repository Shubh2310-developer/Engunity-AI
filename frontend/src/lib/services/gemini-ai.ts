/**
 * Gemini AI Service for Engunity AI
 * =================================
 * 
 * Complete Google Gemini API integration for research tasks:
 * - Document summarization
 * - Citation extraction
 * - Literature analysis
 * - Research queries
 * - Content generation
 * 
 * Uses the provided API key: AizaSyCEU1t2KD-JncjCTSnZfqX1lUMYmRgCaQ0
 */

import { GoogleGenerativeAI, GenerativeModel, GenerationConfig } from '@google/generative-ai';

// ========================================
// CONFIGURATION
// ========================================

const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || 'AizaSyCEU1t2KD-JncjCTSnZfqX1lUMYmRgCaQ0';

if (!GEMINI_API_KEY) {
  throw new Error('Gemini API key is required');
}

// Initialize Google AI client
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// ========================================
// TYPE DEFINITIONS
// ========================================

export interface DocumentSummary {
  title: string;
  authors: string[];
  abstract: string;
  keyFindings: string[];
  methodology: string;
  conclusions: string;
  keywords: string[];
  confidence: number;
}

export interface ExtractedCitation {
  type: 'book' | 'article' | 'website' | 'journal' | 'conference' | 'thesis' | 'other';
  title: string;
  authors: string[];
  year?: number;
  journal?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  publisher?: string;
  url?: string;
  doi?: string;
  isbn?: string;
  abstract?: string;
  extractedFrom: string;
  confidence: number;
  originalText: string;
  formattedCitations: {
    apa?: string;
    mla?: string;
    ieee?: string;
    chicago?: string;
  };
}

export interface LiteratureAnalysis {
  themes: string[];
  connections: Array<{
    documents: string[];
    relationship: string;
    strength: number;
  }>;
  gaps: string[];
  trends: string[];
  recommendations: string[];
  summary: string;
  confidence: number;
}

export interface ResearchQuery {
  query: string;
  context?: string;
  documents?: string[];
}

export interface ResearchResponse {
  answer: string;
  sources: Array<{
    document: string;
    relevance: number;
    excerpt: string;
  }>;
  confidence: number;
  followUpQuestions: string[];
}

// ========================================
// GEMINI AI SERVICE CLASS
// ========================================

export class GeminiAIService {
  private model: GenerativeModel;
  private proModel: GenerativeModel;

  constructor() {
    // Use Gemini Pro for complex tasks
    this.proModel = genAI.getGenerativeModel({ 
      model: 'gemini-pro',
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192,
      } as GenerationConfig
    });

    // Use standard model for simpler tasks
    this.model = genAI.getGenerativeModel({ 
      model: 'gemini-pro',
      generationConfig: {
        temperature: 0.3,
        topK: 20,
        topP: 0.8,
        maxOutputTokens: 4096,
      } as GenerationConfig
    });
  }

  // ========================================
  // DOCUMENT SUMMARIZATION
  // ========================================

  async summarizeDocument(
    text: string,
    fileName: string,
    options: {
      style?: 'academic' | 'executive' | 'detailed' | 'brief';
      focus?: string[];
      maxLength?: number;
    } = {}
  ): Promise<DocumentSummary> {
    const { style = 'academic', focus = [], maxLength = 500 } = options;

    const prompt = `
You are an expert research assistant. Analyze and summarize the following research document.

Document: ${fileName}
Content: ${text.substring(0, 10000)} ${text.length > 10000 ? '...' : ''}

Please provide a comprehensive summary in the following JSON format:
{
  "title": "Extracted or inferred title",
  "authors": ["List of authors if found"],
  "abstract": "Concise abstract (${maxLength} words max)",
  "keyFindings": ["3-5 key findings or contributions"],
  "methodology": "Research methodology used",
  "conclusions": "Main conclusions and implications",
  "keywords": ["5-10 relevant keywords"],
  "confidence": 0.85
}

Style: ${style}
${focus.length > 0 ? `Focus areas: ${focus.join(', ')}` : ''}

Ensure the response is valid JSON and includes confidence score (0-1).
`;

    try {
      const result = await this.proModel.generateContent(prompt);
      const response = result.response;
      const text = response.text();
      
      // Parse JSON response
      const cleanedText = text.replace(/```json\n?|\n?```/g, '').trim();
      const summary = JSON.parse(cleanedText);
      
      return {
        ...summary,
        confidence: Math.min(Math.max(summary.confidence || 0.7, 0), 1)
      };
    } catch (error) {
      console.error('Error summarizing document:', error);
      throw new Error('Failed to summarize document');
    }
  }

  // ========================================
  // CITATION EXTRACTION
  // ========================================

  async extractCitations(
    text: string,
    fileName: string
  ): Promise<ExtractedCitation[]> {
    const prompt = `
You are an expert at extracting academic citations from research papers.

Document: ${fileName}
Content: ${text.substring(0, 15000)} ${text.length > 15000 ? '...' : ''}

Extract all citations from this document and format them properly. Return a JSON array of citations with this structure:

[
  {
    "type": "journal|book|conference|website|thesis|other",
    "title": "Full title",
    "authors": ["Author 1", "Author 2"],
    "year": 2023,
    "journal": "Journal name (if applicable)",
    "volume": "Volume number",
    "issue": "Issue number", 
    "pages": "Page range",
    "publisher": "Publisher name",
    "url": "URL if available",
    "doi": "DOI if available",
    "isbn": "ISBN if available",
    "abstract": "Abstract if provided",
    "extractedFrom": "Page or section where found",
    "confidence": 0.9,
    "originalText": "Original citation text as it appears",
    "formattedCitations": {
      "apa": "APA format",
      "mla": "MLA format", 
      "ieee": "IEEE format",
      "chicago": "Chicago format"
    }
  }
]

Guidelines:
- Extract ALL citations, including in-text references and bibliography
- Determine citation type based on content
- Generate proper formatted citations for APA, MLA, IEEE, and Chicago styles
- Include confidence score (0-1) based on extraction certainty
- Only include fields that are clearly identifiable
- Ensure valid JSON format
`;

    try {
      const result = await this.proModel.generateContent(prompt);
      const response = result.response;
      const text = response.text();
      
      // Parse JSON response
      const cleanedText = text.replace(/```json\n?|\n?```/g, '').trim();
      const citations = JSON.parse(cleanedText);
      
      return Array.isArray(citations) ? citations : [];
    } catch (error) {
      console.error('Error extracting citations:', error);
      return [];
    }
  }

  // ========================================
  // LITERATURE ANALYSIS
  // ========================================

  async analyzeLiterature(
    documents: Array<{
      title: string;
      summary: string;
      keywords: string[];
      fileName: string;
    }>
  ): Promise<LiteratureAnalysis> {
    const documentsText = documents.map(doc => 
      `Title: ${doc.title}\nSummary: ${doc.summary}\nKeywords: ${doc.keywords.join(', ')}\n`
    ).join('\n---\n');

    const prompt = `
You are an expert literature review analyst. Analyze the following collection of research documents to identify patterns, themes, and connections.

Documents:
${documentsText}

Provide a comprehensive literature analysis in the following JSON format:
{
  "themes": ["Major theme 1", "Major theme 2", "Major theme 3"],
  "connections": [
    {
      "documents": ["doc1.pdf", "doc2.pdf"],
      "relationship": "Description of how documents relate",
      "strength": 0.8
    }
  ],
  "gaps": ["Research gap 1", "Research gap 2"],
  "trends": ["Emerging trend 1", "Emerging trend 2"],
  "recommendations": ["Recommendation 1", "Recommendation 2"],
  "summary": "Overall synthesis of the literature",
  "confidence": 0.85
}

Focus on:
- Identifying common themes and patterns
- Finding connections between different works
- Highlighting research gaps and opportunities
- Noting emerging trends and methodologies
- Providing actionable insights

Ensure valid JSON format and include confidence score.
`;

    try {
      const result = await this.proModel.generateContent(prompt);
      const response = result.response;
      const text = response.text();
      
      // Parse JSON response
      const cleanedText = text.replace(/```json\n?|\n?```/g, '').trim();
      const analysis = JSON.parse(cleanedText);
      
      return {
        ...analysis,
        confidence: Math.min(Math.max(analysis.confidence || 0.7, 0), 1)
      };
    } catch (error) {
      console.error('Error analyzing literature:', error);
      throw new Error('Failed to analyze literature');
    }
  }

  // ========================================
  // RESEARCH QUERIES
  // ========================================

  async answerResearchQuery(
    query: ResearchQuery,
    context?: {
      documents?: Array<{
        title: string;
        content: string;
        summary: string;
      }>;
      previousQueries?: string[];
    }
  ): Promise<ResearchResponse> {
    const documentsContext = context?.documents?.map(doc => 
      `Title: ${doc.title}\nSummary: ${doc.summary}\nContent: ${doc.content.substring(0, 2000)}...`
    ).join('\n---\n') || '';

    const previousContext = context?.previousQueries?.length 
      ? `Previous questions in this session: ${context.previousQueries.join('; ')}`
      : '';

    const prompt = `
You are an expert research assistant. Answer the following research query based on the provided documents and context.

Query: ${query.query}

${query.context ? `Additional Context: ${query.context}` : ''}

${documentsContext ? `Available Documents:\n${documentsContext}` : ''}

${previousContext}

Provide a comprehensive response in the following JSON format:
{
  "answer": "Detailed answer to the query",
  "sources": [
    {
      "document": "document_name.pdf",
      "relevance": 0.9,
      "excerpt": "Relevant quote or passage"
    }
  ],
  "confidence": 0.85,
  "followUpQuestions": [
    "Suggested follow-up question 1",
    "Suggested follow-up question 2"
  ]
}

Guidelines:
- Provide accurate, evidence-based answers
- Cite specific sources when possible
- Include relevance scores for sources (0-1)
- Suggest relevant follow-up questions
- Include confidence score for the answer
- If information is insufficient, clearly state limitations
`;

    try {
      const result = await this.proModel.generateContent(prompt);
      const response = result.response;
      const text = response.text();
      
      // Parse JSON response
      const cleanedText = text.replace(/```json\n?|\n?```/g, '').trim();
      const answer = JSON.parse(cleanedText);
      
      return {
        ...answer,
        confidence: Math.min(Math.max(answer.confidence || 0.7, 0), 1)
      };
    } catch (error) {
      console.error('Error answering research query:', error);
      throw new Error('Failed to answer research query');
    }
  }

  // ========================================
  // CONTENT GENERATION
  // ========================================

  async generateContent(
    type: 'abstract' | 'introduction' | 'conclusion' | 'methodology' | 'literature_review',
    context: {
      topic: string;
      keyPoints: string[];
      references?: ExtractedCitation[];
      style?: 'academic' | 'professional' | 'accessible';
      length?: 'short' | 'medium' | 'long';
    }
  ): Promise<{
    content: string;
    wordCount: number;
    confidence: number;
  }> {
    const { topic, keyPoints, references = [], style = 'academic', length = 'medium' } = context;

    const lengthMap = {
      short: '200-400 words',
      medium: '400-800 words', 
      long: '800-1500 words'
    };

    const referencesText = references.length > 0 
      ? `References available:\n${references.map(ref => `- ${ref.formattedCitations.apa || ref.title}`).join('\n')}`
      : '';

    const prompt = `
You are an expert academic writer. Generate a ${type.replace('_', ' ')} on the following topic.

Topic: ${topic}
Style: ${style}
Length: ${lengthMap[length]}

Key Points to Address:
${keyPoints.map(point => `- ${point}`).join('\n')}

${referencesText}

Requirements:
- Write in ${style} style appropriate for research
- Address all key points naturally
- Use proper academic structure and flow
- Include in-text citations where appropriate
- Maintain consistency in tone and voice
- Target length: ${lengthMap[length]}

Provide response in JSON format:
{
  "content": "Generated content",
  "wordCount": 450,
  "confidence": 0.85
}
`;

    try {
      const result = await this.proModel.generateContent(prompt);
      const response = result.response;
      const text = response.text();
      
      // Parse JSON response
      const cleanedText = text.replace(/```json\n?|\n?```/g, '').trim();
      const generated = JSON.parse(cleanedText);
      
      return {
        ...generated,
        confidence: Math.min(Math.max(generated.confidence || 0.7, 0), 1)
      };
    } catch (error) {
      console.error('Error generating content:', error);
      throw new Error('Failed to generate content');
    }
  }

  // ========================================
  // UTILITY METHODS
  // ========================================

  async testConnection(): Promise<boolean> {
    try {
      const result = await this.model.generateContent('Test connection. Respond with "OK".');
      const response = result.response;
      return response.text().includes('OK');
    } catch (error) {
      console.error('Gemini connection test failed:', error);
      return false;
    }
  }

  async extractKeywords(text: string, maxKeywords: number = 10): Promise<string[]> {
    const prompt = `
Extract the most important keywords and phrases from this text. Return only a JSON array of strings.

Text: ${text.substring(0, 5000)}

Extract ${maxKeywords} keywords that best represent the main concepts, methods, and topics.
Return format: ["keyword1", "keyword2", "keyword3"]
`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = result.response;
      const text = response.text();
      
      const cleanedText = text.replace(/```json\n?|\n?```/g, '').trim();
      const keywords = JSON.parse(cleanedText);
      
      return Array.isArray(keywords) ? keywords.slice(0, maxKeywords) : [];
    } catch (error) {
      console.error('Error extracting keywords:', error);
      return [];
    }
  }

  async detectLanguage(text: string): Promise<string> {
    const prompt = `Detect the language of this text and respond with just the language code (e.g., 'en', 'es', 'fr'): ${text.substring(0, 1000)}`;
    
    try {
      const result = await this.model.generateContent(prompt);
      const response = result.response;
      return response.text().trim().toLowerCase();
    } catch (error) {
      console.error('Error detecting language:', error);
      return 'en';
    }
  }
}

// ========================================
// SINGLETON INSTANCE
// ========================================

let geminiServiceInstance: GeminiAIService | null = null;

export function getGeminiService(): GeminiAIService {
  if (!geminiServiceInstance) {
    geminiServiceInstance = new GeminiAIService();
  }
  return geminiServiceInstance;
}

// ========================================
// UTILITY FUNCTIONS
// ========================================

export async function testGeminiConnection(): Promise<boolean> {
  const service = getGeminiService();
  return await service.testConnection();
}

export async function quickSummarize(text: string, maxLength: number = 200): Promise<string> {
  const service = getGeminiService();
  
  try {
    const summary = await service.summarizeDocument(text, 'document', {
      style: 'brief',
      maxLength
    });
    return summary.abstract;
  } catch (error) {
    console.error('Quick summarize failed:', error);
    return 'Unable to generate summary';
  }
}

export async function quickExtractKeywords(text: string, count: number = 5): Promise<string[]> {
  const service = getGeminiService();
  return await service.extractKeywords(text, count);
}

// Export the service class
export default GeminiAIService;