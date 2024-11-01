import React, { useState } from 'react';
import { Event } from '../../types';
import { format, formatDistanceToNow, isValid } from 'date-fns';
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
    if (event.status === 'completed' && event.updated_at) {
      const completedDate = new Date(event.updated_at);
      const dueDate = new Date(event.end_time);

      // Validate dates before using them
      if (!isValid(completedDate) || !isValid(dueDate)) {
        return null;
      }

      const isLate = completedDate > dueDate;

      try {
        if (isLate) {
          return `Completed ${formatDistanceToNow(completedDate)} late`;
        } else {
          return `Completed ${formatDistanceToNow(completedDate)} early`;
        }
      } catch (error) {
        console.error('Error formatting date:', error);
        return null;
      }
    }
    return null;
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (!isValid(date)) {
        return 'Invalid date';
      }
      return format(date, 'h:mm a');
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid date';
    }
  };

  const formatDueDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (!isValid(date)) {
        return 'Invalid date';
      }
      return format(date, 'MMM d, h:mm a');
    } catch (error) {
      console.error('Error formatting due date:', error);
      return 'Invalid date';
    }
  };

  const truncateText = (text: string, maxLength: number) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
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
        <div className="flex-1 min-w-0">
          <h4 
            className={`font-medium text-sm truncate ${
              event.status === 'completed' ? 'line-through' : ''
            }`}
            title={event.title}
          >
            {truncateText(event.title, 40)}
          </h4>
          <div className="mt-2 space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
              <Clock size={12} className="flex-shrink-0" />
              <span className="truncate">
                {formatDate(event.start_time)}
              </span>
            </div>
            {event.location && (
              <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                <MapPin size={12} className="flex-shrink-0" />
                <span className="truncate" title={event.location}>
                  {truncateText(event.location, 30)}
                </span>
              </div>
            )}
            {event.end_time && (
              <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                <Calendar size={12} className="flex-shrink-0" />
                <span className="truncate">
                  Due: {formatDueDate(event.end_time)}
                </span>
              </div>
            )}
            {completionStatus && (
              <div className="text-xs text-emerald-600 dark:text-emerald-400 truncate" title={completionStatus}>
                {truncateText(completionStatus, 35)}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 ml-2 flex-shrink-0">
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
                        className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 truncate"
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