export * from './event';
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
