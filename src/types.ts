export interface Event {
  id: string;
  user_id: string;
  google_event_id?: string;
  title: string;
  description?: string;
  location: string;
  start_time: string;
  end_time: string;
  type: 'career' | 'academic' | 'wellness';
  attendees: number;
  is_recurring?: boolean;
  recurrence_rule?: string;
  source?: 'manual' | 'google' | 'canvas';
}

export interface Assignment {
  id: string;
  course: string;
  title: string;
  due_date: string;
  progress: number;
}

export interface UserProfile {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  student_id?: string;
  canvas_calendar_url?: string;
  theme_color?: string;
  setup_completed?: boolean;
  created_at: string;
  last_seen?: string;
}