import React, { useState, useEffect } from 'react';
import { 
  Upload, 
  Play, 
  Download, 
  Save, 
  ChevronDown, 
  Settings, 
  BarChart3, 
  LineChart, 
  PieChart, 
  Activity,
  Database,
  Brain,
  Code,
  Zap,
  Filter,
  Search,
  Plus,
  Trash2,
  Copy,
  Eye,
  RefreshCw,
  FileText,
  Sparkles
} from 'lucide-react';
import { LineChart as RechartsLine, BarChart as RechartsBar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line, Bar, ScatterChart, Scatter, Cell, PieChart as RechartsPie, Pie } from 'recharts';

const DataAnalysisWorkspace = () => {
  const [selectedModel, setSelectedModel] = useState('Groq LLaMA 3.1');
  const [selectedProject, setSelectedProject] = useState('AI Optimization');
  const [activeTab, setActiveTab] = useState('overview');
  const [uploadedFile, setUploadedFile] = useState(null);
  const [dataCleaningOptions, setDataCleaningOptions] = useState({
    removeNulls: false,
    normalizeValues: false,
    encodeCategorical: false,
    dropDuplicates: false
  });
  const [query, setQuery] = useState('');
  const [isAITyping, setIsAITyping] = useState(false);
  const [showFAB, setShowFAB] = useState(false);
  const [fabExpanded, setFabExpanded] = useState(false);

  // Sample data for demonstrations
  const sampleData = [
    { month: 'Jan', sales: 4000, revenue: 2400, customers: 240 },
    { month: 'Feb', sales: 3000, revenue: 1398, customers: 221 },
    { month: 'Mar', sales: 2000, revenue: 9800, customers: 229 },
    { month: 'Apr', sales: 2780, revenue: 3908, customers: 200 },
    { month: 'May', sales: 1890, revenue: 4800, customers: 218 },
    { month: 'Jun', sales: 2390, revenue: 3800, customers: 250 }
  ];

  const correlationData = [
    { feature1: 'Age', feature2: 'Salary', correlation: 0.81 },
    { feature1: 'Experience', feature2: 'Salary', correlation: 0.92 },
    { feature1: 'Education', feature2: 'Salary', correlation: 0.67 }
  ];

  const pieData = [
    { name: 'Engineering', value: 35, fill: '#7B3FE4' },
    { name: 'Marketing', value: 25, fill: '#3ECF8E' },
    { name: 'Sales', value: 20, fill: '#FF8C42' },
    { name: 'HR', value: 20, fill: '#8B5CF6' }
  ];

  useEffect(() => {
    const timer = setTimeout(() => setShowFAB(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setUploadedFile({
        name: file.name,
        size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
        rows: 10000,
        columns: 15
      });
    }
  };

  const toggleDataCleaning = (option) => {
    setDataCleaningOptions(prev => ({
      ...prev,
      [option]: !prev[option]
    }));
  };

  const simulateAIResponse = () => {
    setIsAITyping(true);
    setTimeout(() => {
      setIsAITyping(false);
    }, 2000);
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'charts', label: 'Charts', icon: BarChart3 },
    { id: 'correlations', label: 'Correlations', icon: LineChart },
    { id: 'queries', label: 'Custom Queries', icon: Database }
  ];

  const models = ['Groq LLaMA 3.1', 'Phi-2 Local', 'Mixtral 8x7B'];
  const projects = ['AI Optimization', 'Sales Analytics', 'Customer Insights'];

  return (
    <div className="min-h-screen bg-white">
      {/* Top Toolbar */}
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Left Section */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-6 h-6 text-purple-600" />
                <h1 className="text-xl font-semibold text-slate-900">Data Analysis</h1>
              </div>
              <div className="flex items-center gap-1 text-sm text-slate-500">
                <span>Projects</span>
                <span>/</span>
                <span className="text-slate-700">{selectedProject}</span>
                <span>/</span>
                <span className="text-purple-600">Data Analysis</span>
              </div>
            </div>

            {/* Right Section */}
            <div className="flex items-center gap-3">
              {/* Model Selector */}
              <div className="relative">
                <select 
                  value={selectedModel} 
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="appearance-none bg-slate-100 hover:bg-slate-150 rounded-full pl-4 pr-8 py-2 text-sm font-medium text-slate-700 border-0 cursor-pointer focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all duration-200"
                >
                  {models.map(model => (
                    <option key={model} value={model}>{model}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
              </div>

              {/* Project Selector */}
              <div className="relative">
                <select 
                  value={selectedProject} 
                  onChange={(e) => setSelectedProject(e.target.value)}
                  className="appearance-none bg-slate-100 hover:bg-slate-150 rounded-full pl-4 pr-8 py-2 text-sm font-medium text-slate-700 border-0 cursor-pointer focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all duration-200"
                >
                  {projects.map(project => (
                    <option key={project} value={project}>{project}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
              </div>

              {/* Action Buttons */}
              <button 
                onClick={simulateAIResponse}
                className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-emerald-500 hover:from-purple-700 hover:to-emerald-600 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
              >
                <Play className="w-4 h-4" />
                Run Analysis
              </button>

              <button className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg font-medium transition-all duration-200">
                <Download className="w-4 h-4" />
                Export
              </button>

              <button className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg font-medium transition-all duration-200">
                <Save className="w-4 h-4" />
                Save
              </button>

              {/* Status Indicator */}
              <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3 py-2 rounded-lg border border-emerald-200">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium">AI Online</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex h-[calc(100vh-88px)]">
        {/* Left Panel - Dataset Management */}
        <div className="w-1/3 bg-slate-50 border-r border-slate-200 p-6 overflow-y-auto">
          {/* Upload Card */}
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-sm border border-slate-200 hover:shadow-lg transition-all duration-300 mb-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Upload className="w-5 h-5 text-purple-600" />
              Dataset Upload
            </h3>
            
            {!uploadedFile ? (
              <div className="relative">
                <input 
                  type="file" 
                  accept=".csv,.xlsx,.json,.parquet"
                  onChange={handleFileUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className="border-2 border-dashed border-slate-300 hover:border-purple-400 rounded-xl p-8 text-center transition-all duration-300 hover:bg-gradient-to-br hover:from-purple-50 hover:to-emerald-50">
                  <div className="w-12 h-12 mx-auto mb-4 bg-gradient-to-r from-purple-100 to-emerald-100 rounded-full flex items-center justify-center">
                    <Upload className="w-6 h-6 text-purple-600" />
                  </div>
                  <p className="text-slate-600 mb-2">Drag & drop your dataset here</p>
                  <p className="text-sm text-slate-500">CSV, Excel, JSON, Parquet supported</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-slate-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-slate-900">{uploadedFile.name}</span>
                    <span className="text-sm text-slate-500">{uploadedFile.size}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-slate-500">Rows:</span>
                      <span className="ml-2 font-medium text-slate-900">{uploadedFile.rows.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Columns:</span>
                      <span className="ml-2 font-medium text-slate-900">{uploadedFile.columns}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <button className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 px-3 rounded-lg text-sm font-medium transition-all duration-200">
                    Change Dataset
                  </button>
                  <button className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 px-3 rounded-lg text-sm font-medium transition-all duration-200">
                    Download Original
                  </button>
                </div>

                {/* Data Preview */}
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-slate-700 mb-2">Data Preview</h4>
                  <div className="bg-slate-100 rounded-lg p-3 overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-slate-600">
                          <th className="text-left py-1 px-2">Name</th>
                          <th className="text-left py-1 px-2">Age</th>
                          <th className="text-left py-1 px-2">Department</th>
                          <th className="text-left py-1 px-2">Salary</th>
                        </tr>
                      </thead>
                      <tbody className="text-slate-800">
                        {['John Doe', 'Jane Smith', 'Mike Johnson'].map((name, i) => (
                          <tr key={i} className="opacity-0 animate-fade-in" style={{animationDelay: `${i * 100}ms`}}>
                            <td className="py-1 px-2">{name}</td>
                            <td className="py-1 px-2">{28 + i * 3}</td>
                            <td className="py-1 px-2">{['Engineering', 'Marketing', 'Sales'][i]}</td>
                            <td className="py-1 px-2">${(75000 + i * 10000).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Data Cleaning */}
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-sm border border-slate-200 hover:shadow-lg transition-all duration-300">
            <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Filter className="w-5 h-5 text-emerald-600" />
              Data Cleaning
            </h3>
            
            <div className="space-y-4">
              {[
                { key: 'removeNulls', label: 'Remove Null Values', effect: '- 450 rows' },
                { key: 'normalizeValues', label: 'Normalize Values', effect: 'Scale 0-1' },
                { key: 'encodeCategorical', label: 'Encode Categorical', effect: '+ 3 columns' },
                { key: 'dropDuplicates', label: 'Drop Duplicates', effect: '- 23 rows' }
              ].map(({ key, label, effect }) => (
                <div key={key} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-all duration-200">
                  <div className="flex items-center gap-3">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={dataCleaningOptions[key]}
                        onChange={() => toggleDataCleaning(key)}
                        className="sr-only peer"
                      />
                      <div className="relative w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-purple-600 peer-checked:to-emerald-500"></div>
                    </label>
                    <span className="text-sm font-medium text-slate-700">{label}</span>
                  </div>
                  {dataCleaningOptions[key] && (
                    <span className="text-xs text-emerald-600 font-medium animate-fade-in">{effect}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Panel - Analysis & Visuals */}
        <div className="flex-1 flex flex-col">
          {/* Tab Navigation */}
          <div className="bg-white border-b border-slate-200 px-6 py-4">
            <div className="flex space-x-1 bg-slate-100 rounded-lg p-1">
              {tabs.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                    activeTab === id
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-800'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* KPI Cards */}
                <div className="grid grid-cols-4 gap-4">
                  {[
                    { label: 'Total Rows', value: '10,000', change: '+2.3%', positive: true },
                    { label: 'Columns', value: '15', change: 'No change', positive: null },
                    { label: 'Missing Values', value: '5%', change: '-1.2%', positive: true },
                    { label: 'Data Quality', value: '94%', change: '+3.1%', positive: true }
                  ].map((kpi, i) => (
                    <div key={i} className="bg-white/80 backdrop-blur-sm rounded-xl p-4 shadow-sm border border-slate-200 hover:shadow-lg hover:scale-105 transition-all duration-300">
                      <div className="text-2xl font-bold text-slate-900 mb-1">{kpi.value}</div>
                      <div className="text-sm text-slate-600 mb-2">{kpi.label}</div>
                      <div className={`text-xs font-medium ${
                        kpi.positive === true ? 'text-emerald-600' : 
                        kpi.positive === false ? 'text-red-500' : 'text-slate-500'
                      }`}>
                        {kpi.change}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Dataset Summary */}
                <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-sm border border-slate-200">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Dataset Summary</h3>
                  <div className="grid grid-cols-2 gap-8">
                    <div>
                      <h4 className="font-medium text-slate-700 mb-3">Numerical Columns</h4>
                      <div className="space-y-2">
                        {['Age', 'Salary', 'Experience', 'Rating'].map(col => (
                          <div key={col} className="flex justify-between text-sm">
                            <span className="text-slate-600">{col}</span>
                            <span className="font-medium text-slate-900">Normal Distribution</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium text-slate-700 mb-3">Categorical Columns</h4>
                      <div className="space-y-2">
                        {['Department', 'Location', 'Gender', 'Education'].map(col => (
                          <div key={col} className="flex justify-between text-sm">
                            <span className="text-slate-600">{col}</span>
                            <span className="font-medium text-slate-900">{Math.floor(Math.random() * 10) + 2} unique</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'charts' && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  {/* Line Chart */}
                  <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-sm border border-slate-200 hover:shadow-lg transition-all duration-300">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-slate-900">Revenue Trend</h3>
                      <button className="text-slate-400 hover:text-slate-600">
                        <Eye className="w-5 h-5" />
                      </button>
                    </div>
                    <ResponsiveContainer width="100%" height={200}>
                      <RechartsLine data={sampleData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
                        <YAxis stroke="#64748b" fontSize={12} />
                        <Tooltip 
                          contentStyle={{
                            backgroundColor: 'rgba(255, 255, 255, 0.9)',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            backdropFilter: 'blur(8px)'
                          }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="revenue" 
                          stroke="url(#gradient1)" 
                          strokeWidth={3}
                          dot={{ fill: '#7B3FE4', strokeWidth: 2, r: 4 }}
                        />
                        <defs>
                          <linearGradient id="gradient1" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="#7B3FE4" />
                            <stop offset="100%" stopColor="#3ECF8E" />
                          </linearGradient>
                        </defs>
                      </RechartsLine>
                    </ResponsiveContainer>
                  </div>

                  {/* Bar Chart */}
                  <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-sm border border-slate-200 hover:shadow-lg transition-all duration-300">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-slate-900">Sales by Month</h3>
                      <button className="text-slate-400 hover:text-slate-600">
                        <Eye className="w-5 h-5" />
                      </button>
                    </div>
                    <ResponsiveContainer width="100%" height={200}>
                      <RechartsBar data={sampleData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
                        <YAxis stroke="#64748b" fontSize={12} />
                        <Tooltip 
                          contentStyle={{
                            backgroundColor: 'rgba(255, 255, 255, 0.9)',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            backdropFilter: 'blur(8px)'
                          }}
                        />
                        <Bar dataKey="sales" fill="url(#gradient2)" radius={[4, 4, 0, 0]} />
                        <defs>
                          <linearGradient id="gradient2" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#7B3FE4" />
                            <stop offset="100%" stopColor="#3ECF8E" />
                          </linearGradient>
                        </defs>
                      </RechartsBar>
                    </ResponsiveContainer>
                  </div>

                  {/* Pie Chart */}
                  <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-sm border border-slate-200 hover:shadow-lg transition-all duration-300">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-slate-900">Department Distribution</h3>
                      <button className="text-slate-400 hover:text-slate-600">
                        <Eye className="w-5 h-5" />
                      </button>
                    </div>
                    <ResponsiveContainer width="100%" height={200}>
                      <RechartsPie>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={80}
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </RechartsPie>
                    </ResponsiveContainer>
                  </div>

                  {/* Scatter Plot */}
                  <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-sm border border-slate-200 hover:shadow-lg transition-all duration-300">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-slate-900">Sales vs Revenue</h3>
                      <button className="text-slate-400 hover:text-slate-600">
                        <Eye className="w-5 h-5" />
                      </button>
                    </div>
                    <ResponsiveContainer width="100%" height={200}>
                      <ScatterChart data={sampleData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="sales" stroke="#64748b" fontSize={12} />
                        <YAxis dataKey="revenue" stroke="#64748b" fontSize={12} />
                        <Tooltip 
                          contentStyle={{
                            backgroundColor: 'rgba(255, 255, 255, 0.9)',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            backdropFilter: 'blur(8px)'
                          }}
                        />
                        <Scatter dataKey="customers" fill="#7B3FE4" />
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'correlations' && (
              <div className="space-y-6">
                <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-sm border border-slate-200">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Feature Correlations</h3>
                  <div className="space-y-3">
                    {correlationData.map((item, i) => (
                      <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-all duration-200">
                        <div className="flex items-center gap-3">
                          <div className="text-sm font-medium text-slate-900">
                            {item.feature1} ↔ {item.feature2}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-32 bg-slate-200 rounded-full h-2 overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-purple-600 to-emerald-500 transition-all duration-1000"
                              style={{ width: `${item.correlation * 100}%` }}
                            />
                          </div>
                          <span className="text-lg font-bold text-slate-900 w-12 text-right">
                            {item.correlation.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'queries' && (
              <div className="space-y-6">
                <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-sm border border-slate-200">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <Database className="w-5 h-5 text-purple-600" />
                    SQL Editor
                  </h3>
                  <div className="space-y-4">
                    <div className="relative">
                      <textarea
                        placeholder="SELECT * FROM dataset WHERE..."
                        className="w-full h-32 p-4 bg-slate-50 border border-slate-200 rounded-lg resize-none font-mono text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                        defaultValue="SELECT department, AVG(salary) as avg_salary&#10;FROM employees&#10;GROUP BY department&#10;ORDER BY avg_salary DESC;"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button className="bg-gradient-to-r from-purple-600 to-emerald-500 hover:from-purple-700 hover:to-emerald-600 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 transform hover:scale-105">
                        <Play className="w-4 h-4 mr-2 inline" />
                        Execute Query
                      </button>
                      <button className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg font-medium transition-all duration-200">
                        <Save className="w-4 h-4 mr-2 inline" />
                        Save Query
                      </button>
                    </div>
                  </div>
                </div>

                {/* Natural Language Queries */}
                <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-sm border border-slate-200">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <Brain className="w-5 h-5 text-emerald-600" />
                    Natural Language Queries
                  </h3>
                  <div className="space-y-4">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Ask a question about your data..."
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                        defaultValue="Find the average salary per department"
                      />
                      <button className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-gradient-to-r from-purple-600 to-emerald-500 text-white p-2 rounded-lg hover:scale-105 transition-all duration-200">
                        <Zap className="w-4 h-4" />
                      </button>
                    </div>
                    
                    {/* Query Examples */}
                    <div>
                      <p className="text-sm text-slate-600 mb-2">Try these examples:</p>
                      <div className="flex flex-wrap gap-2">
                        {[
                          "Show me sales trends by month",
                          "Which department has highest revenue?",
                          "Find outliers in salary data",
                          "Correlation between age and performance"
                        ].map((example, i) => (
                          <button 
                            key={i}
                            className="bg-slate-100 hover:bg-purple-100 text-slate-700 hover:text-purple-700 px-3 py-1 rounded-full text-xs transition-all duration-200"
                          >
                            {example}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* AI Insights Section */}
          <div className="bg-white border-t border-slate-200 p-6">
            <div className="bg-gradient-to-r from-purple-50 to-emerald-50 rounded-xl p-6 border border-purple-200">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-emerald-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <Brain className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">AI Insights</h3>
                  
                  {isAITyping ? (
                    <div className="flex items-center gap-2 text-slate-600">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                      </div>
                      <span className="text-sm">AI is analyzing your data...</span>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-slate-700">
                        The dataset contains <strong>10,000 rows</strong> with <strong>15 columns</strong>. 
                        Missing values represent <strong>5%</strong> of the data, primarily in the 'Experience' column. 
                        Strong correlation detected between Salary and Experience (<strong>0.92</strong>).
                      </p>
                      
                      {/* Code Snippets */}
                      <div className="bg-slate-900 rounded-lg p-4 mt-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-slate-400 text-sm font-medium">Generated Python Code</span>
                          <div className="flex gap-2">
                            <button className="text-slate-400 hover:text-white p-1 rounded">
                              <Copy className="w-4 h-4" />
                            </button>
                            <button className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded text-xs transition-all duration-200">
                              Insert into Notebook
                            </button>
                          </div>
                        </div>
                        <pre className="text-emerald-400 text-sm overflow-x-auto">
{`# Data Analysis Summary
import pandas as pd
import numpy as np

# Load and explore data
df = pd.read_csv('dataset.csv')
print(f"Dataset shape: {df.shape}")
print(f"Missing values: {df.isnull().sum()}")

# Correlation analysis
correlation_matrix = df.corr()
high_corr = correlation_matrix[
    (correlation_matrix > 0.8) & 
    (correlation_matrix < 1.0)
]`}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Console / Query Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-slate-200 p-4 z-40">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ask a question about your data..."
                className="w-full pl-12 pr-32 py-3 bg-slate-50 border border-slate-200 rounded-full text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all duration-200"
              />
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
                <button className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-3 py-1 rounded-full text-xs transition-all duration-200">
                  SQL
                </button>
                <button className="bg-gradient-to-r from-purple-600 to-emerald-500 hover:from-purple-700 hover:to-emerald-600 text-white px-4 py-1 rounded-full text-xs font-medium transition-all duration-200 transform hover:scale-105">
                  <Play className="w-3 h-3 mr-1 inline" />
                  Run
                </button>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full transition-all duration-200 hover:scale-105">
                <Save className="w-5 h-5" />
              </button>
              <button className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full transition-all duration-200 hover:scale-105">
                <Download className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Action Button */}
      {showFAB && (
        <div className="fixed bottom-24 right-6 z-50">
          <div className={`transition-all duration-300 ${fabExpanded ? 'mb-4 space-y-3' : ''}`}>
            {fabExpanded && (
              <>
                {[
                  { icon: Filter, label: 'Clean Dataset', color: 'bg-emerald-500 hover:bg-emerald-600' },
                  { icon: BarChart3, label: 'Generate Visualization', color: 'bg-blue-500 hover:bg-blue-600' },
                  { icon: Activity, label: 'Find Correlations', color: 'bg-orange-500 hover:bg-orange-600' },
                  { icon: Sparkles, label: 'Auto-Summarize', color: 'bg-pink-500 hover:bg-pink-600' }
                ].map(({ icon: Icon, label, color }, i) => (
                  <div 
                    key={i}
                    className="flex items-center gap-3 animate-slide-left"
                    style={{animationDelay: `${i * 50}ms`}}
                  >
                    <span className="bg-white text-slate-700 px-3 py-2 rounded-lg shadow-lg text-sm font-medium whitespace-nowrap">
                      {label}
                    </span>
                    <button className={`w-12 h-12 ${color} text-white rounded-full shadow-lg transition-all duration-200 transform hover:scale-110 flex items-center justify-center`}>
                      <Icon className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </>
            )}
          </div>
          
          <button
            onClick={() => setFabExpanded(!fabExpanded)}
            className={`w-14 h-14 bg-gradient-to-r from-purple-600 to-emerald-500 hover:from-purple-700 hover:to-emerald-600 text-white rounded-full shadow-xl transition-all duration-300 transform hover:scale-110 flex items-center justify-center ${fabExpanded ? 'rotate-45' : ''}`}
          >
            <Plus className="w-6 h-6" />
          </button>
        </div>
      )}

      {/* Custom Animations */}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes slideLeft {
          from { opacity: 0; transform: translateX(30px); }
          to { opacity: 1; transform: translateX(0); }
        }
        
        .animate-fade-in {
          animation: fadeIn 0.5s ease-out forwards;
        }
        
        .animate-slide-left {
          animation: slideLeft 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default DataAnalysisWorkspace;