import React, { useState, useEffect } from 'react';
import { Event } from '../../types';
import TodoCategory from './TodoCategory';
import { Plus, Calendar } from 'lucide-react';
import { addDays, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { useAuth } from '../../context/AuthContext';
import { useTodoEvents } from '../../hooks/useTodoEvents';
import { eventManager } from '../../services/eventManager';

interface TodoListProps {
  categories: Array<{ id: string; name: string; color: string }>;
  isDarkMode: boolean;
  isAdvancedMode: boolean;
  onAddCategory: (name: string, color: string) => void;
  onEditCategory: (index: number, name: string, color: string) => void;
  onDeleteCategory: (index: number) => void;
}

export default function TodoList({
  categories,
  isDarkMode,
  isAdvancedMode,
  onAddCategory,
  onEditCategory,
  onDeleteCategory
}: TodoListProps) {
  const { user } = useAuth();
  const { events, loading, error, updateEvents } = useTodoEvents();
  const [timeSpan, setTimeSpan] = useState(1);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    location: '',
    start_time: new Date().toISOString().slice(0, 16),
    end_time: new Date().toISOString().slice(0, 16)
  });

  const filterEventsByTimeSpan = (events: Event[]) => {
    const now = new Date();
    const interval = {
      start: startOfDay(now),
      end: endOfDay(addDays(now, isAdvancedMode ? timeSpan : 0))
    };

    return events.filter(event => 
      isWithinInterval(new Date(event.start_time), interval)
    );
  };

  const getEventsForCategory = (categoryId: string) => {
    const filteredEvents = filterEventsByTimeSpan(events);

    if (categoryId === 'completed') {
      return filteredEvents.filter(event => event.status === 'completed');
    }
    if (categoryId === 'upcoming') {
      return filteredEvents.filter(event => 
        event.status !== 'completed' && 
        !event.category_id
      );
    }
    return filteredEvents.filter(event => 
      event.category_id === categoryId &&
      event.status !== 'completed'
    );
  };

  const handleCreateEvent = async () => {
    if (!newEvent.title.trim() || !user) return;

    try {
      const event: Event = {
        id: crypto.randomUUID(),
        user_id: user.id,
        title: newEvent.title,
        description: newEvent.description,
        location: newEvent.location,
        start_time: newEvent.start_time,
        end_time: newEvent.end_time,
        type: 'academic',
        status: 'pending',
        source: 'manual'
      };

      await eventManager.addEvent(event, user.id);
      setShowCreateForm(false);
      setNewEvent({
        title: '',
        description: '',
        location: '',
        start_time: new Date().toISOString().slice(0, 16),
        end_time: new Date().toISOString().slice(0, 16)
      });
    } catch (err) {
      console.error('Error creating event:', err);
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

      await eventManager.updateEvent(updatedEvent);
    } catch (err) {
      console.error('Error updating event:', err);
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

      await eventManager.updateEvent(updatedEvent);
    } catch (err) {
      console.error('Error moving event:', err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        {isAdvancedMode && (
          <div className="flex items-center gap-4">
            <Calendar size={20} />
            <select
              value={timeSpan}
              onChange={(e) => setTimeSpan(Number(e.target.value))}
              className="px-3 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
            >
              <option value={1}>Next 24 hours</option>
              <option value={7}>Next 7 days</option>
              <option value={30}>Next 30 days</option>
              <option value={90}>Next 3 months</option>
            </select>
          </div>
        )}
        <button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center gap-2 px-3 py-1 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
        >
          <Plus size={16} />
          <span>Create Event</span>
        </button>
      </div>

      {showCreateForm && (
        <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <form onSubmit={(e) => { e.preventDefault(); handleCreateEvent(); }} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Title</label>
              <input
                type="text"
                required
                value={newEvent.title}
                onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Location</label>
              <input
                type="text"
                value={newEvent.location}
                onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Start Time</label>
                <input
                  type="datetime-local"
                  required
                  value={newEvent.start_time}
                  onChange={(e) => setNewEvent({ ...newEvent, start_time: e.target.value })}
                  className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">End Time</label>
                <input
                  type="datetime-local"
                  required
                  value={newEvent.end_time}
                  onChange={(e) => setNewEvent({ ...newEvent, end_time: e.target.value })}
                  className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-3 py-1 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3 py-1 rounded bg-emerald-600 text-white hover:bg-emerald-700"
              >
                Create
              </button>
            </div>
          </form>
        </div>
      )}

      <div className={isAdvancedMode ? 'grid grid-cols-2 gap-4' : 'space-y-4'}>
        {categories.map((category, index) => (
          <TodoCategory
            key={category.id}
            category={category}
            events={getEventsForCategory(category.id)}
            isDarkMode={isDarkMode}
            isAdvancedMode={isAdvancedMode}
            categories={categories}
            index={index}
            onEditCategory={onEditCategory}
            onDeleteCategory={() => onDeleteCategory(index)}
            onCompleteEvent={handleCompleteEvent}
            onMoveEvent={handleMoveEvent}
          />
        ))}
      </div>

      {isAdvancedMode && (
        <button
          onClick={() => onAddCategory(`Category ${categories.length + 1}`, '#10B981')}
          className="w-full flex items-center justify-center gap-2 p-2 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 hover:border-emerald-500 dark:hover:border-emerald-500 transition-colors"
        >
          <Plus size={16} />
          <span>Add Category</span>
        </button>
      )}
    </div>
  );
}