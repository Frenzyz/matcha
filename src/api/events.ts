import { Event } from '../types/index';
import { fetchUnccEvents } from './scrapers/unccEvents';
import { fetchHireANinerEvents } from './scrapers/hireANinerEvents';

export async function getEvents(): Promise<Event[]> {
  try {
    const [unccEvents, hireANinerEvents] = await Promise.allSettled([
      fetchUnccEvents(),
      fetchHireANinerEvents()
    ]);

    const allEvents: Event[] = [];

    [unccEvents, hireANinerEvents].forEach(result => {
      if (result.status === 'fulfilled' && result.value) {
        allEvents.push(...result.value);
      }
    });

    return allEvents.sort((a, b) => 
      new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    );
  } catch (error) {
    console.error('Error fetching events:', error);
    return [];
  }
}
