'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  FileText,
  Upload,
  Search,
  Filter,
  BarChart3,
  Clock,
  FileCheck,
  TrendingUp,
  Sparkles,
  Grid3x3,
  List,
  Star,
  Trash2,
  Eye,
  Download,
  Share2,
  MoreVertical,
  ArrowUpRight,
  Brain,
  Zap,
  Target,
  ChevronRight,
  FolderOpen,
  Calendar,
  Users,
  Activity
} from 'lucide-react';
import {
  getUserDocuments,
  getDashboardStats,
  deleteDocument as deleteDocumentAPI,
  formatFileSize,
  formatRelativeDate,
  type Document as APIDocument,
  type DashboardStats as APIDashboardStats
} from '@/lib/api/documents';

interface Document {
  id: string;
  doc_id: string;
  filename: string;
  fileType: string;
  size: number;
  uploadedAt: Date;
  status: 'processing' | 'ready' | 'error';
  pageCount?: number;
  wordCount?: number;
  category?: string;
  tags?: string[];
  views?: number;
  questions?: number;
  confidence?: number;
}

interface DashboardStats {
  totalDocuments: number;
  questionsAsked: number;
  timeSaved: number;
  avgConfidence: number;
  totalViews?: number;
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalDocuments: 0,
    questionsAsked: 0,
    timeSaved: 0,
    avgConfidence: 0
  });
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [showFilterMenu, setShowFilterMenu] = useState(false);

  useEffect(() => {
    fetchDocuments();
    fetchStats();
  }, []);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      // Get user ID from auth - for now using default user
      const userId = 'user_123'; // TODO: Replace with actual auth user ID

      const response = await getUserDocuments(userId, {
        skip: 0,
        limit: 50,
        category: filterCategory !== 'all' ? filterCategory : undefined,
        search: searchQuery || undefined
      });

      // Transform API documents to UI format
      const transformedDocs: Document[] = response.documents.map((doc: APIDocument) => ({
        id: doc._id || doc.doc_id,
        doc_id: doc.doc_id,
        filename: doc.filename,
        fileType: doc.metadata.file_type,
        size: doc.metadata.file_size_bytes,
        uploadedAt: new Date(doc.upload_date || Date.now()),
        status: doc.processing_status as 'processing' | 'ready' | 'error',
        pageCount: doc.metadata.page_count,
        wordCount: doc.metadata.word_count,
        category: doc.category,
        tags: doc.tags,
        views: doc.view_count,
        questions: doc.question_count,
        confidence: doc.avg_confidence ? doc.avg_confidence * 100 : undefined
      }));

      setDocuments(transformedDocs);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch documents:', error);
      setDocuments([]); // Set empty array on error
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      // Get user ID from auth - for now using default user
      const userId = 'user_123'; // TODO: Replace with actual auth user ID

      const apiStats = await getDashboardStats(userId);

      setStats({
        totalDocuments: apiStats.totalDocuments,
        questionsAsked: apiStats.questionsAsked,
        timeSaved: apiStats.timeSaved,
        avgConfidence: apiStats.avgConfidence,
        totalViews: apiStats.totalViews
      });
    } catch (error) {
      console.error('Failed to fetch stats:', error);
      // Keep default stats (0) on error
    }
  };

  // Refresh documents when filter changes
  useEffect(() => {
    fetchDocuments();
  }, [filterCategory]);

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         doc.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesFilter = filterCategory === 'all' || doc.category === filterCategory;
    return matchesSearch && matchesFilter;
  });

  const handleDeleteDocument = async (docId: string) => {
    if (!confirm('Are you sure you want to delete this document? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteDocumentAPI(docId);
      // Remove from local state
      setDocuments(docs => docs.filter(d => d.doc_id !== docId));
      // Refresh stats
      fetchStats();
    } catch (error) {
      console.error('Failed to delete document:', error);
      alert('Failed to delete document. Please try again.');
    }
  };

  const formatDate = (date: Date): string => {
    return formatRelativeDate(date.toISOString());
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto" />
          <p className="text-slate-600 text-lg">Loading your documents...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-start justify-between">
            <div>
              <motion.h1
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-4xl font-bold text-slate-900 mb-2"
              >
                Document Intelligence
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-slate-600 text-lg"
              >
                AI-powered document analysis, Q&A, and insights
              </motion.p>
            </div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
            >
              <Link
                href="/dashboard/documents/upload"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 hover:scale-105 transition-all duration-200"
              >
                <Upload className="w-5 h-5" />
                Upload Document
              </Link>
            </motion.div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="group relative bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-white rounded-xl shadow-sm group-hover:shadow-md transition-shadow">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex items-center gap-1 text-green-600 text-sm font-medium">
                  <TrendingUp className="w-4 h-4" />
                  +15%
                </div>
              </div>
              <h3 className="text-3xl font-bold text-slate-900 mb-1">{stats.totalDocuments}</h3>
              <p className="text-slate-600 text-sm font-medium">Total Documents</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="group relative bg-gradient-to-br from-violet-50 to-purple-50 rounded-2xl p-6 border border-violet-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-white rounded-xl shadow-sm group-hover:shadow-md transition-shadow">
                  <Brain className="w-6 h-6 text-violet-600" />
                </div>
                <div className="flex items-center gap-1 text-green-600 text-sm font-medium">
                  <TrendingUp className="w-4 h-4" />
                  +22%
                </div>
              </div>
              <h3 className="text-3xl font-bold text-slate-900 mb-1">{stats.questionsAsked}</h3>
              <p className="text-slate-600 text-sm font-medium">Questions Asked</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="group relative bg-gradient-to-br from-emerald-50 to-green-50 rounded-2xl p-6 border border-emerald-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-white rounded-xl shadow-sm group-hover:shadow-md transition-shadow">
                  <Clock className="w-6 h-6 text-emerald-600" />
                </div>
                <div className="flex items-center gap-1 text-green-600 text-sm font-medium">
                  <TrendingUp className="w-4 h-4" />
                  +8h
                </div>
              </div>
              <h3 className="text-3xl font-bold text-slate-900 mb-1">{stats.timeSaved}h</h3>
              <p className="text-slate-600 text-sm font-medium">Time Saved</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="group relative bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-6 border border-amber-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-white rounded-xl shadow-sm group-hover:shadow-md transition-shadow">
                  <Target className="w-6 h-6 text-amber-600" />
                </div>
                <div className="flex items-center gap-1 text-green-600 text-sm font-medium">
                  <TrendingUp className="w-4 h-4" />
                  +3.2%
                </div>
              </div>
              <h3 className="text-3xl font-bold text-slate-900 mb-1">{stats.avgConfidence}%</h3>
              <p className="text-slate-600 text-sm font-medium">Avg Confidence</p>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Controls Bar */}
        <div className="flex items-center justify-between mb-8">
          {/* Search */}
          <div className="flex-1 max-w-xl">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search documents, tags, or content..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 placeholder-slate-400 transition-all"
              />
            </div>
          </div>

          {/* View Controls */}
          <div className="flex items-center gap-3">
            {/* Filter Button */}
            <div className="relative">
              <button
                onClick={() => setShowFilterMenu(!showFilterMenu)}
                className="flex items-center gap-2 px-4 py-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
              >
                <Filter className="w-5 h-5 text-slate-600" />
                <span className="text-sm font-medium text-slate-700">Filter</span>
              </button>

              {showFilterMenu && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute top-full right-0 mt-2 w-56 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden z-50"
                >
                  <div className="p-2">
                    <button
                      onClick={() => { setFilterCategory('all'); setShowFilterMenu(false); }}
                      className={`w-full text-left px-4 py-2 rounded-lg text-sm transition-colors ${
                        filterCategory === 'all' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      All Documents
                    </button>
                    <button
                      onClick={() => { setFilterCategory('product'); setShowFilterMenu(false); }}
                      className={`w-full text-left px-4 py-2 rounded-lg text-sm transition-colors ${
                        filterCategory === 'product' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      Product Docs
                    </button>
                    <button
                      onClick={() => { setFilterCategory('technical'); setShowFilterMenu(false); }}
                      className={`w-full text-left px-4 py-2 rounded-lg text-sm transition-colors ${
                        filterCategory === 'technical' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      Technical Docs
                    </button>
                    <button
                      onClick={() => { setFilterCategory('financial'); setShowFilterMenu(false); }}
                      className={`w-full text-left px-4 py-2 rounded-lg text-sm transition-colors ${
                        filterCategory === 'financial' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      Financial Docs
                    </button>
                  </div>
                </motion.div>
              )}
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <Grid3x3 className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <List className="w-5 h-5" />
              </button>
            </div>

            {/* Analytics Link */}
            <Link
              href="/dashboard/documents/analytics"
              className="flex items-center gap-2 px-4 py-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
            >
              <BarChart3 className="w-5 h-5 text-slate-600" />
              <span className="text-sm font-medium text-slate-700">Analytics</span>
            </Link>
          </div>
        </div>

        {/* Documents Grid/List */}
        {filteredDocuments.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20"
          >
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-blue-50 mb-6">
              <FolderOpen className="w-12 h-12 text-blue-400" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-3">No documents found</h3>
            <p className="text-slate-600 mb-8 max-w-md mx-auto">
              {searchQuery ? 'Try adjusting your search or filters' : 'Get started by uploading your first document'}
            </p>
            <Link
              href="/dashboard/documents/upload"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors"
            >
              <Upload className="w-5 h-5" />
              Upload Document
            </Link>
          </motion.div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDocuments.map((doc, index) => (
              <motion.div
                key={doc.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="group relative bg-white rounded-2xl border border-slate-200 hover:border-blue-200 hover:shadow-xl transition-all duration-300 overflow-hidden"
              >
                {/* Card Header */}
                <div className="p-6 pb-4">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="p-3 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl group-hover:scale-110 transition-transform">
                        <FileText className="w-6 h-6 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                          {doc.filename}
                        </h3>
                        <p className="text-xs text-slate-500 mt-1">
                          {formatFileSize(doc.size)} • {doc.pageCount} pages
                        </p>
                      </div>
                    </div>
                    <button className="p-1 text-slate-400 hover:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity">
                      <MoreVertical className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Tags */}
                  {doc.tags && doc.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {doc.tags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-4 py-4 border-t border-slate-100">
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 text-slate-900 font-semibold mb-1">
                        <Eye className="w-4 h-4 text-blue-500" />
                        {doc.views}
                      </div>
                      <p className="text-xs text-slate-500">Views</p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 text-slate-900 font-semibold mb-1">
                        <Brain className="w-4 h-4 text-violet-500" />
                        {doc.questions}
                      </div>
                      <p className="text-xs text-slate-500">Questions</p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 text-slate-900 font-semibold mb-1">
                        <Target className="w-4 h-4 text-emerald-500" />
                        {doc.confidence ? `${(doc.confidence * 100).toFixed(0)}%` : 'N/A'}
                      </div>
                      <p className="text-xs text-slate-500">Confidence</p>
                    </div>
                  </div>

                  {/* Upload Date */}
                  <div className="flex items-center gap-2 text-xs text-slate-500 mb-4">
                    <Calendar className="w-3.5 h-3.5" />
                    {formatDate(doc.uploadedAt)}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Link
                      href={`/dashboard/documents/${doc.doc_id}`}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors group/btn"
                    >
                      <span>Open</span>
                      <ArrowUpRight className="w-4 h-4 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
                    </Link>
                    <button className="p-2.5 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
                      <Share2 className="w-4 h-4 text-slate-600" />
                    </button>
                  </div>
                </div>

                {/* Status Badge */}
                {doc.status === 'processing' && (
                  <div className="absolute top-4 right-4 px-3 py-1 bg-amber-100 text-amber-700 text-xs font-medium rounded-full flex items-center gap-1.5">
                    <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                    Processing
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredDocuments.map((doc, index) => (
              <motion.div
                key={doc.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="group bg-white rounded-xl border border-slate-200 hover:border-blue-200 hover:shadow-lg transition-all duration-200 p-5"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl group-hover:scale-110 transition-transform">
                    <FileText className="w-6 h-6 text-blue-600" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-semibold text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                        {doc.filename}
                      </h3>
                      {doc.tags && doc.tags.length > 0 && (
                        <div className="flex gap-2">
                          {doc.tags.map((tag, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs font-medium rounded-full"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-500">
                      <span className="flex items-center gap-1.5">
                        <FileCheck className="w-4 h-4" />
                        {formatFileSize(doc.size)}
                      </span>
                      <span>•</span>
                      <span>{doc.pageCount} pages</span>
                      <span>•</span>
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4" />
                        {formatDate(doc.uploadedAt)}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1.5">
                        <Eye className="w-4 h-4" />
                        {doc.views} views
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1.5">
                        <Brain className="w-4 h-4" />
                        {doc.questions} questions
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      href={`/dashboard/documents/${doc.doc_id}`}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                    >
                      Open
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                    <button className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                      <Share2 className="w-4 h-4 text-slate-600" />
                    </button>
                    <button
                      onClick={() => handleDeleteDocument(doc.doc_id)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
