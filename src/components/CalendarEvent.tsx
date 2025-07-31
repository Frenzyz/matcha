import React from 'react';
import { MapPin, Clock, Users } from 'lucide-react';
import { Event } from '../types/index';

interface CalendarEventProps {
  event: Event;
}

export default function CalendarEvent({ event }: CalendarEventProps) {
  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'academic':
        return 'bg-emerald-50 text-emerald-700 ring-emerald-600/20';
      case 'career':
        return 'bg-blue-50 text-blue-700 ring-blue-600/20';
      case 'wellness':
        return 'bg-purple-50 text-purple-700 ring-purple-600/20';
      default:
        return 'bg-gray-50 text-gray-700 ring-gray-600/20';
    }
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-medium text-gray-900">{event.title}</h3>
          <div className="mt-2 space-y-2 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <Clock size={16} />
              <span>{formatDate(event.start_time)}</span>
            </div>
            {event.location && (
              <div className="flex items-center gap-2">
                <MapPin size={16} />
                <span>{event.location}</span>
              </div>
            )}
            {event.attendees && event.attendees > 0 && (
              <div className="flex items-center gap-2">
                <Users size={16} />
                <span>{event.attendees} attending</span>
              </div>
            )}
          </div>
        </div>
        <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${getEventTypeColor(event.type)}`}>
          {event.type}
        </span>
      </div>
    </div>
  );
}
