/**
 * UserProfile Component for Engunity AI
 * Location: frontend/src/components/auth/UserProfile.tsx
 * 
 * Purpose: User dropdown menu with profile info, navigation, and logout
 * Uses: Supabase Auth + ShadCN UI + role-based access
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { User } from '@supabase/supabase-js';
import {
  User as UserIcon,
  Settings,
  LayoutDashboard,
  Shield,
  CreditCard,
  HelpCircle,
  LogOut,
  ChevronDown,
  Loader2,
  Crown,
  Zap,
} from 'lucide-react';

// ShadCN UI Components
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

// Auth utilities
import { supabase } from '@/lib/auth/supabase';
import { 
  getCurrentUser, 
  getExtendedUserProfile,
  logout,
  type ExtendedUserProfile 
} from '@/lib/auth/session';
import { hasRole, type UserRole, getRoleDisplayName, getRoleBadgeColor } from '@/lib/auth/permissions';

// ================================
// 🔧 Type Definitions
// ================================

/**
 * Props for the UserProfile component
 */
export interface UserProfileProps {
  /** Custom CSS classes */
  className?: string;
  /** Whether to show the role badge */
  showRoleBadge?: boolean;
  /** Whether to show the credits in the dropdown */
  showCredits?: boolean;
  /** Custom menu items to add */
  customMenuItems?: CustomMenuItem[];
  /** Alignment of the dropdown menu */
  align?: 'start' | 'center' | 'end';
  /** Side of the dropdown menu */
  side?: 'top' | 'right' | 'bottom' | 'left';
  /** Callback when user logs out */
  onLogout?: () => void;
}

/**
 * Custom menu item interface
 */
export interface CustomMenuItem {
  label: string;
  href?: string;
  onClick?: () => void;
  icon?: React.ComponentType<{ className?: string }>;
  requiresRole?: UserRole;
  disabled?: boolean;
  destructive?: boolean;
}

/**
 * User profile state
 */
interface UserProfileState {
  user: User | null;
  profile: ExtendedUserProfile | null;
  loading: boolean;
  error: string | null;
}

// ================================
// 🎨 UserProfile Component
// ================================

/**
 * Responsive user profile dropdown with role-based navigation
 */
