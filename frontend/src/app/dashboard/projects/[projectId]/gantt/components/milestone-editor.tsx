'use client';

import React, { useState, useEffect } from 'react';
import { Milestone, Priority } from '../../../types/project-types';
import {
  Calendar,
  Clock,
  Flag,
  Users,
  FileText,
  Tag,
  AlertTriangle,
  CheckCircle,
  Circle,
  Plus,
  Edit3,
  Trash2,
  Save,
  X,
  Target,
  TrendingUp,
  Award,
  Zap,
  Star
} from 'lucide-react';

interface MilestoneEditorProps {
  milestone?: Milestone;
  onSave: (milestone: Milestone) => void;
  onCancel: () => void;
  onDelete?: (milestoneId: string) => void;
  projectId: string;
  isOpen: boolean;
}

export default function MilestoneEditor({
  milestone,
  onSave,
  onCancel,
  onDelete,
  projectId,
  isOpen
}: MilestoneEditorProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    dueDate: '',
    priority: 'medium' as Priority,
    status: 'pending' as 'pending' | 'in_progress' | 'completed' | 'overdue',
    assigneeIds: [] as string[],
    tags: [] as string[],
    dependencies: [] as string[],
    deliverables: [] as string[],
    budget: 0,
    progress: 0
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sample data for dropdowns
  const [availableTeamMembers] = useState([
    { id: 'user-1', name: 'John Doe', email: 'john.doe@company.com' },
    { id: 'user-2', name: 'Sarah Wilson', email: 'sarah.wilson@company.com' },
    { id: 'user-3', name: 'Mike Chen', email: 'mike.chen@company.com' },
    { id: 'user-4', name: 'Alex Thompson', email: 'alex.thompson@company.com' }
  ]);

  const [availableMilestones] = useState([
    { id: 'milestone-1', title: 'Project Setup' },
    { id: 'milestone-2', title: 'Research Phase' },
    { id: 'milestone-3', title: 'Development Phase' },
    { id: 'milestone-4', title: 'Testing Phase' }
  ]);

  useEffect(() => {
    if (milestone) {
      setFormData({
        title: milestone.title,
        description: milestone.description || '',
        dueDate: milestone.dueDate.toISOString().split('T')[0],
        priority: milestone.priority,
        status: milestone.status,
        assigneeIds: milestone.assigneeIds || [],
        tags: milestone.tags || [],
        dependencies: milestone.dependencies || [],
        deliverables: milestone.deliverables || [],
        budget: milestone.budget || 0,
        progress: milestone.progress || 0
      });
    } else {
      // Reset form for new milestone
      setFormData({
        title: '',
        description: '',
        dueDate: '',
        priority: 'medium',
        status: 'pending',
        assigneeIds: [],
        tags: [],
        dependencies: [],
        deliverables: [],
        budget: 0,
        progress: 0
      });
    }
  }, [milestone, isOpen]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!formData.dueDate) {
      newErrors.dueDate = 'Due date is required';
    } else {
      const selectedDate = new Date(formData.dueDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (selectedDate < today) {
        newErrors.dueDate = 'Due date cannot be in the past';
      }
    }

    if (formData.progress < 0 || formData.progress > 100) {
      newErrors.progress = 'Progress must be between 0 and 100';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const milestoneData: Milestone = {
        id: milestone?.id || `milestone-${Date.now()}`,
        title: formData.title,
        description: formData.description,
        dueDate: new Date(formData.dueDate),
        priority: formData.priority,
        status: formData.status,
        projectId,
        assigneeIds: formData.assigneeIds,
        tags: formData.tags,
        dependencies: formData.dependencies,
        deliverables: formData.deliverables,
        budget: formData.budget,
        progress: formData.progress,
        createdAt: milestone?.createdAt || new Date(),
        updatedAt: new Date()
      };

      await onSave(milestoneData);
    } catch (error) {
      console.error('Error saving milestone:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (milestone && onDelete && window.confirm('Are you sure you want to delete this milestone?')) {
      await onDelete(milestone.id);
    }
  };

  const getPriorityColor = (priority: Priority) => {
    switch (priority) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'in_progress': return <Clock className="w-4 h-4 text-blue-500" />;
      case 'overdue': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default: return <Circle className="w-4 h-4 text-gray-400" />;
    }
  };

  const addTag = (tag: string) => {
    if (tag && !formData.tags.includes(tag)) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tag]
      }));
    }
  };

  const removeTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag)
    }));
  };

  const addDeliverable = () => {
    setFormData(prev => ({
      ...prev,
      deliverables: [...prev.deliverables, '']
    }));
  };

  const updateDeliverable = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      deliverables: prev.deliverables.map((d, i) => i === index ? value : d)
    }));
  };

  const removeDeliverable = (index: number) => {
    setFormData(prev => ({
      ...prev,
      deliverables: prev.deliverables.filter((_, i) => i !== index)
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Target className="w-6 h-6 text-blue-600" />
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {milestone ? 'Edit Milestone' : 'Create New Milestone'}
                </h2>
                <p className="text-sm text-gray-600">
                  Define project milestones and track progress
                </p>
              </div>
            </div>
            <button
              onClick={onCancel}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Information */}
            <div className="lg:col-span-2 space-y-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Milestone Title *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.title ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Enter milestone title"
                  />
                  {errors.title && (
                    <p className="text-red-600 text-sm mt-1">{errors.title}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Describe the milestone objectives and requirements"
                  />
                </div>
              </div>

              {/* Status and Progress */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="overdue">Overdue</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Priority
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as Priority }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Progress (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.progress}
                    onChange={(e) => setFormData(prev => ({ ...prev, progress: parseInt(e.target.value) || 0 }))}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.progress ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors.progress && (
                    <p className="text-red-600 text-sm mt-1">{errors.progress}</p>
                  )}
                </div>
              </div>

              {/* Deliverables */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">
                    Deliverables
                  </label>
                  <button
                    type="button"
                    onClick={addDeliverable}
                    className="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    Add Deliverable
                  </button>
                </div>
                <div className="space-y-2">
                  {formData.deliverables.map((deliverable, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={deliverable}
                        onChange={(e) => updateDeliverable(index, e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Deliverable description"
                      />
                      <button
                        type="button"
                        onClick={() => removeDeliverable(index)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tags
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {formData.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm flex items-center gap-1"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <input
                  type="text"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addTag(e.currentTarget.value);
                      e.currentTarget.value = '';
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Type a tag and press Enter"
                />
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Due Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Due Date *
                </label>
                <input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.dueDate ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {errors.dueDate && (
                  <p className="text-red-600 text-sm mt-1">{errors.dueDate}</p>
                )}
              </div>

              {/* Budget */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Budget ($)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.budget}
                  onChange={(e) => setFormData(prev => ({ ...prev, budget: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                />
              </div>

              {/* Assignees */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assignees
                </label>
                <select
                  multiple
                  value={formData.assigneeIds}
                  onChange={(e) => {
                    const values = Array.from(e.target.selectedOptions, option => option.value);
                    setFormData(prev => ({ ...prev, assigneeIds: values }));
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  size={4}
                >
                  {availableTeamMembers.map(member => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Dependencies */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dependencies
                </label>
                <select
                  multiple
                  value={formData.dependencies}
                  onChange={(e) => {
                    const values = Array.from(e.target.selectedOptions, option => option.value);
                    setFormData(prev => ({ ...prev, dependencies: values }));
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  size={3}
                >
                  {availableMilestones.filter(m => m.id !== milestone?.id).map(m => (
                    <option key={m.id} value={m.id}>
                      {m.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Preview */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">Status Preview</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(formData.status)}
                    <span className="text-sm text-gray-700 capitalize">{formData.status.replace('_', ' ')}</span>
                  </div>
                  <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs border ${getPriorityColor(formData.priority)}`}>
                    <Flag className="w-3 h-3" />
                    {formData.priority}
                  </div>
                  <div className="mt-2">
                    <div className="flex justify-between text-xs text-gray-600 mb-1">
                      <span>Progress</span>
                      <span>{formData.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${formData.progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-6 border-t border-gray-200 mt-6">
            <div>
              {milestone && onDelete && (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Milestone
                </button>
              )}
            </div>
            
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 text-gray-600 hover:text-gray-900"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {isSubmitting ? 'Saving...' : milestone ? 'Update Milestone' : 'Create Milestone'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}