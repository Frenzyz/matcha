import React, { useState } from 'react';
import { MapPin, Clock, Users, Trash2 } from 'lucide-react';
import { Event } from '../types';
import { useAuth } from '../context/AuthContext';
import { CalendarService } from '../services/calendar';
import LoadingSpinner from './LoadingSpinner';
import ErrorMessage from './ErrorMessage';

export default function Recommendations() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const handleAddToCalendar = async (event: Event) => {
    if (!user) return;

    try {
      await CalendarService.addEvent(event, user.id);
      setEvents(events.filter(e => e.id !== event.id));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add event to calendar';
      setError(errorMessage);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} />;
  if (events.length === 0) {
    return (
      <div className="text-center text-gray-500 dark:text-gray-400">
        No recommended events found
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Recommended Events</h3>
        {events.length > 0 && (
          <button
            onClick={() => setEvents([])}
            className="flex items-center gap-1 px-2 py-1 text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
          >
            <Trash2 size={16} />
            Clear All
          </button>
        )}
      </div>

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
    </div>
  );
}