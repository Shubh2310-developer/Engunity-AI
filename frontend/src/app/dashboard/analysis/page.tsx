'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { createClient } from '@supabase/supabase-js';
import {
  ChevronDown,
  BarChart3,
  LineChart,
  Activity,
  Database,
  Play,
  Upload,
  FileText,
  Save,
  Zap,
  Sparkles
} from 'lucide-react';
import { LineChart as RechartsLine, BarChart as RechartsBar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line, Bar, ScatterChart, Scatter, Cell, PieChart as RechartsPie, Pie } from 'recharts';

// Type Definitions
interface UploadedFile {
  name: string;
  size: string;
  rows: number;
  columns: number;
  fileId: string;
  status: 'uploading' | 'processing' | 'ready' | 'error';
  metadata?: any;
}

interface DataCleaningOptions {
  removeNulls: boolean;
  normalizeValues: boolean;
  encodeCategorical: boolean;
  dropDuplicates: boolean;
}

interface DataSummary {
  rows: number;
  columns: number;
  missingValues: string;
  dataQuality: string;
  numericalColumns: Record<string, {
    distribution: string;
    mean: number;
    std: number;
    min: number;
    max: number;
  }>;
  categoricalColumns: Record<string, {
    unique_count: number;
    most_frequent: string;
  }>;
  fileSize: string;
  uploadDate: string;
  processingTime?: string;
}

interface ChartsData {
  revenueTrend: any[];
  salesByMonth: any[];
  departmentDistribution: any[];
  salesVsRevenue: any[];
  customCharts?: any[];
}

interface QueryResult {
  columns: string[];
  rows: any[];
  totalRows: number;
  executionTime?: string;
  sql?: string;
  insight?: string;
}

interface DataCleaningResult {
  newFileId: string;
  originalFileId: string;
  cleaningOptions: DataCleaningOptions;
  rowsBefore: number;
  rowsAfter: number;
  columnsBefore: number;
  columnsAfter: number;
  processingTime: string;
  qualityImprovement: string;
}

interface AIInsight {
  type: 'correlation' | 'anomaly' | 'trend' | 'pattern';
  title: string;
  description: string;
  confidence: number;
  data: any;
  timestamp: string;
}

interface AnalysisSession {
  sessionId: string;
  projectId: string;
  fileId: string;
  steps: SessionStep[];
  createdAt: string;
  updatedAt: string;
  status: 'active' | 'completed' | 'archived';
}

interface SessionStep {
  type: 'file_upload' | 'data_cleaning' | 'query' | 'insight';
  fileId?: string;
  option?: string;
  queryType?: 'SQL' | 'NLQ';
  query?: string;
  model?: string;
  timestamp: string;
}

interface ApiError {
  message: string;
  code?: string;
  details?: any;
}

// API Configuration and Types
interface ApiConfig {
  BASE_URL: string;
  TIMEOUT: number;
  RETRY_COUNT: number;
  USE_MOCK: boolean;
}

const API_CONFIG: ApiConfig = {
  BASE_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api',
  TIMEOUT: 10000, // 10 seconds timeout
  RETRY_COUNT: 3,
  USE_MOCK: false // Enable real backend calls
};

// Supabase Configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zsevvvaakunsspxpplbh.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// Enhanced Type Definitions for Real Backend Flow
interface UploadedFile {
  name: string;
  size: string;
  rows: number;
  columns: number;
  fileId: string;
  status: 'uploading' | 'processing' | 'ready' | 'error';
  metadata?: any;
}

interface DataCleaningOptions {
  removeNulls: boolean;
  normalizeValues: boolean;
  encodeCategorical: boolean;
  dropDuplicates: boolean;
}

interface DataSummary {
  rows: number;
  columns: number;
  missingValues: string;
  dataQuality: string;
  numericalColumns: Record<string, {
    distribution: string;
    mean: number;
    std: number;
    min: number;
    max: number;
  }>;
  categoricalColumns: Record<string, {
    unique_count: number;
    most_frequent: string;
  }>;
  fileSize: string;
  uploadDate: string;
  processingTime?: string;
}

