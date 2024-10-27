export interface Event {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  location?: string;
  start_time: string;
  end_time: string;
  type: 'academic' | 'career' | 'wellness';
  attendees?: number;
  source: 'manual' | 'scraped' | 'google' | 'canvas' | 'demo';
  created_at?: string;
  updated_at?: string;
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
  major?: string;
  theme_color?: string;
  setup_completed?: boolean;
  created_at: string;
  last_seen?: string;
}