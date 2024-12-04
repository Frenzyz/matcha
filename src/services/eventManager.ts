import { Event } from '../types';
import { supabase } from '../config/supabase';
import { eventBus, CALENDAR_EVENTS } from './eventBus';
import { logger } from '../utils/logger';

class EventManager {
  private static instance: EventManager;
  private subscribers: Set<() => void> = new Set();
  private events: Event[] = [];

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
          type: event.type || 'academic',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }]);

      if (error) throw error;

      // Update local cache
      this.events = [...this.events, event];

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

  async deleteEvent(eventId: string, userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('calendar_events')
        .delete()
        .eq('id', eventId)
        .eq('user_id', userId);

      if (error) throw error;

      // Update local cache
      this.events = this.events.filter(e => e.id !== eventId);

      // Emit events in sequence
      eventBus.emit(CALENDAR_EVENTS.DELETED, { id: eventId });
      eventBus.emit(CALENDAR_EVENTS.UPDATED);

      // Notify all subscribers
      this.notifySubscribers();
    } catch (error) {
      logger.error('Error in EventManager.deleteEvent:', error);
      throw error;
    }
  }

  async deleteAllEvents(userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('calendar_events')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;

      // Update local cache
      this.events = [];

      // Emit events
      eventBus.emit(CALENDAR_EVENTS.UPDATED);

      // Notify all subscribers
      this.notifySubscribers();
    } catch (error) {
      logger.error('Error in EventManager.deleteAllEvents:', error);
      throw error;
    }
  }

  async updateEvent(event: Event): Promise<void> {
    try {
      const { error } = await supabase
        .from('calendar_events')
        .update({
          ...event,
          type: event.type || 'academic',
          updated_at: new Date().toISOString()
        })
        .eq('id', event.id)
        .eq('user_id', event.user_id);

      if (error) throw error;

      // Update local cache
      this.events = this.events.map(e => e.id === event.id ? event : e);

      // Emit events in sequence
      eventBus.emit(CALENDAR_EVENTS.MODIFIED, event);
      eventBus.emit(CALENDAR_EVENTS.UPDATED, event);

      // Notify all subscribers
      this.notifySubscribers();
    } catch (error) {
      logger.error('Error in EventManager.updateEvent:', error);
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

      // Update local cache
      this.events = data || [];
      return this.events;
    } catch (error) {
      logger.error('Error in EventManager.fetchEvents:', error);
      throw error;
    }
  }

  getEvents(): Event[] {
    return [...this.events];
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