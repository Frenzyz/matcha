export * from './chat';
export * from './assignment';
export * from './scholarship';
export * from './study-room';

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
