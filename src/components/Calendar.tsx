import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { format, isSameDay, addMonths, subMonths, isToday, startOfMonth } from 'date-fns';
import { ChevronLeft, ChevronRight, List, Calendar as CalendarIcon, Trash2 } from 'lucide-react';
import { Event } from '../types';
import { useThemeStore } from '../store/themeStore';
import { useEvents } from '../hooks/useEvents';
import DayTimeline from './DayTimeline';

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [isDeleting, setIsDeleting] = useState(false);
  const [updatedDates, setUpdatedDates] = useState<Set<string>>(new Set());
  const { isDarkMode } = useThemeStore();
  const { events, fetchEvents, deleteEvent } = useEvents();

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Calculate calendar days
  const calendarDays = useMemo(() => {
    const firstDay = startOfMonth(currentDate);
    const firstDayOfMonth = firstDay.getDay();
    const daysInMonth = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() + 1,
      0
    ).getDate();

    return {
      firstDayOfMonth,
      daysInMonth,
      days: Array.from({ length: daysInMonth }, (_, i) => i + 1),
      previousMonthDays: Array.from({ length: firstDayOfMonth }, (_, i) => i)
    };
  }, [currentDate]);

  // Listen for calendar updates
  useEffect(() => {
    const handleCalendarUpdate = () => {
      fetchEvents();
      const newDates = new Set<string>();
      events.forEach(event => {
        const date = new Date(event.start_time);
        newDates.add(date.toISOString().split('T')[0]);
      });
      setUpdatedDates(newDates);
    };

    window.addEventListener('calendar-update', handleCalendarUpdate);
    return () => window.removeEventListener('calendar-update', handleCalendarUpdate);
  }, [events, fetchEvents]);

  // Clear animation after delay
  useEffect(() => {
    const timer = setTimeout(() => {
      setUpdatedDates(new Set());
    }, 2000);
    return () => clearTimeout(timer);
  }, [updatedDates]);

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

  const handleDeleteAll = async () => {
    if (!window.confirm('Are you sure you want to delete all events?')) return;
    
    setIsDeleting(true);
    try {
      await Promise.all(events.map(event => deleteEvent(event.id)));
      window.dispatchEvent(new CustomEvent('calendar-update'));
      setSelectedDate(null);
    } catch (error) {
      console.error('Error deleting all events:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDayClick = (day: number) => {
    const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    setSelectedDate(newDate);
  };

  return (
    <div className={`lg:col-span-3 ${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-sm p-6`}>
      {/* Calendar header */}
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

        <div className="flex items-center gap-4">
          {events.length > 0 && (
            <button
              onClick={handleDeleteAll}
              disabled={isDeleting}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors ${
                isDeleting ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <Trash2 size={16} />
              <span className="text-sm font-medium">Delete All</span>
            </button>
          )}
          <div className="flex gap-2">
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
      </div>

      {/* Calendar grid */}
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

          {calendarDays.previousMonthDays.map(day => (
            <div
              key={`prev-${day}`}
              className={`h-32 p-1 rounded-lg ${
                isDarkMode 
                  ? 'bg-gray-900/50' 
                  : 'bg-gray-50'
              }`}
            />
          ))}

          {calendarDays.days.map(day => {
            const dayEvents = getEventsForDay(day);
            const extraEvents = dayEvents.length > 2 ? dayEvents.length - 2 : 0;
            const isCurrentDay = isToday(new Date(currentDate.getFullYear(), currentDate.getMonth(), day));
            const dateStr = new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toISOString().split('T')[0];
            const isUpdated = updatedDates.has(dateStr);

            return (
              <div
                key={day}
                onClick={() => handleDayClick(day)}
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
      ) : (
        <div className="space-y-3">
          {events
            .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
            .map(event => (
              <div
                key={event.id}
                className={`p-4 rounded-lg transition-colors`}
                style={{ backgroundColor: event.color || '#10B981' }}
              >
                <h3 className={`font-semibold ${event.status === 'completed' ? 'line-through' : ''}`}>
                  {event.title}
                </h3>
                <p className={`text-sm ${event.status === 'completed' ? 'line-through opacity-50' : ''}`}>
                  {format(new Date(event.start_time), 'PPp')}
                </p>
                {event.location && (
                  <p className={`text-sm ${event.status === 'completed' ? 'line-through opacity-50' : ''}`}>
                    {event.location}
                  </p>
                )}
              </div>
            ))}
        </div>
      )}

      {/* Day timeline modal */}
      {selectedDate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50">
          <div className="relative w-full max-w-4xl h-[90vh] flex flex-col rounded-xl shadow-xl bg-white dark:bg-gray-800 mx-auto my-8">
            <DayTimeline
              date={selectedDate}
              events={events.filter(event => 
                isSameDay(new Date(event.start_time), selectedDate)
              )}
              isDarkMode={isDarkMode}
              onClose={() => setSelectedDate(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}