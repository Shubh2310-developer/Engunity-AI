'use client';

import React from 'react';
import { Moon, Sun, Monitor } from 'lucide-react';
import { useThemeSettings } from '@/contexts/EnhancedSettingsContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function ThemeToggle() {
  const { theme, setTheme } = useThemeSettings();

  const themes = [
    {
      value: 'light' as const,
      label: 'Light',
      icon: Sun,
    },
    {
      value: 'dark' as const,
      label: 'Dark',
      icon: Moon,
    },
    {
      value: 'system' as const,
      label: 'System',
      icon: Monitor,
    },
  ];

  const currentTheme = themes.find(t => t.value === theme);
  const CurrentIcon = currentTheme?.icon || Monitor;

  const handleThemeChange = async (newTheme: 'light' | 'dark' | 'system') => {
    try {
      await setTheme(newTheme);
    } catch (error) {
      console.error('Failed to update theme:', error);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 px-0"
          aria-label="Toggle theme"
        >
          <CurrentIcon className="h-4 w-4" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[120px]">
        {themes.map((themeOption) => {
          const Icon = themeOption.icon;
          const isActive = theme === themeOption.value;
          
          return (
            <DropdownMenuItem
              key={themeOption.value}
              onClick={() => handleThemeChange(themeOption.value)}
              className={`flex items-center gap-2 cursor-pointer ${
                isActive ? 'bg-accent text-accent-foreground' : ''
              }`}
            >
              <Icon className="h-4 w-4" />
              {themeOption.label}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function SimpleThemeToggle() {
  const { theme, toggleTheme, isDarkMode } = useThemeSettings();

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleTheme}
      className="h-8 w-8 px-0"
      aria-label={`Switch to ${isDarkMode ? 'light' : 'dark'} theme`}
    >
      {isDarkMode ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}