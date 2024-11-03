export interface Event {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  location?: string;
  start_time: string;
  end_time: string;
  type: 'academic' | 'career' | 'wellness' | 'social' | 'research' | 'service' | 'cultural' | 'athletic' | 'administrative' | 'financial';
  status: 'pending' | 'completed';
  attendees?: number;
  is_recurring?: boolean;
  recurrence_rule?: string;
  source: 'manual' | 'scraped' | 'google' | 'canvas' | 'demo' | 'calendar';
  created_at?: string;
  updated_at?: string;
  category_id?: string | null;
  color?: string;
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
  color: string;
  created_at: string;
  updated_at: string;
}