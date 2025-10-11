"""
AI Project Analyst Service
===========================

Personalized AI-powered project analysis and recommendations.

Author: Engunity AI Team
"""

import os
from datetime import datetime
from typing import List, Dict, Any, Optional
from groq import Groq


# AI System Prompt for Personalized Project Analysis
SYSTEM_PROMPT = """You are Engunity AI's intelligent project assistant. Personalize all project insights and dashboards for the currently logged-in user. Follow these rules strictly:

1. Identify the user using their JWT or session token.
   - Retrieve user_id, name, role, and organization_id from the backend.

2. Filter projects based on permissions:
   - If user.role == 'Owner' or 'Admin': show all projects they own or manage.
   - If user.role == 'Contributor': show only assigned projects.
   - If user.role == 'Viewer': show only public or team-visible projects.

3. Generate a personalized project overview containing:
   - User's active projects with progress (0–100%).
   - AI project health score (calculated from progress, budget, timeline, and quality).
   - Recommendations specific to the user's role and current workload.
   - Upcoming deadlines or overdue tasks assigned to this user.
   - Team collaboration metrics (active members, tasks assigned to the user).

4. Include contextual summaries:
   - If the user is an Owner/Admin → focus on project risks, resource allocation, and overall performance.
   - If the user is a Contributor → focus on their tasks, blockers, and AI-suggested optimizations.
   - If the user is a Viewer → focus on summary insights and high-level analytics.

5. Respect all visibility and access controls:
   - Exclude private projects unless the user has explicit access.
   - Mask sensitive analytics fields for non-privileged roles.

6. Present the final output as structured JSON containing:
   {
     "user": {...},
     "visibleProjects": [...],
     "personalInsights": [...],
     "recommendations": [...],
     "stats": {...}
   }

7. When generating recommendations, analyze:
   - Project health score < 70 → mark as 'At Risk'
   - Overdue tasks or dependencies → trigger 'Warning'
   - Low team activity → suggest 'Engagement'
   - Data imbalance or code issues → suggest 'Optimization'

Always ensure your responses are concise, role-aware, and actionable."""


