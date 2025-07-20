/**
 * Role-Based Access Control (RBAC) System for Engunity AI
 * Location: frontend/src/lib/auth/permissions.ts
 * 
 * Purpose: Centralized permission management for features, routes, and actions
 * Uses: Supabase Auth + role-based access control
 */

import React from 'react';

// ================================
// 🔑 User Role Definitions
// ================================

/**
 * Available user roles in Engunity AI platform
 * Ordered from lowest to highest privilege level
 */
export type UserRole = 'free' | 'pro' | 'enterprise' | 'moderator' | 'developer' | 'admin';

/**
 * Subscription-based user tiers
 */
export type SubscriptionTier = 'free' | 'pro' | 'enterprise';

/**
 * System roles with elevated privileges
 */
export type SystemRole = 'moderator' | 'developer' | 'admin';

/**
 * All available roles (ordered by privilege level)
 */
export const ROLES: UserRole[] = ['free', 'pro', 'enterprise', 'moderator', 'developer', 'admin'];

/**
 * Subscription tiers only
 */
export const SUBSCRIPTION_TIERS: SubscriptionTier[] = ['free', 'pro', 'enterprise'];

/**
 * System roles only
 */
export const SYSTEM_ROLES: SystemRole[] = ['moderator', 'developer', 'admin'];

// ================================
// 📊 Role Hierarchy & Privilege Levels
// ================================

/**
 * Role hierarchy with numeric privilege levels
 * Higher numbers indicate more privileges
 */
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  free: 1,        // Basic free tier
  pro: 2,         // Paid subscription
  enterprise: 3,  // Enterprise subscription
  moderator: 4,   // Content moderation privileges
  developer: 5,   // Technical system access
  admin: 6,       // Full system administration
} as const;

/**
 * Role descriptions for UI display
 */
export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  free: 'Free tier with basic features',
  pro: 'Professional tier with advanced features',
  enterprise: 'Enterprise tier with full feature access',
  moderator: 'Content moderation and user management',
  developer: 'Technical access and system debugging',
  admin: 'Full administrative access to all systems',
} as const;

// ================================
// 🎯 Feature Permission Mapping
// ================================

/**
 * Minimum role required to access specific features
 */
export const FEATURE_PERMISSIONS: Record<string, UserRole> = {
  // ===== Core Platform Features =====
  'dashboard-access': 'free',
  'profile-management': 'free',
  'basic-chat': 'free',
  
  // ===== Chat & AI Features =====
  'ai-chat-basic': 'free',
  'ai-chat-advanced': 'pro',
  'chat-history': 'free',
  'chat-export': 'pro',
  'custom-ai-models': 'enterprise',
  'priority-support': 'pro',
  
  // ===== Document Management =====
  'document-upload': 'free',
  'document-qa-basic': 'free',
  'document-qa-advanced': 'pro',
  'document-batch-upload': 'pro',
  'document-ocr': 'pro',
  'document-collaboration': 'enterprise',
  'document-version-control': 'enterprise',
  
  // ===== Code Assistant =====
  'code-generation': 'free',
  'code-debugging': 'pro',
  'code-execution': 'pro',
  'code-review-ai': 'enterprise',
  'custom-code-templates': 'enterprise',
  'code-collaboration': 'enterprise',
  
  // ===== Research Tools =====
  'research-summarization': 'free',
  'research-citation': 'pro',
  'literature-review': 'pro',
  'research-collaboration': 'enterprise',
  'advanced-analytics': 'enterprise',
  
  // ===== Data Analysis =====
  'data-upload-basic': 'free',
  'data-analysis-basic': 'pro',
  'data-visualization': 'pro',
  'advanced-statistics': 'enterprise',
  'ml-model-training': 'enterprise',
  'data-export-unlimited': 'enterprise',
  
  // ===== Notebook Features =====
  'notebook-creation': 'free',
  'notebook-sharing': 'pro',
  'notebook-collaboration': 'enterprise',
  'notebook-version-control': 'enterprise',
  'notebook-export': 'pro',
  
  // ===== Project Management =====
  'project-planning': 'pro',
  'kanban-boards': 'pro',
  'team-collaboration': 'enterprise',
  'project-analytics': 'enterprise',
  
  // ===== Blockchain Features =====
  'web3-marketplace': 'enterprise',
  'smart-contract-audit': 'enterprise',
  'blockchain-integration': 'enterprise',
  'crypto-payments': 'enterprise',
  
  // ===== API & Integration =====
  'api-access-basic': 'pro',
  'api-access-unlimited': 'enterprise',
  'webhook-integration': 'enterprise',
  'third-party-integrations': 'enterprise',
  
  // ===== Storage & Limits =====
  'storage-1gb': 'free',
  'storage-10gb': 'pro',
  'storage-unlimited': 'enterprise',
  'bandwidth-unlimited': 'enterprise',
  
  // ===== Moderation Features =====
  'user-management': 'moderator',
  'content-moderation': 'moderator',
  'report-handling': 'moderator',
  'user-ban': 'moderator',
  'community-management': 'moderator',
  
  // ===== Developer Features =====
  'system-logs': 'developer',
  'debug-tools': 'developer',
  'performance-metrics': 'developer',
  'api-monitoring': 'developer',
  'database-access': 'developer',
  'system-health': 'developer',
  
  // ===== Admin Features =====
  'admin-dashboard': 'admin',
  'user-role-management': 'admin',
  'system-configuration': 'admin',
  'billing-management': 'admin',
  'security-settings': 'admin',
  'audit-logs': 'admin',
  'system-backup': 'admin',
  'feature-flags': 'admin',
} as const;

