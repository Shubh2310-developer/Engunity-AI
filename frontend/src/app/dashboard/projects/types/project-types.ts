// Enhanced TypeScript interfaces for Engunity AI Project Management

export type ProjectStatus = 'Planning' | 'On Track' | 'At Risk' | 'Overdue' | 'Completed' | 'Paused' | 'Cancelled';
export type ProjectPriority = 'Low' | 'Medium' | 'High' | 'Critical';
export type ProjectVisibility = 'Private' | 'Team' | 'Public';
export type ProjectType = 'Development' | 'Research' | 'Security' | 'Analytics' | 'Design' | 'Marketing' | 'Infrastructure';
export type TaskStatus = 'todo' | 'in-progress' | 'review' | 'done' | 'blocked';
export type TeamRole = 'Owner' | 'Admin' | 'Contributor' | 'Viewer';

// Core Project Member interface
export interface ProjectMember {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: TeamRole;
  online: boolean;
  joinedAt: string;
  lastActivity: string;
  permissions: Permission[];
  workload?: number; // 0-100
  expertise: string[];
}

// Permission system
export interface Permission {
  resource: string; // 'tasks', 'files', 'settings', etc.
  actions: ('read' | 'write' | 'delete' | 'admin')[];
}

// Task interface
export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: ProjectPriority;
  assignee?: ProjectMember;
  assigneeId?: string;
  reporter: ProjectMember;
  reporterId: string;
  tags: string[];
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
  estimatedHours?: number;
  actualHours?: number;
  dependencies: string[]; // Task IDs
  subtasks: Task[];
  comments: Comment[];
  attachments: Attachment[];
  milestoneId?: string;
}

// Milestone interface
export interface Milestone {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed' | 'delayed';
  progress: number; // 0-100
  dueDate: string;
  startDate: string;
  tasks: Task[];
  dependencies: string[]; // Other milestone IDs
  deliverables: string[];
  budget?: number;
  spent?: number;
}

// Comment interface
export interface Comment {
  id: string;
  content: string;
  author: ProjectMember;
  authorId: string;
  createdAt: string;
  updatedAt?: string;
  mentions: string[]; // User IDs
  reactions: Reaction[];
  replies: Comment[];
  attachments: Attachment[];
}

// Reaction interface
export interface Reaction {
  emoji: string;
  userId: string;
  userName: string;
}

// Attachment interface
export interface Attachment {
  id: string;
  name: string;
  url: string;
  type: string; // MIME type
  size: number; // bytes
  uploadedBy: string;
  uploadedAt: string;
}

// Activity Log interface
export interface ActivityLog {
  id: string;
  type: 'task' | 'comment' | 'milestone' | 'member' | 'file' | 'commit' | 'meeting' | 'integration';
  action: string;
  user: ProjectMember;
  userId: string;
  target?: string;
  description: string;
  timestamp: string;
  metadata?: Record<string, any>;
  changes?: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
}

// Integration interface
export interface Integration {
  id: string;
  type: 'github' | 'gitlab' | 'slack' | 'discord' | 'email' | 'webhook' | 'ai-analysis' | 'cloud-storage';
  name: string;
  description: string;
  enabled: boolean;
  config: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  lastSync?: string;
  status: 'active' | 'error' | 'paused';
}

// AI Analysis interface
export interface AIAnalysis {
  id: string;
  type: 'risk-assessment' | 'progress-prediction' | 'resource-optimization' | 'quality-analysis';
  title: string;
  description: string;
  confidence: number; // 0-100
  impact: 'low' | 'medium' | 'high';
  recommendations: string[];
  generatedAt: string;
  data: Record<string, any>;
  status: 'active' | 'archived' | 'implemented';
}

// Report interface
export interface Report {
  id: string;
  title: string;
  type: 'progress' | 'performance' | 'budget' | 'team' | 'ai-insights' | 'custom';
  description: string;
  generatedAt: string;
  generatedBy: string;
  data: Record<string, any>;
  charts: ChartData[];
  summary: string;
  exportFormats: ('pdf' | 'excel' | 'csv' | 'json')[];
}

// Chart Data interface
export interface ChartData {
  id: string;
  type: 'line' | 'bar' | 'pie' | 'doughnut' | 'area' | 'scatter';
  title: string;
  data: any[];
  labels: string[];
  colors: string[];
  config?: Record<string, any>;
}

// Main Project interface
export interface Project {
  // Basic Info
  id: string;
  title: string;
  description: string;
  status: ProjectStatus;
  priority: ProjectPriority;
  type: ProjectType;
  visibility: ProjectVisibility;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  startDate: string;
  dueDate: string;
  completedAt?: string;
  
  // Visual
  color: string;
  icon: string; // icon name
  banner?: string; // image URL
  tags: string[];
  
  // Progress
  progress: number; // 0-100
  
  // Team
  owner: ProjectMember;
  ownerId: string;
  teamMembers: ProjectMember[];
  
  // Structure
  milestones: Milestone[];
  tasks: Task[];
  
  // Resources
  budget?: number;
  spent?: number;
  currency?: string;
  
  // External
  githubRepo?: string;
  externalLinks: {
    name: string;
    url: string;
    type: string;
  }[];
  
