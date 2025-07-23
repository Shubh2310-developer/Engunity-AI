'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/auth/supabase';
import { useUser } from '@/contexts/UserContext';

export interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  aiAssistantStyle: 'professional' | 'friendly' | 'technical' | 'creative';
  documentPrivacy: 'private' | 'public';
  emailNotifications: boolean;
  pushNotifications: boolean;
  marketingEmails: boolean;
  language: string;
  timezone: string;
  compactMode: boolean;
  autoSave: boolean;
  soundEffects: boolean;
  reducedMotion: boolean;
}

const defaultSettings: UserSettings = {
  theme: 'system',
  aiAssistantStyle: 'professional',
  documentPrivacy: 'private',
  emailNotifications: true,
  pushNotifications: true,
  marketingEmails: false,
  language: 'en',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  compactMode: false,
  autoSave: true,
  soundEffects: true,
  reducedMotion: false,
};

interface SettingsContextValue {
  settings: UserSettings;
  updateSettings: (newSettings: Partial<UserSettings>) => Promise<void>;
  resetSettings: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined);

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}

interface SettingsProviderProps {
  children: ReactNode;
}

export function SettingsProvider({ children }: SettingsProviderProps) {
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useUser();

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (user?.id) {
        const { data, error: fetchError } = await supabase
          .from('user_settings')
          .select('settings')
          .eq('user_id', user.id)
          .single();

        if (fetchError && fetchError.code !== 'PGRST116') {
          throw fetchError;
        }

        if (data?.settings) {
          setSettings({ ...defaultSettings, ...data.settings });
        } else {
          const localSettings = localStorage.getItem('userSettings');
          if (localSettings) {
            const parsed = JSON.parse(localSettings);
            setSettings({ ...defaultSettings, ...parsed });
          }
        }
      } else {
        const localSettings = localStorage.getItem('userSettings');
        if (localSettings) {
          const parsed = JSON.parse(localSettings);
          setSettings({ ...defaultSettings, ...parsed });
        }
      }
    } catch (err: any) {
      console.error('Error loading settings:', err);
      setError(err.message || 'Failed to load settings');
      
      const localSettings = localStorage.getItem('userSettings');
      if (localSettings) {
        try {
          const parsed = JSON.parse(localSettings);
          setSettings({ ...defaultSettings, ...parsed });
        } catch (parseError) {
          console.error('Error parsing local settings:', parseError);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const updateSettings = async (newSettings: Partial<UserSettings>) => {
    try {
      setError(null);
      const updatedSettings = { ...settings, ...newSettings };
      
      // Apply settings immediately
      setSettings(updatedSettings);
      applyTheme(updatedSettings.theme);
      
      // Save to localStorage immediately
      localStorage.setItem('userSettings', JSON.stringify(updatedSettings));
      
      // Save to database in background
      if (user?.id) {
        try {
          console.log('Saving settings to Supabase for user:', user.id, updatedSettings);
          const { data, error: upsertError } = await supabase
            .from('user_settings')
            .upsert({
              user_id: user.id,
              settings: updatedSettings,
              updated_at: new Date().toISOString(),
            }, {
              onConflict: 'user_id'
            })
            .select();
            
          if (data && data.length > 0) {
            console.log('✅ Settings saved successfully to Supabase:', data[0]);
          }

          if (upsertError) {
            console.error('❌ Database save failed:', upsertError);
            throw new Error(`Failed to save settings to database: ${upsertError.message}`);
          }
        } catch (dbError) {
          console.error('❌ Database save failed, reverting local changes:', dbError);
          // Revert local changes on database error
          setSettings(settings);
          localStorage.setItem('userSettings', JSON.stringify(settings));
          throw dbError;
        }
      }
      
    } catch (err: any) {
      console.error('Error updating settings:', err);
      setError(err.message || 'Failed to update settings');
      throw err;
    }
  };

  const resetSettings = async () => {
    try {
      setError(null);
      setSettings(defaultSettings);
      
      localStorage.setItem('userSettings', JSON.stringify(defaultSettings));

      if (user?.id) {
        const { error: upsertError } = await supabase
          .from('user_settings')
          .upsert({
            user_id: user.id,
            settings: defaultSettings,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'user_id'
          });

        if (upsertError) {
          throw upsertError;
        }
      }

      applyTheme(defaultSettings.theme);
      
    } catch (err: any) {
      console.error('Error resetting settings:', err);
      setError(err.message || 'Failed to reset settings');
      throw err;
    }
  };

  const applyTheme = (theme: UserSettings['theme']) => {
    const root = window.document.documentElement;
    const body = window.document.body;
    
    // Apply theme changes immediately to entire document
    if (theme === 'dark') {
      root.classList.add('dark');
      body.style.backgroundColor = '#0f172a';
      body.style.color = '#f8fafc';
    } else {
      root.classList.remove('dark');
      body.style.backgroundColor = '#ffffff';
      body.style.color = '#1f2937';
    }
    
    // Force CSS custom properties for better consistency
    root.style.setProperty('--background', theme === 'dark' ? '15 23 42' : '255 255 255');
    root.style.setProperty('--foreground', theme === 'dark' ? '248 250 252' : '31 41 55');
    root.style.setProperty('--card', theme === 'dark' ? '30 41 59' : '255 255 255');
    root.style.setProperty('--card-foreground', theme === 'dark' ? '248 250 252' : '31 41 55');
    
    // Trigger a custom event for components to listen to
    window.dispatchEvent(new CustomEvent('themeChange', { detail: { theme } }));
  };

  useEffect(() => {
    // Apply theme immediately from localStorage on mount
    const savedSettings = localStorage.getItem('userSettings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        const mergedSettings = { ...defaultSettings, ...parsed };
        setSettings(mergedSettings);
        applyTheme(mergedSettings.theme);
      } catch (error) {
        console.error('Error parsing saved settings:', error);
      }
    } else {
      applyTheme(defaultSettings.theme);
    }
    
    loadSettings();
  }, [user?.id]);

  useEffect(() => {
    applyTheme(settings.theme);
  }, [settings.theme]);

  useEffect(() => {
    if (settings.reducedMotion) {
      document.documentElement.style.setProperty('--motion-reduce', '1');
    } else {
      document.documentElement.style.removeProperty('--motion-reduce');
    }
  }, [settings.reducedMotion]);

  useEffect(() => {
    if (settings.theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => applyTheme('system');
      
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [settings.theme]);

  const value: SettingsContextValue = {
    settings,
    updateSettings,
    resetSettings,
    isLoading,
    error,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}