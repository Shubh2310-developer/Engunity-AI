'use client';

import React, { useState } from 'react';
import { BarChart3, TrendingUp, Activity, AlertCircle, CheckCircle, Clock, Users, Target, Zap, Brain, FileText, Download, Share2, Maximize2 } from 'lucide-react';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function AnalysisIntegrationPage() {
  const [selectedTimeRange, setSelectedTimeRange] = useState('7d');
  const [activeMetric, setActiveMetric] = useState('productivity');
  
  // Mock analysis data
  const productivityData = [
    { day: 'Mon', tasks: 12, velocity: 85, focus: 78 },
    { day: 'Tue', tasks: 15, velocity: 92, focus: 82 },
    { day: 'Wed', tasks: 8, velocity: 76, focus: 65 },
    { day: 'Thu', tasks: 18, velocity: 94, focus: 88 },
    { day: 'Fri', tasks: 22, velocity: 98, focus: 91 },
    { day: 'Sat', tasks: 5, velocity: 45, focus: 38 },
    { day: 'Sun', tasks: 3, velocity: 32, focus: 28 }
  ];

  const teamPerformance = [
    { member: 'John', efficiency: 92, tasks: 28, quality: 96 },
    { member: 'Sarah', efficiency: 88, tasks: 32, quality: 94 },
    { member: 'Mike', efficiency: 85, tasks: 24, quality: 89 },
    { member: 'Alex', efficiency: 91, tasks: 35, quality: 93 }
  ];

  const riskAnalysis = [
    { category: 'Schedule Risk', value: 25, color: '#EF4444' },
    { category: 'Budget Risk', value: 15, color: '#F59E0B' },
    { category: 'Quality Risk', value: 10, color: '#10B981' },
    { category: 'Resource Risk', value: 35, color: '#8B5CF6' }
  ];

  const insights = [
    {
      id: 1,
      type: 'positive',
      title: 'Peak Productivity Day',
      description: 'Friday shows highest task completion rate with 98% team velocity',
      impact: 'high',
      action: 'Consider scheduling critical tasks on Fridays'
    },
    {
      id: 2,
      type: 'warning',
      title: 'Weekend Activity Drop',
      description: 'Significant productivity decrease during weekends',
      impact: 'medium',
      action: 'Implement weekend coverage strategy'
    },
    {
      id: 3,
      type: 'insight',
      title: 'Resource Allocation',
      description: 'Alex handles 35% more tasks than average team member',
      impact: 'medium',
      action: 'Consider redistributing workload for better balance'
    }
  ];

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'positive': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'insight': return <Brain className="w-5 h-5 text-blue-500" />;
      default: return <Activity className="w-5 h-5 text-gray-500" />;
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {`${entry.dataKey}: ${entry.value}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <BarChart3 className="w-8 h-8 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">Project Analysis</h1>
        </div>
        <p className="text-gray-600">
          AI-powered insights and analytics for your project performance
        </p>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setSelectedTimeRange('7d')}
                className={`px-3 py-1 rounded text-sm transition-colors ${
                  selectedTimeRange === '7d' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
                }`}
              >
                7 Days
              </button>
              <button
                onClick={() => setSelectedTimeRange('30d')}
                className={`px-3 py-1 rounded text-sm transition-colors ${
                  selectedTimeRange === '30d' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
                }`}
              >
                30 Days
              </button>
              <button
                onClick={() => setSelectedTimeRange('90d')}
                className={`px-3 py-1 rounded text-sm transition-colors ${
                  selectedTimeRange === '90d' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
                }`}
              >
                90 Days
              </button>
            </div>

            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setActiveMetric('productivity')}
                className={`px-3 py-1 rounded text-sm transition-colors ${
                  activeMetric === 'productivity' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
                }`}
              >
                Productivity
              </button>
              <button
                onClick={() => setActiveMetric('quality')}
                className={`px-3 py-1 rounded text-sm transition-colors ${
                  activeMetric === 'quality' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
                }`}
              >
                Quality
              </button>
              <button
                onClick={() => setActiveMetric('risks')}
                className={`px-3 py-1 rounded text-sm transition-colors ${
                  activeMetric === 'risks' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
                }`}
              >
                Risks
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1">
              <Download className="w-4 h-4" />
              Export
            </button>
            <button className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1">
              <Share2 className="w-4 h-4" />
              Share
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Charts */}
        <div className="lg:col-span-2 space-y-6">
          {/* Productivity Chart */}
          {activeMetric === 'productivity' && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Team Productivity Trends</h3>
                <button className="p-2 hover:bg-gray-100 rounded">
                  <Maximize2 className="w-4 h-4 text-gray-600" />
                </button>
              </div>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={productivityData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="velocity"
                      stackId="1"
                      stroke="#3B82F6"
                      fill="#3B82F6"
                      fillOpacity={0.6}
                      name="Velocity %"
                    />
                    <Area
                      type="monotone"
                      dataKey="focus"
                      stackId="2"
                      stroke="#10B981"
                      fill="#10B981"
                      fillOpacity={0.6}
                      name="Focus Score"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Team Performance */}
          {activeMetric === 'quality' && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Team Performance Analysis</h3>
                <button className="p-2 hover:bg-gray-100 rounded">
                  <Maximize2 className="w-4 h-4 text-gray-600" />
                </button>
              </div>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={teamPerformance}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="member" />
                    <YAxis />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar dataKey="efficiency" fill="#3B82F6" name="Efficiency %" />
                    <Bar dataKey="quality" fill="#10B981" name="Quality Score" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Risk Analysis */}
          {activeMetric === 'risks' && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Risk Assessment</h3>
                <button className="p-2 hover:bg-gray-100 rounded">
                  <Maximize2 className="w-4 h-4 text-gray-600" />
                </button>
              </div>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={riskAnalysis}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ category, value }) => `${category}: ${value}%`}
                    >
                      {riskAnalysis.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Tasks Completed</p>
                  <p className="text-2xl font-bold text-gray-900">83</p>
                </div>
                <TrendingUp className="w-8 h-8 text-green-500" />
              </div>
              <div className="mt-2 text-sm text-green-600">+12% from last week</div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Avg. Velocity</p>
                  <p className="text-2xl font-bold text-gray-900">78%</p>
                </div>
                <Activity className="w-8 h-8 text-blue-500" />
              </div>
              <div className="mt-2 text-sm text-blue-600">+5% improvement</div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Team Efficiency</p>
                  <p className="text-2xl font-bold text-gray-900">89%</p>
                </div>
                <Users className="w-8 h-8 text-purple-500" />
              </div>
              <div className="mt-2 text-sm text-purple-600">Above target</div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Quality Score</p>
                  <p className="text-2xl font-bold text-gray-900">93%</p>
                </div>
                <Target className="w-8 h-8 text-orange-500" />
              </div>
              <div className="mt-2 text-sm text-orange-600">+3% this week</div>
            </div>
          </div>
        </div>

        {/* Insights Sidebar */}
        <div className="space-y-6">
          {/* AI Insights */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Brain className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">AI Insights</h3>
            </div>
            <div className="space-y-4">
              {insights.map((insight) => (
                <div key={insight.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    {getInsightIcon(insight.type)}
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 mb-1">{insight.title}</h4>
                      <p className="text-sm text-gray-600 mb-2">{insight.description}</p>
                      <div className="flex items-center justify-between">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          insight.impact === 'high' ? 'bg-red-100 text-red-800' :
                          insight.impact === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {insight.impact} impact
                        </span>
                        <button className="text-xs text-blue-600 hover:text-blue-800">
                          View Details
                        </button>
                      </div>
                      {insight.action && (
                        <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-700">
                          <strong>Recommended:</strong> {insight.action}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <button className="w-full text-left p-3 hover:bg-gray-50 rounded-lg transition-colors flex items-center gap-3">
                <FileText className="w-4 h-4 text-blue-600" />
                <span className="text-sm text-gray-700">Generate Report</span>
              </button>
              <button className="w-full text-left p-3 hover:bg-gray-50 rounded-lg transition-colors flex items-center gap-3">
                <Zap className="w-4 h-4 text-purple-600" />
                <span className="text-sm text-gray-700">Run Analysis</span>
              </button>
              <button className="w-full text-left p-3 hover:bg-gray-50 rounded-lg transition-colors flex items-center gap-3">
                <Clock className="w-4 h-4 text-orange-600" />
                <span className="text-sm text-gray-700">Schedule Review</span>
              </button>
            </div>
          </div>

          {/* Analysis Status */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6 border border-blue-200">
            <div className="flex items-center gap-2 mb-3">
              <Activity className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold text-blue-900">Analysis Status</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-blue-800">Data Processing</span>
                <span className="text-blue-600">Complete</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-blue-800">Pattern Recognition</span>
                <span className="text-blue-600">94%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-blue-800">Insight Generation</span>
                <span className="text-blue-600">Complete</span>
              </div>
              <div className="mt-3 p-2 bg-blue-200 rounded text-xs text-blue-800">
                Last updated: 2 minutes ago
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}