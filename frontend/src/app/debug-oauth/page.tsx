/**
 * Debug OAuth Page for Testing
 * This page is for debugging OAuth issues
 */

'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/auth/supabase';
import { Button } from '@/components/ui/button';

export default function DebugOAuthPage() {
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    console.log(message);
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testGoogleOAuth = async () => {
    try {
      addLog('Starting Google OAuth test...');
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?redirect_to=/dashboard`,
        },
      });
      
      if (error) {
        addLog(`Google OAuth error: ${error.message}`);
        return;
      }
      
      addLog(`Google OAuth data: ${JSON.stringify(data)}`);
    } catch (error: any) {
      addLog(`Google OAuth exception: ${error.message}`);
    }
  };

  const testGitHubOAuth = async () => {
    try {
      addLog('Starting GitHub OAuth test...');
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?redirect_to=/dashboard`,
        },
      });
      
      if (error) {
        addLog(`GitHub OAuth error: ${error.message}`);
        return;
      }
      
      addLog(`GitHub OAuth data: ${JSON.stringify(data)}`);
    } catch (error: any) {
      addLog(`GitHub OAuth exception: ${error.message}`);
    }
  };

  const checkSession = async () => {
    try {
      addLog('Checking current session...');
      
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        addLog(`Session error: ${error.message}`);
        return;
      }
      
      if (data.session) {
        addLog(`Current session: ${data.session.user?.email} (${data.session.user?.app_metadata?.provider})`);
      } else {
        addLog('No active session');
      }
    } catch (error: any) {
      addLog(`Session exception: ${error.message}`);
    }
  };

  const clearSession = async () => {
    try {
      addLog('Clearing session...');
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        addLog(`Sign out error: ${error.message}`);
        return;
      }
      
      addLog('Session cleared');
    } catch (error: any) {
      addLog(`Sign out exception: ${error.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">OAuth Debug Page</h1>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Button onClick={testGoogleOAuth} className="bg-red-600 hover:bg-red-700">
            Test Google OAuth
          </Button>
          <Button onClick={testGitHubOAuth} className="bg-gray-800 hover:bg-gray-900">
            Test GitHub OAuth
          </Button>
          <Button onClick={checkSession} variant="outline">
            Check Session
          </Button>
          <Button onClick={clearSession} variant="destructive">
            Clear Session
          </Button>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Debug Info</h2>
          <div className="space-y-2 text-sm">
            <p><strong>Supabase URL:</strong> {process.env.NEXT_PUBLIC_SUPABASE_URL}</p>
            <p><strong>Site URL:</strong> {process.env.NEXT_PUBLIC_SITE_URL || window.location.origin}</p>
            <p><strong>Current URL:</strong> {window.location.href}</p>
            <p><strong>Callback URL:</strong> {window.location.origin}/auth/callback</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Logs</h2>
          <div className="h-96 overflow-y-auto bg-gray-100 p-4 rounded font-mono text-sm">
            {logs.length === 0 ? (
              <p className="text-gray-500">No logs yet...</p>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="mb-1">
                  {log}
                </div>
              ))
            )}
          </div>
          <Button 
            onClick={() => setLogs([])} 
            variant="outline" 
            size="sm" 
            className="mt-2"
          >
            Clear Logs
          </Button>
        </div>
      </div>
    </div>
  );
}