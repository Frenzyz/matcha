import { Event } from '../types';
import { supabase } from '../config/supabase';
import { logger } from '../utils/logger';
import { retryOperation } from '../utils/retryOperation';

export class CalendarService {
  private static readonly MAX_RETRIES = 3;
  private static readonly RETRY_DELAY = 1000;
  private static readonly GOOGLE_CALENDAR_API = 'https://www.googleapis.com/calendar/v3';

  static async listCalendars(accessToken: string) {
    if (!accessToken?.trim()) {
      throw new Error('Valid access token is required');
    }

    try {
      const response = await fetch(
        `${this.GOOGLE_CALENDAR_API}/users/me/calendarList`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 401) {
          throw new Error('Calendar access token expired. Please reconnect your Google Calendar.');
        }
        throw new Error(errorData.error?.message || `Failed to fetch calendars (${response.status})`);
      }

      const data = await response.json();
      
      if (!data?.items?.length) {
        throw new Error('No calendars found in your Google Account');
      }

      return data.items
        .filter((calendar: any) => calendar?.id && calendar?.summary)
        .map((calendar: any) => ({
          id: calendar.id,
          summary: calendar.summary || 'Untitled Calendar',
          primary: calendar.primary || false,
          description: calendar.description,
          backgroundColor: calendar.backgroundColor
        }));
    } catch (error) {
      logger.error('Error fetching calendars:', { error, token: accessToken ? 'present' : 'missing' });
      throw error instanceof Error ? error : new Error('Failed to fetch calendars');
    }
  }

  static async saveCalendarPreferences(userId: string, preferences: {
    token: string;
    selectedCalendars: string[];
  }): Promise<void> {
    if (!userId?.trim()) {
      throw new Error('User ID is required');
    }
    if (!preferences?.token?.trim()) {
      throw new Error('Valid access token is required');
    }
    if (!preferences?.selectedCalendars?.length) {
      throw new Error('At least one calendar must be selected');
    }

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
          onRetry: (attempt) => {
            logger.warn(`Retrying calendar preferences save (attempt ${attempt})`);
          }
        }
      );

      await this.syncGoogleEvents(userId, preferences.token, preferences.selectedCalendars);
    } catch (error) {
      logger.error('Error saving calendar preferences:', { error, userId });
      throw error instanceof Error ? error : new Error('Failed to save calendar preferences');
    }
  }

  static async syncGoogleEvents(userId: string, accessToken: string, calendarIds: string[]) {
    if (!userId?.trim() || !accessToken?.trim() || !calendarIds?.length) {
      throw new Error('Missing required parameters for calendar sync');
    }

    try {
      const events = await Promise.allSettled(
        calendarIds.map(calendarId =>
          this.fetchGoogleCalendarEvents(accessToken, calendarId)
        )
      );

      const successfulEvents = events
        .filter((result): result is PromiseFulfilledResult<Event[]> => result.status === 'fulfilled')
        .map(result => result.value)
        .flat()
        .map(event => ({
          ...event,
          user_id: userId,
          source: 'google'
        }));

      if (successfulEvents.length > 0) {
        await retryOperation(
          async () => {
            const { error: deleteError } = await supabase
              .from('calendar_events')
              .delete()
              .eq('user_id', userId)
              .eq('source', 'google');

            if (deleteError) throw deleteError;

            const { error: insertError } = await supabase
              .from('calendar_events')
              .insert(successfulEvents);

            if (insertError) throw insertError;
          },
          {
            maxAttempts: this.MAX_RETRIES,
            delay: this.RETRY_DELAY,
            backoff: true,
            onRetry: (attempt) => {
              logger.warn(`Retrying event sync (attempt ${attempt})`);
            }
          }
        );
      }
    } catch (error) {
      logger.error('Error syncing Google events:', { error, userId });
      throw error instanceof Error ? error : new Error('Failed to sync calendar events');
    }
  }

  private static async fetchGoogleCalendarEvents(accessToken: string, calendarId: string): Promise<Event[]> {
    const timeMin = new Date();
    timeMin.setMonth(timeMin.getMonth() - 1);
    
    const timeMax = new Date();
    timeMax.setMonth(timeMax.getMonth() + 3);

    try {
      const response = await fetch(
        `${this.GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events?` +
        new URLSearchParams({
          timeMin: timeMin.toISOString(),
          timeMax: timeMax.toISOString(),
          singleEvents: 'true',
          orderBy: 'startTime',
          maxResults: '2500'
        }),
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 401) {
          throw new Error('Calendar access token expired');
        }
        throw new Error(errorData.error?.message || `Failed to fetch events for calendar ${calendarId}`);
      }

      const data = await response.json();
      
      if (!data?.items?.length) {
        return [];
      }

      return data.items
        .filter((item: any) => 
          item?.status !== 'cancelled' && 
          item?.summary &&
          (item?.start?.dateTime || item?.start?.date) &&
          (item?.end?.dateTime || item?.end?.date)
        )
        .map((item: any) => ({
          id: crypto.randomUUID(),
          google_event_id: item.id,
          title: item.summary,
          description: item.description || '',
          location: item.location || '',
          start_time: item.start.dateTime || item.start.date,
          end_time: item.end.dateTime || item.end.date,
          type: this.determineEventType(item.summary),
          source: 'google',
          status: 'pending'
        }));
    } catch (error) {
      logger.error(`Error fetching events for calendar ${calendarId}:`, error);
      throw error instanceof Error ? error : new Error(`Failed to fetch events for calendar ${calendarId}`);
    }
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