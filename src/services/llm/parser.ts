import { logger } from '../../utils/logger';
import { addDays, format, startOfDay, endOfDay } from 'date-fns';
import { EventType } from '../../types/index';

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
    type?: EventType;
  };
}

export function parseCommandResponse(response: string): ParsedCommand {
  try {
    // Clean up the response
    const cleanResponse = response
      .replace(/```json\n?|\n?```/g, '')
      .replace(/^[\s\n]*\{/, '{')
      .replace(/\}[\s\n]*$/, '}')
      .trim();

    let parsed: any;
    try {
      parsed = JSON.parse(cleanResponse);
    } catch (e) {
      logger.error('JSON parse error:', { error: e, response: cleanResponse });
      throw new Error('Invalid response format');
    }

    // Map event types to valid types
    if (parsed.eventDetails?.type) {
      const typeMap: Record<string, EventType> = {
        exam: 'academic',
        class: 'academic',
        lecture: 'academic',
        meeting: 'career',
        interview: 'career',
        workout: 'wellness',
        party: 'social',
        event: 'social'
      };

      parsed.eventDetails.type = typeMap[parsed.eventDetails.type.toLowerCase()] || 'social';
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

  // Ensure event type is valid
  if (parsed.eventDetails?.type) {
    const validTypes: EventType[] = ['academic', 'career', 'wellness', 'social'];
    if (!validTypes.includes(parsed.eventDetails.type)) {
      parsed.eventDetails.type = 'social';
    }
  }
}

// Rest of the file remains the same...
