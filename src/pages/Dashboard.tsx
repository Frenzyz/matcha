import React, { useState, useEffect } from 'react';
import { useThemeStore } from '../store/themeStore';
import { useAuth } from '../context/AuthContext';
import { useUserData } from '../context/UserDataProvider';
import { EventService } from '../services/events';
import { CalendarService } from '../services/calendar';
import { Event } from '../types';
import Calendar from '../components/Calendar';
import TodoList from '../components/TodoList/TodoList';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import { Switch } from '../components/ui/Switch';
import { format, isPast, isFuture, isToday } from 'date-fns';
import { Check, Clock, MapPin, CheckCircle } from 'lucide-react';

export default function Dashboard() {
  const { isDarkMode } = useThemeStore();
  const { user } = useAuth();
  const { userData } = useUserData();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdvancedMode, setIsAdvancedMode] = useState(false);
  const [categories, setCategories] = useState(['Upcoming', 'Completed']);
  const [eventCategories, setEventCategories] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user) {
      loadEvents();
      loadSavedSettings();
    }
  }, [user, userData?.google_calendar_token]);

  const loadSavedSettings = () => {
    const savedSettings = localStorage.getItem('todoSettings');
    if (savedSettings) {
      const settings = JSON.parse(savedSettings);
      setIsAdvancedMode(settings.isAdvancedMode || false);
      setCategories(settings.categories || ['Upcoming', 'Completed']);
      setEventCategories(settings.eventCategories || {});
    }
  };

  const saveSettings = () => {
    localStorage.setItem('todoSettings', JSON.stringify({
      isAdvancedMode,
      categories,
      eventCategories
    }));
  };

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

  const handleCompleteEvent = async (eventId: string) => {
    if (!user) return;

    try {
      const event = events.find(e => e.id === eventId);
      if (!event) return;

      const updatedEvent = {
        ...event,
        status: event.status === 'completed' ? 'pending' : 'completed'
      };

      await EventService.updateEvent(updatedEvent);
      setEvents(events.map(e => e.id === eventId ? updatedEvent : e));
    } catch (err) {
      console.error('Error updating event:', err);
    }
  };

  const addCategory = (name: string) => {
    setCategories([...categories, name]);
    saveSettings();
  };

  const editCategory = (index: number, newName: string) => {
    const newCategories = [...categories];
    newCategories[index] = newName;
    setCategories(newCategories);
    saveSettings();
  };

  const deleteCategory = (index: number) => {
    const newCategories = categories.filter((_, i) => i !== index);
    setCategories(newCategories);
    saveSettings();
  };

  const handleMoveEvent = async (eventId: string, targetCategory: string) => {
    const newEventCategories = { ...eventCategories };
    
    if (targetCategory === 'Completed') {
      await handleCompleteEvent(eventId);
    } else if (targetCategory === 'Upcoming') {
      delete newEventCategories[eventId];
    } else {
      newEventCategories[eventId] = targetCategory;
    }

    setEventCategories(newEventCategories);
    saveSettings();
  };

  const handleCreateEvent = async (event: Event) => {
    if (!user) return;

    try {
      await EventService.addEvent(event, user.id);
      const updatedEvents = await EventService.fetchEvents(user.id);
      setEvents(updatedEvents);
    } catch (err) {
      console.error('Error creating event:', err);
    }
  };

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
      <div className="grid grid-cols-1 lg:grid-cols-8 gap-6">
        {/* Today's Events */}
        <div className="lg:col-span-3">
          <div className={`rounded-xl shadow-sm p-6 ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white'}`}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Today's To-Do List</h2>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Advanced</span>
                <Switch
                  checked={isAdvancedMode}
                  onCheckedChange={(checked) => {
                    setIsAdvancedMode(checked);
                    saveSettings();
                  }}
                />
              </div>
            </div>

            <TodoList
              events={events}
              categories={categories}
              eventCategories={eventCategories}
              isDarkMode={isDarkMode}
              isAdvancedMode={isAdvancedMode}
              onAddCategory={() => addCategory(`Category ${categories.length + 1}`)}
              onEditCategory={editCategory}
              onDeleteCategory={deleteCategory}
              onCompleteEvent={handleCompleteEvent}
              onCreateEvent={handleCreateEvent}
              onMoveEvent={handleMoveEvent}
            />
          </div>
        </div>

        {/* Calendar */}
        <div className="lg:col-span-5">
          <Calendar 
            events={events} 
            onEventsChange={handleEventsChange}
            onClearEvents={handleClearEvents}
          />
        </div>
      </div>
    </div>
  );
}