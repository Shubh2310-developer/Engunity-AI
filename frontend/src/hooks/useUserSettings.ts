'use client';

import { useSettings } from '@/contexts/SettingsContext';
import { useEffect, useState } from 'react';

export function useUserSettings() {
  return useSettings();
}

export function useTheme() {
  const { settings, updateSettings } = useSettings();
  
  return {
    theme: settings.theme,
    setTheme: (theme: 'light' | 'dark' | 'system') => updateSettings({ theme }),
    isDark: settings.theme === 'dark' || (settings.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches),
  };
}

export function useNotificationSettings() {
  const { settings, updateSettings } = useSettings();
  
  return {
    emailNotifications: settings.emailNotifications,
    pushNotifications: settings.pushNotifications,
    marketingEmails: settings.marketingEmails,
    setEmailNotifications: (enabled: boolean) => updateSettings({ emailNotifications: enabled }),
    setPushNotifications: (enabled: boolean) => updateSettings({ pushNotifications: enabled }),
    setMarketingEmails: (enabled: boolean) => updateSettings({ marketingEmails: enabled }),
  };
}

export function useAISettings() {
  const { settings, updateSettings } = useSettings();
  
  return {
    aiAssistantStyle: settings.aiAssistantStyle,
    setAIAssistantStyle: (style: 'professional' | 'friendly' | 'technical' | 'creative') => 
      updateSettings({ aiAssistantStyle: style }),
  };
}

export function usePrivacySettings() {
  const { settings, updateSettings } = useSettings();
  
  return {
    documentPrivacy: settings.documentPrivacy,
    setDocumentPrivacy: (privacy: 'private' | 'public') => updateSettings({ documentPrivacy: privacy }),
  };
}

export function useAccessibilitySettings() {
  const { settings, updateSettings } = useSettings();
  
  return {
    reducedMotion: settings.reducedMotion,
    compactMode: settings.compactMode,
    soundEffects: settings.soundEffects,
    setReducedMotion: (enabled: boolean) => updateSettings({ reducedMotion: enabled }),
    setCompactMode: (enabled: boolean) => updateSettings({ compactMode: enabled }),
    setSoundEffects: (enabled: boolean) => updateSettings({ soundEffects: enabled }),
  };
}

export function useAutoSave() {
  const { settings, updateSettings } = useSettings();
  const [isAutoSaveEnabled, setIsAutoSaveEnabled] = useState(settings.autoSave);

  useEffect(() => {
    setIsAutoSaveEnabled(settings.autoSave);
  }, [settings.autoSave]);

  const toggleAutoSave = () => {
    const newValue = !isAutoSaveEnabled;
    setIsAutoSaveEnabled(newValue);
    updateSettings({ autoSave: newValue });
  };

  return {
    isAutoSaveEnabled,
    toggleAutoSave,
    setAutoSave: (enabled: boolean) => updateSettings({ autoSave: enabled }),
  };
}