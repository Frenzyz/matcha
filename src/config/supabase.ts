import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/supabase';
import { logger } from '../utils/logger';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    storage: window.localStorage,
    storageKey: 'matcha-auth'
  },
  db: {
    schema: 'public'
  },
  global: {
    headers: {
      'x-application-name': 'matcha'
    }
  },
  realtime: {
    params: {
      eventsPerSecond: 2
    }
  }
});

// Email validation for any valid email address
export const validateEmail = (email: string): boolean => {
  if (!email) return false;
  // RFC 5322 standard email regex
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return emailRegex.test(email);
};

// Retry configuration
export const RETRY_CONFIG = {
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 5000,
  backoffFactor: 2
};

// Helper function for retrying operations
export async function retryOperation<T>(
  operation: () => Promise<T>,
  config: Partial<typeof RETRY_CONFIG> = {}
): Promise<T> {
  const { maxAttempts, initialDelay, maxDelay, backoffFactor } = {
    ...RETRY_CONFIG,
    ...config
  };

  let lastError: Error | null = null;
  let attempt = 1;

  while (attempt <= maxAttempts) {
    try {
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
      lastError = error instanceof Error ? error : new Error('Unknown error');
      
      if (attempt === maxAttempts) {
        break;
      }

      // Only retry on network errors or specific Supabase errors
      const isRetryableError = 
        lastError.message.includes('Failed to fetch') ||
        lastError.message.includes('Network request failed') ||
        lastError.message.includes('timeout') ||
        lastError.message.includes('rate limit');

      if (!isRetryableError) {
        throw lastError;
      }

      const delay = Math.min(
        initialDelay * Math.pow(backoffFactor, attempt - 1),
        maxDelay
      );

      logger.warn(`Operation failed, retrying in ${delay}ms (attempt ${attempt}/${maxAttempts})`, {
        error: lastError,
        attempt,
        delay
      });

      await new Promise(resolve => setTimeout(resolve, delay));
      attempt++;
    }
  }

  throw lastError || new Error('Operation failed after retries');
}

// Parse Supabase error messages
export function parseSupabaseError(error: any): string {
  if (!error) return 'An unknown error occurred';

  if (error.message?.includes('Failed to fetch')) {
    return 'Network connection error. Please check your internet connection.';
  }

  if (error.message?.includes('timeout')) {
    return 'Operation timed out. Please try again.';
  }

  const message = error.message?.toLowerCase() || '';

  if (message.includes('rate limit')) {
    return 'Too many attempts. Please try again later.';
  }

  if (message.includes('already registered')) {
    return 'This email is already registered. Please sign in instead.';
  }

  if (message.includes('invalid email')) {
    return 'Please enter a valid email address';
  }

  if (message.includes('invalid login')) {
    return 'Invalid email or password';
  }

  if (message.includes('email not confirmed')) {
    return 'Please verify your email address before logging in';
  }

  if (error.__isAuthError) {
    return 'Authentication failed. Please try signing in again.';
  }

  return error.message || 'Failed to process your request';
}

// Check connection status with timeout
export async function checkConnection(timeout = 5000): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .limit(1)
      .abortSignal(controller.signal);

    clearTimeout(timeoutId);
    return !error;
  } catch (err) {
    logger.error('Connection check failed:', err);
    return false;
  }
}

// Handle Supabase errors with context
export function handleSupabaseError(error: any, context?: string): string {
  logger.error('Supabase operation failed', { error, context });
  
  if (!navigator.onLine) {
    return 'Network connection error. Please check your internet connection.';
  }
  
  return parseSupabaseError(error);
}
