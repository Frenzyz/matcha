type ErrorLevel = 'error' | 'warning' | 'info';

interface ErrorLog {
  timestamp: string;
  level: ErrorLevel;
  message: string;
  details?: any;
  componentStack?: string;
  retryCount?: number;
}

class ErrorHandler {
  private static instance: ErrorHandler;
  private errorLogs: ErrorLog[] = [];
  private readonly maxLogs = 100;
  private readonly maxRetries = 3;

  private constructor() {
    window.onerror = (message, source, lineno, colno, error) => {
      this.logError('Uncaught error', error || message);
    };

    window.onunhandledrejection = (event) => {
      this.logError('Unhandled promise rejection', event.reason);
    };
  }

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  logError(message: string, details?: any, componentStack?: string, retryCount = 0) {
    const errorLog: ErrorLog = {
      timestamp: new Date().toISOString(),
      level: 'error',
      message,
      details,
      componentStack,
      retryCount
    };

    this.errorLogs.unshift(errorLog);
    
    if (this.errorLogs.length > this.maxLogs) {
      this.errorLogs = this.errorLogs.slice(0, this.maxLogs);
    }

    if (process.env.NODE_ENV === 'development') {
      console.error(message, details, componentStack);
    }

    return retryCount < this.maxRetries;
  }

  logWarning(message: string, details?: any) {
    const warningLog: ErrorLog = {
      timestamp: new Date().toISOString(),
      level: 'warning',
      message,
      details
    };

    this.errorLogs.unshift(warningLog);
    
    if (this.errorLogs.length > this.maxLogs) {
      this.errorLogs = this.errorLogs.slice(0, this.maxLogs);
    }

    if (process.env.NODE_ENV === 'development') {
      console.warn(message, details);
    }
  }

  getErrorLogs(): ErrorLog[] {
    return [...this.errorLogs];
  }

  clearErrorLogs() {
    this.errorLogs = [];
  }

  shouldRetry(error: any): boolean {
    if (!error) return false;

    const isNetworkError = error.message?.toLowerCase().includes('network') ||
                          error.message?.toLowerCase().includes('failed to fetch');
    
    const isRateLimitError = error.message?.toLowerCase().includes('rate limit');
    
    return isNetworkError && !isRateLimitError;
  }
}

export const errorHandler = ErrorHandler.getInstance();

export function handleError(error: unknown, context?: string): void {
  let message = 'An unexpected error occurred';
  let details = {};

  if (error instanceof Error) {
    message = error.message;
    details = {
      name: error.name,
      stack: error.stack,
      context
    };
  } else if (typeof error === 'string') {
    message = error;
    details = { context };
  }

  errorHandler.logError(message, details);
}