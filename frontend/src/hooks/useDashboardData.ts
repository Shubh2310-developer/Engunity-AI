'use client';

/**
 * Dashboard Data Hooks
 * Custom hooks for fetching and managing dashboard-specific data
 */

import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@/contexts/UserContext';
import { 
  Document, 
  Activity, 
  ChatSession,
  DocumentService,
  ActivityService,
  ChatService 
} from '@/lib/firebase/firestore';

// ================================
// DASHBOARD OVERVIEW HOOK
// ================================

interface DashboardStats {
  documents: { value: number; change: number; trend: 'up' | 'down' };
  codeGenerations: { value: number; change: number; trend: 'up' | 'down' };
  aiQueries: { value: number; change: number; trend: 'up' | 'down' };
  chatSessions: { value: number; change: number; trend: 'up' | 'down' };
  insights: { value: number; change: number; trend: 'up' | 'down' };
}

export function useDashboardStats() {
  const { profile, loading: userLoading } = useUser();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (userLoading || !profile) {
      setLoading(userLoading);
      return;
    }

    // Transform profile usage data to dashboard stats
    // In a real app, you'd calculate changes from historical data
    const dashboardStats: DashboardStats = {
      documents: { 
        value: profile.usage.documentsProcessed, 
        change: Math.floor(Math.random() * 30) + 5,
        trend: 'up' 
      },
      codeGenerations: { 
        value: profile.usage.codeGenerations, 
        change: Math.floor(Math.random() * 25) + 3,
        trend: 'up' 
      },
      aiQueries: { 
        value: profile.usage.aiQueries, 
        change: Math.floor(Math.random() * 35) + 8,
        trend: 'up' 
      },
      chatSessions: { 
        value: profile.usage.chatSessions, 
        change: Math.floor(Math.random() * 20) + 2,
        trend: 'up' 
      },
      insights: { 
        value: profile.usage.insights, 
        change: Math.floor(Math.random() * 28) + 5,
        trend: 'up' 
      }
    };

    setStats(dashboardStats);
    setLoading(false);
    setError(null);
  }, [profile, userLoading]);

  return { stats, loading, error };
}

// ================================
// USER DOCUMENTS HOOK
// ================================

export function useUserDocuments(limit = 10) {
  const { user } = useUser();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshDocuments = useCallback(async () => {
    if (!user) {
      setDocuments([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const userDocs = await DocumentService.getUserDocuments(user.id, limit);
      setDocuments(userDocs);
    } catch (err) {
      console.error('❌ Error fetching documents:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch documents');
    } finally {
      setLoading(false);
    }
  }, [user, limit]);

  useEffect(() => {
    refreshDocuments();
  }, [refreshDocuments]);

  return { 
    documents, 
    loading, 
    error, 
    refreshDocuments 
  };
}

// ================================
// USER ACTIVITIES HOOK
// ================================

export function useUserActivities(limit = 10) {
  const { user } = useUser();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshActivities = useCallback(async () => {
    if (!user) {
      setActivities([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const userActivities = await ActivityService.getUserActivities(user.id, limit);
      setActivities(userActivities);
    } catch (err) {
      console.error('❌ Error fetching activities:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch activities');
    } finally {
      setLoading(false);
    }
  }, [user, limit]);

  useEffect(() => {
    refreshActivities();
  }, [refreshActivities]);

  return { 
    activities, 
    loading, 
    error, 
    refreshActivities 
  };
}

// ================================
// USER CHATS HOOK
// ================================

export function useUserChats(limit = 20) {
  const { user } = useUser();
  const [chats, setChats] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshChats = useCallback(async () => {
    if (!user) {
      setChats([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const userChats = await ChatService.getUserChats(user.id, limit);
      setChats(userChats);
    } catch (err) {
      console.error('❌ Error fetching chats:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch chats');
    } finally {
      setLoading(false);
    }
  }, [user, limit]);

  useEffect(() => {
    refreshChats();
  }, [refreshChats]);

  return { 
    chats, 
    loading, 
    error, 
    refreshChats 
  };
}

// ================================
// REAL-TIME DASHBOARD DATA HOOK
// ================================

export function useRealtimeDashboard() {
  const { user, profile } = useUser();
  const { stats, loading: statsLoading } = useDashboardStats();
  const { documents, loading: docsLoading, refreshDocuments } = useUserDocuments(4);
  const { activities, loading: activitiesLoading, refreshActivities } = useUserActivities(6);

  const loading = statsLoading || docsLoading || activitiesLoading;

  // Transform activities to match dashboard format
  const recentActivity = activities.map(activity => ({
    id: activity.id,
    action: activity.action,
    item: activity.item,
    time: formatTimeAgo(activity.timestamp.toDate()),
    type: activity.type,
    status: activity.status
  }));

  // Transform documents to match dashboard format
  const recentFiles = documents.map(doc => ({
    id: doc.id,
    name: doc.name,
    type: doc.type,
    size: doc.size,
    status: doc.status,
    uploadedAt: formatTimeAgo(doc.uploadedAt.toDate()),
    category: doc.category
  }));

  const refreshAllData = useCallback(async () => {
    await Promise.all([
      refreshDocuments(),
      refreshActivities()
    ]);
  }, [refreshDocuments, refreshActivities]);

  return {
    user: user ? {
      name: profile?.name || user.name || 'User',
      email: user.email,
      avatar: profile?.avatar || user.avatar,
      plan: profile?.plan || 'Free',
      initials: profile?.initials || getInitials(user.name || user.email),
      role: profile?.role || 'User',
      lastActive: profile ? formatTimeAgo(profile.lastActive.toDate()) : 'Just now',
      timezone: profile?.timezone || 'UTC'
    } : null,
    stats,
    recentActivity,
    recentFiles,
    loading,
    refreshData: refreshAllData
  };
}

// ================================
// UTILITY FUNCTIONS
// ================================

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;
  
  return date.toLocaleDateString();
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');
}

