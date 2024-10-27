import { Event } from '../types';
import { supabase } from '../config/supabase';

const VALID_SOURCES = ['manual', 'scraped', 'google', 'canvas', 'demo'] as const;
type ValidSource = typeof VALID_SOURCES[number];

export class EventService {
  static async fetchCachedEvents(userId: string): Promise<Event[]> {
    try {
      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('user_id', userId)
        .in('source', VALID_SOURCES)
        .gte('start_time', new Date().toISOString())
        .order('start_time', { ascending: true })
        .limit(3);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching cached events:', error);
      return [];
    }
  }

  static async cacheEvents(events: Event[], userId: string): Promise<void> {
    try {
      const validEvents = events.map(event => ({
        ...event,
        id: event.id || crypto.randomUUID(),
        user_id: userId,
        source: this.validateSource(event.source),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));

      const { error } = await supabase
        .from('calendar_events')
        .upsert(validEvents);

      if (error) throw error;
    } catch (error) {
      console.error('Error caching events:', error);
    }
  }

  static async addToPersonalCalendar(event: Event, userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('calendar_events')
        .insert({
          ...event,
          id: crypto.randomUUID(),
          user_id: userId,
          source: 'manual' as ValidSource,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error adding event to calendar:', error);
    }
  }

  static async fetchPersonalEvents(userId: string): Promise<Event[]> {
    try {
      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('user_id', userId)
        .in('source', VALID_SOURCES)
        .order('start_time', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching personal events:', error);
      return [];
    }
  }

  private static validateSource(source: string): ValidSource {
    return VALID_SOURCES.includes(source as ValidSource) 
      ? source as ValidSource 
      : 'demo';
  }

  static async deleteEvent(eventId: string, userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('calendar_events')
        .delete()
        .eq('id', eventId)
        .eq('user_id', userId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting event:', error);
    }
  }
}