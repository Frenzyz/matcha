import React, { useState } from 'react';
import { format } from 'date-fns';
import { X as Close } from 'lucide-react';
import { Event } from '../types';
import { useAuth } from '../context/AuthContext';
import { EventService } from '../services/events';
import EventCard from './timeline/EventCard';
import { useEventLayout } from './timeline/useEventLayout';

interface DayTimelineProps {
  date: Date;
  events: Event[];
  isDarkMode: boolean;
  onEventsChange: (events: Event[]) => void;
  onClose: () => void;
}

export default function DayTimeline({ date, events, isDarkMode, onEventsChange, onClose }: DayTimelineProps) {
  const { user } = useAuth();
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const eventsWithLayout = useEventLayout(events);

  const handleEditEvent = (event: Event) => {
    setEditingEvent(event);
  };

  const handleCancelEdit = () => {
    setEditingEvent(null);
  };

  const handleSaveEdit = async () => {
    if (!editingEvent || !user) return;

    try {
      await EventService.updateEvent(editingEvent);
      const updatedEvents = events.map(e => 
        e.id === editingEvent.id ? editingEvent : e
      );
      onEventsChange(updatedEvents);
      const freshEvents = await EventService.fetchEvents(user.id);
      onEventsChange(freshEvents);
      setEditingEvent(null);
    } catch (error) {
      console.error('Error updating event:', error);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!user || !window.confirm('Are you sure you want to delete this event?')) return;

    try {
      await EventService.deleteEvent(eventId, user.id);
      const updatedEvents = events.filter(e => e.id !== eventId);
      onEventsChange(updatedEvents);
      const freshEvents = await EventService.fetchEvents(user.id);
      onEventsChange(freshEvents);
    } catch (error) {
      console.error('Error deleting event:', error);
    }
  };

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

  return (
    <>
      <div className="sticky top-0 z-10 flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700 bg-inherit">
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
          <Close size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="relative" style={{ height: 'calc(24 * 60px)' }}>
          {/* Time markers */}
          <div className="absolute inset-0">
            <div className="w-20 flex-shrink-0 sticky left-0 bg-inherit z-10">
              {Array.from({ length: 24 }, (_, i) => (
                <div key={i} className="h-[60px] flex items-center justify-end pr-4">
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {format(new Date().setHours(i, 0), 'h:mm a')}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Hour lines */}
          <div className="absolute inset-0 ml-20 border-l border-gray-200 dark:border-gray-700">
            {Array.from({ length: 24 }, (_, i) => (
              <div
                key={i}
                className="absolute w-full h-[60px] border-b border-gray-200 dark:border-gray-700/50"
                style={{ top: `${i * 60}px` }}
              />
            ))}
          </div>

          {/* Events */}
          {eventsWithLayout.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              position={getEventPosition(event)}
              isEditing={editingEvent?.id === event.id}
              isDarkMode={isDarkMode}
              onEdit={handleEditEvent}
              onSave={handleSaveEdit}
              onCancel={handleCancelEdit}
              onDelete={handleDeleteEvent}
              editingEvent={editingEvent}
              setEditingEvent={setEditingEvent}
            />
          ))}
        </div>
      </div>
    </>
  );
}