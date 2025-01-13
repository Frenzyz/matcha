import { Event } from '../types';
import { supabase } from '../config/supabase';

export class EventScraperService {
  private static CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

  static async fetchAllEvents(userId: string): Promise<Event[]> {
    try {
      // Check cache first
      const cachedEvents = await this.getCachedEvents(userId);
      if (cachedEvents.length > 0) {
        return cachedEvents;
      }

      // Fetch fresh events if cache is empty or expired
      const response = await fetch('/api/events', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const events = await response.json();
      const validEvents = this.validateAndFormatEvents(events);

      // Cache the events
      if (validEvents.length > 0) {
        await this.cacheEvents(userId, validEvents);
      }

      return validEvents;
    } catch (error) {
      console.error('Error in fetchAllEvents:', error);
      // Return cached events as fallback if available
      return this.getCachedEvents(userId);
    }
  }

  private static async getCachedEvents(userId: string): Promise<Event[]> {
    const cacheExpiry = new Date(Date.now() - this.CACHE_DURATION).toISOString();

    const { data, error } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('user_id', userId)
      .eq('source', 'scraped')
      .gte('created_at', cacheExpiry)
      .gte('start_time', new Date().toISOString())
      .order('start_time', { ascending: true });

    if (error) {
      console.error('Error fetching cached events:', error);
      return [];
    }

    return data || [];
  }

  private static async cacheEvents(userId: string, events: Event[]): Promise<void> {
    const formattedEvents = events.map(event => ({
      ...event,
      user_id: userId,
      source: 'scraped',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    const { error } = await supabase
      .from('calendar_events')
      .upsert(formattedEvents, {
        onConflict: 'user_id,title,start_time',
        ignoreDuplicates: true
      });

    if (error) {
      console.error('Error caching events:', error);
    }
  }

  private static validateAndFormatEvents(events: any[]): Event[] {
    return events
      .filter(event => 
        event?.title &&
        event?.start_time &&
        new Date(event.start_time).toString() !== 'Invalid Date'
      )
      .map(event => ({
        id: event.id || crypto.randomUUID(),
        title: event.title.trim(),
        location: event.location?.trim() || '',
        start_time: new Date(event.start_time).toISOString(),
        end_time: event.end_time 
          ? new Date(event.end_time).toISOString()
          : new Date(new Date(event.start_time).getTime() + 2 * 60 * 60 * 1000).toISOString(),
        type: this.determineEventType(event),
        attendees: typeof event.attendees === 'number' ? event.attendees : 0,
        source: 'scraped'
      }));
  }

  private static determineEventType(event: any): 'academic' | 'career' | 'wellness' {
    const source = (event.source || '').toLowerCase();
    const title = (event.title || '').toLowerCase();

    if (source.includes('career') || source.includes('hire-a-niner') || 
        title.includes('career') || title.includes('job') || title.includes('interview')) {
      return 'career';
    }
    if (source.includes('caps') || source.includes('urec') || 
        title.includes('wellness') || title.includes('health') || 
        title.includes('fitness') || title.includes('counseling')) {
      return 'wellness';
    }
    return 'academic';
  }
}
