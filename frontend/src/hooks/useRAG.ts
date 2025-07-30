'use client';

import { useState, useCallback } from 'react';
import { useAuth } from './useAuth';

export interface RAGAnalysisResult {
  success: boolean;
  document_id: string;
  analysis_id: string;
  status: string;
  message: string;
  data?: any;
  error?: string;
}

export interface RAGQuestionResult {
  success: boolean;
  query: string;
  answer: string;
  confidence: number;
  sources: Array<{
    document_id: string;
    content_preview: string;
    relevance_score: number;
    metadata: any;
  }>;
  metadata: {
    response_format: string;
    processing_time: number;
    retrieval_time: number;
    generation_time: number;
    quality_score: number;
  };
  processing_time: number;
}

export interface RAGBatchResult {
  success: boolean;
  document_id: string;
  results: Array<{
    question: string;
    answer: string;
    confidence: number;
    sources_count: number;
    processing_time: number;
    success: boolean;
    error?: string;
  }>;
  total_questions: number;
  successful_questions: number;
  average_confidence: number;
}

export const useRAG = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyzeDocument = useCallback(async (
    documentId: string,
    options: any = {}
  ): Promise<RAGAnalysisResult> => {
    if (!user) {
      throw new Error('Authentication required');
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/rag/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentId,
          options
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Analysis failed');
      }

      return result.data;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to analyze document';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const askQuestion = useCallback(async (
    documentId: string,
    question: string,
    options: {
      responseFormat?: string;
      maxSources?: number;
    } = {}
  ): Promise<RAGQuestionResult> => {
    if (!user) {
      throw new Error('Authentication required');
    }

    if (!question.trim()) {
      throw new Error('Question cannot be empty');
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/rag/question', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentId,
          question: question.trim(),
          responseFormat: options.responseFormat || 'detailed',
          maxSources: options.maxSources || 5
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Question processing failed');
      }

      return result.data;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to process question';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const askBatchQuestions = useCallback(async (
    documentId: string,
    questions: string[],
    responseFormat: string = 'detailed'
  ): Promise<RAGBatchResult> => {
    if (!user) {
      throw new Error('Authentication required');
    }

    if (!questions || questions.length === 0) {
      throw new Error('At least one question is required');
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/rag/batch-questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentId,
          questions: questions.filter(q => q.trim()),
          responseFormat
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Batch processing failed');
      }

      return result;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to process batch questions';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const getAnalysisStatus = useCallback(async (analysisId: string) => {
    try {
      const response = await fetch(`/api/rag/analysis-status/${analysisId}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to get analysis status');
      }

      return result;
    } catch (err: any) {
      console.error('Failed to get analysis status:', err);
      return null;
    }
  }, []);

  const getPipelineStats = useCallback(async () => {
    try {
      const response = await fetch('/api/rag/pipeline-stats');
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to get pipeline stats');
      }

      return result.stats;
    } catch (err: any) {
      console.error('Failed to get pipeline stats:', err);
      return null;
    }
  }, []);

  // Helper function to format confidence level
  const getConfidenceLevel = useCallback((confidence: number): string => {
    if (confidence > 0.8) return 'High';
    if (confidence > 0.5) return 'Medium';
    if (confidence > 0.3) return 'Low';
    return 'Very Low';
  }, []);

  // Helper function to get confidence color class
  const getConfidenceColor = useCallback((confidence: number): string => {
    if (confidence > 0.8) return 'text-green-600';
    if (confidence > 0.5) return 'text-yellow-600';
    if (confidence > 0.3) return 'text-orange-600';
    return 'text-red-600';
  }, []);

  return {
    // Core functions
    analyzeDocument,
    askQuestion,
    askBatchQuestions,
    getAnalysisStatus,
    getPipelineStats,
    
    // Helper functions
    getConfidenceLevel,
    getConfidenceColor,
    
    // State
    loading,
    error,
    
    // Utility
    clearError: () => setError(null)
  };
};