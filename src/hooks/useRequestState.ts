import { useState, useCallback } from 'react';
import { logger } from '../utils/logger';

interface RequestState {
  loading: boolean;
  error: string | null;
  lastUpdated: number | null;
}

export function useRequestState(identifier: string) {
  const [state, setState] = useState<RequestState>({
    loading: false,
    error: null,
    lastUpdated: null
  });

  const startRequest = useCallback(() => {
    setState(prev => ({
      ...prev,
      loading: true,
      error: null
    }));
  }, []);

  const finishRequest = useCallback((error?: string) => {
    setState({
      loading: false,
      error: error || null,
      lastUpdated: Date.now()
    });
  }, []);

  const handleError = useCallback((error: unknown) => {
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    logger.error(`Request error (${identifier}):`, error);
    finishRequest(errorMessage);
    return errorMessage;
  }, [identifier, finishRequest]);

  const clearError = useCallback(() => {
    setState(prev => ({
      ...prev,
      error: null
    }));
  }, []);

  return {
    ...state,
    startRequest,
    finishRequest,
    handleError,
    clearError
  };
}
