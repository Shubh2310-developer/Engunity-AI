import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Star, 
  Download, 
  Heart, 
  Share2, 
  Play, 
  Code, 
  Database, 
  Zap, 
  FileText, 
  Workflow,
  ChevronRight,
  Sparkles,
  TrendingUp,
  Clock,
  Users,
  Tag,
  Eye,
  ExternalLink,
  Settings,
  CheckCircle2,
  ArrowRight,
  Grid3X3,
  List,
  SortDesc
} from 'lucide-react';

// Mock data moved outside the component for performance and type inference
const categories = [
  { id: 'all', name: 'All', icon: Grid3X3, color: 'text-slate-600' },
  { id: 'ai-models', name: 'AI Models', icon: Sparkles, color: 'text-purple-600' },
  { id: 'datasets', name: 'Datasets', icon: Database, color: 'text-blue-600' },
  { id: 'plugins', name: 'Plugins', icon: Zap, color: 'text-green-600' },
  { id: 'templates', name: 'Templates', icon: FileText, color: 'text-orange-600' },
  { id: 'workflows', name: 'Workflows', icon: Workflow, color: 'text-indigo-600' }
];

const featuredItems = [
  {
    id: 'f1',
    title: 'GPT-4 Fine-tuned for Code',
    subtitle: 'Advanced code generation and debugging',
    image: '🚀',
    category: 'AI Models',
    gradient: 'from-purple-500 to-pink-500'
  },
  {
    id: 'f2',
    title: 'Healthcare Dataset Bundle',
    subtitle: '500K+ medical records for ML training',
    image: '🏥',
    category: 'Datasets',
    gradient: 'from-blue-500 to-cyan-500'
  },
  {
    id: 'f3',
    title: 'AutoML Pipeline Pro',
    subtitle: 'End-to-end machine learning automation',
    image: '⚡',
    category: 'Workflows',
    gradient: 'from-green-500 to-emerald-500'
  }
];

const marketplaceItems = [
  {
    id: '1',
    title: 'Phi-2 Language Model',
    description: 'Microsoft 2.7B parameter language model optimized for reasoning',
    category: 'ai-models',
    type: 'AI Model',
    tags: ['NLP', 'Reasoning', 'Small Model'],
    rating: 4.8,
    installs: '15.2k',
    lastUpdated: '2 days ago',
    publisher: 'Microsoft Research',
    price: 'Free',
    icon: '🤖',
    isVerified: true,
    useCases: ['Code generation', 'Text analysis', 'Q&A systems'],
    supportedModules: ['Chat', 'Code', 'Data Analysis']
  },
  {
    id: '2',
    title: 'Financial Time Series Dataset',
    description: 'Comprehensive stock market data with 10+ years of historical prices',
    category: 'datasets',
    type: 'Dataset',
    tags: ['Finance', 'Time Series', 'Stock Market'],
    rating: 4.6,
    installs: '8.7k',
    lastUpdated: '1 week ago',
    publisher: 'FinanceML',
    price: '$29/month',
    icon: '📈',
    isVerified: true,
    useCases: ['Algorithmic trading', 'Risk analysis', 'Portfolio optimization'],
    supportedModules: ['Data Analysis', 'Projects']
  },
  {
    id: '3',
    title: 'Slack Integration Plugin',
    description: 'Seamlessly connect your workspace with Slack for notifications',
    category: 'plugins',
    type: 'Plugin',
    tags: ['Communication', 'Notifications', 'Integration'],
    rating: 4.9,
    installs: '23.1k',
    lastUpdated: '3 days ago',
    publisher: 'DevTools Inc',
    price: 'Free',
    icon: '💬',
    isVerified: true,
    useCases: ['Team notifications', 'Status updates', 'Alert management'],
    supportedModules: ['All Modules']
  },
  {
    id: '4',
    title: 'RAG Pipeline Template',
    description: 'Ready-to-use Retrieval Augmented Generation pipeline with vector DB',
    category: 'templates',
    type: 'Template',
    tags: ['RAG', 'Vector DB', 'NLP'],
    rating: 4.7,
    installs: '12.3k',
    lastUpdated: '5 days ago',
    publisher: 'AI Templates',
    price: 'Free',
    icon: '🔍',
    isVerified: true,
    useCases: ['Document Q&A', 'Knowledge base', 'Content retrieval'],
    supportedModules: ['Chat', 'Code', 'Data Analysis']
  },
  {
    id: '5',
    title: 'Computer Vision Workflow',
    description: 'End-to-end image processing and object detection automation',
    category: 'workflows',
    type: 'Workflow',
    tags: ['Computer Vision', 'Object Detection', 'Automation'],
    rating: 4.5,
    installs: '6.9k',
    lastUpdated: '1 week ago',
    publisher: 'VisionAI',
    price: '$49/month',
    icon: '👁️',
    isVerified: true,
    useCases: ['Image analysis', 'Quality control', 'Medical imaging'],
    supportedModules: ['Data Analysis', 'Code', 'Projects']
  },
  {
    id: '6',
    title: 'Customer Churn Dataset',
    description: 'E-commerce customer behavior data for churn prediction models',
    category: 'datasets',
    type: 'Dataset',
    tags: ['Customer Analytics', 'E-commerce', 'Churn'],
    rating: 4.4,
    installs: '9.8k',
    lastUpdated: '4 days ago',
    publisher: 'RetailAI',
    price: '$19/month',
    icon: '🛒',
    isVerified: false,
    useCases: ['Churn prediction', 'Customer segmentation', 'Retention analysis'],
    supportedModules: ['Data Analysis', 'Projects']
  }
];

