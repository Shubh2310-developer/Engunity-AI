'use client';

import React from 'react';
import { useGlobalSettings } from '@/hooks/useGlobalSettings';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { Button } from '@/components/ui/button';
import { Moon, Sun, Settings, Check, X } from 'lucide-react';

export function SettingsShowcase() {
  const { settings, updateSettings, isLoading, mounted } = useGlobalSettings();

  if (!mounted) {
    return <div>Loading settings...</div>;
  }

  const handleQuickThemeToggle = async () => {
    const newTheme = settings.theme === 'light' ? 'dark' : 'light';
    await updateSettings({ theme: newTheme });
  };

  const handleNotificationToggle = async () => {
    await updateSettings({ emailNotifications: !settings.emailNotifications });
  };

  return (
    <Card className="w-full max-w-2xl mx-auto mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Live Settings Demo - Changes Apply Instantly
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        
        {/* Current Theme Display */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-3">
            {settings.theme === 'light' ? (
              <Sun className="w-5 h-5 text-yellow-500" />
            ) : (
              <Moon className="w-5 h-5 text-blue-500" />
            )}
            <div>
              <p className="font-medium">Current Theme</p>
              <p className="text-sm text-gray-600">Active: {settings.theme}</p>
            </div>
          </div>
          <Badge variant={settings.theme === 'light' ? 'default' : 'secondary'}>
            {settings.theme.charAt(0).toUpperCase() + settings.theme.slice(1)}
          </Badge>
        </div>

        {/* Theme Controls */}
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Theme Toggle</p>
            <p className="text-sm text-gray-600">Switch between light and dark themes</p>
          </div>
          <div className="flex gap-2">
            <ThemeToggle />
            <Button
              variant="outline"
              size="sm"
              onClick={handleQuickThemeToggle}
              disabled={isLoading}
            >
              Quick Toggle
            </Button>
          </div>
        </div>

        {/* Notification Settings */}
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Email Notifications</p>
            <p className="text-sm text-gray-600">Receive notifications via email</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleNotificationToggle}
              disabled={isLoading}
            >
              {settings.emailNotifications ? (
                <>
                  <Check className="w-4 h-4 mr-1 text-green-600" />
                  Enabled
                </>
              ) : (
                <>
                  <X className="w-4 h-4 mr-1 text-red-600" />
                  Disabled
                </>
              )}
            </Button>
          </div>
        </div>

        {/* AI Assistant Style */}
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">AI Assistant Style</p>
            <p className="text-sm text-gray-600">How the AI responds to queries</p>
          </div>
          <Badge variant="outline">
            {settings.aiAssistantStyle}
          </Badge>
        </div>

        {/* Settings Status */}
        <div className="pt-4 border-t">
          <div className="text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-600">Settings Status:</span>
              <span className="font-medium">
                {isLoading ? '🔄 Saving...' : '✅ All changes saved'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Storage:</span>
              <span className="font-medium">localStorage + Database</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Auto Save:</span>
              <span className="font-medium">{settings.autoSave ? 'On' : 'Off'}</span>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Test Instructions:</strong> Change any setting above and watch it apply immediately across the entire website. 
            No refresh needed - all changes are live and persistent!
          </p>
        </div>

      </CardContent>
    </Card>
  );
}