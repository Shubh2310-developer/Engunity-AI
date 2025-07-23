/**
 * Enhanced Settings Context with Real-time Synchronization
 * 
 * Features:
 * - Cross-platform persistence (Supabase + Firebase)
 * - Real-time updates across tabs/devices
 * - Optimistic updates for better UX
 * - Theme synchronization
 * - Offline support
 */

'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useUser } from '@/contexts/UserContext';
import { useSettings, UserSettings } from '@/contexts/SettingsContext';
import { 
  settingsService, 
  EnhancedUserSettings, 
  applyThemeSettings 
} from '@/lib/services/settings-service';

interface EnhancedSettingsContextValue {
  settings: EnhancedUserSettings;
  updateSettings: (updates: Partial<EnhancedUserSettings>, options?: { immediate?: boolean }) => Promise<void>;
  resetSettings: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
  isOnline: boolean;
  lastSyncTime: Date | null;
  
  // Theme helpers
  isDarkMode: boolean;
  toggleTheme: () => Promise<void>;
  
  // Chat settings helpers
  updateChatSettings: (updates: Partial<EnhancedUserSettings['chatSettings']>) => Promise<void>;
  
  // Document settings helpers
  updateDocumentSettings: (updates: Partial<EnhancedUserSettings['documentSettings']>) => Promise<void>;
  
  // Notification helpers
  updateNotificationSettings: (updates: {
    emailNotifications?: boolean;
    pushNotifications?: boolean;
    marketingEmails?: boolean;
  }) => Promise<void>;
}

const EnhancedSettingsContext = createContext<EnhancedSettingsContextValue | undefined>(undefined);

export function useEnhancedSettings() {
  const context = useContext(EnhancedSettingsContext);
  if (context === undefined) {
    throw new Error('useEnhancedSettings must be used within an EnhancedSettingsProvider');
  }
  return context;
}

interface EnhancedSettingsProviderProps {
  children: ReactNode;
}

