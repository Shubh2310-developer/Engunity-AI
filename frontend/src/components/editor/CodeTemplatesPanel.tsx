'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select';
import {
  FileCode,
  Search,
  XCircle,
  Copy,
  Filter,
  Sparkles,
  Zap,
} from 'lucide-react';
import {
  CODE_TEMPLATES,
  CodeTemplate,
  TemplateCategory,
  TemplateDifficulty,
  getTemplatesByLanguage,
  getTemplatesByCategory,
  getTemplatesByDifficulty,
  searchTemplates,
  getAllCategories,
} from '@/lib/editor/codeTemplates';

interface CodeTemplatesPanelProps {
  isOpen?: boolean;
  onClose?: () => void;
  onInsertTemplate?: (code: string) => void;
  currentLanguage?: string;
}

export default function CodeTemplatesPanel({
  isOpen = true,
  onClose,
  onInsertTemplate,
  currentLanguage,
}: CodeTemplatesPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [selectedTemplate, setSelectedTemplate] = useState<CodeTemplate | null>(null);

  // Filter templates
  const getFilteredTemplates = (): CodeTemplate[] => {
    let templates = CODE_TEMPLATES;

    // Filter by current language if provided
    if (currentLanguage) {
      templates = getTemplatesByLanguage(currentLanguage);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      templates = searchTemplates(searchQuery);
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      templates = templates.filter((t) => t.category === selectedCategory);
    }

    // Filter by difficulty
    if (selectedDifficulty !== 'all') {
      templates = templates.filter((t) => t.difficulty === selectedDifficulty);
    }

    return templates;
  };

  const filteredTemplates = getFilteredTemplates();
  const categories = ['all', ...getAllCategories()];

  const handleInsertTemplate = (template: CodeTemplate) => {
    if (onInsertTemplate) {
      onInsertTemplate(template.code);
    }
    setSelectedTemplate(null);
  };

  const handleCopyTemplate = (code: string) => {
    navigator.clipboard.writeText(code);
  };

  const getDifficultyColor = (difficulty: TemplateDifficulty) => {
    switch (difficulty) {
      case 'beginner':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'intermediate':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'advanced':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
    }
  };

  const getDifficultyIcon = (difficulty: TemplateDifficulty) => {
    switch (difficulty) {
      case 'beginner':
        return '🌱';
      case 'intermediate':
        return '⚡';
      case 'advanced':
        return '🚀';
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.aside
          initial={{ x: 300, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 300, opacity: 0 }}
          transition={{ duration: 0.25, ease: 'easeInOut' }}
          className="fixed right-0 top-0 h-full w-96 bg-neutral-900/60 backdrop-blur-xl border-l border-neutral-800 rounded-l-2xl shadow-2xl z-50"
        >
          <div className="h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-neutral-800/40 border-b border-neutral-700/50">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/30">
                  <FileCode className="w-4 h-4 text-cyan-400" />
                </div>
                <h2 className="text-lg font-semibold text-white">Code Templates</h2>
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

            {/* Search & Filters */}
            <div className="px-6 py-4 space-y-3 border-b border-neutral-700/50">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search templates..."
                  className="pl-10 bg-neutral-900/60 border-neutral-700 text-neutral-300 placeholder:text-neutral-500 focus:border-cyan-500"
                />
              </div>

              {/* Filters */}
              <div className="flex items-center gap-2">
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="flex-1 bg-neutral-900/60 border-neutral-700 text-neutral-300 text-sm">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent className="bg-neutral-950/95 border-neutral-700">
                    {categories.map((cat) => (
                      <SelectItem
                        key={cat}
                        value={cat}
                        className="text-neutral-300 hover:bg-neutral-800 focus:bg-neutral-800 capitalize"
                      >
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
                  <SelectTrigger className="flex-1 bg-neutral-900/60 border-neutral-700 text-neutral-300 text-sm">
                    <SelectValue placeholder="Difficulty" />
                  </SelectTrigger>
                  <SelectContent className="bg-neutral-950/95 border-neutral-700">
                    <SelectItem
                      value="all"
                      className="text-neutral-300 hover:bg-neutral-800 focus:bg-neutral-800"
                    >
                      All Levels
                    </SelectItem>
                    <SelectItem
                      value="beginner"
                      className="text-neutral-300 hover:bg-neutral-800 focus:bg-neutral-800"
                    >
                      🌱 Beginner
                    </SelectItem>
                    <SelectItem
                      value="intermediate"
                      className="text-neutral-300 hover:bg-neutral-800 focus:bg-neutral-800"
                    >
                      ⚡ Intermediate
                    </SelectItem>
                    <SelectItem
                      value="advanced"
                      className="text-neutral-300 hover:bg-neutral-800 focus:bg-neutral-800"
                    >
                      🚀 Advanced
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Active Filters Display */}
              {(searchQuery || selectedCategory !== 'all' || selectedDifficulty !== 'all') && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-neutral-500">Active filters:</span>
                  {searchQuery && (
                    <Badge
                      variant="secondary"
                      className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30 text-xs"
                    >
                      Search: {searchQuery}
                    </Badge>
                  )}
                  {selectedCategory !== 'all' && (
                    <Badge
                      variant="secondary"
                      className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs"
                    >
                      {selectedCategory}
                    </Badge>
                  )}
                  {selectedDifficulty !== 'all' && (
                    <Badge
                      variant="secondary"
                      className={`${getDifficultyColor(selectedDifficulty as TemplateDifficulty)} text-xs`}
                    >
                      {selectedDifficulty}
                    </Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedCategory('all');
                      setSelectedDifficulty('all');
                    }}
                    className="h-6 px-2 text-xs text-neutral-400 hover:text-white"
                  >
                    Clear all
                  </Button>
                </div>
              )}
            </div>

            {/* Templates List */}
            <ScrollArea className="flex-1 px-6 py-4">
              {filteredTemplates.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center justify-center h-full text-center p-6"
                >
                  <div className="p-4 rounded-full bg-neutral-800/50 mb-4">
                    <FileCode className="w-8 h-8 text-neutral-600" />
                  </div>
                  <p className="text-sm text-neutral-500 italic">
                    No templates found matching your criteria.
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedCategory('all');
                      setSelectedDifficulty('all');
                    }}
                    className="mt-4 text-cyan-400 hover:text-cyan-300"
                  >
                    Reset filters
                  </Button>
                </motion.div>
              ) : (
                <div className="space-y-3">
                  {filteredTemplates.map((template, index) => (
                    <motion.div
                      key={template.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Card
                        className="bg-neutral-800/40 border-neutral-700 hover:border-cyan-500/50 transition-all cursor-pointer p-4 space-y-3"
                        onClick={() => setSelectedTemplate(template)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 flex-1">
                            <span className="text-lg">{template.icon || '📄'}</span>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-sm font-semibold text-white truncate">
                                {template.name}
                              </h3>
                              <p className="text-xs text-neutral-400 line-clamp-2">
                                {template.description}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge
                            variant="secondary"
                            className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs"
                          >
                            {template.language}
                          </Badge>
                          <Badge
                            variant="secondary"
                            className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-xs"
                          >
                            {template.category}
                          </Badge>
                          <Badge
                            variant="secondary"
                            className={`${getDifficultyColor(template.difficulty)} text-xs`}
                          >
                            {getDifficultyIcon(template.difficulty)} {template.difficulty}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleInsertTemplate(template);
                            }}
                            className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white text-xs h-8"
                          >
                            <Sparkles className="w-3 h-3 mr-1" />
                            Insert
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopyTemplate(template.code);
                            }}
                            className="border-neutral-600 text-neutral-400 hover:text-white hover:bg-neutral-800 text-xs h-8 px-3"
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
            </ScrollArea>

            {/* Stats Footer */}
            <div className="px-6 py-3 bg-neutral-800/40 border-t border-neutral-700/50">
              <div className="flex items-center justify-between text-xs text-neutral-500">
                <span>
                  {filteredTemplates.length} template{filteredTemplates.length !== 1 ? 's' : ''}{' '}
                  {currentLanguage && `for ${currentLanguage}`}
                </span>
                <div className="flex items-center gap-2">
                  <Zap className="w-3 h-3 text-cyan-400" />
                  <span className="text-cyan-400">Quick Insert</span>
                </div>
              </div>
            </div>

            {/* Bottom Accent Line */}
            <div className="h-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-cyan-500 opacity-30" />
          </div>
        </motion.aside>
      )}

      {/* Template Preview Modal */}
      <AnimatePresence>
        {selectedTemplate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6"
            onClick={() => setSelectedTemplate(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-3xl max-h-[80vh] bg-neutral-900 rounded-2xl border border-neutral-800 shadow-2xl overflow-hidden"
            >
              <div className="flex flex-col h-full">
                {/* Modal Header */}
                <div className="flex items-center justify-between px-6 py-4 bg-neutral-800/40 border-b border-neutral-700/50">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{selectedTemplate.icon || '📄'}</span>
                    <div>
                      <h3 className="text-lg font-semibold text-white">
                        {selectedTemplate.name}
                      </h3>
                      <p className="text-xs text-neutral-400">
                        {selectedTemplate.description}
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={() => setSelectedTemplate(null)}
                    variant="ghost"
                    size="sm"
                    className="text-neutral-400 hover:text-red-400"
                  >
                    <XCircle className="w-5 h-5" />
                  </Button>
                </div>

                {/* Template Metadata */}
                <div className="px-6 py-3 bg-neutral-800/20 border-b border-neutral-700/50 flex items-center gap-2 flex-wrap">
                  <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                    {selectedTemplate.language}
                  </Badge>
                  <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                    {selectedTemplate.category}
                  </Badge>
                  <Badge className={getDifficultyColor(selectedTemplate.difficulty)}>
                    {getDifficultyIcon(selectedTemplate.difficulty)}{' '}
                    {selectedTemplate.difficulty}
                  </Badge>
                  {selectedTemplate.tags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="bg-neutral-700/50 text-neutral-300 text-xs"
                    >
                      #{tag}
                    </Badge>
                  ))}
                </div>

                {/* Code Preview */}
                <ScrollArea className="flex-1 p-6">
                  <pre className="text-sm text-neutral-300 font-mono bg-neutral-950/50 rounded-lg p-4 overflow-x-auto">
                    <code>{selectedTemplate.code}</code>
                  </pre>
                </ScrollArea>

                {/* Modal Footer */}
                <div className="px-6 py-4 bg-neutral-800/40 border-t border-neutral-700/50 flex items-center justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => handleCopyTemplate(selectedTemplate.code)}
                    className="border-neutral-600 text-neutral-400 hover:text-white hover:bg-neutral-800"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Code
                  </Button>
                  <Button
                    onClick={() => handleInsertTemplate(selectedTemplate)}
                    className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Insert Template
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AnimatePresence>
  );
}
