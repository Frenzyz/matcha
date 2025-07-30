-- Fix Critical RLS Policy Issues
-- This migration fixes infinite recursion and access issues

-- Drop ALL existing policies to start fresh
DROP POLICY IF EXISTS "Participants can view room members" ON study_room_participants;
DROP POLICY IF EXISTS "Users can join rooms" ON study_room_participants;
DROP POLICY IF EXISTS "Users can update their own participation" ON study_room_participants;
DROP POLICY IF EXISTS "Participants can view their rooms" ON study_rooms;
DROP POLICY IF EXISTS "Users can view active public rooms" ON study_rooms;
DROP POLICY IF EXISTS "Users can create rooms" ON study_rooms;
DROP POLICY IF EXISTS "Room owners can update their rooms" ON study_rooms;
DROP POLICY IF EXISTS "Room owners can delete their rooms" ON study_rooms;

-- Fix study_room_participants policies (remove circular reference)
CREATE POLICY "Users can view room participants" ON study_room_participants
  FOR SELECT USING (true); -- Allow viewing all participants (can be restricted later if needed)

CREATE POLICY "Users can join rooms" ON study_room_participants
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own participation" ON study_room_participants
  FOR UPDATE USING (user_id = auth.uid());

-- Fix study_rooms policies  
CREATE POLICY "Users can view public rooms" ON study_rooms
  FOR SELECT USING (status = 'active' AND is_private = false);

CREATE POLICY "Users can view rooms they participate in" ON study_rooms
  FOR SELECT USING (
    created_by = auth.uid() OR 
    id IN (
      SELECT DISTINCT room_id 
      FROM study_room_participants 
      WHERE user_id = auth.uid()
    )
  );

-- Fix enhanced_profiles policies - make them less restrictive
DROP POLICY IF EXISTS "Users can view searchable profiles" ON enhanced_profiles;
DROP POLICY IF EXISTS "Users can manage their own enhanced profile" ON enhanced_profiles;

CREATE POLICY "Users can view all profiles" ON enhanced_profiles
  FOR SELECT USING (true); -- Allow viewing all profiles for search functionality

CREATE POLICY "Users can manage their own profile" ON enhanced_profiles
  FOR ALL USING (user_id = auth.uid());

-- Create enhanced_profiles entries for existing users who don't have them
INSERT INTO enhanced_profiles (
  user_id, 
  study_preferences, 
  interests, 
  study_style, 
  preferred_group_size,
  is_searchable,
  is_available_now
)
SELECT 
  id,
  '["general", "homework"]'::jsonb,
  '["Computer Science", "Mathematics"]'::jsonb,
  'collaborative',
  4,
  true,
  false
FROM profiles 
WHERE id NOT IN (SELECT user_id FROM enhanced_profiles)
ON CONFLICT (user_id) DO NOTHING;

-- Fix direct_messages policy to be less restrictive for testing
DROP POLICY IF EXISTS "Users can send messages to friends" ON direct_messages;
CREATE POLICY "Users can send messages" ON direct_messages
  FOR INSERT WITH CHECK (sender_id = auth.uid());

-- Make friendships more accessible
DROP POLICY IF EXISTS "Users can view their friendships" ON friendships;
CREATE POLICY "Users can view friendships" ON friendships
  FOR SELECT USING (requester_id = auth.uid() OR addressee_id = auth.uid());

-- Make notifications accessible
DROP POLICY IF EXISTS "Users can view their notifications" ON notifications;
CREATE POLICY "Users can view notifications" ON notifications
  FOR SELECT USING (user_id = auth.uid());

-- Make search cache accessible
DROP POLICY IF EXISTS "Users can view search cache" ON user_search_cache;
CREATE POLICY "Anyone can view search cache" ON user_search_cache
  FOR SELECT USING (true);