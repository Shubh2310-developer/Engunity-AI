'use client';

import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Crown, 
  Edit3, 
  Eye, 
  Check, 
  X, 
  Save, 
  RotateCcw, 
  Settings,
  Users,
  FileText,
  Folder,
  MessageCircle,
  Calendar,
  BarChart3,
  Code,
  Database,
  Lock,
  Unlock,
  Info,
  AlertTriangle,
  ChevronRight,
  ChevronDown
} from 'lucide-react';

interface Permission {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: React.ElementType;
  critical?: boolean;
}

interface RolePermissions {
  [roleId: string]: {
    name: string;
    description: string;
    permissions: string[];
    color: string;
    icon: React.ElementType;
    isSystem?: boolean;
  };
}

interface PermissionsEditorProps {
  projectId: string;
  onPermissionsChange?: (rolePermissions: RolePermissions) => void;
  currentUserRole?: string;
}

const PERMISSIONS: Permission[] = [
  // Project Management
  { id: 'project.view', name: 'View Project', description: 'View project details, tasks, and progress', category: 'project', icon: Eye },
  { id: 'project.edit', name: 'Edit Project', description: 'Modify project settings, name, and description', category: 'project', icon: Edit3, critical: true },
  { id: 'project.delete', name: 'Delete Project', description: 'Permanently delete the entire project', category: 'project', icon: X, critical: true },
  { id: 'project.archive', name: 'Archive Project', description: 'Archive or restore project', category: 'project', icon: Folder },

  // Task Management
  { id: 'tasks.view', name: 'View Tasks', description: 'View all tasks and their details', category: 'tasks', icon: FileText },
  { id: 'tasks.create', name: 'Create Tasks', description: 'Create new tasks and subtasks', category: 'tasks', icon: Edit3 },
  { id: 'tasks.edit', name: 'Edit Tasks', description: 'Modify task details, assignees, and status', category: 'tasks', icon: Edit3 },
  { id: 'tasks.delete', name: 'Delete Tasks', description: 'Remove tasks permanently', category: 'tasks', icon: X, critical: true },
  { id: 'tasks.assign', name: 'Assign Tasks', description: 'Assign tasks to team members', category: 'tasks', icon: Users },

  // Team Management
  { id: 'team.view', name: 'View Members', description: 'View team members and their roles', category: 'team', icon: Users },
  { id: 'team.invite', name: 'Invite Members', description: 'Send invitations to new team members', category: 'team', icon: Users },
  { id: 'team.edit_roles', name: 'Edit Roles', description: 'Change member roles and permissions', category: 'team', icon: Crown, critical: true },
  { id: 'team.remove', name: 'Remove Members', description: 'Remove team members from the project', category: 'team', icon: X, critical: true },

  // Files & Documents
  { id: 'files.view', name: 'View Files', description: 'View uploaded files and documents', category: 'files', icon: FileText },
  { id: 'files.upload', name: 'Upload Files', description: 'Upload new files and documents', category: 'files', icon: FileText },
  { id: 'files.edit', name: 'Edit Files', description: 'Modify file details and metadata', category: 'files', icon: Edit3 },
  { id: 'files.delete', name: 'Delete Files', description: 'Remove files permanently', category: 'files', icon: X },

  // Communication
  { id: 'comments.view', name: 'View Comments', description: 'View comments on tasks and projects', category: 'communication', icon: MessageCircle },
  { id: 'comments.create', name: 'Add Comments', description: 'Add comments and participate in discussions', category: 'communication', icon: MessageCircle },
  { id: 'comments.edit', name: 'Edit Comments', description: 'Edit own comments', category: 'communication', icon: Edit3 },
  { id: 'comments.moderate', name: 'Moderate Comments', description: 'Edit or delete any comments', category: 'communication', icon: Shield, critical: true },

  // Reports & Analytics
  { id: 'reports.view', name: 'View Reports', description: 'Access project reports and analytics', category: 'reports', icon: BarChart3 },
  { id: 'reports.create', name: 'Create Reports', description: 'Generate custom reports and exports', category: 'reports', icon: BarChart3 },
  { id: 'reports.export', name: 'Export Data', description: 'Export project data and reports', category: 'reports', icon: Database },

  // Integrations
  { id: 'integrations.view', name: 'View Integrations', description: 'View connected services and integrations', category: 'integrations', icon: Code },
  { id: 'integrations.manage', name: 'Manage Integrations', description: 'Add, configure, and remove integrations', category: 'integrations', icon: Settings, critical: true }
];