/**
 * Route-based permissions for Next.js App Router
 */
export const ROUTE_PERMISSIONS: Record<string, UserRole> = {
  // Public routes (no authentication required)
  '/': 'free',
  '/login': 'free',
  '/register': 'free',
  '/forgot-password': 'free',
  
  // Dashboard routes
  '/dashboard': 'free',
  '/dashboard/chat': 'free',
  '/dashboard/documents': 'free',
  '/dashboard/code': 'free',
  '/dashboard/research': 'free',
  '/dashboard/notebook': 'free',
  '/dashboard/analysis': 'pro',
  '/dashboard/projects': 'pro',
  
  // Blockchain routes
  '/dashboard/marketplace': 'enterprise',
  '/dashboard/audit': 'enterprise',
  
  // Settings routes
  '/dashboard/settings': 'free',
  '/dashboard/settings/billing': 'pro',
  '/dashboard/settings/api-keys': 'pro',
  '/dashboard/settings/team': 'enterprise',
  
  // Moderation routes
  '/dashboard/moderation': 'moderator',
  '/dashboard/moderation/users': 'moderator',
  '/dashboard/moderation/reports': 'moderator',
  
  // Developer routes
  '/dashboard/developer': 'developer',
  '/dashboard/developer/logs': 'developer',
  '/dashboard/developer/metrics': 'developer',
  '/dashboard/developer/debug': 'developer',
  
  // Admin routes
  '/dashboard/admin': 'admin',
  '/dashboard/admin/users': 'admin',
  '/dashboard/admin/system': 'admin',
  '/dashboard/admin/billing': 'admin',
  '/dashboard/admin/audit': 'admin',
} as const;

/**
 * API endpoint permissions
 */
export const API_PERMISSIONS: Record<string, UserRole> = {
  // Auth endpoints
  'POST /api/auth/login': 'free',
  'POST /api/auth/register': 'free',
  'POST /api/auth/logout': 'free',
  
  // Chat endpoints
  'POST /api/chat/message': 'free',
  'GET /api/chat/history': 'free',
  'DELETE /api/chat/thread': 'free',
  
  // Document endpoints
  'POST /api/documents/upload': 'free',
  'POST /api/documents/qa': 'free',
  'DELETE /api/documents': 'free',
  'POST /api/documents/batch-upload': 'pro',
  
  // Code endpoints
  'POST /api/code/generate': 'free',
  'POST /api/code/execute': 'pro',
  'POST /api/code/debug': 'pro',
  
  // Analysis endpoints
  'POST /api/analysis/upload': 'pro',
  'POST /api/analysis/process': 'pro',
  'GET /api/analysis/insights': 'enterprise',
  
  // Admin endpoints
  'GET /api/admin/users': 'admin',
  'PUT /api/admin/users/role': 'admin',
  'GET /api/admin/system': 'admin',
  
  // Developer endpoints
  'GET /api/developer/logs': 'developer',
  'GET /api/developer/metrics': 'developer',
} as const;

// ================================
// 🛡️ Permission Check Functions
// ================================

/**
 * Check if a user role meets the minimum required role
 * @param currentRole - User's current role
 * @param requiredRole - Minimum required role
 * @returns boolean - True if user has sufficient privileges
 */
