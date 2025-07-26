#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, 'frontend', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅' : '❌');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✅' : '❌');
  process.exit(1);
}

console.log('🚀 Setting up Supabase database and storage...');
console.log('📍 Supabase URL:', supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function setupDatabase() {
  try {
    console.log('\n📊 Setting up database...');
    
    // Read and execute the SQL setup script
    const sqlScript = fs.readFileSync(path.join(__dirname, 'supabase-setup.sql'), 'utf8');
    
    // Split SQL into individual statements (basic approach)
    const statements = sqlScript
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt && !stmt.startsWith('--') && !stmt.startsWith('\\d') && !stmt.startsWith('SELECT'))
      .filter(stmt => stmt.length > 10); // Filter out very short statements
    
    console.log(`📝 Executing ${statements.length} SQL statements...`);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        try {
          console.log(`   ${i + 1}/${statements.length}: ${statement.substring(0, 50)}...`);
          const { error } = await supabase.rpc('exec_sql', { sql: statement });
          if (error && !error.message.includes('already exists')) {
            console.warn(`   ⚠️ Warning for statement ${i + 1}:`, error.message);
          }
        } catch (err) {
          console.warn(`   ⚠️ Error executing statement ${i + 1}:`, err.message);
        }
      }
    }
    
    console.log('✅ Database setup completed');
    
  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    
    // Try alternative approach - direct table creation
    console.log('\n🔄 Trying alternative setup approach...');
    await createDocumentsTable();
  }
}

async function createDocumentsTable() {
  try {
    console.log('📊 Creating documents table...');
    
    // Check if table exists
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'documents');
    
    if (tablesError) {
      console.log('⚠️ Could not check existing tables, proceeding with creation...');
    } else if (tables && tables.length > 0) {
      console.log('✅ Documents table already exists');
      return;
    }
    
    // Create table using a simple approach
    const createTableSQL = `
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
        tags TEXT[] DEFAULT ARRAY[]
      )
    `;
    
    const { error } = await supabase.rpc('exec_sql', { sql: createTableSQL });
    if (error) {
      throw error;
    }
    
    console.log('✅ Documents table created successfully');
    
  } catch (error) {
    console.error('❌ Failed to create documents table:', error.message);
    console.log('\n📝 Please manually create the table in Supabase dashboard with this SQL:');
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
  tags TEXT[] DEFAULT ARRAY[]
);
    `);
  }
}

async function setupStorage() {
  try {
    console.log('\n📦 Setting up storage bucket...');
    
    // Check if bucket exists
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      throw new Error(`Failed to list buckets: ${bucketsError.message}`);
    }
    
    const documentsBucket = buckets.find(bucket => bucket.id === 'documents');
    
    if (documentsBucket) {
      console.log('✅ Documents storage bucket already exists');
    } else {
      console.log('📦 Creating documents storage bucket...');
      
      const { error: createError } = await supabase.storage.createBucket('documents', {
        public: true,
        fileSizeLimit: 52428800, // 50MB
        allowedMimeTypes: [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'text/plain',
          'text/markdown',
          'text/csv',
          'application/json'
        ]
      });
      
      if (createError) {
        throw new Error(`Failed to create bucket: ${createError.message}`);
      }
      
      console.log('✅ Documents storage bucket created successfully');
    }
    
  } catch (error) {
    console.error('❌ Storage setup failed:', error.message);
    console.log('\n📝 Please manually create the storage bucket in Supabase dashboard:');
    console.log('   1. Go to Storage section');
    console.log('   2. Create a new bucket named "documents"');
    console.log('   3. Make it public');
    console.log('   4. Set file size limit to 50MB');
  }
}

async function testSetup() {
  try {
    console.log('\n🧪 Testing setup...');
    
    // Test database connection
    const { data, error } = await supabase.from('documents').select('count').limit(1);
    if (error) {
      throw new Error(`Database test failed: ${error.message}`);
    }
    console.log('✅ Database connection successful');
    
    // Test storage access
    const { data: storageData, error: storageError } = await supabase.storage
      .from('documents')
      .list('', { limit: 1 });
    
    if (storageError) {
      throw new Error(`Storage test failed: ${storageError.message}`);
    }
    console.log('✅ Storage access successful');
    
    console.log('\n🎉 Supabase setup completed successfully!');
    console.log('📝 Your app should now be able to store documents permanently.');
    
  } catch (error) {
    console.error('❌ Setup test failed:', error.message);
    console.log('\n📋 Manual setup may be required. Check the Supabase dashboard.');
  }
}

async function main() {
  try {
    await setupDatabase();
    await setupStorage();
    await testSetup();
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { setupDatabase, setupStorage, testSetup };