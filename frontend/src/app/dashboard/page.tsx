'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/auth/supabase';
import { formatTimeUntilExpiry, getDaysUntilExpiry } from '@/lib/auth/persistence';
import { 
  FileText, 
  Code, 
  Brain, 
  MessageSquare, 
  TrendingUp, 
  Upload, 
  HelpCircle, 
  BarChart3, 
  Play,
  Clock,
  CheckCircle,
  AlertCircle,
  Crown,
  Zap,
  FileDown,
  Eye,
  ArrowUpRight,
  Bell,
  Lightbulb,
  Target,
  Users,
  Database,
  Sparkles,
  Activity,
  Settings,
  ChevronRight,
  MoreHorizontal,
  Star,
  Shield,
  Calendar,
  Globe,
  Headphones,
  Plus,
  BarChart4,
  PieChart,
  LineChart,
  FolderOpen,
  Store,
  Blocks,
  BookOpen,
  Briefcase,
  Github,
  Terminal,
  ChevronLeft
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';

// Professional Animation Variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.1,
      duration: 0.8,
      ease: [0.23, 1, 0.32, 1]
    },
  },
};

const itemVariants = {
  hidden: { 
    opacity: 0, 
    y: 24,
    scale: 0.98
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 380,
      damping: 28,
      mass: 0.6
    },
  },
};

// Default fallback data for when user data is loading
const fallbackStats = {
  documents: { value: 0, change: 0, trend: 'up' as const },
  codeGenerations: { value: 0, change: 0, trend: 'up' as const },
  aiQueries: { value: 0, change: 0, trend: 'up' as const },
  chatSessions: { value: 0, change: 0, trend: 'up' as const },
  insights: { value: 0, change: 0, trend: 'up' as const }
};

