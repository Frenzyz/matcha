import React, { useState } from 'react';
import { Event } from '../../types/index';
import { format } from 'date-fns';
import { CheckCircle, Clock, MapPin, ChevronDown } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  color: string;
}

interface TodoItemProps {
  event: Event;
  isDarkMode: boolean;
  categories: Category[];
  currentCategory: string;
  categoryColor: string;
  onComplete: () => void;
  onMoveToCategory: (category: string) => void;
}

export default function TodoItem({
  event,
  isDarkMode,
  categories,
  currentCategory,
  categoryColor,
  onComplete,
  onMoveToCategory
}: TodoItemProps) {
  const [showDropdown, setShowDropdown] = useState(false);

  const moveOptions = categories.filter(category => 
    category.name !== currentCategory
  );

  return (
    <div
      className={`p-3 rounded-lg border transition-colors ${
        isDarkMode 
          ? event.status === 'completed'
            ? 'border-gray-700 bg-gray-800/50 opacity-60'
            : 'border-gray-700 hover:border-opacity-50'
          : event.status === 'completed'
            ? 'border-gray-100 bg-gray-50 opacity-60'
            : 'border-gray-100 hover:border-opacity-50'
      }`}
      style={{
        borderColor: categoryColor,
        backgroundColor: isDarkMode 
          ? `${categoryColor}10`
          : `${categoryColor}05`
      }}
    >
      <div className="flex justify-between items-start">
        <div className="flex-1 min-w-0">
          <h4 
            className={`font-medium text-sm truncate ${
              event.status === 'completed' ? 'line-through' : ''
            }`}
            style={{ color: event.status === 'completed' ? undefined : categoryColor }}
          >
            {event.title}
          </h4>
          <div className="mt-2 space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
              <Clock size={12} className="flex-shrink-0" />
              <span>
                {format(new Date(event.start_time), 'h:mm a')}
              </span>
            </div>
            {event.location && (
              <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                <MapPin size={12} className="flex-shrink-0" />
                <span className="truncate">
                  {event.location}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 ml-2 flex-shrink-0">
          {moveOptions.length > 0 && (
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
                    {moveOptions.map((category) => (
                      <button
                        key={category.id}
                        onClick={() => {
                          onMoveToCategory(category.name);
                          setShowDropdown(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        Move to {category.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

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
