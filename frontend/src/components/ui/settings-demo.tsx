'use client';

import React from 'react';
import { 
  useEnhancedSettings, 
  useThemeSettings, 
  useNotificationSettings, 
  useAISettings 
} from '@/contexts/EnhancedSettingsContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Settings, Moon, Sun, Monitor, Bell, BellOff, Brain } from 'lucide-react';

export function SettingsDemo() {
  const { settings, isLoading, isOnline, lastSyncTime } = useEnhancedSettings();
  const { theme, setTheme, isDarkMode } = useThemeSettings();
  const { 
    emailNotifications, 
    pushNotifications, 
    setEmailNotifications, 
    setPushNotifications 
  } = useNotificationSettings();
  const { aiAssistantStyle, setAIAssistantStyle } = useAISettings();

  return (
    <div className="space-y-4">
      <Card className="border-2 border-dashed border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Settings Demo - Working Across Components
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {/* Theme Settings */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              {theme === 'light' && <Sun className="w-4 h-4" />}
              {theme === 'dark' && <Moon className="w-4 h-4" />}
              {theme === 'system' && <Monitor className="w-4 h-4" />}
              <Label className="font-medium">Theme Settings</Label>
              <Badge variant={isDarkMode ? 'default' : 'secondary'}>
                {theme} {isDarkMode ? '(Dark Active)' : '(Light Active)'}
              </Badge>
            </div>
            
            <div className="flex gap-2">
              <Button
                variant={theme === 'light' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTheme('light')}
                disabled={isLoading}
              >
                <Sun className="w-4 h-4 mr-1" />
                Light
              </Button>
              <Button
                variant={theme === 'dark' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTheme('dark')}
                disabled={isLoading}
              >
                <Moon className="w-4 h-4 mr-1" />
                Dark
              </Button>
              <Button
                variant={theme === 'system' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTheme('system')}
                disabled={isLoading}
              >
                <Monitor className="w-4 h-4 mr-1" />
                System
              </Button>
            </div>
          </div>

          {/* Notification Settings */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              {emailNotifications || pushNotifications ? (
                <Bell className="w-4 h-4" />
              ) : (
                <BellOff className="w-4 h-4" />
              )}
              <Label className="font-medium">Notification Settings</Label>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="email-demo">Email Notifications</Label>
                <Switch
                  id="email-demo"
                  checked={emailNotifications}
                  onCheckedChange={setEmailNotifications}
                  disabled={isLoading}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="push-demo">Push Notifications</Label>
                <Switch
                  id="push-demo"
                  checked={pushNotifications}
                  onCheckedChange={setPushNotifications}
                  disabled={isLoading}
                />
              </div>
            </div>
          </div>

          {/* AI Settings */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Brain className="w-4 h-4" />
              <Label className="font-medium">AI Assistant Style</Label>
              <Badge variant="outline">{aiAssistantStyle}</Badge>
            </div>
            
            <Select
              value={aiAssistantStyle}
              onValueChange={(value: 'professional' | 'friendly' | 'technical' | 'creative') => 
                setAIAssistantStyle(value)
              }
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="professional">Professional</SelectItem>
                <SelectItem value="friendly">Friendly</SelectItem>
                <SelectItem value="technical">Technical</SelectItem>
                <SelectItem value="creative">Creative</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Enhanced Settings Status */}
          <div className="pt-4 border-t">
            <div className="text-sm text-muted-foreground space-y-1">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
                <strong>Status:</strong> {isLoading ? 'Saving...' : 'All changes auto-saved'}
                <Badge variant="outline" className="text-xs">
                  {isOnline ? 'Online' : 'Offline'}
                </Badge>
              </div>
              <p><strong>Storage:</strong> localStorage + Supabase + Firebase</p>
              <p><strong>Privacy:</strong> {settings.documentPrivacy}</p>
              <p><strong>Language:</strong> {settings.language}</p>
              {lastSyncTime && (
                <p><strong>Last Sync:</strong> {lastSyncTime.toLocaleTimeString()}</p>
              )}
              <p><strong>Chat Auto-save:</strong> {settings.chatSettings?.autoSave ? 'Enabled' : 'Disabled'}</p>
              <p><strong>Doc Auto-sync:</strong> {settings.documentSettings?.autoSync ? 'Enabled' : 'Disabled'}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}