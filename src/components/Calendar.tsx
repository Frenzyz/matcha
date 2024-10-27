import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Download, List, Grid } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { CalendarService } from '../services/calendar';
import { Event } from '../types';
import CalendarEvent from './CalendarEvent';
import CalendarView from './CalendarView';
import ErrorMessage from './ErrorMessage';
import LoadingSpinner from './LoadingSpinner';
import GoogleCalendarButton from './GoogleCalendarButton';

export default function Calendar() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('calendar');
  const { user } = useAuth();

  useEffect(() => {
    let mounted = true;

    const fetchEvents = async () => {
      if (!user?.id) {
        setError('Please log in to view your calendar');
        setLoading(false);
        return;
      }

      try {
        setError(null);
        const fetchedEvents = await CalendarService.fetchEvents(user.id, googleToken);
        
        if (mounted) {
          setEvents(fetchedEvents);
        }
      } catch (err) {
        if (mounted) {
          const errorMessage = err instanceof Error ? err.message : 'Failed to load calendar events';
          setError(errorMessage);
          console.error('Calendar fetch error:', err);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchEvents();

    return () => {
      mounted = false;
    };
  }, [user, googleToken]);

  const handleGoogleSuccess = (token: string) => {
    setGoogleToken(token);
    setLoading(true);
  };

  const handleGoogleError = (error: Error) => {
    console.error('Google Calendar error:', error);
    setError('Failed to connect to Google Calendar');
  };

  const handleDownload = () => {
    if (events.length === 0) return;
    
    try {
      CalendarService.downloadCalendar(events);
    } catch (err) {
      console.error('Download error:', err);
      setError('Failed to download calendar');
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorMessage message={error} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Your Schedule</h2>
        <div className="flex items-center gap-4">
          <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded transition-colors ${
                viewMode === 'list'
                  ? 'bg-theme-primary text-white'
                  : 'hover:bg-theme-primary/10'
              }`}
            >
              <List size={20} />
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`p-2 rounded transition-colors ${
                viewMode === 'calendar'
                  ? 'bg-theme-primary text-white'
                  : 'hover:bg-theme-primary/10'
              }`}
            >
              <Grid size={20} />
            </button>
          </div>
          <GoogleCalendarButton
            onSuccess={handleGoogleSuccess}
            onError={handleGoogleError}
          />
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 text-sm text-theme-primary hover:text-theme-hover"
          >
            <Download size={16} />
            <span>Download Calendar</span>
          </button>
        </div>
      </div>

      {events.length === 0 ? (
        <div className="text-center py-12">
          <CalendarIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600" />
          <h3 className="mt-2 text-sm font-medium">No events found</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Your calendar is empty. Connect your Google Calendar to see your events.
          </p>
        </div>
      ) : viewMode === 'calendar' ? (
        <CalendarView events={events} />
      ) : (
        <div className="space-y-4">
          {events.map((event) => (
            <CalendarEvent key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}