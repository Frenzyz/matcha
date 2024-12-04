import { supabase } from '../config/supabase';
import { Event } from '../types';
import { logger } from '../utils/logger';
import { parseCommandResponse } from './llm/parser';
import { llmService } from './llm';
import { SYSTEM_PROMPT, createUserPrompt } from './llm/prompts';
import { eventManager } from './eventManager';
import { formatDateTime } from '../utils/dateUtils';
import { parseISO, addHours, startOfWeek, endOfWeek, isWithinInterval } from 'date-fns';

interface CommandResult {
  response: string;
  action?: string;
}

export class CalendarAssistant {
  private static messageHistory: { role: 'user' | 'assistant'; content: string }[] = [];

  static clearContext() {
    this.messageHistory = [];
  }

  static async processCommand(userId: string, command: string): Promise<CommandResult> {
    if (!userId) {
      throw new Error('User ID is required');
    }

    try {
      logger.info('Processing calendar command:', { userId, command });

      this.messageHistory.push({ role: 'user', content: command });

      const currentDate = new Date().toISOString().split('T')[0];
      const userPrompt = createUserPrompt(command, currentDate);
      const interpretation = await llmService.generate(`${SYSTEM_PROMPT}\n\n${userPrompt}`);
      const parsedCommand = parseCommandResponse(interpretation);

      let result: CommandResult;
      
      try {
        switch (parsedCommand.action) {
          case 'add':
            result = await this.handleAddEvent(userId, parsedCommand);
            break;
          case 'view':
            result = await this.handleViewEvents(userId, parsedCommand);
            break;
          case 'update':
            result = await this.handleUpdateEvents(userId, parsedCommand);
            break;
          case 'delete':
            result = await this.handleDeleteEvent(userId, parsedCommand);
            break;
          case 'query':
            result = await this.handleQueryEvents(userId, parsedCommand);
            break;
          default:
            throw new Error('Unknown command action');
        }
      } catch (error) {
        logger.error('Error executing calendar command:', { error, command: parsedCommand });
        throw new Error('Failed to execute the calendar command. Please try again.');
      }

      this.messageHistory.push({ role: 'assistant', content: result.response });
      return result;
    } catch (error) {
      logger.error('Calendar assistant error:', { error, command });
      throw error;
    }
  }

  private static async handleAddEvent(userId: string, command: any): Promise<CommandResult> {
    if (!command.eventDetails?.title || !command.dates?.start) {
      throw new Error('Missing required event details');
    }

    try {
      // Parse start date and time
      let startDate = parseISO(command.dates.start);
      if (command.eventDetails.startTime) {
        const [hours, minutes] = command.eventDetails.startTime.split(':').map(Number);
        startDate.setHours(hours, minutes, 0, 0);
      } else {
        // Default to current time if no time specified
        const now = new Date();
        startDate.setHours(now.getHours(), now.getMinutes(), 0, 0);
      }

      // Calculate end time (1 hour later if not specified)
      let endDate;
      if (command.dates.end) {
        endDate = parseISO(command.dates.end);
        if (command.eventDetails.endTime) {
          const [hours, minutes] = command.eventDetails.endTime.split(':').map(Number);
          endDate.setHours(hours, minutes, 0, 0);
        } else {
          endDate = addHours(startDate, 1);
        }
      } else {
        endDate = addHours(startDate, 1);
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

      await eventManager.addEvent(event, userId);

      return {
        response: `Added "${event.title}" to your calendar for ${formatDateTime(startDate)} to ${formatDateTime(endDate)}`,
        action: 'add_event'
      };
    } catch (error) {
      logger.error('Error adding event:', { error, command });
      throw new Error("I couldn't add the event to your calendar. Please try again with a different format.");
    }
  }

  private static async handleViewEvents(userId: string, command: any): Promise<CommandResult> {
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
        .filter(event => isWithinInterval(new Date(event.start_time), { start: weekStart, end: weekEnd }))
        .map(event => `- ${event.title} at ${formatDateTime(new Date(event.start_time))}`)
        .join('\n');

      return {
        response: `Here are your events for this week:\n${eventList}`,
        action: 'view_events'
      };
    } catch (error) {
      logger.error('Error viewing events:', { error, command });
      throw new Error("I couldn't retrieve your events. Please try again.");
    }
  }

  private static async handleUpdateEvents(userId: string, command: any): Promise<CommandResult> {
    if (!command.eventDetails?.title) {
      throw new Error('Event title is required for update');
    }

    try {
      const { data: events, error: findError } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('user_id', userId)
        .ilike('title', `%${command.eventDetails.title}%`);

      if (findError) throw findError;
      if (!events || events.length === 0) {
        return {
          response: `No events found matching "${command.eventDetails.title}"`,
          action: 'update_events_not_found'
        };
      }

      const event = events[0];
      const updatedEvent = {
        ...event,
        status: command.eventDetails.status || 'completed',
        updated_at: new Date().toISOString()
      };

      await eventManager.updateEvent(updatedEvent);

      return {
        response: `Updated event "${event.title}" to ${updatedEvent.status}`,
        action: 'update_events'
      };
    } catch (error) {
      logger.error('Error updating events:', { error, command });
      throw new Error("I couldn't update the events. Please try again.");
    }
  }

  private static async handleDeleteEvent(userId: string, command: any): Promise<CommandResult> {
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
        return {
          response: `No events found matching "${command.eventDetails.title}"`,
          action: 'delete_event_not_found'
        };
      }

      await eventManager.deleteEvent(events[0].id, userId);

      return {
        response: `Deleted event "${events[0].title}"`,
        action: 'delete_event'
      };
    } catch (error) {
      logger.error('Error deleting event:', { error, command });
      throw new Error("I couldn't delete the event. Please try again.");
    }
  }

  private static async handleQueryEvents(userId: string, command: any): Promise<CommandResult> {
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
        return {
          response: `No events found matching "${command.eventDetails.title}"`,
          action: 'query_events_empty'
        };
      }

      const eventList = events
        .map(event => `- ${event.title} on ${formatDateTime(new Date(event.start_time))}`)
        .join('\n');

      return {
        response: `Found ${events.length} matching event${events.length !== 1 ? 's' : ''}:\n${eventList}`,
        action: 'query_events'
      };
    } catch (error) {
      logger.error('Error querying events:', { error, command });
      throw new Error("I couldn't search for events. Please try again.");
    }
  }
}