'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus,
  Settings,
  Download,
  Maximize2,
  Filter,
  Search,
  Users,
  Flag,
  CheckCircle,
  Clock,
  AlertTriangle,
  MoreHorizontal,
  Edit,
  Trash2,
  Link as LinkIcon
} from 'lucide-react';

// Types for Gantt Chart
interface GanttTask {
  id: string;
  name: string;
  start: Date;
  end: Date;
  progress: number;
  assignee?: string;
  dependencies: string[];
  type: 'task' | 'milestone' | 'group';
  status: 'not-started' | 'in-progress' | 'completed' | 'overdue';
  priority: 'low' | 'medium' | 'high' | 'critical';
  color?: string;
  parent?: string;
  children?: GanttTask[];
}

interface GanttProps {
  tasks: GanttTask[];
  onTaskUpdate?: (taskId: string, updates: Partial<GanttTask>) => void;
  onTaskCreate?: (task: Omit<GanttTask, 'id'>) => void;
  onTaskDelete?: (taskId: string) => void;
  readonly?: boolean;
}

// Sample data
const sampleTasks: GanttTask[] = [
  {
    id: 'g1',
    name: 'Research & Planning Phase',
    start: new Date('2024-11-01'),
    end: new Date('2024-11-15'),
    progress: 100,
    dependencies: [],
    type: 'group',
    status: 'completed',
    priority: 'high',
    color: '#10B981',
    children: [
      {
        id: 't1',
        name: 'Market Research',
        start: new Date('2024-11-01'),
        end: new Date('2024-11-05'),
        progress: 100,
        assignee: 'Alice Johnson',
        dependencies: [],
        type: 'task',
        status: 'completed',
        priority: 'high',
        parent: 'g1'
      },
      {
        id: 't2',
        name: 'Technical Requirements',
        start: new Date('2024-11-03'),
        end: new Date('2024-11-08'),
        progress: 100,
        assignee: 'Shubh',
        dependencies: ['t1'],
        type: 'task',
        status: 'completed',
        priority: 'high',
        parent: 'g1'
      },
      {
        id: 'm1',
        name: 'Planning Complete',
        start: new Date('2024-11-15'),
        end: new Date('2024-11-15'),
        progress: 100,
        dependencies: ['t1', 't2'],
        type: 'milestone',
        status: 'completed',
        priority: 'critical',
        parent: 'g1'
      }
    ]
  },
  {
    id: 'g2',
    name: 'Development Phase',
    start: new Date('2024-11-16'),
    end: new Date('2025-01-05'),
    progress: 60,
    dependencies: ['g1'],
    type: 'group',
    status: 'in-progress',
    priority: 'high',
    color: '#3B82F6',
    children: [
      {
        id: 't3',
        name: 'NLP Pipeline Setup',
        start: new Date('2024-11-16'),
        end: new Date('2024-11-25'),
        progress: 100,
        assignee: 'Alice Johnson',
        dependencies: ['m1'],
        type: 'task',
        status: 'completed',
        priority: 'high',
        parent: 'g2'
      },
      {
        id: 't4',
        name: 'Document Processing',
        start: new Date('2024-11-20'),
        end: new Date('2024-12-10'),
        progress: 75,
        assignee: 'Bob Chen',
        dependencies: ['t3'],
        type: 'task',
        status: 'in-progress',
        priority: 'high',
        parent: 'g2'
      },
      {
        id: 't5',
        name: 'API Development',
        start: new Date('2024-12-01'),
        end: new Date('2024-12-20'),
        progress: 30,
        assignee: 'Shubh',
        dependencies: ['t3'],
        type: 'task',
        status: 'in-progress',
        priority: 'medium',
        parent: 'g2'
      }
    ]
  },
  {
    id: 'g3',
    name: 'Testing & Deployment',
    start: new Date('2024-12-21'),
    end: new Date('2025-01-15'),
    progress: 0,
    dependencies: ['g2'],
    type: 'group',
    status: 'not-started',
    priority: 'high',
    color: '#8B5CF6',
    children: [
      {
        id: 't6',
        name: 'Unit Testing',
        start: new Date('2024-12-21'),
        end: new Date('2025-01-05'),
        progress: 0,
        assignee: 'Alice Johnson',
        dependencies: ['t4', 't5'],
        type: 'task',
        status: 'not-started',
        priority: 'high',
        parent: 'g3'
      },
      {
        id: 't7',
        name: 'Production Deployment',
        start: new Date('2025-01-06'),
        end: new Date('2025-01-15'),
        progress: 0,
        assignee: 'Shubh',
        dependencies: ['t6'],
        type: 'task',
        status: 'not-started',
        priority: 'critical',
        parent: 'g3'
      }
    ]
  }
];

