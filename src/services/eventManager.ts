import { Event } from '../types';
import { supabase } from '../config/supabase';
import { eventBus, CALENDAR_EVENTS } from './eventBus';
import { logger } from '../utils/logger';

class EventManager {
  private static instance: EventManager;
  private subscribers: Set<() => void> = new Set();

  private constructor() {}

  static getInstance(): EventManager {
    if (!EventManager.instance) {
      EventManager.instance = new EventManager();
    }
    return EventManager.instance;
  }

  async addEvent(event: Event, userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('calendar_events')
        .insert([{
          ...event,
          user_id: userId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }]);

      if (error) throw error;

      // Emit events in sequence
      eventBus.emit(CALENDAR_EVENTS.ADDED, event);
      eventBus.emit(CALENDAR_EVENTS.UPDATED);
      
      // Notify all subscribers
      this.notifySubscribers();
    } catch (error) {
      logger.error('Error in EventManager.addEvent:', error);
      throw error;
    }
  }

  async fetchEvents(userId: string): Promise<Event[]> {
    try {
      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('user_id', userId)
        .order('start_time', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Error in EventManager.fetchEvents:', error);
      throw error;
    }
  }

  subscribe(callback: () => void): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  private notifySubscribers(): void {
    this.subscribers.forEach(callback => callback());
  }
}

export const eventManager = EventManager.getInstance();