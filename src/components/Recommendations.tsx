import React, { useEffect, useState } from 'react';
import { MapPin, Clock, Users } from 'lucide-react';
import { supabase } from '../config/supabase';
import { Event } from '../types';

export default function Recommendations() {
  const [events, setEvents] = useState<Event[]>([]);

  useEffect(() => {
    const fetchEvents = async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('start_time', { ascending: true })
        .limit(3);

      if (!error && data) {
        setEvents(data);
      }
    };

    fetchEvents();
  }, []);

  return (
    <div className="space-y-4">
      {events.map((event) => (
        <div key={event.id} className="p-4 rounded-lg border border-gray-100 hover:border-emerald-200 transition-colors">
          <h3 className="font-semibold text-gray-800 mb-2">{event.title}</h3>
          
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <MapPin size={16} />
              <span>{event.location}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <Clock size={16} />
              <span>{new Date(event.start_time).toLocaleTimeString()}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <Users size={16} />
              <span>{event.attendees} attending</span>
            </div>
          </div>

          <button className="mt-3 w-full py-2 px-4 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors">
            Add to Calendar
          </button>
        </div>
      ))}
    </div>
  );
}