-- Enable RLS
ALTER TABLE study_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_room_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_room_messages ENABLE ROW LEVEL SECURITY;

-- Add beta_features column to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS beta_features JSONB DEFAULT '{"groupStudy": false}'::jsonb;

-- Study rooms policies
CREATE POLICY "Users can view all study rooms"
ON study_rooms FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can create study rooms"
ON study_rooms FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Admin can delete any room"
ON study_rooms FOR DELETE
TO authenticated
USING (
    auth.uid() = '8136b447-829e-41f7-8ade-e3a0bba52703' OR
    auth.uid() = created_by
);

-- Participants policies
CREATE POLICY "Users can view room participants"
ON study_room_participants FOR SELECT
TO authenticated
USING (EXISTS (
    SELECT 1 FROM study_rooms
    WHERE id = room_id
));

CREATE POLICY "Users can join rooms"
ON study_room_participants FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM study_rooms
        WHERE id = room_id
        AND status = 'active'
    )
    AND auth.uid() = user_id
);

CREATE POLICY "Users can leave rooms"
ON study_room_participants FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Messages policies
CREATE POLICY "Users can view room messages"
ON study_room_messages FOR SELECT
TO authenticated
USING (EXISTS (
    SELECT 1 FROM study_room_participants
    WHERE room_id = study_room_messages.room_id
    AND user_id = auth.uid()
));

CREATE POLICY "Users can send messages"
ON study_room_messages FOR INSERT
TO authenticated
WITH CHECK (EXISTS (
    SELECT 1 FROM study_room_participants
    WHERE room_id = study_room_messages.room_id
    AND user_id = auth.uid()
));

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_study_room_messages_room ON study_room_messages(room_id);
CREATE INDEX IF NOT EXISTS idx_study_room_messages_created ON study_room_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_study_room_participants_room ON study_room_participants(room_id);
CREATE INDEX IF NOT EXISTS idx_study_room_participants_user ON study_room_participants(user_id);