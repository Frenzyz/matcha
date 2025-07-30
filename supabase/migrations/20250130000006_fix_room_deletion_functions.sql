-- Fix room deletion functions with proper parameter naming to avoid conflicts

-- Drop existing functions first
DROP FUNCTION IF EXISTS can_delete_room(UUID, UUID);
DROP FUNCTION IF EXISTS delete_study_room(UUID);

-- Create function to check if user can delete room (fixed parameter naming)
CREATE OR REPLACE FUNCTION can_delete_room(p_room_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if user is admin
  IF EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = p_user_id AND is_admin = TRUE
  ) THEN
    RETURN TRUE;
  END IF;
  
  -- Check if user is the room creator
  IF EXISTS (
    SELECT 1 FROM study_rooms 
    WHERE id = p_room_id AND created_by = p_user_id
  ) THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to safely delete room with logging (fixed parameter naming)
CREATE OR REPLACE FUNCTION delete_study_room(p_room_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  room_record study_rooms%ROWTYPE;
  user_is_admin BOOLEAN := FALSE;
  user_is_creator BOOLEAN := FALSE;
  current_user_id UUID;
BEGIN
  -- Get current user ID
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;
  
  -- Get room details
  SELECT * INTO room_record FROM study_rooms WHERE id = p_room_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Room not found';
  END IF;
  
  -- Check permissions using fixed function
  IF NOT can_delete_room(p_room_id, current_user_id) THEN
    RAISE EXCEPTION 'Insufficient permissions to delete room';
  END IF;
  
  -- Determine user role for logging
  SELECT is_admin INTO user_is_admin FROM profiles WHERE id = current_user_id;
  user_is_creator := (room_record.created_by = current_user_id);
  
  -- Log the deletion
  INSERT INTO room_deletion_log (
    room_id, room_name, deleted_by, was_creator, was_admin, deletion_reason
  ) VALUES (
    p_room_id, 
    room_record.name, 
    current_user_id, 
    user_is_creator, 
    COALESCE(user_is_admin, FALSE),
    CASE 
      WHEN COALESCE(user_is_admin, FALSE) AND NOT user_is_creator THEN 'Admin deletion'
      WHEN user_is_creator THEN 'Creator deletion'
      ELSE 'Unknown'
    END
  );
  
  -- Delete related records first (cascade should handle this, but being explicit)
  DELETE FROM study_room_participants WHERE room_id = p_room_id;
  DELETE FROM chat_messages WHERE room_id = p_room_id;
  
  -- Delete the room
  DELETE FROM study_rooms WHERE id = p_room_id;
  
  -- Check if deletion was successful
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Failed to delete room';
  END IF;
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error and re-raise
    RAISE EXCEPTION 'Room deletion failed: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION can_delete_room(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_study_room(UUID) TO authenticated;