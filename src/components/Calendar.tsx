import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

interface CanvasEvent {
  id: string;
  title: string;
  start_at: string;
  end_at: string;
  location_name?: string;
}

export default function EventCalendar() {
  const [events, setEvents] = useState<CanvasEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user } = useAuth();
  
  useEffect(() => {
    const fetchCanvasEvents = async () => {
      if (!user) return;

      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (!userDoc.exists()) return;

        const canvasToken = userDoc.data().canvasToken;
        if (!canvasToken) {
          setError('Please configure your Canvas API token in settings');
          setLoading(false);
          return;
        }

        const response = await fetch('https://uncc.instructure.com/api/v1/calendar_events', {
          headers: {
            'Authorization': `Bearer ${canvasToken}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch Canvas events');
        }

        const data = await response.json();
        setEvents(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load calendar events');
      } finally {
        setLoading(false);
      }
    };

    fetchCanvasEvents();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <CalendarIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">{error}</h3>
        <p className="mt-1 text-sm text-gray-500">
          Configure your Canvas integration in settings to view your calendar.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {events.map((event) => (
        <div key={event.id} className="p-4 bg-white rounded-lg shadow">
          <h3 className="font-medium text-gray-900">{event.title}</h3>
          <div className="mt-1 text-sm text-gray-500">
            <p>{new Date(event.start_at).toLocaleString()}</p>
            {event.location_name && <p>Location: {event.location_name}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}