  // Analytics
  analytics: {
    totalTasks: number;
    completedTasks: number;
    overdueTasks: number;
    activeMembers: number;
    velocity: number; // tasks completed per week
    burndownData: { date: string; remaining: number }[];
    timeSpent: number; // hours
    estimatedCompletion: string;
  };
  
  // AI & Integrations
  aiAnalysis: AIAnalysis[];
  integrations: Integration[];
  activityLog: ActivityLog[];
  
  // Settings
  settings: ProjectSettings;
  
  // Archive
  archived: boolean;
  archivedAt?: string;
  archivedBy?: string;
  
  // Starred
  starred: boolean;
  starredBy: string[]; // User IDs
}

// Project Settings interface
export interface ProjectSettings {
  notifications: {
    email: boolean;
    slack: boolean;
    discord: boolean;
    inApp: boolean;
    frequency: 'realtime' | 'daily' | 'weekly';
  };
  automation: {
    autoAssign: boolean;
    statusUpdates: boolean;
    dependencyTracking: boolean;
    timeTracking: boolean;
  };
  security: {
    requireApproval: boolean;
    allowExternalAccess: boolean;
    dataRetention: number; // days
    encryptionEnabled: boolean;
  };
  integrations: {
    github: boolean;
    slack: boolean;
    aiAnalysis: boolean;
    cloudStorage: boolean;
  };
}

// Template interface for project creation
export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  category: ProjectType;
  icon: string;
  color: string;
  tags: string[];
  estimatedDuration: string;
  complexity: 'Beginner' | 'Intermediate' | 'Advanced';
  features: string[];
  defaultMilestones: Omit<Milestone, 'id' | 'tasks'>[];
  defaultTasks: Omit<Task, 'id' | 'assignee' | 'reporter' | 'comments' | 'attachments'>[];
  requiredSkills: string[];
  recommendedTeamSize: number;
  budget?: {
    min: number;
    max: number;
    currency: string;
  };
}

// Search and Filter interfaces
export interface ProjectFilters {
  status: ProjectStatus[];
  priority: ProjectPriority[];
  type: ProjectType[];
  teamMember: string[];
  tags: string[];
  dateRange: {
    start: string;
    end: string;
  };
  budget: {
    min?: number;
    max?: number;
  };
  progress: {
    min?: number;
    max?: number;
  };
}

export interface ProjectSearchResult {
  projects: Project[];
  total: number;
  page: number;
  limit: number;
  filters: ProjectFilters;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

// Dashboard Analytics
export interface DashboardAnalytics {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  overDueProjects: number;
  totalTasks: number;
  completedTasks: number;
  totalTeamMembers: number;
  avgProjectProgress: number;
  upcomingDeadlines: {
    projectId: string;
    projectTitle: string;
    dueDate: string;
    daysRemaining: number;
  }[];
  topPerformers: {
    memberId: string;
    memberName: string;
    tasksCompleted: number;
    projects: string[];
  }[];
  recentActivity: ActivityLog[];
  budgetOverview: {
    totalBudget: number;
    totalSpent: number;
    remaining: number;
    currency: string;
    projectBreakdown: {
      projectId: string;
      projectTitle: string;
      budget: number;
      spent: number;
    }[];
  };
  aiInsights: AIAnalysis[];
}

// API Response types
export interface ApiResponse<T> {
  data: T;
  message: string;
  success: boolean;
  timestamp: string;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
}

export interface ApiError {
  message: string;
  code: string;
  details?: any;
  timestamp: string;
}

// Utility types
export type ProjectUpdate = Partial<Pick<Project, 'title' | 'description' | 'status' | 'priority' | 'dueDate' | 'tags' | 'budget'>>;
export type TaskUpdate = Partial<Pick<Task, 'title' | 'description' | 'status' | 'priority' | 'dueDate' | 'assigneeId'>>;
export type MilestoneUpdate = Partial<Pick<Milestone, 'title' | 'description' | 'status' | 'dueDate' | 'progress'>>;

// Form types for UI
export interface CreateProjectForm {
  title: string;
  description: string;
  type: ProjectType;
  priority: ProjectPriority;
  visibility: ProjectVisibility;
  dueDate: string;
  budget?: number;
  tags: string[];
  templateId?: string;
  teamMembers: string[]; // User IDs
}

export interface CreateTaskForm {
  title: string;
  description: string;
  priority: ProjectPriority;
  assigneeId?: string;
  dueDate?: string;
  estimatedHours?: number;
  tags: string[];
  milestoneId?: string;
}

export interface CreateMilestoneForm {
  title: string;
  description: string;
  dueDate: string;
  deliverables: string[];
  budget?: number;
}

// Gantt Chart types
export interface GanttTask {
  id: string;
  name: string;
  start: Date;
  end: Date;
  progress: number;
  dependencies: string[];
  type: 'task' | 'milestone' | 'project';
  assignee?: string;
  color?: string;
  children?: GanttTask[];
}

// Kanban Board types
export interface KanbanColumn {
  id: string;
  title: string;
  status: TaskStatus;
  tasks: Task[];
  limit?: number;
  color: string;
}

export interface KanbanBoard {
  id: string;
  name: string;
  columns: KanbanColumn[];
  projectId: string;
}

// Export configuration
export interface ExportConfig {
  format: 'pdf' | 'excel' | 'csv' | 'json';
  sections: string[];
  dateRange?: {
    start: string;
    end: string;
  };
  includeCharts: boolean;
  includeComments: boolean;
  template?: string;
}