'use client';

import React, { useState, useRef } from 'react';
import {
  Plus,
  MoreHorizontal,
  Users,
  Calendar,
  Flag,
  MessageSquare,
  Paperclip,
  Eye,
  Edit,
  Trash2,
  Archive,
  Copy,
  ExternalLink,
  CheckCircle,
  Clock,
  AlertTriangle,
  Zap,
  Filter,
  Search,
  Settings,
  Download,
  ChevronDown,
  User,
  Tag,
  Star,
  ArrowRight
} from 'lucide-react';
import { Task, ProjectMember, TaskStatus, ProjectPriority } from '../../../types/project-types';

// Enhanced Task interface for Kanban
interface KanbanTask extends Omit<Task, 'status'> {
  status: TaskStatus;
  labels: string[];
  checklist?: {
    total: number;
    completed: number;
  };
  attachmentCount?: number;
  commentCount?: number;
  watchers?: string[];
  blockedBy?: string[];
  timeSpent?: number;
  timeEstimated?: number;
  dueDate?: string;
}

// Kanban Column interface
interface KanbanColumn {
  id: string;
  title: string;
  status: TaskStatus;
  color: string;
  limit?: number;
  tasks: KanbanTask[];
  collapsed?: boolean;
}

// Sample data
const sampleColumns: KanbanColumn[] = [
  {
    id: 'backlog',
    title: 'Backlog',
    status: 'todo',
    color: '#6B7280',
    tasks: [
      {
        id: 'task-1',
        title: 'Database Schema Design',
        description: 'Design the database schema for user management and project data',
        status: 'todo',
        priority: 'Medium',
        assigneeId: 'user-1',
        assignee: {
          id: 'user-1',
          name: 'Alice Johnson',
          email: 'alice@engunity.ai',
          avatar: 'A',
          role: 'Contributor',
          online: true,
          joinedAt: '2024-11-01',
          lastActivity: '2 hours ago',
          permissions: []
        },
        reporterId: 'user-2',
        reporter: {
          id: 'user-2',
          name: 'Shubh',
          email: 'shubh@engunity.ai',
          avatar: 'S',
          role: 'Owner',
          online: true,
          joinedAt: '2024-10-01',
          lastActivity: '1 hour ago',
          permissions: []
        },
        tags: ['Backend', 'Database'],
        labels: ['High Priority', 'Technical'],
        dueDate: '2025-01-10',
        createdAt: '2024-11-01',
        updatedAt: '2024-11-05',
        estimatedHours: 16,
        actualHours: 0,
        timeSpent: 0,
        timeEstimated: 16,
        dependencies: [],
        subtasks: [],
        comments: [],
        attachments: [],
        checklist: { total: 5, completed: 0 },
        attachmentCount: 2,
        commentCount: 3,
        watchers: ['user-1', 'user-2'],
        milestoneId: 'milestone-1'
      },
      {
        id: 'task-2',
        title: 'API Documentation',
        description: 'Create comprehensive API documentation for all endpoints',
        status: 'todo',
        priority: 'Low',
        assigneeId: 'user-3',
        assignee: {
          id: 'user-3',
          name: 'Bob Chen',
          email: 'bob@engunity.ai',
          avatar: 'B',
          role: 'Contributor',
          online: false,
          joinedAt: '2024-10-15',
          lastActivity: '1 day ago',
          permissions: []
        },
        reporterId: 'user-2',
        reporter: {
          id: 'user-2',
          name: 'Shubh',
          email: 'shubh@engunity.ai',
          avatar: 'S',
          role: 'Owner',
          online: true,
          joinedAt: '2024-10-01',
          lastActivity: '1 hour ago',
          permissions: []
        },
        tags: ['Documentation'],
        labels: ['Documentation'],
        dueDate: '2025-01-20',
        createdAt: '2024-11-02',
        updatedAt: '2024-11-02',
        estimatedHours: 8,
        actualHours: 0,
        timeSpent: 0,
        timeEstimated: 8,
        dependencies: [],
        subtasks: [],
        comments: [],
        attachments: [],
        attachmentCount: 0,
        commentCount: 1,
        watchers: ['user-3']
      }
    ]
  },
  {
    id: 'todo',
    title: 'To Do',
    status: 'todo',
    color: '#3B82F6',
    limit: 8,
    tasks: [
      {
        id: 'task-3',
        title: 'User Authentication System',
        description: 'Implement JWT-based authentication with refresh tokens',
        status: 'todo',
        priority: 'High',
        assigneeId: 'user-1',
        assignee: {
          id: 'user-1',
          name: 'Alice Johnson',
          email: 'alice@engunity.ai',
          avatar: 'A',
          role: 'Contributor',
          online: true,
          joinedAt: '2024-11-01',
          lastActivity: '2 hours ago',
          permissions: []
        },
        reporterId: 'user-2',
        reporter: {
          id: 'user-2',
          name: 'Shubh',
          email: 'shubh@engunity.ai',
          avatar: 'S',
          role: 'Owner',
          online: true,
          joinedAt: '2024-10-01',
          lastActivity: '1 hour ago',
          permissions: []
        },
        tags: ['Backend', 'Security'],
        labels: ['Critical', 'Security'],
        dueDate: '2025-01-08',
        createdAt: '2024-11-03',
        updatedAt: '2024-11-03',
        estimatedHours: 24,
        actualHours: 0,
        timeSpent: 0,
        timeEstimated: 24,
        dependencies: ['task-1'],
        subtasks: [],
        comments: [],
        attachments: [],
        checklist: { total: 8, completed: 0 },
        attachmentCount: 1,
        commentCount: 5,
        watchers: ['user-1', 'user-2', 'user-4'],
        blockedBy: ['task-1']
      }
    ]
  },
  {
    id: 'in-progress',
    title: 'In Progress',
    status: 'in-progress',
    color: '#F59E0B',
    limit: 4,
    tasks: [
      {
        id: 'task-4',
        title: 'NLP Pipeline Setup',
        description: 'Configure the natural language processing pipeline for document analysis',
        status: 'in-progress',
        priority: 'High',
        assigneeId: 'user-1',
        assignee: {
          id: 'user-1',
          name: 'Alice Johnson',
          email: 'alice@engunity.ai',
          avatar: 'A',
          role: 'Contributor',
          online: true,
          joinedAt: '2024-11-01',
          lastActivity: '2 hours ago',
          permissions: []
        },
        reporterId: 'user-2',
        reporter: {
          id: 'user-2',
          name: 'Shubh',
          email: 'shubh@engunity.ai',
          avatar: 'S',
          role: 'Owner',
          online: true,
          joinedAt: '2024-10-01',
          lastActivity: '1 hour ago',
          permissions: []
        },
        tags: ['AI', 'Backend'],
        labels: ['Machine Learning', 'High Priority'],
        dueDate: '2024-12-15',
        createdAt: '2024-11-01',
        updatedAt: '2024-11-06',
        estimatedHours: 32,
        actualHours: 24,
        timeSpent: 24,
        timeEstimated: 32,
        dependencies: [],
        subtasks: [],
        comments: [],
        attachments: [],
        checklist: { total: 6, completed: 4 },
        attachmentCount: 3,
        commentCount: 8,
        watchers: ['user-1', 'user-2']
      },
      {
        id: 'task-5',
        title: 'Frontend UI Components',
        description: 'Build reusable React components for the dashboard',
        status: 'in-progress',
        priority: 'Medium',
        assigneeId: 'user-4',
        assignee: {
          id: 'user-4',
          name: 'Carol Davis',
          email: 'carol@engunity.ai',
          avatar: 'C',
          role: 'Contributor',
          online: true,
          joinedAt: '2024-10-20',
          lastActivity: '30 minutes ago',
          permissions: []
        },
        reporterId: 'user-2',
        reporter: {
          id: 'user-2',
          name: 'Shubh',
          email: 'shubh@engunity.ai',
          avatar: 'S',
          role: 'Owner',
          online: true,
          joinedAt: '2024-10-01',
          lastActivity: '1 hour ago',
          permissions: []
        },
        tags: ['Frontend', 'React'],
        labels: ['UI/UX', 'Components'],
        dueDate: '2024-12-20',
        createdAt: '2024-11-04',
        updatedAt: '2024-11-06',
        estimatedHours: 20,
        actualHours: 12,
        timeSpent: 12,
        timeEstimated: 20,
        dependencies: [],
        subtasks: [],
        comments: [],
        attachments: [],
        checklist: { total: 10, completed: 6 },
        attachmentCount: 5,
        commentCount: 4,
        watchers: ['user-4', 'user-2']
      }
    ]
  },
  {
    id: 'review',
    title: 'Code Review',
    status: 'review',
    color: '#8B5CF6',
    limit: 3,
    tasks: [
      {
        id: 'task-6',
        title: 'Document Processing Module',
        description: 'PDF and Word document parsing functionality',
        status: 'review',
        priority: 'High',
        assigneeId: 'user-3',
        assignee: {
          id: 'user-3',
          name: 'Bob Chen',
          email: 'bob@engunity.ai',
          avatar: 'B',
          role: 'Contributor',
          online: false,
          joinedAt: '2024-10-15',
          lastActivity: '1 day ago',
          permissions: []
        },
        reporterId: 'user-2',
        reporter: {
          id: 'user-2',
          name: 'Shubh',
          email: 'shubh@engunity.ai',
          avatar: 'S',
          role: 'Owner',
          online: true,
          joinedAt: '2024-10-01',
          lastActivity: '1 hour ago',
          permissions: []
        },
        tags: ['Backend', 'Processing'],
        labels: ['Code Review', 'Ready'],
        dueDate: '2024-12-10',
        createdAt: '2024-10-25',
        updatedAt: '2024-11-05',
        estimatedHours: 28,
        actualHours: 26,
        timeSpent: 26,
        timeEstimated: 28,
        dependencies: [],
        subtasks: [],
        comments: [],
        attachments: [],
        checklist: { total: 4, completed: 4 },
        attachmentCount: 2,
        commentCount: 6,
        watchers: ['user-3', 'user-1', 'user-2']
      }
    ]
  },
  {
    id: 'done',
    title: 'Done',
    status: 'done',
    color: '#10B981',
    tasks: [
      {
        id: 'task-7',
        title: 'Project Setup & Configuration',
        description: 'Initial project setup with development environment configuration',
        status: 'done',
        priority: 'High',
        assigneeId: 'user-2',
        assignee: {
          id: 'user-2',
          name: 'Shubh',
          email: 'shubh@engunity.ai',
          avatar: 'S',
          role: 'Owner',
          online: true,
          joinedAt: '2024-10-01',
          lastActivity: '1 hour ago',
          permissions: []
        },
        reporterId: 'user-2',
        reporter: {
          id: 'user-2',
          name: 'Shubh',
          email: 'shubh@engunity.ai',
          avatar: 'S',
          role: 'Owner',
          online: true,
          joinedAt: '2024-10-01',
          lastActivity: '1 hour ago',
          permissions: []
        },
        tags: ['Setup', 'Configuration'],
        labels: ['Initial Setup', 'Environment'],
        dueDate: '2024-11-01',
        createdAt: '2024-10-20',
        updatedAt: '2024-10-30',
        estimatedHours: 8,
        actualHours: 6,
        timeSpent: 6,
        timeEstimated: 8,
        dependencies: [],
        subtasks: [],
        comments: [],
        attachments: [],
        checklist: { total: 3, completed: 3 },
        attachmentCount: 1,
        commentCount: 2,
        watchers: ['user-2']
      },
      {
        id: 'task-8',
        title: 'Market Research Analysis',
        description: 'Competitive analysis and market research for AI research tools',
        status: 'done',
        priority: 'Medium',
        assigneeId: 'user-1',
        assignee: {
          id: 'user-1',
          name: 'Alice Johnson',
          email: 'alice@engunity.ai',
          avatar: 'A',
          role: 'Contributor',
          online: true,
          joinedAt: '2024-11-01',
          lastActivity: '2 hours ago',
          permissions: []
        },
        reporterId: 'user-2',
        reporter: {
          id: 'user-2',
          name: 'Shubh',
          email: 'shubh@engunity.ai',
          avatar: 'S',
          role: 'Owner',
          online: true,
          joinedAt: '2024-10-01',
          lastActivity: '1 hour ago',
          permissions: []
        },
        tags: ['Research', 'Analysis'],
        labels: ['Research', 'Completed'],
        dueDate: '2024-11-05',
        createdAt: '2024-10-22',
        updatedAt: '2024-11-04',
        estimatedHours: 12,
        actualHours: 14,
        timeSpent: 14,
        timeEstimated: 12,
        dependencies: [],
        subtasks: [],
        comments: [],
        attachments: [],
        checklist: { total: 5, completed: 5 },
        attachmentCount: 4,
        commentCount: 3,
        watchers: ['user-1', 'user-2']
      }
    ]
  }
];

