import { parse, format, isValid, parseISO, startOfDay, endOfDay, addDays, addHours } from 'date-fns';
import { logger } from './logger';

export function parseDate(dateString: string, timeString?: string): Date {
  try {
    // Handle empty or invalid input
    if (!dateString) {
      throw new Error('Date string is required');
    }

    // Try parsing as ISO string first
    const parsedDate = parseISO(dateString);
    if (!isValid(parsedDate)) {
      throw new Error('Invalid date format');
    }

    // If time is provided, set it
    if (timeString) {
      const [hours, minutes] = timeString.split(':').map(Number);
      parsedDate.setHours(hours || 0, minutes || 0, 0, 0);
    }

    return parsedDate;
  } catch (error) {
    logger.error('Error parsing date:', { error, dateString, timeString });
    throw error;
  }
}

export function formatDateTime(date: Date): string {
  try {
    if (!isValid(date)) {
      throw new Error('Invalid date object');
    }
    return format(date, 'MMMM d, yyyy h:mm a');
  } catch (error) {
    logger.error('Error formatting date time:', { error, date });
    throw error;
  }
}

export function getDateRange(date: Date, days: number = 1): { start: Date; end: Date } {
  try {
    if (!isValid(date)) {
      throw new Error('Invalid date object');
    }
    return {
      start: startOfDay(date),
      end: endOfDay(addDays(date, days - 1))
    };
  } catch (error) {
    logger.error('Error getting date range:', { error, date, days });
    throw error;
  }
}

export function addTimeToDate(date: Date, hours: number = 1): Date {
  try {
    if (!isValid(date)) {
      throw new Error('Invalid date object');
    }
    return addHours(date, hours);
  } catch (error) {
    logger.error('Error adding time to date:', { error, date, hours });
    throw error;
  }
}

export function getCurrentDateTime(): { date: string; time: string } {
  const now = new Date();
  return {
    date: format(now, 'yyyy-MM-dd'),
    time: format(now, 'HH:mm')
  };
}