/**
 * Groq AI Service for Engunity AI
 * =================================
 * 
 * Complete Groq API integration for research tasks:
 * - Document summarization
 * - Citation extraction
 * - Literature analysis
 * - Research queries
 * - Content generation
 * 
 * Uses Llama 3.3 70B Versatile model via Groq API
 */

import Groq from 'groq-sdk';

// ========================================
// CONFIGURATION
// ========================================

const GROQ_API_KEY = process.env.GROQ_API_KEY || process.env.NEXT_PUBLIC_GROQ_API_KEY || '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';

console.log('Groq API Key check:', {
  server: process.env.GROQ_API_KEY ? 'SET' : 'NOT SET',
  client: process.env.NEXT_PUBLIC_GROQ_API_KEY ? 'SET' : 'NOT SET',
  final: GROQ_API_KEY ? `${GROQ_API_KEY.substring(0, 8)}...` : 'NOT SET'
});

if (!GROQ_API_KEY) {
  throw new Error('Groq API key is required');
}

// Initialize Groq client
const groq = new Groq({
  apiKey: GROQ_API_KEY,
});

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
  doi?: string;
  url?: string;
  publisher?: string;
  location?: string;
  isbn?: string;
  confidence: number;
}

export interface ResearchQuery {
  query: string;
  context?: string;
  maxResults?: number;
}

export interface ResearchResponse {
  answer: string;
  sources: string[];
  confidence: number;
  relatedQueries: string[];
}

export interface KeywordExtraction {
  keywords: string[];
  topics: string[];
  confidence: number;
}

// ========================================
// GROQ AI SERVICE CLASS
// ========================================

export class GroqAIService {
  /**
   * Generate completion using Groq API
   */
  private static async generateCompletion(messages: any[], maxTokens: number = 1024) {
    try {
      const completion = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages,
        temperature: 0.7,
        max_completion_tokens: maxTokens,
        top_p: 1,
        stream: false,
        stop: null,
      });

