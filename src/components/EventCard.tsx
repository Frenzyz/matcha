import React from 'react';
import { MapPin, Clock, Users } from 'lucide-react';
import { Event } from '../types';

interface EventCardProps {
  event: Event;
}

export default function EventCard({ event }: EventCardProps) {
  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const getEventTypeStyles = (type: string) => {
    switch (type) {
      case 'career':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'wellness':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      default:
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
  };

  return (
    <div className={`p-4 rounded-lg border transition-colors ${getEventTypeStyles(event.type)}`}>
      <h3 className="font-semibold mb-2">{event.title}</h3>
      
      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2">
          <Clock className="flex-shrink-0" size={16} />
          <span>{formatDate(event.start_time)}</span>
        </div>
        
        {event.location && (
          <div className="flex items-center gap-2">
            <MapPin className="flex-shrink-0" size={16} />
            <span>{event.location}</span>
          </div>
        )}
        
        {event.attendees > 0 && (
          <div className="flex items-center gap-2">
            <Users className="flex-shrink-0" size={16} />
            <span>{event.attendees} attending</span>
          </div>
        )}
      </div>
    </div>
  );
}