'use client';

import React, { useState } from 'react';
import { Project, Task } from '../../../types/project-types';
import {
  Download,
  FileText,
  Image,
  BarChart3,
  Mail,
  Calendar,
  Settings,
  Check,
  Clock,
  Users,
  Filter,
  X
} from 'lucide-react';

interface ExportOptionsProps {
  project: Project;
  tasks: Task[];
  onExport?: (format: ExportFormat, options: ExportOptions) => void;
}

export type ExportFormat = 'pdf' | 'excel' | 'csv' | 'png' | 'json';

export interface ExportOptions {
  includeCharts: boolean;
  includeTaskDetails: boolean;
  includeTimeline: boolean;
  includeTeamMetrics: boolean;
  dateRange?: {
    start: Date;
    end: Date;
  };
  taskFilters?: {
    status?: string[];
    priority?: string[];
    assignee?: string[];
  };
  chartTypes?: string[];
  customFields?: string[];
}

export default function ExportOptions({ project, tasks, onExport }: ExportOptionsProps) {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('pdf');
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    includeCharts: true,
    includeTaskDetails: true,
    includeTimeline: true,
    includeTeamMetrics: true,
    chartTypes: ['progress', 'status', 'velocity'],
    customFields: []
  });
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const exportFormats = [
    {
      id: 'pdf' as ExportFormat,
      name: 'PDF Report',
      description: 'Comprehensive project report with charts and analytics',
      icon: FileText,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200'
    },
    {
      id: 'excel' as ExportFormat,
      name: 'Excel Workbook',
      description: 'Detailed spreadsheet with multiple sheets',
      icon: BarChart3,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200'
    },
    {
      id: 'csv' as ExportFormat,
      name: 'CSV Data',
      description: 'Raw task data for further analysis',
      icon: FileText,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200'
    },
    {
      id: 'png' as ExportFormat,
      name: 'Charts Image',
      description: 'High-resolution charts for presentations',
      icon: Image,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200'
    },
    {
      id: 'json' as ExportFormat,
      name: 'JSON Data',
      description: 'Machine-readable project data',
      icon: Settings,
      color: 'text-gray-600',
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-200'
    }
  ];

  const chartOptions = [
    { id: 'progress', name: 'Progress Over Time', description: 'Shows completion trends' },
    { id: 'status', name: 'Status Distribution', description: 'Pie chart of task statuses' },
    { id: 'velocity', name: 'Team Velocity', description: 'Work completion rate' },
    { id: 'priority', name: 'Priority Breakdown', description: 'Tasks by priority level' },
    { id: 'burndown', name: 'Burndown Chart', description: 'Remaining work over time' }
  ];

  const handleExport = async () => {
    if (!onExport) return;
    
    setIsExporting(true);
    try {
      await onExport(selectedFormat, exportOptions);
    } finally {
      setIsExporting(false);
    }
  };

  const updateExportOption = (key: keyof ExportOptions, value: any) => {
    setExportOptions(prev => ({ ...prev, [key]: value }));
  };

  const toggleChartType = (chartId: string) => {
    setExportOptions(prev => ({
      ...prev,
      chartTypes: prev.chartTypes?.includes(chartId)
        ? prev.chartTypes.filter(id => id !== chartId)
        : [...(prev.chartTypes || []), chartId]
    }));
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Export Report</h3>
          <p className="text-sm text-gray-600 mt-1">
            Generate comprehensive reports for {project.name}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
          >
            <Settings className="w-4 h-4" />
            {showAdvanced ? 'Simple' : 'Advanced'}
          </button>
        </div>
      </div>

      {/* Format Selection */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Export Format</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {exportFormats.map((format) => {
            const IconComponent = format.icon;
            return (
              <button
                key={format.id}
                onClick={() => setSelectedFormat(format.id)}
                className={`p-4 rounded-lg border-2 text-left transition-all duration-200 ${
                  selectedFormat === format.id
                    ? `${format.borderColor} ${format.bgColor} ring-2 ring-offset-2 ring-blue-500`
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <IconComponent className={`w-6 h-6 ${format.color} mt-0.5`} />
                  <div className="flex-1">
                    <h5 className="font-medium text-gray-900">{format.name}</h5>
                    <p className="text-sm text-gray-600 mt-1">{format.description}</p>
                  </div>
                  {selectedFormat === format.id && (
                    <Check className="w-5 h-5 text-blue-600" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Basic Options */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Include in Report</h4>
        <div className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={exportOptions.includeCharts}
              onChange={(e) => updateExportOption('includeCharts', e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-gray-500 group-hover:text-blue-600" />
              <span className="text-sm text-gray-700 group-hover:text-gray-900">
                Charts and Visualizations
              </span>
            </div>
          </label>

          <label className="flex items-center gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={exportOptions.includeTaskDetails}
              onChange={(e) => updateExportOption('includeTaskDetails', e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-gray-500 group-hover:text-blue-600" />
              <span className="text-sm text-gray-700 group-hover:text-gray-900">
                Detailed Task Information
              </span>
            </div>
          </label>

          <label className="flex items-center gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={exportOptions.includeTimeline}
              onChange={(e) => updateExportOption('includeTimeline', e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-500 group-hover:text-blue-600" />
              <span className="text-sm text-gray-700 group-hover:text-gray-900">
                Project Timeline
              </span>
            </div>
          </label>

          <label className="flex items-center gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={exportOptions.includeTeamMetrics}
              onChange={(e) => updateExportOption('includeTeamMetrics', e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-500 group-hover:text-blue-600" />
              <span className="text-sm text-gray-700 group-hover:text-gray-900">
                Team Performance Metrics
              </span>
            </div>
          </label>
        </div>
      </div>

      {/* Advanced Options */}
      {showAdvanced && (
        <div className="space-y-6 border-t border-gray-200 pt-6">
          {/* Chart Selection */}
          {exportOptions.includeCharts && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">Chart Types</h4>
              <div className="space-y-2">
                {chartOptions.map((chart) => (
                  <label key={chart.id} className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={exportOptions.chartTypes?.includes(chart.id) || false}
                      onChange={() => toggleChartType(chart.id)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <span className="text-sm text-gray-700 group-hover:text-gray-900">
                        {chart.name}
                      </span>
                      <p className="text-xs text-gray-500">{chart.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Date Range */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Date Range (Optional)</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-600 mb-1">From</label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onChange={(e) => {
                    const start = new Date(e.target.value);
                    updateExportOption('dateRange', {
                      ...exportOptions.dateRange,
                      start
                    });
                  }}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">To</label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onChange={(e) => {
                    const end = new Date(e.target.value);
                    updateExportOption('dateRange', {
                      ...exportOptions.dateRange,
                      end
                    });
                  }}
                />
              </div>
            </div>
          </div>

          {/* Task Filters */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Task Filters</h4>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Status</label>
                <select
                  multiple
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  size={3}
                  onChange={(e) => {
                    const values = Array.from(e.target.selectedOptions, option => option.value);
                    updateExportOption('taskFilters', {
                      ...exportOptions.taskFilters,
                      status: values
                    });
                  }}
                >
                  <option value="todo">To Do</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="blocked">Blocked</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-gray-600 mb-1">Priority</label>
                <select
                  multiple
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  size={4}
                  onChange={(e) => {
                    const values = Array.from(e.target.selectedOptions, option => option.value);
                    updateExportOption('taskFilters', {
                      ...exportOptions.taskFilters,
                      priority: values
                    });
                  }}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Export Button */}
      <div className="flex items-center justify-between pt-6 border-t border-gray-200">
        <div className="text-sm text-gray-600">
          {tasks.length} tasks " {project.name}
        </div>
        
        <button
          onClick={handleExport}
          disabled={isExporting}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
        >
          {isExporting ? (
            <>
              <Clock className="w-4 h-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              Export Report
            </>
          )}
        </button>
      </div>

      {/* Preview Info */}
      <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex items-start gap-2">
          <FileText className="w-4 h-4 text-blue-600 mt-0.5" />
          <div className="text-sm">
            <p className="text-blue-800 font-medium">Report Preview</p>
            <p className="text-blue-700 mt-1">
              Your {selectedFormat.toUpperCase()} report will include{' '}
              {exportOptions.includeCharts && 'charts, '}
              {exportOptions.includeTaskDetails && 'task details, '}
              {exportOptions.includeTimeline && 'timeline, '}
              {exportOptions.includeTeamMetrics && 'team metrics'}
              {exportOptions.chartTypes && exportOptions.chartTypes.length > 0 && 
                ` with ${exportOptions.chartTypes.length} chart types`
              }.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}