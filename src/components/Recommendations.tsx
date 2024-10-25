import React from 'react';
import { MapPin, Clock, Users } from 'lucide-react';

export default function Recommendations() {
  const events = [
    {
      title: "Career Fair: Tech & Engineering",
      location: "Student Union",
      time: "2:00 PM - 5:00 PM",
      attendees: 120,
      type: "career"
    },
    {
      title: "Study Skills Workshop",
      location: "Atkins Library",
      time: "3:30 PM - 4:30 PM",
      attendees: 45,
      type: "academic"
    },
    {
      title: "Wellness Wednesday: Yoga",
      location: "UREC",
      time: "5:00 PM - 6:00 PM",
      attendees: 30,
      type: "wellness"
    }
  ];

  return (
    <div className="space-y-4">
      {events.map((event, index) => (
        <div key={index} className="p-4 rounded-lg border border-gray-100 hover:border-emerald-200 transition-colors">
          <h3 className="font-semibold text-gray-800 mb-2">{event.title}</h3>
          
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <MapPin size={16} />
              <span>{event.location}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <Clock size={16} />
              <span>{event.time}</span>
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