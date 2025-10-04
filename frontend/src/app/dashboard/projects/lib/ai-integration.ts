// AI Integration utilities for Engunity AI Project Management

import { Project, Task, Milestone, AIAnalysis, ProjectMember, ActivityLog } from '../types/project-types';

// AI Analysis Types
export interface AIInsight {
  id: string;
  type: 'optimization' | 'warning' | 'opportunity' | 'prediction' | 'recommendation';
  title: string;
  description: string;
  confidence: number; // 0-100
  impact: 'low' | 'medium' | 'high';
  category: 'performance' | 'team' | 'timeline' | 'resources' | 'quality' | 'risk';
  actionItems: string[];
  data: any;
  generatedAt: string;
  status: 'active' | 'implemented' | 'dismissed';
}

export interface AIProjectAnalysis {
  projectId: string;
  overallHealth: number; // 0-100
  riskScore: number; // 0-100
  insights: AIInsight[];
  predictions: {
    completionDate: string;
    budgetOverrun: number;
    successProbability: number;
  };
  recommendations: {
    priority: 'high' | 'medium' | 'low';
    category: string;
    action: string;
    impact: string;
    effort: string;
  }[];
}

// AI Service Class
export class AIProjectService {
  private static instance: AIProjectService;
  private apiEndpoint: string;
  private apiKey: string;

  private constructor() {
    this.apiEndpoint = process.env.NEXT_PUBLIC_AI_API_ENDPOINT || 'http://localhost:8000/api/v1/ai';
    this.apiKey = process.env.NEXT_PUBLIC_AI_API_KEY || '';
  }

  public static getInstance(): AIProjectService {
    if (!AIProjectService.instance) {
      AIProjectService.instance = new AIProjectService();
    }
    return AIProjectService.instance;
  }

  // Main analysis function
  async analyzeProject(project: Project): Promise<AIProjectAnalysis> {
    try {
      const analysis = await this.performLocalAnalysis(project);
      
      // If AI service is available, enhance with cloud analysis
      if (this.apiKey) {
        try {
          const cloudAnalysis = await this.performCloudAnalysis(project);
          return this.mergeAnalyses(analysis, cloudAnalysis);
        } catch (error) {
          console.warn('Cloud AI analysis failed, using local analysis:', error);
        }
      }
      
      return analysis;
    } catch (error) {
      console.error('AI analysis failed:', error);
      return this.getFallbackAnalysis(project);
    }
  }

  // Local AI analysis using rule-based logic
  private async performLocalAnalysis(project: Project): Promise<AIProjectAnalysis> {
    const insights: AIInsight[] = [];
    
    // Health Score Calculation
    const healthFactors = {
      progress: this.calculateProgressHealth(project),
      timeline: this.calculateTimelineHealth(project),
      team: this.calculateTeamHealth(project),
      budget: this.calculateBudgetHealth(project),
      quality: this.calculateQualityHealth(project)
    };
    
    const overallHealth = Math.round(
      Object.values(healthFactors).reduce((sum, val) => sum + val, 0) / 
      Object.values(healthFactors).length
    );

    // Risk Score Calculation
    const riskScore = this.calculateRiskScore(project);

    // Generate insights based on analysis
    insights.push(...this.generateProgressInsights(project, healthFactors.progress));
    insights.push(...this.generateTimelineInsights(project, healthFactors.timeline));
    insights.push(...this.generateTeamInsights(project, healthFactors.team));
    insights.push(...this.generateBudgetInsights(project, healthFactors.budget));
    insights.push(...this.generateQualityInsights(project, healthFactors.quality));

    // Predictions
    const predictions = {
      completionDate: this.predictCompletionDate(project),
      budgetOverrun: this.predictBudgetOverrun(project),
      successProbability: Math.max(0, Math.min(100, overallHealth - riskScore))
    };

    // Recommendations
    const recommendations = this.generateRecommendations(project, insights);

    return {
      projectId: project.id,
      overallHealth,
      riskScore,
      insights,
      predictions,
      recommendations
    };
  }

