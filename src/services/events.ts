import { Event } from '../types';
import { supabase } from '../config/supabase';
import { logger } from '../utils/logger';
import { retryOperation } from '../utils/retryOperation';

const CACHE_KEY = 'cached_events';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export class EventService {
  static async fetchEvents(userId: string): Promise<Event[]> {
    if (!userId) {
      throw new Error('User ID is required');
    }

    try {
      // Try to get events from cache first
      const cachedEvents = this.getCachedEvents();
      if (cachedEvents.length > 0) {
        return cachedEvents;
      }

      const { data, error } = await retryOperation(
        () => supabase
          .from('calendar_events')
          .select('*')
          .eq('user_id', userId)
          .order('start_time', { ascending: true }),
        {
          maxAttempts: 3,
          delay: 1000,
          onRetry: (attempt) => {
            logger.warn(`Retrying event fetch (attempt ${attempt})`);
          }
        }
      );

      if (error) {
        logger.error('Error fetching events:', error);
        return this.getCachedEvents();
      }

      // Cache the events
      if (data) {
        localStorage.setItem(CACHE_KEY, JSON.stringify({
          data,
          timestamp: Date.now()
        }));
      }

      return data || [];
    } catch (error) {
      logger.error('Error in fetchEvents:', error);
      return this.getCachedEvents();
    }
  }

  private static getCachedEvents(): Event[] {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (!cached) return [];

      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp > CACHE_DURATION) {
        localStorage.removeItem(CACHE_KEY);
        return [];
      }

      return data;
    } catch (error) {
      logger.error('Error reading cached events:', error);
      return [];
    }
  }

  static async updateEvent(event: Event): Promise<void> {
    if (!event.id || !event.user_id) {
      throw new Error('Event ID and user ID are required');
    }

    try {
      const { error } = await retryOperation(
        () => supabase
          .from('calendar_events')
          .update({
            ...event,
            updated_at: new Date().toISOString()
          })
          .eq('id', event.id)
          .eq('user_id', event.user_id)
      );

      if (error) throw error;
      
      // Invalidate cache
      localStorage.removeItem(CACHE_KEY);
    } catch (error) {
      logger.error('Error updating event:', error);
      throw error;
    }
  }

  static async deleteEvent(eventId: string, userId: string): Promise<void> {
    if (!eventId || !userId) {
      throw new Error('Event ID and user ID are required');
    }

    try {
      const { error } = await retryOperation(
        () => supabase
          .from('calendar_events')
          .delete()
          .eq('id', eventId)
          .eq('user_id', userId)
      );

      if (error) throw error;
      
      // Invalidate cache
      localStorage.removeItem(CACHE_KEY);
    } catch (error) {
      logger.error('Error deleting event:', error);
      throw error;
    }
  }

  static async addEvent(event: Event, userId: string): Promise<void> {
    try {
      const { error } = await retryOperation(
        () => supabase
          .from('calendar_events')
          .insert([{
            ...event,
            user_id: userId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }])
      );

      if (error) throw error;
      
      // Invalidate cache
      localStorage.removeItem(CACHE_KEY);
    } catch (error) {
      logger.error('Error adding event:', error);
      throw error;
    }
  }
}