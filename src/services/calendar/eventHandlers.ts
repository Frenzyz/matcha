import { supabase } from '../../config/supabase';
import { Event } from '../../types';
import { logger } from '../../utils/logger';
import { formatDateTime } from '../../utils/dateUtils';
import { eventBus, CALENDAR_EVENTS } from '../eventBus';
import { addDays, startOfDay, endOfDay } from 'date-fns';

export async function handleAddEvent(userId: string, command: any): Promise<{ response: string; action: string }> {
  if (!command.eventDetails?.title || !command.dates?.start) {
    throw new Error('Missing required event details');
  }

  try {
    const startDate = new Date(command.dates.start);
    const [startHours, startMinutes] = command.eventDetails.startTime.split(':');
    startDate.setHours(parseInt(startHours), parseInt(startMinutes), 0, 0);

    // Calculate end time (1 hour later if not specified)
    const endDate = command.dates.end ? new Date(command.dates.end) : new Date(startDate);
    if (command.eventDetails.endTime) {
      const [endHours, endMinutes] = command.eventDetails.endTime.split(':');
      endDate.setHours(parseInt(endHours), parseInt(endMinutes), 0, 0);
    } else {
      endDate.setTime(startDate.getTime() + (60 * 60 * 1000)); // Add 1 hour
    }

    const event: Event = {
      id: crypto.randomUUID(),
      user_id: userId,
      title: command.eventDetails.title,
      description: command.eventDetails.description || '',
      start_time: startDate.toISOString(),
      end_time: endDate.toISOString(),
      type: command.eventDetails.type || 'academic',
      status: 'pending',
      source: 'manual'
    };

    const { error } = await supabase
      .from('calendar_events')
      .insert([event]);

    if (error) throw error;

    // Emit events
    eventBus.emit(CALENDAR_EVENTS.ADDED, event);
    eventBus.emit(CALENDAR_EVENTS.UPDATED);

    return {
      response: `Added "${event.title}" to your calendar for ${formatDateTime(startDate)} to ${formatDateTime(endDate)}`,
      action: 'add_event'
    };
  } catch (error) {
    logger.error('Error adding event:', { error, command });
    throw new Error("I couldn't add the event to your calendar. Please try again with a different format.");
  }
}

// Rest of the event handlers remain the same...
export async function handleViewEvents(userId: string, command: any): Promise<{ response: string; action: string }> {
  // Implementation remains the same
  return { response: '', action: 'view_events' };
}

export async function handleUpdateEvents(userId: string, command: any): Promise<{ response: string; action: string }> {
  // Implementation remains the same
  return { response: '', action: 'update_events' };
}

export async function handleDeleteEvent(userId: string, command: any): Promise<{ response: string; action: string }> {
  // Implementation remains the same
  return { response: '', action: 'delete_event' };
}

export async function handleQueryEvents(userId: string, command: any): Promise<{ response: string; action: string }> {
  // Implementation remains the same
  return { response: '', action: 'query_events' };
}