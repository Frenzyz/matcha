import { Event as BaseEvent } from './event';

export type EventType = 'academic' | 'career' | 'wellness' | 'social';

export interface Event extends BaseEvent {
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
  source: 'manual' | 'scraped' | 'google' | 'canvas' | 'demo' | 'calendar';
  created_at?: string;
  updated_at?: string;
  category_id?: string | null;
  color?: string;
}