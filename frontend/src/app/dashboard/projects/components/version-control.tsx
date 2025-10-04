'use client';

import React, { useState, useEffect } from 'react';
import { Project } from '../types/project-types';
import {
  GitBranch,
  GitCommit,
  GitMerge,
  Clock,
  User,
  Tag,
  Download,
  Upload,
  RefreshCw,
  Archive,
  AlertCircle,
  CheckCircle,
  XCircle,
  Plus,
  Eye,
  Edit3,
  Trash2,
  Copy,
  ExternalLink,
  Calendar,
  FileText,
  Code,
  Diff,
  History
} from 'lucide-react';

interface VersionControlProps {
  project: Project;
  onVersionCreate?: (version: ProjectVersion) => void;
  onVersionRestore?: (versionId: string) => void;
  onVersionDelete?: (versionId: string) => void;
}

interface ProjectVersion {
  id: string;
  name: string;
  description: string;
  version: string;
  createdAt: Date;
  createdBy: string;
  type: 'major' | 'minor' | 'patch' | 'snapshot';
  status: 'active' | 'archived' | 'draft';
  changes: VersionChange[];
  metadata: {
    tasksCompleted: number;
    milestonesReached: number;
    fileChanges: number;
    teamMembers: number;
  };
  tags: string[];
  branch?: string;
  commitHash?: string;
}

interface VersionChange {
  id: string;
  type: 'added' | 'modified' | 'removed';
  category: 'task' | 'milestone' | 'file' | 'member' | 'setting';
  description: string;
  timestamp: Date;
  author: string;
}

export default function VersionControl({ 
  project, 
  onVersionCreate, 
  onVersionRestore, 
  onVersionDelete 
}: VersionControlProps) {
  const [versions, setVersions] = useState<ProjectVersion[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [compareVersions, setCompareVersions] = useState<[string?, string?]>([]);
  const [viewMode, setViewMode] = useState<'list' | 'timeline' | 'comparison'>('list');
  
  // Mock version data
  useEffect(() => {
    const mockVersions: ProjectVersion[] = [
      {
        id: 'v-1',
        name: 'Project Launch',
        description: 'Initial project setup with core features',
        version: '1.0.0',
        createdAt: new Date('2024-08-15'),
        createdBy: 'John Doe',
        type: 'major',
        status: 'archived',
        changes: [
          {
            id: 'c-1',
            type: 'added',
            category: 'milestone',
            description: 'Added "Project Kickoff" milestone',
            timestamp: new Date('2024-08-15T10:00:00'),
            author: 'John Doe'
          },
          {
            id: 'c-2',
            type: 'added',
            category: 'task',
            description: 'Created initial task structure',
            timestamp: new Date('2024-08-15T11:30:00'),
            author: 'Sarah Wilson'
          }
        ],
        metadata: {
          tasksCompleted: 5,
          milestonesReached: 1,
          fileChanges: 12,
          teamMembers: 3
        },
        tags: ['launch', 'milestone'],
        branch: 'main',
        commitHash: 'abc123'
      },
      {
        id: 'v-2',
        name: 'Alpha Release',
        description: 'First working version with basic functionality',
        version: '1.1.0',
        createdAt: new Date('2024-09-01'),
        createdBy: 'Sarah Wilson',
        type: 'minor',
        status: 'archived',
        changes: [
          {
            id: 'c-3',
            type: 'added',
            category: 'task',
            description: 'Implemented user authentication',
            timestamp: new Date('2024-09-01T14:00:00'),
            author: 'Alex Thompson'
          },
          {
            id: 'c-4',
            type: 'modified',
            category: 'setting',
            description: 'Updated project permissions',
            timestamp: new Date('2024-09-01T16:20:00'),
            author: 'Sarah Wilson'
          }
        ],
        metadata: {
          tasksCompleted: 12,
          milestonesReached: 2,
          fileChanges: 28,
          teamMembers: 5
        },
        tags: ['alpha', 'testing'],
        branch: 'release/1.1',
        commitHash: 'def456'
      },
      {
        id: 'v-3',
        name: 'Current Version',
        description: 'Latest development version',
        version: '1.2.0-beta',
        createdAt: new Date(),
        createdBy: 'Current User',
        type: 'minor',
        status: 'active',
        changes: [
          {
            id: 'c-5',
            type: 'added',
            category: 'member',
            description: 'Added new team members',
            timestamp: new Date(Date.now() - 3600000),
            author: 'Mike Chen'
          }
        ],
        metadata: {
          tasksCompleted: 18,
          milestonesReached: 3,
          fileChanges: 45,
          teamMembers: 7
        },
        tags: ['beta', 'current'],
        branch: 'develop',
        commitHash: 'ghi789'
      }
    ];
    
    setVersions(mockVersions);
  }, []);

  const getVersionTypeColor = (type: string) => {
    switch (type) {
      case 'major': return 'text-red-700 bg-red-100 border-red-200';
      case 'minor': return 'text-blue-700 bg-blue-100 border-blue-200';
      case 'patch': return 'text-green-700 bg-green-100 border-green-200';
      case 'snapshot': return 'text-gray-700 bg-gray-100 border-gray-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'archived': return <Archive className="w-4 h-4 text-gray-500" />;
      case 'draft': return <Clock className="w-4 h-4 text-yellow-500" />;
      default: return <XCircle className="w-4 h-4 text-red-500" />;
    }
  };

  const getChangeTypeIcon = (type: string) => {
    switch (type) {
      case 'added': return <Plus className="w-3 h-3 text-green-600" />;
      case 'modified': return <Edit3 className="w-3 h-3 text-blue-600" />;
      case 'removed': return <Trash2 className="w-3 h-3 text-red-600" />;
      default: return <FileText className="w-3 h-3 text-gray-600" />;
    }
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const handleCreateVersion = () => {
    // This would normally open a modal for version creation
    const newVersion: ProjectVersion = {
      id: `v-${Date.now()}`,
      name: 'New Version',
      description: 'Version created from current state',
      version: '1.3.0',
      createdAt: new Date(),
      createdBy: 'Current User',
      type: 'minor',
      status: 'draft',
      changes: [],
      metadata: {
        tasksCompleted: 20,
        milestonesReached: 3,
        fileChanges: 52,
        teamMembers: 7
      },
      tags: ['draft'],
      branch: 'develop'
    };
    
    onVersionCreate?.(newVersion);
    setShowCreateModal(false);
  };

  const VersionCard = ({ version }: { version: ProjectVersion }) => (
    <div 
      className={`bg-white rounded-lg border p-6 hover:shadow-md transition-all ${
        selectedVersion === version.id ? 'ring-2 ring-blue-500 border-blue-300' : 'border-gray-200'
      }`}
      onClick={() => setSelectedVersion(selectedVersion === version.id ? null : version.id)}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            {getStatusIcon(version.status)}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-gray-900">{version.name}</h3>
              <span className={`text-xs px-2 py-1 rounded-full border ${getVersionTypeColor(version.type)}`}>
                {version.type}
              </span>
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
              <span className="font-mono bg-gray-100 px-2 py-1 rounded">{version.version}</span>
              <span>{formatTimeAgo(version.createdAt)}</span>
              <span>by {version.createdBy}</span>
            </div>
            <p className="text-gray-700 text-sm">{version.description}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button className="p-1 hover:bg-gray-100 rounded">
            <Copy className="w-4 h-4 text-gray-600" />
          </button>
          <button className="p-1 hover:bg-gray-100 rounded">
            <Download className="w-4 h-4 text-gray-600" />
          </button>
          <button 
            className="p-1 hover:bg-red-100 rounded"
            onClick={(e) => {
              e.stopPropagation();
              onVersionDelete?.(version.id);
            }}
          >
            <Trash2 className="w-4 h-4 text-red-600" />
          </button>
        </div>
      </div>

      {/* Metadata */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <div className="text-center">
          <div className="text-lg font-semibold text-gray-900">{version.metadata.tasksCompleted}</div>
          <div className="text-xs text-gray-600">Tasks</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-semibold text-gray-900">{version.metadata.milestonesReached}</div>
          <div className="text-xs text-gray-600">Milestones</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-semibold text-gray-900">{version.metadata.fileChanges}</div>
          <div className="text-xs text-gray-600">Changes</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-semibold text-gray-900">{version.metadata.teamMembers}</div>
          <div className="text-xs text-gray-600">Members</div>
        </div>
      </div>

      {/* Tags */}
      {version.tags.length > 0 && (
        <div className="flex items-center gap-2 mb-4">
          <Tag className="w-4 h-4 text-gray-400" />
          {version.tags.map((tag, index) => (
            <span key={index} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Branch and Commit Info */}
      {version.branch && (
        <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
          <div className="flex items-center gap-1">
            <GitBranch className="w-4 h-4" />
            <span>{version.branch}</span>
          </div>
          {version.commitHash && (
            <div className="flex items-center gap-1">
              <GitCommit className="w-4 h-4" />
              <span className="font-mono">{version.commitHash}</span>
            </div>
          )}
        </div>
      )}

      {/* Expanded Changes */}
      {selectedVersion === version.id && version.changes.length > 0 && (
        <div className="border-t border-gray-200 pt-4">
          <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
            <History className="w-4 h-4" />
            Recent Changes
          </h4>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {version.changes.map((change) => (
              <div key={change.id} className="flex items-start gap-3 text-sm">
                <div className="flex-shrink-0 mt-0.5">
                  {getChangeTypeIcon(change.type)}
                </div>
                <div className="flex-1">
                  <p className="text-gray-900">{change.description}</p>
                  <p className="text-gray-500 text-xs">
                    {change.author} " {formatTimeAgo(change.timestamp)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {selectedVersion === version.id && (
        <div className="border-t border-gray-200 pt-4 flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onVersionRestore?.(version.id);
            }}
            className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3" />
            Restore
          </button>
          <button
            className="bg-gray-100 text-gray-700 px-3 py-1 rounded text-sm hover:bg-gray-200 flex items-center gap-1"
          >
            <Diff className="w-3 h-3" />
            Compare
          </button>
          <button
            className="bg-gray-100 text-gray-700 px-3 py-1 rounded text-sm hover:bg-gray-200 flex items-center gap-1"
          >
            <ExternalLink className="w-3 h-3" />
            Details
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <GitBranch className="w-5 h-5 text-blue-600" />
              Version Control
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Manage project versions and track changes over time
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1 rounded text-sm transition-colors ${
                  viewMode === 'list' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
                }`}
              >
                List
              </button>
              <button
                onClick={() => setViewMode('timeline')}
                className={`px-3 py-1 rounded text-sm transition-colors ${
                  viewMode === 'timeline' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
                }`}
              >
                Timeline
              </button>
            </div>
            
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create Version
            </button>
          </div>
        </div>
      </div>

      {/* Versions List */}
      <div className="p-6">
        {viewMode === 'list' && (
          <div className="space-y-4">
            {versions.map((version) => (
              <VersionCard key={version.id} version={version} />
            ))}
          </div>
        )}

        {viewMode === 'timeline' && (
          <div className="relative">
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200"></div>
            <div className="space-y-6">
              {versions.map((version, index) => (
                <div key={version.id} className="relative flex items-start gap-6">
                  <div className={`flex-shrink-0 w-12 h-12 rounded-full border-4 border-white shadow-sm flex items-center justify-center ${
                    version.status === 'active' ? 'bg-green-500' : 
                    version.status === 'archived' ? 'bg-gray-400' : 'bg-yellow-500'
                  }`}>
                    <GitCommit className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <VersionCard version={version} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {versions.length === 0 && (
          <div className="text-center py-12">
            <GitBranch className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No versions yet</h3>
            <p className="text-gray-600 mb-4">
              Create your first version to start tracking project changes
            </p>
            <button
              onClick={handleCreateVersion}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Create First Version
            </button>
          </div>
        )}
      </div>
    </div>
  );
}