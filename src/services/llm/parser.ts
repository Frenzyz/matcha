import { logger } from '../../utils/logger';
import { addDays, format, startOfDay, endOfDay } from 'date-fns';

interface ParsedCommand {
  action: 'add' | 'view' | 'update' | 'delete' | 'query';
  timeRange?: string;
  dates?: {
    start: string;
    end: string;
  };
  eventDetails?: {
    title?: string;
    description?: string;
    startTime?: string;
    endTime?: string;
    type?: string;
  };
}

export function parseCommandResponse(response: string): ParsedCommand {
  try {
    // Clean up the response by removing any markdown code blocks and whitespace
    const cleanResponse = response
      .replace(/```json\n?|\n?```/g, '')
      .replace(/^[\s\n]*\{/, '{')
      .replace(/\}[\s\n]*$/, '}')
      .trim();

    // Try to parse the JSON
    let parsed: any;
    try {
      parsed = JSON.parse(cleanResponse);
    } catch (e) {
      logger.error('JSON parse error:', { error: e, response: cleanResponse });
      throw new Error('Invalid response format');
    }

    // Handle schedule/appointment format
    if (parsed.schedule || parsed.appointment) {
      return convertScheduleFormat(parsed);
    }

    // Handle event format
    if (parsed.event) {
      return convertEventFormat(parsed.event);
    }

    // Handle direct date format
    if (parsed.date || parsed.start) {
      return convertDateFormat(parsed);
    }

    // Validate the parsed command
    validateParsedCommand(parsed);

    return parsed;
  } catch (error) {
    logger.error('Failed to parse LLM response:', { response, error });
    throw new Error('Failed to understand the command. Please try rephrasing.');
  }
}

function validateParsedCommand(parsed: any): void {
  if (!parsed.action) {
    throw new Error('Missing required action field');
  }

  const validActions = ['add', 'view', 'update', 'delete', 'query'];
  if (!validActions.includes(parsed.action)) {
    throw new Error('Invalid action type');
  }

  if (parsed.action === 'add' && (!parsed.eventDetails?.title || !parsed.dates?.start)) {
    throw new Error('Missing required event details');
  }
}

function convertScheduleFormat(parsed: any): ParsedCommand {
  const schedule = parsed.schedule?.[0] || parsed.appointment;
  const startDate = new Date(schedule.date || schedule.start);
  const duration = schedule.duration?.match(/(\d+)/)?.[1] || '1';

  return {
    action: 'add',
    dates: {
      start: format(startDate, 'yyyy-MM-dd'),
      end: format(startDate, 'yyyy-MM-dd')
    },
    eventDetails: {
      title: schedule.event || schedule.type || 'New Event',
      startTime: format(startDate, 'HH:mm'),
      endTime: format(addDays(startDate, 0, parseInt(duration)), 'HH:mm'),
      type: 'social'
    }
  };
}

function convertEventFormat(event: any): ParsedCommand {
  const startDate = new Date(event.date || event.start);
  const endDate = event.end ? new Date(event.end) : addDays(startDate, 1);

  return {
    action: 'add',
    dates: {
      start: format(startDate, 'yyyy-MM-dd'),
      end: format(endDate, 'yyyy-MM-dd')
    },
    eventDetails: {
      title: event.title || event.summary || 'New Event',
      startTime: event.time || format(startDate, 'HH:mm'),
      endTime: format(addDays(startDate, event.duration ? parseInt(event.duration) : 1), 'HH:mm'),
      type: 'social'
    }
  };
}

function convertDateFormat(parsed: any): ParsedCommand {
  const startDate = new Date(parsed.date || parsed.start);
  const endDate = parsed.end ? new Date(parsed.end) : addDays(startDate, 1);

  return {
    action: 'view',
    dates: {
      start: format(startDate, 'yyyy-MM-dd'),
      end: format(endDate, 'yyyy-MM-dd')
    }
  };
}