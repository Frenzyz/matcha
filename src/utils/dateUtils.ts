import { parse, format, isValid, parseISO, startOfDay, endOfDay, addHours } from 'date-fns';
import { zonedTimeToUtc, utcToZonedTime } from 'date-fns-tz';
import { logger } from './logger';

export function parseDate(dateString: string): Date {
  try {
    logger.info('Parsing date:', { dateString });
    
    // Get user's timezone
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    // Handle time-only strings by combining with today's date
    if (/^\d{1,2}:\d{2}(:\d{2})?(\s*(am|pm))?$/i.test(dateString)) {
      const today = new Date();
      const timeStr = dateString.toLowerCase();
      const [hours, minutes] = timeStr.replace(/[^\d:]/g, '').split(':');
      let hour = parseInt(hours);
      const minute = parseInt(minutes);
      
      // Handle AM/PM
      if (timeStr.includes('pm') && hour < 12) hour += 12;
      if (timeStr.includes('am') && hour === 12) hour = 0;

      today.setHours(hour, minute, 0, 0);
      return zonedTimeToUtc(today, timeZone);
    }

    // Try parsing as ISO string
    const isoDate = parseISO(dateString);
    if (isValid(isoDate)) {
      return isoDate;
    }

    // Try different date formats
    const formats = [
      'yyyy-MM-dd',
      'MM/dd/yyyy',
      'MM-dd-yyyy',
      'yyyy/MM/dd',
      'MMMM d, yyyy',
      'MMM d, yyyy',
      'yyyy-MM-dd HH:mm',
      'yyyy-MM-dd h:mm a',
      'MM/dd/yyyy HH:mm',
      'MM/dd/yyyy h:mm a',
      'h:mm a',
      'HH:mm'
    ];

    for (const formatStr of formats) {
      try {
        const parsedDate = parse(dateString, formatStr, new Date());
        if (isValid(parsedDate)) {
          return zonedTimeToUtc(parsedDate, timeZone);
        }
      } catch {
        continue;
      }
    }

    // Try parsing as natural language
    const naturalDate = new Date(dateString);
    if (isValid(naturalDate)) {
      return zonedTimeToUtc(naturalDate, timeZone);
    }

    throw new Error(`Unable to parse date: ${dateString}`);
  } catch (error) {
    logger.error('Error parsing date:', { error, dateString });
    throw error;
  }
}

export function formatDateRange(startTime: string, endTime: string): string {
  try {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const start = utcToZonedTime(new Date(startTime), timeZone);
    const end = utcToZonedTime(new Date(endTime), timeZone);

    if (start.toDateString() === end.toDateString()) {
      return `${format(start, 'MMMM d, yyyy')} from ${format(start, 'h:mm a')} to ${format(end, 'h:mm a')}`;
    }

    return `${format(start, 'MMMM d, yyyy h:mm a')} to ${format(end, 'MMMM d, yyyy h:mm a')}`;
  } catch (error) {
    logger.error('Error formatting date range:', { error, startTime, endTime });
    throw error;
  }
}

export function formatDateTime(date: Date): string {
  try {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const zonedDate = utcToZonedTime(date, timeZone);
    return format(zonedDate, 'MMMM d, yyyy h:mm a');
  } catch (error) {
    logger.error('Error formatting date time:', { error, date });
    throw error;
  }
}

export function getDayRange(date: Date): { start: Date; end: Date } {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const zonedDate = utcToZonedTime(date, timeZone);
  return {
    start: zonedTimeToUtc(startOfDay(zonedDate), timeZone),
    end: zonedTimeToUtc(endOfDay(zonedDate), timeZone)
  };
}