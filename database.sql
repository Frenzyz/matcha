-- Add Google Calendar integration columns to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS google_calendar_token TEXT,
ADD COLUMN IF NOT EXISTS google_calendar_ids TEXT[];

-- Create index for Google Calendar token
CREATE INDEX IF NOT EXISTS idx_profiles_google_calendar_token 
ON profiles(google_calendar_token);

-- Add RLS policies for Google Calendar columns
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    -- Check and create policy for SELECT
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE tablename = 'profiles' AND policyname = 'Users can view their own calendar settings'
    ) THEN
        CREATE POLICY "Users can view their own calendar settings"
            ON profiles FOR SELECT
            USING (auth.uid() = id);
    END IF;

    -- Check and create policy for UPDATE
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE tablename = 'profiles' AND policyname = 'Users can update their own calendar settings'
    ) THEN
        CREATE POLICY "Users can update their own calendar settings"
            ON profiles FOR UPDATE
            USING (auth.uid() = id)
            WITH CHECK (auth.uid() = id);
    END IF;
END;
$$;

-- Create calendar_preferences table
CREATE TABLE IF NOT EXISTS calendar_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    calendar_id TEXT NOT NULL,
    calendar_name TEXT NOT NULL,
    is_selected BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, calendar_id)
);

-- Add RLS policies for calendar_preferences
ALTER TABLE calendar_preferences ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    -- Check and create policy for SELECT
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE tablename = 'calendar_preferences' AND policyname = 'Users can view their own calendar preferences'
    ) THEN
        CREATE POLICY "Users can view their own calendar preferences"
            ON calendar_preferences FOR SELECT
            USING (auth.uid() = user_id);
    END IF;

    -- Check and create policy for INSERT
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE tablename = 'calendar_preferences' AND policyname = 'Users can insert their own calendar preferences'
    ) THEN
        CREATE POLICY "Users can insert their own calendar preferences"
            ON calendar_preferences FOR INSERT
            WITH CHECK (auth.uid() = user_id);
    END IF;

    -- Check and create policy for UPDATE
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE tablename = 'calendar_preferences' AND policyname = 'Users can update their own calendar preferences'
    ) THEN
        CREATE POLICY "Users can update their own calendar preferences"
            ON calendar_preferences FOR UPDATE
            USING (auth.uid() = user_id)
            WITH CHECK (auth.uid() = user_id);
    END IF;

    -- Check and create policy for DELETE
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE tablename = 'calendar_preferences' AND policyname = 'Users can delete their own calendar preferences'
    ) THEN
        CREATE POLICY "Users can delete their own calendar preferences"
            ON calendar_preferences FOR DELETE
            USING (auth.uid() = user_id);
    END IF;
END;
$$;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_calendar_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists, then create it
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'update_calendar_preferences_updated_at'
    ) THEN
        DROP TRIGGER update_calendar_preferences_updated_at ON calendar_preferences;
    END IF;

    CREATE TRIGGER update_calendar_preferences_updated_at
        BEFORE UPDATE ON calendar_preferences
        FOR EACH ROW
        EXECUTE FUNCTION update_calendar_preferences_updated_at();
END;
$$;

-- Add missing columns to calendar_events table
ALTER TABLE calendar_events 
ADD COLUMN IF NOT EXISTS google_event_id TEXT,
ADD COLUMN IF NOT EXISTS calendar_id TEXT;

-- Create index for Google event ID
CREATE INDEX IF NOT EXISTS idx_calendar_events_google_event_id 
ON calendar_events(google_event_id);
