import React, { useState, useEffect } from 'react';
import { MapPin, Clock, Users } from 'lucide-react';
import { Event } from '../types';
import { useAuth } from '../context/AuthContext';
import { EventService } from '../services/events';
import LoadingSpinner from './LoadingSpinner';
import ErrorMessage from './ErrorMessage';

export default function Recommendations() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    const fetchEvents = async () => {
      if (!user) return;

      try {
        setLoading(true);
        setError(null);
        const cachedEvents = await EventService.fetchCachedEvents(user.id);
        
        if (cachedEvents.length > 0) {
          setEvents(cachedEvents);
          return;
        }

        const demoEvents: Event[] = [
          {
            id: crypto.randomUUID(),
            user_id: user.id,
            title: 'Career Fair',
            description: 'Spring Career Fair',
            location: 'Student Union',
            start_time: new Date(Date.now() + 86400000).toISOString(),
            end_time: new Date(Date.now() + 93600000).toISOString(),
            type: 'career',
            attendees: 150,
            source: 'demo'
          },
          {
            id: crypto.randomUUID(),
            user_id: user.id,
            title: 'Study Skills Workshop',
            description: 'Learn effective study techniques',
            location: 'Atkins Library',
            start_time: new Date(Date.now() + 172800000).toISOString(),
            end_time: new Date(Date.now() + 179800000).toISOString(),
            type: 'academic',
            attendees: 30,
            source: 'demo'
          },
          {
            id: crypto.randomUUID(),
            user_id: user.id,
            title: 'Wellness Wednesday',
            description: 'Wellness and fitness activities',
            location: 'UREC',
            start_time: new Date(Date.now() + 259200000).toISOString(),
            end_time: new Date(Date.now() + 266200000).toISOString(),
            type: 'wellness',
            attendees: 50,
            source: 'demo'
          }
        ];

        await EventService.cacheEvents(demoEvents, user.id);
        setEvents(demoEvents);
      } catch (err) {
        console.error('Error fetching events:', err);
        setError('Failed to load recommended events');
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [user]);

  const handleAddToCalendar = async (event: Event) => {
    if (!user) return;

    try {
      const manualEvent: Event = {
        ...event,
        source: 'manual'
      };
      await EventService.addToPersonalCalendar(manualEvent, user.id);
      setEvents(events.filter(e => e.id !== event.id));
    } catch (err) {
      console.error('Error adding event to calendar:', err);
      setError('Failed to add event to calendar');
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} />;
  if (events.length === 0) {
    return (
      <div className="text-center text-gray-500 dark:text-gray-400">
        No upcoming events found
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {events.map((event) => (
        <div key={event.id} className="p-4 rounded-lg border border-gray-100 dark:border-gray-700 hover:border-theme-primary dark:hover:border-theme-primary transition-colors">
          <h3 className="font-semibold mb-2">{event.title}</h3>
          
          <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
            <div className="flex items-center gap-2">
              <MapPin size={16} />
              <span>{event.location}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <Clock size={16} />
              <span>{new Date(event.start_time).toLocaleString()}</span>
            </div>
            
            {event.attendees > 0 && (
              <div className="flex items-center gap-2">
                <Users size={16} />
                <span>{event.attendees} attending</span>
              </div>
            )}
          </div>

          <button 
            onClick={() => handleAddToCalendar(event)}
            className="mt-3 w-full py-2 px-4 bg-theme-primary text-white rounded-lg hover:bg-theme-hover transition-colors"
          >
            Add to Calendar
          </button>
        </div>
      ))}
    </div>
  );
}