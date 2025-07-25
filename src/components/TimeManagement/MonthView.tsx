import React from 'react';
import { format, isSameMonth, isSameDay, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, parseISO, eachDayOfInterval } from 'date-fns';

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

interface MonthViewProps {
  selectedDate: Date;
  events: Event[];
  tasks: Task[];
  onDateClick: (date: Date) => void;
  onEventClick: (event: Event, e: React.MouseEvent) => void;
  onTaskClick: (task: Task, e: React.MouseEvent) => void;
}

const MonthView: React.FC<MonthViewProps> = ({ 
  selectedDate,
  events,
  tasks,
  onDateClick,
  onEventClick,
  onTaskClick
}) => {
  // Get all dates to display in the month view (includes some days from previous and next months)
  const getDaysInMonth = (date: Date) => {
    const start = startOfWeek(startOfMonth(date));
    const end = endOfWeek(endOfMonth(date));
    return eachDayOfInterval({ start, end });
  };

  const days = getDaysInMonth(selectedDate);

  // Filter events and tasks for a specific day
  const getEventsForDay = (day: Date) => {
    return events.filter(event => {
      const eventDate = parseISO(event.start_time);
      return isSameDay(eventDate, day);
    });
  };

  const getTasksForDay = (day: Date) => {
    return tasks.filter(task => {
      if (!task.due_date) return false;
      const taskDate = parseISO(task.due_date);
      return isSameDay(taskDate, day);
    });
  };

  // Get color based on event type
  const getEventColor = (eventType: Event['type']) => {
    switch (eventType) {
      case 'academic':
        return 'bg-emerald-200 dark:bg-emerald-800';
      case 'career':
        return 'bg-blue-200 dark:bg-blue-800';
      case 'wellness':
        return 'bg-purple-200 dark:bg-purple-800';
      case 'social':
        return 'bg-pink-200 dark:bg-pink-800';
      default:
        return 'bg-gray-200 dark:bg-gray-800';
    }
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Calendar header - days of week */}
      <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div key={day} className="p-2 text-center font-medium text-gray-600 dark:text-gray-300">
            {day}
          </div>
        ))}
      </div>
      
      {/* Calendar grid */}
      <div className="grid grid-cols-7 grid-rows-6 h-full">
        {days.map((day, i) => {
          const dayEvents = getEventsForDay(day);
          const dayTasks = getTasksForDay(day);
          const isCurrentMonth = isSameMonth(day, selectedDate);
          const isToday = isSameDay(day, new Date());
          
          return (
            <div 
              key={i}
              onClick={() => onDateClick(day)}
              className={`
                min-h-[100px] p-1 border-r border-b border-gray-200 dark:border-gray-700 relative
                ${!isCurrentMonth ? 'bg-gray-50 dark:bg-gray-800/50 text-gray-400 dark:text-gray-500' : ''}
                ${isToday ? 'bg-blue-50 dark:bg-blue-900/20' : ''}
                cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800
              `}
            >
              {/* Day number */}
              <div className={`
                text-right p-1 font-medium
                ${isToday ? 'text-blue-600 dark:text-blue-400' : ''}
              `}>
                {format(day, 'd')}
              </div>
              
              {/* Events for this day */}
              <div className="space-y-1 mt-1">
                {dayEvents.slice(0, 3).map(event => (
                  <div
                    key={event.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick(event, e);
                    }}
                    className={`
                      ${getEventColor(event.type)} 
                      rounded px-1 py-0.5 text-xs truncate cursor-pointer
                      ${event.status === 'completed' ? 'opacity-50' : ''}
                    `}
                  >
                    {event.title}
                  </div>
                ))}
                
                {/* Show count of additional events if any */}
                {dayEvents.length > 3 && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 pl-1">
                    +{dayEvents.length - 3} more
                  </div>
                )}
                
                {/* Tasks due this day */}
                {dayTasks.length > 0 && (
                  <div className="text-xs font-medium text-orange-500 dark:text-orange-400 pl-1">
                    {dayTasks.length} task{dayTasks.length !== 1 ? 's' : ''}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MonthView; 