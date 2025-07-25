import React from 'react';
import { format, parseISO, differenceInMinutes } from 'date-fns';

// Event type definition
interface Event {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  location?: string;
  start_time: string;
  end_time: string;
  type: 'academic' | 'career' | 'wellness' | 'social';
  status: 'pending' | 'completed';
  source: 'manual' | 'google' | 'auto';
}

// Task type definition
interface Task {
  id: string;
  title: string;
  description?: string;
  due_date: string;
  status: 'pending' | 'completed';
}

interface DayColumnProps {
  date: Date;
  events: Event[];
  tasks: Task[];
  onEventClick: (event: Event, e: React.MouseEvent) => void;
  onTaskClick: (task: Task, e: React.MouseEvent) => void;
}

// Helper to format hour (12-hour format with AM/PM)
const formatHour = (hour: number): string => {
  const hourIn12Format = hour % 12 === 0 ? 12 : hour % 12;
  const amPm = hour < 12 ? 'AM' : 'PM';
  return `${hourIn12Format} ${amPm}`;
};

const DayColumn: React.FC<DayColumnProps> = ({ 
  date, 
  events, 
  tasks, 
  onEventClick,
  onTaskClick 
}) => {
  // Hour range for display
  const startHour = 6; // 6 AM
  const endHour = 22; // 10 PM
  const rowHeight = 60; // 60px per hour

  // Calculate position for events in timeline
  const calculateEventPosition = (event: Event) => {
    const startTime = parseISO(event.start_time);
    const endTime = parseISO(event.end_time);
    
    // Skip events outside our hour range
    if (startTime.getHours() < startHour || startTime.getHours() > endHour) {
      return null;
    }
    
    const minutesFromStartHour = (startTime.getHours() - startHour) * 60 + startTime.getMinutes();
    const top = minutesFromStartHour * (rowHeight / 60);
    const height = Math.max(15, (endTime.getTime() - startTime.getTime()) / (1000 * 60) * (rowHeight / 60));
    
    let bgColor = '';
    switch (event.type) {
      case 'academic':
        bgColor = 'bg-emerald-200 dark:bg-emerald-800 border-emerald-300 dark:border-emerald-700';
        break;
      case 'career':
        bgColor = 'bg-blue-200 dark:bg-blue-800 border-blue-300 dark:border-blue-700';
        break;
      case 'wellness':
        bgColor = 'bg-purple-200 dark:bg-purple-800 border-purple-300 dark:border-purple-700';
        break;
      case 'social':
        bgColor = 'bg-pink-200 dark:bg-pink-800 border-pink-300 dark:border-pink-700';
        break;
      default:
        bgColor = 'bg-gray-200 dark:bg-gray-800 border-gray-300 dark:border-gray-700';
    }
    
    return {
      top: `${top}px`,
      height: `${height}px`,
      bgColor
    };
  };

  // Render time grid lines
  const renderTimeGrid = () => {
    const hours = [];
    for (let hour = startHour; hour <= endHour; hour++) {
      hours.push(
        <div 
          key={`grid-${hour}`} 
          className="border-t border-gray-200 dark:border-gray-700" 
          style={{ height: `${rowHeight}px` }}
        />
      );
    }
    return hours;
  };

  // Render events for this day
  const renderEvents = () => {
    return events.map(event => {
      const position = calculateEventPosition(event);
      if (!position) return null;
      
      const duration = differenceInMinutes(parseISO(event.end_time), parseISO(event.start_time));
      const startTime = format(parseISO(event.start_time), 'h:mm a');
      const endTime = format(parseISO(event.end_time), 'h:mm a');
      
      return (
        <div
          key={event.id}
          onClick={(e) => onEventClick(event, e)}
          className={`absolute left-1 right-1 rounded p-1 border shadow cursor-pointer transition-opacity 
            ${position.bgColor} ${event.status === 'completed' ? 'opacity-50' : 'opacity-100'}`}
          style={{
            top: position.top,
            height: position.height,
          }}
        >
          <div className="text-xs font-semibold truncate">{event.title}</div>
          {duration >= 30 && (
            <div className="text-xs truncate">{startTime} - {endTime}</div>
          )}
        </div>
      );
    });
  };

  return (
    <div className="flex-1 relative border-r border-gray-200 dark:border-gray-700 min-w-[150px]">
      {/* Day header */}
      <div className="text-center py-2 border-b border-gray-200 dark:border-gray-700 font-medium sticky top-0 bg-white dark:bg-gray-900 z-10">
        {format(date, 'EEE, MMM d')}
      </div>
      
      {/* Time grid */}
      <div className="relative">
        {renderTimeGrid()}
        
        {/* Events */}
        {renderEvents()}
      </div>
    </div>
  );
};

export default DayColumn; 