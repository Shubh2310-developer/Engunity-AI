import React, { useState, useEffect } from 'react';
import { 
  Users, UserPlus, Search, Filter, Settings, MoreVertical, 
  Crown, Edit3, Eye, Shield, Clock, CheckCircle, AlertCircle,
  Mail, Link, Copy, Trash2, ChevronDown, ChevronRight,
  MessageCircle, Calendar, Activity, Bell, Star, Award,
  Globe, Wifi, WifiOff, Send, RefreshCw, X, Check,
  UserCheck, UserX, Plus, Minus, Target, TrendingUp
} from 'lucide-react';

const TeamCollaborationDashboard = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('viewer');
  const [showActivityDetails, setShowActivityDetails] = useState(false);

  // Sample project data
  const projectData = {
    name: "AI-Powered CRM Platform",
    totalMembers: 12,
    activeMembers: 8,
    pendingInvites: 2,
    totalTasks: 24
  };

  // Sample team members data
  const [teamMembers, setTeamMembers] = useState([
    {
      id: 'user-1',
      name: 'John Doe',
      email: 'john.doe@company.com',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',
      role: 'owner',
      status: 'online',
      tasksAssigned: 5,
      lastActive: new Date(),
      joinedDate: new Date('2024-08-15'),
      expertise: ['Backend', 'AI/ML', 'Architecture'],
      completedTasks: 12,
      totalContributions: 45
    },
    {
      id: 'user-2',
      name: 'Sarah Wilson',
      email: 'sarah.wilson@company.com',
      avatar: 'https://images.unsplash.com/photo-1494790108755-2616b2d3e3c0?w=100&h=100&fit=crop&crop=face',
      role: 'editor',
      status: 'online',
      tasksAssigned: 4,
      lastActive: new Date(Date.now() - 300000), // 5 minutes ago
      joinedDate: new Date('2024-08-20'),
      expertise: ['UI/UX', 'Frontend', 'Design'],
      completedTasks: 8,
      totalContributions: 32
    },
    {
      id: 'user-3',
      name: 'Mike Chen',
      email: 'mike.chen@company.com',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face',
      role: 'editor',
      status: 'offline',
      tasksAssigned: 3,
      lastActive: new Date(Date.now() - 7200000), // 2 hours ago
      joinedDate: new Date('2024-08-18'),
      expertise: ['Analysis', 'Documentation', 'Testing'],
      completedTasks: 6,
      totalContributions: 24
    },
    {
      id: 'user-4',
      name: 'Alex Thompson',
      email: 'alex.thompson@company.com',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face',
      role: 'editor',
      status: 'away',
      tasksAssigned: 6,
      lastActive: new Date(Date.now() - 1800000), // 30 minutes ago
      joinedDate: new Date('2024-08-12'),
      expertise: ['Backend', 'DevOps', 'Infrastructure'],
      completedTasks: 14,
      totalContributions: 38
    },
    {
      id: 'user-5',
      name: 'Lisa Zhang',
      email: 'lisa.zhang@company.com',
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face',
      role: 'editor',
      status: 'online',
      tasksAssigned: 4,
      lastActive: new Date(),
      joinedDate: new Date('2024-08-25'),
      expertise: ['Backend', 'Database', 'Security'],
      completedTasks: 7,
      totalContributions: 19
    },
    {
      id: 'user-6',
      name: 'David Kim',
      email: 'david.kim@company.com',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',
      role: 'viewer',
      status: 'online',
      tasksAssigned: 0,
      lastActive: new Date(Date.now() - 600000), // 10 minutes ago
      joinedDate: new Date('2024-09-01'),
      expertise: ['Design', 'Consulting'],
      completedTasks: 0,
      totalContributions: 3
    }
  ]);

  // Sample pending invitations
  const [pendingInvites, setPendingInvites] = useState([
    {
      id: 'invite-1',
      email: 'emma.davis@company.com',
      role: 'editor',
      sentDate: new Date('2024-09-01'),
      status: 'pending',
      invitedBy: 'John Doe'
    },
    {
      id: 'invite-2',
      email: 'ryan.martinez@company.com',
      role: 'viewer',
      sentDate: new Date('2024-08-30'),
      status: 'pending',
      invitedBy: 'Sarah Wilson'
    }
  ]);

  // Sample activity feed
  const [activityFeed, setActivityFeed] = useState([
    {
      id: 'activity-1',
      type: 'member_joined',
      user: 'Lisa Zhang',
      action: 'joined the project',
      timestamp: new Date(Date.now() - 3600000), // 1 hour ago
      details: 'Added as Editor'
    },
    {
      id: 'activity-2',
      type: 'task_assigned',
      user: 'Sarah Wilson',
      action: 'assigned Task "UI/UX Design" to Mike Chen',
      timestamp: new Date(Date.now() - 7200000), // 2 hours ago
    },
    {
      id: 'activity-3',
      type: 'role_changed',
      user: 'John Doe',
      action: 'promoted Alex Thompson to Editor',
      timestamp: new Date(Date.now() - 10800000), // 3 hours ago
    },
    {
      id: 'activity-4',
      type: 'task_completed',
      user: 'Mike Chen',
      action: 'completed Task "Requirements Analysis"',
      timestamp: new Date(Date.now() - 14400000), // 4 hours ago
    },
    {
      id: 'activity-5',
      type: 'invite_sent',
      user: 'John Doe',
      action: 'invited emma.davis@company.com',
      timestamp: new Date(Date.now() - 18000000), // 5 hours ago
    }
  ]);

  // Helper functions
  const getRoleIcon = (role) => {
    switch (role) {
      case 'owner': return <Crown className="w-4 h-4 text-yellow-500" />;
      case 'editor': return <Edit3 className="w-4 h-4 text-blue-500" />;
      case 'viewer': return <Eye className="w-4 h-4 text-gray-500" />;
      default: return <Shield className="w-4 h-4 text-gray-400" />;
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'owner': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'editor': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'viewer': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'away': return 'bg-yellow-500';
      case 'offline': return 'bg-gray-400';
      default: return 'bg-gray-300';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'online': return 'Online';
      case 'away': return 'Away';
      case 'offline': return 'Offline';
      default: return 'Unknown';
    }
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case 'member_joined': return <UserCheck className="w-4 h-4 text-green-500" />;
      case 'task_assigned': return <Target className="w-4 h-4 text-blue-500" />;
      case 'role_changed': return <Shield className="w-4 h-4 text-purple-500" />;
      case 'task_completed': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'invite_sent': return <Mail className="w-4 h-4 text-orange-500" />;
      default: return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  const filteredMembers = teamMembers.filter(member => {
    const matchesSearch = member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         member.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || member.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || member.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const handleRoleChange = (memberId, newRole) => {
    setTeamMembers(prev => prev.map(member => 
      member.id === memberId ? { ...member, role: newRole } : member
    ));
    
    // Add activity
    const member = teamMembers.find(m => m.id === memberId);
    setActivityFeed(prev => [{
      id: `activity-${Date.now()}`,
      type: 'role_changed',
      user: 'You',
      action: `changed ${member.name}'s role to ${newRole}`,
      timestamp: new Date()
    }, ...prev]);
  };

  const handleInviteMember = () => {
    if (!inviteEmail) return;
    
    const newInvite = {
      id: `invite-${Date.now()}`,
      email: inviteEmail,
      role: inviteRole,
      sentDate: new Date(),
      status: 'pending',
      invitedBy: 'You'
    };
    
    setPendingInvites(prev => [newInvite, ...prev]);
    
    // Add activity
    setActivityFeed(prev => [{
      id: `activity-${Date.now()}`,
      type: 'invite_sent',
      user: 'You',
      action: `invited ${inviteEmail}`,
      timestamp: new Date()
    }, ...prev]);
    
    setInviteEmail('');
    setInviteRole('viewer');
    setShowInviteModal(false);
  };

  const handleRemoveMember = (memberId) => {
    const member = teamMembers.find(m => m.id === memberId);
    if (member.role === 'owner') {
      alert('Cannot remove the project owner');
      return;
    }
    
    setTeamMembers(prev => prev.filter(m => m.id !== memberId));
    
    // Add activity
    setActivityFeed(prev => [{
      id: `activity-${Date.now()}`,
      type: 'member_removed',
      user: 'You',
      action: `removed ${member.name} from the project`,
      timestamp: new Date()
    }, ...prev]);
  };

  const formatTimeAgo = (date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-slate-600">
              <span>Projects</span>
              <ChevronRight className="w-4 h-4" />
              <span className="font-semibold text-slate-900">{projectData.name}</span>
              <ChevronRight className="w-4 h-4" />
              <span className="text-blue-600">Team & Collaboration</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button className="btn btn-ghost btn-sm">
              <Settings className="w-4 h-4" />
              Settings
            </button>
            <button 
              className="btn btn-primary btn-sm"
              onClick={() => setShowInviteModal(true)}
            >
              <UserPlus className="w-4 h-4" />
              Invite Members
            </button>
          </div>
        </div>
      </div>

      <div className="px-6 py-6">
        {/* Team Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="card hover-lift">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Total Members</p>
                  <p className="text-2xl font-bold text-slate-900">{projectData.totalMembers}</p>
                </div>
                <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-white" />
                </div>
              </div>
              <div className="mt-2">
                <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">
                  +2 this week
                </span>
              </div>
            </div>
          </div>

          <div className="card hover-lift">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Active Now</p>
                  <p className="text-2xl font-bold text-slate-900">{projectData.activeMembers}</p>
                </div>
                <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
                  <Wifi className="w-6 h-6 text-white" />
                </div>
              </div>
              <div className="mt-2">
                <span className="text-xs text-slate-500">
                  {Math.round((projectData.activeMembers / projectData.totalMembers) * 100)}% online
                </span>
              </div>
            </div>
          </div>

          <div className="card hover-lift">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Pending Invites</p>
                  <p className="text-2xl font-bold text-slate-900">{projectData.pendingInvites}</p>
                </div>
                <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center">
                  <Mail className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          </div>

          <div className="card hover-lift">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Total Tasks</p>
                  <p className="text-2xl font-bold text-slate-900">{projectData.totalTasks}</p>
                </div>
                <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center">
                  <Target className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Team Panel */}
          <div className="lg:col-span-2">
            <div className="card">
              <div className="card-header">
                <div className="flex items-center justify-between">
                  <h3 className="card-title">Team Members</h3>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                      <input
                        type="text"
                        placeholder="Search members..."
                        className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                    
                    <select
                      className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                      value={roleFilter}
                      onChange={(e) => setRoleFilter(e.target.value)}
                    >
                      <option value="all">All Roles</option>
                      <option value="owner">Owner</option>
                      <option value="editor">Editor</option>
                      <option value="viewer">Viewer</option>
                    </select>
                    
                    <select
                      className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                    >
                      <option value="all">All Status</option>
                      <option value="online">Online</option>
                      <option value="away">Away</option>
                      <option value="offline">Offline</option>
                    </select>
                  </div>
                </div>
              </div>
              
              <div className="card-body p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="text-left py-3 px-4 font-medium text-slate-700">Member</th>
                        <th className="text-left py-3 px-4 font-medium text-slate-700">Role</th>
                        <th className="text-left py-3 px-4 font-medium text-slate-700">Status</th>
                        <th className="text-left py-3 px-4 font-medium text-slate-700">Tasks</th>
                        <th className="text-left py-3 px-4 font-medium text-slate-700">Activity</th>
                        <th className="text-left py-3 px-4 font-medium text-slate-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredMembers.map((member) => (
                        <tr key={member.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-3">
                              <div className="relative">
                                <img
                                  src={member.avatar}
                                  alt={member.name}
                                  className="w-10 h-10 rounded-full"
                                />
                                <div className={`absolute -bottom-1 -right-1 w-4 h-4 ${getStatusColor(member.status)} border-2 border-white rounded-full`} />
                              </div>
                              <div>
                                <div className="font-medium text-slate-900">{member.name}</div>
                                <div className="text-sm text-slate-500">{member.email}</div>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {member.expertise.slice(0, 2).map((skill) => (
                                    <span key={skill} className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                                      {skill}
                                    </span>
                                  ))}
                                  {member.expertise.length > 2 && (
                                    <span className="text-xs text-slate-400">+{member.expertise.length - 2}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="relative">
                              <select
                                value={member.role}
                                onChange={(e) => handleRoleChange(member.id, e.target.value)}
                                className={`appearance-none border rounded-full px-3 py-1 pr-8 text-sm font-medium ${getRoleColor(member.role)}`}
                                disabled={member.role === 'owner' && teamMembers.filter(m => m.role === 'owner').length === 1}
                              >
                                <option value="owner">Owner</option>
                                <option value="editor">Editor</option>
                                <option value="viewer">Viewer</option>
                              </select>
                              <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-3 h-3 pointer-events-none" />
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${getStatusColor(member.status)}`} />
                              <span className="text-sm text-slate-600">{getStatusText(member.status)}</span>
                            </div>
                            <div className="text-xs text-slate-400 mt-1">
                              {formatTimeAgo(member.lastActive)}
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="text-center">
                              <div className="text-lg font-semibold text-slate-900">{member.tasksAssigned}</div>
                              <div className="text-xs text-slate-500">assigned</div>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="text-center">
                              <div className="text-sm font-medium text-slate-900">{member.completedTasks}</div>
                              <div className="text-xs text-slate-500">completed</div>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2">
                              <button 
                                className="p-1 hover:bg-slate-100 rounded"
                                onClick={() => setSelectedMember(member)}
                              >
                                <MessageCircle className="w-4 h-4 text-slate-600" />
                              </button>
                              <button className="p-1 hover:bg-slate-100 rounded">
                                <Settings className="w-4 h-4 text-slate-600" />
                              </button>
                              {member.role !== 'owner' && (
                                <button 
                                  className="p-1 hover:bg-red-100 rounded text-red-600"
                                  onClick={() => handleRemoveMember(member.id)}
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
              </div>
            </div>

            {/* Pending Invitations */}
            {pendingInvites.length > 0 && (
              <div className="card mt-6">
                <div className="card-header">
                  <h3 className="card-title">Pending Invitations</h3>
                </div>
                <div className="card-body">
                  <div className="space-y-3">
                    {pendingInvites.map((invite) => (
                      <div key={invite.id} className="flex items-center justify-between p-3 bg-orange-50 border border-orange-200 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                            <Mail className="w-5 h-5 text-orange-600" />
                          </div>
                          <div>
                            <div className="font-medium text-slate-900">{invite.email}</div>
                            <div className="text-sm text-slate-500">
                              Invited as {invite.role} by {invite.invitedBy} • {formatTimeAgo(invite.sentDate)}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button className="btn btn-sm btn-outline">
                            <RefreshCw className="w-4 h-4" />
                            Resend
                          </button>
                          <button className="btn btn-sm btn-ghost text-red-600">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Activity Feed Sidebar */}
          <div className="lg:col-span-1">
            <div className="card">
              <div className="card-header">
                <div className="flex items-center justify-between">
                  <h3 className="card-title">Team Activity</h3>
                  <button 
                    className="text-sm text-blue-600 hover:text-blue-800"
                    onClick={() => setShowActivityDetails(!showActivityDetails)}
                  >
                    {showActivityDetails ? 'Less' : 'More'}
                  </button>
                </div>
              </div>
              <div className="card-body">
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {activityFeed.slice(0, showActivityDetails ? activityFeed.length : 5).map((activity) => (
                    <div key={activity.id} className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center">
                        {getActivityIcon(activity.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-900">
                          <span className="font-medium">{activity.user}</span> {activity.action}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          {formatTimeAgo(activity.timestamp)}
                        </p>
                        {activity.details && (
                          <p className="text-xs text-slate-600 mt-1 bg-slate-50 px-2 py-1 rounded">
                            {activity.details}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* AI Team Insights */}
            <div className="card mt-6">
              <div className="card-header">
                <h3 className="card-title flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-purple-500" />
                  AI Team Insights
                </h3>
              </div>
              <div className="card-body">
                <div className="space-y-4">
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <Users className="w-5 h-5 text-blue-500 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-blue-800">Workload Balance</h4>
                        <p className="text-sm text-blue-700 mt-1">
                          Alex has 6 tasks while Lisa has 4. Consider redistributing workload for better balance.
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <Star className="w-5 h-5 text-green-500 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-green-800">Top Performer</h4>
                        <p className="text-sm text-green-700 mt-1">
                          Alex Thompson has completed 14 tasks this month. Great job!
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <Award className="w-5 h-5 text-purple-500 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-purple-800">Skill Recommendation</h4>
                        <p className="text-sm text-purple-700 mt-1">
                          Consider assigning frontend tasks to David Kim based on design expertise.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">Invite Team Members</h3>
              <button 
                onClick={() => setShowInviteModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="colleague@company.com"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Role
                </label>
                <select
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                >
                  <option value="viewer">Viewer - Read-only access</option>
                  <option value="editor">Editor - Can edit tasks and milestones</option>
                  <option value="owner">Owner - Full project control</option>
                </select>
              </div>
              
              <div className="bg-slate-50 p-3 rounded-lg">
                <h4 className="font-medium text-slate-900 mb-2">Role Permissions:</h4>
                <div className="space-y-1 text-sm text-slate-600">
                  {inviteRole === 'owner' && (
                    <>
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-500" />
                        Manage team members and roles
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-500" />
                        Edit project settings
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-500" />
                        Full access to all features
                      </div>
                    </>
                  )}
                  {inviteRole === 'editor' && (
                    <>
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-500" />
                        Create and edit tasks
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-500" />
                        Manage milestones
                      </div>
                      <div className="flex items-center gap-2">
                        <X className="w-4 h-4 text-red-500" />
                        Cannot manage team members
                      </div>
                    </>
                  )}
                  {inviteRole === 'viewer' && (
                    <>
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-500" />
                        View project progress
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-500" />
                        Comment on tasks
                      </div>
                      <div className="flex items-center gap-2">
                        <X className="w-4 h-4 text-red-500" />
                        Cannot edit anything
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-end gap-3 mt-6">
              <button 
                onClick={() => setShowInviteModal(false)}
                className="btn btn-ghost"
              >
                Cancel
              </button>
              <button 
                onClick={handleInviteMember}
                className="btn btn-primary"
                disabled={!inviteEmail}
              >
                <Send className="w-4 h-4" />
                Send Invite
              </button>
            </div>
            
            <div className="mt-4 pt-4 border-t border-slate-200">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Link className="w-4 h-4" />
                <span>Or share invite link:</span>
                <button className="text-blue-600 hover:text-blue-800">
                  Generate Link
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamCollaborationDashboard;