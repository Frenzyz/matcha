import { Event } from '../../types/index';

export async function fetchUnccEvents(): Promise<Event[]> {
  try {
    const response = await fetch('/api/events', {
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
      location: event.location || 'UNCC Campus',
      start_time: new Date(event.start_date).toISOString(),
      end_time: new Date(event.end_date).toISOString(),
      type: 'academic',
      attendees: event.attendees || 0,
      source: 'scraped'
    }));
  } catch (error) {
    console.error('Error fetching UNCC events:', error);
    return [];
  }
}
