import { useState, useCallback } from 'react';
import { supabase } from '../config/supabase';
import { useConnection } from './useConnection';
import { retryOperation } from '../utils/retryOperation';
import { cache } from '../utils/cache';
import { logger } from '../utils/logger';

interface SupabaseOptions {
  cacheKey?: string;
  maxAge?: number;
  retryConfig?: {
    maxAttempts?: number;
    initialDelay?: number;
  };
}

export function useSupabase() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { isOnline, isSupabaseConnected } = useConnection();

  const query = useCallback(async <T>(
    operation: () => Promise<{ data: T | null; error: any }>,
    options: SupabaseOptions = {}
  ): Promise<T | null> => {
    const {
      cacheKey,
      maxAge = 5 * 60 * 1000,
      retryConfig
    } = options;

    setLoading(true);
    setError(null);

    try {
      // Check cache first
      if (cacheKey) {
        const cached = cache.get<T>(cacheKey, { maxAge });
        if (cached) {
          return cached;
        }
      }

      // Check connection
      if (!isOnline || !isSupabaseConnected) {
        throw new Error('No connection available');
      }

      // Execute query with retry
      const { data, error } = await retryOperation(
        () => operation(),
        retryConfig
      );

      if (error) throw error;
      if (!data) return null;

      // Cache successful response
      if (cacheKey) {
        cache.set(cacheKey, data, { maxAge });
      }

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(new Error(errorMessage));
      logger.error('Supabase operation failed', {
        error: err,
        context: 'useSupabase'
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [isOnline, isSupabaseConnected]);

  return {
    query,
    loading,
    error,
    clearError: () => setError(null)
  };
}