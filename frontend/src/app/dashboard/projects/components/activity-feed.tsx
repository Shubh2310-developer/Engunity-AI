'use client';

import React, { useState } from 'react';
import { 
  Activity, 
  CheckCircle, 
  MessageSquare, 
  Users, 
  Target, 
  GitBranch, 
  FileText, 
  Clock,
  Calendar,
  ArrowUpRight,
  MoreVertical
} from 'lucide-react';

interface ActivityItem {
  id: string;
  type: 'task' | 'comment' | 'milestone' | 'member' | 'file' | 'commit' | 'meeting';
  action: string;
  user: {
    id: string;
    name: string;
    avatar: string;
  };
  target?: string;
  description: string;
  timestamp: string;
  metadata?: any;
}

interface ActivityFeedProps {
  projectId: string;
  activities?: ActivityItem[];
  showFilters?: boolean;
}

const sampleActivities: ActivityItem[] = [
  {
    id: 'act-1',
    type: 'task',
    action: 'completed',
    user: { id: '1', name: 'Alice Johnson', avatar: 'A' },
    target: 'NLP Pipeline Setup',
    description: 'Completed the NLP pipeline setup with 98% accuracy on test data',
    timestamp: '2 hours ago',
    metadata: { priority: 'high', duration: '3 days' }
  },
  {
    id: 'act-2',
    type: 'comment',
    action: 'added',
    user: { id: '2', name: 'Bob Chen', avatar: 'B' },
    target: 'Document Processing Module',
    description: 'Having issues with the document processing module. The PDF parser is failing on complex layouts.',
    timestamp: '3 hours ago',
    metadata: { mentions: ['@Shubh'], replies: 2 }
  },
  {
    id: 'act-3',
    type: 'commit',
    action: 'pushed',
    user: { id: '1', name: 'Alice Johnson', avatar: 'A' },
    target: 'feature/nlp-optimization',
    description: 'Optimized model inference speed by 40% and reduced memory usage',
    timestamp: '5 hours ago',
    metadata: { files: 7, additions: 156, deletions: 43 }
  },
  {
    id: 'act-4',
    type: 'milestone',
    action: 'updated',
    user: { id: '3', name: 'Shubh', avatar: 'S' },
    target: 'Core Development',
    description: 'Updated milestone progress to 70% after completing API endpoints',
    timestamp: '1 day ago',
    metadata: { progress: { from: 60, to: 70 } }
  }
];

export const ActivityFeed: React.FC<ActivityFeedProps> = ({ 
  projectId, 
  activities = sampleActivities, 
  showFilters = true 
}) => {
  const [filter, setFilter] = useState<string>('all');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'task': return CheckCircle;
      case 'comment': return MessageSquare;
      case 'milestone': return Target;
      case 'member': return Users;
      case 'file': return FileText;
      case 'commit': return GitBranch;
      case 'meeting': return Calendar;
      default: return Activity;
    }
  };

  const getActivityColor = (type: string) => {
    const colors = {
      task: 'text-green-600 bg-green-100',
      comment: 'text-blue-600 bg-blue-100',
      milestone: 'text-purple-600 bg-purple-100',
      member: 'text-orange-600 bg-orange-100',
      file: 'text-indigo-600 bg-indigo-100',
      commit: 'text-gray-600 bg-gray-100',
      meeting: 'text-pink-600 bg-pink-100'
    };
    return colors[type as keyof typeof colors] || 'text-slate-600 bg-slate-100';
  };

  const filteredActivities = activities.filter(activity => {
    if (filter === 'all') return true;
    return activity.type === filter;
  });

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-bold text-xl text-slate-900 mb-1">Project Activity</h3>
          <p className="text-sm text-slate-600">Real-time updates and team collaboration</p>
        </div>
        
        {showFilters && (
          <div className="flex items-center gap-3">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Activity</option>
              <option value="task">Tasks</option>
              <option value="comment">Comments</option>
              <option value="milestone">Milestones</option>
              <option value="commit">Code Changes</option>
              <option value="member">Team Updates</option>
            </select>
          </div>
        )}
      </div>

      {/* Activity Feed */}
      <div className="space-y-4 max-h-96 overflow-y-auto">
        {filteredActivities.map((activity, index) => {
          const ActivityIcon = getActivityIcon(activity.type);
          const isLast = index === filteredActivities.length - 1;
          
          return (
            <div key={activity.id} className="relative">
              {/* Timeline line */}
              {!isLast && (
                <div className="absolute left-6 top-14 w-0.5 h-8 bg-slate-200" />
              )}
              
              <div className="flex gap-4 group hover:bg-slate-50 rounded-xl p-3 -m-3 transition-colors">
                {/* Activity Icon */}
                <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${getActivityColor(activity.type)}`}>
                  <ActivityIcon className="w-5 h-5" />
                </div>
                
                {/* Activity Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-slate-900">{activity.user.name}</span>
                      <span className="text-slate-600">{activity.action}</span>
                      {activity.target && (
                        <>
                          <span className="text-slate-500">·</span>
                          <span className="font-medium text-slate-800 bg-slate-100 px-2 py-1 rounded-md text-sm">
                            {activity.target}
                          </span>
                        </>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-xs text-slate-500">{activity.timestamp}</span>
                    </div>
                  </div>
                  
                  <p className="text-slate-700 text-sm mb-2 leading-relaxed">
                    {activity.description}
                  </p>
                  
                  {/* Metadata */}
                  {activity.metadata && (
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      {activity.type === 'task' && activity.metadata.priority && (
                        <span className={`px-2 py-1 rounded-md font-medium ${
                          activity.metadata.priority === 'high' ? 'bg-red-100 text-red-700' :
                          activity.metadata.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {activity.metadata.priority} priority
                        </span>
                      )}
                      
                      {activity.type === 'commit' && (
                        <div className="flex items-center gap-3">
                          <span>+{activity.metadata.additions} -{activity.metadata.deletions}</span>
                          <span>{activity.metadata.files} files</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                {/* User Avatar */}
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-medium flex-shrink-0">
                  {activity.user.avatar}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredActivities.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Activity className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="font-semibold text-slate-900 mb-2">No activity found</h3>
          <p className="text-slate-600 text-sm">Try adjusting your filters or check back later.</p>
        </div>
      )}
    </div>
  );
};

export default ActivityFeed;