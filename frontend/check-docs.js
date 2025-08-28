const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key-here';

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