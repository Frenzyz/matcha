import { useState, useCallback } from 'react';
import { supabase } from '../config/supabase';
import { useConnection } from './useConnection';
import { retryOperation } from '../config/supabase';

export function useFirestore() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isOnline = useConnection();

  const getData = useCallback(async (table: string, id: string) => {
    setLoading(true);
    setError(null);

    try {
      if (!isOnline) {
        throw new Error('Offline');
      }

      const { data, error } = await retryOperation(async () => 
        supabase
          .from(table)
          .select('*')
          .eq('id', id)
          .single()
      );

      if (error) throw error;
      return data;
    } catch (err) {
      if (!isOnline) {
        setError('You are offline. Data will sync when you reconnect.');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to fetch data');
      }
      throw err;
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
    setLoading(true);
    setError(null);

    try {
      if (!isOnline) {
        throw new Error('Offline');
      }

      const timestamp = new Date().toISOString();
      const { error } = await retryOperation(async () =>
        supabase
          .from(table)
          .upsert({
            id,
            ...data,
            last_seen: timestamp,
            created_at: upsert ? timestamp : undefined
          })
      );

      if (error) throw error;
    } catch (err) {
      if (!isOnline) {
        setError('Changes will be saved when you reconnect.');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to save data');
      }
      throw err;
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