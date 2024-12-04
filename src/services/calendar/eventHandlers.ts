import { supabase } from '../../config/supabase';
import { Event } from '../../types';
import { logger } from '../../utils/logger';
import { formatDateTime } from '../../utils/dateUtils';
import { eventBus, CALENDAR_EVENTS } from '../eventBus';
import { addDays, startOfDay, endOfDay, parseISO } from 'date-fns';

export async function handleAddEvent(userId: string, command: any): Promise<string> {
  if (!command.eventDetails?.title || !command.dates?.start) {
    throw new Error('Missing required event details');
  }

  try {
    const startDate = parseISO(command.dates.start);
    const [startHours, startMinutes] = (command.eventDetails.startTime || '09:00').split(':');
    startDate.setHours(parseInt(startHours), parseInt(startMinutes), 0, 0);

    const endDate = command.dates.end ? parseISO(command.dates.end) : new Date(startDate);
    if (command.eventDetails.endTime) {
      const [endHours, endMinutes] = command.eventDetails.endTime.split(':');
      endDate.setHours(parseInt(endHours), parseInt(endMinutes), 0, 0);
    } else {
      endDate.setHours(startDate.getHours() + 1, startDate.getMinutes(), 0, 0);
    }

    const event: Partial<Event> = {
      id: crypto.randomUUID(),
      user_id: userId,
      title: command.eventDetails.title,
      description: command.eventDetails.description || '',
      start_time: startDate.toISOString(),
      end_time: endDate.toISOString(),
      type: command.eventDetails.type || 'social',
      status: 'pending',
      source: 'manual',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('calendar_events')
      .insert([event]);

    if (error) throw error;

    // Emit event added and updated
    eventBus.emit(CALENDAR_EVENTS.ADDED, event);
    eventBus.emit(CALENDAR_EVENTS.UPDATED);

    return `Added "${event.title}" to your calendar for ${formatDateTime(startDate)} to ${formatDateTime(endDate)}`;
  } catch (error) {
    logger.error('Error adding event:', { error, command });
    throw new Error("I couldn't add the event to your calendar. Please try again with a different format.");
  }
}

export async function handleViewEvents(userId: string, command: any): Promise<string> {
  try {
    let startDate: Date;
    let endDate: Date;

    switch (command.timeRange) {
      case 'today':
        startDate = startOfDay(new Date());
        endDate = endOfDay(new Date());
        break;
      case 'tomorrow':
        startDate = startOfDay(addDays(new Date(), 1));
        endDate = endOfDay(addDays(new Date(), 1));
        break;
      case 'week':
        startDate = startOfDay(new Date());
        endDate = endOfDay(addDays(new Date(), 7));
        break;
      default:
        if (command.dates?.start) {
          startDate = startOfDay(parseISO(command.dates.start));
          endDate = command.dates.end 
            ? endOfDay(parseISO(command.dates.end))
            : endOfDay(startDate);
        } else {
          startDate = startOfDay(new Date());
          endDate = endOfDay(new Date());
        }
    }

    const { data: events, error } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('user_id', userId)
      .gte('start_time', startDate.toISOString())
      .lte('end_time', endDate.toISOString())
      .order('start_time', { ascending: true });

    if (error) throw error;

    if (!events || events.length === 0) {
      return `You have no events scheduled between ${formatDateTime(startDate)} and ${formatDateTime(endDate)}.`;
    }

    const eventList = events
      .map(event => `- ${event.title} at ${formatDateTime(new Date(event.start_time))} (${event.status})`)
      .join('\n');

    return `Here are your events between ${formatDateTime(startDate)} and ${formatDateTime(endDate)}:\n${eventList}`;
  } catch (error) {
    logger.error('Error viewing events:', { error, command });
    throw new Error("I couldn't retrieve your events. Please try again.");
  }
}

export async function handleUpdateEvents(userId: string, command: any): Promise<string> {
  try {
    const startDate = startOfDay(new Date());
    const endDate = endOfDay(new Date());

    let query = supabase
      .from('calendar_events')
      .update({
        status: command.eventDetails.status || 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .gte('start_time', startDate.toISOString())
      .lte('end_time', endDate.toISOString());

    if (command.eventDetails.title) {
      query = query.ilike('title', `%${command.eventDetails.title}%`);
    }

    const { error, count } = await query;
    if (error) throw error;

    // Emit events modified and updated
    eventBus.emit(CALENDAR_EVENTS.MODIFIED);
    eventBus.emit(CALENDAR_EVENTS.UPDATED);

    return `Updated ${count} event${count !== 1 ? 's' : ''} to ${command.eventDetails.status || 'completed'}.`;
  } catch (error) {
    logger.error('Error updating events:', { error, command });
    throw new Error("I couldn't update the events. Please try again.");
  }
}

export async function handleDeleteEvent(userId: string, command: any): Promise<string> {
  if (!command.eventDetails?.title) {
    throw new Error('Event title is required for deletion');
  }

  try {
    const { data: events, error: findError } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('user_id', userId)
      .ilike('title', `%${command.eventDetails.title}%`);

    if (findError) throw findError;
    if (!events || events.length === 0) {
      return `No events found matching "${command.eventDetails.title}"`;
    }

    const { error: deleteError } = await supabase
      .from('calendar_events')
      .delete()
      .eq('id', events[0].id);

    if (deleteError) throw deleteError;

    // Emit events deleted and updated
    eventBus.emit(CALENDAR_EVENTS.DELETED, events[0]);
    eventBus.emit(CALENDAR_EVENTS.UPDATED);

    return `Deleted event "${events[0].title}"`;
  } catch (error) {
    logger.error('Error deleting event:', { error, command });
    throw new Error("I couldn't delete the event. Please try again.");
  }
}

export async function handleQueryEvents(userId: string, command: any): Promise<string> {
  if (!command.eventDetails?.title) {
    throw new Error('Search term is required');
  }

  try {
    const { data: events, error } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('user_id', userId)
      .ilike('title', `%${command.eventDetails.title}%`)
      .order('start_time', { ascending: true });

    if (error) throw error;

    if (!events || events.length === 0) {
      return `No events found matching "${command.eventDetails.title}"`;
    }

    const eventList = events
      .map(event => `- ${event.title} on ${formatDateTime(new Date(event.start_time))}`)
      .join('\n');

    return `Found ${events.length} matching event${events.length !== 1 ? 's' : ''}:\n${eventList}`;
  } catch (error) {
    logger.error('Error querying events:', { error, command });
    throw new Error("I couldn't search for events. Please try again.");
  }
}