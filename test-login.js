#!/usr/bin/env node

/**
 * Test Login Script for Engunity AI
 * This script demonstrates how to sign in to Supabase programmatically
 */

const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = 'https://zsevvvaakunsspxpplbh.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzZXZ2dmFha3Vuc3NweHBwbGJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwMDYwNTcsImV4cCI6MjA2ODU4MjA1N30.i5wyY27hnp6qSqgThs--53_M_-giNfUa8ioe0qVfIXE';

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testOAuthFlow() {
  console.log('🔐 Testing OAuth Sign-In Flow for Engunity AI\n');

  // For OAuth (Google/GitHub), you need to use the browser-based flow
  console.log('📧 Your existing account: shubh.17191@sakec.ac.in');
  console.log('🔑 Authentication method: Google OAuth + GitHub OAuth');
  console.log('✅ Account status: Confirmed');
  console.log('📅 Last sign-in: 2025-10-24\n');

  console.log('To sign in with this account:');
  console.log('1. Go to: http://localhost:3000/auth/login');
  console.log('2. Click the "Sign in with Google" button');
  console.log('3. Select your Google account (shubh.17191@sakec.ac.in)');
  console.log('4. You will be automatically redirected to the dashboard\n');

  console.log('🌐 Initiating OAuth sign-in...');

  // Start OAuth flow
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: 'http://localhost:3000/auth/callback?redirect_to=/dashboard',
    }
  });

  if (error) {
    console.error('❌ Error:', error.message);
    return;
  }

  if (data.url) {
    console.log('✅ OAuth URL generated successfully!');
    console.log('🔗 Please visit this URL to complete sign-in:\n');
    console.log(data.url);
    console.log('\nNote: This URL will redirect you to Google for authentication.');
  }
}

// Run the test
testOAuthFlow().catch(console.error);
