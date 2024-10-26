import { Event } from '../types';
import { supabase } from '../config/supabase';

export class CalendarService {
  private static GOOGLE_CALENDAR_API = 'https://www.googleapis.com/calendar/v3';

  static async fetchEvents(userId: string, accessToken?: string): Promise<Event[]> {
    try {
      const { data: localEvents, error: localError } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('user_id', userId)
        .gte('end_time', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .lte('start_time', new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString())
        .order('start_time', { ascending: true });

      if (localError) throw localError;

      if (accessToken) {
        const googleEvents = await this.syncGoogleEvents(userId, accessToken);
        return this.mergeEvents(localEvents || [], googleEvents);
      }

      if (!localEvents || localEvents.length === 0) {
        const demoEvents = this.getDemoEvents(userId);
        await this.saveDemoEvents(userId, demoEvents);
        return demoEvents;
      }

      return localEvents;
    } catch (error) {
      console.error('Calendar fetch error:', error);
      return this.getDemoEvents(userId);
    }
  }

  private static async syncGoogleEvents(userId: string, accessToken: string): Promise<Event[]> {
    try {
      const timeMin = new Date();
      timeMin.setMonth(timeMin.getMonth() - 1);
      
      const timeMax = new Date();
      timeMax.setMonth(timeMax.getMonth() + 3);

      const response = await fetch(
        `${this.GOOGLE_CALENDAR_API}/calendars/primary/events?` + 
        new URLSearchParams({
          timeMin: timeMin.toISOString(),
          timeMax: timeMax.toISOString(),
          singleEvents: 'true',
          orderBy: 'startTime'
        }), {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch Google Calendar events');
      }

      const data = await response.json();
      
      // Process each event individually to handle conflicts
      for (const item of data.items) {
        const event: Event = {
          id: crypto.randomUUID(),
          user_id: userId,
          google_event_id: item.id,
          title: item.summary,
          description: item.description || '',
          location: item.location || '',
          start_time: item.start.dateTime || item.start.date,
          end_time: item.end.dateTime || item.end.date,
          type: this.determineEventType(item.summary),
          attendees: item.attendees?.length || 0,
          is_recurring: !!item.recurrence,
          recurrence_rule: item.recurrence?.[0],
          source: 'google'
        };

        await this.upsertEvent(event);
      }

      // Fetch all synced events
      const { data: syncedEvents } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('user_id', userId)
        .eq('source', 'google');

      return syncedEvents || [];
    } catch (error) {
      console.error('Google Calendar sync error:', error);
      return [];
    }
  }

  private static async upsertEvent(event: Event): Promise<void> {
    try {
      const { error } = await supabase
        .from('calendar_events')
        .upsert(
          {
            ...event,
            updated_at: new Date().toISOString()
          },
          {
            onConflict: 'user_id,google_event_id'
          }
        );

      if (error) throw error;
    } catch (error) {
      console.error('Error upserting event:', error);
      throw error;
    }
  }

  private static async saveDemoEvents(userId: string, events: Event[]): Promise<void> {
    try {
      const { error } = await supabase
        .from('calendar_events')
        .insert(events);

      if (error) throw error;
    } catch (error) {
      console.error('Error saving demo events:', error);
    }
  }

  private static determineEventType(title: string): 'academic' | 'career' | 'wellness' {
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
    return 'wellness';
  }

  private static mergeEvents(localEvents: Event[], googleEvents: Event[]): Event[] {
    const allEvents = [...localEvents];
    
    googleEvents.forEach(googleEvent => {
      const exists = localEvents.some(localEvent => 
        localEvent.google_event_id === googleEvent.google_event_id
      );
      if (!exists) {
        allEvents.push(googleEvent);
      }
    });

    return allEvents.sort((a, b) => 
      new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    );
  }

  private static getDemoEvents(userId: string): Event[] {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date(now);
    nextWeek.setDate(nextWeek.getDate() + 7);

    return [
      {
        id: crypto.randomUUID(),
        user_id: userId,
        title: 'Introduction to Computer Science',
        description: 'Weekly lecture covering programming fundamentals',
        location: 'Woodward Hall 140',
        start_time: now.toISOString(),
        end_time: new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString(),
        type: 'academic',
        attendees: 30,
        source: 'manual' as const
      },
      {
        id: crypto.randomUUID(),
        user_id: userId,
        title: 'Study Group - Data Structures',
        description: 'Weekly study group session',
        location: 'Atkins Library Study Room 205',
        start_time: tomorrow.toISOString(),
        end_time: new Date(tomorrow.getTime() + 1.5 * 60 * 60 * 1000).toISOString(),
        type: 'academic',
        attendees: 5,
        source: 'manual' as const
      },
      {
        id: crypto.randomUUID(),
        user_id: userId,
        title: 'Career Fair Prep Workshop',
        description: 'Prepare for the upcoming career fair',
        location: 'Student Union Room 340',
        start_time: nextWeek.toISOString(),
        end_time: new Date(nextWeek.getTime() + 1 * 60 * 60 * 1000).toISOString(),
        type: 'career',
        attendees: 50,
        source: 'manual' as const
      }
    ];
  }
}