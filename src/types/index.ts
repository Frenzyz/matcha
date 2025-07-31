export * from './chat';
export * from './assignment';
export * from './scholarship';
export * from './study-room';

export interface PersonalInfo {
  first_name?: string;
  last_name?: string;
  phone?: string;
  date_of_birth?: string;
}

export interface AcademicInfo {
  major?: string;
  year?: string;
  gpa?: number;
  expected_graduation?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  student_id?: string;
  major?: string;
  avatar_url?: string;
  theme_color?: string;
  setup_completed?: boolean;
  google_calendar_token?: string;
  academic_info?: AcademicInfo;
  personal_info?: PersonalInfo;
  beta_features?: {
    [key: string]: boolean;
  };
  email_notifications?: boolean;
  desktop_notifications?: boolean;
  created_at: string;
  updated_at: string;
  last_seen?: string;
}

export type EventType = 'academic' | 'career' | 'wellness' | 'social';

export interface Event {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  location?: string;
  start_time: string;
  end_time: string;
  type: EventType;
  status: 'pending' | 'completed';
  attendees?: number;
  is_recurring?: boolean;
  recurrence_rule?: string;
  source: 'manual' | 'google' | 'auto';
  google_event_id?: string;
  calendar_id?: string;
  category_id?: string;
  color?: string;
  created_at?: string;
  updated_at?: string;
}
