import { parseDate, addTimeToDate } from '../../utils/dateUtils';
import { Event } from '../../types';
import { logger } from '../../utils/logger';

interface EventCommand {
  dates?: {
    start: string;
    end?: string;
  };
  eventDetails?: {
    title?: string;
    description?: string;
    startTime?: string;
    endTime?: string;
    type?: string;
  };
}

export function parseEventCommand(command: EventCommand, userId: string): Event {
  try {
    if (!command.eventDetails?.title || !command.dates?.start) {
      throw new Error('Event title and start date are required');
    }

    // Parse start date and time
    const startDate = parseDate(command.dates.start, command.eventDetails.startTime);
    
    // Calculate end date/time
    let endDate;
    if (command.dates.end) {
      endDate = parseDate(command.dates.end, command.eventDetails.endTime);
    } else {
      // Default to 1 hour duration if no end time specified
      endDate = addTimeToDate(startDate);
    }

    // Validate date range
    if (endDate <= startDate) {
      throw new Error('End time must be after start time');
    }

    return {
      id: crypto.randomUUID(),
      user_id: userId,
      title: command.eventDetails.title.trim(),
      description: command.eventDetails.description?.trim() || '',
      start_time: startDate.toISOString(),
      end_time: endDate.toISOString(),
      type: command.eventDetails.type || 'academic',
      status: 'pending',
      source: 'manual'
    };
  } catch (error) {
    logger.error('Error parsing event command:', { error, command });
    throw error;
  }
}
