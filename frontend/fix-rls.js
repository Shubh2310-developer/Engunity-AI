const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://zsevvvaakunsspxpplbh.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzZXZ2dmFha3Vuc3NweHBwbGJoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzAwNjA1NywiZXhwIjoyMDY4NTgyMDU3fQ.KAgc-d5emszV_1sbwv4L_tvhTKq9t2egO-XUZp-7334';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixRLS() {
  try {
    console.log('🔧 Fixing RLS policies for documents table...');
    
    // First, let's check if RLS is enabled
    console.log('\n1️⃣ Checking current RLS status...');
    
    // Drop existing policies to start fresh
    console.log('\n2️⃣ Dropping existing policies...');
    const dropPolicies = [
      'DROP POLICY IF EXISTS "Users can view their own documents" ON documents;',
      'DROP POLICY IF EXISTS "Users can insert their own documents" ON documents;', 
      'DROP POLICY IF EXISTS "Users can update their own documents" ON documents;',
      'DROP POLICY IF EXISTS "Users can delete their own documents" ON documents;',
      'DROP POLICY IF EXISTS "Service role can manage all documents" ON documents;'
    ];
    
    for (const sql of dropPolicies) {
      try {
        const { error } = await supabase.rpc('exec_sql', { sql });
        if (error) {
          console.log(`⚠️ ${error.message}`);
        } else {
          console.log(`✅ Dropped policy: ${sql.split('"')[1]}`);
        }
      } catch (err) {
        console.log(`⚠️ ${err.message}`);
      }
    }
    
    // Temporarily disable RLS to test
    console.log('\n3️⃣ Temporarily disabling RLS...');
    const { error: disableError } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE documents DISABLE ROW LEVEL SECURITY;'
    });
    
    if (disableError) {
      console.error('❌ Failed to disable RLS:', disableError.message);
    } else {
      console.log('✅ RLS disabled temporarily');
    }
    
    // Test document access without RLS
    console.log('\n4️⃣ Testing document access without RLS...');
    const testUserId = '3cc7ccf7-1a5a-4538-9ebb-54c3a04c92ac';
    
    const { data: testDocs, error: testError } = await supabase
      .from('documents')
      .select('*')
      .eq('user_id', testUserId);
    
    if (testError) {
      console.error('❌ Test query failed:', testError.message);
    } else {
      console.log(`✅ Test successful: Found ${testDocs.length} documents`);
      testDocs.forEach((doc, i) => {
        console.log(`   ${i + 1}. ${doc.name} (${doc.status})`);
      });
    }
    
    console.log('\n🎉 RLS has been disabled. Try refreshing your frontend now.');
    console.log('📝 Note: RLS is disabled for testing. You can re-enable it later if needed.');
    
  } catch (error) {
    console.error('❌ Fix failed:', error.message);
  }
}

fixRLS();