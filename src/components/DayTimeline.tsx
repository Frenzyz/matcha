import React, { useState } from 'react';
import { format } from 'date-fns';
import { X } from 'lucide-react';
import { Event } from '../types';
import TimeGrid from './timeline/TimeGrid';
import TimelineEvent from './timeline/TimelineEvent';
import { useEventLayout } from './timeline/useEventLayout';

interface DayTimelineProps {
  date: Date;
  events: Event[];
  isDarkMode: boolean;
  onEventsChange: (events: Event[]) => void;
  onEventUpdate: (event: Event) => Promise<void>;
  onEventDelete: (eventId: string) => Promise<void>;
  onClose: () => void;
}

export default function DayTimeline({ 
  date, 
  events, 
  isDarkMode, 
  onEventsChange,
  onEventUpdate,
  onEventDelete,
  onClose 
}: DayTimelineProps) {
  const eventsWithLayout = useEventLayout(events);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);

  const getEventPosition = (event: Event & { width: number; left: number }) => {
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
  };

  const handleEventDelete = async (eventId: string) => {
    try {
      await onEventDelete(eventId);
      const updatedEvents = events.filter(e => e.id !== eventId);
      onEventsChange(updatedEvents);
      
      // If no more events for this day, close the timeline
      if (updatedEvents.length === 0) {
        onClose();
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
      setEditingEvent(null);
    } catch (error) {
      console.error('Error updating event:', error);
    }
  };

  const handleClose = () => {
    // Ensure any pending changes are saved before closing
    if (editingEvent) {
      handleEventUpdate(editingEvent);
    }
    onClose();
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
          onClick={handleClose}
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
              />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}