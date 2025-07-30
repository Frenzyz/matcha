-- Add admin role support and room deletion functionality
-- Migration: 20250130000005_room_deletion_permissions.sql

-- Add is_admin column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- Create room deletion audit log
CREATE TABLE IF NOT EXISTS room_deletion_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL,
  room_name TEXT NOT NULL,
  deleted_by UUID REFERENCES profiles(id) NOT NULL,
  deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deletion_reason TEXT,
  was_creator BOOLEAN DEFAULT FALSE,
  was_admin BOOLEAN DEFAULT FALSE
);

-- Add RLS policies for room deletion log
ALTER TABLE room_deletion_log ENABLE ROW LEVEL SECURITY;

-- Admins and room creators can view deletion logs
CREATE POLICY "Admins can view all deletion logs" ON room_deletion_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = TRUE
    )
  );

-- Users can view logs for rooms they deleted
CREATE POLICY "Users can view their own deletion logs" ON room_deletion_log
  FOR SELECT USING (deleted_by = auth.uid());

-- Only authenticated users can insert deletion logs
CREATE POLICY "Authenticated users can insert deletion logs" ON room_deletion_log
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Create function to check if user can delete room
CREATE OR REPLACE FUNCTION can_delete_room(room_id UUID, user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if user is admin
  IF EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = user_id AND is_admin = TRUE
  ) THEN
    RETURN TRUE;
  END IF;
  
  -- Check if user is the room creator
  IF EXISTS (
    SELECT 1 FROM study_rooms 
    WHERE id = room_id AND created_by = user_id
  ) THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to safely delete room with logging
CREATE OR REPLACE FUNCTION delete_study_room(room_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  room_record study_rooms%ROWTYPE;
  user_is_admin BOOLEAN := FALSE;
  user_is_creator BOOLEAN := FALSE;
BEGIN
  -- Get current user ID
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;
  
  -- Get room details
  SELECT * INTO room_record FROM study_rooms WHERE id = room_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Room not found';
  END IF;
  
  -- Check permissions
  IF NOT can_delete_room(room_id, auth.uid()) THEN
    RAISE EXCEPTION 'Insufficient permissions to delete room';
  END IF;
  
  -- Determine user role for logging
  SELECT is_admin INTO user_is_admin FROM profiles WHERE id = auth.uid();
  user_is_creator := (room_record.created_by = auth.uid());
  
  -- Log the deletion
  INSERT INTO room_deletion_log (
    room_id, room_name, deleted_by, was_creator, was_admin, deletion_reason
  ) VALUES (
    room_id, 
    room_record.name, 
    auth.uid(), 
    user_is_creator, 
    user_is_admin,
    CASE 
      WHEN user_is_admin AND NOT user_is_creator THEN 'Admin deletion'
      WHEN user_is_creator THEN 'Creator deletion'
      ELSE 'Unknown'
    END
  );
  
  -- Delete related records first (cascade)
  DELETE FROM study_room_participants WHERE room_id = room_id;
  DELETE FROM chat_messages WHERE room_id = room_id;
  
  -- Delete the room
  DELETE FROM study_rooms WHERE id = room_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update RLS policies for study_rooms to allow deletion
DROP POLICY IF EXISTS "Users can delete their own rooms" ON study_rooms;
CREATE POLICY "Users can delete their own rooms or admins can delete any" ON study_rooms
  FOR DELETE USING (
    created_by = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = TRUE
    )
  );

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION can_delete_room(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_study_room(UUID) TO authenticated;