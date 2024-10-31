import { useState, useCallback } from 'react';
import { logger } from '../utils/logger';
import { handleSupabaseError } from '../config/supabase';

interface ErrorState {
  message: string;
  code?: string;
  context?: string;
}

export function useErrorHandler() {
  const [error, setError] = useState<ErrorState | null>(null);

  const handleError = useCallback((error: unknown, context?: string) => {
    let errorMessage: string;
    let errorCode: string | undefined;

    if (error instanceof Error) {
      errorMessage = handleSupabaseError(error, context);
      errorCode = (error as any).code;
    } else if (typeof error === 'string') {
      errorMessage = error;
    } else {
      errorMessage = 'An unexpected error occurred';
    }

    const errorState = {
      message: errorMessage,
      code: errorCode,
      context
    };

    logger.error(errorMessage, { error, context });
    setError(errorState);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    error,
    handleError,
    clearError
  };
}