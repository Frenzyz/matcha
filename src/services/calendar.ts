import { supabase } from '../config/supabase';
import { Event } from '../types';
import { logger } from '../utils/logger';
import { formatDateTime } from '../utils/dateUtils';
import { eventBus, CALENDAR_EVENTS } from './eventBus';
import { addDays, startOfDay, endOfDay } from 'date-fns';

interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: {
    dateTime: string;
    timeZone?: string;
  };
  end: {
    dateTime: string;
    timeZone?: string;
  };
}

export class CalendarService {
  static async listCalendars(token: string): Promise<any[]> {
    try {
      const response = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch calendars');
      }

      const data = await response.json();
      return data.items || [];
    } catch (error) {
      logger.error('Error listing calendars:', error);
      throw error;
    }
  }

  static async saveCalendarPreferences(userId: string, preferences: {
    token: string;
    selectedCalendars: string[];
  }): Promise<void> {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          google_calendar_token: preferences.token,
          google_calendar_ids: preferences.selectedCalendars,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) throw error;

      // Sync events after saving preferences
      await this.syncEvents(userId, preferences.token, preferences.selectedCalendars);
    } catch (error) {
      logger.error('Error saving calendar preferences:', error);
      throw error;
    }
  }

  private static async syncEvents(userId: string, token: string, calendarIds: string[]): Promise<void> {
    try {
      const now = new Date();
      const timeMin = startOfDay(now).toISOString();
      const timeMax = endOfDay(addDays(now, 30)).toISOString();

      const events: Event[] = [];

      for (const calendarId of calendarIds) {
        const response = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?` +
          new URLSearchParams({
            timeMin,
            timeMax,
            singleEvents: 'true',
            orderBy: 'startTime'
          }),
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Accept': 'application/json'
            }
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch events for calendar ${calendarId}`);
        }

        const data = await response.json();
        const googleEvents: GoogleCalendarEvent[] = data.items || [];

        events.push(...googleEvents.map(event => ({
          id: crypto.randomUUID(),
          user_id: userId,
          title: event.summary,
          description: event.description || '',
          location: event.location || '',
          start_time: event.start.dateTime,
          end_time: event.end.dateTime,
          type: 'academic',
          status: 'pending',
          source: 'google',
          google_event_id: event.id
        })));
      }

      // Delete existing Google Calendar events
      const { error: deleteError } = await supabase
        .from('calendar_events')
        .delete()
        .eq('user_id', userId)
        .eq('source', 'google');

      if (deleteError) throw deleteError;

      // Insert new events
      if (events.length > 0) {
        const { error: insertError } = await supabase
          .from('calendar_events')
          .insert(events);

        if (insertError) throw insertError;
      }

      // Emit update event
      eventBus.emit(CALENDAR_EVENTS.UPDATED);
    } catch (error) {
      logger.error('Error syncing events:', error);
      throw error;
    }
  }

  static async addEvent(event: Event, userId: string): Promise<void> {
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

      eventBus.emit(CALENDAR_EVENTS.ADDED, event);
      eventBus.emit(CALENDAR_EVENTS.UPDATED);
    } catch (error) {
      logger.error('Error adding event:', error);
      throw error;
    }
  }

  static async updateEvent(event: Event): Promise<void> {
    try {
      const { error } = await supabase
        .from('calendar_events')
        .update({
          ...event,
          updated_at: new Date().toISOString()
        })
        .eq('id', event.id);

      if (error) throw error;

      eventBus.emit(CALENDAR_EVENTS.MODIFIED, event);
      eventBus.emit(CALENDAR_EVENTS.UPDATED);
    } catch (error) {
      logger.error('Error updating event:', error);
      throw error;
    }
  }

  static async deleteEvent(eventId: string, userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('calendar_events')
        .delete()
        .eq('id', eventId)
        .eq('user_id', userId);

      if (error) throw error;

      eventBus.emit(CALENDAR_EVENTS.DELETED, { id: eventId });
      eventBus.emit(CALENDAR_EVENTS.UPDATED);
    } catch (error) {
      logger.error('Error deleting event:', error);
      throw error;
    }
  }
}