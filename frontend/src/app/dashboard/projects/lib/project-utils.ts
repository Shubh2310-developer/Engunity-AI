// Utility functions for Engunity AI Project Management

import { 
  Project, 
  ProjectStatus, 
  ProjectPriority, 
  Task, 
  Milestone, 
  ProjectMember,
  ActivityLog,
  DashboardAnalytics,
  GanttTask,
  TaskStatus
} from '../types/project-types';

// Date utilities
export const formatDate = (date: string | Date): string => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

export const formatDateTime = (date: string | Date): string => {
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const getRelativeTime = (date: string | Date): string => {
  const now = new Date();
  const target = new Date(date);
  const diffMs = now.getTime() - target.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
  return `${Math.floor(diffDays / 365)}y ago`;
};

export const getDaysUntilDue = (dueDate: string): number => {
  const now = new Date();
  const due = new Date(dueDate);
  const diffTime = due.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

export const isOverdue = (dueDate: string): boolean => {
  return getDaysUntilDue(dueDate) < 0;
};

export const isUpcoming = (dueDate: string, days: number = 7): boolean => {
  const daysUntil = getDaysUntilDue(dueDate);
  return daysUntil >= 0 && daysUntil <= days;
};

// Status utilities
export const getStatusColor = (status: ProjectStatus): {
  bg: string;
  text: string;
  border: string;
} => {
  const statusColors = {
    'Planning': { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200' },
    'On Track': { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
    'At Risk': { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
    'Overdue': { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
    'Completed': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
    'Paused': { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
    'Cancelled': { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' }
  };
  return statusColors[status];
};

export const getPriorityColor = (priority: ProjectPriority): {
  bg: string;
  text: string;
  border: string;
} => {
  const priorityColors = {
    'Low': { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300' },
    'Medium': { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300' },
    'High': { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-300' },
    'Critical': { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300' }
  };
  return priorityColors[priority];
};

export const getTaskStatusColor = (status: TaskStatus): {
  bg: string;
  text: string;
  border: string;
} => {
  const statusColors = {
    'todo': { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300' },
    'in-progress': { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300' },
    'review': { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-300' },
    'done': { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300' },
    'blocked': { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300' }
  };
  return statusColors[status];
};

// Progress calculations
export const calculateProjectProgress = (project: Project): number => {
  if (project.tasks.length === 0) return 0;
  
  const completedTasks = project.tasks.filter(task => task.status === 'done').length;
  return Math.round((completedTasks / project.tasks.length) * 100);
};

export const calculateMilestoneProgress = (milestone: Milestone): number => {
  if (milestone.tasks.length === 0) return 0;
  
  const completedTasks = milestone.tasks.filter(task => task.status === 'done').length;
  return Math.round((completedTasks / milestone.tasks.length) * 100);
};

export const calculateTeamWorkload = (member: ProjectMember, projects: Project[]): number => {
  const memberTasks = projects.flatMap(project => 
    project.tasks.filter(task => 
      task.assigneeId === member.id && 
      task.status !== 'done'
    )
  );
  
  // Simple workload calculation based on task count and priority
  const workloadPoints = memberTasks.reduce((total, task) => {
    const priorityWeight = {
      'Low': 1,
      'Medium': 2,
      'High': 3,
      'Critical': 4
    };
    return total + priorityWeight[task.priority];
  }, 0);
  
  // Normalize to 0-100 scale (assuming 20 points is 100% workload)
  return Math.min(Math.round((workloadPoints / 20) * 100), 100);
};

// Analytics calculations
export const calculateProjectVelocity = (project: Project, weeks: number = 4): number => {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - (weeks * 7));
  
  const recentCompletions = project.tasks.filter(task => 
    task.status === 'done' && 
    task.updatedAt && 
    new Date(task.updatedAt) >= cutoffDate
  );
  
  return Math.round(recentCompletions.length / weeks);
};

export const calculateBurndownData = (project: Project, startDate?: string): { date: string; remaining: number }[] => {
  const start = startDate ? new Date(startDate) : new Date(project.createdAt);
  const end = new Date(project.dueDate);
  const totalTasks = project.tasks.length;
  
  const burndownData: { date: string; remaining: number }[] = [];
  const currentDate = new Date(start);
  
  while (currentDate <= end) {
    const tasksCompletedByDate = project.tasks.filter(task => 
      task.status === 'done' && 
      task.updatedAt && 
      new Date(task.updatedAt) <= currentDate
    ).length;
    
    burndownData.push({
      date: currentDate.toISOString().split('T')[0],
      remaining: totalTasks - tasksCompletedByDate
    });
    
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return burndownData;
};

export const predictCompletionDate = (project: Project): string => {
  const velocity = calculateProjectVelocity(project);
  const remainingTasks = project.tasks.filter(task => task.status !== 'done').length;
  
  if (velocity === 0) return project.dueDate; // No velocity data, return original due date
  
  const weeksToComplete = Math.ceil(remainingTasks / velocity);
  const completionDate = new Date();
  completionDate.setDate(completionDate.getDate() + (weeksToComplete * 7));
  
  return completionDate.toISOString().split('T')[0];
};

// Search and filter utilities
export const filterProjects = (
  projects: Project[], 
  query: string,
  filters?: {
    status?: ProjectStatus[];
    priority?: ProjectPriority[];
    teamMember?: string;
    tags?: string[];
  }
): Project[] => {
  return projects.filter(project => {
    // Text search
    const matchesQuery = query === '' || 
      project.title.toLowerCase().includes(query.toLowerCase()) ||
      project.description.toLowerCase().includes(query.toLowerCase()) ||
      project.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase()));
    
    // Status filter
    const matchesStatus = !filters?.status?.length || 
      filters.status.includes(project.status);
    
    // Priority filter
    const matchesPriority = !filters?.priority?.length || 
      filters.priority.includes(project.priority);
    
    // Team member filter
    const matchesTeamMember = !filters?.teamMember || 
      project.teamMembers.some(member => member.id === filters.teamMember);
    
    // Tags filter
    const matchesTags = !filters?.tags?.length || 
      filters.tags.some(tag => project.tags.includes(tag));
    
    return matchesQuery && matchesStatus && matchesPriority && matchesTeamMember && matchesTags;
  });
};

export const sortProjects = (
  projects: Project[],
  sortBy: 'title' | 'status' | 'priority' | 'progress' | 'dueDate' | 'createdAt' | 'updatedAt',
  order: 'asc' | 'desc' = 'desc'
): Project[] => {
  return [...projects].sort((a, b) => {
    let aValue: any = a[sortBy];
    let bValue: any = b[sortBy];
    
    // Handle special cases
    if (sortBy === 'progress') {
      aValue = calculateProjectProgress(a);
      bValue = calculateProjectProgress(b);
    }
    
    if (sortBy === 'priority') {
      const priorityOrder = { 'Low': 1, 'Medium': 2, 'High': 3, 'Critical': 4 };
      aValue = priorityOrder[a.priority];
      bValue = priorityOrder[b.priority];
    }
    
    // Convert dates to timestamps
    if (typeof aValue === 'string' && sortBy.includes('Date')) {
      aValue = new Date(aValue).getTime();
      bValue = new Date(bValue).getTime();
    }
    
    if (aValue < bValue) return order === 'asc' ? -1 : 1;
    if (aValue > bValue) return order === 'asc' ? 1 : -1;
    return 0;
  });
};

// Gantt chart utilities
export const convertToGanttTasks = (project: Project): GanttTask[] => {
  const ganttTasks: GanttTask[] = [];
  
  // Add milestones
  project.milestones.forEach(milestone => {
    ganttTasks.push({
      id: milestone.id,
      name: milestone.title,
      start: new Date(milestone.startDate),
      end: new Date(milestone.dueDate),
      progress: milestone.progress,
      dependencies: milestone.dependencies,
      type: 'milestone',
      color: '#8B5CF6',
      children: milestone.tasks.map(task => ({
        id: task.id,
        name: task.title,
        start: new Date(task.createdAt),
        end: new Date(task.dueDate || milestone.dueDate),
        progress: task.status === 'done' ? 100 : task.status === 'in-progress' ? 50 : 0,
        dependencies: task.dependencies,
        type: 'task' as const,
        assignee: task.assigneeId,
        color: getTaskStatusColor(task.status).bg
      }))
    });
  });
  
  return ganttTasks;
};

// Dashboard analytics
export const calculateDashboardAnalytics = (projects: Project[]): DashboardAnalytics => {
  const activeProjects = projects.filter(p => !p.archived && p.status !== 'Completed' && p.status !== 'Cancelled');
  const completedProjects = projects.filter(p => p.status === 'Completed');
  const overdueProjects = projects.filter(p => isOverdue(p.dueDate) && p.status !== 'Completed');
  
  const allTasks = projects.flatMap(p => p.tasks);
  const completedTasks = allTasks.filter(t => t.status === 'done');
  
  const allMembers = new Map<string, ProjectMember>();
  projects.forEach(p => {
    p.teamMembers.forEach(m => allMembers.set(m.id, m));
  });
  
  const avgProgress = projects.length > 0 
    ? Math.round(projects.reduce((sum, p) => sum + calculateProjectProgress(p), 0) / projects.length)
    : 0;
  
  const upcomingDeadlines = projects
    .filter(p => isUpcoming(p.dueDate, 14) && p.status !== 'Completed')
    .map(p => ({
      projectId: p.id,
      projectTitle: p.title,
      dueDate: p.dueDate,
      daysRemaining: getDaysUntilDue(p.dueDate)
    }))
    .sort((a, b) => a.daysRemaining - b.daysRemaining)
    .slice(0, 5);
  
  // Calculate top performers
  const memberStats = new Map<string, { tasksCompleted: number; projects: Set<string> }>();
  completedTasks.forEach(task => {
    if (task.assigneeId) {
      const stats = memberStats.get(task.assigneeId) || { tasksCompleted: 0, projects: new Set() };
      stats.tasksCompleted++;
      // Find project containing this task
      const project = projects.find(p => p.tasks.some(t => t.id === task.id));
      if (project) stats.projects.add(project.id);
      memberStats.set(task.assigneeId, stats);
    }
  });
  
  const topPerformers = Array.from(memberStats.entries())
    .map(([memberId, stats]) => ({
      memberId,
      memberName: allMembers.get(memberId)?.name || 'Unknown',
      tasksCompleted: stats.tasksCompleted,
      projects: Array.from(stats.projects)
    }))
    .sort((a, b) => b.tasksCompleted - a.tasksCompleted)
    .slice(0, 5);
  
  // Budget overview
  const totalBudget = projects.reduce((sum, p) => sum + (p.budget || 0), 0);
  const totalSpent = projects.reduce((sum, p) => sum + (p.spent || 0), 0);
  
  const budgetOverview = {
    totalBudget,
    totalSpent,
    remaining: totalBudget - totalSpent,
    currency: 'USD', // Default currency
    projectBreakdown: projects
      .filter(p => p.budget && p.budget > 0)
      .map(p => ({
        projectId: p.id,
        projectTitle: p.title,
        budget: p.budget || 0,
        spent: p.spent || 0
      }))
  };
  
  // Recent activity (last 50 items)
  const recentActivity = projects
    .flatMap(p => p.activityLog)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 50);
  
  return {
    totalProjects: projects.length,
    activeProjects: activeProjects.length,
    completedProjects: completedProjects.length,
    overDueProjects: overdueProjects.length,
    totalTasks: allTasks.length,
    completedTasks: completedTasks.length,
    totalTeamMembers: allMembers.size,
    avgProjectProgress: avgProgress,
    upcomingDeadlines,
    topPerformers,
    recentActivity,
    budgetOverview,
    aiInsights: projects.flatMap(p => p.aiAnalysis).slice(0, 10)
  };
};

// Validation utilities
export const validateProject = (project: Partial<Project>): string[] => {
  const errors: string[] = [];
  
  if (!project.title?.trim()) {
    errors.push('Project title is required');
  }
  
  if (project.title && project.title.length > 100) {
    errors.push('Project title must be less than 100 characters');
  }
  
  if (!project.description?.trim()) {
    errors.push('Project description is required');
  }
  
  if (project.dueDate && new Date(project.dueDate) <= new Date()) {
    errors.push('Due date must be in the future');
  }
  
  if (project.budget && project.budget < 0) {
    errors.push('Budget must be a positive number');
  }
  
  return errors;
};

export const validateTask = (task: Partial<Task>): string[] => {
  const errors: string[] = [];
  
  if (!task.title?.trim()) {
    errors.push('Task title is required');
  }
  
  if (task.title && task.title.length > 200) {
    errors.push('Task title must be less than 200 characters');
  }
  
  if (task.estimatedHours && task.estimatedHours < 0) {
    errors.push('Estimated hours must be a positive number');
  }
  
  if (task.dueDate && new Date(task.dueDate) <= new Date()) {
    errors.push('Due date must be in the future');
  }
  
  return errors;
};

// Export utilities
export const exportProjectData = (
  project: Project, 
  format: 'json' | 'csv' | 'excel'
): string | Blob => {
  if (format === 'json') {
    return JSON.stringify(project, null, 2);
  }
  
  if (format === 'csv') {
    const headers = ['Task ID', 'Title', 'Status', 'Priority', 'Assignee', 'Due Date', 'Progress'];
    const rows = project.tasks.map(task => [
      task.id,
      task.title,
      task.status,
      task.priority,
      task.assignee?.name || 'Unassigned',
      task.dueDate || '',
      task.status === 'done' ? '100%' : '0%'
    ]);
    
    return [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
  }
  
  // Excel format would require a library like xlsx
  throw new Error('Excel export not implemented');
};

// Color utilities
export const generateProjectColor = (): string => {
  const colors = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', 
    '#8B5CF6', '#06B6D4', '#84CC16', '#F97316',
    '#EC4899', '#6366F1', '#14B8A6', '#F59E0B'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
};

// Local storage utilities
export const saveProjectToStorage = (project: Project): void => {
  const stored = getStoredProjects();
  const index = stored.findIndex(p => p.id === project.id);
  
  if (index >= 0) {
    stored[index] = project;
  } else {
    stored.push(project);
  }
  
  localStorage.setItem('engunity_projects', JSON.stringify(stored));
};

export const getStoredProjects = (): Project[] => {
  try {
    const stored = localStorage.getItem('engunity_projects');
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error loading projects from storage:', error);
    return [];
  }
};

export const removeProjectFromStorage = (projectId: string): void => {
  const stored = getStoredProjects();
  const filtered = stored.filter(p => p.id !== projectId);
  localStorage.setItem('engunity_projects', JSON.stringify(filtered));
};

// Utility constants
export const PROJECT_STATUSES: ProjectStatus[] = [
  'Planning', 'On Track', 'At Risk', 'Overdue', 'Completed', 'Paused', 'Cancelled'
];

export const PROJECT_PRIORITIES: ProjectPriority[] = [
  'Low', 'Medium', 'High', 'Critical'
];

export const TASK_STATUSES: TaskStatus[] = [
  'todo', 'in-progress', 'review', 'done', 'blocked'
];

export const PROJECT_TYPES = [
  'Development', 'Research', 'Security', 'Analytics', 'Design', 'Marketing', 'Infrastructure'
] as const;