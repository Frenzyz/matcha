import { Event } from '../types';
import { supabase } from '../config/supabase';

export class CalendarService {
  private static GOOGLE_CALENDAR_API = 'https://www.googleapis.com/calendar/v3';

  static async fetchEvents(userId: string, accessToken?: string): Promise<Event[]> {
    try {
      // First try to fetch from Supabase
      const { data: events, error } = await supabase
        .from('events')
        .select('*')
        .order('start_time', { ascending: true });

      if (error) throw error;

      // If we have a Google access token, fetch and merge Google Calendar events
      if (accessToken) {
        const googleEvents = await this.fetchGoogleEvents(accessToken);
        return this.mergeEvents(events || [], googleEvents);
      }

      // If no events exist, return demo events
      if (!events || events.length === 0) {
        return this.getDemoEvents();
      }

      return events;
    } catch (error) {
      console.error('Calendar fetch error:', error);
      // Fallback to demo events on error
      return this.getDemoEvents();
    }
  }

  private static async fetchGoogleEvents(accessToken: string): Promise<Event[]> {
    try {
      const timeMin = new Date();
      timeMin.setMonth(timeMin.getMonth() - 1); // Get events from 1 month ago
      
      const timeMax = new Date();
      timeMax.setMonth(timeMax.getMonth() + 3); // Get events up to 3 months ahead

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
      
      return data.items.map((item: any) => ({
        id: item.id,
        title: item.summary,
        location: item.location || '',
        start_time: item.start.dateTime || item.start.date,
        end_time: item.end.dateTime || item.end.date,
        type: this.determineEventType(item.summary),
        attendees: item.attendees?.length || 0
      }));
    } catch (error) {
      console.error('Google Calendar fetch error:', error);
      return [];
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
    
    // Remove duplicates based on title and start time
    const uniqueEvents = allEvents.reduce((acc: Event[], current) => {
      const isDuplicate = acc.some(event => 
        event.title === current.title && 
        event.start_time === current.start_time
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
        id: '1',
        title: 'Introduction to Computer Science',
        location: 'Woodward Hall 140',
        start_time: now.toISOString(),
        end_time: new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString(),
        type: 'academic',
        attendees: 30
      },
      {
        id: '2',
        title: 'Study Group - Data Structures',
        location: 'Atkins Library Study Room 205',
        start_time: tomorrow.toISOString(),
        end_time: new Date(tomorrow.getTime() + 1.5 * 60 * 60 * 1000).toISOString(),
        type: 'academic',
        attendees: 5
      },
      {
        id: '3',
        title: 'Career Fair Prep Workshop',
        location: 'Student Union Room 340',
        start_time: nextWeek.toISOString(),
        end_time: new Date(nextWeek.getTime() + 1 * 60 * 60 * 1000).toISOString(),
        type: 'career',
        attendees: 50
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