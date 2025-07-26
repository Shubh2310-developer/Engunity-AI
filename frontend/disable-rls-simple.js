const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://zsevvvaakunsspxpplbh.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzZXZ2dmFha3Vuc3NweHBwbGJoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzAwNjA1NywiZXhwIjoyMDY4NTgyMDU3fQ.KAgc-d5emszV_1sbwv4L_tvhTKq9t2egO-XUZp-7334';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testDirectQuery() {
  try {
    console.log('🧪 Testing direct document access...');
    
    const testUserId = '3cc7ccf7-1a5a-4538-9ebb-54c3a04c92ac';
    
    // Test with service role (should always work)
    const { data: docs, error } = await supabase
      .from('documents')
      .select('*')
      .eq('user_id', testUserId)
      .order('uploaded_at', { ascending: false });
    
    if (error) {
      console.error('❌ Query failed:', error);
      return;
    }
    
    console.log(`✅ Found ${docs.length} documents for user ${testUserId}:`);
    
    docs.forEach((doc, i) => {
      console.log(`\n${i + 1}. ${doc.name}`);
      console.log(`   ID: ${doc.id}`);
      console.log(`   Status: ${doc.status}`);
      console.log(`   Uploaded: ${doc.uploaded_at}`);
      console.log(`   Storage URL: ${doc.storage_url.substring(0, 60)}...`);
    });
    
    console.log('\n🎯 Documents exist and are accessible via service role');
    console.log('🔍 Issue is likely with RLS blocking authenticated user access');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testDirectQuery();