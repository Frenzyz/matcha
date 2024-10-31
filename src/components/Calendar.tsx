import React, { useState, useCallback } from 'react';
import { format, isSameDay, addMonths, subMonths, isToday, isPast, isFuture } from 'date-fns';
import { ChevronLeft, ChevronRight, List, Calendar as CalendarIcon, Clock, MapPin, Check, Trash2 } from 'lucide-react';
import { Event } from '../types';
import { useThemeStore } from '../store/themeStore';
import DayTimeline from './DayTimeline';
import { EventService } from '../services/events';
import { useAuth } from '../context/AuthContext';

interface CalendarProps {
  events?: Event[];
  onEventsChange?: (events: Event[]) => void;
  onClearEvents?: () => void;
}

export default function Calendar({ events = [], onEventsChange = () => {}, onClearEvents }: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const { isDarkMode } = useThemeStore();
  const { user } = useAuth();

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

  const getEventsForDay = useCallback((day: number) => {
    return events.filter(event => {
      const eventDate = new Date(event.start_time);
      return (
        eventDate.getDate() === day &&
        eventDate.getMonth() === currentDate.getMonth() &&
        eventDate.getFullYear() === currentDate.getFullYear()
      );
    });
  }, [events, currentDate]);

  return (
    <div className={`lg:col-span-3 ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white'} rounded-xl shadow-sm p-6`}>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold">
            {format(currentDate, 'MMMM yyyy')}
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                viewMode === 'calendar' 
                  ? 'bg-emerald-500 text-white' 
                  : isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
              }`}
            >
              <CalendarIcon size={20} />
            </button>
            <button
              onClick={() => setViewMode('list')}
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
          {onClearEvents && (
            <button
              onClick={onClearEvents}
              className="px-3 py-1.5 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
            >
              <Trash2 size={20} />
            </button>
          )}
          <button
            onClick={() => setCurrentDate(subMonths(currentDate, 1))}
            className={`p-2 rounded-lg transition-colors ${
              isDarkMode 
                ? 'hover:bg-gray-700 text-gray-300' 
                : 'hover:bg-gray-100 text-gray-600'
            }`}
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={() => setCurrentDate(addMonths(currentDate, 1))}
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

      {viewMode === 'calendar' ? (
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
              className={`h-24 p-1 rounded-lg ${
                isDarkMode 
                  ? 'bg-gray-900/50' 
                  : 'bg-gray-50'
              }`}
            />
          ))}

          {days.map(day => {
            const dayEvents = getEventsForDay(day);
            const isCurrentDay = 
              day === new Date().getDate() &&
              currentDate.getMonth() === new Date().getMonth() &&
              currentDate.getFullYear() === new Date().getFullYear();

            return (
              <div
                key={day}
                onClick={() => setSelectedDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), day))}
                className={`h-24 p-1 rounded-lg cursor-pointer transition-colors ${
                  isDarkMode
                    ? isCurrentDay 
                      ? 'bg-emerald-900/20 hover:bg-emerald-900/30' 
                      : 'hover:bg-gray-700/50'
                    : isCurrentDay
                      ? 'bg-emerald-50 hover:bg-emerald-100'
                      : 'hover:bg-gray-50'
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
                  {dayEvents.slice(0, 3).map((event) => (
                    <div
                      key={event.id}
                      className={`text-xs truncate px-1.5 py-0.5 rounded-md ${
                        isDarkMode
                          ? event.type === 'academic'
                            ? 'bg-emerald-900/50 text-emerald-300'
                            : event.type === 'career'
                              ? 'bg-blue-900/50 text-blue-300'
                              : 'bg-purple-900/50 text-purple-300'
                          : event.type === 'academic'
                            ? 'bg-emerald-100 text-emerald-700'
                            : event.type === 'career'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-purple-100 text-purple-700'
                      }`}
                    >
                      {event.title}
                    </div>
                  ))}
                  {dayEvents.length > 3 && (
                    <div className={`text-xs ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      +{dayEvents.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-3">
          {events
            .filter(event => isFuture(new Date(event.start_time)))
            .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
            .map(event => (
              <div
                key={event.id}
                className={`p-4 rounded-lg transition-colors ${
                  isDarkMode
                    ? 'bg-gray-700/50 hover:bg-gray-700'
                    : 'border border-gray-200 hover:border-emerald-500'
                }`}
              >
                <h3 className={`font-semibold ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  {event.title}
                </h3>
                <p className={`text-sm ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-600'
                }`}>
                  {format(new Date(event.start_time), 'PPp')}
                </p>
                {event.location && (
                  <p className={`text-sm ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    {event.location}
                  </p>
                )}
              </div>
            ))}
        </div>
      )}

      {selectedDate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50">
          <div className="relative w-full max-w-4xl h-[90vh] flex flex-col rounded-xl shadow-xl bg-white dark:bg-gray-800 mx-auto my-8">
            <DayTimeline
              date={selectedDate}
              events={events.filter(event => 
                isSameDay(new Date(event.start_time), selectedDate)
              )}
              isDarkMode={isDarkMode}
              onEventsChange={onEventsChange}
              onClose={() => setSelectedDate(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}