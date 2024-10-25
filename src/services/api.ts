import { Event, Assignment } from '../types';

const API_BASE_URL = 'https://canvas.instructure.com/api/v1';

export async function fetchAssignments(token: string): Promise<Assignment[]> {
  const response = await fetch(`${API_BASE_URL}/courses/assignments`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json+canvas-string-ids'
    }
  });
  return response.json();
}

export async function fetchEvents(): Promise<Event[]> {
  // Implement fetching from multiple UNCC sources
  // This would need to be implemented on a backend service
  // to handle CORS and API authentication
  return [];
}