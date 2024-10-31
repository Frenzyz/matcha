-- Add status column to calendar_events if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'calendar_events' 
        AND column_name = 'status'
    ) THEN
        ALTER TABLE calendar_events 
        ADD COLUMN status TEXT CHECK (status IN ('pending', 'completed')) DEFAULT 'pending';
    END IF;
END $$;

-- Create calendar_events table if not exists
CREATE TABLE IF NOT EXISTS calendar_events (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    google_event_id TEXT UNIQUE,
    title TEXT NOT NULL,
    description TEXT,
    location TEXT,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('academic', 'career', 'wellness', 'social', 'research', 'service', 'cultural', 'athletic', 'administrative', 'financial')),
    status TEXT CHECK (status IN ('pending', 'completed')) DEFAULT 'pending',
    attendees INTEGER,
    is_recurring BOOLEAN DEFAULT false,
    recurrence_rule TEXT,
    source TEXT NOT NULL CHECK (source IN ('manual', 'scraped', 'google', 'canvas', 'demo', 'calendar')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own events" ON calendar_events;
DROP POLICY IF EXISTS "Users can create their own events" ON calendar_events;
DROP POLICY IF EXISTS "Users can update their own events" ON calendar_events;
DROP POLICY IF EXISTS "Users can delete their own events" ON calendar_events;

-- Enable RLS on calendar_events
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for calendar_events
CREATE POLICY "Users can view their own events"
    ON calendar_events FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own events"
    ON calendar_events FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own events"
    ON calendar_events FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own events"
    ON calendar_events FOR DELETE
    USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS calendar_events_user_id_idx ON calendar_events(user_id);
CREATE INDEX IF NOT EXISTS calendar_events_start_time_idx ON calendar_events(start_time);
CREATE INDEX IF NOT EXISTS calendar_events_status_idx ON calendar_events(status);
CREATE INDEX IF NOT EXISTS calendar_events_google_event_id_idx ON calendar_events(google_event_id);