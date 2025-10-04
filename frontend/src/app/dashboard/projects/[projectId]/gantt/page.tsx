import React, { useState, useRef, useEffect } from 'react';
import { 
  Calendar, Settings, Download, Filter, ZoomIn, ZoomOut, 
  Plus, Edit3, Trash2, AlertTriangle, Target, Clock, 
  Users, MessageCircle, Bell, ChevronRight, ChevronDown,
  Play, Pause, CheckCircle, Circle, Diamond, ArrowRight,
  Maximize2, RotateCcw, Save, Share2, Eye, EyeOff
} from 'lucide-react';

const GanttTimelineDashboard = () => {
  const [zoomLevel, setZoomLevel] = useState('week');
  const [showCriticalPath, setShowCriticalPath] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [viewMode, setViewMode] = useState('gantt');
  const [showDependencies, setShowDependencies] = useState(true);
  const [currentDate] = useState(new Date());
  const [scrollPosition, setScrollPosition] = useState(0);
  const timelineRef = useRef(null);

  // Sample project data
  const projectData = {
    name: "AI-Powered CRM Platform",
    startDate: new Date('2024-09-01'),
    endDate: new Date('2024-12-31'),
    progress: 45,
    team: 12,
    budget: 150000
  };

  // Sample tasks and milestones data
  const [tasks, setTasks] = useState([
    {
      id: 'milestone-1',
      type: 'milestone',
      title: 'Project Kickoff',
      date: new Date('2024-09-01'),
      status: 'completed',
      priority: 'high',
      assignees: ['John Doe', 'Sarah Wilson'],
      progress: 100,
      dependencies: [],
      isCritical: true
    },
    {
      id: 'task-1',
      type: 'task',
      title: 'Requirements Analysis & Documentation',
      startDate: new Date('2024-09-02'),
      endDate: new Date('2024-09-15'),
      status: 'completed',
      priority: 'high',
      assignees: ['John Doe', 'Mike Chen'],
      progress: 100,
      dependencies: ['milestone-1'],
      isCritical: true,
      category: 'Analysis'
    },
    {
      id: 'task-2',
      type: 'task',
      title: 'UI/UX Design & Prototyping',
      startDate: new Date('2024-09-10'),
      endDate: new Date('2024-09-30'),
      status: 'in_progress',
      priority: 'high',
      assignees: ['Sarah Wilson', 'David Kim'],
      progress: 75,
      dependencies: ['task-1'],
      isCritical: false,
      category: 'Design'
    },
    {
      id: 'milestone-2',
      type: 'milestone',
      title: 'Design Review & Approval',
      date: new Date('2024-10-01'),
      status: 'pending',
      priority: 'high',
      assignees: ['Sarah Wilson'],
      progress: 0,
      dependencies: ['task-2'],
      isCritical: false
    },
    {
      id: 'task-3',
      type: 'task',
      title: 'Backend Infrastructure Setup',
      startDate: new Date('2024-09-16'),
      endDate: new Date('2024-10-05'),
      status: 'in_progress',
      priority: 'high',
      assignees: ['Alex Thompson', 'Lisa Zhang'],
      progress: 60,
      dependencies: ['task-1'],
      isCritical: true,
      category: 'Backend'
    },
    {
      id: 'task-4',
      type: 'task',
      title: 'AI Model Development & Training',
      startDate: new Date('2024-10-06'),
      endDate: new Date('2024-11-15'),
      status: 'not_started',
      priority: 'high',
      assignees: ['Dr. Emily Rodriguez', 'James Liu'],
      progress: 0,
      dependencies: ['task-3'],
      isCritical: true,
      category: 'AI/ML'
    },
    {
      id: 'task-5',
      type: 'task',
      title: 'Frontend Development',
      startDate: new Date('2024-10-02'),
      endDate: new Date('2024-11-20'),
      status: 'not_started',
      priority: 'medium',
      assignees: ['Tom Anderson', 'Maria Garcia'],
      progress: 0,
      dependencies: ['milestone-2'],
      isCritical: false,
      category: 'Frontend'
    },
    {
      id: 'milestone-3',
      type: 'milestone',
      title: 'Alpha Release',
      date: new Date('2024-11-21'),
      status: 'pending',
      priority: 'high',
      assignees: ['Project Team'],
      progress: 0,
      dependencies: ['task-4', 'task-5'],
      isCritical: true
    },
    {
      id: 'task-6',
      type: 'task',
      title: 'Testing & Quality Assurance',
      startDate: new Date('2024-11-22'),
      endDate: new Date('2024-12-15'),
      status: 'not_started',
      priority: 'high',
      assignees: ['QA Team'],
      progress: 0,
      dependencies: ['milestone-3'],
      isCritical: true,
      category: 'Testing'
    },
    {
      id: 'milestone-4',
      type: 'milestone',
      title: 'Production Launch',
      date: new Date('2024-12-31'),
      status: 'pending',
      priority: 'high',
      assignees: ['Full Team'],
      progress: 0,
      dependencies: ['task-6'],
      isCritical: true
    }
  ]);

  // Helper functions
  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'in_progress': return 'bg-blue-500';
      case 'pending': return 'bg-orange-500';
      case 'not_started': return 'bg-gray-400';
      case 'blocked': return 'bg-red-500';
      default: return 'bg-gray-400';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'border-red-500';
      case 'medium': return 'border-orange-500';
      case 'low': return 'border-green-500';
      default: return 'border-gray-300';
    }
  };

  const generateTimelineGrid = () => {
    const days = [];
    const start = new Date(projectData.startDate);
    const end = new Date(projectData.endDate);
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      days.push(new Date(d));
    }
    return days;
  };

  const getTaskPosition = (task) => {
    const projectStart = projectData.startDate;
    const projectDuration = (projectData.endDate - projectStart) / (1000 * 60 * 60 * 24);
    
    if (task.type === 'milestone') {
      const daysFromStart = (task.date - projectStart) / (1000 * 60 * 60 * 24);
      return {
        left: `${(daysFromStart / projectDuration) * 100}%`,
        width: '2px'
      };
    } else {
      const startDays = (task.startDate - projectStart) / (1000 * 60 * 60 * 24);
      const taskDuration = (task.endDate - task.startDate) / (1000 * 60 * 60 * 24);
      return {
        left: `${(startDays / projectDuration) * 100}%`,
        width: `${(taskDuration / projectDuration) * 100}%`
      };
    }
  };

  const TaskBar = ({ task }) => {
    const position = getTaskPosition(task);
    const statusColor = getStatusColor(task.status);
    const priorityColor = getPriorityColor(task.priority);
    const isCritical = showCriticalPath && task.isCritical;

    if (task.type === 'milestone') {
      return (
        <div 
          className={`absolute top-4 transform -translate-y-1/2 ${isCritical ? 'z-20' : 'z-10'}`}
          style={{ left: position.left }}
          onClick={() => setSelectedTask(task)}
        >
          <div className={`
            w-4 h-4 transform rotate-45 ${statusColor} 
            border-2 ${isCritical ? 'border-red-600 shadow-lg' : 'border-white'}
            cursor-pointer hover:scale-125 transition-all duration-200
            ${isCritical ? 'animate-pulse' : ''}
          `}>
            <Diamond className="w-2 h-2 text-white absolute top-0.5 left-0.5 transform -rotate-45" />
          </div>
          <div className="absolute top-6 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
            <span className={`text-xs font-medium px-2 py-1 rounded-full ${
              isCritical ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-700'
            }`}>
              {task.title}
            </span>
          </div>
        </div>
      );
    }

    return (
      <div 
        className={`absolute top-2 h-6 ${statusColor} rounded-lg cursor-pointer
          hover:shadow-lg transition-all duration-200 group
          ${isCritical ? 'ring-2 ring-red-500 ring-opacity-50' : ''}
          ${priorityColor} border-l-4
        `}
        style={position}
        onClick={() => setSelectedTask(task)}
      >
        <div className="h-full w-full relative overflow-hidden rounded-lg">
          <div 
            className="h-full bg-white bg-opacity-20 transition-all duration-300"
            style={{ width: `${task.progress}%` }}
          />
          <div className="absolute inset-0 flex items-center px-2">
            <span className="text-white text-xs font-medium truncate">
              {task.title}
            </span>
          </div>
          {isCritical && (
            <div className="absolute top-0 right-0 w-0 h-0 border-l-4 border-b-4 border-l-red-600 border-b-transparent" />
          )}
        </div>
        
        {/* Task tooltip */}
        <div className="absolute bottom-8 left-0 bg-gray-900 text-white p-3 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-50 min-w-64">
          <h4 className="font-semibold mb-1">{task.title}</h4>
          <p className="text-sm text-gray-300 mb-2">{task.category}</p>
          <div className="flex items-center gap-2 text-sm">
            <Clock className="w-3 h-3" />
            {task.startDate.toLocaleDateString()} - {task.endDate.toLocaleDateString()}
          </div>
          <div className="flex items-center gap-2 text-sm mt-1">
            <Users className="w-3 h-3" />
            {task.assignees.join(', ')}
          </div>
          <div className="flex items-center gap-2 text-sm mt-1">
            <Target className="w-3 h-3" />
            Progress: {task.progress}%
          </div>
          {task.dependencies.length > 0 && (
            <div className="text-sm mt-1 text-orange-300">
              Depends on: {task.dependencies.join(', ')}
            </div>
          )}
        </div>
      </div>
    );
  };

  const DependencyArrow = ({ from, to }) => {
    // This would calculate and render dependency arrows
    // Simplified for demo purposes
    return null;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-slate-600">
              <span>Projects</span>
              <ChevronRight className="w-4 h-4" />
              <span className="font-semibold text-slate-900">{projectData.name}</span>
              <ChevronRight className="w-4 h-4" />
              <span className="text-blue-600">Gantt Timeline</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button className="btn btn-ghost btn-sm">
              <Settings className="w-4 h-4" />
              Settings
            </button>
            <button className="btn btn-outline btn-sm">
              <Share2 className="w-4 h-4" />
              Share
            </button>
            <button className="btn btn-primary btn-sm">
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Project Overview Cards */}
      <div className="px-6 py-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="card hover-lift">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Project Progress</p>
                  <p className="text-2xl font-bold text-slate-900">{projectData.progress}%</p>
                </div>
                <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                  <Target className="w-6 h-6 text-white" />
                </div>
              </div>
              <div className="mt-3">
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full transition-all duration-500" style={{width: `${projectData.progress}%`}} />
                </div>
              </div>
            </div>
          </div>

          <div className="card hover-lift">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Team Members</p>
                  <p className="text-2xl font-bold text-slate-900">{projectData.team}</p>
                </div>
                <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          </div>

          <div className="card hover-lift">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Days Remaining</p>
                  <p className="text-2xl font-bold text-slate-900">26</p>
                </div>
                <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center">
                  <Clock className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          </div>

          <div className="card hover-lift">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Budget</p>
                  <p className="text-2xl font-bold text-slate-900">${projectData.budget.toLocaleString()}</p>
                </div>
                <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1">
                <button 
                  className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                    zoomLevel === 'day' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-600 hover:text-slate-900'
                  }`}
                  onClick={() => setZoomLevel('day')}
                >
                  Day
                </button>
                <button 
                  className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                    zoomLevel === 'week' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-600 hover:text-slate-900'
                  }`}
                  onClick={() => setZoomLevel('week')}
                >
                  Week
                </button>
                <button 
                  className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                    zoomLevel === 'month' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-600 hover:text-slate-900'
                  }`}
                  onClick={() => setZoomLevel('month')}
                >
                  Month
                </button>
                <button 
                  className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                    zoomLevel === 'quarter' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-600 hover:text-slate-900'
                  }`}
                  onClick={() => setZoomLevel('quarter')}
                >
                  Quarter
                </button>
              </div>
              
              <div className="flex items-center gap-2">
                <button className="btn btn-ghost btn-sm">
                  <Filter className="w-4 h-4" />
                  Filters
                </button>
                <button 
                  className={`btn btn-sm transition-colors ${
                    showCriticalPath ? 'btn-primary' : 'btn-ghost'
                  }`}
                  onClick={() => setShowCriticalPath(!showCriticalPath)}
                >
                  <AlertTriangle className="w-4 h-4" />
                  Critical Path
                </button>
                <button 
                  className={`btn btn-sm transition-colors ${
                    showDependencies ? 'btn-primary' : 'btn-ghost'
                  }`}
                  onClick={() => setShowDependencies(!showDependencies)}
                >
                  <ArrowRight className="w-4 h-4" />
                  Dependencies
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button className="btn btn-primary btn-sm">
                <Plus className="w-4 h-4" />
                Add Task
              </button>
              <button className="btn btn-outline btn-sm">
                <Plus className="w-4 h-4" />
                Add Milestone
              </button>
            </div>
          </div>
        </div>

        {/* Main Gantt Chart */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="flex">
            {/* Task List Panel */}
            <div className="w-80 border-r border-slate-200 bg-slate-50">
              <div className="p-4 border-b border-slate-200 bg-white">
                <h3 className="font-semibold text-slate-900">Tasks & Milestones</h3>
              </div>
              <div className="overflow-y-auto max-h-96">
                {tasks.map((task) => (
                  <div 
                    key={task.id}
                    className={`p-4 border-b border-slate-100 hover:bg-white cursor-pointer transition-colors ${
                      selectedTask?.id === task.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                    } ${task.isCritical && showCriticalPath ? 'bg-red-50' : ''}`}
                    onClick={() => setSelectedTask(task)}
                  >
                    <div className="flex items-center gap-3">
                      {task.type === 'milestone' ? (
                        <Diamond className={`w-4 h-4 ${getStatusColor(task.status).replace('bg-', 'text-')}`} />
                      ) : (
                        <div className={`w-3 h-3 rounded ${getStatusColor(task.status)}`} />
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className={`font-medium text-sm ${
                          task.isCritical && showCriticalPath ? 'text-red-800' : 'text-slate-900'
                        }`}>
                          {task.title}
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            task.priority === 'high' ? 'bg-red-100 text-red-800' :
                            task.priority === 'medium' ? 'bg-orange-100 text-orange-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {task.priority}
                          </span>
                          {task.type === 'task' && (
                            <span className="text-xs text-slate-500">{task.progress}%</span>
                          )}
                        </div>
                      </div>
                      {task.isCritical && showCriticalPath && (
                        <AlertTriangle className="w-4 h-4 text-red-500" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Timeline Panel */}
            <div className="flex-1 overflow-x-auto" ref={timelineRef}>
              <div className="min-w-full">
                {/* Timeline Header */}
                <div className="bg-slate-100 border-b border-slate-200 p-4">
                  <div className="flex items-center gap-8">
                    {Array.from({ length: 17 }, (_, i) => {
                      const date = new Date(2024, 8, 1 + i * 7); // Weekly intervals
                      return (
                        <div key={i} className="text-center min-w-24">
                          <div className="text-xs font-medium text-slate-900">
                            {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </div>
                          <div className="text-xs text-slate-500 mt-1">
                            Week {i + 36}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Timeline Content */}
                <div className="relative">
                  {/* Current Date Line */}
                  <div className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10" style={{ left: '25%' }}>
                    <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-red-500 text-white text-xs px-2 py-1 rounded">
                      Today
                    </div>
                  </div>

                  {/* Task Bars */}
                  <div className="space-y-0">
                    {tasks.map((task, index) => (
                      <div key={task.id} className="relative h-12 border-b border-slate-100">
                        <TaskBar task={task} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* AI Insights Panel */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-orange-500" />
                AI Project Insights
              </h3>
            </div>
            <div className="card-body">
              <div className="space-y-4">
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-red-800">Critical Path Alert</h4>
                      <p className="text-sm text-red-700 mt-1">
                        Backend Infrastructure Setup is 2 days behind schedule. This may delay AI Model Development.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Target className="w-5 h-5 text-blue-500 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-blue-800">Optimization Suggestion</h4>
                      <p className="text-sm text-blue-700 mt-1">
                        Consider starting Frontend Development in parallel with UI/UX Design to save 1 week.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-green-800">On Track</h4>
                      <p className="text-sm text-green-700 mt-1">
                        Requirements Analysis completed ahead of schedule. Great job!
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="card-title flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-blue-500" />
                Recent Activity
              </h3>
            </div>
            <div className="card-body">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">Requirements Analysis completed</p>
                    <p className="text-xs text-slate-500">by John Doe • 2 hours ago</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                    <Edit3 className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">UI/UX Design milestone updated</p>
                    <p className="text-xs text-slate-500">by Sarah Wilson • 4 hours ago</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                    <Users className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">Team member assigned to Backend Infrastructure</p>
                    <p className="text-xs text-slate-500">by Alex Thompson • 6 hours ago</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                    <MessageCircle className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">New comment on Design Review</p>
                    <p className="text-xs text-slate-500">by Mike Chen • 8 hours ago</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GanttTimelineDashboard;