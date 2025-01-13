import { logger } from '../../utils/logger';
import { parseCommandResponse } from '../llm/parser';
import { llmService } from '../llm';
import { SYSTEM_PROMPT, createUserPrompt } from '../llm/prompts';
import { 
  handleAddEvent,
  handleViewEvents,
  handleUpdateEvents,
  handleDeleteEvent,
  handleQueryEvents
} from './eventHandlers';

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

      // Get current date in user's timezone
      const today = new Date();
      const currentDate = today.toISOString().split('T')[0];
      
      const userPrompt = createUserPrompt(command, currentDate);
      const interpretation = await llmService.generate(`${SYSTEM_PROMPT}\n\n${userPrompt}`);
      const parsedCommand = parseCommandResponse(interpretation);

      let result: CommandResult;
      
      try {
        switch (parsedCommand.action) {
          case 'add':
            // If no date specified, use current date
            if (!parsedCommand.dates?.start) {
              parsedCommand.dates = {
                start: currentDate,
                end: currentDate
              };
            }
            // If no time specified, use current time plus 1 hour
            if (!parsedCommand.eventDetails?.startTime) {
              const now = new Date();
              parsedCommand.eventDetails = {
                ...parsedCommand.eventDetails,
                startTime: now.toLocaleTimeString('en-US', { 
                  hour12: false, 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })
              };
            }
            result = await handleAddEvent(userId, parsedCommand);
            break;
          case 'view':
            result = await handleViewEvents(userId, parsedCommand);
            break;
          case 'update':
            result = await handleUpdateEvents(userId, parsedCommand);
            break;
          case 'delete':
            result = await handleDeleteEvent(userId, parsedCommand);
            break;
          case 'query':
            result = await handleQueryEvents(userId, parsedCommand);
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
}
