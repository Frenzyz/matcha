import { Event } from '../types';
import { supabase } from '../config/supabase';

export class CalendarService {
  private static GOOGLE_CALENDAR_API = 'https://www.googleapis.com/calendar/v3';

  static async fetchEvents(userId: string, accessToken?: string): Promise<Event[]> {
    try {
      // Fetch events from Supabase
      const { data: localEvents, error: localError } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('user_id', userId)
        .gte('end_time', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // Last 30 days
        .lte('start_time', new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()) // Next 90 days
        .order('start_time', { ascending: true });

      if (localError) throw localError;

      // If we have a Google access token, sync Google Calendar events
      if (accessToken) {
        const googleEvents = await this.syncGoogleEvents(userId, accessToken);
        return this.mergeEvents(localEvents || [], googleEvents);
      }

      // If no events exist, return demo events
      if (!localEvents || localEvents.length === 0) {
        const demoEvents = this.getDemoEvents();
        await this.saveDemoEvents(userId, demoEvents);
        return demoEvents;
      }

      return localEvents;
    } catch (error) {
      console.error('Calendar fetch error:', error);
      return this.getDemoEvents();
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
      const events = data.items.map((item: any) => ({
        google_event_id: item.id,
        user_id: userId,
        title: item.summary,
        description: item.description,
        location: item.location || '',
        start_time: item.start.dateTime || item.start.date,
        end_time: item.end.dateTime || item.end.date,
        type: this.determineEventType(item.summary),
        attendees: item.attendees?.length || 0,
        is_recurring: !!item.recurrence,
        recurrence_rule: item.recurrence?.[0],
        source: 'google'
      }));

      // Sync with Supabase
      await this.upsertEvents(userId, events);

      return events;
    } catch (error) {
      console.error('Google Calendar sync error:', error);
      return [];
    }
  }

  private static async upsertEvents(userId: string, events: any[]): Promise<void> {
    try {
      const { error } = await supabase
        .from('calendar_events')
        .upsert(
          events.map(event => ({
            ...event,
            user_id: userId,
            updated_at: new Date().toISOString()
          })),
          { 
            onConflict: 'google_event_id',
            ignoreDuplicates: false 
          }
        );

      if (error) throw error;
    } catch (error) {
      console.error('Error upserting events:', error);
      throw error;
    }
  }

  private static async saveDemoEvents(userId: string, events: Event[]): Promise<void> {
    try {
      const { error } = await supabase
        .from('calendar_events')
        .insert(events.map(event => ({
          ...event,
          user_id: userId,
          source: 'manual'
        })));

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
    const allEvents = [...localEvents, ...googleEvents];
    
    // Remove duplicates based on google_event_id
    const uniqueEvents = allEvents.reduce((acc: Event[], current) => {
      const isDuplicate = acc.some(event => 
        event.google_event_id === current.google_event_id
      );
      if (!isDuplicate) {
        acc.push(current);
      }
      return acc;
    }, []);

    // Sort by start time
    return uniqueEvents.sort((a, b) => 
      new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    );
  }

  private static getDemoEvents(): Event[] {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date(now);
    nextWeek.setDate(nextWeek.getDate() + 7);

    return [
      {
        id: crypto.randomUUID(),
        title: 'Introduction to Computer Science',
        description: 'Weekly lecture covering programming fundamentals',
        location: 'Woodward Hall 140',
        start_time: now.toISOString(),
        end_time: new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString(),
        type: 'academic',
        attendees: 30,
        source: 'manual'
      },
      {
        id: crypto.randomUUID(),
        title: 'Study Group - Data Structures',
        description: 'Weekly study group session',
        location: 'Atkins Library Study Room 205',
        start_time: tomorrow.toISOString(),
        end_time: new Date(tomorrow.getTime() + 1.5 * 60 * 60 * 1000).toISOString(),
        type: 'academic',
        attendees: 5,
        source: 'manual'
      },
      {
        id: crypto.randomUUID(),
        title: 'Career Fair Prep Workshop',
        description: 'Prepare for the upcoming career fair',
        location: 'Student Union Room 340',
        start_time: nextWeek.toISOString(),
        end_time: new Date(nextWeek.getTime() + 1 * 60 * 60 * 1000).toISOString(),
        type: 'career',
        attendees: 50,
        source: 'manual'
      }
    ];
  }

  static generateICalFile(events: Event[]): Blob {
    const icalContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Matcha//UNCC Calendar//EN',
      ...events.flatMap(event => [
        'BEGIN:VEVENT',
        `UID:${event.id}`,
        `SUMMARY:${event.title}`,
        event.description ? `DESCRIPTION:${event.description}` : '',
        `DTSTART:${new Date(event.start_time).toISOString().replace(/[-:]/g, '')}`,
        `DTEND:${new Date(event.end_time).toISOString().replace(/[-:]/g, '')}`,
        event.location ? `LOCATION:${event.location}` : '',
        'END:VEVENT'
      ]),
      'END:VCALENDAR'
    ].join('\r\n');

    return new Blob([icalContent], { type: 'text/calendar;charset=utf-8' });
  }

  static downloadCalendar(events: Event[], filename: string = 'calendar.ics'): void {
    try {
      const blob = this.generateICalFile(events);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
      throw error instanceof Error ? error : new Error('Failed to download calendar');
    }
  }
}