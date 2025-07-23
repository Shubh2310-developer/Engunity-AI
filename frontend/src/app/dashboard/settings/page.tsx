'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  User,
  Lock,
  CreditCard,
  Settings2,
  Activity,
  Camera,
  Key,
  Shield,
  Crown,
  Moon,
  Sun,
  Monitor,
  Upload,
  MessageSquare,
  Bell,
  Globe,
  Zap,
  Clock,
  Eye,
  EyeOff,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle,
  Headphones
} from 'lucide-react';
import { useUser, useAuth } from '@/contexts/UserContext';
import { useEnhancedSettings, useThemeSettings, useChatSettings, useDocumentSettings, useNotificationSettings } from '@/contexts/EnhancedSettingsContext';
import { supabase } from '@/lib/auth/supabase';
import { uploadAvatar } from '@/lib/firebase/storage';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { 
    opacity: 0, 
    y: 20,
    scale: 0.98
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 25,
    },
  },
};

// Helper function to get plan limits based on user plan
const getPlanLimits = (plan: string) => {
  switch (plan) {
    case 'Enterprise':
      return { documents: 500, aiQueries: 2000, storage: 200 };
    case 'Pro':
      return { documents: 200, aiQueries: 1000, storage: 100 };
    default:
      return { documents: 50, aiQueries: 200, storage: 10 };
  }
};