const GanttChart: React.FC<GanttProps> = ({ 
  tasks = sampleTasks, 
  onTaskUpdate, 
  onTaskCreate, 
  onTaskDelete, 
  readonly = false 
}) => {
  const [viewMode, setViewMode] = useState<'days' | 'weeks' | 'months'>('weeks');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['g1', 'g2', 'g3']));
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [dragInfo, setDragInfo] = useState<{
    taskId: string;
    startX: number;
    startDate: Date;
    isResizing: boolean;
    resizeHandle: 'start' | 'end';
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  // Calculate timeline dimensions
  const calculateTimeline = () => {
    const allTasks = tasks.flatMap(task => task.children || [task]);
    const earliestStart = allTasks.reduce((earliest, task) => 
      task.start < earliest ? task.start : earliest, new Date()
    );
    const latestEnd = allTasks.reduce((latest, task) => 
      task.end > latest ? task.end : latest, new Date()
    );

    const dayWidth = viewMode === 'days' ? 40 : viewMode === 'weeks' ? 120 : 30;
    const totalDays = Math.ceil((latestEnd.getTime() - earliestStart.getTime()) / (1000 * 60 * 60 * 24));
    
    return {
      start: earliestStart,
      end: latestEnd,
      totalDays,
      dayWidth,
      totalWidth: totalDays * (dayWidth / (viewMode === 'days' ? 1 : viewMode === 'weeks' ? 7 : 30))
    };
  };

  const timeline = calculateTimeline();

  // Generate timeline headers
  const generateTimelineHeaders = () => {
    const headers: Date[] = [];
    const current = new Date(timeline.start);
    
    while (current <= timeline.end) {
      headers.push(new Date(current));
      
      if (viewMode === 'days') {
        current.setDate(current.getDate() + 1);
      } else if (viewMode === 'weeks') {
        current.setDate(current.getDate() + 7);
      } else {
        current.setMonth(current.getMonth() + 1);
      }
    }
    
    return headers;
  };

  const timelineHeaders = generateTimelineHeaders();

  // Calculate task position and width
  const getTaskPosition = (task: GanttTask) => {
    const taskStart = Math.max(task.start.getTime(), timeline.start.getTime());
    const taskEnd = Math.min(task.end.getTime(), timeline.end.getTime());
    
    const startOffset = (taskStart - timeline.start.getTime()) / (1000 * 60 * 60 * 24);
    const duration = (taskEnd - taskStart) / (1000 * 60 * 60 * 24);
    
    const left = (startOffset / (viewMode === 'days' ? 1 : viewMode === 'weeks' ? 7 : 30)) * timeline.dayWidth;
    const width = Math.max(20, (duration / (viewMode === 'days' ? 1 : viewMode === 'weeks' ? 7 : 30)) * timeline.dayWidth);
    
    return { left, width };
  };

  // Get task bar color based on status
  const getTaskColor = (task: GanttTask) => {
    if (task.color) return task.color;
    
    switch (task.status) {
      case 'completed': return '#10B981';
      case 'in-progress': return '#3B82F6';
      case 'overdue': return '#EF4444';
      case 'not-started': return '#6B7280';
      default: return '#6B7280';
    }
  };

  // Flatten tasks for rendering
  const flattenTasks = (taskList: GanttTask[], level = 0): Array<GanttTask & { level: number; isVisible: boolean }> => {
    const result: Array<GanttTask & { level: number; isVisible: boolean }> = [];
    
    taskList.forEach(task => {
      const isVisible = searchTerm === '' || task.name.toLowerCase().includes(searchTerm.toLowerCase());
      const statusMatch = filterStatus === 'all' || task.status === filterStatus;
      
      if (isVisible && statusMatch) {
        result.push({ ...task, level, isVisible: true });
        
        if (task.children && expandedGroups.has(task.id)) {
          result.push(...flattenTasks(task.children, level + 1));
        }
      }
    });
    
    return result;
  };

  const flatTasks = flattenTasks(tasks);

  // Toggle group expansion
  const toggleGroup = (groupId: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId);
    } else {
      newExpanded.add(groupId);
    }
    setExpandedGroups(newExpanded);
  };

  // Handle task selection
  const selectTask = (taskId: string) => {
    setSelectedTask(selectedTask === taskId ? null : taskId);
  };

  // Mouse handlers for drag and resize
  const handleMouseDown = (e: React.MouseEvent, taskId: string, isResizing = false, handle: 'start' | 'end' = 'start') => {
    if (readonly) return;
    
    e.preventDefault();
    const task = flatTasks.find(t => t.id === taskId);
    if (!task) return;

    setDragInfo({
      taskId,
      startX: e.clientX,
      startDate: new Date(task.start),
      isResizing,
      resizeHandle: handle
    });
  };

  // Global mouse handlers
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragInfo || readonly) return;

      const deltaX = e.clientX - dragInfo.startX;
      const daysDelta = Math.round(deltaX / timeline.dayWidth * (viewMode === 'days' ? 1 : viewMode === 'weeks' ? 7 : 30));
      
      if (daysDelta !== 0 && onTaskUpdate) {
        const task = flatTasks.find(t => t.id === dragInfo.taskId);
        if (!task) return;

        const newStart = new Date(task.start);
        const newEnd = new Date(task.end);

        if (dragInfo.isResizing) {
          if (dragInfo.resizeHandle === 'start') {
            newStart.setDate(newStart.getDate() + daysDelta);
          } else {
            newEnd.setDate(newEnd.getDate() + daysDelta);
          }
        } else {
          newStart.setDate(newStart.getDate() + daysDelta);
          newEnd.setDate(newEnd.getDate() + daysDelta);
        }

        if (newStart < newEnd) {
          onTaskUpdate(dragInfo.taskId, { start: newStart, end: newEnd });
        }
      }
    };

    const handleMouseUp = () => {
      setDragInfo(null);
    };

    if (dragInfo) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [dragInfo, flatTasks, onTaskUpdate, readonly, timeline.dayWidth, viewMode]);

  const TaskRow = ({ task, level }: { task: GanttTask & { level: number }, level: number }) => {
    const position = getTaskPosition(task);
    const color = getTaskColor(task);
    const isSelected = selectedTask === task.id;
    const canExpand = task.type === 'group' && task.children && task.children.length > 0;

    return (
      <div className="relative">
        {/* Task Name Column */}
        <div className="absolute left-0 w-80 h-12 flex items-center px-4 bg-white border-r border-slate-200 z-10">
          <div 
            className="flex items-center gap-2"
            style={{ paddingLeft: `${level * 16}px` }}
          >
            {canExpand && (
              <button
                onClick={() => toggleGroup(task.id)}
                className="p-1 hover:bg-slate-100 rounded"
              >
                <ChevronRight 
                  className={`w-4 h-4 text-slate-500 transition-transform ${
                    expandedGroups.has(task.id) ? 'rotate-90' : ''
                  }`} 
                />
              </button>
            )}
            
            <div className="flex items-center gap-2">
              {task.type === 'milestone' ? (
                <Flag className="w-4 h-4 text-orange-500" />
              ) : task.status === 'completed' ? (
                <CheckCircle className="w-4 h-4 text-green-500" />
              ) : task.status === 'in-progress' ? (
                <Clock className="w-4 h-4 text-blue-500" />
              ) : task.status === 'overdue' ? (
                <AlertTriangle className="w-4 h-4 text-red-500" />
              ) : (
                <div className="w-4 h-4 rounded-full border-2 border-slate-300" />
              )}
              
              <span 
                className={`text-sm font-medium cursor-pointer ${
                  isSelected ? 'text-blue-600' : 'text-slate-900'
                }`}
                onClick={() => selectTask(task.id)}
              >
                {task.name}
              </span>
            </div>
          </div>
          
          <div className="ml-auto flex items-center gap-2">
            {task.assignee && (
              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-medium">
                {task.assignee[0]}
              </div>
            )}
            
            <div className={`px-2 py-1 rounded text-xs font-medium ${
              task.priority === 'critical' ? 'bg-red-100 text-red-700' :
              task.priority === 'high' ? 'bg-orange-100 text-orange-700' :
              task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
              'bg-green-100 text-green-700'
            }`}>
              {task.priority}
            </div>
          </div>
        </div>

        {/* Task Bar */}
        <div 
          className="absolute h-12 flex items-center"
          style={{ left: `${320 + position.left}px`, width: `${position.width}px` }}
        >
          <div
            className={`relative h-6 rounded cursor-pointer transition-all ${
              isSelected ? 'ring-2 ring-blue-500 ring-offset-2' : ''
            }`}
            style={{ 
              backgroundColor: color,
              width: '100%'
            }}
            onMouseDown={(e) => handleMouseDown(e, task.id)}
            onClick={() => selectTask(task.id)}
          >
            {/* Progress Bar */}
            <div
              className="absolute top-0 left-0 h-full bg-black bg-opacity-20 rounded"
              style={{ width: `${task.progress}%` }}
            />
            
            {/* Task Text */}
            <div className="absolute inset-0 flex items-center px-2">
              <span className="text-white text-xs font-medium truncate">
                {task.type === 'milestone' ? 'Æ' : task.name}
              </span>
            </div>

            {/* Resize Handles */}
            {!readonly && isSelected && task.type !== 'milestone' && (
              <>
                <div
                  className="absolute left-0 top-0 w-2 h-full cursor-ew-resize bg-white bg-opacity-50 hover:bg-opacity-80"
                  onMouseDown={(e) => handleMouseDown(e, task.id, true, 'start')}
                />
                <div
                  className="absolute right-0 top-0 w-2 h-full cursor-ew-resize bg-white bg-opacity-50 hover:bg-opacity-80"
                  onMouseDown={(e) => handleMouseDown(e, task.id, true, 'end')}
                />
              </>
            )}
          </div>

          {/* Task Duration Text */}
          <span className="ml-2 text-xs text-slate-600">
            {Math.ceil((task.end.getTime() - task.start.getTime()) / (1000 * 60 * 60 * 24))}d
          </span>
        </div>

        {/* Dependencies Lines */}
        {task.dependencies.map(depId => {
          const depTask = flatTasks.find(t => t.id === depId);
          if (!depTask) return null;
          
          const depPosition = getTaskPosition(depTask);
          const currentPosition = getTaskPosition(task);
          
          return (
            <svg
              key={depId}
              className="absolute pointer-events-none"
              style={{
                left: `${320 + depPosition.left + depPosition.width}px`,
                top: '24px',
                width: `${currentPosition.left - depPosition.left - depPosition.width}px`,
                height: '2px'
              }}
            >
              <line
                x1="0"
                y1="1"
                x2="100%"
                y2="1"
                stroke="#94A3B8"
                strokeWidth="2"
                markerEnd="url(#arrowhead)"
              />
            </svg>
          );
        })}
      </div>
    );
  };

  return (
    <div className={`relative ${isFullscreen ? 'fixed inset-0 z-50 bg-white' : 'h-full'}`} ref={containerRef}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-white">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold text-slate-900">Project Timeline</h2>
          
          {/* View Mode Selector */}
          <div className="flex items-center bg-slate-100 rounded-lg p-1">
            {(['days', 'weeks', 'months'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  viewMode === mode 
                    ? 'bg-white text-slate-900 shadow-sm' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="not-started">Not Started</option>
            <option value="in-progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="overdue">Overdue</option>
          </select>

          {/* Actions */}
          {!readonly && (
            <button 
              onClick={() => onTaskCreate?.({
                name: 'New Task',
                start: new Date(),
                end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                progress: 0,
                dependencies: [],
                type: 'task',
                status: 'not-started',
                priority: 'medium'
              })}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              Add Task
            </button>
          )}

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
          >
            <Maximize2 className="w-4 h-4" />
          </button>

          <button className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg">
            <Download className="w-4 h-4" />
          </button>

          <button className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg">
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Gantt Chart Content */}
      <div className="relative flex-1 overflow-auto" ref={timelineRef}>
        {/* Timeline Header */}
        <div className="sticky top-0 z-20 bg-white border-b border-slate-200">
          <div className="flex">
            {/* Task Name Header */}
            <div className="w-80 p-4 text-sm font-medium text-slate-700 bg-slate-50 border-r border-slate-200">
              Task Name
            </div>
            
            {/* Timeline Headers */}
            <div className="flex-1 flex">
              {timelineHeaders.map((date, index) => (
                <div
                  key={index}
                  className="flex-shrink-0 p-2 text-center border-r border-slate-200 bg-slate-50"
                  style={{ width: `${timeline.dayWidth}px` }}
                >
                  <div className="text-xs font-medium text-slate-700">
                    {viewMode === 'days' 
                      ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                      : viewMode === 'weeks'
                      ? `W${Math.ceil((date.getTime() - new Date(date.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000))}`
                      : date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
                    }
                  </div>
                  {viewMode === 'weeks' && (
                    <div className="text-xs text-slate-500 mt-1">
                      {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Task Rows */}
        <div className="relative">
          {flatTasks.map((task, index) => (
            <div
              key={task.id}
              className={`relative h-12 border-b border-slate-100 ${
                index % 2 === 0 ? 'bg-white' : 'bg-slate-50'
              } hover:bg-slate-100`}
            >
              <TaskRow task={task} level={task.level} />
            </div>
          ))}

          {/* Today Line */}
          {(() => {
            const todayOffset = (new Date().getTime() - timeline.start.getTime()) / (1000 * 60 * 60 * 24);
            const todayX = (todayOffset / (viewMode === 'days' ? 1 : viewMode === 'weeks' ? 7 : 30)) * timeline.dayWidth;
            
            if (todayX >= 0 && todayX <= timeline.totalWidth) {
              return (
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10 pointer-events-none"
                  style={{ left: `${320 + todayX}px` }}
                >
                  <div className="absolute -top-6 -left-6 w-12 h-6 bg-red-500 text-white text-xs flex items-center justify-center rounded">
                    Today
                  </div>
                </div>
              );
            }
            return null;
          })()}

          {/* SVG for dependency arrows */}
          <svg className="absolute inset-0 pointer-events-none" style={{ zIndex: 5 }}>
            <defs>
              <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="7"
                refX="9"
                refY="3.5"
                orient="auto"
              >
                <polygon
                  points="0 0, 10 3.5, 0 7"
                  fill="#94A3B8"
                />
              </marker>
            </defs>
          </svg>
        </div>
      </div>

      {/* Task Details Panel */}
      {selectedTask && (() => {
        const task = flatTasks.find(t => t.id === selectedTask);
        if (!task) return null;

        return (
          <div className="absolute right-4 top-16 w-80 bg-white border border-slate-200 rounded-lg shadow-lg z-30">
            <div className="p-4 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-900">{task.name}</h3>
                <button
                  onClick={() => setSelectedTask(null)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <div className="p-4 space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Status</label>
                <div className={`mt-1 px-3 py-1 rounded-full text-sm font-medium inline-block ${
                  task.status === 'completed' ? 'bg-green-100 text-green-800' :
                  task.status === 'in-progress' ? 'bg-blue-100 text-blue-800' :
                  task.status === 'overdue' ? 'bg-red-100 text-red-800' :
                  'bg-slate-100 text-slate-800'
                }`}>
                  {task.status.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Start Date</label>
                  <div className="mt-1 text-sm text-slate-900">
                    {task.start.toLocaleDateString()}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">End Date</label>
                  <div className="mt-1 text-sm text-slate-900">
                    {task.end.toLocaleDateString()}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Progress</label>
                <div className="mt-1">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-slate-700">Completion</span>
                    <span className="font-medium text-slate-900">{task.progress}%</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all"
                      style={{ width: `${task.progress}%` }}
                    />
                  </div>
                </div>
              </div>

              {task.assignee && (
                <div>
                  <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Assignee</label>
                  <div className="mt-1 flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                      {task.assignee[0]}
                    </div>
                    <span className="text-sm text-slate-900">{task.assignee}</span>
                  </div>
                </div>
              )}

              {task.dependencies.length > 0 && (
                <div>
                  <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Dependencies</label>
                  <div className="mt-1 space-y-1">
                    {task.dependencies.map(depId => {
                      const depTask = flatTasks.find(t => t.id === depId);
                      return depTask ? (
                        <div key={depId} className="flex items-center gap-2">
                          <LinkIcon className="w-3 h-3 text-slate-400" />
                          <span className="text-sm text-slate-700">{depTask.name}</span>
                        </div>
                      ) : null;
                    })}
                  </div>
                </div>
              )}

              {!readonly && (
                <div className="flex gap-2 pt-2 border-t border-slate-200">
                  <button className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50">
                    <Edit className="w-4 h-4" />
                    Edit
                  </button>
                  <button 
                    onClick={() => {
                      onTaskDelete?.(task.id);
                      setSelectedTask(null);
                    }}
                    className="flex items-center justify-center gap-2 px-3 py-2 text-sm text-red-700 border border-red-300 rounded-lg hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-white border border-slate-200 rounded-lg p-3 shadow-sm">
        <div className="text-xs font-medium text-slate-600 mb-2 uppercase tracking-wide">Legend</div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-4 h-2 bg-green-500 rounded" />
            <span className="text-xs text-slate-700">Completed</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-2 bg-blue-500 rounded" />
            <span className="text-xs text-slate-700">In Progress</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-2 bg-gray-400 rounded" />
            <span className="text-xs text-slate-700">Not Started</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-2 bg-red-500 rounded" />
            <span className="text-xs text-slate-700">Overdue</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GanttChart;