interface KanbanBoardProps {
  columns?: KanbanColumn[];
  onTaskMove?: (taskId: string, fromColumn: string, toColumn: string) => void;
  onTaskCreate?: (columnId: string, task: Omit<KanbanTask, 'id'>) => void;
  onTaskUpdate?: (taskId: string, updates: Partial<KanbanTask>) => void;
  onTaskDelete?: (taskId: string) => void;
  readonly?: boolean;
}

const KanbanBoard: React.FC<KanbanBoardProps> = ({
  columns = sampleColumns,
  onTaskMove,
  onTaskCreate,
  onTaskUpdate,
  onTaskDelete,
  readonly = false
}) => {
  const [boardColumns, setBoardColumns] = useState(columns);
  const [draggedTask, setDraggedTask] = useState<KanbanTask | null>(null);
  const [draggedOverColumn, setDraggedOverColumn] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<KanbanTask | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAssignee, setFilterAssignee] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [isCreatingTask, setIsCreatingTask] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');

  // Get task priority color
  const getPriorityColor = (priority: ProjectPriority) => {
    const colors = {
      'Critical': 'bg-red-100 text-red-800 border-red-300',
      'High': 'bg-orange-100 text-orange-800 border-orange-300',
      'Medium': 'bg-yellow-100 text-yellow-800 border-yellow-300',
      'Low': 'bg-green-100 text-green-800 border-green-300'
    };
    return colors[priority] || colors.Medium;
  };

  // Get task status icon
  const getStatusIcon = (status: TaskStatus) => {
    switch (status) {
      case 'done': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'in-progress': return <Clock className="w-4 h-4 text-blue-500" />;
      case 'review': return <Eye className="w-4 h-4 text-purple-500" />;
      case 'blocked': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default: return <div className="w-4 h-4 rounded-full border-2 border-slate-300" />;
    }
  };

  // Handle drag and drop
  const handleDragStart = (task: KanbanTask) => {
    setDraggedTask(task);
  };

  const handleDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    setDraggedOverColumn(columnId);
  };

  const handleDrop = (e: React.DragEvent, targetColumnId: string) => {
    e.preventDefault();
    
    if (!draggedTask) return;

    const sourceColumn = boardColumns.find(col => 
      col.tasks.some(task => task.id === draggedTask.id)
    );
    
    if (!sourceColumn || sourceColumn.id === targetColumnId) return;

    // Check column limits
    const targetColumn = boardColumns.find(col => col.id === targetColumnId);
    if (targetColumn?.limit && targetColumn.tasks.length >= targetColumn.limit) {
      alert(`Column "${targetColumn.title}" has reached its limit of ${targetColumn.limit} tasks`);
      return;
    }

    // Move task
    const newColumns = boardColumns.map(column => {
      if (column.id === sourceColumn.id) {
        return {
          ...column,
          tasks: column.tasks.filter(task => task.id !== draggedTask.id)
        };
      }
      if (column.id === targetColumnId) {
        const updatedTask = { ...draggedTask, status: column.status };
        return {
          ...column,
          tasks: [...column.tasks, updatedTask]
        };
      }
      return column;
    });

    setBoardColumns(newColumns);
    onTaskMove?.(draggedTask.id, sourceColumn.id, targetColumnId);
    setDraggedTask(null);
    setDraggedOverColumn(null);
  };

  const handleDragEnd = () => {
    setDraggedTask(null);
    setDraggedOverColumn(null);
  };

  // Filter tasks
  const filterTasks = (tasks: KanbanTask[]) => {
    return tasks.filter(task => {
      const matchesSearch = searchTerm === '' || 
        task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.description.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesAssignee = filterAssignee === 'all' || 
        task.assignee?.id === filterAssignee;
      
      const matchesPriority = filterPriority === 'all' || 
        task.priority === filterPriority;

      return matchesSearch && matchesAssignee && matchesPriority;
    });
  };

  // Create new task
  const handleCreateTask = (columnId: string) => {
    if (!newTaskTitle.trim()) return;

    const column = boardColumns.find(col => col.id === columnId);
    if (!column) return;

    const newTask: KanbanTask = {
      id: `task-${Date.now()}`,
      title: newTaskTitle,
      description: '',
      status: column.status,
      priority: 'Medium',
      assigneeId: '',
      reporterId: 'user-2', // Current user
      reporter: {
        id: 'user-2',
        name: 'Shubh',
        email: 'shubh@engunity.ai',
        avatar: 'S',
        role: 'Owner',
        online: true,
        joinedAt: '2024-10-01',
        lastActivity: '1 hour ago',
        permissions: []
      },
      tags: [],
      labels: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      estimatedHours: 0,
      actualHours: 0,
      timeSpent: 0,
      dependencies: [],
      subtasks: [],
      comments: [],
      attachments: [],
      commentCount: 0,
      attachmentCount: 0,
      watchers: []
    };

    const newColumns = boardColumns.map(col => 
      col.id === columnId 
        ? { ...col, tasks: [...col.tasks, newTask] }
        : col
    );

    setBoardColumns(newColumns);
    onTaskCreate?.(columnId, newTask);
    setNewTaskTitle('');
    setIsCreatingTask(null);
  };

  // Task Card Component
  const TaskCard: React.FC<{ task: KanbanTask }> = ({ task }) => {
    const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done';
    const daysUntilDue = task.dueDate 
      ? Math.ceil((new Date(task.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
      : null;

    return (
      <div
        draggable={!readonly}
        onDragStart={() => handleDragStart(task)}
        onDragEnd={handleDragEnd}
        onClick={() => setSelectedTask(task)}
        className={`bg-white border border-slate-200 rounded-lg p-4 mb-3 cursor-pointer hover:shadow-md transition-all duration-200 ${
          selectedTask?.id === task.id ? 'ring-2 ring-blue-500 shadow-md' : ''
        } ${draggedTask?.id === task.id ? 'opacity-50' : ''}`}
      >
        {/* Task Header */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-start gap-2 flex-1">
            {getStatusIcon(task.status)}
            <h3 className="font-medium text-slate-900 text-sm leading-5 flex-1">{task.title}</h3>
          </div>
          
          {task.blockedBy && task.blockedBy.length > 0 && (
            <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
          )}
        </div>

        {/* Task Description */}
        {task.description && (
          <p className="text-xs text-slate-600 mb-3 line-clamp-2">{task.description}</p>
        )}

        {/* Labels */}
        {task.labels.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {task.labels.slice(0, 2).map((label, index) => (
              <span key={index} className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-medium">
                {label}
              </span>
            ))}
            {task.labels.length > 2 && (
              <span className="px-2 py-1 bg-slate-100 text-slate-500 rounded text-xs">
                +{task.labels.length - 2}
              </span>
            )}
          </div>
        )}

        {/* Progress Bar */}
        {task.checklist && task.checklist.total > 0 && (
          <div className="mb-3">
            <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
              <span>Progress</span>
              <span>{task.checklist.completed}/{task.checklist.total}</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-1.5">
              <div
                className="bg-blue-500 h-1.5 rounded-full transition-all"
                style={{ width: `${(task.checklist.completed / task.checklist.total) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Task Footer */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Priority Badge */}
            <span className={`px-2 py-1 rounded text-xs font-medium border ${getPriorityColor(task.priority)}`}>
              {task.priority}
            </span>

            {/* Due Date */}
            {task.dueDate && (
              <div className={`flex items-center gap-1 text-xs ${
                isOverdue ? 'text-red-600' : 
                daysUntilDue !== null && daysUntilDue <= 3 ? 'text-orange-600' : 
                'text-slate-600'
              }`}>
                <Calendar className="w-3 h-3" />
                <span>
                  {isOverdue 
                    ? `${Math.abs(daysUntilDue!)}d overdue`
                    : daysUntilDue !== null && daysUntilDue <= 7
                      ? `${daysUntilDue}d left`
                      : new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                  }
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Attachment & Comment Count */}
            <div className="flex items-center gap-2 text-xs text-slate-500">
              {task.attachmentCount && task.attachmentCount > 0 && (
                <div className="flex items-center gap-1">
                  <Paperclip className="w-3 h-3" />
                  <span>{task.attachmentCount}</span>
                </div>
              )}
              {task.commentCount && task.commentCount > 0 && (
                <div className="flex items-center gap-1">
                  <MessageSquare className="w-3 h-3" />
                  <span>{task.commentCount}</span>
                </div>
              )}
            </div>

            {/* Assignee Avatar */}
            {task.assignee && (
              <div className="relative">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-medium ${
                  task.assignee.online ? 'bg-blue-500' : 'bg-slate-400'
                }`}>
                  {task.assignee.avatar}
                </div>
                {task.assignee.online && (
                  <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full border border-white" />
                )}
              </div>
            )}

            {/* Watchers Count */}
            {task.watchers && task.watchers.length > 1 && (
              <div className="flex items-center gap-1 text-xs text-slate-500">
                <Eye className="w-3 h-3" />
                <span>{task.watchers.length}</span>
              </div>
            )}
          </div>
        </div>

        {/* Time Tracking */}
        {task.timeSpent !== undefined && task.timeEstimated !== undefined && (
          <div className="mt-2 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span>Time: {task.timeSpent}h / {task.timeEstimated}h</span>
              <div className="w-16 bg-slate-200 rounded-full h-1">
                <div
                  className="bg-green-500 h-1 rounded-full"
                  style={{ width: `${Math.min((task.timeSpent / task.timeEstimated) * 100, 100)}%` }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Column Component
  const Column: React.FC<{ column: KanbanColumn }> = ({ column }) => {
    const filteredTasks = filterTasks(column.tasks);
    const isOverLimit = column.limit && column.tasks.length >= column.limit;
    
    return (
      <div
        className={`flex-shrink-0 w-80 bg-slate-50 rounded-lg transition-all ${
          draggedOverColumn === column.id ? 'bg-blue-50 ring-2 ring-blue-300' : ''
        }`}
        onDragOver={(e) => handleDragOver(e, column.id)}
        onDrop={(e) => handleDrop(e, column.id)}
      >
        {/* Column Header */}
        <div className="p-4 border-b border-slate-200 bg-white rounded-t-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: column.color }}
              />
              <h3 className="font-semibold text-slate-900">{column.title}</h3>
              <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-medium">
                {filteredTasks.length}
                {column.limit && `/${column.limit}`}
              </span>
              {isOverLimit && (
                <AlertTriangle className="w-4 h-4 text-orange-500" />
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {!readonly && (
                <button
                  onClick={() => setIsCreatingTask(column.id)}
                  className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors"
                  title="Add task"
                >
                  <Plus className="w-4 h-4" />
                </button>
              )}
              
              <button className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors">
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Column Limit Warning */}
          {isOverLimit && (
            <div className="text-xs text-orange-600 bg-orange-50 border border-orange-200 rounded px-2 py-1">
              Column limit reached ({column.limit} tasks)
            </div>
          )}
        </div>

        {/* Task Creation */}
        {isCreatingTask === column.id && (
          <div className="p-4 bg-white border-b border-slate-200">
            <input
              type="text"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') handleCreateTask(column.id);
                if (e.key === 'Escape') setIsCreatingTask(null);
              }}
              onBlur={() => {
                if (newTaskTitle.trim()) {
                  handleCreateTask(column.id);
                } else {
                  setIsCreatingTask(null);
                }
              }}
              placeholder="Enter task title..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              autoFocus
            />
          </div>
        )}

        {/* Task List */}
        <div className="p-4 space-y-0 max-h-[calc(100vh-300px)] overflow-y-auto">
          {filteredTasks.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <div className="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center mx-auto mb-2">
                <Plus className="w-6 h-6 text-slate-400" />
              </div>
              <p className="text-sm">No tasks in this column</p>
              {!readonly && (
                <button
                  onClick={() => setIsCreatingTask(column.id)}
                  className="text-xs text-blue-600 hover:text-blue-700 mt-1"
                >
                  Add your first task
                </button>
              )}
            </div>
          ) : (
            filteredTasks.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col">
      {/* Board Header */}
      <div className="flex items-center justify-between p-4 bg-white border-b border-slate-200">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-semibold text-slate-900">Task Board</h1>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm w-64"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              showFilters ? 'bg-blue-100 text-blue-700' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filters
            <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>

          <button className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors">
            <Settings className="w-4 h-4" />
          </button>

          <button className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors">
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="p-4 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-slate-700">Assignee:</label>
              <select
                value={filterAssignee}
                onChange={(e) => setFilterAssignee(e.target.value)}
                className="px-3 py-1 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Assignees</option>
                <option value="user-1">Alice Johnson</option>
                <option value="user-2">Shubh</option>
                <option value="user-3">Bob Chen</option>
                <option value="user-4">Carol Davis</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-slate-700">Priority:</label>
              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                className="px-3 py-1 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Priorities</option>
                <option value="Critical">Critical</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>

            <button
              onClick={() => {
                setSearchTerm('');
                setFilterAssignee('all');
                setFilterPriority('all');
              }}
              className="text-sm text-slate-600 hover:text-slate-900"
            >
              Clear Filters
            </button>
          </div>
        </div>
      )}

      {/* Board Content */}
      <div className="flex-1 p-4 overflow-x-auto">
        <div className="flex gap-6 h-full">
          {boardColumns.map((column) => (
            <Column key={column.id} column={column} />
          ))}
        </div>
      </div>

      {/* Task Detail Modal */}
      {selectedTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-auto">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h2 className="text-xl font-semibold text-slate-900 mb-2">{selectedTask.title}</h2>
                  <p className="text-slate-600">{selectedTask.description}</p>
                </div>
                <button
                  onClick={() => setSelectedTask(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <MoreHorizontal className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-medium text-slate-600 uppercase tracking-wide">Status</label>
                  <div className={`mt-1 px-3 py-2 rounded-lg text-sm font-medium inline-block ${
                    selectedTask.status === 'done' ? 'bg-green-100 text-green-800' :
                    selectedTask.status === 'in-progress' ? 'bg-blue-100 text-blue-800' :
                    selectedTask.status === 'review' ? 'bg-purple-100 text-purple-800' :
                    'bg-slate-100 text-slate-800'
                  }`}>
                    {selectedTask.status.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-600 uppercase tracking-wide">Priority</label>
                  <div className={`mt-1 px-3 py-2 rounded-lg text-sm font-medium inline-block border ${getPriorityColor(selectedTask.priority)}`}>
                    {selectedTask.priority}
                  </div>
                </div>

                {selectedTask.assignee && (
                  <div>
                    <label className="text-sm font-medium text-slate-600 uppercase tracking-wide">Assignee</label>
                    <div className="mt-1 flex items-center gap-2">
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium">
                        {selectedTask.assignee.avatar}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-slate-900">{selectedTask.assignee.name}</div>
                        <div className="text-xs text-slate-600">{selectedTask.assignee.email}</div>
                      </div>
                    </div>
                  </div>
                )}

                {selectedTask.dueDate && (
                  <div>
                    <label className="text-sm font-medium text-slate-600 uppercase tracking-wide">Due Date</label>
                    <div className="mt-1 text-sm text-slate-900">
                      {new Date(selectedTask.dueDate).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </div>
                  </div>
                )}
              </div>

              {selectedTask.checklist && selectedTask.checklist.total > 0 && (
                <div>
                  <label className="text-sm font-medium text-slate-600 uppercase tracking-wide">Progress</label>
                  <div className="mt-1">
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-slate-700">
                        {selectedTask.checklist.completed}/{selectedTask.checklist.total} tasks completed
                      </span>
                      <span className="font-medium text-slate-900">
                        {Math.round((selectedTask.checklist.completed / selectedTask.checklist.total) * 100)}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full transition-all"
                        style={{ width: `${(selectedTask.checklist.completed / selectedTask.checklist.total) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {selectedTask.labels.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-slate-600 uppercase tracking-wide">Labels</label>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {selectedTask.labels.map((label, index) => (
                      <span key={index} className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-sm font-medium">
                        {label}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {selectedTask.timeSpent !== undefined && selectedTask.timeEstimated !== undefined && (
                <div>
                  <label className="text-sm font-medium text-slate-600 uppercase tracking-wide">Time Tracking</label>
                  <div className="mt-1">
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-slate-700">
                        {selectedTask.timeSpent}h spent / {selectedTask.timeEstimated}h estimated
                      </span>
                      <span className="font-medium text-slate-900">
                        {Math.round((selectedTask.timeSpent / selectedTask.timeEstimated) * 100)}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          selectedTask.timeSpent > selectedTask.timeEstimated ? 'bg-red-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${Math.min((selectedTask.timeSpent / selectedTask.timeEstimated) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {!readonly && (
                <div className="flex gap-3 pt-4 border-t border-slate-200">
                  <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                    <Edit className="w-4 h-4" />
                    Edit Task
                  </button>
                  <button className="flex items-center justify-center gap-2 px-4 py-2 text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
                    <Copy className="w-4 h-4" />
                    Duplicate
                  </button>
                  <button className="flex items-center justify-center gap-2 px-4 py-2 text-red-700 border border-red-300 rounded-lg hover:bg-red-50 transition-colors">
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KanbanBoard;