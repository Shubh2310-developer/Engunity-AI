-- Migration to fix document storage and add S3 support
-- Run this in your Supabase SQL Editor

-- First, let's check and fix the documents table structure
DO $$
BEGIN
    -- Check if user_id is UUID type and change to TEXT for compatibility
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'documents' 
        AND column_name = 'user_id' 
        AND data_type = 'uuid'
    ) THEN
        -- Convert existing UUID user_ids to TEXT
        ALTER TABLE documents ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;
        RAISE NOTICE 'Changed user_id from UUID to TEXT';
    END IF;
    
    -- Add storage_key column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'documents' 
        AND column_name = 'storage_key'
    ) THEN
        ALTER TABLE documents ADD COLUMN storage_key TEXT;
        RAISE NOTICE 'Added storage_key column';
    END IF;
END $$;

-- Create index on storage_key for better performance
CREATE INDEX IF NOT EXISTS idx_documents_storage_key ON documents(storage_key);

-- Update any existing records that might have duplicate IDs
-- This removes potential duplicates keeping the latest one
WITH ranked_documents AS (
    SELECT id, 
           ROW_NUMBER() OVER (PARTITION BY user_id, name, uploaded_at ORDER BY created_at DESC) as rn
    FROM documents
)
DELETE FROM documents 
WHERE id IN (
    SELECT id FROM ranked_documents WHERE rn > 1
);

-- Ensure the documents bucket exists and is public
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Disable RLS for development (re-enable for production)
ALTER TABLE documents DISABLE ROW LEVEL SECURITY;
ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT ALL ON documents TO anon;
GRANT ALL ON documents TO authenticated;
GRANT ALL ON documents TO service_role;

-- Verify the changes
SELECT 
    column_name, 
    data_type, 
    is_nullable 
FROM information_schema.columns 
WHERE table_name = 'documents' 
ORDER BY ordinal_position;