'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Search, 
  RefreshCw, 
  Star, 
  GitFork, 
  Clock, 
  Github, 
  ExternalLink,
  FolderOpen,
  File,
  ChevronRight,
  ChevronDown,
  Play,
  Code,
  BarChart3,
  Sparkles,
  FileText,
  RotateCcw,
  Users,
  GitBranch,
  GitCommit,
  AlertCircle,
  Plus,
  Filter,
  Eye,
  Download,
  Save,
  MessageSquare,
  Zap,
  Shield,
  Package,
  Activity,
  Book,
  History
} from 'lucide-react';

// Type Definitions
interface GitHubRepo {
  id: number;
  name: string;
  description: string;
  language: string;
  stars: number;
  forks: number;
  lastCommit: string;
  isPrivate: boolean;
  commits: number;
  branches: number;
  contributors: number;
  issues: { open: number; closed: number };
}

interface AIInsights {
  summary: string;
  healthScore: number;
  suggestions: string[];
}

interface FileNode {
  type: 'file';
  size: string;
  language: string;
}

interface FolderNode {
  type: 'folder';
  children: { [key: string]: FileNode | FolderNode };
}

type FileStructure = { [key: string]: FileNode | FolderNode };

// Mock data moved outside the component
const mockRepos: GitHubRepo[] = [
  {
    id: 1,
    name: 'awesome-ai-toolkit',
    description: 'A comprehensive AI toolkit with ML models, data preprocessing utilities, and deployment tools',
    language: 'Python',
    stars: 1247,
    forks: 89,
    lastCommit: '2 hours ago',
    isPrivate: false,
    commits: 342,
    branches: 8,
    contributors: 12,
    issues: { open: 5, closed: 23 }
  },
  {
    id: 2,
    name: 'react-dashboard-pro',
    description: 'Premium React dashboard with advanced components and dark mode support',
    language: 'TypeScript',
    stars: 892,
    forks: 156,
    lastCommit: '5 hours ago',
    isPrivate: false,
    commits: 178,
    branches: 4,
    contributors: 6,
    issues: { open: 2, closed: 15 }
  },
  {
    id: 3,
    name: 'data-viz-engine',
    description: 'High-performance data visualization engine with D3.js and WebGL acceleration',
    language: 'JavaScript',
    stars: 634,
    forks: 78,
    lastCommit: '1 day ago',
    isPrivate: true,
    commits: 89,
    branches: 3,
    contributors: 4,
    issues: { open: 8, closed: 12 }
  }
];

const mockFileStructure: FileStructure = {
  'src/': {
    type: 'folder',
    children: {
      'components/': {
        type: 'folder',
        children: {
          'Dashboard.tsx': { type: 'file', size: '12.3 KB', language: 'typescript' },
          'Charts.tsx': { type: 'file', size: '8.7 KB', language: 'typescript' },
          'AIAssistant.tsx': { type: 'file', size: '15.2 KB', language: 'typescript' }
        }
      },
      'utils/': {
        type: 'folder',
        children: {
          'api.ts': { type: 'file', size: '5.4 KB', language: 'typescript' },
          'helpers.ts': { type: 'file', size: '3.8 KB', language: 'typescript' }
        }
      },
      'App.tsx': { type: 'file', size: '4.2 KB', language: 'typescript' }
    }
  },
  'package.json': { type: 'file', size: '2.1 KB', language: 'json' },
  'README.md': { type: 'file', size: '1.8 KB', language: 'markdown' },
  'tsconfig.json': { type: 'file', size: '0.9 KB', language: 'json' }
};

const sampleCode = `import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface DataPoint {
  name: string;
  value: number;
}

const Dashboard: React.FC = () => {
  const [data, setData] = useState<DataPoint[]>([]);

  useEffect(() => {
    // Fetch dashboard data
    const fetchData = async () => {
      const response = await fetch('/api/dashboard');
      const result = await response.json();
      setData(result.data);
    };
    fetchData();
  }, []);

  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold mb-4">Project Analytics</h2>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="value" fill="#8884d8" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default Dashboard;`;

