/**
 * Mock Data Generator for Engunity AI
 * ====================================
 *
 * Generates realistic demo data for testing and fallback scenarios.
 *
 * @module lib/mockData
 */

import { Project, Task, AIInsight, PersonalizedDashboard } from './api/projects';
import { UserContext } from '@/hooks/useUserContext';

// ==========================================
// MOCK PROJECT DATA
// ==========================================

export function generateMockProjects(count: number = 5, userId: string, orgId: string): Project[] {
  const projectTemplates = [
    {
      title: 'Customer Churn Prediction',
      description: 'ML pipeline for predicting customer behavior patterns using advanced analytics',
      status: 'On Track' as const,
      priority: 'High' as const,
    },
    {
      title: 'Security Audit Dashboard',
      description: 'Real-time monitoring system for security vulnerabilities and threat detection',
      status: 'Planning' as const,
      priority: 'Critical' as const,
    },
    {
      title: 'Data Pipeline Optimization',
      description: 'Improve ETL performance and reduce processing time by 50%',
      status: 'At Risk' as const,
      priority: 'High' as const,
    },
    {
      title: 'AI Research Platform',
      description: 'Centralized platform for managing research papers and experiments',
      status: 'On Track' as const,
      priority: 'Medium' as const,
    },
    {
      title: 'Mobile App Development',
      description: 'Native mobile application for iOS and Android platforms',
      status: 'Completed' as const,
      priority: 'Low' as const,
    },
  ];

  return projectTemplates.slice(0, count).map((template, idx) => ({
    id: `proj_${Date.now()}_${idx}`,
    ...template,
    visibility: (idx === 0 ? 'Team' : idx === 1 ? 'Private' : 'Public') as 'Private' | 'Team' | 'Public',
    owner_id: userId,
    organization_id: orgId,
    progress: Math.floor(Math.random() * 100),
    spent: Math.floor(Math.random() * 50000) + 10000,
    budget: Math.floor(Math.random() * 100000) + 50000,
    created_at: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
    team_member_count: Math.floor(Math.random() * 8) + 2,
    task_count: Math.floor(Math.random() * 50) + 10,
    milestone_count: Math.floor(Math.random() * 5) + 2,
    health_score: Math.floor(Math.random() * 40) + 60,
    risk_score: Math.floor(Math.random() * 50),
  }));
}

// ==========================================
// MOCK TASK DATA
// ==========================================

export function generateMockTasks(count: number = 10, projectId: string, userId: string): Task[] {
  const taskTemplates: Array<{
    title: string;
    description: string;
    status: 'todo' | 'in-progress' | 'review' | 'done' | 'blocked';
  }> = [
    { title: 'Setup project infrastructure', description: 'Initialize repository and CI/CD pipeline', status: 'done' },
    { title: 'Implement authentication', description: 'Add OAuth2 and JWT authentication', status: 'in-progress' },
    { title: 'Design database schema', description: 'Create ERD and migration scripts', status: 'done' },
    { title: 'Build API endpoints', description: 'RESTful API with FastAPI', status: 'in-progress' },
    { title: 'Write unit tests', description: 'Achieve 80% code coverage', status: 'todo' },
    { title: 'Setup monitoring', description: 'Configure Prometheus and Grafana', status: 'blocked' },
    { title: 'Create documentation', description: 'API docs and user guides', status: 'review' },
    { title: 'Performance optimization', description: 'Reduce API latency to <100ms', status: 'todo' },
    { title: 'Security audit', description: 'Penetration testing and vulnerability scan', status: 'todo' },
    { title: 'Deploy to production', description: 'Blue-green deployment strategy', status: 'todo' },
  ];

  return taskTemplates.slice(0, count).map((template, idx): Task => ({
    id: `task_${Date.now()}_${idx}`,
    project_id: projectId,
    title: template.title,
    description: template.description,
    status: template.status,
    priority: (['Low', 'Medium', 'High', 'Critical'][Math.floor(Math.random() * 4)] as 'Low' | 'Medium' | 'High' | 'Critical'),
    assignee_id: Math.random() > 0.3 ? userId : undefined,
    reporter_id: userId,
    due_date: Math.random() > 0.5
      ? new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
      : undefined,
    created_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
    estimated_hours: Math.floor(Math.random() * 40) + 4,
    actual_hours: Math.random() > 0.5 ? Math.floor(Math.random() * 30) : undefined,
    progress: Math.floor(Math.random() * 100),
  }));
}

// ==========================================
// MOCK AI INSIGHTS
// ==========================================