      return completion.choices[0]?.message?.content || '';
    } catch (error) {
      console.error('Groq API error:', error);
      throw new Error('Failed to generate completion');
    }
  }

  /**
   * Summarize a research document
   * @param text - The document text to summarize
   * @param title - Optional document title
   * @returns DocumentSummary object
   */
  static async summarizeDocument(text: string, title?: string): Promise<DocumentSummary> {
    try {
      const prompt = `
As a research analysis expert, please analyze the following academic document and provide a comprehensive summary.

Document Title: ${title || 'Not provided'}

Document Text:
${text.substring(0, 8000)} ${text.length > 8000 ? '...' : ''}

Please provide a JSON response with the following structure:
{
  "title": "extracted or provided title",
  "authors": ["list of authors if found"],
  "abstract": "brief abstract or summary",
  "keyFindings": ["key finding 1", "key finding 2", "key finding 3"],
  "methodology": "research methodology used",
  "conclusions": "main conclusions",
  "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
  "confidence": 0.85
}

Focus on extracting factual information and maintain high accuracy. If certain information is not available, use appropriate placeholders or leave arrays empty.
`;

      const messages = [
        {
          role: "user" as const,
          content: prompt
        }
      ];

      const response = await this.generateCompletion(messages, 1500);
      
      try {
        // Parse JSON response
        const summary = JSON.parse(response);
        return {
          title: summary.title || title || 'Untitled Document',
          authors: Array.isArray(summary.authors) ? summary.authors : [],
          abstract: summary.abstract || '',
          keyFindings: Array.isArray(summary.keyFindings) ? summary.keyFindings : [],
          methodology: summary.methodology || '',
          conclusions: summary.conclusions || '',
          keywords: Array.isArray(summary.keywords) ? summary.keywords : [],
          confidence: typeof summary.confidence === 'number' ? summary.confidence : 0.8
        };
      } catch (parseError) {
        console.error('Failed to parse summary response:', parseError);
        throw new Error('Failed to parse document summary');
      }
    } catch (error) {
      console.error('Error summarizing document:', error);
      throw new Error('Failed to summarize document');
    }
  }

  /**
   * Extract citations from a document
   * @param text - The document text to analyze
   * @returns Array of ExtractedCitation objects
   */
  static async extractCitations(text: string): Promise<ExtractedCitation[]> {
    try {
      const prompt = `
As a citation extraction expert, analyze the following academic document text and extract all citations/references.

Document Text:
${text.substring(0, 10000)} ${text.length > 10000 ? '...' : ''}

Please identify and extract all citations, references, and bibliographic entries. Return a JSON array with the following structure for each citation:

[
  {
    "type": "journal|conference|book|website|thesis|other",
    "title": "Full title of the work",
    "authors": ["Author 1", "Author 2"],
    "year": 2023,
    "journal": "Journal name (if applicable)",
    "volume": "volume number",
    "issue": "issue number", 
    "pages": "page range",
    "doi": "DOI if available",
    "url": "URL if available",
    "publisher": "Publisher name",
    "location": "Publication location",
    "isbn": "ISBN if available",
    "confidence": 0.9
  }
]

Extract as many citations as possible. If certain fields are not available, omit them from the JSON. Focus on accuracy and completeness.
`;

      const messages = [
        {
          role: "user" as const,
          content: prompt
        }
      ];

      const response = await this.generateCompletion(messages, 2000);
      
      try {
        const citations = JSON.parse(response);
        if (!Array.isArray(citations)) {
          return [];
        }
        
        return citations.map((citation: any) => ({
          type: citation.type || 'other',
          title: citation.title || '',
          authors: Array.isArray(citation.authors) ? citation.authors : [],
          year: typeof citation.year === 'number' ? citation.year : undefined,
          journal: citation.journal,
          volume: citation.volume,
          issue: citation.issue,
          pages: citation.pages,
          doi: citation.doi,
          url: citation.url,
          publisher: citation.publisher,
          location: citation.location,
          isbn: citation.isbn,
          confidence: typeof citation.confidence === 'number' ? citation.confidence : 0.8
        }));
      } catch (parseError) {
        console.error('Failed to parse citations response:', parseError);
        return [];
      }
    } catch (error) {
      console.error('Error extracting citations:', error);
      return [];
    }
  }

  /**
   * Extract keywords and topics from text
   * @param text - The text to analyze
   * @returns KeywordExtraction object
   */
  static async extractKeywords(text: string): Promise<KeywordExtraction> {
    try {
      const prompt = `
As a text analysis expert, analyze the following text and extract relevant keywords and topics.

Text:
${text.substring(0, 6000)} ${text.length > 6000 ? '...' : ''}

Please provide a JSON response with:
{
  "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5", "keyword6", "keyword7", "keyword8"],
  "topics": ["topic1", "topic2", "topic3", "topic4", "topic5"],
  "confidence": 0.85
}

Focus on:
- Technical terms and concepts
- Research areas and domains  
- Methodologies mentioned
- Key themes and subjects
- Important terminology

Provide 5-10 keywords and 3-8 topics. Keep keywords concise (1-3 words) and topics more descriptive.
`;

      const messages = [
        {
          role: "user" as const,
          content: prompt
        }
      ];

      const response = await this.generateCompletion(messages, 800);
      
      try {
        const result = JSON.parse(response);
        return {
          keywords: Array.isArray(result.keywords) ? result.keywords : [],
          topics: Array.isArray(result.topics) ? result.topics : [],
          confidence: typeof result.confidence === 'number' ? result.confidence : 0.8
        };
      } catch (parseError) {
        console.error('Failed to parse keywords response:', parseError);
        return {
          keywords: [],
          topics: [],
          confidence: 0.5
        };
      }
    } catch (error) {
      console.error('Error extracting keywords:', error);
      throw new Error('Failed to extract keywords');
    }
  }

  /**
   * Answer research-related queries
   * @param query - The research question
   * @param context - Optional context from documents
   * @returns ResearchResponse object
   */
  static async answerResearchQuery(query: string, context?: string): Promise<ResearchResponse> {
    try {
      const prompt = context 
        ? `
As a research assistant, answer the following question based on the provided context.

Context:
${context.substring(0, 5000)}

Question: ${query}

Please provide a comprehensive answer and suggest related questions that might be helpful.

Respond in JSON format:
{
  "answer": "detailed answer to the question",
  "sources": ["relevant source 1", "relevant source 2"],
  "confidence": 0.9,
  "relatedQueries": ["related question 1", "related question 2", "related question 3"]
}
`
        : `
As a research assistant, provide a comprehensive answer to the following research question:

Question: ${query}

Please provide a detailed, accurate response based on current knowledge.

Respond in JSON format:
{
  "answer": "detailed answer to the question", 
  "sources": ["general knowledge", "research literature"],
  "confidence": 0.8,
  "relatedQueries": ["related question 1", "related question 2", "related question 3"]
}
`;

      const messages = [
        {
          role: "user" as const,
          content: prompt
        }
      ];

      const response = await this.generateCompletion(messages, 1200);
      
      try {
        const result = JSON.parse(response);
        return {
          answer: result.answer || 'Unable to provide answer',
          sources: Array.isArray(result.sources) ? result.sources : [],
          confidence: typeof result.confidence === 'number' ? result.confidence : 0.7,
          relatedQueries: Array.isArray(result.relatedQueries) ? result.relatedQueries : []
        };
      } catch (parseError) {
        console.error('Failed to parse research query response:', parseError);
        throw new Error('Failed to parse research response');
      }
    } catch (error) {
      console.error('Error answering research query:', error);
      throw new Error('Failed to answer research query');
    }
  }

  /**
   * Generate literature review content
   * @param topic - The research topic
   * @param sources - Optional source texts
   * @returns Generated literature review text
   */
  static async generateLiteratureReview(topic: string, sources?: string[]): Promise<string> {
    try {
      const sourcesText = sources ? sources.join('\n\n---\n\n') : '';
      
      const prompt = `
As an academic writing expert, create a comprehensive literature review on the topic: "${topic}"

${sourcesText ? `
Based on the following sources:
${sourcesText.substring(0, 8000)}
` : ''}

Please write a well-structured literature review that includes:
1. Introduction to the topic
2. Key themes and findings from the literature
3. Methodological approaches
4. Current gaps and future directions
5. Conclusion

Write in academic style with proper flow and organization. Length should be approximately 800-1200 words.
`;

      const messages = [
        {
          role: "user" as const,
          content: prompt
        }
      ];

      return await this.generateCompletion(messages, 2000);
    } catch (error) {
      console.error('Error generating literature review:', error);
      throw new Error('Failed to generate literature review');
    }
  }
}

export default GroqAIService;