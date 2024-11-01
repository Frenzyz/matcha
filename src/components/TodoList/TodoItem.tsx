import React, { useState } from 'react';
import { Event } from '../../types';
import { format, formatDistanceToNow } from 'date-fns';
import { CheckCircle, Clock, MapPin, ChevronDown, Calendar } from 'lucide-react';

interface TodoItemProps {
  event: Event;
  index: number;
  isDarkMode: boolean;
  categories: string[];
  currentCategory: string;
  onComplete: () => void;
  onMoveToCategory: (category: string) => void;
}

export default function TodoItem({
  event,
  index,
  isDarkMode,
  categories,
  currentCategory,
  onComplete,
  onMoveToCategory
}: TodoItemProps) {
  const [showDropdown, setShowDropdown] = useState(false);

  const handleMoveToCategory = (category: string) => {
    onMoveToCategory(category);
    setShowDropdown(false);
  };

  const getCompletionStatus = () => {
    if (event.status === 'completed') {
      const completedDate = new Date(event.updated_at || '');
      const dueDate = new Date(event.end_time);
      const isLate = completedDate > dueDate;

      if (isLate) {
        return `Completed ${formatDistanceToNow(completedDate)} late`;
      } else {
        return `Completed ${formatDistanceToNow(completedDate)} early`;
      }
    }
    return null;
  };

  const completionStatus = getCompletionStatus();

  return (
    <div
      className={`p-3 rounded-lg border ${
        isDarkMode 
          ? event.status === 'completed'
            ? 'border-gray-700 bg-gray-800/50 opacity-60'
            : 'border-gray-700 hover:border-emerald-500'
          : event.status === 'completed'
            ? 'border-gray-100 bg-gray-50 opacity-60'
            : 'border-gray-100 hover:border-emerald-200'
      } transition-colors`}
    >
      <div className="flex justify-between items-start">
        <div>
          <h4 className={`font-medium text-sm ${
            event.status === 'completed' ? 'line-through' : ''
          }`}>
            {event.title}
          </h4>
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
            {event.end_time && (
              <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                <Calendar size={12} />
                <span>Due: {format(new Date(event.end_time), 'MMM d, h:mm a')}</span>
              </div>
            )}
            {completionStatus && (
              <div className="text-xs text-emerald-600 dark:text-emerald-400">
                {completionStatus}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            >
              <ChevronDown size={16} />
            </button>

            {showDropdown && (
              <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-10">
                <div className="py-1">
                  {categories
                    .filter(category => category !== currentCategory)
                    .map(category => (
                      <button
                        key={category}
                        onClick={() => handleMoveToCategory(category)}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        Move to {category}
                      </button>
                    ))
                  }
                </div>
              </div>
            )}
          </div>

          <button
            onClick={onComplete}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            title={event.status === 'completed' ? 'Mark as incomplete' : 'Mark as completed'}
          >
            <CheckCircle 
              size={20} 
              className={event.status === 'completed' ? 'text-emerald-500' : 'text-gray-400'} 
            />
          </button>
        </div>
      </div>
    </div>
  );
}