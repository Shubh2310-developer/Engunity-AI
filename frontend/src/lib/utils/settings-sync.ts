/**
 * Settings Synchronization Utilities
 * 
 * Provides helper functions for syncing settings across components
 * and ensuring consistent state management throughout the application.
 */

import { EnhancedUserSettings } from '@/lib/services/settings-service';

// Event types for settings synchronization
export type SettingsEvent = 
  | 'themeChanged'
  | 'settingsUpdated' 
  | 'chatSettingsChanged'
  | 'documentSettingsChanged'
  | 'notificationSettingsChanged';

// Global settings event emitter
class SettingsEventEmitter {
  private listeners: Map<SettingsEvent, Array<(data: any) => void>> = new Map();

  on(event: SettingsEvent, callback: (data: any) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    
    this.listeners.get(event)!.push(callback);
    
    // Return unsubscribe function
    return () => {
      const callbacks = this.listeners.get(event);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    };
  }

  emit(event: SettingsEvent, data: any): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in settings event listener for ${event}:`, error);
        }
      });
    }
  }

  removeAllListeners(event?: SettingsEvent): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }
}

export const settingsEventEmitter = new SettingsEventEmitter();

/**
 * Apply theme settings to the DOM immediately
 */
export function applyThemeToDOM(settings: EnhancedUserSettings): void {
  const { theme, reducedMotion, compactMode } = settings;
  const html = document.documentElement;
  const body = document.body;

  // Determine effective theme
  let effectiveTheme = theme;
  if (theme === 'system') {
    effectiveTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  // Apply theme class
  if (effectiveTheme === 'dark') {
    html.classList.add('dark');
    body.style.backgroundColor = '#0f172a';
    body.style.color = '#f8fafc';
  } else {
    html.classList.remove('dark');
    body.style.backgroundColor = '#ffffff';
    body.style.color = '#1f2937';
  }

  // Apply CSS custom properties for better consistency
  const isDark = effectiveTheme === 'dark';
  html.style.setProperty('--background', isDark ? '15 23 42' : '255 255 255');
  html.style.setProperty('--foreground', isDark ? '248 250 252' : '31 41 55');
  html.style.setProperty('--card', isDark ? '30 41 59' : '255 255 255');
  html.style.setProperty('--card-foreground', isDark ? '248 250 252' : '31 41 55');
  html.style.setProperty('--border', isDark ? '30 41 59' : '226 232 240');
  html.style.setProperty('--input', isDark ? '30 41 59' : '255 255 255');
  html.style.setProperty('--primary', '59 130 246');
  html.style.setProperty('--primary-foreground', '248 250 252');
  html.style.setProperty('--secondary', isDark ? '71 85 105' : '241 245 249');
  html.style.setProperty('--secondary-foreground', isDark ? '248 250 252' : '15 23 42');

  // Apply accessibility settings
  if (reducedMotion) {
    html.style.setProperty('--motion-duration', '0.01s');
    html.style.setProperty('--motion-scale', '1');
    html.classList.add('motion-reduce');
  } else {
    html.style.removeProperty('--motion-duration');
    html.style.removeProperty('--motion-scale');
    html.classList.remove('motion-reduce');
  }

  // Apply compact mode
  if (compactMode) {
    html.classList.add('compact-mode');
    html.style.setProperty('--spacing-scale', '0.8');
    html.style.setProperty('--text-scale', '0.9');
  } else {
    html.classList.remove('compact-mode');
    html.style.removeProperty('--spacing-scale');
    html.style.removeProperty('--text-scale');
  }

  // Emit theme change event
  settingsEventEmitter.emit('themeChanged', {
    theme: effectiveTheme,
    isDark,
    settings,
  });
}

/**
 * Listen for system theme changes and update accordingly
 */
export function setupSystemThemeListener(
  getCurrentSettings: () => EnhancedUserSettings,
  updateSettings: (updates: Partial<EnhancedUserSettings>) => void
): () => void {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  
  const handleChange = () => {
    const currentSettings = getCurrentSettings();
    if (currentSettings.theme === 'system') {
      applyThemeToDOM(currentSettings);
    }
  };

  mediaQuery.addEventListener('change', handleChange);
  
  return () => {
    mediaQuery.removeEventListener('change', handleChange);
  };
}

/**
 * Sync settings with component state
 */
export function syncSettingsWithComponent<T extends Record<string, any>>(
  componentState: T,
  settings: EnhancedUserSettings,
  settingsMapping: Record<keyof T, keyof EnhancedUserSettings>
): T {
  const updatedState = { ...componentState };
  
  Object.entries(settingsMapping).forEach(([componentKey, settingsKey]) => {
    if (settings[settingsKey] !== undefined) {
      (updatedState as any)[componentKey] = settings[settingsKey];
    }
  });
  
  return updatedState;
}

/**
 * Create a settings-aware React hook
 */
export function createSettingsHook<T>(
  selector: (settings: EnhancedUserSettings) => T,
  compareFn?: (prev: T, next: T) => boolean
) {
  return function useSettingsSelector(): T {
    const [value, setValue] = React.useState<T>(() => {
      // Get initial value from localStorage or defaults
      try {
        const stored = localStorage.getItem('userSettings');
        if (stored) {
          const settings = JSON.parse(stored) as EnhancedUserSettings;
          return selector(settings);
        }
      } catch (error) {
        console.error('Error reading settings from localStorage:', error);
      }
      
      // Return default value
      return selector({} as EnhancedUserSettings);
    });

    React.useEffect(() => {
      const unsubscribe = settingsEventEmitter.on('settingsUpdated', (data) => {
        const newValue = selector(data.settings);
        
        if (compareFn ? !compareFn(value, newValue) : value !== newValue) {
          setValue(newValue);
        }
      });

      return unsubscribe;
    }, [value, compareFn]);

    return value;
  };
}

/**
 * Batch update settings to avoid multiple re-renders
 */
export function batchSettingsUpdate(
  updates: Array<{ key: keyof EnhancedUserSettings; value: any }>,
  updateSettings: (updates: Partial<EnhancedUserSettings>) => Promise<void>
): Promise<void> {
  const batchedUpdates = updates.reduce((acc, { key, value }) => {
    acc[key] = value;
    return acc;
  }, {} as Partial<EnhancedUserSettings>);

  return updateSettings(batchedUpdates);
}

/**
 * Validate settings object structure
 */
export function validateSettings(settings: any): settings is EnhancedUserSettings {
  if (!settings || typeof settings !== 'object') {
    return false;
  }

  // Basic validation - check for required fields
  const requiredFields = ['theme', 'aiAssistantStyle', 'documentPrivacy'];
  
  return requiredFields.every(field => field in settings);
}

/**
 * Migrate old settings format to new format
 */
export function migrateSettings(oldSettings: any): EnhancedUserSettings {
  // Handle migration from old settings format
  const migrated: Partial<EnhancedUserSettings> = {
    ...oldSettings,
  };

  // Add new fields with defaults if they don't exist
  if (!migrated.chatSettings) {
    migrated.chatSettings = {
      autoSave: true,
      messageHistory: true,
      typingIndicators: true,
      soundNotifications: oldSettings.soundEffects ?? true,
    };
  }

  if (!migrated.documentSettings) {
    migrated.documentSettings = {
      autoSync: oldSettings.autoSave ?? true,
      versionHistory: true,
      collaborativeMode: false,
      defaultPrivacy: oldSettings.documentPrivacy ?? 'private',
    };
  }

  if (!migrated.sync) {
    migrated.sync = {
      source: 'localStorage',
      timestamp: Date.now(),
      version: 1,
    };
  }

  return migrated as EnhancedUserSettings;
}

/**
 * Debug utility to log settings changes
 */
export function enableSettingsDebug(): () => void {
  const unsubscribes = [
    settingsEventEmitter.on('settingsUpdated', (data) => {
      console.group('🔧 Settings Updated');
      console.log('User ID:', data.userId);
      console.log('Settings:', data.settings);
      console.log('Timestamp:', new Date().toISOString());
      console.groupEnd();
    }),
    
    settingsEventEmitter.on('themeChanged', (data) => {
      console.group('🎨 Theme Changed');
      console.log('Theme:', data.theme);
      console.log('Is Dark:', data.isDark);
      console.log('Settings:', data.settings);
      console.groupEnd();
    }),
  ];

  return () => {
    unsubscribes.forEach(fn => fn());
  };
}

// React import for the hook
import React from 'react';