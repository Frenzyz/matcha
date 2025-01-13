import { logger } from './logger';

interface ErrorDetails {
  code?: string;
  message: string;
  context?: string;
}

export class ErrorHandler {
  static handle(error: unknown, context?: string): ErrorDetails {
    let errorDetails: ErrorDetails;

    if (error instanceof Error) {
      errorDetails = {
        message: error.message,
        code: (error as any).code,
        context
      };
    } else if (typeof error === 'string') {
      errorDetails = {
        message: error,
        context
      };
    } else {
      errorDetails = {
        message: 'An unexpected error occurred',
        context
      };
    }

    logger.error('Error occurred:', {
      ...errorDetails,
      stack: error instanceof Error ? error.stack : undefined
    });

    return errorDetails;
  }

  static async withErrorHandling<T>(
    operation: () => Promise<T>,
    context?: string
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      throw this.handle(error, context);
    }
  }

  static isNetworkError(error: unknown): boolean {
    if (error instanceof Error) {
      return error.message.toLowerCase().includes('network') ||
             error.message.toLowerCase().includes('failed to fetch');
    }
    return false;
  }

  static isAuthError(error: unknown): boolean {
    if (error instanceof Error) {
      return error.message.toLowerCase().includes('auth') ||
             error.message.toLowerCase().includes('unauthorized');
    }
    return false;
  }
}
