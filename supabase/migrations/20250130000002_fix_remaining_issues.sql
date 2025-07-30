-- Fix Remaining Critical Issues
-- 1. Add missing participant_count column to study_rooms
-- 2. Fix RLS policies for room creation
-- 3. Update functions for better compatibility

-- Add participant_count column to study_rooms if it doesn't exist
ALTER TABLE study_rooms ADD COLUMN IF NOT EXISTS participant_count INTEGER DEFAULT 0;

-- Update the participant count function to work with the new column
CREATE OR REPLACE FUNCTION update_room_participant_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE study_rooms 
    SET participant_count = (
      SELECT COUNT(*) 
      FROM study_room_participants 
      WHERE room_id = NEW.room_id AND is_active = true
    )
    WHERE id = NEW.room_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE study_rooms 
    SET participant_count = (
      SELECT COUNT(*) 
      FROM study_room_participants 
      WHERE room_id = OLD.room_id AND is_active = true
    )
    WHERE id = OLD.room_id;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Handle both old and new room_ids in case of changes
    UPDATE study_rooms 
    SET participant_count = (
      SELECT COUNT(*) 
      FROM study_room_participants 
      WHERE room_id = NEW.room_id AND is_active = true
    )
    WHERE id = NEW.room_id;
    
    IF OLD.room_id != NEW.room_id THEN
      UPDATE study_rooms 
      SET participant_count = (
        SELECT COUNT(*) 
        FROM study_room_participants 
        WHERE room_id = OLD.room_id AND is_active = true
      )
      WHERE id = OLD.room_id;
    END IF;
    
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for participant count updates
DROP TRIGGER IF EXISTS trigger_update_room_participant_count ON study_room_participants;
CREATE TRIGGER trigger_update_room_participant_count
  AFTER INSERT OR UPDATE OR DELETE ON study_room_participants
  FOR EACH ROW EXECUTE FUNCTION update_room_participant_count();

-- Fix study_rooms RLS policies - make them more permissive for now
DROP POLICY IF EXISTS "Users can view public rooms" ON study_rooms;
DROP POLICY IF EXISTS "Users can view rooms they participate in" ON study_rooms;
DROP POLICY IF EXISTS "Users can create rooms" ON study_rooms;
DROP POLICY IF EXISTS "Room owners can update their rooms" ON study_rooms;
DROP POLICY IF EXISTS "Room owners can delete their rooms" ON study_rooms;

-- Create permissive policies for study_rooms
CREATE POLICY "Anyone can view active public rooms" ON study_rooms
  FOR SELECT USING (status = 'active' AND is_private = false);

CREATE POLICY "Users can view their own rooms" ON study_rooms
  FOR SELECT USING (created_by = auth.uid());

CREATE POLICY "Users can view rooms they joined" ON study_rooms
  FOR SELECT USING (
    id IN (
      SELECT room_id 
      FROM study_room_participants 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Authenticated users can create rooms" ON study_rooms
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND 
    created_by = auth.uid()
  );

CREATE POLICY "Room creators can update their rooms" ON study_rooms
  FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY "Room creators can delete their rooms" ON study_rooms
  FOR DELETE USING (created_by = auth.uid());

-- Update all existing rooms to have correct participant counts
UPDATE study_rooms 
SET participant_count = (
  SELECT COUNT(*) 
  FROM study_room_participants 
  WHERE room_id = study_rooms.id AND is_active = true
);

-- Create case-insensitive search indexes for better search performance
CREATE INDEX IF NOT EXISTS idx_profiles_first_name_lower ON profiles(LOWER(first_name));
CREATE INDEX IF NOT EXISTS idx_profiles_last_name_lower ON profiles(LOWER(last_name));
CREATE INDEX IF NOT EXISTS idx_profiles_major_lower ON profiles(LOWER(major));
CREATE INDEX IF NOT EXISTS idx_enhanced_profiles_interests_gin ON enhanced_profiles USING gin(interests);
CREATE INDEX IF NOT EXISTS idx_enhanced_profiles_study_preferences_gin ON enhanced_profiles USING gin(study_preferences);

-- Create a better search function that's case-insensitive
CREATE OR REPLACE FUNCTION search_users_enhanced(
  search_term TEXT DEFAULT NULL,
  major_filter TEXT DEFAULT NULL,
  study_style_filter TEXT DEFAULT NULL,
  limit_count INTEGER DEFAULT 20,
  offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
  user_id UUID,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  major TEXT,
  study_style TEXT,
  interests JSONB,
  study_preferences JSONB,
  is_available_now BOOLEAN,
  compatibility_score INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as user_id,
    p.first_name,
    p.last_name,
    p.email,
    p.major,
    ep.study_style,
    ep.interests,
    ep.study_preferences,
    ep.is_available_now,
    50 as compatibility_score -- Default score for now
  FROM profiles p
  LEFT JOIN enhanced_profiles ep ON p.id = ep.user_id
  WHERE 
    p.id != auth.uid() AND -- Exclude current user
    (ep.is_searchable = true OR ep.is_searchable IS NULL) AND
    (search_term IS NULL OR 
     LOWER(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, '')) LIKE LOWER('%' || search_term || '%') OR
     LOWER(p.major) LIKE LOWER('%' || search_term || '%')) AND
    (major_filter IS NULL OR LOWER(p.major) = LOWER(major_filter)) AND
    (study_style_filter IS NULL OR ep.study_style = study_style_filter)
  ORDER BY 
    CASE 
      WHEN ep.is_available_now = true THEN 1 
      ELSE 2 
    END,
    p.first_name, p.last_name
  LIMIT limit_count
  OFFSET offset_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;