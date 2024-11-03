import React, { useState, useCallback, useMemo } from 'react';
import { format, isSameDay, addMonths, subMonths, isToday, startOfMonth } from 'date-fns';
import { ChevronLeft, ChevronRight, List, Calendar as CalendarIcon, Trash2 } from 'lucide-react';
import { Event } from '../types';
import { useThemeStore } from '../store/themeStore';
import DayTimeline from './DayTimeline';

interface CalendarProps {
  events: Event[];
  onEventsChange: (events: Event[]) => void;
  onEventUpdate: (event: Event) => Promise<void>;
  onEventDelete: (eventId: string) => Promise<void>;
}

export default function Calendar({ 
  events, 
  onEventsChange,
  onEventUpdate,
  onEventDelete
}: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [isDeleting, setIsDeleting] = useState(false);
  const { isDarkMode } = useThemeStore();

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

  const handleDeleteAllEvents = async () => {
    if (!window.confirm('Are you sure you want to delete all events?')) {
      return;
    }

    setIsDeleting(true);
    try {
      await Promise.all(events.map(event => onEventDelete(event.id)));
      onEventsChange([]);
      setSelectedDate(null);
    } catch (error) {
      console.error('Error deleting events:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const getEventColor = (event: Event) => {
    const baseColor = event.color || '#10B981';
    
    if (event.status === 'completed') {
      const r = parseInt(baseColor.slice(1, 3), 16);
      const g = parseInt(baseColor.slice(3, 5), 16);
      const b = parseInt(baseColor.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, 0.5)`;
    }
    
    return baseColor;
  };

  const getEventTextColor = useCallback((event: Event) => {
    return event.status === 'completed' ? 'text-gray-500' : 'text-gray-900 dark:text-white';
  }, []);

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

  const handleEventDelete = async (eventId: string) => {
    try {
      await onEventDelete(eventId);
      const updatedEvents = events.filter(e => e.id !== eventId);
      onEventsChange(updatedEvents);
      if (selectedDate && getEventsForDay(selectedDate.getDate()).length <= 1) {
        setSelectedDate(null);
      }
    } catch (error) {
      console.error('Error deleting event:', error);
    }
  };

  const handleEventUpdate = async (updatedEvent: Event) => {
    try {
      await onEventUpdate(updatedEvent);
      const updatedEvents = events.map(event => 
        event.id === updatedEvent.id ? updatedEvent : event
      );
      onEventsChange(updatedEvents);
    } catch (error) {
      console.error('Error updating event:', error);
    }
  };

  const handleDayClick = (day: number) => {
    const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    setSelectedDate(newDate);
  };

  return (
    <div className={`lg:col-span-3 ${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-sm p-6`}>
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
              onClick={handleDeleteAllEvents}
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

            return (
              <div
                key={day}
                onClick={() => handleDayClick(day)}
                className={`h-32 p-1 rounded-lg cursor-pointer transition-colors ${
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
                  {dayEvents.slice(0, 2).map((event) => (
                    <div
                      key={event.id}
                      className={`text-xs truncate px-1.5 py-0.5 rounded-md ${getEventTextColor(event)}`}
                      style={{ backgroundColor: getEventColor(event) }}
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
                style={{ backgroundColor: getEventColor(event) }}
              >
                <h3 className={`font-semibold ${getEventTextColor(event)}`}>
                  {event.title}
                </h3>
                <p className={`text-sm ${event.status === 'completed' ? 'text-gray-500' : 'text-gray-600 dark:text-gray-300'}`}>
                  {format(new Date(event.start_time), 'PPp')}
                </p>
                {event.location && (
                  <p className={`text-sm ${event.status === 'completed' ? 'text-gray-500' : 'text-gray-500 dark:text-gray-400'}`}>
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
              onEventUpdate={handleEventUpdate}
              onEventDelete={handleEventDelete}
              onClose={() => setSelectedDate(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}