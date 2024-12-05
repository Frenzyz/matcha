export interface StudyRoom {
  id: string;
  name: string;
  subject: string;
  description?: string;
  status: 'active' | 'ended';
  created_by: string;
  created_at: string;
  updated_at: string;
  participant_count?: number;
}

export interface StudyRoomParticipant {
  id: string;
  room_id: string;
  user_id: string;
  joined_at: string;
}

export interface StudyRoomMessage {
  id: string;
  room_id: string;
  user_id: string;
  content: string;
  created_at: string;
}