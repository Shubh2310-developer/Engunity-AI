/**
 * Real-time Notification Service
 * ==============================
 * 
 * Handles real-time notifications and updates for the research system
 * - Document processing notifications
 * - Research activity updates
 * - System notifications
 * - Browser notifications
 */

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info' | 'processing';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  actions?: Array<{
    label: string;
    action: string;
    primary?: boolean;
  }>;
  metadata?: {
    documentId?: string;
    activityId?: string;
    url?: string;
    [key: string]: any;
  };
}

export interface NotificationUpdate {
  hasUpdates: boolean;
  notifications: Notification[];
  totalUnread: number;
  lastUpdate: Date;
}

class NotificationService {
  private notifications: Notification[] = [];
  private listeners: Array<(update: NotificationUpdate) => void> = [];
  private isSubscribed = false;
  private updateInterval: NodeJS.Timeout | null = null;
  private lastCheck: Date = new Date();

  constructor() {
    this.checkBrowserNotificationPermission();
  }

  // ========================================
  // SUBSCRIPTION MANAGEMENT
  // ========================================

  subscribe(callback: (update: NotificationUpdate) => void): () => void {
    this.listeners.push(callback);
    
    // Start polling if this is the first subscriber
    if (this.listeners.length === 1 && !this.isSubscribed) {
      this.startPolling();
    }

    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
      
      // Stop polling if no more subscribers
      if (this.listeners.length === 0) {
        this.stopPolling();
      }
    };
  }

  private startPolling(): void {
    if (this.isSubscribed) return;
    
    this.isSubscribed = true;
    console.log('📡 Starting notification polling');
    
    // Initial check
    this.checkForUpdates();
    
    // Poll every 30 seconds
    this.updateInterval = setInterval(() => {
      this.checkForUpdates();
    }, 30000);
  }

  private stopPolling(): void {
    if (!this.isSubscribed) return;
    
    console.log('📡 Stopping notification polling');
    this.isSubscribed = false;
    
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  // ========================================
  // UPDATE CHECKING
  // ========================================

  private async checkForUpdates(): Promise<void> {
    try {
      const response = await fetch(`/api/notifications?since=${this.lastCheck.toISOString()}`, {
        headers: {
          'Authorization': `Bearer ${await this.getAuthToken()}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          console.warn('⚠️ Authentication expired, stopping notifications');
          this.stopPolling();
          return;
        }
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      
      if (data.notifications && data.notifications.length > 0) {
        // Add new notifications
        const newNotifications = data.notifications.map((n: any) => ({
          ...n,
          timestamp: new Date(n.timestamp)
        }));
        
        this.notifications.unshift(...newNotifications);
        
        // Keep only last 100 notifications
        this.notifications = this.notifications.slice(0, 100);
        
        // Show browser notifications for important updates
        this.showBrowserNotifications(newNotifications);
        
        // Notify all subscribers
        this.notifySubscribers();
      }
      
      this.lastCheck = new Date();
      
    } catch (error) {
      console.error('Failed to check for notifications:', error);
    }
  }

  private notifySubscribers(): void {
    const update: NotificationUpdate = {
      hasUpdates: true,
      notifications: [...this.notifications],
      totalUnread: this.notifications.filter(n => !n.read).length,
      lastUpdate: new Date()
    };

    this.listeners.forEach(callback => {
      try {
        callback(update);
      } catch (error) {
        console.error('Error in notification callback:', error);
      }
    });
  }

  // ========================================
  // LOCAL NOTIFICATIONS
  // ========================================

  addNotification(notification: Omit<Notification, 'id' | 'timestamp' | 'read'>): void {
    const fullNotification: Notification = {
      ...notification,
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      read: false
    };

    this.notifications.unshift(fullNotification);
    this.notifications = this.notifications.slice(0, 100);
    
    // Show browser notification if important
    if (notification.type === 'success' || notification.type === 'error') {
      this.showBrowserNotifications([fullNotification]);
    }
    
    this.notifySubscribers();
  }

  // Convenience methods for different notification types
  success(title: string, message: string, metadata?: any): void {
    this.addNotification({
      type: 'success',
      title,
      message,
      metadata
    });
  }

  error(title: string, message: string, metadata?: any): void {
    this.addNotification({
      type: 'error',
      title,
      message,
      metadata
    });
  }

  warning(title: string, message: string, metadata?: any): void {
    this.addNotification({
      type: 'warning',
      title,
      message,
      metadata
    });
  }

  info(title: string, message: string, metadata?: any): void {
    this.addNotification({
      type: 'info',
      title,
      message,
      metadata
    });
  }

  processing(title: string, message: string, metadata?: any): void {
    this.addNotification({
      type: 'processing',
      title,
      message,
      metadata
    });
  }

  // ========================================
  // NOTIFICATION MANAGEMENT
  // ========================================

  markAsRead(notificationId: string): void {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.read = true;
      this.notifySubscribers();
    }
  }

  markAllAsRead(): void {
    this.notifications.forEach(n => n.read = true);
    this.notifySubscribers();
  }

  removeNotification(notificationId: string): void {
    const index = this.notifications.findIndex(n => n.id === notificationId);
    if (index > -1) {
      this.notifications.splice(index, 1);
      this.notifySubscribers();
    }
  }

  clearAll(): void {
    this.notifications = [];
    this.notifySubscribers();
  }

  getNotifications(): Notification[] {
    return [...this.notifications];
  }

  getUnreadCount(): number {
    return this.notifications.filter(n => !n.read).length;
  }

  // ========================================
  // BROWSER NOTIFICATIONS
  // ========================================

  private async checkBrowserNotificationPermission(): Promise<void> {
    if (!('Notification' in window)) {
      console.log('Browser notifications not supported');
      return;
    }

    if (Notification.permission === 'default') {
      try {
        const permission = await Notification.requestPermission();
        console.log('Notification permission:', permission);
      } catch (error) {
        console.warn('Failed to request notification permission:', error);
      }
    }
  }

  private showBrowserNotifications(notifications: Notification[]): void {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
      return;
    }

    notifications.forEach(notification => {
      // Only show browser notifications for important types
      if (notification.type === 'success' || notification.type === 'error') {
        try {
          const browserNotification = new Notification(notification.title, {
            body: notification.message,
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            tag: notification.id,
            requireInteraction: notification.type === 'error',
            timestamp: notification.timestamp.getTime()
          });

          // Auto-close after 5 seconds for success notifications
          if (notification.type === 'success') {
            setTimeout(() => {
              browserNotification.close();
            }, 5000);
          }

          // Handle clicks
          browserNotification.onclick = () => {
            window.focus();
            if (notification.metadata?.url) {
              window.location.href = notification.metadata.url;
            }
            browserNotification.close();
          };

        } catch (error) {
          console.warn('Failed to show browser notification:', error);
        }
      }
    });
  }

  // ========================================
  // DOCUMENT PROCESSING NOTIFICATIONS
  // ========================================

  notifyDocumentProcessingStarted(fileName: string, documentId: string): void {
    this.processing(
      'Document Processing Started',
      `Processing "${fileName}" with AI analysis...`,
      { documentId, type: 'document_processing' }
    );
  }

  notifyDocumentProcessingCompleted(fileName: string, documentId: string, results?: any): void {
    const message = results 
      ? `"${fileName}" processed successfully. ${results.citationsCount || 0} citations found.`
      : `"${fileName}" has been processed and is ready for analysis.`;
    
    this.success(
      'Document Processing Complete',
      message,
      { 
        documentId, 
        type: 'document_processing',
        url: `/dashboard/research/documents/${documentId}`
      }
    );
  }

  notifyDocumentProcessingFailed(fileName: string, documentId: string, error: string): void {
    this.error(
      'Document Processing Failed',
      `Failed to process "${fileName}": ${error}`,
      { documentId, type: 'document_processing' }
    );
  }

  // ========================================
  // RESEARCH ACTIVITY NOTIFICATIONS
  // ========================================

  notifyCitationsExtracted(fileName: string, count: number, documentId: string): void {
    this.success(
      'Citations Extracted',
      `Found ${count} citation${count !== 1 ? 's' : ''} in "${fileName}"`,
      { 
        documentId, 
        type: 'citation_extraction',
        url: `/dashboard/research/citations?document=${documentId}`
      }
    );
  }

  notifyLiteratureAnalysisComplete(clustersFound: number, documentsAnalyzed: number): void {
    this.success(
      'Literature Analysis Complete',
      `Identified ${clustersFound} topic cluster${clustersFound !== 1 ? 's' : ''} from ${documentsAnalyzed} documents`,
      { 
        type: 'literature_analysis',
        url: '/dashboard/research/literature'
      }
    );
  }

  notifySummaryGenerated(fileName: string, documentId: string): void {
    this.success(
      'Summary Generated',
      `AI summary created for "${fileName}"`,
      { 
        documentId, 
        type: 'summary_generation',
        url: `/dashboard/research/summarize?document=${documentId}`
      }
    );
  }

  // ========================================
  // SYSTEM NOTIFICATIONS
  // ========================================

  notifySystemUpdate(message: string): void {
    this.info(
      'System Update',
      message,
      { type: 'system_update' }
    );
  }

  notifyQuotaLimit(feature: string, limit: string): void {
    this.warning(
      'Usage Limit Reached',
      `You've reached the ${limit} limit for ${feature}. Upgrade to continue.`,
      { 
        type: 'quota_limit',
        actions: [
          { label: 'Upgrade Plan', action: 'upgrade', primary: true },
          { label: 'Learn More', action: 'learn_more' }
        ]
      }
    );
  }

  // ========================================
  // UTILITIES
  // ========================================

  private async getAuthToken(): Promise<string> {
    // This would integrate with your auth system
    // For now, return empty string as placeholder
    try {
      const { supabase } = await import('@/lib/auth/supabase');
      const { data: { session } } = await supabase.auth.getSession();
      return session?.access_token || '';
    } catch (error) {
      console.warn('Failed to get auth token:', error);
      return '';
    }
  }
}

// ========================================
// SINGLETON INSTANCE
// ========================================

let notificationServiceInstance: NotificationService | null = null;

export function getNotificationService(): NotificationService {
  if (!notificationServiceInstance) {
    notificationServiceInstance = new NotificationService();
  }
  return notificationServiceInstance;
}

// ========================================
// REACT HOOK
// ========================================

import { useEffect, useState } from 'react';

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const service = getNotificationService();
    
    const unsubscribe = service.subscribe((update) => {
      setNotifications(update.notifications);
      setUnreadCount(update.totalUnread);
      setIsLoading(false);
    });

    // Initial load
    setNotifications(service.getNotifications());
    setUnreadCount(service.getUnreadCount());
    setIsLoading(false);

    return unsubscribe;
  }, []);

  const markAsRead = (notificationId: string) => {
    getNotificationService().markAsRead(notificationId);
  };

  const markAllAsRead = () => {
    getNotificationService().markAllAsRead();
  };

  const removeNotification = (notificationId: string) => {
    getNotificationService().removeNotification(notificationId);
  };

  const clearAll = () => {
    getNotificationService().clearAll();
  };

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll
  };
}

export default NotificationService;