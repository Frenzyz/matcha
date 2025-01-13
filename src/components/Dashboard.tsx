import React, { useState } from 'react';
import { useThemeStore } from '../store/themeStore';
import { useAuth } from '../context/AuthContext';
import { useUserData } from '../context/UserDataProvider';
import Calendar from '../components/Calendar';
import TodoList from '../components/TodoList/TodoList';
import { Switch } from '../components/ui/Switch';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import { useTodoStore } from '../store/todoStore';
import { useEvents } from '../hooks/useEvents';

interface DashboardProps {
  defaultView?: 'calendar' | 'todo';
}

export default function Dashboard({ defaultView = 'todo' }: DashboardProps) {
  const { isDarkMode } = useThemeStore();
  const { user } = useAuth();
  const { userData } = useUserData();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdvancedMode, setIsAdvancedMode] = useState(false);
  const [activeView, setActiveView] = useState(defaultView);
  const { categories, addCategory, editCategory, deleteCategory, initializeCategories } = useTodoStore();
  const { events, fetchEvents, addEvent, updateEvent, deleteEvent } = useEvents();

  React.useEffect(() => {
    if (user) {
      loadInitialData();
    }
  }, [user]);

  const loadInitialData = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError(null);

      await initializeCategories(user.id);
      await fetchEvents();

      const savedSettings = localStorage.getItem('todoSettings');
      if (savedSettings) {
        try {
          const settings = JSON.parse(savedSettings);
          setIsAdvancedMode(settings.isAdvancedMode || false);
        } catch (error) {
          console.error('Error loading saved settings:', error);
        }
      }
    } catch (err) {
      setError('Failed to load data. Please try again later.');
      console.error('Error loading initial data:', err);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    try {
      localStorage.setItem('todoSettings', JSON.stringify({
        isAdvancedMode
      }));
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  }, [isAdvancedMode]);

  React.useEffect(() => {
    const handleCalendarUpdate = () => {
      fetchEvents();
    };

    window.addEventListener('calendar-update', handleCalendarUpdate);
    return () => window.removeEventListener('calendar-update', handleCalendarUpdate);
  }, [fetchEvents]);

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

      await updateEvent(updatedEvent);
    } catch (err) {
      console.error('Error updating event:', err);
    }
  };

  const handleCreateEvent = async (event: Event) => {
    if (!user) return;

    try {
      await addEvent(event);
    } catch (err) {
      console.error('Error creating event:', err);
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

      await updateEvent(updatedEvent);
    } catch (err) {
      console.error('Error moving event:', err);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} />;

  return (
    <div className="p-6">
      <div className={`space-y-6 ${isAdvancedMode ? 'block' : 'grid grid-cols-1 lg:grid-cols-12 gap-6'}`}>
        <div className={isAdvancedMode ? 'w-full' : 'lg:col-span-5 xl:col-span-4'}>
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
              onAddCategory={addCategory}
              onEditCategory={editCategory}
              onDeleteCategory={deleteCategory}
              onCompleteEvent={handleCompleteEvent}
              onCreateEvent={handleCreateEvent}
              onMoveEvent={handleMoveEvent}
            />
          </div>
        </div>

        <div className={isAdvancedMode ? 'w-full mt-6' : 'lg:col-span-7 xl:col-span-8'}>
          <Calendar />
        </div>
      </div>
    </div>
  );
}
