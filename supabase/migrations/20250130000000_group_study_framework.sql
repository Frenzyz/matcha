-- Comprehensive Group Study Framework Database Schema
-- This file contains all necessary tables for a robust group study system

-- Enhanced Profiles with Study Preferences
CREATE TABLE IF NOT EXISTS enhanced_profiles (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  study_preferences JSONB DEFAULT '[]'::jsonb, -- Array of study preferences
  interests JSONB DEFAULT '[]'::jsonb, -- Array of interests/subjects
  availability JSONB DEFAULT '{}'::jsonb, -- Weekly availability schedule
  study_style TEXT DEFAULT 'collaborative', -- 'collaborative', 'independent', 'hybrid'
  preferred_group_size INTEGER DEFAULT 4,
  bio TEXT,
  timezone TEXT DEFAULT 'UTC',
  is_available_now BOOLEAN DEFAULT false,
  is_searchable BOOLEAN DEFAULT true,
  last_active TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Study Rooms Table (Enhanced)
CREATE TABLE IF NOT EXISTS study_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'ended', 'private')),
  created_by UUID REFERENCES profiles(id) ON DELETE CASCADE,
  max_participants INTEGER DEFAULT 8,
  study_type TEXT DEFAULT 'general', -- 'exam_prep', 'homework', 'project', 'general'
  difficulty_level TEXT DEFAULT 'intermediate', -- 'beginner', 'intermediate', 'advanced'
  tags JSONB DEFAULT '[]'::jsonb,
  is_private BOOLEAN DEFAULT false,
  password_hash TEXT, -- For private rooms
  scheduled_start TIMESTAMPTZ,
  scheduled_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Study Room Participants
CREATE TABLE IF NOT EXISTS study_room_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES study_rooms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'participant' CHECK (role IN ('owner', 'moderator', 'participant')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  video_enabled BOOLEAN DEFAULT true,
  audio_enabled BOOLEAN DEFAULT true,
  UNIQUE(room_id, user_id)
);

-- Study Room Messages
CREATE TABLE IF NOT EXISTS study_room_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES study_rooms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'file', 'system')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Friend Relationships
CREATE TABLE IF NOT EXISTS friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  addressee_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'blocked')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(requester_id, addressee_id),
  CHECK (requester_id != addressee_id)
);

-- Direct Messages
CREATE TABLE IF NOT EXISTS direct_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'file', 'call_invite')),
  metadata JSONB DEFAULT '{}'::jsonb,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (sender_id != receiver_id)
);

