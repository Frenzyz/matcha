import { logger } from './logger';

interface RetryOptions {
  maxAttempts?: number;
  delay?: number;
  backoff?: boolean;
  onRetry?: (attempt: number, error: any) => void;
  signal?: AbortSignal;
}

export async function retryOperation<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    delay = 1000,
    backoff = true,
    onRetry,
    signal
  } = options;

  let lastError: any;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      // Check if operation was aborted
      if (signal?.aborted) {
        throw new Error('Operation aborted by user');
      }

      // Check network connectivity
      if (!navigator.onLine) {
        throw new Error('No internet connection');
      }

      return await Promise.race([
        operation(),
        new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Operation timed out')), 10000);
        })
      ]);
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
          error.message.includes('NetworkError') ||
          error.message.includes('No internet connection') ||
          error.message.includes('timeout');

        const isRetryableError =
          isNetworkError ||
          error.message.includes('rate limit') ||
          error.message.includes('Connection lost');

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
