import { Event } from '../../types/index';
import { JSDOM } from 'jsdom';

export async function fetchHireANinerEvents(): Promise<Event[]> {
  try {
    const response = await fetch('https://hireaniner.charlotte.edu/api/events', {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Matcha/1.0'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.map((event: any) => ({
      id: crypto.randomUUID(),
      title: event.title,
      location: event.location || 'Career Center',
      start_time: new Date(event.start_time).toISOString(),
      end_time: new Date(event.end_time).toISOString(),
      type: 'career',
      attendees: event.attendees || 0,
      source: 'scraped'
    }));
  } catch (error) {
    console.error('Error fetching Hire-A-Niner events:', error);
    return [];
  }
}