// Infer the type from the data array for better type safety
type MarketplaceItem = typeof marketplaceItems[0];

const MarketplaceWorkspace = () => {
  const [activeTab, setActiveTab] = useState('home');
  const [viewMode, setViewMode] = useState('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedItem, setSelectedItem] = useState<MarketplaceItem | null>(null);
  const [favorites, setFavorites] = useState(new Set<string>());
  const [installedItems, setInstalledItems] = useState(new Set<string>());
  const [showFilters, setShowFilters] = useState(false);
  const [featuredIndex, setFeaturedIndex] = useState(0);

  // Auto-scroll featured items
  useEffect(() => {
    if (featuredItems.length === 0) return; // Prevent errors on empty array
    const interval = setInterval(() => {
      setFeaturedIndex((prev) => (prev + 1) % featuredItems.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const filteredItems = marketplaceItems.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleInstall = (itemId: string) => {
    setInstalledItems(prev => new Set([...prev, itemId]));
    // Simulate confetti effect
    setTimeout(() => {
      console.log('🎉 Installation complete!');
    }, 1000);
  };

  const toggleFavorite = (itemId: string) => {
    setFavorites(prev => {
      const newFaves = new Set(prev);
      if (newFaves.has(itemId)) {
        newFaves.delete(itemId);
      } else {
        newFaves.add(itemId);
      }
      return newFaves;
    });
  };

  const renderMarketplaceHome = () => (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="text-center space-y-6">
        <div className="space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-green-600 bg-clip-text text-transparent">
            📦 Marketplace
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Discover AI models, datasets, plugins, and workflows to supercharge your projects.
          </p>
        </div>
        
        {/* Search Bar */}
        <div className="relative max-w-2xl mx-auto">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search 500+ marketplace items…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-white/80 backdrop-blur-md border border-slate-200 rounded-2xl shadow-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-lg"
          />
        </div>
      </div>

      {/* Featured Carousel */}
      <div className="relative">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold text-slate-800">🌟 Featured</h2>
          <div className="flex space-x-2">
            {featuredItems.map((_, index) => (
              <button
                key={index}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === featuredIndex ? 'bg-purple-600 w-6' : 'bg-slate-300'
                }`}
                onClick={() => setFeaturedIndex(index)}
              />
            ))}
          </div>
        </div>
        
        <div className="relative overflow-hidden rounded-3xl">
          <div 
            className="flex transition-transform duration-700 ease-in-out"
            style={{ transform: `translateX(-${featuredIndex * 100}%)` }}
          >
            {featuredItems.map((item) => (
              <div key={item.id} className="w-full flex-shrink-0">
                <div className={`bg-gradient-to-r ${item.gradient} p-8 text-white`}>
                  <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-8 items-center">
                    <div className="space-y-4">
                      <div className="text-6xl">{item.image}</div>
                      <div>
                        <h3 className="text-3xl font-bold mb-2">{item.title}</h3>
                        <p className="text-xl opacity-90">{item.subtitle}</p>
                      </div>
                      <button className="bg-white/20 backdrop-blur-md border border-white/30 px-6 py-3 rounded-xl hover:bg-white/30 transition-all flex items-center gap-2">
                        Explore Now <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Categories */}
      <div>
        <h2 className="text-2xl font-semibold text-slate-800 mb-6">Browse Categories</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {categories.filter(cat => cat.id !== 'all').map((category) => {
            const Icon = category.icon;
            return (
              <button
                key={category.id}
                onClick={() => {
                  setSelectedCategory(category.id);
                  setActiveTab('browse');
                }}
                className="bg-white/80 backdrop-blur-md border border-slate-200 rounded-2xl p-6 hover:bg-white hover:shadow-xl transition-all group"
              >
                <Icon className={`w-8 h-8 ${category.color} mb-3 mx-auto group-hover:scale-110 transition-transform`} />
                <p className="font-medium text-slate-700">{category.name}</p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  const renderItemCard = (item: MarketplaceItem) => (
    <div key={item.id} className="bg-white/80 backdrop-blur-md border border-slate-200 rounded-2xl p-6 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 group">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className="text-3xl">{item.icon}</div>
          <div>
            <h3 className="font-semibold text-slate-800 group-hover:text-purple-600 transition-colors">
              {item.title}
            </h3>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <span>{item.publisher}</span>
              {item.isVerified && <CheckCircle2 className="w-4 h-4 text-blue-500" />}
            </div>
          </div>
        </div>
        <button
          onClick={() => toggleFavorite(item.id)}
          className={`p-2 rounded-lg transition-colors ${
            favorites.has(item.id) ? 'text-red-500 bg-red-50' : 'text-slate-400 hover:text-red-500 hover:bg-red-50'
          }`}
        >
          <Heart className={`w-5 h-5 ${favorites.has(item.id) ? 'fill-current' : ''}`} />
        </button>
      </div>

      <p className="text-slate-600 text-sm mb-4 line-clamp-2">{item.description}</p>

      <div className="flex flex-wrap gap-2 mb-4">
        {item.tags.map((tag) => (
          <span key={tag} className="bg-slate-100 text-slate-600 px-2 py-1 rounded-lg text-xs">
            {tag}
          </span>
        ))}
      </div>

      <div className="flex items-center justify-between mb-4 text-sm text-slate-500">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
            <span>{item.rating}</span>
          </div>
          <div className="flex items-center gap-1">
            <Download className="w-4 h-4" />
            <span>{item.installs}</span>
          </div>
        </div>
        <span className="font-medium text-purple-600">{item.price}</span>
      </div>

      <div className="flex gap-2">
        {installedItems.has(item.id) ? (
          <button className="flex-1 bg-green-500 text-white py-2 px-4 rounded-xl font-medium flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            Installed
          </button>
        ) : (
          <button
            onClick={() => handleInstall(item.id)}
            className="flex-1 bg-gradient-to-r from-purple-500 to-green-500 text-white py-2 px-4 rounded-xl font-medium hover:shadow-lg transition-all"
          >
            Install
          </button>
        )}
        <button 
          onClick={() => setSelectedItem(item)}
          className="bg-slate-100 hover:bg-slate-200 text-slate-700 p-2 rounded-xl transition-colors"
        >
          <Eye className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  const renderItemDetail = () => {
    if (!selectedItem) return null;

    return (
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => setSelectedItem(null)}
          className="mb-6 flex items-center gap-2 text-slate-600 hover:text-slate-800 transition-colors"
        >
          ← Back to marketplace
        </button>

        <div className="bg-white/80 backdrop-blur-md border border-slate-200 rounded-3xl p-8">
          {/* Header */}
          <div className="flex items-start gap-6 mb-8">
            <div className="text-6xl">{selectedItem.icon}</div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-slate-800">{selectedItem.title}</h1>
                {selectedItem.isVerified && <CheckCircle2 className="w-6 h-6 text-blue-500" />}
              </div>
              <p className="text-slate-600 text-lg mb-4">{selectedItem.description}</p>
              <div className="flex items-center gap-6 text-sm text-slate-500">
                <span>By {selectedItem.publisher}</span>
                <span>Updated {selectedItem.lastUpdated}</span>
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <span>{selectedItem.rating}/5</span>
                </div>
                <span>{selectedItem.installs} installs</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-purple-600 mb-4">{selectedItem.price}</div>
              <div className="flex gap-2">
                {installedItems.has(selectedItem.id) ? (
                  <button className="bg-green-500 text-white px-6 py-3 rounded-xl font-medium flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5" />
                    Installed
                  </button>
                ) : (
                  <button
                    onClick={() => handleInstall(selectedItem.id)}
                    className="bg-gradient-to-r from-purple-500 to-green-500 text-white px-6 py-3 rounded-xl font-medium hover:shadow-lg transition-all"
                  >
                    Install Now
                  </button>
                )}
                <button className="bg-slate-100 hover:bg-slate-200 text-slate-700 p-3 rounded-xl transition-colors">
                  <Share2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Use Cases */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-slate-800 mb-4">Use Cases</h2>
            <div className="grid md:grid-cols-3 gap-4">
              {selectedItem.useCases.map((useCase, index) => (
                <div key={index} className="bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-100 rounded-xl p-4">
                  <p className="text-slate-700">{useCase}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Supported Modules */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-slate-800 mb-4">Supported Modules</h2>
            <div className="flex flex-wrap gap-2">
              {selectedItem.supportedModules.map((module, index) => (
                <span key={index} className="bg-green-100 text-green-700 px-3 py-1 rounded-lg text-sm font-medium">
                  {module}
                </span>
              ))}
            </div>
          </div>

          {/* AI Insights */}
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-100 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-5 h-5 text-purple-600" />
              <h3 className="font-semibold text-purple-800">AI Insights</h3>
            </div>
            <p className="text-slate-700">
              This {selectedItem.type.toLowerCase()} is highly rated for its {selectedItem.tags.join(', ').toLowerCase()} capabilities.
              {selectedItem.useCases?.length > 0 &&
                ` Based on user feedback, it's particularly effective for ${selectedItem.useCases[0].toLowerCase()}.`
              }
              {` It integrates seamlessly with your existing ${selectedItem.supportedModules.join(' and ')} workflows.`}
            </p>
          </div>
        </div>
      </div>
    );
  };

  const renderBrowse = () => (
    <div className="space-y-6">
      {/* Filters and Controls */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-slate-800">Browse Marketplace</h1>
          <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm">
            {filteredItems.length} items
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-lg transition-colors ${
              viewMode === 'grid' ? 'bg-purple-100 text-purple-600' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <Grid3X3 className="w-5 h-5" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-lg transition-colors ${
              viewMode === 'list' ? 'bg-purple-100 text-purple-600' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <List className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex flex-wrap gap-2">
        {categories.map((category) => {
          const Icon = category.icon;
          return (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
                selectedCategory === category.id
                  ? 'bg-purple-600 text-white shadow-lg'
                  : 'bg-white/80 text-slate-600 border border-slate-200 hover:border-purple-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              {category.name}
            </button>
          );
        })}
      </div>

      {/* Items Grid */}
      <div className={`grid gap-6 ${
        viewMode === 'grid' 
          ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' 
          : 'grid-cols-1'
      }`}>
        {filteredItems.map(renderItemCard)}
      </div>

      {filteredItems.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🔍</div>
          <h3 className="text-xl font-semibold text-slate-700 mb-2">No items found</h3>
          <p className="text-slate-500">Try adjusting your search or filters</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
      {/* Navigation */}
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-lg">
                  M
                </div>
                <span className="text-xl font-bold text-slate-800">Marketplace</span>
              </div>
              <nav className="flex items-center gap-6">
                <button
                  onClick={() => {
                    setActiveTab('home');
                    setSelectedItem(null);
                  }}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    activeTab === 'home' && !selectedItem ? 'bg-purple-100 text-purple-600' : 'text-slate-600 hover:text-slate-800'
                  }`}
                >
                  Home
                </button>
                <button
                  onClick={() => {
                    setActiveTab('browse');
                    setSelectedItem(null);
                  }}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    activeTab === 'browse' && !selectedItem ? 'bg-purple-100 text-purple-600' : 'text-slate-600 hover:text-slate-800'
                  }`}
                >
                  Browse
                </button>
                <button
                  onClick={() => {
                    setActiveTab('installed');
                    setSelectedItem(null);
                  }}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    activeTab === 'installed' && !selectedItem ? 'bg-purple-100 text-purple-600' : 'text-slate-600 hover:text-slate-800'
                  }`}
                >
                  Installed ({installedItems.size})
                </button>
              </nav>
            </div>
            <button className="p-2 text-slate-600 hover:text-slate-800 transition-colors">
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {selectedItem ? (
          renderItemDetail()
        ) : activeTab === 'home' ? (
          renderMarketplaceHome()
        ) : activeTab === 'browse' ? (
          renderBrowse()
        ) : activeTab === 'installed' ? (
          <div className="space-y-6">
            <h1 className="text-2xl font-bold text-slate-800">Installed Items</h1>
            {installedItems.size === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📦</div>
                <h3 className="text-xl font-semibold text-slate-700 mb-2">No items installed yet</h3>
                <p className="text-slate-500 mb-6">Browse the marketplace to find amazing tools and resources</p>
                <button
                  onClick={() => setActiveTab('browse')}
                  className="bg-gradient-to-r from-purple-500 to-green-500 text-white px-6 py-3 rounded-xl font-medium hover:shadow-lg transition-all"
                >
                  Browse Marketplace
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {marketplaceItems
                  .filter(item => installedItems.has(item.id))
                  .map(renderItemCard)}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default MarketplaceWorkspace;