const UserProfile: React.FC<UserProfileProps> = ({
  className = '',
  showRoleBadge = true,
  showCredits = true,
  customMenuItems = [],
  align = 'end',
  side = 'bottom',
  onLogout,
}) => {
  const router = useRouter();
  
  // State management
  const [userState, setUserState] = useState<UserProfileState>({
    user: null,
    profile: null,
    loading: true,
    error: null,
  });
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // ================================
  // 🔄 User Data Fetching
  // ================================

  /**
   * Fetch user data and profile information
   */
  const fetchUserData = async () => {
    try {
      setUserState(prev => ({ ...prev, loading: true, error: null }));

      const user = await getCurrentUser();
      
      if (!user) {
        setUserState({
          user: null,
          profile: null,
          loading: false,
          error: null,
        });
        return;
      }

      // Fetch extended profile data
      const profile = await getExtendedUserProfile(user.id);

      setUserState({
        user,
        profile,
        loading: false,
        error: null,
      });

    } catch (error) {
      console.error('Error fetching user data:', error);
      setUserState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load user data',
      }));
    }
  };

  /**
   * Initialize user data on component mount
   */
  useEffect(() => {
    fetchUserData();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setUserState({
          user: null,
          profile: null,
          loading: false,
          error: null,
        });
      } else if (event === 'SIGNED_IN' && session?.user) {
        fetchUserData();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // ================================
  // 🔐 Authentication Handlers
  // ================================

  /**
   * Handle user logout
   */
  const handleLogout = async () => {
    setIsLoggingOut(true);
    setDropdownOpen(false);

    try {
      await logout();
      onLogout?.();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  // ================================
  // 🎨 Helper Functions
  // ================================

  /**
   * Get user initials for avatar fallback
   */
  const getUserInitials = (name?: string, email?: string): string => {
    if (name) {
      return name
        .split(' ')
        .map(word => word[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    
    if (email) {
      return email[0].toUpperCase();
    }
    
    return 'U';
  };

  /**
   * Get user display name
   */
  const getUserDisplayName = (): string => {
    if (userState.profile?.full_name) {
      return userState.profile.full_name;
    }
    
    if (userState.user?.user_metadata?.full_name) {
      return userState.user.user_metadata.full_name;
    }
    
    if (userState.user?.user_metadata?.name) {
      return userState.user.user_metadata.name;
    }
    
    return userState.user?.email?.split('@')[0] || 'User';
  };

  /**
   * Get avatar URL
   */
  const getAvatarUrl = (): string | undefined => {
    return (
      userState.profile?.avatar_url ||
      userState.user?.user_metadata?.avatar_url ||
      userState.user?.user_metadata?.picture
    );
  };

  /**
   * Filter menu items based on user role
   */
  const getFilteredCustomItems = (): CustomMenuItem[] => {
    if (!userState.profile) return [];
    
    return customMenuItems.filter(item => {
      if (!item.requiresRole) return true;
      return hasRole(userState.profile.role, item.requiresRole);
    });
  };

  // ================================
  // 🎨 Loading State
  // ================================

  if (userState.loading) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <Skeleton className="h-8 w-8 rounded-full" />
        <div className="hidden sm:block">
          <Skeleton className="h-4 w-20 mb-1" />
          <Skeleton className="h-3 w-16" />
        </div>
        <Skeleton className="h-4 w-4" />
      </div>
    );
  }

  // ================================
  // 🚫 Not Authenticated State
  // ================================

  if (!userState.user || !userState.profile) {
    return (
      <div className={className}>
        <Link href="/auth/login">
          <Button variant="outline" size="sm">
            Sign In
          </Button>
        </Link>
      </div>
    );
  }

  // ================================
  // 🎨 Render User Profile Dropdown
  // ================================

  const displayName = getUserDisplayName();
  const email = userState.user.email;
  const avatarUrl = getAvatarUrl();
  const initials = getUserInitials(displayName, email);
  const userRole = userState.profile.role;
  const credits = userState.profile.credits_remaining;

  return (
    <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={`flex items-center space-x-2 h-auto p-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${className}`}
          disabled={isLoggingOut}
        >
          {/* Avatar */}
          <Avatar className="h-8 w-8">
            <AvatarImage src={avatarUrl} alt={displayName} />
            <AvatarFallback className="bg-blue-600 text-white text-xs font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>

          {/* User Info - Hidden on mobile */}
          <div className="hidden sm:flex flex-col items-start text-left min-w-0">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate max-w-24">
                {displayName}
              </span>
              {showRoleBadge && userRole !== 'free' && (
                <Badge variant="secondary" className={`text-xs ${getRoleBadgeColor(userRole)}`}>
                  {userRole === 'admin' && <Crown className="w-3 h-3 mr-1" />}
                  {userRole === 'pro' && <Zap className="w-3 h-3 mr-1" />}
                  {getRoleDisplayName(userRole)}
                </Badge>
              )}
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-32">
              {email}
            </span>
          </div>

          {/* Dropdown Arrow */}
          <ChevronDown className="h-4 w-4 text-gray-500 dark:text-gray-400" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent 
        className="w-64" 
        align={align} 
        side={side}
        sideOffset={5}
      >
        {/* User Header */}
        <DropdownMenuLabel className="p-0">
          <div className="flex items-center space-x-3 p-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={avatarUrl} alt={displayName} />
              <AvatarFallback className="bg-blue-600 text-white font-medium">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                  {displayName}
                </p>
                {userRole !== 'free' && (
                  <Badge variant="secondary" className={`text-xs ${getRoleBadgeColor(userRole)}`}>
                    {getRoleDisplayName(userRole)}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {email}
              </p>
              {showCredits && (
                <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                  {credits} credits remaining
                </p>
              )}
            </div>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        {/* Navigation Items */}
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href="/dashboard" className="cursor-pointer">
              <LayoutDashboard className="mr-2 h-4 w-4" />
              Dashboard
            </Link>
          </DropdownMenuItem>

          <DropdownMenuItem asChild>
            <Link href="/profile" className="cursor-pointer">
              <UserIcon className="mr-2 h-4 w-4" />
              View Profile
            </Link>
          </DropdownMenuItem>

          <DropdownMenuItem asChild>
            <Link href="/settings" className="cursor-pointer">
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Link>
          </DropdownMenuItem>

          {/* Billing for paid users */}
          {hasRole(userRole, 'pro') && (
            <DropdownMenuItem asChild>
              <Link href="/settings/billing" className="cursor-pointer">
                <CreditCard className="mr-2 h-4 w-4" />
                Billing
              </Link>
            </DropdownMenuItem>
          )}
        </DropdownMenuGroup>

        {/* Admin Section */}
        {hasRole(userRole, 'moderator') && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              {hasRole(userRole, 'admin') && (
                <DropdownMenuItem asChild>
                  <Link href="/admin" className="cursor-pointer">
                    <Shield className="mr-2 h-4 w-4" />
                    Admin Panel
                  </Link>
                </DropdownMenuItem>
              )}

              {hasRole(userRole, 'moderator') && (
                <DropdownMenuItem asChild>
                  <Link href="/moderation" className="cursor-pointer">
                    <Shield className="mr-2 h-4 w-4" />
                    Moderation
                  </Link>
                </DropdownMenuItem>
              )}
            </DropdownMenuGroup>
          </>
        )}

        {/* Custom Menu Items */}
        {getFilteredCustomItems().length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              {getFilteredCustomItems().map((item, index) => {
                const IconComponent = item.icon;
                
                if (item.href) {
                  return (
                    <DropdownMenuItem key={index} asChild>
                      <Link href={item.href} className="cursor-pointer">
                        {IconComponent && <IconComponent className="mr-2 h-4 w-4" />}
                        {item.label}
                      </Link>
                    </DropdownMenuItem>
                  );
                }
                
                return (
                  <DropdownMenuItem
                    key={index}
                    onClick={item.onClick}
                    disabled={item.disabled}
                    className={`cursor-pointer ${item.destructive ? 'text-red-600 dark:text-red-400' : ''}`}
                  >
                    {IconComponent && <IconComponent className="mr-2 h-4 w-4" />}
                    {item.label}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuGroup>
          </>
        )}

        {/* Help & Support */}
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href="/help" className="cursor-pointer">
              <HelpCircle className="mr-2 h-4 w-4" />
              Help & Support
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        {/* Logout */}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="cursor-pointer text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
        >
          {isLoggingOut ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <LogOut className="mr-2 h-4 w-4" />
          )}
          {isLoggingOut ? 'Signing out...' : 'Sign Out'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

// ================================
// 🎯 Export Component
// ================================

export default UserProfile;

// Named exports for additional flexibility
export { type UserProfileProps, type CustomMenuItem };

// ================================
// 🧪 Usage Examples (Comments)
// ================================

/*
// Basic usage:
<UserProfile />

// With custom styling:
<UserProfile 
  className="ml-auto"
  showRoleBadge={true}
  showCredits={true}
/>

// With custom menu items:
<UserProfile
  customMenuItems={[
    {
      label: 'API Documentation',
      href: '/docs',
      icon: FileText,
      requiresRole: 'pro',
    },
    {
      label: 'Developer Tools',
      href: '/dev-tools',
      icon: Code,
      requiresRole: 'developer',
    },
    {
      label: 'Clear Cache',
      onClick: () => clearCache(),
      icon: RefreshCw,
      destructive: true,
    },
  ]}
  onLogout={() => {
    console.log('User logged out');
    // Analytics tracking
  }}
/>

// In a header component:
export default function Header() {
  return (
    <header className="border-b border-gray-200 dark:border-gray-800">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center space-x-4">
          <Logo />
          <Navigation />
        </div>
        
        <div className="flex items-center space-x-4">
          <SearchBar />
          <NotificationBell />
          <UserProfile />
        </div>
      </div>
    </header>
  );
}

// With auth context:
function App() {
  return (
    <AuthProvider>
      <Layout>
        <UserProfile />
      </Layout>
    </AuthProvider>
  );
}
*/