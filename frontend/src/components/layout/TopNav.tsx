'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils/cn';
import { 
  Bell, 
  Search, 
  Settings, 
  User, 
  LogOut, 
  CreditCard, 
  HelpCircle,
  Sun,
  Moon,
  Monitor,
  ChevronDown,
  Menu,
  X,
  Zap,
  Crown,
  Activity,
  Shield,
  AlertTriangle,
  Info,
  CheckCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu';
// Note: Using DropdownMenu for notifications instead of Popover for consistency

// Mock user data - replace with actual auth context
const mockUser = {
  name: 'John Doe',
  email: 'john@example.com',
  avatar: undefined,
  plan: 'Pro',
  initials: 'JD',
  credits: 1247,
  usage: {
    apiCalls: 847,
    maxCalls: 1000,
    percentage: 84.7
  }
};

// Mock notifications - replace with real notification system
const mockNotifications = [
  {
    id: 1,
    title: 'Document analysis complete',
    message: 'Your research paper analysis is ready for review',
    time: '5 minutes ago',
    read: false,
    type: 'success' as const,
    action: '/dashboard/documents'
  },
  {
    id: 2,
    title: 'API rate limit warning',
    message: 'You\'ve used 90% of your monthly quota',
    time: '1 hour ago',
    read: false,
    type: 'warning' as const,
    action: '/dashboard/settings/billing'
  },
  {
    id: 3,
    title: 'New feature available',
    message: 'Smart contract auditor is now live',
    time: '2 hours ago',
    read: true,
    type: 'info' as const,
    action: '/dashboard/audit'
  },
  {
    id: 4,
    title: 'Code execution completed',
    message: 'Your Python script ran successfully',
    time: '3 hours ago',
    read: true,
    type: 'success' as const,
    action: '/dashboard/code'
  }
];

// Get page title and breadcrumb from pathname
const getPageInfo = (pathname: string) => {
  const routes: Record<string, { title: string; description?: string }> = {
    '/dashboard': { 
      title: 'Dashboard', 
      description: 'AI-powered workspace overview' 
    },
    '/dashboard/chat': { 
      title: 'AI Chat', 
      description: 'Intelligent conversation assistant' 
    },
    '/dashboard/code': { 
      title: 'Code Assistant', 
      description: 'Generate, debug & optimize code' 
    },
    '/dashboard/documents': { 
      title: 'Document Q&A', 
      description: 'Upload and analyze documents' 
    },
    '/dashboard/research': { 
      title: 'Research Tools', 
      description: 'Academic writing & analysis' 
    },
    '/dashboard/analysis': { 
      title: 'Data Analysis', 
      description: 'Visualize and explore datasets' 
    },
    '/dashboard/notebook': { 
      title: 'Notebooks', 
      description: 'Interactive coding environment' 
    },
    '/dashboard/projects': { 
      title: 'Projects', 
      description: 'Manage and organize work' 
    },
    '/dashboard/marketplace': { 
      title: 'AI Marketplace', 
      description: 'Discover and trade AI models' 
    },
    '/dashboard/audit': { 
      title: 'Smart Contract Audit', 
      description: 'Analyze blockchain contracts' 
    },
    '/dashboard/settings': { 
      title: 'Settings', 
      description: 'Account and preferences' 
    },
  };

  return routes[pathname] || { title: 'Dashboard', description: 'AI-powered workspace' };
};

interface TopNavProps {
  className?: string;
  onMobileMenuToggle?: () => void;
}

export default function TopNav({ className, onMobileMenuToggle }: TopNavProps) {
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');
  const [searchQuery, setSearchQuery] = useState('');
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const pathname = usePathname();
  
  const pageInfo = getPageInfo(pathname);
  const unreadCount = mockNotifications.filter(n => !n.read).length;

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme);
    // In a real app, you'd update the theme context here
    if (typeof window !== 'undefined') {
      if (newTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else if (newTheme === 'light') {
        document.documentElement.classList.remove('dark');
      } else {
        // System theme
        const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (isDark) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
    }
  };

  const handleLogout = () => {
    // Handle logout logic here
    console.log('Logging out...');
    // In real app: signOut(), redirect to login, clear tokens
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // Handle search logic here
      console.log('Searching for:', searchQuery);
      // In real app: navigate to search results, call search API
    }
  };

  const markNotificationAsRead = (id: number) => {
    // Handle marking notification as read
    console.log('Marking notification as read:', id);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-emerald-500" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      case 'error':
        return <X className="w-4 h-4 text-red-500" />;
      default:
        return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  return (
    <div className={cn(
      "flex items-center justify-between h-full px-4 lg:px-6",
      "bg-white/80 dark:bg-slate-900/80",
      "backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-800/80",
      className
    )}>
      {/* Left Section */}
      <div className="flex items-center gap-4 flex-1 min-w-0">
        {/* Mobile Menu Toggle */}
        <Button
          variant="ghost"
          size="sm"
          className="lg:hidden p-2 hover:bg-slate-100 dark:hover:bg-slate-800"
          onClick={onMobileMenuToggle || (() => {})}
        >
          <Menu className="w-5 h-5" />
          <span className="sr-only">Toggle mobile menu</span>
        </Button>

        {/* Breadcrumb & Page Title */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-1">
            <Link 
              href="/dashboard" 
              className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            >
              Dashboard
            </Link>
            {pathname !== '/dashboard' && (
              <>
                <span>/</span>
                <span className="truncate text-slate-700 dark:text-slate-300">
                  {pageInfo.title}
                </span>
              </>
            )}
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl lg:text-2xl font-display font-semibold text-slate-900 dark:text-slate-100 truncate">
              {pageInfo.title}
            </h1>
            {pathname === '/dashboard/marketplace' && (
              <Badge className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white">
                Web3
              </Badge>
            )}
            {pathname === '/dashboard/audit' && (
              <Badge variant="outline" className="border-amber-500 text-amber-600 dark:text-amber-400">
                <Shield className="w-3 h-3 mr-1" />
                Pro
              </Badge>
            )}
          </div>
          {pageInfo.description && (
            <p className="text-sm text-slate-500 dark:text-slate-400 truncate hidden sm:block">
              {pageInfo.description}
            </p>
          )}
        </div>
      </div>

      {/* Center Section - Search (Desktop) */}
      <div className="hidden md:flex flex-1 max-w-md mx-6">
        <form onSubmit={handleSearch} className="relative w-full">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            type="text"
            placeholder="Search anything..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn(
              "pl-10 pr-4 py-2 w-full",
              "bg-slate-100/50 dark:bg-slate-800/50",
              "border-slate-200/50 dark:border-slate-700/50",
              "focus:bg-white dark:focus:bg-slate-900",
              "focus:border-indigo-300 dark:focus:border-indigo-600",
              "transition-all duration-200",
              "placeholder:text-slate-400"
            )}
          />
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <Badge variant="secondary" className="text-xs px-1.5 py-0.5 font-mono">
              ⌘K
            </Badge>
          </div>
        </form>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-2 lg:gap-3">
        {/* Search Button (Mobile) */}
        <Button
          variant="ghost"
          size="sm"
          className="md:hidden p-2"
        >
          <Search className="w-5 h-5" />
        </Button>

        {/* Theme Toggle */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm" 
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {theme === 'light' ? (
                <Sun className="w-5 h-5" />
              ) : theme === 'dark' ? (
                <Moon className="w-5 h-5" />
              ) : (
                <Monitor className="w-5 h-5" />
              )}
              <span className="sr-only">Toggle theme</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-32">
            <DropdownMenuLabel>Theme</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuRadioGroup value={theme} onValueChange={(value) => handleThemeChange(value as 'light' | 'dark' | 'system')}>
              <DropdownMenuRadioItem value="light">
                <Sun className="w-4 h-4 mr-2" />
                Light
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="dark">
                <Moon className="w-4 h-4 mr-2" />
                Dark
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="system">
                <Monitor className="w-4 h-4 mr-2" />
                System
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Notifications */}
        <DropdownMenu open={notificationsOpen} onOpenChange={setNotificationsOpen}>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm" 
              className="relative p-2 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <Badge 
                  className={cn(
                    "absolute -top-1 -right-1 w-5 h-5 p-0 text-xs",
                    "bg-red-500 hover:bg-red-500 text-white",
                    "flex items-center justify-center rounded-full",
                    "animate-pulse"
                  )}
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Badge>
              )}
              <span className="sr-only">Notifications</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-80 p-0" align="end" side="bottom">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                  Notifications
                </h3>
                {unreadCount > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {unreadCount} new
                  </Badge>
                )}
              </div>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {mockNotifications.length > 0 ? (
                mockNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={cn(
                      "p-4 border-b border-slate-100 dark:border-slate-800 last:border-b-0",
                      "hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer",
                      "transition-colors duration-150",
                      !notification.read && "bg-indigo-50/50 dark:bg-indigo-950/20"
                    )}
                    onClick={() => {
                      markNotificationAsRead(notification.id);
                      setNotificationsOpen(false);
                      if (notification.action && typeof window !== 'undefined') {
                        // Navigate to action URL  
                        window.location.href = notification.action;
                      }
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                            {notification.title}
                          </p>
                          {!notification.read && (
                            <div className="w-2 h-2 bg-indigo-500 rounded-full flex-shrink-0 ml-2" />
                          )}
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-400 truncate">
                          {notification.message}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                          {notification.time}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center">
                  <Bell className="w-8 h-8 text-slate-400 mx-auto mb-3" />
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    No notifications yet
                  </p>
                </div>
              )}
            </div>
            {mockNotifications.length > 0 && (
              <div className="p-3 border-t border-slate-200 dark:border-slate-700">
                <Button variant="ghost" size="sm" className="w-full text-sm">
                  View all notifications
                </Button>
              </div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              className={cn(
                "flex items-center gap-2 h-10 px-3",
                "hover:bg-slate-100 dark:hover:bg-slate-800",
                "transition-colors duration-200"
              )}
            >
              <Avatar className="w-8 h-8">
                <AvatarImage src={mockUser.avatar} alt={mockUser.name} />
                <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-semibold text-sm">
                  {mockUser.initials}
                </AvatarFallback>
              </Avatar>
              <div className="hidden md:flex flex-col items-start min-w-0">
                <span className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                  {mockUser.name}
                </span>
                <div className="flex items-center gap-1">
                  <Badge 
                    variant="outline" 
                    className={cn(
                      "text-xs px-1.5 py-0 h-4",
                      "bg-gradient-to-r from-indigo-500 to-purple-600",
                      "text-white border-none"
                    )}
                  >
                    <Crown className="w-2.5 h-2.5 mr-1" />
                    {mockUser.plan}
                  </Badge>
                </div>
              </div>
              <ChevronDown className="w-4 h-4 text-slate-500 hidden md:block" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64 p-0">
            {/* User Info Header */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={mockUser.avatar} alt={mockUser.name} />
                  <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-semibold">
                    {mockUser.initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                    {mockUser.name}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {mockUser.email}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge 
                      variant="outline" 
                      className="text-xs px-2 py-0.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white border-none"
                    >
                      <Crown className="w-3 h-3 mr-1" />
                      {mockUser.plan}
                    </Badge>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {mockUser.credits} credits
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Usage Stats */}
            <div className="p-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1">
                  <Activity className="w-3 h-3" />
                  API Usage
                </span>
                <span className="text-slate-700 dark:text-slate-300 font-medium">
                  {mockUser.usage.apiCalls}/{mockUser.usage.maxCalls}
                </span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5">
                <div 
                  className="bg-gradient-to-r from-indigo-500 to-purple-600 h-1.5 rounded-full transition-all duration-300" 
                  style={{ width: `${mockUser.usage.percentage}%` }}
                />
              </div>
            </div>

            {/* Menu Items */}
            <div className="py-2">
              <DropdownMenuItem asChild>
                <Link href="/dashboard/settings" className="flex items-center gap-2 px-3 py-2">
                  <User className="w-4 h-4" />
                  Profile Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/dashboard/settings/billing" className="flex items-center gap-2 px-3 py-2">
                  <CreditCard className="w-4 h-4" />
                  Billing & Plans
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/dashboard/settings/api-keys" className="flex items-center gap-2 px-3 py-2">
                  <Settings className="w-4 h-4" />
                  API Keys
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="flex items-center gap-2 px-3 py-2">
                <HelpCircle className="w-4 h-4" />
                Help & Support
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="flex items-center gap-2 px-3 py-2 text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
                onClick={handleLogout}
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </DropdownMenuItem>
            </div>

            {/* Upgrade CTA */}
            {mockUser.plan === 'Free' && (
              <>
                <DropdownMenuSeparator />
                <div className="p-3">
                  <div className={cn(
                    "p-3 rounded-lg",
                    "bg-gradient-to-br from-indigo-50 to-purple-50",
                    "dark:from-indigo-900/20 dark:to-purple-900/20",
                    "border border-indigo-200/50 dark:border-indigo-800/50"
                  )}>
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        Upgrade to Pro
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">
                      Unlock unlimited usage and advanced features
                    </p>
                    <Button size="sm" className="w-full">
                      <Crown className="w-3 h-3 mr-1" />
                      Upgrade Now
                    </Button>
                  </div>
                </div>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}