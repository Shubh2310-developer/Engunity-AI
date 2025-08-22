'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@supabase/supabase-js';
import {
  ChevronDown, BarChart3, LineChart, Activity, Database, Play, Upload, FileText, Save,
  Zap, Sparkles, Download, Share, Moon, Sun,
  RefreshCw, TrendingUp, AlertTriangle,
  X, ChevronLeft, ChevronRight, Plus, Trash2,
  Edit3, Copy, PieChart, BarChart, Shuffle,
  Target, Sliders, HelpCircle,
  CheckCircle, XCircle
} from 'lucide-react';
import { 
  LineChart as RechartsLine, BarChart as RechartsBar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Line, Bar, ScatterChart, Scatter, Cell, 
  PieChart as RechartsPie, Pie
} from 'recharts';

// Enhanced Type Definitions
interface DatasetVersion {
  id: string;
  name: string;
  timestamp: string;
  changes: string[];
  fileId: string;
}

interface ColumnMetadata {
  name: string;
  type: 'numeric' | 'categorical' | 'datetime' | 'boolean' | 'text';
  nullCount: number;
  nullPercentage: number;
  uniqueCount: number;
  mostFrequent?: string | number;
  mean?: number;
  std?: number;
  min?: number;
  max?: number;
  distribution?: string;
  samples: any[];
}

interface DataPreview {
  columns: string[];
  rows: any[][];
  totalRows: number;
  page: number;
  pageSize: number;
}

interface TransformationRule {
  id: string;
  type: 'regex' | 'replace' | 'cast' | 'rename' | 'calculate';
  column: string;
  description: string;
  parameters: Record<string, any>;
}

interface CleaningLog {
  id: string;
  timestamp: string;
  action: string;
  details: string;
  rowsAffected: number;
  success: boolean;
}

interface CorrelationData {
  matrix: number[][];
  columns: string[];
}

interface ChartConfig {
  id: string;
  type: 'bar' | 'line' | 'pie' | 'scatter' | 'area';
  title: string;
  xAxis: string;
  yAxis: string;
  color?: string;
  filters?: Record<string, any>;
}

interface QueryHistory {
  id: string;
  query: string;
  type: 'SQL' | 'NLQ';
  timestamp: string;
  executionTime: number;
  favorite: boolean;
  results?: QueryResult;
}

interface AnomalyAlert {
  id: string;
  type: 'spike' | 'drop' | 'outlier' | 'trend';
  severity: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  timestamp: string;
  data: any;
  dismissed: boolean;
}

interface Theme {
  isDark: boolean;
}

interface KeyboardShortcut {
  key: string;
  description: string;
  action: () => void;
}

// Existing interfaces (maintained for compatibility)
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
  detectOutliers?: boolean;
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

interface AIInsight {
  type: 'correlation' | 'anomaly' | 'trend' | 'pattern';
  title: string;
  description: string;
  confidence: number;
  data: any;
  timestamp: string;
}

