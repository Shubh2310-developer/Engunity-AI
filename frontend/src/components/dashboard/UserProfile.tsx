/**
 * User Profile Component - MongoDB Session Display
 * Location: frontend/src/components/dashboard/UserProfile.tsx
 *
 * Purpose: Display authenticated user information from MongoDB
 */

'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Loader2, User, Mail, Shield, CheckCircle, XCircle, Database } from 'lucide-react';

interface UserData {
  id: string;
  email: string;
  name?: string;
  emailVerified: boolean;
  role: string;
  isActive: boolean;
}

export default function UserProfile() {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    fetchUserSession();
  }, []);

  const fetchUserSession = async () => {
    try {
      const response = await fetch('/api/auth/session');
      const data = await response.json();

      if (data.authenticated && data.user) {
        setUser(data.user);
        setAuthenticated(true);
      }
    } catch (error) {
      console.error('Failed to fetch user session:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="border-gray-200 dark:border-gray-700">
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
        </CardContent>
      </Card>
    );
  }

  if (!authenticated || !user) {
    return (
      <Card className="border-gray-200 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Guest Mode
          </CardTitle>
          <CardDescription>
            Sign in to access personalized features
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const getInitials = (name?: string, email?: string) => {
    if (name) {
      return name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return email?.charAt(0).toUpperCase() || 'U';
  };

  return (
    <Card className="border-gray-200 dark:border-gray-700">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-green-600" />
            MongoDB User Session
          </CardTitle>
          <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300">
            Active
          </Badge>
        </div>
        <CardDescription>
          Authenticated via MongoDB Atlas
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* User Avatar and Name */}
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16 bg-gradient-to-br from-blue-500 to-purple-600">
            <AvatarFallback className="text-white font-bold text-lg">
              {getInitials(user.name, user.email)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {user.name || 'User'}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
              <Mail className="h-3 w-3" />
              {user.email}
            </p>
          </div>
        </div>

        <div className="h-px bg-gray-200 dark:bg-gray-700" />

        {/* User Details */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">User ID</span>
            <code className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
              {user.id.slice(0, 8)}...
            </code>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">Role</span>
            <Badge variant="outline" className="capitalize">
              <Shield className="h-3 w-3 mr-1" />
              {user.role}
            </Badge>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">Email Verified</span>
            {user.emailVerified ? (
              <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300">
                <CheckCircle className="h-3 w-3 mr-1" />
                Verified
              </Badge>
            ) : (
              <Badge variant="secondary" className="bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300">
                <XCircle className="h-3 w-3 mr-1" />
                Not Verified
              </Badge>
            )}
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">Account Status</span>
            {user.isActive ? (
              <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300">
                <CheckCircle className="h-3 w-3 mr-1" />
                Active
              </Badge>
            ) : (
              <Badge variant="destructive">
                <XCircle className="h-3 w-3 mr-1" />
                Inactive
              </Badge>
            )}
          </div>
        </div>

        <div className="h-px bg-gray-200 dark:bg-gray-700" />

        {/* Database Info */}
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            <Database className="h-4 w-4 text-green-600" />
            Database Connection
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
            <div className="flex justify-between">
              <span>Database:</span>
              <code className="bg-white dark:bg-gray-900 px-1.5 py-0.5 rounded">engunity-ai</code>
            </div>
            <div className="flex justify-between">
              <span>Collection:</span>
              <code className="bg-white dark:bg-gray-900 px-1.5 py-0.5 rounded">users</code>
            </div>
            <div className="flex justify-between">
              <span>Auth Method:</span>
              <code className="bg-white dark:bg-gray-900 px-1.5 py-0.5 rounded">JWT + bcrypt</code>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