class AIProjectAnalyst:
    """AI-powered project analyst service"""
    
    def __init__(self):
        self.groq_api_key = os.getenv("GROQ_API_KEY")
        if self.groq_api_key:
            self.client = Groq(api_key=self.groq_api_key)
            self.model = "llama-3.1-70b-versatile"
        else:
            self.client = None
            self.model = None
    
    def analyze_project_health(self, project: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate project health score"""
        
        # Progress health (0-100)
        progress = project.get("progress", 0)
        expected_progress = self._calculate_expected_progress(project)
        progress_health = min(100, max(0, 100 - abs(progress - expected_progress) * 2))
        
        # Timeline health (0-100)
        timeline_health = self._calculate_timeline_health(project)
        
        # Budget health (0-100)
        budget_health = self._calculate_budget_health(project)
        
        # Quality health (based on overdue tasks)
        quality_health = self._calculate_quality_health(project)
        
        # Overall health
        overall_health = (progress_health + timeline_health + budget_health + quality_health) / 4
        
        # Risk score (inverse of health)
        risk_score = 100 - overall_health
        
        return {
            "overall_health": round(overall_health, 2),
            "risk_score": round(risk_score, 2),
            "factors": {
                "progress_health": round(progress_health, 2),
                "timeline_health": round(timeline_health, 2),
                "budget_health": round(budget_health, 2),
                "quality_health": round(quality_health, 2)
            }
        }
    
    def generate_personalized_insights(
        self,
        user: Dict[str, Any],
        projects: List[Dict[str, Any]],
        tasks: List[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Generate personalized insights for user"""
        
        role = user.get("role", "Viewer")
        insights = []
        recommendations = []
        
        # Calculate stats
        stats = {
            "total_projects": len(projects),
            "active_projects": len([p for p in projects if p.get("status") == "On Track"]),
            "at_risk_projects": len([p for p in projects if p.get("status") == "At Risk"]),
            "assigned_tasks": len(tasks) if tasks else 0,
            "overdue_tasks": len([t for t in (tasks or []) if self._is_overdue(t)]),
            "completed_this_week": self._count_completed_this_week(tasks or [])
        }
        
        # Generate insights based on role
        if role in ["Owner", "Admin"]:
            insights.extend(self._generate_owner_insights(projects, stats))
            recommendations.extend(self._generate_owner_recommendations(projects))
        elif role == "Contributor":
            insights.extend(self._generate_contributor_insights(tasks or [], stats))
            recommendations.extend(self._generate_contributor_recommendations(tasks or []))
        else:  # Viewer
            insights.extend(self._generate_viewer_insights(projects, stats))
        
        # AI-enhanced analysis if available
        if self.client:
            ai_insights = self._get_ai_insights(user, projects, tasks)
            if ai_insights:
                insights.extend(ai_insights.get("insights", []))
                recommendations.extend(ai_insights.get("recommendations", []))
        
        return {
            "user": user,
            "visible_projects": projects,
            "personal_insights": insights,
            "recommendations": recommendations,
            "stats": stats,
            "upcoming_deadlines": self._get_upcoming_deadlines(tasks or [])
        }
    
    def _get_ai_insights(
        self,
        user: Dict[str, Any],
        projects: List[Dict[str, Any]],
        tasks: List[Dict[str, Any]] = None
    ) -> Optional[Dict[str, Any]]:
        """Get AI-generated insights using Groq"""
        
        if not self.client:
            return None
        
        # Build context for AI
        context = f"""
User: {user.get('name')} ({user.get('role')})
Projects: {len(projects)} active
Tasks assigned: {len(tasks or [])}

Project summaries:
"""
        for p in projects[:5]:  # Limit to 5 projects
            health = self.analyze_project_health(p)
            context += f"- {p.get('title')}: {p.get('progress')}% complete, Health: {health['overall_health']}\n"
        
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": f"Analyze this user's projects and provide personalized insights:\n\n{context}"}
                ],
                temperature=0.7,
                max_tokens=1000
            )
            
            # Parse AI response (simplified)
            ai_response = response.choices[0].message.content
            
            return {
                "insights": [{
                    "id": f"ai_{datetime.now().timestamp()}",
                    "type": "ai_recommendation",
                    "title": "AI Analysis",
                    "description": ai_response,
                    "confidence": 85,
                    "impact": "high",
                    "category": "ai",
                    "status": "active",
                    "generated_at": datetime.now()
                }],
                "recommendations": []
            }
        except Exception as e:
            print(f"AI analysis error: {e}")
            return None
    
    def _calculate_expected_progress(self, project: Dict[str, Any]) -> float:
        """Calculate expected progress based on timeline"""
        start_date = project.get("start_date")
        due_date = project.get("due_date")
        
        if not start_date or not due_date:
            return 50
        
        if isinstance(start_date, str):
            start_date = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
        if isinstance(due_date, str):
            due_date = datetime.fromisoformat(due_date.replace('Z', '+00:00'))
        
        total_days = (due_date - start_date).days
        elapsed_days = (datetime.now() - start_date).days
        
        if total_days <= 0:
            return 100
        
        return min(100, (elapsed_days / total_days) * 100)
    
    def _calculate_timeline_health(self, project: Dict[str, Any]) -> float:
        """Calculate timeline health"""
        progress = project.get("progress", 0)
        expected = self._calculate_expected_progress(project)
        
        if progress >= expected:
            return 100
        else:
            deficit = expected - progress
            return max(0, 100 - deficit * 2)
    
    def _calculate_budget_health(self, project: Dict[str, Any]) -> float:
        """Calculate budget health"""
        budget = project.get("budget")
        spent = project.get("spent", 0)
        progress = project.get("progress", 0)
        
        if not budget or budget == 0:
            return 100
        
        spent_percentage = (spent / budget) * 100
        
        if spent_percentage <= progress:
            return 100
        else:
            overspend = spent_percentage - progress
            return max(0, 100 - overspend)
    
    def _calculate_quality_health(self, project: Dict[str, Any]) -> float:
        """Calculate quality health based on issues"""
        # Simplified: would check overdue tasks, blockers, etc.
        return 85  # Default
    
    def _is_overdue(self, task: Dict[str, Any]) -> bool:
        """Check if task is overdue"""
        due_date = task.get("due_date")
        if not due_date or task.get("status") == "done":
            return False
        
        if isinstance(due_date, str):
            due_date = datetime.fromisoformat(due_date.replace('Z', '+00:00'))
        
        return datetime.now() > due_date
    
    def _count_completed_this_week(self, tasks: List[Dict[str, Any]]) -> int:
        """Count tasks completed this week"""
        week_ago = datetime.now().timestamp() - (7 * 24 * 60 * 60)
        return len([
            t for t in tasks
            if t.get("status") == "done" and 
            datetime.fromisoformat(str(t.get("updated_at", "")).replace('Z', '+00:00')).timestamp() > week_ago
        ])
    
    def _get_upcoming_deadlines(self, tasks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Get upcoming task deadlines"""
        upcoming = []
        for task in tasks:
            if task.get("status") != "done" and task.get("due_date"):
                due_date = task.get("due_date")
                if isinstance(due_date, str):
                    due_date = datetime.fromisoformat(due_date.replace('Z', '+00:00'))
                
                days_until = (due_date - datetime.now()).days
                if 0 <= days_until <= 7:
                    upcoming.append({
                        "task_id": task.get("id"),
                        "title": task.get("title"),
                        "due_date": due_date.isoformat(),
                        "days_until": days_until,
                        "priority": task.get("priority")
                    })
        
        return sorted(upcoming, key=lambda x: x["days_until"])[:5]
    
    def _generate_owner_insights(self, projects: List[Dict[str, Any]], stats: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Generate insights for owners"""
        insights = []
        
        if stats["at_risk_projects"] > 0:
            insights.append({
                "id": f"insight_risk_{datetime.now().timestamp()}",
                "type": "warning",
                "title": "At-Risk Projects Detected",
                "description": f"{stats['at_risk_projects']} project(s) are at risk and need attention",
                "confidence": 95,
                "impact": "high",
                "category": "risk",
                "action_items": ["Review project timelines", "Allocate additional resources"],
                "status": "active",
                "generated_at": datetime.now()
            })
        
        return insights
    
    def _generate_owner_recommendations(self, projects: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Generate recommendations for owners"""
        recommendations = []
        
        for project in projects:
            health = self.analyze_project_health(project)
            if health["overall_health"] < 70:
                recommendations.append({
                    "priority": "high",
                    "category": "project_health",
                    "action": f"Review and address issues in '{project.get('title')}'",
                    "impact": "Project may miss deadline",
                    "effort": "Medium"
                })
        
        return recommendations
    
    def _generate_contributor_insights(self, tasks: List[Dict[str, Any]], stats: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Generate insights for contributors"""
        insights = []
        
        if stats["overdue_tasks"] > 0:
            insights.append({
                "id": f"insight_overdue_{datetime.now().timestamp()}",
                "type": "warning",
                "title": "Overdue Tasks",
                "description": f"You have {stats['overdue_tasks']} overdue task(s)",
                "confidence": 100,
                "impact": "high",
                "category": "tasks",
                "action_items": ["Complete overdue tasks", "Update task status"],
                "status": "active",
                "generated_at": datetime.now()
            })
        
        return insights
    
    def _generate_contributor_recommendations(self, tasks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Generate recommendations for contributors"""
        recommendations = []
        
        blocked_tasks = [t for t in tasks if t.get("status") == "blocked"]
        if blocked_tasks:
            recommendations.append({
                "priority": "high",
                "category": "blockers",
                "action": f"Resolve {len(blocked_tasks)} blocked task(s)",
                "impact": "Unblock workflow and increase productivity",
                "effort": "Varies"
            })
        
        return recommendations
    
    def _generate_viewer_insights(self, projects: List[Dict[str, Any]], stats: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Generate insights for viewers"""
        insights = []
        
        insights.append({
            "id": f"insight_summary_{datetime.now().timestamp()}",
            "type": "recommendation",
            "title": "Project Portfolio Summary",
            "description": f"{stats['total_projects']} total projects, {stats['active_projects']} on track",
            "confidence": 100,
            "impact": "low",
            "category": "summary",
            "action_items": [],
            "status": "active",
            "generated_at": datetime.now()
        })
        
        return insights


# Singleton instance
_analyst_instance = None

def get_project_analyst() -> AIProjectAnalyst:
    """Get AI project analyst singleton"""
    global _analyst_instance
    if _analyst_instance is None:
        _analyst_instance = AIProjectAnalyst()
    return _analyst_instance
