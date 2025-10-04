import React, { useState, useMemo } from 'react';
import { 
  ArrowLeft,
  Plus,
  Filter,
  Search,
  Calendar,
  Users,
  AlertTriangle,
  Clock,
  CheckCircle,
  Flag,
  Paperclip,
  MessageCircle,
  MoreHorizontal,
  User,
  Edit,
  Trash2,
  Link,
  X,
  Send,
  ChevronDown,
  ChevronRight,
  Target,
  Zap,
  Brain,
  Activity
} from 'lucide-react';

// Sample task data
const initialTasks = [
  {
    id: 't1',
    title: 'Market Research Analysis',
    description: 'Comprehensive analysis of competitor AI platforms and market positioning',
    status: 'todo',
    priority: 'high',
    assignees: ['Alice', 'Bob'],
    deadline: '2025-01-10',
    progress: 0,
    subtasks: [
      { id: 'st1', title: 'Identify key competitors', completed: false },
      { id: 'st2', title: 'Analyze pricing models', completed: false },
      { id: 'st3', title: 'Create comparison matrix', completed: false }
    ],
    dependencies: [],
    comments: [],
    attachments: [],
    milestoneId: 'm1'
  },
  {
    id: 't2',
    title: 'API Authentication System',
    description: 'Implement secure JWT-based authentication for API endpoints',
    status: 'in-progress',
    priority: 'high',
    assignees: ['Shubh'],
    deadline: '2025-01-08',
    progress: 60,
    subtasks: [
      { id: 'st4', title: 'Design auth schema', completed: true },
      { id: 'st5', title: 'Implement JWT tokens', completed: true },
      { id: 'st6', title: 'Add refresh token logic', completed: false },
      { id: 'st7', title: 'Write unit tests', completed: false },
      { id: 'st8', title: 'Update documentation', completed: false }
    ],
    dependencies: [],
    comments: [
      { id: 'c1', author: 'Shubh', content: 'Making good progress on the JWT implementation', timestamp: '2 hours ago' }
    ],
    attachments: [{ name: 'auth_design.pdf', size: '2.1 MB' }],
    milestoneId: 'm2'
  },
  {
    id: 't3',
    title: 'Database Schema Design',
    description: 'Design and implement the core database schema for user data and projects',
    status: 'in-progress',
    priority: 'medium',
    assignees: ['Carol'],
    deadline: '2025-01-12',
    progress: 30,
    subtasks: [
      { id: 'st9', title: 'Design user tables', completed: true },
      { id: 'st10', title: 'Design project tables', completed: false },
      { id: 'st11', title: 'Add indexes and constraints', completed: false }
    ],
    dependencies: ['t2'],
    comments: [],
    attachments: [],
    milestoneId: 'm2'
  },
  {
    id: 't4',
    title: 'UI Component Library',
    description: 'Create reusable React components following design system',
    status: 'done',
    priority: 'medium',
    assignees: ['Alice'],
    deadline: '2024-12-30',
    progress: 100,
    subtasks: [
      { id: 'st12', title: 'Button components', completed: true },
      { id: 'st13', title: 'Form components', completed: true },
      { id: 'st14', title: 'Modal components', completed: true },
      { id: 'st15', title: 'Documentation', completed: true }
    ],
    dependencies: [],
    comments: [],
    attachments: [],
    milestoneId: 'm1'
  },
  {
    id: 't5',
    title: 'User Testing Setup',
    description: 'Prepare infrastructure and processes for user testing phase',
    status: 'todo',
    priority: 'low',
    assignees: ['Bob'],
    deadline: '2025-01-20',
    progress: 0,
    subtasks: [
      { id: 'st16', title: 'Define testing criteria', completed: false },
      { id: 'st17', title: 'Set up testing environment', completed: false }
    ],
    dependencies: ['t2', 't3'],
    comments: [],
    attachments: [],
    milestoneId: 'm3'
  }
];

const teamMembers = [
  { id: '1', name: 'Shubh', avatar: 'S', color: 'bg-blue-500' },
  { id: '2', name: 'Alice', avatar: 'A', color: 'bg-purple-500' },
  { id: '3', name: 'Bob', avatar: 'B', color: 'bg-green-500' },
  { id: '4', name: 'Carol', avatar: 'C', color: 'bg-orange-500' }
];

