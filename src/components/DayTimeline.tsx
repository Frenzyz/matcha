import React, { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { MapPin, Pen, Trash2, Save, X as Close } from 'lucide-react';
import { Event } from '../types';
import { useAuth } from '../context/AuthContext';
import { EventService } from '../services/events';

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
      
      // Update local events state
      const updatedEvents = events.map(e => 
        e.id === editingEvent.id ? editingEvent : e
      );
      onEventsChange(updatedEvents);
      
      // Fetch fresh events to ensure sync
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
      
      // Update local events state
      const updatedEvents = events.filter(e => e.id !== eventId);
      onEventsChange(updatedEvents);
      
      // Fetch fresh events to ensure sync
      const freshEvents = await EventService.fetchEvents(user.id);
      onEventsChange(freshEvents);
    } catch (error) {
      console.error('Error deleting event:', error);
    }
  };

  const getEventPosition = (event: Event) => {
    const start = new Date(event.start_time);
    const end = new Date(event.end_time);
    const startMinutes = start.getHours() * 60 + start.getMinutes();
    const endMinutes = end.getHours() * 60 + end.getMinutes();
    const totalMinutes = 24 * 60;
    
    return {
      top: `${(startMinutes / totalMinutes) * 100}%`,
      height: `${((endMinutes - startMinutes) / totalMinutes) * 100}%`,
      minHeight: '60px'
    };
  };

  const getEventColor = (type: string) => {
    return isDarkMode
      ? {
          academic: 'bg-emerald-900/20 text-emerald-300',
          career: 'bg-blue-900/20 text-blue-300',
          wellness: 'bg-purple-900/20 text-purple-300'
        }[type] || 'bg-gray-900/20 text-gray-300'
      : {
          academic: 'bg-emerald-100 text-emerald-700',
          career: 'bg-blue-100 text-blue-700',
          wellness: 'bg-purple-100 text-purple-700'
        }[type] || 'bg-gray-100 text-gray-700';
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
          <div className="absolute inset-0 flex">
            {/* Time markers */}
            <div className="w-24 flex-shrink-0 sticky left-0 bg-inherit z-10">
              {Array.from({ length: 24 }, (_, i) => (
                <div key={i} className="h-[60px] flex items-center justify-end pr-4">
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {format(new Date().setHours(i, 0), 'h:mm a')}
                  </span>
                </div>
              ))}
            </div>

            {/* Events grid */}
            <div className="flex-1 relative border-l border-gray-200 dark:border-gray-700">
              {/* Hour lines */}
              {Array.from({ length: 24 }, (_, i) => (
                <div
                  key={i}
                  className="absolute w-full h-[60px] border-b border-gray-200 dark:border-gray-700/50"
                  style={{ top: `${i * 60}px` }}
                />
              ))}

              {/* Events */}
              {events.map((event) => {
                const position = getEventPosition(event);
                const isEditing = editingEvent?.id === event.id;

                return (
                  <div
                    key={event.id}
                    className={`absolute left-0 right-4 mx-2 rounded-lg shadow-sm transition-all ${
                      isEditing ? 'ring-2 ring-emerald-500 ring-offset-2 dark:ring-offset-gray-800 z-20' : ''
                    } ${getEventColor(event.type)}`}
                    style={position}
                  >
                    <div className={`p-3 ${isEditing ? 'bg-white/95 dark:bg-gray-800/95 rounded-lg' : ''}`}>
                      {isEditing ? (
                        <div className="space-y-3">
                          <div className="space-y-2">
                            <label className="block text-xs font-medium">Event Title</label>
                            <input
                              type="text"
                              value={editingEvent.title}
                              onChange={(e) => setEditingEvent({ ...editingEvent, title: e.target.value })}
                              className="w-full px-2 py-1.5 rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                              placeholder="Event title"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="block text-xs font-medium">Location</label>
                            <input
                              type="text"
                              value={editingEvent.location || ''}
                              onChange={(e) => setEditingEvent({ ...editingEvent, location: e.target.value })}
                              className="w-full px-2 py-1.5 rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                              placeholder="Location (optional)"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="block text-xs font-medium">Time</label>
                            <div className="flex items-center gap-2">
                              <input
                                type="time"
                                value={format(parseISO(editingEvent.start_time), 'HH:mm')}
                                onChange={(e) => {
                                  const [hours, minutes] = e.target.value.split(':');
                                  const newDate = new Date(editingEvent.start_time);
                                  newDate.setHours(parseInt(hours), parseInt(minutes));
                                  setEditingEvent({
                                    ...editingEvent,
                                    start_time: newDate.toISOString()
                                  });
                                }}
                                className="flex-1 px-2 py-1.5 rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                              />
                              <span className="text-sm">to</span>
                              <input
                                type="time"
                                value={format(parseISO(editingEvent.end_time), 'HH:mm')}
                                onChange={(e) => {
                                  const [hours, minutes] = e.target.value.split(':');
                                  const newDate = new Date(editingEvent.end_time);
                                  newDate.setHours(parseInt(hours), parseInt(minutes));
                                  setEditingEvent({
                                    ...editingEvent,
                                    end_time: newDate.toISOString()
                                  });
                                }}
                                className="flex-1 px-2 py-1.5 rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                              />
                            </div>
                          </div>
                          <div className="flex justify-end gap-2 pt-2">
                            <button
                              onClick={handleCancelEdit}
                              className="p-2 hover:bg-black/10 rounded transition-colors"
                            >
                              <Close size={14} />
                            </button>
                            <button
                              onClick={handleSaveEdit}
                              className="p-2 hover:bg-black/10 rounded transition-colors"
                            >
                              <Save size={14} />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex justify-between items-start">
                            <h4 className="font-medium">{event.title}</h4>
                            <div className="flex gap-1">
                              <button
                                onClick={() => handleEditEvent(event)}
                                className="p-1 hover:bg-black/10 rounded transition-colors"
                              >
                                <Pen size={14} />
                              </button>
                              <button
                                onClick={() => handleDeleteEvent(event.id)}
                                className="p-1 hover:bg-black/10 rounded transition-colors"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                          <p className="text-sm mt-1">
                            {format(parseISO(event.start_time), 'h:mm a')} -
                            {format(parseISO(event.end_time), 'h:mm a')}
                          </p>
                          {event.location && (
                            <p className="text-sm mt-1 flex items-center gap-1">
                              <MapPin size={14} />
                              {event.location}
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}