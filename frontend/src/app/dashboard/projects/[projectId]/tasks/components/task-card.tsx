'use client';

import React, { useState } from 'react';
import { Task, Priority, TaskStatus } from '../../../types/project-types';
import { formatDistanceToNow } from 'date-fns';
import {
  Calendar,
  Clock,
  User,
  Flag,
  MessageSquare,
  Paperclip,
  CheckCircle,
  Circle,
  AlertCircle,
  Timer,
  Tag,
  MoreHorizontal,
  Edit3,
  Trash2,
  Copy,
  Eye
} from 'lucide-react';

interface TaskCardProps {
  task: Task;
  onEdit?: (task: Task) => void;
  onDelete?: (taskId: string) => void;
  onStatusChange?: (taskId: string, status: TaskStatus) => void;
  isDragging?: boolean;
  showDetails?: boolean;
}

export default function TaskCard({ 
  task, 
  onEdit, 
  onDelete, 
  onStatusChange, 
  isDragging = false,
  showDetails = false 
}: TaskCardProps) {
  const [showActions, setShowActions] = useState(false);
  const [isExpanded, setIsExpanded] = useState(showDetails);

  const getPriorityColor = (priority: Priority) => {
    switch (priority) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status: TaskStatus) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'in_progress':
        return <Timer className="w-4 h-4 text-blue-500" />;
      case 'blocked':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Circle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getPriorityIcon = (priority: Priority) => {
    const baseClass = "w-3 h-3";
    switch (priority) {
      case 'critical': return <Flag className={`${baseClass} text-red-500 fill-red-500`} />;
      case 'high': return <Flag className={`${baseClass} text-orange-500 fill-orange-500`} />;
      case 'medium': return <Flag className={`${baseClass} text-yellow-500 fill-yellow-500`} />;
      case 'low': return <Flag className={`${baseClass} text-blue-500 fill-blue-500`} />;
      default: return <Flag className={`${baseClass} text-gray-400`} />;
    }
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'bg-green-500';
    if (progress >= 60) return 'bg-blue-500';
    if (progress >= 40) return 'bg-yellow-500';
    if (progress >= 20) return 'bg-orange-500';
    return 'bg-gray-300';
  };

  const formatTimeRemaining = (dueDate: Date) => {
    const now = new Date();
    const timeDiff = dueDate.getTime() - now.getTime();
    
    if (timeDiff < 0) {
      return { text: 'Overdue', color: 'text-red-600' };
    } else if (timeDiff < 24 * 60 * 60 * 1000) {
      return { text: 'Due today', color: 'text-orange-600' };
    } else if (timeDiff < 48 * 60 * 60 * 1000) {
      return { text: 'Due tomorrow', color: 'text-yellow-600' };
    }
    
    return { 
      text: `Due in ${formatDistanceToNow(dueDate)}`, 
      color: 'text-gray-600' 
    };
  };

  const handleStatusToggle = () => {
    if (onStatusChange) {
      const newStatus: TaskStatus = 
        task.status === 'completed' ? 'todo' : 
        task.status === 'todo' ? 'in_progress' : 
        'completed';
      onStatusChange(task.id, newStatus);
    }
  };

  const timeRemaining = task.dueDate ? formatTimeRemaining(task.dueDate) : null;

  return (
    <div
      className={`
        bg-white rounded-lg border border-gray-200 p-4 shadow-sm hover:shadow-md transition-all duration-200
        ${isDragging ? 'opacity-50 rotate-2' : ''}
        ${isExpanded ? 'ring-2 ring-blue-200' : ''}
        cursor-move select-none
      `}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 flex-1">
          <button
            onClick={handleStatusToggle}
            className="flex-shrink-0 hover:bg-gray-50 rounded p-1 -m-1 transition-colors"
          >
            {getStatusIcon(task.status)}
          </button>
          
          <div className="flex items-center gap-1 flex-1">
            {getPriorityIcon(task.priority)}
            <h4 
              className={`font-medium text-sm leading-tight ${
                task.status === 'completed' ? 'line-through text-gray-500' : 'text-gray-900'
              }`}
              title={task.title}
            >
              {task.title.length > 45 ? `${task.title.substring(0, 45)}...` : task.title}
            </h4>
          </div>
        </div>

        {/* Actions */}
        <div className={`flex items-center gap-1 transition-opacity duration-200 ${
          showActions ? 'opacity-100' : 'opacity-0'
        }`}>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600 transition-colors"
            title="View details"
          >
            <Eye className="w-4 h-4" />
          </button>
          
          <div className="relative">
            <button
              className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600 transition-colors"
              title="More actions"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Description */}
      {task.description && (
        <p className="text-sm text-gray-600 mb-3 leading-relaxed">
          {isExpanded 
            ? task.description 
            : task.description.length > 80 
              ? `${task.description.substring(0, 80)}...`
              : task.description
          }
        </p>
      )}

      {/* Progress Bar */}
      {task.progress !== undefined && task.progress > 0 && (
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-500">Progress</span>
            <span className="text-xs font-medium text-gray-700">{task.progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(task.progress)}`}
              style={{ width: `${task.progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Metadata */}
      <div className="space-y-2">
        {/* Time and Date Info */}
        <div className="flex items-center justify-between text-xs">
          {timeRemaining && (
            <div className={`flex items-center gap-1 ${timeRemaining.color}`}>
              <Calendar className="w-3 h-3" />
              <span>{timeRemaining.text}</span>
            </div>
          )}
          
          {task.estimatedHours && (
            <div className="flex items-center gap-1 text-gray-500">
              <Clock className="w-3 h-3" />
              <span>{task.estimatedHours}h</span>
            </div>
          )}
        </div>

        {/* Tags */}
        {task.tags && task.tags.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap">
            <Tag className="w-3 h-3 text-gray-400" />
            {task.tags.slice(0, isExpanded ? task.tags.length : 3).map((tag, index) => (
              <span
                key={index}
                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
              >
                {tag}
              </span>
            ))}
            {!isExpanded && task.tags.length > 3 && (
              <span className="text-xs text-gray-500">+{task.tags.length - 3} more</span>
            )}
          </div>
        )}

        {/* Assignee and Stats */}
        <div className="flex items-center justify-between">
          {task.assigneeId && (
            <div className="flex items-center gap-2">
              <User className="w-3 h-3 text-gray-400" />
              <div className="w-6 h-6 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center">
                <span className="text-xs font-medium text-white">
                  {task.assigneeId.substring(0, 2).toUpperCase()}
                </span>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 text-xs text-gray-500">
            {task.comments && task.comments > 0 && (
              <div className="flex items-center gap-1">
                <MessageSquare className="w-3 h-3" />
                <span>{task.comments}</span>
              </div>
            )}
            
            {task.attachments && task.attachments > 0 && (
              <div className="flex items-center gap-1">
                <Paperclip className="w-3 h-3" />
                <span>{task.attachments}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="mt-4 pt-3 border-t border-gray-100">
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="font-medium text-gray-700">Created:</span>
              <p className="text-gray-600 mt-1">{formatDistanceToNow(task.createdAt)} ago</p>
            </div>
            <div>
              <span className="font-medium text-gray-700">Updated:</span>
              <p className="text-gray-600 mt-1">{formatDistanceToNow(task.updatedAt)} ago</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 mt-4">
            <button
              onClick={() => onEdit?.(task)}
              className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors"
            >
              <Edit3 className="w-3 h-3" />
              Edit
            </button>
            
            <button
              className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-50 text-gray-700 rounded hover:bg-gray-100 transition-colors"
            >
              <Copy className="w-3 h-3" />
              Duplicate
            </button>
            
            <button
              onClick={() => onDelete?.(task.id)}
              className="flex items-center gap-1 px-2 py-1 text-xs bg-red-50 text-red-700 rounded hover:bg-red-100 transition-colors"
            >
              <Trash2 className="w-3 h-3" />
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}