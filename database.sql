-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    color TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, name)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);

-- Enable Row Level Security
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own categories"
    ON categories FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own categories"
    ON categories FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own categories"
    ON categories FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own categories"
    ON categories FOR DELETE
    USING (auth.uid() = user_id);

-- Add category_id to calendar_events table
ALTER TABLE calendar_events 
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id) ON DELETE SET NULL;

-- Add index for category lookups
CREATE INDEX IF NOT EXISTS idx_calendar_events_category_id ON calendar_events(category_id);