import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/supabase';

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
  }
});

// Email validation for UNCC domains
export const validateEmail = (email: string): boolean => {
  if (!email) return false;
  const normalizedEmail = email.toLowerCase().trim();
  const validDomains = ['@charlotte.edu', '@uncc.edu'];
  return validDomains.some(domain => normalizedEmail.endsWith(domain));
};

// Helper function for retrying operations
export const retryOperation = async <T>(
  operation: () => Promise<T>,
  maxAttempts = 3,
  delay = 1000
): Promise<T> => {
  let lastError;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt === maxAttempts) break;
      await new Promise(resolve => setTimeout(resolve, delay * attempt));
    }
  }
  
  throw lastError;
};

// Parse Supabase error messages
export const parseSupabaseError = (error: any): string => {
  if (!error) return 'An unknown error occurred';
  
  // Check for specific error messages
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