import React, { useState, useEffect } from 'react';
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
  Activity
} from 'lucide-react';

const GitHubReposWorkspace = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [expandedFolders, setExpandedFolders] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBy, setFilterBy] = useState('recent');
  const [aiQuery, setAiQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [aiInsights, setAiInsights] = useState(null);

  // Mock data for demonstration
  const mockRepos = [
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

  const mockFileStructure = {
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
  trend: number;
}

const Dashboard: React.FC = () => {
  const [data, setData] = useState<DataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Fetch dashboard data
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/dashboard');
      const result = await response.json();
      setData(result.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="dashboard">
      <h2 className="text-2xl font-bold mb-6">Analytics Dashboard</h2>
      {isLoading ? (
        <div className="loading">Loading...</div>
      ) : (
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="value" fill="#7B3FE4" />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};

export default Dashboard;`;

  const handleConnectGitHub = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsConnected(true);
      setIsLoading(false);
    }, 2000);
  };

  const handleRepoSelect = (repo) => {
    setSelectedRepo(repo);
    setSelectedFile(null);
    // Generate AI insights for the selected repo
    setTimeout(() => {
      setAiInsights({
        summary: `${repo.name} is a well-structured ${repo.language} project with strong community engagement. The codebase follows modern best practices with clean architecture.`,
        healthScore: 85,
        suggestions: [
          'Consider updating dependencies to latest versions',
          'Add more comprehensive test coverage',
          'Implement CI/CD pipeline improvements'
        ]
      });
    }, 1000);
  };

  const toggleFolder = (path) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedFolders(newExpanded);
  };

  const renderFileTree = (structure, path = '') => {
    return Object.entries(structure).map(([name, item]) => {
      const fullPath = path + name;
      const isFolder = item.type === 'folder';
      const isExpanded = expandedFolders.has(fullPath);

      return (
        <div key={fullPath} className="select-none">
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-slate-50 cursor-pointer transition-all duration-200 ${
              selectedFile === fullPath ? 'bg-purple-50 text-purple-700' : 'text-slate-700'
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
              isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />
            ) : (
              <File size={16} className="ml-4" />
            )}
            {isFolder ? <FolderOpen size={16} /> : <File size={16} />}
            <span className="text-sm">{name}</span>
            {!isFolder && (
              <span className="text-xs text-slate-500 ml-auto">{item.size}</span>
            )}
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

  const getLanguageColor = (language) => {
    const colors = {
      Python: '#3776ab',
      TypeScript: '#3178c6',
      JavaScript: '#f7df1e',
      React: '#61dafb',
      Go: '#00add8',
      Rust: '#ce422b'
    };
    return colors[language] || '#6b7280';
  };

  const filteredRepos = mockRepos.filter(repo =>
    repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    repo.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-white">
        {/* Header */}
        <div className="border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
          <div className="container-premium py-4">
            <div className="flex items-center justify-between">
              <h1 className="heading-md flex items-center gap-3">
                <Github className="text-slate-700" size={32} />
                GitHub Repositories
              </h1>
            </div>
          </div>
        </div>

        {/* Connection State */}
        <div className="container-premium py-20">
          <div className="max-w-2xl mx-auto text-center">
            <div className="glass-strong p-12 rounded-3xl animate-scale-in">
              <div className="w-20 h-20 mx-auto mb-8 rounded-2xl gradient-ai flex items-center justify-center animate-float">
                <Github size={40} className="text-white" />
              </div>
              
              <h2 className="heading-lg mb-4 gradient-text">
                Connect Your GitHub Account
              </h2>
              
              <p className="text-body text-slate-600 mb-8 max-w-md mx-auto">
                Seamlessly integrate your GitHub repositories with AI-powered insights, 
                file exploration, and collaborative workspace features.
              </p>

              <button
                onClick={handleConnectGitHub}
                disabled={isLoading}
                className="btn btn-primary btn-lg hover-lift"
              >
                {isLoading ? (
                  <>
                    <RefreshCw size={20} className="animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Github size={20} />
                    Connect with GitHub
                  </>
                )}
              </button>

              <div className="mt-8 flex items-center justify-center gap-8 text-sm text-slate-500">
                <div className="flex items-center gap-2">
                  <Shield size={16} />
                  Secure OAuth
                </div>
                <div className="flex items-center gap-2">
                  <Eye size={16} />
                  Read-only Access
                </div>
                <div className="flex items-center gap-2">
                  <Zap size={16} />
                  Instant Setup
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container-premium py-4">
          <div className="flex items-center justify-between">
            <h1 className="heading-md flex items-center gap-3">
              <Github className="text-slate-700" size={32} />
              GitHub Repositories
            </h1>
            
            <div className="flex items-center gap-3">
              <button className="btn btn-secondary btn-sm">
                <RefreshCw size={16} />
                Refresh
              </button>
              <div className="flex items-center gap-2 px-3 py-2 bg-green-50 rounded-lg text-green-700 text-sm">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                Connected
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container-premium py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-[calc(100vh-200px)]">
          {/* Left Panel - Repository List */}
          <div className="lg:col-span-1">
            <div className="card h-full flex flex-col">
              <div className="card-header">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="heading-sm">Repositories</h2>
                  <div className="flex items-center gap-2">
                    <select
                      value={filterBy}
                      onChange={(e) => setFilterBy(e.target.value)}
                      className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                    >
                      <option value="recent">Recent</option>
                      <option value="stars">Most Stars</option>
                      <option value="name">Name</option>
                    </select>
                  </div>
                </div>
                
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search repositories..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all duration-200"
                  />
                </div>
              </div>

              <div className="card-body flex-1 overflow-y-auto space-y-3">
                {filteredRepos.map((repo) => (
                  <div
                    key={repo.id}
                    onClick={() => handleRepoSelect(repo)}
                    className={`p-4 rounded-xl cursor-pointer transition-all duration-200 hover-lift ${
                      selectedRepo?.id === repo.id
                        ? 'bg-purple-50 border-2 border-purple-200'
                        : 'bg-slate-50 border border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Github size={16} className="text-slate-600" />
                        <h3 className="font-semibold text-slate-900">{repo.name}</h3>
                        {repo.isPrivate && (
                          <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded-full">
                            Private
                          </span>
                        )}
                      </div>
                    </div>

                    <p className="text-sm text-slate-600 mb-3 line-clamp-2">
                      {repo.description}
                    </p>

                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: getLanguageColor(repo.language) }}
                          />
                          {repo.language}
                        </div>
                        <div className="flex items-center gap-1">
                          <Star size={12} />
                          {repo.stars}
                        </div>
                        <div className="flex items-center gap-1">
                          <GitFork size={12} />
                          {repo.forks}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock size={12} />
                        {repo.lastCommit}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Panel - Repository Details */}
          <div className="lg:col-span-2">
            {selectedRepo ? (
              <div className="card h-full flex flex-col">
                {/* Repo Header */}
                <div className="card-header border-b border-slate-100">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h2 className="heading-sm flex items-center gap-2">
                        {selectedRepo.name}
                        <ExternalLink size={16} className="text-slate-400" />
                      </h2>
                      <p className="text-slate-600 mt-1">{selectedRepo.description}</p>
                    </div>
                    
                    <select className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm">
                      <option>main</option>
                      <option>develop</option>
                      <option>feature/ai-integration</option>
                    </select>
                  </div>

                  {/* Stats Cards */}
                  <div className="grid grid-cols-4 gap-3 mb-4">
                    <div className="bg-slate-50 rounded-lg p-3 text-center">
                      <div className="text-lg font-semibold text-slate-900">{selectedRepo.commits}</div>
                      <div className="text-xs text-slate-500">Commits</div>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3 text-center">
                      <div className="text-lg font-semibold text-slate-900">{selectedRepo.branches}</div>
                      <div className="text-xs text-slate-500">Branches</div>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3 text-center">
                      <div className="text-lg font-semibold text-slate-900">{selectedRepo.contributors}</div>
                      <div className="text-xs text-slate-500">Contributors</div>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3 text-center">
                      <div className="text-lg font-semibold text-slate-900">{selectedRepo.issues.open}</div>
                      <div className="text-xs text-slate-500">Open Issues</div>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="flex items-center gap-2">
                    <button className="btn btn-primary btn-sm">
                      <Code size={16} />
                      Open in AI Code Editor
                    </button>
                    <button className="btn btn-secondary btn-sm">
                      <BarChart3 size={16} />
                      Send to Data Analysis
                    </button>
                    <button className="btn btn-outline btn-sm">
                      <Sparkles size={16} />
                      AI Repo Summary
                    </button>
                  </div>
                </div>

                <div className="card-body flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 overflow-hidden">
                  {/* File Explorer */}
                  <div className="flex flex-col">
                    <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                      <FolderOpen size={18} />
                      File Explorer
                    </h3>
                    
                    <div className="bg-slate-50 rounded-xl p-3 flex-1 overflow-y-auto">
                      {renderFileTree(mockFileStructure)}
                    </div>

                    {selectedFile && (
                      <div className="mt-3 flex items-center gap-2">
                        <button className="btn btn-ghost btn-sm">
                          <Sparkles size={14} />
                          Explain
                        </button>
                        <button className="btn btn-ghost btn-sm">
                          <FileText size={14} />
                          Docs
                        </button>
                        <button className="btn btn-ghost btn-sm">
                          <RotateCcw size={14} />
                          Refactor
                        </button>
                        <button className="btn btn-ghost btn-sm">
                          <Play size={14} />
                          Run
                        </button>
                      </div>
                    )}
                  </div>

                  {/* File Preview / AI Insights */}
                  <div className="flex flex-col">
                    {selectedFile ? (
                      <>
                        <h3 className="font-semibold text-slate-900 mb-3">
                          {selectedFile}
                        </h3>
                        <div className="bg-slate-900 rounded-xl p-4 flex-1 overflow-y-auto">
                          <pre className="text-sm text-slate-300 font-mono leading-relaxed">
                            <code>{sampleCode}</code>
                          </pre>
                        </div>
                      </>
                    ) : aiInsights ? (
                      <>
                        <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                          <Sparkles size={18} />
                          AI Repository Insights
                        </h3>
                        
                        <div className="space-y-4 flex-1 overflow-y-auto">
                          {/* Health Score */}
                          <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-4">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium">Repository Health</span>
                              <span className="text-2xl font-bold text-green-600">
                                {aiInsights.healthScore}%
                              </span>
                            </div>
                            <div className="w-full bg-slate-200 rounded-full h-2">
                              <div
                                className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full"
                                style={{ width: `${aiInsights.healthScore}%` }}
                              />
                            </div>
                          </div>

                          {/* Summary */}
                          <div className="bg-slate-50 rounded-xl p-4">
                            <h4 className="font-medium mb-2">Summary</h4>
                            <p className="text-sm text-slate-600">{aiInsights.summary}</p>
                          </div>

                          {/* Suggestions */}
                          <div className="bg-purple-50 rounded-xl p-4">
                            <h4 className="font-medium mb-3 text-purple-900">AI Suggestions</h4>
                            <div className="space-y-2">
                              {aiInsights.suggestions.map((suggestion, index) => (
                                <div key={index} className="flex items-start gap-2 text-sm">
                                  <Sparkles size={14} className="text-purple-600 mt-0.5" />
                                  <span className="text-purple-800">{suggestion}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Dependencies */}
                          <div className="bg-orange-50 rounded-xl p-4">
                            <h4 className="font-medium mb-3 text-orange-900 flex items-center gap-2">
                              <Package size={16} />
                              Dependencies
                            </h4>
                            <div className="space-y-2 text-sm">
                              <div className="flex items-center justify-between">
                                <span>react</span>
                                <span className="px-2 py-1 bg-green-100 text-green-700 rounded">18.2.0</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span>typescript</span>
                                <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded">4.9.0</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span>lodash</span>
                                <span className="px-2 py-1 bg-red-100 text-red-700 rounded">4.17.0</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="flex items-center justify-center h-full text-slate-400">
                        <div className="text-center">
                          <File size={48} className="mx-auto mb-4" />
                          <p>Select a file to preview or view AI insights</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="card h-full flex items-center justify-center text-slate-400">
                <div className="text-center">
                  <Github size={48} className="mx-auto mb-4" />
                  <p>Select a repository to view details</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Console */}
        {selectedRepo && (
          <div className="mt-8 card animate-slide-up">
            <div className="card-body">
              <div className="flex items-center gap-4">
                <div className="flex-1 relative">
                  <MessageSquare size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Ask about this repository... (e.g., 'Explain the architecture' or 'Find security vulnerabilities')"
                    value={aiQuery}
                    onChange={(e) => setAiQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all duration-200"
                  />
                </div>
                
                <button className="btn btn-primary">
                  <Play size={16} />
                  Run
                </button>
                
                <button className="btn btn-secondary">
                  <Save size={16} />
                  Save
                </button>
                
                <button className="btn btn-ghost">
                  <Download size={16} />
                  Export
                </button>
              </div>

              <div className="mt-3 flex items-center gap-4 text-sm text-slate-500">
                <span>Try: "Summarize utils.py"</span>
                <span>•</span>
                <span>"Find all API calls"</span>
                <span>•</span>
                <span>"Generate documentation"</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Floating Action Button */}
      <div className="fixed bottom-8 right-8 z-50">
        <div className="relative group">
          <button className="w-14 h-14 gradient-ai rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover-lift flex items-center justify-center">
            <Plus size={24} className="text-white" />
          </button>
          
          {/* Quick Actions Menu */}
          <div className="absolute bottom-16 right-0 w-64 glass-strong rounded-xl p-4 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 transform group-hover:translate-y-0 translate-y-2">
            <div className="space-y-2">
              <button className="w-full flex items-center gap-3 px-3 py-2 hover:bg-white/20 rounded-lg transition-colors">
                <Activity size={16} />
                <span className="text-sm">Clean Dataset</span>
              </button>
              <button className="w-full flex items-center gap-3 px-3 py-2 hover:bg-white/20 rounded-lg transition-colors">
                <BarChart3 size={16} />
                <span className="text-sm">Generate Visualization</span>
              </button>
              <button className="w-full flex items-center gap-3 px-3 py-2 hover:bg-white/20 rounded-lg transition-colors">
                <Search size={16} />
                <span className="text-sm">Find Correlations</span>
              </button>
              <button className="w-full flex items-center gap-3 px-3 py-2 hover:bg-white/20 rounded-lg transition-colors">
                <Sparkles size={16} />
                <span className="text-sm">Auto-Summarize</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GitHubReposWorkspace;