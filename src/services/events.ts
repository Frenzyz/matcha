import { Event } from '../types';
import { supabase } from '../config/supabase';
import { logger } from '../utils/logger';

export class EventService {
  static async fetchEvents(userId: string): Promise<Event[]> {
    if (!userId) {
      throw new Error('User ID is required');
    }

    try {
      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('user_id', userId)
        .order('start_time', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Error fetching events:', error);
      throw error;
    }
  }

  static async updateEventStatus(eventId: string, userId: string, status: 'pending' | 'completed'): Promise<void> {
    if (!eventId || !userId) {
      throw new Error('Event ID and user ID are required');
    }

    try {
      const { error } = await supabase
        .from('calendar_events')
        .update({
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', eventId)
        .eq('user_id', userId);

      if (error) throw error;
    } catch (error) {
      logger.error('Error updating event status:', error);
      throw error;
    }
  }

  static async addEvent(event: Event): Promise<void> {
    try {
      const { error } = await supabase
        .from('calendar_events')
        .insert([{
          ...event,
          status: 'pending',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }]);

      if (error) throw error;
    } catch (error) {
      logger.error('Error adding event:', error);
      throw error;
    }
  }

  static async updateEvent(event: Event): Promise<void> {
    if (!event.id || !event.user_id) {
      throw new Error('Event ID and user ID are required');
    }

    try {
      const { error } = await supabase
        .from('calendar_events')
        .update({
          ...event,
          updated_at: new Date().toISOString()
        })
        .eq('id', event.id)
        .eq('user_id', event.user_id);

      if (error) throw error;
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
      const { error } = await supabase
        .from('calendar_events')
        .delete()
        .eq('id', eventId)
        .eq('user_id', userId);

      if (error) throw error;
    } catch (error) {
      logger.error('Error deleting event:', error);
      throw error;
    }
  }
}