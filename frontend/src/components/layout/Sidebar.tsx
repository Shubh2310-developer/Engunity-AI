'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { 
  MessageSquare, 
  FileText, 
  Code, 
  BarChart3, 
  BookOpen, 
  Book,
  FolderOpen,
  Settings,
  Home,
  Sparkles,
  Shield,
  Store,
  ChevronLeft,
  ChevronRight,
  Zap,
  Crown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ThemeToggle } from '@/components/ui/theme-toggle';

// Navigation items configuration
const navigationItems = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: Home,
    badge: null,
    group: 'main'
  },
  {
    title: 'AI Chat',
    href: '/dashboard/chat',
    icon: MessageSquare,
    badge: 'Hot',
    group: 'ai-tools'
  },
  {
    title: 'Code Assistant',
    href: '/dashboard/code',
    icon: Code,
    badge: null,
    group: 'ai-tools'
  },
  {
    title: 'Document Q&A',
    href: '/dashboard/documents',
    icon: FileText,
    badge: null,
    group: 'ai-tools'
  },
  {
    title: 'Research Tools',
    href: '/dashboard/research',
    icon: BookOpen,
    badge: null,
    group: 'ai-tools'
  },
  {
    title: 'Data Analysis',
    href: '/dashboard/analysis',
    icon: BarChart3,
    badge: 'Beta',
    group: 'ai-tools'
  },
  {
    title: 'Notebooks',
    href: '/dashboard/notebook',
    icon: Book,
    badge: null,
    group: 'workspace'
  },
  {
    title: 'Projects',
    href: '/dashboard/projects',
    icon: FolderOpen,
    badge: null,
    group: 'workspace'
  },
  {
    title: 'AI Marketplace',
    href: '/dashboard/marketplace',
    icon: Store,
    badge: 'Web3',
    group: 'blockchain'
  },
  {
    title: 'Smart Contract Audit',
    href: '/dashboard/audit',
    icon: Shield,
    badge: 'Pro',
    group: 'blockchain'
  },
  {
    title: 'Settings',
    href: '/dashboard/settings',
    icon: Settings,
    badge: null,
    group: 'account'
  },
];

const navigationGroups = {
  'main': { title: '', showTitle: false },
  'ai-tools': { title: 'AI Tools', showTitle: true },
  'workspace': { title: 'Workspace', showTitle: true },
  'blockchain': { title: 'Web3 & Blockchain', showTitle: true },
  'account': { title: 'Account', showTitle: true },
};

interface SidebarNavProps {
  className?: string;
}

