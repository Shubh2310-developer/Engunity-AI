'use client';

import React, { useState } from 'react';
import { ProjectMember } from '../../../types/project-types';
import {
  Users,
  Search,
  Filter,
  MoreVertical,
  Crown,
  Edit3,
  Eye,
  Shield,
  Mail,
  MessageCircle,
  Settings,
  Trash2,
  UserPlus,
  Clock,
  Calendar,
  Award,
  Star,
  ChevronDown
} from 'lucide-react';

interface MemberListProps {
  members: ProjectMember[];
  onRoleChange?: (memberId: string, newRole: string) => void;
  onRemoveMember?: (memberId: string) => void;
  onInviteMember?: () => void;
  currentUserId?: string;
}

export default function MemberList({
  members,
  onRoleChange,
  onRemoveMember,
  onInviteMember,
  currentUserId
}: MemberListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner': return <Crown className="w-4 h-4 text-yellow-500" />;
      case 'admin': return <Shield className="w-4 h-4 text-red-500" />;
      case 'editor': return <Edit3 className="w-4 h-4 text-blue-500" />;
      case 'viewer': return <Eye className="w-4 h-4 text-gray-500" />;
      default: return <Shield className="w-4 h-4 text-gray-400" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'admin': return 'bg-red-100 text-red-800 border-red-200';
      case 'editor': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'viewer': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'away': return 'bg-yellow-500';
      case 'busy': return 'bg-red-500';
      case 'offline': return 'bg-gray-400';
      default: return 'bg-gray-300';
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

  const filteredAndSortedMembers = members
    .filter(member => {
      const matchesSearch = member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           member.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRole = roleFilter === 'all' || member.role === roleFilter;
      const matchesStatus = statusFilter === 'all' || member.status === statusFilter;
      return matchesSearch && matchesRole && matchesStatus;
    })
    .sort((a, b) => {
      let valueA: any = a[sortBy as keyof ProjectMember];
      let valueB: any = b[sortBy as keyof ProjectMember];
      
      if (typeof valueA === 'string') {
        valueA = valueA.toLowerCase();
        valueB = valueB.toLowerCase();
      }
      
      if (valueA < valueB) return sortDirection === 'asc' ? -1 : 1;
      if (valueA > valueB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDirection('asc');
    }
  };

  const canEditMember = (member: ProjectMember) => {
    if (member.id === currentUserId) return false; // Can't edit yourself
    if (member.role === 'owner' && members.filter(m => m.role === 'owner').length === 1) return false;
    return true;
  };

  const roleHierarchy = ['owner', 'admin', 'editor', 'viewer'];
  const getRoleLevel = (role: string) => roleHierarchy.indexOf(role);

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Team Members</h3>
            <p className="text-sm text-gray-600 mt-1">
              {members.length} member{members.length !== 1 ? 's' : ''} in this project
            </p>
          </div>
          
          <button
            onClick={onInviteMember}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            Invite Members
          </button>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search members..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <select
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="all">All Roles</option>
            <option value="owner">Owner</option>
            <option value="admin">Admin</option>
            <option value="editor">Editor</option>
            <option value="viewer">Viewer</option>
          </select>
          
          <select
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="online">Online</option>
            <option value="away">Away</option>
            <option value="busy">Busy</option>
            <option value="offline">Offline</option>
          </select>
        </div>
      </div>

      {/* Member List */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th
                className="text-left py-3 px-6 font-medium text-gray-700 cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort('name')}
              >
                <div className="flex items-center gap-1">
                  Member
                  <ChevronDown className="w-4 h-4" />
                </div>
              </th>
              <th
                className="text-left py-3 px-6 font-medium text-gray-700 cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort('role')}
              >
                <div className="flex items-center gap-1">
                  Role
                  <ChevronDown className="w-4 h-4" />
                </div>
              </th>
              <th
                className="text-left py-3 px-6 font-medium text-gray-700 cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort('status')}
              >
                <div className="flex items-center gap-1">
                  Status
                  <ChevronDown className="w-4 h-4" />
                </div>
              </th>
              <th className="text-left py-3 px-6 font-medium text-gray-700">Activity</th>
              <th className="text-left py-3 px-6 font-medium text-gray-700">Joined</th>
              <th className="text-left py-3 px-6 font-medium text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedMembers.map((member, index) => (
              <tr
                key={member.id}
                className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                  member.id === currentUserId ? 'bg-blue-50' : ''
                }`}
              >
                {/* Member Info */}
                <td className="py-4 px-6">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-white">
                          {member.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </span>
                      </div>
                      <div className={`absolute -bottom-1 -right-1 w-3 h-3 ${getStatusColor(member.status)} border-2 border-white rounded-full`} />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 flex items-center gap-2">
                        {member.name}
                        {member.id === currentUserId && (
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                            You
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">{member.email}</div>
                    </div>
                  </div>
                </td>

                {/* Role */}
                <td className="py-4 px-6">
                  <div className="relative inline-block">
                    <select
                      value={member.role}
                      onChange={(e) => onRoleChange?.(member.id, e.target.value)}
                      disabled={!canEditMember(member)}
                      className={`appearance-none border rounded-full px-3 py-1 pr-8 text-sm font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 ${getRoleColor(member.role)} ${
                        !canEditMember(member) ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      <option value="owner">Owner</option>
                      <option value="admin">Admin</option>
                      <option value="editor">Editor</option>
                      <option value="viewer">Viewer</option>
                    </select>
                    <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                      {getRoleIcon(member.role)}
                    </div>
                  </div>
                </td>

                {/* Status */}
                <td className="py-4 px-6">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${getStatusColor(member.status)}`} />
                    <span className="text-sm text-gray-600 capitalize">{member.status}</span>
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {formatTimeAgo(member.lastActive)}
                  </div>
                </td>

                {/* Activity */}
                <td className="py-4 px-6">
                  <div className="flex items-center gap-4 text-sm">
                    <div className="text-center">
                      <div className="font-medium text-gray-900">{member.taskCount || 0}</div>
                      <div className="text-xs text-gray-500">tasks</div>
                    </div>
                    {member.role !== 'viewer' && (
                      <div className="text-center">
                        <div className="font-medium text-gray-900">{member.contributionCount || 0}</div>
                        <div className="text-xs text-gray-500">contributions</div>
                      </div>
                    )}
                  </div>
                </td>

                {/* Joined Date */}
                <td className="py-4 px-6">
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <Calendar className="w-4 h-4" />
                    {member.joinedAt.toLocaleDateString()}
                  </div>
                </td>

                {/* Actions */}
                <td className="py-4 px-6">
                  <div className="flex items-center gap-2">
                    <button
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Send message"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </button>
                    
                    <button
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                      title="Member settings"
                    >
                      <Settings className="w-4 h-4" />
                    </button>
                    
                    {canEditMember(member) && onRemoveMember && (
                      <button
                        onClick={() => onRemoveMember(member.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Remove member"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Empty State */}
      {filteredAndSortedMembers.length === 0 && (
        <div className="text-center py-12">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No members found</h3>
          <p className="text-gray-600 mb-4">
            {searchTerm || roleFilter !== 'all' || statusFilter !== 'all'
              ? 'Try adjusting your search or filters'
              : 'This project doesn\'t have any members yet'}
          </p>
          {onInviteMember && (
            <button
              onClick={onInviteMember}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 mx-auto transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              Invite First Member
            </button>
          )}
        </div>
      )}
    </div>
  );
}