export function hasRole(currentRole: UserRole, requiredRole: UserRole): boolean {
  return ROLE_HIERARCHY[currentRole] >= ROLE_HIERARCHY[requiredRole];
}

/**
 * Check if user can access a specific feature
 * @param userRole - User's current role
 * @param feature - Feature identifier
 * @returns boolean - True if user can access the feature
 */
export function canAccessFeature(userRole: UserRole, feature: string): boolean {
  const requiredRole = FEATURE_PERMISSIONS[feature];
  if (!requiredRole) {
    console.warn(`Feature '${feature}' not found in permissions. Denying access.`);
    return false;
  }
  return hasRole(userRole, requiredRole);
}

/**
 * Check if user can access a specific route
 * @param userRole - User's current role
 * @param route - Route path
 * @returns boolean - True if user can access the route
 */
export function canAccessRoute(userRole: UserRole, route: string): boolean {
  const requiredRole = ROUTE_PERMISSIONS[route];
  if (!requiredRole) {
    // If route not in permissions, check for wildcard patterns
    const wildcardRoute = findWildcardRoute(route);
    if (wildcardRoute) {
      return hasRole(userRole, ROUTE_PERMISSIONS[wildcardRoute]);
    }
    console.warn(`Route '${route}' not found in permissions. Denying access.`);
    return false;
  }
  return hasRole(userRole, requiredRole);
}

/**
 * Check if user can call a specific API endpoint
 * @param userRole - User's current role
 * @param method - HTTP method
 * @param endpoint - API endpoint path
 * @returns boolean - True if user can call the endpoint
 */
export function canCallAPI(userRole: UserRole, method: string, endpoint: string): boolean {
  const apiKey = `${method.toUpperCase()} ${endpoint}`;
  const requiredRole = API_PERMISSIONS[apiKey];
  if (!requiredRole) {
    console.warn(`API endpoint '${apiKey}' not found in permissions. Denying access.`);
    return false;
  }
  return hasRole(userRole, requiredRole);
}

/**
 * Get all features accessible by a user role
 * @param userRole - User's current role
 * @returns string[] - Array of accessible feature names
 */
export function getAccessibleFeatures(userRole: UserRole): string[] {
  return Object.entries(FEATURE_PERMISSIONS)
    .filter(([, requiredRole]) => hasRole(userRole, requiredRole))
    .map(([feature]) => feature);
}

/**
 * Get all routes accessible by a user role
 * @param userRole - User's current role
 * @returns string[] - Array of accessible route paths
 */
export function getAccessibleRoutes(userRole: UserRole): string[] {
  return Object.entries(ROUTE_PERMISSIONS)
    .filter(([, requiredRole]) => hasRole(userRole, requiredRole))
    .map(([route]) => route);
}

/**
 * Check if user is a system role (moderator, developer, or admin)
 * @param userRole - User's current role
 * @returns boolean - True if user has system privileges
 */
export function isSystemRole(userRole: UserRole): boolean {
  return SYSTEM_ROLES.includes(userRole as SystemRole);
}

/**
 * Check if user is a subscription-based role
 * @param userRole - User's current role
 * @returns boolean - True if user has subscription-based role
 */
export function isSubscriptionRole(userRole: UserRole): boolean {
  return SUBSCRIPTION_TIERS.includes(userRole as SubscriptionTier);
}

/**
 * Get the highest role from an array of roles
 * @param roles - Array of user roles
 * @returns UserRole - Highest privilege role
 */
export function getHighestRole(roles: UserRole[]): UserRole {
  return roles.reduce((highest, current) => 
    ROLE_HIERARCHY[current] > ROLE_HIERARCHY[highest] ? current : highest
  );
}

/**
 * Check if role upgrade is valid
 * @param currentRole - Current user role
 * @param newRole - Proposed new role
 * @returns boolean - True if upgrade is valid
 */
export function isValidRoleUpgrade(currentRole: UserRole, newRole: UserRole): boolean {
  // Allow upgrades within subscription tiers
  if (isSubscriptionRole(currentRole) && isSubscriptionRole(newRole)) {
    return ROLE_HIERARCHY[newRole] > ROLE_HIERARCHY[currentRole];
  }
  
  // System roles require admin privileges to assign
  if (isSystemRole(newRole)) {
    return false; // Must be assigned by admin through different process
  }
  
  return false;
}

// ================================
// 🎨 UI Helper Functions
// ================================