export default function DashboardPage() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [mounted, setMounted] = useState(false);
  const [scrollPosition, setScrollPosition] = useState(0);
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  
  // Get authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  
  // Check authentication on mount with persistent session support
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // First check if we have a stored login time and it's within 30 days
        const loginTime = localStorage.getItem('engunity-login-time');
        if (loginTime) {
          const daysSinceLogin = (Date.now() - parseInt(loginTime)) / (1000 * 60 * 60 * 24);
          console.log(`Days since last login: ${daysSinceLogin.toFixed(1)}`);
          
          if (daysSinceLogin > 30) {
            // More than 30 days, clear everything and require re-login
            localStorage.removeItem('engunity-auth-token');
            localStorage.removeItem('engunity-login-time');
            await supabase.auth.signOut();
            setIsAuthenticated(false);
            setDashboardLoading(false);
            return;
          }
        }

        // Get current session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Auth error:', error);
          setIsAuthenticated(false);
          setDashboardLoading(false);
          return;
        }

        if (session?.user) {
          console.log('✅ Valid session found, user authenticated');
          setIsAuthenticated(true);
          setUser({
            name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User',
            email: session.user.email,
            avatar: session.user.user_metadata?.avatar_url,
            plan: 'Pro',
            initials: (session.user.user_metadata?.full_name || session.user.email || 'U').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2),
            role: 'Developer',
            lastActive: 'Just now',
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
          });
          
          // Ensure login time is tracked
          if (!loginTime) {
            localStorage.setItem('engunity-login-time', Date.now().toString());
          }
        } else {
          console.log('❌ No valid session found');
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error('Authentication check failed:', error);
        setIsAuthenticated(false);
      } finally {
        setDashboardLoading(false);
      }
    };

    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔄 Auth state changed:', event, session?.user?.email);
      
      if (event === 'SIGNED_IN' && session?.user) {
        console.log('✅ User signed in');
        setIsAuthenticated(true);
        setUser({
          name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User',
          email: session.user.email,
          avatar: session.user.user_metadata?.avatar_url,
          plan: 'Pro',
          initials: (session.user.user_metadata?.full_name || session.user.email || 'U').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2),
          role: 'Developer',
          lastActive: 'Just now',
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        });
        
        // Track login time for 30-day persistence
        localStorage.setItem('engunity-login-time', Date.now().toString());
      } else if (event === 'SIGNED_OUT') {
        console.log('❌ User signed out');
        setIsAuthenticated(false);
        setUser(null);
        // Clear persistence tracking
        localStorage.removeItem('engunity-login-time');
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        console.log('🔄 Token refreshed');
        // Keep user logged in on token refresh
        setIsAuthenticated(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);
  
  useEffect(() => {
    setMounted(true);
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const getGreeting = () => {
    if (!mounted) return 'Welcome';
    const hour = currentTime.getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -400, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 400, behavior: 'smooth' });
    }
  };

  const handleScroll = () => {
    if (scrollContainerRef.current) {
      setScrollPosition(scrollContainerRef.current.scrollLeft);
    }
  };

  // Show loading state
  if (!mounted || dashboardLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto" />
          <p className="text-slate-600 text-lg">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  // Show sign in prompt if not authenticated
  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex items-center justify-center">
        <div className="text-center space-y-6 p-8">
          <h1 className="text-3xl font-bold text-slate-900">Welcome to Engunity AI</h1>
          <p className="text-slate-600 text-lg">Please sign in to access your dashboard</p>
          <button 
            onClick={() => window.location.href = '/auth/login'}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  // Use mock data for now
  const currentStats = fallbackStats;
  const currentActivity: any[] = [];
  const currentFiles: any[] = [];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
      case 'processed':
        return <CheckCircle className="w-4 h-4 text-emerald-600" />;
      case 'processing':
        return <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-slate-400" />;
    }
  };

  const getFileIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'pdf':
        return <FileText className="w-5 h-5 text-red-500" />;
      case 'docx':
        return <FileText className="w-5 h-5 text-blue-600" />;
      case 'xlsx':
        return <Database className="w-5 h-5 text-emerald-600" />;
      default:
        return <FileText className="w-5 h-5 text-slate-500" />;
    }
  };

  // Handle explicit sign out
  const handleSignOut = async () => {
    try {
      console.log('🚪 Signing out user...');
      await supabase.auth.signOut();
      // Clear persistent session data
      localStorage.removeItem('engunity-auth-token');
      localStorage.removeItem('engunity-login-time');
      // Redirect to login
      window.location.href = '/auth/login';
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  return (
    <TooltipProvider>
      {/* Main Container with Professional Layout */}
      <div className="min-h-screen bg-white">
        
        {/* Container with Max Width and Proper Padding */}
        <div className="max-w-[1800px] mx-auto px-6 lg:px-8 py-8">
          
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-8"
          >
            
            {/* Professional Header Section */}
            <motion.section variants={itemVariants}>
              <div className="bg-white rounded-3xl shadow-sm border border-slate-200/60 p-8 lg:p-10">
                <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-8">
                  
                  {/* User Info Section */}
                  <div className="flex items-center gap-6">
                    <div className="relative">
                      <Avatar className="w-20 h-20 ring-4 ring-blue-100 shadow-lg">
                        <AvatarImage src={user.avatar} alt={user.name} />
                        <AvatarFallback className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-bold text-xl">
                          {user.initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full border-3 border-white shadow-md flex items-center justify-center">
                        <div className="w-2 h-2 bg-white rounded-full" />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h1 className="text-3xl lg:text-4xl font-bold text-slate-900 tracking-tight">
                          {getGreeting()}, {user.name.split(' ')[0]} 👋
                        </h1>
                        <Badge className="bg-gradient-to-r from-violet-600 to-purple-600 text-white border-none px-3 py-1.5 text-sm font-semibold">
                          <Crown className="w-4 h-4 mr-1.5" />
                          {user.plan}
                        </Badge>
                      </div>
                      <p className="text-slate-600 text-lg font-medium">{user.role}</p>
                      <div className="flex items-center gap-4 text-sm text-slate-500">
                        <span className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                          {user.lastActive}
                        </span>
                        <span>•</span>
                        <span>{user.timezone}</span>
                        <span>•</span>
                        <span>{mounted ? currentTime.toLocaleDateString('en-US', { 
                          weekday: 'long', 
                          month: 'short', 
                          day: 'numeric' 
                        }) : 'Loading...'}</span>
                        <span>•</span>
                        <span className={`flex items-center gap-1 ${getDaysUntilExpiry() <= 3 ? 'text-amber-600' : 'text-slate-500'}`}>
                          <Shield className="w-3 h-3" />
                          {formatTimeUntilExpiry()}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button 
                      variant="outline" 
                      size="lg" 
                      className="border-slate-300 text-slate-700 hover:bg-slate-100 font-medium"
                      onClick={() => window.location.href = '/dashboard/settings'}
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      Settings
                    </Button>
                    <Button 
                      variant="outline" 
                      size="lg" 
                      className="border-red-300 text-red-700 hover:bg-red-50 font-medium"
                      onClick={handleSignOut}
                    >
                      <ArrowUpRight className="w-4 h-4 mr-2 rotate-90" />
                      Sign Out
                    </Button>
                    <Button 
                      size="lg" 
                      className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold shadow-lg"
                    >
                      <Headphones className="w-4 h-4 mr-2" />
                      Get Support
                    </Button>
                  </div>
                </div>
              </div>
            </motion.section>


            {/* Executive Overview Section */}
            <motion.section variants={itemVariants} className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl lg:text-3xl font-bold text-slate-900 mb-2">Executive Overview</h2>
                  <p className="text-slate-600 text-lg">Real-time insights into your AI-powered workflow</p>
                </div>
                <Button variant="ghost" className="text-slate-500 hover:text-slate-700 font-medium">
                  View Analytics <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
              
              {/* Statistics Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
                {[
                  { 
                    key: 'documents',
                    title: "Documents Processed", 
                    icon: FileText, 
                    color: "from-blue-600 to-blue-700",
                    bgGradient: "from-blue-50 via-blue-25 to-white"
                  },
                  { 
                    key: 'codeGenerations',
                    title: "Code Generated", 
                    icon: Code, 
                    color: "from-emerald-600 to-emerald-700",
                    bgGradient: "from-emerald-50 via-emerald-25 to-white"
                  },
                  { 
                    key: 'aiQueries',
                    title: "AI Queries", 
                    icon: Brain, 
                    color: "from-violet-600 to-violet-700",
                    bgGradient: "from-violet-50 via-violet-25 to-white"
                  },
                  { 
                    key: 'chatSessions',
                    title: "Chat Sessions", 
                    icon: MessageSquare, 
                    color: "from-amber-600 to-amber-700",
                    bgGradient: "from-amber-50 via-amber-25 to-white"
                  },
                  { 
                    key: 'insights',
                    title: "Insights Generated", 
                    icon: TrendingUp, 
                    color: "from-rose-600 to-rose-700",
                    bgGradient: "from-rose-50 via-rose-25 to-white"
                  }
                ].map((stat) => {
                  const data = currentStats[stat.key as keyof typeof currentStats];
                  return (
                    <motion.div
                      key={stat.title}
                      whileHover={{ y: -4, scale: 1.02 }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    >
                      <Card className={`bg-gradient-to-br ${stat.bgGradient} border-slate-200/60 shadow-lg hover:shadow-xl transition-all duration-300 h-full`}>
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between mb-4">
                            <div className={`p-3 rounded-2xl bg-gradient-to-br ${stat.color} shadow-lg`}>
                              <stat.icon className="w-6 h-6 text-white" />
                            </div>
                            <Badge 
                              variant="secondary" 
                              className="bg-emerald-100 text-emerald-800 border-emerald-200 font-semibold"
                            >
                              +{data.change}%
                            </Badge>
                          </div>
                          <div className="space-y-1">
                            <p className="text-slate-600 text-sm font-medium">{stat.title}</p>
                            <p className="text-3xl font-bold text-slate-900">{data.value.toLocaleString()}</p>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            </motion.section>

            {/* Quick Actions Section */}
            <motion.section variants={itemVariants} className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl lg:text-3xl font-bold text-slate-900 mb-2">Quick Actions</h2>
                  <p className="text-slate-600 text-lg">Streamlined access to your most-used features</p>
                </div>
                <Button variant="outline" className="text-slate-500 hover:text-slate-700 font-medium">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Custom
                </Button>
              </div>

              <div className="relative">
                {/* Left Scroll Button */}
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute left-0 top-1/2 -translate-y-1/2 z-10 rounded-full bg-white shadow-lg border-slate-300 hover:bg-slate-100 hover:border-slate-400"
                  onClick={scrollLeft}
                >
                  <ChevronLeft className="w-5 h-5 text-slate-700" />
                </Button>

                {/* Right Scroll Button */}
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute right-0 top-1/2 -translate-y-1/2 z-10 rounded-full bg-white shadow-lg border-slate-300 hover:bg-slate-100 hover:border-slate-400"
                  onClick={scrollRight}
                >
                  <ChevronRight className="w-5 h-5 text-slate-700" />
                </Button>

                {/* Scrollable Container */}
                <div
                  ref={scrollContainerRef}
                  onScroll={handleScroll}
                  className="overflow-x-auto scrollbar-hide px-12"
                  style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                  <div className="flex gap-6 pb-4" style={{ width: 'max-content' }}>
                  {[
                    { title: "Document Analysis", icon: Upload, color: "from-blue-600 to-cyan-600", description: "Process new files", link: "/dashboard/documents" },
                    { title: "Code and Chat Assistant", icon: MessageSquare, color: "from-violet-600 to-purple-600", description: "Get instant answers", link: "/dashboard/chatandcode" },
                    { title: "Research Analysis", icon: Brain, color: "from-emerald-600 to-teal-600", description: "Research solution", link: "/dashboard/research" },
                    { title: "Data Analysis", icon: BarChart3, color: "from-amber-600 to-orange-600", description: "Extract insights", link: "/dashboard/analysis" },
                    { title: "Github Repos", icon: Github, color: "from-rose-600 to-pink-600", description: "Repositories", link: "/dashboard/githubrepos" },
                    { title: "Projects", icon: FolderOpen, color: "from-indigo-600 to-blue-600", description: "Project analysis", link: "/dashboard/projects" },
                    { title: "Marketplace", icon: Store, color: "from-purple-600 to-pink-600", description: "Market reviews", link: "/dashboard/marketplace" },
                    { title: "Blockchain", icon: Blocks, color: "from-orange-600 to-red-600", description: "Smart contracts" },
                    { title: "Notebook", icon: BookOpen, color: "from-teal-600 to-emerald-600", description: "Python notebooks" },
                    { title: "Job Prep", icon: Briefcase, color: "from-slate-600 to-gray-600", description: "Job preparations" },
                    { title: "Code Editor", icon: Terminal, color: "from-cyan-600 to-blue-600", description: "Multi-language IDE", link: "/dashboard/editor" }
                  ].map((action) => (
                  <motion.div
                    key={action.title}
                    whileHover={{ y: -6, scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  >
                    <Card
                      className="bg-white border-slate-200/60 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer h-full flex-shrink-0"
                      style={{ width: '200px' }}
                      onClick={() => {
                        if (action.link) {
                          window.location.href = action.link;
                        }
                      }}
                    >
                      <CardContent className="p-6 flex flex-col items-center text-center space-y-4 h-full min-h-[180px] justify-center">
                        <div className={`p-4 rounded-3xl bg-gradient-to-br ${action.color} shadow-lg hover:shadow-xl transition-all duration-300`}>
                          <action.icon className="w-7 h-7 text-white" />
                        </div>
                        <div className="space-y-2">
                          <p className="text-slate-900 font-bold text-base">{action.title}</p>
                          <p className="text-slate-500 text-sm">{action.description}</p>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                  ))}
                  </div>
                </div>
              </div>
            </motion.section>

            {/* Main Dashboard Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
              
              {/* Recent Activity */}
              <motion.section variants={itemVariants} className="xl:col-span-4">
                <Card className="bg-white border-slate-200/60 shadow-lg h-full">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-slate-900 text-xl font-bold mb-1">Recent Activity</CardTitle>
                        <CardDescription className="text-slate-600">Latest AI interactions and processing</CardDescription>
                      </div>
                      <Button variant="ghost" size="sm" className="text-slate-500 hover:text-slate-700">
                        View All <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <ScrollArea className="h-[440px]">
                      <div className="px-6 pb-6 space-y-1">
                        {currentActivity.length > 0 ? currentActivity.map((activity, index) => (
                          <motion.div
                            key={activity.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="flex items-start gap-4 p-4 rounded-2xl hover:bg-slate-50 transition-colors duration-200 cursor-pointer group"
                          >
                            <div className="flex-shrink-0 mt-1">
                              {getStatusIcon(activity.status)}
                            </div>
                            <div className="flex-1 min-w-0 space-y-1">
                              <p className="text-slate-700 text-sm font-medium leading-relaxed">
                                <span className="text-slate-900 font-semibold">{activity.action}</span>{" "}
                                <span className="text-blue-700 font-semibold">{activity.item}</span>
                              </p>
                              <p className="text-slate-500 text-xs">{activity.time}</p>
                            </div>
                            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors opacity-0 group-hover:opacity-100" />
                          </motion.div>
                        )) : (
                          <div className="px-6 pb-6 flex items-center justify-center h-[400px] text-center">
                            <div className="space-y-4">
                              <Activity className="w-12 h-12 text-slate-300 mx-auto" />
                              <div className="space-y-2">
                                <p className="text-slate-500 font-medium">No recent activity</p>
                                <p className="text-slate-400 text-sm">Your AI interactions will appear here</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </motion.section>

              {/* Document Library */}
              <motion.section variants={itemVariants} className="xl:col-span-4">
                <Card className="bg-white border-slate-200/60 shadow-lg h-full">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-slate-900 text-xl font-bold mb-1">Document Library</CardTitle>
                        <CardDescription className="text-slate-600">Recently processed files</CardDescription>
                      </div>
                      <Button variant="ghost" size="sm" className="text-slate-500 hover:text-slate-700">
                        Browse All <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <ScrollArea className="h-[440px]">
                      <div className="px-6 pb-6 space-y-1">
                        {currentFiles.length > 0 ? currentFiles.map((file, index) => (
                          <motion.div
                            key={file.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="flex items-center gap-4 p-4 rounded-2xl hover:bg-slate-50 transition-colors duration-200 cursor-pointer group"
                          >
                            <div className="flex-shrink-0 p-3 bg-slate-100 rounded-xl group-hover:bg-slate-200 transition-colors">
                              {getFileIcon(file.type)}
                            </div>
                            <div className="flex-1 min-w-0 space-y-2">
                              <p className="text-slate-900 text-sm font-bold truncate">{file.name}</p>
                              <div className="flex items-center gap-2 text-xs">
                                <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-300">
                                  {file.category}
                                </Badge>
                                <span className="text-slate-500">{file.size}</span>
                                <span className="text-slate-400">•</span>
                                <span className="text-slate-500">{file.uploadedAt}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {getStatusIcon(file.status)}
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button variant="ghost" size="sm" className="w-8 h-8 p-0 text-slate-400 hover:text-blue-600">
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="sm" className="w-8 h-8 p-0 text-slate-400 hover:text-blue-600">
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </motion.div>
                        )) : (
                          <div className="px-6 pb-6 flex items-center justify-center h-[400px] text-center">
                            <div className="space-y-4">
                              <FileText className="w-12 h-12 text-slate-300 mx-auto" />
                              <div className="space-y-2">
                                <p className="text-slate-500 font-medium">No documents yet</p>
                                <p className="text-slate-400 text-sm">Upload files to see them here</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </motion.section>

              {/* Right Sidebar - Account & System Info */}
              <motion.section variants={itemVariants} className="xl:col-span-4 space-y-6">
                
                {/* Enterprise Plan Card */}
                <Card className="bg-gradient-to-br from-violet-50 via-white to-purple-50/50 border-violet-200/60 shadow-lg">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-gradient-to-br from-violet-600 to-purple-600 shadow-lg">
                          <Crown className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <CardTitle className="text-slate-900 text-lg font-bold">{user.plan} Plan</CardTitle>
                          <CardDescription className="text-slate-600">Premium AI Access</CardDescription>
                        </div>
                      </div>
                      <Badge className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white">
                        <Star className="w-3 h-3 mr-1" />
                        Active
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 bg-white/60 rounded-xl">
                        <div className="text-2xl font-bold text-slate-900">∞</div>
                        <div className="text-xs text-slate-600 font-medium">Queries</div>
                      </div>
                      <div className="text-center p-4 bg-white/60 rounded-xl">
                        <div className="text-2xl font-bold text-slate-900">50GB</div>
                        <div className="text-xs text-slate-600 font-medium">Storage</div>
                      </div>
                    </div>
                    
                    <Separator className="bg-violet-200" />
                    
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-600">Next billing</span>
                        <span className="text-slate-900 font-semibold">Jan 15, 2025</span>
                      </div>
                      <Button className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white font-semibold">
                        <Shield className="w-4 h-4 mr-2" />
                        Manage Subscription
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* System Status */}
                <Card className="bg-gradient-to-br from-emerald-50 via-white to-teal-50/50 border-emerald-200/60 shadow-lg">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-slate-900 text-lg font-bold flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-600 shadow-lg">
                        <Activity className="w-5 h-5 text-white" />
                      </div>
                      System Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {[
                      { service: 'AI Models', status: 'Operational', uptime: '99.99%' },
                      { service: 'Document Processing', status: 'Operational', uptime: '99.95%' },
                      { service: 'Code Generation', status: 'Operational', uptime: '99.97%' }
                    ].map((item) => (
                      <div key={item.service} className="flex items-center justify-between p-3 bg-white/60 rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" />
                          <span className="text-slate-700 font-semibold text-sm">{item.service}</span>
                        </div>
                        <div className="text-right">
                          <div className="text-emerald-700 font-bold text-xs">{item.status}</div>
                          <div className="text-slate-500 text-xs">{item.uptime}</div>
                        </div>
                      </div>
                    ))}
                    
                    <div className="flex items-center justify-center p-4 bg-emerald-100/60 rounded-xl mt-4">
                      <span className="text-emerald-800 font-bold text-sm">All Systems Operational</span>
                    </div>
                  </CardContent>
                </Card>
              </motion.section>
            </div>
          </motion.div>
        </div>
      </div>
    </TooltipProvider>
  );
}