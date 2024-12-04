import React, { useState, useCallback } from 'react';
import { format } from 'date-fns';
import { X } from 'lucide-react';
import { Event } from '../types';
import TimeGrid from './timeline/TimeGrid';
import TimelineEvent from './timeline/TimelineEvent';
import { useEventLayout } from './timeline/useEventLayout';
import { eventManager } from '../services/eventManager';
import { useAuth } from '../context/AuthContext';
import { logger } from '../utils/logger';

interface DayTimelineProps {
  date: Date;
  events: Event[];
  isDarkMode: boolean;
  onClose: () => void;
}

export default function DayTimeline({ 
  date, 
  events: initialEvents, 
  isDarkMode, 
  onClose 
}: DayTimelineProps) {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>(initialEvents);
  const eventsWithLayout = useEventLayout(events);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getEventPosition = useCallback((event: Event & { width: number; left: number }) => {
    const start = new Date(event.start_time);
    const end = new Date(event.end_time);
    const startMinutes = start.getHours() * 60 + start.getMinutes();
    const endMinutes = end.getHours() * 60 + end.getMinutes();
    const totalMinutes = 24 * 60;
    
    return {
      top: `${(startMinutes / totalMinutes) * 100}%`,
      height: `${((endMinutes - startMinutes) / totalMinutes) * 100}%`,
      left: `calc(5rem + ${event.left * (100 - 5)}%)`,
      width: `calc(${event.width * (100 - 5)}%)`,
      minHeight: '60px'
    };
  }, []);

  const handleEventDelete = async (eventId: string) => {
    if (!user) return;

    try {
      setIsDeleting(true);
      setError(null);

      // Optimistically update UI
      setEvents(prev => prev.filter(e => e.id !== eventId));

      // Delete from backend
      await eventManager.deleteEvent(eventId, user.id);

      // Close timeline if no more events
      if (events.length <= 1) {
        setTimeout(onClose, 300); // Wait for animation
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete event';
      setError(message);
      logger.error('Error deleting event:', error);
      
      // Revert optimistic update on error
      setEvents(initialEvents);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEventUpdate = async (updatedEvent: Event) => {
    if (!user) return;

    try {
      setError(null);
      await eventManager.updateEvent(updatedEvent);
      
      // Update local state
      setEvents(prev => prev.map(event => 
        event.id === updatedEvent.id ? updatedEvent : event
      ));
      
      setEditingEvent(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update event';
      setError(message);
      logger.error('Error updating event:', error);
    }
  };

  return (
    <>
      <div className={`sticky top-0 z-10 flex justify-between items-center p-4 border-b ${
        isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'
      }`}>
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {format(date, 'EEEE, MMMM d, yyyy')}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {events.length} event{events.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="relative min-h-[1440px] bg-white dark:bg-gray-800">
          <TimeGrid isDarkMode={isDarkMode} />
          
          <div className="absolute inset-0 ml-24 pr-4">
            {eventsWithLayout.map((event) => (
              <TimelineEvent
                key={event.id}
                event={event}
                position={getEventPosition(event)}
                isDarkMode={isDarkMode}
                isEditing={editingEvent?.id === event.id}
                onEdit={(event) => setEditingEvent(event)}
                onSave={() => editingEvent && handleEventUpdate(editingEvent)}
                onCancel={() => setEditingEvent(null)}
                onDelete={handleEventDelete}
                editingEvent={editingEvent}
                setEditingEvent={setEditingEvent}
                isDeleting={isDeleting}
                error={error}
              />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}