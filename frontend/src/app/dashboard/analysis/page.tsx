'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Editor from '@monaco-editor/react';
import {
  BarChart3, LineChart, Activity, Database, Play, Upload, FileText, Save,
  Zap, Sparkles, Share, Moon, Sun,
  RefreshCw, TrendingUp, AlertTriangle,
  X, ChevronLeft, ChevronRight, Plus, Trash2,
  Edit3, Copy, PieChart, BarChart, Shuffle,
  Target, Sliders, HelpCircle,
  CheckCircle, XCircle, Eye, Code, Lightbulb, Hash, Brain
} from 'lucide-react';
import { 
  LineChart as RechartsLine, BarChart as RechartsBar, AreaChart as RechartsArea, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Line, Bar, Area, ScatterChart, Scatter, Cell, 
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
  pagination?: {
    page: number;
    pageSize: number;
    totalRows: number;
    totalPages: number;
    total: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
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
  strongCorrelations?: any[];
  correlations?: any[];
}

interface ChartConfig {
  id: string;
  type: 'bar' | 'line' | 'pie' | 'scatter' | 'area' | 'donut' | 'column' | 'heatmap';
  title: string;
  xAxis: string;
  yAxis: string;
  color?: string;
  filters?: Record<string, any>;
  data?: any[];
}

interface QueryHistory {
  id: string;
  query: string;
  type: 'SQL' | 'NLQ';
  timestamp: string;
  executionTime: string;
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
  uploadDate?: string;
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
  type: 'correlation' | 'anomaly' | 'trend' | 'pattern' | 'prediction';
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

// const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zsevvvaakunsspxpplbh.supabase.co';
// const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
// const supabase = createClient(supabaseUrl, supabaseKey); // Uncomment when needed

// Constants
const projects = [
  { id: '1', name: 'AI Optimization' },
  { id: '2', name: 'Sales Analytics' },
  { id: '3', name: 'Customer Insights' }
];

const chartTypes = [
  { id: 'bar', name: 'Bar Chart', icon: BarChart },
  { id: 'line', name: 'Line Chart', icon: LineChart },
  { id: 'pie', name: 'Pie Chart', icon: PieChart },
  { id: 'scatter', name: 'Scatter Plot', icon: Target },
  { id: 'area', name: 'Area Chart', icon: TrendingUp },
  { id: 'donut', name: 'Donut Chart', icon: PieChart },
  { id: 'column', name: 'Column Chart', icon: BarChart },
  { id: 'heatmap', name: 'Heatmap', icon: Sliders }
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

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  override render() {
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
  const router = useRouter();
  // State Management
  const [theme, setTheme] = useState<Theme>({ isDark: false });
  // Using GPT-OSS-120B as the single model
  const [selectedProject, setSelectedProject] = useState('AI Optimization');
  const [activeTab, setActiveTab] = useState('overview');
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [currentFileId, setCurrentFileId] = useState<string | null>(null);
  const [savedSessions, setSavedSessions] = useState<any[]>([]);
  const [showSavedSessions, setShowSavedSessions] = useState(false);
  // Initialize session state from localStorage immediately during component initialization  
  const [isSessionLoaded, setIsSessionLoaded] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('isSessionLoaded') === 'true';
    }
    return false;
  });
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('currentSessionId');
    }
    return null;
  });
  const [zoomedChart, setZoomedChart] = useState<ChartConfig | null>(null);
  
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
  
  // Chart builder form state
  const [chartForm, setChartForm] = useState({
    title: '',
    type: 'bar' as 'bar' | 'line' | 'pie' | 'scatter' | 'area' | 'donut' | 'column' | 'heatmap',
    xAxis: '',
    yAxis: ''
  });
  
  // Queries
  const [sqlQuery, setSqlQuery] = useState('SELECT * FROM dataset LIMIT 10;');
  const [nlqQuery, setNlqQuery] = useState('');
  const [queryResults, setQueryResults] = useState<QueryResult | null>(null);
  const [queryHistory, setQueryHistory] = useState<QueryHistory[]>([]);
  const [savedQueries, setSavedQueries] = useState<QueryHistory[]>([]);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [isQueryValid, setIsQueryValid] = useState(true);
  // Dynamic SQL templates based on actual column metadata
  const sqlTemplates = React.useMemo(() => {
    const numericCols = columnMetadata.filter(col => col.type === 'numeric');
    const categoricalCols = columnMetadata.filter(col => col.type === 'categorical');
    const allCols = columnMetadata;
    
    const templates = [
      { name: 'Basic Select', query: 'SELECT * FROM dataset LIMIT 10;' },
      { name: 'Count Records', query: 'SELECT COUNT(*) as total_records FROM dataset;' },
      { name: 'Data Quality Check', query: `-- Check for null values and data quality
SELECT 
  COUNT(*) as total_rows,
  COUNT(DISTINCT *) as unique_rows,
  ${allCols.map(col => `SUM(CASE WHEN "${col.name}" IS NULL THEN 1 ELSE 0 END) as null_${col.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`).join(',\n  ')}
FROM dataset;` },
      { name: 'Schema Info', query: `-- Get column information
PRAGMA table_info(dataset);` },
    ];
    
    if (categoricalCols.length > 0) {
      const firstCategorical = categoricalCols[0]?.name;
      if (firstCategorical) {
        templates.push({
          name: 'Group & Count',
          query: `SELECT "${firstCategorical}", COUNT(*) as count\nFROM dataset\nGROUP BY "${firstCategorical}"\nORDER BY count DESC;`
        });
      }
    }
    
    if (numericCols.length > 0) {
      const firstNumeric = numericCols[0]?.name;
      if (firstNumeric) {
        templates.push({
          name: 'Statistical Summary',
          query: `-- Statistical analysis for ${firstNumeric}
SELECT 
  COUNT("${firstNumeric}") as count,
  AVG("${firstNumeric}") as mean,
  MIN("${firstNumeric}") as minimum,
  MAX("${firstNumeric}") as maximum,
  STDDEV("${firstNumeric}") as std_deviation,
  PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY "${firstNumeric}") as q1,
  PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY "${firstNumeric}") as median,
  PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY "${firstNumeric}") as q3
FROM dataset
WHERE "${firstNumeric}" IS NOT NULL;`
        });
        templates.push({
          name: 'Outlier Detection',
          query: `-- Detect outliers using IQR method
WITH quartiles AS (
  SELECT 
    PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY "${firstNumeric}") as q1,
    PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY "${firstNumeric}") as q3
  FROM dataset
  WHERE "${firstNumeric}" IS NOT NULL
),
iqr_bounds AS (
  SELECT 
    q1 - 1.5 * (q3 - q1) as lower_bound,
    q3 + 1.5 * (q3 - q1) as upper_bound
  FROM quartiles
)
SELECT *
FROM dataset, iqr_bounds
WHERE "${firstNumeric}" < lower_bound OR "${firstNumeric}" > upper_bound
ORDER BY "${firstNumeric}";`
        });
        templates.push({
          name: 'Top Records',
          query: `SELECT *\nFROM dataset\nORDER BY "${firstNumeric}" DESC\nLIMIT 20;`
        });
      }
    }
    
    // Advanced analysis templates
    if (numericCols.length >= 2) {
      const [firstNum, secondNum] = numericCols.slice(0, 2);
      templates.push({
        name: 'Correlation Analysis',
        query: `-- Correlation and relationship analysis
SELECT 
  CORR("${firstNum.name}", "${secondNum.name}") as correlation_coefficient,
  COUNT(*) as sample_size,
  AVG("${firstNum.name}") as avg_${firstNum.name.toLowerCase().replace(/[^a-z0-9]/g, '_')},
  AVG("${secondNum.name}") as avg_${secondNum.name.toLowerCase().replace(/[^a-z0-9]/g, '_')},
  STDDEV("${firstNum.name}") as std_${firstNum.name.toLowerCase().replace(/[^a-z0-9]/g, '_')},
  STDDEV("${secondNum.name}") as std_${secondNum.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}
FROM dataset
WHERE "${firstNum.name}" IS NOT NULL 
  AND "${secondNum.name}" IS NOT NULL;`
      });
    }
    
    if (categoricalCols.length > 0 && numericCols.length > 0) {
      const catCol = categoricalCols[0];
      const numCol = numericCols[0];
      templates.push({
        name: 'Cross-Tabulation',
        query: `-- Cross-tabulation analysis
SELECT 
  "${catCol.name}",
  COUNT(*) as frequency,
  AVG("${numCol.name}") as avg_${numCol.name.toLowerCase().replace(/[^a-z0-9]/g, '_')},
  MIN("${numCol.name}") as min_${numCol.name.toLowerCase().replace(/[^a-z0-9]/g, '_')},
  MAX("${numCol.name}") as max_${numCol.name.toLowerCase().replace(/[^a-z0-9]/g, '_')},
  STDDEV("${numCol.name}") as std_${numCol.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}
FROM dataset
WHERE "${catCol.name}" IS NOT NULL 
  AND "${numCol.name}" IS NOT NULL
GROUP BY "${catCol.name}"
ORDER BY avg_${numCol.name.toLowerCase().replace(/[^a-z0-9]/g, '_')} DESC;`
      });
    }
    
    if (allCols.length > 0) {
      templates.push({
        name: 'Data Profiling',
        query: `-- Comprehensive data profiling
${allCols.map(col => {
          if (numericCols.some(nc => nc.name === col.name)) {
            return `SELECT '${col.name}' as column_name, 'numeric' as data_type, 
  COUNT(*) as total_count,
  COUNT("${col.name}") as non_null_count,
  COUNT(*) - COUNT("${col.name}") as null_count,
  ROUND((COUNT(*) - COUNT("${col.name}")) * 100.0 / COUNT(*), 2) as null_percentage,
  MIN("${col.name}") as min_value,
  MAX("${col.name}") as max_value,
  ROUND(AVG("${col.name}"), 2) as mean_value
FROM dataset`;
          } else {
            return `SELECT '${col.name}' as column_name, 'categorical' as data_type,
  COUNT(*) as total_count,
  COUNT("${col.name}") as non_null_count,  
  COUNT(*) - COUNT("${col.name}") as null_count,
  ROUND((COUNT(*) - COUNT("${col.name}")) * 100.0 / COUNT(*), 2) as null_percentage,
  COUNT(DISTINCT "${col.name}") as distinct_count,
  NULL as min_value,
  NULL as max_value,
  NULL as mean_value
FROM dataset`;
          }
        }).join('\nUNION ALL\n')};`
      });
      
      const firstCol = allCols[0]?.name;
      if (firstCol) {
        templates.push({
          name: 'Filter & Search',
          query: `SELECT *\nFROM dataset\nWHERE "${firstCol}" IS NOT NULL\nLIMIT 100;`
        });
      }
    }
    
    return templates;
  }, [columnMetadata]);
  
  // AI & Insights
  const [aiInsights, setAiInsights] = useState<AIInsight[]>([]);
  const [anomalyAlerts, setAnomalyAlerts] = useState<AnomalyAlert[]>([]);
  const [isAITyping] = useState(false);

  // Prediction
  const [predictionTarget, setPredictionTarget] = useState<string>('');
  const [predictionType, setPredictionType] = useState<'classification' | 'regression'>('regression');
  const [predictionResults, setPredictionResults] = useState<any>(null);
  
  // UI State
  const [isLoading, setIsLoading] = useState({
    upload: false,
    summary: false,
    charts: false,
    query: false,
    analysis: false,
    cleaning: false,
    saving: false,
    prediction: false,
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

  // Restore session data on component mount (session flags already initialized)
  const hasRestoredRef = useRef(false);
  
  useEffect(() => {
    console.log('🎯 COMPONENT MOUNTED - Session flags:', { isSessionLoaded, currentSessionId });
    
    // Prevent double execution in React Strict Mode
    if (hasRestoredRef.current) {
      console.log('🚫 Session restoration already executed, skipping');
      return;
    }
    
    const restoreSessionData = async () => {
      try {
        // Always try to restore if we have a currentSessionId, regardless of isSessionLoaded flag
        // This ensures session restoration works even if the flag was accidentally cleared
        if (currentSessionId) {
          console.log('🔄 RESTORING SESSION DATA from localStorage:', currentSessionId);
          
          // Try to restore analysis data from localStorage
          const storedAnalysisData = localStorage.getItem('analysisData');
          if (storedAnalysisData) {
            try {
              const parsedData = JSON.parse(storedAnalysisData);
              console.log('📊 RESTORING ANALYSIS DATA:', {
                fileId: parsedData.fileId,
                hasFileInfo: !!parsedData.fileInfo,
                hasDataPreview: !!parsedData.dataPreview,
                hasColumnMetadata: !!parsedData.columnMetadata,
                hasChartsData: !!parsedData.chartsData,
                hasCustomCharts: !!parsedData.customCharts
              });
              
              // First mark session as loaded to prevent data fetching
              console.log('🔒 Marking session as loaded to prevent race conditions');
              setIsSessionLoadedPersistent(true);
              
              // Then restore file data
              if (parsedData.fileId && parsedData.fileInfo) {
                console.log('📁 Restoring file:', parsedData.fileId);
                setCurrentFileId(parsedData.fileId);
                
                // Restore uploaded files
                const restoredFile: UploadedFile = {
                  fileId: parsedData.fileId,
                  name: parsedData.fileInfo.name || 'Restored Session',
                  size: parsedData.fileInfo.size || '0 KB',
                  rows: parsedData.fileInfo.rows || 0,
                  columns: parsedData.fileInfo.columns || 0,
                  status: 'ready' as const,
                  uploadDate: parsedData.fileInfo.uploadDate,
                  metadata: undefined
                };
                setUploadedFiles([restoredFile]);
                console.log('📁 File restored successfully');
              }
              
              // Then restore all analysis data
              if (parsedData.dataPreview) {
                console.log('👁️ Restoring data preview');
                setDataPreview(parsedData.dataPreview);
              }
              if (parsedData.columnMetadata) {
                console.log('📋 Restoring column metadata');
                setColumnMetadata(parsedData.columnMetadata);
              }
              if (parsedData.dataSummary) {
                console.log('📊 Restoring data summary:', parsedData.dataSummary);
                console.log('📊 DataSummary structure check:', {
                  rows: parsedData.dataSummary.rows,
                  columns: parsedData.dataSummary.columns,
                  type: typeof parsedData.dataSummary
                });
                setDataSummary(parsedData.dataSummary);
              }
              if (parsedData.chartsData) {
                console.log('📈 Restoring charts data');
                setChartsData(parsedData.chartsData);
              }
              if (parsedData.correlationData) {
                console.log('🔗 Restoring correlation data');
                setCorrelationData(parsedData.correlationData);
              }
              if (parsedData.aiInsights) {
                console.log('🤖 Restoring AI insights');
                setAiInsights(parsedData.aiInsights);
              }
              if (parsedData.customCharts) {
                console.log('🎨 Restoring custom charts');
                setCustomCharts(parsedData.customCharts);
              }
              
              console.log('✅ SESSION DATA COMPLETELY RESTORED');
              
              // Debug: Check the current state after restoration
              setTimeout(() => {
                console.log('🔍 Current state after restoration:', {
                  dataSummary: dataSummary,
                  dataPreview: dataPreview,
                  columnMetadata: columnMetadata?.length,
                  chartsData: chartsData,
                  currentFileId: currentFileId
                });
              }, 100);
            } catch (error) {
              console.error('❌ Error parsing stored analysis data:', error);
            }
          } else {
            console.log('⚠️ No analysis data found in localStorage - trying to restore from API');
            
            // Try to restore from API as fallback
            try {
              const { analysisSessionService } = await import('@/lib/services/analysis-service');
              const apiSession = await analysisSessionService.getAnalysisSession(currentSessionId);
              if (apiSession.success && apiSession.session) {
                console.log('📡 Restoring session from API:', apiSession.session);
                // Restore the session data from API response
                // (Implementation would depend on your API response structure)
                setIsSessionLoadedPersistent(true);
              }
            } catch (error) {
              console.error('❌ Failed to restore session from API:', error);
            }
          }
        } else {
          console.log('🆕 No active session - starting fresh');
        }
      } catch (error) {
        console.error('❌ Error restoring session data:', error);
      }
    };
    
    // Run immediately
    hasRestoredRef.current = true;
    restoreSessionData();
  }, []); // Run only on component mount

  // Load demo data ONLY if no session exists (with delay to allow session restoration)
  useEffect(() => {
    const loadDemoDataIfNeeded = () => {
      console.log('🎲 Demo loading check:', {
        uploadedFiles: uploadedFiles.length,
        isSessionLoaded,
        currentSessionId: !!currentSessionId,
        shouldLoadDemo: uploadedFiles.length === 0 && !isSessionLoaded && !currentSessionId
      });
      
      if (uploadedFiles.length === 0 && !isSessionLoaded && !currentSessionId) {
        console.log('🎯 Loading user dataset - no session active');
        const userFiles: UploadedFile[] = [
          {
            fileId: 'user_linear_regression_full',
            name: 'Linear Regression - Sheet1.csv',
            rows: 300,
            columns: 2,
            size: '4.87 KB',
            status: 'ready'
          }
        ];
        setUploadedFiles(userFiles);
        setCurrentFileId('user_linear_regression_full');
      } else if (isSessionLoaded || currentSessionId) {
        console.log('🔄 Session is active, skipping demo files initialization');
      }
    };
    
    // Add a longer delay to ensure session restoration completes first
    const timer = setTimeout(loadDemoDataIfNeeded, 500);
    return () => clearTimeout(timer);
  }, [uploadedFiles.length, isSessionLoaded, currentSessionId]);

  useEffect(() => {
    console.log('🔍 Data fetching check:', {
      currentFileId,
      isSessionLoaded,
      shouldFetch: currentFileId && !isSessionLoaded
    });
    
    if (currentFileId && !isSessionLoaded) {
      console.log('🚀 Fetching fresh data for:', currentFileId);
      // For demo files, ensure data is uploaded to backend first
      if (currentFileId.startsWith('demo-')) {
        ensureDemoDataUploaded(currentFileId).then(() => {
          fetchDataPreview(currentFileId);
          fetchColumnMetadata(currentFileId);
          fetchDataSummary(currentFileId);
          fetchChartsData(currentFileId);
          fetchCorrelationData(currentFileId);
          fetchAIInsights(currentFileId);
        });
      } else {
        fetchDataPreview(currentFileId);
        fetchColumnMetadata(currentFileId);
        fetchDataSummary(currentFileId);
        fetchChartsData(currentFileId);
        fetchCorrelationData(currentFileId);
        fetchAIInsights(currentFileId);
      }
    } else if (isSessionLoaded) {
      console.log('🔄 Session loaded - skipping data fetch (using restored data)');
    }
  }, [currentFileId, isSessionLoaded]);

  // Update SQL query when column metadata changes
  useEffect(() => {
    if (columnMetadata.length > 0 && sqlQuery === 'SELECT * FROM dataset LIMIT 10;') {
      // Only update if it's still the default query
      const firstColumns = columnMetadata.slice(0, 5).map(col => `"${col.name}"`).join(', ');
      const newQuery = `SELECT ${firstColumns} FROM dataset LIMIT 10;`;
      setSqlQuery(newQuery);
    }
  }, [columnMetadata]);

  // Session persistence utility functions
  const setCurrentSessionIdPersistent = (sessionId: string | null) => {
    setCurrentSessionId(sessionId);
    if (sessionId) {
      localStorage.setItem('currentSessionId', sessionId);
    } else {
      localStorage.removeItem('currentSessionId');
    }
  };
  
  const setIsSessionLoadedPersistent = (isLoaded: boolean) => {
    setIsSessionLoaded(isLoaded);
    localStorage.setItem('isSessionLoaded', isLoaded.toString());
    if (!isLoaded) {
      // Clear session data when session is unloaded
      localStorage.removeItem('currentSessionId');
    }
  };

  const clearSession = () => {
    console.log('🗑️ Clearing session data');
    setCurrentSessionIdPersistent(null);
    setIsSessionLoadedPersistent(false);
    localStorage.removeItem('analysisData');
    
    // Reset all state to initial values
    setDataPreview(null);
    setColumnMetadata([]);
    setDataSummary(null);
    setChartsData(null);
    setCorrelationData(null);
    setAiInsights([]);
    setCustomCharts([]);
    setCurrentFileId(null);
    setUploadedFiles([]);
    
    console.log('✅ Session cleared successfully');
  };

  // Utility Functions
  const ensureDemoDataUploaded = async (fileId: string): Promise<void> => {
    try {
      // Check if data is already available
      const testResponse = await fetch(`${API_CONFIG.BASE_URL}/column-metadata?fileId=${fileId}`, {
        method: 'GET'
      });
      
      if (testResponse.ok) {
        // Data already exists
        return;
      }
      
      // Upload demo data based on fileId
      const demoFileMap: Record<string, string> = {
        'demo-linear-regression': 'x,y\n1,2.1\n2,4.2\n3,6.1\n4,8.0\n5,9.9\n6,12.1\n7,14.2\n8,16.0\n9,17.9\n10,20.0\n11,21.8\n12,24.2\n13,26.1\n14,27.9\n15,30.1\n16,32.2\n17,34.0\n18,36.1\n19,37.8\n20,40.0',
        'sales-sample-2023': 'Month,Sales,Revenue,Customers\nJan,1250,15000,89\nFeb,1340,16080,92\nMar,1180,14160,85\nApr,1420,17040,98\nMay,1560,18720,105\nJun,1380,16560,94\nJul,1680,20160,112\nAug,1720,20640,118\nSep,1480,17760,101\nOct,1620,19440,109\nNov,1780,21360,125\nDec,1920,23040,134',
        'employee-data-sample': 'Name,Department,Salary,Years_Experience,Age\nJohn Smith,Engineering,75000,5,28\nJane Doe,Marketing,65000,3,26\nBob Johnson,Sales,55000,2,24\nAlice Brown,Engineering,80000,7,31\nCharlie Wilson,HR,60000,4,29'
      };
      
      const csvData = demoFileMap[fileId];
      if (!csvData) {
        console.warn(`No demo data found for fileId: ${fileId}`);
        return;
      }
      
      // Create a blob and upload it
      const blob = new Blob([csvData], { type: 'text/csv' });
      const formData = new FormData();
      formData.append('file', blob, `${fileId}.csv`);
      formData.append('fileId', fileId);
      formData.append('projectId', 'demo-project');
      
      const uploadResponse = await fetch(`${API_CONFIG.BASE_URL}/process-dataset`, {
        method: 'POST',
        body: formData,
      });
      
      if (!uploadResponse.ok) {
        console.error('Failed to upload demo data:', await uploadResponse.text());
      }
      
    } catch (error) {
      console.error('Error ensuring demo data uploaded:', error);
    }
  };

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
      // Replace existing files instead of appending (fresh start for new dataset)
      setUploadedFiles(uploadedFiles);
      
      if (uploadedFiles.length > 0 && uploadedFiles[0]) {
        // Clear session state to ensure fresh data loading
        console.log('🔄 New dataset uploaded - clearing session state');
        setIsSessionLoaded(false);
        setCurrentSessionIdPersistent(null);
        
        // Also clear localStorage to prevent any cached session data
        localStorage.removeItem('analysisData');
        localStorage.removeItem('isSessionLoaded');
        
        // Clear all cached data to force refresh
        setDataPreview(null);
        setColumnMetadata([]);
        setDataSummary(null);
        setChartsData(null);
        setCorrelationData(null);
        setAiInsights([]);
        setCustomCharts([]);
        
        // Set the new file ID (this will trigger data fetching in useEffect)
        setCurrentFileId(uploadedFiles[0].fileId);
        
        console.log('✅ Session cleared, new dataset ready:', uploadedFiles[0].fileId);
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
        const apiData = await response.json();
        // Transform API response to match expected frontend structure
        const transformedData = {
          data: apiData.data || [],
          pagination: apiData.pagination || {},
          columns: apiData.data && apiData.data.length > 0 ? Object.keys(apiData.data[0]).filter(key => key !== '_index') : [],
          rows: apiData.data ? apiData.data.map((row: any) => {
            const { _index, ...rowData } = row;
            return Object.values(rowData);
          }) : [],
          page: apiData.pagination?.page || 1,
          pageSize: apiData.pagination?.pageSize || pageSize,
          totalRows: apiData.pagination?.total || 0
        };
        setDataPreview(transformedData);
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
        // Transform object to array and map properties
        if (data.columns && typeof data.columns === 'object') {
          const columnsArray = Object.values(data.columns).map((col: any) => ({
            name: col.name,
            type: (col.dtype === 'object' ? 'categorical' : 'numeric') as 'numeric' | 'categorical' | 'datetime' | 'boolean' | 'text',
            uniqueCount: col.uniqueCount || 0,
            nullCount: col.nullCount || 0,
            nullPercentage: col.nullPercent || 0,
            samples: col.sampleValues || [],
            mean: col.mean,
            min: col.min,
            max: col.max,
            std: col.std,
            median: col.median,
            mostFrequent: col.topValues && col.topValues[0] ? col.topValues[0].value : null,
            topValues: col.topValues || []
          }));
          setColumnMetadata(columnsArray);
        } else {
          setColumnMetadata([]);
        }
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
        const apiData = await response.json();
        
        // Transform API response to frontend structure
        if (apiData.columnNames && apiData.correlations) {
          const columns = apiData.columnNames;
          const correlationsArray = apiData.correlations;
          
          // Create matrix from correlations array
          const matrix: number[][] = [];
          for (let i = 0; i < columns.length; i++) {
            matrix[i] = [];
            for (let j = 0; j < columns.length; j++) {
              const correlation = correlationsArray.find(
                (corr: any) => corr.x === columns[i] && corr.y === columns[j]
              );
              matrix[i]![j] = correlation?.correlation || 0;
            }
          }
          
          const transformedData = {
            columns,
            matrix,
            strongCorrelations: apiData.strongCorrelations || [],
            correlations: correlationsArray
          };
          
          setCorrelationData(transformedData);
        } else {
          // Fallback for empty correlation data
          setCorrelationData({
            columns: [],
            matrix: [],
            strongCorrelations: [],
            correlations: []
          });
        }
      }
    } catch (error) {
      console.error('Error fetching correlation data:', error);
    }
  };

  const createCustomChart = async (config: ChartConfig) => {
    try {
      if (isSessionLoaded && dataPreview && columnMetadata.length > 0) {
        // For session data, create chart locally using available data
        const xAxisData = dataPreview.columns.find(col => col === config.xAxis);
        const yAxisData = dataPreview.columns.find(col => col === config.yAxis);
        
        if (xAxisData && yAxisData) {
          // Find column indices
          const xIndex = dataPreview.columns.indexOf(config.xAxis);
          const yIndex = dataPreview.columns.indexOf(config.yAxis);
          
          // Generate chart data from preview data
          const chartData = dataPreview.rows.slice(0, 20).map((row, index) => ({
            name: row[xIndex] || `Row ${index + 1}`,
            value: parseFloat(row[yIndex]) || 0,
            x: parseFloat(row[xIndex]) || index,
            y: parseFloat(row[yIndex]) || 0
          })).filter(item => !isNaN(item.value) && !isNaN(item.y));
          
          const newChart: ChartConfig = {
            ...config,
            id: `chart_${Date.now()}`,
            data: chartData
          };
          setCustomCharts(prev => {
            const updatedCharts = [...prev, newChart];
            // Auto-save session when new chart is created
            if (isSessionLoaded) {
              setTimeout(() => autoUpdateSession(updatedCharts), 500);
            }
            return updatedCharts;
          });
          setChartBuilder({ isOpen: false, config: null });
          return;
        }
      }

      // For fresh data or when session data is insufficient, use API
      const response = await fetch(`${API_CONFIG.BASE_URL}/custom-chart`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId: currentFileId,
          type: config.type,
          xAxis: config.xAxis,
          yAxis: config.yAxis,
          title: config.title
        })
      });

      if (response.ok) {
        const chartData = await response.json();
        const newChart: ChartConfig = {
          ...config,
          id: `chart_${Date.now()}`,
          data: chartData.data
        };
        setCustomCharts(prev => {
          const updatedCharts = [...prev, newChart];
          // Auto-save session when new chart is created
          if (isSessionLoaded) {
            setTimeout(() => autoUpdateSession(updatedCharts), 500);
          }
          return updatedCharts;
        });
        setChartBuilder({ isOpen: false, config: null });
      } else {
        console.error('Failed to create custom chart');
        alert('Failed to create custom chart. Please check the server connection.');
      }
    } catch (error) {
      console.error('Error creating custom chart:', error);
      // If API fails, show an error message
      alert('Failed to create custom chart. Please try again.');
    }
  };

  // Parse multiple SQL queries
  const parseMultipleQueries = (sql: string): string[] => {
    // Split by semicolons but ignore semicolons inside quoted strings
    const queries: string[] = [];
    let current = '';
    let inQuotes = false;
    let quoteChar = '';
    
    for (let i = 0; i < sql.length; i++) {
      const char = sql[i];
      const prevChar = sql[i - 1] || '';
      
      if ((char === '"' || char === "'") && prevChar !== '\\') {
        if (!inQuotes) {
          inQuotes = true;
          quoteChar = char;
        } else if (char === quoteChar) {
          inQuotes = false;
          quoteChar = '';
        }
      }
      
      if (char === ';' && !inQuotes) {
        const trimmed = current.trim();
        if (trimmed) {
          queries.push(trimmed);
        }
        current = '';
      } else {
        current += char;
      }
    }
    
    // Add the last query if it doesn't end with semicolon
    const trimmed = current.trim();
    if (trimmed) {
      queries.push(trimmed);
    }
    
    return queries.filter(q => q.length > 0);
  };

  // Query Functions
  const handleRunQuery = async (type: 'sql' | 'nlq') => {
    if (!currentFileId) {
      alert('Please upload a dataset first');
      return;
    }

    setIsLoading(prev => ({ ...prev, query: true }));
    setQueryError(null);

    try {
      const startTime = Date.now();
      const endpoint = type === 'sql' ? 'query-sql' : 'query-nlq';
      
      // Handle multiple SQL queries
      if (type === 'sql') {
        const queries = parseMultipleQueries(sqlQuery);
        
        if (queries.length > 1) {
          // Execute multiple queries sequentially
          const results: any[] = [];
          let totalRows = 0;
          
          for (let i = 0; i < queries.length; i++) {
            const singleQuery = queries[i];
            const body = {
              fileId: currentFileId,
              projectId: selectedProject,
              sql: singleQuery
            };
            
            const response = await fetch(`/api/${endpoint}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(body)
            });
            
            if (response.ok) {
              const data = await response.json();
              results.push({
                queryIndex: i + 1,
                query: singleQuery,
                results: data.results,
                success: true
              });
              totalRows += data.results?.totalRows || 0;
            } else {
              const errorData = await response.json();
              results.push({
                queryIndex: i + 1,
                query: singleQuery,
                error: errorData.error || 'Query execution failed',
                success: false
              });
            }
          }
          
          const executionTime = Date.now() - startTime;
          
          // Combine results for display (show results from last successful query)
          const lastSuccessfulResult = results.reverse().find(r => r.success && r.results);
          if (lastSuccessfulResult) {
            setQueryResults(lastSuccessfulResult.results);
          }
          
          // Create history entry for multiple queries
          const historyEntry: QueryHistory = {
            id: `query_${Date.now()}`,
            query: `Multiple Queries (${queries.length})`,
            type: 'SQL',
            timestamp: new Date().toISOString(),
            executionTime: executionTime.toString(),
            favorite: false,
            results: lastSuccessfulResult?.results
          };
          
          setQueryHistory(prev => [historyEntry, ...prev.slice(0, 49)]);
          
          // Show summary of multiple query execution
          const successCount = results.filter(r => r.success).length;
          const failCount = results.length - successCount;
          
          if (failCount > 0) {
            setQueryError(`Executed ${results.length} queries: ${successCount} succeeded, ${failCount} failed`);
          }
          
          return;
        }
      }
      
      // Single query execution
      const body = {
        fileId: currentFileId,
        projectId: selectedProject,
        ...(type === 'sql' 
          ? { sql: sqlQuery } 
          : { question: nlqQuery }
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
          executionTime: executionTime.toString(),
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

  // SQL Formatting Function
  const formatSQLQuery = (sql: string): string => {
    if (!sql.trim()) return sql;
    
    return sql
      // Add line breaks before major keywords
      .replace(/(\s+)(SELECT|FROM|WHERE|GROUP BY|HAVING|ORDER BY|LIMIT|JOIN|INNER JOIN|LEFT JOIN|RIGHT JOIN|FULL JOIN)/gi, '\n$2')
      // Add line breaks after commas in SELECT
      .replace(/,\s*(?=\w)/g, ',\n  ')
      // Indent clauses
      .split('\n')
      .map((line, index) => {
        const trimmed = line.trim();
        if (index === 0 || /^(SELECT|FROM|WHERE|GROUP BY|HAVING|ORDER BY|LIMIT|JOIN|INNER JOIN|LEFT JOIN|RIGHT JOIN|FULL JOIN)/i.test(trimmed)) {
          return trimmed;
        }
        return '  ' + trimmed;
      })
      .join('\n')
      // Clean up extra spaces
      .replace(/\n\s*\n/g, '\n')
      .trim();
  };

  const handleFormatQuery = () => {
    const formatted = formatSQLQuery(sqlQuery);
    setSqlQuery(formatted);
  };

  const handleSaveQuery = async () => {
    if (!sqlQuery.trim()) return;
    
    const queryToSave: QueryHistory = {
      id: `saved_${Date.now()}`,
      query: sqlQuery,
      type: 'SQL',
      timestamp: new Date().toISOString(),
      executionTime: '0',
      favorite: true
    };
    
    if (queryResults) {
      queryToSave.results = queryResults;
    }
    
    setSavedQueries(prev => [queryToSave, ...prev]);
    
    // Show success notification (you can replace with your toast system)
    alert('Query saved successfully!');
  };

  const loadTemplate = (template: typeof sqlTemplates[0]) => {
    setSqlQuery(template.query);
    setQueryError(null);
  };

  // Basic SQL validation
  const validateSQL = (sql: string): { isValid: boolean; error?: string } => {
    if (!sql.trim()) {
      return { isValid: false, error: 'Query cannot be empty' };
    }

    const trimmedSQL = sql.trim().toLowerCase();
    
    // Check for basic SQL structure
    if (!trimmedSQL.startsWith('select') && 
        !trimmedSQL.startsWith('with') &&
        !trimmedSQL.startsWith('show') &&
        !trimmedSQL.startsWith('describe') &&
        !trimmedSQL.startsWith('explain')) {
      return { isValid: false, error: 'Query must start with SELECT, WITH, SHOW, DESCRIBE, or EXPLAIN' };
    }

    // Check for potentially dangerous operations
    const dangerousKeywords = ['drop', 'delete', 'insert', 'update', 'alter', 'create', 'truncate'];
    for (const keyword of dangerousKeywords) {
      if (trimmedSQL.includes(keyword)) {
        return { isValid: false, error: `${keyword.toUpperCase()} operations are not allowed` };
      }
    }

    // Check for basic syntax issues
    const selectCount = (sql.match(/\bselect\b/gi) || []).length;
    const fromCount = (sql.match(/\bfrom\b/gi) || []).length;
    
    if (selectCount > fromCount && !trimmedSQL.includes('union')) {
      return { isValid: false, error: 'Missing FROM clause or syntax error' };
    }

    // Check for unmatched parentheses
    const openParens = (sql.match(/\(/g) || []).length;
    const closeParens = (sql.match(/\)/g) || []).length;
    if (openParens !== closeParens) {
      return { isValid: false, error: 'Unmatched parentheses' };
    }

    return { isValid: true };
  };

  // Validate query on change
  const handleSQLChange = (value: string | undefined) => {
    const newValue = value || '';
    setSqlQuery(newValue);
    
    if (newValue.trim()) {
      const validation = validateSQL(newValue);
      setIsQueryValid(validation.isValid);
      setQueryError(validation.error || null);
    } else {
      setIsQueryValid(true);
      setQueryError(null);
    }
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

  // Prediction Functions
  const handleGeneratePredictions = async () => {
    if (!currentFileId || !predictionTarget) {
      alert('Please select a dataset and target column for prediction');
      return;
    }

    setIsLoading(prev => ({ ...prev, prediction: true }));
    setPredictionResults(null);

    try {
      const response = await fetchWithRetry(`${API_CONFIG.BASE_URL}/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId: currentFileId,
          targetColumn: predictionTarget,
          type: predictionType
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setPredictionResults(data);
        
        // Add prediction insight to AI insights
        const predictionInsight: AIInsight = {
          type: 'prediction',
          title: `${predictionType === 'regression' ? 'Regression' : 'Classification'} Model Results`,
          description: `Model achieved ${predictionType === 'regression' 
            ? `R² score of ${(data.model_performance.r2_score * 100).toFixed(1)}%` 
            : `${(data.model_performance.accuracy * 100).toFixed(1)}% accuracy`} on test data.`,
          confidence: predictionType === 'regression' ? data.model_performance.r2_score : data.model_performance.accuracy,
          data: data,
          timestamp: new Date().toISOString()
        };
        setAiInsights(prev => [predictionInsight, ...prev]);
        
      } else {
        const errorData = await response.json();
        // Handle detailed error responses
        if (errorData.detail && typeof errorData.detail === 'object') {
          const detail = errorData.detail;
          alert(
            `Prediction Error:\n\n` +
            `${detail.message || detail.error || 'Unknown error'}\n\n` +
            (detail.action ? `Action: ${detail.action}\n` : '') +
            (detail.fileName ? `File: ${detail.fileName}\n` : '') +
            (response.status === 410 ? '\n⚠️ Please re-upload your dataset to continue.' : '')
          );
        } else if (typeof errorData.detail === 'string') {
          // Parse nested detail string if it contains JSON
          try {
            const match = errorData.detail.match(/\{[^}]+\}/);
            if (match) {
              const parsed = JSON.parse(match[0]);
              alert(`Prediction Error:\n\n${parsed.message || parsed.error || errorData.detail}`);
            } else {
              alert(`Prediction failed: ${errorData.detail}`);
            }
          } catch {
            alert(`Prediction failed: ${errorData.detail}`);
          }
        } else {
          alert(`Prediction failed: ${errorData.error || 'Unknown error'}`);
        }
      }
    } catch (error) {
      console.error('Error generating predictions:', error);
      alert('Failed to generate predictions. Please check that:\n\n1. Dataset is uploaded and loaded\n2. Target column contains numeric values\n3. Backend server is running\n\nThen try again.');
    } finally {
      setIsLoading(prev => ({ ...prev, prediction: false }));
    }
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

  const collectAnalysisData = () => {
    const currentFile = uploadedFiles.find(f => f.fileId === currentFileId);
    
    console.log('🔍 Collecting analysis data...');
    console.log('🔍 customCharts state:', customCharts);
    console.log('🔍 customCharts length:', customCharts?.length);
    
    const analysisData = {
      fileInfo: currentFile ? {
        name: currentFile.name,
        size: currentFile.size,
        rows: currentFile.rows,
        columns: currentFile.columns,
        uploadDate: new Date().toLocaleDateString()
      } : undefined,
      dataSummary,
      columnMetadata,
      dataPreview,
      chartsData,
      correlationData,
      queryHistory,
      aiInsights,
      customCharts
    };
    
    console.log('🔍 Final analysis data:', analysisData);
    console.log('🔍 Custom charts in final data:', analysisData.customCharts);

    return analysisData;
  };

  // Auto-update session when changes are made
  const autoUpdateSession = async (updatedCustomCharts?: ChartConfig[]) => {
    if (!currentFileId || !isSessionLoaded || !currentSessionId) {
      console.log('🚫 Skipping auto-update: missing requirements', {
        currentFileId: !!currentFileId,
        isSessionLoaded,
        currentSessionId: !!currentSessionId
      });
      return;
    }

    try {
      // Dynamic import to avoid build issues
      const { formatAnalysisSessionData, analysisSessionService } = await import('@/lib/services/analysis-service');
      
      // Use updated charts if provided, otherwise use current state
      const chartsToUse = updatedCustomCharts || customCharts;
      
      let result;
      
      if (currentSessionId) {
        // Update existing session
        console.log('Updating existing session:', currentSessionId);
        // Prepare update data, filtering out null values and ensuring proper format
        const updateData: any = {};
        
        if (dataSummary) updateData.data_summary = dataSummary;
        if (columnMetadata && columnMetadata.length > 0) updateData.column_metadata = columnMetadata;
        if (dataPreview) updateData.data_preview = dataPreview;
        if (chartsData) updateData.charts_data = chartsData;
        if (correlationData) updateData.correlation_data = correlationData;
        
        // Ensure query history has proper format
        if (queryHistory && queryHistory.length > 0) {
          updateData.query_history = queryHistory.map(q => ({
            query: q.query,
            type: q.type,
            timestamp: q.timestamp,
            executionTime: q.executionTime,
            results: q.results
          }));
        }
        
        // Ensure AI insights have proper format
        if (aiInsights && aiInsights.length > 0) {
          updateData.ai_insights = aiInsights.map(insight => ({
            title: insight.title,
            description: insight.description,
            type: insight.type,
            confidence: insight.confidence,
            timestamp: insight.timestamp,
            data: insight.data
          }));
        }
        
        // Ensure custom charts have proper format with field name mapping
        if (chartsToUse && chartsToUse.length > 0) {
          // Filter out charts without required fields and fix missing fields
          const validCharts = chartsToUse
            .filter(chart => chart && chart.id && chart.title && chart.type)
            .map(chart => {
              const chartAny = chart as any; // Handle different field name formats
              return {
                id: chart.id,
                title: chart.title,
                type: chart.type,
                xAxis: chart.xAxis || chartAny.x_axis || 'defaultX', // Handle both camelCase and snake_case
                yAxis: chart.yAxis || chartAny.y_axis || 'defaultY', // Handle both camelCase and snake_case
                data: chart.data || []
              };
            });
          
          if (validCharts.length > 0) {
            updateData.custom_charts = validCharts;
          }
        }
        
        // Only proceed if there's data to update
        const hasDataToUpdate = Object.keys(updateData).length > 0;
        if (!hasDataToUpdate) {
          console.log('🚫 No data to update, skipping auto-save');
          return;
        }
        
        console.log('📦 Update data being sent:', JSON.stringify(updateData, null, 2));
        result = await analysisSessionService.updateAnalysisSession(currentSessionId, updateData);
      } else {
        // Create new session if no current session exists
        console.log('Creating new auto-save session (no current session ID)');
        const sessionData = formatAnalysisSessionData(
          currentFileId,
          uploadedFiles,
          dataSummary,
          columnMetadata,
          dataPreview,
          chartsData,
          correlationData,
          queryHistory,
          aiInsights,
          chartsToUse,
          {
            title: `Analysis Session - ${new Date().toLocaleString()}`,
            tags: ['data-analysis', 'auto-updated'],
            is_public: false,
          }
        );
        
        result = await analysisSessionService.saveAnalysisSession(sessionData);
        
        // Store the new session ID
        if (result.success && result.sessionId) {
          setCurrentSessionIdPersistent(result.sessionId);
        }
      }
      
      if (result.success) {
        console.log('✅ Session auto-updated successfully');
        
        // Also update localStorage with current analysis data for persistence
        const analysisData = {
          fileId: currentFileId,
          fileInfo: uploadedFiles.find(f => f.fileId === currentFileId),
          dataPreview,
          columnMetadata,
          dataSummary,
          chartsData,
          correlationData,
          aiInsights,
          customCharts: chartsToUse
        };
        localStorage.setItem('analysisData', JSON.stringify(analysisData));
        console.log('📦 localStorage updated with current analysis data');
      } else {
        console.error('❌ Session auto-update failed:', result.error);
        // Show user notification for auto-update failures
        const errorDiv = document.createElement('div');
        errorDiv.className = 'fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
        errorDiv.innerHTML = `Auto-save failed: ${result.error}`;
        document.body.appendChild(errorDiv);
        
        setTimeout(() => {
          if (document.body.contains(errorDiv)) {
            document.body.removeChild(errorDiv);
          }
        }, 5000);
      }
    } catch (error) {
      console.error('💥 Error auto-updating session:', error);
      
      // Show user notification for auto-update errors
      const errorDiv = document.createElement('div');
      errorDiv.className = 'fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
      errorDiv.innerHTML = `Auto-save error: ${error instanceof Error ? error.message : 'Unknown error'}`;
      document.body.appendChild(errorDiv);
      
      setTimeout(() => {
        if (document.body.contains(errorDiv)) {
          document.body.removeChild(errorDiv);
        }
      }, 5000);
    }
  };

  // Save Analysis Session Function
  const saveAnalysisSession = async () => {
    if (!currentFileId) {
      alert('No dataset selected to save');
      return;
    }

    setIsLoading(prev => ({ ...prev, saving: true }));
    
    try {
      console.log('Starting to save analysis session...');
      
      // Dynamic import to avoid build issues
      const { analysisSessionService, formatAnalysisSessionData } = await import('@/lib/services/analysis-service');
      
      // Collect all current analysis data
      const sessionData = formatAnalysisSessionData(
        currentFileId,
        uploadedFiles,
        dataSummary,
        columnMetadata,
        dataPreview,
        chartsData,
        correlationData,
        queryHistory,
        aiInsights,
        customCharts,
        {
          title: `Analysis Session - ${new Date().toLocaleString()}`,
          tags: ['data-analysis', 'saved-session'],
          is_public: false,
        }
      );

      console.log('Session data formatted:', sessionData);
      
      // Save to MongoDB via API
      const result = await analysisSessionService.saveAnalysisSession(sessionData);
      
      if (result.success) {
        console.log('Analysis session saved successfully:', result.sessionId);
        
        // Store the session ID for future updates
        if (result.sessionId) {
          setCurrentSessionIdPersistent(result.sessionId);
          console.log('Set current session ID:', result.sessionId);
        }
        
        // Show success message
        const successDiv = document.createElement('div');
        successDiv.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2';
        successDiv.innerHTML = `
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
          </svg>
          Analysis session saved successfully!
        `;
        document.body.appendChild(successDiv);
        
        // Remove success message after 3 seconds
        setTimeout(() => {
          if (document.body.contains(successDiv)) {
            document.body.removeChild(successDiv);
          }
        }, 3000);
        
      } else {
        const errorMessage = typeof result.error === 'object' 
          ? JSON.stringify(result.error, null, 2) 
          : result.error;
        console.error('Failed to save analysis session:', result.error);
        alert(`Failed to save analysis session: ${errorMessage}`);
      }
    } catch (error) {
      console.error('Error saving analysis session:', error);
      alert(`Error saving analysis session: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(prev => ({ ...prev, saving: false }));
    }
  };

  // Load Saved Sessions Function
  const loadSavedSessions = async () => {
    try {
      console.log('Loading saved analysis sessions...');
      
      // Dynamic import to avoid build issues
      const { analysisSessionService } = await import('@/lib/services/analysis-service');
      
      const result = await analysisSessionService.getUserAnalysisSessions(10, 0);
      
      if (result.success && result.sessions) {
        setSavedSessions(result.sessions);
        console.log('Loaded saved sessions:', result.sessions);
      } else {
        console.error('Failed to load saved sessions:', result.error);
      }
    } catch (error) {
      console.error('Error loading saved sessions:', error);
    }
  };

  // Restore Analysis Session Function
  const restoreAnalysisSession = async (sessionId: string) => {
    try {
      // Validate sessionId
      if (!sessionId || sessionId === 'undefined' || sessionId === 'null') {
        throw new Error('Invalid session ID provided');
      }

      console.log('Restoring analysis session:', sessionId);
      setIsLoading(prev => ({ ...prev, analysis: true }));
      
      // Dynamic import to avoid build issues
      const { analysisSessionService } = await import('@/lib/services/analysis-service');
      
      const result = await analysisSessionService.getAnalysisSession(sessionId);
      
      if (result.success && result.session) {
        const session = result.session;
        
        // Restore all the analysis state with proper type conversion
        setCurrentFileId(session.dataset_id);
        setDataSummary(session.data_summary as DataSummary | null);
        setColumnMetadata((session.column_metadata || []) as ColumnMetadata[]);
        
        // Convert data preview with proper type structure
        if (session.data_preview) {
          const preview: DataPreview = {
            columns: session.data_preview.columns || [],
            rows: session.data_preview.rows || [],
            totalRows: (session.data_preview as any).totalRows || session.data_preview.rows?.length || 0,
            page: (session.data_preview as any).page || 1,
            pageSize: (session.data_preview as any).pageSize || 10,
            ...(session.data_preview.pagination && { pagination: session.data_preview.pagination as any })
          };
          setDataPreview(preview);
        }
        
        setChartsData(session.charts_data as ChartsData | null);
        setCorrelationData(session.correlation_data as CorrelationData | null);
        
        // Convert query history with proper type structure
        const queryHistory: QueryHistory[] = (session.query_history || []).map((q: any, index: number) => ({
          id: q.id || `query-${index}`,
          query: q.query,
          type: q.type,
          timestamp: q.timestamp,
          executionTime: q.executionTime?.toString() || '0',
          favorite: q.favorite || false,
          results: q.results
        }));
        setQueryHistory(queryHistory);
        
        // Convert AI insights with proper type structure
        const aiInsights: AIInsight[] = (session.ai_insights || []).map((insight: any) => ({
          type: (insight.type === 'correlation' || insight.type === 'anomaly' || insight.type === 'trend' || insight.type === 'pattern') 
                ? insight.type : 'pattern' as const,
          title: insight.title,
          description: insight.description,
          confidence: insight.confidence,
          data: insight.data,
          timestamp: insight.timestamp
        }));
        setAiInsights(aiInsights);
        
        // Convert custom charts with proper type structure and field name mapping
        const customCharts: ChartConfig[] = (session.custom_charts || []).map((chart: any) => ({
          id: chart.id,
          title: chart.title,
          type: (['bar', 'line', 'pie', 'scatter', 'area', 'donut', 'column', 'heatmap'].includes(chart.type)) 
                ? chart.type : 'bar' as const,
          xAxis: chart.xAxis || chart.x_axis || 'X-Axis', // Handle both camelCase and snake_case
          yAxis: chart.yAxis || chart.y_axis || 'Y-Axis', // Handle both camelCase and snake_case
          color: chart.color,
          filters: chart.filters,
          data: chart.data
        }));
        setCustomCharts(customCharts);
        
        // Add restored file to uploaded files if not already present
        if (session.file_info && !uploadedFiles.find(f => f.fileId === session.dataset_id)) {
          const restoredFile: UploadedFile = {
            fileId: session.dataset_id,
            name: session.file_info.name,
            size: session.file_info.size,
            rows: session.file_info.rows,
            columns: session.file_info.columns,
            status: 'ready',
            uploadDate: session.file_info.uploadDate,
            metadata: undefined
          };
          setUploadedFiles(prev => [restoredFile, ...prev]);
        }
        
        // Mark that data is loaded from session to prevent API calls
        setIsSessionLoadedPersistent(true);
        
        // Set the current session ID for future updates
        setCurrentSessionIdPersistent(sessionId);
        
        // Close saved sessions modal
        setShowSavedSessions(false);
        
        // Show success message
        const successDiv = document.createElement('div');
        successDiv.className = 'fixed top-4 right-4 bg-blue-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2';
        successDiv.innerHTML = `
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path>
          </svg>
          Analysis session restored successfully!
        `;
        document.body.appendChild(successDiv);
        
        setTimeout(() => {
          if (document.body.contains(successDiv)) {
            document.body.removeChild(successDiv);
          }
        }, 3000);
        
        console.log('Analysis session restored successfully');
        
      } else {
        console.error('Failed to restore analysis session:', result.error);
        alert(`Failed to restore analysis session: ${result.error}`);
      }
    } catch (error) {
      console.error('Error restoring analysis session:', error);
      alert(`Error restoring analysis session: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(prev => ({ ...prev, analysis: false }));
    }
  };

  // Load saved sessions on component mount
  useEffect(() => {
    loadSavedSessions();
  }, []);

  const navigateToPreview = (sessionId?: string) => {
    if (!sessionId && !currentFileId) {
      alert('No dataset or session selected for export');
      return;
    }

    console.log('Navigating to preview page...');
    
    if (sessionId) {
      // Navigate with session ID - let export preview load the session data
      const url = `/dashboard/analysis/export-preview?sessionId=${sessionId}`;
      console.log('Navigation URL (with session ID):', url);
      router.push(url);
      return;
    }

    // Collect current analysis data
    const analysisData = collectAnalysisData();
    console.log('Analysis data collected:', analysisData);
    
    // Ensure we have at least basic file info even if APIs failed
    if (!analysisData.fileInfo && currentFileId) {
      const currentFile = uploadedFiles.find(f => f.fileId === currentFileId);
      if (currentFile) {
        analysisData.fileInfo = {
          name: currentFile.name,
          size: currentFile.size,
          rows: currentFile.rows || 0,
          columns: currentFile.columns || 0,
          uploadDate: new Date().toLocaleDateString()
        };
      }
    }
    
    // Store in localStorage as fallback
    localStorage.setItem('analysisData', JSON.stringify(analysisData));
    
    // Navigate to preview page with Base64 encoded data (safer than URI encoding)
    try {
      const dataString = JSON.stringify(analysisData);
      const encodedData = btoa(dataString); // Base64 encoding
      const url = `/dashboard/analysis/export-preview?data=${encodedData}`;
      console.log('Navigation URL (with data):', url.substring(0, 100) + '...');
      router.push(url);
    } catch (error) {
      console.error('Error encoding data for navigation:', error);
      // Fallback to just localStorage
      router.push('/dashboard/analysis/export-preview');
    }
  };

  const exportDataset = async (format: 'csv' | 'xlsx' | 'json' | 'pdf') => {
    if (!currentFileId) return;

    if (format === 'pdf') {
      // Use current session ID if available, otherwise pass undefined
      navigateToPreview(currentSessionId || undefined);
      return;
    }

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
            {uploadedFiles?.map((file) => (
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
                      onClick={() => {
                        console.log('🔄 Switching to different dataset:', file.fileId);
                        // Clear session state to ensure fresh data loading for the selected dataset
                        setIsSessionLoaded(false);
                        setCurrentSessionIdPersistent(null);
                        localStorage.removeItem('analysisData');
                        setCurrentFileId(file.fileId);
                      }}
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
                  <span>Showing {Math.min(dataPreview.pagination?.pageSize || 0, dataPreview.pagination?.total || 0)} of {(dataPreview.pagination?.total || 0).toLocaleString()} rows</span>
                </div>
              </div>
            </div>
            <div className="overflow-auto max-h-96">
              <table className="w-full">
                <thead className="bg-slate-50 sticky top-0">
                  <tr>
                    {dataPreview?.columns?.map((column, index) => (
                      <th key={index} className="px-4 py-3 text-left text-sm font-semibold text-slate-700 border-b border-slate-200">
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {dataPreview?.rows?.map((row, rowIndex) => (
                    <tr key={rowIndex} className="hover:bg-slate-50">
                      {row?.map((cell, cellIndex) => (
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
                onClick={() => fetchDataPreview(currentFileId!, Math.max(1, (dataPreview.pagination?.page || 1) - 1))}
                disabled={(dataPreview.pagination?.page || 1) <= 1}
                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>
              <span className="text-sm text-slate-600">Page {dataPreview.pagination?.page || 1}</span>
              <button
                onClick={() => fetchDataPreview(currentFileId!, (dataPreview.pagination?.page || 1) + 1)}
                disabled={!dataPreview.pagination?.hasNext}
                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Column Metadata */}
        {Array.isArray(columnMetadata) && columnMetadata.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50">
              <h3 className="font-semibold text-slate-800">Column Metadata</h3>
            </div>
            <div className="divide-y divide-slate-200">
              {Array.isArray(columnMetadata) ? columnMetadata.map((column, index) => (
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
                      <span className="ml-2 font-medium">{(column.uniqueCount || 0).toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Nulls:</span>
                      <span className="ml-2 font-medium">{(column.nullPercentage || 0).toFixed(1)}%</span>
                    </div>
                    {column.type === 'numeric' && (
                      <>
                        <div>
                          <span className="text-slate-500">Mean:</span>
                          <span className="ml-2 font-medium">{column.mean?.toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Range:</span>
                          <span className="ml-2 font-medium">
                            {column.min !== undefined && column.max !== undefined 
                              ? `${column.min} - ${column.max}` 
                              : 'N/A'}
                          </span>
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
                        {column.samples?.slice(0, 5).map((sample, sampleIndex) => (
                          <span key={sampleIndex} className="px-2 py-1 bg-slate-100 rounded text-xs">
                            {sample === null || sample === undefined ? 'null' : String(sample)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )) : null}
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
              {datasetVersions?.map((version) => (
                <div key={version.id} className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-slate-800">{version.name}</h4>
                    <span className="text-xs text-slate-500">
                      {new Date(version.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {version.changes?.map((change, changeIndex) => (
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
              {transformationRules?.map((rule) => (
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
        {Array.isArray(columnMetadata) && columnMetadata.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Data Type Inference</h3>
            <div className="space-y-3">
              {Array.isArray(columnMetadata) ? columnMetadata.map((column, index) => (
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
              )) : null}
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
              {cleaningLogs?.map((log) => (
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
    if (!correlationData || !correlationData.columns || correlationData.columns.length === 0) {
      return (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Correlation Heatmap</h3>
          <div className="text-center py-8 text-slate-500">
            <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>Correlation data not available or no numerical columns found</p>
          </div>
        </div>
      );
    }

    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Correlation Heatmap</h3>
        <div className="overflow-auto">
          <div className="min-w-max">
            <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${(correlationData?.columns?.length || 0) + 1}, minmax(80px, 1fr))` }}>
              <div></div>
              {correlationData?.columns?.map((col) => (
                <div key={col} className="p-2 text-xs font-medium text-slate-600 text-center">
                  {col.length > 10 ? col.substring(0, 10) + '...' : col}
                </div>
              ))}
              {(correlationData.matrix || []).map((row, rowIndex) => (
                <React.Fragment key={rowIndex}>
                  <div className="p-2 text-xs font-medium text-slate-600">
                    {correlationData.columns[rowIndex] && correlationData.columns[rowIndex].length > 10 ? 
                      correlationData.columns[rowIndex].substring(0, 10) + '...' : 
                      correlationData.columns[rowIndex] || ''}
                  </div>
                  {row?.map((cell, colIndex) => {
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

  const renderCustomChart = (chart: ChartConfig) => {
    if (!chart.data || chart.data.length === 0) {
      return (
        <div className="h-full bg-slate-100 rounded flex items-center justify-center text-slate-500 text-sm">
          No data available
        </div>
      );
    }

    const commonProps = {
      width: "100%",
      height: 160,
      data: chart.data,
      margin: { top: 5, right: 5, left: 5, bottom: 5 }
    };

    switch (chart.type) {
      case 'bar':
      case 'column':
        return (
          <ResponsiveContainer {...commonProps}>
            <RechartsBar data={chart.data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 10, fill: '#64748b' }}
                interval={0}
                angle={-45}
                textAnchor="end"
                height={40}
                stroke="#94a3b8"
              />
              <YAxis tick={{ fontSize: 10, fill: '#64748b' }} stroke="#94a3b8" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1e293b', 
                  border: 'none', 
                  borderRadius: '8px', 
                  color: 'white',
                  fontSize: '12px'
                }}
              />
              <Bar 
                dataKey="value" 
                fill="#3b82f6" 
                radius={[2, 2, 0, 0]}
                stroke="#2563eb"
                strokeWidth={1}
              />
            </RechartsBar>
          </ResponsiveContainer>
        );

      case 'line':
        return (
          <ResponsiveContainer {...commonProps}>
            <RechartsLine data={chart.data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis 
                dataKey="x" 
                tick={{ fontSize: 10, fill: '#64748b' }} 
                stroke="#94a3b8"
              />
              <YAxis 
                tick={{ fontSize: 10, fill: '#64748b' }} 
                stroke="#94a3b8"
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1e293b', 
                  border: 'none', 
                  borderRadius: '8px', 
                  color: 'white',
                  fontSize: '12px'
                }}
              />
              <Line 
                type="monotone" 
                dataKey="y" 
                stroke="#10b981" 
                strokeWidth={3} 
                dot={{ r: 4, fill: '#10b981', stroke: '#065f46', strokeWidth: 2 }}
                activeDot={{ r: 6, fill: '#34d399' }}
              />
            </RechartsLine>
          </ResponsiveContainer>
        );

      case 'pie':
        const professionalColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16', '#f97316'];
        return (
          <ResponsiveContainer {...commonProps}>
            <RechartsPie>
              <Pie
                data={chart.data}
                cx="50%"
                cy="50%"
                outerRadius={60}
                dataKey="value"
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
                fontSize={10}
                stroke="#ffffff"
                strokeWidth={2}
              >
                {chart.data?.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.fill || professionalColors[index % professionalColors.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: 'none',
                  borderRadius: '8px',
                  color: 'white',
                  fontSize: '12px'
                }}
                itemStyle={{ color: 'white' }}
              />
            </RechartsPie>
          </ResponsiveContainer>
        );

      case 'scatter':
        return (
          <ResponsiveContainer {...commonProps}>
            <ScatterChart data={chart.data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis 
                dataKey="x" 
                tick={{ fontSize: 10, fill: '#64748b' }} 
                stroke="#94a3b8"
              />
              <YAxis 
                dataKey="y" 
                tick={{ fontSize: 10, fill: '#64748b' }} 
                stroke="#94a3b8"
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1e293b', 
                  border: 'none', 
                  borderRadius: '8px', 
                  color: 'white',
                  fontSize: '12px'
                }}
              />
              <Scatter 
                dataKey="y" 
                fill="#8b5cf6" 
                stroke="#7c3aed"
                strokeWidth={2}
                shape="circle"
                r={4}
              />
            </ScatterChart>
          </ResponsiveContainer>
        );

      case 'area':
        return (
          <ResponsiveContainer {...commonProps}>
            <RechartsArea data={chart.data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis 
                dataKey="x" 
                tick={{ fontSize: 10, fill: '#64748b' }} 
                stroke="#94a3b8"
              />
              <YAxis 
                tick={{ fontSize: 10, fill: '#64748b' }} 
                stroke="#94a3b8"
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1e293b', 
                  border: 'none', 
                  borderRadius: '8px', 
                  color: 'white',
                  fontSize: '12px'
                }}
              />
              <Area 
                type="monotone" 
                dataKey="y" 
                stroke="#06b6d4" 
                strokeWidth={2}
                fill="#06b6d4"
                fillOpacity={0.3}
                dot={{ r: 3, fill: '#06b6d4', stroke: '#0891b2', strokeWidth: 2 }}
              />
            </RechartsArea>
          </ResponsiveContainer>
        );

      case 'donut':
        const donutColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
        return (
          <ResponsiveContainer {...commonProps}>
            <RechartsPie>
              <Pie
                data={chart.data}
                cx="50%"
                cy="50%"
                innerRadius={25}
                outerRadius={60}
                dataKey="value"
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
                fontSize={9}
                stroke="#ffffff"
                strokeWidth={2}
              >
                {chart.data?.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.fill || donutColors[index % donutColors.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: 'none',
                  borderRadius: '8px',
                  color: 'white',
                  fontSize: '12px'
                }}
                itemStyle={{ color: 'white' }}
              />
            </RechartsPie>
          </ResponsiveContainer>
        );

      case 'heatmap':
        // Simple heatmap representation using bars with color gradient
        return (
          <div className="h-full flex items-center justify-center">
            <div className="grid grid-cols-5 gap-1 p-2">
              {chart.data?.slice(0, 25).map((item, index) => (
                <div
                  key={index}
                  className="w-4 h-4 rounded-sm"
                  style={{
                    backgroundColor: `rgba(59, 130, 246, ${Math.min(1, (item.value || 0) / Math.max(...(chart.data?.map(d => d.value || 0) || [1])))})`,
                    border: '1px solid #e2e8f0'
                  }}
                  title={`${item.name}: ${item.value}`}
                />
              ))}
            </div>
          </div>
        );

      default:
        return (
          <div className="h-full bg-slate-100 rounded flex items-center justify-center text-slate-500 text-sm">
            Unsupported chart type
          </div>
        );
    }
  };

  const renderInteractiveChartBuilder = () => (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-800">Interactive Chart Builder</h3>
        <button
          onClick={() => {
            setChartBuilder({ isOpen: true, config: null });
            // Reset form when opening
            setChartForm({
              title: '',
              type: 'bar',
              xAxis: '',
              yAxis: ''
            });
          }}
          className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
        >
          <Plus className="w-4 h-4" />
          Create Chart
        </button>
      </div>
      
      {customCharts && customCharts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {customCharts?.map((chart) => (
            <div key={chart.id} className="bg-slate-50 rounded-lg border border-slate-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-slate-800">{chart.title}</h4>
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => setZoomedChart(chart)}
                    className="p-1 text-slate-400 hover:text-blue-600 transition-colors"
                    title="Zoom chart"
                  >
                    <Activity className="w-4 h-4" />
                  </button>
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
              <div className="h-40">
                {renderCustomChart(chart)}
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
                    value={chartForm.title}
                    onChange={(e) => setChartForm(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900"
                    placeholder="Enter chart title"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Chart Type</label>
                  <div className="grid grid-cols-4 gap-2">
                    {chartTypes.map((type) => (
                      <button
                        key={type.id}
                        onClick={() => setChartForm(prev => ({ ...prev, type: type.id as any }))}
                        className={`flex items-center gap-2 p-3 border rounded-md transition-colors ${
                          chartForm.type === type.id 
                            ? 'border-blue-500 bg-blue-50 text-blue-700' 
                            : 'border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <type.icon className="w-4 h-4" />
                        <span className="text-sm">{type.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">X-Axis Column</label>
                  <select
                    value={chartForm.xAxis}
                    onChange={(e) => setChartForm(prev => ({ ...prev, xAxis: e.target.value }))}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900"
                  >
                    <option value="">Select column...</option>
                    {Array.isArray(columnMetadata) ? columnMetadata.map((col) => (
                      <option key={col.name} value={col.name}>{col.name}</option>
                    )) : null}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Y-Axis Column</label>
                  <select
                    value={chartForm.yAxis}
                    onChange={(e) => setChartForm(prev => ({ ...prev, yAxis: e.target.value }))}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900"
                  >
                    <option value="">Select column...</option>
                    {Array.isArray(columnMetadata) ? columnMetadata.filter(col => col.type === 'numeric').map((col) => (
                      <option key={col.name} value={col.name}>{col.name}</option>
                    )) : null}
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
                      if (chartForm.title && chartForm.xAxis && chartForm.yAxis) {
                        const newChart: ChartConfig = {
                          id: `chart_${Date.now()}`,
                          type: chartForm.type,
                          title: chartForm.title,
                          xAxis: chartForm.xAxis,
                          yAxis: chartForm.yAxis
                        };
                        createCustomChart(newChart);
                        // Reset form
                        setChartForm({
                          title: '',
                          type: 'bar',
                          xAxis: '',
                          yAxis: ''
                        });
                      }
                    }}
                    disabled={!chartForm.title || !chartForm.xAxis || !chartForm.yAxis}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
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
        {/* Saved Queries */}
        {savedQueries.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                  <Save className="w-4 h-4" />
                  Saved Queries
                </h3>
                <span className="text-xs text-slate-500">{savedQueries.length} saved</span>
              </div>
            </div>
            <div className="divide-y divide-slate-200 max-h-48 overflow-y-auto">
              {savedQueries.slice(0, 10).map((query) => (
                <div key={query.id} className="p-3 hover:bg-slate-50 transition-colors cursor-pointer"
                     onClick={() => {
                       setSqlQuery(query.query);
                       setQueryError(null);
                       if (query.results) {
                         setQueryResults(query.results);
                       }
                     }}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                          SAVED
                        </span>
                        <span className="text-xs text-green-600 bg-green-50 px-1.5 py-0.5 rounded flex items-center gap-1">
                          <span className="text-yellow-500">★</span> Favorite
                        </span>
                      </div>
                      <p className="text-sm text-slate-700 truncate">{query.query}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        Saved on {new Date(query.timestamp).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 ml-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSavedQueries(prev => prev.filter(q => q.id !== query.id));
                        }}
                        className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                        title="Delete saved query"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Query History */}
        {queryHistory.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  Recent Query History
                </h3>
                <span className="text-xs text-slate-500">Last {Math.min(queryHistory.length, 10)} queries</span>
              </div>
            </div>
            <div className="divide-y divide-slate-200 max-h-48 overflow-y-auto">
              {queryHistory.slice(0, 10).map((query) => (
                <div key={query.id} className="p-3 hover:bg-slate-50 transition-colors cursor-pointer"
                     onClick={() => {
                       if (query.results) {
                         setQueryResults(query.results);
                         // Also set the query in the input
                         if (query.type === 'SQL') {
                           setSqlQuery(query.query);
                         } else {
                           setNlqQuery(query.query);
                         }
                       }
                     }}>
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
                        {query.results && (
                          <span className="text-xs text-green-600 bg-green-50 px-1.5 py-0.5 rounded">
                            Has Results
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-700 truncate">{query.query}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        {new Date(query.timestamp).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 ml-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleQueryFavorite(query.id);
                        }}
                        className={`p-1 transition-colors ${
                          query.favorite ? 'text-yellow-500' : 'text-slate-400 hover:text-yellow-500'
                        }`}
                      >
                        <span className="text-sm">★</span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
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
        <div data-id="sql-editor" className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-800">SQL Editor</h3>
            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-600">Templates:</label>
              <select 
                onChange={(e) => {
                  const template = sqlTemplates.find(t => t.name === e.target.value);
                  if (template) loadTemplate(template);
                  e.target.value = '';
                }}
                className="px-3 py-1 border border-slate-200 rounded-md text-sm bg-white hover:border-blue-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                value=""
              >
                <option value="">Select template...</option>
                {sqlTemplates.map((template) => (
                  <option key={template.name} value={template.name}>
                    {template.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-3">
            <div className="relative border border-slate-200 rounded-lg overflow-hidden">
              <Editor
                height="200px"
                language="sql"
                value={sqlQuery}
                onChange={handleSQLChange}
                theme="vs-light"
                options={{
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  fontSize: 14,
                  lineNumbers: 'on',
                  roundedSelection: false,
                  automaticLayout: true,
                  wordWrap: 'on',
                  folding: true,
                  showUnused: true,
                  formatOnType: true,
                  formatOnPaste: true,
                  suggest: {
                    insertMode: 'replace',
                    showKeywords: true,
                    showSnippets: true,
                    showFunctions: true
                  },
                  quickSuggestions: {
                    other: true,
                    comments: false,
                    strings: false
                  }
                }}
                onMount={(editor, monaco) => {
                  // Add Ctrl+Enter shortcut
                  editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
                    handleRunQuery('sql');
                  });
                  
                  // Add SQL keywords and functions for autocomplete
                  monaco.languages.registerCompletionItemProvider('sql', {
                    provideCompletionItems: (model, position) => {
                      const word = model.getWordUntilPosition(position);
                      const range = {
                        startLineNumber: position.lineNumber,
                        endLineNumber: position.lineNumber,
                        startColumn: word.startColumn,
                        endColumn: word.endColumn,
                      };
                      
                      const suggestions = [
                        {
                          label: 'SELECT',
                          kind: monaco.languages.CompletionItemKind.Keyword,
                          insertText: 'SELECT',
                          range: range,
                          detail: 'SELECT statement'
                        },
                        {
                          label: 'FROM',
                          kind: monaco.languages.CompletionItemKind.Keyword,
                          insertText: 'FROM',
                          range: range,
                          detail: 'FROM clause'
                        },
                        {
                          label: 'WHERE',
                          kind: monaco.languages.CompletionItemKind.Keyword,
                          insertText: 'WHERE',
                          range: range,
                          detail: 'WHERE clause'
                        },
                        {
                          label: 'ORDER BY',
                          kind: monaco.languages.CompletionItemKind.Keyword,
                          insertText: 'ORDER BY',
                          range: range,
                          detail: 'ORDER BY clause'
                        },
                        {
                          label: 'GROUP BY',
                          kind: monaco.languages.CompletionItemKind.Keyword,
                          insertText: 'GROUP BY',
                          range: range,
                          detail: 'GROUP BY clause'
                        },
                        {
                          label: 'HAVING',
                          kind: monaco.languages.CompletionItemKind.Keyword,
                          insertText: 'HAVING',
                          range: range,
                          detail: 'HAVING clause'
                        },
                        {
                          label: 'JOIN',
                          kind: monaco.languages.CompletionItemKind.Keyword,
                          insertText: 'JOIN',
                          range: range,
                          detail: 'JOIN clause'
                        },
                        {
                          label: 'INNER JOIN',
                          kind: monaco.languages.CompletionItemKind.Keyword,
                          insertText: 'INNER JOIN',
                          range: range,
                          detail: 'INNER JOIN'
                        },
                        {
                          label: 'LEFT JOIN',
                          kind: monaco.languages.CompletionItemKind.Keyword,
                          insertText: 'LEFT JOIN',
                          range: range,
                          detail: 'LEFT JOIN'
                        },
                        {
                          label: 'RIGHT JOIN',
                          kind: monaco.languages.CompletionItemKind.Keyword,
                          insertText: 'RIGHT JOIN',
                          range: range,
                          detail: 'RIGHT JOIN'
                        },
                        {
                          label: 'LIMIT',
                          kind: monaco.languages.CompletionItemKind.Keyword,
                          insertText: 'LIMIT',
                          range: range,
                          detail: 'LIMIT clause'
                        },
                        {
                          label: 'COUNT',
                          kind: monaco.languages.CompletionItemKind.Function,
                          insertText: 'COUNT($0)',
                          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                          range: range,
                          detail: 'COUNT function'
                        },
                        {
                          label: 'SUM',
                          kind: monaco.languages.CompletionItemKind.Function,
                          insertText: 'SUM($0)',
                          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                          range: range,
                          detail: 'SUM function'
                        },
                        {
                          label: 'AVG',
                          kind: monaco.languages.CompletionItemKind.Function,
                          insertText: 'AVG($0)',
                          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                          range: range,
                          detail: 'AVG function'
                        },
                        {
                          label: 'MAX',
                          kind: monaco.languages.CompletionItemKind.Function,
                          insertText: 'MAX($0)',
                          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                          range: range,
                          detail: 'MAX function'
                        },
                        {
                          label: 'MIN',
                          kind: monaco.languages.CompletionItemKind.Function,
                          insertText: 'MIN($0)',
                          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                          range: range,
                          detail: 'MIN function'
                        },
                        {
                          label: 'dataset',
                          kind: monaco.languages.CompletionItemKind.Variable,
                          insertText: 'dataset',
                          range: range,
                          detail: 'Current dataset table'
                        }
                      ];
                      return { suggestions };
                    }
                  });
                }}
              />
              <div className="absolute bottom-2 right-2 text-xs text-slate-400 bg-white px-2 py-1 rounded shadow-sm">
                Ctrl+Enter to run
              </div>
              {queryError && (
                <div className="absolute bottom-2 left-2 text-xs text-red-600 bg-red-50 border border-red-200 px-2 py-1 rounded shadow-sm max-w-xs">
                  ⚠ {queryError}
                </div>
              )}
            </div>
            
            {/* Query Status Indicator */}
            {sqlQuery.trim() && (
              <div className="flex items-center gap-4">
                <div className={`flex items-center gap-2 text-xs px-3 py-1 rounded ${
                  isQueryValid 
                    ? 'text-green-700 bg-green-50 border border-green-200' 
                    : 'text-red-700 bg-red-50 border border-red-200'
                }`}>
                  {isQueryValid ? (
                    <><CheckCircle className="w-3 h-3" /> Query looks valid</>
                  ) : (
                    <><XCircle className="w-3 h-3" /> Query has issues</>
                  )}
                </div>
                
                {(() => {
                  const queryCount = parseMultipleQueries(sqlQuery).length;
                  if (queryCount > 1) {
                    return (
                      <div className="flex items-center gap-2 text-xs px-3 py-1 rounded text-blue-700 bg-blue-50 border border-blue-200">
                        <Database className="w-3 h-3" /> 
                        {queryCount} queries detected
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>
            )}
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => handleRunQuery('sql')}
                disabled={isLoading.query || !currentFileId || !isQueryValid || !sqlQuery.trim()}
                title={(() => {
                  const queryCount = parseMultipleQueries(sqlQuery).length;
                  return queryCount > 1 ? `Execute ${queryCount} queries` : 'Execute query';
                })()}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading.query ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <Play className="w-4 h-4" />
                )}
                Execute Query
              </button>
              
              <button 
                onClick={() => {
                  setSqlQuery('EXPLAIN QUERY PLAN ' + sqlQuery);
                }}
                disabled={!sqlQuery.trim()}
                title="Show query execution plan"
                className="flex items-center gap-2 bg-purple-100 hover:bg-purple-200 text-purple-700 px-3 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Eye className="w-4 h-4" />
                Explain
              </button>
              
              <button 
                onClick={() => {
                  const limitedQuery = sqlQuery.includes('LIMIT') ? sqlQuery : `${sqlQuery} LIMIT 100`;
                  setSqlQuery(limitedQuery);
                }}
                disabled={!sqlQuery.trim() || sqlQuery.includes('LIMIT')}
                title="Add LIMIT 100 to query"
                className="flex items-center gap-2 bg-orange-100 hover:bg-orange-200 text-orange-700 px-3 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Hash className="w-4 h-4" />
                Limit
              </button>
              
              <button 
                onClick={handleSaveQuery}
                disabled={!sqlQuery.trim()}
                className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-4 h-4" />
                Save
              </button>
              
              <button 
                onClick={handleFormatQuery}
                disabled={!sqlQuery.trim()}
                className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Shuffle className="w-4 h-4" />
                Format
              </button>
              
              <button 
                onClick={() => setSqlQuery('')}
                disabled={!sqlQuery.trim()}
                title="Clear query"
                className="flex items-center gap-2 bg-red-100 hover:bg-red-200 text-red-700 px-3 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <X className="w-4 h-4" />
                Clear
              </button>
            </div>
          </div>
        </div>

        {/* Enhanced Natural Language Query */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Natural Language Query</h3>
          <p className="text-sm text-slate-600 mb-4">Ask questions in plain English - our AI will translate them to SQL or perform statistical analysis.</p>
          
          {/* NLQ Suggestion Pills */}
          <div className="flex flex-wrap gap-2 mb-4">
            <button
              onClick={() => setNlqQuery('What is the average of all numeric columns?')}
              className="px-3 py-1 text-xs bg-blue-100 hover:bg-blue-200 text-blue-800 rounded-full transition-colors"
            >
              📊 Average values
            </button>
            <button
              onClick={() => setNlqQuery('Show me outliers in the data')}
              className="px-3 py-1 text-xs bg-purple-100 hover:bg-purple-200 text-purple-800 rounded-full transition-colors"
            >
              🎯 Find outliers
            </button>
            <button
              onClick={() => setNlqQuery('What are the correlations between numeric columns?')}
              className="px-3 py-1 text-xs bg-green-100 hover:bg-green-200 text-green-800 rounded-full transition-colors"
            >
              🔗 Correlations
            </button>
            <button
              onClick={() => setNlqQuery('Predict Y when X = 250')}
              className="px-3 py-1 text-xs bg-orange-100 hover:bg-orange-200 text-orange-800 rounded-full transition-colors"
            >
              🔮 Make prediction
            </button>
            <button
              onClick={() => setNlqQuery('Summarize the data quality')}
              className="px-3 py-1 text-xs bg-red-100 hover:bg-red-200 text-red-800 rounded-full transition-colors"
            >
              ✅ Data quality
            </button>
          </div>
          
          <div className="space-y-3">
            <div className="relative">
              <input
                type="text"
                placeholder="Ask a question about your data..."
                className="w-full p-4 pr-20 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                value={nlqQuery}
                onChange={(e) => setNlqQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleRunQuery('nlq');
                  }
                }}
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                <button
                  onClick={() => setNlqQuery('')}
                  disabled={!nlqQuery.trim()}
                  title="Clear query"
                  className="p-2 text-slate-400 hover:text-slate-600 disabled:opacity-30 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleRunQuery('nlq')}
                  disabled={isLoading.query || !currentFileId || !nlqQuery.trim()}
                  className="p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isLoading.query ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <Zap className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
            
            {/* Query interpretation indicator */}
            {nlqQuery.trim() && (
              <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <Brain className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <div className="font-medium text-blue-800">AI Interpretation:</div>
                  <div className="text-blue-700 mt-1">
                    {(() => {
                      const query = nlqQuery.toLowerCase();
                      if (query.includes('predict') && query.includes('when')) {
                        return 'This looks like a prediction request. I\'ll fit a regression model and make a prediction.';
                      } else if (query.includes('correlation')) {
                        return 'I\'ll calculate correlation coefficients between numeric variables.';
                      } else if (query.includes('outlier')) {
                        return 'I\'ll use statistical methods to identify outliers in your data.';
                      } else if (query.includes('average') || query.includes('mean')) {
                        return 'I\'ll calculate average values for numeric columns.';
                      } else if (query.includes('summary') || query.includes('summarize')) {
                        return 'I\'ll generate comprehensive data insights and quality metrics.';
                      } else {
                        return 'I\'ll analyze your query and either generate SQL or perform statistical analysis.';
                      }
                    })()}
                  </div>
                </div>
              </div>
            )}
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
            
            {/* AI Insights and Transparency Panel */}
            <div className="border-t border-slate-200 bg-gradient-to-r from-blue-50 to-purple-50">
              <div className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-5 h-5 text-purple-600" />
                  <h4 className="font-semibold text-slate-800">AI Assistant Analysis</h4>
                </div>
                
                <div className="grid md:grid-cols-2 gap-4">
                  {/* Query Insights */}
                  <div className="space-y-3">
                    <div className="bg-white rounded-lg p-3 border border-blue-200">
                      <div className="flex items-center gap-2 mb-2">
                        <Eye className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-medium text-blue-800">Query Analysis</span>
                      </div>
                      <div className="text-sm text-slate-700">
                        {(() => {
                          const resultCount = queryResults.totalRows;
                          const columnCount = queryResults.columns.length;
                          
                          if (queryResults.sql?.includes('CORR(')) {
                            return `Correlation analysis computed across ${resultCount} data points with ${columnCount} metrics. This helps identify relationships between variables.`;
                          } else if (queryResults.sql?.includes('PERCENTILE_CONT')) {
                            return `Statistical summary calculated including quartiles and outlier bounds. This provides comprehensive distribution insights.`;
                          } else if (queryResults.sql?.includes('GROUP BY')) {
                            return `Grouped analysis showing ${resultCount} categories. This breakdown helps identify patterns across different segments.`;
                          } else if (queryResults.sql?.includes('Advanced AI Analysis')) {
                            return `Advanced predictive analysis performed using machine learning algorithms. Results include model parameters and prediction confidence.`;
                          } else {
                            return `Query executed successfully returning ${resultCount} rows with ${columnCount} columns. Data appears to be well-structured for analysis.`;
                          }
                        })()}
                      </div>
                    </div>
                    
                    {/* Data Quality Assessment */}
                    <div className="bg-white rounded-lg p-3 border border-green-200">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-medium text-green-800">Data Quality</span>
                      </div>
                      <div className="text-sm text-slate-700">
                        {(() => {
                          const hasNulls = queryResults.rows.some(row => {
                            if (Array.isArray(row)) {
                              return row.some(cell => cell === null || cell === undefined);
                            } else if (typeof row === 'object' && row !== null) {
                              return Object.values(row).some(cell => cell === null || cell === undefined);
                            }
                            return false;
                          });
                          const hasValidData = queryResults.totalRows > 0;
                          
                          if (!hasValidData) {
                            return "⚠️ No data returned. Check your query conditions.";
                          } else if (hasNulls) {
                            return "✅ Results contain some null values. Consider data cleaning if needed.";
                          } else {
                            return "✅ High quality results with no missing values detected.";
                          }
                        })()}
                      </div>
                    </div>
                  </div>
                  
                  {/* Transparency & Actions */}
                  <div className="space-y-3">
                    {/* Generated SQL Display */}
                    {queryResults.sql && (
                      <div className="bg-white rounded-lg p-3 border border-slate-200">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Code className="w-4 h-4 text-slate-600" />
                            <span className="text-sm font-medium text-slate-800">Generated SQL</span>
                          </div>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(queryResults.sql);
                              // Could add a toast notification here
                            }}
                            className="text-xs text-blue-600 hover:text-blue-800 transition-colors"
                          >
                            Copy
                          </button>
                        </div>
                        <div className="text-xs font-mono bg-slate-100 rounded p-2 text-slate-700 overflow-x-auto max-w-full">
                          {queryResults.sql.split('\n').slice(0, 3).join('\n')}
                          {queryResults.sql.split('\n').length > 3 && '...'}
                        </div>
                      </div>
                    )}
                    
                    {/* Follow-up Suggestions and Actions */}
                    <div className="bg-white rounded-lg p-3 border border-purple-200">
                      <div className="flex items-center gap-2 mb-2">
                        <Lightbulb className="w-4 h-4 text-purple-600" />
                        <span className="text-sm font-medium text-purple-800">Suggestions & Actions</span>
                      </div>
                      <div className="space-y-2">
                        {(() => {
                          const suggestions = [];
                          if (queryResults.sql?.includes('Advanced AI Analysis')) {
                            suggestions.push("📊 Try visualizing the prediction results");
                            suggestions.push("📈 Explore model performance metrics");
                          } else if (queryResults.sql?.includes('CORR(')) {
                            suggestions.push("📈 Create a scatter plot of correlated variables");
                            suggestions.push("🔍 Investigate the strongest correlations");
                          } else {
                            suggestions.push("📊 Visualize this data with charts");
                            suggestions.push("🔍 Filter results for deeper analysis");
                          }
                          
                          return (
                            <>
                              {suggestions.slice(0, 2).map((suggestion, idx) => (
                                <div key={idx} className="text-xs text-purple-700">
                                  {suggestion}
                                </div>
                              ))}
                              
                              {/* Fallback to SQL Editor */}
                              <div className="pt-2 border-t border-purple-100">
                                <button
                                  onClick={() => {
                                    if (queryResults.sql) {
                                      setSqlQuery(queryResults.sql);
                                      // Scroll to SQL editor
                                      document.querySelector('[data-id="sql-editor"]')?.scrollIntoView({ behavior: 'smooth' });
                                    }
                                  }}
                                  className="text-xs text-blue-600 hover:text-blue-800 underline transition-colors"
                                >
                                  🔧 Edit this query in SQL Editor
                                </button>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
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
              <select 
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={predictionTarget}
                onChange={(e) => setPredictionTarget(e.target.value)}
              >
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
                  <input 
                    type="radio" 
                    name="predictionType" 
                    value="classification" 
                    className="mr-2" 
                    checked={predictionType === 'classification'}
                    onChange={(e) => setPredictionType(e.target.value as 'classification' | 'regression')}
                  />
                  <span className="text-sm">Classification</span>
                </label>
                <label className="flex items-center">
                  <input 
                    type="radio" 
                    name="predictionType" 
                    value="regression" 
                    className="mr-2" 
                    checked={predictionType === 'regression'}
                    onChange={(e) => setPredictionType(e.target.value as 'classification' | 'regression')}
                  />
                  <span className="text-sm">Regression</span>
                </label>
              </div>
            </div>
            
            <button 
              className="w-full py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleGeneratePredictions}
              disabled={isLoading.prediction || !currentFileId || !predictionTarget}
            >
              {isLoading.prediction ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Generating...</span>
                </div>
              ) : (
                'Generate Predictions'
              )}
            </button>
          </div>
        </div>

        {/* Prediction Results */}
        {predictionResults && (
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Prediction Results</h3>
            <div className="space-y-4">
              {/* Model Performance */}
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4 border border-purple-200">
                <h4 className="font-semibold text-purple-800 mb-2">Model Performance</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-slate-600">Prediction Type:</span>
                    <span className="ml-2 font-medium capitalize">{predictionResults.prediction_type}</span>
                  </div>
                  <div>
                    <span className="text-slate-600">Test Samples:</span>
                    <span className="ml-2 font-medium">{predictionResults.model_performance.test_samples}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-600">
                      {predictionResults.prediction_type === 'regression' ? 'R² Score:' : 'Accuracy:'}
                    </span>
                    <span className="ml-2 font-bold text-purple-700">
                      {predictionResults.prediction_type === 'regression' 
                        ? `${(predictionResults.model_performance.r2_score * 100).toFixed(1)}%`
                        : `${(predictionResults.model_performance.accuracy * 100).toFixed(1)}%`
                      }
                    </span>
                  </div>
                </div>
              </div>

              {/* Feature Importance */}
              <div>
                <h4 className="font-semibold text-slate-800 mb-2">Feature Importance</h4>
                <div className="space-y-2">
                  {predictionResults.feature_importance.slice(0, 3).map((feature: any, index: number) => (
                    <div key={index} className="flex items-center gap-3">
                      <span className="text-sm font-medium text-slate-600 w-20">{feature.feature}</span>
                      <div className="flex-1 bg-slate-200 rounded-full h-2">
                        <div 
                          className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${feature.importance * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-sm text-slate-500 w-12">{(feature.importance * 100).toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sample Predictions */}
              <div>
                <h4 className="font-semibold text-slate-800 mb-2">Sample Predictions</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-slate-600">Actual</th>
                        <th className="px-3 py-2 text-left font-medium text-slate-600">Predicted</th>
                        <th className="px-3 py-2 text-left font-medium text-slate-600">Difference</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {predictionResults.predictions_sample.slice(0, 5).map((pred: any, index: number) => {
                        const diff = Math.abs(pred.actual - pred.predicted);
                        return (
                          <tr key={index}>
                            <td className="px-3 py-2">{typeof pred.actual === 'number' ? pred.actual.toFixed(2) : pred.actual}</td>
                            <td className="px-3 py-2">{typeof pred.predicted === 'number' ? pred.predicted.toFixed(2) : pred.predicted}</td>
                            <td className="px-3 py-2">
                              <span className={`px-2 py-1 rounded text-xs ${diff < 5 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                {typeof diff === 'number' ? diff.toFixed(2) : 'N/A'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

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
              {/* Model Info - Fixed to GPT-OSS-120B */}
              <div className={`px-3 py-2 rounded-md text-sm font-medium ${
                theme.isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-700'
              }`}>
                GPT-OSS-120B
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

              {/* Direct PDF Export Button */}
              <button 
                onClick={() => {
                  console.log('PDF Export button clicked');
                  exportDataset('pdf');
                }}
                disabled={!currentFileId}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                  theme.isDark 
                    ? 'text-white bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 shadow-lg hover:shadow-xl' 
                    : 'text-white bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 shadow-lg hover:shadow-xl'
                } ${!currentFileId ? '' : 'transform hover:scale-105'}`}
                title="Export PDF Report"
              >
                <FileText className="w-4 h-4" />
                Export PDF Report
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

              {/* Saved Sessions Button */}
              <button 
                onClick={() => {
                  setShowSavedSessions(true);
                  loadSavedSessions();
                }}
                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors shadow-sm"
                title="Load a saved analysis session"
              >
                <FileText className="w-4 h-4" />
                Load Session
              </button>

              {/* Save Analysis Button */}
              <button 
                onClick={() => {
                  if (currentFileId) {
                    saveAnalysisSession();
                  }
                }}
                disabled={!currentFileId || isLoading.saving}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                title="Save your current analysis session"
              >
                {isLoading.saving ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Save Analysis
              </button>

              {/* Clear Session Button */}
              <button 
                onClick={clearSession}
                disabled={!currentSessionId && !isSessionLoaded}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                title="Clear current session and reset all data"
              >
                <Trash2 className="w-4 h-4" />
                Clear Session
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
                  {uploadedFiles?.map((file) => (
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
                          onClick={() => {
                            console.log('🔄 Switching to different dataset:', file.fileId);
                            // Clear session state to ensure fresh data loading for the selected dataset
                            setIsSessionLoaded(false);
                            setCurrentSessionIdPersistent(null);
                            localStorage.removeItem('analysisData');
                            setCurrentFileId(file.fileId);
                          }}
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
                  ) : (currentFileId && dataSummary) ? (
                    <>
                      <div className="grid grid-cols-4 gap-6">
                        <div className={`rounded-xl p-5 border transition-colors ${
                          theme.isDark ? 'bg-slate-700 border-slate-600' : 'bg-slate-50 border-slate-200'
                        }`}>
                          <p className="text-sm text-slate-500 mb-1">Total Rows</p>
                          <p className={`text-3xl font-bold ${theme.isDark ? 'text-slate-100' : 'text-slate-800'}`}>
                            {dataSummary.rows?.toLocaleString() || '0'}
                          </p>
                        </div>
                        <div className={`rounded-xl p-5 border transition-colors ${
                          theme.isDark ? 'bg-slate-700 border-slate-600' : 'bg-slate-50 border-slate-200'
                        }`}>
                          <p className="text-sm text-slate-500 mb-1">Columns</p>
                          <p className={`text-3xl font-bold ${theme.isDark ? 'text-slate-100' : 'text-slate-800'}`}>
                            {dataSummary.columns || '0'}
                          </p>
                        </div>
                        <div className={`rounded-xl p-5 border transition-colors ${
                          theme.isDark ? 'bg-slate-700 border-slate-600' : 'bg-slate-50 border-slate-200'
                        }`}>
                          <p className="text-sm text-slate-500 mb-1">Missing Values</p>
                          <p className={`text-3xl font-bold ${theme.isDark ? 'text-slate-100' : 'text-slate-800'}`}>
                            {dataSummary.missingValues || '0'}
                          </p>
                        </div>
                        <div className={`rounded-xl p-5 border transition-colors ${
                          theme.isDark ? 'bg-slate-700 border-slate-600' : 'bg-slate-50 border-slate-200'
                        }`}>
                          <p className="text-sm text-slate-500 mb-1">Data Quality</p>
                          <p className={`text-3xl font-bold ${theme.isDark ? 'text-slate-100' : 'text-slate-800'}`}>
                            {dataSummary.dataQuality || 'N/A'}
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
                              {Object.entries(dataSummary.numericalColumns || {}).map(([col, stats]) => (
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
                              {Object.entries(dataSummary.categoricalColumns || {}).map(([col, stats]) => (
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
              {activeTab === 'cleaning' && (
                currentFileId ? renderCleaningPanel() : (
                  <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                    <Sliders className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-600 mb-2">No Dataset Available</h3>
                    <p className="text-slate-500 mb-4">Upload a dataset to access data cleaning and preprocessing tools.</p>
                    <button
                      onClick={() => document.getElementById('file-upload')?.click()}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Upload Dataset
                    </button>
                  </div>
                )
              )}
              
              {activeTab === 'charts' && (
                <div className="space-y-6">
                  {/* Only show charts if there's a current dataset */}
                  {currentFileId ? (
                    <>
                      {renderInteractiveChartBuilder()}
                      {renderCorrelationHeatmap()}
                    </>
                  ) : (
                    <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                      <BarChart3 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-slate-600 mb-2">No Dataset Available</h3>
                      <p className="text-slate-500 mb-4">Upload a dataset to create visualizations and view charts.</p>
                      <button
                        onClick={() => document.getElementById('file-upload')?.click()}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Upload Dataset
                      </button>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'correlations' && (
                currentFileId ? renderCorrelationHeatmap() : (
                  <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                    <LineChart className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-600 mb-2">No Dataset Available</h3>
                    <p className="text-slate-500 mb-4">Upload a dataset to view correlations between variables.</p>
                    <button
                      onClick={() => document.getElementById('file-upload')?.click()}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Upload Dataset
                    </button>
                  </div>
                )
              )}
              {activeTab === 'queries' && (
                currentFileId ? renderQueryPanel() : (
                  <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                    <Database className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-600 mb-2">No Dataset Available</h3>
                    <p className="text-slate-500 mb-4">Upload a dataset to run SQL and natural language queries.</p>
                    <button
                      onClick={() => document.getElementById('file-upload')?.click()}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Upload Dataset
                    </button>
                  </div>
                )
              )}
              {activeTab === 'insights' && (
                currentFileId ? renderAIInsightsPanel() : (
                  <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                    <Sparkles className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-600 mb-2">No Dataset Available</h3>
                    <p className="text-slate-500 mb-4">Upload a dataset to get AI-powered insights and analysis.</p>
                    <button
                      onClick={() => document.getElementById('file-upload')?.click()}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Upload Dataset
                    </button>
                  </div>
                )
              )}
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

      {/* Saved Sessions Modal */}
      {showSavedSessions && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full mx-4 max-h-[80vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <FileText className="w-6 h-6 text-purple-600" />
                <h2 className="text-xl font-bold text-slate-900">Saved Analysis Sessions</h2>
              </div>
              <button
                onClick={() => setShowSavedSessions(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {savedSessions.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-600 text-lg mb-2">No saved sessions found</p>
                  <p className="text-slate-400">Save your current analysis to see it here</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {savedSessions.map((session) => (
                    <div
                      key={session.id}
                      className="border border-slate-200 rounded-lg p-4 hover:border-purple-300 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-slate-900 mb-1">{session.title}</h3>
                          <p className="text-slate-600 text-sm mb-2">Dataset: {session.dataset_name}</p>
                          <div className="flex items-center gap-4 text-xs text-slate-500">
                            <span>Created: {new Date(session.created_at).toLocaleDateString()}</span>
                            <span>Modified: {new Date(session.updated_at).toLocaleDateString()}</span>
                            <span className={`px-2 py-1 rounded-full ${
                              session.status === 'saved' 
                                ? 'bg-green-100 text-green-800' 
                                : session.status === 'active'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {session.status}
                            </span>
                          </div>
                          {session.tags && session.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {session.tags.map((tag: string, index: number) => (
                                <span
                                  key={index}
                                  className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded-md"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <button
                            onClick={() => session.id && navigateToPreview(session.id)}
                            disabled={!session.id}
                            className="flex items-center gap-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Export this session to PDF"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            PDF
                          </button>
                          <button
                            onClick={() => session.id && restoreAnalysisSession(session.id)}
                            disabled={isLoading.analysis || !session.id}
                            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isLoading.analysis ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            ) : (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                              </svg>
                            )}
                            Load
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between p-6 border-t border-slate-200 bg-slate-50">
              <p className="text-sm text-slate-600">
                {savedSessions.length} session{savedSessions.length !== 1 ? 's' : ''} available
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => loadSavedSessions()}
                  className="px-4 py-2 text-slate-600 hover:text-slate-900 transition-colors"
                >
                  <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh
                </button>
                <button
                  onClick={() => setShowSavedSessions(false)}
                  className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Chart Zoom Modal */}
      {zoomedChart && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-3">
                <BarChart3 className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-semibold text-slate-900">{zoomedChart.title}</h3>
                <span className="text-sm text-slate-500">
                  {zoomedChart.type.toUpperCase()} • X: {zoomedChart.xAxis} • Y: {zoomedChart.yAxis}
                </span>
              </div>
              <button
                onClick={() => setZoomedChart(null)}
                className="p-2 text-slate-400 hover:text-slate-600 transition-colors rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Modal Content - Zoomed Chart */}
            <div className="p-6">
              <div className="w-full" style={{ height: '60vh' }}>
                {renderCustomChart(zoomedChart)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataAnalysisWorkspace;