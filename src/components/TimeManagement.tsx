import React, { 
  useState, 
  useEffect, 
  useCallback, 
  useRef, 
  useMemo 
} from 'react';
import { useAuth } from '../context/AuthContext';
import { useThemeStore } from '../store/themeStore';
import { format, addDays, startOfWeek, endOfWeek, parseISO, differenceInMinutes, isSameDay, nextFriday, isBefore, isAfter, startOfMonth, endOfMonth, getDay, getDaysInMonth, isSameMonth, startOfDay, endOfDay } from 'date-fns';
import { supabase } from '../config/supabase';
import { eventManager } from '../services/eventManager';
import { eventBus, CALENDAR_EVENTS } from '../services/eventBus';
import { CalendarService } from '../services/calendar';
import LoadingSpinner from './LoadingSpinner';
import EventCreationModal from './EventCreationModal';
import './TimeManagement.css';
import { Button } from './ui/button.tsx';
import { ChevronLeft, ChevronRight, X, Plus, Calendar, Clock, Filter, Settings } from 'lucide-react';
import MonthView from './TimeManagement/MonthView';
import DayColumn from './TimeManagement/DayColumn';

// Define the Event and EventType types directly in this file
type EventType = 'academic' | 'career' | 'wellness' | 'social';

interface Event {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  location?: string;
  start_time: string;
  end_time: string;
  type: EventType;
  status: 'pending' | 'completed';
  attendees?: number;
  is_recurring?: boolean;
  recurrence_rule?: string;
  source: 'manual' | 'google' | 'auto';
  google_event_id?: string;
  calendar_id?: string;
  category_id?: string;
  color?: string;
  created_at?: string;
  updated_at?: string;
}

interface TimeBlock {
  id: string;
  start: Date;
  end: Date;
  type: EventType;
  available: boolean;
  duration?: number;
}

interface DragState {
  isDragging: boolean;
  draggedEvent: Event | null;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  offset: { x: number; y: number };
  hasMoved: boolean;
}

export default function TimeManagement() {
  const { user } = useAuth();
  const { isDarkMode } = useThemeStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedTimeRange, setSelectedTimeRange] = useState<'day' | 'week' | 'month'>('week');
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<{ start: Date; end: Date } | null>(null);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    draggedEvent: null,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    offset: { x: 0, y: 0 },
    hasMoved: false
  });
  const [justDropped, setJustDropped] = useState(false);
  
  const timelineRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Constants for timeline layout
  const HOUR_HEIGHT = 60;
  const DAY_WIDTH = 200;
  const START_HOUR = 6;
  const END_HOUR = 22;
  const TIME_LABEL_WIDTH = 80;
  const HOURS = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => i + START_HOUR);
  
  // Calculate date ranges based on selected view - memoized to prevent infinite loops
  const dateRange = useMemo(() => {
    const start = startOfDay(currentDate);
    
    switch (selectedTimeRange) {
      case 'day':
        return { start, end: endOfDay(currentDate), days: [currentDate] };
      case 'week': {
        const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 }); // Monday start
        const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
        const days = [];
        let day = weekStart;
        while (day <= weekEnd) {
          days.push(new Date(day));
          day = addDays(day, 1);
        }
        return { start: weekStart, end: weekEnd, days };
      }
      case 'month': {
        const monthStart = startOfMonth(currentDate);
        const monthEnd = endOfMonth(currentDate);
        return { start: monthStart, end: monthEnd, days: [] };
      }
      default:
        return { start, end: endOfDay(currentDate), days: [currentDate] };
    }
  }, [currentDate, selectedTimeRange]);

  const { start: startDate, end: endDate, days } = dateRange;

  // Format hour for display
  const formatHour = (hour: number): string => {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour} ${period}`;
  };

  // Fetch events and data
  const fetchData = useCallback(async (start: Date, end: Date) => {
    if (!user) {
      console.log('No user found, skipping fetch');
      setLoading(false);
      return;
    }
    
    console.log('Fetching events for:', { userId: user.id, startDate: start.toISOString(), endDate: end.toISOString() });
    
    try {
      setLoading(true);
      setError(null);
      
      const { data: events, error: eventsError } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('user_id', user.id)
        .gte('start_time', start.toISOString())
        .lte('end_time', end.toISOString())
        .order('start_time', { ascending: true });
      
      if (eventsError) {
        console.error('Supabase error:', eventsError);
        throw eventsError;
      }
      
      console.log('Successfully fetched events:', events?.length || 0);
      setEvents(events || []);
    } catch (err) {
      console.error('Error fetching events:', err);
      setError(err instanceof Error ? err.message : 'Failed to load events');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Navigation functions
  const navigateDate = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      switch (selectedTimeRange) {
        case 'day':
          return addDays(prev, direction === 'next' ? 1 : -1);
        case 'week':
          return addDays(prev, direction === 'next' ? 7 : -7);
        case 'month':
          const newMonth = new Date(prev);
          newMonth.setMonth(prev.getMonth() + (direction === 'next' ? 1 : -1));
          return newMonth;
        default:
          return prev;
      }
    });
  };

  // Get day index for an event
  const getDayIndex = (eventDate: Date): number => {
    return days.findIndex((day: Date) => isSameDay(day, eventDate));
  };

  // Calculate event position and style
  const getEventStyle = (event: Event): React.CSSProperties | null => {
    const startTime = parseISO(event.start_time);
    const endTime = parseISO(event.end_time);
    const dayIndex = getDayIndex(startTime);
    
    if (dayIndex === -1) return null;
    
    // Calculate position
    const startMinutes = (startTime.getHours() - START_HOUR) * 60 + startTime.getMinutes();
    const duration = differenceInMinutes(endTime, startTime);
    
    const top = (startMinutes / 60) * HOUR_HEIGHT;
    const height = Math.max(30, (duration / 60) * HOUR_HEIGHT);
    const left = dayIndex * DAY_WIDTH;
    const width = DAY_WIDTH - 10;
    
    return {
      position: 'absolute',
      top: `${top}px`,
      height: `${height}px`,
      left: `${left}px`,
      width: `${width}px`,
      zIndex: dragState.draggedEvent?.id === event.id ? 1000 : 10,
      cursor: 'grab'
    };
  };

  // Get event color - use color property if available, fallback to type-based colors
  const getEventColor = (event: Event): string => {
    if (event.color) {
      return event.color;
    }
    
    // Fallback to type-based colors
    const typeColors = {
      academic: '#10B981', // emerald
      career: '#3B82F6',   // blue
      wellness: '#8B5CF6', // purple
      social: '#EC4899'    // pink
    };
    return typeColors[event.type] || '#6B7280'; // gray fallback
  };

  // Get event color class for styling
  const getEventColorClass = (event: Event): string => {
    const color = getEventColor(event);
    return `bg-white dark:bg-gray-800 border-l-4 text-gray-900 dark:text-white shadow-sm`;
  };

  // Drag and drop functionality
  const handleMouseDown = useCallback((event: Event, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();
    
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const timelineRect = timelineRef.current?.getBoundingClientRect();
    
    if (!timelineRect) return;
    
    // Calculate offset from mouse position to element position
    const offset = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
    
    // Create a local drag state that we can update
    let localDragState: DragState = {
      isDragging: true,
      draggedEvent: event,
      startX: e.clientX,
      startY: e.clientY,
      currentX: e.clientX,
      currentY: e.clientY,
      offset,
      hasMoved: false
    };
    
    setDragState(localDragState);
    
    // Capture start position for closure
    const startX = e.clientX;
    const startY = e.clientY;
    
    // Add global event listeners
    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      
      const deltaX = Math.abs(e.clientX - startX);
      const deltaY = Math.abs(e.clientY - startY);
      const hasMoved = deltaX > 5 || deltaY > 5; // 5px threshold for drag detection
      
      // Update local state
      localDragState = {
        ...localDragState,
        currentX: e.clientX,
        currentY: e.clientY,
        hasMoved
      };
      
      setDragState(localDragState);
    };
    
    const handleMouseUp = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      
      console.log('Mouse up - local drag state:', localDragState);
      
      // Handle drop with the captured local drag state
      handleDrop(localDragState);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, []);

  // Handle drop logic
  const handleDrop = useCallback(async (currentDragState?: DragState) => {
    const activeDragState = currentDragState || dragState;
    console.log('=== HANDLE DROP CALLED ===');
    console.log('Drag state:', activeDragState);
    
    if (!activeDragState.isDragging || !activeDragState.draggedEvent || !timelineRef.current) {
      console.log('Early return: missing requirements');
      setDragState(prev => ({ 
        ...prev, 
        isDragging: false, 
        draggedEvent: null,
        hasMoved: false
      }));
      return;
    }

    // Only update position if the user actually moved the event significantly
    if (activeDragState.hasMoved) {
      console.log('Processing drop for moved event');
      const timelineRect = timelineRef.current.getBoundingClientRect();
      const x = activeDragState.currentX - timelineRect.left;
      const y = activeDragState.currentY - timelineRect.top;
      
              console.log('Timeline rect:', timelineRect);
        console.log('Raw drop position:', { x, y, currentX: activeDragState.currentX, currentY: activeDragState.currentY });
        
        // Calculate new position
        const dayIndex = Math.floor(x / DAY_WIDTH);
        const hourFloat = (y / HOUR_HEIGHT) + START_HOUR;
        const hour = Math.floor(hourFloat);
        const minute = Math.round((hourFloat - hour) * 60 / 15) * 15; // Snap to 15min intervals
        
        console.log('Calculated position:', { 
          dayIndex, 
          hour, 
          minute, 
          dayWidth: DAY_WIDTH, 
          hourHeight: HOUR_HEIGHT,
          startHour: START_HOUR,
          endHour: END_HOUR,
          daysLength: days.length
        });
        
        if (dayIndex >= 0 && dayIndex < days.length && hour >= START_HOUR && hour <= END_HOUR) {
          const targetDay = days[dayIndex];
          const newStartTime = new Date(targetDay);
          newStartTime.setHours(hour, minute, 0, 0);
          
          const originalStart = parseISO(activeDragState.draggedEvent.start_time);
          const originalEnd = parseISO(activeDragState.draggedEvent.end_time);
          const duration = differenceInMinutes(originalEnd, originalStart);
          
          const newEndTime = new Date(newStartTime);
          newEndTime.setMinutes(newEndTime.getMinutes() + duration);
          
          console.log('=== UPDATING EVENT ===');
          console.log('Original time:', activeDragState.draggedEvent.start_time);
          console.log('New time:', newStartTime.toISOString());
          console.log('Target day:', targetDay);
          console.log('Duration:', duration, 'minutes');
          
          // Update event and wait for it to complete
          const updatedEvent = {
            ...activeDragState.draggedEvent,
            start_time: newStartTime.toISOString(),
            end_time: newEndTime.toISOString()
          };
         
         try {
           await updateEvent(updatedEvent);
           console.log('Event update completed successfully');
           
           // Force a re-fetch to ensure UI is updated
           setTimeout(() => {
             console.log('Triggering data refresh');
             fetchData(startDate, endDate);
           }, 200);
         } catch (error) {
           console.error('Event update failed:', error);
         }
      } else {
        console.log('Drop position out of bounds:', { 
          dayIndex, 
          hour, 
          daysLength: days.length,
          startHour: START_HOUR,
          endHour: END_HOUR
        });
      }
      
      // Set flag to prevent timeline click from firing
      setJustDropped(true);
      setTimeout(() => setJustDropped(false), 300);
    } else {
      console.log('Event not moved significantly, skipping position update');
    }
    
    console.log('Resetting drag state');
    setDragState({
      isDragging: false,
      draggedEvent: null,
      startX: 0,
      startY: 0,
      currentX: 0,
      currentY: 0,
      offset: { x: 0, y: 0 },
      hasMoved: false
    });
  }, [dragState, days, fetchData, startDate, endDate]);

  // Update event (existing function)
  const updateEvent = async (updatedEvent: Event) => {
    console.log('=== UPDATE EVENT CALLED ===');
    console.log('Event to update:', updatedEvent);
    
    if (!user) return;
    
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('calendar_events')
        .update({
          title: updatedEvent.title,
          description: updatedEvent.description,
          start_time: updatedEvent.start_time,
          end_time: updatedEvent.end_time,
          type: updatedEvent.type,
          location: updatedEvent.location,
          color: updatedEvent.color,
          updated_at: new Date().toISOString()
        })
        .eq('id', updatedEvent.id)
        .eq('user_id', user.id)
        .select();

      if (error) throw error;

      console.log('Event updated successfully:', data);
      
      // Update local state
      setEvents(prevEvents => 
        prevEvents.map(event => 
          event.id === updatedEvent.id ? updatedEvent : event
        )
      );
      
    } catch (error) {
      console.error('Error updating event:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Handle event click for editing
  const handleEventClick = (event: Event, e: React.MouseEvent) => {
    // Don't open modal if we're dragging
    if (dragState.isDragging || dragState.hasMoved) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    setEditingEvent(event);
    setShowEventModal(true);
  };

  // Handle edit form submission
  const handleEditSubmit = async (title: string, description: string, type: EventType) => {
    if (!editingEvent || !user) return;
    
    try {
      const updatedEvent = {
        ...editingEvent,
        title,
        description,
        type,
        color: getEventColor({ ...editingEvent, type }) // Update color based on type
      };
      
      await updateEvent(updatedEvent);
      setShowEventModal(false);
      setEditingEvent(null);
    } catch (error) {
      console.error('Error updating event:', error);
    }
  };

  // Handle timeline click for creating events
  const handleTimelineClick = (e: React.MouseEvent) => {
    // Prevent click if we're dragging or just dropped an event
    if (dragState.isDragging || dragState.hasMoved || justDropped) return;
    
    const timelineRect = timelineRef.current?.getBoundingClientRect();
    if (!timelineRect) return;
    
    const x = e.clientX - timelineRect.left;
    const y = e.clientY - timelineRect.top;
    
    const dayIndex = Math.floor(x / DAY_WIDTH);
    const hourFloat = (y / HOUR_HEIGHT) + START_HOUR;
    const hour = Math.floor(hourFloat);
    const minute = Math.round((hourFloat - hour) * 60 / 15) * 15;
    
    if (dayIndex >= 0 && dayIndex < days.length && hour >= START_HOUR && hour <= END_HOUR) {
      const targetDay = days[dayIndex];
      const startTime = new Date(targetDay);
      startTime.setHours(hour, minute, 0, 0);
      
      const endTime = new Date(startTime);
      endTime.setMinutes(endTime.getMinutes() + 60); // Default 1 hour duration
      
      setSelectedTimeSlot({ start: startTime, end: endTime });
      setShowEventModal(true);
    }
  };

  // Event creation
  const createEvent = async (eventData: { title: string; description: string; type: EventType }) => {
    if (!selectedTimeSlot || !user) return;
    
    try {
      const newEvent: Partial<Event> = {
        user_id: user.id,
        title: eventData.title,
        description: eventData.description,
        start_time: selectedTimeSlot.start.toISOString(),
        end_time: selectedTimeSlot.end.toISOString(),
        type: eventData.type,
        status: 'pending',
        source: 'manual'
      };
      
      const { data, error } = await supabase
        .from('calendar_events')
        .insert([newEvent])
        .select()
        .single();
      
      if (error) throw error;
      
      setEvents(prev => [...prev, data]);
      setShowEventModal(false);
      setSelectedTimeSlot(null);
      
      eventBus.emit(CALENDAR_EVENTS.ADDED, data);
    } catch (err) {
      console.error('Error creating event:', err);
      setError('Failed to create event');
    }
  };

  // Effects
  useEffect(() => {
    console.log('Effect triggered, user:', !!user);
    if (user) {
      fetchData(startDate, endDate);
    } else {
      // If no user, stop loading
      setLoading(false);
    }
  }, [user, startDate, endDate, fetchData]);

  // Debug: Log when events change
  useEffect(() => {
    console.log('Events array updated, count:', events.length);
    events.forEach((event, index) => {
      console.log(`Event ${index}:`, event.title, 'at', event.start_time);
    });
  }, [events]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && dragState.isDragging) {
        setDragState({
          isDragging: false,
          draggedEvent: null,
          startX: 0,
          startY: 0,
          currentX: 0,
          currentY: 0,
          offset: { x: 0, y: 0 },
          hasMoved: false
        });
        setJustDropped(false);
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [dragState.isDragging]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-red-500 dark:text-red-400 text-center">
          <p className="text-lg font-medium">Error loading events</p>
          <p className="text-sm mt-2">{error}</p>
          <Button onClick={() => fetchData(startDate, endDate)} className="mt-4">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900" ref={containerRef}>
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex-shrink-0">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Calendar className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Time Management
            </h1>
          </div>
          
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {selectedTimeRange === 'day' && format(currentDate, 'EEEE, MMMM d, yyyy')}
            {selectedTimeRange === 'week' && `${format(startDate, 'MMM d')} - ${format(endDate, 'MMM d, yyyy')}`}
            {selectedTimeRange === 'month' && format(currentDate, 'MMMM yyyy')}
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* View Toggle */}
          <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            {(['day', 'week', 'month'] as const).map((view) => (
              <button
                key={view}
                onClick={() => setSelectedTimeRange(view)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  selectedTimeRange === view
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {view.charAt(0).toUpperCase() + view.slice(1)}
              </button>
            ))}
          </div>

          {/* Navigation */}
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigateDate('prev')}
              className="h-8 w-8"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentDate(new Date())}
              className="text-xs"
            >
              Today
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigateDate('next')}
              className="h-8 w-8"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {/* Actions */}
          <Button
            onClick={() => setShowEventModal(true)}
            className="flex items-center space-x-2"
            size="sm"
          >
            <Plus className="w-4 h-4" />
            <span>New Event</span>
          </Button>
        </div>
      </div>

      {/* Calendar Content */}
      <div className="flex-1 overflow-hidden">
        {selectedTimeRange === 'month' ? (
          <MonthView
            selectedDate={currentDate}
            events={events}
            tasks={[]}
            onEventClick={() => {}}
            onTaskClick={() => {}}
            onDateClick={(date) => {
              setCurrentDate(date);
              setSelectedTimeRange('day');
            }}
          />
        ) : (
          <div className="h-full flex">
            {/* Time Labels */}
            <div 
              className="bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex-shrink-0"
              style={{ width: TIME_LABEL_WIDTH }}
            >
              <div className="h-16 border-b border-gray-200 dark:border-gray-700" /> {/* Header space */}
              {HOURS.map((hour) => (
                <div
                  key={hour}
                  className="flex items-start justify-end pr-3 pt-1 text-xs text-gray-500 dark:text-gray-400 font-medium border-b border-gray-100 dark:border-gray-800"
                  style={{ height: HOUR_HEIGHT }}
                >
                  {formatHour(hour)}
                </div>
              ))}
            </div>

            {/* Timeline */}
            <div className="flex-1 overflow-auto">
              <div className="relative">
                {/* Day Headers */}
                <div className="h-16 flex border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 sticky top-0 z-20">
                  {days.map((day: Date, index: number) => (
                    <div
                      key={day.toISOString()}
                      className="border-r border-gray-200 dark:border-gray-700 last:border-r-0 p-4"
                      style={{ width: DAY_WIDTH }}
                    >
                      <div className="text-center">
                        <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                          {format(day, 'EEE')}
                        </div>
                        <div className={`text-lg font-semibold mt-1 ${
                          isSameDay(day, new Date()) 
                            ? 'text-emerald-600 dark:text-emerald-400' 
                            : 'text-gray-900 dark:text-white'
                        }`}>
                          {format(day, 'd')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Timeline Grid */}
                <div 
                  className="relative bg-white dark:bg-gray-900"
                  onClick={handleTimelineClick}
                  style={{ 
                    height: HOURS.length * HOUR_HEIGHT,
                    width: days.length * DAY_WIDTH
                  }}
                  ref={timelineRef}
                >
                  {/* Hour Grid Lines */}
                  {HOURS.map((hour, index) => (
                    <div
                      key={hour}
                      className="absolute inset-x-0 border-t border-gray-100 dark:border-gray-800"
                      style={{ top: index * HOUR_HEIGHT }}
                    />
                  ))}

                  {/* Day Grid Lines */}
                  {days.map((_: Date, index: number) => (
                    <div
                      key={index}
                      className="absolute inset-y-0 border-r border-gray-100 dark:border-gray-800"
                      style={{ left: index * DAY_WIDTH }}
                    />
                  ))}

                  {/* Events */}
                  {events.map((event) => {
                    const style = getEventStyle(event);
                    if (!style) return null;
                    
                    const colorClass = getEventColorClass(event);
                    const eventColor = getEventColor(event);
                    const isDragging = dragState.draggedEvent?.id === event.id;
                    
                    return (
                      <div
                        key={event.id}
                        className={`${colorClass} rounded-lg p-2 hover:shadow-md transition-all duration-200 select-none cursor-pointer ${isDragging ? 'opacity-30 scale-95' : 'hover:scale-[1.02]'}`}
                        style={{
                          ...style,
                          borderLeftColor: eventColor,
                          backgroundColor: `${eventColor}15` // 15% opacity
                        }}
                        onMouseDown={(e) => handleMouseDown(event, e)}
                        onClick={(e) => handleEventClick(event, e)}
                      >
                        <div className="font-medium text-sm truncate">
                          {event.title}
                        </div>
                        <div className="text-xs opacity-70 mt-1">
                          {format(parseISO(event.start_time), 'h:mm a')} - {format(parseISO(event.end_time), 'h:mm a')}
                        </div>
                        {event.location && (
                          <div className="text-xs opacity-60 truncate">
                            📍 {event.location}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Drag Preview */}
                  {dragState.isDragging && dragState.draggedEvent && (
                    <div
                      className="fixed pointer-events-none z-[9999] opacity-90 transform rotate-2 scale-105 shadow-2xl"
                      style={{
                        left: dragState.currentX - dragState.offset.x,
                        top: dragState.currentY - dragState.offset.y,
                        width: DAY_WIDTH - 10,
                        height: Math.max(30, (differenceInMinutes(
                          parseISO(dragState.draggedEvent.end_time),
                          parseISO(dragState.draggedEvent.start_time)
                        ) / 60) * HOUR_HEIGHT)
                      }}
                    >
                                             <div 
                         className="bg-white dark:bg-gray-800 rounded-lg border-l-4 p-2 shadow-lg ring-2 ring-white"
                         style={{ borderLeftColor: getEventColor(dragState.draggedEvent) }}
                       >
                        <div className="font-medium text-sm truncate">
                          {dragState.draggedEvent.title}
                        </div>
                        <div className="text-xs opacity-90 mt-1">
                          {format(parseISO(dragState.draggedEvent.start_time), 'h:mm a')} - {format(parseISO(dragState.draggedEvent.end_time), 'h:mm a')}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Drop Target Indicator */}
                  {dragState.isDragging && dragState.hasMoved && dragState.draggedEvent && (() => {
                    const timelineRect = timelineRef.current?.getBoundingClientRect();
                    if (!timelineRect || !dragState.draggedEvent) return null;
                    
                    const x = dragState.currentX - timelineRect.left;
                    const y = dragState.currentY - timelineRect.top;
                    const dayIndex = Math.floor(x / DAY_WIDTH);
                    const hourFloat = (y / HOUR_HEIGHT) + START_HOUR;
                    const hour = Math.floor(hourFloat);
                    const minute = Math.round((hourFloat - hour) * 60 / 15) * 15;
                    
                    if (dayIndex >= 0 && dayIndex < days.length && hour >= START_HOUR && hour <= END_HOUR) {
                      const top = ((hour - START_HOUR) * 60 + minute) * (HOUR_HEIGHT / 60);
                      const duration = differenceInMinutes(
                        parseISO(dragState.draggedEvent.end_time),
                        parseISO(dragState.draggedEvent.start_time)
                      );
                      const height = Math.max(30, (duration / 60) * HOUR_HEIGHT);
                      
                      return (
                        <div
                          className="absolute bg-emerald-200 dark:bg-emerald-800 border-2 border-dashed border-emerald-400 dark:border-emerald-600 rounded-lg opacity-60 pointer-events-none"
                          style={{
                            left: dayIndex * DAY_WIDTH + 2,
                            top: top,
                            width: DAY_WIDTH - 14,
                            height: height,
                            zIndex: 5
                          }}
                        >
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300 bg-white dark:bg-gray-800 px-2 py-1 rounded">
                              Drop Here
                            </span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Event Creation/Edit Modal */}
      <EventCreationModal
        timeBlock={{
          id: 'temp',
          start: selectedTimeSlot?.start || new Date(),
          end: selectedTimeSlot?.end || new Date(),
          type: editingEvent?.type || 'academic',
          available: true
        }}
        isOpen={showEventModal}
        onClose={() => {
          setShowEventModal(false);
          setSelectedTimeSlot(null);
          setEditingEvent(null);
        }}
        onSubmit={editingEvent ? handleEditSubmit : (title, description, type) => createEvent({ title, description, type })}
        editingEvent={editingEvent}
      />
    </div>
  );
} 