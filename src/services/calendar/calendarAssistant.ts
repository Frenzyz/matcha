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

      const currentDate = new Date().toISOString().split('T')[0];
      const userPrompt = createUserPrompt(command, currentDate);
      const interpretation = await llmService.generate(`${SYSTEM_PROMPT}\n\n${userPrompt}`);
      const parsedCommand = parseCommandResponse(interpretation);

      let response: string;
      let action: string;
      
      try {
        switch (parsedCommand.action) {
          case 'add':
            response = await handleAddEvent(userId, parsedCommand);
            action = 'add_event';
            break;
          case 'view':
            response = await handleViewEvents(userId, parsedCommand);
            action = 'view_events';
            break;
          case 'update':
            response = await handleUpdateEvents(userId, parsedCommand);
            action = 'update_events';
            break;
          case 'delete':
            response = await handleDeleteEvent(userId, parsedCommand);
            action = 'delete_event';
            break;
          case 'query':
            response = await handleQueryEvents(userId, parsedCommand);
            action = 'query_events';
            break;
          default:
            throw new Error('Unknown command action');
        }

        const result = { response, action };
        this.messageHistory.push({ role: 'assistant', content: response });
        return result;
      } catch (error) {
        logger.error('Error executing calendar command:', { error, command: parsedCommand });
        throw new Error('Failed to execute the calendar command. Please try again.');
      }
    } catch (error) {
      logger.error('Calendar assistant error:', { error, command });
      throw error;
    }
  }
}