export function generateMockInsights(count: number = 5): AIInsight[] {
  const insightTemplates = [
    {
      type: 'warning' as const,
      title: 'High Task Overload Detected',
      description: 'You have 12 tasks due this week. Consider delegating 4 non-critical tasks to maintain quality.',
      impact: 'high' as const,
      category: 'workload',
    },
    {
      type: 'optimization' as const,
      title: 'Code Review Bottleneck',
      description: '5 PRs are pending review for >3 days. Assign additional reviewers to speed up the process.',
      impact: 'medium' as const,
      category: 'process',
    },
    {
      type: 'opportunity' as const,
      title: 'Performance Improvement Available',
      description: 'API response time can be reduced by 35% by implementing Redis caching for frequently accessed data.',
      impact: 'high' as const,
      category: 'performance',
    },
    {
      type: 'prediction' as const,
      title: 'Project Deadline Risk',
      description: 'Current velocity suggests 15% chance of missing deadline. Add 1 developer or reduce scope by 20%.',
      impact: 'high' as const,
      category: 'timeline',
    },
    {
      type: 'recommendation' as const,
      title: 'Test Coverage Below Target',
      description: 'Current test coverage is 65%. Aim for 80% by adding integration tests for critical paths.',
      impact: 'medium' as const,
      category: 'quality',
    },
  ];

  return insightTemplates.slice(0, count).map((template, idx) => ({
    id: `insight_${Date.now()}_${idx}`,
    ...template,
    confidence: Math.floor(Math.random() * 30) + 70,
    action_items: [
      'Review and prioritize tasks',
      'Schedule team sync',
      'Update project timeline',
    ].slice(0, Math.floor(Math.random() * 3) + 1),
    status: 'active',
    generated_at: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
  }));
}

// ==========================================
// MOCK PERSONALIZED DASHBOARD
// ==========================================

export function generateMockDashboard(user: UserContext): PersonalizedDashboard {
  const projects = generateMockProjects(5, user.user_id, user.organization_id);
  const insights = generateMockInsights(5);

  // Calculate stats based on role
  const visibleProjectCount = user.role === 'Viewer' ? 3 : projects.length;
  const activeProjects = projects.filter(p => p.status === 'On Track' || p.status === 'At Risk');
  const atRiskProjects = projects.filter(p => p.status === 'At Risk');

  // Generate upcoming deadlines
  const allTasks: Task[] = [];
  projects.forEach(project => {
    const tasks = generateMockTasks(5, project.id, user.user_id);
    allTasks.push(...tasks);
  });

  const upcomingTasks = allTasks
    .filter(t => t.due_date && t.status !== 'done')
    .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())
    .slice(0, 5)
    .map(t => {
      const dueDate = new Date(t.due_date!);
      const now = new Date();
      const daysUntil = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      return {
        task_id: t.id,
        title: t.title,
        due_date: t.due_date!,
        days_until: daysUntil,
        priority: t.priority,
      };
    });

  return {
    user: {
      name: user.name,
      role: user.role,
      organization_id: user.organization_id,
    },
    visible_projects: projects.slice(0, visibleProjectCount),
    personal_insights: insights,
    recommendations: [
      {
        priority: 'high' as const,
        category: 'productivity',
        action: 'Focus on completing 3 high-priority tasks this week',
        impact: 'Will unblock 2 team members and improve project velocity by 15%',
        effort: 'Medium - Estimated 12 hours',
      },
      {
        priority: 'medium' as const,
        category: 'collaboration',
        action: 'Schedule code review session with team',
        impact: 'Reduce review time from 3 days to 1 day',
        effort: 'Low - 2 hour meeting',
      },
      {
        priority: 'low' as const,
        category: 'documentation',
        action: 'Update project README with latest changes',
        impact: 'Improve onboarding time for new team members',
        effort: 'Low - 1 hour',
      },
    ],
    stats: {
      total_projects: visibleProjectCount,
      active_projects: activeProjects.length,
      at_risk_projects: atRiskProjects.length,
      assigned_tasks: allTasks.filter(t => t.assignee_id === user.user_id).length,
      overdue_tasks: allTasks.filter(t =>
        t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done'
      ).length,
      completed_this_week: allTasks.filter(t => {
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        return t.status === 'done' && new Date(t.updated_at) > weekAgo;
      }).length,
    },
    upcoming_deadlines: upcomingTasks,
  };
}

// ==========================================
// MOCK DATA MODE UTILITIES
// ==========================================

export interface MockDataConfig {
  enabled: boolean;
  projectCount: number;
  taskCount: number;
  insightCount: number;
}

export const DEFAULT_MOCK_CONFIG: MockDataConfig = {
  enabled: false,
  projectCount: 5,
  taskCount: 10,
  insightCount: 5,
};

/**
 * Check if mock data should be used
 */
export function shouldUseMockData(): boolean {
  if (typeof window === 'undefined') return false;

  const stored = localStorage.getItem('engunity_use_mock_data');
  return stored === 'true';
}

/**
 * Toggle mock data mode
 */
export function toggleMockDataMode(): boolean {
  if (typeof window === 'undefined') return false;

  const current = shouldUseMockData();
  const newValue = !current;
  localStorage.setItem('engunity_use_mock_data', String(newValue));

  return newValue;
}

/**
 * Get mock data config
 */
export function getMockDataConfig(): MockDataConfig {
  if (typeof window === 'undefined') return DEFAULT_MOCK_CONFIG;

  const stored = localStorage.getItem('engunity_mock_config');
  if (!stored) return DEFAULT_MOCK_CONFIG;

  try {
    return { ...DEFAULT_MOCK_CONFIG, ...JSON.parse(stored) };
  } catch {
    return DEFAULT_MOCK_CONFIG;
  }
}

/**
 * Update mock data config
 */
export function updateMockDataConfig(config: Partial<MockDataConfig>): void {
  if (typeof window === 'undefined') return;

  const current = getMockDataConfig();
  const updated = { ...current, ...config };
  localStorage.setItem('engunity_mock_config', JSON.stringify(updated));
}
