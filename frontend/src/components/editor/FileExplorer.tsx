'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import {
  Folder,
  File,
  ChevronRight,
  Plus,
  Trash2,
  Edit,
  FolderPlus,
  FilePlus,
} from 'lucide-react';
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
} from '@/components/ui/context-menu';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';

export interface FileNode {
  id: string;
  name: string;
  type: 'file' | 'folder';
  children?: FileNode[];
}

interface FileExplorerProps {
  files?: FileNode[];
  activeFileId?: string;
  onFileSelect?: (fileId: string, fileName: string) => void;
  onFileCreate?: (parentId: string | null, name: string) => void;
  onFolderCreate?: (parentId: string | null, name: string) => void;
  onFileRename?: (fileId: string, newName: string) => void;
  onFileDelete?: (fileId: string) => void;
}

export default function FileExplorer({
  files = [],
  activeFileId,
  onFileSelect,
  onFileCreate,
  onFolderCreate,
  onFileRename,
  onFileDelete,
}: FileExplorerProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['1']));

  const toggleFolder = (folderId: string) => {
    setExpandedFolders((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(folderId)) {
        newSet.delete(folderId);
      } else {
        newSet.add(folderId);
      }
      return newSet;
    });
  };

  const handleFileClick = (node: FileNode) => {
    if (node.type === 'file' && onFileSelect) {
      onFileSelect(node.id, node.name);
    } else if (node.type === 'folder') {
      toggleFolder(node.id);
    }
  };

  const handleContextAction = (action: string, node: FileNode) => {
    switch (action) {
      case 'new-file':
        const fileName = prompt('Enter file name:');
        if (fileName && onFileCreate) {
          onFileCreate(node.type === 'folder' ? node.id : null, fileName);
        }
        break;
      case 'new-folder':
        const folderName = prompt('Enter folder name:');
        if (folderName && onFolderCreate) {
          onFolderCreate(node.type === 'folder' ? node.id : null, folderName);
        }
        break;
      case 'rename':
        const newName = prompt('Enter new name:', node.name);
        if (newName && newName !== node.name && onFileRename) {
          onFileRename(node.id, newName);
        }
        break;
      case 'delete':
        if (confirm(`Delete ${node.name}?`) && onFileDelete) {
          onFileDelete(node.id);
        }
        break;
    }
  };

  const renderFileNode = (node: FileNode, depth: number = 0): React.ReactNode => {
    const isFolder = node.type === 'folder';
    const isExpanded = expandedFolders.has(node.id);
    const isActive = node.id === activeFileId;
    const hasChildren = isFolder && node.children && node.children.length > 0;

    return (
      <div key={node.id} className="w-full">
        <ContextMenu>
          <ContextMenuTrigger asChild>
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2 }}
              className={`
                flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer
                transition-all duration-200 group
                ${isActive
                  ? 'bg-neutral-800 text-cyan-400 border-l-2 border-cyan-500 font-semibold'
                  : 'text-neutral-300 hover:bg-neutral-800/70 hover:text-white'
                }
              `}
              style={{ paddingLeft: `${depth * 16 + 12}px` }}
              onClick={() => handleFileClick(node)}
            >
              {/* Expand/Collapse Icon for Folders */}
              {isFolder && (
                <motion.div
                  animate={{ rotate: isExpanded ? 90 : 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex-shrink-0"
                >
                  <ChevronRight className="w-4 h-4 text-neutral-500" />
                </motion.div>
              )}

              {/* File/Folder Icon */}
              <div className="flex-shrink-0">
                {isFolder ? (
                  <Folder className={`w-4 h-4 ${isExpanded ? 'text-amber-400' : 'text-neutral-400'}`} />
                ) : (
                  <File className="w-4 h-4 text-blue-400" />
                )}
              </div>

              {/* Name */}
              <span className="text-sm font-mono truncate flex-1">{node.name}</span>

              {/* Hover Actions */}
              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                {isFolder && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 hover:bg-neutral-700"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleContextAction('new-file', node);
                          }}
                        >
                          <FilePlus className="w-3 h-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>New File</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            </motion.div>
          </ContextMenuTrigger>

          {/* Context Menu */}
          <ContextMenuContent className="bg-neutral-900 border-neutral-700">
            {isFolder && (
              <>
                <ContextMenuItem
                  className="text-neutral-300 hover:bg-neutral-800 hover:text-white cursor-pointer"
                  onClick={() => handleContextAction('new-file', node)}
                >
                  <FilePlus className="w-4 h-4 mr-2" />
                  New File
                </ContextMenuItem>
                <ContextMenuItem
                  className="text-neutral-300 hover:bg-neutral-800 hover:text-white cursor-pointer"
                  onClick={() => handleContextAction('new-folder', node)}
                >
                  <FolderPlus className="w-4 h-4 mr-2" />
                  New Folder
                </ContextMenuItem>
                <ContextMenuSeparator className="bg-neutral-700" />
              </>
            )}
            <ContextMenuItem
              className="text-neutral-300 hover:bg-neutral-800 hover:text-white cursor-pointer"
              onClick={() => handleContextAction('rename', node)}
            >
              <Edit className="w-4 h-4 mr-2" />
              Rename
            </ContextMenuItem>
            <ContextMenuItem
              className="text-red-400 hover:bg-red-900/20 hover:text-red-300 cursor-pointer"
              onClick={() => handleContextAction('delete', node)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>

        {/* Children (Folders) */}
        {isFolder && hasChildren && (
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                {node.children!.map((child) => renderFileNode(child, depth + 1))}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
      className="h-full w-full flex flex-col bg-neutral-900/60 backdrop-blur-xl rounded-2xl border border-neutral-800 overflow-hidden shadow-xl"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-neutral-800/40 border-b border-neutral-700/50">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-600/20 border border-amber-500/30">
            <Folder className="w-4 h-4 text-amber-400" />
          </div>
          <span className="text-sm font-semibold text-white">Workspace</span>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-neutral-400 hover:text-white hover:bg-neutral-800"
                onClick={() => handleContextAction('new-file', { id: 'root', name: 'root', type: 'folder' })}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>New File</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* File Tree */}
      <ScrollArea className="flex-1 p-3">
        {files.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col items-center justify-center h-full text-center p-6"
          >
            <div className="p-4 rounded-full bg-neutral-800/50 mb-4">
              <Folder className="w-8 h-8 text-neutral-600" />
            </div>
            <p className="text-sm text-neutral-500 italic">
              No files yet — create one to start coding.
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="mt-4 text-cyan-400 hover:text-cyan-300 hover:bg-neutral-800"
              onClick={() => handleContextAction('new-file', { id: 'root', name: 'root', type: 'folder' })}
            >
              <Plus className="w-4 h-4 mr-2" />
              Create File
            </Button>
          </motion.div>
        ) : (
          <div className="space-y-1">
            {files.map((node) => renderFileNode(node, 0))}
          </div>
        )}
      </ScrollArea>

      {/* Bottom Accent Line */}
      <div className="h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 opacity-30" />
    </motion.div>
  );
}
