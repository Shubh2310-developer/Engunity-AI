'use client';

import React, { useState, useMemo } from 'react';
import { Project, Task, TaskStatus, Priority } from '../../../types/project-types';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  RadialBarChart,
  RadialBar
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Clock,
  Users,
  Target,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  PieChart as PieChartIcon,
  LineChart as LineChartIcon,
  Zap
} from 'lucide-react';

interface ProgressChartsProps {
  project: Project;
  tasks: Task[];
  timeRange?: 'week' | 'month' | 'quarter' | 'year';
}

export default function ProgressCharts({ project, tasks, timeRange = 'month' }: ProgressChartsProps) {
  const [activeChart, setActiveChart] = useState<'progress' | 'status' | 'priority' | 'velocity'>('progress');

  // Calculate progress data
  const progressData = useMemo(() => {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const inProgressTasks = tasks.filter(t => t.status === 'in_progress').length;
    const todoTasks = tasks.filter(t => t.status === 'todo').length;
    const blockedTasks = tasks.filter(t => t.status === 'blocked').length;

    return {
      totalTasks,
      completedTasks,
      inProgressTasks,
      todoTasks,
      blockedTasks,
      completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
    };
  }, [tasks]);

  // Task status distribution for pie chart
  const statusDistribution = [
    { name: 'Completed', value: progressData.completedTasks, color: '#10B981' },
    { name: 'In Progress', value: progressData.inProgressTasks, color: '#3B82F6' },
    { name: 'To Do', value: progressData.todoTasks, color: '#6B7280' },
    { name: 'Blocked', value: progressData.blockedTasks, color: '#EF4444' }
  ].filter(item => item.value > 0);

  // Priority distribution
  const priorityDistribution = [
    { name: 'Critical', value: tasks.filter(t => t.priority === 'critical').length, color: '#DC2626' },
    { name: 'High', value: tasks.filter(t => t.priority === 'high').length, color: '#EA580C' },
    { name: 'Medium', value: tasks.filter(t => t.priority === 'medium').length, color: '#CA8A04' },
    { name: 'Low', value: tasks.filter(t => t.priority === 'low').length, color: '#2563EB' }
  ].filter(item => item.value > 0);

  // Mock velocity data (would come from historical data)
  const velocityData = [
    { week: 'Week 1', completed: 12, planned: 15 },
    { week: 'Week 2', completed: 18, planned: 20 },
    { week: 'Week 3', completed: 15, planned: 18 },
    { week: 'Week 4', completed: 22, planned: 25 }
  ];

  // Progress over time (mock data)
  const progressOverTime = [
    { date: '2024-01-01', completed: 10, total: 50 },
    { date: '2024-01-15', completed: 25, total: 55 },
    { date: '2024-02-01', completed: 35, total: 60 },
    { date: '2024-02-15', completed: 45, total: 65 },
    { date: '2024-03-01', completed: progressData.completedTasks, total: progressData.totalTasks }
  ].map(item => ({
    ...item,
    percentage: Math.round((item.completed / item.total) * 100)
  }));

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
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm">Completion Rate</p>
              <p className="text-2xl font-bold">{progressData.completionRate}%</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-200" />
          </div>
          <div className="mt-2 flex items-center text-green-100 text-xs">
            <TrendingUp className="w-4 h-4 mr-1" />
            +12% from last month
          </div>
        </div>

        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">Active Tasks</p>
              <p className="text-2xl font-bold">{progressData.inProgressTasks}</p>
            </div>
            <Activity className="w-8 h-8 text-blue-200" />
          </div>
          <div className="mt-2 flex items-center text-blue-100 text-xs">
            <TrendingUp className="w-4 h-4 mr-1" />
            +3 from last week
          </div>
        </div>

        <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-lg p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-yellow-100 text-sm">Avg. Velocity</p>
              <p className="text-2xl font-bold">18.5</p>
            </div>
            <Zap className="w-8 h-8 text-yellow-200" />
          </div>
          <div className="mt-2 flex items-center text-yellow-100 text-xs">
            <TrendingDown className="w-4 h-4 mr-1" />
            -2% from target
          </div>
        </div>

        <div className="bg-gradient-to-r from-red-500 to-red-600 rounded-lg p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-100 text-sm">Blocked</p>
              <p className="text-2xl font-bold">{progressData.blockedTasks}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-red-200" />
          </div>
          <div className="mt-2 flex items-center text-red-100 text-xs">
            {progressData.blockedTasks > 0 ? (
              <>
                <AlertTriangle className="w-4 h-4 mr-1" />
                Needs attention
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-1" />
                All clear
              </>
            )}
          </div>
        </div>
      </div>

      {/* Chart Navigation */}
      <div className="flex flex-wrap gap-2 p-1 bg-gray-100 rounded-lg">
        <button
          onClick={() => setActiveChart('progress')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
            activeChart === 'progress'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <LineChartIcon className="w-4 h-4" />
          Progress Over Time
        </button>
        <button
          onClick={() => setActiveChart('status')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
            activeChart === 'status'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <PieChartIcon className="w-4 h-4" />
          Status Distribution
        </button>
        <button
          onClick={() => setActiveChart('priority')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
            activeChart === 'priority'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Target className="w-4 h-4" />
          Priority Breakdown
        </button>
        <button
          onClick={() => setActiveChart('velocity')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
            activeChart === 'velocity'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Team Velocity
        </button>
      </div>

      {/* Charts */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        {activeChart === 'progress' && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Progress Over Time</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={progressOverTime}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="percentage"
                    stroke="#3B82F6"
                    fill="#3B82F6"
                    fillOpacity={0.3}
                    name="Completion %"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {activeChart === 'status' && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Task Status Distribution</h3>
            <div className="flex flex-col lg:flex-row items-center gap-8">
              <div className="h-80 flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusDistribution}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {statusDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              
              <div className="space-y-3">
                {statusDistribution.map((item, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm font-medium text-gray-700">{item.name}</span>
                    <span className="text-sm text-gray-500">({item.value} tasks)</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeChart === 'priority' && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Priority Distribution</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart
                  cx="50%"
                  cy="50%"
                  innerRadius="20%"
                  outerRadius="90%"
                  data={priorityDistribution}
                >
                  <RadialBar
                    dataKey="value"
                    cornerRadius={10}
                    fill="#8884d8"
                  />
                  <Legend />
                  <Tooltip />
                </RadialBarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {activeChart === 'velocity' && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Team Velocity</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={velocityData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" />
                  <YAxis />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey="planned" fill="#E5E7EB" name="Planned" />
                  <Bar dataKey="completed" fill="#3B82F6" name="Completed" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* Insights Panel */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-6 border border-purple-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-purple-600" />
          Project Insights
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <h4 className="font-medium text-gray-700">Performance</h4>
            <div className="space-y-1 text-sm text-gray-600">
              <p>" {progressData.completionRate}% of tasks completed</p>
              <p>" {progressData.inProgressTasks} tasks currently active</p>
              <p>" Average velocity: 18.5 tasks/week</p>
            </div>
          </div>
          
          <div className="space-y-2">
            <h4 className="font-medium text-gray-700">Recommendations</h4>
            <div className="space-y-1 text-sm text-gray-600">
              {progressData.blockedTasks > 0 && (
                <p>" Focus on unblocking {progressData.blockedTasks} blocked tasks</p>
              )}
              <p>" Consider redistributing high-priority tasks</p>
              <p>" Team performance is {progressData.completionRate > 75 ? 'excellent' : 'good'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}