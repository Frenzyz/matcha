import { useCallback, useRef } from 'react';
import { useRequestState } from './useRequestState';
import { supabase } from '../config/supabase';
import { useConnection } from './useConnection';

interface QueryConfig {
  cacheTime?: number;
  retryCount?: number;
  retryDelay?: number;
  abortSignal?: AbortSignal;
}

const DEFAULT_CONFIG: Required<QueryConfig> = {
  cacheTime: 5 * 60 * 1000, // 5 minutes
  retryCount: 3,
  retryDelay: 1000,
  abortSignal: undefined
};

export function useSupabaseQuery<T>(queryKey: string) {
  const { isOnline } = useConnection();
  const { loading, error, startRequest, finishRequest, handleError } = useRequestState(queryKey);
  const abortControllerRef = useRef<AbortController | null>(null);
  const cacheRef = useRef<{ data: T | null; timestamp: number | null }>({
    data: null,
    timestamp: null
  });

  const executeQuery = useCallback(async <T>(
    queryFn: () => Promise<{ data: T | null; error: any }>,
    config: QueryConfig = {}
  ): Promise<T | null> => {
    const { cacheTime, retryCount, retryDelay, abortSignal } = { ...DEFAULT_CONFIG, ...config };

    // Check cache
    if (cacheRef.current.data && cacheRef.current.timestamp) {
      const age = Date.now() - cacheRef.current.timestamp;
      if (age < cacheTime) {
        return cacheRef.current.data;
      }
    }

    if (!isOnline) {
      handleError(new Error('No internet connection'));
      return null;
    }

    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller if not provided
    const controller = abortSignal ? undefined : new AbortController();
    abortControllerRef.current = controller || null;

    startRequest();

    let attempts = 0;
    while (attempts <= retryCount) {
      try {
        const { data, error } = await queryFn();

        if (error) {
          // Only retry on network errors
          if (error.message?.includes('network') && attempts < retryCount) {
            attempts++;
            await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, attempts - 1)));
            continue;
          }
          throw error;
        }

        // Update cache
        cacheRef.current = {
          data,
          timestamp: Date.now()
        };

        finishRequest();
        return data;
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          // Don't update state for aborted requests
          return null;
        }
        handleError(error);
        return null;
      }
    }

    return null;
  }, [isOnline, startRequest, finishRequest, handleError]);

  const invalidateCache = useCallback(() => {
    cacheRef.current = {
      data: null,
      timestamp: null
    };
  }, []);

  const cancelRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  return {
    loading,
    error,
    executeQuery,
    invalidateCache,
    cancelRequest
  };
}