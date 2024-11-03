import React, { useState, useEffect, useCallback } from 'react';
import { useThemeStore } from '../store/themeStore';
import { useAuth } from '../context/AuthContext';
import { useUserData } from '../context/UserDataProvider';
import { EventService } from '../services/events';
import { CategoryService } from '../services/categories';
import { Event } from '../types';
import Calendar from '../components/Calendar';
import TodoList from '../components/TodoList/TodoList';
import { Switch } from '../components/ui/Switch';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import { useTodoStore } from '../store/todoStore';

export default function Dashboard() {
  const { isDarkMode } = useThemeStore();
  const { user } = useAuth();
  const { userData } = useUserData();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdvancedMode, setIsAdvancedMode] = useState(false);
  const { categories, editCategory, addCategory, deleteCategory } = useTodoStore();
  const [eventCategories, setEventCategories] = useState<Record<string, string>>({});

  const loadEvents = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError(null);
      const data = await EventService.fetchEvents(user.id);
      setEvents(data);
    } catch (err) {
      setError('Failed to load events. Please try again later.');
      console.error('Error loading events:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const loadCategories = useCallback(async () => {
    if (!user) return;

    try {
      const data = await CategoryService.fetchCategories(user.id);
      const categoryMap: Record<string, string> = {};
      data.forEach(category => {
        if (category.id) {
          categoryMap[category.id] = category.name;
        }
      });
      setEventCategories(categoryMap);
    } catch (err) {
      console.error('Error loading categories:', err);
    }
  }, [user]);

  // Initial load
  useEffect(() => {
    if (user) {
      loadEvents();
      loadCategories();
    }
  }, [user, loadEvents, loadCategories]);

  // Load saved settings
  useEffect(() => {
    const savedSettings = localStorage.getItem('todoSettings');
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings);
        setIsAdvancedMode(settings.isAdvancedMode || false);
      } catch (error) {
        console.error('Error loading saved settings:', error);
      }
    }
  }, []);

  const saveSettings = useCallback(() => {
    try {
      localStorage.setItem('todoSettings', JSON.stringify({
        isAdvancedMode,
        eventCategories
      }));
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  }, [isAdvancedMode, eventCategories]);

  // Save settings when they change
  useEffect(() => {
    saveSettings();
  }, [isAdvancedMode, saveSettings]);

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
      setEvents(prevEvents => prevEvents.map(e => e.id === eventId ? updatedEvent : e));
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

  const handleUpdateEvent = async (updatedEvent: Event) => {
    if (!user) return;

    try {
      await EventService.updateEvent(updatedEvent);
      setEvents(prevEvents => 
        prevEvents.map(event => event.id === updatedEvent.id ? updatedEvent : event)
      );
    } catch (err) {
      console.error('Error updating event:', err);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!user) return;

    try {
      await EventService.deleteEvent(eventId, user.id);
      setEvents(prevEvents => prevEvents.filter(event => event.id !== eventId));
      
      const updatedCategories = { ...eventCategories };
      delete updatedCategories[eventId];
      setEventCategories(updatedCategories);
      saveSettings();
    } catch (err) {
      console.error('Error deleting event:', err);
    }
  };

  const handleMoveEvent = async (eventId: string, targetCategory: string) => {
    if (!user) return;

    try {
      const event = events.find(e => e.id === eventId);
      if (!event) return;

      const category = categories.find(c => c.name === targetCategory);
      if (!category) return;

      const updatedEvent = {
        ...event,
        category_id: category.id,
        color: category.color,
        updated_at: new Date().toISOString()
      };

      await EventService.updateEvent(updatedEvent);
      
      setEvents(prevEvents => prevEvents.map(e => 
        e.id === eventId ? updatedEvent : e
      ));

      const updatedCategories = {
        ...eventCategories,
        [eventId]: targetCategory
      };
      setEventCategories(updatedCategories);
      saveSettings();
    } catch (err) {
      console.error('Error moving event:', err);
    }
  };

  const handleAddCategory = async (name: string, color: string) => {
    if (!user) return;
    try {
      await addCategory(user.id, name, color);
      await loadCategories();
    } catch (err) {
      console.error('Error adding category:', err);
    }
  };

  const handleEditCategory = async (index: number, name: string, color: string) => {
    if (!user) return;
    try {
      await editCategory(user.id, index, name, color);
      await loadCategories();
    } catch (err) {
      console.error('Error editing category:', err);
    }
  };

  const handleDeleteCategory = async (index: number) => {
    if (!user) return;
    try {
      await deleteCategory(user.id, index);
      await loadCategories();
    } catch (err) {
      console.error('Error deleting category:', err);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} />;

  return (
    <div className="p-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 xl:col-span-4">
          <div className={`rounded-xl shadow-sm p-6 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Today's To-Do List</h2>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Advanced</span>
                <Switch
                  checked={isAdvancedMode}
                  onCheckedChange={(checked) => {
                    setIsAdvancedMode(checked);
                  }}
                />
              </div>
            </div>

            <TodoList
              events={events}
              categories={categories}
              isDarkMode={isDarkMode}
              isAdvancedMode={isAdvancedMode}
              onAddCategory={handleAddCategory}
              onEditCategory={handleEditCategory}
              onDeleteCategory={handleDeleteCategory}
              onCompleteEvent={handleCompleteEvent}
              onCreateEvent={handleCreateEvent}
              onMoveEvent={handleMoveEvent}
            />
          </div>
        </div>

        <div className="lg:col-span-7 xl:col-span-8">
          <Calendar 
            events={events.map(event => ({
              ...event,
              color: event.color || categories.find(c => c.name === eventCategories[event.id])?.color
            }))}
            onEventsChange={setEvents}
            onEventUpdate={handleUpdateEvent}
            onEventDelete={handleDeleteEvent}
          />
        </div>
      </div>
    </div>
  );
}