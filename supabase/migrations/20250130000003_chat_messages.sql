-- Add chat messages table for persistent chat history
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'file', 'system')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_chat_messages_room_id ON chat_messages(room_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_messages_room_created ON chat_messages(room_id, created_at);

-- Enable RLS
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view messages in rooms they participate in" ON chat_messages
  FOR SELECT USING (
    room_id IN (
      SELECT room_id 
      FROM study_room_participants 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Users can send messages to rooms they participate in" ON chat_messages
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    room_id IN (
      SELECT room_id 
      FROM study_room_participants 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Function to get recent messages for a room
CREATE OR REPLACE FUNCTION get_room_messages(
  target_room_id UUID,
  message_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  room_id UUID,
  user_id UUID,
  content TEXT,
  message_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  user_name TEXT,
  avatar_url TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cm.id,
    cm.room_id,
    cm.user_id,
    cm.content,
    cm.message_type,
    cm.created_at,
    COALESCE(p.first_name || ' ' || p.last_name, p.email) as user_name,
    p.avatar_url
  FROM chat_messages cm
  LEFT JOIN profiles p ON cm.user_id = p.id
  WHERE cm.room_id = target_room_id
  ORDER BY cm.created_at DESC
  LIMIT message_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;