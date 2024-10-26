export interface Event {
  id: string;
  title: string;
  location: string;
  start_time: string;
  end_time: string;
  type: 'career' | 'academic' | 'wellness';
  attendees: number;
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