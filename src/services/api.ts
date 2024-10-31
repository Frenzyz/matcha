import { supabase } from '../config/supabase';
import { Event } from '../types';

export async function fetchEvents(): Promise<Event[]> {
  try {
    const response = await fetch('/api/events', {
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const events = await response.json();
    return events;
  } catch (error) {
    console.error('Error fetching events:', error);
    
    // Fallback to database events if API fails
    const { data, error: dbError } = await supabase
      .from('calendar_events')
      .select('*')
      .order('start_time', { ascending: true });

    if (dbError) throw dbError;
    return data || [];
  }
}

export async function saveEvent(event: Event): Promise<void> {
  const { error } = await supabase
    .from('calendar_events')
    .insert([{
      ...event,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }]);

  if (error) throw error;
}

export async function updateEvent(event: Event): Promise<void> {
  const { error } = await supabase
    .from('calendar_events')
    .update({
      ...event,
      updated_at: new Date().toISOString()
    })
    .eq('id', event.id);

  if (error) throw error;
}

export async function deleteEvent(eventId: string): Promise<void> {
  const { error } = await supabase
    .from('calendar_events')
    .delete()
    .eq('id', eventId);

  if (error) throw error;
}