// Create api/proxy-calendar.js
export default async function handler(req, res) {
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
        'User-Agent': 'Matcha-Calendar/1.0'
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch calendar');
    }

    const data = await response.text();
    res.setHeader('Content-Type', 'text/calendar');
    res.status(200).send(data);
  } catch (error) {
    console.error('Calendar proxy error:', error);
    res.status(500).json({ error: 'Failed to fetch calendar' });
  }
}