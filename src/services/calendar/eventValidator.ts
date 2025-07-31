import { Event } from '../../types/index';
import { isValid, parseISO } from 'date-fns';
import { logger } from '../../utils/logger';

export function validateEvent(event: Event): void {
  try {
    // Required fields
    if (!event.title?.trim()) {
      throw new Error('Event title is required');
    }
    if (!event.start_time || !event.end_time) {
      throw new Error('Event start and end times are required');
    }
    if (!event.user_id) {
      throw new Error('User ID is required');
    }

    // Valid dates
    const startDate = parseISO(event.start_time);
    const endDate = parseISO(event.end_time);

    if (!isValid(startDate) || !isValid(endDate)) {
      throw new Error('Invalid date format');
    }

    if (endDate <= startDate) {
      throw new Error('End time must be after start time');
    }

    // Valid type
    const validTypes = ['academic', 'career', 'wellness', 'social'];
    if (event.type && !validTypes.includes(event.type)) {
      throw new Error('Invalid event type');
    }

    // Valid status
    const validStatuses = ['pending', 'completed'];
    if (event.status && !validStatuses.includes(event.status)) {
      throw new Error('Invalid event status');
    }
  } catch (error) {
    logger.error('Event validation error:', { error, event });
    throw error;
  }
}
