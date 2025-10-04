-- User Settings Table Migration
-- This SQL can be run directly in Supabase SQL Editor

-- Create user_settings table
CREATE TABLE IF NOT EXISTS public.user_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one settings record per user
    UNIQUE(user_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON public.user_settings(user_id);

-- Add RLS (Row Level Security)
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own settings" ON public.user_settings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings" ON public.user_settings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings" ON public.user_settings
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own settings" ON public.user_settings
    FOR DELETE USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_settings_updated_at
    BEFORE UPDATE ON public.user_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();