const DEFAULT_ROLE_PERMISSIONS: RolePermissions = {
  owner: {
    name: 'Owner',
    description: 'Full access to all project features and settings',
    permissions: PERMISSIONS.map(p => p.id),
    color: 'text-yellow-800 bg-yellow-100 border-yellow-200',
    icon: Crown,
    isSystem: true
  },
  admin: {
    name: 'Admin',
    description: 'Administrative access with team management capabilities',
    permissions: PERMISSIONS.filter(p => !['project.delete', 'team.edit_roles'].includes(p.id)).map(p => p.id),
    color: 'text-red-800 bg-red-100 border-red-200',
    icon: Shield,
    isSystem: true
  },
  editor: {
    name: 'Editor',
    description: 'Can edit tasks, files, and contribute to the project',
    permissions: [
      'project.view', 'tasks.view', 'tasks.create', 'tasks.edit', 'tasks.assign',
      'team.view', 'files.view', 'files.upload', 'files.edit',
      'comments.view', 'comments.create', 'comments.edit',
      'reports.view', 'integrations.view'
    ],
    color: 'text-blue-800 bg-blue-100 border-blue-200',
    icon: Edit3,
    isSystem: true
  },
  viewer: {
    name: 'Viewer',
    description: 'Read-only access to project content',
    permissions: [
      'project.view', 'tasks.view', 'team.view', 'files.view',
      'comments.view', 'comments.create', 'reports.view', 'integrations.view'
    ],
    color: 'text-gray-800 bg-gray-100 border-gray-200',
    icon: Eye,
    isSystem: true
  }
};

