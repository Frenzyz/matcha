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

  return (
    <div className="space-y-6">
      {isAdvancedMode && (
        <div className="flex items-center gap-4 mb-4">
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