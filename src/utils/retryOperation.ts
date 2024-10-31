import { logger } from './logger';

interface RetryOptions {
  maxAttempts?: number;
  delay?: number;
  backoff?: boolean;
  onRetry?: (attempt: number, error: any) => void;
}

export async function retryOperation<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    delay = 1000,
    backoff = true,
    onRetry
  } = options;

  let lastError: any;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      // Check if we have network connectivity
      if (!navigator.onLine) {
        throw new Error('No internet connection');
      }

      return await operation();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxAttempts) {
        break;
      }

      // Only retry on network errors or specific Supabase errors
      if (error instanceof Error) {
        const isNetworkError = 
          error.message.includes('Failed to fetch') ||
          error.message.includes('Network request failed') ||
          error.message.includes('No internet connection');

        const isRetryableError =
          isNetworkError ||
          error.message.includes('timeout') ||
          error.message.includes('rate limit');

        if (!isRetryableError) {
          throw error;
        }
      }
      
      const waitTime = backoff ? delay * Math.pow(2, attempt - 1) : delay;
      
      if (onRetry) {
        onRetry(attempt, error);
      }

      logger.warn(`Operation failed, retrying in ${waitTime}ms (attempt ${attempt}/${maxAttempts})`, {
        error,
        attempt,
        maxAttempts,
        waitTime
      });

      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
  
  throw lastError;
}