export default function PermissionsEditor({ 
  projectId, 
  onPermissionsChange, 
  currentUserRole = 'viewer' 
}: PermissionsEditorProps) {
  const [rolePermissions, setRolePermissions] = useState<RolePermissions>(DEFAULT_ROLE_PERMISSIONS);
  const [selectedRole, setSelectedRole] = useState<string>('viewer');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['project', 'tasks']));
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showCriticalWarning, setShowCriticalWarning] = useState(false);

  const canEditPermissions = ['owner', 'admin'].includes(currentUserRole);
  
  const categories = Array.from(new Set(PERMISSIONS.map(p => p.category)));
  
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'project': return Settings;
      case 'tasks': return FileText;
      case 'team': return Users;
      case 'files': return Folder;
      case 'communication': return MessageCircle;
      case 'reports': return BarChart3;
      case 'integrations': return Code;
      default: return Shield;
    }
  };

  const getCategoryName = (category: string) => {
    return category.charAt(0).toUpperCase() + category.slice(1).replace('_', ' ');
  };

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const hasPermission = (roleId: string, permissionId: string) => {
    return rolePermissions[roleId]?.permissions.includes(permissionId) || false;
  };

  const togglePermission = (roleId: string, permissionId: string) => {
    if (!canEditPermissions) return;
    if (rolePermissions[roleId]?.isSystem && ['owner'].includes(roleId)) return; // Can't edit owner permissions
    
    const permission = PERMISSIONS.find(p => p.id === permissionId);
    
    if (permission?.critical && hasPermission(roleId, permissionId)) {
      setShowCriticalWarning(true);
      return;
    }

    const currentPermissions = rolePermissions[roleId]?.permissions || [];
    const newPermissions = currentPermissions.includes(permissionId)
      ? currentPermissions.filter(p => p !== permissionId)
      : [...currentPermissions, permissionId];

    setRolePermissions(prev => ({
      ...prev,
      [roleId]: {
        ...prev[roleId],
        permissions: newPermissions
      }
    }));
    
    setHasUnsavedChanges(true);
  };

  const savePermissions = () => {
    onPermissionsChange?.(rolePermissions);
    setHasUnsavedChanges(false);
  };

  const resetPermissions = () => {
    setRolePermissions(DEFAULT_ROLE_PERMISSIONS);
    setHasUnsavedChanges(false);
  };

  const getPermissionsByCategory = (category: string) => {
    return PERMISSIONS.filter(p => p.category === category);
  };

  const getRolePermissionCount = (roleId: string, category?: string) => {
    const rolePerms = rolePermissions[roleId]?.permissions || [];
    if (category) {
      const categoryPerms = getPermissionsByCategory(category);
      return categoryPerms.filter(p => rolePerms.includes(p.id)).length;
    }
    return rolePerms.length;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Shield className="w-6 h-6 text-blue-600" />
              Project Permissions
            </h2>
            <p className="text-gray-600 mt-1">
              Manage what team members can do in this project
            </p>
          </div>
          
          {canEditPermissions && (
            <div className="flex items-center gap-3">
              <button
                onClick={resetPermissions}
                disabled={!hasUnsavedChanges}
                className="px-4 py-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Reset
              </button>
              <button
                onClick={savePermissions}
                disabled={!hasUnsavedChanges}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Save Changes
              </button>
            </div>
          )}
        </div>
        
        {hasUnsavedChanges && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div className="text-yellow-800">
              <p className="font-medium">You have unsaved changes</p>
              <p className="text-sm">Remember to save your permission changes before leaving this page.</p>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Role Selection */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="font-medium text-gray-900 mb-4">Roles</h3>
            <div className="space-y-2">
              {Object.entries(rolePermissions).map(([roleId, role]) => {
                const IconComponent = role.icon;
                return (
                  <button
                    key={roleId}
                    onClick={() => setSelectedRole(roleId)}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                      selectedRole === roleId 
                        ? `${role.color} ring-2 ring-blue-500 ring-offset-1`
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <IconComponent className="w-5 h-5" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{role.name}</div>
                        <div className="text-xs text-gray-600 truncate">{role.description}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          {getRolePermissionCount(roleId)} permissions
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Permissions Grid */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    {React.createElement(rolePermissions[selectedRole]?.icon || Shield, { className: "w-5 h-5" })}
                    {rolePermissions[selectedRole]?.name} Permissions
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {rolePermissions[selectedRole]?.description}
                  </p>
                </div>
                
                {!canEditPermissions && (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Lock className="w-4 h-4" />
                    Read Only
                  </div>
                )}
              </div>
            </div>

            <div className="p-6">
              <div className="space-y-4">
                {categories.map(category => {
                  const CategoryIcon = getCategoryIcon(category);
                  const categoryPermissions = getPermissionsByCategory(category);
                  const isExpanded = expandedCategories.has(category);
                  const enabledCount = getRolePermissionCount(selectedRole, category);

                  return (
                    <div key={category} className="border border-gray-200 rounded-lg">
                      <button
                        onClick={() => toggleCategory(category)}
                        className="w-full p-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <CategoryIcon className="w-5 h-5 text-gray-600" />
                          <div>
                            <h4 className="font-medium text-gray-900">
                              {getCategoryName(category)}
                            </h4>
                            <p className="text-sm text-gray-500">
                              {enabledCount} of {categoryPermissions.length} permissions enabled
                            </p>
                          </div>
                        </div>
                        {isExpanded ? (
                          <ChevronDown className="w-5 h-5 text-gray-400" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-gray-400" />
                        )}
                      </button>

                      {isExpanded && (
                        <div className="border-t border-gray-200 p-4">
                          <div className="space-y-3">
                            {categoryPermissions.map(permission => {
                              const IconComponent = permission.icon;
                              const isEnabled = hasPermission(selectedRole, permission.id);
                              const isReadOnly = !canEditPermissions || 
                                                (rolePermissions[selectedRole]?.isSystem && selectedRole === 'owner');

                              return (
                                <div
                                  key={permission.id}
                                  className={`flex items-start gap-4 p-3 rounded-lg border ${
                                    isEnabled ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'
                                  } ${!isReadOnly ? 'hover:shadow-sm transition-all' : ''}`}
                                >
                                  <div className="flex items-start gap-3 flex-1">
                                    <IconComponent className={`w-5 h-5 mt-0.5 ${
                                      isEnabled ? 'text-green-600' : 'text-gray-400'
                                    }`} />
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2">
                                        <h5 className="font-medium text-gray-900">
                                          {permission.name}
                                        </h5>
                                        {permission.critical && (
                                          <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded-full">
                                            Critical
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-sm text-gray-600 mt-1">
                                        {permission.description}
                                      </p>
                                    </div>
                                  </div>

                                  <button
                                    onClick={() => togglePermission(selectedRole, permission.id)}
                                    disabled={isReadOnly}
                                    className={`p-2 rounded-lg transition-colors ${
                                      isReadOnly 
                                        ? 'opacity-50 cursor-not-allowed' 
                                        : isEnabled
                                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                    }`}
                                  >
                                    {isEnabled ? (
                                      <Check className="w-4 h-4" />
                                    ) : (
                                      <X className="w-4 h-4" />
                                    )}
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Critical Permission Warning Modal */}
      {showCriticalWarning && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-red-600" />
              <h3 className="text-lg font-semibold text-gray-900">Critical Permission</h3>
            </div>
            
            <p className="text-gray-700 mb-6">
              This is a critical permission that affects security and project integrity. 
              Removing it may limit important functionality. Are you sure you want to continue?
            </p>
            
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowCriticalWarning(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-900"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowCriticalWarning(false);
                  // Continue with the permission removal
                }}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
              >
                Remove Permission
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}