const GitHubReposWorkspace = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepo | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState(new Set<string>());
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBy, setFilterBy] = useState('recent');
  const [aiQuery, setAiQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [aiInsights, setAiInsights] = useState<AIInsights | null>(null);

  useEffect(() => {
    // Pre-select the first repo on load for demonstration
    if (isConnected && mockRepos.length > 0) {
      handleRepoSelect(mockRepos[0]);
    }
  }, [isConnected]);

  const handleConnectGitHub = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsConnected(true);
      setIsLoading(false);
    }, 1500);
  };

  const handleRepoSelect = (repo: GitHubRepo) => {
    setSelectedRepo(repo);
    setSelectedFile(null);
    setAiInsights(null);
    setTimeout(() => {
      setAiInsights({
        summary: `${repo.name} is a well-structured ${repo.language} project with strong community engagement. The codebase follows modern best practices with clean architecture and a comprehensive test suite.`,
        healthScore: Math.floor(Math.random() * (95 - 80 + 1) + 80), // Random score between 80-95
        suggestions: [
          'Update dependencies to their latest stable versions.',
          'Increase test coverage for utility functions.',
          'Refactor the main component to reduce complexity.'
        ]
      });
    }, 800);
  };

  const toggleFolder = (path: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedFolders(newExpanded);
  };

  const renderFileTree = (structure: FileStructure, path = '') => {
    return Object.entries(structure).map(([name, item]) => {
      const fullPath = path + name;
      const isFolder = item.type === 'folder';
      const isExpanded = expandedFolders.has(fullPath);

      return (
        <div key={fullPath} className="text-sm">
          <div
            className={`flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-slate-100 cursor-pointer transition-colors duration-150 ${
              selectedFile === fullPath ? 'bg-blue-50 text-blue-700' : 'text-slate-600'
            }`}
            onClick={() => {
              if (isFolder) {
                toggleFolder(fullPath);
              } else {
                setSelectedFile(fullPath);
              }
            }}
          >
            {isFolder ? (
              isExpanded ? <ChevronDown size={16} className="text-slate-500"/> : <ChevronRight size={16} className="text-slate-500"/>
            ) : (
              <div className="w-4"></div>
            )}
            {isFolder ? <FolderOpen size={16} className="text-slate-500" /> : <File size={16} className="text-slate-500" />}
            <span className="font-medium">{name}</span>
          </div>
          {isFolder && isExpanded && (
            <div className="ml-4 border-l border-slate-200 pl-2">
              {renderFileTree(item.children, fullPath)}
            </div>
          )}
        </div>
      );
    });
  };

  const getLanguageColor = (language: string) => {
    const colors: { [key: string]: string } = {
      Python: 'bg-blue-500',
      TypeScript: 'bg-sky-500',
      JavaScript: 'bg-yellow-400',
    };
    return colors[language] || 'bg-slate-400';
  };

  const filteredRepos = mockRepos.filter(repo =>
    repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    repo.description.toLowerCase().includes(searchQuery.toLowerCase())
  ).sort((a, b) => {
    if (filterBy === 'stars') return b.stars - a.stars;
    if (filterBy === 'name') return a.name.localeCompare(b.name);
    return 0; // 'recent' is default, but data is static
  });

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="bg-white p-10 border border-slate-200 rounded-2xl shadow-xl shadow-slate-200/50"
          >
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-slate-900 flex items-center justify-center">
              <Github size={32} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Connect GitHub Account</h1>
            <p className="text-slate-600 mb-8">
              Integrate your repositories to unlock AI-powered code analysis, summaries, and insights.
            </p>
            <button
              onClick={handleConnectGitHub}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white font-semibold py-3 px-4 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              {isLoading ? (
                <><RefreshCw size={20} className="animate-spin" /><span>Connecting...</span></>
              ) : (
                <><Github size={20} /><span>Connect with GitHub</span></>
              )}
            </button>
            <div className="mt-6 flex justify-center gap-6 text-xs text-slate-500">
              <span className="flex items-center gap-1.5"><Shield size={14} /> Secure Read-Only Access</span>
              <span className="flex items-center gap-1.5"><Zap size={14} /> Instant Integration</span>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-white/80 backdrop-blur-lg border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Github className="text-slate-800" size={28} />
              <h1 className="text-xl font-bold text-slate-800">GitHub Repositories</h1>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-emerald-600">
                <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                Connected
              </div>
              <button className="p-2 rounded-md hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors">
                <RefreshCw size={18} />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-screen-2xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="grid grid-cols-12 gap-8 items-start" style={{ height: 'calc(100vh - 11rem)' }}>
          {/* Left Panel - Repository List */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="col-span-3 h-full bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col"
          >
            <div className="p-4 border-b border-slate-200">
              <h2 className="font-bold text-lg text-slate-800 mb-4">Repositories</h2>
              <div className="flex items-center gap-2">
                <div className="relative flex-grow">
                  <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
                  />
                </div>
                <select
                  value={filterBy}
                  onChange={(e) => setFilterBy(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                >
                  <option value="recent">Recent</option>
                  <option value="stars">Stars</option>
                  <option value="name">Name</option>
                </select>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {filteredRepos.map((repo) => (
                <div
                  key={repo.id}
                  onClick={() => handleRepoSelect(repo)}
                  className={`p-3 rounded-lg cursor-pointer transition-colors duration-150 ${
                    selectedRepo?.id === repo.id
                      ? 'bg-blue-50'
                      : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-1">
                    <div className={`w-2.5 h-2.5 rounded-full ${getLanguageColor(repo.language)}`}></div>
                    <h3 className="font-semibold text-slate-800 text-sm truncate">{repo.name}</h3>
                    {repo.isPrivate && (
                      <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-md font-mono">Private</span>
                    )}
                  </div>
                  <p className="text-sm text-slate-500 mb-3 pl-5 line-clamp-2">
                    {repo.description}
                  </p>
                  <div className="flex items-center justify-between text-xs text-slate-500 pl-5">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1"><Star size={14} /> {repo.stars.toLocaleString()}</span>
                      <span className="flex items-center gap-1"><GitFork size={14} /> {repo.forks.toLocaleString()}</span>
                    </div>
                    <span className="flex items-center gap-1"><Clock size={14} /> {repo.lastCommit}</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Middle Panel - File Explorer & Insights */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
            className="col-span-5 h-full bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col"
          >
            {selectedRepo ? (
              <>
                <div className="p-4 border-b border-slate-200">
                  <div className="flex items-center justify-between">
                    <h2 className="font-bold text-lg text-slate-800 truncate">{selectedRepo.name}</h2>
                    <div className="flex items-center gap-2">
                      <select className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-md text-sm">
                        <option>main</option>
                        <option>develop</option>
                      </select>
                      <button className="p-2 rounded-md hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors">
                        <ExternalLink size={16} />
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-4 text-sm text-slate-500">
                      <span className="flex items-center gap-1.5"><GitCommit size={14}/> {selectedRepo.commits} commits</span>
                      <span className="flex items-center gap-1.5"><GitBranch size={14}/> {selectedRepo.branches} branches</span>
                      <span className="flex items-center gap-1.5"><Users size={14}/> {selectedRepo.contributors} contributors</span>
                      <span className="flex items-center gap-1.5"><AlertCircle size={14}/> {selectedRepo.issues.open} open issues</span>
                  </div>
                </div>
                <div className="flex-1 grid grid-cols-2 gap-px bg-slate-200 overflow-hidden">
                  <div className="bg-white p-3 overflow-y-auto">
                    <h3 className="font-semibold text-slate-800 mb-2 px-2">File Explorer</h3>
                    {renderFileTree(mockFileStructure)}
                  </div>
                  <div className="bg-slate-50/50 p-3 overflow-y-auto">
                    <h3 className="font-semibold text-slate-800 mb-2 px-2 flex items-center gap-2">
                      <Sparkles size={18} className="text-blue-500"/>
                      AI Repository Insights
                    </h3>
                    {aiInsights ? (
                      <div className="space-y-3">
                        <div className="bg-white border border-slate-200 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-semibold text-slate-700">Repository Health</span>
                            <span className="font-bold text-emerald-600">{aiInsights.healthScore}%</span>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-1.5">
                            <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${aiInsights.healthScore}%` }}/>
                          </div>
                        </div>
                        <div className="bg-white border border-slate-200 rounded-lg p-3">
                          <h4 className="font-semibold text-sm text-slate-700 mb-1">Summary</h4>
                          <p className="text-sm text-slate-600">{aiInsights.summary}</p>
                        </div>
                        <div className="bg-white border border-slate-200 rounded-lg p-3">
                          <h4 className="font-semibold text-sm text-slate-700 mb-2">Suggestions</h4>
                          <div className="space-y-1.5">
                            {aiInsights.suggestions.map((suggestion, index) => (
                              <div key={index} className="flex items-start gap-2 text-sm text-slate-600">
                                <ChevronRight size={14} className="text-blue-500 mt-0.5 flex-shrink-0" />
                                <span>{suggestion}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <RefreshCw className="w-6 h-6 text-slate-400 animate-spin" />
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-500">
                <div className="text-center">
                  <Github size={40} className="mx-auto mb-4" />
                  <p className="font-medium">Select a repository to begin</p>
                </div>
              </div>
            )}
          </motion.div>

          {/* Right Panel - Code & AI Chat */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, ease: "easeOut", delay: 0.2 }}
            className="col-span-4 h-full bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col"
          >
            {selectedFile ? (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="p-4 border-b border-slate-200">
                  <h3 className="font-semibold text-slate-800 truncate">{selectedFile}</h3>
                  <div className="mt-2 flex items-center gap-2">
                    <button className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-blue-600 bg-slate-100 hover:bg-blue-50 px-2 py-1 rounded-md transition-colors"><Sparkles size={14} /> Explain Code</button>
                    <button className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-blue-600 bg-slate-100 hover:bg-blue-50 px-2 py-1 rounded-md transition-colors"><Book size={14} /> Generate Docs</button>
                    <button className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-blue-600 bg-slate-100 hover:bg-blue-50 px-2 py-1 rounded-md transition-colors"><History size={14} /> View History</button>
                  </div>
                </div>
                <div className="flex-1 bg-slate-900 overflow-y-auto p-4">
                  <pre className="text-sm text-slate-300 font-mono leading-relaxed"><code>{sampleCode}</code></pre>
                </div>
                <div className="p-4 border-t border-slate-200">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder={`Ask AI about ${selectedFile}...`}
                      className="w-full pl-4 pr-10 py-2 bg-slate-100 border-transparent rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
                    />
                    <button className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-slate-900 text-white rounded-md hover:bg-slate-800">
                      <Play size={16} className="-mr-0.5"/>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-500">
                <div className="text-center">
                  <Code size={40} className="mx-auto mb-4" />
                  <p className="font-medium">Select a file to preview</p>
                  <p className="text-sm text-slate-400">Code and AI chat will appear here</p>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default GitHubReposWorkspace;