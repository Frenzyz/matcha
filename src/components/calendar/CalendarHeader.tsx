import React from 'react';
import { Calendar as CalendarIcon, List, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';

interface CalendarHeaderProps {
  currentDate: Date;
  viewMode: 'calendar' | 'list';
  isDarkMode: boolean;
  onViewModeChange: (mode: 'calendar' | 'list') => void;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
}

export default function CalendarHeader({
  currentDate,
  viewMode,
  isDarkMode,
  onViewModeChange,
  onPreviousMonth,
  onNextMonth
}: CalendarHeaderProps) {
  return (
    <div className="flex justify-between items-center">
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-semibold">
          {format(currentDate, 'MMMM yyyy')}
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => onViewModeChange('calendar')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              viewMode === 'calendar' 
                ? 'bg-emerald-500 text-white' 
                : isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
            }`}
          >
            <CalendarIcon size={20} />
          </button>
          <button
            onClick={() => onViewModeChange('list')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              viewMode === 'list' 
                ? 'bg-emerald-500 text-white' 
                : isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
            }`}
          >
            <List size={20} />
          </button>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={onPreviousMonth}
          className={`p-2 rounded-lg transition-colors ${
            isDarkMode 
              ? 'hover:bg-gray-700 text-gray-300' 
              : 'hover:bg-gray-100 text-gray-600'
          }`}
        >
          <ChevronLeft size={20} />
        </button>
        <button
          onClick={onNextMonth}
          className={`p-2 rounded-lg transition-colors ${
            isDarkMode 
              ? 'hover:bg-gray-700 text-gray-300' 
              : 'hover:bg-gray-100 text-gray-600'
          }`}
        >
          <ChevronRight size={20} />
        </button>
      </div>
    </div>
  );
}