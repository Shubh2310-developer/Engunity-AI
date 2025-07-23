'use client';

import { useEffect, useState } from 'react';
import { useSettings } from '@/contexts/SettingsContext';

export function useGlobalSettings() {
  const { settings, updateSettings, isLoading, error } = useSettings();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // Listen for theme changes
    const handleThemeChange = (event: CustomEvent) => {
      console.log('Theme changed:', event.detail.theme);
    };

    window.addEventListener('themeChange', handleThemeChange as EventListener);
    
    return () => {
      window.removeEventListener('themeChange', handleThemeChange as EventListener);
    };
  }, []);

  // Force re-render when settings change
  const [renderKey, setRenderKey] = useState(0);
  
  useEffect(() => {
    setRenderKey(prev => prev + 1);
  }, [settings]);

  return {
    settings,
    updateSettings,
    isLoading,
    error,
    mounted,
    renderKey,
  };
}

export function useThemeClass() {
  const { settings, mounted } = useGlobalSettings();
  
  if (!mounted) return '';
  
  const themeClass = settings.theme === 'dark' ? 'dark' : '';
  return themeClass;
}

export function useSettingsValue<K extends keyof ReturnType<typeof useGlobalSettings>['settings']>(key: K) {
  const { settings } = useGlobalSettings();
  return settings[key];
}