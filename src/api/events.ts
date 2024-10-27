import express from 'express';
import { Event } from '../types';
import { fetchUnccEvents } from './scrapers/unccEvents';
import { fetchHireANinerEvents } from './scrapers/hireANinerEvents';
import { fetchCapsEvents } from './scrapers/capsEvents';
import { fetchUrecEvents } from './scrapers/urecEvents';
import { fetchUcaeEvents } from './scrapers/ucaeEvents';
import { fetchFirstGenEvents } from './scrapers/firstGenEvents';
import { fetchCareerEvents } from './scrapers/careerEvents';

const router = express.Router();

router.get('/api/events', async (req, res) => {
  try {
    const [
      unccEvents,
      hireANinerEvents,
      capsEvents,
      urecEvents,
      ucaeEvents,
      firstGenEvents,
      careerEvents
    ] = await Promise.allSettled([
      fetchUnccEvents(),
      fetchHireANinerEvents(),
      fetchCapsEvents(),
      fetchUrecEvents(),
      fetchUcaeEvents(),
      fetchFirstGenEvents(),
      fetchCareerEvents()
    ]);

    const allEvents: Event[] = [];

    // Collect successful results
    [unccEvents, hireANinerEvents, capsEvents, urecEvents, ucaeEvents, firstGenEvents, careerEvents]
      .forEach(result => {
        if (result.status === 'fulfilled' && result.value) {
          allEvents.push(...result.value);
        }
      });

    // Sort events by date
    allEvents.sort((a, b) => 
      new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    );

    res.json(allEvents);
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

export default router;