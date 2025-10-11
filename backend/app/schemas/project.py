"""
Project Schemas for Engunity AI
================================

Pydantic models for API request/response validation.

Author: Engunity AI Team
"""

from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from enum import Enum


class ProjectStatus(str, Enum):
    """Project status types"""
    PLANNING = "Planning"
    ON_TRACK = "On Track"
    AT_RISK = "At Risk"
    OVERDUE = "Overdue"
    COMPLETED = "Completed"
    PAUSED = "Paused"
    CANCELLED = "Cancelled"


class ProjectPriority(str, Enum):
    """Project priority levels"""
    LOW = "Low"
    MEDIUM = "Medium"
    HIGH = "High"
    CRITICAL = "Critical"


class ProjectVisibility(str, Enum):
    """Project visibility settings"""
    PRIVATE = "Private"
    TEAM = "Team"
    PUBLIC = "Public"


class TaskStatus(str, Enum):
    """Task status types"""
    TODO = "todo"
    IN_PROGRESS = "in-progress"
    REVIEW = "review"
    DONE = "done"
    BLOCKED = "blocked"


class TaskBase(BaseModel):
    """Base task schema"""
    title: str = Field(..., min_length=1, max_length=200)
    description: str = ""
    status: TaskStatus = TaskStatus.TODO
    priority: ProjectPriority = ProjectPriority.MEDIUM
    assignee_id: Optional[str] = None
    due_date: Optional[datetime] = None
    estimated_hours: Optional[float] = None
    tags: List[str] = Field(default_factory=list)


class TaskCreate(TaskBase):
    """Schema for creating a task"""
    pass


class TaskResponse(TaskBase):
    """Schema for task response"""
    id: str
    project_id: str
    reporter_id: str
    created_at: datetime
    updated_at: datetime
    actual_hours: Optional[float] = None
    progress: float = 0.0

    class Config:
        from_attributes = True


class MilestoneBase(BaseModel):
    """Base milestone schema"""
    title: str = Field(..., min_length=1, max_length=200)
    description: str = ""
    start_date: datetime
    due_date: datetime
    deliverables: List[str] = Field(default_factory=list)
    budget: Optional[float] = None


class MilestoneCreate(MilestoneBase):
    """Schema for creating a milestone"""
    pass


class MilestoneResponse(MilestoneBase):
    """Schema for milestone response"""
    id: str
    project_id: str
    status: str
    progress: float = 0.0
    spent: Optional[float] = None
    task_count: int = 0

    class Config:
        from_attributes = True


class ProjectBase(BaseModel):
    """Base project schema"""
    title: str = Field(..., min_length=1, max_length=200)
    description: str = ""
    status: ProjectStatus = ProjectStatus.PLANNING
    priority: ProjectPriority = ProjectPriority.MEDIUM
    visibility: ProjectVisibility = ProjectVisibility.PRIVATE
    start_date: datetime = Field(default_factory=datetime.now)
    due_date: datetime
    budget: Optional[float] = None
    tags: List[str] = Field(default_factory=list)


class ProjectCreate(ProjectBase):
    """Schema for creating a project"""
    pass


class ProjectUpdate(BaseModel):
    """Schema for updating a project"""
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[ProjectStatus] = None
    priority: Optional[ProjectPriority] = None
    visibility: Optional[ProjectVisibility] = None
    due_date: Optional[datetime] = None
    budget: Optional[float] = None
    tags: Optional[List[str]] = None


class ProjectResponse(ProjectBase):
    """Schema for project response"""
    id: str
    owner_id: str
    organization_id: str
    progress: float = 0.0
    spent: Optional[float] = 0.0
    created_at: datetime
    updated_at: datetime
    team_member_count: int = 0
    task_count: int = 0
    milestone_count: int = 0

    class Config:
        from_attributes = True


class ProjectWithDetails(ProjectResponse):
    """Extended project schema with full details"""
    tasks: List[TaskResponse] = Field(default_factory=list)
    milestones: List[MilestoneResponse] = Field(default_factory=list)
    health_score: Optional[float] = None
    risk_score: Optional[float] = None


class ProjectListResponse(BaseModel):
    """Schema for project list response"""
    projects: List[ProjectResponse]
    total: int
    page: int = 1
    page_size: int = 50


class AIInsightSchema(BaseModel):
    """Schema for AI-generated insights"""
    id: str
    type: str  # optimization, warning, opportunity, prediction, recommendation
    title: str
    description: str
    confidence: float = Field(ge=0, le=100)
    impact: str  # low, medium, high
    category: str
    action_items: List[str] = Field(default_factory=list)
    status: str = "active"
    generated_at: datetime


class AIAnalysisResponse(BaseModel):
    """Schema for AI project analysis response"""
    project_id: str
    overall_health: float = Field(ge=0, le=100)
    risk_score: float = Field(ge=0, le=100)
    insights: List[AIInsightSchema]
    predictions: Dict[str, Any]
    recommendations: List[Dict[str, Any]]
    analyzed_at: datetime = Field(default_factory=datetime.now)


class PersonalizedDashboardRequest(BaseModel):
    """Schema for personalized dashboard request"""
    user_id: str
    role: str
    organization_id: str
    include_health: bool = True
    include_tasks: bool = True
    include_insights: bool = True


class PersonalizedDashboardResponse(BaseModel):
    """Schema for personalized dashboard response"""
    user: Dict[str, Any]
    visible_projects: List[ProjectResponse]
    personal_insights: List[AIInsightSchema]
    recommendations: List[Dict[str, Any]]
    stats: Dict[str, Any]
    upcoming_deadlines: List[Dict[str, Any]] = Field(default_factory=list)
