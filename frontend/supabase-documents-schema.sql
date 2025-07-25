-- Supabase Documents Table Schema (No Authentication Required)
-- Run this in your Supabase SQL Editor to create the documents table

-- Create documents table
CREATE TABLE IF NOT EXISTS documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL, -- Changed from UUID to TEXT to allow anonymous users
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  size TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  status TEXT NOT NULL DEFAULT 'processed' CHECK (status IN ('uploading', 'processing', 'processed', 'failed')),
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  storage_url TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_category ON documents(category);
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_at ON documents(uploaded_at DESC);
-- Disable Row Level Security (RLS) for public access
ALTER TABLE documents DISABLE ROW LEVEL SECURITY;

-- Note: RLS is disabled to allow public access without authentication
-- In a production environment, you may want to implement alternative security measures

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create storage bucket for documents if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO NOTHING;

-- Disable storage RLS for public access
ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;

-- Note: Storage RLS is disabled to allow public access without authentication
-- In a production environment, you may want to implement alternative security measures

-- Grant necessary permissions
GRANT ALL ON documents TO anon;
GRANT ALL ON documents TO authenticated;
GRANT ALL ON documents TO service_role;