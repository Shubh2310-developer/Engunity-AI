const { createClient } = require('@supabase/supabase-js');

// Environment variables from .env.local
const supabaseUrl = 'https://zsevvvaakunsspxpplbh.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzZXZ2dmFha3Vuc3NweHBwbGJoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzAwNjA1NywiZXhwIjoyMDY4NTgyMDU3fQ.KAgc-d5emszV_1sbwv4L_tvhTKq9t2egO-XUZp-7334';

console.log('🧪 Testing Supabase connection...');

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function testConnection() {
  try {
    // Test basic connection
    console.log('📞 Testing database connection...');
    const { data, error } = await supabase.from('documents').select('count').limit(1);
    
    if (error) {
      console.error('❌ Database error:', error.message);
      
      if (error.code === '42P01') {
        console.log('\n📝 Documents table does not exist. Creating it...');
        await createTable();
      } else {
        throw error;
      }
    } else {
      console.log('✅ Database connection successful');
      console.log('📊 Current documents:', data);
    }
    
    // Test storage
    console.log('\n📦 Testing storage connection...');
    const { data: buckets, error: storageError } = await supabase.storage.listBuckets();
    
    if (storageError) {
      console.error('❌ Storage error:', storageError.message);
      console.log('📝 Creating storage bucket...');
      await createBucket();
    } else {
      console.log('✅ Storage connection successful');
      console.log('🪣 Available buckets:', buckets.map(b => b.name));
      
      const docsBucket = buckets.find(b => b.id === 'documents');
      if (!docsBucket) {
        console.log('📝 Documents bucket not found. Creating it...');
        await createBucket();
      } else {
        console.log('✅ Documents bucket exists');
      }
    }
    
  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
  }
}

async function createTable() {
  try {
    // Simple table creation
    const { error } = await supabase.rpc('exec', {
      sql: `
        CREATE TABLE IF NOT EXISTS documents (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          user_id UUID NOT NULL,
          name TEXT NOT NULL,
          type TEXT NOT NULL,
          size TEXT NOT NULL,
          category TEXT NOT NULL DEFAULT 'general',
          status TEXT NOT NULL DEFAULT 'processed',
          uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          processed_at TIMESTAMPTZ,
          storage_url TEXT NOT NULL,
          metadata JSONB DEFAULT '{}',
          tags TEXT[] DEFAULT ARRAY[]::TEXT[]
        );
      `
    });
    
    if (error) {
      console.error('❌ Failed to create table:', error.message);
      console.log('\n📋 Please create the table manually in Supabase dashboard:');
      console.log(`
CREATE TABLE documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  size TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  status TEXT NOT NULL DEFAULT 'processed',
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  storage_url TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  tags TEXT[] DEFAULT ARRAY[]::TEXT[]
);
      `);
    } else {
      console.log('✅ Documents table created successfully');
    }
  } catch (error) {
    console.error('❌ Table creation failed:', error.message);
  }
}

async function createBucket() {
  try {
    const { error } = await supabase.storage.createBucket('documents', {
      public: true,
      fileSizeLimit: 52428800 // 50MB
    });
    
    if (error) {
      console.error('❌ Failed to create bucket:', error.message);
      console.log('\n📋 Please create the bucket manually in Supabase dashboard');
    } else {
      console.log('✅ Documents bucket created successfully');
    }
  } catch (error) {
    console.error('❌ Bucket creation failed:', error.message);
  }
}

testConnection();