export default function SidebarNav({ className }: SidebarNavProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();

  // Handle responsive behavior
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setIsCollapsed(true);
      } else {
        setIsCollapsed(false);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);


  // Group navigation items
  const groupedItems = navigationItems.reduce((acc, item) => {
    if (!acc[item.group]) {
      acc[item.group] = [];
    }
    acc[item.group]!.push(item);
    return acc;
  }, {} as Record<string, typeof navigationItems>);

  const NavItem = ({ item, isCollapsed }: { item: typeof navigationItems[0], isCollapsed: boolean }) => {
    const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
    const Icon = item.icon;

    const content = (
      <Link
        href={item.href}
        className={cn(
          "group relative flex items-center gap-3 px-3 py-2.5 rounded-xl",
          "font-medium text-sm transition-all duration-200 ease-out",
          "hover:bg-slate-100 dark:hover:bg-slate-800",
          "focus:outline-none focus:ring-2 focus:ring-indigo-500/20",
          isActive && "bg-gradient-to-r from-indigo-500/10 to-purple-500/10",
          isActive && "text-indigo-600 dark:text-indigo-400",
          isActive && "border-r-2 border-indigo-500",
          isActive && "shadow-sm",
          !isActive && "text-slate-600 dark:text-slate-400"
        )}
      >
        <Icon className={cn(
          "flex-shrink-0 w-5 h-5 transition-colors",
          isActive && "text-indigo-600 dark:text-indigo-400"
        )} />
        
        {!isCollapsed && (
          <>
            <span className="flex-1 truncate">{item.title}</span>
            {item.badge && (
              <Badge 
                variant={item.badge === 'Pro' ? 'default' : 'secondary'}
                className={cn(
                  "text-xs font-medium px-2 py-0.5",
                  item.badge === 'Hot' && "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
                  item.badge === 'Beta' && "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
                  item.badge === 'Web3' && "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
                  item.badge === 'Pro' && "bg-gradient-to-r from-indigo-500 to-purple-600 text-white"
                )}
              >
                {item.badge}
              </Badge>
            )}
          </>
        )}

        {/* Active indicator */}
        {isActive && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-indigo-500 rounded-r-full" />
        )}
      </Link>
    );

    if (isCollapsed) {
      return (
        <TooltipProvider>
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              {content}
            </TooltipTrigger>
            <TooltipContent side="right" className="flex items-center gap-2">
              {item.title}
              {item.badge && (
                <Badge variant="secondary" className="text-xs">
                  {item.badge}
                </Badge>
              )}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return content;
  };

  return (
    <div className={cn(
      "flex flex-col h-screen bg-white/80 dark:bg-slate-900/90",
      "backdrop-blur-xl border-r border-slate-200/80 dark:border-slate-800/80",
      "transition-all duration-300 ease-out",
      isCollapsed ? "w-16" : "w-64 lg:w-72",
      className
    )}>
      {/* Header */}
      <div className={cn(
        "flex items-center justify-between p-4",
        "border-b border-slate-200/50 dark:border-slate-800/50"
      )}>
        {!isCollapsed && (
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-8 h-8 rounded-lg",
              "bg-gradient-to-br from-indigo-500 to-purple-600",
              "flex items-center justify-center text-white font-bold text-sm",
              "shadow-lg shadow-indigo-500/25"
            )}>
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h1 className="font-display font-bold text-lg gradient-text">
                Engunity AI
              </h1>
            </div>
          </div>
        )}

        {/* Collapse toggle - desktop only */}
        <div className="flex items-center gap-1">
          {!isCollapsed && <ThemeToggle />}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={cn(
              "hidden lg:flex w-8 h-8 p-0",
              "hover:bg-slate-100 dark:hover:bg-slate-800",
              isCollapsed && "mx-auto"
            )}
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-1">
        {Object.entries(groupedItems).map(([groupKey, items]) => {
          const group = navigationGroups[groupKey as keyof typeof navigationGroups];
          if (!group) return null;
          
          return (
            <div key={groupKey} className="space-y-1">
              {group.showTitle && !isCollapsed && (
                <div className="px-3 py-2">
                  <h3 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    {group.title}
                  </h3>
                </div>
              )}
              
              {items.map((item) => (
                <NavItem key={item.href} item={item} isCollapsed={isCollapsed} />
              ))}
              
              {group.showTitle && <Separator className="my-4" />}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      {!isCollapsed && (
        <div className="p-4 border-t border-slate-200/50 dark:border-slate-800/50">
          <div className={cn(
            "p-3 rounded-xl",
            "bg-gradient-to-br from-indigo-50 to-purple-50",
            "dark:from-indigo-900/20 dark:to-purple-900/20",
            "border border-indigo-200/50 dark:border-indigo-800/50"
          )}>
            <div className="flex items-center gap-2 mb-2">
              <Crown className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                Pro Plan
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mb-3">
              Unlock advanced AI features and unlimited usage
            </p>
            <Button size="sm" className="w-full" variant="default">
              <Zap className="w-3 h-3 mr-1" />
              Upgrade
            </Button>
          </div>

          {/* Usage Stats */}
          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">API Calls</span>
              <span className="text-slate-600 dark:text-slate-300">847/1000</span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1">
              <div 
                className="bg-gradient-to-r from-indigo-500 to-purple-600 h-1 rounded-full" 
                style={{ width: '84.7%' }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}