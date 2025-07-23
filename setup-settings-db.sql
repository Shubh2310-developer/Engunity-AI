-- Enhanced User Settings Table Setup
-- Run this in your Supabase SQL Editor to set up the enhanced settings system

-- First, let's check if the table exists and drop it if we need to recreate it
-- DROP TABLE IF EXISTS public.user_settings CASCADE;

-- Create enhanced user_settings table
CREATE TABLE IF NOT EXISTS public.user_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    version INTEGER DEFAULT 1,
    
    -- Ensure one settings record per user
    UNIQUE(user_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON public.user_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_settings_updated_at ON public.user_settings(updated_at);
CREATE INDEX IF NOT EXISTS idx_user_settings_version ON public.user_settings(version);

-- Create GIN index for JSONB queries (for efficient settings searches)
CREATE INDEX IF NOT EXISTS idx_user_settings_settings_gin ON public.user_settings USING GIN (settings);

-- Add RLS (Row Level Security)
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users can insert their own settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users can update their own settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users can delete their own settings" ON public.user_settings;

-- Create comprehensive RLS policies
CREATE POLICY "Users can view their own settings" ON public.user_settings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings" ON public.user_settings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings" ON public.user_settings
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own settings" ON public.user_settings
    FOR DELETE USING (auth.uid() = user_id);

-- Create or replace function for updated_at trigger
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    NEW.version = OLD.version + 1; -- Increment version for optimistic locking
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at and version management
DROP TRIGGER IF EXISTS update_user_settings_updated_at ON public.user_settings;
CREATE TRIGGER update_user_settings_updated_at
    BEFORE UPDATE ON public.user_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Create function to validate settings structure
CREATE OR REPLACE FUNCTION public.validate_user_settings()
RETURNS TRIGGER AS $$
BEGIN
    -- Ensure settings is a valid JSON object
    IF NEW.settings IS NULL OR jsonb_typeof(NEW.settings) != 'object' THEN
        RAISE EXCEPTION 'Settings must be a valid JSON object';
    END IF;
    
    -- Validate required fields exist
    IF NOT (NEW.settings ? 'theme') THEN
        NEW.settings = NEW.settings || '{"theme": "system"}'::jsonb;
    END IF;
    
    IF NOT (NEW.settings ? 'aiAssistantStyle') THEN
        NEW.settings = NEW.settings || '{"aiAssistantStyle": "professional"}'::jsonb;
    END IF;
    
    IF NOT (NEW.settings ? 'documentPrivacy') THEN
        NEW.settings = NEW.settings || '{"documentPrivacy": "private"}'::jsonb;
    END IF;
    
    -- Add sync metadata
    NEW.settings = NEW.settings || jsonb_build_object(
        'sync', jsonb_build_object(
            'source', 'supabase',
            'timestamp', extract(epoch from now()) * 1000,
            'version', COALESCE(NEW.version, 1)
        )
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for settings validation
DROP TRIGGER IF EXISTS validate_user_settings_trigger ON public.user_settings;
CREATE TRIGGER validate_user_settings_trigger
    BEFORE INSERT OR UPDATE ON public.user_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_user_settings();

-- Create function to get user settings with defaults
CREATE OR REPLACE FUNCTION public.get_user_settings(target_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    user_settings JSONB;
    default_settings JSONB := '{
        "theme": "system",
        "aiAssistantStyle": "professional",
        "documentPrivacy": "private",
        "emailNotifications": true,
        "pushNotifications": true,
        "marketingEmails": false,
        "language": "en",
        "timezone": "UTC",
        "compactMode": false,
        "autoSave": true,
        "soundEffects": true,
        "reducedMotion": false,
        "chatSettings": {
            "autoSave": true,
            "messageHistory": true,
            "typingIndicators": true,
            "soundNotifications": true
        },
        "documentSettings": {
            "autoSync": true,
            "versionHistory": true,
            "collaborativeMode": false,
            "defaultPrivacy": "private"
        }
    }';
BEGIN
    -- Get user settings
    SELECT settings INTO user_settings
    FROM public.user_settings
    WHERE user_id = target_user_id;
    
    -- If no settings found, return defaults
    IF user_settings IS NULL THEN
        RETURN default_settings;
    END IF;
    
    -- Merge with defaults to ensure all fields are present
    RETURN default_settings || user_settings;
END;
$$ LANGUAGE plpgsql;

-- Create function to upsert user settings
CREATE OR REPLACE FUNCTION public.upsert_user_settings(
    target_user_id UUID,
    new_settings JSONB
)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    INSERT INTO public.user_settings (user_id, settings)
    VALUES (target_user_id, new_settings)
    ON CONFLICT (user_id)
    DO UPDATE SET
        settings = new_settings,
        updated_at = NOW()
    RETURNING settings INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Create view for easy settings access with user info
CREATE OR REPLACE VIEW public.user_settings_view AS
SELECT 
    us.id,
    us.user_id,
    u.email,
    us.settings,
    us.created_at,
    us.updated_at,
    us.version,
    -- Extract commonly used settings for easier querying
    us.settings->>'theme' as theme,
    us.settings->>'aiAssistantStyle' as ai_assistant_style,
    us.settings->>'documentPrivacy' as document_privacy,
    (us.settings->>'emailNotifications')::boolean as email_notifications,
    (us.settings->>'pushNotifications')::boolean as push_notifications,
    (us.settings->>'marketingEmails')::boolean as marketing_emails
FROM public.user_settings us
JOIN auth.users u ON us.user_id = u.id;

-- Enable RLS on the view
ALTER VIEW public.user_settings_view SET (security_barrier);

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_settings TO authenticated;
GRANT SELECT ON public.user_settings_view TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_settings(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_user_settings(UUID, JSONB) TO authenticated;

-- Insert some sample data for testing (optional)
-- You can uncomment this if you want to test with sample data
/*
INSERT INTO public.user_settings (user_id, settings) VALUES 
(
    (SELECT id FROM auth.users LIMIT 1), -- Use the first user ID
    '{
        "theme": "dark",
        "aiAssistantStyle": "friendly",
        "documentPrivacy": "private",
        "emailNotifications": true,
        "pushNotifications": false,
        "marketingEmails": false,
        "language": "en",
        "timezone": "UTC",
        "compactMode": true,
        "autoSave": true,
        "soundEffects": false,
        "reducedMotion": false,
        "chatSettings": {
            "autoSave": true,
            "messageHistory": true,
            "typingIndicators": false,
            "soundNotifications": false
        },
        "documentSettings": {
            "autoSync": true,
            "versionHistory": true,
            "collaborativeMode": true,
            "defaultPrivacy": "team"
        }
    }'::jsonb
) ON CONFLICT (user_id) DO NOTHING;
*/

-- Create notification for real-time updates
CREATE OR REPLACE FUNCTION public.notify_settings_change()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM pg_notify(
        'user_settings_changed',
        json_build_object(
            'user_id', NEW.user_id,
            'operation', TG_OP,
            'settings', NEW.settings,
            'timestamp', extract(epoch from NEW.updated_at)
        )::text
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for real-time notifications
DROP TRIGGER IF EXISTS user_settings_change_trigger ON public.user_settings;
CREATE TRIGGER user_settings_change_trigger
    AFTER INSERT OR UPDATE ON public.user_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_settings_change();

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Enhanced user settings system has been set up successfully!';
    RAISE NOTICE '📝 Features enabled:';
    RAISE NOTICE '   - Row Level Security (RLS)';
    RAISE NOTICE '   - Real-time notifications';
    RAISE NOTICE '   - Settings validation';
    RAISE NOTICE '   - Version management';
    RAISE NOTICE '   - JSONB indexing for performance';
    RAISE NOTICE '   - Helper functions for easy access';
    RAISE NOTICE '🚀 You can now use the enhanced settings system in your application!';
END $$;