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
    flowType: 'pkce'
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

// Email validation for UNCC domains
export const validateEmail = (email: string): boolean => {
  if (!email) return false;
  const normalizedEmail = email.toLowerCase().trim();
  const validDomains = ['@charlotte.edu', '@uncc.edu'];
  return validDomains.some(domain => normalizedEmail.endsWith(domain));
};

interface RetryOptions {
  maxAttempts?: number;
  initialDelay?: number;
  maxDelay?: number;
  timeout?: number;
  signal?: AbortSignal;
}

// Helper function for retrying operations with timeout and abort support
export const retryOperation = async <T>(
  operation: () => Promise<T>,
  {
    maxAttempts = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    timeout = 15000,
    signal
  }: RetryOptions = {}
): Promise<T> => {
  let lastError: Error | null = null;
  let attempt = 1;

  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error('Operation timed out'));
    }, timeout);
  });

  while (attempt <= maxAttempts) {
    try {
      // Check if operation was aborted
      if (signal?.aborted) {
        throw new Error('Operation aborted by user');
      }

      // Race between the operation and timeout
      const result = await Promise.race([operation(), timeoutPromise]);
      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error occurred');
      
      // Don't retry if operation was aborted or we're on the last attempt
      if (signal?.aborted || attempt === maxAttempts) {
        break;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(initialDelay * Math.pow(2, attempt - 1), maxDelay);
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
      attempt++;
    }
  }

  throw lastError || new Error('Operation failed after retries');
};

// Parse Supabase error messages
export const parseSupabaseError = (error: any): string => {
  if (!error) return 'An unknown error occurred';
  
  if (error.message?.includes('Failed to fetch')) {
    return 'Network connection error. Please check your internet connection.';
  }
  
  if (error.message?.includes('AbortError')) {
    return 'Operation was cancelled.';
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
    return 'Please use your UNCC email address (@charlotte.edu or @uncc.edu)';
  }

  if (message.includes('invalid login')) {
    return 'Invalid email or password';
  }

  if (message.includes('email not confirmed')) {
    return 'Please verify your email address before logging in';
  }

  return error.message || 'Failed to process your request';
};

// Check connection status with timeout
export const checkConnection = async (timeout = 5000): Promise<boolean> => {
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
};

// Handle Supabase errors with context
export const handleSupabaseError = (error: any, context?: string): string => {
  logger.error('Supabase operation failed', { error, context });
  
  if (!navigator.onLine) {
    return 'Network connection error. Please check your internet connection.';
  }
  
  return parseSupabaseError(error);
};