interface ChartsData {
  revenueTrend: any[];
  salesByMonth: any[];
  departmentDistribution: any[];
  salesVsRevenue: any[];
  customCharts?: any[];
}

interface QueryResult {
  columns: string[];
  rows: any[];
  totalRows: number;
  executionTime?: string;
  sql?: string;
  insight?: string;
}

interface DataCleaningResult {
  newFileId: string;
  originalFileId: string;
  cleaningOptions: DataCleaningOptions;
  rowsBefore: number;
  rowsAfter: number;
  columnsBefore: number;
  columnsAfter: number;
  processingTime: string;
  qualityImprovement: string;
}

interface AIInsight {
  type: 'correlation' | 'anomaly' | 'trend' | 'pattern';
  title: string;
  description: string;
  confidence: number;
  data: any;
  timestamp: string;
}

interface AnalysisSession {
  sessionId: string;
  projectId: string;
  fileId: string;
  steps: SessionStep[];
  createdAt: string;
  updatedAt: string;
  status: 'active' | 'completed' | 'archived';
}

interface SessionStep {
  type: 'file_upload' | 'data_cleaning' | 'query' | 'insight';
  fileId?: string;
  option?: string;
  queryType?: 'SQL' | 'NLQ';
  query?: string;
  model?: string;
  timestamp: string;
}

interface ApiError {
  message: string;
  code?: string;
  details?: any;
}

// Mock data for development fallback
const MOCK_DATA = {
  fileId: 'mock-file-id',
  metadata: {
    name: 'sample.csv',
    sizeMB: 1.5,
    rows: 1000,
    columns: 10
  }
};

// Static Data
const models = ['Groq LLaMA 3.1', 'Phi-2 Local', 'Mixtral 8x7B'] as const;

interface Project {
  id: string;
  name: string;
}

const projects: Project[] = [
  { id: '1', name: 'AI Optimization' },
  { id: '2', name: 'Sales Analytics' },
  { id: '3', name: 'Customer Insights' }
];

const tabs = [
  { id: 'overview', label: 'Overview', icon: Activity },
  { id: 'charts', label: 'Charts', icon: BarChart3 },
  { id: 'correlations', label: 'Correlations', icon: LineChart },
  { id: 'queries', label: 'Custom Queries', icon: Database }
];

