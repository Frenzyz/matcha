import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { format, isSameDay, addMonths, subMonths, startOfMonth } from 'date-fns';
import { useThemeStore } from '../store/themeStore';
import { useCalendarEvents } from '../hooks/useCalendarEvents';
import DayTimeline from './DayTimeline';
import CalendarHeader from './calendar/CalendarHeader';
import CalendarGrid from './calendar/CalendarGrid';
import { Trash2 } from 'lucide-react';

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [updatedDates, setUpdatedDates] = useState<Set<string>>(new Set());
  const { isDarkMode } = useThemeStore();
  const { events, loading, error, deleteAllEvents } = useCalendarEvents();

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

  // Track updated dates for animation
  useEffect(() => {
    const handleEventUpdate = (updatedEvent?: any) => {
      if (updatedEvent) {
        const date = new Date(updatedEvent.start_time);
        setUpdatedDates(new Set([date.toISOString().split('T')[0]]));
      }
    };

    const cleanup = () => {
      setUpdatedDates(new Set());
    };

    window.addEventListener('calendar-update', handleEventUpdate);
    return () => {
      window.removeEventListener('calendar-update', handleEventUpdate);
      cleanup();
    };
  }, []);

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

  const handleDayClick = (day: number) => {
    const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    setSelectedDate(newDate);
  };

  const handleClearEvents = async () => {
    if (window.confirm('Are you sure you want to clear all events?')) {
      await deleteAllEvents();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500 p-4">{error}</div>;
  }

  return (
    <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-sm p-6`}>
      <div className="flex justify-between items-center mb-6">
        <CalendarHeader
          currentDate={currentDate}
          viewMode={viewMode}
          isDarkMode={isDarkMode}
          onViewModeChange={setViewMode}
          onPreviousMonth={() => setCurrentDate(subMonths(currentDate, 1))}
          onNextMonth={() => setCurrentDate(addMonths(currentDate, 1))}
        />
        
        {events.length > 0 && (
          <button
            onClick={handleClearEvents}
            className="flex items-center gap-2 px-3 py-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
          >
            <Trash2 size={16} />
            <span>Clear All</span>
          </button>
        )}
      </div>

      <div className="mt-6">
        {viewMode === 'calendar' ? (
          <CalendarGrid
            days={calendarDays.days}
            previousMonthDays={calendarDays.previousMonthDays}
            currentDate={currentDate}
            isDarkMode={isDarkMode}
            events={events}
            getEventsForDay={getEventsForDay}
            onDayClick={handleDayClick}
            updatedDates={updatedDates}
          />
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
      </div>

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
