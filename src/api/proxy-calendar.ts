import { Request, Response } from 'express';
import { CalendarService } from '../services/calendar';

export default async function handler(req: Request, res: Response) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Matcha-Calendar/1.0',
        'Accept': 'text/calendar'
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch calendar');
    }

    const data = await response.text();

    // Parse and regenerate the calendar to ensure it's valid
    const calendar = new CalendarService('UNCC Canvas Calendar');
    const events = parseICalData(data);
    calendar.addEvents(events);

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="canvas-calendar.ics"');
    res.status(200).send(calendar.toString());
  } catch (error) {
    console.error('Calendar proxy error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch calendar',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

function parseICalData(data: string): Event[] {
  const events: Event[] = [];
  const lines = data.split('\n');
  let currentEvent: Partial<Event> = {};
  let inEvent = false;

  for (const line of lines) {
    if (line.startsWith('BEGIN:VEVENT')) {
      inEvent = true;
      currentEvent = {};
    } else if (line.startsWith('END:VEVENT')) {
      inEvent = false;
      if (currentEvent.title && currentEvent.start_time && currentEvent.end_time) {
        events.push(currentEvent as Event);
      }
    } else if (inEvent) {
      const [key, ...values] = line.split(':');
      const value = values.join(':').trim();

      switch (key) {
        case 'SUMMARY':
          currentEvent.title = value;
          break;
        case 'DTSTART':
          currentEvent.start_time = new Date(value).toISOString();
          break;
        case 'DTEND':
          currentEvent.end_time = new Date(value).toISOString();
          break;
        case 'LOCATION':
          currentEvent.location = value;
          break;
      }
    }
  }

  return events;
}