import { Event } from '../types';
import { supabase } from '../config/supabase';
import { logger } from '../utils/logger';
import { retryOperation } from '../utils/retryOperation';

export class EventService {
  private static readonly MAX_RETRIES = 3;
  private static readonly RETRY_DELAY = 1000;
  private static readonly CACHE_KEY = 'cached_events';
  private static readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  static async fetchEvents(userId: string): Promise<Event[]> {
    if (!userId) {
      throw new Error('User ID is required');
    }

    try {
      // Check cache first
      const cached = this.getCachedEvents();
      if (cached && cached.timestamp > Date.now() - this.CACHE_DURATION) {
        return cached.events;
      }

      const { data, error } = await retryOperation(
        () => supabase
          .from('calendar_events')
          .select('*')
          .eq('user_id', userId)
          .order('start_time', { ascending: true }),
        {
          maxAttempts: this.MAX_RETRIES,
          delay: this.RETRY_DELAY,
          onRetry: (attempt) => {
            logger.warn(`Retrying events fetch (attempt ${attempt}/${this.MAX_RETRIES})`);
          }
        }
      );

      if (error) throw error;

      // Update cache
      if (data) {
        this.cacheEvents(data);
      }

      return data || [];
    } catch (error) {
      logger.error('Error fetching events:', error);
      // Return cached events as fallback
      const cached = this.getCachedEvents();
      return cached ? cached.events : [];
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
          .eq('user_id', event.user_id),
        {
          maxAttempts: this.MAX_RETRIES,
          delay: this.RETRY_DELAY
        }
      );

      if (error) throw error;

      // Invalidate cache
      localStorage.removeItem(this.CACHE_KEY);
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
          .eq('user_id', userId),
        {
          maxAttempts: this.MAX_RETRIES,
          delay: this.RETRY_DELAY
        }
      );

      if (error) {
        throw new Error(`Failed to delete event: ${error.message}`);
      }

      // Invalidate cache
      localStorage.removeItem(this.CACHE_KEY);
    } catch (error) {
      logger.error('Error deleting event:', error);
      throw error;
    }
  }

  static async addEvent(event: Event, userId: string): Promise<void> {
    if (!userId) {
      throw new Error('User ID is required');
    }

    try {
      const { error } = await retryOperation(
        () => supabase
          .from('calendar_events')
          .insert([{
            ...event,
            user_id: userId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }]),
        {
          maxAttempts: this.MAX_RETRIES,
          delay: this.RETRY_DELAY
        }
      );

      if (error) {
        throw new Error(`Failed to add event: ${error.message}`);
      }

      // Invalidate cache
      localStorage.removeItem(this.CACHE_KEY);
    } catch (error) {
      logger.error('Error adding event:', error);
      throw error;
    }
  }

  private static getCachedEvents(): { events: Event[]; timestamp: number } | null {
    try {
      const cached = localStorage.getItem(this.CACHE_KEY);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      logger.error('Error reading cached events:', error);
      return null;
    }
  }

  private static cacheEvents(events: Event[]): void {
    try {
      localStorage.setItem(
        this.CACHE_KEY,
        JSON.stringify({
          events,
          timestamp: Date.now()
        })
      );
    } catch (error) {
      logger.error('Error caching events:', error);
    }
  }
}