export default function SettingsPage() {
  // Try to get user context but don't depend on it entirely
  let user: any = null;
  let profile: any = null;
  let updateProfile: any = null;
  let userLoading: boolean = false;
  let userError: any = null;
  let signOut = () => {};
  
  try {
    const userContext = useUser();
    const authContext = useAuth();
    user = userContext.user;
    profile = userContext.profile;
    updateProfile = userContext.updateProfile;
    userLoading = userContext.loading;
    userError = userContext.error;
    signOut = authContext.signOut;
  } catch (error) {
    console.log('UserContext not available, running in standalone mode');
    userLoading = false;
    userError = null;
  }
  
  // Enhanced settings contexts
  const { 
    settings, 
    updateSettings, 
    isLoading: settingsLoading, 
    error: settingsError,
    isOnline,
    lastSyncTime 
  } = useEnhancedSettings();
  
  // Specialized settings hooks
  const { theme, isDarkMode, toggleTheme, compactMode, setCompactMode } = useThemeSettings();
  const { 
    autoSave: chatAutoSave, 
    setAutoSave: setChatAutoSave,
    messageHistory,
    setMessageHistory,
    soundNotifications,
    setSoundNotifications
  } = useChatSettings();
  const {
    autoSync: docAutoSync,
    setAutoSync: setDocAutoSync,
    versionHistory,
    setVersionHistory,
    defaultPrivacy,
    setDefaultPrivacy
  } = useDocumentSettings();
  const {
    emailNotifications,
    pushNotifications,
    marketingEmails,
    setEmailNotifications,
    setPushNotifications,
    setMarketingEmails
  } = useNotificationSettings();
  
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [activities, setActivities] = useState<any[]>([]);
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const [directAuthUser, setDirectAuthUser] = useState<any>(null);
  const [authChecked, setAuthChecked] = useState(false);
  
  // Form states
  const [profileForm, setProfileForm] = useState({
    fullName: profile?.name || '',
    email: user?.email || '',
    bio: '',
  });
  
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  
  const [localPreferences, setLocalPreferences] = useState({
    theme: settings.theme,
    aiAssistantStyle: settings.aiAssistantStyle,
    documentPrivacy: settings.documentPrivacy,
    emailNotifications: settings.emailNotifications,
    pushNotifications: settings.pushNotifications,
    marketingEmails: settings.marketingEmails,
    compactMode: settings.compactMode,
    autoSave: settings.autoSave,
    soundEffects: settings.soundEffects,
  });

  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    setMounted(true);
    
    // Set a timeout to show content even if loading takes too long
    const timeout = setTimeout(() => {
      setLoadingTimeout(true);
    }, 5000); // 5 second timeout

    // Direct Supabase auth check as fallback
    const checkDirectAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setDirectAuthUser(session.user);
        }
      } catch (error) {
        console.log('Direct auth check failed:', error);
      } finally {
        setAuthChecked(true);
      }
    };

    checkDirectAuth();
    
    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    // Update form data when profile is loaded
    if (profile) {
      setProfileForm({
        fullName: profile.name || '',
        email: user?.email || '',
        bio: '',
      });
    }
    
    // Update local preferences when settings change
    setLocalPreferences({
      theme: settings.theme,
      aiAssistantStyle: settings.aiAssistantStyle,
      documentPrivacy: settings.documentPrivacy,
      emailNotifications: settings.emailNotifications,
      pushNotifications: settings.pushNotifications,
      marketingEmails: settings.marketingEmails,
      compactMode: settings.compactMode,
      autoSave: settings.autoSave,
      soundEffects: settings.soundEffects,
    });
  }, [profile, user, settings]);

  useEffect(() => {
    // Load user activities from Firebase
    const loadActivities = async () => {
      if (user?.id) {
        try {
          const { ActivityService } = await import('@/lib/firebase/firestore');
          const userActivities = await ActivityService.getUserActivities(user.id, 10);
          setActivities(userActivities);
        } catch (error) {
          console.error('Error loading activities:', error);
        }
      }
    };

    loadActivities();
  }, [user?.id]);

  const handleSaveProfile = async () => {
    setIsLoading(true);
    try {
      if (updateProfile && user) {
        await updateProfile({
          name: profileForm.fullName,
          bio: profileForm.bio,
        });
        setSuccessMessage('Profile updated successfully!');
      } else {
        // Save to localStorage as fallback
        const profileData = {
          name: profileForm.fullName,
          email: profileForm.email,
          bio: profileForm.bio,
        };
        localStorage.setItem('userProfile', JSON.stringify(profileData));
        setSuccessMessage('Profile updated successfully!');
      }
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      setErrorMessage('Failed to update profile. Please try again.');
      setTimeout(() => setErrorMessage(''), 3000);
    }
    setIsLoading(false);
  };

  const handleChangePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setErrorMessage('New passwords do not match.');
      setTimeout(() => setErrorMessage(''), 3000);
      return;
    }
    
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordForm.newPassword
      });
      
      if (error) throw error;
      
      setSuccessMessage('Password changed successfully!');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error: any) {
      setErrorMessage(error.message || 'Failed to change password. Please try again.');
      setTimeout(() => setErrorMessage(''), 3000);
    }
    setIsLoading(false);
  };


  // Avatar upload function using Firebase Storage
  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !fallbackUser) return;

    setUploadingAvatar(true);
    try {
      if (user && updateProfile) {
        // Upload avatar using Firebase storage service
        const result = await uploadAvatar(user.id, file, {
          onProgress: (progress) => {
            // You can add a progress indicator here if needed
            console.log(`Upload progress: ${progress}%`);
          }
        });
        
        if (!result.success) {
          throw new Error(result.error || 'Upload failed');
        }
        
        // Update user profile with new avatar URL
        if (result.url) {
          await updateProfile({ avatar: result.url });
        }
        
        setSuccessMessage('Avatar updated successfully!');
      } else {
        // Save avatar URL to localStorage as fallback
        const avatarData = { avatar: URL.createObjectURL(file) };
        localStorage.setItem('userAvatar', JSON.stringify(avatarData));
        setSuccessMessage('Avatar updated successfully!');
      }
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error: any) {
      setErrorMessage(error.message || 'Failed to upload avatar. Please try again.');
      setTimeout(() => setErrorMessage(''), 3000);
    }
    setUploadingAvatar(false);
  };

  const formatDate = (dateString: string | any) => {
    if (!mounted) return '';
    
    let date: Date;
    if (typeof dateString === 'string') {
      date = new Date(dateString);
    } else if (dateString && typeof dateString.toDate === 'function') {
      // Firebase Timestamp
      date = dateString.toDate();
    } else if (dateString && dateString.seconds) {
      // Firebase Timestamp object
      date = new Date(dateString.seconds * 1000);
    } else {
      return '';
    }
    
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'profile': return <User className="w-4 h-4 text-blue-600" />;
      case 'upload': return <Upload className="w-4 h-4 text-green-600" />;
      case 'security': return <Shield className="w-4 h-4 text-red-600" />;
      case 'ai': return <MessageSquare className="w-4 h-4 text-violet-600" />;
      case 'subscription': return <CreditCard className="w-4 h-4 text-amber-600" />;
      case 'preference': return <Settings2 className="w-4 h-4 text-gray-700" />;
      default: return <Activity className="w-4 h-4 text-gray-700" />;
    }
  };

  // Show loading state if user data is still loading (with timeout)
  if ((userLoading && !loadingTimeout && !authChecked) || (!user && !directAuthUser && !userError && !loadingTimeout && !authChecked)) {
    return (
      <div className="min-h-full bg-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-700">Loading your settings...</p>
        </div>
      </div>
    );
  }

  // Show error state if there's an authentication error
  if (userError || (!user && !directAuthUser && loadingTimeout && authChecked)) {
    return (
      <div className="min-h-full bg-white flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Authentication Error</h2>
          <p className="text-gray-700 mb-4">
            {userError || 'Unable to load user data. Please try refreshing the page or logging in again.'}
          </p>
          <div className="flex gap-3 justify-center">
            <Button onClick={() => window.location.reload()} variant="outline">
              Refresh Page
            </Button>
            <Button onClick={() => window.location.href = '/auth/login'}>
              Login Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Provide fallback user data if profile is not fully loaded
  const fallbackUser = user || directAuthUser || {
    id: 'guest-user',
    email: 'guest@example.com',
    name: 'Guest User',
    avatar: undefined
  };

  const fallbackProfile = profile || {
    id: fallbackUser.id,
    name: fallbackUser.name || 'Guest User',
    email: fallbackUser.email,
    avatar: undefined,
    initials: (fallbackUser.name || 'Guest User').split(' ').map((n: string) => n[0]).join('').toUpperCase(),
    plan: 'Free' as const,
    usage: {
      documentsProcessed: 0,
      aiQueries: 0,
      insights: 0,
      codeGenerations: 0,
      chatSessions: 0
    },
    preferences: {
      theme: 'system' as const,
      notifications: true,
      language: 'en'
    },
    subscription: {
      status: 'active' as const,
      plan: 'Free',
      nextBilling: undefined,
      features: ['Basic Support', 'Limited Storage', 'Standard AI Models']
    },
    createdAt: { seconds: Date.now() / 1000 } as any,
    lastActive: { seconds: Date.now() / 1000 } as any
  };

  const planLimits = getPlanLimits(fallbackProfile.plan);
  const usage = fallbackProfile.usage;

  return (
    <div className="min-h-full bg-white">
      <div className="max-w-6xl mx-auto p-6 lg:p-8">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-8"
        >
          
          {/* Auth Status Alert */}
          {authChecked && !user && !directAuthUser && (
            <motion.div variants={itemVariants}>
              <Alert className="bg-amber-50 border-amber-200">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800">
                  You're not logged in. Some features may have limited functionality. Please log in for full access.
                </AlertDescription>
              </Alert>
            </motion.div>
          )}
          
          {/* Success case - show when we have either user or directAuthUser */}
          {(user || directAuthUser) && (
            <motion.div variants={itemVariants}>
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  Welcome back, {fallbackUser.email || fallbackUser.name || 'User'}! Your settings are loaded and ready to customize.
                </AlertDescription>
              </Alert>
            </motion.div>
          )}

          {/* Debug Info in Development */}
          {process.env.NODE_ENV === 'development' && (
            <motion.div variants={itemVariants}>
              <Alert className="bg-blue-50 border-blue-200">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800 text-xs">
                  <strong>Debug Info:</strong> 
                  Context User: {user ? '✓' : '✗'} | 
                  Direct Auth: {directAuthUser ? '✓' : '✗'} | 
                  Auth Checked: {authChecked ? '✓' : '✗'} | 
                  Loading: {userLoading ? '✓' : '✗'} | 
                  Error: {userError ? userError : 'None'} | 
                  Settings Loading: {settingsLoading ? '✓' : '✗'} | 
                  Settings Error: {settingsError ? settingsError : 'None'} | 
                  Online: {isOnline ? '✓' : '✗'} | 
                  Last Sync: {lastSyncTime ? lastSyncTime.toLocaleTimeString() : 'Never'}
                </AlertDescription>
              </Alert>
            </motion.div>
          )}
          
          {/* Header Section */}
          <motion.div variants={itemVariants} className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-lg">
                  <Settings2 className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold text-gray-900">Account Settings</h1>
                  <p className="text-gray-700 text-lg">Manage your profile, security, and preferences</p>
                </div>
              </div>
              
              {/* Sync Status Indicator */}
              <div className="flex items-center gap-2 text-sm">
                <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-gray-600">
                  {isOnline ? 'Online' : 'Offline'}
                </span>
                {lastSyncTime && (
                  <span className="text-gray-500">
                    • Last sync: {lastSyncTime.toLocaleTimeString()}
                  </span>
                )}
              </div>
            </div>
            
            {/* Success/Error Messages */}
            {successMessage && (
              <Alert className="bg-emerald-50 border-emerald-200">
                <CheckCircle className="h-4 w-4 text-emerald-600" />
                <AlertDescription className="text-emerald-800">{successMessage}</AlertDescription>
              </Alert>
            )}
            
            {errorMessage && (
              <Alert className="bg-red-50 border-red-200">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">{errorMessage}</AlertDescription>
              </Alert>
            )}
          </motion.div>

          {/* Settings Tabs */}
          <motion.div variants={itemVariants}>
            <Tabs defaultValue="profile" className="space-y-8">
              <TabsList className="grid w-full grid-cols-5 lg:w-max bg-slate-100 p-1 rounded-2xl">
                <TabsTrigger value="profile" className="flex items-center gap-2 px-6 py-3 rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  <User className="w-4 h-4" />
                  <span className="hidden sm:inline">Profile</span>
                </TabsTrigger>
                <TabsTrigger value="security" className="flex items-center gap-2 px-6 py-3 rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  <Lock className="w-4 h-4" />
                  <span className="hidden sm:inline">Security</span>
                </TabsTrigger>
                <TabsTrigger value="subscription" className="flex items-center gap-2 px-6 py-3 rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  <CreditCard className="w-4 h-4" />
                  <span className="hidden sm:inline">Plan</span>
                </TabsTrigger>
                <TabsTrigger value="preferences" className="flex items-center gap-2 px-6 py-3 rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  <Settings2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Preferences</span>
                </TabsTrigger>
                <TabsTrigger value="activity" className="flex items-center gap-2 px-6 py-3 rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  <Activity className="w-4 h-4" />
                  <span className="hidden sm:inline">Activity</span>
                </TabsTrigger>
              </TabsList>

              {/* Profile Settings */}
              <TabsContent value="profile" className="space-y-6">
                <Card className="bg-white border border-slate-200 shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3 text-xl">
                      <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600">
                        <User className="w-5 h-5 text-white" />
                      </div>
                      Profile Information
                    </CardTitle>
                    <CardDescription>
                      Update your personal information and profile picture
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    
                    {/* Avatar Section */}
                    <div className="flex items-center gap-6">
                      <div className="relative">
                        <Avatar className="w-24 h-24 ring-4 ring-blue-100 shadow-lg">
                          <AvatarImage src={fallbackProfile.avatar || fallbackUser.avatar} alt={fallbackProfile.name || fallbackUser.name} />
                          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold text-xl">
                            {(fallbackProfile?.initials || fallbackUser?.name?.charAt(0)?.toUpperCase() || 'U')}
                          </AvatarFallback>
                        </Avatar>
                        <div className="absolute -bottom-1 -right-1">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleAvatarUpload}
                            className="hidden"
                            id="avatar-upload"
                            disabled={uploadingAvatar}
                          />
                          <Button
                            size="sm"
                            className="rounded-full w-8 h-8 p-0 bg-blue-600 hover:bg-blue-700 shadow-lg"
                            onClick={() => document.getElementById('avatar-upload')?.click()}
                            disabled={uploadingAvatar}
                          >
                            {uploadingAvatar ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Camera className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <h3 className="font-semibold text-gray-900">Profile Picture</h3>
                        <p className="text-sm text-gray-700">JPG, GIF or PNG. Max size 2MB.</p>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => document.getElementById('avatar-upload')?.click()}
                            disabled={uploadingAvatar}
                          >
                            <Upload className="w-4 h-4 mr-2" />
                            {uploadingAvatar ? 'Uploading...' : 'Upload new'}
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-red-600 hover:text-red-700"
                            onClick={() => updateProfile({ avatar: '' })}
                            disabled={uploadingAvatar}
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Profile Form */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="fullName">Full Name</Label>
                        <Input
                          id="fullName"
                          value={profileForm.fullName}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setProfileForm(prev => ({ ...prev, fullName: e.target.value }))}
                          className="bg-white border-gray-300 text-gray-900"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email Address</Label>
                        <Input
                          id="email"
                          type="email"
                          value={profileForm.email}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setProfileForm(prev => ({ ...prev, email: e.target.value }))}
                          className="bg-gray-100 border-gray-300 text-gray-700"
                          disabled
                        />
                        <p className="text-xs text-gray-600">Contact support to change your email</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="bio">Bio</Label>
                      <Textarea
                        id="bio"
                        placeholder="Tell us a bit about yourself..."
                        value={profileForm.bio}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setProfileForm(prev => ({ ...prev, bio: e.target.value }))}
                        className="bg-white border-slate-300 min-h-[100px]"
                      />
                    </div>

                    <div className="flex justify-end">
                      <Button 
                        onClick={handleSaveProfile}
                        disabled={isLoading}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4 mr-2" />
                            Save Changes
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Security Settings */}
              <TabsContent value="security" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  
                  {/* Change Password */}
                  <Card className="bg-white border border-slate-200 shadow-lg">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-gradient-to-br from-red-500 to-red-600">
                          <Key className="w-5 h-5 text-white" />
                        </div>
                        Change Password
                      </CardTitle>
                      <CardDescription>
                        Update your password to keep your account secure
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="currentPassword">Current Password</Label>
                        <div className="relative">
                          <Input
                            id="currentPassword"
                            type={showPassword ? "text" : "password"}
                            value={passwordForm.currentPassword}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                            className="bg-white border-slate-300 pr-10"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="newPassword">New Password</Label>
                        <div className="relative">
                          <Input
                            id="newPassword"
                            type={showNewPassword ? "text" : "password"}
                            value={passwordForm.newPassword}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                            className="bg-white border-slate-300 pr-10"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                          >
                            {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirm New Password</Label>
                        <div className="relative">
                          <Input
                            id="confirmPassword"
                            type={showConfirmPassword ? "text" : "password"}
                            value={passwordForm.confirmPassword}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                            className="bg-white border-slate-300 pr-10"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          >
                            {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </Button>
                        </div>
                      </div>

                      <Button 
                        onClick={handleChangePassword}
                        disabled={isLoading}
                        className="w-full bg-red-600 hover:bg-red-700"
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Updating...
                          </>
                        ) : (
                          <>
                            <Shield className="w-4 h-4 mr-2" />
                            Update Password
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Account Security */}
                  <Card className="bg-white border border-slate-200 shadow-lg">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600">
                          <Shield className="w-5 h-5 text-white" />
                        </div>
                        Account Security
                      </CardTitle>
                      <CardDescription>
                        Monitor your account security and recent activity
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                        <div className="flex items-center gap-3">
                          <CheckCircle className="w-5 h-5 text-emerald-600" />
                          <span className="font-medium text-emerald-800">Account Verified</span>
                        </div>
                        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300">
                          Secure
                        </Badge>
                      </div>

                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-700">Last login</span>
                          <span className="text-sm font-medium text-gray-900">
                            {formatDate(fallbackProfile.lastActive)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-700">Account created</span>
                          <span className="text-sm font-medium text-gray-900">
                            {formatDate(fallbackProfile.createdAt)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-700">Email</span>
                          <span className="text-sm font-medium text-gray-900">
                            {fallbackUser.email}
                          </span>
                        </div>
                      </div>

                      <Separator />

                      <div className="space-y-3">
                        <h4 className="font-medium text-gray-900">Two-Factor Authentication</h4>
                        <p className="text-sm text-gray-700">Add an extra layer of security to your account</p>
                        <Button variant="outline" className="w-full">
                          <Lock className="w-4 h-4 mr-2" />
                          Enable 2FA
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Subscription & Plan */}
              <TabsContent value="subscription" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* Current Plan */}
                  <Card className="lg:col-span-2 bg-white border border-slate-200 shadow-lg">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-gradient-to-br from-violet-600 to-purple-600">
                          <Crown className="w-5 h-5 text-white" />
                        </div>
                        Current Plan: {fallbackProfile.plan}
                      </CardTitle>
                      <CardDescription>
                        Manage your subscription and billing settings
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      
                      {/* Usage Statistics */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-4 bg-white/60 rounded-xl border border-violet-200/50">
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-sm text-gray-700">Documents</span>
                            <span className="text-sm font-semibold text-violet-700">
                              {usage.documentsProcessed}/{planLimits.documents}
                            </span>
                          </div>
                          <Progress 
                            value={(usage.documentsProcessed / planLimits.documents) * 100} 
                            className="h-2 bg-slate-200"
                          />
                        </div>
                        
                        <div className="p-4 bg-white/60 rounded-xl border border-violet-200/50">
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-sm text-gray-700">AI Queries</span>
                            <span className="text-sm font-semibold text-violet-700">
                              {usage.aiQueries}/{planLimits.aiQueries}
                            </span>
                          </div>
                          <Progress 
                            value={(usage.aiQueries / planLimits.aiQueries) * 100} 
                            className="h-2 bg-slate-200"
                          />
                        </div>
                        
                        <div className="p-4 bg-white/60 rounded-xl border border-violet-200/50">
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-sm text-gray-700">Storage</span>
                            <span className="text-sm font-semibold text-violet-700">
                              {((usage.documentsProcessed * 2.5) / 1024).toFixed(1)}GB/{planLimits.storage}GB
                            </span>
                          </div>
                          <Progress 
                            value={((usage.documentsProcessed * 2.5) / 1024 / planLimits.storage) * 100} 
                            className="h-2 bg-slate-200"
                          />
                        </div>
                      </div>

                      <Separator />

                      {/* Billing Info */}
                      <div className="space-y-4">
                        <h4 className="font-semibold text-gray-900">Billing Information</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-700">Plan</span>
                            <span className="font-medium text-gray-900">{fallbackProfile.plan}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-700">Status</span>
                            <span className="font-medium text-gray-900">
                              {fallbackProfile.subscription?.status || 'Active'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-700">Next Billing</span>
                            <span className="font-medium text-gray-900">
                              {fallbackProfile.subscription?.nextBilling ? formatDate(fallbackProfile.subscription.nextBilling) : 'N/A'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-700">Features</span>
                            <span className="font-medium text-gray-900">
                              {fallbackProfile.subscription?.features?.length || 3} enabled
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <Button className="bg-violet-600 hover:bg-violet-700">
                          <Zap className="w-4 h-4 mr-2" />
                          Upgrade Plan
                        </Button>
                        <Button variant="outline">
                          <CreditCard className="w-4 h-4 mr-2" />
                          Billing History
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Plan Features */}
                  <Card className="bg-white border border-slate-200 shadow-lg">
                    <CardHeader>
                      <CardTitle className="text-lg">Plan Features</CardTitle>
                      <CardDescription>What's included in your plan</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {[
                        'Unlimited AI queries',
                        'Advanced document processing',
                        'Priority support',
                        '50GB cloud storage',
                        'Team collaboration',
                        'API access'
                      ].map((feature, index) => (
                        <div key={index} className="flex items-center gap-3">
                          <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                          <span className="text-sm text-gray-800">{feature}</span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Preferences */}
              <TabsContent value="preferences" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  
                  {/* Appearance Settings */}
                  <Card className="bg-white border border-slate-200 shadow-lg">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600">
                          <Monitor className="w-5 h-5 text-white" />
                        </div>
                        Appearance
                      </CardTitle>
                      <CardDescription>
                        Customize your app appearance and theme
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-4">
                        <div className="space-y-3">
                          <Label htmlFor="theme">Theme</Label>
                          <Select value={theme} onValueChange={async (value: 'light' | 'dark' | 'system') => {
                            console.log('🎨 Changing theme to:', value);
                            setLocalPreferences(prev => ({ ...prev, theme: value }));
                            try {
                              await updateSettings({ theme: value });
                              console.log('✅ Theme updated successfully');
                            } catch (error) {
                              console.error('❌ Failed to update theme:', error);
                              setErrorMessage('Failed to save theme setting. Please try again.');
                              setTimeout(() => setErrorMessage(''), 3000);
                            }
                          }}>
                            <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="light">
                                <div className="flex items-center gap-2">
                                  <Sun className="w-4 h-4" />
                                  Light
                                </div>
                              </SelectItem>
                              <SelectItem value="dark">
                                <div className="flex items-center gap-2">
                                  <Moon className="w-4 h-4" />
                                  Dark
                                </div>
                              </SelectItem>
                              <SelectItem value="system">
                                <div className="flex items-center gap-2">
                                  <Monitor className="w-4 h-4" />
                                  System
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-3">
                          <Label htmlFor="aiStyle">AI Assistant Style</Label>
                          <Select value={settings.aiAssistantStyle} onValueChange={async (value: 'professional' | 'friendly' | 'technical' | 'creative') => {
                            console.log('🤖 Changing AI style to:', value);
                            setLocalPreferences(prev => ({ ...prev, aiAssistantStyle: value }));
                            try {
                              await updateSettings({ aiAssistantStyle: value });
                              console.log('✅ AI style updated successfully');
                            } catch (error) {
                              console.error('❌ Failed to update AI style:', error);
                              setErrorMessage('Failed to save AI assistant style. Please try again.');
                              setTimeout(() => setErrorMessage(''), 3000);
                            }
                          }}>
                            <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="professional">Professional</SelectItem>
                              <SelectItem value="friendly">Friendly</SelectItem>
                              <SelectItem value="technical">Technical</SelectItem>
                              <SelectItem value="creative">Creative</SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-gray-600">
                            This affects how the AI assistant responds to your queries
                          </p>
                        </div>
                      </div>

                      <Separator />

                      <div className="space-y-4">
                        <h4 className="font-medium text-gray-900">Default Settings</h4>
                        
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <Label>Document Privacy</Label>
                            <p className="text-xs text-gray-600">Default privacy setting for new documents</p>
                          </div>
                          <Switch
                            checked={defaultPrivacy === 'private'}
                            onCheckedChange={(checked: boolean) => {
                              const newPrivacy = checked ? 'private' : 'public';
                              setDefaultPrivacy(newPrivacy as any);
                            }}
                          />
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <Label>Compact Mode</Label>
                            <p className="text-xs text-gray-600">Use a more compact interface layout</p>
                          </div>
                          <Switch
                            checked={compactMode}
                            onCheckedChange={setCompactMode}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Notification Settings */}
                  <Card className="bg-white border border-slate-200 shadow-lg">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600">
                          <Bell className="w-5 h-5 text-white" />
                        </div>
                        Notifications
                      </CardTitle>
                      <CardDescription>
                        Configure how you receive notifications
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <Label>Email Notifications</Label>
                            <p className="text-xs text-gray-600">Receive notifications via email</p>
                          </div>
                          <Switch
                            checked={emailNotifications}
                            onCheckedChange={async (checked: boolean) => {
                              console.log('📧 Changing email notifications to:', checked);
                              try {
                                await setEmailNotifications(checked);
                                console.log('✅ Email notifications updated successfully');
                              } catch (error) {
                                console.error('❌ Failed to update email notifications:', error);
                                setErrorMessage('Failed to save notification setting. Please try again.');
                                setTimeout(() => setErrorMessage(''), 3000);
                              }
                            }}
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <Label>Push Notifications</Label>
                            <p className="text-xs text-gray-600">Receive browser push notifications</p>
                          </div>
                          <Switch
                            checked={pushNotifications}
                            onCheckedChange={async (checked: boolean) => {
                              console.log('🔔 Changing push notifications to:', checked);
                              try {
                                await setPushNotifications(checked);
                                console.log('✅ Push notifications updated successfully');
                              } catch (error) {
                                console.error('❌ Failed to update push notifications:', error);
                                setErrorMessage('Failed to save notification setting. Please try again.');
                                setTimeout(() => setErrorMessage(''), 3000);
                              }
                            }}
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <Label>Marketing Emails</Label>
                            <p className="text-xs text-gray-600">Receive product updates and tips</p>
                          </div>
                          <Switch
                            checked={marketingEmails}
                            onCheckedChange={async (checked: boolean) => {
                              console.log('📬 Changing marketing emails to:', checked);
                              try {
                                await setMarketingEmails(checked);
                                console.log('✅ Marketing emails updated successfully');
                              } catch (error) {
                                console.error('❌ Failed to update marketing emails:', error);
                                setErrorMessage('Failed to save notification setting. Please try again.');
                                setTimeout(() => setErrorMessage(''), 3000);
                              }
                            }}
                          />
                        </div>
                        
                        {/* Chat Settings */}
                        <Separator />
                        <h4 className="font-medium text-gray-900">Chat Settings</h4>
                        
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <Label>Auto-save Messages</Label>
                            <p className="text-xs text-gray-600">Automatically save chat messages</p>
                          </div>
                          <Switch
                            checked={chatAutoSave}
                            onCheckedChange={setChatAutoSave}
                          />
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <Label>Message History</Label>
                            <p className="text-xs text-gray-600">Keep message history across sessions</p>
                          </div>
                          <Switch
                            checked={messageHistory}
                            onCheckedChange={setMessageHistory}
                          />
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <Label>Sound Notifications</Label>
                            <p className="text-xs text-gray-600">Play sounds for new messages</p>
                          </div>
                          <Switch
                            checked={soundNotifications}
                            onCheckedChange={setSoundNotifications}
                          />
                        </div>
                        
                        {/* Document Settings */}
                        <Separator />
                        <h4 className="font-medium text-gray-900">Document Settings</h4>
                        
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <Label>Auto-sync Documents</Label>
                            <p className="text-xs text-gray-600">Automatically sync document changes</p>
                          </div>
                          <Switch
                            checked={docAutoSync}
                            onCheckedChange={setDocAutoSync}
                          />
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <Label>Version History</Label>
                            <p className="text-xs text-gray-600">Keep document version history</p>
                          </div>
                          <Switch
                            checked={versionHistory}
                            onCheckedChange={setVersionHistory}
                          />
                        </div>
                      </div>

                      <Separator />

                      <div className="space-y-4">
                        <h4 className="font-medium text-gray-900">Notification Types</h4>
                        <div className="space-y-3 text-sm">
                          {[
                            'Document processing complete',
                            'AI query responses',
                            'Account security alerts',
                            'Subscription updates',
                            'System maintenance'
                          ].map((type, index) => (
                            <div key={index} className="flex items-center gap-3">
                              <CheckCircle className="w-4 h-4 text-emerald-600" />
                              <span className="text-gray-800">{type}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="p-4 bg-green-50 rounded-xl border border-green-200 text-center">
                        <div className="flex items-center justify-center gap-2 text-green-800">
                          <CheckCircle className="w-4 h-4" />
                          <span className="font-medium text-sm">
                            {isOnline ? 'All settings are saved automatically to Supabase' : 'Settings saved locally (offline mode)'}
                          </span>
                        </div>
                        {lastSyncTime && (
                          <p className="text-xs text-green-600 mt-1">
                            Last synced: {lastSyncTime.toLocaleString()}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Activity Logs */}
              <TabsContent value="activity" className="space-y-6">
                <Card className="bg-white border border-slate-200 shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600">
                        <Activity className="w-5 h-5 text-white" />
                      </div>
                      Account Activity
                    </CardTitle>
                    <CardDescription>
                      Recent actions and changes to your account
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[500px] pr-4">
                      <div className="space-y-4">
                        {activities.length > 0 ? (
                          activities.map((log, index) => (
                            <motion.div
                              key={log.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.05 }}
                              className="flex items-start gap-4 p-4 rounded-xl hover:bg-slate-50 transition-colors"
                            >
                              <div className="flex-shrink-0 mt-1">
                                {getActivityIcon(log.type)}
                              </div>
                              <div className="flex-1 min-w-0 space-y-1">
                                <p className="text-sm font-medium text-gray-900">
                                  {log.action}
                                </p>
                                <div className="flex items-center gap-2 text-xs text-gray-600">
                                  <Clock className="w-3 h-3" />
                                  <span>{formatDate(log.timestamp)}</span>
                                  <span>•</span>
                                  <Badge variant="outline" className="text-xs capitalize bg-slate-50">
                                    {log.type}
                                  </Badge>
                                </div>
                              </div>
                            </motion.div>
                          ))
                        ) : (
                          <div className="text-center py-8 text-gray-600">
                            <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p>No recent activity</p>
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </motion.div>

          {/* Footer Actions */}
          <motion.div variants={itemVariants} className="pt-8 border-t border-slate-200">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-gray-900">Need help with your settings?</h3>
                <p className="text-gray-700">Our support team is here to assist you with any questions.</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button variant="outline" className="border-slate-300 text-gray-800 hover:bg-slate-100">
                  <Globe className="w-4 h-4 mr-2" />
                  Help Center
                </Button>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Headphones className="w-4 h-4 mr-2" />
                  Contact Support
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}