// Configuration
const API_CONFIG = {
  BASE_URL: process.env.NEXT_PUBLIC_API_URL || '/api',
  TIMEOUT: 10000,
  RETRY_COUNT: 3,
  USE_MOCK: false
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zsevvvaakunsspxpplbh.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
// const supabase = createClient(supabaseUrl, supabaseKey); // Uncomment when needed

// Constants
const models = ['Groq LLaMA 3.1', 'Phi-2 Local', 'Mixtral 8x7B'] as const;
const projects = [
  { id: '1', name: 'AI Optimization' },
  { id: '2', name: 'Sales Analytics' },
  { id: '3', name: 'Customer Insights' }
];

const chartTypes = [
  { id: 'bar', name: 'Bar Chart', icon: BarChart },
  { id: 'line', name: 'Line Chart', icon: LineChart },
  { id: 'pie', name: 'Pie Chart', icon: PieChart },
  { id: 'scatter', name: 'Scatter Plot', icon: Target }
];

// Loading Skeleton Components
const LoadingSkeleton = ({ type }: { type: 'card' | 'chart' | 'table' | 'text' }) => {
  if (type === 'card') {
    return (
      <div className="animate-pulse">
        <div className="bg-slate-200 rounded-xl p-6">
          <div className="h-4 bg-slate-300 rounded w-1/3 mb-4"></div>
          <div className="h-8 bg-slate-300 rounded w-1/2 mb-2"></div>
          <div className="h-3 bg-slate-300 rounded w-2/3"></div>
        </div>
      </div>
    );
  }
  
  if (type === 'chart') {
    return (
      <div className="animate-pulse bg-slate-50 rounded-xl p-6 border border-slate-200">
        <div className="h-4 bg-slate-300 rounded w-1/3 mb-4"></div>
        <div className="h-64 bg-slate-200 rounded"></div>
      </div>
    );
  }
  
  if (type === 'table') {
    return (
      <div className="animate-pulse">
        <div className="space-y-3">
          <div className="h-4 bg-slate-300 rounded w-full"></div>
          <div className="h-4 bg-slate-200 rounded w-3/4"></div>
          <div className="h-4 bg-slate-200 rounded w-5/6"></div>
          <div className="h-4 bg-slate-200 rounded w-2/3"></div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="animate-pulse">
      <div className="h-4 bg-slate-300 rounded w-full mb-2"></div>
      <div className="h-4 bg-slate-200 rounded w-3/4"></div>
    </div>
  );
};

// Error Boundary Component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static override getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 bg-red-50 border border-red-200 rounded-xl">
          <div className="flex items-center gap-3 mb-3">
            <XCircle className="w-6 h-6 text-red-500" />
            <h3 className="text-lg font-semibold text-red-800">Something went wrong</h3>
          </div>
          <p className="text-red-700 mb-4">This component encountered an error and couldn't render.</p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Main Component
const DataAnalysisWorkspace = () => {
  // State Management
  const [theme, setTheme] = useState<Theme>({ isDark: false });
  const [selectedModel, setSelectedModel] = useState('Groq LLaMA 3.1');
  const [selectedProject, setSelectedProject] = useState('AI Optimization');
  const [activeTab, setActiveTab] = useState('overview');
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [currentFileId, setCurrentFileId] = useState<string | null>(null);
  
  // Data Management
  const [dataPreview, setDataPreview] = useState<DataPreview | null>(null);
  const [columnMetadata, setColumnMetadata] = useState<ColumnMetadata[]>([]);
  const [datasetVersions, setDatasetVersions] = useState<DatasetVersion[]>([]);
  const [dataSummary, setDataSummary] = useState<DataSummary | null>(null);
  
  // Cleaning & Transformation
  const [dataCleaningOptions, setDataCleaningOptions] = useState<DataCleaningOptions>({
    removeNulls: false,
    normalizeValues: false,
    encodeCategorical: false,
    dropDuplicates: false,
    detectOutliers: false
  });
  const [transformationRules, setTransformationRules] = useState<TransformationRule[]>([]);
  const [cleaningLogs, setCleaningLogs] = useState<CleaningLog[]>([]);
  
  // Visualization
  const [chartsData, setChartsData] = useState<ChartsData | null>(null);
  const [correlationData, setCorrelationData] = useState<CorrelationData | null>(null);
  const [customCharts, setCustomCharts] = useState<ChartConfig[]>([]);
  const [chartBuilder, setChartBuilder] = useState({ isOpen: false, config: null as ChartConfig | null });
  
  // Queries
  const [sqlQuery, setSqlQuery] = useState('SELECT * FROM dataset LIMIT 10;');
  const [nlqQuery, setNlqQuery] = useState('');
  const [queryResults, setQueryResults] = useState<QueryResult | null>(null);
  const [queryHistory, setQueryHistory] = useState<QueryHistory[]>([]);
  
  // AI & Insights
  const [aiInsights, setAiInsights] = useState<AIInsight[]>([]);
  const [anomalyAlerts, setAnomalyAlerts] = useState<AnomalyAlert[]>([]);
  const [isAITyping] = useState(false);
  
  // UI State
  const [isLoading, setIsLoading] = useState({
    upload: false,
    summary: false,
    charts: false,
    query: false,
    analysis: false,
    cleaning: false,
  });
  const [showTour, setShowTour] = useState(false);
  const [tourStep, setTourStep] = useState(0);
  
  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Keyboard Shortcuts
  const keyboardShortcuts: KeyboardShortcut[] = [
    { key: 'Ctrl+Enter', description: 'Run Query', action: () => handleRunQuery('sql') },
    { key: 'Ctrl+Tab', description: 'Switch Tabs', action: () => {} },
    { key: 'Ctrl+E', description: 'Export Data', action: () => exportDataset('csv') },
    { key: 'Ctrl+S', description: 'Save Session', action: () => {} },
    { key: 'Ctrl+/', description: 'Show Shortcuts', action: () => setShowTour(true) }
  ];

  // Effects
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keyboardShortcuts.forEach(shortcut => {
        if (e.ctrlKey && e.key === shortcut.key.split('+')[1]) {
          e.preventDefault();
          shortcut.action();
        }
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (currentFileId) {
      fetchDataPreview(currentFileId);
      fetchColumnMetadata(currentFileId);
      fetchDataSummary(currentFileId);
      fetchChartsData(currentFileId);
      fetchCorrelationData(currentFileId);
      fetchAIInsights(currentFileId);
    }
  }, [currentFileId]);

  // Utility Functions
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

  // Dataset Management Functions
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    setIsLoading(prev => ({ ...prev, upload: true }));

    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        // Validation
        if (file.size > 100 * 1024 * 1024) {
          throw new Error(`${file.name}: File size exceeds 100MB limit`);
        }

        const allowedTypes = ['text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/json'];
        const allowedExtensions = ['.csv', '.xlsx', '.json'];
        
        if (!allowedTypes.includes(file.type) && !allowedExtensions.some(ext => file.name.endsWith(ext))) {
          throw new Error(`${file.name}: Invalid file type`);
        }

        const fileId = `file_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
        const formData = new FormData();
        formData.append('file', file);
        formData.append('fileId', fileId);
        formData.append('projectId', selectedProject);

        const response = await fetch(`${API_CONFIG.BASE_URL}/process-dataset`, {
          method: 'POST',
          body: formData
        });

        if (!response.ok) {
          throw new Error(`${file.name}: Upload failed`);
        }

        const processData = await response.json();

        return {
          name: file.name,
          size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
          rows: processData.rows,
          columns: processData.columns,
          fileId,
          status: 'ready' as const,
          metadata: processData.metadata
        };
      });

      const uploadedFiles = await Promise.all(uploadPromises);
      setUploadedFiles(prev => [...prev, ...uploadedFiles]);
      
      if (uploadedFiles.length > 0 && uploadedFiles[0]) {
        setCurrentFileId(uploadedFiles[0].fileId);
      }

    } catch (error) {
      console.error('Error uploading files:', error);
      alert(error instanceof Error ? error.message : 'Failed to upload files');
    } finally {
      setIsLoading(prev => ({ ...prev, upload: false }));
    }
  };

  const fetchDataPreview = async (fileId: string, page = 1, pageSize = 50) => {
    try {
      const response = await fetch(
        `${API_CONFIG.BASE_URL}/data-preview?fileId=${fileId}&page=${page}&pageSize=${pageSize}`,
        { method: 'GET' }
      );

      if (response.ok) {
        const data = await response.json();
        setDataPreview(data);
      }
    } catch (error) {
      console.error('Error fetching data preview:', error);
    }
  };

  const fetchColumnMetadata = async (fileId: string) => {
    try {
      const response = await fetch(
        `${API_CONFIG.BASE_URL}/column-metadata?fileId=${fileId}`,
        { method: 'GET' }
      );

      if (response.ok) {
        const data = await response.json();
        setColumnMetadata(data.columns || []);
      }
    } catch (error) {
      console.error('Error fetching column metadata:', error);
    }
  };

  const createDatasetVersion = async (changes: string[]) => {
    if (!currentFileId) return;

    const version: DatasetVersion = {
      id: `v_${Date.now()}`,
      name: `Version ${datasetVersions.length + 1}`,
      timestamp: new Date().toISOString(),
      changes,
      fileId: currentFileId
    };

    setDatasetVersions(prev => [...prev, version]);
  };

  const undoLastChange = () => {
    if (datasetVersions.length > 1) {
      const previousVersion = datasetVersions[datasetVersions.length - 2];
      if (previousVersion) {
        setCurrentFileId(previousVersion.fileId);
        setDatasetVersions(prev => prev.slice(0, -1));
      }
    }
  };

  // Data Cleaning Functions
  const toggleDataCleaning = async (option: keyof DataCleaningOptions) => {
    if (!currentFileId) return;

    const newOptions = {
      ...dataCleaningOptions,
      [option]: !dataCleaningOptions[option]
    };

    setIsLoading(prev => ({ ...prev, cleaning: true }));

    try {
      const response = await fetchWithRetry(`${API_CONFIG.BASE_URL}/clean-data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId: currentFileId,
          options: newOptions,
          projectId: selectedProject
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setDataCleaningOptions(newOptions);
        
        const log: CleaningLog = {
          id: `log_${Date.now()}`,
          timestamp: new Date().toISOString(),
          action: `${option}: ${newOptions[option] ? 'enabled' : 'disabled'}`,
          details: `Applied ${option} cleaning option`,
          rowsAffected: result.rowsAffected || 0,
          success: true
        };
        
        setCleaningLogs(prev => [log, ...prev]);
        await createDatasetVersion([log.action]);
        
        // Refresh data
        if (result.newFileId) {
          setCurrentFileId(result.newFileId);
        }
      }
    } catch (error) {
      console.error('Error cleaning data:', error);
      
      const log: CleaningLog = {
        id: `log_${Date.now()}`,
        timestamp: new Date().toISOString(),
        action: `${option}: failed`,
        details: error instanceof Error ? error.message : 'Unknown error',
        rowsAffected: 0,
        success: false
      };
      
      setCleaningLogs(prev => [log, ...prev]);
    } finally {
      setIsLoading(prev => ({ ...prev, cleaning: false }));
    }
  };

  const addTransformationRule = (rule: Omit<TransformationRule, 'id'>) => {
    const newRule: TransformationRule = {
      ...rule,
      id: `rule_${Date.now()}`
    };
    setTransformationRules(prev => [...prev, newRule]);
  };

  const removeTransformationRule = (id: string) => {
    setTransformationRules(prev => prev.filter(rule => rule.id !== id));
  };

  const applyTransformationRules = async () => {
    if (!currentFileId || transformationRules.length === 0) return;

    setIsLoading(prev => ({ ...prev, cleaning: true }));

    try {
      const response = await fetchWithRetry(`${API_CONFIG.BASE_URL}/apply-transformations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId: currentFileId,
          rules: transformationRules,
          projectId: selectedProject
        }),
      });

      if (response.ok) {
        const result = await response.json();
        
        const log: CleaningLog = {
          id: `log_${Date.now()}`,
          timestamp: new Date().toISOString(),
          action: 'Applied transformation rules',
          details: `Applied ${transformationRules.length} transformation rules`,
          rowsAffected: result.rowsAffected || 0,
          success: true
        };
        
        setCleaningLogs(prev => [log, ...prev]);
        await createDatasetVersion([`Applied ${transformationRules.length} transformations`]);
        
        if (result.newFileId) {
          setCurrentFileId(result.newFileId);
        }
      }
    } catch (error) {
      console.error('Error applying transformations:', error);
    } finally {
      setIsLoading(prev => ({ ...prev, cleaning: false }));
    }
  };

  // Visualization Functions
  const fetchCorrelationData = async (fileId: string) => {
    try {
      const response = await fetch(
        `${API_CONFIG.BASE_URL}/correlation?fileId=${fileId}`,
        { method: 'GET' }
      );

      if (response.ok) {
        const data = await response.json();
        setCorrelationData(data);
      }
    } catch (error) {
      console.error('Error fetching correlation data:', error);
    }
  };

  const createCustomChart = (config: ChartConfig) => {
    const newChart: ChartConfig = {
      ...config,
      id: `chart_${Date.now()}`
    };
    setCustomCharts(prev => [...prev, newChart]);
    setChartBuilder({ isOpen: false, config: null });
  };

  // Query Functions
  const handleRunQuery = async (type: 'sql' | 'nlq') => {
    if (!currentFileId) {
      alert('Please upload a dataset first');
      return;
    }

    setIsLoading(prev => ({ ...prev, query: true }));

    try {
      const startTime = Date.now();
      const endpoint = type === 'sql' ? 'query-sql' : 'query-nlq';
      const body = {
        fileId: currentFileId,
        projectId: selectedProject,
        ...(type === 'sql' 
          ? { sql: sqlQuery } 
          : { question: nlqQuery, model: selectedModel }
        )
      };

      const response = await fetchWithRetry(`${API_CONFIG.BASE_URL}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        const data = await response.json();
        const executionTime = Date.now() - startTime;
        
        setQueryResults(data.results);
        
        const historyEntry: QueryHistory = {
          id: `query_${Date.now()}`,
          query: type === 'sql' ? sqlQuery : nlqQuery,
          type: type.toUpperCase() as 'SQL' | 'NLQ',
          timestamp: new Date().toISOString(),
          executionTime,
          favorite: false,
          results: data.results
        };
        
        setQueryHistory(prev => [historyEntry, ...prev.slice(0, 49)]); // Keep last 50 queries
        
        if (type === 'nlq' && data.insight) {
          const newInsight: AIInsight = {
            type: 'pattern',
            title: 'Query Insight',
            description: data.insight,
            confidence: data.confidence || 0.8,
            data: data.results,
            timestamp: new Date().toISOString()
          };
          setAiInsights(prev => [newInsight, ...prev]);
        }
      }
    } catch (error) {
      console.error(`Error running ${type} query:`, error);
      alert(`Failed to run ${type} query`);
    } finally {
      setIsLoading(prev => ({ ...prev, query: false }));
    }
  };

  const toggleQueryFavorite = (queryId: string) => {
    setQueryHistory(prev => prev.map(query => 
      query.id === queryId ? { ...query, favorite: !query.favorite } : query
    ));
  };

  // AI Functions
  const fetchAIInsights = async (fileId: string) => {
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/insights?fileId=${fileId}`, {
        method: 'GET'
      });

      if (response.ok) {
        const data = await response.json();
        if (data.insights) {
          setAiInsights(data.insights);
        }
        if (data.anomalies) {
          setAnomalyAlerts(data.anomalies);
        }
      }
    } catch (error) {
      console.error('Error fetching AI insights:', error);
    }
  };

  const dismissAnomalyAlert = (alertId: string) => {
    setAnomalyAlerts(prev => prev.map(alert => 
      alert.id === alertId ? { ...alert, dismissed: true } : alert
    ));
  };

  // Data fetching functions (maintained from original)
  const fetchDataSummary = async (fileId: string) => {
    setIsLoading(prev => ({ ...prev, summary: true }));
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/data-summary?fileId=${fileId}`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });

      if (response.ok) {
        const data: DataSummary = await response.json();
        setDataSummary(data);
      }
    } catch (error) {
      console.error('Error fetching data summary:', error);
    } finally {
      setIsLoading(prev => ({ ...prev, summary: false }));
    }
  };

  const fetchChartsData = async (fileId: string) => {
    setIsLoading(prev => ({ ...prev, charts: true }));
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/charts?fileId=${fileId}`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });

      if (response.ok) {
        const data: ChartsData = await response.json();
        setChartsData(data);
      }
    } catch (error) {
      console.error('Error fetching charts data:', error);
    } finally {
      setIsLoading(prev => ({ ...prev, charts: false }));
    }
  };

  const exportDataset = async (format: 'csv' | 'xlsx' | 'json' | 'pdf') => {
    if (!currentFileId) return;

    try {
      const response = await fetchWithRetry(`${API_CONFIG.BASE_URL}/export?fileId=${currentFileId}&format=${format}`, {
        method: 'GET'
      });

      if (response.ok) {
        const data = await response.json();
        if (data.downloadUrl) {
          const link = document.createElement('a');
          link.href = data.downloadUrl;
          link.download = `dataset_${currentFileId}.${format}`;
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

  // UI Functions
  const toggleTheme = () => {
    setTheme(prev => ({ isDark: !prev.isDark }));
  };

  const startTour = () => {
    setShowTour(true);
    setTourStep(0);
  };

  const nextTourStep = () => {
    setTourStep(prev => prev + 1);
  };

  const endTour = () => {
    setShowTour(false);
    setTourStep(0);
  };

  // Enhanced Tabs Configuration
  const tabs = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'dataset', label: 'Dataset', icon: Database },
    { id: 'cleaning', label: 'Cleaning', icon: Sliders },
    { id: 'charts', label: 'Visualizations', icon: BarChart3 },
    { id: 'correlations', label: 'Correlations', icon: LineChart },
    { id: 'queries', label: 'Queries', icon: Database },
    { id: 'insights', label: 'AI Insights', icon: Sparkles }
  ];

  // Render Functions
  const renderDatasetPreview = () => (
    <ErrorBoundary>
      <div className="space-y-6">
        {/* Multi-file Management */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-800">Uploaded Files</h3>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
              >
                <Plus className="w-4 h-4" />
                Add Files
              </button>
            </div>
          </div>
          <div className="divide-y divide-slate-200">
            {uploadedFiles.map((file) => (
              <div key={file.fileId} className={`p-4 flex items-center justify-between hover:bg-slate-50 transition-colors ${currentFileId === file.fileId ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''}`}>
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-slate-500" />
                  <div>
                    <p className="font-medium text-slate-800">{file.name}</p>
                    <p className="text-sm text-slate-500">{file.rows.toLocaleString()} rows • {file.columns} columns • {file.size}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {currentFileId !== file.fileId && (
                    <button
                      onClick={() => setCurrentFileId(file.fileId)}
                      className="px-3 py-1 text-sm bg-slate-100 text-slate-700 rounded hover:bg-slate-200 transition-colors"
                    >
                      Select
                    </button>
                  )}
                  <button
                    onClick={() => setUploadedFiles(prev => prev.filter(f => f.fileId !== file.fileId))}
                    className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Data Preview Table */}
        {dataPreview && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-800">Data Preview</h3>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <span>Showing {Math.min(dataPreview.pageSize, dataPreview.totalRows)} of {dataPreview.totalRows.toLocaleString()} rows</span>
                </div>
              </div>
            </div>
            <div className="overflow-auto max-h-96">
              <table className="w-full">
                <thead className="bg-slate-50 sticky top-0">
                  <tr>
                    {dataPreview.columns.map((column, index) => (
                      <th key={index} className="px-4 py-3 text-left text-sm font-semibold text-slate-700 border-b border-slate-200">
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {dataPreview.rows.map((row, rowIndex) => (
                    <tr key={rowIndex} className="hover:bg-slate-50">
                      {row.map((cell, cellIndex) => (
                        <td key={cellIndex} className="px-4 py-3 text-sm text-slate-600">
                          {cell === null || cell === undefined ? 
                            <span className="text-slate-400 italic">null</span> : 
                            String(cell).length > 50 ? String(cell).substring(0, 50) + '...' : String(cell)
                          }
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <button
                onClick={() => fetchDataPreview(currentFileId!, Math.max(1, dataPreview.page - 1))}
                disabled={dataPreview.page <= 1}
                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>
              <span className="text-sm text-slate-600">Page {dataPreview.page}</span>
              <button
                onClick={() => fetchDataPreview(currentFileId!, dataPreview.page + 1)}
                disabled={dataPreview.page * dataPreview.pageSize >= dataPreview.totalRows}
                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Column Metadata */}
        {columnMetadata.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50">
              <h3 className="font-semibold text-slate-800">Column Metadata</h3>
            </div>
            <div className="divide-y divide-slate-200">
              {columnMetadata.map((column, index) => (
                <div key={index} className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-semibold text-slate-800">{column.name}</h4>
                      <p className="text-sm text-slate-600 capitalize">{column.type}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      column.type === 'numeric' ? 'bg-blue-100 text-blue-800' :
                      column.type === 'categorical' ? 'bg-green-100 text-green-800' :
                      column.type === 'datetime' ? 'bg-purple-100 text-purple-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {column.type}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-slate-500">Unique:</span>
                      <span className="ml-2 font-medium">{column.uniqueCount.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Nulls:</span>
                      <span className="ml-2 font-medium">{column.nullPercentage.toFixed(1)}%</span>
                    </div>
                    {column.type === 'numeric' && (
                      <>
                        <div>
                          <span className="text-slate-500">Mean:</span>
                          <span className="ml-2 font-medium">{column.mean?.toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Range:</span>
                          <span className="ml-2 font-medium">{column.min} - {column.max}</span>
                        </div>
                      </>
                    )}
                    {column.type === 'categorical' && column.mostFrequent && (
                      <div className="col-span-2">
                        <span className="text-slate-500">Most Frequent:</span>
                        <span className="ml-2 font-medium">{String(column.mostFrequent)}</span>
                      </div>
                    )}
                  </div>
                  {column.samples && column.samples.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-200">
                      <span className="text-slate-500 text-sm">Samples:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {column.samples.slice(0, 5).map((sample, sampleIndex) => (
                          <span key={sampleIndex} className="px-2 py-1 bg-slate-100 rounded text-xs">
                            {sample === null || sample === undefined ? 'null' : String(sample)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Version History */}
        {datasetVersions.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-800">Version History</h3>
                <button
                  onClick={undoLastChange}
                  disabled={datasetVersions.length <= 1}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm bg-slate-100 text-slate-700 rounded-md hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Undo Last
                </button>
              </div>
            </div>
            <div className="divide-y divide-slate-200 max-h-64 overflow-y-auto">
              {datasetVersions.map((version) => (
                <div key={version.id} className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-slate-800">{version.name}</h4>
                    <span className="text-xs text-slate-500">
                      {new Date(version.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {version.changes.map((change, changeIndex) => (
                      <p key={changeIndex} className="text-sm text-slate-600">• {change}</p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );

  const renderCleaningPanel = () => (
    <ErrorBoundary>
      <div className="space-y-6">
        {/* Data Cleaning Options */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Data Cleaning Options</h3>
          <div className="grid grid-cols-2 gap-4">
            {[
              { key: 'removeNulls', label: 'Remove Null Values', desc: 'Remove rows with missing values' },
              { key: 'normalizeValues', label: 'Normalize Values', desc: 'Scale numeric values to 0-1 range' },
              { key: 'encodeCategorical', label: 'Encode Categorical', desc: 'Convert categories to numeric values' },
              { key: 'dropDuplicates', label: 'Drop Duplicates', desc: 'Remove duplicate rows' },
              { key: 'detectOutliers', label: 'Detect Outliers', desc: 'Flag extreme values as outliers' }
            ].map(({ key, label, desc }) => (
              <div key={key} className="flex items-start justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex-1">
                  <label htmlFor={key} className="block text-sm font-medium text-slate-700 cursor-pointer mb-1">
                    {label}
                  </label>
                  <p className="text-xs text-slate-500">{desc}</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer ml-4">
                  <input
                    id={key}
                    type="checkbox"
                    checked={dataCleaningOptions[key as keyof DataCleaningOptions] || false}
                    onChange={() => toggleDataCleaning(key as keyof DataCleaningOptions)}
                    className="sr-only peer"
                    disabled={isLoading.cleaning}
                  />
                  <div className="w-11 h-6 bg-slate-300 rounded-full peer peer-focus:ring-2 peer-focus:ring-blue-300 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border after:border-slate-300 after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Custom Transformations */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-800">Custom Transformations</h3>
            <button
              onClick={() => {
                const rule = {
                  type: 'replace' as const,
                  column: columnMetadata[0]?.name || '',
                  description: 'New transformation rule',
                  parameters: {}
                };
                addTransformationRule(rule);
              }}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
            >
              <Plus className="w-4 h-4" />
              Add Rule
            </button>
          </div>
          
          {transformationRules.length > 0 ? (
            <div className="space-y-3">
              {transformationRules.map((rule) => (
                <div key={rule.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-slate-800">{rule.type.toUpperCase()}</span>
                      <span className="text-sm text-slate-600">on column</span>
                      <span className="text-sm font-medium text-blue-600">{rule.column}</span>
                    </div>
                    <p className="text-xs text-slate-500">{rule.description}</p>
                  </div>
                  <button
                    onClick={() => removeTransformationRule(rule.id)}
                    className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <button
                onClick={applyTransformationRules}
                disabled={isLoading.cleaning}
                className="w-full py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {isLoading.cleaning ? 'Applying...' : 'Apply All Rules'}
              </button>
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500">
              <Sliders className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No transformation rules defined</p>
            </div>
          )}
        </div>

        {/* Data Type Editor */}
        {columnMetadata.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Data Type Inference</h3>
            <div className="space-y-3">
              {columnMetadata.map((column, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-slate-800">{column.name}</span>
                    <span className="text-sm text-slate-500">({column.uniqueCount} unique values)</span>
                  </div>
                  <select
                    value={column.type}
                    onChange={(e) => {
                      // Handle type change
                      const newType = e.target.value as ColumnMetadata['type'];
                      setColumnMetadata(prev => prev.map(col => 
                        col.name === column.name ? { ...col, type: newType } : col
                      ));
                    }}
                    className="px-3 py-1 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="numeric">Numeric</option>
                    <option value="categorical">Categorical</option>
                    <option value="datetime">DateTime</option>
                    <option value="boolean">Boolean</option>
                    <option value="text">Text</option>
                  </select>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Cleaning Logs */}
        {cleaningLogs.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50">
              <h3 className="font-semibold text-slate-800">Cleaning Logs</h3>
            </div>
            <div className="divide-y divide-slate-200 max-h-64 overflow-y-auto">
              {cleaningLogs.map((log) => (
                <div key={log.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      {log.success ? (
                        <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-500 mt-0.5" />
                      )}
                      <div>
                        <p className="font-medium text-slate-800">{log.action}</p>
                        <p className="text-sm text-slate-600">{log.details}</p>
                        {log.rowsAffected > 0 && (
                          <p className="text-xs text-slate-500 mt-1">
                            {log.rowsAffected.toLocaleString()} rows affected
                          </p>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-slate-500">
                      {new Date(log.timestamp).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );

  const renderCorrelationHeatmap = () => {
    if (!correlationData) {
      return (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Correlation Heatmap</h3>
          <div className="text-center py-8 text-slate-500">
            <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>Correlation data not available</p>
          </div>
        </div>
      );
    }

    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Correlation Heatmap</h3>
        <div className="overflow-auto">
          <div className="min-w-max">
            <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${correlationData.columns.length + 1}, minmax(80px, 1fr))` }}>
              <div></div>
              {correlationData.columns.map((col) => (
                <div key={col} className="p-2 text-xs font-medium text-slate-600 text-center">
                  {col.length > 10 ? col.substring(0, 10) + '...' : col}
                </div>
              ))}
              {correlationData.matrix.map((row, rowIndex) => (
                <React.Fragment key={rowIndex}>
                  <div className="p-2 text-xs font-medium text-slate-600">
                    {correlationData.columns[rowIndex] && correlationData.columns[rowIndex].length > 10 ? 
                      correlationData.columns[rowIndex].substring(0, 10) + '...' : 
                      correlationData.columns[rowIndex] || ''}
                  </div>
                  {row.map((cell, colIndex) => {
                    const intensity = Math.abs(cell);
                    const isPositive = cell >= 0;
                    const bgColor = isPositive ? 
                      `rgba(34, 197, 94, ${intensity})` : 
                      `rgba(239, 68, 68, ${intensity})`;
                    
                    return (
                      <div
                        key={colIndex}
                        className="p-2 text-xs font-medium text-center border border-slate-200 rounded"
                        style={{ backgroundColor: bgColor, color: intensity > 0.5 ? 'white' : 'black' }}
                        title={`${correlationData.columns[rowIndex]} vs ${correlationData.columns[colIndex]}: ${cell.toFixed(3)}`}
                      >
                        {cell.toFixed(2)}
                      </div>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderInteractiveChartBuilder = () => (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-800">Interactive Chart Builder</h3>
        <button
          onClick={() => setChartBuilder({ isOpen: true, config: null })}
          className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
        >
          <Plus className="w-4 h-4" />
          Create Chart
        </button>
      </div>
      
      {customCharts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {customCharts.map((chart) => (
            <div key={chart.id} className="bg-slate-50 rounded-lg border border-slate-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-slate-800">{chart.title}</h4>
                <div className="flex items-center gap-1">
                  <button className="p-1 text-slate-400 hover:text-slate-600 transition-colors">
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => setCustomCharts(prev => prev.filter(c => c.id !== chart.id))}
                    className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="text-sm text-slate-600 mb-3">
                {chart.type.toUpperCase()} • X: {chart.xAxis} • Y: {chart.yAxis}
              </div>
              <div className="h-32 bg-slate-200 rounded flex items-center justify-center text-slate-500">
                Chart Preview
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-slate-500">
          <BarChart3 className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No custom charts created yet</p>
        </div>
      )}
      
      {/* Chart Builder Modal */}
      <AnimatePresence>
        {chartBuilder.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-xl p-6 w-full max-w-md mx-4"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-800">Create Chart</h3>
                <button
                  onClick={() => setChartBuilder({ isOpen: false, config: null })}
                  className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Chart Title</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter chart title"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Chart Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    {chartTypes.map((type) => (
                      <button
                        key={type.id}
                        className="flex items-center gap-2 p-3 border border-slate-300 rounded-md hover:bg-slate-50 transition-colors"
                      >
                        <type.icon className="w-4 h-4" />
                        <span className="text-sm">{type.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">X-Axis Column</label>
                  <select className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    <option value="">Select column...</option>
                    {columnMetadata.map((col) => (
                      <option key={col.name} value={col.name}>{col.name}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Y-Axis Column</label>
                  <select className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    <option value="">Select column...</option>
                    {columnMetadata.filter(col => col.type === 'numeric').map((col) => (
                      <option key={col.name} value={col.name}>{col.name}</option>
                    ))}
                  </select>
                </div>
                
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setChartBuilder({ isOpen: false, config: null })}
                    className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-md hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      // Create chart logic here
                      const newChart: ChartConfig = {
                        id: `chart_${Date.now()}`,
                        type: 'bar',
                        title: 'New Chart',
                        xAxis: columnMetadata[0]?.name || '',
                        yAxis: columnMetadata.find(col => col.type === 'numeric')?.name || ''
                      };
                      createCustomChart(newChart);
                    }}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Create
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );

  const renderQueryPanel = () => (
    <ErrorBoundary>
      <div className="space-y-6">
        {/* Query History */}
        {queryHistory.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50">
              <h3 className="font-semibold text-slate-800">Query History</h3>
            </div>
            <div className="divide-y divide-slate-200 max-h-48 overflow-y-auto">
              {queryHistory.slice(0, 10).map((query) => (
                <div key={query.id} className="p-3 hover:bg-slate-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          query.type === 'SQL' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {query.type}
                        </span>
                        <span className="text-xs text-slate-500">
                          {query.executionTime}ms
                        </span>
                      </div>
                      <p className="text-sm text-slate-700 truncate">{query.query}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        {new Date(query.timestamp).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 ml-3">
                      <button
                        onClick={() => toggleQueryFavorite(query.id)}
                        className={`p-1 transition-colors ${
                          query.favorite ? 'text-yellow-500' : 'text-slate-400 hover:text-yellow-500'
                        }`}
                      >
                        <span className="text-sm">★</span>
                      </button>
                      <button
                        onClick={() => {
                          if (query.type === 'SQL') {
                            setSqlQuery(query.query);
                          } else {
                            setNlqQuery(query.query);
                          }
                        }}
                        className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SQL Editor */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">SQL Editor</h3>
          <div className="space-y-3">
            <div className="relative">
              <textarea
                placeholder="SELECT * FROM dataset WHERE..."
                className="w-full h-36 p-4 bg-slate-50 border border-slate-200 rounded-lg resize-none font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                value={sqlQuery}
                onChange={(e) => setSqlQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.ctrlKey && e.key === 'Enter') {
                    e.preventDefault();
                    handleRunQuery('sql');
                  }
                }}
              />
              <div className="absolute bottom-2 right-2 text-xs text-slate-400">
                Ctrl+Enter to run
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleRunQuery('sql')}
                disabled={isLoading.query || !currentFileId}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading.query ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <Play className="w-4 h-4" />
                )}
                Execute Query
              </button>
              <button className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg font-semibold transition-colors">
                <Save className="w-4 h-4" />
                Save
              </button>
              <button className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg font-semibold transition-colors">
                <Shuffle className="w-4 h-4" />
                Format
              </button>
            </div>
          </div>
        </div>

        {/* Natural Language Query */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Natural Language Query</h3>
          <div className="relative">
            <input
              type="text"
              placeholder="Ask a question about your data..."
              className="w-full p-4 pr-12 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              value={nlqQuery}
              onChange={(e) => setNlqQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleRunQuery('nlq');
                }
              }}
            />
            <button
              onClick={() => handleRunQuery('nlq')}
              disabled={isLoading.query || !currentFileId || !nlqQuery.trim()}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading.query ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <Zap className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Query Results */}
        {queryResults && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-800">Query Results</h3>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <span>{queryResults.totalRows.toLocaleString()} rows</span>
                  {queryResults.executionTime && (
                    <>
                      <span>•</span>
                      <span>{queryResults.executionTime}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="overflow-auto max-h-96">
              {queryResults.rows.length > 0 ? (
                <table className="w-full">
                  <thead className="bg-slate-50 sticky top-0">
                    <tr>
                      {queryResults.columns.map((column, index) => (
                        <th key={index} className="px-4 py-3 text-left text-sm font-semibold text-slate-700 border-b border-slate-200">
                          {column}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {queryResults.rows.slice(0, 100).map((row, rowIndex) => (
                      <tr key={rowIndex} className="hover:bg-slate-50">
                        {queryResults.columns.map((column, colIndex) => (
                          <td key={colIndex} className="px-4 py-3 text-sm text-slate-600">
                            {row[column] === null || row[column] === undefined ? (
                              <span className="text-slate-400 italic">null</span>
                            ) : (
                              String(row[column]).length > 50 ? 
                                String(row[column]).substring(0, 50) + '...' : 
                                String(row[column])
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <Database className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No results found</p>
                </div>
              )}
            </div>
            {queryResults.rows.length > 100 && (
              <div className="p-4 border-t border-slate-200 bg-slate-50 text-center text-sm text-slate-600">
                Showing first 100 rows of {queryResults.totalRows.toLocaleString()}
              </div>
            )}
          </div>
        )}
      </div>
    </ErrorBoundary>
  );

  const renderAIInsightsPanel = () => (
    <ErrorBoundary>
      <div className="space-y-6">
        {/* Anomaly Alerts */}
        {anomalyAlerts.filter(alert => !alert.dismissed).length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-red-50">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <h3 className="font-semibold text-red-800">Anomaly Alerts</h3>
              </div>
            </div>
            <div className="divide-y divide-slate-200">
              {anomalyAlerts.filter(alert => !alert.dismissed).map((alert) => (
                <div key={alert.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          alert.severity === 'high' ? 'bg-red-100 text-red-800' :
                          alert.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {alert.severity.toUpperCase()}
                        </span>
                        <span className="text-sm font-medium text-slate-800">{alert.title}</span>
                      </div>
                      <p className="text-sm text-slate-600">{alert.description}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        {new Date(alert.timestamp).toLocaleString()}
                      </p>
                    </div>
                    <button
                      onClick={() => dismissAnomalyAlert(alert.id)}
                      className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI Insights Timeline */}
        {aiInsights.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50">
              <h3 className="font-semibold text-slate-800">AI Insights Timeline</h3>
            </div>
            <div className="divide-y divide-slate-200 max-h-96 overflow-y-auto">
              {aiInsights.map((insight, index) => (
                <div key={index} className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      insight.type === 'correlation' ? 'bg-blue-100 text-blue-600' :
                      insight.type === 'anomaly' ? 'bg-red-100 text-red-600' :
                      insight.type === 'trend' ? 'bg-green-100 text-green-600' :
                      'bg-purple-100 text-purple-600'
                    }`}>
                      {insight.type === 'correlation' ? <LineChart className="w-4 h-4" /> :
                       insight.type === 'anomaly' ? <AlertTriangle className="w-4 h-4" /> :
                       insight.type === 'trend' ? <TrendingUp className="w-4 h-4" /> :
                       <Sparkles className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-medium text-slate-800">{insight.title}</h4>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <span>{Math.round(insight.confidence * 100)}% confidence</span>
                          <span>•</span>
                          <span>{new Date(insight.timestamp).toLocaleString()}</span>
                        </div>
                      </div>
                      <p className="text-sm text-slate-600">{insight.description}</p>
                      <div className="w-full bg-slate-200 rounded-full h-1.5 mt-2">
                        <div 
                          className="bg-blue-600 h-1.5 rounded-full" 
                          style={{ width: `${insight.confidence * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Prediction Mode */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Prediction Mode</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Prediction Target</label>
              <select className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                <option value="">Select target column...</option>
                {columnMetadata.filter(col => col.type === 'numeric').map((col) => (
                  <option key={col.name} value={col.name}>{col.name}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Prediction Type</label>
              <div className="flex gap-3">
                <label className="flex items-center">
                  <input type="radio" name="predictionType" value="classification" className="mr-2" />
                  <span className="text-sm">Classification</span>
                </label>
                <label className="flex items-center">
                  <input type="radio" name="predictionType" value="regression" className="mr-2" />
                  <span className="text-sm">Regression</span>
                </label>
              </div>
            </div>
            
            <button className="w-full py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
              Generate Predictions
            </button>
          </div>
        </div>

        {/* Explain Insights */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Explain Insights</h3>
          {aiInsights.length > 0 ? (
            <div className="space-y-3">
              {aiInsights.slice(0, 3).map((insight, index) => (
                <div key={index} className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <h4 className="font-medium text-slate-800 mb-2">{insight.title}</h4>
                  <p className="text-sm text-slate-600">{insight.description}</p>
                  <button className="mt-2 text-sm text-blue-600 hover:text-blue-800 transition-colors">
                    Explain in detail →
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500">
              <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No insights available yet. Run an analysis to generate insights.</p>
            </div>
          )}
        </div>
      </div>
    </ErrorBoundary>
  );

  // Tour Component
  const renderTour = () => {
    if (!showTour) return null;

    const tourSteps = [
      {
        title: "Welcome to Data Analysis",
        content: "Let's take a quick tour of the features available in this workspace."
      },
      {
        title: "Upload & Manage Data",
        content: "Upload multiple datasets, preview data, and manage different versions."
      },
      {
        title: "Clean & Transform",
        content: "Use built-in cleaning options or create custom transformation rules."
      },
      {
        title: "Visualize & Explore",
        content: "Create interactive charts and explore correlations in your data."
      },
      {
        title: "Query & Analyze",
        content: "Use SQL or natural language queries to extract insights."
      },
      {
        title: "AI-Powered Insights",
        content: "Get automated insights, anomaly detection, and predictions."
      }
    ];

    const currentStep = tourSteps[tourStep];
    if (!currentStep) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-xl p-6 w-full max-w-md mx-4"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-800">{currentStep.title}</h3>
            <button
              onClick={endTour}
              className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <p className="text-slate-600 mb-6">{currentStep.content}</p>
          
          <div className="flex items-center justify-between">
            <div className="flex space-x-1">
              {tourSteps.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full ${
                    index === tourStep ? 'bg-blue-600' : 'bg-slate-300'
                  }`}
                />
              ))}
            </div>
            
            <div className="flex gap-2">
              {tourStep > 0 && (
                <button
                  onClick={() => setTourStep(prev => prev - 1)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800 transition-colors"
                >
                  Previous
                </button>
              )}
              {tourStep < tourSteps.length - 1 ? (
                <button
                  onClick={nextTourStep}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Next
                </button>
              ) : (
                <button
                  onClick={endTour}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Get Started
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    );
  };

  // Main Render
  return (
    <div className={`min-h-screen transition-colors ${theme.isDark ? 'bg-slate-900' : 'bg-slate-50'}`}>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".csv,.xlsx,.json,.parquet"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Top Toolbar */}
      <header className={`sticky top-0 z-30 backdrop-blur-lg border-b transition-colors ${
        theme.isDark ? 'bg-slate-800/90 border-slate-700' : 'bg-white/90 border-slate-200'
      }`}>
        <div className="max-w-screen-2xl mx-auto px-6 py-3">
          <div className="flex items-center justify-between">
            {/* Left Section */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <BarChart3 className="w-7 h-7 text-blue-600" />
                <h1 className={`text-xl font-bold ${theme.isDark ? 'text-slate-100' : 'text-slate-800'}`}>
                  Data Analysis
                </h1>
              </div>
              <div className={`h-6 w-px ${theme.isDark ? 'bg-slate-600' : 'bg-slate-200'}`}></div>
              <div className="flex items-center gap-2 text-sm">
                <select 
                  value={selectedProject} 
                  onChange={(e) => setSelectedProject(e.target.value)}
                  className={`appearance-none bg-transparent font-semibold p-1 -ml-1 rounded-md transition-colors ${
                    theme.isDark 
                      ? 'text-slate-300 hover:bg-slate-700 focus:ring-blue-400' 
                      : 'text-slate-700 hover:bg-slate-100 focus:ring-blue-500'
                  } focus:ring-2 focus:outline-none`}
                >
                  {projects.map(project => (
                    <option key={project.id} value={project.id}>{project.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Right Section */}
            <div className="flex items-center gap-3">
              {/* Model Selector */}
              <div className="relative">
                <select 
                  value={selectedModel} 
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className={`appearance-none rounded-md pl-3 pr-8 py-2 text-sm font-medium border cursor-pointer transition-colors ${
                    theme.isDark
                      ? 'bg-slate-700 hover:bg-slate-600 text-slate-300 border-slate-600 focus:ring-blue-400'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200 focus:ring-blue-500'
                  } focus:ring-2 focus:outline-none`}
                >
                  {models.map(model => (
                    <option key={model} value={model}>{model}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
              </div>

              <div className={`h-6 w-px ${theme.isDark ? 'bg-slate-600' : 'bg-slate-200'}`}></div>

              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className={`p-2 rounded-md transition-colors ${
                  theme.isDark ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-600 hover:bg-slate-100'
                }`}
                title="Toggle theme"
              >
                {theme.isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>

              {/* Help/Tour Button */}
              <button
                onClick={startTour}
                className={`p-2 rounded-md transition-colors ${
                  theme.isDark ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-600 hover:bg-slate-100'
                }`}
                title="Take tour"
              >
                <HelpCircle className="w-4 h-4" />
              </button>

              {/* Export Button */}
              <button 
                onClick={() => exportDataset('csv')}
                disabled={!currentFileId}
                className={`px-3 py-2 text-sm font-semibold rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  theme.isDark 
                    ? 'text-slate-300 hover:text-slate-100 hover:bg-slate-700' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Download className="w-4 h-4 inline mr-1" />
                Export
              </button>

              {/* Share Button */}
              <button 
                className={`px-3 py-2 text-sm font-semibold rounded-md transition-colors ${
                  theme.isDark 
                    ? 'text-slate-300 hover:text-slate-100 hover:bg-slate-700' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Share className="w-4 h-4 inline mr-1" />
                Share
              </button>

              {/* Run Analysis Button */}
              <button 
                onClick={() => {
                  if (currentFileId) {
                    fetchAIInsights(currentFileId);
                    fetchChartsData(currentFileId);
                  }
                }}
                disabled={!currentFileId || isLoading.analysis}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading.analysis ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <Play className="w-4 h-4" />
                )}
                Run Analysis
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex h-[calc(100vh-69px)] max-w-screen-2xl mx-auto">
        {/* Left Panel - Dataset Management */}
        <div className={`w-1/4 border-r p-6 overflow-y-auto transition-colors ${
          theme.isDark 
            ? 'bg-slate-800 border-slate-700' 
            : 'bg-white border-slate-200'
        }`}>
          <motion.div 
            initial={{ opacity: 0, x: -20 }} 
            animate={{ opacity: 1, x: 0 }} 
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <div className="mb-6">
              <h3 className={`text-lg font-bold mb-4 ${theme.isDark ? 'text-slate-100' : 'text-slate-800'}`}>
                Dataset
              </h3>
              {uploadedFiles.length === 0 ? (
                <div className="relative">
                  <input 
                    type="file" 
                    multiple
                    accept=".csv,.xlsx,.json,.parquet"
                    onChange={handleFileUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    disabled={isLoading.upload}
                  />
                  <div className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
                    theme.isDark
                      ? 'border-slate-600 hover:border-blue-500 hover:bg-slate-700/50'
                      : 'border-slate-300 hover:border-blue-500 hover:bg-blue-50'
                  } ${isLoading.upload ? 'cursor-wait' : ''}`}>
                    <div className={`w-12 h-12 mx-auto mb-4 rounded-full flex items-center justify-center ${
                      theme.isDark ? 'bg-slate-700' : 'bg-slate-100'
                    }`}>
                      {isLoading.upload ? (
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                      ) : (
                        <Upload className="w-6 h-6 text-slate-500" />
                      )}
                    </div>
                    <p className={`font-semibold mb-1 ${
                      theme.isDark ? 'text-slate-300' : 'text-slate-700'
                    }`}>
                      {isLoading.upload ? 'Uploading...' : 'Click to upload'}
                    </p>
                    <p className="text-xs text-slate-500">or drag and drop</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {uploadedFiles.map((file) => (
                    <div key={file.fileId} className={`rounded-lg p-3 border transition-colors ${
                      currentFileId === file.fileId
                        ? theme.isDark ? 'bg-blue-900/50 border-blue-500' : 'bg-blue-50 border-blue-200'
                        : theme.isDark ? 'bg-slate-700 border-slate-600' : 'bg-slate-50 border-slate-200'
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className={`font-semibold text-sm flex items-center gap-2 ${
                          theme.isDark ? 'text-slate-200' : 'text-slate-800'
                        }`}>
                          <FileText size={16} className="text-slate-500"/>
                          {file.name}
                        </span>
                        <span className="text-xs text-slate-500 font-mono">{file.size}</span>
                      </div>
                      <div className={`grid grid-cols-2 gap-2 text-sm pt-2 border-t ${
                        theme.isDark ? 'border-slate-600' : 'border-slate-200'
                      }`}>
                        <div>
                          <span className="text-slate-500">Rows:</span>
                          <span className={`ml-2 font-semibold ${
                            theme.isDark ? 'text-slate-300' : 'text-slate-700'
                          }`}>
                            {file.rows.toLocaleString()}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500">Cols:</span>
                          <span className={`ml-2 font-semibold ${
                            theme.isDark ? 'text-slate-300' : 'text-slate-700'
                          }`}>
                            {file.columns}
                          </span>
                        </div>
                      </div>
                      {currentFileId !== file.fileId && (
                        <button
                          onClick={() => setCurrentFileId(file.fileId)}
                          className="w-full mt-2 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                        >
                          Select
                        </button>
                      )}
                    </div>
                  ))}
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className={`w-full py-2 px-3 rounded-lg text-sm font-semibold transition-colors ${
                      theme.isDark
                        ? 'bg-slate-700 hover:bg-slate-600 text-slate-300 border border-slate-600'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    Add More Files
                  </button>
                </div>
              )}
            </div>

            {/* Quick Data Cleaning */}
            <div>
              <h3 className={`text-lg font-bold mb-4 ${theme.isDark ? 'text-slate-100' : 'text-slate-800'}`}>
                Quick Cleaning
              </h3>
              <div className="space-y-2">
                {[
                  { key: 'removeNulls', label: 'Remove Nulls' },
                  { key: 'normalizeValues', label: 'Normalize Values' },
                  { key: 'encodeCategorical', label: 'Encode Categorical' },
                  { key: 'dropDuplicates', label: 'Drop Duplicates' },
                  { key: 'detectOutliers', label: 'Detect Outliers' }
                ].map(({ key, label }) => (
                  <div key={key} className={`flex items-center justify-between p-2 rounded-lg transition-colors ${
                    theme.isDark ? 'bg-slate-700' : 'bg-white'
                  }`}>
                    <label htmlFor={key} className={`text-sm font-medium cursor-pointer ${
                      theme.isDark ? 'text-slate-300' : 'text-slate-700'
                    }`}>
                      {label}
                    </label>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        id={key}
                        type="checkbox"
                        checked={dataCleaningOptions[key as keyof DataCleaningOptions] || false}
                        onChange={() => toggleDataCleaning(key as keyof DataCleaningOptions)}
                        className="sr-only peer"
                        disabled={isLoading.cleaning || !currentFileId}
                      />
                      <div className="w-9 h-5 bg-slate-200 rounded-full peer peer-focus:ring-2 peer-focus:ring-blue-300 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border after:border-slate-300 after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600 peer-disabled:opacity-50"></div>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Right Panel - Analysis & Visuals */}
        <div className={`flex-1 flex flex-col transition-colors ${
          theme.isDark ? 'bg-slate-800' : 'bg-white'
        }`}>
          <div className={`border-b px-6 transition-colors ${
            theme.isDark ? 'border-slate-700' : 'border-slate-200'
          }`}>
            <div className="flex -mb-px">
              {tabs.map(({ id, label, icon: Icon }) => {
                const isActive = activeTab === id;
                const buttonClass = isActive 
                  ? theme.isDark 
                    ? 'border-blue-500 text-blue-400' 
                    : 'border-blue-600 text-blue-600'
                  : theme.isDark 
                    ? 'border-transparent text-slate-400 hover:text-slate-300 hover:border-slate-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300';
                    
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
            <motion.div 
              key={activeTab} 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ duration: 0.4, ease: "easeOut" }}
            >
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {isLoading.summary ? (
                    <div className="grid grid-cols-4 gap-6">
                      {[...Array(4)].map((_, i) => (
                        <LoadingSkeleton key={i} type="card" />
                      ))}
                    </div>
                  ) : dataSummary ? (
                    <>
                      <div className="grid grid-cols-4 gap-6">
                        <div className={`rounded-xl p-5 border transition-colors ${
                          theme.isDark ? 'bg-slate-700 border-slate-600' : 'bg-slate-50 border-slate-200'
                        }`}>
                          <p className="text-sm text-slate-500 mb-1">Total Rows</p>
                          <p className={`text-3xl font-bold ${theme.isDark ? 'text-slate-100' : 'text-slate-800'}`}>
                            {dataSummary.rows.toLocaleString()}
                          </p>
                        </div>
                        <div className={`rounded-xl p-5 border transition-colors ${
                          theme.isDark ? 'bg-slate-700 border-slate-600' : 'bg-slate-50 border-slate-200'
                        }`}>
                          <p className="text-sm text-slate-500 mb-1">Columns</p>
                          <p className={`text-3xl font-bold ${theme.isDark ? 'text-slate-100' : 'text-slate-800'}`}>
                            {dataSummary.columns}
                          </p>
                        </div>
                        <div className={`rounded-xl p-5 border transition-colors ${
                          theme.isDark ? 'bg-slate-700 border-slate-600' : 'bg-slate-50 border-slate-200'
                        }`}>
                          <p className="text-sm text-slate-500 mb-1">Missing Values</p>
                          <p className={`text-3xl font-bold ${theme.isDark ? 'text-slate-100' : 'text-slate-800'}`}>
                            {dataSummary.missingValues}
                          </p>
                        </div>
                        <div className={`rounded-xl p-5 border transition-colors ${
                          theme.isDark ? 'bg-slate-700 border-slate-600' : 'bg-slate-50 border-slate-200'
                        }`}>
                          <p className="text-sm text-slate-500 mb-1">Data Quality</p>
                          <p className={`text-3xl font-bold ${theme.isDark ? 'text-slate-100' : 'text-slate-800'}`}>
                            {dataSummary.dataQuality}
                          </p>
                        </div>
                      </div>
                      <div className={`rounded-xl p-6 border transition-colors ${
                        theme.isDark ? 'bg-slate-700 border-slate-600' : 'bg-slate-50 border-slate-200'
                      }`}>
                        <h3 className={`text-lg font-bold mb-4 ${theme.isDark ? 'text-slate-100' : 'text-slate-800'}`}>
                          Dataset Summary
                        </h3>
                        <div className="grid grid-cols-2 gap-8">
                          <div>
                            <h4 className={`font-semibold mb-3 ${theme.isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                              Numerical Columns
                            </h4>
                            <div className="space-y-2">
                              {Object.entries(dataSummary.numericalColumns).map(([col, stats]) => (
                                <div key={col} className="flex justify-between text-sm">
                                  <span className="text-slate-600">{col}</span>
                                  <span className={`font-medium ${theme.isDark ? 'text-slate-300' : 'text-slate-800'}`}>
                                    {stats.distribution}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div>
                            <h4 className={`font-semibold mb-3 ${theme.isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                              Categorical Columns
                            </h4>
                            <div className="space-y-2">
                              {Object.entries(dataSummary.categoricalColumns).map(([col, stats]) => (
                                <div key={col} className="flex justify-between text-sm">
                                  <span className="text-slate-600">{col}</span>
                                  <span className={`font-medium ${theme.isDark ? 'text-slate-300' : 'text-slate-800'}`}>
                                    {stats.unique_count} unique
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-center text-slate-500 p-10">
                      <Database className="w-16 h-16 mx-auto mb-4 opacity-50" />
                      <h3 className="text-lg font-semibold mb-2">No Data Available</h3>
                      <p>Upload a dataset to see the overview and start analyzing your data.</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'dataset' && renderDatasetPreview()}
              {activeTab === 'cleaning' && renderCleaningPanel()}
              
              {activeTab === 'charts' && (
                <div className="space-y-6">
                  {renderInteractiveChartBuilder()}
                  {renderCorrelationHeatmap()}
                  
                  {/* Existing Charts */}
                  {chartsData && (
                    <div className="grid grid-cols-2 gap-6">
                      {isLoading.charts ? (
                        [...Array(4)].map((_, i) => (
                          <LoadingSkeleton key={i} type="chart" />
                        ))
                      ) : (
                        <>
                          <div className={`rounded-xl p-6 border transition-colors ${
                            theme.isDark ? 'bg-slate-700 border-slate-600' : 'bg-slate-50 border-slate-200'
                          }`}>
                            <h3 className={`text-lg font-bold mb-4 ${theme.isDark ? 'text-slate-100' : 'text-slate-800'}`}>
                              Revenue Trend
                            </h3>
                            <ResponsiveContainer width="100%" height={250}>
                              <RechartsLine data={chartsData.revenueTrend}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
                                <YAxis stroke="#64748b" fontSize={12} />
                                <Tooltip 
                                  contentStyle={{ 
                                    backgroundColor: theme.isDark ? '#334155' : '#fff', 
                                    border: '1px solid #e2e8f0', 
                                    borderRadius: '8px',
                                    color: theme.isDark ? '#f1f5f9' : '#0f172a'
                                  }} 
                                />
                                <Line type="monotone" dataKey="revenue" stroke="#4f46e5" strokeWidth={2} dot={{ r: 4 }} />
                              </RechartsLine>
                            </ResponsiveContainer>
                          </div>
                          
                          <div className={`rounded-xl p-6 border transition-colors ${
                            theme.isDark ? 'bg-slate-700 border-slate-600' : 'bg-slate-50 border-slate-200'
                          }`}>
                            <h3 className={`text-lg font-bold mb-4 ${theme.isDark ? 'text-slate-100' : 'text-slate-800'}`}>
                              Sales by Month
                            </h3>
                            <ResponsiveContainer width="100%" height={250}>
                              <RechartsBar data={chartsData.salesByMonth}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
                                <YAxis stroke="#64748b" fontSize={12} />
                                <Tooltip 
                                  contentStyle={{ 
                                    backgroundColor: theme.isDark ? '#334155' : '#fff', 
                                    border: '1px solid #e2e8f0', 
                                    borderRadius: '8px',
                                    color: theme.isDark ? '#f1f5f9' : '#0f172a'
                                  }} 
                                />
                                <Bar dataKey="sales" fill="#10b981" radius={[4, 4, 0, 0]} />
                              </RechartsBar>
                            </ResponsiveContainer>
                          </div>
                          
                          <div className={`rounded-xl p-6 border transition-colors ${
                            theme.isDark ? 'bg-slate-700 border-slate-600' : 'bg-slate-50 border-slate-200'
                          }`}>
                            <h3 className={`text-lg font-bold mb-4 ${theme.isDark ? 'text-slate-100' : 'text-slate-800'}`}>
                              Department Distribution
                            </h3>
                            <ResponsiveContainer width="100%" height={250}>
                              <RechartsPie>
                                <Pie 
                                  data={chartsData.departmentDistribution} 
                                  cx="50%" 
                                  cy="50%" 
                                  innerRadius={50} 
                                  outerRadius={90} 
                                  dataKey="value" 
                                  paddingAngle={2}
                                >
                                  {chartsData.departmentDistribution.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.fill} />
                                  ))}
                                </Pie>
                                <Tooltip 
                                  contentStyle={{ 
                                    backgroundColor: theme.isDark ? '#334155' : '#fff', 
                                    border: '1px solid #e2e8f0', 
                                    borderRadius: '8px',
                                    color: theme.isDark ? '#f1f5f9' : '#0f172a'
                                  }} 
                                />
                              </RechartsPie>
                            </ResponsiveContainer>
                          </div>
                          
                          <div className={`rounded-xl p-6 border transition-colors ${
                            theme.isDark ? 'bg-slate-700 border-slate-600' : 'bg-slate-50 border-slate-200'
                          }`}>
                            <h3 className={`text-lg font-bold mb-4 ${theme.isDark ? 'text-slate-100' : 'text-slate-800'}`}>
                              Sales vs Revenue
                            </h3>
                            <ResponsiveContainer width="100%" height={250}>
                              <ScatterChart data={chartsData.salesVsRevenue}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis dataKey="sales" stroke="#64748b" fontSize={12} name="Sales" />
                                <YAxis dataKey="revenue" stroke="#64748b" fontSize={12} name="Revenue" />
                                <Tooltip 
                                  cursor={{ strokeDasharray: '3 3' }}
                                  contentStyle={{ 
                                    backgroundColor: theme.isDark ? '#334155' : '#fff', 
                                    border: '1px solid #e2e8f0', 
                                    borderRadius: '8px',
                                    color: theme.isDark ? '#f1f5f9' : '#0f172a'
                                  }} 
                                />
                                <Scatter name="Customer Count" dataKey="customers" fill="#f59e0b" />
                              </ScatterChart>
                            </ResponsiveContainer>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'correlations' && renderCorrelationHeatmap()}
              {activeTab === 'queries' && renderQueryPanel()}
              {activeTab === 'insights' && renderAIInsightsPanel()}
            </motion.div>
          </div>

          {/* AI Insights Bottom Panel */}
          <div className={`border-t p-6 transition-colors ${
            theme.isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
          }`}>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className={`text-lg font-bold mb-1 ${theme.isDark ? 'text-slate-100' : 'text-slate-800'}`}>
                  AI Assistant
                </h3>
                {isAITyping ? (
                  <div className="flex items-center gap-2 text-slate-500">
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:0.1s]"></div>
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                    <span className="text-sm">AI is analyzing your data...</span>
                  </div>
                ) : (
                  <p className={`text-sm ${theme.isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    {aiInsights.length > 0 
                      ? aiInsights[aiInsights.length - 1]?.description || 'Ready to help with your data analysis. Upload a dataset to get started!'
                      : 'Ready to help with your data analysis. Upload a dataset to get started!'
                    }
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Tour Modal */}
      {renderTour()}

      {/* Global Loading Indicator */}
      {Object.values(isLoading).some(loading => loading) && (
        <div className="fixed bottom-4 right-4 z-40">
          <div className={`px-4 py-2 rounded-lg shadow-lg flex items-center gap-3 ${
            theme.isDark ? 'bg-slate-700 text-slate-200' : 'bg-white text-slate-800'
          }`}>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span className="text-sm font-medium">Processing...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataAnalysisWorkspace;