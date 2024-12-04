-- Add mode column to chats table
ALTER TABLE chats ADD COLUMN IF NOT EXISTS mode TEXT DEFAULT 'chat';

-- Create index for chat mode
CREATE INDEX IF NOT EXISTS idx_chats_mode ON chats(mode);

-- Update existing chats
UPDATE chats SET mode = 'chat' WHERE mode IS NULL;

-- Create calendar_events table if not exists
CREATE TABLE IF NOT EXISTS calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    location TEXT,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    type TEXT NOT NULL DEFAULT 'academic',
    status TEXT NOT NULL DEFAULT 'pending',
    attendees INTEGER,
    is_recurring BOOLEAN DEFAULT false,
    recurrence_rule TEXT,
    source TEXT NOT NULL DEFAULT 'manual',
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    color TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for calendar_events
CREATE INDEX IF NOT EXISTS idx_calendar_events_user_id ON calendar_events(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_start_time ON calendar_events(start_time);
CREATE INDEX IF NOT EXISTS idx_calendar_events_category_id ON calendar_events(category_id);

-- Add RLS policies for calendar_events
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own calendar events"
    ON calendar_events FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own calendar events"
    ON calendar_events FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own calendar events"
    ON calendar_events FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own calendar events"
    ON calendar_events FOR DELETE
    USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updating timestamp
CREATE TRIGGER update_calendar_events_updated_at
    BEFORE UPDATE ON calendar_events
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();