const TaskCard = ({ task, onTaskClick, onStatusChange }) => {
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-700 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-700 border-green-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const daysUntilDue = Math.ceil((new Date(task.deadline) - new Date()) / (1000 * 60 * 60 * 24));
  const isOverdue = daysUntilDue < 0;
  const isDueSoon = daysUntilDue <= 2 && daysUntilDue >= 0;

  const completedSubtasks = task.subtasks.filter(st => st.completed).length;
  const progressPercentage = task.subtasks.length > 0 ? (completedSubtasks / task.subtasks.length) * 100 : task.progress;

  return (
    <div 
      className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 hover:shadow-md transition-all cursor-pointer group"
      onClick={() => onTaskClick(task)}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <h4 className="font-medium text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2">
          {task.title}
        </h4>
        <button className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-slate-600">
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>

      {/* Priority & Deadline */}
      <div className="flex items-center gap-2 mb-3">
        <span className={`px-2 py-1 rounded-md text-xs font-medium border ${getPriorityColor(task.priority)}`}>
          {task.priority}
        </span>
        {(isOverdue || isDueSoon) && (
          <span className={`px-2 py-1 rounded-md text-xs font-medium ${
            isOverdue ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
          }`}>
            {isOverdue ? `${Math.abs(daysUntilDue)}d overdue` : `${daysUntilDue}d left`}
          </span>
        )}
      </div>

      {/* Progress Bar (if subtasks exist) */}
      {task.subtasks.length > 0 && (
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-600">Progress</span>
            <span className="text-xs font-medium text-slate-900">{Math.round(progressPercentage)}%</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-1.5">
            <div 
              className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
      )}

      {/* Dependencies */}
      {task.dependencies.length > 0 && (
        <div className="flex items-center gap-1 mb-3">
          <Link className="w-3 h-3 text-slate-500" />
          <span className="text-xs text-slate-600">
            Depends on {task.dependencies.length} task{task.dependencies.length > 1 ? 's' : ''}
          </span>
        </div>
      )}

      {/* Bottom Row */}
      <div className="flex items-center justify-between">
        {/* Assignees */}
        <div className="flex -space-x-2">
          {task.assignees.slice(0, 3).map((assignee, idx) => {
            const member = teamMembers.find(m => m.name === assignee);
            return (
              <div 
                key={idx}
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium text-white border-2 border-white ${member?.color || 'bg-slate-400'}`}
                title={assignee}
              >
                {member?.avatar || assignee[0]}
              </div>
            );
          })}
          {task.assignees.length > 3 && (
            <div className="w-6 h-6 bg-slate-300 rounded-full flex items-center justify-center text-xs font-medium text-slate-600 border-2 border-white">
              +{task.assignees.length - 3}
            </div>
          )}
        </div>

        {/* Icons */}
        <div className="flex items-center gap-2 text-slate-400">
          {task.subtasks.length > 0 && (
            <div className="flex items-center gap-1">
              <CheckCircle className="w-3 h-3" />
              <span className="text-xs">{completedSubtasks}/{task.subtasks.length}</span>
            </div>
          )}
          {task.comments.length > 0 && (
            <div className="flex items-center gap-1">
              <MessageCircle className="w-3 h-3" />
              <span className="text-xs">{task.comments.length}</span>
            </div>
          )}
          {task.attachments.length > 0 && (
            <div className="flex items-center gap-1">
              <Paperclip className="w-3 h-3" />
              <span className="text-xs">{task.attachments.length}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const KanbanColumn = ({ title, status, tasks, onTaskClick, onAddTask, onStatusChange }) => {
  const getColumnColor = (status) => {
    switch (status) {
      case 'todo': return 'border-slate-300 bg-slate-50';
      case 'in-progress': return 'border-blue-300 bg-blue-50';
      case 'done': return 'border-green-300 bg-green-50';
      default: return 'border-slate-300 bg-slate-50';
    }
  };

  return (
    <div className={`flex-1 min-w-80 max-w-96 border-2 border-dashed rounded-xl p-4 ${getColumnColor(status)}`}>
      {/* Column Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-slate-900">{title}</h3>
          <span className="px-2 py-1 bg-white rounded-full text-sm font-medium text-slate-600">
            {tasks.length}
          </span>
        </div>
        <button
          onClick={() => onAddTask(status)}
          className="p-2 hover:bg-white rounded-lg transition-colors text-slate-600 hover:text-slate-900"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Task List */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onTaskClick={onTaskClick}
            onStatusChange={onStatusChange}
          />
        ))}
        
        {tasks.length === 0 && (
          <div className="text-center py-8 text-slate-500">
            <div className="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center mx-auto mb-2">
              <Target className="w-6 h-6" />
            </div>
            <p className="text-sm">No tasks yet</p>
            <button
              onClick={() => onAddTask(status)}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium mt-1"
            >
              Add your first task
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const TaskModal = ({ task, isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState(task || {
    title: '',
    description: '',
    priority: 'medium',
    assignees: [],
    deadline: '',
    subtasks: []
  });
  const [newComment, setNewComment] = useState('');
  const [newSubtask, setNewSubtask] = useState('');

  if (!isOpen) return null;

  const handleSubtaskToggle = (subtaskId) => {
    setFormData(prev => ({
      ...prev,
      subtasks: prev.subtasks.map(st => 
        st.id === subtaskId ? { ...st, completed: !st.completed } : st
      )
    }));
  };

  const addSubtask = () => {
    if (newSubtask.trim()) {
      setFormData(prev => ({
        ...prev,
        subtasks: [...prev.subtasks, {
          id: `st${Date.now()}`,
          title: newSubtask,
          completed: false
        }]
      }));
      setNewSubtask('');
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'bg-red-50 text-red-700 border-red-200';
      case 'medium': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'low': return 'bg-green-50 text-green-700 border-green-200';
      default: return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-xl font-semibold text-slate-900">
            {task ? 'Edit Task' : 'Create Task'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Task Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter task title..."
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={4}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder="Describe the task..."
              />
            </div>

            {/* Subtasks */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Subtasks
              </label>
              <div className="space-y-2">
                {formData.subtasks?.map((subtask) => (
                  <div key={subtask.id} className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg">
                    <input
                      type="checkbox"
                      checked={subtask.completed}
                      onChange={() => handleSubtaskToggle(subtask.id)}
                      className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                    />
                    <span className={`flex-1 ${subtask.completed ? 'line-through text-slate-500' : 'text-slate-900'}`}>
                      {subtask.title}
                    </span>
                    <button className="text-slate-400 hover:text-red-500">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newSubtask}
                    onChange={(e) => setNewSubtask(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addSubtask()}
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Add subtask..."
                  />
                  <button
                    onClick={addSubtask}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Comments */}
            {task && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Comments
                </label>
                <div className="space-y-3">
                  {task.comments?.map((comment) => (
                    <div key={comment.id} className="flex gap-3 p-3 bg-slate-50 rounded-lg">
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                        {comment.author[0]}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-slate-900">{comment.author}</span>
                          <span className="text-xs text-slate-500">{comment.timestamp}</span>
                        </div>
                        <p className="text-slate-700">{comment.content}</p>
                      </div>
                    </div>
                  ))}
                  
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Add a comment..."
                    />
                    <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Priority */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Priority
              </label>
              <div className="space-y-2">
                {['high', 'medium', 'low'].map((priority) => (
                  <button
                    key={priority}
                    onClick={() => setFormData(prev => ({ ...prev, priority }))}
                    className={`w-full p-3 border rounded-lg font-medium transition-all text-left ${
                      formData.priority === priority
                        ? getPriorityColor(priority)
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {priority.charAt(0).toUpperCase() + priority.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Deadline */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Deadline
              </label>
              <input
                type="date"
                value={formData.deadline}
                onChange={(e) => setFormData(prev => ({ ...prev, deadline: e.target.value }))}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Assignees */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Assign to
              </label>
              <div className="space-y-2">
                {teamMembers.map((member) => (
                  <label key={member.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.assignees?.includes(member.name)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData(prev => ({
                            ...prev,
                            assignees: [...(prev.assignees || []), member.name]
                          }));
                        } else {
                          setFormData(prev => ({
                            ...prev,
                            assignees: prev.assignees?.filter(name => name !== member.name) || []
                          }));
                        }
                      }}
                      className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                    />
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium ${member.color}`}>
                      {member.avatar}
                    </div>
                    <span className="text-slate-900">{member.name}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Dependencies */}
            {task && task.dependencies.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Dependencies
                </label>
                <div className="space-y-2">
                  {task.dependencies.map((depId) => (
                    <div key={depId} className="flex items-center gap-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <Link className="w-4 h-4 text-yellow-600" />
                      <span className="text-sm text-yellow-800">Blocked by Task {depId}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-slate-200">
          <div className="flex items-center gap-2">
            {task && (
              <button className="flex items-center gap-2 px-4 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors">
                <Trash2 className="w-4 h-4" />
                Delete Task
              </button>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2 border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                onSave(formData);
                onClose();
              }}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              disabled={!formData.title}
            >
              {task ? 'Update Task' : 'Create Task'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const AIInsights = ({ tasks }) => {
  const insights = useMemo(() => {
    const overdueTasks = tasks.filter(t => {
      const daysUntilDue = Math.ceil((new Date(t.deadline) - new Date()) / (1000 * 60 * 60 * 24));
      return daysUntilDue < 0;
    });

    const blockedTasks = tasks.filter(t => t.dependencies.length > 0);
    
    const highPriorityInProgress = tasks.filter(t => t.priority === 'high' && t.status === 'in-progress');

    return [
      {
        type: 'warning',
        title: 'Overdue Tasks',
        content: overdueTasks.length > 0 
          ? `${overdueTasks.length} task${overdueTasks.length > 1 ? 's are' : ' is'} overdue and need immediate attention`
          : 'All tasks are on schedule',
        color: overdueTasks.length > 0 ? 'red' : 'green',
        icon: overdueTasks.length > 0 ? AlertTriangle : CheckCircle
      },
      {
        type: 'info',
        title: 'Blocked Tasks',
        content: blockedTasks.length > 0 
          ? `${blockedTasks.length} task${blockedTasks.length > 1 ? 's are' : ' is'} waiting on dependencies`
          : 'No blocked tasks detected',
        color: blockedTasks.length > 0 ? 'yellow' : 'green',
        icon: Link
      },
      {
        type: 'suggestion',
        title: 'Focus Recommendation',
        content: highPriorityInProgress.length > 0 
          ? `Focus on completing ${highPriorityInProgress.length} high-priority task${highPriorityInProgress.length > 1 ? 's' : ''} in progress`
          : 'Consider picking up high-priority tasks from backlog',
        color: 'blue',
        icon: Brain
      }
    ];
  }, [tasks]);

  const getInsightColor = (color, type) => {
    const colors = {
      red: type === 'bg' ? 'bg-red-50' : type === 'icon' ? 'text-red-600 bg-red-100' : 'text-red-800',
      yellow: type === 'bg' ? 'bg-yellow-50' : type === 'icon' ? 'text-yellow-600 bg-yellow-100' : 'text-yellow-800',
      green: type === 'bg' ? 'bg-green-50' : type === 'icon' ? 'text-green-600 bg-green-100' : 'text-green-800',
      blue: type === 'bg' ? 'bg-blue-50' : type === 'icon' ? 'text-blue-600 bg-blue-100' : 'text-blue-800'
    };
    return colors[color] || colors.blue;
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
          <Zap className="w-4 h-4 text-white" />
        </div>
        <h3 className="font-semibold text-slate-900">AI Task Insights</h3>
      </div>

      <div className="space-y-3">
        {insights.map((insight, idx) => (
          <div key={idx} className={`p-3 rounded-lg ${getInsightColor(insight.color, 'bg')}`}>
            <div className="flex items-start gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center ${getInsightColor(insight.color, 'icon')}`}>
                <insight.icon className="w-3 h-3" />
              </div>
              <div>
                <h4 className={`font-medium mb-1 ${getInsightColor(insight.color, 'text')}`}>
                  {insight.title}
                </h4>
                <p className={`text-sm ${getInsightColor(insight.color, 'text')}`}>
                  {insight.content}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function TaskManagementPage() {
  const [tasks, setTasks] = useState(initialTasks);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAssignee, setFilterAssignee] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');

  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          task.description.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesAssignee = filterAssignee === 'all' || task.assignees.includes(filterAssignee);
      
      const matchesPriority = filterPriority === 'all' || task.priority === filterPriority;

      return matchesSearch && matchesAssignee && matchesPriority;
    });
  }, [tasks, searchTerm, filterAssignee, filterPriority]);

  const tasksByStatus = useMemo(() => {
    return {
      todo: filteredTasks.filter(task => task.status === 'todo'),
      'in-progress': filteredTasks.filter(task => task.status === 'in-progress'),
      done: filteredTasks.filter(task => task.status === 'done')
    };
  }, [filteredTasks]);

  const handleTaskClick = (task) => {
    setSelectedTask(task);
    setShowTaskModal(true);
  };

  const handleAddTask = (status) => {
    setSelectedTask({ status, title: '', description: '', priority: 'medium', assignees: [], deadline: '', subtasks: [] });
    setShowTaskModal(true);
  };

  const handleSaveTask = (taskData) => {
    if (selectedTask.id) {
      // Update existing task
      setTasks(prev => prev.map(task => 
        task.id === selectedTask.id ? { ...task, ...taskData } : task
      ));
    } else {
      // Create new task
      const newTask = {
        ...taskData,
        id: `t${Date.now()}`,
        comments: [],
        attachments: [],
        dependencies: [],
        progress: 0
      };
      setTasks(prev => [...prev, newTask]);
    }
  };

  const handleStatusChange = (taskId, newStatus) => {
    setTasks(prev => prev.map(task => 
      task.id === taskId ? { ...task, status: newStatus } : task
    ));
  };

  const projectStats = useMemo(() => {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'done').length;
    const overdueTasks = tasks.filter(t => {
      const daysUntilDue = Math.ceil((new Date(t.deadline) - new Date()) / (1000 * 60 * 60 * 24));
      return daysUntilDue < 0;
    }).length;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    return { totalTasks, completedTasks, overdueTasks, completionRate };
  }, [tasks]);

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 text-slate-600 mb-4">
            <button 
              onClick={() => window.history.back()}
              className="hover:text-slate-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <span className="text-sm">Projects</span>
            <ChevronRight className="w-4 h-4" />
            <span className="text-sm">AI Research Platform</span>
            <ChevronRight className="w-4 h-4" />
            <span className="text-sm font-medium text-slate-900">Tasks</span>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 mb-2">Task Management</h1>
              <p className="text-slate-600">Organize and track your project tasks with AI-powered insights</p>
            </div>
            <button
              onClick={() => handleAddTask('todo')}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Task
            </button>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Target className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="text-lg font-bold text-slate-900">{projectStats.totalTasks}</div>
                <div className="text-sm text-slate-600">Total Tasks</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <div className="text-lg font-bold text-slate-900">{projectStats.completedTasks}</div>
                <div className="text-sm text-slate-600">Completed</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <div className="text-lg font-bold text-slate-900">{projectStats.overdueTasks}</div>
                <div className="text-sm text-slate-600">Overdue</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Activity className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <div className="text-lg font-bold text-slate-900">{projectStats.completionRate}%</div>
                <div className="text-sm text-slate-600">Completion Rate</div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 mb-6">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search tasks..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <select
                value={filterAssignee}
                onChange={(e) => setFilterAssignee(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Assignees</option>
                {teamMembers.map(member => (
                  <option key={member.id} value={member.name}>{member.name}</option>
                ))}
              </select>

              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Priorities</option>
                <option value="high">High Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="low">Low Priority</option>
              </select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Kanban Board */}
          <div className="xl:col-span-3">
            <div className="flex gap-6 overflow-x-auto pb-4">
              <KanbanColumn
                title="To Do"
                status="todo"
                tasks={tasksByStatus.todo}
                onTaskClick={handleTaskClick}
                onAddTask={handleAddTask}
                onStatusChange={handleStatusChange}
              />
              
              <KanbanColumn
                title="In Progress"
                status="in-progress"
                tasks={tasksByStatus['in-progress']}
                onTaskClick={handleTaskClick}
                onAddTask={handleAddTask}
                onStatusChange={handleStatusChange}
              />
              
              <KanbanColumn
                title="Done"
                status="done"
                tasks={tasksByStatus.done}
                onTaskClick={handleTaskClick}
                onAddTask={handleAddTask}
                onStatusChange={handleStatusChange}
              />
            </div>
          </div>

          {/* AI Insights Sidebar */}
          <div className="xl:col-span-1">
            <AIInsights tasks={filteredTasks} />
          </div>
        </div>

        {/* Task Modal */}
        <TaskModal
          task={selectedTask}
          isOpen={showTaskModal}
          onClose={() => {
            setShowTaskModal(false);
            setSelectedTask(null);
          }}
          onSave={handleSaveTask}
        />
      </div>
    </div>
  );
}