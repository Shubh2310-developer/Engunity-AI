'use client';

import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { Code2, Check } from 'lucide-react';
import { getAllLanguages } from '@/lib/editor/languageConfig';

interface LanguageSelectorProps {
  value?: string;
  onChange?: (language: string) => void;
  showLabel?: boolean;
  className?: string;
}

export default function LanguageSelector({
  value = 'python',
  onChange,
  showLabel = true,
  className = '',
}: LanguageSelectorProps) {
  const languages = getAllLanguages();

  // Load saved language preference from localStorage
  useEffect(() => {
    const savedLanguage = localStorage.getItem('engunity-editor-language');
    if (savedLanguage && onChange) {
      onChange(savedLanguage);
    }
  }, []);

  const handleLanguageChange = (newLanguage: string) => {
    if (onChange) {
      onChange(newLanguage);
    }
    // Persist to localStorage
    localStorage.setItem('engunity-editor-language', newLanguage);
  };

  const currentLanguage = languages.find((lang) => lang.id === value);

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`flex items-center gap-3 ${className}`}
    >
      {showLabel && (
        <Label htmlFor="language-select" className="text-sm font-medium text-neutral-300 flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/30">
            <Code2 className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <span>Language</span>
        </Label>
      )}

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="relative">
              <Select value={value} onValueChange={handleLanguageChange}>
                <SelectTrigger
                  id="language-select"
                  aria-label="Language Selector"
                  className="
                    w-44 h-10
                    bg-neutral-900/60 backdrop-blur-lg
                    border border-neutral-800
                    hover:border-cyan-500
                    text-neutral-300
                    rounded-xl
                    transition-all duration-200
                    focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500
                    shadow-lg shadow-black/10
                  "
                >
                  <div className="flex items-center gap-2">
                    {currentLanguage && (
                      <span className="text-base">{currentLanguage.icon}</span>
                    )}
                    <SelectValue placeholder="Select language" />
                  </div>
                </SelectTrigger>

                <SelectContent
                  className="
                    bg-neutral-950/95 backdrop-blur-lg
                    border border-neutral-800
                    rounded-xl
                    shadow-2xl shadow-black/50
                    overflow-hidden
                  "
                >
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    {languages.map((lang) => (
                      <SelectItem
                        key={lang.id}
                        value={lang.id}
                        className="
                          text-neutral-300
                          hover:bg-neutral-800/70
                          hover:text-white
                          focus:bg-neutral-800/70
                          focus:text-white
                          cursor-pointer
                          transition-all duration-150
                          data-[state=checked]:text-cyan-400
                          data-[state=checked]:font-medium
                          py-2.5 px-3
                          relative
                        "
                      >
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-2">
                            <span className="text-base">{lang.icon}</span>
                            <span>{lang.name}</span>
                          </div>
                          {value === lang.id && (
                            <motion.div
                              initial={{ scale: 0, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              transition={{ duration: 0.2 }}
                            >
                              <Check className="w-4 h-4 text-cyan-400" />
                            </motion.div>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </motion.div>
                </SelectContent>
              </Select>

              {/* Gradient Ring on Hover */}
              <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-cyan-500/0 via-cyan-500/10 to-blue-500/0 opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none -z-10 blur-sm" />
            </div>
          </TooltipTrigger>
          <TooltipContent
            side="top"
            className="bg-neutral-900 border-neutral-700 text-neutral-200"
          >
            Select programming language
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </motion.div>
  );
}