export function EnhancedSettingsProvider({ children }: EnhancedSettingsProviderProps) {
  const { user } = useUser();
  const basicSettings = useSettings();
  const [settings, setSettings] = useState<EnhancedUserSettings>({
    ...settingsService.getCurrentSettings(),
    ...basicSettings.settings
  });
  const [isLoading, setIsLoading] = useState(basicSettings.isLoading);
  const [error, setError] = useState<string | null>(basicSettings.error);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  // Sync with basic settings changes
  useEffect(() => {
    const mergedSettings: EnhancedUserSettings = {
      ...settingsService.getCurrentSettings(),
      ...basicSettings.settings,
      // Preserve enhanced settings with defaults
      chatSettings: settings.chatSettings || {
        autoSave: true,
        messageHistory: true,
        typingIndicators: true,
        soundNotifications: true
      },
      documentSettings: settings.documentSettings || {
        autoSync: true,
        versionHistory: true,
        collaborativeMode: false,
        defaultPrivacy: 'private' as const
      },
      sync: settings.sync || {
        source: 'supabase' as const,
        timestamp: Date.now(),
        version: 1
      }
    };
    setSettings(mergedSettings);
    setIsLoading(basicSettings.isLoading);
    setError(basicSettings.error);
  }, [basicSettings.settings, basicSettings.isLoading, basicSettings.error]);

  // Initialize settings when user changes
  useEffect(() => {
    if (user?.id) {
      // Basic settings context handles the initialization
      console.log('Enhanced settings initialized for user:', user.id);
    } else {
      // Handle anonymous/guest usage
      setIsLoading(false);
      const defaultSettings = settingsService.getCurrentSettings();
      setSettings({
        ...defaultSettings,
        ...basicSettings.settings
      });
    }
  }, [user?.id, basicSettings.settings]);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Listen for global settings updates
  useEffect(() => {
    const handleSettingsUpdate = (event: CustomEvent) => {
      const { settings: updatedSettings } = event.detail;
      setSettings(updatedSettings);
      setLastSyncTime(new Date());
      applyThemeSettings(updatedSettings);
    };

    window.addEventListener('settingsUpdated', handleSettingsUpdate as EventListener);
    
    return () => {
      window.removeEventListener('settingsUpdated', handleSettingsUpdate as EventListener);
    };
  }, []);

  // Apply theme changes immediately
  useEffect(() => {
    applyThemeSettings(settings);
  }, [settings.theme, settings.reducedMotion, settings.compactMode]);


  const updateSettings = useCallback(async (
    updates: Partial<EnhancedUserSettings>,
    _options: { immediate?: boolean } = {}
  ) => {
    if (!user?.id) {
      // For anonymous users, just update locally
      const newSettings = { ...settings, ...updates };
      setSettings(newSettings);
      applyThemeSettings(newSettings);
      localStorage.setItem('userSettings', JSON.stringify(newSettings));
      return;
    }

    try {
      setError(null);
      // Use the basic settings context to save to Supabase
      const basicUpdates: Partial<UserSettings> = {};
      
      // Only add properties that are defined
      if (updates.theme !== undefined) basicUpdates.theme = updates.theme;
      if (updates.aiAssistantStyle !== undefined) basicUpdates.aiAssistantStyle = updates.aiAssistantStyle;
      if (updates.documentPrivacy !== undefined) basicUpdates.documentPrivacy = updates.documentPrivacy;
      if (updates.emailNotifications !== undefined) basicUpdates.emailNotifications = updates.emailNotifications;
      if (updates.pushNotifications !== undefined) basicUpdates.pushNotifications = updates.pushNotifications;
      if (updates.marketingEmails !== undefined) basicUpdates.marketingEmails = updates.marketingEmails;
      if (updates.language !== undefined) basicUpdates.language = updates.language;
      if (updates.timezone !== undefined) basicUpdates.timezone = updates.timezone;
      if (updates.compactMode !== undefined) basicUpdates.compactMode = updates.compactMode;
      if (updates.autoSave !== undefined) basicUpdates.autoSave = updates.autoSave;
      if (updates.soundEffects !== undefined) basicUpdates.soundEffects = updates.soundEffects;
      if (updates.reducedMotion !== undefined) basicUpdates.reducedMotion = updates.reducedMotion;
      
      if (Object.keys(basicUpdates).length > 0) {
        await basicSettings.updateSettings(basicUpdates);
      }
      
      // Update enhanced settings locally
      const newSettings = { ...settings, ...updates };
      setSettings(newSettings);
      applyThemeSettings(newSettings);
      
      setLastSyncTime(new Date());
    } catch (err: any) {
      console.error('Settings update failed:', err);
      setError(err.message || 'Failed to update settings');
      throw err;
    }
  }, [user?.id, settings, basicSettings]);

  const resetSettings = useCallback(async () => {
    if (!user?.id) {
      const defaultSettings = settingsService.getCurrentSettings();
      setSettings(defaultSettings);
      applyThemeSettings(defaultSettings);
      localStorage.removeItem('userSettings');
      return;
    }

    try {
      setError(null);
      // Reset to defaults using basic settings context
      await basicSettings.resetSettings();
      const defaultSettings = settingsService.getCurrentSettings();
      setSettings(defaultSettings);
      setLastSyncTime(new Date());
    } catch (err: any) {
      console.error('Settings reset failed:', err);
      setError(err.message || 'Failed to reset settings');
      throw err;
    }
  }, [user?.id, basicSettings]);

  // Theme helpers
  const isDarkMode = settings.theme === 'dark' || 
    (settings.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const toggleTheme = useCallback(async () => {
    const newTheme = isDarkMode ? 'light' : 'dark';
    await updateSettings({ theme: newTheme });
  }, [isDarkMode, updateSettings]);

  // Chat settings helpers
  const updateChatSettings = useCallback(async (updates: Partial<EnhancedUserSettings['chatSettings']>) => {
    const currentChatSettings = settings.chatSettings || {
      autoSave: true,
      messageHistory: true,
      typingIndicators: true,
      soundNotifications: true
    };
    const newChatSettings = { ...currentChatSettings, ...updates };
    await updateSettings({ chatSettings: newChatSettings });
  }, [settings.chatSettings, updateSettings]);

  // Document settings helpers
  const updateDocumentSettings = useCallback(async (updates: Partial<EnhancedUserSettings['documentSettings']>) => {
    const currentDocumentSettings = settings.documentSettings || {
      autoSync: true,
      versionHistory: true,
      collaborativeMode: false,
      defaultPrivacy: 'private' as const
    };
    const newDocumentSettings = { ...currentDocumentSettings, ...updates };
    await updateSettings({ documentSettings: newDocumentSettings });
  }, [settings.documentSettings, updateSettings]);

  // Notification settings helpers  
  const updateNotificationSettings = useCallback(async (updates: {
    emailNotifications?: boolean;
    pushNotifications?: boolean;
    marketingEmails?: boolean;
  }) => {
    await updateSettings(updates);
  }, [updateSettings]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      settingsService.cleanup();
    };
  }, []);

  const value: EnhancedSettingsContextValue = {
    settings,
    updateSettings,
    resetSettings,
    isLoading,
    error,
    isOnline,
    lastSyncTime,
    isDarkMode,
    toggleTheme,
    updateChatSettings,
    updateDocumentSettings,
    updateNotificationSettings,
  };

  return (
    <EnhancedSettingsContext.Provider value={value}>
      {children}
    </EnhancedSettingsContext.Provider>
  );
}

