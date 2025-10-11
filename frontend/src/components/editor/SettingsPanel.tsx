'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { Settings, Moon, Sun, Type, Ruler, XCircle, Save, Code2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface SettingsPanelProps {
  isOpen?: boolean;
  onClose?: () => void;
  // Editor settings props
  theme?: string;
  onThemeChange?: (theme: string) => void;
  fontSize?: number;
  onFontSizeChange?: (size: number) => void;
  fontFamily?: string;
  onFontFamilyChange?: (family: string) => void;
  lineNumbers?: boolean;
  onLineNumbersChange?: (enabled: boolean) => void;
  tabWidth?: number;
  onTabWidthChange?: (width: number) => void;
  minimap?: boolean;
  onMinimapChange?: (enabled: boolean) => void;
  wordWrap?: boolean;
  onWordWrapChange?: (enabled: boolean) => void;
}

const FONT_FAMILIES = [
  { value: 'fira-code', label: 'Fira Code', family: '"Fira Code", monospace' },
  { value: 'jetbrains-mono', label: 'JetBrains Mono', family: '"JetBrains Mono", monospace' },
  { value: 'source-code-pro', label: 'Source Code Pro', family: '"Source Code Pro", monospace' },
  { value: 'monaco', label: 'Monaco', family: 'Monaco, monospace' },
  { value: 'consolas', label: 'Consolas', family: 'Consolas, monospace' },
];

const THEMES = [
  { value: 'vs-dark', label: 'Dark', icon: Moon },
  { value: 'vs-light', label: 'Light', icon: Sun },
  { value: 'hc-black', label: 'High Contrast Dark', icon: Moon },
];

