import React from 'react';
import { format, isToday } from 'date-fns';
import { Event } from '../../types';

interface CalendarGridProps {
  days: number[];
  previousMonthDays: number[];
  currentDate: Date;
  isDarkMode: boolean;
  events: Event[];
  getEventsForDay: (day: number) => Event[];
  onDayClick: (day: number) => void;
  updatedDates: Set<string>;
}

export default function CalendarGrid({
  days,
  previousMonthDays,
  currentDate,
  isDarkMode,
  events,
  getEventsForDay,
  onDayClick,
  updatedDates
}: CalendarGridProps) {
  return (
    <div className="grid grid-cols-7 gap-1">
      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
        <div
          key={day}
          className={`text-center text-sm font-medium py-2 ${
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
          }`}
        >
          {day}
        </div>
      ))}

      {previousMonthDays.map(day => (
        <div
          key={`prev-${day}`}
          className={`h-32 p-1 rounded-lg ${
            isDarkMode 
              ? 'bg-gray-900/50' 
              : 'bg-gray-50'
          }`}
        />
      ))}

      {days.map(day => {
        const dayEvents = getEventsForDay(day);
        const extraEvents = dayEvents.length > 2 ? dayEvents.length - 2 : 0;
        const isCurrentDay = isToday(new Date(currentDate.getFullYear(), currentDate.getMonth(), day));
        const dateStr = new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toISOString().split('T')[0];
        const isUpdated = updatedDates.has(dateStr);

        return (
          <div
            key={day}
            onClick={() => onDayClick(day)}
            className={`h-32 p-1 rounded-lg cursor-pointer transition-all duration-300 ${
              isDarkMode
                ? isCurrentDay 
                  ? 'bg-emerald-900/20 hover:bg-emerald-900/30' 
                  : 'hover:bg-gray-700/50'
                : isCurrentDay
                  ? 'bg-emerald-50 hover:bg-emerald-100'
                  : 'hover:bg-gray-50'
            } ${
              isUpdated ? 'animate-calendar-glow' : ''
            }`}
          >
            <div className={`text-sm ${
              isCurrentDay 
                ? 'font-bold text-emerald-500' 
                : isDarkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              {day}
            </div>
            <div className="mt-1 space-y-1">
              {dayEvents.slice(0, 2).map((event) => (
                <div
                  key={event.id}
                  className={`text-xs truncate px-1.5 py-0.5 rounded-md ${
                    event.status === 'completed'
                      ? 'line-through opacity-50'
                      : ''
                  }`}
                  style={{ 
                    backgroundColor: event.color || '#10B981',
                    color: isDarkMode ? 'white' : 'inherit'
                  }}
                >
                  {event.title}
                </div>
              ))}
              {extraEvents > 0 && (
                <div className="relative flex justify-end">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                    isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'
                  }`}>
                    +{extraEvents}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}