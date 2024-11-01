import React, { useState, useEffect } from 'react';
import { useThemeStore } from '../store/themeStore';
import { useAuth } from '../context/AuthContext';
import { useUserData } from '../context/UserDataProvider';
import { EventService } from '../services/events';
import { Event } from '../types';
import Calendar from '../components/Calendar';
import TodoList from '../components/TodoList/TodoList';
import { Switch } from '../components/ui/Switch';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';

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
  }, [user]);

  const loadEvents = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await EventService.fetchEvents(user!.id);
      setEvents(data);
    } catch (err) {
      setError('Failed to load events. Please try again later.');
      console.error('Error loading events:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadSavedSettings = () => {
    const savedSettings = localStorage.getItem('todoSettings');
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings);
        setIsAdvancedMode(settings.isAdvancedMode || false);
        if (settings.categories?.length >= 2) {
          setCategories(settings.categories);
        }
        setEventCategories(settings.eventCategories || {});
      } catch (error) {
        console.error('Error loading saved settings:', error);
        setCategories(['Upcoming', 'Completed']);
        setEventCategories({});
      }
    }
  };

  const saveSettings = () => {
    try {
      localStorage.setItem('todoSettings', JSON.stringify({
        isAdvancedMode,
        categories,
        eventCategories
      }));
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  const handleCompleteEvent = async (eventId: string) => {
    if (!user) return;

    try {
      const event = events.find(e => e.id === eventId);
      if (!event) return;

      const updatedEvent = {
        ...event,
        status: event.status === 'completed' ? 'pending' : 'completed',
        updated_at: new Date().toISOString()
      };

      await EventService.updateEvent(updatedEvent);
      setEvents(events.map(e => e.id === eventId ? updatedEvent : e));
    } catch (err) {
      console.error('Error updating event:', err);
    }
  };

  const handleCreateEvent = async (event: Event) => {
    if (!user) return;

    try {
      await EventService.addEvent(event, user.id);
      await loadEvents();
    } catch (err) {
      console.error('Error creating event:', err);
    }
  };

  const handleMoveEvent = (eventId: string, targetCategory: string) => {
    setEventCategories(prev => ({
      ...prev,
      [eventId]: targetCategory
    }));
    saveSettings();
  };

  const handleDeleteCategory = async (index: number) => {
    const categoryToDelete = categories[index];
    const eventsInCategory = Object.entries(eventCategories)
      .filter(([_, category]) => category === categoryToDelete)
      .length;

    if (eventsInCategory > 0) {
      const confirmDelete = window.confirm(
        `This category contains ${eventsInCategory} event${eventsInCategory === 1 ? '' : 's'}. ` +
        'Please move all events to other categories before deleting this one.'
      );
      if (!confirmDelete) return;
    }

    // Update event categories - move events back to Upcoming
    const updatedEventCategories = { ...eventCategories };
    Object.keys(updatedEventCategories).forEach(eventId => {
      if (updatedEventCategories[eventId] === categoryToDelete) {
        delete updatedEventCategories[eventId];
      }
    });
    
    // Remove the category
    const newCategories = categories.filter((_, i) => i !== index);
    
    // Update state
    setCategories(newCategories);
    setEventCategories(updatedEventCategories);
    
    // Save changes
    localStorage.setItem('todoSettings', JSON.stringify({
      isAdvancedMode,
      categories: newCategories,
      eventCategories: updatedEventCategories
    }));
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorMessage message={error} />;
  }

  return (
    <div className="p-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
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
              onAddCategory={() => {
                const newCategories = [...categories, `Category ${categories.length + 1}`];
                setCategories(newCategories);
                saveSettings();
              }}
              onEditCategory={(index, name) => {
                const newCategories = [...categories];
                newCategories[index] = name;
                setCategories(newCategories);
                saveSettings();
              }}
              onDeleteCategory={handleDeleteCategory}
              onCompleteEvent={handleCompleteEvent}
              onCreateEvent={handleCreateEvent}
              onMoveEvent={handleMoveEvent}
            />
          </div>
        </div>

        <div className="lg:col-span-6">
          <Calendar 
            events={events} 
            onEventsChange={setEvents}
          />
        </div>
      </div>
    </div>
  );
}