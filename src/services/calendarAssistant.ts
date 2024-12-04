import { supabase } from '../config/supabase';
import { Event } from '../types';
import { logger } from '../utils/logger';
import { parseCommandResponse } from './llm/parser';
import { llmService } from './llm';
import { SYSTEM_PROMPT, createUserPrompt } from './llm/prompts';
import { eventManager } from './eventManager';
import { eventBus, CALENDAR_EVENTS } from './eventBus';
import { formatDateTime } from '../utils/dateUtils';

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
      const startDate = new Date(command.dates.start);
      const [startHours, startMinutes] = (command.eventDetails.startTime || '09:00').split(':');
      startDate.setHours(parseInt(startHours), parseInt(startMinutes), 0, 0);

      const endDate = command.dates.end ? new Date(command.dates.end) : new Date(startDate);
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
        source: 'manual'
      };

      await eventManager.addEvent(event as Event, userId);

      return {
        response: `Added "${event.title}" to your calendar for ${formatDateTime(startDate)} to ${formatDateTime(endDate)}`,
        action: 'add_event'
      };
    } catch (error) {
      logger.error('Error adding event:', { error, command });
      throw new Error("I couldn't add the event to your calendar. Please try again with a different format.");
    }
  }

  // ... rest of the class implementation remains the same ...
}