  // Cloud AI analysis (would integrate with actual AI service)
  private async performCloudAnalysis(project: Project): Promise<Partial<AIProjectAnalysis>> {
    const response = await fetch(`${this.apiEndpoint}/analyze-project`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        project: {
          id: project.id,
          title: project.title,
          description: project.description,
          status: project.status,
          progress: project.progress,
          tasks: project.tasks.map(t => ({
            id: t.id,
            title: t.title,
            status: t.status,
            priority: t.priority,
            estimatedHours: t.estimatedHours,
            actualHours: t.actualHours
          })),
          teamMembers: project.teamMembers.length,
          budget: project.budget,
          spent: project.spent,
          dueDate: project.dueDate,
          createdAt: project.createdAt
        }
      })
    });

    if (!response.ok) {
      throw new Error(`AI API returned ${response.status}`);
    }

    return await response.json();
  }

  // Merge local and cloud analyses
  private mergeAnalyses(local: AIProjectAnalysis, cloud: Partial<AIProjectAnalysis>): AIProjectAnalysis {
    return {
      ...local,
      overallHealth: cloud.overallHealth || local.overallHealth,
      riskScore: cloud.riskScore || local.riskScore,
      insights: [...local.insights, ...(cloud.insights || [])],
      predictions: { ...local.predictions, ...cloud.predictions },
      recommendations: [...local.recommendations, ...(cloud.recommendations || [])]
    };
  }

  // Health calculation methods
  private calculateProgressHealth(project: Project): number {
    const expectedProgress = this.calculateExpectedProgress(project);
    const actualProgress = project.progress;
    
    if (actualProgress >= expectedProgress) {
      return Math.min(100, actualProgress + 20);
    } else {
      const deficit = expectedProgress - actualProgress;
      return Math.max(0, 100 - deficit * 2);
    }
  }

  private calculateTimelineHealth(project: Project): number {
    const daysRemaining = Math.ceil((new Date(project.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    const totalDays = Math.ceil((new Date(project.dueDate).getTime() - new Date(project.createdAt).getTime()) / (1000 * 60 * 60 * 24));
    const timeUsed = totalDays - daysRemaining;
    const timeUsedPercent = (timeUsed / totalDays) * 100;
    
    if (project.progress >= timeUsedPercent) {
      return 100;
    } else {
      const timelineRisk = timeUsedPercent - project.progress;
      return Math.max(0, 100 - timelineRisk);
    }
  }

  private calculateTeamHealth(project: Project): number {
    let score = 80; // Base score
    
    // Check for overloaded team members
    const overloadedMembers = project.teamMembers.filter(member => 
      (member.workload || 0) > 80
    ).length;
    
    if (overloadedMembers > 0) {
      score -= overloadedMembers * 10;
    }
    
    // Check for inactive members
    const inactiveMembers = project.teamMembers.filter(member => {
      const lastActivity = new Date(member.lastActivity);
      const daysSinceActivity = (new Date().getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24);
      return daysSinceActivity > 7;
    }).length;
    
    if (inactiveMembers > 0) {
      score -= inactiveMembers * 5;
    }
    
    return Math.max(0, score);
  }

  private calculateBudgetHealth(project: Project): number {
    if (!project.budget) return 100;
    
    const spentPercentage = ((project.spent || 0) / project.budget) * 100;
    const progressPercentage = project.progress;
    
    if (spentPercentage <= progressPercentage) {
      return 100;
    } else {
      const overSpend = spentPercentage - progressPercentage;
      return Math.max(0, 100 - overSpend);
    }
  }

  private calculateQualityHealth(project: Project): number {
    let score = 90; // Base score
    
    // Check for overdue tasks
    const overdueTasks = project.tasks.filter(task => 
      task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done'
    ).length;
    
    if (overdueTasks > 0) {
      score -= Math.min(30, overdueTasks * 5);
    }
    
    // Check for blocked tasks
    const blockedTasks = project.tasks.filter(task => task.status === 'blocked').length;
    if (blockedTasks > 0) {
      score -= Math.min(20, blockedTasks * 3);
    }
    
    return Math.max(0, score);
  }

  // Risk calculation
  private calculateRiskScore(project: Project): number {
    let risk = 0;
    
    // Timeline risk
    const daysRemaining = Math.ceil((new Date(project.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    if (daysRemaining < 0) risk += 40;
    else if (daysRemaining < 7) risk += 20;
    else if (daysRemaining < 14) risk += 10;
    
    // Progress risk
    const expectedProgress = this.calculateExpectedProgress(project);
    if (project.progress < expectedProgress - 20) risk += 30;
    else if (project.progress < expectedProgress - 10) risk += 15;
    
    // Budget risk
    if (project.budget && project.spent) {
      const budgetUsed = (project.spent / project.budget) * 100;
      if (budgetUsed > 90) risk += 25;
      else if (budgetUsed > 80) risk += 15;
    }
    
    // Team risk
    const criticalTasks = project.tasks.filter(task => 
      task.priority === 'Critical' && task.status !== 'done'
    ).length;
    if (criticalTasks > 3) risk += 20;
    else if (criticalTasks > 1) risk += 10;
    
    return Math.min(100, risk);
  }

  // Insight generation methods
  private generateProgressInsights(project: Project, healthScore: number): AIInsight[] {
    const insights: AIInsight[] = [];
    const expectedProgress = this.calculateExpectedProgress(project);
    
    if (project.progress < expectedProgress - 15) {
      insights.push({
        id: `progress-${project.id}-${Date.now()}`,
        type: 'warning',
        title: 'Project Behind Schedule',
        description: `Project is ${Math.round(expectedProgress - project.progress)}% behind expected progress. Consider resource reallocation or scope adjustment.`,
        confidence: 85,
        impact: 'high',
        category: 'performance',
        actionItems: [
          'Review task assignments and redistribute workload',
          'Consider adding team members to critical path tasks',
          'Evaluate scope reduction opportunities'
        ],
        data: { expectedProgress, actualProgress: project.progress },
        generatedAt: new Date().toISOString(),
        status: 'active'
      });
    } else if (project.progress > expectedProgress + 10) {
      insights.push({
        id: `progress-ahead-${project.id}-${Date.now()}`,
        type: 'opportunity',
        title: 'Project Ahead of Schedule',
        description: `Project is ${Math.round(project.progress - expectedProgress)}% ahead of schedule. Consider advancing timeline or adding features.`,
        confidence: 90,
        impact: 'medium',
        category: 'performance',
        actionItems: [
          'Consider moving up the delivery date',
          'Evaluate additional features to include',
          'Allocate resources to other projects'
        ],
        data: { expectedProgress, actualProgress: project.progress },
        generatedAt: new Date().toISOString(),
        status: 'active'
      });
    }
    
    return insights;
  }

  private generateTimelineInsights(project: Project, healthScore: number): AIInsight[] {
    const insights: AIInsight[] = [];
    const daysRemaining = Math.ceil((new Date(project.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysRemaining < 0) {
      insights.push({
        id: `timeline-overdue-${project.id}-${Date.now()}`,
        type: 'warning',
        title: 'Project Overdue',
        description: `Project is ${Math.abs(daysRemaining)} days overdue. Immediate action required.`,
        confidence: 100,
        impact: 'high',
        category: 'timeline',
        actionItems: [
          'Conduct emergency project review',
          'Reassess scope and priorities',
          'Communicate with stakeholders about delays'
        ],
        data: { daysOverdue: Math.abs(daysRemaining) },
        generatedAt: new Date().toISOString(),
        status: 'active'
      });
    } else if (daysRemaining < 7 && project.progress < 90) {
      insights.push({
        id: `timeline-risk-${project.id}-${Date.now()}`,
        type: 'warning',
        title: 'Timeline Risk Detected',
        description: `Only ${daysRemaining} days remaining with ${100 - project.progress}% work incomplete.`,
        confidence: 90,
        impact: 'high',
        category: 'timeline',
        actionItems: [
          'Focus on critical path tasks only',
          'Consider working overtime or adding resources',
          'Prepare contingency plan'
        ],
        data: { daysRemaining, remainingWork: 100 - project.progress },
        generatedAt: new Date().toISOString(),
        status: 'active'
      });
    }
    
    return insights;
  }

  private generateTeamInsights(project: Project, healthScore: number): AIInsight[] {
    const insights: AIInsight[] = [];
    
    // Check for workload imbalances
    const workloads = project.teamMembers.map(m => m.workload || 0);
    const avgWorkload = workloads.reduce((sum, w) => sum + w, 0) / workloads.length;
    const maxWorkload = Math.max(...workloads);
    const minWorkload = Math.min(...workloads);
    
    if (maxWorkload - minWorkload > 40) {
      insights.push({
        id: `team-imbalance-${project.id}-${Date.now()}`,
        type: 'optimization',
        title: 'Team Workload Imbalance',
        description: `Significant workload variance detected (${minWorkload}% to ${maxWorkload}%). Rebalancing could improve efficiency.`,
        confidence: 80,
        impact: 'medium',
        category: 'team',
        actionItems: [
          'Redistribute tasks from overloaded to underutilized team members',
          'Review task assignments and skill matching',
          'Consider cross-training opportunities'
        ],
        data: { maxWorkload, minWorkload, avgWorkload },
        generatedAt: new Date().toISOString(),
        status: 'active'
      });
    }
    
    return insights;
  }

  private generateBudgetInsights(project: Project, healthScore: number): AIInsight[] {
    const insights: AIInsight[] = [];
    
    if (project.budget && project.spent) {
      const budgetUsed = (project.spent / project.budget) * 100;
      
      if (budgetUsed > project.progress + 15) {
        insights.push({
          id: `budget-overrun-${project.id}-${Date.now()}`,
          type: 'warning',
          title: 'Budget Overrun Risk',
          description: `${Math.round(budgetUsed)}% of budget used but only ${project.progress}% complete. Risk of ${Math.round(budgetUsed - project.progress)}% overrun.`,
          confidence: 85,
          impact: 'high',
          category: 'resources',
          actionItems: [
            'Review and optimize resource allocation',
            'Identify cost-saving opportunities',
            'Consider scope reduction to stay within budget'
          ],
          data: { budgetUsed, progress: project.progress, overrunRisk: budgetUsed - project.progress },
          generatedAt: new Date().toISOString(),
          status: 'active'
        });
      }
    }
    
    return insights;
  }

  private generateQualityInsights(project: Project, healthScore: number): AIInsight[] {
    const insights: AIInsight[] = [];
    
    const blockedTasks = project.tasks.filter(task => task.status === 'blocked');
    if (blockedTasks.length > 2) {
      insights.push({
        id: `quality-blocked-${project.id}-${Date.now()}`,
        type: 'warning',
        title: 'Multiple Blocked Tasks',
        description: `${blockedTasks.length} tasks are currently blocked, potentially impacting delivery quality and timeline.`,
        confidence: 95,
        impact: 'medium',
        category: 'quality',
        actionItems: [
          'Review and resolve blockers immediately',
          'Implement process improvements to prevent future blocks',
          'Assign dedicated resources to unblock tasks'
        ],
        data: { blockedTasksCount: blockedTasks.length, blockedTasks: blockedTasks.map(t => t.title) },
        generatedAt: new Date().toISOString(),
        status: 'active'
      });
    }
    
    return insights;
  }

  // Utility methods
  private calculateExpectedProgress(project: Project): number {
    const totalDays = Math.ceil((new Date(project.dueDate).getTime() - new Date(project.createdAt).getTime()) / (1000 * 60 * 60 * 24));
    const daysElapsed = Math.ceil((new Date().getTime() - new Date(project.createdAt).getTime()) / (1000 * 60 * 60 * 24));
    
    return Math.min(100, Math.max(0, (daysElapsed / totalDays) * 100));
  }

  private predictCompletionDate(project: Project): string {
    const remainingTasks = project.tasks.filter(task => task.status !== 'done').length;
    const completedTasks = project.tasks.filter(task => task.status === 'done').length;
    
    if (completedTasks === 0) return project.dueDate;
    
    // Calculate velocity (tasks per day)
    const projectDays = Math.ceil((new Date().getTime() - new Date(project.createdAt).getTime()) / (1000 * 60 * 60 * 24));
    const velocity = completedTasks / Math.max(projectDays, 1);
    
    if (velocity === 0) return project.dueDate;
    
    const daysToComplete = Math.ceil(remainingTasks / velocity);
    const completionDate = new Date();
    completionDate.setDate(completionDate.getDate() + daysToComplete);
    
    return completionDate.toISOString().split('T')[0];
  }

  private predictBudgetOverrun(project: Project): number {
    if (!project.budget || !project.spent) return 0;
    
    const spentPercentage = (project.spent / project.budget) * 100;
    const progressPercentage = project.progress;
    
    if (progressPercentage === 0) return 0;
    
    const projectedSpent = (spentPercentage / progressPercentage) * 100;
    return Math.max(0, projectedSpent - 100);
  }

  private generateRecommendations(project: Project, insights: AIInsight[]): AIProjectAnalysis['recommendations'] {
    const recommendations: AIProjectAnalysis['recommendations'] = [];
    
    // High-priority recommendations based on critical insights
    const criticalInsights = insights.filter(i => i.impact === 'high');
    
    criticalInsights.forEach(insight => {
      if (insight.category === 'timeline') {
        recommendations.push({
          priority: 'high',
          category: 'Timeline Management',
          action: 'Focus on critical path optimization and resource reallocation',
          impact: 'Prevent project delays and maintain delivery commitments',
          effort: 'Medium'
        });
      }
      
      if (insight.category === 'resources') {
        recommendations.push({
          priority: 'high',
          category: 'Budget Control',
          action: 'Implement stricter cost controls and regular budget reviews',
          impact: 'Prevent budget overruns and maintain project viability',
          effort: 'Low'
        });
      }
    });
    
    // Medium priority recommendations
    const mediumInsights = insights.filter(i => i.impact === 'medium');
    
    if (mediumInsights.some(i => i.category === 'team')) {
      recommendations.push({
        priority: 'medium',
        category: 'Team Optimization',
        action: 'Rebalance workload and improve task distribution',
        impact: 'Increase team efficiency and reduce burnout risk',
        effort: 'Medium'
      });
    }
    
    return recommendations;
  }

  private getFallbackAnalysis(project: Project): AIProjectAnalysis {
    return {
      projectId: project.id,
      overallHealth: 70,
      riskScore: 30,
      insights: [],
      predictions: {
        completionDate: project.dueDate,
        budgetOverrun: 0,
        successProbability: 70
      },
      recommendations: [
        {
          priority: 'medium',
          category: 'General',
          action: 'Regular project health monitoring recommended',
          impact: 'Maintain project visibility and control',
          effort: 'Low'
        }
      ]
    };
  }
}

// Auto-suggest task assignments based on team member skills and workload
export const suggestTaskAssignment = (task: Task, teamMembers: ProjectMember[]): ProjectMember[] => {
  const availableMembers = teamMembers.filter(member => (member.workload || 0) < 80);
  
  // Simple skill matching based on task tags and member expertise
  const scoredMembers = availableMembers.map(member => {
    let score = 100 - (member.workload || 0); // Base score from availability
    
    // Add skill matching score
    const skillMatches = task.tags.filter(tag => 
      member.expertise.some(skill => 
        skill.toLowerCase().includes(tag.toLowerCase()) ||
        tag.toLowerCase().includes(skill.toLowerCase())
      )
    ).length;
    
    score += skillMatches * 20;
    
    return { member, score };
  });
  
  return scoredMembers
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(item => item.member);
};

// Generate automated progress reports
export const generateProgressReport = (project: Project): string => {
  const completedTasks = project.tasks.filter(task => task.status === 'done').length;
  const totalTasks = project.tasks.length;
  const progressPercent = Math.round((completedTasks / totalTasks) * 100);
  
  const daysRemaining = Math.ceil((new Date(project.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
  const overdueTasks = project.tasks.filter(task => 
    task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done'
  ).length;
  
  return `
# Project Progress Report: ${project.title}

## Summary
- **Overall Progress**: ${progressPercent}% (${completedTasks}/${totalTasks} tasks completed)
- **Status**: ${project.status}
- **Days Remaining**: ${daysRemaining < 0 ? `${Math.abs(daysRemaining)} days overdue` : `${daysRemaining} days left`}
- **Team Size**: ${project.teamMembers.length} members

## Key Metrics
- **Overdue Tasks**: ${overdueTasks}
- **Budget Used**: ${project.budget && project.spent ? Math.round((project.spent / project.budget) * 100) : 'N/A'}%
- **Active Milestones**: ${project.milestones.filter(m => m.status === 'in-progress').length}

## Recent Activity
${project.activityLog.slice(0, 5).map(activity => 
  `- ${activity.user.name} ${activity.action} ${activity.target || activity.description}`
).join('\n')}

## Next Steps
${project.tasks
  .filter(task => task.status === 'todo' || task.status === 'in-progress')
  .slice(0, 5)
  .map(task => `- ${task.title} (${task.priority} priority)`)
  .join('\n')}

---
*Generated on ${new Date().toLocaleString()} by Engunity AI*
  `.trim();
};

// Export the AI service instance
export const aiService = AIProjectService.getInstance();