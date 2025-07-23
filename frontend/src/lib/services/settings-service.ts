/**
 * Enhanced Settings Service for Engunity AI
 * 
 * Features:
 * - Dual database sync (Supabase + Firebase)
 * - Real-time synchronization across tabs/devices
 * - Offline support with local storage fallback
 * - Optimistic updates for better UX
 * - Cross-component event system
 */

import { supabase } from '@/lib/auth/supabase';
import { firestore } from '@/lib/firebase/config';
import { doc, setDoc, getDoc, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { UserSettings } from '@/contexts/SettingsContext';

export interface SettingsSync {
  source: 'supabase' | 'firebase' | 'localStorage';
  timestamp: number;
  version: number;
}

export interface EnhancedUserSettings extends UserSettings {
  // Add Firebase-specific settings
  chatSettings?: {
    autoSave: boolean;
    messageHistory: boolean;
    typingIndicators: boolean;
    soundNotifications: boolean;
  };
  documentSettings?: {
    autoSync: boolean;
    versionHistory: boolean;
    collaborativeMode: boolean;
    defaultPrivacy: 'private' | 'public' | 'team';
  };
  sync?: SettingsSync;
}

const DEFAULT_ENHANCED_SETTINGS: EnhancedUserSettings = {
  // Base settings
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
  
  // Enhanced settings
  chatSettings: {
    autoSave: true,
    messageHistory: true,
    typingIndicators: true,
    soundNotifications: true,
  },
  documentSettings: {
    autoSync: true,
    versionHistory: true,
    collaborativeMode: false,
    defaultPrivacy: 'private',
  },
  sync: {
    source: 'localStorage',
    timestamp: Date.now(),
    version: 1,
  },
};

export class SettingsService {
  private listeners: Array<(settings: EnhancedUserSettings) => void> = [];
  private unsubscribeFirebase: Unsubscribe | null = null;
  private currentUserId: string | null = null;
  private cachedSettings: EnhancedUserSettings = DEFAULT_ENHANCED_SETTINGS;
  private syncInProgress = false;

  /**
   * Initialize the settings service for a user
   */
  async initialize(userId: string): Promise<EnhancedUserSettings> {
    this.currentUserId = userId;
    
    try {
      // Load settings from all sources and merge them
      const [supabaseSettings, firebaseSettings, localSettings] = await Promise.allSettled([
        this.loadFromSupabase(userId),
        this.loadFromFirebase(userId),
        this.loadFromLocalStorage(),
      ]);

      const merged = this.mergeSettings([
        supabaseSettings.status === 'fulfilled' ? supabaseSettings.value : null,
        firebaseSettings.status === 'fulfilled' ? firebaseSettings.value : null,
        localSettings.status === 'fulfilled' ? localSettings.value : null,
      ]);

      this.cachedSettings = merged;
      
      // Set up real-time Firebase listener
      this.setupFirebaseListener(userId);
      
      // Set up Supabase real-time listener
      this.setupSupabaseListener(userId);
      
      return merged;
    } catch (error) {
      console.error('Settings initialization failed:', error);
      return this.cachedSettings;
    }
  }

  /**
   * Update settings with cross-platform sync
   */
  async updateSettings(
    userId: string, 
    updates: Partial<EnhancedUserSettings>,
    options: { syncMode?: 'optimistic' | 'immediate' } = {}
  ): Promise<void> {
    if (this.syncInProgress) {
      console.warn('Sync already in progress, queuing update...');
      // In a real app, you might want to queue these updates
    }

    const { syncMode = 'optimistic' } = options;
    const newSettings: EnhancedUserSettings = {
      ...this.cachedSettings,
      ...updates,
      sync: {
        source: 'supabase',
        timestamp: Date.now(),
        version: (this.cachedSettings.sync?.version || 0) + 1,
      },
    };

    if (syncMode === 'optimistic') {
      // Apply changes immediately for better UX
      this.cachedSettings = newSettings;
      this.notifyListeners(newSettings);
      this.saveToLocalStorage(newSettings);
    }

    this.syncInProgress = true;

    try {
      // Save to both databases concurrently
      await Promise.allSettled([
        this.saveToSupabase(userId, newSettings),
        this.saveToFirebase(userId, newSettings),
      ]);

      if (syncMode === 'immediate') {
        this.cachedSettings = newSettings;
        this.notifyListeners(newSettings);
      }

      // Always save to localStorage as backup
      this.saveToLocalStorage(newSettings);

      // Emit global event for cross-component updates
      window.dispatchEvent(new CustomEvent('settingsUpdated', {
        detail: { settings: newSettings, userId }
      }));

    } catch (error) {
      console.error('Settings sync failed:', error);
      
      if (syncMode === 'immediate') {
        // Revert optimistic changes on error
        this.notifyListeners(this.cachedSettings);
      }
      
      throw error;
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Get current settings
   */
  getCurrentSettings(): EnhancedUserSettings {
    return this.cachedSettings;
  }

  /**
   * Subscribe to settings changes
   */
  subscribe(listener: (settings: EnhancedUserSettings) => void): () => void {
    this.listeners.push(listener);
    
    // Immediately notify with current settings
    listener(this.cachedSettings);
    
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * Cleanup listeners
   */
  cleanup(): void {
    if (this.unsubscribeFirebase) {
      this.unsubscribeFirebase();
      this.unsubscribeFirebase = null;
    }
    this.listeners = [];
  }

  // Private methods

  private async loadFromSupabase(userId: string): Promise<EnhancedUserSettings | null> {
    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('settings')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return data?.settings ? { ...DEFAULT_ENHANCED_SETTINGS, ...data.settings } : null;
    } catch (error) {
      console.error('Failed to load from Supabase:', error);
      return null;
    }
  }

  private async loadFromFirebase(userId: string): Promise<EnhancedUserSettings | null> {
    try {
      const docRef = doc(firestore, 'userSettings', userId);
      const docSnap = await getDoc(docRef);
      
      return docSnap.exists() 
        ? { ...DEFAULT_ENHANCED_SETTINGS, ...docSnap.data() as EnhancedUserSettings }
        : null;
    } catch (error) {
      console.error('Failed to load from Firebase:', error);
      return null;
    }
  }

  private loadFromLocalStorage(): EnhancedUserSettings | null {
    try {
      const stored = localStorage.getItem('userSettings');
      return stored 
        ? { ...DEFAULT_ENHANCED_SETTINGS, ...JSON.parse(stored) }
        : null;
    } catch (error) {
      console.error('Failed to load from localStorage:', error);
      return null;
    }
  }

  private async saveToSupabase(userId: string, settings: EnhancedUserSettings): Promise<void> {
    const { error } = await supabase
      .from('user_settings')
      .upsert({
        user_id: userId,
        settings,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id'
      });

    if (error) {
      throw new Error(`Supabase save failed: ${error.message}`);
    }
  }

  private async saveToFirebase(userId: string, settings: EnhancedUserSettings): Promise<void> {
    const docRef = doc(firestore, 'userSettings', userId);
    await setDoc(docRef, {
      ...settings,
      updatedAt: new Date(),
    }, { merge: true });
  }

  private saveToLocalStorage(settings: EnhancedUserSettings): void {
    try {
      localStorage.setItem('userSettings', JSON.stringify(settings));
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
    }
  }

  private mergeSettings(settingsArray: (EnhancedUserSettings | null)[]): EnhancedUserSettings {
    const validSettings = settingsArray.filter(Boolean) as EnhancedUserSettings[];
    
    if (validSettings.length === 0) {
      return DEFAULT_ENHANCED_SETTINGS;
    }

    // Sort by sync timestamp to get the most recent
    validSettings.sort((a, b) => (b.sync?.timestamp || 0) - (a.sync?.timestamp || 0));
    
    // Merge all settings, with newer ones taking precedence
    return validSettings.reduce((merged, current) => ({
      ...merged,
      ...current,
    }), DEFAULT_ENHANCED_SETTINGS);
  }

  private setupFirebaseListener(userId: string): void {
    const docRef = doc(firestore, 'userSettings', userId);
    
    this.unsubscribeFirebase = onSnapshot(docRef, (doc) => {
      if (doc.exists()) {
        const firebaseSettings = { ...DEFAULT_ENHANCED_SETTINGS, ...doc.data() } as EnhancedUserSettings;
        
        // Only update if this is newer than our cached version
        if ((firebaseSettings.sync?.timestamp || 0) > (this.cachedSettings.sync?.timestamp || 0)) {
          this.cachedSettings = firebaseSettings;
          this.notifyListeners(firebaseSettings);
          this.saveToLocalStorage(firebaseSettings);
        }
      }
    }, (error) => {
      console.error('Firebase listener error:', error);
    });
  }

  private setupSupabaseListener(userId: string): void {
    const channel = supabase
      .channel('user_settings_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_settings',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.new && typeof payload.new === 'object' && 'settings' in payload.new) {
            const supabaseSettings = {
              ...DEFAULT_ENHANCED_SETTINGS,
              ...payload.new.settings,
            } as EnhancedUserSettings;
            
            // Only update if this is newer than our cached version
            if ((supabaseSettings.sync?.timestamp || 0) > (this.cachedSettings.sync?.timestamp || 0)) {
              this.cachedSettings = supabaseSettings;
              this.notifyListeners(supabaseSettings);
              this.saveToLocalStorage(supabaseSettings);
            }
          }
        }
      )
      .subscribe();

    // Store channel reference for cleanup
    (this as any).supabaseChannel = channel;
  }

  private notifyListeners(settings: EnhancedUserSettings): void {
    this.listeners.forEach(listener => {
      try {
        listener(settings);
      } catch (error) {
        console.error('Settings listener error:', error);
      }
    });
  }
}

// Export singleton instance
export const settingsService = new SettingsService();

// Helper functions for theme application
export const applyThemeSettings = (settings: EnhancedUserSettings) => {
  const { theme, reducedMotion, compactMode } = settings;
  const root = document.documentElement;
  
  // Apply theme
  let effectiveTheme = theme;
  if (theme === 'system') {
    effectiveTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  
  if (effectiveTheme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
  
  // Apply accessibility settings
  if (reducedMotion) {
    root.style.setProperty('--motion-duration', '0s');
  } else {
    root.style.removeProperty('--motion-duration');
  }
  
  // Apply compact mode
  if (compactMode) {
    root.classList.add('compact-mode');
  } else {
    root.classList.remove('compact-mode');
  }
  
  // Dispatch theme change event
  window.dispatchEvent(new CustomEvent('themeChanged', {
    detail: { theme: effectiveTheme, settings }
  }));
};

// Export types for use in other files
export type { EnhancedUserSettings, SettingsSync };