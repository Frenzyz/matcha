import React, { useState, useEffect } from 'react';
import { useThemeStore } from '../store/themeStore';
import { useAuth } from '../context/AuthContext';
import { useUserData } from '../context/UserDataProvider';
import { EventService } from '../services/events';
import { CalendarService } from '../services/calendar';
import { Event } from '../types';
import Calendar from '../components/Calendar';
import Recommendations from '../components/Recommendations';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import { format, isPast, isFuture, isToday } from 'date-fns';
import { Check, Clock, MapPin } from 'lucide-react';

export default function Dashboard() {
  const { isDarkMode } = useThemeStore();
  const { user } = useAuth();
  const { userData } = useUserData();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadEvents();
    }
  }, [user, userData?.google_calendar_token]);

  const loadEvents = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const localEvents = await EventService.fetchEvents(user.id);
      setEvents(localEvents);

      if (userData?.google_calendar_token && userData.google_calendar_ids?.length) {
        try {
          await CalendarService.syncGoogleEvents(
            user.id,
            userData.google_calendar_token,
            userData.google_calendar_ids
          );
          const updatedEvents = await EventService.fetchEvents(user.id);
          setEvents(updatedEvents);
        } catch (err) {
          console.error('Error syncing Google Calendar:', err);
        }
      }
    } catch (err) {
      setError('Failed to load events. Please try again.');
      console.error('Error loading events:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEventsChange = async (updatedEvents: Event[]) => {
    setEvents(updatedEvents);
  };

  const handleClearEvents = async () => {
    if (!user || !window.confirm('Are you sure you want to clear all events?')) return;

    try {
      await Promise.all(events.map(event => 
        EventService.deleteEvent(event.id, user.id)
      ));
      setEvents([]);
    } catch (err) {
      console.error('Error clearing events:', err);
    }
  };

  const todayEvents = events.reduce((acc: { upcoming: Event[]; completed: Event[] }, event) => {
    if (!isToday(new Date(event.start_time))) return acc;
    
    if (event.status === 'completed') {
      acc.completed.push(event);
    } else {
      acc.upcoming.push(event);
    }
    return acc;
  }, { upcoming: [], completed: [] });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <ErrorMessage 
          message={error}
          onRetry={loadEvents}
        />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Today's Events */}
        <div className="lg:col-span-3">
          <div className={`rounded-xl shadow-sm p-6 ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white'}`}>
            <h2 className="text-lg font-semibold mb-4">Today's To-Do List</h2>
            <div className="space-y-6">
              {/* Upcoming Events */}
              <div>
                <h3 className="text-sm font-medium text-emerald-600 dark:text-emerald-400 mb-3">
                  Upcoming
                </h3>
                <div className="space-y-3">
                  {todayEvents.upcoming.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      No upcoming events today
                    </p>
                  ) : (
                    todayEvents.upcoming.map(event => (
                      <div
                        key={event.id}
                        className={`p-3 rounded-lg border ${
                          isDarkMode 
                            ? 'border-gray-700 hover:border-emerald-500' 
                            : 'border-gray-100 hover:border-emerald-500'
                        } transition-colors`}
                      >
                        <div className="flex justify-between items-start">
                          <h4 className="font-medium text-sm">{event.title}</h4>
                        </div>
                        <div className="mt-2 space-y-1">
                          <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                            <Clock size={12} />
                            <span>{format(new Date(event.start_time), 'h:mm a')}</span>
                          </div>
                          {event.location && (
                            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                              <MapPin size={12} />
                              <span>{event.location}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Completed Events */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
                  Completed
                </h3>
                <div className="space-y-3">
                  {todayEvents.completed.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      No completed events today
                    </p>
                  ) : (
                    todayEvents.completed.map(event => (
                      <div
                        key={event.id}
                        className={`p-3 rounded-lg border ${
                          isDarkMode 
                            ? 'border-gray-700 bg-gray-800/50' 
                            : 'border-gray-100 bg-gray-50'
                        } opacity-60`}
                      >
                        <h4 className="font-medium text-sm line-through">{event.title}</h4>
                        <div className="mt-2 space-y-1">
                          <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                            <Clock size={12} />
                            <span>{format(new Date(event.start_time), 'h:mm a')}</span>
                          </div>
                          {event.location && (
                            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                              <MapPin size={12} />
                              <span>{event.location}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Calendar */}
        <div className="lg:col-span-6">
          <Calendar 
            events={events} 
            onEventsChange={handleEventsChange}
            onClearEvents={handleClearEvents}
          />
        </div>

        {/* Recommendations */}
        <div className="lg:col-span-3">
          <div className={`rounded-xl shadow-sm p-6 ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white'}`}>
            <Recommendations />
          </div>
        </div>
      </div>
    </div>
  );
}