'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/auth/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function TestAuthPage() {
  const [logs, setLogs] = useState<string[]>([]);
  const [currentUrl, setCurrentUrl] = useState('');
  const [email, setEmail] = useState('test@gmail.com');
  const [password, setPassword] = useState('TestPassword123!');
  const [name, setName] = useState('Test User');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrentUrl(window.location.href);
      
      // Log current URL fragment
      if (window.location.hash) {
        addLog(`URL Hash: ${window.location.hash}`);
      }
      
      // Log current search params
      if (window.location.search) {
        addLog(`URL Search: ${window.location.search}`);
      }
    }
  }, []);

  const addLog = (message: string) => {
    console.log(message);
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testEmailSignup = async () => {
    setLoading(true);
    try {
      addLog(`Testing email signup for: ${email}`);
      addLog(`Name: ${name}`);
      addLog(`Password length: ${password.length}`);
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
            name: name,
          }
        }
      });
      
      if (error) {
        addLog(`❌ Signup Error: ${error.message}`);
        addLog(`Error Status: ${error.status}`);
        addLog(`Error Name: ${error.name}`);
        addLog(`Full error: ${JSON.stringify(error, null, 2)}`);
      } else {
        addLog(`✅ Signup Success!`);
        addLog(`User ID: ${data.user?.id}`);
        addLog(`Email: ${data.user?.email}`);
        addLog(`Email confirmed: ${data.user?.email_confirmed_at}`);
        addLog(`Session: ${data.session ? 'Yes' : 'No'}`);
      }
    } catch (error: any) {
      addLog(`❌ Exception during signup: ${error.message}`);
      addLog(`Stack: ${error.stack}`);
    } finally {
      setLoading(false);
    }
  };

  const testEmailLogin = async () => {
    setLoading(true);
    try {
      addLog(`Testing email login for: ${email}`);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        addLog(`❌ Login Error: ${error.message}`);
        addLog(`Error Status: ${error.status}`);
      } else {
        addLog(`✅ Login Success!`);
        addLog(`User: ${data.user?.email}`);
        addLog(`Session: ${data.session ? 'Active' : 'None'}`);
      }
    } catch (error: any) {
      addLog(`❌ Exception during login: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async () => {
    try {
      addLog('Testing Supabase connection...');
      
      const { data, error } = await supabase
        .from('users')
        .select('count')
        .limit(1);
      
      console.log('Connection test result:', { data, error });
      
      if (error) {
        if (error.code === 'PGRST116') {
          addLog('✅ Connection successful (empty table)');
        } else {
          addLog(`❌ Connection error: ${error.message} (${error.code})`);
        }
      } else {
        addLog('✅ Connection successful');
      }
    } catch (error: any) {
      addLog(`❌ Connection failed: ${error.message}`);
    }
  };

  const testGoogleOAuth = async () => {
    try {
      addLog('Testing Google OAuth...');
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?redirect_to=/dashboard`,
          queryParams: {
            access_type: 'offline',
            prompt: 'select_account',
          },
        },
      });
      
      if (error) {
        addLog(`❌ OAuth Error: ${error.message}`);
      } else {
        addLog(`✅ OAuth initiated successfully`);
      }
    } catch (error: any) {
      addLog(`❌ Exception: ${error.message}`);
    }
  };

  const checkCurrentSession = async () => {
    try {
      addLog('Checking current session...');
      
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        addLog(`Session error: ${error.message}`);
      } else if (data.session) {
        addLog(`Active session found for: ${data.session.user.email}`);
        addLog(`Provider: ${data.session.user.app_metadata?.provider}`);
        addLog(`Session expires: ${new Date(data.session.expires_at * 1000).toLocaleString()}`);
      } else {
        addLog('No active session');
      }
    } catch (error: any) {
      addLog(`Session check failed: ${error.message}`);
    }
  };

  const handleAuthChange = () => {
    supabase.auth.onAuthStateChange((event, session) => {
      addLog(`Auth event: ${event}`);
      if (session) {
        addLog(`Session user: ${session.user.email}`);
      }
    });
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      addLog(`Sign out error: ${error.message}`);
    } else {
      addLog('Signed out successfully');
    }
  };

  const testUploadAPI = async () => {
    try {
      addLog('=== Testing Upload API ===');
      
      // Get current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        addLog(`❌ Session Error: ${sessionError.message}`);
        return;
      }

      if (!session) {
        addLog('❌ No session found - please sign in first');
        return;
      }

      if (!session.access_token) {
        addLog('❌ No access token in session');
        return;
      }

      addLog(`✅ Session found for: ${session.user.email}`);
      addLog(`Token length: ${session.access_token.length}`);
      addLog(`User ID: ${session.user.id}`);

      // Create test file
      const testContent = 'This is a test file for debugging upload API';
      const testFile = new File([testContent], 'test-debug.txt', { type: 'text/plain' });
      
      const formData = new FormData();
      formData.append('file', testFile);
      formData.append('userId', session.user.id);

      addLog(`Making API request to /api/documents/upload...`);
      addLog(`File: ${testFile.name} (${testFile.size} bytes)`);
      addLog(`Auth header: Bearer ${session.access_token.substring(0, 30)}...`);

      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      addLog(`Response status: ${response.status} ${response.statusText}`);
      addLog(`Response headers: ${JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2)}`);
      
      const responseText = await response.text();
      addLog(`Response body: ${responseText}`);

      if (response.ok) {
        addLog('✅ Upload API test successful!');
        try {
          const responseData = JSON.parse(responseText);
          addLog(`Document created with ID: ${responseData.id}`);
        } catch {
          addLog('Response was not JSON');
        }
      } else {
        addLog(`❌ Upload API test failed with status ${response.status}`);
      }

    } catch (error: any) {
      addLog(`❌ Upload API test exception: ${error.message}`);
      addLog(`Stack: ${error.stack}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">Auth Flow Test Page</h1>
        
        <div className="bg-white p-4 rounded shadow">
          <h2 className="font-semibold mb-2">Current Environment</h2>
          <div className="text-sm space-y-1">
            <p><strong>Current URL:</strong> {currentUrl}</p>
            <p><strong>Origin:</strong> {typeof window !== 'undefined' ? window.location.origin : 'N/A'}</p>
            <p><strong>Supabase URL:</strong> {process.env.NEXT_PUBLIC_SUPABASE_URL}</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Test User Registration & Login</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <Input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Full Name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="test@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Password</label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password123!"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-4 flex-wrap">
          <Button onClick={testConnection} variant="outline">
            Test Connection
          </Button>
          <Button onClick={testEmailSignup} disabled={loading}>
            {loading ? 'Testing...' : 'Test Email Signup'}
          </Button>
          <Button onClick={testEmailLogin} disabled={loading}>
            {loading ? 'Testing...' : 'Test Email Login'}
          </Button>
          <Button onClick={testGoogleOAuth}>
            Test Google OAuth
          </Button>
          <Button onClick={checkCurrentSession} variant="outline">
            Check Session
          </Button>
          <Button onClick={handleAuthChange} variant="outline">
            Listen to Auth Changes
          </Button>
          <Button onClick={testUploadAPI} variant="default">
            Test Upload API
          </Button>
          <Button onClick={signOut} variant="destructive">
            Sign Out
          </Button>
          <Button onClick={() => setLogs([])} variant="secondary">
            Clear Logs
          </Button>
        </div>

        <div className="bg-white p-6 rounded shadow">
          <h2 className="text-xl font-semibold mb-4">Debug Logs</h2>
          <div className="h-96 overflow-y-auto bg-gray-100 p-4 rounded font-mono text-sm">
            {logs.length === 0 ? (
              <p className="text-gray-500">Click buttons to see logs...</p>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="mb-1">
                  {log}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}