-- User Search Cache (for performance)
CREATE TABLE IF NOT EXISTS user_search_cache (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  search_vector tsvector,
  interests_text TEXT,
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- Study Session Invites
CREATE TABLE IF NOT EXISTS study_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  invitee_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  room_id UUID REFERENCES study_rooms(id) ON DELETE CASCADE,
  message TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours'),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('friend_request', 'friend_accepted', 'message', 'study_invite', 'room_invite')),
  title TEXT NOT NULL,
  content TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Video Call Sessions (for tracking and analytics)
CREATE TABLE IF NOT EXISTS video_call_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES study_rooms(id) ON DELETE CASCADE,
  participants JSONB DEFAULT '[]'::jsonb,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  duration_minutes INTEGER,
  quality_rating INTEGER CHECK (quality_rating >= 1 AND quality_rating <= 5)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_enhanced_profiles_availability ON enhanced_profiles USING gin(availability);
CREATE INDEX IF NOT EXISTS idx_enhanced_profiles_interests ON enhanced_profiles USING gin(interests);
CREATE INDEX IF NOT EXISTS idx_enhanced_profiles_searchable ON enhanced_profiles(is_searchable, is_available_now);
CREATE INDEX IF NOT EXISTS idx_study_rooms_status ON study_rooms(status);
CREATE INDEX IF NOT EXISTS idx_study_rooms_subject ON study_rooms(subject);
CREATE INDEX IF NOT EXISTS idx_study_rooms_tags ON study_rooms USING gin(tags);
CREATE INDEX IF NOT EXISTS idx_study_room_participants_active ON study_room_participants(room_id, is_active);
CREATE INDEX IF NOT EXISTS idx_friendships_requester ON friendships(requester_id, status);
CREATE INDEX IF NOT EXISTS idx_friendships_addressee ON friendships(addressee_id, status);
CREATE INDEX IF NOT EXISTS idx_direct_messages_sender ON direct_messages(sender_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_direct_messages_receiver ON direct_messages(receiver_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_direct_messages_conversation ON direct_messages(
  LEAST(sender_id, receiver_id), 
  GREATEST(sender_id, receiver_id), 
  created_at DESC
);
CREATE INDEX IF NOT EXISTS idx_user_search_cache_vector ON user_search_cache USING gin(search_vector);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_study_invites_invitee ON study_invites(invitee_id, status);

-- Add computed columns and functions
CREATE OR REPLACE FUNCTION update_search_cache()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_search_cache (user_id, search_vector, interests_text, last_updated)
  VALUES (
    NEW.user_id,
    to_tsvector('english', 
      COALESCE((SELECT first_name || ' ' || last_name || ' ' || COALESCE(major, '') FROM profiles WHERE id = NEW.user_id), '') ||
      ' ' || COALESCE(NEW.bio, '') ||
      ' ' || COALESCE(array_to_string(ARRAY(SELECT jsonb_array_elements_text(NEW.interests)), ' '), '')
    ),
    COALESCE(array_to_string(ARRAY(SELECT jsonb_array_elements_text(NEW.interests)), ' '), ''),
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    search_vector = EXCLUDED.search_vector,
    interests_text = EXCLUDED.interests_text,
    last_updated = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger for search cache updates
DROP TRIGGER IF EXISTS trigger_update_search_cache ON enhanced_profiles;
CREATE TRIGGER trigger_update_search_cache
  AFTER INSERT OR UPDATE ON enhanced_profiles
  FOR EACH ROW EXECUTE FUNCTION update_search_cache();

-- Add computed participant count for study rooms
DROP FUNCTION IF EXISTS get_room_participant_count(UUID);
CREATE OR REPLACE FUNCTION get_room_participant_count(room_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER 
    FROM study_room_participants 
    WHERE study_room_participants.room_id = get_room_participant_count.room_id 
    AND is_active = true
  );
END;
$$ LANGUAGE plpgsql;

-- Clean up existing policies to make migration idempotent
DROP POLICY IF EXISTS "Users can view searchable profiles" ON enhanced_profiles;
DROP POLICY IF EXISTS "Users can manage their own enhanced profile" ON enhanced_profiles;
DROP POLICY IF EXISTS "Users can view active public rooms" ON study_rooms;
DROP POLICY IF EXISTS "Participants can view their rooms" ON study_rooms;
DROP POLICY IF EXISTS "Users can create rooms" ON study_rooms;
DROP POLICY IF EXISTS "Room owners can update their rooms" ON study_rooms;
DROP POLICY IF EXISTS "Room owners can delete their rooms" ON study_rooms;
DROP POLICY IF EXISTS "Participants can view room members" ON study_room_participants;
DROP POLICY IF EXISTS "Users can join rooms" ON study_room_participants;
DROP POLICY IF EXISTS "Users can update their own participation" ON study_room_participants;
DROP POLICY IF EXISTS "Room participants can view messages" ON study_room_messages;
DROP POLICY IF EXISTS "Room participants can send messages" ON study_room_messages;
DROP POLICY IF EXISTS "Users can view their friendships" ON friendships;
DROP POLICY IF EXISTS "Users can create friend requests" ON friendships;
DROP POLICY IF EXISTS "Users can update friendships they're part of" ON friendships;
DROP POLICY IF EXISTS "Users can view their messages" ON direct_messages;
DROP POLICY IF EXISTS "Users can send messages to friends" ON direct_messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON direct_messages;
DROP POLICY IF EXISTS "Users can view their notifications" ON notifications;
DROP POLICY IF EXISTS "System can create notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their notifications" ON notifications;
DROP POLICY IF EXISTS "Users can view their invites" ON study_invites;
DROP POLICY IF EXISTS "Users can create invites" ON study_invites;
DROP POLICY IF EXISTS "Users can update their invites" ON study_invites;
DROP POLICY IF EXISTS "Users can view search cache" ON user_search_cache;
DROP POLICY IF EXISTS "Room participants can view call sessions" ON video_call_sessions;
DROP POLICY IF EXISTS "System can manage call sessions" ON video_call_sessions;

-- RLS Policies

-- Enhanced Profiles
ALTER TABLE enhanced_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view searchable profiles" ON enhanced_profiles
  FOR SELECT USING (is_searchable = true OR user_id = auth.uid());
CREATE POLICY "Users can manage their own enhanced profile" ON enhanced_profiles
  FOR ALL USING (user_id = auth.uid());

-- Study Rooms
ALTER TABLE study_rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view active public rooms" ON study_rooms
  FOR SELECT USING (status = 'active' AND is_private = false);
CREATE POLICY "Participants can view their rooms" ON study_rooms
  FOR SELECT USING (
    id IN (
      SELECT room_id FROM study_room_participants 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );
CREATE POLICY "Users can create rooms" ON study_rooms
  FOR INSERT WITH CHECK (created_by = auth.uid());
CREATE POLICY "Room owners can update their rooms" ON study_rooms
  FOR UPDATE USING (created_by = auth.uid());
CREATE POLICY "Room owners can delete their rooms" ON study_rooms
  FOR DELETE USING (created_by = auth.uid());

-- Study Room Participants
ALTER TABLE study_room_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants can view room members" ON study_room_participants
  FOR SELECT USING (
    room_id IN (
      SELECT room_id FROM study_room_participants 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );
CREATE POLICY "Users can join rooms" ON study_room_participants
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update their own participation" ON study_room_participants
  FOR UPDATE USING (user_id = auth.uid());

-- Study Room Messages
ALTER TABLE study_room_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Room participants can view messages" ON study_room_messages
  FOR SELECT USING (
    room_id IN (
      SELECT room_id FROM study_room_participants 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );
CREATE POLICY "Room participants can send messages" ON study_room_messages
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    room_id IN (
      SELECT room_id FROM study_room_participants 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Friendships
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their friendships" ON friendships
  FOR SELECT USING (requester_id = auth.uid() OR addressee_id = auth.uid());
CREATE POLICY "Users can create friend requests" ON friendships
  FOR INSERT WITH CHECK (requester_id = auth.uid());
CREATE POLICY "Users can update friendships they're part of" ON friendships
  FOR UPDATE USING (requester_id = auth.uid() OR addressee_id = auth.uid());

-- Direct Messages
ALTER TABLE direct_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their messages" ON direct_messages
  FOR SELECT USING (sender_id = auth.uid() OR receiver_id = auth.uid());
CREATE POLICY "Users can send messages to friends" ON direct_messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM friendships 
      WHERE status = 'accepted' AND (
        (requester_id = auth.uid() AND addressee_id = receiver_id) OR
        (requester_id = receiver_id AND addressee_id = auth.uid())
      )
    )
  );
CREATE POLICY "Users can update their own messages" ON direct_messages
  FOR UPDATE USING (sender_id = auth.uid() OR receiver_id = auth.uid());

-- Notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their notifications" ON notifications
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "System can create notifications" ON notifications
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update their notifications" ON notifications
  FOR UPDATE USING (user_id = auth.uid());

-- Study Invites
ALTER TABLE study_invites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their invites" ON study_invites
  FOR SELECT USING (inviter_id = auth.uid() OR invitee_id = auth.uid());
CREATE POLICY "Users can create invites" ON study_invites
  FOR INSERT WITH CHECK (inviter_id = auth.uid());
CREATE POLICY "Users can update their invites" ON study_invites
  FOR UPDATE USING (inviter_id = auth.uid() OR invitee_id = auth.uid());

-- User Search Cache
ALTER TABLE user_search_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view search cache" ON user_search_cache
  FOR SELECT USING (true);

-- Video Call Sessions
ALTER TABLE video_call_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Room participants can view call sessions" ON video_call_sessions
  FOR SELECT USING (
    room_id IN (
      SELECT room_id FROM study_room_participants 
      WHERE user_id = auth.uid()
    )
  );
CREATE POLICY "System can manage call sessions" ON video_call_sessions
  FOR ALL USING (true);