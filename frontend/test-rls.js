const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://zsevvvaakunsspxpplbh.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzZXZ2dmFha3Vuc3NweHBwbGJoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzAwNjA1NywiZXhwIjoyMDY4NTgyMDU3fQ.KAgc-d5emszV_1sbwv4L_tvhTKq9t2egO-XUZp-7334';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzZXZ2dmFha3Vuc3NweHBwbGJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwMDYwNTcsImV4cCI6MjA2ODU4MjA1N30.i5wyY27hnp6qSqgThs--53_M_-giNfUa8ioe0qVfIXE';

// Create both clients
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);

const testUserId = '3cc7ccf7-1a5a-4538-9ebb-54c3a04c92ac';

async function testRLS() {
  try {
    console.log('🧪 Testing RLS policies and document access...');
    
    // Test 1: Check with admin client (should work)
    console.log('\n1️⃣ Testing with admin client (service role)...');
    const { data: adminDocs, error: adminError } = await supabaseAdmin
      .from('documents')
      .select('*')
      .eq('user_id', testUserId);
    
    console.log('Admin result:', {
      error: adminError?.message,
      count: adminDocs?.length || 0,
      docs: adminDocs
    });
    
    // Test 2: Check with anon client (should fail due to RLS)
    console.log('\n2️⃣ Testing with anon client (no auth)...');
    const { data: anonDocs, error: anonError } = await supabaseAnon
      .from('documents')
      .select('*')
      .eq('user_id', testUserId);
    
    console.log('Anon result:', {
      error: anonError?.message,
      count: anonDocs?.length || 0,
      docs: anonDocs
    });
    
    // Test 3: Check RLS status
    console.log('\n3️⃣ Checking RLS status...');
    const { data: rlsStatus, error: rlsError } = await supabaseAdmin
      .rpc('check_rls_status');
    
    if (rlsError) {
      // Try alternative approach
      const { data: tableInfo, error: tableError } = await supabaseAdmin
        .from('pg_tables')
        .select('*')
        .eq('tablename', 'documents');
      
      console.log('Table info:', tableInfo);
    } else {
      console.log('RLS status:', rlsStatus);
    }
    
    // Test 4: Check if we can disable RLS temporarily for testing
    console.log('\n4️⃣ Testing direct query...');
    const { data: directDocs, error: directError } = await supabaseAdmin
      .from('documents')
      .select('*');
    
    console.log('Direct query result:', {
      error: directError?.message,
      totalCount: directDocs?.length || 0,
      userDocs: directDocs?.filter(doc => doc.user_id === testUserId).length || 0
    });
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testRLS();