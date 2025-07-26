const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://zsevvvaakunsspxpplbh.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzZXZ2dmFha3Vuc3NweHBwbGJoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzAwNjA1NywiZXhwIjoyMDY4NTgyMDU3fQ.KAgc-d5emszV_1sbwv4L_tvhTKq9t2egO-XUZp-7334';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkDocuments() {
  try {
    console.log('📋 Checking all documents in database...');
    
    const { data: documents, error } = await supabase
      .from('documents')
      .select('*')
      .order('uploaded_at', { ascending: false });
    
    if (error) {
      console.error('❌ Error fetching documents:', error.message);
      return;
    }
    
    console.log(`📊 Found ${documents.length} documents:`);
    
    documents.forEach((doc, index) => {
      console.log(`\\n${index + 1}. ${doc.name}`);
      console.log(`   ID: ${doc.id}`);
      console.log(`   User: ${doc.user_id}`);
      console.log(`   Type: ${doc.type}`);
      console.log(`   Size: ${doc.size}`);
      console.log(`   Status: ${doc.status}`);
      console.log(`   Uploaded: ${doc.uploaded_at}`);
      console.log(`   Storage URL: ${doc.storage_url}`);
    });
    
  } catch (error) {
    console.error('❌ Check failed:', error.message);
  }
}

checkDocuments();