const DataAnalysisWorkspace = () => {
  const [selectedModel, setSelectedModel] = useState('Groq LLaMA 3.1');
  const [selectedProject, setSelectedProject] = useState('AI Optimization');
  const [activeTab, setActiveTab] = useState('overview');
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [fileId, setFileId] = useState<string | null>(null);
  const [dataSummary, setDataSummary] = useState<DataSummary | null>(null);
  const [chartsData, setChartsData] = useState<ChartsData | null>(null);
  const [sqlQuery, setSqlQuery] = useState<string>('SELECT department, AVG(salary) as avg_salary\nFROM employees\nGROUP BY department\nORDER BY avg_salary DESC;');
  const [nlqQuery, setNlqQuery] = useState<string>('Find the average salary per department');
  const [queryResults, setQueryResults] = useState<QueryResult | null>(null);
  const [aiInsights, setAiInsights] = useState<AIInsight[]>([]);
  const [currentSession, setCurrentSession] = useState<AnalysisSession | null>(null);
  const [isLoading, setIsLoading] = useState({
    upload: false,
    summary: false,
    charts: false,
    query: false,
    analysis: false,
    cleaning: false,
  });
  const [dataCleaningOptions, setDataCleaningOptions] = useState<DataCleaningOptions>({
    removeNulls: false,
    normalizeValues: false,
    encodeCategorical: false,
    dropDuplicates: false
  });
  const [isAITyping, setIsAITyping] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Fetch data summary when fileId changes
  useEffect(() => {
    if (fileId) {
      fetchDataSummary(fileId);
      fetchChartsData(fileId);
      fetchAIInsights(fileId);
    }
  }, [fileId]);

  // Utility function for making API requests with retries
  const fetchWithRetry = async (url: string, options: RequestInit, retries = API_CONFIG.RETRY_COUNT): Promise<Response> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT);
      
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      if (retries > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        return fetchWithRetry(url, options, retries - 1);
      }
      throw error;
    }
  };

  // 1. USER UPLOADS A DATASET - Simplified Backend-Only Flow
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(prev => ({ ...prev, upload: true }));
    setUploadProgress(0);

    try {
      // Validate file size (100MB limit)
      if (file.size > 100 * 1024 * 1024) {
        throw new Error('File size exceeds 100MB limit');
      }

      // Validate file type
      const allowedTypes = [
        'text/csv',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/json',
        'application/x-parquet'
      ];
      if (!allowedTypes.includes(file.type) && 
          !file.name.endsWith('.csv') && 
          !file.name.endsWith('.xlsx') && 
          !file.name.endsWith('.json') && 
          !file.name.endsWith('.parquet')) {
        throw new Error('Invalid file type. Please upload CSV, XLSX, JSON, or Parquet files.');
      }

      setUploadProgress(20);

      // Generate unique file ID
      const fileId = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      setUploadProgress(40);

      // Call backend to process file and get metadata
      const formData = new FormData();
      formData.append('file', file);
      formData.append('fileId', fileId);
      formData.append('projectId', selectedProject);

      setUploadProgress(60);

      const processResponse = await fetchWithRetry(`${API_CONFIG.BASE_URL}/process-dataset`, {
        method: 'POST',
        body: formData
      });

      if (!processResponse.ok) {
        let detail = '';
        try {
          const errJson = await processResponse.json();
          detail = typeof errJson === 'object' ? JSON.stringify(errJson) : String(errJson);
        } catch {
          detail = await processResponse.text();
        }
        throw new Error(`Failed to process dataset (${processResponse.status}): ${detail}`);
      }

      const processData = await processResponse.json();
      setUploadProgress(80);

      // Update frontend state
      const uploadedFileData: UploadedFile = {
        name: file.name,
        size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
        rows: processData.rows,
        columns: processData.columns,
        fileId: fileId,
        status: 'ready',
        metadata: processData.metadata
      };

      setFileId(fileId);
      setUploadedFile(uploadedFileData);

      setUploadProgress(100);

      // Create analysis session
      await createAnalysisSession(fileId);

      // Fetch initial data
      await fetchDataSummary(fileId);

    } catch (error) {
      console.error('Error uploading file:', error);
      
      setUploadedFile(null);
      setFileId(null);
      
      alert(error instanceof Error ? error.message : 'Failed to upload file');
    } finally {
      setIsLoading(prev => ({ ...prev, upload: false }));
      setUploadProgress(0);
    }
  };

  // 2. USER SELECTS DATA CLEANING OPTIONS - Complete Flow Implementation
  const toggleDataCleaning = async (option: keyof DataCleaningOptions) => {
    if (!fileId) return;

    const newOptions = {
      ...dataCleaningOptions,
      [option]: !dataCleaningOptions[option]
    };
    
    setIsLoading(prev => ({ ...prev, cleaning: true }));
    
    try {
      // Call backend to clean data
      const response = await fetchWithRetry(`${API_CONFIG.BASE_URL}/clean-data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId,
          options: newOptions,
          projectId: selectedProject
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to clean data');
      }

      const cleaningResult: DataCleaningResult = await response.json();
      
      // Update states with cleaned data
      setFileId(cleaningResult.newFileId);
      setDataCleaningOptions(newOptions);
      
      // Update uploaded file info
      if (uploadedFile) {
        setUploadedFile({
          ...uploadedFile,
          rows: cleaningResult.rowsAfter,
          columns: cleaningResult.columnsAfter,
          fileId: cleaningResult.newFileId
        });
      }

      // Fetch updated data summary
      await fetchDataSummary(cleaningResult.newFileId);
      
      // Update session with cleaning step
      await updateAnalysisSession({
        type: 'data_cleaning',
        fileId: cleaningResult.newFileId,
        option: Object.entries(newOptions)
          .filter(([_, value]) => value)
          .map(([key, _]) => key)
          .join(', '),
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error cleaning data:', error);
      alert('Failed to clean data. Please try again.');
    } finally {
      setIsLoading(prev => ({ ...prev, cleaning: false }));
    }
  };

  // 3. OVERVIEW TAB SHOWS DATASET SUMMARY - Real API Implementation
  const fetchDataSummary = async (fid: string) => {
    setIsLoading(prev => ({ ...prev, summary: true }));
    
    try {
      // Try to get cached summary from MongoDB first
      const response = await fetchWithRetry(`${API_CONFIG.BASE_URL}/data-summary?fileId=${fid}`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch data summary');
      }

      const data: DataSummary = await response.json();
      setDataSummary(data);

    } catch (error) {
      console.error('Error fetching data summary:', error);
      // Show error message to user
      alert('Failed to fetch data summary. Please try again.');
    } finally {
      setIsLoading(prev => ({ ...prev, summary: false }));
    }
  };

  // 4. CHARTS TAB - Real API Implementation
  const fetchChartsData = async (fid: string) => {
    setIsLoading(prev => ({ ...prev, charts: true }));
    
    try {
      const response = await fetchWithRetry(`${API_CONFIG.BASE_URL}/charts?fileId=${fid}`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch charts data');
      }

      const data: ChartsData = await response.json();
      setChartsData(data);

    } catch (error) {
      console.error('Error fetching charts data:', error);
      // Keep existing charts data if fetch fails
    } finally {
      setIsLoading(prev => ({ ...prev, charts: false }));
    }
  };

  // 5. CUSTOM SQL QUERIES - Real API Implementation
  const handleRunQuery = async (type: 'sql' | 'nlq') => {
    if (!fileId) {
      alert('Please upload a dataset first');
      return;
    }

    setIsLoading(prev => ({ ...prev, query: true }));
    setQueryResults(null);

    try {
      const endpoint = type === 'sql' ? 'query-sql' : 'query-nlq';
      const body = {
        fileId,
        projectId: selectedProject,
        ...(type === 'sql' 
          ? { sql: sqlQuery } 
          : { 
              question: nlqQuery, 
              model: selectedModel 
            }
        )
      };

      const response = await fetchWithRetry(`${API_CONFIG.BASE_URL}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(`Failed to execute ${type.toUpperCase()} query`);
      }

      const data = await response.json();
      
      if (!data.results) {
        throw new Error('No results returned from query');
      }

      setQueryResults(data.results);

      if (type === 'nlq' && data.insight) {
        setAiInsights(prev => [...prev, {
          type: 'pattern',
          title: 'AI Query Insight',
          description: data.insight,
          confidence: data.confidence || 0.8,
          data: data.results,
          timestamp: new Date().toISOString()
        }]);
      }

      // Update session with query step
      await updateAnalysisSession({
        type: 'query',
        queryType: type.toUpperCase() as 'SQL' | 'NLQ',
        query: type === 'sql' ? sqlQuery : nlqQuery,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error(`Error running ${type} query:`, error);
      alert(`Failed to run ${type} query: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setQueryResults({ columns: [], rows: [], totalRows: 0 });
    } finally {
      setIsLoading(prev => ({ ...prev, query: false }));
    }
  };

  // 6. NATURAL LANGUAGE QUERIES (NLQ) - Enhanced Implementation
  const runNLQAnalysis = async () => {
    if (!fileId || !nlqQuery.trim()) return;

    setIsLoading(prev => ({ ...prev, analysis: true }));
    setIsAITyping(true);

    try {
      const response = await fetchWithRetry(`${API_CONFIG.BASE_URL}/query-nlq`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: nlqQuery,
          fileId,
          model: selectedModel,
          projectId: selectedProject
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to process natural language query');
      }

      const data = await response.json();
      
      if (data.results) {
        setQueryResults(data.results);
      }

      if (data.insight) {
        const newInsight: AIInsight = {
          type: 'pattern',
          title: 'AI-Generated Insight',
          description: data.insight,
          confidence: data.confidence || 0.8,
          data: data.results || {},
          timestamp: new Date().toISOString()
        };

        setAiInsights(prev => [...prev, newInsight]);
      }

      // Update session
      await updateAnalysisSession({
        type: 'query',
        queryType: 'NLQ',
        query: nlqQuery,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error in NLQ analysis:', error);
      alert('Failed to process natural language query');
    } finally {
      setIsLoading(prev => ({ ...prev, analysis: false }));
      setIsAITyping(false);
    }
  };

  // 7. AI INSIGHTS PANEL - Real API Implementation
  const fetchAIInsights = async (fid: string) => {
    try {
      const response = await fetchWithRetry(`${API_CONFIG.BASE_URL}/insights?fileId=${fid}&sessionId=${currentSession?.sessionId || fid}`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.insights) {
          setAiInsights(data.insights);
        }
      }
    } catch (error) {
      console.error('Error fetching AI insights:', error);
    }
  };

  // 8. SAVE & EXPORT - Session Management
  const createAnalysisSession = async (fid: string) => {
    try {
      const sessionData: Partial<AnalysisSession> = {
        projectId: selectedProject,
        fileId: fid,
        steps: [],
        status: 'active'
      };

      const response = await fetchWithRetry(`${API_CONFIG.BASE_URL}/save-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sessionData),
      });

      if (response.ok) {
        const session = await response.json();
        setCurrentSession(session);
      }
    } catch (error) {
      console.error('Error creating analysis session:', error);
    }
  };

  const updateAnalysisSession = async (step: SessionStep) => {
    if (!currentSession) return;

    try {
      const updatedSession = {
        ...currentSession,
        steps: [...currentSession.steps, step],
        updatedAt: new Date().toISOString()
      };

      const response = await fetchWithRetry(`${API_CONFIG.BASE_URL}/save-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedSession),
      });

      if (response.ok) {
        setCurrentSession(updatedSession);
      }
    } catch (error) {
      console.error('Error updating analysis session:', error);
    }
  };

  const exportDataset = async (format: 'csv' | 'xlsx' | 'json') => {
    if (!fileId) return;

    try {
      const response = await fetchWithRetry(`${API_CONFIG.BASE_URL}/export?fileId=${fileId}&format=${format}`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });

      if (response.ok) {
        const data = await response.json();
        
        if (data.downloadUrl) {
          // Create download link
          const link = document.createElement('a');
          link.href = data.downloadUrl;
          link.download = `dataset_${fileId}.${format}`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      }
    } catch (error) {
      console.error('Error exporting dataset:', error);
      alert('Failed to export dataset');
    }
  };

  // Enhanced runAnalysis function
  const runAnalysis = async () => {
    if (!fileId) {
      alert('Please upload a dataset first');
      return;
    }

    setIsAITyping(true);
    setIsLoading(prev => ({ ...prev, analysis: true }));
    
    try {
      // Get AI insights
      await fetchAIInsights(fileId);
      
      // Get chart data
      await fetchChartsData(fileId);
      
      // Get data summary
      await fetchDataSummary(fileId);

    } catch (error) {
      console.error('Error in analysis:', error);
      alert('Failed to run analysis. Please try again.');
    } finally {
      setIsAITyping(false);
      setIsLoading(prev => ({ ...prev, analysis: false }));
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top Toolbar */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-lg border-b border-slate-200">
        <div className="max-w-screen-2xl mx-auto px-6 py-3">
          <div className="flex items-center justify-between">
            {/* Left Section */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <BarChart3 className="w-7 h-7 text-blue-600" />
                <h1 className="text-xl font-bold text-slate-800">Data Analysis</h1>
              </div>
              <div className="h-6 w-px bg-slate-200"></div>
              <div className="flex items-center gap-2 text-sm">
                <select 
                  value={selectedProject} 
                  onChange={(e) => setSelectedProject(e.target.value)}
                  className="appearance-none bg-transparent font-semibold text-slate-700 p-1 -ml-1 rounded-md hover:bg-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors"
                >
                  {projects.map(project => (
                    <option key={project.id} value={project.id}>{project.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Right Section */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <select 
                  value={selectedModel} 
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="appearance-none bg-slate-100 hover:bg-slate-200 rounded-md pl-3 pr-8 py-2 text-sm font-medium text-slate-700 border border-slate-200 cursor-pointer focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors"
                >
                  {models.map(model => (
                    <option key={model} value={model}>{model}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
              </div>

              <div className="h-6 w-px bg-slate-200"></div>

              <button 
                onClick={async () => {
                  if (!fileId) return;
                  try {
                    const response = await fetchWithRetry(`${API_CONFIG.BASE_URL}/export?fileId=${fileId}&format=csv`, {
                      method: 'GET',
                      headers: { 'Accept': 'application/json' }
                    });
                    const data = await response.json();
                    if (data.downloadUrl) {
                      window.open(data.downloadUrl, '_blank');
                    }
                  } catch (error) {
                    console.error('Error exporting file:', error);
                  }
                }}
                className="px-3 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
              >
                Export
              </button>
              <button 
                onClick={async () => {
                  if (!fileId || !selectedProject) return;
                  try {
                    await updateAnalysisSession({
                      type: 'file_upload',
                      fileId: fileId,
                      timestamp: new Date().toISOString()
                    });
                  } catch (error) {
                    console.error('Error saving session:', error);
                  }
                }}
                className="px-3 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
              >
                Save
              </button>
              <button 
                onClick={runAnalysis}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors shadow-sm"
              >
                <Play className="w-4 h-4" />
                Run Analysis
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex h-[calc(100vh-69px)] max-w-screen-2xl mx-auto">
        {/* Left Panel - Dataset Management */}
        <div className="w-1/4 bg-white border-r border-slate-200 p-6 overflow-y-auto">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, ease: "easeOut" }}>
            <div className="mb-6">
              <h3 className="text-lg font-bold text-slate-800 mb-4">Dataset</h3>
              {!uploadedFile ? (
                <div className="relative">
                  <input 
                    type="file" 
                    accept=".csv,.xlsx,.json,.parquet"
                    onChange={handleFileUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    disabled={isLoading.upload}
                  />
                  <div className={`border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl p-6 text-center transition-colors hover:bg-blue-50 ${isLoading.upload ? 'cursor-wait' : ''}`}>
                    <div className="w-12 h-12 mx-auto mb-4 bg-slate-100 rounded-full flex items-center justify-center">
                      {isLoading.upload ? <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div> : <Upload className="w-6 h-6 text-slate-500" />}
                    </div>
                    <p className="font-semibold text-slate-700 mb-1">{isLoading.upload ? 'Uploading...' : 'Click to upload'}</p>
                    <p className="text-xs text-slate-500">or drag and drop</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-slate-800 text-sm flex items-center gap-2"><FileText size={16} className="text-slate-500"/>{uploadedFile.name}</span>
                      <span className="text-xs text-slate-500 font-mono">{uploadedFile.size}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm pt-2 border-t border-slate-200">
                      <div><span className="text-slate-500">Rows:</span><span className="ml-2 font-semibold text-slate-700">{uploadedFile.rows.toLocaleString()}</span></div>
                      <div><span className="text-slate-500">Cols:</span><span className="ml-2 font-semibold text-slate-700">{uploadedFile.columns}</span></div>
                    </div>
                  </div>
                  <button 
                    onClick={() => { setUploadedFile(null); setFileId(null); setDataSummary(null); setChartsData(null); }}
                    className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 px-3 rounded-lg text-sm font-semibold transition-colors"
                  >
                    Change Dataset
                  </button>
                </div>
              )}
            </div>

            <div>
              <h3 className="text-lg font-bold text-slate-800 mb-4">Data Cleaning</h3>
              <div className="space-y-2">
                {[ { key: 'removeNulls', label: 'Remove Nulls' }, { key: 'normalizeValues', label: 'Normalize Values' }, { key: 'encodeCategorical', label: 'Encode Categorical' }, { key: 'dropDuplicates', label: 'Drop Duplicates' } ].map(({ key, label }) => (
                  <div key={key} className="flex items-center justify-between p-2 bg-white rounded-lg">
                    <label htmlFor={key} className="text-sm font-medium text-slate-700 cursor-pointer">{label}</label>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        id={key}
                        type="checkbox"
                        checked={dataCleaningOptions[key as keyof DataCleaningOptions]}
                        onChange={() => toggleDataCleaning(key as keyof DataCleaningOptions)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-200 rounded-full peer peer-focus:ring-2 peer-focus:ring-blue-300 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border after:border-slate-300 after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Right Panel - Analysis & Visuals */}
        <div className="flex-1 flex flex-col bg-white">
          <div className="border-b border-slate-200 px-6">
            <div className="flex -mb-px">
              {tabs.map(({ id, label, icon: Icon }) => {
                const buttonClass = activeTab === id ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300';
                return (
                  <button
                    key={id}
                    onClick={() => setActiveTab(id)}
                    className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${buttonClass}`}
                  >
                    <Icon className="w-5 h-5" />
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            <motion.div key={activeTab} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: "easeOut" }}>
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {isLoading.summary ? (
                    <div className="text-center p-10">Loading summary...</div>
                  ) : dataSummary ? (
                    <>
                      <div className="grid grid-cols-4 gap-6">
                        <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
                          <p className="text-sm text-slate-500 mb-1">Total Rows</p>
                          <p className="text-3xl font-bold text-slate-800">{dataSummary.rows.toLocaleString()}</p>
                        </div>
                        <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
                          <p className="text-sm text-slate-500 mb-1">Columns</p>
                          <p className="text-3xl font-bold text-slate-800">{dataSummary.columns}</p>
                        </div>
                        <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
                          <p className="text-sm text-slate-500 mb-1">Missing Values</p>
                          <p className="text-3xl font-bold text-slate-800">{dataSummary.missingValues}</p>
                        </div>
                        <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
                          <p className="text-sm text-slate-500 mb-1">Data Quality</p>
                          <p className="text-3xl font-bold text-slate-800">{dataSummary.dataQuality}</p>
                        </div>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                        <h3 className="text-lg font-bold text-slate-800 mb-4">Dataset Summary</h3>
                        <div className="grid grid-cols-2 gap-8">
                          <div>
                            <h4 className="font-semibold text-slate-700 mb-3">Numerical Columns</h4>
                            <div className="space-y-2">{Object.entries(dataSummary.numericalColumns).map(([col, stats]) => <div key={col} className="flex justify-between text-sm"><span className="text-slate-600">{col}</span><span className="font-medium text-slate-800">{stats.distribution}</span></div>)}</div>
                          </div>
                          <div>
                            <h4 className="font-semibold text-slate-700 mb-3">Categorical Columns</h4>
                            <div className="space-y-2">{Object.entries(dataSummary.categoricalColumns).map(([col, stats]) => <div key={col} className="flex justify-between text-sm"><span className="text-slate-600">{col}</span><span className="font-medium text-slate-800">{stats.unique_count} unique</span></div>)}</div>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-center text-slate-500 p-10">Upload a file to see the overview.</div>
                  )}
                </div>
              )}

              {activeTab === 'charts' && (
                <div className="grid grid-cols-2 gap-6">
                  {isLoading.charts ? (
                    <div className="text-center p-10 col-span-2">Loading charts...</div>
                  ) : chartsData ? (
                    <>
                      <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                        <h3 className="text-lg font-bold text-slate-800 mb-4">Revenue Trend</h3>
                        <ResponsiveContainer width="100%" height={250}><RechartsLine data={chartsData.revenueTrend}><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis dataKey="month" stroke="#64748b" fontSize={12} /><YAxis stroke="#64748b" fontSize={12} /><Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }} /><Line type="monotone" dataKey="revenue" stroke="#4f46e5" strokeWidth={2} dot={{ r: 4 }} /></RechartsLine></ResponsiveContainer>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                        <h3 className="text-lg font-bold text-slate-800 mb-4">Sales by Month</h3>
                        <ResponsiveContainer width="100%" height={250}><RechartsBar data={chartsData.salesByMonth}><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis dataKey="month" stroke="#64748b" fontSize={12} /><YAxis stroke="#64748b" fontSize={12} /><Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }} /><Bar dataKey="sales" fill="#10b981" radius={[4, 4, 0, 0]} /></RechartsBar></ResponsiveContainer>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                        <h3 className="text-lg font-bold text-slate-800 mb-4">Department Distribution</h3>
                        <ResponsiveContainer width="100%" height={250}><RechartsPie><Pie data={chartsData.departmentDistribution} cx="50%" cy="50%" innerRadius={50} outerRadius={90} dataKey="value" paddingAngle={2}>{chartsData.departmentDistribution.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}</Pie><Tooltip /></RechartsPie></ResponsiveContainer>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                        <h3 className="text-lg font-bold text-slate-800 mb-4">Sales vs Revenue</h3>
                        <ResponsiveContainer width="100%" height={250}><ScatterChart data={chartsData.salesVsRevenue}><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis dataKey="sales" stroke="#64748b" fontSize={12} name="Sales" /><YAxis dataKey="revenue" stroke="#64748b" fontSize={12} name="Revenue" /><Tooltip cursor={{ strokeDasharray: '3 3' }} /><Scatter name="Customer Count" dataKey="customers" fill="#f59e0b" /></ScatterChart></ResponsiveContainer>
                      </div>
                    </>
                  ) : (
                    <div className="text-center text-slate-500 p-10 col-span-2">Upload a file to see the charts.</div>
                  )}
                </div>
              )}

              {activeTab === 'correlations' && (
                <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                  <h3 className="text-lg font-bold text-slate-800 mb-4">Feature Correlations</h3>
                  <div className="space-y-2">
                    {/* This part will be updated once the backend provides correlation data */}
                    <div className="text-center text-slate-500 p-10">Correlation data not available yet.</div>
                  </div>
                </div>
              )}

              {activeTab === 'queries' && (
                <div className="space-y-6">
                  <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                    <h3 className="text-lg font-bold text-slate-800 mb-4">SQL Editor</h3>
                    <div className="space-y-3">
                      <div className="relative">
                        <textarea 
                          placeholder="SELECT * FROM dataset WHERE..." 
                          className="w-full h-36 p-4 bg-white border border-slate-200 rounded-lg resize-none font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                          value={sqlQuery}
                          onChange={(e) => setSqlQuery(e.target.value)}
                        />
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleRunQuery('sql')}
                          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
                          disabled={isLoading.query || !fileId}
                        >
                          {isLoading.query ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> : <Play className="w-4 h-4" />}Execute
                        </button>
                        <button className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg font-semibold transition-colors"><Save className="w-4 h-4" />Save Query</button>
                      </div>
                    </div>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                    <h3 className="text-lg font-bold text-slate-800 mb-4">Natural Language Query</h3>
                    <div className="relative">
                      <input 
                        type="text" 
                        placeholder="Ask a question about your data..." 
                        className="w-full p-4 pr-12 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        value={nlqQuery}
                        onChange={(e) => setNlqQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleRunQuery('nlq')}
                      />
                      <button 
                        onClick={() => handleRunQuery('nlq')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                        disabled={isLoading.query || !fileId}
                      >
                        {isLoading.query ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> : <Zap className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  {queryResults && (
                    <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                      <h3 className="text-lg font-bold text-slate-800 mb-4">Query Results</h3>
                      <pre className="text-sm bg-white p-4 rounded-lg border border-slate-200 max-h-60 overflow-auto">{JSON.stringify(queryResults, null, 2)}</pre>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </div>

          {/* AI Insights Section */}
          <div className="bg-white border-t border-slate-200 p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-slate-800 mb-1">AI Insights</h3>
                {isAITyping ? (
                  <div className="flex items-center gap-2 text-slate-500"><div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div><div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:0.1s]"></div><div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]"></div><span className="text-sm">AI is analyzing...</span></div>
                ) : (
                  <p className="text-sm text-slate-600">{aiInsights.length > 0 ? aiInsights[aiInsights.length - 1]?.description || 'No insights generated yet. Run an analysis or ask a question to get insights.' : 'No insights generated yet. Run an analysis or ask a question to get insights.'}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DataAnalysisWorkspace;
