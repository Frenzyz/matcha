import { supabase } from '../../config/supabase';
import { Event } from '../../types';
import { logger } from '../../utils/logger';
import { eventBus, CALENDAR_EVENTS } from '../eventBus';
import { parseISO, startOfWeek, endOfWeek, isWithinInterval } from 'date-fns';
import { formatDateTime } from '../../utils/dateUtils';

export async function handleViewWeekEvents(userId: string): Promise<{ response: string; action: string }> {
  try {
    const now = new Date();
    const weekStart = startOfWeek(now);
    const weekEnd = endOfWeek(now);

    const { data: events, error } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('user_id', userId)
      .gte('start_time', weekStart.toISOString())
      .lte('start_time', weekEnd.toISOString())
      .order('start_time', { ascending: true });

    if (error) throw error;

    if (!events || events.length === 0) {
      return {
        response: 'You have no events scheduled for this week.',
        action: 'view_events_empty'
      };
    }

    const eventList = events
      .filter(event => {
        const eventDate = parseISO(event.start_time);
        return isWithinInterval(eventDate, { start: weekStart, end: weekEnd });
      })
      .map(event => `- ${event.title} at ${formatDateTime(parseISO(event.start_time))}`)
      .join('\n');

    return {
      response: `Here are your events for this week:\n${eventList}`,
      action: 'view_events'
    };
  } catch (error) {
    logger.error('Error viewing week events:', error);
    throw error;
  }
}

export async function handleAddEvent(event: Event): Promise<void> {
  try {
    const { error } = await supabase
      .from('calendar_events')
      .insert([{
        ...event,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }]);

    if (error) throw error;

    eventBus.emit(CALENDAR_EVENTS.ADDED, event);
    eventBus.emit(CALENDAR_EVENTS.UPDATED);
  } catch (error) {
    logger.error('Error adding event:', error);
    throw error;
  }
}

export async function handleUpdateEvent(event: Event): Promise<void> {
  try {
    const { error } = await supabase
      .from('calendar_events')
      .update({
        ...event,
        updated_at: new Date().toISOString()
      })
      .eq('id', event.id)
      .eq('user_id', event.user_id);

    if (error) throw error;

    eventBus.emit(CALENDAR_EVENTS.MODIFIED, event);
    eventBus.emit(CALENDAR_EVENTS.UPDATED);
  } catch (error) {
    logger.error('Error updating event:', error);
    throw error;
  }
}

export async function handleDeleteEvent(eventId: string, userId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('calendar_events')
      .delete()
      .eq('id', eventId)
      .eq('user_id', userId);

    if (error) throw error;

    eventBus.emit(CALENDAR_EVENTS.DELETED, { id: eventId });
    eventBus.emit(CALENDAR_EVENTS.UPDATED);
  } catch (error) {
    logger.error('Error deleting event:', error);
    throw error;
  }
}