"""
Permission Filtering Service
=============================

Filter and validate user permissions for resources.

Author: Engunity AI Team
"""

from typing import List, Dict, Any, Optional
from app.models.user import UserRole, has_permission, PermissionAction


class PermissionService:
    """Service for filtering resources based on user permissions"""
    
    @staticmethod
    def filter_projects_for_user(
        projects: List[Dict[str, Any]],
        user: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Filter projects based on user role and permissions"""
        
        user_id = user.get("user_id") or user.get("id")
        role = UserRole(user.get("role", "Viewer"))
        org_id = user.get("organization_id")
        
        filtered_projects = []
        
        for project in projects:
            # Check if user has access
            if PermissionService.can_access_project(project, user_id, role, org_id):
                # Mask sensitive data based on role
                filtered_project = PermissionService.mask_project_data(project, role)
                filtered_projects.append(filtered_project)
        
        return filtered_projects
    
    @staticmethod
    def can_access_project(
        project: Dict[str, Any],
        user_id: str,
        role: UserRole,
        org_id: str
    ) -> bool:
        """Check if user can access a project"""
        
        # Owner/Admin can see all organization projects
        if role in [UserRole.OWNER, UserRole.ADMIN]:
            return project.get("organization_id") == org_id
        
        # Check project visibility
        visibility = project.get("visibility", "Private")
        
        if visibility == "Public":
            return True
        
        if visibility == "Team":
            return project.get("organization_id") == org_id
        
        # Private: only if user is owner or team member
        if project.get("owner_id") == user_id:
            return True
        
        # Check if user is team member
        team_members = project.get("team_members", [])
        for member in team_members:
            if member.get("user_id") == user_id:
                return True
        
        return False
    
    @staticmethod
    def mask_project_data(
        project: Dict[str, Any],
        role: UserRole
    ) -> Dict[str, Any]:
        """Mask sensitive project data based on user role"""
        
        masked_project = project.copy()
        
        # Viewers can't see budget information
        if role == UserRole.VIEWER:
            if "budget" in masked_project:
                del masked_project["budget"]
            if "spent" in masked_project:
                del masked_project["spent"]
            # Hide detailed analytics
            if "health_score" in masked_project:
                masked_project["health_score"] = round(masked_project["health_score"] / 10) * 10  # Round to 10s
            if "risk_score" in masked_project:
                del masked_project["risk_score"]
        
        return masked_project
    
    @staticmethod
    def get_user_tasks(
        tasks: List[Dict[str, Any]],
        user_id: str,
        role: UserRole
    ) -> List[Dict[str, Any]]:
        """Get tasks relevant to user"""
        
        # Owners/Admins see all tasks
        if role in [UserRole.OWNER, UserRole.ADMIN]:
            return tasks
        
        # Contributors see assigned tasks
        if role == UserRole.CONTRIBUTOR:
            return [t for t in tasks if t.get("assignee_id") == user_id]
        
        # Viewers see all tasks (read-only)
        return tasks
    
    @staticmethod
    def can_modify_resource(
        resource_type: str,
        user_role: UserRole
    ) -> bool:
        """Check if user can modify a resource type"""
        return has_permission(user_role, resource_type, PermissionAction.WRITE)
    
    @staticmethod
    def can_delete_resource(
        resource_type: str,
        user_role: UserRole
    ) -> bool:
        """Check if user can delete a resource type"""
        return has_permission(user_role, resource_type, PermissionAction.DELETE)
