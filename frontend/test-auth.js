const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://zsevvvaakunsspxpplbh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzZXZ2dmFha3Vuc3NweHBwbGJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwMDYwNTcsImV4cCI6MjA2ODU4MjA1N30.i5wyY27hnp6qSqgThs--53_M_-giNfUa8ioe0qVfIXE';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testAuth() {
  console.log('Testing Supabase authentication...');
  
  // Test 1: Connection test
  console.log('\n1. Testing connection...');
  try {
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    if (error) {
      if (error.code === 'PGRST116') {
        console.log('✅ Connection successful (table not found or empty)');
      } else {
        console.log('❌ Connection error:', error.message, error.code);
      }
    } else {
      console.log('✅ Connection successful');
    }
  } catch (err) {
    console.log('❌ Connection failed:', err.message);
  }
  
  // Test 2: Sign up attempt
  console.log('\n2. Testing sign up...');
  const testEmail = `test.user${Date.now()}@gmail.com`;
  const testPassword = 'TestPassword123!';
  const testName = 'Test User';
  
  try {
    const { data, error } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          full_name: testName,
          name: testName,
        }
      }
    });
    
    if (error) {
      console.log('❌ Signup Error:', error.message);
      console.log('Error Status:', error.status);
      console.log('Error Code:', error.code || 'No code');
      console.log('Full error:', JSON.stringify(error, null, 2));
    } else {
      console.log('✅ Signup Success!');
      console.log('User ID:', data.user?.id);
      console.log('Email:', data.user?.email);
      console.log('Email confirmed:', data.user?.email_confirmed_at);
      console.log('Session:', data.session ? 'Yes' : 'No');
    }
  } catch (err) {
    console.log('❌ Exception during signup:', err.message);
    console.log('Stack:', err.stack);
  }
  
  // Test 3: Check current session
  console.log('\n3. Checking session...');
  try {
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.log('Session error:', error.message);
    } else if (data.session) {
      console.log('Active session found for:', data.session.user.email);
    } else {
      console.log('No active session');
    }
  } catch (err) {
    console.log('Session check failed:', err.message);
  }
}

testAuth();