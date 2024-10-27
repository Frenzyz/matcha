import express from 'express';
import fetch from 'node-fetch';
import { parse } from 'node-html-parser';

const router = express.Router();

const SOURCES = {
  CAMPUS_EVENTS: 'https://campusevents.charlotte.edu',
  HIRE_A_NINER: 'https://hireaniner.charlotte.edu/events',
  CAPS: 'https://caps.charlotte.edu/student-resources',
  UREC: 'https://urec.charlotte.edu',
  UCAE: 'https://ucae.charlotte.edu/academic-support-services/learning-strategies/academic-skill-workshops',
  FIRST_GEN: 'https://iamfirst.charlotte.edu/programs-events',
  CAREER: 'https://career.charlotte.edu/meetups'
};

async function fetchWithTimeout(url, options = {}) {
  const { timeout = 5000 } = options;
  
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; UNCCBot/1.0)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        ...options.headers
      }
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

async function scrapeEvents(url, source) {
  try {
    const response = await fetchWithTimeout(url);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    
    const html = await response.text();
    const root = parse(html);
    const events = [];

    // Different selectors for different sources
    const selectors = {
      'campus_events': '.event-item',
      'hire_a_niner': '.career-event',
      'caps': '.workshop-item',
      'urec': '.fitness-class',
      'ucae': '.workshop-item',
      'first_gen': '.event-item',
      'career': '.career-event'
    };

    const selector = selectors[source] || '.event-item';
    
    root.querySelectorAll(selector).forEach(event => {
      const title = event.querySelector('[class*="title"]')?.text?.trim();
      const dateStr = event.querySelector('[class*="date"]')?.text?.trim();
      const location = event.querySelector('[class*="location"]')?.text?.trim();
      const description = event.querySelector('[class*="description"]')?.text?.trim();
      const url = event.querySelector('a')?.getAttribute('href');

      if (title && dateStr) {
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
          events.push({
            title,
            description,
            location,
            start_time: date.toISOString(),
            end_time: new Date(date.getTime() + 2 * 60 * 60 * 1000).toISOString(),
            url: url ? new URL(url, SOURCES[source]).toString() : null,
            source
          });
        }
      }
    });

    return events;
  } catch (error) {
    console.error(`Error fetching ${source} events:`, error);
    return [];
  }
}

router.get('/', async (req, res) => {
  try {
    const eventPromises = Object.entries(SOURCES).map(([key, url]) => 
      scrapeEvents(url, key.toLowerCase())
    );

    const results = await Promise.allSettled(eventPromises);
    
    const events = results
      .filter((result): result is PromiseFulfilledResult<any[]> => 
        result.status === 'fulfilled'
      )
      .map(result => result.value)
      .flat();

    res.json(events);
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

export default router;