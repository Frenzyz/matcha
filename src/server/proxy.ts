import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

app.post('/api/proxy-calendar', async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    if (!url.startsWith('https://uncc.instructure.com/feeds/calendars/')) {
      return res.status(400).json({ error: 'Invalid calendar URL' });
    }

    const response = await fetch(url, {
      headers: {
        'Accept': 'text/calendar',
        'User-Agent': 'Matcha-Calendar/1.0'
      },
      timeout: 5000
    });

    if (!response.ok) {
      throw new Error(`Calendar fetch failed: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('text/calendar')) {
      throw new Error('Invalid calendar data received');
    }

    const data = await response.text();
    
    if (!data.includes('BEGIN:VCALENDAR')) {
      throw new Error('Invalid calendar format');
    }

    res.setHeader('Content-Type', 'text/calendar');
    res.send(data);
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to fetch calendar data'
    });
  }
});

app.listen(port, () => {
  console.log(`Calendar proxy server running on port ${port}`);
});