export default function SettingsPanel({
  isOpen = true,
  onClose,
  theme = 'vs-dark',
  onThemeChange,
  fontSize = 14,
  onFontSizeChange,
  fontFamily = 'fira-code',
  onFontFamilyChange,
  lineNumbers = true,
  onLineNumbersChange,
  tabWidth = 4,
  onTabWidthChange,
  minimap = true,
  onMinimapChange,
  wordWrap = false,
  onWordWrapChange,
}: SettingsPanelProps) {
  // Local state for persistence
  useEffect(() => {
    // Load from localStorage
    const savedSettings = localStorage.getItem('engunity-editor-settings');
    if (savedSettings) {
      const settings = JSON.parse(savedSettings);
      if (settings.theme && onThemeChange) onThemeChange(settings.theme);
      if (settings.fontSize && onFontSizeChange) onFontSizeChange(settings.fontSize);
      if (settings.fontFamily && onFontFamilyChange) onFontFamilyChange(settings.fontFamily);
      if (settings.lineNumbers !== undefined && onLineNumbersChange) onLineNumbersChange(settings.lineNumbers);
      if (settings.tabWidth && onTabWidthChange) onTabWidthChange(settings.tabWidth);
      if (settings.minimap !== undefined && onMinimapChange) onMinimapChange(settings.minimap);
      if (settings.wordWrap !== undefined && onWordWrapChange) onWordWrapChange(settings.wordWrap);
    }
  }, []);

  const saveSettings = () => {
    const settings = {
      theme,
      fontSize,
      fontFamily,
      lineNumbers,
      tabWidth,
      minimap,
      wordWrap,
    };
    localStorage.setItem('engunity-editor-settings', JSON.stringify(settings));
  };

  // Auto-save on changes
  useEffect(() => {
    saveSettings();
  }, [theme, fontSize, fontFamily, lineNumbers, tabWidth, minimap, wordWrap]);

  const handleThemeChange = (newTheme: string) => {
    if (onThemeChange) onThemeChange(newTheme);
  };

  const handleFontSizeChange = (value: number[]) => {
    if (onFontSizeChange) onFontSizeChange(value[0]);
  };

  const handleFontFamilyChange = (newFamily: string) => {
    if (onFontFamilyChange) onFontFamilyChange(newFamily);
  };

  const handleLineNumbersChange = (checked: boolean) => {
    if (onLineNumbersChange) onLineNumbersChange(checked);
  };

  const handleTabWidthChange = (value: number[]) => {
    if (onTabWidthChange) onTabWidthChange(value[0]);
  };

  const handleMinimapChange = (checked: boolean) => {
    if (onMinimapChange) onMinimapChange(checked);
  };

  const handleWordWrapChange = (checked: boolean) => {
    if (onWordWrapChange) onWordWrapChange(checked);
  };

  const currentTheme = THEMES.find((t) => t.value === theme) || THEMES[0];
  const currentFont = FONT_FAMILIES.find((f) => f.value === fontFamily) || FONT_FAMILIES[0];

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.aside
          initial={{ x: 300, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 300, opacity: 0 }}
          transition={{ duration: 0.25, ease: 'easeInOut' }}
          className="fixed right-0 top-0 h-full w-80 bg-neutral-900/60 backdrop-blur-xl border-l border-neutral-800 rounded-l-2xl shadow-2xl z-50"
        >
          <div className="h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-neutral-800/40 border-b border-neutral-700/50">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-600/20 border border-purple-500/30">
                  <Settings className="w-4 h-4 text-purple-400" />
                </div>
                <h2 className="text-lg font-semibold text-white">Editor Settings</h2>
              </div>
              {onClose && (
                <Button
                  onClick={onClose}
                  variant="ghost"
                  size="sm"
                  className="text-neutral-400 hover:text-red-400 hover:bg-neutral-800 transition-colors"
                >
                  <XCircle className="w-4 h-4" />
                </Button>
              )}
            </div>

            {/* Settings Content */}
            <ScrollArea className="flex-1 px-6 py-4">
              <div className="space-y-6">
                {/* Appearance Section */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <Card className="bg-neutral-800/40 border-neutral-700 p-4 space-y-4">
                    <h3 className="text-sm font-semibold text-neutral-200 flex items-center gap-2">
                      <Sun className="w-4 h-4 text-amber-400" />
                      Appearance
                    </h3>

                    {/* Theme Selector */}
                    <div className="space-y-2">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Label htmlFor="theme" className="text-sm text-neutral-400">
                              Theme
                            </Label>
                          </TooltipTrigger>
                          <TooltipContent>Toggle between light and dark themes</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <Select value={theme} onValueChange={handleThemeChange}>
                        <SelectTrigger
                          id="theme"
                          className="bg-neutral-900/60 border-neutral-700 text-neutral-300 hover:border-purple-500 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            {React.createElement(currentTheme.icon, { className: 'w-4 h-4' })}
                            <SelectValue />
                          </div>
                        </SelectTrigger>
                        <SelectContent className="bg-neutral-950/95 border-neutral-700">
                          {THEMES.map((t) => (
                            <SelectItem
                              key={t.value}
                              value={t.value}
                              className="text-neutral-300 hover:bg-neutral-800 focus:bg-neutral-800"
                            >
                              <div className="flex items-center gap-2">
                                {React.createElement(t.icon, { className: 'w-4 h-4' })}
                                {t.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </Card>
                </motion.div>

                {/* Text Settings Section */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <Card className="bg-neutral-800/40 border-neutral-700 p-4 space-y-4">
                    <h3 className="text-sm font-semibold text-neutral-200 flex items-center gap-2">
                      <Type className="w-4 h-4 text-cyan-400" />
                      Text Settings
                    </h3>

                    {/* Font Family */}
                    <div className="space-y-2">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Label htmlFor="font-family" className="text-sm text-neutral-400">
                              Font Family
                            </Label>
                          </TooltipTrigger>
                          <TooltipContent>Choose your preferred monospace font</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <Select value={fontFamily} onValueChange={handleFontFamilyChange}>
                        <SelectTrigger
                          id="font-family"
                          className="bg-neutral-900/60 border-neutral-700 text-neutral-300 hover:border-cyan-500 transition-colors"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-neutral-950/95 border-neutral-700">
                          {FONT_FAMILIES.map((font) => (
                            <SelectItem
                              key={font.value}
                              value={font.value}
                              className="text-neutral-300 hover:bg-neutral-800 focus:bg-neutral-800"
                              style={{ fontFamily: font.family }}
                            >
                              {font.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Font Size */}
                    <div className="space-y-2">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center justify-between">
                              <Label htmlFor="font-size" className="text-sm text-neutral-400">
                                Font Size
                              </Label>
                              <span className="text-sm font-semibold text-cyan-400">{fontSize}px</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>Adjust the font size (12-24px)</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <Slider
                        id="font-size"
                        min={12}
                        max={24}
                        step={1}
                        value={[fontSize]}
                        onValueChange={handleFontSizeChange}
                        className="cursor-pointer"
                      />
                    </div>

                    {/* Tab Width */}
                    <div className="space-y-2">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center justify-between">
                              <Label htmlFor="tab-width" className="text-sm text-neutral-400">
                                Tab Width
                              </Label>
                              <span className="text-sm font-semibold text-cyan-400">{tabWidth} spaces</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>Set the number of spaces per tab (2-8)</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <Slider
                        id="tab-width"
                        min={2}
                        max={8}
                        step={1}
                        value={[tabWidth]}
                        onValueChange={handleTabWidthChange}
                        className="cursor-pointer"
                      />
                    </div>
                  </Card>
                </motion.div>

                {/* Layout Settings Section */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <Card className="bg-neutral-800/40 border-neutral-700 p-4 space-y-4">
                    <h3 className="text-sm font-semibold text-neutral-200 flex items-center gap-2">
                      <Ruler className="w-4 h-4 text-blue-400" />
                      Layout
                    </h3>

                    {/* Line Numbers */}
                    <div className="flex items-center justify-between">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Label htmlFor="line-numbers" className="text-sm text-neutral-400 cursor-pointer">
                              Show Line Numbers
                            </Label>
                          </TooltipTrigger>
                          <TooltipContent>Toggle line number visibility</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <Switch
                        id="line-numbers"
                        checked={lineNumbers}
                        onCheckedChange={handleLineNumbersChange}
                        className="data-[state=checked]:bg-cyan-500"
                      />
                    </div>

                    {/* Minimap */}
                    <div className="flex items-center justify-between">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Label htmlFor="minimap" className="text-sm text-neutral-400 cursor-pointer">
                              Show Minimap
                            </Label>
                          </TooltipTrigger>
                          <TooltipContent>Display code overview minimap</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <Switch
                        id="minimap"
                        checked={minimap}
                        onCheckedChange={handleMinimapChange}
                        className="data-[state=checked]:bg-cyan-500"
                      />
                    </div>

                    {/* Word Wrap */}
                    <div className="flex items-center justify-between">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Label htmlFor="word-wrap" className="text-sm text-neutral-400 cursor-pointer">
                              Word Wrap
                            </Label>
                          </TooltipTrigger>
                          <TooltipContent>Wrap long lines automatically</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <Switch
                        id="word-wrap"
                        checked={wordWrap}
                        onCheckedChange={handleWordWrapChange}
                        className="data-[state=checked]:bg-cyan-500"
                      />
                    </div>
                  </Card>
                </motion.div>

                {/* Info Card */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <Card className="bg-gradient-to-br from-purple-500/10 to-pink-600/10 border-purple-500/30 p-4">
                    <div className="flex items-start gap-3">
                      <Code2 className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p className="text-xs text-neutral-300">
                          Settings are saved automatically and persist across sessions.
                        </p>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              </div>
            </ScrollArea>

            {/* Footer */}
            <div className="px-6 py-4 bg-neutral-800/40 border-t border-neutral-700/50">
              <div className="flex items-center justify-between text-xs text-neutral-500">
                <span>Auto-saved</span>
                <div className="flex items-center gap-2">
                  <Save className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-400">Preferences saved</span>
                </div>
              </div>
            </div>

            {/* Bottom Accent Line */}
            <div className="h-1 bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 opacity-30" />
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
