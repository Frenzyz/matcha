import { useState, useCallback } from 'react';
import { supabase } from '../config/supabase';
import { useConnection } from './useConnection';
import { retryOperation } from '../config/supabase';
import { logger } from '../utils/logger';

export function useFirestore() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isOnline = useConnection();

  const getData = useCallback(async <T>(table: string, id?: string) => {
    if (!table) {
      const error = new Error('Table name is required');
      logger.error('Invalid getData parameters', { table });
      throw error;
    }

    setLoading(true);
    setError(null);

    try {
      if (!isOnline) {
        throw new Error('No internet connection');
      }

      const query = supabase
        .from(table)
        .select('*');

      if (id) {
        query.eq('id', id).single();
      }

      const { data, error: queryError } = await retryOperation(async () => query);

      if (queryError) {
        throw queryError;
      }

      return data as T;
    } catch (err) {
      const errorMessage = err instanceof Error 
        ? err.message 
        : 'Failed to fetch data';

      logger.error('getData error', {
        error: err,
        table,
        id,
        online: isOnline
      });

      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [isOnline]);

  const setData = useCallback(async (
    table: string,
    id: string,
    data: any,
    upsert = true
  ) => {
    if (!table || !id || !data) {
      const error = new Error('Table, ID, and data are required');
      logger.error('Invalid setData parameters', { table, id });
      throw error;
    }

    setLoading(true);
    setError(null);

    try {
      if (!isOnline) {
        throw new Error('No internet connection');
      }

      const timestamp = new Date().toISOString();
      const { error: queryError } = await retryOperation(async () =>
        supabase
          .from(table)
          .upsert({
            id,
            ...data,
            updated_at: timestamp,
            created_at: upsert ? timestamp : undefined
          })
      );

      if (queryError) {
        throw queryError;
      }
    } catch (err) {
      const errorMessage = err instanceof Error 
        ? err.message 
        : 'Failed to save data';

      logger.error('setData error', {
        error: err,
        table,
        id,
        online: isOnline
      });

      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [isOnline]);

  return {
    getData,
    setData,
    loading,
    error,
    isOnline
  };
}