// Additional hooks for specific settings
export function useThemeSettings() {
  const { settings, updateSettings, isDarkMode, toggleTheme } = useEnhancedSettings();
  
  return {
    theme: settings.theme,
    isDarkMode,
    toggleTheme,
    setTheme: (theme: 'light' | 'dark' | 'system') => updateSettings({ theme }),
    compactMode: settings.compactMode,
    setCompactMode: (compactMode: boolean) => updateSettings({ compactMode }),
    reducedMotion: settings.reducedMotion,
    setReducedMotion: (reducedMotion: boolean) => updateSettings({ reducedMotion }),
  };
}

export function useChatSettings() {
  const { settings, updateChatSettings } = useEnhancedSettings();
  
  return {
    chatSettings: settings.chatSettings,
    updateChatSettings,
    autoSave: settings.chatSettings?.autoSave ?? true,
    setAutoSave: (autoSave: boolean) => updateChatSettings({ autoSave }),
    messageHistory: settings.chatSettings?.messageHistory ?? true,
    setMessageHistory: (messageHistory: boolean) => updateChatSettings({ messageHistory }),
    typingIndicators: settings.chatSettings?.typingIndicators ?? true,
    setTypingIndicators: (typingIndicators: boolean) => updateChatSettings({ typingIndicators }),
    soundNotifications: settings.chatSettings?.soundNotifications ?? true,
    setSoundNotifications: (soundNotifications: boolean) => updateChatSettings({ soundNotifications }),
  };
}

export function useDocumentSettings() {
  const { settings, updateDocumentSettings } = useEnhancedSettings();
  
  return {
    documentSettings: settings.documentSettings,
    updateDocumentSettings,
    autoSync: settings.documentSettings?.autoSync ?? true,
    setAutoSync: (autoSync: boolean) => updateDocumentSettings({ autoSync }),
    versionHistory: settings.documentSettings?.versionHistory ?? true,
    setVersionHistory: (versionHistory: boolean) => updateDocumentSettings({ versionHistory }),
    collaborativeMode: settings.documentSettings?.collaborativeMode ?? false,
    setCollaborativeMode: (collaborativeMode: boolean) => updateDocumentSettings({ collaborativeMode }),
    defaultPrivacy: settings.documentSettings?.defaultPrivacy ?? 'private',
    setDefaultPrivacy: (defaultPrivacy: 'private' | 'public' | 'team') => updateDocumentSettings({ defaultPrivacy }),
  };
}

export function useNotificationSettings() {
  const { settings, updateNotificationSettings } = useEnhancedSettings();
  
  return {
    emailNotifications: settings.emailNotifications,
    pushNotifications: settings.pushNotifications,
    marketingEmails: settings.marketingEmails,
    updateNotificationSettings,
    setEmailNotifications: (emailNotifications: boolean) => updateNotificationSettings({ emailNotifications }),
    setPushNotifications: (pushNotifications: boolean) => updateNotificationSettings({ pushNotifications }),
    setMarketingEmails: (marketingEmails: boolean) => updateNotificationSettings({ marketingEmails }),
  };
}

export function useAISettings() {
  const { settings, updateSettings } = useEnhancedSettings();
  
  return {
    aiAssistantStyle: settings.aiAssistantStyle,
    setAIAssistantStyle: (aiAssistantStyle: 'professional' | 'friendly' | 'technical' | 'creative') => 
      updateSettings({ aiAssistantStyle }),
  };
}