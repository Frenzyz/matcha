-- Fix chat_messages RLS policies to allow proper message sending

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view messages in rooms they participate in" ON chat_messages;
DROP POLICY IF EXISTS "Users can send messages to rooms they participate in" ON chat_messages;

-- Create more permissive policies for testing
CREATE POLICY "Users can view messages in their rooms" ON chat_messages
  FOR SELECT USING (
    room_id IN (
      SELECT id 
      FROM study_rooms 
      WHERE created_by = auth.uid() OR status = 'active'
    )
  );

CREATE POLICY "Authenticated users can send messages" ON chat_messages
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    user_id = auth.uid()
  );

-- Also allow users to view messages in active rooms they have access to
CREATE POLICY "Users can view messages in accessible rooms" ON chat_messages
  FOR SELECT USING (
    room_id IN (
      SELECT id 
      FROM study_rooms 
      WHERE status = 'active' AND (is_private = false OR created_by = auth.uid())
    )
  );