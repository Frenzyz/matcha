import { Event } from '../types';
import { supabase } from '../config/supabase';
import { logger } from '../utils/logger';
import { retryOperation } from '../utils/retryOperation';

export class CalendarService {
  private static readonly MAX_RETRIES = 3;
  private static readonly RETRY_DELAY = 1000;
  private static readonly GOOGLE_CALENDAR_API = 'https://www.googleapis.com/calendar/v3';

  static async listCalendars(accessToken: string) {
    try {
      const response = await fetch(
        `${this.GOOGLE_CALENDAR_API}/users/me/calendarList`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch calendars');
      }

      const data = await response.json();
      return data.items.map((calendar: any) => ({
        id: calendar.id,
        summary: calendar.summary,
        primary: calendar.primary || false
      }));
    } catch (error) {
      logger.error('Error fetching calendars:', error);
      throw error;
    }
  }

  static async saveCalendarPreferences(userId: string, preferences: {
    token: string;
    selectedCalendars: string[];
  }): Promise<void> {
    try {
      await retryOperation(
        async () => {
          const { error } = await supabase
            .from('user_preferences')
            .upsert({
              user_id: userId,
              google_calendar_token: preferences.token,
              google_calendar_ids: preferences.selectedCalendars,
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'user_id'
            });

          if (error) throw error;
        },
        {
          maxAttempts: this.MAX_RETRIES,
          delay: this.RETRY_DELAY,
          backoff: true,
          onRetry: (attempt, error) => {
            logger.warn(`Retrying calendar preferences save (attempt ${attempt}):`, error);
          }
        }
      );

      // After saving preferences, sync events
      await this.syncGoogleEvents(userId, preferences.token, preferences.selectedCalendars);
    } catch (error) {
      logger.error('Error saving calendar preferences:', error);
      throw error;
    }
  }

  static async addEvent(event: Event, userId: string): Promise<void> {
    try {
      const eventData = {
        ...event,
        user_id: userId,
        source: event.source || 'calendar',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      await retryOperation(
        async () => {
          const { error } = await supabase
            .from('calendar_events')
            .insert([eventData]);

          if (error) throw error;
        },
        {
          maxAttempts: this.MAX_RETRIES,
          delay: this.RETRY_DELAY,
          backoff: true,
          onRetry: (attempt, error) => {
            logger.warn(`Retrying event add (attempt ${attempt}):`, error);
          }
        }
      );
    } catch (error) {
      logger.error('Error adding event:', error);
      throw error;
    }
  }

  static async syncGoogleEvents(userId: string, accessToken: string, calendarIds: string[]) {
    try {
      const events = await Promise.all(
        calendarIds.map(calendarId =>
          this.fetchGoogleCalendarEvents(accessToken, calendarId)
        )
      );

      const flattenedEvents = events.flat().map(event => ({
        ...event,
        user_id: userId,
        source: 'google'
      }));

      if (flattenedEvents.length > 0) {
        await retryOperation(
          async () => {
            // First, delete existing Google Calendar events
            const { error: deleteError } = await supabase
              .from('calendar_events')
              .delete()
              .eq('user_id', userId)
              .eq('source', 'google');

            if (deleteError) throw deleteError;

            // Then insert new events
            const { error: insertError } = await supabase
              .from('calendar_events')
              .insert(flattenedEvents);

            if (insertError) throw insertError;
          },
          {
            maxAttempts: this.MAX_RETRIES,
            delay: this.RETRY_DELAY,
            backoff: true,
            onRetry: (attempt, error) => {
              logger.warn(`Retrying events sync (attempt ${attempt}):`, error);
            }
          }
        );
      }
    } catch (error) {
      logger.error('Error syncing Google events:', error);
      throw error;
    }
  }

  private static async fetchGoogleCalendarEvents(accessToken: string, calendarId: string): Promise<Event[]> {
    const timeMin = new Date();
    timeMin.setMonth(timeMin.getMonth() - 1);
    
    const timeMax = new Date();
    timeMax.setMonth(timeMax.getMonth() + 3);

    const response = await fetch(
      `${this.GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events?` +
      new URLSearchParams({
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        singleEvents: 'true',
        orderBy: 'startTime'
      }),
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Google Calendar API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    return data.items
      .filter((item: any) => item.status !== 'cancelled')
      .map((item: any) => ({
        id: crypto.randomUUID(),
        google_event_id: item.id,
        title: item.summary || 'Untitled Event',
        description: item.description || '',
        location: item.location || '',
        start_time: item.start.dateTime || item.start.date,
        end_time: item.end.dateTime || item.end.date,
        type: this.determineEventType(item.summary || ''),
        source: 'google'
      }));
  }

  private static determineEventType(title: string): Event['type'] {
    const lowercaseTitle = title.toLowerCase();
    if (lowercaseTitle.includes('class') || 
        lowercaseTitle.includes('lecture') || 
        lowercaseTitle.includes('study')) {
      return 'academic';
    }
    if (lowercaseTitle.includes('interview') || 
        lowercaseTitle.includes('career') || 
        lowercaseTitle.includes('job')) {
      return 'career';
    }
    if (lowercaseTitle.includes('gym') || 
        lowercaseTitle.includes('workout') || 
        lowercaseTitle.includes('health')) {
      return 'wellness';
    }
    return 'academic';
  }
}