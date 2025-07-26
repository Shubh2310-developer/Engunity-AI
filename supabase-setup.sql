-- ========================================
-- SUPABASE DATABASE SETUP FOR DOCUMENTS
-- ========================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create documents table if it doesn't exist
CREATE TABLE IF NOT EXISTS documents (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    size TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'general',
    status TEXT NOT NULL DEFAULT 'processed' CHECK (status IN ('uploading', 'processing', 'processed', 'failed')),
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    storage_url TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_at ON documents(uploaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_category ON documents(category);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_documents_updated_at ON documents;
CREATE TRIGGER update_documents_updated_at
    BEFORE UPDATE ON documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ========================================

-- Enable RLS on documents table
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated users to see their own documents
CREATE POLICY IF NOT EXISTS "Users can view their own documents"
    ON documents FOR SELECT
    USING (auth.uid() = user_id);

-- Policy for authenticated users to insert their own documents
CREATE POLICY IF NOT EXISTS "Users can insert their own documents"
    ON documents FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy for authenticated users to update their own documents
CREATE POLICY IF NOT EXISTS "Users can update their own documents"
    ON documents FOR UPDATE
    USING (auth.uid() = user_id);

-- Policy for authenticated users to delete their own documents
CREATE POLICY IF NOT EXISTS "Users can delete their own documents"
    ON documents FOR DELETE
    USING (auth.uid() = user_id);

-- Policy for service role to bypass RLS (for server-side operations)
CREATE POLICY IF NOT EXISTS "Service role can manage all documents"
    ON documents FOR ALL
    USING (current_setting('role') = 'service_role');

-- ========================================
-- STORAGE BUCKET SETUP
-- ========================================

-- Create storage bucket for documents if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies
CREATE POLICY IF NOT EXISTS "Users can view their own document files"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY IF NOT EXISTS "Users can upload their own document files"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY IF NOT EXISTS "Users can update their own document files"
    ON storage.objects FOR UPDATE
    USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY IF NOT EXISTS "Users can delete their own document files"
    ON storage.objects FOR DELETE
    USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow service role to manage all storage objects
CREATE POLICY IF NOT EXISTS "Service role can manage all document files"
    ON storage.objects FOR ALL
    USING (bucket_id = 'documents' AND current_setting('role') = 'service_role');

-- Grant necessary permissions
GRANT ALL ON documents TO authenticated;
GRANT ALL ON documents TO service_role;
GRANT ALL ON storage.objects TO authenticated;
GRANT ALL ON storage.objects TO service_role;
GRANT ALL ON storage.buckets TO authenticated;
GRANT ALL ON storage.buckets TO service_role;

-- ========================================
-- VERIFICATION QUERIES
-- ========================================

-- Verify table exists
SELECT 'documents table exists' as status WHERE EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'documents'
);

-- Verify storage bucket exists
SELECT 'documents bucket exists' as status WHERE EXISTS (
    SELECT FROM storage.buckets WHERE id = 'documents'
);

-- Show table structure
\d documents;

-- Show storage buckets
SELECT id, name, public FROM storage.buckets WHERE id = 'documents';