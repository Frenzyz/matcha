import { supabase } from '../config/supabase';
import { Event, Assignment } from '../types';

const API_BASE_URL = 'https://canvas.instructure.com/api/v1';

export async function fetchAssignments(token: string): Promise<Assignment[]> {
  const response = await fetch(`${API_BASE_URL}/courses/assignments`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json+canvas-string-ids'
    }
  });
  return response.json();
}

export async function fetchEvents(): Promise<Event[]> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .order('start_time', { ascending: true });

  if (error) throw error;
  return data || [];
}