/**
 * Get role display name for UI
 * @param role - User role
 * @returns string - Human-readable role name
 */
export function getRoleDisplayName(role: UserRole): string {
  const displayNames: Record<UserRole, string> = {
    free: 'Free User',
    pro: 'Pro User',
    enterprise: 'Enterprise User',
    moderator: 'Moderator',
    developer: 'Developer',
    admin: 'Administrator',
  };
  return displayNames[role] || role;
}

/**
 * Get role badge color for UI
 * @param role - User role
 * @returns string - CSS color class or hex color
 */
export function getRoleBadgeColor(role: UserRole): string {
  const colors: Record<UserRole, string> = {
    free: 'bg-gray-100 text-gray-800',
    pro: 'bg-blue-100 text-blue-800',
    enterprise: 'bg-purple-100 text-purple-800',
    moderator: 'bg-yellow-100 text-yellow-800',
    developer: 'bg-green-100 text-green-800',
    admin: 'bg-red-100 text-red-800',
  };
  return colors[role] || 'bg-gray-100 text-gray-800';
}

/**
 * Check if feature should be shown in UI based on user role
 * @param userRole - User's current role
 * @param feature - Feature identifier
 * @param showUpgradePrompt - Whether to show upgrade prompts for inaccessible features
 * @returns { canAccess: boolean; showUpgrade: boolean }
 */
export function getFeatureUIState(
  userRole: UserRole, 
  feature: string, 
  showUpgradePrompt: boolean = true
): { canAccess: boolean; showUpgrade: boolean } {
  const canAccess = canAccessFeature(userRole, feature);
  const requiredRole = FEATURE_PERMISSIONS[feature];
  
  // Show upgrade prompt if feature requires subscription tier and user is on lower tier
  const showUpgrade = !canAccess && 
                     showUpgradePrompt && 
                     requiredRole &&
                     isSubscriptionRole(userRole) && 
                     isSubscriptionRole(requiredRole);
  
  return { canAccess, showUpgrade };
}

// ================================
// 🔧 Utility Functions
// ================================

/**
 * Find wildcard route pattern for dynamic routes
 * @param route - Actual route path
 * @returns string | null - Matching wildcard pattern or null
 */
function findWildcardRoute(route: string): string | null {
  // Check for common dynamic route patterns
  const patterns = [
    route.replace(/\/[^/]+$/, '/[id]'),           // /path/123 -> /path/[id]
    route.replace(/\/[^/]+\/[^/]+$/, '/[...slug]'), // /path/a/b -> /path/[...slug]
  ];
  
  for (const pattern of patterns) {
    if (ROUTE_PERMISSIONS[pattern]) {
      return pattern;
    }
  }
  
  return null;
}

/**
 * Create permission guard for React components
 * @param requiredRole - Minimum required role
 * @param fallback - Fallback component or null
 * @returns Higher-order component function
 */
export function withPermission<T extends object>(
  requiredRole: UserRole,
  fallback: React.ComponentType | null = null
) {
  return function PermissionGuard(
    Component: React.ComponentType<T>
  ): React.ComponentType<T & { userRole: UserRole }> {
    return function GuardedComponent({ userRole, ...props }: T & { userRole: UserRole }) {
      if (hasRole(userRole, requiredRole)) {
        return React.createElement(Component, props as T);
      }
      
      if (fallback) {
        return React.createElement(fallback);
      }
      
      return null;
    };
  };
}

/**
 * Validate permissions configuration at runtime
 * @returns { isValid: boolean; errors: string[] }
 */
export function validatePermissions(): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Check if all roles in permissions exist in ROLE_HIERARCHY
  const allRolesInPermissions = new Set([
    ...Object.values(FEATURE_PERMISSIONS),
    ...Object.values(ROUTE_PERMISSIONS),
    ...Object.values(API_PERMISSIONS),
  ]);
  
  for (const role of allRolesInPermissions) {
    if (!(role in ROLE_HIERARCHY)) {
      errors.push(`Role '${role}' used in permissions but not defined in ROLE_HIERARCHY`);
    }
  }
  
  // Check for duplicate feature names
  const featureNames = Object.keys(FEATURE_PERMISSIONS);
  const duplicateFeatures = featureNames.filter(
    (name, index) => featureNames.indexOf(name) !== index
  );
  
  if (duplicateFeatures.length > 0) {
    errors.push(`Duplicate features found: ${duplicateFeatures.join(', ')}`);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}