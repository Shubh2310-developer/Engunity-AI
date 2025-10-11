/**
 * Projects API Client for Engunity AI
 * ====================================
 * 
 * Type-safe API client for backend project endpoints
 * with role-based filtering and personalization.
 * 
 * @module lib/api/projects
 */

import { UserContext } from '@/hooks/useUserContext';

// API Base URL - Remove /api suffix as it's added in the routes
const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || 'http://localhost:8000';

// ==========================================
// TYPE DEFINITIONS
// ==========================================

export interface Project {
  id: string;
  title: string;
  description: string;
  status: 'Planning' | 'On Track' | 'At Risk' | 'Overdue' | 'Completed' | 'Paused' | 'Cancelled';
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  visibility: 'Private' | 'Team' | 'Public';
  owner_id: string;
  organization_id: string;
  progress: number;
  spent?: number;
  budget?: number;
  created_at: string;
  updated_at: string;
  team_member_count: number;
  task_count: number;
  milestone_count: number;
  health_score?: number;
  risk_score?: number;
}

export interface Task {
  id: string;
  project_id: string;
  title: string;
  description: string;
  status: 'todo' | 'in-progress' | 'review' | 'done' | 'blocked';
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  assignee_id?: string;
  reporter_id: string;
  due_date?: string;
  created_at: string;
  updated_at: string;
  estimated_hours?: number;
  actual_hours?: number;
  progress: number;
}

export interface AIInsight {
  id: string;
  type: 'optimization' | 'warning' | 'opportunity' | 'prediction' | 'recommendation';
  title: string;
  description: string;
  confidence: number;
  impact: 'low' | 'medium' | 'high';
  category: string;
  action_items: string[];
  status: string;
  generated_at: string;
}

export interface Recommendation {
  priority: 'high' | 'medium' | 'low';
  category: string;
  action: string;
  impact: string;
  effort: string;
}

export interface PersonalizedDashboard {
  user: {
    name: string;
    role: string;
    organization_id: string;
  };
  visible_projects: Project[];
  personal_insights: AIInsight[];
  recommendations: Recommendation[];
  stats: {
    total_projects: number;
    active_projects: number;
    at_risk_projects: number;
    assigned_tasks: number;
    overdue_tasks: number;
    completed_this_week: number;
  };
  upcoming_deadlines: Array<{
    task_id: string;
    title: string;
    due_date: string;
    days_until: number;
    priority: string;
  }>;
}

export interface ProjectHealth {
  overall_health: number;
  risk_score: number;
  factors: {
    progress_health: number;
    timeline_health: number;
    budget_health: number;
    quality_health: number;
  };
}

export interface ProjectCreate {
  title: string;
  description: string;
  status?: string;
  priority?: string;
  visibility?: string;
  due_date: string;
  budget?: number;
  tags?: string[];
}

export interface ProjectUpdate {
  title?: string;
  description?: string;
  status?: string;
  priority?: string;
  visibility?: string;
  due_date?: string;
  budget?: number;
  tags?: string[];
}

// ==========================================
// API CLIENT FUNCTIONS
// ==========================================

/**
 * Fetch projects filtered by user permissions
 */
export async function fetchUserProjects(token: string): Promise<{ projects: Project[]; total: number }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/projects`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch projects: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching user projects:', error);
    throw error;
  }
}

/**
 * Get personalized AI-powered dashboard
 */
export async function getPersonalizedDashboard(user: UserContext): Promise<PersonalizedDashboard> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/ai/personalized-dashboard`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${user.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: user.user_id,
        role: user.role,
        organization_id: user.organization_id,
        include_health: true,
        include_tasks: true,
        include_insights: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch personalized dashboard: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching personalized dashboard:', error);
    throw error;
  }
}

/**
 * Get project health analysis
 */
export async function getProjectHealth(projectId: string, token: string): Promise<ProjectHealth> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/projects/${projectId}/health`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch project health: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching project health:', error);
    throw error;
  }
}

/**
 * Create a new project (Owner/Admin only)
 */
export async function createProject(data: ProjectCreate, token: string): Promise<Project> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/projects`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || `Failed to create project: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error creating project:', error);
    throw error;
  }
}

/**
 * Update a project (permission-based)
 */
export async function updateProject(id: string, data: ProjectUpdate, token: string): Promise<Project> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/projects/${id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || `Failed to update project: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error updating project:', error);
    throw error;
  }
}

/**
 * Delete a project (Owner/Admin only)
 */
export async function deleteProject(id: string, token: string): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/projects/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || `Failed to delete project: ${response.statusText}`);
    }
  } catch (error) {
    console.error('Error deleting project:', error);
    throw error;
  }
}

/**
 * Get tasks for a project
 */
export async function getProjectTasks(projectId: string, token: string): Promise<Task[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/projects/${projectId}/tasks`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch tasks: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching project tasks:', error);
    throw error;
  }
}

/**
 * Refresh AI analysis for dashboard
 */
export async function refreshAIAnalysis(user: UserContext): Promise<PersonalizedDashboard> {
  // Same as getPersonalizedDashboard but forces refresh
  return getPersonalizedDashboard(user);
}
