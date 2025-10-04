import React, { useState, useRef, useEffect } from 'react';
import { 
  FileText, Upload, Link, Code, Database, MessageCircle,
  Search, Filter, Plus, Eye, Download, Copy, Share2,
  ChevronRight, ChevronDown, Calendar, User, Tag,
  BookOpen, Beaker, BarChart3, Cpu, Brain, Zap,
  Folder, File, Image, Video, Archive, Settings,
  ExternalLink, Maximize2, Minimize2, RefreshCw,
  Star, Clock, TrendingUp, AlertCircle, CheckCircle,
  Play, Pause, MoreVertical, Edit3, Trash2, X
} from 'lucide-react';

const AIIntegrationsDashboard = () => {
  const [activeTab, setActiveTab] = useState('documents');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [expandedCards, setExpandedCards] = useState(new Set());
  const fileInputRef = useRef(null);

  // Sample project data
  const projectData = {
    name: "AI-Powered CRM Platform",
    totalIntegrations: 47,
    recentUploads: 8,
    totalStorage: "2.3 GB"
  };

  // Sample integration data
  const [integrations, setIntegrations] = useState({
    documents: [
      {
        id: 'doc-1',
        name: 'Project Requirements Analysis.pdf',
        type: 'pdf',
        size: '2.4 MB',
        uploadDate: new Date('2024-09-01'),
        uploader: 'John Doe',
        linkedTo: 'milestone-1',
        tags: ['requirements', 'analysis'],
        preview: 'This document outlines the comprehensive requirements for the AI-powered CRM platform...',
        version: 2,
        status: 'approved'
      },
      {
        id: 'doc-2',
        name: 'Technical Specifications.docx',
        type: 'docx',
        size: '1.8 MB',
        uploadDate: new Date('2024-08-28'),
        uploader: 'Sarah Wilson',
        linkedTo: 'task-3',
        tags: ['technical', 'specifications'],
        preview: 'Technical implementation details and architecture specifications...',
        version: 1,
        status: 'draft'
      },
      {
        id: 'doc-3',
        name: 'API Documentation.md',
        type: 'text',
        size: '512 KB',
        uploadDate: new Date('2024-09-02'),
        uploader: 'Alex Thompson',
        linkedTo: 'task-4',
        tags: ['api', 'documentation'],
        preview: '# API Documentation\n\n## Authentication\n\nAll API requests require authentication...',
        version: 3,
        status: 'published'
      }
    ],
    research: [
      {
        id: 'research-1',
        title: 'Customer Segmentation Literature Review',
        type: 'literature_review',
        summary: 'Comprehensive analysis of customer segmentation techniques in CRM systems, covering machine learning approaches and traditional methods.',
        tags: ['ml', 'segmentation', 'literature'],
        linkedTo: 'milestone-2',
        createdDate: new Date('2024-08-30'),
        author: 'AI Research Assistant',
        citations: 23,
        confidence: 0.92
      },
      {
        id: 'research-2',
        title: 'Sentiment Analysis Methods Comparison',
        type: 'analysis',
        summary: 'Comparative study of different sentiment analysis approaches for customer feedback processing.',
        tags: ['nlp', 'sentiment', 'comparison'],
        linkedTo: 'task-5',
        createdDate: new Date('2024-09-01'),
        author: 'AI Research Assistant',
        citations: 18,
        confidence: 0.88
      }
    ],
    notebooks: [
      {
        id: 'notebook-1',
        name: 'Customer Data Analysis.ipynb',
        type: 'jupyter',
        lastRun: new Date('2024-09-02'),
        author: 'Data Science Team',
        linkedTo: 'task-6',
        tags: ['analysis', 'python', 'visualization'],
        cells: 24,
        outputs: 12,
        status: 'completed',
        runtime: '2.3 minutes'
      },
      {
        id: 'notebook-2',
        name: 'ML Model Training.ipynb',
        type: 'jupyter',
        lastRun: new Date('2024-09-01'),
        author: 'ML Engineer',
        linkedTo: 'milestone-3',
        tags: ['ml', 'training', 'tensorflow'],
        cells: 18,
        outputs: 8,
        status: 'running',
        runtime: '5.7 minutes'
      }
    ],
    code: [
      {
        id: 'code-1',
        title: 'User Authentication Service',
        language: 'javascript',
        code: `// JWT Authentication middleware
const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (token == null) return res.sendStatus(401);
  
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

module.exports = authenticateToken;`,
        explanation: 'JWT authentication middleware for securing API endpoints. Validates tokens and adds user context to requests.',
        tags: ['auth', 'middleware', 'security'],
        linkedTo: 'task-7',
        createdDate: new Date('2024-08-29'),
        author: 'AI Code Assistant'
      },
      {
        id: 'code-2',
        title: 'Customer Segmentation Algorithm',
        language: 'python',
        code: `import pandas as pd
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler

class CustomerSegmentation:
    def __init__(self, n_clusters=5):
        self.n_clusters = n_clusters
        self.kmeans = KMeans(n_clusters=n_clusters, random_state=42)
        self.scaler = StandardScaler()
    
    def fit_predict(self, customer_data):
        # Normalize features
        scaled_data = self.scaler.fit_transform(customer_data)
        
        # Apply K-means clustering
        clusters = self.kmeans.fit_predict(scaled_data)
        
        return clusters`,
        explanation: 'Machine learning model for customer segmentation using K-means clustering with feature normalization.',
        tags: ['ml', 'clustering', 'scikit-learn'],
        linkedTo: 'milestone-4',
        createdDate: new Date('2024-09-01'),
        author: 'AI Code Assistant'
      }
    ],
    data: [
      {
        id: 'data-1',
        title: 'Customer Engagement Metrics',
        type: 'chart',
        chartType: 'line',
        data: [
          { month: 'Jan', engagement: 65 },
          { month: 'Feb', engagement: 72 },
          { month: 'Mar', engagement: 78 },
          { month: 'Apr', engagement: 85 },
          { month: 'May', engagement: 92 }
        ],
        linkedTo: 'milestone-2',
        createdDate: new Date('2024-09-01'),
        tags: ['metrics', 'engagement', 'trends']
      },
      {
        id: 'data-2',
        title: 'Revenue by Customer Segment',
        type: 'table',
        data: [
          { segment: 'Enterprise', revenue: 450000, customers: 12, avgDeal: 37500 },
          { segment: 'Mid-Market', revenue: 680000, customers: 85, avgDeal: 8000 },
          { segment: 'SMB', revenue: 320000, customers: 240, avgDeal: 1333 }
        ],
        linkedTo: 'task-8',
        createdDate: new Date('2024-08-30'),
        tags: ['revenue', 'segments', 'analysis']
      }
    ],
    chats: [
      {
        id: 'chat-1',
        title: 'AI Architecture Discussion',
        messageCount: 47,
        lastMessage: new Date('2024-09-02'),
        participants: ['John Doe', 'AI Assistant'],
        linkedTo: 'milestone-1',
        tags: ['architecture', 'planning'],
        keyInsights: [
          'Microservices approach recommended for scalability',
          'Redis for session management and caching',
          'PostgreSQL for primary data storage'
        ]
      },
      {
        id: 'chat-2',
        title: 'Feature Requirements Clarification',
        messageCount: 32,
        lastMessage: new Date('2024-09-01'),
        participants: ['Sarah Wilson', 'AI Assistant'],
        linkedTo: 'task-2',
        tags: ['requirements', 'features'],
        keyInsights: [
          'User dashboard needs real-time updates',
          'Mobile-first design approach',
          'Accessibility compliance required'
        ]
      }
    ]
  });

  // Helper functions
  const getFileIcon = (type) => {
    switch (type) {
      case 'pdf': return <FileText className="w-5 h-5 text-red-500" />;
      case 'docx': return <FileText className="w-5 h-5 text-blue-500" />;
      case 'text': return <File className="w-5 h-5 text-gray-500" />;
      case 'jupyter': return <Beaker className="w-5 h-5 text-orange-500" />;
      default: return <File className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'published': return 'bg-blue-100 text-blue-800';
      case 'draft': return 'bg-yellow-100 text-yellow-800';
      case 'running': return 'bg-purple-100 text-purple-800';
      case 'completed': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatFileSize = (bytes) => {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = parseInt(bytes.split(' ')[0]);
    let unitIndex = units.indexOf(bytes.split(' ')[1]);
    
    if (unitIndex === -1) return bytes;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  const formatTimeAgo = (date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const toggleCardExpansion = (id) => {
    const newExpanded = new Set(expandedCards);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedCards(newExpanded);
  };

  const DocumentCard = ({ doc }) => (
    <div className="card hover-lift">
      <div className="card-body">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            {getFileIcon(doc.type)}
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-slate-900 truncate">{doc.name}</h4>
              <div className="flex items-center gap-2 mt-1 text-sm text-slate-600">
                <span>{formatFileSize(doc.size)}</span>
                <span>•</span>
                <span>{formatTimeAgo(doc.uploadDate)}</span>
                <span>•</span>
                <span>v{doc.version}</span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(doc.status)}`}>
                  {doc.status}
                </span>
                {doc.tags.map(tag => (
                  <span key={tag} className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded">
                    {tag}
                  </span>
                ))}
              </div>
              {doc.preview && (
                <p className="text-sm text-slate-600 mt-2 line-clamp-2">{doc.preview}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 ml-3">
            <button className="p-1 hover:bg-slate-100 rounded">
              <Eye className="w-4 h-4 text-slate-600" />
            </button>
            <button className="p-1 hover:bg-slate-100 rounded">
              <Download className="w-4 h-4 text-slate-600" />
            </button>
            <button className="p-1 hover:bg-slate-100 rounded">
              <Share2 className="w-4 h-4 text-slate-600" />
            </button>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-slate-100 text-sm text-slate-500">
          <div className="flex items-center justify-between">
            <span>Uploaded by {doc.uploader}</span>
            <span>Linked to {doc.linkedTo}</span>
          </div>
        </div>
      </div>
    </div>
  );

  const ResearchCard = ({ research }) => (
    <div className="card hover-lift">
      <div className="card-body">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h4 className="font-medium text-slate-900">{research.title}</h4>
            <p className="text-sm text-slate-600 mt-2">{research.summary}</p>
            <div className="flex items-center gap-4 mt-3 text-sm text-slate-500">
              <span>{research.citations} citations</span>
              <span>Confidence: {Math.round(research.confidence * 100)}%</span>
              <span>{formatTimeAgo(research.createdDate)}</span>
            </div>
            <div className="flex items-center gap-2 mt-2">
              {research.tags.map(tag => (
                <span key={tag} className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded">
                  {tag}
                </span>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-1 ml-3">
            <button className="p-1 hover:bg-slate-100 rounded">
              <ExternalLink className="w-4 h-4 text-slate-600" />
            </button>
            <button className="p-1 hover:bg-slate-100 rounded">
              <Copy className="w-4 h-4 text-slate-600" />
            </button>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-slate-100 text-sm text-slate-500">
          Generated by {research.author} • Linked to {research.linkedTo}
        </div>
      </div>
    </div>
  );

  const NotebookCard = ({ notebook }) => (
    <div className="card hover-lift">
      <div className="card-body">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            <Beaker className="w-5 h-5 text-orange-500" />
            <div className="flex-1">
              <h4 className="font-medium text-slate-900">{notebook.name}</h4>
              <div className="flex items-center gap-4 mt-1 text-sm text-slate-600">
                <span>{notebook.cells} cells</span>
                <span>{notebook.outputs} outputs</span>
                <span>Runtime: {notebook.runtime}</span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(notebook.status)}`}>
                  {notebook.status}
                </span>
                {notebook.tags.map(tag => (
                  <span key={tag} className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button className="p-1 hover:bg-slate-100 rounded">
              <Play className="w-4 h-4 text-slate-600" />
            </button>
            <button className="p-1 hover:bg-slate-100 rounded">
              <Maximize2 className="w-4 h-4 text-slate-600" />
            </button>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-slate-100 text-sm text-slate-500">
          <div className="flex items-center justify-between">
            <span>By {notebook.author}</span>
            <span>Last run {formatTimeAgo(notebook.lastRun)}</span>
          </div>
        </div>
      </div>
    </div>
  );

  const CodeCard = ({ code }) => {
    const isExpanded = expandedCards.has(code.id);
    
    return (
      <div className="card hover-lift">
        <div className="card-body">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h4 className="font-medium text-slate-900">{code.title}</h4>
              <p className="text-sm text-slate-600 mt-1">{code.explanation}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                  {code.language}
                </span>
                {code.tags.map(tag => (
                  <span key={tag} className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button 
                className="p-1 hover:bg-slate-100 rounded"
                onClick={() => toggleCardExpansion(code.id)}
              >
                {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
              <button className="p-1 hover:bg-slate-100 rounded">
                <Copy className="w-4 h-4 text-slate-600" />
              </button>
            </div>
          </div>
          
          {isExpanded && (
            <div className="mt-4">
              <div className="bg-slate-900 rounded-lg p-4 overflow-x-auto">
                <pre className="text-sm text-green-400">
                  <code>{code.code}</code>
                </pre>
              </div>
            </div>
          )}
          
          <div className="mt-3 pt-3 border-t border-slate-100 text-sm text-slate-500">
            <div className="flex items-center justify-between">
              <span>Generated by {code.author}</span>
              <span>{formatTimeAgo(code.createdDate)} • Linked to {code.linkedTo}</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const DataCard = ({ data }) => (
    <div className="card hover-lift">
      <div className="card-body">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h4 className="font-medium text-slate-900">{data.title}</h4>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs bg-purple-100 text-purple-600 px-2 py-1 rounded">
                {data.type}
              </span>
              {data.tags.map(tag => (
                <span key={tag} className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded">
                  {tag}
                </span>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button className="p-1 hover:bg-slate-100 rounded">
              <BarChart3 className="w-4 h-4 text-slate-600" />
            </button>
            <button className="p-1 hover:bg-slate-100 rounded">
              <Download className="w-4 h-4 text-slate-600" />
            </button>
          </div>
        </div>
        
        {/* Sample data visualization preview */}
        <div className="mt-4 p-3 bg-slate-50 rounded-lg">
          {data.type === 'chart' && (
            <div className="h-32 flex items-end justify-between gap-1">
              {data.data.map((item, index) => (
                <div key={index} className="flex-1 bg-blue-500 rounded-t" style={{height: `${item.engagement}%`}}>
                  <div className="text-xs text-center text-white pt-1">{item.month}</div>
                </div>
              ))}
            </div>
          )}
          {data.type === 'table' && (
            <div className="text-sm">
              <div className="grid grid-cols-4 gap-2 font-medium text-slate-700 mb-2">
                <span>Segment</span>
                <span>Revenue</span>
                <span>Customers</span>
                <span>Avg Deal</span>
              </div>
              {data.data.slice(0, 2).map((row, index) => (
                <div key={index} className="grid grid-cols-4 gap-2 text-slate-600">
                  <span>{row.segment}</span>
                  <span>${row.revenue.toLocaleString()}</span>
                  <span>{row.customers}</span>
                  <span>${row.avgDeal.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="mt-3 pt-3 border-t border-slate-100 text-sm text-slate-500">
          <div className="flex items-center justify-between">
            <span>Created {formatTimeAgo(data.createdDate)}</span>
            <span>Linked to {data.linkedTo}</span>
          </div>
        </div>
      </div>
    </div>
  );

  const ChatCard = ({ chat }) => (
    <div className="card hover-lift">
      <div className="card-body">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h4 className="font-medium text-slate-900">{chat.title}</h4>
            <div className="flex items-center gap-4 mt-1 text-sm text-slate-600">
              <span>{chat.messageCount} messages</span>
              <span>{chat.participants.join(', ')}</span>
            </div>
            <div className="flex items-center gap-2 mt-2">
              {chat.tags.map(tag => (
                <span key={tag} className="text-xs bg-green-100 text-green-600 px-2 py-1 rounded">
                  {tag}
                </span>
              ))}
            </div>
            {chat.keyInsights && (
              <div className="mt-3 p-3 bg-yellow-50 rounded-lg">
                <h5 className="text-sm font-medium text-yellow-800 mb-2">Key Insights:</h5>
                <ul className="text-sm text-yellow-700 space-y-1">
                  {chat.keyInsights.slice(0, 2).map((insight, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="w-1 h-1 bg-yellow-600 rounded-full mt-2 flex-shrink-0"></span>
                      {insight}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button className="p-1 hover:bg-slate-100 rounded">
              <MessageCircle className="w-4 h-4 text-slate-600" />
            </button>
            <button className="p-1 hover:bg-slate-100 rounded">
              <ExternalLink className="w-4 h-4 text-slate-600" />
            </button>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-slate-100 text-sm text-slate-500">
          <div className="flex items-center justify-between">
            <span>Last message {formatTimeAgo(chat.lastMessage)}</span>
            <span>Linked to {chat.linkedTo}</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'documents':
        return (
          <div className="space-y-4">
            {integrations.documents.map(doc => (
              <DocumentCard key={doc.id} doc={doc} />
            ))}
          </div>
        );
      case 'research':
        return (
          <div className="space-y-4">
            {integrations.research.map(research => (
              <ResearchCard key={research.id} research={research} />
            ))}
          </div>
        );
      case 'notebooks':
        return (
          <div className="space-y-4">
            {integrations.notebooks.map(notebook => (
              <NotebookCard key={notebook.id} notebook={notebook} />
            ))}
          </div>
        );
      case 'code':
        return (
          <div className="space-y-4">
            {integrations.code.map(code => (
              <CodeCard key={code.id} code={code} />
            ))}
          </div>
        );
      case 'data':
        return (
          <div className="space-y-4">
            {integrations.data.map(data => (
              <DataCard key={data.id} data={data} />
            ))}
          </div>
        );
      case 'chats':
        return (
          <div className="space-y-4">
            {integrations.chats.map(chat => (
              <ChatCard key={chat.id} chat={chat} />
            ))}
          </div>
        );
      default:
        return null;
    }
  };

  const tabConfig = [
    { id: 'documents', label: 'Documents', icon: FileText, count: integrations.documents.length },
    { id: 'research', label: 'Research', icon: BookOpen, count: integrations.research.length },
    { id: 'notebooks', label: 'Notebooks', icon: Beaker, count: integrations.notebooks.length },
    { id: 'code', label: 'Code', icon: Code, count: integrations.code.length },
    { id: 'data', label: 'Data Analysis', icon: BarChart3, count: integrations.data.length },
    { id: 'chats', label: 'AI Chats', icon: MessageCircle, count: integrations.chats.length }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-slate-600">
              <span>Projects</span>
              <ChevronRight className="w-4 h-4" />
              <span className="font-semibold text-slate-900">{projectData.name}</span>
              <ChevronRight className="w-4 h-4" />
              <span className="text-purple-600">AI Module Links</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search integrations..."
                className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 w-64"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button className="btn btn-ghost btn-sm">
              <Settings className="w-4 h-4" />
              Settings
            </button>
          </div>
        </div>
      </div>

      <div className="px-6 py-6">
        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="card hover-lift">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Total Integrations</p>
                  <p className="text-2xl font-bold text-slate-900">{projectData.totalIntegrations}</p>
                </div>
                <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center">
                  <Brain className="w-6 h-6 text-white" />
                </div>
              </div>
              <div className="mt-2">
                <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">
                  +{projectData.recentUploads} this week
                </span>
              </div>
            </div>
          </div>

          <div className="card hover-lift">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Documents</p>
                  <p className="text-2xl font-bold text-slate-900">{integrations.documents.length}</p>
                </div>
                <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                  <FileText className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          </div>

          <div className="card hover-lift">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">AI Outputs</p>
                  <p className="text-2xl font-bold text-slate-900">{integrations.research.length + integrations.code.length}</p>
                </div>
                <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
                  <Cpu className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          </div>

          <div className="card hover-lift">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Storage Used</p>
                  <p className="text-2xl font-bold text-slate-900">{projectData.totalStorage}</p>
                </div>
                <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center">
                  <Database className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions Bar */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <h3 className="font-semibold text-slate-900">Quick Actions</h3>
            <div className="flex items-center gap-2 flex-wrap">
              <button 
                className="btn btn-primary btn-sm"
                onClick={() => setShowUploadModal(true)}
              >
                <Upload className="w-4 h-4" />
                Upload Document
              </button>
              <button className="btn btn-outline btn-sm">
                <Link className="w-4 h-4" />
                Link Research
              </button>
              <button className="btn btn-outline btn-sm">
                <Beaker className="w-4 h-4" />
                Add Notebook
              </button>
              <button className="btn btn-outline btn-sm">
                <Code className="w-4 h-4" />
                Save Snippet
              </button>
              <button className="btn btn-outline btn-sm">
                <BarChart3 className="w-4 h-4" />
                Attach Analysis
              </button>
              <button className="btn btn-outline btn-sm">
                <MessageCircle className="w-4 h-4" />
                Link Chat
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-3">
            <div className="card">
              {/* Tab Navigation */}
              <div className="border-b border-slate-200">
                <div className="flex items-center overflow-x-auto">
                  {tabConfig.map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                          activeTab === tab.id
                            ? 'border-purple-500 text-purple-600'
                            : 'border-transparent text-slate-600 hover:text-slate-900'
                        }`}
                        onClick={() => setActiveTab(tab.id)}
                      >
                        <Icon className="w-4 h-4" />
                        {tab.label}
                        <span className="bg-slate-100 text-slate-600 text-xs px-2 py-1 rounded-full">
                          {tab.count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tab Content */}
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-slate-900">
                    {tabConfig.find(t => t.id === activeTab)?.label}
                  </h3>
                  <div className="flex items-center gap-2">
                    <select
                      className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500"
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value)}
                    >
                      <option value="all">All Types</option>
                      <option value="recent">Recently Added</option>
                      <option value="linked">Linked to Tasks</option>
                    </select>
                    <button className="btn btn-ghost btn-sm">
                      <Filter className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                {renderTabContent()}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            {/* Recent Activity */}
            <div className="card mb-6">
              <div className="card-header">
                <h3 className="card-title">Recent Activity</h3>
              </div>
              <div className="card-body">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                      <FileText className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-900">Document uploaded</p>
                      <p className="text-xs text-slate-500">API Documentation.md • 2h ago</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                      <Beaker className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-900">Notebook executed</p>
                      <p className="text-xs text-slate-500">Customer Data Analysis • 4h ago</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                      <Code className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-900">Code snippet saved</p>
                      <p className="text-xs text-slate-500">Authentication Service • 6h ago</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                      <BookOpen className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-900">Research generated</p>
                      <p className="text-xs text-slate-500">Literature Review • 1d ago</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* AI Suggestions */}
            <div className="card">
              <div className="card-header">
                <h3 className="card-title flex items-center gap-2">
                  <Zap className="w-5 h-5 text-yellow-500" />
                  AI Suggestions
                </h3>
              </div>
              <div className="card-body">
                <div className="space-y-4">
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <Link className="w-5 h-5 text-blue-500 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-blue-800">Missing Link</h4>
                        <p className="text-sm text-blue-700 mt-1">
                          Consider linking the API documentation to Task-7 (Authentication).
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <TrendingUp className="w-5 h-5 text-green-500 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-green-800">Pattern Detected</h4>
                        <p className="text-sm text-green-700 mt-1">
                          Your team frequently references customer segmentation. Create a dedicated research folder?
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-orange-500 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-orange-800">Update Available</h4>
                        <p className="text-sm text-orange-700 mt-1">
                          ML Model Training notebook has newer results. Consider updating the linked milestone.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">Upload Document</h3>
              <button 
                onClick={() => setShowUploadModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center">
                <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-600 mb-2">Drag and drop files here, or click to browse</p>
                <p className="text-sm text-slate-500">Supports PDF, DOCX, TXT files up to 10MB</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.docx,.txt,.md"
                  multiple
                />
                <button 
                  className="btn btn-outline btn-sm mt-3"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Choose Files
                </button>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Link to Task/Milestone
                </label>
                <select className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500">
                  <option value="">Select a task or milestone</option>
                  <option value="task-1">Requirements Analysis</option>
                  <option value="task-2">UI/UX Design</option>
                  <option value="milestone-1">Project Kickoff</option>
                  <option value="milestone-2">Alpha Release</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Tags (optional)
                </label>
                <input
                  type="text"
                  placeholder="Add tags separated by commas"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
            
            <div className="flex items-center justify-end gap-3 mt-6">
              <button 
                onClick={() => setShowUploadModal(false)}
                className="btn btn-ghost"
              >
                Cancel
              </button>
              <button className="btn btn-primary">
                <Upload className="w-4 h-4" />
                Upload Files
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIIntegrationsDashboard;