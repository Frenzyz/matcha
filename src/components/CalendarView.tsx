import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Event } from '../types';
import { useThemeStore } from '../store/themeStore';

interface CalendarViewProps {
  events: Event[];
}

export default function CalendarView({ events }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const { isDarkMode } = useThemeStore();

  const daysInMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth() + 1,
    0
  ).getDate();

  const firstDayOfMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    1
  ).getDay();

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const previousMonthDays = Array.from({ length: firstDayOfMonth }, (_, i) => i);

  const getEventsForDay = (day: number) => {
    return events.filter(event => {
      const eventDate = new Date(event.start_time);
      return (
        eventDate.getDate() === day &&
        eventDate.getMonth() === currentDate.getMonth() &&
        eventDate.getFullYear() === currentDate.getFullYear()
      );
    });
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)));
  };

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)));
  };

  return (
    <div className={`rounded-lg shadow p-4 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
        </h2>
        <div className="flex gap-2">
          <button
            onClick={previousMonth}
            className={`p-2 rounded-full ${
              isDarkMode 
                ? 'hover:bg-gray-700 text-gray-300' 
                : 'hover:bg-gray-100 text-gray-600'
            }`}
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={nextMonth}
            className={`p-2 rounded-full ${
              isDarkMode 
                ? 'hover:bg-gray-700 text-gray-300' 
                : 'hover:bg-gray-100 text-gray-600'
            }`}
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div
            key={day}
            className={`text-center text-sm font-medium py-2 ${
              isDarkMode ? 'text-gray-400' : 'text-gray-500'
            }`}
          >
            {day}
          </div>
        ))}

        {previousMonthDays.map(day => (
          <div
            key={`prev-${day}`}
            className={`h-24 p-1 border ${
              isDarkMode 
                ? 'border-gray-700 bg-gray-900' 
                : 'border-gray-100 bg-gray-50'
            }`}
          />
        ))}

        {days.map(day => {
          const dayEvents = getEventsForDay(day);
          const isToday = 
            day === new Date().getDate() &&
            currentDate.getMonth() === new Date().getMonth() &&
            currentDate.getFullYear() === new Date().getFullYear();

          return (
            <div
              key={day}
              className={`h-24 p-1 border ${
                isDarkMode
                  ? `border-gray-700 ${isToday ? 'bg-emerald-900/20' : 'hover:bg-gray-700/50'}`
                  : `border-gray-100 ${isToday ? 'bg-emerald-50' : 'hover:bg-gray-50'}`
              }`}
            >
              <div className={`text-sm ${
                isToday 
                  ? 'font-bold text-emerald-600' 
                  : isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                {day}
              </div>
              <div className="mt-1 space-y-1">
                {dayEvents.map((event) => (
                  <div
                    key={event.id}
                    className={`text-xs truncate px-1 py-0.5 rounded ${
                      event.type === 'academic'
                        ? isDarkMode 
                          ? 'bg-emerald-900/50 text-emerald-300' 
                          : 'bg-emerald-100 text-emerald-700'
                        : event.type === 'career'
                        ? isDarkMode
                          ? 'bg-blue-900/50 text-blue-300'
                          : 'bg-blue-100 text-blue-700'
                        : isDarkMode
                          ? 'bg-purple-900/50 text-purple-300'
                          : 'bg-purple-100 text-purple-700'
                    }`}
                  >
                    {event.title}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}