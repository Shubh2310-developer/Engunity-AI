'use client';

import React, { useState, useEffect } from 'react';
import { useUserContext } from '@/hooks/useUserContext';
import {
  getPersonalizedDashboard,
  type PersonalizedDashboard,
} from '@/lib/api/projects';
import {
  generateMockDashboard,
  shouldUseMockData,
  toggleMockDataMode,
} from '@/lib/mockData';
import { 
  ChevronRight, 
  GitBranch, 
  Database, 
  Activity, 
  Users, 
  Bot, 
  Star, 
  FileText, 
  Search, 
  Settings, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Code, 
  BarChart3, 
  Trophy,
  MessageSquare,
  Calendar,
  Target,
  Zap,
  GitCommit,
  Upload,
  Play,
  MoreVertical,
  ExternalLink,
  Download,
  RefreshCw,
  Filter,
  Plus,
  Eye,
  Share2
} from 'lucide-react';
import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';

const ProjectAnalysisWorkspace = () => {
  const user = useUserContext();
  const [activeSection, setActiveSection] = useState('overview');
  const [useMockData, setUseMockData] = useState(false);
  const [dashboard, setDashboard] = useState<PersonalizedDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  // Load user dashboard data
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const loadDashboard = async () => {
      setLoading(true);

      try {
        // Check if we should use mock data
        const shouldMock = shouldUseMockData();
        setUseMockData(shouldMock);

        if (shouldMock) {
          // Use mock data
          const mockDashboard = generateMockDashboard(user);
          setDashboard(mockDashboard);
          console.log('📊 Using mock data for user:', user.name);
        } else {
          // Fetch real data from backend
          try {
            const realDashboard = await getPersonalizedDashboard(user);
            setDashboard(realDashboard);
            console.log('✅ Loaded real dashboard for user:', user.name);
          } catch (apiError) {
            console.warn('⚠️ Backend unavailable, falling back to mock data:', apiError);
            // Fallback to mock data if backend is unavailable
            const mockDashboard = generateMockDashboard(user);
            setDashboard(mockDashboard);
            setUseMockData(true);
          }
        }
      } catch (err) {
        console.error('Error loading dashboard:', err);
        // Fallback to mock data on error
        const mockDashboard = generateMockDashboard(user);
        setDashboard(mockDashboard);
        setUseMockData(true);
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, [user]);

  // Toggle between mock and real data
  const handleToggleMockData = () => {
    const newValue = toggleMockDataMode();
    setUseMockData(newValue);
    // Reload dashboard with new mode
    window.location.reload();
  };

  // Mock data for demonstrations
  const experimentData = [
    { run: 'Exp#001', accuracy: 0.82, f1: 0.79, date: '2024-01-15' },
    { run: 'Exp#002', accuracy: 0.85, f1: 0.81, date: '2024-01-16' },
    { run: 'Exp#003', accuracy: 0.83, f1: 0.80, date: '2024-01-17' },
    { run: 'Exp#004', accuracy: 0.87, f1: 0.82, date: '2024-01-18' },
    { run: 'Exp#005', accuracy: 0.89, f1: 0.85, date: '2024-01-19' },
  ];

  const trainingData = [
    { epoch: 1, training: 0.65, validation: 0.62 },
    { epoch: 5, training: 0.78, validation: 0.75 },
    { epoch: 10, training: 0.85, validation: 0.82 },
    { epoch: 15, training: 0.89, validation: 0.87 },
    { epoch: 20, training: 0.92, validation: 0.89 },
  ];

  const repositories = [
    {
      name: 'ml-pipeline',
      language: 'Python',
      stars: 45,
      lastCommit: '2 hours ago',
      branches: 3,
      contributors: 4
    },
    {
      name: 'data-processing',
      language: 'Python',
      stars: 23,
      lastCommit: '1 day ago',
      branches: 2,
      contributors: 2
    }
  ];

  const datasets = [
    {
      name: 'customers_v3.csv',
      type: 'CSV',
      size: '45.2 MB',
      rows: '120,450',
      missingValues: 8.5,
      lastUpdated: '3 hours ago'
    },
    {
      name: 'features.parquet',
      type: 'Parquet',
      size: '128.7 MB',
      rows: '89,320',
      missingValues: 12.3,
      lastUpdated: '1 day ago'
    },
    {
      name: 'labels.json',
      type: 'JSON',
      size: '2.1 MB',
      rows: '15,670',
      missingValues: 0,
      lastUpdated: '2 days ago'
    }
  ];

  const teamMembers = [
    { name: 'Alex Chen', role: 'Owner', avatar: 'AC', status: 'online' },
    { name: 'Sarah Kim', role: 'Contributor', avatar: 'SK', status: 'online' },
    { name: 'Mike Ross', role: 'Contributor', avatar: 'MR', status: 'offline' },
    { name: 'Emma Wilson', role: 'Viewer', avatar: 'EW', status: 'online' }
  ];

  const ActivityFeed = () => (
    <div className="space-y-4">
      {[
        { action: 'Dataset uploaded', item: 'customers_v3.csv', user: 'Alex Chen', time: '2 hours ago', type: 'upload' },
        { action: 'Experiment completed', item: 'Exp#005', user: 'Sarah Kim', time: '3 hours ago', type: 'experiment' },
        { action: 'Code pushed', item: 'ml-pipeline', user: 'Mike Ross', time: '1 day ago', type: 'commit' },
        { action: 'AI analysis generated', item: 'Risk Report', user: 'System', time: '1 day ago', type: 'ai' }
      ].map((activity, idx) => (
        <div key={idx} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-100 hover:border-slate-200 transition-all duration-200">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            activity.type === 'upload' ? 'bg-blue-100 text-blue-600' :
            activity.type === 'experiment' ? 'bg-green-100 text-green-600' :
            activity.type === 'commit' ? 'bg-purple-100 text-purple-600' :
            'bg-orange-100 text-orange-600'
          }`}>
            {activity.type === 'upload' ? <Upload className="w-4 h-4" /> :
             activity.type === 'experiment' ? <Activity className="w-4 h-4" /> :
             activity.type === 'commit' ? <GitCommit className="w-4 h-4" /> :
             <Bot className="w-4 h-4" />}
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-900">{activity.action}</p>
            <p className="text-xs text-slate-500">{activity.item} • {activity.user} • {activity.time}</p>
          </div>
        </div>
      ))}
    </div>
  );

  const AIInsightCard = ({ type, title, message, severity = 'info' }: {
    type: string;
    title: string;
    message: string;
    severity?: 'info' | 'warning' | 'error' | 'success';
  }) => (
    <div className={`p-4 rounded-xl border ${
      severity === 'warning' ? 'bg-orange-50 border-orange-200' :
      severity === 'error' ? 'bg-red-50 border-red-200' :
      severity === 'success' ? 'bg-green-50 border-green-200' :
      'bg-blue-50 border-blue-200'
    } hover:shadow-md transition-all duration-200`}>
      <div className="flex items-start gap-3">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
          severity === 'warning' ? 'bg-orange-100 text-orange-600' :
          severity === 'error' ? 'bg-red-100 text-red-600' :
          severity === 'success' ? 'bg-green-100 text-green-600' :
          'bg-blue-100 text-blue-600'
        }`}>
          {severity === 'warning' ? <AlertTriangle className="w-4 h-4" /> :
           severity === 'error' ? <AlertTriangle className="w-4 h-4" /> :
           severity === 'success' ? <CheckCircle className="w-4 h-4" /> :
           <Bot className="w-4 h-4" />}
        </div>
        <div className="flex-1">
          <h4 className="font-medium text-slate-900 mb-1">{title}</h4>
          <p className="text-sm text-slate-600">{message}</p>
        </div>
      </div>
    </div>
  );

  const MetricCard = ({ title, value, change, icon: Icon, color = 'blue' }: {
    title: string;
    value: string | number;
    change?: string;
    icon: any;
    color?: 'blue' | 'green' | 'purple' | 'orange' | 'gray';
  }) => (
    <div className="bg-white rounded-xl p-6 border border-slate-100 hover:border-slate-200 hover:shadow-lg transition-all duration-300">
      <div className="flex items-center justify-between mb-4">
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${
          color === 'blue' ? 'from-blue-500 to-indigo-600' :
          color === 'green' ? 'from-green-500 to-emerald-600' :
          color === 'purple' ? 'from-purple-500 to-violet-600' :
          color === 'orange' ? 'from-orange-500 to-red-600' :
          'from-gray-500 to-slate-600'
        } flex items-center justify-center text-white shadow-lg`}>
          <Icon className="w-6 h-6" />
        </div>
        <div className={`px-2 py-1 rounded-full text-xs font-medium ${
          change?.startsWith('+') ? 'bg-green-100 text-green-700' :
          change?.startsWith('-') ? 'bg-red-100 text-red-700' :
          'bg-gray-100 text-gray-700'
        }`}>
          {change || 'N/A'}
        </div>
      </div>
      <h3 className="text-2xl font-bold text-slate-900 mb-1">{value}</h3>
      <p className="text-sm text-slate-600">{title}</p>
    </div>
  );

  const Sidebar = () => (
    <div className="w-64 bg-white border-r border-slate-200 h-full flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg">
            AI
          </div>
          <div>
            <h1 className="font-bold text-xl bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              DataForge
            </h1>
            <p className="text-xs text-slate-500">ML Platform</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {[
          { id: 'overview', label: 'Project Overview', icon: BarChart3 },
          { id: 'repositories', label: 'Repositories', icon: GitBranch },
          { id: 'datasets', label: 'Datasets', icon: Database },
          { id: 'experiments', label: 'Experiments', icon: Activity },
          { id: 'collaboration', label: 'Team', icon: Users },
          { id: 'insights', label: 'AI Insights', icon: Bot },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveSection(id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
              activeSection === id 
                ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg' 
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Icon className="w-5 h-5" />
            <span className="font-medium">{label}</span>
            {activeSection === id && <ChevronRight className="w-4 h-4 ml-auto" />}
          </button>
        ))}
      </nav>
    </div>
  );

  const UserProfileCard = () => {
    if (!user || !dashboard) return null;

    return (
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-6 border border-indigo-100 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* User Avatar */}
            <div className="relative">
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg">
                {user.initials}
              </div>
              <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-400 border-2 border-white rounded-full"></div>
            </div>

            {/* User Info */}
            <div>
              <h3 className="text-xl font-bold text-slate-900">Welcome back, {user.name}!</h3>
              <div className="flex items-center gap-3 mt-1">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  user.role === 'Owner' ? 'bg-purple-100 text-purple-700' :
                  user.role === 'Admin' ? 'bg-blue-100 text-blue-700' :
                  user.role === 'Contributor' ? 'bg-green-100 text-green-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {user.role}
                </span>
                <span className="text-sm text-slate-600">{user.email}</span>
                <span className="text-sm text-slate-500">• {user.organization_id}</span>
              </div>
            </div>
          </div>

          {/* Data Mode Toggle */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg border border-slate-200">
              <div className={`w-2 h-2 rounded-full ${useMockData ? 'bg-orange-400' : 'bg-green-400'} animate-pulse`}></div>
              <span className="text-sm font-medium text-slate-700">
                {useMockData ? 'Demo Mode' : 'Live Data'}
              </span>
            </div>
            <button
              onClick={handleToggleMockData}
              className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors duration-200 text-sm"
            >
              <RefreshCw className="w-4 h-4" />
              Switch to {useMockData ? 'Live' : 'Demo'}
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-6 gap-4 mt-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-indigo-600">{dashboard.stats.total_projects}</div>
            <div className="text-xs text-slate-600 mt-1">Projects</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{dashboard.stats.active_projects}</div>
            <div className="text-xs text-slate-600 mt-1">Active</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{dashboard.stats.at_risk_projects}</div>
            <div className="text-xs text-slate-600 mt-1">At Risk</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{dashboard.stats.assigned_tasks}</div>
            <div className="text-xs text-slate-600 mt-1">My Tasks</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{dashboard.stats.overdue_tasks}</div>
            <div className="text-xs text-slate-600 mt-1">Overdue</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{dashboard.stats.completed_this_week}</div>
            <div className="text-xs text-slate-600 mt-1">Done This Week</div>
          </div>
        </div>
      </div>
    );
  };

  const ProjectHeader = () => (
    <div className="bg-white border-b border-slate-200 px-8 py-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Projects Dashboard</h1>
          <p className="text-slate-600 mb-4">Manage and monitor all your projects in one place</p>
          
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                <span className="text-indigo-600 font-semibold text-sm">AC</span>
              </div>
              <span className="text-slate-600">Alex Chen</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span className="text-slate-600">Created Jan 10, 2024</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400" />
              <span className="text-slate-600">Updated 2 hours ago</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors duration-200">
            <Share2 className="w-4 h-4" />
            Share
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all duration-200">
            <Settings className="w-4 h-4" />
            Settings
          </button>
        </div>
      </div>
    </div>
  );

  // Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-xl mx-auto mb-4">
            🔒
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Authentication Required</h2>
          <p className="text-slate-600 mb-4">Please log in to view your projects</p>
          <a href="/login" className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all duration-200">
            Log In
          </a>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    if (!dashboard) {
      return (
        <div className="text-center py-12">
          <p className="text-slate-600">No data available</p>
        </div>
      );
    }

    switch (activeSection) {
      case 'overview':
        return (
          <div className="space-y-8">
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
              <MetricCard title="Repositories" value="2" change="+1" icon={GitBranch} color="blue" />
              <MetricCard title="Datasets" value="3" change="120k rows" icon={Database} color="green" />
              <MetricCard title="Experiments" value="5" change="+2" icon={Activity} color="purple" />
              <MetricCard title="Team Members" value="6" change="+1" icon={Users} color="orange" />
              <MetricCard 
                title="AI Status" 
                value="Online" 
                change="Groq LLaMA" 
                icon={Bot} 
                color="green" 
              />
            </div>

            {/* AI Summary */}
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-6 border border-indigo-100">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white">
                  <Bot className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">AI Project Summary</h3>
              </div>
              <p className="text-slate-700 leading-relaxed">
                This project uses <strong>2 GitHub repositories</strong>, <strong>3 datasets</strong>, and has achieved 
                <strong className="text-green-600"> 87% accuracy</strong> in churn prediction. Current risks include 
                missing values in customer_age column (8.5%) and outdated torch dependency (1.12). 
                Latest experiment shows <strong className="text-blue-600">6% improvement</strong> with normalized features.
              </p>
            </div>

            {/* Performance Chart */}
            <div className="bg-white rounded-xl p-6 border border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900 mb-6">Model Performance Over Time</h3>
              <ResponsiveContainer width="100%" height={300}>
                <RechartsLineChart data={experimentData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="run" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
                    }} 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="accuracy" 
                    stroke="url(#gradientAccuracy)" 
                    strokeWidth={3}
                    dot={{ fill: '#6366f1', strokeWidth: 2, r: 6 }}
                    activeDot={{ r: 8, fill: '#6366f1' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="f1" 
                    stroke="url(#gradientF1)" 
                    strokeWidth={3}
                    dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 6 }}
                    activeDot={{ r: 8, fill: '#8b5cf6' }}
                  />
                  <defs>
                    <linearGradient id="gradientAccuracy" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0.2}/>
                    </linearGradient>
                    <linearGradient id="gradientF1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.2}/>
                    </linearGradient>
                  </defs>
                </RechartsLineChart>
              </ResponsiveContainer>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-xl p-6 border border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900 mb-6">Recent Activity</h3>
              <ActivityFeed />
            </div>
          </div>
        );

      case 'repositories':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-900">Repositories</h2>
              <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all duration-200">
                <Plus className="w-4 h-4" />
                Link Repository
              </button>
            </div>

            <div className="grid gap-6">
              {repositories.map((repo, idx) => (
                <div key={idx} className="bg-white rounded-xl p-6 border border-slate-200 hover:border-slate-300 hover:shadow-lg transition-all duration-300">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900 mb-1">{repo.name}</h3>
                      <div className="flex items-center gap-4 text-sm text-slate-600">
                        <span className="flex items-center gap-1">
                          <Code className="w-4 h-4" />
                          {repo.language}
                        </span>
                        <span className="flex items-center gap-1">
                          <Star className="w-4 h-4" />
                          {repo.stars}
                        </span>
                        <span className="flex items-center gap-1">
                          <GitBranch className="w-4 h-4" />
                          {repo.branches} branches
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {repo.contributors} contributors
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm">
                        <FileText className="w-4 h-4" />
                        Summarize
                      </button>
                      <button className="flex items-center gap-1 px-3 py-1.5 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition-colors text-sm">
                        <Search className="w-4 h-4" />
                        Dependencies
                      </button>
                      <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                        <MoreVertical className="w-4 h-4 text-slate-400" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500">Last commit: {repo.lastCommit}</span>
                    <button className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700">
                      <ExternalLink className="w-4 h-4" />
                      View on GitHub
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'datasets':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-900">Datasets</h2>
              <div className="flex items-center gap-3">
                <button className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors duration-200">
                  <Filter className="w-4 h-4" />
                  Filter
                </button>
                <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all duration-200">
                  <Upload className="w-4 h-4" />
                  Upload Dataset
                </button>
              </div>
            </div>

            <div className="grid gap-6">
              {datasets.map((dataset, idx) => (
                <div key={idx} className="bg-white rounded-xl p-6 border border-slate-200 hover:border-slate-300 hover:shadow-lg transition-all duration-300">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900 mb-1">{dataset.name}</h3>
                      <div className="flex items-center gap-4 text-sm text-slate-600 mb-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          dataset.type === 'CSV' ? 'bg-green-100 text-green-700' :
                          dataset.type === 'Parquet' ? 'bg-blue-100 text-blue-700' :
                          'bg-orange-100 text-orange-700'
                        }`}>
                          {dataset.type}
                        </span>
                        <span>{dataset.size}</span>
                        <span>{dataset.rows} rows</span>
                        <span className={`${dataset.missingValues > 10 ? 'text-red-600' : dataset.missingValues > 5 ? 'text-orange-600' : 'text-green-600'}`}>
                          {dataset.missingValues}% missing
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm">
                        <BarChart3 className="w-4 h-4" />
                        Analyze
                      </button>
                      <button className="flex items-center gap-1 px-3 py-1.5 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors text-sm">
                        <Zap className="w-4 h-4" />
                        Auto-Clean
                      </button>
                      <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                        <MoreVertical className="w-4 h-4 text-slate-400" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500">Updated: {dataset.lastUpdated}</span>
                    <button className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700">
                      <Eye className="w-4 h-4" />
                      Preview Data
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'experiments':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-900">Experiments & Models</h2>
              <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all duration-200">
                <Play className="w-4 h-4" />
                New Experiment
              </button>
            </div>

            {/* Training Progress Chart */}
            <div className="bg-white rounded-xl p-6 border border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900 mb-6">Training vs Validation Loss</h3>
              <ResponsiveContainer width="100%" height={300}>
                <RechartsLineChart data={trainingData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="epoch" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
                    }} 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="training" 
                    stroke="#3b82f6" 
                    strokeWidth={3}
                    name="Training"
                    dot={{ fill: '#3b82f6', strokeWidth: 2, r: 6 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="validation" 
                    stroke="#10b981" 
                    strokeWidth={3}
                    name="Validation"
                    dot={{ fill: '#10b981', strokeWidth: 2, r: 6 }}
                  />
                </RechartsLineChart>
              </ResponsiveContainer>
            </div>

            {/* Experiment Leaderboard */}
            <div className="bg-white rounded-xl p-6 border border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900 mb-6 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-500" />
                Experiment Leaderboard
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-3 px-4 font-semibold text-slate-700">Rank</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-700">Run ID</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-700">Model</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-700">Accuracy</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-700">F1 Score</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-700">Date</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {experimentData.map((exp, idx) => (
                      <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                        <td className="py-4 px-4">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            idx === 0 ? 'bg-yellow-100 text-yellow-700' :
                            idx === 1 ? 'bg-gray-100 text-gray-700' :
                            idx === 2 ? 'bg-orange-100 text-orange-700' :
                            'bg-slate-100 text-slate-700'
                          }`}>
                            {idx + 1}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <span className="font-mono text-sm bg-slate-100 px-2 py-1 rounded">{exp.run}</span>
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-sm text-slate-600">RandomForestClassifier</span>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-12 bg-slate-200 rounded-full h-2">
                              <div 
                                className="bg-gradient-to-r from-green-400 to-green-600 h-2 rounded-full" 
                                style={{ width: `${exp.accuracy * 100}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-medium">{(exp.accuracy * 100).toFixed(1)}%</span>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-sm font-medium">{exp.f1.toFixed(3)}</span>
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-sm text-slate-500">{exp.date}</span>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <button className="p-1 hover:bg-slate-100 rounded transition-colors">
                              <Eye className="w-4 h-4 text-slate-400" />
                            </button>
                            <button className="p-1 hover:bg-slate-100 rounded transition-colors">
                              <Download className="w-4 h-4 text-slate-400" />
                            </button>
                            <button className="p-1 hover:bg-slate-100 rounded transition-colors">
                              <MoreVertical className="w-4 h-4 text-slate-400" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );

      case 'collaboration':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-900">Team Collaboration</h2>
              <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all duration-200">
                <Plus className="w-4 h-4" />
                Invite Member
              </button>
            </div>

            {/* Team Members */}
            <div className="bg-white rounded-xl p-6 border border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900 mb-6">Team Members</h3>
              <div className="grid gap-4">
                {teamMembers.map((member, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-indigo-400 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                        {member.avatar}
                      </div>
                      <div>
                        <h4 className="font-medium text-slate-900">{member.name}</h4>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            member.role === 'Owner' ? 'bg-purple-100 text-purple-700' :
                            member.role === 'Contributor' ? 'bg-blue-100 text-blue-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {member.role}
                          </span>
                          <div className={`w-2 h-2 rounded-full ${
                            member.status === 'online' ? 'bg-green-400' : 'bg-gray-300'
                          }`}></div>
                          <span className="text-xs text-slate-500">{member.status}</span>
                        </div>
                      </div>
                    </div>
                    <button className="p-2 hover:bg-slate-200 rounded-lg transition-colors">
                      <MoreVertical className="w-4 h-4 text-slate-400" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Activity Feed */}
            <div className="bg-white rounded-xl p-6 border border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900 mb-6">Project Activity</h3>
              <ActivityFeed />
            </div>

            {/* Comments Section */}
            <div className="bg-white rounded-xl p-6 border border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900 mb-6">Discussion</h3>
              <div className="space-y-4 mb-6">
                {[
                  {
                    user: 'Sarah Kim',
                    avatar: 'SK',
                    time: '2 hours ago',
                    message: 'Great improvement on the latest model! The 6% accuracy boost is impressive. Should we consider deploying this to staging?'
                  },
                  {
                    user: 'Alex Chen',
                    avatar: 'AC',
                    time: '1 hour ago',
                    message: 'Agreed! Let\'s run a few more tests on the validation set. @MikeRoss can you help with the infrastructure setup?'
                  }
                ].map((comment, idx) => (
                  <div key={idx} className="flex gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-indigo-400 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                      {comment.avatar}
                    </div>
                    <div className="flex-1">
                      <div className="bg-slate-50 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-slate-900">{comment.user}</span>
                          <span className="text-xs text-slate-500">{comment.time}</span>
                        </div>
                        <p className="text-sm text-slate-700">{comment.message}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="flex gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-indigo-400 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                  AC
                </div>
                <div className="flex-1">
                  <textarea
                    placeholder="Add a comment..."
                    className="w-full p-3 border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    rows={3}
                  />
                  <div className="flex justify-end mt-2">
                    <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all duration-200 text-sm">
                      <MessageSquare className="w-4 h-4" />
                      Comment
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'insights':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-900">AI-Powered Insights</h2>
              <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all duration-200">
                <RefreshCw className="w-4 h-4" />
                Refresh Analysis
              </button>
            </div>

            {/* AI Status */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center text-white">
                    <Bot className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">AI Analysis Engine</h3>
                    <p className="text-green-700">Online • Groq LLaMA 3.1 70B</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium text-green-700">Active</span>
                </div>
              </div>
            </div>

            {/* Risk Analysis */}
            <div className="bg-white rounded-xl p-6 border border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900 mb-6 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-orange-500" />
                Risk Analysis
              </h3>
              <div className="space-y-4">
                <AIInsightCard 
                  type="risk"
                  title="Data Imbalance Detected"
                  message="Your dataset shows 80% vs 20% class distribution. Consider SMOTE oversampling or class weighting."
                  severity="warning"
                />
                <AIInsightCard 
                  type="risk"
                  title="Dependency Vulnerability"
                  message="torch==1.12 is outdated. Upgrade to 2.0+ for security patches and performance improvements."
                  severity="error"
                />
                <AIInsightCard 
                  type="risk"
                  title="Missing Documentation"
                  message="No README found in /models/ directory. Add model documentation for better maintainability."
                  severity="warning"
                />
              </div>
            </div>

            {/* Recommendations */}
            <div className="bg-white rounded-xl p-6 border border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900 mb-6 flex items-center gap-2">
                <Target className="w-5 h-5 text-blue-500" />
                AI Recommendations
              </h3>
              <div className="space-y-4">
                <AIInsightCard 
                  type="recommendation"
                  title="Feature Engineering Opportunity"
                  message="Add interaction features between customer_age and purchase_frequency. This could improve accuracy by ~3%."
                  severity="info"
                />
                <AIInsightCard 
                  type="recommendation"
                  title="Hyperparameter Optimization"
                  message="Try max_depth=15 and min_samples_split=10 for RandomForest. GridSearch suggests this combination."
                  severity="success"
                />
                <AIInsightCard 
                  type="recommendation"
                  title="Data Quality Improvement"
                  message="Impute missing customer_age values using regression on tenure and purchase_amount instead of mean."
                  severity="info"
                />
              </div>
            </div>

            {/* Predictive Insights */}
            <div className="bg-white rounded-xl p-6 border border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900 mb-6 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-purple-500" />
                Predictive Insights
              </h3>
              <div className="space-y-4">
                <AIInsightCard 
                  type="prediction"
                  title="Performance Plateau Warning"
                  message="Model accuracy may plateau at 88% without additional features. Consider external data sources."
                  severity="warning"
                />
                <AIInsightCard 
                  type="prediction"
                  title="Resource Usage Forecast"
                  message="Next training run will likely use 5.8GB/6GB GPU memory. Consider reducing batch size or model pruning."
                  severity="info"
                />
                <AIInsightCard 
                  type="prediction"
                  title="Deployment Readiness"
                  message="Current model meets production requirements. Latency <50ms, accuracy >85%. Ready for staging deployment."
                  severity="success"
                />
              </div>
            </div>

            {/* Performance Predictions Chart */}
            <div className="bg-white rounded-xl p-6 border border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900 mb-6">Performance Trajectory</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={experimentData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="run" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
                    }} 
                  />
                  <Bar dataKey="accuracy" fill="url(#barGradient)" radius={[4, 4, 0, 0]}>
                    {experimentData.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={`hsl(${220 + index * 10}, 70%, ${60 + index * 5}%)`} />
                    ))}
                  </Bar>
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.9}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.7}/>
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <div className="flex h-screen">
        <Sidebar />
        
        <div className="flex-1 flex flex-col overflow-hidden">
          <ProjectHeader />

          <main className="flex-1 overflow-y-auto p-8">
            <div className="max-w-7xl mx-auto">
              <UserProfileCard />

              {/* User-specific insights */}
              {dashboard && dashboard.personal_insights.length > 0 && (
                <div className="bg-white rounded-xl p-6 border border-slate-200 mb-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <Bot className="w-5 h-5 text-indigo-600" />
                    Personalized AI Insights for {user?.name}
                  </h3>
                  <div className="grid gap-4">
                    {dashboard.personal_insights.slice(0, 3).map((insight) => (
                      <AIInsightCard
                        key={insight.id}
                        type={insight.type}
                        title={insight.title}
                        message={insight.description}
                        severity={insight.impact === 'high' ? 'warning' : insight.impact === 'medium' ? 'info' : 'success'}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Upcoming Deadlines */}
              {dashboard && dashboard.upcoming_deadlines.length > 0 && (
                <div className="bg-white rounded-xl p-6 border border-slate-200 mb-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-orange-600" />
                    Your Upcoming Deadlines
                  </h3>
                  <div className="space-y-3">
                    {dashboard.upcoming_deadlines.map((deadline) => (
                      <div key={deadline.task_id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                        <div className="flex-1">
                          <p className="font-medium text-slate-900">{deadline.title}</p>
                          <p className="text-sm text-slate-600">
                            Due in {deadline.days_until} days • {new Date(deadline.due_date).toLocaleDateString()}
                          </p>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          deadline.priority === 'Critical' ? 'bg-red-100 text-red-700' :
                          deadline.priority === 'High' ? 'bg-orange-100 text-orange-700' :
                          deadline.priority === 'Medium' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {deadline.priority}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Role-based visibility message */}
              {user?.role === 'Viewer' && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
                  <div className="flex items-start gap-3">
                    <Eye className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-blue-900 mb-1">Viewer Mode</h4>
                      <p className="text-sm text-blue-700">
                        You have read-only access. Some information like budget details may be hidden based on your role.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {renderContent()}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default ProjectAnalysisWorkspace;