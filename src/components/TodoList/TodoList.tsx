import React, { useState } from 'react';
import { Event } from '../../types';
import TodoCategory from './TodoCategory';
import { Plus, Calendar } from 'lucide-react';
import { addDays, isWithinInterval, startOfDay, endOfDay } from 'date-fns';

interface TodoListProps {
  events: Event[];
  categories: string[];
  eventCategories: Record<string, string>;
  isDarkMode: boolean;
  isAdvancedMode: boolean;
  onAddCategory: () => void;
  onEditCategory: (index: number, name: string) => void;
  onDeleteCategory: (index: number) => void;
  onCompleteEvent: (eventId: string) => void;
  onCreateEvent: (event: Event) => void;
  onMoveEvent: (eventId: string, targetCategory: string) => void;
}

export default function TodoList({
  events,
  categories,
  eventCategories,
  isDarkMode,
  isAdvancedMode,
  onAddCategory,
  onEditCategory,
  onDeleteCategory,
  onCompleteEvent,
  onCreateEvent,
  onMoveEvent
}: TodoListProps) {
  const [timeSpan, setTimeSpan] = useState(1); // Days
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

  const getEventsForCategory = (category: string) => {
    const filteredEvents = filterEventsByTimeSpan(events);

    if (category === 'Completed') {
      return filteredEvents.filter(event => event.status === 'completed');
    }
    if (category === 'Upcoming') {
      return filteredEvents.filter(event => 
        event.status !== 'completed' && 
        !eventCategories[event.id]
      );
    }
    return filteredEvents.filter(event => 
      eventCategories[event.id] === category &&
      event.status !== 'completed'
    );
  };

  const handleCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    onCreateEvent({
      ...newEvent,
      id: crypto.randomUUID(),
      status: 'pending',
      type: 'academic',
      source: 'manual'
    } as Event);
    setShowCreateForm(false);
    setNewEvent({
      title: '',
      description: '',
      location: '',
      start_time: new Date().toISOString().slice(0, 16),
      end_time: new Date().toISOString().slice(0, 16)
    });
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
          <form onSubmit={handleCreateEvent} className="space-y-4">
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
            key={category}
            category={category}
            events={getEventsForCategory(category)}
            isDarkMode={isDarkMode}
            isAdvancedMode={isAdvancedMode}
            categories={categories}
            index={index}
            onEditCategory={(name) => onEditCategory(index, name)}
            onDeleteCategory={() => onDeleteCategory(index)}
            onCompleteEvent={onCompleteEvent}
            onMoveEvent={onMoveEvent}
          />
        ))}
      </div>

      {isAdvancedMode && (
        <button
          onClick={onAddCategory}
          className="w-full flex items-center justify-center gap-2 p-2 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 hover:border-emerald-500 dark:hover:border-emerald-500 transition-colors"
        >
          <Plus size={16} />
          <span>Add Category</span>
        </button>
      )}
    </div>
  );
}